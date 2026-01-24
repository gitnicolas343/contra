import re
from typing import Any, Dict, List, Optional
from uuid import UUID

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from supabase_client import supabase
from listas_negras_client import consultar_listas_negras
from pathlib import Path
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

#-------- recursiones --------------------------------------
def normalizar_documento(doc: str | None) -> str | None:
    """
    Recibe un documento (CC, NIT, etc.) y devuelve una versión 'limpia':
    - sin puntos
    - sin espacios
    - sin guiones (quita el dígito de verificación en el NIT)
    - solo dígitos

    Si no queda nada, retorna None.
    """
    if doc is None:
        return None

    doc = str(doc)

    # quitar espacios y puntos
    doc = doc.replace(" ", "").replace(".", "").strip()

    # quitar parte después de guión (ej. '900123456-7' -> '900123456')
    doc = doc.split("-")[0]

    # dejar solo dígitos
    solo_digitos = re.sub(r"\D", "", doc)

    return solo_digitos or None






app = FastAPI()

BASE_DIR = Path(__file__).resolve().parent.parent  # carpeta raiz del repo
STATIC_DIR = BASE_DIR / "static"

app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")

@app.get("/")
def home():
    return FileResponse(str(STATIC_DIR / "index.html"))

# CORS abierto mientras desarrollas
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --------- MODELOS ---------

class Usuario(BaseModel):
    email: str
    password: str


class LoginRequest(BaseModel):
    """pyload esperado desde login.html
    """
    email: str
    password: str  



class OAuthUsuario(BaseModel):
    email: str
    provider: str | None = None
    auth_id: str | None = None   # id de Supabase/Google


class CompletarRegistro(BaseModel):
    """
    Datos de perfil / contrato que se llenan en verificacion.html.
    El usuario_id es el id (uuid) de la tabla `usuarios`.
    """
    usuario_id: UUID
    nombre_completo: str
    tipo_documento: str
    numero_documento: str
    nit: str | None = None
    empresa: str
    telefono: str
    actividad_comercial: str | None = None
    ubicacion_geografica: str | None = None

class SancionResumen(BaseModel):
    fuente: str                     # 'procuraduria' | 'secop1' | 'secop2'
    tipo_registro: str              # 'inhabilidad' | 'multa' | 'otra_sancion'
    tipo_detalle: str | None = None
    nombre_sancionado: str | None = None
    identificador: str | None = None   # doc, NIT o código proveedor
    valor_multa: Optional[float] = None
    fecha_evento: str | None = None
    fecha_firmeza: str | None = None
    estado: str | None = None
    url_detalle: str | None = None
    recomendacion: str | None = None

class ResultadoListasNegras(BaseModel):
    usuario_id: UUID
    en_lista_negra: bool
    total_registros: int
    resumen: str
    sanciones: List[SancionResumen]


class Sancion(BaseModel):
    fuente: str
    tipo_registro: str
    tipo_detalle: str
    nombre_sancionado: str
    identificador: str
    valor_multa: Optional[float] = None
    fecha_evento: Optional[str] = None
    fecha_firmeza: Optional[str] = None
    estado: Optional[str] = None
    url_detalle: Optional[str] = None
    recomendacion: str


class ResumenListasNegras(BaseModel):
    usuario_id: UUID
    en_lista_negra: bool
    total_registros: int
    resumen: str
    sanciones: List[Sancion]





# --------- CONSULTAR SI YA EXISTE UN USUARIO POR CORREO ---------

@app.get("/usuarios/existe")
def usuario_existe(email: str):
    """
    Devuelve {"existe": true/false} según si hay un registro en la tabla 'usuarios'
    con ese correo. OJO: en tu tabla la columna se llama 'correo', no 'email'.
    """
    try:
        resp = (
            supabase
            .table("usuarios")
            .select("id")
            .eq("correo", email)
            .limit(1)
            .execute()
        )

        existe = bool(resp.data)  # True si hay al menos una fila
        if not existe:
            return {"existe":False }

        Usuario_id = resp.data[0]["id"]

        detalle = (
            supabase
            .table("usuarios_detalle")
            .select("usuario_id")
            .eq("usuario_id",Usuario_id)
            .limit(1)
            .execute()
        )
        return {
            "existe": True,
            "usuario_id": usuario_id,
            "tiene_detalle": bool(detalle.data),
        }
    except Exception as e:
        print("Error en /usuarios/existe:", e)
        # En error, devolvemos que no sabemos, pero no rompemos el frontend
        return {"existe": False, "error": str(e)}



# --------- REGISTRO NORMAL (correo + contraseña) ---------

@app.post("/registrar")
def registrar(usuario: Usuario):
    try:
        resp = supabase.table("usuarios").insert({
            "correo": usuario.email,
            "contrasena": usuario.password,
            "provider": "propio",
        }).execute()

        # resp.data suele ser la lista de filas insertadas
        return {"ok": True, "data": resp, "ya_existia": False}

    except Exception as e:
        # Log mínimo y respuesta controlada
        print("Error en /registrar:", e)
        return {"ok": False, "error": str(e)}




# --------- REGISTRO / LOGIN POR GOOGLE ---------

@app.post("/registrar_oauth")
def registrar_oauth(usuario: OAuthUsuario):
    """
    Crea o actualiza un usuario que viene de OAuth (Google) O desde verificacion_email.
    - Si el correo NO existe en `usuarios` → lo inserta (nuevo).
    - Si el correo YA existe:
        * Si se registró con contraseña (email/propio) → BLOQUEA OAuth
        * Si ya era OAuth → permite actualizar provider / datos sin duplicar.
    """
    try:
        # 1. Verificar si ya existía un usuario con ese correo
        existente = (
            supabase
            .table("usuarios")
            .select("id, provider")
            .eq("correo", usuario.email)
            .limit(1)
            .execute()
        )

        ya_existia = bool(existente.data)
        prov_actual = None

        if ya_existia:
            fila = existente.data[0]
            prov_actual = fila.get("provider")

            # ⚠️ Si el usuario se registró originalmente con contraseña,
            #    NO permitimos que Google "tome" esa cuenta.
            if prov_actual in ("propio", "email"):
                return {
                    "ok": False,
                    "ya_existia": True,
                    "motivo": "registrado_con_contrasena",
                    "provider_actual": prov_actual,
                }

        # 2. Datos a insertar/actualizar (para casos permitidos)
        payload = {
            "correo": usuario.email,
            "provider": usuario.provider or "google",
        }
        # Si tienes una columna auth_id, la puedes usar:
        # payload["auth_id"] = usuario.auth_id

        # 3. Upsert para no duplicar por correo (solo si no se bloqueó arriba)
        resp = supabase.table("usuarios").upsert(
            payload,
            on_conflict="correo",
        ).execute()

        return {
            "ok": True,
            "data": resp,
            "ya_existia": ya_existia,
            "provider_anterior": prov_actual,
        }

    except Exception as e:
        print("Error en /registrar_oauth:", e)
        return {"ok": False, "error": str(e)}

# formulrio  de verifacion de lustas negras
@app.post("/completar_registro")
def completar_registro(datos: CompletarRegistro):
    """
    Guarda / actualiza los datos de perfil necesarios para el contrato
    en la tabla `usuarios_detalle`, ligados a `usuarios.id` (uuid).
    """
    try:
        # 1) Verificar que el usuario exista en la tabla `usuarios`
        usuario_resp = (
            supabase
            .table("usuarios")
            .select("id")
            .eq("id", str(datos.usuario_id))
            .limit(1)
            .execute()
        )

        if not usuario_resp.data:
            raise HTTPException(
                status_code=400,
                detail="El usuario asociado a estos datos no existe."
            )

        # 2) Preparar payload para la tabla de detalle
        payload = {
            "usuario_id": str(datos.usuario_id),
            "nombre_completo": datos.nombre_completo,
            "tipo_documento": datos.tipo_documento,
            "numero_documento": datos.numero_documento,
            "nit": datos.nit,
            "empresa": datos.empresa,
            "telefono": datos.telefono,
            "actividad_comercial": datos.actividad_comercial,
            "ubicacion_geografica": datos.ubicacion_geografica,
            # columnas técnicas pensadas para cruce con listas negras
            # (añádelas en Supabase si aún no existen)

        }

        # 3) Upsert por usuario_id → 1 solo registro de detalle por usuario
        resp = (
            supabase
            .table("usuarios_detalle")
            .upsert(payload, on_conflict="usuario_id")
            .execute()
        )

        return {"ok": True, "data": resp.data}

    except HTTPException:
        # Dejamos que FastAPI devuelva el código/detalle correcto
        raise

    except Exception as e:
        print("Error en /completar_registro:", e)
        raise HTTPException(
            status_code=500,
            detail="Error interno guardando los datos de verificación."
        )



import json
from datetime import datetime, timezone

@app.get("/listas_negras/resumen", response_model=ResumenListasNegras)
def resumen_listas_negras(usuario_id: UUID):
    """
    Consulta en tiempo real Procuraduría + SECOP I + SECOP II
    usando los datos guardados en usuarios_detalle para este usuario.
    Además, persiste el resultado en usuarios_detalle (en_lista_negra, detalle, normalizados).
    """
    # 1) Traer datos de la tabla usuarios_detalle
    try:
        resp = (
            supabase
            .table("usuarios_detalle")
            .select("numero_documento, nit, empresa")
            .eq("usuario_id", str(usuario_id))
            .limit(1)
            .execute()
        )
    except Exception as e:
        print("Error leyendo usuarios_detalle:", e)
        raise HTTPException(
            status_code=500,
            detail="Error interno consultando los datos del usuario."
        )

    if not resp.data:
        raise HTTPException(
            status_code=404,
            detail="No se encontraron datos de detalle para este usuario."
        )

    fila = resp.data[0]
    numero_documento = fila.get("numero_documento")
    nit_empresa      = fila.get("nit")
    nombre_empresa   = fila.get("empresa")

    # 2) Ejecutar las consultas a listas negras
    resultado = consultar_listas_negras(
        numero_documento=numero_documento,
        nit_empresa=nit_empresa,
        nombre_empresa=nombre_empresa,
    )

    # Guardar resultado en usuarios_detalle (sin cambiar estructura)
    try:
        supabase.table("usuarios_detalle").update({
            "en_lista_negra": bool(resultado["en_lista_negra"]),
            "detalle_lista_negra": json.dumps(resultado["sanciones"], ensure_ascii=False),
        }).eq("usuario_id", str(usuario_id)).execute()
    except Exception as e:
        print("WARN: no se pudo guardar en_lista_negra/detalle_lista_negra:", e)


    # 3) Persistir resultado en BD (NO cambia tu esquema)
    try:
        doc_norm = normalizar_documento(numero_documento) if numero_documento else None
        nit_norm = normalizar_documento(nit_empresa) if nit_empresa else None

        detalle_json = json.dumps(
            resultado.get("sanciones", []),
            ensure_ascii=False,
        )

        update_payload = {
            "en_lista_negra": bool(resultado.get("en_lista_negra", False)),
            "detalle_lista_negra": detalle_json,
            "doc_normalizado_persona": doc_norm,
            "nit_normalizado_empresa": nit_norm,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }

        upd = (
            supabase
            .table("usuarios_detalle")
            .update(update_payload)
            .eq("usuario_id", str(usuario_id))
            .execute()
        )

        # Debug útil
        print("[listas_negras] actualizado usuarios_detalle:", upd.data)

    except Exception as e:
        # Importante: si falla el guardado, igual devolvemos el resultado al frontend.
        print("Error actualizando usuarios_detalle con listas negras:", e)

    # 4) Devolver respuesta con usuario_id incluido (como antes)
    return ResumenListasNegras(
        usuario_id=usuario_id,
        en_lista_negra=resultado["en_lista_negra"],
        total_registros=resultado["total_registros"],
        resumen=resultado["resumen"],
        sanciones=resultado["sanciones"],
    )


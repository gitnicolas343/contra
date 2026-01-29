import json
from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, HTTPException

from app.clients.supabase import supabase
from app.models.schemas import CompletarRegistro, ResumenListasNegras
from app.services.listas_negras import consultar_listas_negras
from app.utils.normalizacion import normalizar_documento

router = APIRouter()


@router.post("/completar_registro")
def completar_registro(datos: CompletarRegistro):
    """
    Guarda/actualiza los datos de perfil necesarios para el contrato
    en la tabla `usuarios_detalle`, ligados a `usuarios.id` (uuid).
    """
    try:
        usuario_resp = (
            supabase.table("usuarios")
            .select("id")
            .eq("id", str(datos.usuario_id))
            .limit(1)
            .execute()
        )

        if not usuario_resp.data:
            raise HTTPException(status_code=400, detail="El usuario asociado a estos datos no existe.")

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
        }

        resp = supabase.table("usuarios_detalle").upsert(payload, on_conflict="usuario_id").execute()

        return {"ok": True, "data": resp.data}

    except HTTPException:
        raise

    except Exception as exc:
        print("Error en /completar_registro:", exc)
        raise HTTPException(status_code=500, detail="Error interno guardando los datos de verificacion.")


@router.get("/listas_negras/resumen", response_model=ResumenListasNegras)
def resumen_listas_negras(usuario_id: UUID):
    """
    Consulta en tiempo real Procuraduria + SECOP I + SECOP II
    usando los datos guardados en usuarios_detalle para este usuario.
    Ademas, persiste el resultado en usuarios_detalle.
    """
    try:
        resp = (
            supabase.table("usuarios_detalle")
            .select("numero_documento, nit, empresa")
            .eq("usuario_id", str(usuario_id))
            .limit(1)
            .execute()
        )
    except Exception as exc:
        print("Error leyendo usuarios_detalle:", exc)
        raise HTTPException(status_code=500, detail="Error interno consultando los datos del usuario.")

    if not resp.data:
        raise HTTPException(status_code=404, detail="No se encontraron datos de detalle para este usuario.")

    fila = resp.data[0]
    numero_documento = fila.get("numero_documento")
    nit_empresa = fila.get("nit")
    nombre_empresa = fila.get("empresa")

    resultado = consultar_listas_negras(
        numero_documento=numero_documento,
        nit_empresa=nit_empresa,
        nombre_empresa=nombre_empresa,
    )

    try:
        supabase.table("usuarios_detalle").update(
            {
                "en_lista_negra": bool(resultado["en_lista_negra"]),
                "detalle_lista_negra": json.dumps(resultado["sanciones"], ensure_ascii=False),
            }
        ).eq("usuario_id", str(usuario_id)).execute()
    except Exception as exc:
        print("WARN: no se pudo guardar en_lista_negra/detalle_lista_negra:", exc)

    try:
        doc_norm = normalizar_documento(numero_documento) if numero_documento else None
        nit_norm = normalizar_documento(nit_empresa) if nit_empresa else None

        detalle_json = json.dumps(resultado.get("sanciones", []), ensure_ascii=False)

        update_payload = {
            "en_lista_negra": bool(resultado.get("en_lista_negra", False)),
            "detalle_lista_negra": detalle_json,
            "doc_normalizado_persona": doc_norm,
            "nit_normalizado_empresa": nit_norm,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }

        upd = (
            supabase.table("usuarios_detalle")
            .update(update_payload)
            .eq("usuario_id", str(usuario_id))
            .execute()
        )

        print("[listas_negras] actualizado usuarios_detalle:", upd.data)

    except Exception as exc:
        print("Error actualizando usuarios_detalle con listas negras:", exc)

    return ResumenListasNegras(
        usuario_id=usuario_id,
        en_lista_negra=resultado["en_lista_negra"],
        total_registros=resultado["total_registros"],
        resumen=resultado["resumen"],
        sanciones=resultado["sanciones"],
    )

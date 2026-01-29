from fastapi import APIRouter

from app.clients.supabase import supabase
from app.models.schemas import OAuthUsuario, Usuario

router = APIRouter()


@router.post("/registrar")
def registrar(usuario: Usuario):
    try:
        resp = (
            supabase.table("usuarios")
            .insert({
                "correo": usuario.email,
                "contrasena": usuario.password,
                "provider": "propio",
            })
            .execute()
        )

        return {"ok": True, "data": resp, "ya_existia": False}

    except Exception as exc:
        print("Error en /registrar:", exc)
        return {"ok": False, "error": str(exc)}


@router.post("/registrar_oauth")
def registrar_oauth(usuario: OAuthUsuario):
    """
    Crea o actualiza un usuario que viene de OAuth o verificacion_email.
    - Si el correo NO existe en `usuarios`, inserta (nuevo)
    - Si el correo ya existe:
        * si se registro con contrasena, bloquea OAuth
        * si ya era OAuth, permite actualizar provider/datos sin duplicar
    """
    try:
        existente = (
            supabase.table("usuarios")
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

            if prov_actual in ("propio", "email"):
                return {
                    "ok": False,
                    "ya_existia": True,
                    "motivo": "registrado_con_contrasena",
                    "provider_actual": prov_actual,
                }

        payload = {
            "correo": usuario.email,
            "provider": usuario.provider or "google",
        }

        resp = supabase.table("usuarios").upsert(payload, on_conflict="correo").execute()

        return {
            "ok": True,
            "data": resp,
            "ya_existia": ya_existia,
            "provider_anterior": prov_actual,
        }

    except Exception as exc:
        print("Error en /registrar_oauth:", exc)
        return {"ok": False, "error": str(exc)}

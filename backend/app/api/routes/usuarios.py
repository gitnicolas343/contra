from uuid import UUID

from fastapi import APIRouter

from app.clients.supabase import supabase

router = APIRouter()


@router.get("/usuarios/existe")
def usuario_existe(email: str):
    """
    Devuelve:
      {
        "existe": bool,
        "usuario_id": str|None,
        "tiene_detalle": bool
      }
    """
    try:
        resp = (
            supabase.table("usuarios")
            .select("id")
            .eq("correo", email)
            .limit(1)
            .execute()
        )

        existe = bool(resp.data)
        if not existe:
            return {"existe": False, "usuario_id": None, "tiene_detalle": False}

        usuario_id = resp.data[0]["id"]

        detalle = (
            supabase.table("usuarios_detalle")
            .select("usuario_id")
            .eq("usuario_id", usuario_id)
            .limit(1)
            .execute()
        )

        return {
            "existe": True,
            "usuario_id": usuario_id,
            "tiene_detalle": bool(detalle.data),
        }

    except Exception as exc:
        print("Error en /usuarios/existe:", exc)
        return {"existe": False, "usuario_id": None, "tiene_detalle": False, "error": str(exc)}


@router.get("/usuarios/detalle_estado")
def detalle_estado(usuario_id: UUID):
    """
    Devuelve:
      { "existe": bool, "completo": bool }
    Completo se evalua con los NOT NULL definidos:
      nombre_completo, tipo_documento, numero_documento, empresa
    """
    try:
        resp = (
            supabase.table("usuarios_detalle")
            .select("nombre_completo,tipo_documento,numero_documento,empresa,telefono")
            .eq("usuario_id", str(usuario_id))
            .limit(1)
            .execute()
        )

        if not resp.data:
            return {"existe": False, "completo": False}

        fila = resp.data[0] or {}

        requeridos = ["nombre_completo", "tipo_documento", "numero_documento", "empresa"]
        completo = all((fila.get(k) or "").strip() for k in requeridos)

        return {"existe": True, "completo": bool(completo)}

    except Exception as exc:
        print("Error en /usuarios/detalle_estado:", exc)
        return {"existe": False, "completo": False, "error": str(exc)}

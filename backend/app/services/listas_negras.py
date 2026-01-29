import math
from datetime import datetime
from typing import Any, Dict, List, Optional

import pandas as pd
import requests

from app.core.config import SOCRATA_APP_TOKEN
from app.utils.normalizacion import normalizar_documento, normalizar_nombre

# Utilities
def _json_safe(value: Any) -> Any:
    """Convert NaN/NaT/inf to None and force JSON-safe types."""
    if value is None:
        return None

    try:
        if pd.isna(value):
            return None
    except Exception:
        pass

    if isinstance(value, (int, float)):
        try:
            if math.isinf(value):
                return None
        except Exception:
            pass

    if isinstance(value, datetime):
        return value.isoformat()

    return value


def _safe_str(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, float) and math.isnan(value):
        return ""
    return str(value).strip()


def _safe_float(value: Any):
    if value is None:
        return None
    try:
        x = float(value)
        if math.isnan(x) or math.isinf(x):
            return None
        return x
    except Exception:
        return None


def _safe_date(value: Any) -> str | None:
    s = _safe_str(value)
    return s or None


def _clean_sancion_dict(data: Dict[str, Any]) -> Dict[str, Any]:
    return {key: _json_safe(val) for key, val in data.items()}


# SODA / SODA3 config
CSV_PROC_URL = "https://www.datos.gov.co/api/v3/views/iaeu-rcn6/query.csv"
CSV_SECOP1_URL = "https://www.datos.gov.co/api/v3/views/4n4q-k399/query.csv"
CSV_SECOP2_URL = "https://www.datos.gov.co/api/v3/views/it5q-hg94/query.csv"


def _request_soda3_csv(base_url: str, sql: str) -> pd.DataFrame:
    """Call a SODA3 query.csv endpoint with a simple SQL statement."""
    headers: Dict[str, str] = {}
    params: Dict[str, Any] = {"query": sql}

    if SOCRATA_APP_TOKEN:
        headers["X-App-Token"] = SOCRATA_APP_TOKEN
        params["app_token"] = SOCRATA_APP_TOKEN

    resp = requests.get(base_url, params=params, headers=headers, timeout=30)
    resp.raise_for_status()

    from io import StringIO

    return pd.read_csv(StringIO(resp.text))


def _cargar_todo_soda3(base_url: str, limite: int = 50000) -> pd.DataFrame:
    """Download up to `limite` rows (select * limit N) without filters."""
    sql = f"select * limit {limite}"
    sql = " ".join(sql.split())

    try:
        return _request_soda3_csv(base_url, sql)
    except Exception as exc:
        print(f"Error cargando CSV desde {base_url}:", exc)
        return pd.DataFrame()


# Queries by source
def consultar_procuraduria_por_doc(doc_normalizado: str, limite: int = 50000) -> pd.DataFrame:
    """Inhabilidades de Procuraduria por numero_identificacion."""
    if not doc_normalizado:
        return pd.DataFrame()

    df = _cargar_todo_soda3(CSV_PROC_URL, limite=limite)
    if df.empty:
        return df

    if "numero_identificacion" not in df.columns:
        print("Advertencia: columna 'numero_identificacion' no encontrada en Procuraduria.")
        return pd.DataFrame()

    df["numero_identificacion"] = df["numero_identificacion"].astype(str)
    df["doc_norm_python"] = df["numero_identificacion"].apply(normalizar_documento)

    return df[df["doc_norm_python"] == doc_normalizado].copy()


def consultar_secop1_por_doc(doc_normalizado: str, limite: int = 5000) -> pd.DataFrame:
    """
    Multas SECOP I por NIT:
    - Busca en nit_entidad y documento_contratista.
    """
    if not doc_normalizado:
        return pd.DataFrame()

    secop1_resource_url = "https://www.datos.gov.co/resource/4n4q-k399.csv"

    where_clause = (
        f"nit_entidad like '{doc_normalizado}%' "
        f"OR documento_contratista like '{doc_normalizado}%'"
    )

    headers: Dict[str, str] = {}
    params: Dict[str, Any] = {
        "$limit": limite,
        "$where": where_clause,
    }

    if SOCRATA_APP_TOKEN:
        headers["X-App-Token"] = SOCRATA_APP_TOKEN
        params["$$app_token"] = SOCRATA_APP_TOKEN

    try:
        resp = requests.get(secop1_resource_url, params=params, headers=headers, timeout=30)
        resp.raise_for_status()
    except Exception as exc:
        print("Error consultando SECOP I por NIT:", exc)
        return pd.DataFrame()

    from io import StringIO

    try:
        df = pd.read_csv(StringIO(resp.text))
    except Exception as exc:
        print("Error parseando CSV de SECOP I:", exc)
        return pd.DataFrame()

    if df.empty:
        print(f"SECOP I: sin resultados para NIT {doc_normalizado} (CSV vacio).")
        return df

    if "nit_entidad" not in df.columns and "documento_contratista" not in df.columns:
        print("Advertencia: ni 'nit_entidad' ni 'documento_contratista' estan en SECOP I.")
        print("Columnas disponibles:", list(df.columns))
        return pd.DataFrame()

    if "nit_entidad" in df.columns:
        df["nit_entidad"] = df["nit_entidad"].astype(str)
        df["nit_entidad_norm"] = df["nit_entidad"].apply(normalizar_documento)
    else:
        df["nit_entidad_norm"] = None

    if "documento_contratista" in df.columns:
        df["documento_contratista"] = df["documento_contratista"].astype(str)
        df["doc_contratista_norm"] = df["documento_contratista"].apply(normalizar_documento)
    else:
        df["doc_contratista_norm"] = None

    df_filtrado = df[
        (df["nit_entidad_norm"] == doc_normalizado)
        | (df["doc_contratista_norm"] == doc_normalizado)
    ].copy()

    return df_filtrado


def consultar_secop2_por_nombre(nombre_empresa: str, limite: int = 50000) -> pd.DataFrame:
    """Multas SECOP II por nombre_proveedor_objeto_de."""
    if not nombre_empresa:
        return pd.DataFrame()

    df = _cargar_todo_soda3(CSV_SECOP2_URL, limite=limite)
    if df.empty:
        return df

    if "nombre_proveedor_objeto_de" not in df.columns:
        print("Advertencia: columna 'nombre_proveedor_objeto_de' no encontrada en SECOP II.")
        print("Columnas disponibles:", list(df.columns))
        return pd.DataFrame()

    nombre_norm_objetivo = normalizar_nombre(nombre_empresa)

    df["nombre_proveedor_objeto_de"] = df["nombre_proveedor_objeto_de"].astype(str)
    df["nombre_norm_python"] = df["nombre_proveedor_objeto_de"].apply(normalizar_nombre)

    df_filtrado = df[df["nombre_norm_python"] == nombre_norm_objetivo].copy()
    return df_filtrado


# Unified API
def consultar_listas_negras(
    numero_documento: Optional[str],
    nit_empresa: Optional[str],
    nombre_empresa: Optional[str],
) -> Dict[str, Any]:
    doc_norm = normalizar_documento(numero_documento) if numero_documento else None
    nit_norm = normalizar_documento(nit_empresa) if nit_empresa else None
    nombre_emp = (nombre_empresa or "").strip()

    df_proc = pd.DataFrame()
    df_secop1 = pd.DataFrame()
    df_secop2 = pd.DataFrame()

    if doc_norm:
        df_proc = consultar_procuraduria_por_doc(doc_norm)

    if nit_norm:
        df_secop1 = consultar_secop1_por_doc(nit_norm)

    if nombre_emp:
        df_secop2 = consultar_secop2_por_nombre(nombre_emp)

    sanciones: List[Dict[str, Any]] = []

    if not df_proc.empty:
        for _, row in df_proc.iterrows():
            nombre_sancionado = " ".join(
                [
                    _safe_str(row.get("primer_nombre")),
                    _safe_str(row.get("segundo_nombre")),
                    _safe_str(row.get("primer_apellido")),
                    _safe_str(row.get("segundo_apellido")),
                ]
            ).strip()

            sanciones.append(
                _clean_sancion_dict(
                    {
                        "fuente": "Procuraduria",
                        "tipo_registro": "inhabilidad",
                        "tipo_detalle": _safe_str(row.get("tipo_inhabilidad")) or "inhabilidad",
                        "nombre_sancionado": nombre_sancionado or "N/D",
                        "identificador": _safe_str(row.get("numero_identificacion"))
                        or (doc_norm or "N/D"),
                        "valor_multa": None,
                        "fecha_evento": _safe_date(row.get("fecha_efectos_juridicos")),
                        "fecha_firmeza": None,
                        "estado": None,
                        "url_detalle": None,
                        "recomendacion": "Revisar la inhabilidad registrada en Procuraduria.",
                    }
                )
            )

    if not df_secop1.empty:
        for _, row in df_secop1.iterrows():
            identificador = (
                _safe_str(row.get("documento_contratista"))
                or _safe_str(row.get("nit_entidad"))
                or (nit_norm or "N/D")
            )

            sanciones.append(
                _clean_sancion_dict(
                    {
                        "fuente": "SECOP I",
                        "tipo_registro": "multa",
                        "tipo_detalle": "multa",
                        "nombre_sancionado": _safe_str(row.get("nombre_contratista")) or "N/D",
                        "identificador": identificador,
                        "valor_multa": _safe_float(row.get("valor_sancion")),
                        "fecha_evento": _safe_date(row.get("fecha_de_publicacion")),
                        "fecha_firmeza": _safe_date(row.get("fecha_de_firmeza")),
                        "estado": None,
                        "url_detalle": _safe_str(row.get("ruta_de_proceso")) or None,
                        "recomendacion": "Revisar el proceso en SECOP I antes de continuar.",
                    }
                )
            )

    if not df_secop2.empty:
        for _, row in df_secop2.iterrows():
            sanciones.append(
                _clean_sancion_dict(
                    {
                        "fuente": "SECOP II",
                        "tipo_registro": "multa",
                        "tipo_detalle": _safe_str(row.get("tipo_de_sancion")) or "multa",
                        "nombre_sancionado": _safe_str(row.get("nombre_proveedor_objeto_de"))
                        or "N/D",
                        "identificador": _safe_str(row.get("as_codigo_proveedor_objeto")) or "N/D",
                        "valor_multa": _safe_float(row.get("valor")),
                        "fecha_evento": _safe_date(row.get("fecha_evento")),
                        "fecha_firmeza": None,
                        "estado": _safe_str(row.get("estado")) or None,
                        "url_detalle": None,
                        "recomendacion": "Revisar el detalle de la sancion en SECOP II.",
                    }
                )
            )

    total = int(len(sanciones))
    en_lista = bool(total > 0)

    if not en_lista:
        return {
            "en_lista_negra": False,
            "total_registros": 0,
            "resumen": "No se encontraron sanciones vigentes asociadas a este registro.",
            "sanciones": [],
        }

    resumen = (
        f"Se encontraron {len(df_proc)} registros en Procuraduria, "
        f"{len(df_secop1)} en SECOP I y {len(df_secop2)} en SECOP II."
    )

    return {
        "en_lista_negra": True,
        "total_registros": total,
        "resumen": resumen,
        "sanciones": sanciones,
    }

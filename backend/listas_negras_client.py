import os
import re
import math
from datetime import datetime
from typing import Any, Dict, List, Optional

import requests
import pandas as pd


# ============================================================
#  Utilidades de normalización
# ============================================================

def _json_safe(value: Any) -> Any:
    """Convierte NaN/NaT/inf a None y fuerza tipos serializables."""
    if value is None:
        return None

    # pandas/numpy NaN / NaT
    try:
        if pd.isna(value):
            return None
    except Exception:
        pass

    # inf / -inf
    if isinstance(value, (int, float)):
        try:
            if math.isinf(value):
                return None
        except Exception:
            pass

    if isinstance(value, datetime):
        return value.isoformat()

    return value



def _safe_str(v: Any) -> str:
    if v is None:
        return ""
    if isinstance(v, float) and math.isnan(v):
        return ""
    return str(v).strip()

def _safe_float(v: Any):
    if v is None:
        return None
    try:
        x = float(v)
        if math.isnan(x) or math.isinf(x):
            return None
        return x
    except Exception:
        return None

def _safe_date(v: Any) -> str | None:
    s = _safe_str(v)
    return s or None



def _clean_sancion_dict(d: Dict[str, Any]) -> Dict[str, Any]:
    return {k: _json_safe(v) for k, v in d.items()}


def normalizar_documento(doc: Optional[str]) -> Optional[str]:
    """
    Limpia un documento (CC, NIT, etc.):
    - quita espacios y puntos
    - corta después del guion
    - deja solo dígitos
    """
    if doc is None:
        return None

    doc = str(doc)
    doc = doc.replace(" ", "").replace(".", "").strip()
    doc = doc.split("-")[0]
    solo_digitos = re.sub(r"\D", "", doc)
    return solo_digitos or None


def normalizar_nombre(nombre: Optional[str]) -> str:
    """
    Normaliza un nombre para comparaciones:
    - pasa a minúsculas
    - quita tildes básicas y ñ -> n
    - colapsa espacios múltiples en uno solo
    """
    if not nombre:
        return ""

    texto = str(nombre).strip().lower()
    reemplazos = str.maketrans("áéíóúüñ", "aeiouun")
    texto = texto.translate(reemplazos)
    texto = re.sub(r"\s+", " ", texto)
    return texto


# ============================================================
#  Configuración SODA / SODA3
# ============================================================

SOCRATA_TOKEN = os.getenv("SOCRATA_APP_TOKEN") or "W79Vfw5oR17nZVyO8Pdyhvc5g"

CSV_PROC_URL   = "https://www.datos.gov.co/api/v3/views/iaeu-rcn6/query.csv"
CSV_SECOP1_URL = "https://www.datos.gov.co/api/v3/views/4n4q-k399/query.csv"
CSV_SECOP2_URL = "https://www.datos.gov.co/api/v3/views/it5q-hg94/query.csv"


def _request_soda3_csv(base_url: str, sql: str) -> pd.DataFrame:
    """
    Llama a un endpoint query.csv con una sentencia SQL simple de SODA3.
    """
    headers: Dict[str, str] = {}
    params: Dict[str, Any] = {"query": sql}

    if SOCRATA_TOKEN:
        headers["X-App-Token"] = SOCRATA_TOKEN
        params["app_token"] = SOCRATA_TOKEN

    resp = requests.get(base_url, params=params, headers=headers, timeout=30)
    resp.raise_for_status()

    from io import StringIO
    return pd.read_csv(StringIO(resp.text))


def _cargar_todo_soda3(base_url: str, limite: int = 50000) -> pd.DataFrame:
    """
    Descarga hasta `limite` filas (select * limit N) sin filtros.
    """
    sql = f"select * limit {limite}"
    sql = " ".join(sql.split())

    try:
        return _request_soda3_csv(base_url, sql)
    except Exception as e:
        print(f"Error cargando CSV desde {base_url}:", e)
        return pd.DataFrame()


# ============================================================
#  Consultas a cada fuente
# ============================================================

def consultar_procuraduria_por_doc(doc_normalizado: str, limite: int = 50000) -> pd.DataFrame:
    """
    Inhabilidades de Procuraduría por numero_identificacion.
    """
    if not doc_normalizado:
        return pd.DataFrame()

    df = _cargar_todo_soda3(CSV_PROC_URL, limite=limite)
    if df.empty:
        return df

    if "numero_identificacion" not in df.columns:
        print("Advertencia: columna 'numero_identificacion' no encontrada en Procuraduría.")
        return pd.DataFrame()

    df["numero_identificacion"] = df["numero_identificacion"].astype(str)
    df["doc_norm_python"] = df["numero_identificacion"].apply(normalizar_documento)

    return df[df["doc_norm_python"] == doc_normalizado].copy()


def consultar_secop1_por_doc(doc_normalizado: str, limite: int = 5000) -> pd.DataFrame:
    """
    Multas SECOP I por NIT:
      - Busca tanto en nit_entidad (entidad estatal)
      - como en documento_contratista (empresa/contratista).

    Estrategia:
      1) Consultar el dataset SECOP I filtrando en el servidor por:
           nit_entidad LIKE '<NIT>%'
           OR documento_contratista LIKE '<NIT>%'
      2) Normalizar ambas columnas en pandas.
      3) Filtrar por coincidencia exacta del NIT normalizado.
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

    if SOCRATA_TOKEN:
        headers["X-App-Token"] = SOCRATA_TOKEN
        params["$$app_token"] = SOCRATA_TOKEN

    try:
        resp = requests.get(secop1_resource_url, params=params, headers=headers, timeout=30)
        resp.raise_for_status()
    except Exception as e:
        print("Error consultando SECOP I por NIT:", e)
        return pd.DataFrame()

    from io import StringIO
    try:
        df = pd.read_csv(StringIO(resp.text))
    except Exception as e:
        print("Error parseando CSV de SECOP I:", e)
        return pd.DataFrame()

    if df.empty:
        print(f"SECOP I: sin resultados para NIT {doc_normalizado} (CSV vacío).")
        return df

    if "nit_entidad" not in df.columns and "documento_contratista" not in df.columns:
        print("Advertencia: ni 'nit_entidad' ni 'documento_contratista' están en SECOP I.")
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
    """
    Multas SECOP II por nombre_proveedor_objeto_de.
    """
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


# ============================================================
#  Unificación para usar desde FastAPI
# ============================================================

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

    # Procuraduría
    if not df_proc.empty:
        for _, row in df_proc.iterrows():
            nombre_sancionado = " ".join([
                _safe_str(row.get("primer_nombre")),
                _safe_str(row.get("segundo_nombre")),
                _safe_str(row.get("primer_apellido")),
                _safe_str(row.get("segundo_apellido")),
            ]).strip()

            sanciones.append({
                "fuente": "Procuraduría",
                "tipo_registro": "inhabilidad",
                "tipo_detalle": _safe_str(row.get("tipo_inhabilidad")) or "inhabilidad",
                "nombre_sancionado": nombre_sancionado or "N/D",
                "identificador": _safe_str(row.get("numero_identificacion")) or (doc_norm or "N/D"),
                "valor_multa": None,
                "fecha_evento": _safe_date(row.get("fecha_efectos_juridicos")),
                "fecha_firmeza": None,
                "estado": None,
                "url_detalle": None,
                "recomendacion": "Revisar la inhabilidad registrada en Procuraduría.",
            })

    # SECOP I
    if not df_secop1.empty:
        for _, row in df_secop1.iterrows():
            identificador = (
                _safe_str(row.get("documento_contratista")) or
                _safe_str(row.get("nit_entidad")) or
                (nit_norm or "N/D")
            )

            sanciones.append({
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
                "recomendacion": "Revisar el proceso en SECOP I antes de continuar con la vinculación.",
            })

    # SECOP II
    if not df_secop2.empty:
        for _, row in df_secop2.iterrows():
            sanciones.append({
                "fuente": "SECOP II",
                "tipo_registro": "multa",
                "tipo_detalle": _safe_str(row.get("tipo_de_sancion")) or "multa",
                "nombre_sancionado": _safe_str(row.get("nombre_proveedor_objeto_de")) or "N/D",
                "identificador": _safe_str(row.get("as_codigo_proveedor_objeto")) or "N/D",
                "valor_multa": _safe_float(row.get("valor")),
                "fecha_evento": _safe_date(row.get("fecha_evento")),
                "fecha_firmeza": None,
                "estado": _safe_str(row.get("estado")) or None,
                "url_detalle": None,
                "recomendacion": "Revisar el detalle de la sanción en SECOP II.",
            })

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
        f"Se encontraron {len(df_proc)} registros en Procuraduría, "
        f"{len(df_secop1)} en SECOP I y {len(df_secop2)} en SECOP II."
    )

    return {
        "en_lista_negra": True,
        "total_registros": total,
        "resumen": resumen,
        "sanciones": sanciones,
    }


import re
import unicodedata
from typing import Optional


def normalizar_documento(doc: Optional[str]) -> Optional[str]:
    """
    Normaliza un documento (CC, NIT, etc.):
    - quita espacios y puntos
    - corta despues del guion
    - deja solo digitos
    """
    if doc is None:
        return None

    doc_str = str(doc).replace(" ", "").replace(".", "").strip()
    doc_str = doc_str.split("-")[0]
    solo_digitos = re.sub(r"\D", "", doc_str)
    return solo_digitos or None


def normalizar_nombre(nombre: Optional[str]) -> str:
    """
    Normaliza un nombre para comparaciones:
    - minusculas
    - quita tildes basicas
    - colapsa espacios multiples
    """
    if not nombre:
        return ""

    texto = str(nombre).strip().lower()
    texto = unicodedata.normalize("NFKD", texto)
    texto = "".join(ch for ch in texto if not unicodedata.combining(ch))
    texto = re.sub(r"\s+", " ", texto)
    return texto

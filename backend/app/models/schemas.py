from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel


class Usuario(BaseModel):
    email: str
    password: str


class LoginRequest(BaseModel):
    """Payload esperado desde login.html."""
    email: str
    password: str


class OAuthUsuario(BaseModel):
    email: str
    provider: str | None = None
    auth_id: str | None = None


class CompletarRegistro(BaseModel):
    """
    Datos de perfil/contrato que se llenan en verificacion.html.
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
    fuente: str
    tipo_registro: str
    tipo_detalle: str | None = None
    nombre_sancionado: str | None = None
    identificador: str | None = None
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

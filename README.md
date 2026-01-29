# ContratRed

Aplicacion web con backend FastAPI y frontend estatico. Gestiona registro de usuarios, perfil de contratistas y consulta de listas negras en fuentes oficiales (Procuraduria, SECOP I, SECOP II). El backend expone endpoints JSON y sirve las paginas HTML desde `/static`.

## Tecnologias
- Python 3.11
- FastAPI + Uvicorn
- Supabase (Postgres + API)
- pandas, requests
- python-dotenv
- Docker

## Servicios externos
- Supabase: tablas `usuarios` y `usuarios_detalle`
- datos.gov.co (Socrata):
  - Procuraduria (inhabilidades)
  - SECOP I (multas)
  - SECOP II (multas)

## Documentacion
- `docs/README.md`
- `docs/PROJECT_MAP.md`
- `docs/FRONTEND_GUIDE.md`
- `docs/BACKEND_GUIDE.md`
- `docs/CONTRIBUTING.md`

## Mapa del proyecto
```
backend/
  app/
    api/routes/           # Endpoints REST
    clients/              # Clientes externos (Supabase)
    core/                 # Configuracion y env
    models/               # Schemas Pydantic
    services/             # Logica de negocio
    utils/                # Normalizacion y helpers
    main.py               # FastAPI app
  main.py                 # Wrapper para uvicorn main:app
  requirements.txt
static/
  css/
    base.css              # Estilos globales + animaciones
    auth.css              # Header/nav y layout comun en auth
    home.css              # Estilos especificos de index
    login.css             # Estilos de login
    inscripcion.css       # Estilos de inscripcion
    verificacion.css      # Estilos de verificacion
    verificacion_email.css
    verificacion_oauth.css
    reset_password.css
  js/
    base.js               # Helpers compartidos (placeholder)
    login.js
    inscripcion.js
    verificacion.js
    verificacion_email.js
    verificacion_oauth.js
    reset_password.js
  assets/
    img/
      logo.png
      robot.png
  index.html
  login.html
  inscripcion.html
  verificacion.html
  verificacion_email.html
  verificacion_oauth.html
  reset_password.html
Dockerfile
README.md
```

## Variables de entorno
Archivo: `backend/.env`
- `SUPABASE_URL`
- `SUPABASE_KEY`
- `SOCRATA_APP_TOKEN` (opcional)

## Ejecutar en local
```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 10000 --reload
```

Abrir `http://localhost:10000`.

## Ejecutar con Docker
```bash
docker build -t contractred .
docker run --rm -p 10000:10000 --env-file backend/.env contractred
```

## Endpoints principales
- `POST /registrar`
  - Body: `{ "email": "...", "password": "..." }`
- `POST /registrar_oauth`
  - Body: `{ "email": "...", "provider": "google" }`
- `GET /usuarios/existe?email=...`
- `GET /usuarios/detalle_estado?usuario_id=...`
- `POST /completar_registro`
- `GET /listas_negras/resumen?usuario_id=...`

## Notas
- El frontend consume los endpoints via `fetch`.
- Los estilos estan separados en `static/css` y los scripts en `static/js`.
- La paleta de color base se mantiene en `base.css`.

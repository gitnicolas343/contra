from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app.api.routes import auth, listas_negras, usuarios

app = FastAPI()

REPO_DIR = Path(__file__).resolve().parents[2]
STATIC_DIR = REPO_DIR / "static"

app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")


@app.get("/")
def home():
    return FileResponse(str(STATIC_DIR / "index.html"))


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(usuarios.router)
app.include_router(listas_negras.router)

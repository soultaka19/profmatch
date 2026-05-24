from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import auth, cv, extraction
from app.routers import sessions as sessions_router
from app.routers import programmes as programmes_router
from app.routers import etapes as etapes_router
from app.routers import cursus as cursus_router
from app.routers import cours as cours_router
from app.routers import cours_competences as cours_competences_router
from app.routers import affectations as affectations_router
from app.routers import utilisateurs as utilisateurs_router

app = FastAPI(
    title="ProfMatch API",
    version="0.1.0",
    description="Gestion de CV et affectation des professeurs — Défi La Cité 2026",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(cv.router, prefix="/api/cv", tags=["cv"])
app.include_router(extraction.router, prefix="/api/cv", tags=["extraction"])
app.include_router(sessions_router.router, prefix="/api/sessions", tags=["sessions"])
app.include_router(programmes_router.router, prefix="/api/programmes", tags=["programmes"])
app.include_router(etapes_router.router, prefix="/api/programmes", tags=["etapes"])
app.include_router(cursus_router.router, prefix="/api/programmes", tags=["cursus"])
app.include_router(cours_router.router, prefix="/api/cours", tags=["cours"])
app.include_router(cours_competences_router.router, prefix="/api/cours", tags=["cours-competences"])
app.include_router(affectations_router.router, prefix="/api/affectations", tags=["affectations"])
app.include_router(utilisateurs_router.router, prefix="/api/admin/utilisateurs", tags=["admin-utilisateurs"])


@app.get("/health", tags=["system"])
async def health() -> dict:
    return {"status": "ok", "service": "profmatch-api", "version": "0.1.0"}

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.routers import admin_maintenance as admin_maintenance_router
from app.routers import admin_stats as admin_stats_router
from app.routers import affectations as affectations_router
from app.routers import auth, cv, extraction
from app.routers import cours as cours_router
from app.routers import cours_competences as cours_competences_router
from app.routers import cursus as cursus_router
from app.routers import etapes as etapes_router
from app.routers import profil as profil_router
from app.routers import programmes as programmes_router
from app.routers import rh_professeurs as rh_professeurs_router
from app.routers import sessions as sessions_router
from app.routers import utilisateurs as utilisateurs_router

app = FastAPI(
    title="ProfMatch API",
    version="0.1.0",
    description="Gestion de CV et affectation des professeurs — Défi La Cité 2026",
    docs_url="/docs",
    redoc_url="/redoc",
)

# Origine du frontend lue dans la configuration (FRONTEND_URL, défaut
# http://localhost:3000) ; localhost:3000 reste toujours accepté pour le dev local.
_cors_origins = sorted({"http://localhost:3000", settings.FRONTEND_URL.rstrip("/")})

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(profil_router.router, prefix="/api/profil", tags=["profil"])
app.include_router(cv.router, prefix="/api/cv", tags=["cv"])
app.include_router(extraction.router, prefix="/api/cv", tags=["extraction"])
app.include_router(sessions_router.router, prefix="/api/sessions", tags=["sessions"])
app.include_router(programmes_router.router, prefix="/api/programmes", tags=["programmes"])
app.include_router(etapes_router.router, prefix="/api/programmes", tags=["etapes"])
app.include_router(cursus_router.router, prefix="/api/programmes", tags=["cursus"])
app.include_router(cours_router.router, prefix="/api/cours", tags=["cours"])
app.include_router(cours_competences_router.router, prefix="/api/cours", tags=["cours-competences"])
app.include_router(affectations_router.router, prefix="/api/affectations", tags=["affectations"])
app.include_router(
    utilisateurs_router.router, prefix="/api/admin/utilisateurs", tags=["admin-utilisateurs"]
)
app.include_router(
    rh_professeurs_router.router, prefix="/api/rh/professeurs", tags=["rh-professeurs"]
)
app.include_router(
    admin_maintenance_router.router,
    prefix="/api/admin/maintenance",
    tags=["admin-maintenance"],
)
app.include_router(admin_stats_router.router, prefix="/api/admin/stats", tags=["admin-stats"])


@app.get("/health", tags=["system"])
async def health() -> dict:
    return {"status": "ok", "service": "profmatch-api", "version": "0.1.0"}

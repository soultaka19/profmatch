import asyncio
import contextlib
import logging
from collections.abc import AsyncIterator

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.demo_scope import referentiel_en_lecture_seule
from app.db.session import AsyncSessionLocal
from app.routers import admin_maintenance as admin_maintenance_router
from app.routers import admin_stats as admin_stats_router
from app.routers import affectations as affectations_router
from app.routers import auth, cv, extraction
from app.routers import cours as cours_router
from app.routers import cours_competences as cours_competences_router
from app.routers import cursus as cursus_router
from app.routers import demo as demo_router
from app.routers import etapes as etapes_router
from app.routers import profil as profil_router
from app.routers import programmes as programmes_router
from app.routers import rh_professeurs as rh_professeurs_router
from app.routers import sessions as sessions_router
from app.routers import utilisateurs as utilisateurs_router
from app.services.demo_service import purger_expires

logger = logging.getLogger(__name__)


async def _purge_periodique() -> None:
    """Efface les bacs à sable expirés.

    Sans cette boucle, la promesse « jetable » serait fausse : les comptes d'un
    visiteur — et le CV qu'il a pu téléverser — resteraient en base
    indéfiniment. Un premier passage a lieu au démarrage, car une API arrêtée
    plusieurs heures laisse des bacs en retard.
    """
    while True:
        try:
            async with AsyncSessionLocal() as db:
                await purger_expires(db)
        except Exception:
            # Une purge ratée ne doit pas tuer la boucle : on réessaie au tour
            # suivant plutôt que de laisser la tâche mourir en silence.
            logger.exception("Échec de la purge des bacs à sable")
        await asyncio.sleep(settings.DEMO_PURGE_INTERVALLE_SECONDES)


@contextlib.asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    purge = asyncio.create_task(_purge_periodique())
    try:
        yield
    finally:
        purge.cancel()
        with contextlib.suppress(asyncio.CancelledError):
            await purge


app = FastAPI(
    lifespan=lifespan,
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
app.include_router(demo_router.router, prefix="/api/demo", tags=["demo"])
app.include_router(profil_router.router, prefix="/api/profil", tags=["profil"])
app.include_router(cv.router, prefix="/api/cv", tags=["cv"])
app.include_router(extraction.router, prefix="/api/cv", tags=["extraction"])
app.include_router(sessions_router.router, prefix="/api/sessions", tags=["sessions"])
app.include_router(
    programmes_router.router,
    prefix="/api/programmes",
    tags=["programmes"],
    dependencies=[Depends(referentiel_en_lecture_seule)],
)
app.include_router(
    etapes_router.router,
    prefix="/api/programmes",
    tags=["etapes"],
    dependencies=[Depends(referentiel_en_lecture_seule)],
)
app.include_router(
    cursus_router.router,
    prefix="/api/programmes",
    tags=["cursus"],
    dependencies=[Depends(referentiel_en_lecture_seule)],
)
app.include_router(
    cours_router.router,
    prefix="/api/cours",
    tags=["cours"],
    dependencies=[Depends(referentiel_en_lecture_seule)],
)
app.include_router(
    cours_competences_router.router,
    prefix="/api/cours",
    tags=["cours-competences"],
    dependencies=[Depends(referentiel_en_lecture_seule)],
)
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
    # Recharger le jeu de démonstration ou relancer les embeddings agit sur le
    # référentiel partagé et dépense chez le fournisseur : hors de portée d'un
    # visiteur.
    dependencies=[Depends(referentiel_en_lecture_seule)],
)
app.include_router(admin_stats_router.router, prefix="/api/admin/stats", tags=["admin-stats"])


@app.get("/health", tags=["system"])
async def health() -> dict:
    return {"status": "ok", "service": "profmatch-api", "version": "0.1.0"}

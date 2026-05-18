from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

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

# Les routers sont ajoutés ici au fur et à mesure des features
# from app.routers import auth, cv, affectations
# app.include_router(auth.router, prefix="/api")


@app.get("/health", tags=["system"])
async def health() -> dict:
    return {"status": "ok", "service": "profmatch-api", "version": "0.1.0"}

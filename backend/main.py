from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from config import get_settings
from database import connect_to_mongo, close_mongo_connection
from routers import documents, simulations, auth, google_oauth, chat

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await connect_to_mongo()
    yield
    # Shutdown
    await close_mongo_connection()


app = FastAPI(
    title="GENZPULSE API",
    description="Transform textbook content into interactive causal structures",
    version="1.0.0",
    lifespan=lifespan
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(google_oauth.router, prefix="/api/auth", tags=["OAuth"])
app.include_router(documents.router, prefix="/api/documents", tags=["Documents"])
app.include_router(simulations.router, prefix="/api/simulations", tags=["Simulations"])
app.include_router(chat.router, prefix="/api/chat", tags=["Chat"])


@app.get("/")
async def root():
    return {"message": "GENZPULSE API - Interactive Causal Structure"}


@app.get("/health")
async def health():
    return {"status": "healthy"}

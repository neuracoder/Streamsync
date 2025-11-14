from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import yt_dlp
import logging
from typing import Optional

# Configurar logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="StreamSync API",
    description="API para extracción de streams de YouTube",
    version="1.0.0"
)

# CORS - permite requests desde Railway y localhost (permisivo para testing)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Permite todos los orígenes temporalmente
    allow_credentials=False,  # Debe ser False si allow_origins es "*"
    allow_methods=["*"],
    allow_headers=["*"],
)

# Modelos Pydantic
class VideoRequest(BaseModel):
    url: str

class StreamResponse(BaseModel):
    success: bool
    audioUrl: Optional[str] = None
    videoUrl: Optional[str] = None
    title: Optional[str] = None
    thumbnail: Optional[str] = None
    duration: Optional[int] = None
    channel: Optional[str] = None
    error: Optional[str] = None

# Health check
@app.get("/")
async def root():
    return {
        "status": "online",
        "service": "StreamSync API",
        "version": "1.0.0"
    }

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

# Endpoint principal de extracción
@app.post("/api/extract", response_model=StreamResponse)
async def extract_stream(request: VideoRequest):
    """
    Extrae URLs de audio/video de YouTube.

    Soporta:
    - Videos normales
    - Livestreams
    - Shorts
    """

    try:
        logger.info(f"Extrayendo stream para: {request.url}")

        # Configuración de yt-dlp
        ydl_opts = {
            'format': 'bestaudio/best',  # Mejor calidad de audio
            'quiet': True,
            'no_warnings': True,
            'extract_flat': False,
            'geo_bypass': True,
            'nocheckcertificate': True,
        }

        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            # Extraer información sin descargar
            info = ydl.extract_info(request.url, download=False)

            if not info:
                raise HTTPException(status_code=404, detail="Video no encontrado")

            # Extraer URL de audio
            audio_url = None
            if 'url' in info:
                audio_url = info['url']
            elif 'formats' in info and len(info['formats']) > 0:
                # Buscar mejor formato de audio
                audio_formats = [f for f in info['formats'] if f.get('acodec') != 'none']
                if audio_formats:
                    audio_url = audio_formats[-1]['url']

            # Extraer URL de video (opcional)
            video_url = None
            if 'formats' in info:
                video_formats = [f for f in info['formats']
                               if f.get('vcodec') != 'none' and f.get('acodec') != 'none']
                if video_formats:
                    video_url = video_formats[-1]['url']

            response = StreamResponse(
                success=True,
                audioUrl=audio_url,
                videoUrl=video_url,
                title=info.get('title'),
                thumbnail=info.get('thumbnail'),
                duration=info.get('duration'),
                channel=info.get('uploader') or info.get('channel')
            )

            logger.info(f"Extracción exitosa: {info.get('title')}")
            return response

    except yt_dlp.utils.DownloadError as e:
        logger.error(f"Error de yt-dlp: {str(e)}")
        return StreamResponse(
            success=False,
            error=f"Error al procesar video: {str(e)}"
        )
    except Exception as e:
        logger.error(f"Error inesperado: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Endpoint para búsqueda (opcional, para futuro)
@app.get("/api/search")
async def search_videos(query: str, max_results: int = 10):
    """
    Búsqueda de videos en YouTube (implementación futura)
    """
    return {
        "message": "Endpoint de búsqueda - próximamente",
        "query": query
    }

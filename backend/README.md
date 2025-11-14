# StreamSync Backend API

Backend FastAPI para extracción de streams de YouTube usando yt-dlp.

## 🚀 Deploy en Railway

### Paso 1: Crear proyecto en Railway

1. Ve a [railway.app](https://railway.app)
2. Click en "Start a New Project"
3. Selecciona "Deploy from GitHub repo"
4. Conecta este repositorio
5. Selecciona la carpeta `backend/`

### Paso 2: Configurar variables de entorno

En Railway, no necesitas configurar nada adicional. El `Procfile` y `railway.json` manejan todo.

### Paso 3: Deploy

Railway detectará automáticamente Python y desplegará con Nixpacks.

### Paso 4: Obtener URL

Una vez desplegado, Railway te dará una URL como:
```
https://tu-app.up.railway.app
```

Copia esta URL para usarla en el frontend.

## 🧪 Testing Local

```bash
# Instalar dependencias
pip install -r requirements.txt

# Ejecutar servidor
uvicorn main:app --reload --port 8000

# Testear endpoint
curl -X POST http://localhost:8000/api/extract \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"}'
```

## 📡 Endpoints

### `GET /`
Health check básico

**Response:**
```json
{
  "status": "online",
  "service": "StreamSync API",
  "version": "1.0.0"
}
```

### `GET /health`
Health check para monitoreo

**Response:**
```json
{
  "status": "healthy"
}
```

### `POST /api/extract`
Extrae URLs de streams de YouTube

**Request:**
```json
{
  "url": "https://www.youtube.com/watch?v=VIDEO_ID"
}
```

**Response:**
```json
{
  "success": true,
  "audioUrl": "https://...",
  "videoUrl": "https://...",
  "title": "Video Title",
  "thumbnail": "https://...",
  "duration": 180,
  "channel": "Channel Name"
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "Error al procesar video: ..."
}
```

### `GET /api/search`
Búsqueda de videos (próximamente)

**Query Params:**
- `query`: Término de búsqueda
- `max_results`: Número máximo de resultados (default: 10)

## 🔒 CORS

Configurado para aceptar requests desde:
- `localhost:3000` (desarrollo)
- `*.vercel.app` (producción)
- `https://streamsync.vercel.app` (producción específica)

Ajusta en `main.py` según tu dominio.

## 📦 Dependencias

- **FastAPI**: Framework web moderno
- **uvicorn**: Servidor ASGI
- **yt-dlp**: Descargador/extractor de YouTube
- **pydantic**: Validación de datos

## 🛠️ Estructura del Proyecto

```
backend/
├── main.py           # Aplicación FastAPI
├── requirements.txt  # Dependencias Python
├── Procfile         # Comando de inicio para Railway
├── runtime.txt      # Versión de Python
├── railway.json     # Configuración de Railway
├── .gitignore       # Archivos ignorados por Git
└── README.md        # Este archivo
```

## ⚠️ Notas Importantes

1. **Rate Limiting**: YouTube puede bloquear IPs con muchas requests. Considera implementar cache.
2. **ToS de YouTube**: El uso de yt-dlp puede violar los términos de servicio de YouTube.
3. **URLs temporales**: Las URLs de streams expiran después de algunas horas.
4. **CORS**: Asegúrate de agregar tu dominio de producción a la lista de orígenes permitidos.

## 🔧 Configuración Avanzada

### Variables de Entorno (Opcional)

Puedes agregar estas variables en Railway:

- `PORT`: Puerto del servidor (Railway lo maneja automáticamente)
- `LOG_LEVEL`: Nivel de logging (INFO, DEBUG, WARNING, ERROR)

### Personalizar yt-dlp

En `main.py`, puedes modificar `ydl_opts` para:
- Cambiar calidad de audio/video
- Agregar cookies para videos privados
- Configurar proxy
- Etc.

## 📝 TODO

- [ ] Implementar cache de URLs extraídas
- [ ] Agregar rate limiting
- [ ] Implementar búsqueda de videos
- [ ] Agregar soporte para playlists
- [ ] Implementar authentication (opcional)

## 🐛 Troubleshooting

### Error: "Video no encontrado"
- Verifica que la URL sea válida
- Algunos videos tienen restricciones geográficas
- Videos privados no son accesibles

### Error: "yt-dlp no instalado"
- Asegúrate de que `requirements.txt` esté instalado
- Railway debe instalar automáticamente las dependencias

### CORS Error
- Verifica que tu dominio esté en la lista de `allow_origins`
- Usa `*` solo para desarrollo (no recomendado en producción)

## 📄 Licencia

Este proyecto es solo para fines educativos. Úsalo bajo tu propia responsabilidad.

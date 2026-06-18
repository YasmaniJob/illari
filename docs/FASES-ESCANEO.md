# Fases del escaneo de sesión — Mi Wawita

## Principio

**No se persiste:** fotos, audio, PDFs ni base64 en disco o base de datos.  
**Sí se persiste (solo al confirmar):** sesión en Turso (`class_sessions`) — igual que el wizard manual.

## Las 5 fases

| # | Fase | Qué hace | Estado en código |
|---|------|----------|------------------|
| 1 | **Captura** | Cámara/galería, compresión en cliente | `ScanSessionFlow` workflow `capture` |
| 2 | **Lectura** | Visión IA (Google Gemini) | API `extractWithVision`, UI `processingStep: extract` |
| 3 | **Catálogo** | Match con `src/data/curriculo.csv` | `curriculumMatch.ts`, UI `processingStep: catalog` |
| 4 | **Revisión** | Resumen inline + edición currículo | `ScanSummary` + `CurricularFieldsEditor` |
| 5 | **Aula** | `saveSession` → `/aula` | Solo texto, sin medios |

## Activar lectura (Fase 2)

```env
GOOGLE_GENERATIVE_AI_API_KEY=...
GEMINI_VISION_MODEL=gemini-2.0-flash
```

Sin clave: la API responde 503; no hay modo demo.

## Próximas mejoras sugeridas

- **Fase 2b:** OCR local de respaldo si falla la red.
- **Catálogo:** más archivos en `data/` (por grado o UGEL).
- **Fase 4:** sugerencias alternativas cuando confianza &lt; 50%.
- **Despliegue:** edge function estática sin adapter Node si se migra el API.

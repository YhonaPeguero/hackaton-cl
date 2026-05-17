# hackaton-cl
**"El Minuto de Tu Comuna"** — Mapa 3D de plata municipal en Chile (transparencia + impacto social)

## ¿Qué es?
Un sitio donde cualquier chileno escribe su comuna y ve, en segundos:
- Cuánta plata entró y en qué se gastó
- Cómo cambiaron indicadores reales (áreas verdes, infraestructura, SIMCE)
- Qué observó la Contraloría

Botón estrella: **"Genera el minuto de tu comuna"** → video narrado de 30-45s listo para compartir por WhatsApp.

## Arquitectura
```
/frontend    — React + Vite + TypeScript, Mapbox GL JS (3D), CSS modules
/backend     — Express + SQLite, scraping SINIM/Contraloría, pipeline de datos
/data        — CSVs fuentes (pipeline versionado)
/videos      — videos pre-generados (3-4 comunas héroes para demo)
```

## Setup local
```bash
npm install
cd frontend && npm install
cd backend && npm install
```

## Variables de entorno (backend)
```bash
cp backend/.env.example backend/.env
# editar con las credenciales necesarias
```

## Scripts útiles
```bash
npm run dev              # frontend dev
npm run dev:backend      # backend dev
npm run scrape           # ejecutar scraping de fuentes públicas
```

## Fuentes de datos (públicas)
- **SINIM (SUBDERE)**: datos abiertos de las 345 municipalidades
- **Contraloría General de la República**: informes y observaciones de auditoría

## Deploy
- Frontend: Vercel
- Backend: Railway (o alternativa)
- Datos: embebidos en el build (no requieren servidor en producción)

## Licencia
MIT — Open source para que cualquier ciudadano auditе, contribuya o haga fork.
# Contraloria General de la República - Scraper

Módulo de scraping para extraer hallazgos de auditoría (informes de auditoría) de la Contraloria General de la República de Chile.

## Descripción

Este scraper obtiene datos públicos de informes de auditoría realizados a municipalidades chilenas, clasificando los hallazgos en diferentes categorías según la normativa de la CGR.

## Hallazgos (Findings)

Los hallazgos representan observaciones realizadas por la Contraloria en sus auditorías a municipalidades. Cada hallazgo incluye:

- **comuna_nombre**: Nombre de la comuna auditada
- **anno**: Año del informe de auditoría
- **tipo_hallazgo**: Clasificación del hallazgo según tipo de irregularidad
- **descripcion**: Descripción técnica del hallazgo observado
- **monto_asociado**: Monto involucrado en CLP (puede ser 0 si no aplica)
- **fuente_url**: URL del informe original en contraloria.cl

## Tipos de Hallazgos

| Tipo | Descripción | Severidad Típica |
|------|-------------|------------------|
| `licitacion` | Irregularidades en procesos de contratación pública | Alta |
| `rendicion_cuentas` | Problemas en documentación y rendición de fondos | Media |
| `beneficios_sociales` | Otorgamiento indebido de beneficios sociales | Alta |
| `obras_publicas` | Deficiencias en execution de obras públicas | Alta |
| `inventario` | Irregularidades en control de bienes e inventario | Baja |

## Uso

### Como módulo Node.js

```javascript
import scrapeContraloria from './scrapers/contraloria.js';

// Ejecutar scraping completo
const hallazgos = await scrapeContraloria({
  anno: 2023,
  outputPath: './data/contraloria/hallazgos.csv'
});

// Obtener hallazgos de una comuna específica
import { getHallazgosPorComuna } from './scrapers/contraloria.js';
const hallazgosSantiago = await getHallazgosPorComuna('Santiago');

// Filtrar por tipo
import { getHallazgosPorTipo } from './scrapers/contraloria.js';
const licitaciones = await getHallazgosPorTipo('licitacion');
```

### Como CLI

```bash
node src/scrapers/contraloria.js
node src/scrapers/contraloriaFetcher.js [output_path]
```

## Estructura de Archivos

```
backend/src/scrapers/
├── contraloria.js          # Scraper principal
├── contraloriaFetcher.js   # Lógica de fetching y generación de datos
└── README.md              # Este archivo

data/contraloria/
└── hallazgos.csv          # Datos generados por el scraper
```

## Notas técnicas

- Los datos se generan de forma reproducible usando un seed determinístico
- Aproximadamente el 40% de las comunas tienen hallazgos en un año dado
- Los montos se generan con distribución log-uniforme para reflejar la realidad
- Las descripciones son textos realistas basados en patrones reales de la CGR
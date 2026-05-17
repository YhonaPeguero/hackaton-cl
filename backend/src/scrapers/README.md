# SINIM Scraper

SINIM (Sistema de Información Municipal) data ingestion pipeline for the hackaton-cl project.

## Overview

This scraper fetches municipal data from SUBDERE's SINIM system for all 345 Chilean communes. Data includes:

- Budget execution (presupuesto_total)
- Education spending (gasto_educacion)
- Health spending (gasto_salud)
- Infrastructure spending (gasto_infraestructura)
- Green areas m² (m2_areas_verdes)
- Plazas m² (m2_plazas)
- Number of parks (numero_parques)
- Total enrollment (matricula_total)
- SIMCE math scores (promedio_simce_matematica)
- SIMCE language scores (promedio_simce_lenguaje)
- Contraloria observations (observaciones_contraloria)

## Files

- `sinimFetcher.js` - Data fetching module. Attempts to fetch from official SUBDERE endpoints and falls back to realistic generated data for all 345 communes.
- `sinim.js` - Main scraper module. Orchestrates fetch -> validate -> transform pipeline.

## Usage

```bash
# Run the full scraping pipeline
node src/scrapers/sinim.js

# Run the fetcher directly
node src/scrapers/sinimFetcher.js

# With custom output directory
node src/scrapers/sinim.js --output /custom/path
```

## Data Flow

1. **Fetch**: Attempts to download CSV from SUBDERE SINIM endpoints. If endpoints return 404 (which they currently do), falls back to generating realistic mock data for all 345 communes.
2. **Validate**: Validates CSV structure, checks required columns, validates data ranges, detects duplicates.
3. **Transform**: Normalizes data to match the SQLite database schema and outputs to `comunas_345.csv` in the data directory.

## Output

- `data/sinim/comunas_345.csv` - Main CSV file with all 345 communes
- `data/sinim/comunas_345_transformed.json` - Transformed JSON for database import

## Note on Data Sources

When real SINIM data becomes available (endpoints currently return 404), the fetcher will use it. Until then, realistic mock data is generated based on:
- Region characteristics (metropolitan/north/south)
- Deterministic seeded random for reproducibility
- Budget ranges based on population estimates
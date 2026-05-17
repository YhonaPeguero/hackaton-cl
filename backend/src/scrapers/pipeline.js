/**
 * Pipeline de scraping para fuentes públicas:
 * - SINIM (SUBDERE): datos abiertos de municipalidades
 * - Contraloria: informes de auditoría
 *
 * Para demo: usar datos sample ya cargados en comunas.js
 * Para producción: ejecutar npm run scrape
 */
import scrapeContraloria from './scrapers/contraloria.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function runPipeline() {
  console.log('[Pipeline] Iniciando scraping de fuentes públicas...');

  // Execute Contraloria findings scraping
  console.log('[Pipeline] Ejecutando scraping de Contraloria...');
  const hallazgosPath = path.join(__dirname, '../../../data/contraloria/hallazgos.csv');
  await scrapeContraloria({
    outputPath: hallazgosPath
  });

  console.log('[Pipeline] Scraping completado');
}
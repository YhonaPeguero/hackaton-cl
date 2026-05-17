/**
 * Contraloria General de la República de Chile - Audit Findings Scraper
 * 
 * This module provides the main scraping interface for CGR audit reports,
 * focusing on municipalities (municipalidades) and their findings (hallazgos).
 * 
 * Data source: https://www.contraloria.cl
 * Target: Informes de auditoría a municipalidades
 * 
 * Output: hallazgos.csv with findings linked to comunas
 */

import { fetchHallazgos, TIPOS_HALLAZGO, saveToCSV } from './contraloriaFetcher.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '../../../data/contraloria');
const CSV_OUTPUT_PATH = path.join(DATA_DIR, 'hallazgos.csv');

/**
 * Scraper configuration
 */
const SCRAPER_CONFIG = {
  anno: 2023,
  seed: 42,
  outputPath: CSV_OUTPUT_PATH
};

/**
 * Run the Contraloria scraper
 * 
 * @param {Object} options - Scraping options
 * @param {number} options.anno - Year to scrape (default: 2023)
 * @param {string} options.outputPath - Output CSV path (optional)
 * @param {boolean} options.saveToDb - Whether to save directly to database (default: false)
 * @returns {Promise<Array>} Array of findings
 */
export async function scrapeContraloria(options = {}) {
  const config = {
    ...SCRAPER_CONFIG,
    ...options
  };

  console.log('[ContraloriaScraper] Starting audit findings scraping...');
  console.log(`[ContraloriaScraper] Year: ${config.anno}`);
  console.log(`[ContraloriaScraper] Output: ${config.outputPath}`);

  try {
    // Fetch findings from the fetcher module
    const hallazgos = await fetchHallazgos({
      anno: config.anno,
      seed: config.seed || Math.floor(Date.now() / 1000) % 1000
    });

    console.log(`[ContraloriaScraper] Retrieved ${hallazgos.length} findings`);

    // Save to CSV
    saveToCSV(hallazgos, config.outputPath);

    // Generate summary statistics
    const summary = generateSummary(hallazgos);
    console.log('[ContraloriaScraper] Summary:');
    console.log(`  - Comunas with findings: ${summary.comunasUnicas}`);
    console.log(`  - Total monto asociado: ${formatCLP(summary.montoTotal)}`);
    console.log(`  - Findings by type:`);
    for (const [tipo, count] of Object.entries(summary.porTipo)) {
      console.log(`    - ${tipo}: ${count}`);
    }

    return hallazgos;
  } catch (error) {
    console.error('[ContraloriaScraper] Error during scraping:', error.message);
    throw error;
  }
}

/**
 * Generate summary statistics from findings
 */
function generateSummary(hallazgos) {
  const comunasUnicas = new Set(hallazgos.map(h => h.comuna_nombre)).size;
  const montoTotal = hallazgos.reduce((sum, h) => sum + h.monto_asociado, 0);
  
  const porTipo = {};
  for (const h of hallazgos) {
    porTipo[h.tipo_hallazgo] = (porTipo[h.tipo_hallazgo] || 0) + 1;
  }

  return { comunasUnicas, montoTotal, porTipo };
}

/**
 * Format Chilean Pesos for display
 */
function formatCLP(amount) {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
}

/**
 * Get findings for a specific commune
 */
export async function getHallazgosPorComuna(comunaNombre) {
  const hallazgos = await fetchHallazgos({ anno: SCRAPER_CONFIG.anno });
  return hallazgos.filter(h => h.comuna_nombre === comunaNombre);
}

/**
 * Get findings by type
 */
export async function getHallazgosPorTipo(tipo) {
  const hallazgos = await fetchHallazgos({ anno: SCRAPER_CONFIG.anno });
  return hallazgos.filter(h => h.tipo_hallazgo === tipo);
}

/**
 * Mapping of finding types to severity levels
 * (based on CGR classification framework)
 */
export const SEVERIDAD_TIPO = {
  licitacion: 'alta',
  rendicion_cuentas: 'media',
  beneficios_sociales: 'alta',
  obras_publicas: 'alta',
  inventario: 'baja'
};

// CLI execution
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  scrapeContraloria()
    .then(hallazgos => {
      console.log(`\nScraping completed successfully. ${hallazgos.length} findings exported.`);
      process.exit(0);
    })
    .catch(err => {
      console.error('Scraping failed:', err);
      process.exit(1);
    });
}

export default scrapeContraloria;
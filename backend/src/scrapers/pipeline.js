/**
 * Pipeline de scraping para fuentes públicas:
 * - SINIM (SUBDERE): datos abiertos de municipalidades
 * - Contraloria: informes de auditoría
 *
 * Para demo: usar datos sample ya cargados en comunas.js
 * Para producción: ejecutar npm run scrape
 */
export async function runPipeline() {
  console.log('[Pipeline] Iniciando scraping de fuentes públicas...');

  // TODO: Implementar scraping real de SINIM
  // - Descargar CSVs desde SUBDERE
  // - Parsear y normalizar campos
  // - Guardar en data/sinim/

  // TODO: Implementar scraping de Contraloria
  // - Listar municipios
  // - Descargar PDFs de informes
  // - Extraer texto y catalogar hallazgos

  console.log('[Pipeline] Scraping completado (demo mode)');
}
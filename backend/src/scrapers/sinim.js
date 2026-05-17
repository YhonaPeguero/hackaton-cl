/**
 * SINIM Scraper - Main scraper module for SINIM (Sistema de Información Municipal) data
 * 
 * This module orchestrates the scraping of municipal data from SINIM/SUBDERE for all
 * 345 Chilean communes. Data includes budget execution, education/health spending,
 * green areas, plazas, parks, and SIMCE educational metrics.
 * 
 * Usage:
 *   node src/scrapers/sinim.js              - Scrape and save to default data/sinim/
 *   node src/scrapers/sinim.js --output /custom/path  - Custom output directory
 */

import { fetchSINIMData } from './sinimFetcher.js';
import { parse } from 'csv-parse/sync';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Valid columns in the schema
const VALID_COLUMNS = [
  'nombre', 'region', 'presupuesto_total', 'gasto_educacion', 'gasto_salud',
  'gasto_infraestructura', 'm2_areas_verdes', 'm2_plazas', 'numero_parques',
  'matricula_total', 'promedio_simce_matematica', 'promedio_simce_lenguaje',
  'observaciones_contraloria', 'anno'
];

/**
 * Validate a single row of data
 */
function validateRow(row) {
  const errors = [];
  
  if (!row.nombre || row.nombre.trim() === '') {
    errors.push('Missing nombre');
  }
  
  if (!row.region || row.region.trim() === '') {
    errors.push('Missing region');
  }
  
  // Numeric validations
  const numericFields = [
    'presupuesto_total', 'gasto_educacion', 'gasto_salud',
    'gasto_infraestructura', 'm2_areas_verdes', 'm2_plazas'
  ];
  
  for (const field of numericFields) {
    const val = parseFloat(row[field]);
    if (isNaN(val) || val < 0) {
      errors.push(`Invalid ${field}: ${row[field]}`);
    }
  }
  
  // Integer validations
  if (row.numero_parques !== undefined) {
    const val = parseInt(row.numero_parques);
    if (isNaN(val) || val < 0) {
      errors.push(`Invalid numero_parques: ${row.numero_parques}`);
    }
  }
  
  if (row.matricula_total !== undefined) {
    const val = parseInt(row.matricula_total);
    if (isNaN(val) || val < 0) {
      errors.push(`Invalid matricula_total: ${row.matricula_total}`);
    }
  }
  
  // SIMCE score validations (reasonable range 150-350)
  const simceFields = ['promedio_simce_matematica', 'promedio_simce_lenguaje'];
  for (const field of simceFields) {
    const val = parseFloat(row[field]);
    if (!isNaN(val) && (val < 150 || val > 350)) {
      errors.push(`${field} out of reasonable range: ${val}`);
    }
  }
  
  // Year validation
  if (row.anno && parseInt(row.anno) !== 2023) {
    errors.push(`Expected anno=2023, got: ${row.anno}`);
  }
  
  return errors;
}

/**
 * Normalize row data to match database schema
 */
function normalizeRow(row) {
  return {
    nombre: row.nombre?.trim() || '',
    region: row.region?.trim() || '',
    presupuesto_total: parseFloat(row.presupuesto_total) || 0,
    gasto_educacion: parseFloat(row.gasto_educacion) || 0,
    gasto_salud: parseFloat(row.gasto_salud) || 0,
    gasto_infraestructura: parseFloat(row.gasto_infraestructura) || 0,
    m2_areas_verdes: parseFloat(row.m2_areas_verdes) || 0,
    m2_plazas: parseFloat(row.m2_plazas) || 0,
    numero_parques: parseInt(row.numero_parques) || 0,
    matricula_total: parseInt(row.matricula_total) || 0,
    promedio_simce_matematica: parseFloat(row.promedio_simce_matematica) || 0,
    promedio_simce_lenguaje: parseFloat(row.promedio_simce_lenguaje) || 0,
    observaciones_contraloria: parseInt(row.observaciones_contraloria) || 0,
    anno: parseInt(row.anno) || 2023
  };
}

/**
 * Load and parse CSV file
 */
function loadCSV(filepath) {
  if (!existsSync(filepath)) {
    throw new Error(`CSV file not found: ${filepath}`);
  }
  
  const content = readFileSync(filepath, 'utf8');
  const records = parse(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    bom: true
  });
  
  return records;
}

/**
 * Validate entire CSV dataset
 */
function validateDataset(csvPath) {
  console.log(`[SINIM] Validating dataset: ${csvPath}`);
  
  const records = loadCSV(csvPath);
  const errors = [];
  const warnings = [];
  
  if (records.length === 0) {
    throw new Error('CSV file is empty');
  }
  
  // Check columns
  const columns = Object.keys(records[0]);
  const missingCols = VALID_COLUMNS.filter(c => !columns.includes(c));
  if (missingCols.length > 0) {
    warnings.push(`Missing columns: ${missingCols.join(', ')}`);
  }
  
  // Validate each row
  const seen = new Set();
  for (let i = 0; i < records.length; i++) {
    const row = records[i];
    const rowErrors = validateRow(row);
    
    if (rowErrors.length > 0) {
      errors.push(`Row ${i + 2}: ${rowErrors.join('; ')} (${row.nombre || 'unnamed'})`);
    }
    
    // Check for duplicates
    const name = row.nombre?.trim().toLowerCase();
    if (name && seen.has(name)) {
      warnings.push(`Duplicate commune name: ${row.nombre}`);
    }
    seen.add(name);
  }
  
  console.log(`[SINIM] Validated ${records.length} records`);
  
  if (warnings.length > 0) {
    console.log(`[SINIM] Warnings (${warnings.length}):`);
    warnings.forEach(w => console.log(`  - ${w}`));
  }
  
  if (errors.length > 0) {
    console.log(`[SINIM] Errors (${errors.length}):`);
    errors.slice(0, 20).forEach(e => console.log(`  - ${e}`));
    if (errors.length > 20) {
      console.log(`  ... and ${errors.length - 20} more errors`);
    }
    throw new Error(`Validation failed with ${errors.length} errors`);
  }
  
  console.log(`[SINIM] ✓ Dataset validated successfully`);
  return { recordCount: records.length, warnings: warnings.length };
}

/**
 * Transform CSV to database-ready format
 */
function transformCSV(csvPath) {
  console.log(`[SINIM] Transforming data from: ${csvPath}`);
  
  const records = loadCSV(csvPath);
  const transformed = records.map(normalizeRow);
  
  console.log(`[SINIM] Transformed ${transformed.length} records`);
  return transformed;
}

/**
 * Main scraper execution
 */
async function runScraper(outputDir = null) {
  const dataDir = outputDir || path.join(__dirname, '../../../data/sinim');
  const csvPath = path.join(dataDir, 'comunas_345.csv');
  
  console.log('='.repeat(60));
  console.log('[SINIM] SINIM Data Scraping Pipeline');
  console.log('='.repeat(60));
  console.log(`Output directory: ${dataDir}`);
  console.log('');
  
  // Step 1: Fetch/generate data
  console.log('\n[Step 1/3] Fetching SINIM data...');
  try {
    const fetchResult = await fetchSINIMData(dataDir);
    console.log(`✓ Data fetched: ${fetchResult.count} communes`);
    console.log(`  File: ${fetchResult.file}`);
    console.log(`  Real data used: ${fetchResult.usedRealData ? 'Yes' : 'No (generated)'}`);
  } catch (error) {
    console.error(`✗ Fetch failed: ${error.message}`);
    throw error;
  }
  
  // Step 2: Validate
  console.log('\n[Step 2/3] Validating dataset...');
  try {
    const validation = validateDataset(csvPath);
    console.log(`✓ Validation passed: ${validation.recordCount} records`);
  } catch (error) {
    console.error(`✗ Validation failed: ${error.message}`);
    throw error;
  }
  
  // Step 3: Transform
  console.log('\n[Step 3/3] Transforming data...');
  let transformed = [];
  try {
    transformed = transformCSV(csvPath);
    console.log(`✓ Transformed ${transformed.length} records`);
    
    // Save transformed data
    const transformedPath = path.join(dataDir, 'comunas_345_transformed.json');
    writeFileSync(transformedPath, JSON.stringify(transformed, null, 2));
    console.log(`✓ Saved transformed data to: ${transformedPath}`);
  } catch (error) {
    console.error(`✗ Transform failed: ${error.message}`);
    throw error;
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('[SINIM] Scraping pipeline complete!');
  console.log(`Data saved to: ${csvPath}`);
  console.log('='.repeat(60));
  
  return {
    success: true,
    csvPath,
    recordCount: transformed.length
  };
}

// CLI entry point
const args = process.argv.slice(2);
let customOutputDir = null;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--output' && args[i + 1]) {
    customOutputDir = args[i + 1];
    i++;
  } else if (args[i] === '--help') {
    console.log('Usage: node sinim.js [--output <directory>]');
    console.log('  --output <dir>  Specify output directory for CSV data');
    console.log('  --help         Show this help message');
    process.exit(0);
  }
}

runScraper(customOutputDir).then(result => {
  console.log('\nResult:', result);
  process.exit(result.success ? 0 : 1);
}).catch(error => {
  console.error('\nFatal error:', error);
  process.exit(1);
});

// Export for use by other modules
export { runScraper, validateDataset, transformCSV };
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import { loadComunasFromCSV } from './data/comunas.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, '../../data/municipal.db');

let db;

export function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
  }
  return db;
}

export function initializeDatabase() {
  const database = getDb();

  database.exec(`
    CREATE TABLE IF NOT EXISTS comunas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT UNIQUE NOT NULL,
      region TEXT,
      presupuesto_total REAL,
      gasto_educacion REAL,
      gasto_salud REAL,
      gasto_infraestructura REAL,
      m2_areas_verdes REAL,
      m2_plazas REAL,
      numero_parques INTEGER,
      matricula_total INTEGER,
      promedio_simce_matematica REAL,
      promedio_simce_lenguaje REAL,
      observaciones_contraloria INTEGER DEFAULT 0,
      detalle_contraloria TEXT,
      anno INTEGER DEFAULT 2023
    );

    CREATE TABLE IF NOT EXISTS hallazgos_contraloria (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      comuna_nombre TEXT,
      anno INTEGER,
      tipo_hallazgo TEXT,
      descripcion TEXT,
      monto_asociado REAL,
      fuente_url TEXT
    );
  `);

  // Load data if empty
  const count = database.prepare('SELECT COUNT(*) as c FROM comunas').get();
  if (count.c === 0) {
    console.log('Loading initial data...');
    loadComunasFromCSV(database);
  }

  console.log('Database initialized');
}

/**
 * Load findings from CSV into the database.
 * Maps findings to comunas via the nombre field.
 */
export function loadHallazgosFromCSV(database, csvPath) {
  const fs = require('fs');
  const lines = fs.readFileSync(csvPath, 'utf-8').split('\n').slice(1); // Skip header
  
  const insert = database.prepare(`
    INSERT INTO hallazgos_contraloria 
      (comuna_nombre, anno, tipo_hallazgo, descripcion, monto_asociado, fuente_url)
    VALUES 
      (@comuna_nombre, @anno, @tipo_hallazgo, @descripcion, @monto_asociado, @fuente_url)
  `);

  let loaded = 0;
  for (const line of lines) {
    if (!line.trim()) continue;
    const [comuna_nombre, anno, tipo_hallazgo, descripcion, monto_asociado, fuente_url] = line.split(',');
    const cleanedDesc = descripcion.replace(/^"|"$/g, '').replace(/""/g, '"');
    insert.run({
      comuna_nombre,
      anno: parseInt(anno),
      tipo_hallazgo,
      descripcion: cleanedDesc,
      monto_asociado: parseFloat(monto_asociado),
      fuente_url
    });
    loaded++;
  }
  console.log(`Loaded ${loaded} findings from CSV`);
}

/**
 * Get findings linked to a specific comune
 */
export function getHallazgosPorComuna(database, comunaNombre) {
  return database.prepare(`
    SELECT * FROM hallazgos_contraloria 
    WHERE comuna_nombre = ?
    ORDER BY anno DESC
  `).all(comunaNombre);
}

/**
 * Update comunas.observaciones_contraloria based on actual findings count
 */
export function syncObservacionesContraloria(database) {
  database.exec(`
    UPDATE comunas
    SET observaciones_contraloria = (
      SELECT COUNT(*) FROM hallazgos_contraloria hc
      WHERE hc.comuna_nombre = comunas.nombre
    )
  `);
  console.log('Synced observaciones_contraloria count');
}
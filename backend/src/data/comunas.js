/**
 * Load initial comuna data from CSV into SQLite.
 * CSV comes from the SINIM scraping pipeline.
 * Path: /home/ubuntu/hackaton-cl/data/sinim/comunas_345.csv
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function loadComunasFromCSV(database) {
  const csvPath = path.join(__dirname, '../../../data/sinim/comunas_345.csv');

  if (!fs.existsSync(csvPath)) {
    console.log('CSV not found, using inline data');
    loadInlineData(database);
    return;
  }

  const content = fs.readFileSync(csvPath, 'utf-8');
  const lines = content.split('\n').slice(1); // skip header

  const insert = database.prepare(`
    INSERT OR IGNORE INTO comunas (
      nombre, region, presupuesto_total, gasto_educacion, gasto_salud,
      gasto_infraestructura, m2_areas_verdes, m2_plazas, numero_parques,
      matricula_total, promedio_simce_matematica, promedio_simce_lenguaje,
      observaciones_contraloria, anno
    ) VALUES (
      @nombre, @region, @presupuesto_total, @gasto_educacion, @gasto_salud,
      @gasto_infraestructura, @m2_areas_verdes, @m2_plazas, @numero_parques,
      @matricula_total, @promedio_simce_matematica, @promedio_simce_lenguaje,
      @observaciones_contraloria, @anno
    )
  `);

  let loaded = 0;
  const insertMany = database.transaction((rows) => {
    for (const row of rows) {
      if (!row.nombre) continue;
      try {
        insert.run({
          nombre: row.nombre.trim(),
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
          anno: parseInt(row.anno) || 2023,
        });
        loaded++;
      } catch (err) {
        // Skip duplicates (UNIQUE constraint on nombre)
      }
    }
  });

  const rows = lines
    .filter(l => l.trim())
    .map(line => {
      const cols = line.split(',');
      return {
        nombre: cols[0],
        region: cols[1],
        presupuesto_total: cols[2],
        gasto_educacion: cols[3],
        gasto_salud: cols[4],
        gasto_infraestructura: cols[5],
        m2_areas_verdes: cols[6],
        m2_plazas: cols[7],
        numero_parques: cols[8],
        matricula_total: cols[9],
        promedio_simce_matematica: cols[10],
        promedio_simce_lenguaje: cols[11],
        observaciones_contraloria: cols[12],
        anno: cols[13],
      };
    });

  insertMany(rows);
  console.log(`Loaded ${loaded} comunas from CSV`);

  // Load hallazgos if CSV exists
  const hallazgosPath = path.join(__dirname, '../../../data/contraloria/hallazgos.csv');
  if (fs.existsSync(hallazgosPath)) {
    loadHallazgosFromCSV(database, hallazgosPath);
    syncObservacionesContraloria(database);
  }
}

function loadInlineData(database) {
  const sampleData = [
    { nombre: 'Santiago', region: 'Metropolitana', presupuesto_total: 450000000000, gasto_educacion: 180000000000, gasto_salud: 120000000000, gasto_infraestructura: 45000000000, m2_areas_verdes: 2450000, m2_plazas: 380000, numero_parques: 47, matricula_total: 42000, promedio_simce_matematica: 243, promedio_simce_lenguaje: 251, observaciones_contraloria: 3, detalle_contraloria: 'Irregularidades en licitaciones de obras públicas.' },
    { nombre: 'Viña del Mar', region: 'Valparaíso', presupuesto_total: 89000000000, gasto_educacion: 35000000000, gasto_salud: 22000000000, gasto_infraestructura: 15000000000, m2_areas_verdes: 1800000, m2_plazas: 290000, numero_parques: 32, matricula_total: 28000, promedio_simce_matematica: 258, promedio_simce_lenguaje: 264, observaciones_contraloria: 1, detalle_contraloria: 'Observación menor en rendición de cuentas.' },
    { nombre: 'Concepción', region: 'Biobío', presupuesto_total: 76000000000, gasto_educacion: 30000000000, gasto_salud: 19000000000, gasto_infraestructura: 12000000000, m2_areas_verdes: 1600000, m2_plazas: 250000, numero_parques: 28, matricula_total: 31000, promedio_simce_matematica: 248, promedio_simce_lenguaje: 255, observaciones_contraloria: 2, detalle_contraloria: 'Pago de beneficios sociales a personas que no cumplían requisitos.' },
    { nombre: 'Antofagasta', region: 'Antofagasta', presupuesto_total: 65000000000, gasto_educacion: 25000000000, gasto_salud: 18000000000, gasto_infraestructura: 11000000000, m2_areas_verdes: 890000, m2_plazas: 180000, numero_parques: 18, matricula_total: 24000, promedio_simce_matematica: 241, promedio_simce_lenguaje: 247, observaciones_contraloria: 4, detalle_contraloria: 'Irregularidades graves en compras y contrataciones.' },
    { nombre: 'La Serena', region: 'Coquimbo', presupuesto_total: 52000000000, gasto_educacion: 20000000000, gasto_salud: 14000000000, gasto_infraestructura: 8000000000, m2_areas_verdes: 720000, m2_plazas: 150000, numero_parques: 14, matricula_total: 19000, promedio_simce_matematica: 252, promedio_simce_lenguaje: 258, observaciones_contraloria: 0, detalle_contraloria: null },
    { nombre: 'Valparaíso', region: 'Valparaíso', presupuesto_total: 68000000000, gasto_educacion: 27000000000, gasto_salud: 17000000000, gasto_infraestructura: 9500000000, m2_areas_verdes: 620000, m2_plazas: 120000, numero_parques: 12, matricula_total: 22000, promedio_simce_matematica: 238, promedio_simce_lenguaje: 244, observaciones_contraloria: 5, detalle_contraloria: 'Hallazgos en contratos de aseo urbano.' },
    { nombre: 'Temuco', region: 'La Araucanía', presupuesto_total: 48000000000, gasto_educacion: 19000000000, gasto_salud: 13000000000, gasto_infraestructura: 7000000000, m2_areas_verdes: 550000, m2_plazas: 110000, numero_parques: 10, matricula_total: 26000, promedio_simce_matematica: 231, promedio_simce_lenguaje: 237, observaciones_contraloria: 2, detalle_contraloria: 'Deficiencias en controles de inventario de medicamentos.' },
    { nombre: 'Puerto Montt', region: 'Los Lagos', presupuesto_total: 51000000000, gasto_educacion: 20000000000, gasto_salud: 14000000000, gasto_infraestructura: 7500000000, m2_areas_verdes: 480000, m2_plazas: 95000, numero_parques: 9, matricula_total: 21000, promedio_simce_matematica: 235, promedio_simce_lenguaje: 241, observaciones_contraloria: 1, detalle_contraloria: 'Observación sobre rendición de fondos para programas sociales.' },
    { nombre: 'Iquique', region: 'Tarapacá', presupuesto_total: 58000000000, gasto_educacion: 22000000000, gasto_salud: 16000000000, gasto_infraestructura: 8500000000, m2_areas_verdes: 410000, m2_plazas: 88000, numero_parques: 8, matricula_total: 18000, promedio_simce_matematica: 246, promedio_simce_lenguaje: 250, observaciones_contraloria: 0, detalle_contraloria: null },
    { nombre: 'Rancagua', region: "O'Higgins", presupuesto_total: 47000000000, gasto_educacion: 18500000000, gasto_salud: 12500000000, gasto_infraestructura: 6800000000, m2_areas_verdes: 390000, m2_plazas: 82000, numero_parques: 9, matricula_total: 23000, promedio_simce_matematica: 240, promedio_simce_lenguaje: 246, observaciones_contraloria: 2, detalle_contraloria: 'Observaciones en proceso de adquisición de materiales.' }
  ];

  const insert = database.prepare(`
    INSERT OR IGNORE INTO comunas (
      nombre, region, presupuesto_total, gasto_educacion, gasto_salud,
      gasto_infraestructura, m2_areas_verdes, m2_plazas, numero_parques,
      matricula_total, promedio_simce_matematica, promedio_simce_lenguaje,
      observaciones_contraloria, anno
    ) VALUES (
      @nombre, @region, @presupuesto_total, @gasto_educacion, @gasto_salud,
      @gasto_infraestructura, @m2_areas_verdes, @m2_plazas, @numero_parques,
      @matricula_total, @promedio_simce_matematica, @promedio_simce_lenguaje,
      @observaciones_contraloria, @anno
    )
  `);

  const insertMany = database.transaction((items) => {
    for (const item of items) {
      insert.run({ ...item, anno: 2023 });
    }
  });

  insertMany(sampleData);
  console.log(`Loaded ${sampleData.length} comunas (inline fallback)`);
}

export function loadHallazgosFromCSV(database, csvPath) {
  if (!fs.existsSync(csvPath)) return;

  const content = fs.readFileSync(csvPath, 'utf-8');
  const lines = content.split('\n').slice(1); // skip header

  const insert = database.prepare(`
    INSERT INTO hallazgos_contraloria
      (comuna_nombre, anno, tipo_hallazgo, descripcion, monto_asociado, fuente_url)
    VALUES
      (@comuna_nombre, @anno, @tipo_hallazgo, @descripcion, @monto_asociado, @fuente_url)
  `);

  let loaded = 0;
  for (const line of lines) {
    if (!line.trim()) continue;
    const parts = line.split(',');
    if (parts.length < 6) continue;
    const cleanedDesc = parts[4]?.replace(/^\"|\"$/g, '').replace(/\"\"/g, '"') || '';
    insert.run({
      comuna_nombre: parts[0]?.trim() || '',
      anno: parseInt(parts[1]) || 2023,
      tipo_hallazgo: parts[2]?.trim() || '',
      descripcion: cleanedDesc,
      monto_asociado: parseFloat(parts[3]) || 0,
      fuente_url: parts[5]?.trim() || '',
    });
    loaded++;
  }
  console.log(`Loaded ${loaded} hallazgos from CSV`);
}

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
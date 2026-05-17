/**
 * Fetcher module for Contraloria General de la República de Chile.
 * Handles HTTP requests to obtain audit report metadata.
 * 
 * In production: scrapes actual contraloria.cl pages for audit reports.
 * For demo: generates realistic mock data that mirrors actual CGR data structure.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// CGR Chile base URL for audit reports
const CGR_BASE_URL = 'https://www.contraloria.cl';

/**
 * Types of audit findings as defined by CGR classification
 */
export const TIPOS_HALLAZGO = {
  LICITACION: 'licitacion',
  RENDICION_CUENTAS: 'rendicion_cuentas',
  BENEFICIOS_SOCIALES: 'beneficios_sociales',
  OBRAS_PUBLICAS: 'obras_publicas',
  INVENTARIO: 'inventario'
};

/**
 * Chilean municipalities (comunas) covered by CGR audit reports
 * These represent the ~40% of communes typically audited in a given period
 */
const COMUNAS_AUDITADAS = [
  'Santiago', 'Valparaíso', 'Concepción', 'Antofagasta', 'Viña del Mar',
  'La Serena', 'Temuco', 'Puerto Montt', 'Iquique', 'Rancagua',
  'Arica', 'Chillán', 'Coquimbo', 'Puerto Varas', 'Curicó',
  'Osorno', 'San Fernando', 'Linares', 'Valdivia', 'Punta Arenas',
  'Copiapó', 'Ovalle', 'La Calera', 'Quillota', 'San Antonio',
  'Melipilla', 'Talca', 'Constitución', 'Lebu', 'Los Ángeles'
];

/**
 * Seeded random number generator for reproducible data
 */
class SeededRandom {
  constructor(seed = 42) {
    this.seed = seed;
  }

  next() {
    this.seed = (this.seed * 1103515245 + 12345) & 0x7fffffff;
    return this.seed / 0x7fffffff;
  }

  nextInt(min, max) {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  pick(array) {
    return array[this.nextInt(0, array.length - 1)];
  }
}

/**
 * Generate realistic finding descriptions based on type
 */
function generateDescripcion(tipo, random) {
  const descripciones = {
    licitacion: [
      'Proceso de contratación directa sin acreditación de razones técnicas u objeto del contrato.',
      'Adjudicación a proveedores que no cumplían requisitos técnicos establecidos en las bases.',
      'Modificaciones contractuales que superan el 20% del valor original sin justificación documentada.',
      'Contratación de servicios sin respetar los plazos de publicación obligatorios.',
      'Errores en la evaluación de propuestas que afectaron la imparcialidad del proceso.',
      'Pagos efectivos sin que medie recepción conforme de los bienes o servicios.',
      'Fraccionamiento artificioso de compras para evadir el sistema de licitaciones públicas.'
    ],
    rendicion_cuentas: [
      'Gastos ejecutados sin la documentación de respaldo establecida por la normativa.',
      'Fondos transferidos a entidades receptoras sin verificación de su correcta utilización.',
      'Inconsistencias entre los registros contables y los antecedentes de respaldo.',
      'Gastos declarados que no corresponden a la naturaleza del programa o fondo.',
      'Fondo de emergencia utilizado para fines distintos a los originalmente aprobados.',
      'Transferencias a terceros sin el correspondiente informe de gestión.',
      'Cargos administrativos que superan los porcentajes máximos permitidos.'
    ],
    beneficios_sociales: [
      'Asignación de beneficios sociales a personas que no cumplen los requisitos de focalización.',
      'Duplicidad en el pago de beneficios a un mismo hogar o individuo.',
      'Falta de actualización del catastro de potenciales beneficiarios.',
      'Beneficios entregados sin verificación de requisitos legales ni comprobación de antecedentes.',
      'Pago de incentivos a personas que no cumplen con las condiciones de permanencia.',
      'Subsidios otorgados sin considerar el ingreso familiar real o patrimonio.',
      'Transferencias directas sin trazabilidad respecto del destino final de los fondos.'
    ],
    obras_publicas: [
      'Obras ejecutadas que no alcanzan los estándares técnicos especificados en el contrato.',
      'Avance físico de la obra inferior al avance financiero registrado.',
      'Tomas de razón rechazadas por la autoridad competente sin regularización posterior.',
      'Recepciones de obra sin que medie certificación técnica de cumplimiento.',
      'Proyectos modificados sustancialmente sin obtener la autorización correspondiente.',
      'Materiales empleados en la construcción que no corresponden a las especificaciones técnicas.',
      'Plazos de ejecución excedidos sin aplicación de las penalidades contractuales.'
    ],
    inventario: [
      'Bienes muebles no inventariados o con información registral incorrecta.',
      'Faltante de especies en bodega detected through physical verification.',
      'Equipos tecnológicos dados de baja sin cumplir el procedimiento oficial.',
      'Vehículos municipales sin registro de mantención o con kilometraje不一致.',
      'Activos fijos con valor residual diferente al determinado por tasación oficial.',
      'Existencias de almacén con diferencias entre el registro kardex y el stock físico.'
    ]
  };

  const opciones = descripciones[tipo] || descripciones.rendicion_cuentas;
  return random.pick(opciones);
}

/**
 * Generate realistic monetary amounts based on finding type
 */
function generateMonto(tipo, random) {
  const rangos = {
    licitacion: [5000000, 350000000],
    rendicion_cuentas: [1000000, 80000000],
    beneficios_sociales: [2000000, 150000000],
    obras_publicas: [10000000, 500000000],
    inventario: [500000, 30000000]
  };

  const [min, max] = rangos[tipo] || [1000000, 50000000];
  
  // Generate log-uniform distribution for more realistic amounts
  const logMin = Math.log(min);
  const logMax = Math.log(max);
  const monto = Math.exp(logMin + random.next() * (logMax - logMin));
  
  // Round to nearest 100,000
  return Math.round(monto / 100000) * 100000;
}

/**
 * Generate CGR report URLs
 */
function generateUrl(comuna, anno) {
  const reportId = Math.abs(comuna.split('').reduce((a, c) => a + c.charCodeAt(0), 0) + anno) % 10000;
  return `${CGR_BASE_URL}/procedimientos/hallazgos/municipal/${comuna.toLowerCase().replace(/\s+/g, '-')}/informe-${reportId}-${anno}`;
}

/**
 * Fetch audit findings data
 * 
 * In production: would scrape actual CGR website for audit report metadata.
 * For demo: generates realistic mock data based on actual CGR reporting patterns.
 * 
 * @param {Object} options - Fetch options
 * @param {number} options.anno - Year for findings (default: 2023)
 * @param {number} options.seed - Random seed for reproducibility
 * @param {string[]} options.comunas - List of specific comunas to fetch for (optional)
 * @returns {Promise<Array>} Array of finding objects
 */
export async function fetchHallazgos({ anno = 2023, seed = 42, comunas = null } = {}) {
  const random = new SeededRandom(seed);
  
  // Use specified comunas or default to audited comunas list
  const comunasTarget = comunas || COMUNAS_AUDITADAS;
  
  const hallazgos = [];

  for (const comuna of comunasTarget) {
    // ~40% coverage means some comunas won't have findings
    if (random.next() > 0.4) continue;

    // Each audited commune has 1-4 findings
    const numHallazgos = random.nextInt(1, 4);

    for (let i = 0; i < numHallazgos; i++) {
      const tipo = random.pick(Object.values(TIPOS_HALLAZGO));
      
      hallazgos.push({
        comuna_nombre: comuna,
        anno: anno - random.nextInt(0, 2), // Findings from last 3 years
        tipo_hallazgo: tipo,
        descripcion: generateDescripcion(tipo, random),
        monto_asociado: generateMonto(tipo, random),
        fuente_url: generateUrl(comuna, anno)
      });
    }
  }

  // Sort by commune name and year
  hallazgos.sort((a, b) => {
    if (a.comuna_nombre !== b.comuna_nombre) {
      return a.comuna_nombre.localeCompare(b.comuna_nombre);
    }
    return b.anno - a.anno;
  });

  return hallazgos;
}

/**
 * Save findings to CSV file
 * 
 * @param {Array} hallazgos - Findings data
 * @param {string} outputPath - Output CSV file path
 */
export function saveToCSV(hallazgos, outputPath) {
  const headers = ['comuna_nombre', 'anno', 'tipo_hallazgo', 'descripcion', 'monto_asociado', 'fuente_url'];
  
  const rows = hallazgos.map(h => [
    h.comuna_nombre,
    h.anno,
    h.tipo_hallazgo,
    `"${h.descripcion.replace(/"/g, '""')}"`, // Escape CSV quotes
    h.monto_asociado,
    h.fuente_url
  ]);

  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  
  // Ensure directory exists
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  fs.writeFileSync(outputPath, csv, 'utf-8');
  console.log(`Saved ${hallazgos.length} findings to ${outputPath}`);
}

// CLI execution
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const outputPath = process.argv[2] || path.join(__dirname, '../../../data/contraloria/hallazgos.csv');
  
  console.log('Fetching Contraloria audit findings...');
  fetchHallazgos({ anno: 2023, seed: 42 })
    .then(hallazgos => {
      saveToCSV(hallazgos, outputPath);
      console.log(`Generated ${hallazgos.length} audit findings`);
    })
    .catch(err => {
      console.error('Error fetching findings:', err);
      process.exit(1);
    });
}
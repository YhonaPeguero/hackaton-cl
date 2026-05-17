/**
 * scenes.js - Scene definitions for "El Minuto de Tu Comuna"
 * Defines the video scene structure and content generation.
 */

import { formatCurrency, formatNumber, formatSimce } from './utils.js';

// National averages for comparison
const NATIONAL_AVG_MATH = 247;
const NATIONAL_AVG_LENG = 252;

/**
 * Generate scene data for a given comuna
 * @param {Object} comuna - Comuna data object
 * @returns {Array} Array of scene objects
 */
export function generateScenes(comuna) {
  const scenes = [];

  // Scene 1: Intro (0-5s)
  scenes.push({
    id: 'intro',
    start: 0,
    duration: 5,
    type: 'intro',
    text: `El Minuto de ${comuna.nombre}`,
    subtitle: `Región ${comuna.region}`,
  });

  // Scene 2: Budget (5-15s)
  const presupuestoFormateado = formatCurrency(comuna.presupuesto_total);
  scenes.push({
    id: 'budget',
    start: 5,
    duration: 10,
    type: 'data-card',
    title: 'Presupuesto Comunal',
    value: presupuestoFormateado,
    detail: 'Año 2023',
    layout: 'centered-large',
  });

  // Scene 3: Spending breakdown (15-25s)
  scenes.push({
    id: 'spending',
    start: 15,
    duration: 10,
    type: 'bar-chart',
    title: 'Distribución del Gasto',
    bars: [
      { label: 'Educación', value: comuna.gasto_educacion, color: '#3B82F6' },
      { label: 'Salud', value: comuna.gasto_salud, color: '#10B981' },
      { label: 'Infraestructura', value: comuna.gasto_infraestructura, color: '#F59E0B' },
    ],
    total: comuna.presupuesto_total,
  });

  // Scene 4: SIMCE results (25-32s)
  const mathDiff = comuna.promedio_simce_matematica - NATIONAL_AVG_MATH;
  const lengDiff = comuna.promedio_simce_lenguaje - NATIONAL_AVG_LENG;
  scenes.push({
    id: 'simce',
    start: 25,
    duration: 7,
    type: 'comparison',
    title: 'Resultados SIMCE',
    metrics: [
      { label: 'Matemática', value: comuna.promedio_simce_matematica, nationalAvg: NATIONAL_AVG_MATH, diff: mathDiff },
      { label: 'Lenguaje', value: comuna.promedio_simce_lenguaje, nationalAvg: NATIONAL_AVG_LENG, diff: lengDiff },
    ],
  });

  // Scene 5: Contraloria findings (32-40s) - conditional
  if (comuna.observaciones_contraloria > 0 && comuna.detalle_contraloria) {
    scenes.push({
      id: 'contraloria',
      start: 32,
      duration: 8,
      type: 'alert',
      title: 'Hallazgos de la Contraloria',
      count: comuna.observaciones_contraloria,
      detail: comuna.detalle_contraloria,
      severity: comuna.observaciones_contraloria >= 3 ? 'high' : 'medium',
    });
  } else {
    // Alternative scene: Parks and green areas
    scenes.push({
      id: 'green',
      start: 32,
      duration: 8,
      type: 'data-card',
      title: 'Areas Verdes y Parques',
      value: formatNumber(comuna.m2_areas_verdes),
      detail: `${comuna.numero_parques} parques comunales`,
      icon: 'park',
    });
  }

  // Scene 6: Outro (40-45s)
  scenes.push({
    id: 'outro',
    start: 40,
    duration: 5,
    type: 'outro',
    text: 'Comparte este minuto',
    hashtag: '#ElMinutoDeTuComuna',
  });

  return scenes;
}

/**
 * Get total video duration based on scenes
 * @param {Array} scenes - Array of scene objects
 * @returns {number} Total duration in seconds
 */
export function getTotalDuration(scenes) {
  if (scenes.length === 0) return 45;
  return Math.max(...scenes.map((s) => s.start + s.duration));
}

/**
 * Generate narration script for all scenes
 * @param {Object} comuna - Comuna data object
 * @returns {string} Full narration script in Spanish
 */
export function generateNarrationScript(comuna) {
  const parts = [];

  // Intro
  parts.push(
    `Bienvenidos a El Minuto de ${comuna.nombre}, en la región ${comuna.region}. ` +
    `Aquí encontrarás los datos más importantes de tu comuna en menos de un minuto.`
  );

  // Budget
  const presupuestoFormateado = formatCurrency(comuna.presupuesto_total);
  parts.push(
    `El presupuesto comunal reacha los ${presupuestoFormateado} pesos anuales. ` +
    `Así se invierte en tu comuna.`
  );

  // Spending
  const eduPct = Math.round((comuna.gasto_educacion / comuna.presupuesto_total) * 100);
  const healthPct = Math.round((comuna.gasto_salud / comuna.presupuesto_total) * 100);
  parts.push(
    `Del presupuesto, un ${eduPct} por ciento se destina a educación. ` +
    `Salud recibe un ${healthPct} por ciento. ` +
    `El resto se distribuye en infraestructura y servicios comunales.`
  );

  // SIMCE
  const mathStatus = comuna.promedio_simce_matematica >= NATIONAL_AVG_MATH ? 'sobre' : 'bajo';
  const lengStatus = comuna.promedio_simce_lenguaje >= NATIONAL_AVG_LENG ? 'sobre' : 'bajo';
  parts.push(
    `En SIMCE, los estudiantes de ${comuna.nombre} obtienen ` +
    `${comuna.promedio_simce_matematica} puntos en matemática, ` +
    `${mathStatus} el promedio nacional. ` +
    `En lenguaje logran ${comuna.promedio_simce_lenguaje} puntos, ` +
    `${lengStatus} el promedio nacional.`
  );

  // Contraloria or green areas
  if (comuna.observaciones_contraloria > 0 && comuna.detalle_contraloria) {
    parts.push(
      `La Contraloria General de la República ha registrado ` +
      `${comuna.observaciones_contraloria} observaciones en ${comuna.nombre}. ` +
      `${comuna.detalle_contraloria}. ` +
      `Datos que los vecinos merecen conocer.`
    );
  } else {
    parts.push(
      `${comuna.nombre} cuenta con ${comuna.numero_parques} parques comunales ` +
      `y más de ${formatNumber(comuna.m2_areas_verdes)} metros cuadrados de áreas verdes. ` +
      `Un espacio para el bienestar de las familias.`
    );
  }

  // Outro
  parts.push(
    `Esto fue El Minuto de ${comuna.nombre}. ` +
    `Comparte este video para que más vecinos conozcan su comuna. ` +
    `#ElMinutoDeTuComuna`
  );

  return parts.join(' ');
}

export { NATIONAL_AVG_MATH, NATIONAL_AVG_LENG };
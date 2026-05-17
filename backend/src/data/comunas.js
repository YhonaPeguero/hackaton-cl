/**
 * Load initial comuna data from CSV into SQLite.
 * In production, this CSV comes from the scraping pipeline.
 * For now: realistic sample data for demo purposes.
 */
export function loadComunasFromCSV(database) {
  const sampleData = [
    {
      nombre: 'Santiago',
      region: 'Metropolitana',
      presupuesto_total: 450000000000,
      gasto_educacion: 180000000000,
      gasto_salud: 120000000000,
      gasto_infraestructura: 45000000000,
      m2_areas_verdes: 2450000,
      m2_plazas: 380000,
      numero_parques: 47,
      matricula_total: 42000,
      promedio_simce_matematica: 243,
      promedio_simce_lenguaje: 251,
      observaciones_contraloria: 3,
      detalle_contraloria: 'Irregularidades en licitaciones de obras públicas. Fondos destinados a proyectos sin ejecución completa.'
    },
    {
      nombre: 'Viña del Mar',
      region: 'Valparaíso',
      presupuesto_total: 89000000000,
      gasto_educacion: 35000000000,
      gasto_salud: 22000000000,
      gasto_infraestructura: 15000000000,
      m2_areas_verdes: 1800000,
      m2_plazas: 290000,
      numero_parques: 32,
      matricula_total: 28000,
      promedio_simce_matematica: 258,
      promedio_simce_lenguaje: 264,
      observaciones_contraloria: 1,
      detalle_contraloria: 'Observación menor en rendición de cuentas de fondos sociales.'
    },
    {
      nombre: 'Concepción',
      region: 'Biobío',
      presupuesto_total: 76000000000,
      gasto_educacion: 30000000000,
      gasto_salud: 19000000000,
      gasto_infraestructura: 12000000000,
      m2_areas_verdes: 1600000,
      m2_plazas: 250000,
      numero_parques: 28,
      matricula_total: 31000,
      promedio_simce_matematica: 248,
      promedio_simce_lenguaje: 255,
      observaciones_contraloria: 2,
      detalle_contraloria: 'Detectado pago de beneficios sociales a personas que no cumplían requisitos. Deficiencias en control de obras públicas.'
    },
    {
      nombre: 'Antofagasta',
      region: 'Antofagasta',
      presupuesto_total: 65000000000,
      gasto_educacion: 25000000000,
      gasto_salud: 18000000000,
      gasto_infraestructura: 11000000000,
      m2_areas_verdes: 890000,
      m2_plazas: 180000,
      numero_parques: 18,
      matricula_total: 24000,
      promedio_simce_matematica: 241,
      promedio_simce_lenguaje: 247,
      observaciones_contraloria: 4,
      detalle_contraloria: 'Irregularidades graves en compras y contrataciones. Abono de asignaciones sin respaldo documental. Proyectos de agua potable sin ejecutar.'
    },
    {
      nombre: 'La Serena',
      region: 'Coquimbo',
      presupuesto_total: 52000000000,
      gasto_educacion: 20000000000,
      gasto_salud: 14000000000,
      gasto_infraestructura: 8000000000,
      m2_areas_verdes: 720000,
      m2_plazas: 150000,
      numero_parques: 14,
      matricula_total: 19000,
      promedio_simce_matematica: 252,
      promedio_simce_lenguaje: 258,
      observaciones_contraloria: 0,
      detalle_contraloria: null
    },
    {
      nombre: 'Valparaíso',
      region: 'Valparaíso',
      presupuesto_total: 68000000000,
      gasto_educacion: 27000000000,
      gasto_salud: 17000000000,
      gasto_infraestructura: 9500000000,
      m2_areas_verdes: 620000,
      m2_plazas: 120000,
      numero_parques: 12,
      matricula_total: 22000,
      promedio_simce_matematica: 238,
      promedio_simce_lenguaje: 244,
      observaciones_contraloria: 5,
      detalle_contraloria: 'Hallazgos significativos en contratos de aseo urbano. Irregularidades en transfers a fondos de emergencia. Obras de mantención vial sin documentación de recepción.'
    },
    {
      nombre: 'Temuco',
      region: 'La Araucanía',
      presupuesto_total: 48000000000,
      gasto_educacion: 19000000000,
      gasto_salud: 13000000000,
      gasto_infraestructura: 7000000000,
      m2_areas_verdes: 550000,
      m2_plazas: 110000,
      numero_parques: 10,
      matricula_total: 26000,
      promedio_simce_matematica: 231,
      promedio_simce_lenguaje: 237,
      observaciones_contraloria: 2,
      detalle_contraloria: 'Deficiencias en controles de inventario de medicamentos. Licencias médicas sin respaldo suficiente.'
    },
    {
      nombre: 'Puerto Montt',
      region: 'Los Lagos',
      presupuesto_total: 51000000000,
      gasto_educacion: 20000000000,
      gasto_salud: 14000000000,
      gasto_infraestructura: 7500000000,
      m2_areas_verdes: 480000,
      m2_plazas: 95000,
      numero_parques: 9,
      matricula_total: 21000,
      promedio_simce_matematica: 235,
      promedio_simce_lenguaje: 241,
      observaciones_contraloria: 1,
      detalle_contraloria: 'Observación sobre rendición de fondos para programas sociales.'
    },
    {
      nombre: 'Iquique',
      region: 'Tarapacá',
      presupuesto_total: 58000000000,
      gasto_educacion: 22000000000,
      gasto_salud: 16000000000,
      gasto_infraestructura: 8500000000,
      m2_areas_verdes: 410000,
      m2_plazas: 88000,
      numero_parques: 8,
      matricula_total: 18000,
      promedio_simce_matematica: 246,
      promedio_simce_lenguaje: 250,
      observaciones_contraloria: 0,
      detalle_contraloria: null
    },
    {
      nombre: 'Rancagua',
      region: "O'Higgins",
      presupuesto_total: 47000000000,
      gasto_educacion: 18500000000,
      gasto_salud: 12500000000,
      gasto_infraestructura: 6800000000,
      m2_areas_verdes: 390000,
      m2_plazas: 82000,
      numero_parques: 9,
      matricula_total: 23000,
      promedio_simce_matematica: 240,
      promedio_simce_lenguaje: 246,
      observaciones_contraloria: 2,
      detalle_contraloria: 'Observaciones en proceso de adquisición de materiales de construcción. Inconsistencias en registro de personal a honorarios.'
    }
  ];

  const insert = database.prepare(`
    INSERT INTO comunas (
      nombre, region, presupuesto_total, gasto_educacion, gasto_salud,
      gasto_infraestructura, m2_areas_verdes, m2_plazas, numero_parques,
      matricula_total, promedio_simce_matematica, promedio_simce_lenguaje,
      observaciones_contraloria, detalle_contraloria, anno
    ) VALUES (
      @nombre, @region, @presupuesto_total, @gasto_educacion, @gasto_salud,
      @gasto_infraestructura, @m2_areas_verdes, @m2_plazas, @numero_parques,
      @matricula_total, @promedio_simce_matematica, @promedio_simce_lenguaje,
      @observaciones_contraloria, @detalle_contraloria, @anno
    )
  `);

  const insertMany = database.transaction((items) => {
    for (const item of items) {
      insert.run({ ...item, anno: 2023 });
    }
  });

  insertMany(sampleData);
  console.log(`Loaded ${sampleData.length} comunas`);
}
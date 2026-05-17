import express from 'express';
import { getDb } from '../db.js';

const router = express.Router();

// Get all comunas (summary list for search)
router.get('/', (req, res) => {
  const db = getDb();
  const comunas = db.prepare(`
    SELECT nombre, region, anno
    FROM comunas
    ORDER BY nombre
  `).all();
  res.json(comunas);
});

// Search comunas by name
router.get('/search/:query', (req, res) => {
  const db = getDb();
  const { query } = req.params;
  const results = db.prepare(`
    SELECT * FROM comunas
    WHERE nombre LIKE ?
    ORDER BY nombre
    LIMIT 10
  `).all(`%${query}%`);
  res.json(results);
});

// Get single comuna detail
router.get('/:nombre', (req, res) => {
  const db = getDb();
  const { nombre } = req.params;
  const comuna = db.prepare(`
    SELECT * FROM comunas
    WHERE nombre = ?
  `).get(nombre);

  if (!comuna) {
    return res.status(404).json({ error: 'Comuna no encontrada' });
  }

  const hallazgos = db.prepare(`
    SELECT * FROM hallazgos_contraloria
    WHERE comuna_nombre = ?
    ORDER BY anno DESC
  `).all(nombre);

  res.json({ ...comuna, hallazgos });
});

export default router;
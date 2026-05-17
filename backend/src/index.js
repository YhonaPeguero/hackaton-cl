import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { initializeDatabase, getDb } from './db.js';
import comunasRouter from './routes/comunas.js';
import videoRouter from './routes/video.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());

// API routes
app.use('/api/comunas', comunasRouter);
app.use('/api/video', videoRouter);

// Serve static videos
app.use('/videos', express.static(path.join(__dirname, '../videos')));

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok' }));

initializeDatabase();
const db = getDb();
app.set('db', db);

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
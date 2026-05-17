/**
 * video.js - API routes for video generation endpoints
 */

import express from 'express';
import { generateVideo, getVideoUrl, listGeneratedVideos, preGenerateHeroVideos, videoExists, HERO_COMUNAS } from '../video/generator.js';

const router = express.Router();

// GET /api/video/status - Check video generation status
router.get('/status', async (req, res) => {
  try {
    const videos = listGeneratedVideos();
    const heroStatus = HERO_COMUNAS.map(name => ({
      name,
      ready: videoExists(name),
      url: getVideoUrl(name),
    }));

    res.json({
      ffmpegAvailable: true, // Would check properly in production
      generatedCount: videos.length,
      heroComunas: heroStatus,
      videos: videos,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/video/generate/:comuna - Generate video for a comuna
router.post('/generate/:comuna', async (req, res) => {
  const { comuna } = req.params;
  const { force = false } = req.body;

  console.log(`\n📹 Video generation request for: ${comuna}`);

  // Get database from app context (set in index.js)
  const db = req.app.get('db');
  
  if (!db) {
    return res.status(500).json({ error: 'Database not initialized' });
  }

  try {
    // Look up comuna in database
    const stmt = db.prepare('SELECT * FROM comunas WHERE nombre = ? ORDER BY anno DESC LIMIT 1');
    const comunaData = stmt.get(comuna);

    if (!comunaData) {
      return res.status(404).json({
        error: `Comuna "${comuna}" not found`,
        availableComunas: db.prepare('SELECT nombre FROM comunas').all().map(r => r.nombre),
      });
    }

    // Generate video
    const result = await generateVideo(comunaData, { force: Boolean(force) });

    if (result.success) {
      res.json({
        success: true,
        comuna: result.comuna,
        videoUrl: result.cached ? getVideoUrl(comuna) : `/videos/el_minuto_${comuna.replace(/[^a-zA-Z0-9]/g, '_')}.mp4`,
        cached: result.cached || false,
        metadata: result.metadata,
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error,
        comuna: result.comuna,
      });
    }
  } catch (error) {
    console.error(`Video generation error for ${comuna}:`, error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/video/:comuna - Get video URL for a comuna
router.get('/:comuna', async (req, res) => {
  const { comuna } = req.params;
  const videoUrl = getVideoUrl(comuna);

  if (videoUrl) {
    res.json({
      exists: true,
      url: videoUrl,
      comuna,
    });
  } else {
    res.json({
      exists: false,
      url: null,
      comuna,
      message: 'Video not yet generated. Use POST /api/video/generate/:comuna to create it.',
    });
  }
});

// POST /api/video/pregenerate - Pre-generate hero comuna videos
router.post('/pregenerate', async (req, res) => {
  const db = req.app.get('db');
  
  if (!db) {
    return res.status(500).json({ error: 'Database not initialized' });
  }

  try {
    const getComunaByName = (name) => {
      return new Promise((resolve, reject) => {
        try {
          const stmt = db.prepare('SELECT * FROM comunas WHERE nombre = ? ORDER BY anno DESC LIMIT 1');
          const result = stmt.get(name);
          resolve(result);
        } catch (err) {
          reject(err);
        }
      });
    };

    const results = await preGenerateHeroVideos(getComunaByName);

    res.json({
      success: true,
      results,
      message: `Pre-generated ${results.filter(r => r.success).length} of ${HERO_COMUNAS.length} hero videos`,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
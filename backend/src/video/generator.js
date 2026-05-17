/**
 * generator.js - Video generation orchestrator for "El Minuto de Tu Comuna"
 * Coordinates scene generation, TTS narration, and FFmpeg composition.
 */

import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { generateScenes, generateNarrationScript, getTotalDuration } from './scenes.js';
import { generateNarration, estimateAudioDuration, isTTSAvailable } from './narrator.js';
import { composeVideo, isFFmpegAvailable } from './composer.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const VIDEOS_DIR = path.join(__dirname, '../../videos');

// Hero comunas - pre-generated on startup
export const HERO_COMUNAS = [
  'Santiago',
  'Viña del Mar',
  'Concepción',
  'Antofagasta',
];

/**
 * Initialize the video directory
 */
export function ensureVideoDirectory() {
  if (!fs.existsSync(VIDEOS_DIR)) {
    fs.mkdirSync(VIDEOS_DIR, { recursive: true });
  }
  return VIDEOS_DIR;
}

/**
 * Get the path for a comuna's video
 * @param {string} comunaName - Name of the comuna
 * @returns {string} Path to the video file
 */
export function getVideoPath(comunaName) {
  ensureVideoDirectory();
  const safeName = comunaName.replace(/[^a-zA-Z0-9]/g, '_');
  return path.join(VIDEOS_DIR, `el_minuto_${safeName}.mp4`);
}

/**
 * Get the path for a comuna's audio
 * @param {string} comunaName - Name of the comuna
 * @returns {string} Path to the audio file
 */
export function getAudioPath(comunaName) {
  ensureVideoDirectory();
  const safeName = comunaName.replace(/[^a-zA-Z0-9]/g, '_');
  return path.join(VIDEOS_DIR, `audio_${safeName}.mp3`);
}

/**
 * Check if video already exists for a comuna
 * @param {string} comunaName - Name of the comuna
 * @returns {boolean} True if video exists
 */
export function videoExists(comunaName) {
  const videoPath = getVideoPath(comunaName);
  return fs.existsSync(videoPath);
}

/**
 * Generate a video for a given comuna
 * @param {Object} comuna - Comuna data object from database
 * @param {Object} options - Generation options
 * @returns {Promise<Object>} Generation result with video path and metadata
 */
export async function generateVideo(comuna, options = {}) {
  const {
    force = false,           // Force regeneration even if exists
    preloadAudio = true,     // Pre-generate audio before video
  } = options;

  const comunaName = comuna.nombre;
  const videoPath = getVideoPath(comunaName);
  const audioPath = getAudioPath(comunaName);

  console.log(`\n🎬 Generating video for: ${comunaName}`);
  console.log(`   Output: ${videoPath}`);

  // Check if already exists (skip if not forcing)
  if (videoExists(comunaName) && !force) {
    console.log(`   ✓ Video already exists, skipping (use force=true to regenerate)`);
    return {
      success: true,
      cached: true,
      videoPath,
      comuna: comunaName,
    };
  }

  // Check FFmpeg availability
  const ffmpegOk = await isFFmpegAvailable();
  if (!ffmpegOk) {
    console.warn('   ⚠ FFmpeg not available - video generation limited');
    return {
      success: false,
      error: 'FFmpeg is not installed. Install with: sudo apt-get install ffmpeg',
      comuna: comunaName,
    };
  }

  try {
    // Step 1: Generate TTS narration
    console.log(`\n   🎤 Step 1/3: Generating narration...`);
    const script = generateNarrationScript(comuna);
    
    let audioFilePath = audioPath;
    try {
      audioFilePath = await generateNarration(script, audioPath, {
        voice: 'es-ES-AlvaroNeural',
        rate: '+5%',   // Slightly faster for video timing
      });
      console.log(`   ✓ Audio generated: ${audioFilePath}`);
    } catch (ttsError) {
      console.warn(`   ⚠ TTS generation failed: ${ttsError.message}`);
      console.log(`   Using silent placeholder audio`);
      audioFilePath = await generateSilentAudio(audioPath);
    }

    // Step 2: Compose video with FFmpeg
    console.log(`\n   🎥 Step 2/3: Composing video...`);
    const result = await composeVideo(comuna, audioFilePath, videoPath);
    console.log(`   ✓ Video composed: ${result}`);

    // Step 3: Verify output
    console.log(`\n   ✅ Video generation complete!`);
    const stats = fs.statSync(videoPath);
    
    return {
      success: true,
      cached: false,
      videoPath: result,
      audioPath: audioFilePath,
      comuna: comunaName,
      metadata: {
        size: stats.size,
        duration: getTotalDuration(generateScenes(comuna)),
        generatedAt: new Date().toISOString(),
      },
    };
  } catch (error) {
    console.error(`   ❌ Video generation failed: ${error.message}`);
    return {
      success: false,
      error: error.message,
      comuna: comunaName,
    };
  }
}

/**
 * Generate silent audio placeholder
 */
async function generateSilentAudio(outputPath) {
  const { spawn } = await import('child_process');
  const duration = 45; // Standard video duration
  
  return new Promise((resolve, reject) => {
    const proc = spawn('ffmpeg', [
      '-f', 'lavfi',
      '-i', 'anullsrc=r=24000:cl=mono',
      '-t', duration.toString(),
      '-ar', '24000',
      '-ac', '1',
      '-y',
      outputPath,
    ]);
    
    proc.on('close', (code) => {
      if (code === 0) {
        resolve(outputPath);
      } else {
        reject(new Error('Failed to generate silent audio'));
      }
    });
    
    proc.on('error', reject);
  });
}

/**
 * Pre-generate videos for hero comunas
 * @param {Function} getComunaByName - Function to get comuna data by name
 * @returns {Promise<Array>} Array of generation results
 */
export async function preGenerateHeroVideos(getComunaByName) {
  console.log('\n🚀 Pre-generating hero comuna videos...\n');
  const results = [];

  for (const comunaName of HERO_COMUNAS) {
    try {
      const comuna = await getComunaByName(comunaName);
      if (comuna) {
        const result = await generateVideo(comuna, { force: false });
        results.push({ comuna: comunaName, ...result });
      } else {
        results.push({
          comuna: comunaName,
          success: false,
          error: `Comuna "${comunaName}" not found in database`,
        });
      }
    } catch (error) {
      results.push({
        comuna: comunaName,
        success: false,
        error: error.message,
      });
    }
  }

  // Summary
  const successful = results.filter(r => r.success).length;
  console.log(`\n📊 Pre-generation complete: ${successful}/${HERO_COMUNAS.length} videos ready`);
  
  for (const r of results) {
    if (r.success) {
      console.log(`   ✓ ${r.comuna}`);
    } else {
      console.log(`   ✗ ${r.comuna}: ${r.error}`);
    }
  }

  return results;
}

/**
 * Get video URL for frontend
 * @param {string} comunaName - Name of the comuna
 * @returns {string|null} URL path to video or null if not exists
 */
export function getVideoUrl(comunaName) {
  const videoPath = getVideoPath(comunaName);
  if (fs.existsSync(videoPath)) {
    return `/videos/el_minuto_${comunaName.replace(/[^a-zA-Z0-9]/g, '_')}.mp4`;
  }
  return null;
}

/**
 * List all generated videos
 * @returns {Array} Array of video info objects
 */
export function listGeneratedVideos() {
  ensureVideoDirectory();
  
  const files = fs.readdirSync(VIDEOS_DIR)
    .filter(f => f.startsWith('el_minuto_') && f.endsWith('.mp4'))
    .map(f => {
      const fullPath = path.join(VIDEOS_DIR, f);
      const stats = fs.statSync(fullPath);
      const comunaName = f
        .replace('el_minuto_', '')
        .replace('.mp4', '')
        .replace(/_/g, ' ');
      
      return {
        filename: f,
        comunaName,
        path: `/videos/${f}`,
        size: stats.size,
        generatedAt: stats.mtime.toISOString(),
      };
    });
  
  return files;
}

/**
 * Delete a generated video
 * @param {string} comunaName - Name of the comuna
 * @returns {boolean} True if deleted
 */
export function deleteVideo(comunaName) {
  const videoPath = getVideoPath(comunaName);
  const audioPath = getAudioPath(comunaName);
  
  let deleted = false;
  
  if (fs.existsSync(videoPath)) {
    fs.unlinkSync(videoPath);
    deleted = true;
  }
  
  if (fs.existsSync(audioPath)) {
    fs.unlinkSync(audioPath);
  }
  
  return deleted;
}
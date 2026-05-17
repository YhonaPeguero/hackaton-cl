/**
 * narrator.js - Text-to-Speech narration for "El Minuto de Tu Comuna"
 * Uses node-edge-tts for free Edge/Microsoft TTS voices (Spanish)
 */

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const EDGE_TTS_MODULE = 'node-edge-tts';

/**
 * Check if edge-tts is available
 * @returns {Promise<boolean>} True if available
 */
export async function isTTSAvailable() {
  try {
    const result = await runCommand('npm', ['list', EDGE_TTS_MODULE], { cwd: process.cwd() });
    return result.includes(EDGE_TTS_MODULE) || result.includes('node-edge-tts');
  } catch {
    return false;
  }
}

/**
 * Generate Spanish narration audio using edge-tts
 * @param {string} text - Text to convert to speech
 * @param {string} outputPath - Path to save audio file
 * @param {Object} options - TTS options
 * @returns {Promise<string>} Path to generated audio file
 */
export async function generateNarration(text, outputPath, options = {}) {
  const {
    voice = 'es-ES-AlvaroNeural', // Spanish Spain male
    rate = '+0%',                 // Speech rate adjustment
    volume = '+0%',              // Volume adjustment
  } = options;

  // Create a temporary script for edge-tts
  const tempScript = path.join(path.dirname(outputPath), `.tts_temp_${Date.now()}.js`);

  // First check if edge-tts module is installed, if not try node-edge-tts
  const moduleAvailable = await isTTSModuleAvailable();
  
  if (moduleAvailable) {
    return generateWithNodeEdgeTTS(text, outputPath, { voice, rate, volume });
  }
  
  // Fallback: Try using edge-tts CLI directly if available
  try {
    return await generateWithEdgeCLI(text, outputPath, { voice, rate, volume });
  } catch {
    // Final fallback: generate placeholder audio with FFmpeg (mute with text overlay)
    return generatePlaceholderAudio(text, outputPath);
  }
}

/**
 * Check if node-edge-tts module is available
 */
async function isTTSModuleAvailable() {
  try {
    const ttsPath = path.join(process.cwd(), 'node_modules', 'node-edge-tts');
    return fs.existsSync(ttsPath);
  } catch {
    return false;
  }
}

/**
 * Generate audio using node-edge-tts module
 */
async function generateWithNodeEdgeTTS(text, outputPath, options) {
  const { voice, rate, volume } = options;
  const { TtsEngine } = await import('node-edge-tts');
  
  const tts = new TtsEngine();
  
  await tts.setProperties({
    voice,
    rate,
    volume,
    outputFormat: 'audio-24khz-48kbitrate-mono-mp3',
  });

  await tts.toFile(text, outputPath);
  
  return outputPath;
}

/**
 * Generate audio using edge-tts CLI
 */
async function generateWithEdgeCLI(text, outputPath, options) {
  const { voice, rate, volume } = options;
  const textFile = path.join(path.dirname(outputPath), `.tts_text_${Date.now()}.txt`);
  
  // Write text to temp file (edge-tts can read from file with --words)
  fs.writeFileSync(textFile, text, 'utf-8');

  try {
    await runCommand('npx', [
      'edge-tts',
      '--voice', voice,
      '--rate', rate,
      '--volume', volume,
      '--file', textFile,
      '--output', outputPath,
    ], { timeout: 30000 });
  } finally {
    // Cleanup temp text file
    if (fs.existsSync(textFile)) {
      fs.unlinkSync(textFile);
    }
  }

  if (!fs.existsSync(outputPath)) {
    throw new Error('edge-tts CLI failed to generate audio');
  }

  return outputPath;
}

/**
 * Generate placeholder audio with FFmpeg (silent audio with text markers)
 * This is a fallback when TTS is not available
 */
function generatePlaceholderAudio(text, outputPath) {
  const duration = Math.max(5, Math.min(45, text.length / 10)); // Rough estimate
  const outputDir = path.dirname(outputPath);
  
  // Create a silent audio file with FFmpeg
  runCommandSync('ffmpeg', [
    '-f', 'lavfi',
    '-i', 'anullsrc=r=24000:cl=mono',
    '-t', duration.toString(),
    '-ar', '24000',
    '-ac', '1',
    '-q:a', '9',
    outputPath,
  ], { timeout: 15000, cwd: outputDir });

  if (!fs.existsSync(outputPath)) {
    throw new Error('Failed to generate placeholder audio');
  }

  return outputPath;
}

/**
 * Run a command with promises
 */
function runCommand(cmd, args, options = {}) {
  return new Promise((resolve, reject) => {
    const { timeout = 30000, cwd = process.cwd() } = options;
    
    const proc = spawn(cmd, args, { cwd, shell: true });
    let stdout = '';
    let stderr = '';

    proc.stdout?.on('data', (data) => { stdout += data.toString(); });
    proc.stderr?.on('data', (data) => { stderr += data.toString(); });

    const timer = setTimeout(() => {
      proc.kill();
      reject(new Error(`Command timed out: ${cmd} ${args.join(' ')}`));
    }, timeout);

    proc.on('close', (code) => {
      clearTimeout(timer);
      if (code === 0) {
        resolve(stdout);
      } else {
        reject(new Error(`Command failed: ${cmd} ${args.join(' ')}\n${stderr}`));
      }
    });

    proc.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

/**
 * Run a command synchronously (blocking)
 */
function runCommandSync(cmd, args, options = {}) {
  const { timeout = 15000, cwd = process.cwd() } = options;
  
  const { spawnSync } = require('child_process');
  const result = spawnSync(cmd, args, { cwd, timeout });
  
  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error(`Command failed: ${cmd} ${args.join(' ')}`);
  }
  
  return result;
}

/**
 * Get available Spanish TTS voices
 * @returns {Promise<Array>} Array of voice objects
 */
export async function getAvailableVoices() {
  const spanishVoices = [
    { id: 'es-ES-AlvaroNeural', name: 'Alvaro (España)', gender: 'Male', locale: 'es-ES' },
    { id: 'es-ES-ElenaNeural', name: 'Elena (España)', gender: 'Female', locale: 'es-ES' },
    { id: 'es-MX-DaliaNeural', name: 'Dalia (México)', gender: 'Female', locale: 'es-MX' },
    { id: 'es-AR-TomasNeural', name: 'Tomas (Argentina)', gender: 'Male', locale: 'es-AR' },
    { id: 'es-CL-CatalinaNeural', name: 'Catalina (Chile)', gender: 'Female', locale: 'es-CL' },
    { id: 'es-CO-GonzaloNeural', name: 'Gonzalo (Colombia)', gender: 'Male', locale: 'es-CO' },
  ];

  // Try to get real voices from edge-tts if available
  try {
    const { voices } = await import('node-edge-tts');
    // If node-edge-tts exports voices, use those instead
    if (voices && Array.isArray(voices)) {
      return voices.filter(v => v.Locale.startsWith('es'));
    }
  } catch {
    // Fall back to our predefined list
  }

  return spanishVoices;
}

/**
 * Estimate audio duration from text
 * @param {string} text - Text to estimate
 * @param {number} wpm - Words per minute (default 150 for Spanish)
 * @returns {number} Estimated duration in seconds
 */
export function estimateAudioDuration(text, wpm = 150) {
  const words = text.trim().split(/\s+/).length;
  return Math.ceil((words / wpm) * 60);
}
/**
 * composer.js - FFmpeg video composition for "El Minuto de Tu Comuna"
 * Composes scenes, audio, and overlays into final MP4 video.
 */

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { generateScenes, getTotalDuration } from './scenes.js';
import { formatCurrency, formatNumber } from './utils.js';

/**
 * Check if FFmpeg is available
 * @returns {Promise<boolean>} True if FFmpeg is available
 */
export async function isFFmpegAvailable() {
  try {
    await runCommand('ffmpeg', ['-version'], { timeout: 5000 });
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if FFprobe is available
 * @returns {Promise<boolean>} True if FFprobe is available
 */
export async function isFFprobeAvailable() {
  try {
    await runCommand('ffprobe', ['-version'], { timeout: 5000 });
    return true;
  } catch {
    return false;
  }
}

/**
 * Compose a video for a given comuna
 * @param {Object} comuna - Comuna data object
 * @param {string} audioPath - Path to narration audio file
 * @param {string} outputPath - Path for output video
 * @returns {Promise<string>} Path to generated video
 */
export async function composeVideo(comuna, audioPath, outputPath) {
  const ffmpegAvailable = await isFFmpegAvailable();
  
  if (!ffmpegAvailable) {
    throw new Error(
      'FFmpeg is not available. Please install FFmpeg to generate videos.\n' +
      'Install with: sudo apt-get install ffmpeg'
    );
  }

  const scenes = generateScenes(comuna);
  const duration = getTotalDuration(scenes);
  const workDir = path.dirname(outputPath);
  
  // Create temp directory for frames
  const framesDir = path.join(workDir, `.frames_${path.basename(outputPath, '.mp4')}`);
  fs.mkdirSync(framesDir, { recursive: true });

  try {
    // Generate all scene frames
    console.log(`Generating ${scenes.length} scenes...`);
    for (const scene of scenes) {
      await generateSceneFrames(scene, comuna, framesDir);
    }

    // Concatenate frames into video
    const videoOnlyPath = path.join(workDir, `video_${path.basename(outputPath)}`);
    await concatenateFrames(framesDir, videoOnlyPath, duration);

    // Combine video with audio
    await muxVideoAudio(videoOnlyPath, audioPath, outputPath);

    // Cleanup temp files
    cleanupDirectory(framesDir);
    if (fs.existsSync(videoOnlyPath)) {
      fs.unlinkSync(videoOnlyPath);
    }

    return outputPath;
  } catch (error) {
    // Cleanup on error
    cleanupDirectory(framesDir);
    throw error;
  }
}

/**
 * Generate frames for a single scene
 */
async function generateSceneFrames(scene, comuna, framesDir) {
  const { id, type, duration, start } = scene;
  
  console.log(`  Scene ${id}: ${type} (${start}s - ${start + duration}s)`);

  // Generate frame images for this scene at 2 fps (for quick demo)
  // In production, you'd use a higher framerate
  const fps = 2;
  const totalFrames = Math.ceil(duration * fps);

  for (let i = 0; i < totalFrames; i++) {
    const framePath = path.join(framesDir, `${id}_${String(i).padStart(4, '0')}.png`);
    await generateFrameImage(type, scene, comuna, framePath, i / fps);
  }
}

/**
 * Generate a single frame image using FFmpeg drawtext filters
 */
async function generateFrameImage(type, scene, comuna, outputPath, timeInScene) {
  const width = 1280;
  const height = 720;
  
  let filterComplex = [];
  let baseColor = getBackgroundColor(type);
  
  // Start with background color
  filterComplex.push(`color=c=${baseColor}:s=${width}x${height}:d=${scene.duration}:r=1`);

  // Add text overlays based on scene type
  switch (type) {
    case 'intro':
      await generateIntroFrame(scene, comuna, outputPath, filterComplex);
      break;
    case 'data-card':
      await generateDataCardFrame(scene, comuna, outputPath, filterComplex);
      break;
    case 'bar-chart':
      await generateBarChartFrame(scene, comuna, outputPath, filterComplex);
      break;
    case 'comparison':
      await generateComparisonFrame(scene, comuna, outputPath, filterComplex);
      break;
    case 'alert':
      await generateAlertFrame(scene, comuna, outputPath, filterComplex);
      break;
    case 'outro':
      await generateOutroFrame(scene, comuna, outputPath, filterComplex);
      break;
    default:
      // Default text overlay
      filterComplex.push(`drawtext=text='${scene.title || type}':fontsize=48:fontcolor=white:x=(w-text_w)/2:y=(h-text_h)/2`);
  }

  // Use FFmpeg to generate the frame
  const args = [
    '-f', 'lavfi',
    '-i', `color=c=${baseColor.replace('#', '0x')}:s=${width}x${height}:d=1:r=1`,
    '-filter_complex', filterComplex.join(';'),
    '-frames:v', '1',
    '-q:v', '2',
    outputPath,
  ];

  try {
    await runCommand('ffmpeg', args, { timeout: 10000 });
  } catch (error) {
    // If FFmpeg fails, create a simple placeholder image
    await createPlaceholderImage(outputPath, width, height, scene.title || type);
  }
}

/**
 * Generate intro frame with title
 */
async function generateIntroFrame(scene, comuna, outputPath, filterComplex) {
  const title = `El Minuto de ${comuna.nombre}`;
  const subtitle = `Región ${comuna.region}`;
  
  filterComplex.push(
    `drawtext=text='${title}':fontsize=72:fontcolor=white:fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf:x=(w-text_w)/2:y=(h-text_h)/2-40`,
    `drawtext=text='${subtitle}':fontsize=36:fontcolor=0xCCCCCC:x=(w-text_w)/2:y=(h-text_h)/2+50`
  );

  // Add Chile map indicator (red dot)
  filterComplex.push(
    `drawbox=x=(w-20)/2:y=650:w=20:h=20:color=0xEF4444:t=fill`
  );

  await runFrameCommand(outputPath, filterComplex);
}

/**
 * Generate data card frame (budget, green areas, etc.)
 */
async function generateDataCardFrame(scene, comuna, outputPath, filterComplex) {
  const { title, value, detail } = scene;
  
  filterComplex.push(
    `drawtext=text='${title}':fontsize=32:fontcolor=0x999999:x=100:y=200`,
    `drawtext=text='${value}':fontsize=80:fontcolor=0x3B82F6:fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf:x=(w-text_w)/2:y=(h-text_h)/2`,
    `drawtext=text='${detail || ''}':fontsize=28:fontcolor=0xCCCCCC:x=(w-text_w)/2:y=(h-text_h)/2+80`
  );

  await runFrameCommand(outputPath, filterComplex);
}

/**
 * Generate bar chart frame for spending breakdown
 */
async function generateBarChartFrame(scene, comuna, outputPath, filterComplex) {
  const { title, bars } = scene;
  
  filterComplex.push(
    `drawtext=text='${title}':fontsize=36:fontcolor=white:fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf:x=100:y=80`
  );

  const barHeight = 60;
  const startY = 200;
  const maxWidth = 800;
  const barSpacing = 100;

  for (let i = 0; i < bars.length; i++) {
    const bar = bars[i];
    const pct = bar.value / scene.total;
    const barWidth = Math.round(pct * maxWidth);
    const y = startY + i * barSpacing;
    
    // Draw label
    filterComplex.push(
      `drawtext=text='${bar.label}':fontsize=24:fontcolor=white:x=100:y=${y + 20}`
    );
    
    // Draw bar background
    filterComplex.push(
      `drawbox=x=300:y=${y}:w=${maxWidth}:h=${barHeight}:color=0x333333:t=fill`
    );
    
    // Draw bar fill
    const colorHex = bar.color.replace('#', '0x');
    filterComplex.push(
      `drawbox=x=300:y=${y}:w=${barWidth}:h=${barHeight}:color=${colorHex}:t=fill`
    );

    // Draw percentage
    const pctText = `${Math.round(pct * 100)}%`;
    filterComplex.push(
      `drawtext=text='${pctText}':fontsize=24:fontcolor=white:x=1110:y=${y + 15}`
    );
  }

  await runFrameCommand(outputPath, filterComplex);
}

/**
 * Generate comparison frame (SIMCE scores)
 */
async function generateComparisonFrame(scene, comuna, outputPath, filterComplex) {
  const { title, metrics } = scene;
  
  filterComplex.push(
    `drawtext=text='${title}':fontsize=40:fontcolor=white:fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf:x=(w-text_w)/2:y=100`
  );

  const startY = 250;
  const spacing = 200;

  for (let i = 0; i < metrics.length; i++) {
    const m = metrics[i];
    const y = startY + i * spacing;
    const diffSign = m.diff > 0 ? '+' : '';
    const diffColor = m.diff >= 0 ? '0x10B981' : '0xEF4444';
    
    // Metric label
    filterComplex.push(
      `drawtext=text='${m.label}':fontsize=32:fontcolor=0xCCCCCC:x=200:y=${y}`
    );
    
    // Score value
    filterComplex.push(
      `drawtext=text='${m.value}':fontsize=64:fontcolor=0x3B82F6:fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf:x=200:y=${y + 40}`
    );
    
    // National average
    filterComplex.push(
      `drawtext=text='Promedio nacional: ${m.nationalAvg}':fontsize=24:fontcolor=0x999999:x=450:y=${y + 25}`
    );
    
    // Difference indicator
    const diffText = `${diffSign}${m.diff}`;
    filterComplex.push(
      `drawtext=text='${diffText}':fontsize=36:color=${diffColor}:fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf:x=700:y=${y + 45}`
    );
  }

  await runFrameCommand(outputPath, filterComplex);
}

/**
 * Generate alert frame (contraloria findings)
 */
async function generateAlertFrame(scene, comuna, outputPath, filterComplex) {
  const { title, count, detail, severity } = scene;
  
  const alertColor = severity === 'high' ? '0xEF4444' : '0xF59E0B';
  
  filterComplex.push(
    `drawtext=text='${title}':fontsize=36:fontcolor=white:fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf:x=100:y=100`
  );
  
  // Alert icon (red/yellow box)
  filterComplex.push(
    `drawbox=x=100:y=200:w=80:h=80:color=${alertColor}:t=fill`,
    `drawtext=text='${count}':fontsize=48:fontcolor=white:fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf:x=120:y=235`
  );
  
  // Truncate detail to fit on screen
  const truncatedDetail = detail.length > 150 ? detail.substring(0, 150) + '...' : detail;
  filterComplex.push(
    `drawtext=text='${truncatedDetail}':fontsize=24:fontcolor=0xCCCCCC:x=200:y=220:fontsize=24:enable='between(t,0,8)'`
  );

  await runFrameCommand(outputPath, filterComplex);
}

/**
 * Generate outro frame with share CTA
 */
async function generateOutroFrame(scene, comuna, outputPath, filterComplex) {
  const { text, hashtag } = scene;
  
  filterComplex.push(
    `drawtext=text='${text}':fontsize=56:fontcolor=white:fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf:x=(w-text_w)/2:y=(h-text_h)/2-30`,
    `drawtext=text='${hashtag}':fontsize=40:fontcolor=0x3B82F6:fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf:x=(w-text_w)/2:y=(h-text_h)/2+50`
  );

  await runFrameCommand(outputPath, filterComplex);
}

/**
 * Run FFmpeg frame generation command
 */
async function runFrameCommand(outputPath, filterComplex) {
  const width = 1280;
  const height = 720;
  const duration = 1; // 1 second per frame for now
  
  const args = [
    '-f', 'lavfi',
    '-i', `color=c=0x1a1a2e:s=${width}x${height}:d=${duration}:r=1`,
    '-filter_complex', filterComplex.join(';'),
    '-frames:v', '1',
    '-q:v', '2',
    '-y',
    outputPath,
  ];

  try {
    await runCommand('ffmpeg', args, { timeout: 10000 });
  } catch {
    // Fallback: create placeholder
    await createPlaceholderImage(outputPath, width, height, 'Frame');
  }
}

/**
 * Create a simple placeholder image
 */
async function createPlaceholderImage(outputPath, width, height, label) {
  try {
    await runCommand('convert', [
      '-size', `${width}x${height}`,
      'xc:#1a1a2e',
      '-fill', 'white',
      '-gravity', 'center',
      '-pointsize', '48',
      '-annotate', '0', label,
      outputPath,
    ], { timeout: 5000 });
  } catch {
    // If ImageMagick convert is not available, use FFmpeg
    try {
      await runCommand('ffmpeg', [
        '-f', 'lavfi',
        '-i', `color=c=0x1a1a2e:s=${width}x${height}:d=0.5:r=1`,
        '-frames:v', '1',
        '-y',
        outputPath,
      ], { timeout: 5000 });
    } catch {
      // Last resort: create empty file
      fs.writeFileSync(outputPath, '');
    }
  }
}

/**
 * Concatenate frames into video
 */
async function concatenateFrames(framesDir, outputPath, duration) {
  const framePattern = path.join(framesDir, '%04d.png');
  
  const args = [
    '-framerate', '2',
    '-i', framePattern,
    '-c:v', 'libx264',
    '-pix_fmt', 'yuv420p',
    '-t', duration.toString(),
    '-y',
    outputPath,
  ];

  try {
    await runCommand('ffmpeg', args, { timeout: duration * 5000 + 10000 });
  } catch (error) {
    // Try alternative concatenation method
    await concatenateFramesConcat(framesDir, outputPath, duration);
  }
}

/**
 * Alternative frame concatenation using concat muxer
 */
async function concatenateFramesConcat(framesDir, outputPath, duration) {
  // Get all PNG files sorted
  const files = fs.readdirSync(framesDir)
    .filter(f => f.endsWith('.png'))
    .sort();
  
  if (files.length === 0) {
    throw new Error('No frames found');
  }

  // Create concat file list
  const listPath = path.join(framesDir, 'concat.txt');
  const listContent = files.map(f => `file '${path.join(framesDir, f)}'`).join('\n');
  fs.writeFileSync(listPath, listContent);

  try {
    await runCommand('ffmpeg', [
      '-f', 'concat',
      '-safe', '0',
      '-i', listPath,
      '-c:v', 'libx264',
      '-pix_fmt', 'yuv420p',
      '-t', duration.toString(),
      '-y',
      outputPath,
    ], { timeout: duration * 5000 + 10000 });
  } finally {
    fs.unlinkSync(listPath);
  }
}

/**
 * Mux video and audio together
 */
async function muxVideoAudio(videoPath, audioPath, outputPath) {
  const args = [
    '-i', videoPath,
    '-i', audioPath,
    '-c:v', 'copy',
    '-c:a', 'aac',
    '-shortest',
    '-y',
    outputPath,
  ];

  await runCommand('ffmpeg', args, { timeout: 60000 });
}

/**
 * Get background color based on scene type
 */
function getBackgroundColor(type) {
  const colors = {
    'intro': '0x1a1a2e',
    'data-card': '0x0f172a',
    'bar-chart': '0x0f172a',
    'comparison': '0x0f172a',
    'alert': '0x1a0a0a',
    'outro': '0x1a1a2e',
  };
  return colors[type] || '0x1a1a2e';
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
 * Cleanup a directory
 */
function cleanupDirectory(dirPath) {
  if (!fs.existsSync(dirPath)) return;
  
  try {
    const files = fs.readdirSync(dirPath);
    for (const file of files) {
      fs.unlinkSync(path.join(dirPath, file));
    }
    fs.rmdirSync(dirPath);
  } catch (error) {
    console.warn(`Failed to cleanup directory ${dirPath}:`, error.message);
  }
}
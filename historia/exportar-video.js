// Autor: BS
// Exporta la escena a MP4 1920x1080 a 30 cuadros por segundo, con el sonido sintetizado.
// Uso: node exportar-video.js [entrada.html] [salida.mp4]
// Requiere: Node, Playwright con Chromium y ffmpeg.
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const ENTRADA = path.resolve(process.argv[2] || path.join(__dirname, 'cap1-escena1.html'));
const SALIDA = path.resolve(process.argv[3] || path.join(__dirname, 'cap1-escena1.mp4'));
const FPS = 30;

(async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'escena-'));
  const pagina = path.join(tmp, 'pagina.html');
  // La página se publica sin <html>/<head>; aquí se le agrega ese esqueleto.
  fs.writeFileSync(pagina, '<!doctype html><html><head><meta charset="utf-8"></head><body>' + fs.readFileSync(ENTRADA, 'utf8') + '</body></html>');

  const navegador = await chromium.launch();
  const p = await navegador.newPage({ viewport: { width: 1920, height: 1080 } });
  p.on('pageerror', e => console.error('Error en la página:', e.message));
  await p.goto('file://' + pagina + '?export');
  await p.evaluate(() => window.__pilot.ready);
  const DUR = await p.evaluate(() => window.__pilot.DUR);

  // 1. Sonido
  process.stdout.write('Sintetizando sonido… ');
  const { len } = await p.evaluate(() => window.__pilot.audio());
  let b64 = '';
  for (let i = 0; i < len; i += 4_000_000) b64 += await p.evaluate(([i, n]) => window.__pilot.wavChunk(i, n), [i, 4_000_000]);
  const wav = path.join(tmp, 'sonido.wav');
  fs.writeFileSync(wav, Buffer.from(b64, 'base64'));
  console.log('listo');

  // 2. Imagen + mezcla final
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error',
    '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
    '-i', wav,
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', SALIDA], { stdio: ['pipe', 'inherit', 'inherit'] });

  const total = Math.round(DUR * FPS);
  for (let f = 0; f < total; f++) {
    const dataUrl = await p.evaluate(t => window.__pilot.frame(t, 0.93), f / FPS);
    const ok = ff.stdin.write(Buffer.from(dataUrl.slice(dataUrl.indexOf(',') + 1), 'base64'));
    if (!ok) await new Promise(r => ff.stdin.once('drain', r));
    if (f % FPS === 0) process.stdout.write(`\rCuadros: ${f}/${total}`);
  }
  ff.stdin.end();
  await new Promise((res, rej) => ff.on('close', c => (c === 0 ? res() : rej(new Error('ffmpeg terminó con código ' + c)))));
  await navegador.close();
  fs.rmSync(tmp, { recursive: true, force: true });
  console.log(`\rVideo listo: ${SALIDA}`);
})().catch(e => { console.error(e); process.exit(1); });

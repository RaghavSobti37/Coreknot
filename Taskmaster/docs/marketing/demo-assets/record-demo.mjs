/**
 * Record labeled CoreKnot demo storyboard → webm → mp4.
 * Usage: node docs/marketing/demo-assets/record-demo.mjs
 */
import { chromium } from 'playwright';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import fs from 'node:fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const htmlPath = path.join(__dirname, 'demo-storyboard.html');
const outDir = __dirname;
const webmPath = path.join(outDir, 'coreknot-open-orgs-demo.webm');
const mp4Path = path.join(outDir, 'coreknot-open-orgs-demo.mp4');

const TOTAL_MS = 210_000; // ~3.5 min buffer

async function main() {
  if (!fs.existsSync(htmlPath)) {
    throw new Error(`Missing storyboard: ${htmlPath}`);
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    recordVideo: { dir: outDir, size: { width: 1280, height: 720 } },
  });
  const page = await context.newPage();
  await page.goto(pathToFileURL(htmlPath).href, { waitUntil: 'load' });

  const deadline = Date.now() + TOTAL_MS;
  while (Date.now() < deadline) {
    const done = await page.evaluate(() => document.body.dataset.demoComplete === '1');
    if (done) break;
    await page.waitForTimeout(500);
  }

  const video = page.video();
  await context.close();
  await browser.close();

  if (video) {
    const tmp = await video.path();
    fs.renameSync(tmp, webmPath);
    console.log('Wrote', webmPath);
  }

  const ff = spawnSync('ffmpeg', [
    '-y', '-i', webmPath,
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p',
    '-movflags', '+faststart',
    mp4Path,
  ], { encoding: 'utf8' });

  if (ff.status !== 0) {
    console.error(ff.stderr || ff.stdout);
    console.warn('ffmpeg failed — keep webm at', webmPath);
    process.exitCode = 0;
    return;
  }
  console.log('Wrote', mp4Path);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

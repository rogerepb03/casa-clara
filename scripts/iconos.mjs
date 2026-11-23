// Genera los íconos PNG de la app a partir de public/icon.svg
// Uso: npm run icons
import sharp from 'sharp';
import { readFile } from 'node:fs/promises';

const svg = await readFile(new URL('../public/icon.svg', import.meta.url));
const out = (n) => new URL(`../public/${n}`, import.meta.url).pathname;

await sharp(svg).resize(192, 192).png().toFile(out('icon-192.png'));
await sharp(svg).resize(512, 512).png().toFile(out('icon-512.png'));
await sharp(svg).resize(180, 180).png().toFile(out('apple-touch-icon.png'));
// Maskable: ícono con margen de seguridad sobre fondo lleno
await sharp({ create: { width: 512, height: 512, channels: 4, background: '#1F4FA8' } })
  .composite([{ input: await sharp(svg).resize(400, 400).png().toBuffer(), gravity: 'center' }])
  .png()
  .toFile(out('icon-maskable-512.png'));
console.log('Íconos generados en public/');

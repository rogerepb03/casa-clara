// Toma capturas de la app en tamaño teléfono (requiere Chrome instalado).
// Uso: npm run build && npx vite preview --port 4173 & node scripts/capturas.mjs
import { chromium } from 'playwright-core';
import { mkdir } from 'node:fs/promises';

const base = process.env.URL ?? 'http://localhost:4173/';
const chrome = process.env.CHROME ?? '/usr/bin/google-chrome';
await mkdir('capturas', { recursive: true });

const browser = await chromium.launch({ executablePath: chrome, args: ['--no-sandbox'] });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, locale: 'es-CL', timezoneId: 'America/Santiago' });
const page = await ctx.newPage();
const errores = [];
page.on('pageerror', (e) => errores.push(e.message));
page.on('console', (m) => m.type() === 'error' && errores.push(m.text()));

const foto = async (nombre, completa = true) => {
  await page.waitForTimeout(400);
  await page.screenshot({ path: `capturas/${nombre}.png`, fullPage: completa });
  console.log('captura', nombre);
};

await page.goto(base);
await foto('01-ingreso', false);
await page.getByRole('button', { name: 'Entrar como administrador' }).click();
await page.waitForSelector('.barrio');
await foto('02-inicio');
await page.getByRole('link', { name: 'Propiedades', exact: true }).click();
await foto('03-propiedades', false);
await page.getByRole('link', { name: /Depto Ñuñoa/ }).first().click();
await foto('04-detalle-propiedad');
await page.getByRole('link', { name: 'Finanzas', exact: true }).click();
await foto('05-finanzas', false);
await page.locator('.fila').first().click();
await foto('06-detalle-movimiento', false);
await page.keyboard.press('Escape');
await page.goto(base + '#/finanzas/nuevo');
await foto('07-nuevo-movimiento', false);
await page.goto(base + '#/logros');
await foto('08-logros');
await page.goto(base + '#/documentos');
await foto('09-documentos', false);
await page.goto(base + '#/mas');
await page.getByRole('button', { name: 'Arrendataria' }).click();
await page.waitForTimeout(300);
await page.goto(base + '#/');
await foto('10-arrendataria-inicio');
await page.goto(base + '#/pagos');
await foto('11-arrendataria-pagos', false);
await page.goto(base + '#/solicitudes?nueva=1');
await page.reload();
await foto('12-arrendataria-solicitud', false);

// Flujo real: crear una solicitud como arrendataria
await page.getByLabel('¿Qué pasa?').fill('No sale agua caliente');
await page.getByRole('button', { name: 'Enviar aviso' }).click();
await page.waitForSelector('text=Aviso enviado');
await foto('13-solicitud-enviada', false);

// Escritorio
await page.setViewportSize({ width: 1280, height: 900 });
await page.goto(base + '#/mas');
await page.getByRole('button', { name: 'Administrador' }).click();
await page.goto(base + '#/');
await foto('14-escritorio', false);

console.log(errores.length ? `ERRORES:\n${errores.join('\n')}` : 'Sin errores en consola');
await browser.close();

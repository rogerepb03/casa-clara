import { chromium } from 'playwright-core';
const base = process.env.URL ?? 'http://localhost:4173/';
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, locale: 'es-CL', timezoneId: 'America/Santiago' });
const p = await ctx.newPage();
const err = []; p.on('pageerror', (e) => err.push(e.message)); p.on('console', (m) => m.type() === 'error' && err.push(m.text()));
const foto = async (n, full = true) => { await p.waitForTimeout(350); await p.screenshot({ path: `capturas/${n}.png`, fullPage: full }); console.log('captura', n); };

await p.goto(base); await p.evaluate(() => localStorage.clear()); await p.reload();
await foto('20-ingreso-con-test', false);
// Test de vivienda sin cuenta, con el ejemplo del usuario
await p.getByRole('link', { name: /Buscas dónde arrendar/ }).click();
await p.getByLabel('Ingreso líquido mensual del hogar').fill('2000000');
await p.getByRole('button', { name: 'Más niños' }).click(); await p.getByRole('button', { name: 'Más niños' }).click();
await foto('21-test-paso1', false);
await p.getByRole('button', { name: 'Siguiente' }).click();
await p.getByLabel('Alimentación, cuentas y gastos del hogar').fill('800000');
await p.getByRole('button', { name: 'Siguiente' }).click();
await p.getByLabel('¿Cuánto tienes disponible para arriendo?').fill('400000');
await foto('22-test-paso3', false);
await p.getByRole('button', { name: 'Ver resultado' }).click();
await p.waitForSelector('text=Tu resultado');
await p.locator('.comuna button.fila').first().click();
await foto('23-test-resultado');
const enlace = await p.locator('a', { hasText: 'Portal Inmobiliario' }).first().getAttribute('href');
console.log('enlace portal:', enlace);

// Admin: bitácora
await p.goto(base); await p.getByRole('button', { name: 'Entrar como administrador' }).click(); await p.waitForSelector('.barrio');
await p.getByRole('link', { name: 'Bitácora', exact: true }).click();
await p.waitForSelector('.post img');
await foto('24-bitacora');
await p.goto(base + '#/bitacora/nueva');
await p.getByRole('button', { name: 'Evento familiar' }).click();
await p.locator('input[type=file]').setInputFiles('/tmp/foto-prueba.jpg');
await p.getByLabel('Título').fill('Asado de fin de año');
await foto('25-nueva-publicacion', false);
await p.getByRole('button', { name: 'Guardar en la bitácora' }).click();
await p.waitForSelector('text=Asado de fin de año');
console.log('publicación creada OK');
await p.goto(base + '#/seguros');
await foto('26-seguros');

// Arrendataria: reporta un robo con foto
await p.goto(base + '#/mas'); await p.getByRole('button', { name: 'Arrendataria' }).click(); await p.waitForTimeout(300);
await p.goto(base + '#/bitacora');
await foto('27-bitacora-arrendataria', false);
await p.goto(base + '#/bitacora/nueva');
await p.getByRole('button', { name: 'Robo' }).click();
await p.locator('input[type=file]').setInputFiles('/tmp/foto-prueba.jpg');
await p.getByLabel('Título').fill('Robaron la bicicleta de la bodega');
await p.getByRole('button', { name: 'Enviar reporte' }).click();
await p.waitForSelector('text=Robaron la bicicleta');
await foto('28-reporte-enviado', false);
// Vuelve a admin: el robo aparece y baja la salud
await p.goto(base + '#/mas'); await p.getByRole('button', { name: 'Administrador' }).click(); await p.waitForTimeout(300);
await p.goto(base + '#/'); await p.waitForSelector('.barrio');
await foto('29-inicio-con-incidente', false);
console.log(err.length ? 'ERRORES:\n' + err.join('\n') : 'Sin errores en consola');
await b.close();

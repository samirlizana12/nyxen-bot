const puppeteer = require('puppeteer');
const { delay } = require('./util');

async function crearSala(modo) {
  const intentosMaximos = 3;

  for (let intento = 1; intento <= intentosMaximos; intento++) {
    console.log(`🔄 Intento ${intento}: Creando sala para modo ${modo}`);

    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      defaultViewport: { width: 1366, height: 768 },
    });

    try {
      const page = await browser.newPage();
      await page.goto('https://shellshock.io');
      await page.waitForSelector('canvas');
      console.log('🖥️ Canvas detectado');

      await page.evaluate(() => {
        [...document.querySelectorAll('button')].find(btn =>
          btn.textContent.includes('Juega con amigos')
        )?.click();
      });
      console.log('🎮 Click en "Juega con amigos"');
      await delay(1500);

      await page.evaluate(() => {
        [...document.querySelectorAll('button')].find(btn =>
          btn.textContent.includes('Equipos')
        )?.click();
      });
      console.log('👥 Modo Equipos seleccionado');
      await delay(1500);

      await page.evaluate(() => {
        [...document.querySelectorAll('button')].find(btn =>
          btn.textContent.includes('Servidores')
        )?.click();
      });
      await delay(1000);
      await page.evaluate(() => {
        [...document.querySelectorAll('li')].find(li =>
          li.textContent.includes('Chile')
        )?.click();
      });
      console.log('🌍 Servidor Chile seleccionado');
      await delay(1500);

      await page.click('#map-search');
      await page.keyboard.type('Castle');
      await page.waitForTimeout(1500);
      await page.waitForSelector('li.text_blue5.font-nunito', { timeout: 5000 });

      const opciones = await page.$$('li.text_blue5.font-nunito');
      for (const opcion of opciones) {
        const texto = await opcion.evaluate(el => el.textContent.trim());
        if (texto === 'Castle') {
          await opcion.click();
          break;
        }
      }

      console.log('🏰 Mapa Castle seleccionado');
      await delay(1500);

      await page.evaluate(() => {
        [...document.querySelectorAll('button')].find(btn =>
          btn.textContent.includes('Crear juego')
        )?.click();
      });
      console.log('✅ Botón Crear Juego clickeado');
      await delay(8000);

      const code = await page.evaluate(() => {
        const h1 = document.querySelector('h1.ss_marginleft');
        return h1?.innerText.trim();
      });

      if (code) {
        const finalLink = `https://shellshock.io/#${code}`;
        console.log('✅ Enlace obtenido desde <h1>:', finalLink);
        setTimeout(() => browser.close(), 10 * 60 * 1000); // cerrar en 10 min
        return finalLink;
      }

      console.log('❌ No se pudo obtener el código desde <h1>');
      await browser.close();

    } catch (err) {
      console.log(`❌ Error en intento ${intento}: ${err.message}`);
      await browser.close();
    }
  }

  return null;
}

module.exports = crearSala;

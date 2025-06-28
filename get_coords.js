const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: { width: 1366, height: 768 },
    args: ['--window-size=1366,768']
  });

  const page = await browser.newPage();
  await page.goto('https://shellshock.io', { waitUntil: 'networkidle2' });
  await page.waitForSelector('canvas', { timeout: 15000 });

  await page.exposeFunction('logClick', (x, y) => {
    console.log(`Click registrado en: x=${x}, y=${y}`);
  });

  await page.evaluate(() => {
    document.addEventListener('click', e => {
      const x = e.clientX;
      const y = e.clientY;
      window.logClick(x, y);
    });
    alert('Haz clic donde quieras registrar coordenadas. Mira la consola para verlas.');
  });
})();

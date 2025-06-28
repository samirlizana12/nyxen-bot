const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();
  await page.goto('https://google.com', { waitUntil: 'networkidle2' });

  // Espera 5 segundos sin usar waitForTimeout
  await new Promise(resolve => setTimeout(resolve, 5000));

  await browser.close();
})();

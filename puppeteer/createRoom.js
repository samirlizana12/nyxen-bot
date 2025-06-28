const puppeteer = require('puppeteer');
const clipboardy = require('clipboardy');

async function createShellShockersRoom() {
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: { width: 1366, height: 768 },
  });

  const page = await browser.newPage();

  await page.goto('https://shellshock.io');

  await page.waitForSelector('#btn_play', { timeout: 30000 });

  const clicks = [
    { x: 478, y: 692 },
    { x: 804, y: 254 },
    { x: 969, y: 264 },
    { x: 841, y: 323 },
    { x: 970, y: 307 },
    { x: 848, y: 374 },
    { x: 983, y: 156 },
    { x: 692, y: 587 },
    { x: 812, y: 247 },
    { x: 700, y: 539 },
    { x: 820, y: 600 },
  ];

  for (const click of clicks) {
    await page.mouse.click(click.x, click.y);
    await page.waitForTimeout(1000);
  }

  const roomUrl = page.url();

  await clipboardy.write(roomUrl);

  await browser.close();

  return roomUrl;
}

module.exports = createShellShockersRoom;

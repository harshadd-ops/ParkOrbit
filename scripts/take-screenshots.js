const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function capture() {
  const outputDir = path.join(__dirname, '..', 'docs', 'screenshots');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 960 },
    deviceScaleFactor: 2, // HiDPI / Retina quality
  });

  const page = await context.newPage();

  console.log('1. Capturing Hero Discovery Map...');
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
  // Wait for map tiles and leaflet markers to render
  await page.waitForTimeout(3000);
  await page.screenshot({ path: path.join(outputDir, '01_hero_discovery_map.png') });

  console.log('2. Capturing Listing Details & Booking Flow...');
  await page.goto('http://localhost:3000/listings/listing-koregaon-park-1', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: path.join(outputDir, '02_listing_detail_booking.png') });

  console.log('3. Capturing Driver Dashboard...');
  await context.addCookies([
    { name: 'parkorbit_user_id', value: 'user-driver-1', domain: 'localhost', path: '/' }
  ]);
  await page.goto('http://localhost:3000/dashboard/driver', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(outputDir, '03_driver_dashboard_passes.png') });

  console.log('4. Capturing Host Dashboard & Space Analytics...');
  await context.clearCookies();
  await context.addCookies([
    { name: 'parkorbit_user_id', value: 'user-host-1', domain: 'localhost', path: '/' }
  ]);
  await page.goto('http://localhost:3000/dashboard/host', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: path.join(outputDir, '04_host_workspace_analytics.png') });

  console.log('5. Capturing Host Listing Onboarding & Map Picker...');
  await page.goto('http://localhost:3000/host/new', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: path.join(outputDir, '05_host_space_onboarding_map.png') });

  console.log('6. Capturing Admin Moderation & Trust Console...');
  await context.clearCookies();
  await context.addCookies([
    { name: 'parkorbit_user_id', value: 'user-admin-1', domain: 'localhost', path: '/' }
  ]);
  await page.goto('http://localhost:3000/admin', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: path.join(outputDir, '06_admin_trust_safety.png') });

  console.log('All screenshots captured successfully!');
  await browser.close();
}

capture().catch(err => {
  console.error('Error capturing screenshots:', err);
  process.exit(1);
});

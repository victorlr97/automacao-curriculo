// Garante que existe um Chrome instalável pro Puppeteer em ambiente Linux
// (Render), baixando via @puppeteer/browsers na primeira vez e reaproveitando
// o cache local nas próximas. Imprime só o caminho do executável no stdout,
// pra ser capturado por scripts de start (`$(node scripts/ensure-chrome.js)`).
const path = require('path');
const { install, resolveBuildId, Browser, detectBrowserPlatform, getInstalledBrowsers } = require('@puppeteer/browsers');

const CACHE_DIR = path.join(__dirname, '..', '.chrome-cache');

async function main() {
  const platform = detectBrowserPlatform();
  const existing = await getInstalledBrowsers({ cacheDir: CACHE_DIR });
  const already = existing.find(b => b.browser === Browser.CHROME);
  if (already) {
    process.stdout.write(already.executablePath);
    return;
  }

  const buildId = await resolveBuildId(Browser.CHROME, platform, 'stable');
  const installed = await install({ browser: Browser.CHROME, buildId, cacheDir: CACHE_DIR, platform });
  process.stdout.write(installed.executablePath);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

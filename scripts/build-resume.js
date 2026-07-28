const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');
const { renderHtml } = require('./render');

const CHROME_CANDIDATES = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe'
];

function findBrowserExecutable() {
  // Em produção (Render), o Chrome vem baixado via @puppeteer/browsers no
  // build, e o caminho é passado por essa variável — evita depender dos
  // caminhos fixos do Windows abaixo, que só existem em dev local.
  if (process.env.PUPPETEER_EXECUTABLE_PATH && fs.existsSync(process.env.PUPPETEER_EXECUTABLE_PATH)) {
    return process.env.PUPPETEER_EXECUTABLE_PATH;
  }
  const found = CHROME_CANDIDATES.find(p => fs.existsSync(p));
  if (!found) {
    throw new Error('Nenhum navegador Chrome/Edge encontrado. Defina PUPPETEER_EXECUTABLE_PATH ou instale o Chrome/Edge nos caminhos padrão do Windows (CHROME_CANDIDATES em scripts/build-resume.js).');
  }
  return found;
}

// Dimensões de uma página A4 em px CSS a 96dpi — usadas no viewport pra medir
// o layout do jeito que ele vai ficar impresso.
const PAGE_WIDTH_PX = 794;
const PAGE_HEIGHT_PX = 1123;

// Se o conteúdo passar de 1 página por uma margem pequena (até 35%), o template
// é re-renderizado com fontes/espaçamentos levemente menores até caber numa
// página só, em vez de deixar uma 2a página quase em branco. Se passar muito
// disso, é conteúdo de verdade pra 2 páginas — não força encolher além do
// razoável (a escala mínima ainda deixa o texto legível).
const MAX_SHRINK_RATIO = 1.35;
const MIN_SCALE = 0.8;
const MAX_ITERATIONS = 5;

async function measureHeight(page) {
  return page.evaluate(() => document.querySelector('.page').scrollHeight);
}

async function renderAtScale(page, data, scale) {
  // domcontentloaded (não networkidle0): tudo já vem embutido como data URI
  // (fontes em base64), não há requisição de rede real a esperar — e chamar
  // setContent várias vezes na mesma page com networkidle0 trava por timeout.
  await page.setContent(renderHtml(data, { scale }), { waitUntil: 'domcontentloaded' });
}

async function fitToSinglePage(page, data) {
  let scale = 1;
  let height = await measureHeight(page);
  if (height <= PAGE_HEIGHT_PX) return;
  if (height > PAGE_HEIGHT_PX * MAX_SHRINK_RATIO) return;

  for (let i = 0; i < MAX_ITERATIONS && scale > MIN_SCALE; i++) {
    scale = Math.max(MIN_SCALE, scale * (PAGE_HEIGHT_PX / height));
    await renderAtScale(page, data, scale);
    height = await measureHeight(page);
    if (height <= PAGE_HEIGHT_PX) return;
  }
}

// No Windows, escrever direto por cima de um arquivo que o navegador ainda
// está lendo (ex: o PDF aberto na pré-visualização) derruba com EBUSY. Em vez
// de deixar o Puppeteer escrever direto no destino, gera o PDF em memória e
// grava com algumas tentativas — o bloqueio costuma ser momentâneo.
async function writeFileWithRetry(filePath, buffer, maxRetries = 6, delayMs = 400) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      fs.writeFileSync(filePath, buffer);
      return;
    } catch (err) {
      const retryable = err.code === 'EBUSY' || err.code === 'EPERM' || err.code === 'EACCES';
      if (retryable && attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
        continue;
      }
      if (retryable) {
        throw new Error(`O arquivo "${path.basename(filePath)}" está sendo usado por outro programa (talvez a pré-visualização aberta no navegador). Feche a pré-visualização e tente novamente.`);
      }
      throw err;
    }
  }
}

async function buildResume(dataPath, outputPdfPath) {
  const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

  const browser = await puppeteer.launch({
    executablePath: findBrowserExecutable(),
    headless: true
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: PAGE_WIDTH_PX, height: PAGE_HEIGHT_PX });
    await renderAtScale(page, data, 1);
    await fitToSinglePage(page, data);
    await fs.promises.mkdir(path.dirname(outputPdfPath), { recursive: true });
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '0', bottom: '0', left: '0', right: '0' }
    });
    await writeFileWithRetry(outputPdfPath, pdfBuffer);
  } finally {
    await browser.close();
  }
}

if (require.main === module) {
  const [, , dataPath, outputPdfPath] = process.argv;
  if (!dataPath || !outputPdfPath) {
    console.error('Uso: node scripts/build-resume.js <dados-resolvidos.json> <saida.pdf>');
    process.exit(1);
  }
  buildResume(dataPath, outputPdfPath)
    .then(() => console.log(`PDF gerado em: ${outputPdfPath}`))
    .catch(err => {
      console.error('Erro ao gerar PDF:', err);
      process.exit(1);
    });
}

module.exports = { buildResume };

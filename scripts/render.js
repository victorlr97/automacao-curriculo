const fs = require('fs');
const path = require('path');

const FONTS_DIR = path.join(__dirname, '..', 'template', 'fonts');

function fontDataUri(filename) {
  const buf = fs.readFileSync(path.join(FONTS_DIR, filename));
  return `data:font/woff2;base64,${buf.toString('base64')}`;
}

function esc(str) {
  if (str === undefined || str === null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function toUrl(value) {
  const v = String(value || '');
  return /^https?:\/\//i.test(v) ? v : `https://${v}`;
}

const LABELS = {
  pt: {
    objective: 'SOBRE',
    experience: 'EXPERIÊNCIA',
    projects: 'PROJETOS',
    education: 'FORMAÇÃO',
    additionalEducation: 'FORMAÇÃO COMPLEMENTAR',
    skills: 'HABILIDADES',
    languages: 'IDIOMA',
    portfolio: 'PORTFÓLIO',
    portfolioIntro: 'Veja meu trabalho aqui:'
  },
  en: {
    objective: 'ABOUT',
    experience: 'EXPERIENCE',
    projects: 'PROJECTS',
    education: 'EDUCATION',
    additionalEducation: 'ADDITIONAL EDUCATION',
    skills: 'SKILLS',
    languages: 'LANGUAGES',
    portfolio: 'PORTFOLIO',
    portfolioIntro: 'View my work here:'
  }
};

function renderHtml(data, options = {}) {
  const scale = options.scale || 1;
  const pt = n => `${(n * scale).toFixed(2)}pt`;
  const px = n => `${Math.round(n * scale)}px`;

  const lang = data.language === 'en' ? 'en' : 'pt';
  const labels = LABELS[lang];

  const fonts = {
    latoRegular: fontDataUri('Lato-Regular.woff2'),
    latoBold: fontDataUri('Lato-Bold.woff2')
  };

  const contactLines = [];
  if (data.personal.location) contactLines.push(`<div>${esc(data.personal.location)}</div>`);
  if (data.personal.phone) contactLines.push(`<div class="contact-strong">${esc(data.personal.phone)}</div>`);
  if (data.personal.email) contactLines.push(`<div class="contact-link"><a href="mailto:${esc(data.personal.email)}">${esc(data.personal.email)}</a></div>`);
  if (data.personal.github) contactLines.push(`<div class="contact-link"><a href="${esc(toUrl(data.personal.github))}">GitHub</a></div>`);
  if (data.personal.linkedin) contactLines.push(`<div class="contact-link"><a href="${esc(toUrl(data.personal.linkedin))}">LinkedIn</a></div>`);

  const experienceHtml = (data.experience || []).map(exp => `
    <div class="entry">
      <div class="entry-title"><span class="entry-name">${esc(exp.company)}${exp.location ? ', ' + esc(exp.location) : ''}</span> — <span class="entry-role">${esc(exp.role)}</span></div>
      <div class="entry-period">${esc(exp.period)}</div>
      <div class="entry-desc">${esc(exp.description)}</div>
    </div>`).join('');

  const projectsHtml = (data.projects || []).map(proj => `
    <div class="entry">
      <div class="entry-title"><span class="entry-name">${esc(proj.name)}</span> — <span class="entry-role">${esc(proj.role)}</span></div>
      ${proj.stack && proj.stack.length ? `<div class="entry-stack">${esc(proj.stack.join(', '))}.</div>` : ''}
      <div class="entry-desc">${esc(proj.description)}</div>
    </div>`).join('');

  const skillsHtml = (data.skills || []).map(s => `<div class="skill-item">${esc(s)}</div>`).join('');
  const languagesHtml = (data.languages || []).map(l => `<div class="lang-item">${esc(l.name)} (${esc(l.level)})</div>`).join('');

  // Aceita tanto o formato antigo (um objeto único) quanto o novo (lista) —
  // currículos já gerados antes dessa mudança ainda têm o formato singular.
  const educationList = Array.isArray(data.education) ? data.education : (data.education ? [data.education] : []);
  const eduHtml = educationList.map(edu => `
    <div class="entry">
      <div class="entry-title"><span class="entry-name">${esc(edu.institution)}</span> — <span class="entry-role">${esc(edu.degree)}</span></div>
      <div class="entry-period">${esc(edu.period)}</div>
    </div>`).join('');

  const additionalEducation = data.additionalEducation || [];
  const additionalEducationHtml = additionalEducation.map(ed => `
    <div class="additional-edu-item"><span class="entry-name">${esc(ed.institution)}</span>${ed.description ? ' — ' + esc(ed.description) : ''}</div>`).join('');

  const portfolioLinks = [];
  if (data.portfolio && data.portfolio.github) portfolioLinks.push(`<div><a href="${esc(toUrl(data.portfolio.github))}">GitHub</a></div>`);
  if (data.portfolio && data.portfolio.behance) portfolioLinks.push(`<div><a href="${esc(toUrl(data.portfolio.behance))}">Behance</a></div>`);

  return `<!DOCTYPE html>
<html lang="${lang === 'en' ? 'en' : 'pt-BR'}">
<head>
<meta charset="UTF-8">
<style>
  @font-face { font-family: 'Lato'; font-weight: 400; font-style: normal; src: url(${fonts.latoRegular}) format('woff2'); }
  @font-face { font-family: 'Lato'; font-weight: 700; font-style: normal; src: url(${fonts.latoBold}) format('woff2'); }

  * { box-sizing: border-box; }
  html, body {
    margin: 0; padding: 0;
    font-family: 'Lato', sans-serif;
    color: #3a3a3a;
    font-size: ${pt(10.5)};
    line-height: 1.5;
  }
  .page {
    padding: ${px(42)} ${px(48)};
  }

  .header-row {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: ${px(24)};
    margin-bottom: ${px(22)};
  }
  .header-left { flex: 1; min-width: 0; }
  .header-right {
    flex-shrink: 0;
    text-align: right;
    padding-top: ${px(6)};
    white-space: nowrap;
  }

  .columns {
    display: grid;
    grid-template-columns: 68% 32%;
    column-gap: ${px(24)};
  }

  h1.name {
    font-family: 'Lato', sans-serif;
    font-weight: 700;
    font-size: ${pt(34)};
    color: #111;
    margin: 0 0 ${px(4)} 0;
    line-height: 1;
  }
  .subtitle {
    color: #666;
    font-size: ${pt(11)};
  }

  .contact-block { font-size: ${pt(9.5)}; color: #333; }
  .contact-block div { margin-bottom: ${px(3)}; }
  .contact-strong { font-weight: 700; }
  .contact-link a, .entry a { color: #1a5fb4; text-decoration: underline; }

  h2.section {
    font-family: 'Lato', sans-serif;
    font-size: ${pt(10.5)};
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: #1a5fb4;
    margin: ${px(20)} 0 ${px(8)} 0;
  }
  .col-left > h2.section:first-of-type,
  .col-right > h2.section:first-of-type { margin-top: 0; }

  .objective-text { color: #444; }

  .entry { margin-bottom: ${px(14)}; break-inside: avoid; page-break-inside: avoid; }
  .entry-title {
    font-family: 'Lato', sans-serif;
    font-size: ${pt(11.5)};
    color: #111;
  }
  .entry-name { font-weight: 700; }
  .entry-period {
    font-size: ${pt(9)};
    color: #888;
    margin: ${px(1)} 0 ${px(4)} 0;
  }
  .entry-stack {
    font-family: 'Lato', sans-serif;
    font-weight: 700;
    font-size: ${pt(9.5)};
    color: #333;
    margin-bottom: ${px(3)};
  }
  .entry-desc { color: #444; font-size: ${pt(10)}; }

  .skill-item, .lang-item {
    font-size: ${pt(10)};
    color: #333;
    margin-bottom: ${px(9)};
  }

  .additional-edu-item {
    font-family: 'Lato', sans-serif;
    font-size: ${pt(9.5)};
    color: #555;
    margin-bottom: ${px(10)};
    line-height: 1.4;
    break-inside: avoid;
    page-break-inside: avoid;
  }
  .additional-edu-item .entry-name { color: #333; }

  .portfolio-intro { margin-bottom: ${px(6)}; color: #444; }
  .portfolio-links div { margin-bottom: ${px(3)}; }
</style>
</head>
<body>
  <div class="page">
    <div class="header-row">
      <div class="header-left">
        <h1 class="name">${esc(data.personal.name)}</h1>
        <div class="subtitle">${esc(data.personal.age)}, ${esc(data.title)}</div>
      </div>
      <div class="header-right contact-block">${contactLines.join('')}</div>
    </div>
    <div class="columns">
      <div class="col-left">
        <h2 class="section">${labels.objective}</h2>
        <div class="objective-text">${esc(data.objective)}</div>

        ${experienceHtml ? `<h2 class="section">${labels.experience}</h2>${experienceHtml}` : ''}

        ${projectsHtml ? `<h2 class="section">${labels.projects}</h2>${projectsHtml}` : ''}

        ${eduHtml ? `<h2 class="section">${labels.education}</h2>${eduHtml}` : ''}

        ${portfolioLinks.length ? `
        <h2 class="section">${labels.portfolio}</h2>
        <div class="portfolio-intro">${labels.portfolioIntro}</div>
        <div class="portfolio-links">${portfolioLinks.join('')}</div>` : ''}
      </div>
      <div class="col-right">
        ${skillsHtml ? `<h2 class="section">${labels.skills}</h2>${skillsHtml}` : ''}

        ${languagesHtml ? `<h2 class="section">${labels.languages}</h2>${languagesHtml}` : ''}

        ${additionalEducationHtml ? `<h2 class="section">${labels.additionalEducation}</h2>${additionalEducationHtml}` : ''}
      </div>
    </div>
  </div>
</body>
</html>`;
}

module.exports = { renderHtml };

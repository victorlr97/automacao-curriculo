const nodemailer = require('nodemailer');

const OWNER_EMAIL = process.env.OWNER_EMAIL || '';
const APP_BASE_URL = process.env.APP_BASE_URL || 'http://localhost:5175';

// Mesmo transporte, criado uma vez só. gmail_user/gmail_app_password vêm de
// uma senha de app do Gmail (exige verificação em duas etapas já ativa na
// conta) — nunca a senha normal da conta.
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD
  }
});

function esc(str) {
  if (str === undefined || str === null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/** Envia pro dono do app um e-mail avisando de um pedido de acesso novo, com
 * um link pra uma página de confirmação (não age na hora — proteção contra
 * scanners de e-mail que pré-visitam links automaticamente). Falha de envio
 * nunca propaga erro pra quem chamou: é best-effort por design, já que
 * GET /api/admin/access-requests serve de retaguarda dentro do próprio app. */
async function sendAccessRequestEmail({ uid, email, firstName, lastName, dateOfBirth, token }) {
  if (!OWNER_EMAIL) {
    console.error('OWNER_EMAIL não configurado — não foi possível notificar por e-mail.');
    return;
  }
  const confirmUrl = `${APP_BASE_URL}/admin/access-requests/${encodeURIComponent(uid)}?token=${encodeURIComponent(token)}`;
  const fullName = `${firstName} ${lastName}`.trim();

  try {
    await transporter.sendMail({
      from: process.env.GMAIL_USER,
      to: OWNER_EMAIL,
      subject: `Novo pedido de acesso: ${fullName}`,
      html: `
        <p>Alguém pediu acesso ao Gerador de Currículo:</p>
        <ul>
          <li><strong>Nome:</strong> ${esc(fullName)}</li>
          <li><strong>E-mail:</strong> ${esc(email)}</li>
          <li><strong>Data de nascimento:</strong> ${esc(dateOfBirth)}</li>
        </ul>
        <p><a href="${confirmUrl}">Ver pedido e decidir</a></p>
      `
    });
  } catch (err) {
    console.error('Falha ao enviar e-mail de pedido de acesso:', err.message);
  }
}

module.exports = { sendAccessRequestEmail };

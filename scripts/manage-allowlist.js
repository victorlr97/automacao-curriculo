// Gerencia a lista de e-mails autorizados a usar o app (config/allowlist no
// Firestore). Enquanto o motor de IA for a CLI do Claude Code (assinatura
// pessoal, não API paga), o acesso precisa ficar restrito a poucas contas —
// ver ROADMAP.md, Fase 2.
//
// Uso:
//   node scripts/manage-allowlist.js list
//   node scripts/manage-allowlist.js add <email>
//   node scripts/manage-allowlist.js remove <email>

const { db } = require('../server/firebase-admin');

const DOC_REF = db.collection('config').doc('allowlist');

async function main() {
  const [command, emailArg] = process.argv.slice(2);
  const email = emailArg ? emailArg.trim().toLowerCase() : null;

  if (command === 'list') {
    const snap = await DOC_REF.get();
    const emails = snap.exists ? snap.data().emails || [] : [];
    console.log(emails.length ? emails.join('\n') : '(lista vazia)');
    return;
  }

  if (!email) {
    console.error('Uso: node scripts/manage-allowlist.js <list|add|remove> [email]');
    process.exit(1);
  }

  const snap = await DOC_REF.get();
  const emails = snap.exists ? snap.data().emails || [] : [];

  if (command === 'add') {
    if (!emails.includes(email)) emails.push(email);
    await DOC_REF.set({ emails }, { merge: true });
    console.log(`"${email}" adicionado. Lista atual:`);
    console.log(emails.join('\n'));
  } else if (command === 'remove') {
    const updated = emails.filter(e => e !== email);
    await DOC_REF.set({ emails: updated }, { merge: true });
    console.log(`"${email}" removido. Lista atual:`);
    console.log(updated.length ? updated.join('\n') : '(lista vazia)');
  } else {
    console.error('Comando inválido. Use: list, add <email> ou remove <email>.');
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err);
    process.exit(1);
  });

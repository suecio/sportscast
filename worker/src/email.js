// Login emails, sent through Resend (https://resend.com) in the user's language.
// Without RESEND_API_KEY (local development) the link is printed to the console instead.

const TEXT = {
  en: {
    signup: {
      subject: "Choose your SportsCast password",
      intro: "Welcome to SportsCast! Click the button to choose a password and finish creating your account.",
      button: "Choose password",
    },
    reset: {
      subject: "Choose a new SportsCast password",
      intro: "Someone asked to change the password for this email address. Click the button to choose a new one.",
      button: "Choose new password",
    },
    login: {
      subject: "Your SportsCast login link",
      intro: "Click the button to log in to SportsCast.",
      button: "Log in",
    },
    footer: "The link works once and expires in 15 minutes. If you didn't ask for it, you can ignore this email.",
  },
  sv: {
    signup: {
      subject: "Välj ditt lösenord för SportsCast",
      intro: "Välkommen till SportsCast! Klicka på knappen för att välja ett lösenord och skapa ditt konto.",
      button: "Välj lösenord",
    },
    reset: {
      subject: "Välj ett nytt lösenord för SportsCast",
      intro: "Någon bad om att byta lösenord för den här e-postadressen. Klicka på knappen för att välja ett nytt.",
      button: "Välj nytt lösenord",
    },
    login: {
      subject: "Din inloggningslänk till SportsCast",
      intro: "Klicka på knappen för att logga in på SportsCast.",
      button: "Logga in",
    },
    footer: "Länken fungerar en gång och slutar gälla om 15 minuter. Om du inte bad om den kan du strunta i det här mejlet.",
  },
  es: {
    signup: {
      subject: "Elige tu contraseña de SportsCast",
      intro: "¡Bienvenido a SportsCast! Haz clic en el botón para elegir una contraseña y terminar de crear tu cuenta.",
      button: "Elegir contraseña",
    },
    reset: {
      subject: "Elige una nueva contraseña de SportsCast",
      intro: "Alguien pidió cambiar la contraseña de este correo. Haz clic en el botón para elegir una nueva.",
      button: "Elegir nueva contraseña",
    },
    login: {
      subject: "Tu enlace para entrar en SportsCast",
      intro: "Haz clic en el botón para entrar en SportsCast.",
      button: "Entrar",
    },
    footer: "El enlace funciona una sola vez y caduca en 15 minutos. Si no lo pediste, puedes ignorar este correo.",
  },
};

const escapeHtml = (s) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

export async function sendLinkEmail(env, { to, lang, purpose, link }) {
  const t = TEXT[lang] || TEXT.en;
  const m = t[purpose];
  if (!env.RESEND_API_KEY) {
    console.log(`[email] ${purpose} link for ${to}: ${link}`);
    return;
  }
  const html = `<div style="font-family:system-ui,sans-serif;max-width:480px;margin:auto;padding:24px;color:#1a1d24">
<h1 style="font-size:20px">SportsCast</h1>
<p>${escapeHtml(m.intro)}</p>
<p><a href="${escapeHtml(link)}" style="display:inline-block;background:#2563eb;color:#fff;padding:12px 20px;border-radius:6px;text-decoration:none;font-weight:bold">${escapeHtml(m.button)}</a></p>
<p style="color:#6b7280;font-size:13px">${escapeHtml(t.footer)}</p>
</div>`;
  const text = `${m.intro}\n\n${link}\n\n${t.footer}`;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: env.MAIL_FROM, to: [to], subject: m.subject, html, text }),
  });
  if (!res.ok) {
    throw new Error(`Resend error ${res.status}: ${await res.text()}`);
  }
}

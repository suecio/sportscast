// Website text in English, Swedish and Spanish. t('key') gives the text in the chosen
// language, and falls back to English when a key is missing.
import { createContext, useCallback, useContext, useMemo, useState } from 'react';

export const LANGUAGES = [
    { id: 'en', label: 'English' },
    { id: 'sv', label: 'Svenska' },
    { id: 'es', label: 'Español' },
];

const TEXT = {
    en: {
        'nav.login': 'Log in',
        'nav.account': 'Account',
        'nav.scoreboards': 'My scoreboards',
        'nav.controller': 'Scoreboard controller',

        'home.title': 'Stream your match with the live score on the video',
        'home.subtitle': 'Film with your iPhone and keep the score from any phone, tablet or computer. The scoreboard is part of the video, so it shows on YouTube or wherever you stream.',
        'home.live': 'LIVE',
        'home.welcomeBack': 'Welcome back',
        'home.tryController': 'Or try the scoreboard without an account',
        'home.howTitle': 'How it works',
        'home.step1.title': 'Create a scoreboard',
        'home.step1.body': 'Pick the sport and the teams. Each match gets its own scoreboard and code.',
        'home.step2.title': 'Start the stream',
        'home.step2.body': 'Open the SportsCast app on an iPhone, choose the scoreboard and go live to YouTube or your own server.',
        'home.step3.title': 'Keep the score',
        'home.step3.body': 'A helper keeps the score on the website or in the app. The score on the video changes as each point is played.',
        'home.feature.sync.title': 'Score from anywhere',
        'home.feature.sync.body': 'The website and the app stay in sync. One person can film and score, or a helper can score from the bench.',
        'home.feature.youtube.title': 'Works with YouTube',
        'home.feature.youtube.body': 'Stream to your own YouTube channel or to any RTMP server. No extra software or capture card.',
        'home.feature.sports.title': 'Volleyball first',
        'home.feature.sports.body': 'Sets, serve and timeouts for indoor volleyball. Baseball and a basic scoreboard are in, more sports are coming.',
        'home.feature.free.title': 'Free during the beta',
        'home.feature.free.body': 'Up to 5 scoreboards, with team colors and logos included while we are in beta.',
        'home.app.title': 'The iPhone app',
        'home.app.body': 'Film, stream and keep the score from one phone. The app is in testing and comes to the App Store soon.',
        'home.app.soon': 'Coming soon to the',
        'home.footer': 'Made for local clubs, parents and coaches',

        'login.title': 'Log in or sign up',
        'login.intro': 'Type your email. New here? We email you a link to choose a password.',
        'login.email': 'Email',
        'login.password': 'Password',
        'login.withPassword': 'Log in with password',
        'login.sendLink': 'Email me a login link',
        'login.forgot': 'Forgot your password?',
        'login.usePassword': 'I have a password',
        'login.sent.title': 'Check your email',
        'login.sent.body': 'We sent a link to {email}. It works once and expires in 15 minutes. If you are new, the link lets you choose your password.',
        'login.sent.again': 'Use another email',

        'link.loading': 'Checking your link…',
        'link.continue': 'Continue to log in',
        'link.loginTitle': 'Log in to SportsCast',
        'link.signupTitle': 'Choose your password',
        'link.resetTitle': 'Choose a new password',
        'link.passwordFor': 'For {email}',
        'link.newPassword': 'New password (at least 8 characters)',
        'link.repeatPassword': 'Repeat the password',
        'link.save': 'Save and log in',
        'link.expiredHelp': 'Ask for a new link on the login page.',
        'link.toLogin': 'Go to the login page',

        'account.title': 'Account settings',
        'account.email': 'Email',
        'account.since': 'Member since {date}',
        'account.language': 'Language',
        'account.password.title': 'Change password',
        'account.password.current': 'Current password',
        'account.password.new': 'New password (at least 8 characters)',
        'account.password.save': 'Change password',
        'account.password.saved': 'Password changed. Other devices were logged out.',
        'account.sessions.title': 'Devices',
        'account.sessions.logoutOthers': 'Log out on all other devices',
        'account.sessions.done': 'All other devices are logged out.',
        'account.logout': 'Log out',
        'account.billing.title': 'Plan and billing',
        'account.billing.body': 'Free beta: up to 5 scoreboards. Team colors and logos are free during the beta and will be part of a paid plan later.',
        'account.delete.title': 'Delete account',
        'account.delete.body': 'This deletes your account and everything in it. It cannot be undone.',
        'account.delete.password': 'Type your password to confirm',
        'account.delete.button': 'Delete my account',
        'account.delete.confirm': 'Delete your SportsCast account for good?',

        'scoreboards.title': 'My scoreboards',
        'scoreboards.soon': 'Your list of scoreboards comes in the next update. Until then, use the scoreboard controller.',
        'scoreboards.open': 'Open the scoreboard controller',

        'common.loading': 'Loading…',
        'common.passwordsDontMatch': 'The two passwords are not the same.',

        'error.bad_email': 'That email address doesn\'t look right.',
        'error.password_too_short': 'The password must be at least 8 characters.',
        'error.password_too_long': 'The password is too long.',
        'error.wrong_login': 'Wrong email or password.',
        'error.wrong_password': 'The password is wrong.',
        'error.locked': 'Too many wrong passwords. Wait 15 minutes, or log in with an email link.',
        'error.wait_a_minute': 'We just sent you a link. Wait a minute before asking for another.',
        'error.too_many_emails': 'Too many emails. Try again in an hour.',
        'error.link_expired': 'This link has expired or was already used.',
        'error.not_logged_in': 'You are not logged in.',
        'error.network': 'No connection to the server. Check your internet and try again.',
        'error.server_error': 'Something went wrong on our side. Try again.',
    },
    sv: {
        'nav.login': 'Logga in',
        'nav.account': 'Konto',
        'nav.scoreboards': 'Mina resultattavlor',
        'nav.controller': 'Styr resultattavlan',

        'home.title': 'Sänd matchen med resultatet direkt i videon',
        'home.subtitle': 'Filma med din iPhone och för resultatet från valfri mobil, surfplatta eller dator. Resultattavlan är en del av videon, så den syns på YouTube eller var du än sänder.',
        'home.live': 'LIVE',
        'home.welcomeBack': 'Välkommen tillbaka',
        'home.tryController': 'Eller prova resultattavlan utan konto',
        'home.howTitle': 'Så fungerar det',
        'home.step1.title': 'Skapa en resultattavla',
        'home.step1.body': 'Välj sport och lag. Varje match får en egen resultattavla och kod.',
        'home.step2.title': 'Starta sändningen',
        'home.step2.body': 'Öppna SportsCast-appen på en iPhone, välj resultattavlan och sänd live till YouTube eller din egen server.',
        'home.step3.title': 'För resultatet',
        'home.step3.body': 'En medhjälpare för resultatet på webben eller i appen. Resultatet i videon ändras i samma takt som poängen spelas.',
        'home.feature.sync.title': 'För resultatet varifrån som helst',
        'home.feature.sync.body': 'Webben och appen är alltid synkade. En person kan filma och föra resultatet, eller så sköter en medhjälpare det från bänken.',
        'home.feature.youtube.title': 'Fungerar med YouTube',
        'home.feature.youtube.body': 'Sänd till din egen YouTube-kanal eller till valfri RTMP-server. Inga extra program eller kort behövs.',
        'home.feature.sports.title': 'Volleyboll först',
        'home.feature.sports.body': 'Set, serve och timeouts för inomhusvolleyboll. Baseboll och en enkel resultattavla finns, fler sporter kommer.',
        'home.feature.free.title': 'Gratis under betan',
        'home.feature.free.body': 'Upp till 5 resultattavlor, med lagfärger och logotyper som ingår så länge vi är i beta.',
        'home.app.title': 'iPhone-appen',
        'home.app.body': 'Filma, sänd och för resultatet från en och samma mobil. Appen testas just nu och kommer snart till App Store.',
        'home.app.soon': 'Kommer snart till',
        'home.footer': 'Gjord för lokala klubbar, föräldrar och tränare',

        'login.title': 'Logga in eller skapa konto',
        'login.intro': 'Skriv din e-postadress. Ny här? Vi mejlar en länk där du väljer lösenord.',
        'login.email': 'E-post',
        'login.password': 'Lösenord',
        'login.withPassword': 'Logga in med lösenord',
        'login.sendLink': 'Mejla mig en inloggningslänk',
        'login.forgot': 'Glömt lösenordet?',
        'login.usePassword': 'Jag har ett lösenord',
        'login.sent.title': 'Kolla din e-post',
        'login.sent.body': 'Vi skickade en länk till {email}. Den fungerar en gång och slutar gälla om 15 minuter. Om du är ny väljer du ditt lösenord via länken.',
        'login.sent.again': 'Använd en annan e-postadress',

        'link.loading': 'Kontrollerar länken…',
        'link.continue': 'Fortsätt och logga in',
        'link.loginTitle': 'Logga in på SportsCast',
        'link.signupTitle': 'Välj ditt lösenord',
        'link.resetTitle': 'Välj ett nytt lösenord',
        'link.passwordFor': 'För {email}',
        'link.newPassword': 'Nytt lösenord (minst 8 tecken)',
        'link.repeatPassword': 'Upprepa lösenordet',
        'link.save': 'Spara och logga in',
        'link.expiredHelp': 'Be om en ny länk på inloggningssidan.',
        'link.toLogin': 'Till inloggningssidan',

        'account.title': 'Kontoinställningar',
        'account.email': 'E-post',
        'account.since': 'Medlem sedan {date}',
        'account.language': 'Språk',
        'account.password.title': 'Byt lösenord',
        'account.password.current': 'Nuvarande lösenord',
        'account.password.new': 'Nytt lösenord (minst 8 tecken)',
        'account.password.save': 'Byt lösenord',
        'account.password.saved': 'Lösenordet är bytt. Andra enheter loggades ut.',
        'account.sessions.title': 'Enheter',
        'account.sessions.logoutOthers': 'Logga ut på alla andra enheter',
        'account.sessions.done': 'Alla andra enheter är utloggade.',
        'account.logout': 'Logga ut',
        'account.billing.title': 'Plan och betalning',
        'account.billing.body': 'Gratis beta: upp till 5 resultattavlor. Lagfärger och logotyper är gratis under betan och blir en del av en betald plan senare.',
        'account.delete.title': 'Radera konto',
        'account.delete.body': 'Det här raderar ditt konto och allt i det. Det går inte att ångra.',
        'account.delete.password': 'Skriv ditt lösenord för att bekräfta',
        'account.delete.button': 'Radera mitt konto',
        'account.delete.confirm': 'Radera ditt SportsCast-konto för alltid?',

        'scoreboards.title': 'Mina resultattavlor',
        'scoreboards.soon': 'Listan med dina resultattavlor kommer i nästa uppdatering. Använd resultattavlan som vanligt tills dess.',
        'scoreboards.open': 'Öppna resultattavlan',

        'common.loading': 'Laddar…',
        'common.passwordsDontMatch': 'Lösenorden är inte likadana.',

        'error.bad_email': 'E-postadressen ser inte rätt ut.',
        'error.password_too_short': 'Lösenordet måste ha minst 8 tecken.',
        'error.password_too_long': 'Lösenordet är för långt.',
        'error.wrong_login': 'Fel e-post eller lösenord.',
        'error.wrong_password': 'Fel lösenord.',
        'error.locked': 'För många felaktiga lösenord. Vänta 15 minuter, eller logga in med en länk via e-post.',
        'error.wait_a_minute': 'Vi skickade nyss en länk. Vänta en minut innan du ber om en till.',
        'error.too_many_emails': 'För många mejl. Försök igen om en timme.',
        'error.link_expired': 'Länken har slutat gälla eller har redan använts.',
        'error.not_logged_in': 'Du är inte inloggad.',
        'error.network': 'Ingen kontakt med servern. Kontrollera internet och försök igen.',
        'error.server_error': 'Något gick fel hos oss. Försök igen.',
    },
    es: {
        'nav.login': 'Entrar',
        'nav.account': 'Cuenta',
        'nav.scoreboards': 'Mis marcadores',
        'nav.controller': 'Controlar el marcador',

        'home.title': 'Transmite tu partido con el marcador en vivo en el video',
        'home.subtitle': 'Graba con tu iPhone y lleva el marcador desde cualquier móvil, tableta u ordenador. El marcador es parte del video, así que se ve en YouTube o donde transmitas.',
        'home.live': 'EN VIVO',
        'home.welcomeBack': 'Bienvenido de nuevo',
        'home.tryController': 'O prueba el marcador sin cuenta',
        'home.howTitle': 'Cómo funciona',
        'home.step1.title': 'Crea un marcador',
        'home.step1.body': 'Elige el deporte y los equipos. Cada partido tiene su propio marcador y código.',
        'home.step2.title': 'Empieza la transmisión',
        'home.step2.body': 'Abre la app SportsCast en un iPhone, elige el marcador y transmite en vivo a YouTube o a tu propio servidor.',
        'home.step3.title': 'Lleva el marcador',
        'home.step3.body': 'Un ayudante lleva el marcador en la web o en la app. El marcador del video cambia al ritmo de cada punto.',
        'home.feature.sync.title': 'Marca desde donde quieras',
        'home.feature.sync.body': 'La web y la app están siempre sincronizadas. Una persona puede grabar y marcar, o un ayudante puede marcar desde el banquillo.',
        'home.feature.youtube.title': 'Funciona con YouTube',
        'home.feature.youtube.body': 'Transmite a tu propio canal de YouTube o a cualquier servidor RTMP. Sin programas ni equipos extra.',
        'home.feature.sports.title': 'Primero el voleibol',
        'home.feature.sports.body': 'Sets, saque y tiempos muertos para voleibol de pista. También béisbol y un marcador básico, y vienen más deportes.',
        'home.feature.free.title': 'Gratis durante la beta',
        'home.feature.free.body': 'Hasta 5 marcadores, con colores y logos de los equipos incluidos mientras estemos en beta.',
        'home.app.title': 'La app para iPhone',
        'home.app.body': 'Graba, transmite y lleva el marcador desde un solo móvil. La app está en pruebas y llegará pronto a la App Store.',
        'home.app.soon': 'Muy pronto en la',
        'home.footer': 'Hecho para clubes locales, padres y entrenadores',

        'login.title': 'Entrar o crear cuenta',
        'login.intro': 'Escribe tu correo. ¿Eres nuevo? Te enviamos un enlace para elegir una contraseña.',
        'login.email': 'Correo electrónico',
        'login.password': 'Contraseña',
        'login.withPassword': 'Entrar con contraseña',
        'login.sendLink': 'Envíame un enlace para entrar',
        'login.forgot': '¿Olvidaste tu contraseña?',
        'login.usePassword': 'Tengo una contraseña',
        'login.sent.title': 'Revisa tu correo',
        'login.sent.body': 'Enviamos un enlace a {email}. Funciona una sola vez y caduca en 15 minutos. Si eres nuevo, con el enlace eliges tu contraseña.',
        'login.sent.again': 'Usar otro correo',

        'link.loading': 'Comprobando el enlace…',
        'link.continue': 'Continuar y entrar',
        'link.loginTitle': 'Entrar en SportsCast',
        'link.signupTitle': 'Elige tu contraseña',
        'link.resetTitle': 'Elige una nueva contraseña',
        'link.passwordFor': 'Para {email}',
        'link.newPassword': 'Nueva contraseña (mínimo 8 caracteres)',
        'link.repeatPassword': 'Repite la contraseña',
        'link.save': 'Guardar y entrar',
        'link.expiredHelp': 'Pide un enlace nuevo en la página de entrada.',
        'link.toLogin': 'Ir a la página de entrada',

        'account.title': 'Ajustes de la cuenta',
        'account.email': 'Correo electrónico',
        'account.since': 'Miembro desde {date}',
        'account.language': 'Idioma',
        'account.password.title': 'Cambiar contraseña',
        'account.password.current': 'Contraseña actual',
        'account.password.new': 'Nueva contraseña (mínimo 8 caracteres)',
        'account.password.save': 'Cambiar contraseña',
        'account.password.saved': 'Contraseña cambiada. Se cerró la sesión en los otros dispositivos.',
        'account.sessions.title': 'Dispositivos',
        'account.sessions.logoutOthers': 'Cerrar sesión en todos los otros dispositivos',
        'account.sessions.done': 'Se cerró la sesión en todos los otros dispositivos.',
        'account.logout': 'Cerrar sesión',
        'account.billing.title': 'Plan y pagos',
        'account.billing.body': 'Beta gratis: hasta 5 marcadores. Los colores y logos de los equipos son gratis durante la beta y luego serán parte de un plan de pago.',
        'account.delete.title': 'Borrar cuenta',
        'account.delete.body': 'Esto borra tu cuenta y todo lo que contiene. No se puede deshacer.',
        'account.delete.password': 'Escribe tu contraseña para confirmar',
        'account.delete.button': 'Borrar mi cuenta',
        'account.delete.confirm': '¿Borrar tu cuenta de SportsCast para siempre?',

        'scoreboards.title': 'Mis marcadores',
        'scoreboards.soon': 'La lista de tus marcadores llega en la próxima actualización. Mientras tanto, usa el control del marcador.',
        'scoreboards.open': 'Abrir el control del marcador',

        'common.loading': 'Cargando…',
        'common.passwordsDontMatch': 'Las dos contraseñas no son iguales.',

        'error.bad_email': 'Ese correo no parece correcto.',
        'error.password_too_short': 'La contraseña debe tener al menos 8 caracteres.',
        'error.password_too_long': 'La contraseña es demasiado larga.',
        'error.wrong_login': 'Correo o contraseña incorrectos.',
        'error.wrong_password': 'La contraseña es incorrecta.',
        'error.locked': 'Demasiadas contraseñas incorrectas. Espera 15 minutos o entra con un enlace por correo.',
        'error.wait_a_minute': 'Acabamos de enviarte un enlace. Espera un minuto antes de pedir otro.',
        'error.too_many_emails': 'Demasiados correos. Inténtalo de nuevo en una hora.',
        'error.link_expired': 'Este enlace caducó o ya se usó.',
        'error.not_logged_in': 'No has iniciado sesión.',
        'error.network': 'No hay conexión con el servidor. Revisa tu internet e inténtalo de nuevo.',
        'error.server_error': 'Algo salió mal de nuestro lado. Inténtalo de nuevo.',
    },
};

const STORAGE_KEY = 'sportscast.lang';

function initialLang() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (TEXT[saved]) return saved;
    } catch {}
    const browser = (navigator.language || 'en').slice(0, 2).toLowerCase();
    return TEXT[browser] ? browser : 'en';
}

const I18nContext = createContext(null);

export function I18nProvider({ children }) {
    const [lang, setLangState] = useState(initialLang);
    const setLang = useCallback((next) => {
        if (!TEXT[next]) return;
        setLangState(next);
        try { localStorage.setItem(STORAGE_KEY, next); } catch {}
        document.documentElement.lang = next;
    }, []);
    const t = useCallback((key, vars = {}) => {
        const text = TEXT[lang][key] ?? TEXT.en[key] ?? key;
        return text.replace(/\{(\w+)\}/g, (_, name) => vars[name] ?? '');
    }, [lang]);
    const errorText = useCallback((err) => {
        const key = `error.${err?.message}`;
        return TEXT.en[key] ? t(key) : t('error.server_error');
    }, [t]);
    const value = useMemo(() => ({ lang, setLang, t, errorText }), [lang, setLang, t, errorText]);
    return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export const useI18n = () => useContext(I18nContext);

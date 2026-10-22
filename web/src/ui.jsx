// Shared look for the account pages, matching the scoreboard controller's colors.
import { LANGUAGES, useI18n } from './i18n.jsx';
import { useAuth } from './auth.jsx';
import { Link } from './router.jsx';
import { api } from './api.js';
import { siteKind } from './links.js';

export function LanguageSelect({ className = '' }) {
    const { lang, setLang } = useI18n();
    const { user } = useAuth();
    const change = (next) => {
        setLang(next);
        if (user) api('account/language', { lang: next }).catch(() => {});
    };
    return (
        <select value={lang} onChange={(e) => change(e.target.value)} aria-label="Language"
            className={`bg-[#15171d] border border-[#323844] rounded-md px-2 py-1.5 text-white text-sm ${className}`}>
            {LANGUAGES.map(l => <option key={l.id} value={l.id}>{l.label}</option>)}
        </select>
    );
}

// Links for the logged-in user (or Log in), and the language. Shown on every page.
export function AccountNav() {
    const { t } = useI18n();
    const { user } = useAuth();
    // The scorer. and scoreboard. sites have no accounts: only the language there.
    if (siteKind() !== 'main') return <LanguageSelect />;
    return (
        <nav className="flex items-center gap-4 text-sm font-semibold">
            {user && <Link to="/scoreboards" className="text-gray-300 hover:text-white">{t('nav.scoreboards')}</Link>}
            {user && <Link to="/account" className="text-gray-300 hover:text-white">{t('nav.account')}</Link>}
            {user === null && <Link to="/login" className="text-gray-300 hover:text-white">{t('nav.login')}</Link>}
            <LanguageSelect />
        </nav>
    );
}

export function Page({ children, wide = false, full = false }) {
    return (
        <div className={`min-h-screen text-gray-200 font-sans ${full ? '' : 'pb-20'}`}>
            <header className="bg-[#22262f] border-b border-[#323844] p-4 flex flex-wrap gap-3 justify-between items-center">
                <Link to="/" className="text-xl font-bold text-white tracking-tight">SportsCast<span className="text-blue-500">Web</span></Link>
                <AccountNav />
            </header>
            {full
                ? <main>{children}</main>
                : <main className={`${wide ? 'max-w-3xl' : 'max-w-md'} mx-auto p-4 md:p-6 space-y-6`}>{children}</main>}
        </div>
    );
}

export function Card({ title, children }) {
    return (
        <section className="bg-[#22262f] border border-[#323844] rounded-lg p-6 space-y-4">
            {title && <h2 className="text-lg font-bold text-white">{title}</h2>}
            {children}
        </section>
    );
}

export function Field({ label, ...props }) {
    return (
        <label className="block">
            <span className="block text-sm font-semibold text-gray-400 mb-1.5">{label}</span>
            <input {...props} className="w-full bg-[#15171d] border border-[#323844] rounded p-2.5 text-white focus:outline-none focus:border-blue-500 transition" />
        </label>
    );
}

export function Button({ variant = 'primary', className = '', ...props }) {
    const look = {
        primary: 'bg-blue-600 hover:bg-blue-500 text-white',
        outline: 'border border-[#4a4f5c] text-gray-200 hover:bg-[#3f434e]',
        danger: 'bg-red-600 hover:bg-red-500 text-white',
        link: 'text-blue-400 hover:text-blue-300 underline px-0 py-0',
    }[variant];
    return <button {...props} className={`${variant === 'link' ? '' : 'w-full py-2.5 rounded'} text-sm font-bold transition active:scale-95 disabled:opacity-50 ${look} ${className}`} />;
}

export function Message({ kind = 'error', children }) {
    if (!children) return null;
    const look = kind === 'error' ? 'bg-red-950 border-red-800 text-red-200' : 'bg-green-950 border-green-800 text-green-200';
    return <p role={kind === 'error' ? 'alert' : 'status'} className={`border rounded p-3 text-sm ${look}`}>{children}</p>;
}

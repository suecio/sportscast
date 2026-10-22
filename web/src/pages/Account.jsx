// Account settings: language, password, devices, plan, delete account.
import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { useI18n } from '../i18n.jsx';
import { navigate } from '../router.jsx';
import { Button, Card, Field, LanguageSelect, Message, Page } from '../ui.jsx';

export default function Account() {
    const { t, lang, errorText } = useI18n();
    const { user, setUser } = useAuth();

    useEffect(() => { if (user === null) navigate('/login'); }, [user]);
    if (!user) return <Page><p className="text-gray-400">{t('common.loading')}</p></Page>;

    const since = new Date(user.createdAt).toLocaleDateString(lang);

    const logOut = async () => {
        await api('auth/logout', {}).catch(() => {});
        setUser(null);
        navigate('/login');
    };

    return (
        <Page wide>
            <h1 className="text-2xl font-bold text-white">{t('account.title')}</h1>

            <Card>
                <div>
                    <div className="text-sm font-semibold text-gray-400">{t('account.email')}</div>
                    <div className="text-white font-mono">{user.email}</div>
                    <div className="text-xs text-gray-500 mt-1">{t('account.since', { date: since })}</div>
                </div>
                <label className="block">
                    <span className="block text-sm font-semibold text-gray-400 mb-1.5">{t('account.language')}</span>
                    <LanguageSelect className="w-full p-2.5" />
                </label>
            </Card>

            <ChangePassword t={t} errorText={errorText} />

            <Card title={t('account.sessions.title')}>
                <Devices t={t} errorText={errorText} />
                <Button variant="outline" onClick={logOut}>{t('account.logout')}</Button>
            </Card>

            <Card title={t('account.billing.title')}>
                <p className="text-sm text-gray-300">{t('account.billing.body')}</p>
            </Card>

            <DeleteAccount t={t} errorText={errorText} onDeleted={() => { setUser(null); navigate('/login'); }} />
        </Page>
    );
}

function useAction(errorText) {
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [done, setDone] = useState('');
    const run = async (work, doneText = '') => {
        setBusy(true); setError(''); setDone('');
        try { await work(); setDone(doneText); } catch (err) { setError(errorText(err)); } finally { setBusy(false); }
    };
    return { busy, error, done, run, setError };
}

function ChangePassword({ t, errorText }) {
    const [current, setCurrent] = useState('');
    const [next, setNext] = useState('');
    const { busy, error, done, run } = useAction(errorText);
    const save = (e) => {
        e.preventDefault();
        run(async () => {
            await api('account/password', { current, password: next });
            setCurrent(''); setNext('');
        }, t('account.password.saved'));
    };
    return (
        <Card title={t('account.password.title')}>
            <form onSubmit={save} className="space-y-4">
                <Field label={t('account.password.current')} type="password" autoComplete="current-password" required value={current} onChange={(e) => setCurrent(e.target.value)} />
                <Field label={t('account.password.new')} type="password" autoComplete="new-password" minLength={8} required value={next} onChange={(e) => setNext(e.target.value)} />
                <Message>{error}</Message>
                <Message kind="ok">{done}</Message>
                <Button type="submit" disabled={busy}>{t('account.password.save')}</Button>
            </form>
        </Card>
    );
}

function Devices({ t, errorText }) {
    const { busy, error, done, run } = useAction(errorText);
    return (
        <>
            <Message>{error}</Message>
            <Message kind="ok">{done}</Message>
            <Button variant="outline" disabled={busy} onClick={() => run(() => api('account/logout-others', {}), t('account.sessions.done'))}>
                {t('account.sessions.logoutOthers')}
            </Button>
        </>
    );
}

function DeleteAccount({ t, errorText, onDeleted }) {
    const [password, setPassword] = useState('');
    const { busy, error, run } = useAction(errorText);
    const remove = (e) => {
        e.preventDefault();
        if (!confirm(t('account.delete.confirm'))) return;
        run(async () => {
            await api('account/delete', { password });
            onDeleted();
        });
    };
    return (
        <section className="bg-[#22262f] border border-red-900 rounded-lg p-6 space-y-4">
            <h2 className="text-lg font-bold text-red-300">{t('account.delete.title')}</h2>
            <p className="text-sm text-gray-300">{t('account.delete.body')}</p>
            <form onSubmit={remove} className="space-y-4">
                <Field label={t('account.delete.password')} type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
                <Message>{error}</Message>
                <Button type="submit" variant="danger" disabled={busy}>{t('account.delete.button')}</Button>
            </form>
        </section>
    );
}

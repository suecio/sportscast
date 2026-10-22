// Log in or sign up. One email field; then a password, or an emailed link.
// A new email address always gets a link to choose a password, which is how sign up works.
import { useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { useI18n } from '../i18n.jsx';
import { navigate } from '../router.jsx';
import { Button, Card, Field, Message, Page } from '../ui.jsx';

export default function Login() {
    return (
        <Page>
            <LoginForm />
        </Page>
    );
}

// The login card, also shown on the front page.
export function LoginForm() {
    const { t, lang, errorText } = useI18n();
    const { refresh } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [sentTo, setSentTo] = useState(null);
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);

    const run = async (work) => {
        setError('');
        setBusy(true);
        try { await work(); } catch (err) { setError(errorText(err)); } finally { setBusy(false); }
    };

    const sendLink = (purpose) => run(async () => {
        await api('auth/email-link', { email, lang, purpose });
        setSentTo(email);
    });

    const logIn = (e) => {
        e.preventDefault();
        if (!showPassword) return sendLink('login');
        run(async () => {
            await api('auth/login', { email, password });
            await refresh();
            navigate('/scoreboards');
        });
    };

    if (sentTo) {
        return (
            <Card title={t('login.sent.title')}>
                <p className="text-gray-300">{t('login.sent.body', { email: sentTo })}</p>
                <Button variant="outline" onClick={() => { setSentTo(null); setPassword(''); }}>{t('login.sent.again')}</Button>
            </Card>
        );
    }

    return (
        <Card title={t('login.title')}>
            <p className="text-sm text-gray-400">{t('login.intro')}</p>
            <form onSubmit={logIn} className="space-y-4">
                <Field label={t('login.email')} type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                {showPassword && (
                    <Field label={t('login.password')} type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
                )}
                <Message>{error}</Message>
                {showPassword ? (
                    <>
                        <Button type="submit" disabled={busy}>{t('login.withPassword')}</Button>
                        <Button type="button" variant="outline" disabled={busy || !email} onClick={() => sendLink('login')}>{t('login.sendLink')}</Button>
                        <Button type="button" variant="link" disabled={busy || !email} onClick={() => sendLink('reset')}>{t('login.forgot')}</Button>
                    </>
                ) : (
                    <>
                        <Button type="submit" disabled={busy}>{t('login.sendLink')}</Button>
                        <Button type="button" variant="outline" onClick={() => setShowPassword(true)}>{t('login.usePassword')}</Button>
                    </>
                )}
            </form>
        </Card>
    );
}

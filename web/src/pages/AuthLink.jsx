// The page an emailed link opens (/auth?token=...). It asks for a click before using
// the link, because some email programs open links on their own to scan them, and
// that would use up a login link before the person clicks it.
import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { useI18n } from '../i18n.jsx';
import { Link, navigate } from '../router.jsx';
import { Button, Card, Field, Message, Page } from '../ui.jsx';

export default function AuthLink() {
    const { t, errorText } = useI18n();
    const { refresh } = useAuth();
    const token = new URLSearchParams(window.location.search).get('token') || '';
    // null = not checked yet; { needPassword, purpose, email } once checked
    const [link, setLink] = useState(null);
    const [password, setPassword] = useState('');
    const [repeat, setRepeat] = useState('');
    const [error, setError] = useState('');
    const [expired, setExpired] = useState(false);
    const [busy, setBusy] = useState(false);

    const finish = async (body) => {
        setError('');
        setBusy(true);
        try {
            const result = await api('auth/link', body);
            if (result.needPassword) {
                setLink(result);
            } else {
                await refresh();
                navigate('/scoreboards');
            }
        } catch (err) {
            if (err.message === 'link_expired') setExpired(true);
            else setError(errorText(err));
        } finally {
            setBusy(false);
        }
    };

    // A signup or reset link is only checked here, not used: it is used when the password is saved.
    useEffect(() => { if (!token) setExpired(true); }, [token]);

    if (expired) {
        return (
            <Page>
                <Card title={t('error.link_expired')}>
                    <p className="text-gray-300">{t('link.expiredHelp')}</p>
                    <Link to="/login" className="block text-center w-full py-2.5 rounded text-sm font-bold bg-blue-600 hover:bg-blue-500 text-white">{t('link.toLogin')}</Link>
                </Card>
            </Page>
        );
    }

    if (link?.needPassword) {
        const save = (e) => {
            e.preventDefault();
            if (password !== repeat) return setError(t('common.passwordsDontMatch'));
            finish({ token, password });
        };
        return (
            <Page>
                <Card title={t(link.purpose === 'reset' ? 'link.resetTitle' : 'link.signupTitle')}>
                    <p className="text-sm text-gray-400">{t('link.passwordFor', { email: link.email })}</p>
                    <form onSubmit={save} className="space-y-4">
                        {/* Lets password managers save the new password under the right email. */}
                        <input type="email" autoComplete="username" value={link.email} readOnly hidden />
                        <Field label={t('link.newPassword')} type="password" autoComplete="new-password" minLength={8} required value={password} onChange={(e) => setPassword(e.target.value)} />
                        <Field label={t('link.repeatPassword')} type="password" autoComplete="new-password" minLength={8} required value={repeat} onChange={(e) => setRepeat(e.target.value)} />
                        <Message>{error}</Message>
                        <Button type="submit" disabled={busy}>{t('link.save')}</Button>
                    </form>
                </Card>
            </Page>
        );
    }

    return (
        <Page>
            <Card title={t('link.loginTitle')}>
                <Message>{error}</Message>
                <Button disabled={busy} onClick={() => finish({ token })}>{busy ? t('link.loading') : t('link.continue')}</Button>
            </Card>
        </Page>
    );
}

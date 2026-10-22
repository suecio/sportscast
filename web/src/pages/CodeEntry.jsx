// "Type the code" page: scorer.sportscast.cc (opens the score buttons) and
// scoreboard.sportscast.cc (opens the score graphic), or /scorer and /board here.
import { useState } from 'react';
import { api } from '../api.js';
import { useI18n } from '../i18n.jsx';
import { navigate } from '../router.jsx';
import { mainSiteLink, siteKind } from '../links.js';
import { Button, Card, Field, Message, Page } from '../ui.jsx';

export default function CodeEntry({ kind }) {
    const { t, errorText } = useI18n();
    const [code, setCode] = useState('');
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);

    const open = async (e) => {
        e.preventDefault();
        const clean = code.trim().toUpperCase().replace(/\s+/g, '-');
        setBusy(true); setError('');
        try {
            const info = await api(`code/${encodeURIComponent(clean)}`);
            if (kind === 'scorer' && info.access !== 'write') throw new Error('not_scorer_code');
            const onOwnSite = siteKind() !== 'main';
            if (kind === 'scorer') navigate(onOwnSite ? `/${clean}` : `/score?room=${clean}`);
            else navigate(onOwnSite ? `/${clean}` : `/board/${clean}`);
        } catch (err) {
            setError(errorText(err));
        } finally {
            setBusy(false);
        }
    };

    return (
        <Page>
            <Card title={t(kind === 'scorer' ? 'code.scorerTitle' : 'code.displayTitle')}>
                <p className="text-sm text-gray-400">{t(kind === 'scorer' ? 'code.scorerIntro' : 'code.displayIntro')}</p>
                <form onSubmit={open} className="space-y-4">
                    <Field label={t('code.label')} required autoFocus autoCapitalize="characters" autoComplete="off" value={code} onChange={(e) => setCode(e.target.value)} />
                    <Message>{error}</Message>
                    <Button type="submit" disabled={busy}>{t('code.open')}</Button>
                </form>
            </Card>
            <p className="text-sm text-gray-400 text-center">
                {t('code.noCode')}{' '}
                <a href={mainSiteLink('/')} className="text-blue-400 hover:text-blue-300 underline">{t('code.home')}</a>
                {' · '}
                <a href={mainSiteLink('/scoreboards')} className="text-blue-400 hover:text-blue-300 underline">{t('nav.scoreboards')}</a>
            </p>
        </Page>
    );
}

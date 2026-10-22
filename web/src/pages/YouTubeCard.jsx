// YouTube on the scoreboard page: connect a channel with Google sign-in, create a live
// stream for this match, and show the server address and stream key for the app.
import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { useI18n } from '../i18n.jsx';
import { Link } from '../router.jsx';
import { copyText } from '../links.js';
import { Button, Card, Field, Message } from '../ui.jsx';

// The value for <input type="datetime-local">, in the browser's time zone.
function localInputValue(ms) {
    const d = new Date(ms - new Date(ms).getTimezoneOffset() * 60_000);
    return d.toISOString().slice(0, 16);
}

// The result Google's sign-in sent back in the address (?youtube=...), shown once.
function takeConnectResult() {
    const params = new URLSearchParams(window.location.search);
    const result = params.get('youtube');
    if (result) window.history.replaceState(null, '', window.location.pathname);
    return result;
}

const selectClass = 'w-full bg-[#15171d] border border-[#323844] rounded p-2.5 text-white';

export default function YouTubeCard({ board }) {
    const { t, errorText } = useI18n();
    const [account, setAccount] = useState(null);
    const [stream, setStream] = useState(undefined);
    const [result] = useState(takeConnectResult);
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    const [form, setForm] = useState({ title: board.title, startAt: localInputValue(Date.now() + 15 * 60_000), privacy: 'public' });

    useEffect(() => {
        api('youtube').then(setAccount).catch((err) => setError(errorText(err)));
        api(`boards/${board.id}/youtube`).then(({ stream }) => setStream(stream)).catch((err) => setError(errorText(err)));
    }, [board.id, errorText]);

    const run = async (work) => {
        setBusy(true); setError('');
        try { await work(); } catch (err) { setError(errorText(err)); } finally { setBusy(false); }
    };

    const create = (e) => {
        e.preventDefault();
        run(async () => {
            const { stream } = await api(`boards/${board.id}/youtube`, { ...form, startAt: new Date(form.startAt).toISOString() });
            setStream(stream);
        });
    };
    const remove = () => {
        if (!confirm(t('youtube.removeConfirm'))) return;
        run(async () => { await api(`boards/${board.id}/youtube/delete`, {}); setStream(null); });
    };
    const disconnect = () => {
        if (!confirm(t('youtube.disconnectConfirm'))) return;
        run(async () => { await api('youtube/disconnect', {}); setAccount({ ...account, connected: false }); });
    };

    if (!account || stream === undefined) return <Card title="YouTube"><Message>{error}</Message>{!error && <p className="text-gray-400">{t('common.loading')}</p>}</Card>;
    if (!account.configured) return <Card title="YouTube"><p className="text-sm text-gray-400">{t('youtube.notConfigured')}</p></Card>;

    const resultText = result && (result === 'connected' ? '' : t(`youtube.result.${result}`));
    const connectHref = `/api/youtube/connect?board=${encodeURIComponent(board.id)}`;

    return (
        <Card title="YouTube">
            {result === 'connected' && <Message kind="ok">{t('youtube.result.connected')}</Message>}
            <Message>{resultText}</Message>
            <Message>{error}</Message>

            {stream ? (
                <StreamInfo stream={stream} busy={busy} onRemove={remove} />
            ) : !account.connected ? (
                <div className="space-y-3">
                    <p className="text-sm text-gray-400">{t('youtube.connectHelp')}</p>
                    <a href={connectHref} className="block text-center w-full py-2.5 rounded text-sm font-bold bg-red-600 hover:bg-red-500 text-white">{t('youtube.connect')}</a>
                    <p className="text-xs text-gray-500">
                        {t('youtube.agree')} <Link to="/terms" className="underline">{t('legal.terms')}</Link> · <Link to="/privacy" className="underline">{t('legal.privacy')}</Link>
                    </p>
                </div>
            ) : (
                <form onSubmit={create} className="space-y-4">
                    <p className="text-sm text-gray-400">{t('youtube.createHelp', { channel: account.channelTitle })}</p>
                    <Field label={t('youtube.title')} required maxLength={100} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
                    <div className="grid gap-4 sm:grid-cols-2">
                        <Field label={t('youtube.startAt')} type="datetime-local" required value={form.startAt} onChange={(e) => setForm({ ...form, startAt: e.target.value })} />
                        <label className="block">
                            <span className="block text-sm font-semibold text-gray-400 mb-1.5">{t('youtube.privacy')}</span>
                            <select value={form.privacy} onChange={(e) => setForm({ ...form, privacy: e.target.value })} className={selectClass}>
                                {['public', 'unlisted', 'private'].map((p) => <option key={p} value={p}>{t(`youtube.privacy.${p}`)}</option>)}
                            </select>
                        </label>
                    </div>
                    <Button type="submit" disabled={busy}>{busy ? t('common.loading') : t('youtube.create')}</Button>
                </form>
            )}

            {account.connected && (
                <p className="text-xs text-gray-500">
                    {t('youtube.connectedAs', { channel: account.channelTitle })}{' '}
                    <button type="button" onClick={disconnect} className="underline hover:text-gray-300">{t('youtube.disconnect')}</button>
                </p>
            )}
        </Card>
    );
}

function StreamInfo({ stream, busy, onRemove }) {
    const { t } = useI18n();
    const [showKey, setShowKey] = useState(false);
    const when = new Date(stream.scheduledAt).toLocaleString();
    return (
        <div className="space-y-4">
            <div>
                <div className="text-white font-semibold">{stream.title}</div>
                <div className="text-sm text-gray-400">{when} · {t(`youtube.privacy.${stream.privacy}`)}</div>
                <div className="flex flex-wrap gap-4 text-sm mt-1">
                    <a href={stream.watchUrl} target="_blank" rel="noreferrer" className="text-blue-400 hover:text-blue-300 underline">{t('youtube.watch')}</a>
                    <a href={stream.studioUrl} target="_blank" rel="noreferrer" className="text-blue-400 hover:text-blue-300 underline">{t('youtube.studio')}</a>
                </div>
            </div>
            <CopyRow label={t('youtube.serverUrl')} value={stream.serverUrl} />
            <CopyRow label={t('youtube.streamKey')} value={stream.streamKey} hidden={!showKey} onShow={() => setShowKey(true)} />
            <p className="text-sm text-gray-400">{t('youtube.appHelp')}</p>
            <p className="text-xs text-yellow-300">{t('youtube.keySecret')}</p>
            <Button variant="outline" disabled={busy} onClick={onRemove}>{t('youtube.remove')}</Button>
        </div>
    );
}

function CopyRow({ label, value, hidden = false, onShow }) {
    const { t } = useI18n();
    const [copied, setCopied] = useState(false);
    const copy = async () => {
        if (await copyText(value)) { setCopied(true); setTimeout(() => setCopied(false), 1500); }
    };
    const small = 'px-3 py-1.5 rounded text-sm font-bold border border-[#4a4f5c] text-gray-200 hover:bg-[#3f434e]';
    return (
        <div className="space-y-1.5">
            <div className="text-sm font-semibold text-gray-400">{label}</div>
            <input readOnly value={hidden ? '•'.repeat(16) : value} onFocus={(e) => !hidden && e.target.select()}
                className="w-full bg-[#15171d] border border-[#323844] rounded p-2.5 text-white font-mono text-sm" />
            <div className="flex gap-2">
                <button type="button" onClick={copy} className={small}>{copied ? t('board.copied') : t('board.copy')}</button>
                {hidden && <button type="button" onClick={onShow} className={small}>{t('youtube.showKey')}</button>}
            </div>
        </div>
    );
}

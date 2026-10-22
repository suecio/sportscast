// One scoreboard's admin page: title, sport, codes, private, links to share, delete.
import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { useI18n } from '../i18n.jsx';
import { Link, navigate } from '../router.jsx';
import { copyText, displayLink, embedCode, reportLink, scorerLink } from '../links.js';
import { Button, Card, Field, Message, Page } from '../ui.jsx';
import MatchFormat from './MatchFormat.jsx';
import YouTubeCard from './YouTubeCard.jsx';
import { SportSelect } from './Scoreboards.jsx';
import { DisplayThumb, EmbedThumb, ScorerThumb } from './SharePreviews.jsx';

export default function BoardAdmin({ id }) {
    const { t, errorText } = useI18n();
    const { user } = useAuth();
    const [board, setBoard] = useState(null);
    const [form, setForm] = useState(null);
    const [error, setError] = useState('');
    const [saved, setSaved] = useState('');
    const [busy, setBusy] = useState(false);

    useEffect(() => { if (user === null) navigate('/login'); }, [user]);
    useEffect(() => {
        if (!user) return;
        api(`boards/${id}`).then(({ board }) => { setBoard(board); setForm(board); }).catch((err) => setError(errorText(err)));
    }, [user, id, errorText]);

    if (!board) return <Page wide><Message>{error}</Message>{!error && <p className="text-gray-400">{t('common.loading')}</p>}</Page>;

    const update = async (changes, doneText = t('board.saved')) => {
        setBusy(true); setError(''); setSaved('');
        try {
            const { board: next } = await api(`boards/${id}`, changes);
            setBoard(next); setForm(next); setSaved(doneText);
        } catch (err) {
            setError(errorText(err));
        } finally {
            setBusy(false);
        }
    };

    const save = (e) => {
        e.preventDefault();
        update({ title: form.title, sport: form.sport, scorerCode: form.scorerCode, displayCode: form.displayCode });
    };

    const remove = async () => {
        if (!confirm(t('boards.deleteConfirm', { title: board.title }))) return;
        try {
            await api(`boards/${id}/delete`, {});
            navigate('/scoreboards');
        } catch (err) {
            setError(errorText(err));
        }
    };

    const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

    return (
        <Page wide>
            <Link to="/scoreboards" className="text-sm text-gray-400 hover:text-white">← {t('nav.scoreboards')}</Link>
            <div className="flex flex-wrap gap-3 items-center justify-between">
                <h1 className="text-2xl font-bold text-white">{board.title}</h1>
                <a href={scorerLink(board.scorerCode)} className="px-4 py-2 rounded text-sm font-bold bg-blue-600 hover:bg-blue-500 text-white">{t('board.openScorer')}</a>
            </div>
            <Message>{error}</Message>
            <Message kind="ok">{saved}</Message>

            <Card title={t('board.settings')}>
                <form onSubmit={save} className="space-y-4">
                    <Field label={t('board.title')} required maxLength={80} value={form.title} onChange={set('title')} />
                    <SportSelect value={form.sport} onChange={(sport) => setForm({ ...form, sport })} />
                    <div>
                        <Field label={t('board.scorerCode')} required minLength={6} maxLength={24} value={form.scorerCode} onChange={set('scorerCode')} />
                        <p className="text-xs text-gray-500 mt-1">{t('board.scorerCodeHelp')}</p>
                    </div>
                    <div>
                        <Field label={t('board.displayCode')} required minLength={4} maxLength={24} value={form.displayCode} onChange={set('displayCode')} />
                        <p className="text-xs text-gray-500 mt-1">{t('board.displayCodeHelp')}</p>
                    </div>
                    <Button type="submit" disabled={busy}>{t('board.save')}</Button>
                </form>
            </Card>

            {board.sport === 'volleyball' && (
                <MatchFormat key={JSON.stringify(board.format)} format={board.format} busy={busy}
                    onSave={(format) => update({ format }, t('format.saved'))} />
            )}

            <YouTubeCard board={board} />

            <Card title={t('board.privacy')}>
                <label className="flex items-start gap-3 cursor-pointer">
                    <input type="checkbox" className="mt-1 w-5 h-5" checked={board.private} disabled={busy}
                        onChange={(e) => update({ private: e.target.checked })} />
                    <span>
                        <span className="block text-white font-semibold">{t('board.private')}</span>
                        <span className="block text-sm text-gray-400">{t('board.privateHelp')}</span>
                    </span>
                </label>
            </Card>

            <Card title={t('board.share')}>
                <ShareRow label={t('board.scorerLink')} help={t('board.scorerLinkHelp')} value={scorerLink(board.scorerCode)}
                    preview={<ScorerThumb caption={t('board.thumbScorer')} href={scorerLink(board.scorerCode)} />}
                    onNew={() => confirm(t('board.newCodeConfirm')) && update({ scorerCode: 'new' }, t('board.newCodeDone'))} />
                {board.private ? (
                    <p className="text-sm text-yellow-300">{t('board.privateNoDisplay')}</p>
                ) : (
                    <>
                        <ShareRow label={t('board.displayLink')} help={t('board.displayLinkHelp')} value={displayLink(board.displayCode)}
                            preview={<DisplayThumb caption={t('board.thumbDisplay')} href={displayLink(board.displayCode)} sport={board.sport} />}
                            onNew={() => update({ displayCode: 'new' }, t('board.newCodeDone'))} />
                        <ShareRow label={t('board.embed')} help={t('board.embedHelp')} value={embedCode(board.displayCode)} multiline
                            preview={<EmbedThumb caption={t('board.thumbEmbed')} sport={board.sport} />} />
                        <ShareRow label={t('board.report')} help={t('board.reportHelp')} value={reportLink(board.displayCode)}
                            preview={
                                <a href={reportLink(board.displayCode)} target="_blank" rel="noreferrer" className="block bg-white text-gray-900 rounded p-3 text-xs leading-5 hover:opacity-90">
                                    <div className="font-black">HOME 2 - 1 AWAY</div>
                                    <div>1 · 25-21</div><div>2 · 19-25</div><div>3 · 25-23</div>
                                    <div className="text-gray-500 mt-1">{t('board.thumbReport')}</div>
                                </a>
                            } />
                    </>
                )}
                <p className="text-sm text-gray-400">{t('board.appHelp', { code: board.scorerCode })}</p>
            </Card>

            <section className="bg-[#22262f] border border-red-900 rounded-lg p-6 space-y-4">
                <h2 className="text-lg font-bold text-red-300">{t('board.delete')}</h2>
                <p className="text-sm text-gray-300">{t('board.deleteHelp')}</p>
                <Button variant="danger" onClick={remove}>{t('board.delete')}</Button>
            </section>
        </Page>
    );
}

function ShareRow({ label, help, value, onNew, preview, multiline = false }) {
    const { t } = useI18n();
    const [copied, setCopied] = useState(false);
    const copy = async () => {
        if (await copyText(value)) { setCopied(true); setTimeout(() => setCopied(false), 1500); }
    };
    const box = 'w-full bg-[#15171d] border border-[#323844] rounded p-2.5 text-white font-mono text-sm';
    return (
        <div className="grid gap-4 sm:grid-cols-[11rem_1fr] items-start">
        {preview}
        <div className="space-y-1.5 min-w-0">
            <div className="text-sm font-semibold text-gray-400">{label}</div>
            {multiline
                ? <textarea readOnly rows={3} value={value} className={box} onFocus={(e) => e.target.select()} />
                : <input readOnly value={value} className={box} onFocus={(e) => e.target.select()} />}
            <div className="flex flex-wrap gap-2">
                <button type="button" onClick={copy} className="px-3 py-1.5 rounded text-sm font-bold border border-[#4a4f5c] text-gray-200 hover:bg-[#3f434e]">{copied ? t('board.copied') : t('board.copy')}</button>
                {onNew && <button type="button" onClick={onNew} className="px-3 py-1.5 rounded text-sm font-bold border border-[#4a4f5c] text-gray-200 hover:bg-[#3f434e]">{t('board.newCode')}</button>}
            </div>
            <p className="text-xs text-gray-500">{help}</p>
        </div>
        </div>
    );
}

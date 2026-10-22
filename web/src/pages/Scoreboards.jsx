// My scoreboards: the list, a form for a new one, and delete.
import { useCallback, useEffect, useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { useI18n } from '../i18n.jsx';
import { Link, navigate } from '../router.jsx';
import { scorerLink } from '../links.js';
import { Button, Card, Field, Message, Page } from '../ui.jsx';

export const SPORT_IDS = ['volleyball', 'baseball', 'basic'];

export function SportSelect({ value, onChange }) {
    const { t } = useI18n();
    return (
        <label className="block">
            <span className="block text-sm font-semibold text-gray-400 mb-1.5">{t('board.sport')}</span>
            <select value={value} onChange={(e) => onChange(e.target.value)}
                className="w-full bg-[#15171d] border border-[#323844] rounded p-2.5 text-white">
                {SPORT_IDS.map(id => <option key={id} value={id}>{t(`sport.${id}`)}</option>)}
            </select>
        </label>
    );
}

export default function Scoreboards() {
    const { t, lang, errorText } = useI18n();
    const { user } = useAuth();
    const [boards, setBoards] = useState(null);
    const [limit, setLimit] = useState(5);
    const [error, setError] = useState('');
    const [title, setTitle] = useState('');
    const [sport, setSport] = useState('volleyball');
    const [busy, setBusy] = useState(false);

    useEffect(() => { if (user === null) navigate('/login'); }, [user]);

    const load = useCallback(() => {
        api('boards').then((data) => { setBoards(data.boards); setLimit(data.limit); }).catch((err) => setError(errorText(err)));
    }, [errorText]);
    useEffect(() => { if (user) load(); }, [user, load]);

    if (!user || !boards) return <Page wide><p className="text-gray-400">{error || t('common.loading')}</p></Page>;

    const create = async (e) => {
        e.preventDefault();
        setBusy(true); setError('');
        try {
            const { board } = await api('boards', { title, sport });
            navigate(`/scoreboards/${board.id}`);
        } catch (err) {
            setError(errorText(err));
        } finally {
            setBusy(false);
        }
    };

    const remove = async (board) => {
        if (!confirm(t('boards.deleteConfirm', { title: board.title }))) return;
        try {
            await api(`boards/${board.id}/delete`, {});
            load();
        } catch (err) {
            setError(errorText(err));
        }
    };

    const full = boards.length >= limit;

    return (
        <Page wide>
            <div className="flex items-end justify-between">
                <h1 className="text-2xl font-bold text-white">{t('nav.scoreboards')}</h1>
                <span className="text-sm text-gray-400">{t('boards.count', { n: boards.length, limit })}</span>
            </div>
            <Message>{error}</Message>

            {boards.length === 0 && <p className="text-gray-400">{t('boards.empty')}</p>}
            <ul className="space-y-3">
                {boards.map(board => (
                    <li key={board.id} className="bg-[#22262f] border border-[#323844] rounded-lg p-4 flex flex-wrap gap-3 items-center justify-between">
                        <div className="min-w-0">
                            <Link to={`/scoreboards/${board.id}`} className="text-white font-bold hover:underline">{board.title}</Link>
                            <div className="text-xs text-gray-400 mt-1">
                                {t(`sport.${board.sport}`)} · {new Date(board.createdAt).toLocaleDateString(lang)}
                                {board.private && <> · <span className="text-yellow-400">{t('board.privateBadge')}</span></>}
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <a href={scorerLink(board.scorerCode, board.sport)} className="px-3 py-2 rounded text-sm font-bold bg-blue-600 hover:bg-blue-500 text-white">{t('board.openScorer')}</a>
                            <Link to={`/scoreboards/${board.id}`} className="px-3 py-2 rounded text-sm font-bold border border-[#4a4f5c] text-gray-200 hover:bg-[#3f434e]">{t('boards.settings')}</Link>
                            <button onClick={() => remove(board)} className="px-3 py-2 rounded text-sm font-bold border border-red-900 text-red-300 hover:bg-red-950">{t('boards.delete')}</button>
                        </div>
                    </li>
                ))}
            </ul>

            <Card title={t('boards.new')}>
                {full ? (
                    <p className="text-sm text-gray-300">{t('boards.full', { limit })}</p>
                ) : (
                    <form onSubmit={create} className="space-y-4">
                        <Field label={t('board.title')} required maxLength={80} placeholder={t('board.titleExample')} value={title} onChange={(e) => setTitle(e.target.value)} />
                        <SportSelect value={sport} onChange={setSport} />
                        <Button type="submit" disabled={busy}>{t('boards.create')}</Button>
                    </form>
                )}
            </Card>
        </Page>
    );
}

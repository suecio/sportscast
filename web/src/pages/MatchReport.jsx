// Match report: the result set by set, to share or print after the game.
// Opened from the scoreboard page, at the display address with ?report.
import { useI18n } from '../i18n.jsx';

export default function MatchReport({ state, title }) {
    const { t } = useI18n();
    const v = state.volleyball;
    const isVolleyball = state.sport === 'volleyball';
    const sets = isVolleyball ? v.pastSets : [];
    // A set that is being played now is listed too, marked as ongoing.
    const ongoing = isVolleyball && !v.finished && (state.home > 0 || state.away > 0);
    const winner = isVolleyball && v.finished ? (v.setsHome > v.setsAway ? state.homeName : state.awayName) : '';
    const total = isVolleyball ? [v.setsHome, v.setsAway] : [state.home, state.away];
    const date = new Date().toLocaleDateString();

    return (
        <main className="min-h-screen bg-white text-gray-900 p-6 sm:p-10 print:p-0">
            <div className="max-w-xl mx-auto">
                <p className="text-sm text-gray-500">{t('report.heading')} · {date}</p>
                <h1 className="text-2xl font-black mt-1">{title || 'SportsCast'}</h1>

                <div className="mt-6 flex items-center justify-between text-xl font-extrabold">
                    <span className="truncate">{state.homeName}</span>
                    <span className="text-3xl mx-4 whitespace-nowrap">{total[0]} - {total[1]}</span>
                    <span className="truncate text-right">{state.awayName}</span>
                </div>
                <p className="mt-2 text-center text-sm font-semibold text-gray-600">
                    {winner ? t('report.winner', { team: winner }) : t('report.notFinished')}
                </p>

                {isVolleyball && (
                    <table className="mt-6 w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b-2 border-gray-300 text-sm text-gray-500">
                                <th className="py-2">{t('report.set')}</th>
                                <th className="py-2 text-right">{state.homeName}</th>
                                <th className="py-2 text-right">{state.awayName}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sets.map((s, i) => (
                                <tr key={i} className="border-b border-gray-200">
                                    <td className="py-2">{i + 1}</td>
                                    <td className={`py-2 text-right ${s[0] > s[1] ? 'font-black' : ''}`}>{s[0]}</td>
                                    <td className={`py-2 text-right ${s[1] > s[0] ? 'font-black' : ''}`}>{s[1]}</td>
                                </tr>
                            ))}
                            {ongoing && (
                                <tr className="border-b border-gray-200 text-gray-500">
                                    <td className="py-2">{sets.length + 1} ({t('report.ongoing')})</td>
                                    <td className="py-2 text-right">{state.home}</td>
                                    <td className="py-2 text-right">{state.away}</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                )}

                <div className="mt-8 flex gap-3 print:hidden">
                    <button onClick={() => window.print()} className="px-4 py-2 rounded bg-gray-900 text-white text-sm font-bold">{t('report.print')}</button>
                </div>
                <p className="mt-8 text-xs text-gray-400">sportscast.cc</p>
            </div>
        </main>
    );
}

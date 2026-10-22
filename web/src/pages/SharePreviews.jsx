// Small pictures next to the sharing links, so it is clear what each link opens.
// They are drawings with example numbers, not the live score.
import { BaseballPreview, BasicPreview, VolleyballPreview, defaultState } from '../Controller.jsx';

function exampleState(sport) {
    const state = defaultState();
    state.sport = sport;
    state.home = sport === 'baseball' ? 3 : 18;
    state.away = sport === 'baseball' ? 2 : 15;
    state.volleyball = { ...state.volleyball, setsHome: 1, pastSets: [[25, 21]], serving: 'home' };
    state.baseball = { ...state.baseball, inning: 4, balls: 2, strikes: 1, outs: 1, b1: true };
    return state;
}

// The real score graphic, shrunk to fit the thumbnail.
function Graphic({ sport, zoom }) {
    const state = exampleState(sport);
    const Preview = sport === 'baseball' ? BaseballPreview : sport === 'basic' ? BasicPreview : VolleyballPreview;
    return <div style={{ zoom }} className="w-max"><Preview state={state} /></div>;
}

// Light and dark squares: the usual way to show a transparent background.
const checkers = {
    backgroundColor: '#3a3f4b',
    backgroundImage: 'linear-gradient(45deg,#2c3039 25%,transparent 25%,transparent 75%,#2c3039 75%),linear-gradient(45deg,#2c3039 25%,transparent 25%,transparent 75%,#2c3039 75%)',
    backgroundSize: '12px 12px',
    backgroundPosition: '0 0,6px 6px',
};

function Frame({ caption, href, children }) {
    const box = (
        <div className="h-28 rounded-md border border-[#323844] overflow-hidden flex items-center justify-center">{children}</div>
    );
    return (
        <figure className="space-y-1">
            {href ? <a href={href} target="_blank" rel="noreferrer" className="block hover:opacity-90" aria-label={caption}>{box}</a> : box}
            <figcaption className="text-xs text-gray-500 text-center">{caption}</figcaption>
        </figure>
    );
}

export function ScorerThumb({ caption, href }) {
    const team = (name, score) => (
        <div className="bg-[#2a2e39] border border-[#3f434e] rounded p-1.5 w-16 space-y-1">
            <div className="text-[7px] text-gray-300 font-semibold text-center">{name}</div>
            <div className="text-base font-black text-white text-center leading-none">{score}</div>
            <div className="grid grid-cols-2 gap-0.5">
                <div className="bg-[#e5e7eb] text-black text-[8px] font-bold rounded-sm text-center py-0.5">+1</div>
                <div className="bg-[#e5e7eb] text-black text-[8px] font-bold rounded-sm text-center py-0.5">-1</div>
            </div>
        </div>
    );
    return (
        <Frame caption={caption} href={href}>
            <div className="w-full h-full bg-[#1a1d24] flex items-center justify-center gap-2">
                {team('HOME', 18)}
                {team('AWAY', 15)}
            </div>
        </Frame>
    );
}

export function DisplayThumb({ caption, href, sport }) {
    return (
        <Frame caption={caption} href={href}>
            <div className="w-full h-full flex items-center justify-center" style={checkers}>
                <Graphic sport={sport} zoom={0.38} />
            </div>
        </Frame>
    );
}

export function EmbedThumb({ caption, sport }) {
    return (
        <Frame caption={caption}>
            <div className="w-full h-full bg-[#e9ecf1] flex flex-col">
                <div className="h-3.5 bg-[#cfd4dc] flex items-center gap-1 px-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                    <span className="w-1.5 h-1.5 rounded-full bg-yellow-400" />
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                    <span className="ml-1.5 h-1.5 flex-1 rounded-sm bg-white" />
                </div>
                <div className="flex-1 p-2 space-y-1.5">
                    <div className="h-2 w-1/2 rounded-sm bg-[#1f3b70]" />
                    <div className="h-1 w-5/6 rounded-sm bg-[#b8bfca]" />
                    <div className="border border-dashed border-[#9aa3b1] rounded-sm p-1 w-max"><Graphic sport={sport} zoom={0.3} /></div>
                    <div className="h-1 w-4/6 rounded-sm bg-[#b8bfca]" />
                    <div className="h-1 w-3/4 rounded-sm bg-[#b8bfca]" />
                </div>
            </div>
        </Frame>
    );
}

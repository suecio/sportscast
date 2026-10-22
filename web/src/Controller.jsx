// The scoreboard controller (scorer page). It works with any code: a scoreboard's
// scorer code changes that scoreboard, any other code is an open room without an account.
import { useState, useEffect, useRef, useCallback } from 'react';
import { api } from './api.js';
import { Link } from './router.jsx';
import { AccountNav } from './ui.jsx';

// ------------------------------------------------------------------
// Shared game state (protocol v2)
//
// Every device (website, iPad, iPhone) sends the FULL state as one
// JSON message. "rev" goes up by 1 on every change; a device ignores
// any state with a lower rev than it already has, so a late message
// can never undo a newer score. Sport specific data lives in its own
// sub-object so new sports can be added without touching the others.
//
// Other messages:
//   { "type": "hello", "from": "<client id>" }  -> "send me your state"
//   Old flat messages (no "v") from the current iOS app are still read.
// ------------------------------------------------------------------

const PROTOCOL_VERSION = 2;

const SPORTS = [
    { id: 'volleyball', label: 'Volleyball' },
    { id: 'baseball', label: 'Baseball / Softball' },
    { id: 'basic', label: 'Basic' },
];

const defaultVolleyball = () => ({
    bestOf: 5,              // standard indoor
    pointsPerSet: 25,
    decidingSetPoints: 15,
    setsHome: 0,
    setsAway: 0,
    pastSets: [],           // [[home, away], ...]
    serving: null,          // 'home' | 'away' | null
    timeoutsHome: 0,
    timeoutsAway: 0,
    maxTimeouts: 2,
    finished: false,
    timeoutTeam: '',        // the team in the "TIMEOUT" banner, or '' for none
    timeoutUntil: 0,        // when that banner ends, in milliseconds since 1970
});

const defaultBaseball = () => ({
    b1: false, b2: false, b3: false,
    balls: 0, strikes: 0, outs: 0,
    inning: 1, top: true,
});

export const defaultState = () => ({
    v: PROTOCOL_VERSION,
    rev: 0,
    from: '',
    sport: 'volleyball',
    homeName: 'HOME',
    awayName: 'AWAY',
    home: 0,
    away: 0,
    volleyball: defaultVolleyball(),
    baseball: defaultBaseball(),
});

// Missing fields keep the value we already have (never reset to 0).
export function mergeState(current, incoming) {
    const out = { ...current };
    for (const key of Object.keys(incoming)) {
        const val = incoming[key];
        if (val === undefined || val === null) continue;
        if (key === 'volleyball' || key === 'baseball') {
            out[key] = { ...current[key], ...val };
        } else if (key in current) {
            out[key] = val;
        }
    }
    return out;
}

// The current iOS app sends flat baseball fields with no "v".
export function legacyToState(current, msg) {
    const num = (x, fallback) => (typeof x === 'number' ? x : fallback);
    const bool = (x, fallback) => (typeof x === 'boolean' ? x : fallback);
    const bb = current.baseball;
    return {
        ...current,
        home: num(msg.home, current.home),
        away: num(msg.away, current.away),
        homeName: typeof msg.homeName === 'string' ? msg.homeName : current.homeName,
        awayName: typeof msg.awayName === 'string' ? msg.awayName : current.awayName,
        baseball: {
            b1: bool(msg.b1, bb.b1), b2: bool(msg.b2, bb.b2), b3: bool(msg.b3, bb.b3),
            balls: num(msg.balls, bb.balls), strikes: num(msg.strikes, bb.strikes), outs: num(msg.outs, bb.outs),
            inning: num(msg.inning, bb.inning), top: bool(msg.top, bb.top),
        },
    };
}

// Adds the old flat baseball fields so the current iOS app keeps
// working until it speaks protocol v2. Remove once the app is updated.
function withLegacyFields(state) {
    const bb = state.baseball;
    return { ...state, b1: bb.b1, b2: bb.b2, b3: bb.b3, balls: bb.balls, strikes: bb.strikes, outs: bb.outs, inning: bb.inning, top: bb.top };
}

export function isNewer(incoming, current) {
    if (incoming.rev !== current.rev) return incoming.rev > current.rev;
    return (incoming.from || '') > (current.from || '');
}

// ------------------------------------------------------------------
// Volleyball rules (indoor rally scoring)
// ------------------------------------------------------------------
const TIMEOUT_BANNER_SECONDS = 30;

const vb = {
    setNumber: (s) => s.volleyball.setsHome + s.volleyball.setsAway + 1,
    setsToWin: (s) => Math.ceil(s.volleyball.bestOf / 2),
    isDecidingSet: (s) => vb.setNumber(s) === s.volleyball.bestOf,
    target: (s) => (vb.isDecidingSet(s) ? s.volleyball.decidingSetPoints : s.volleyball.pointsPerSet),
    setWinner: (s) => {
        const t = vb.target(s);
        if (s.home >= t && s.home - s.away >= 2) return 'home';
        if (s.away >= t && s.away - s.home >= 2) return 'away';
        return null;
    },
    addPoint: (d, team) => {
        if (d.volleyball.finished || vb.setWinner(d)) return;
        d[team] += 1;
        d.volleyball.serving = team; // rally winner serves
        vb.clearTimeoutBanner(d);    // play has started again
    },
    removePoint: (d, team) => { d[team] = Math.max(0, d[team] - 1); },
    endSet: (d) => {
        const winner = vb.setWinner(d);
        if (!winner) return;
        const v = d.volleyball;
        v.pastSets = [...v.pastSets, [d.home, d.away]];
        if (winner === 'home') v.setsHome += 1; else v.setsAway += 1;
        d.home = 0; d.away = 0;
        v.timeoutsHome = 0; v.timeoutsAway = 0;
        vb.clearTimeoutBanner(d);
        if (v.setsHome >= vb.setsToWin(d) || v.setsAway >= vb.setsToWin(d)) v.finished = true;
    },
    timeout: (d, team, delta) => {
        const key = team === 'home' ? 'timeoutsHome' : 'timeoutsAway';
        const before = d.volleyball[key];
        d.volleyball[key] = Math.min(d.volleyball.maxTimeouts, Math.max(0, before + delta));
        if (d.volleyball[key] > before) {
            // Show "TIMEOUT" on the graphic for this team.
            d.volleyball.timeoutTeam = team;
            d.volleyball.timeoutUntil = Date.now() + TIMEOUT_BANNER_SECONDS * 1000;
        } else if (d.volleyball[key] < before && d.volleyball.timeoutTeam === team) {
            vb.clearTimeoutBanner(d);
        }
    },
    clearTimeoutBanner: (d) => { d.volleyball.timeoutTeam = ''; d.volleyball.timeoutUntil = 0; },
    // Milliseconds left of the banner, or 0. A banner that ends much later than 30 seconds
    // from now comes from a device with a wrong clock and is ignored.
    timeoutBannerLeft: (s, now = Date.now()) => {
        const v = s.volleyball;
        if (s.sport !== 'volleyball' || (v.timeoutTeam !== 'home' && v.timeoutTeam !== 'away')) return 0;
        const left = (v.timeoutUntil || 0) - now;
        return left > 0 && left <= (TIMEOUT_BANNER_SECONDS + 5) * 1000 ? left : 0;
    },
    resetMatch: (d) => {
        const keep = d.volleyball;
        d.home = 0; d.away = 0;
        d.volleyball = { ...defaultVolleyball(), bestOf: keep.bestOf, pointsPerSet: keep.pointsPerSet, decidingSetPoints: keep.decidingSetPoints, maxTimeouts: keep.maxTimeouts };
    },
};

// ------------------------------------------------------------------
// Room code: from ?room= in the URL, else the last one used, else new.
// Sharing the page URL opens the same scoreboard on another device.
// ------------------------------------------------------------------
const safeStorage = {
    get: (k) => { try { return localStorage.getItem(k); } catch { return null; } },
    set: (k, v) => { try { localStorage.setItem(k, v); } catch {} },
};
const newRoomCode = () => Math.random().toString(36).substring(2, 8).toUpperCase();

function initialRoom(fixedCode) {
    // scorer.sportscast.cc/<CODE> gives the code in the path; keep that address as it is.
    if (fixedCode) return fixedCode.toUpperCase();
    const fromUrl = new URLSearchParams(window.location.search).get('room');
    const code = (fromUrl || safeStorage.get('sportscast.room') || newRoomCode()).toUpperCase();
    setRoomInUrl(code);
    return code;
}

function setRoomInUrl(code) {
    const url = new URL(window.location.href);
    url.searchParams.set('room', code);
    window.history.replaceState(null, '', url.toString());
    safeStorage.set('sportscast.room', code);
}

function loadSavedState(room) {
    try {
        const raw = safeStorage.get(`sportscast.state.${room}`);
        if (raw) return mergeState(defaultState(), JSON.parse(raw));
    } catch {}
    return defaultState();
}

const clientId = 'web-' + Math.random().toString(36).substring(2, 8);
const MAX_UNDO = 50;

// Simple inline SVGs to replace the Lucide icons library
const IconCopy = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>;
const IconExternal = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>;
const IconSettings = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>;

export default function WebDashboard({ fixedCode }) {
    const [gameCode, setGameCode] = useState(() => initialRoom(fixedCode));
    // The Worker that serves this page also runs the rooms, so the default is this address.
    const [workerUrl, setWorkerUrl] = useState(() => safeStorage.get('sportscast.workerUrl') || `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}`);
    const [connectionStatus, setConnectionStatus] = useState("Disconnected");
    const [state, setStateRaw] = useState(() => loadSavedState(gameCode));
    const [undoCount, setUndoCount] = useState(0);
    const ws = useRef(null);
    const stateRef = useRef(state);
    const undoStack = useRef([]);
    // Highest rev seen from each device, so an old "change" from the same device is ignored.
    const lastRevFrom = useRef({});
    // When the code is a scoreboard's scorer code: show its title, and start a new
    // match in the scoreboard's sport (only before the first point, without sending).
    const [boardTitle, setBoardTitle] = useState('');
    useEffect(() => {
        setBoardTitle('');
        api(`code/${encodeURIComponent(gameCode)}`)
            .then((info) => {
                if (info.access !== 'write') return;
                setBoardTitle(info.title);
                const current = stateRef.current;
                if (current.rev === 0 && current.sport !== info.sport) {
                    const next = { ...current, sport: info.sport };
                    stateRef.current = next;
                    setStateRaw(next);
                }
            })
            .catch(() => {});
    }, [gameCode]);

    const setState = useCallback((next) => {
        stateRef.current = next;
        setStateRaw(next);
        safeStorage.set(`sportscast.state.${gameCode}`, JSON.stringify(next));
    }, [gameCode]);

    const send = useCallback((msg) => {
        if (ws.current && ws.current.readyState === WebSocket.OPEN) {
            ws.current.send(JSON.stringify(msg));
        }
    }, []);

    // kind "change" = someone pressed a button; "sync" = sharing the current state
    // (on connect, answering hello, keep-alive).
    const sendState = useCallback((s, kind = 'sync') => {
        if (s.rev > 0) send({ ...withLegacyFields(s), kind });
    }, [send]);

    // Every local change goes through here: copy, change, bump rev, send.
    const commit = useCallback((mutate) => {
        const prev = stateRef.current;
        const draft = structuredClone(prev);
        mutate(draft);
        draft.rev = prev.rev + 1;
        draft.from = clientId;
        undoStack.current = [...undoStack.current, prev].slice(-MAX_UNDO);
        setUndoCount(undoStack.current.length);
        setState(draft);
        sendState(draft, 'change');
    }, [setState, sendState]);

    const undo = () => {
        const prev = undoStack.current.pop();
        setUndoCount(undoStack.current.length);
        if (!prev) return;
        const current = stateRef.current;
        const restored = { ...structuredClone(prev), rev: current.rev + 1, from: clientId };
        setState(restored);
        sendState(restored, 'change');
    };

    const handleMessage = useCallback((text) => {
        let msg;
        try { msg = JSON.parse(text); } catch { return; }
        if (!msg || typeof msg !== 'object') return;
        const current = stateRef.current;

        if (msg.type === 'hello') {
            sendState(current);
            return;
        }
        if (msg.v >= 2) {
            if (msg.from === clientId) return;
            // A button press on another device always wins, even if that device's
            // rev counter is behind ours (each device counts on its own). Only a
            // late copy of an older press from the same device is ignored.
            // Sync messages are only taken when they are newer than what we have.
            if (msg.kind === 'change') {
                if (msg.rev <= (lastRevFrom.current[msg.from] ?? -1)) return;
            } else if (!isNewer(msg, current)) {
                return;
            }
            lastRevFrom.current[msg.from] = msg.rev;
            const merged = mergeState(current, msg);
            // Never go backwards, so our next change is newer for everyone.
            merged.rev = Math.max(current.rev, msg.rev);
            // Undo restores a whole snapshot, so after another device
            // changes the score it would erase that change. Start over.
            undoStack.current = [];
            setUndoCount(0);
            setState(merged);
            return;
        }
        if (typeof msg.home === 'number' || typeof msg.away === 'number') {
            const next = legacyToState(current, msg);
            next.rev = current.rev + 1;
            next.from = current.from;
            undoStack.current = [];
            setUndoCount(0);
            setState(next);
        }
    }, [setState, sendState]);

    // WebSocket connection with automatic reconnect.
    useEffect(() => {
        if (!workerUrl) return;
        safeStorage.set('sportscast.workerUrl', workerUrl);
        let cleanUrl = workerUrl.trim();
        if (cleanUrl.endsWith('/')) cleanUrl = cleanUrl.slice(0, -1);

        let closedByUs = false;
        let retryDelay = 1000;
        let retryTimer = null;

        const open = () => {
            setConnectionStatus("Connecting...");
            let socket;
            try {
                socket = new WebSocket(`${cleanUrl}/${gameCode}`);
            } catch (error) {
                console.error("WebSocket connection blocked/failed:", error);
                setConnectionStatus("Preview Mode (No Sync)");
                return;
            }
            ws.current = socket;
            socket.onopen = () => {
                retryDelay = 1000;
                setConnectionStatus("Connected");
                // Ask the room for the latest state, and share ours.
                socket.send(JSON.stringify({ type: 'hello', from: clientId }));
                sendState(stateRef.current);
            };
            socket.onmessage = (event) => {
                if (typeof event.data === 'string') handleMessage(event.data);
            };
            socket.onerror = () => setConnectionStatus("Error");
            socket.onclose = () => {
                if (closedByUs) return;
                setConnectionStatus("Reconnecting...");
                retryTimer = setTimeout(open, retryDelay);
                retryDelay = Math.min(retryDelay * 2, 30000);
            };
        };
        open();

        return () => {
            closedByUs = true;
            clearTimeout(retryTimer);
            if (ws.current) ws.current.close();
        };
    }, [workerUrl, gameCode, handleMessage, sendState]);

    // Keep-alive: resend the current state every 5s. Devices on
    // protocol v2 ignore it (same rev); it also keeps the socket busy
    // and lets the current iOS app catch up after it reconnects.
    useEffect(() => {
        const interval = setInterval(() => sendState(stateRef.current), 5000);
        return () => clearInterval(interval);
    }, [sendState]);

    const changeRoom = () => {
        const code = newRoomCode();
        setRoomInUrl(code);
        undoStack.current = [];
        setUndoCount(0);
        const fresh = loadSavedState(code);
        stateRef.current = fresh;
        setStateRaw(fresh);
        setGameCode(code);
    };

    const copyLink = () => {
        const text = window.location.href;
        const fallback = () => {
            const tempInput = document.createElement("input");
            tempInput.value = text;
            document.body.appendChild(tempInput);
            tempInput.select();
            document.execCommand("copy");
            document.body.removeChild(tempInput);
        };
        try {
            if (navigator.clipboard) navigator.clipboard.writeText(text).catch(fallback);
            else fallback();
        } catch (err) {
            console.error("Failed to copy", err);
        }
    };

    const isConnected = connectionStatus === 'Connected';

    return (
        <div className="min-h-screen text-gray-200 font-sans pb-20">
            <header className="bg-[#22262f] border-b border-[#323844] p-4 flex flex-wrap gap-3 justify-between items-center sticky top-0 z-50">
                <div className="flex flex-wrap items-center gap-3">
                    <h1 className="text-xl font-bold text-white tracking-tight"><Link to="/">SportsCast<span className="text-blue-500">Web</span></Link></h1>
                    <div className="flex items-center bg-[#15171d] rounded-md border border-[#323844] px-3 py-1.5">
                        <span className="text-xs text-gray-400 mr-2 uppercase">Game Code</span>
                        <span className="text-lg font-mono font-bold text-yellow-400 tracking-widest">{gameCode}</span>
                        <button onClick={copyLink} className="ml-3 text-gray-400 hover:text-white transition" title="Copy link to this scoreboard">
                            <IconCopy />
                        </button>
                    </div>
                    {boardTitle && <span className="text-white font-semibold">{boardTitle}</span>}
                    <select
                        value={state.sport}
                        onChange={(e) => { const sport = e.target.value; commit(d => { d.sport = sport; }); }}
                        className="bg-[#15171d] border border-[#323844] rounded-md px-3 py-2 text-white text-sm"
                    >
                        {SPORTS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                    </select>
                </div>
                <div className="flex items-center gap-4">
                <AccountNav />
                <div className="flex items-center space-x-2 font-semibold">
                    <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : (connectionStatus.includes('Preview') || connectionStatus.includes('ing') ? 'bg-yellow-500' : 'bg-red-500')}`}></div>
                    <span className={isConnected ? 'text-green-400' : (connectionStatus.includes('Preview') || connectionStatus.includes('ing') ? 'text-yellow-400' : 'text-red-400')}>{connectionStatus}</span>
                </div>
                </div>
            </header>

            <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
                <section className="bg-[#22262f] border border-[#323844] rounded-lg overflow-hidden shadow-2xl">
                    <div className="bg-[#1a1d24] px-4 py-2 border-b border-[#323844] flex items-center justify-between">
                        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider flex items-center">
                            <span className="mr-2"><IconExternal /></span> Scoreboard Preview
                        </h2>
                        {isConnected && <span className="text-xs text-green-400 font-mono animate-pulse">● SYNCED</span>}
                    </div>
                    <div className="p-6 md:p-8 bg-[#2a2e39] flex justify-center items-center overflow-x-auto relative" style={{backgroundImage: "radial-gradient(#3f434e 1px, transparent 1px)", backgroundSize: "20px 20px"}}>
                        {state.sport === 'volleyball' && <VolleyballPreview state={state} />}
                        {state.sport === 'baseball' && <BaseballPreview state={state} />}
                        {state.sport === 'basic' && <BasicPreview state={state} />}
                    </div>
                </section>

                <div className="flex gap-3">
                    <button onClick={undo} disabled={undoCount === 0} className="flex-1 md:flex-none md:px-8 py-3 rounded text-sm font-bold border border-[#4a4f5c] text-gray-200 hover:bg-[#3f434e] disabled:opacity-40 transition active:scale-95">Undo</button>
                </div>

                {state.sport === 'volleyball' && <VolleyballControls state={state} commit={commit} />}
                {state.sport === 'baseball' && <BaseballControls state={state} commit={commit} />}
                {state.sport === 'basic' && <BasicControls state={state} commit={commit} />}

                <section>
                    <div className="flex justify-between items-end mb-3 mt-6">
                        <h2 className="text-lg font-bold text-white flex items-center"><span className="mr-2"><IconSettings /></span> Setup</h2>
                    </div>

                    <div className="bg-[#22262f] border border-[#323844] rounded-lg p-6 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div>
                                <h3 className="text-sm font-semibold text-gray-400 mb-3 uppercase tracking-wider">Home Team</h3>
                                <input type="text" value={state.homeName} onChange={(e) => { const v = e.target.value; commit(d => { d.homeName = v; }); }} className="w-full bg-[#15171d] border border-[#323844] rounded p-2.5 text-white focus:outline-none focus:border-blue-500 transition"/>
                            </div>
                            <div>
                                <h3 className="text-sm font-semibold text-gray-400 mb-3 uppercase tracking-wider">Away Team</h3>
                                <input type="text" value={state.awayName} onChange={(e) => { const v = e.target.value; commit(d => { d.awayName = v; }); }} className="w-full bg-[#15171d] border border-[#323844] rounded p-2.5 text-white focus:outline-none focus:border-blue-500 transition"/>
                            </div>
                        </div>

                        {state.sport === 'volleyball' && <VolleyballSettings state={state} commit={commit} />}

                        {/* A scoreboard's room and connection are set on its admin page. */}
                        {!boardTitle && <>
                        <hr className="border-[#323844]"/>

                        <div>
                            <h3 className="text-sm font-semibold text-gray-400 mb-3 uppercase tracking-wider">Scoreboard Room</h3>
                            <p className="text-sm text-gray-400 mb-3">Open this page's link on another device, or type the game code in the app, to control the same scoreboard.</p>
                            <button onClick={() => { if (confirm('Start a new scoreboard with a new game code?')) changeRoom(); }} className="px-4 py-2 rounded text-sm font-bold border border-[#4a4f5c] text-gray-300 hover:bg-[#3f434e] transition">New game code</button>
                        </div>

                        <div>
                            <h3 className="text-sm font-semibold text-gray-400 mb-3 uppercase tracking-wider">Cloudflare Worker Setup</h3>
                            <input
                                type="text"
                                value={workerUrl}
                                onChange={(e) => setWorkerUrl(e.target.value)}
                                className="w-full bg-[#15171d] border border-[#323844] rounded p-2.5 text-white focus:outline-none focus:border-blue-500 transition font-mono text-sm"
                                placeholder="wss://sportscast-server.suecio.workers.dev"
                            />
                        </div>
                        </>}
                    </div>
                </section>
            </div>
        </div>
    );
}

// ------------------------------------------------------------------
// Volleyball
// ------------------------------------------------------------------
// The "TIMEOUT" banner ends by itself, without a new message, so redraw when it ends.
function useTimeoutBanner(state) {
    const left = vb.timeoutBannerLeft(state);
    const [, redraw] = useState(0);
    useEffect(() => {
        if (!left) return;
        const timer = setTimeout(() => redraw((n) => n + 1), left + 50);
        return () => clearTimeout(timer);
    }, [left > 0, state.volleyball.timeoutUntil]);
    return left > 0 ? state.volleyball.timeoutTeam : null;
}

export function VolleyballPreview({ state }) {
    const v = state.volleyball;
    const banner = useTimeoutBanner(state);
    const rows = [
        { team: 'home', name: state.homeName, sets: v.setsHome, points: state.home, timeouts: v.timeoutsHome, color: 'bg-blue-600', past: v.pastSets.map(s => s[0]), other: v.pastSets.map(s => s[1]) },
        { team: 'away', name: state.awayName, sets: v.setsAway, points: state.away, timeouts: v.timeoutsAway, color: 'bg-red-600', past: v.pastSets.map(s => s[1]), other: v.pastSets.map(s => s[0]) },
    ];
    return (
        <div className="shadow-2xl rounded-sm overflow-hidden text-white font-bold font-sans shrink-0 border border-[#3f434e]">
            {rows.map(r => (
                <div key={r.team} className="flex items-stretch h-12 border-b border-black/40 last:border-b-0">
                    <div className="bg-[#1a1a1a] w-8 flex items-center justify-center">
                        {v.serving === r.team && <span className="w-3 h-3 rounded-full bg-yellow-400"></span>}
                    </div>
                    <div className="bg-[#1a1a1a] opacity-90 pl-2 pr-6 flex items-center text-xl min-w-[9rem]">{r.name}</div>
                    {/* One bar per timeout in the set: white = still available, dark = used. */}
                    <div className="bg-[#1a1a1a] w-6 flex flex-col items-center justify-center gap-1">
                        {Array.from({ length: Math.max(0, v.maxTimeouts) }, (_, i) => (
                            <span key={i} className={`block w-3 h-1 rounded-[1px] ${i < v.maxTimeouts - r.timeouts ? 'bg-white' : 'bg-[#555]'}`}></span>
                        ))}
                    </div>
                    {r.past.map((p, i) => (
                        <div key={i} className={`bg-[#222] w-11 flex items-center justify-center text-lg ${p > r.other[i] ? 'text-white' : 'text-gray-500'}`}>{p}</div>
                    ))}
                    <div className="bg-black w-11 flex items-center justify-center text-xl text-yellow-400">{r.sets}</div>
                    <div className={`${r.color} w-16 flex items-center justify-center text-3xl font-black`}>{r.points}</div>
                </div>
            ))}
            {banner && (
                <div className="bg-yellow-400 text-black h-8 px-3 flex items-center text-lg font-black whitespace-nowrap">
                    TIMEOUT&nbsp;&nbsp;{banner === 'home' ? state.homeName : state.awayName}
                </div>
            )}
        </div>
    );
}

function VolleyballControls({ state, commit }) {
    const v = state.volleyball;
    const winner = vb.setWinner(state);
    const setNo = vb.setNumber(state);
    const teams = [
        { team: 'home', name: state.homeName, points: state.home, timeouts: v.timeoutsHome },
        { team: 'away', name: state.awayName, points: state.away, timeouts: v.timeoutsAway },
    ];
    return (
        <section className="space-y-4">
            <div className="bg-[#22262f] border border-[#323844] rounded-lg p-4 flex flex-wrap items-center justify-between gap-3">
                <div className="text-sm text-gray-300">
                    {v.finished
                        ? <span className="text-yellow-400 font-bold">Match finished: {v.setsHome > v.setsAway ? state.homeName : state.awayName} wins {Math.max(v.setsHome, v.setsAway)}-{Math.min(v.setsHome, v.setsAway)}</span>
                        : <span>Set <b className="text-white">{setNo}</b> of {v.bestOf}, played to {vb.target(state)}</span>}
                </div>
                {winner && !v.finished && (
                    <button onClick={() => commit(d => vb.endSet(d))} className="px-6 py-3 rounded text-sm font-black bg-yellow-400 text-black hover:bg-yellow-300 transition active:scale-95">
                        End set {setNo}: {winner === 'home' ? state.homeName : state.awayName} wins {state.home}-{state.away}
                    </button>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {teams.map(t => (
                    <ControlPanel key={t.team} title={t.name}>
                        <div className="text-center text-5xl font-black text-white mb-3">{t.points}</div>
                        <div className="grid grid-cols-3 gap-2 mb-2">
                            <div className="col-span-2"><ControlButton onClick={() => commit(d => vb.addPoint(d, t.team))} label="+1 Point" big /></div>
                            <ControlButton onClick={() => commit(d => vb.removePoint(d, t.team))} label="-1" big />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <button onClick={() => commit(d => { d.volleyball.serving = t.team; })} className={`w-full py-3 rounded text-sm font-bold transition active:scale-95 ${v.serving === t.team ? 'bg-yellow-400 text-black' : 'border border-[#4a4f5c] hover:bg-[#3f434e] text-gray-300'}`}>
                                {v.serving === t.team ? '● Serving' : 'Set serve'}
                            </button>
                            <div className="flex gap-1">
                                <button onClick={() => commit(d => vb.timeout(d, t.team, 1))} className="flex-1 py-3 rounded text-sm font-bold border border-[#4a4f5c] hover:bg-[#3f434e] text-gray-300 transition active:scale-95">Timeout {t.timeouts}/{v.maxTimeouts}</button>
                                <button onClick={() => commit(d => vb.timeout(d, t.team, -1))} className="px-3 py-3 rounded text-sm font-bold border border-[#4a4f5c] hover:bg-[#3f434e] text-gray-300 transition active:scale-95" title="Remove timeout">-</button>
                            </div>
                        </div>
                    </ControlPanel>
                ))}
            </div>
        </section>
    );
}

function VolleyballSettings({ state, commit }) {
    const v = state.volleyball;
    const numberInput = (label, key) => (
        <label className="block">
            <span className="text-xs text-gray-400 uppercase">{label}</span>
            <input type="number" min="1" value={v[key]} onChange={(e) => { const n = parseInt(e.target.value, 10); if (n > 0) commit(d => { d.volleyball[key] = n; }); }}
                className="mt-1 w-full bg-[#15171d] border border-[#323844] rounded p-2.5 text-white focus:outline-none focus:border-blue-500" />
        </label>
    );
    return (
        <div>
            <h3 className="text-sm font-semibold text-gray-400 mb-3 uppercase tracking-wider">Volleyball Format</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <label className="block">
                    <span className="text-xs text-gray-400 uppercase">Best of</span>
                    <select value={v.bestOf} onChange={(e) => { const n = parseInt(e.target.value, 10); commit(d => { d.volleyball.bestOf = n; }); }}
                        className="mt-1 w-full bg-[#15171d] border border-[#323844] rounded p-2.5 text-white">
                        <option value={3}>3 sets</option>
                        <option value={5}>5 sets</option>
                    </select>
                </label>
                {numberInput('Points per set', 'pointsPerSet')}
                {numberInput('Deciding set', 'decidingSetPoints')}
                {numberInput('Timeouts per set', 'maxTimeouts')}
            </div>
            <button onClick={() => { if (confirm('Reset the whole match? Sets and points go back to 0.')) commit(d => vb.resetMatch(d)); }}
                className="px-4 py-2 rounded text-sm font-bold border border-red-500/60 text-red-300 hover:bg-red-500/10 transition">Reset match</button>
        </div>
    );
}

// ------------------------------------------------------------------
// Baseball
// ------------------------------------------------------------------
export function BaseballPreview({ state }) {
    const b = state.baseball;
    return (
        <div className="flex items-stretch h-14 shadow-2xl rounded-sm overflow-hidden text-white font-bold text-2xl font-sans shrink-0 border border-[#3f434e]">
            <div className="bg-[#1a1a1a] opacity-90 px-6 flex items-center">{state.awayName}</div>
            <div className="bg-red-600 px-6 flex items-center text-3xl font-black">{state.away}</div>
            <div className="bg-[#1a1a1a] opacity-90 px-6 flex items-center">{state.homeName}</div>
            <div className="bg-blue-600 px-6 flex items-center text-3xl font-black">{state.home}</div>
            <div className="bg-black px-5 flex items-center text-yellow-400">{b.top ? '▲' : '▼'} {b.inning}</div>
            <div className="bg-[#222] opacity-95 px-5 flex items-center text-xl tracking-wider">B:{b.balls} S:{b.strikes} O:{b.outs}</div>
            <div className="bg-[#222] opacity-95 px-5 flex items-center space-x-1.5 text-yellow-400 text-xl tracking-widest">
                <span>{b.b3 ? '◆' : '◇'}</span>
                <span>{b.b2 ? '◆' : '◇'}</span>
                <span>{b.b1 ? '◆' : '◇'}</span>
            </div>
        </div>
    );
}

function BaseballControls({ state, commit }) {
    const b = state.baseball;
    const cycle = (key, max) => commit(d => { d.baseball[key] = d.baseball[key] + 1 > max ? 0 : d.baseball[key] + 1; });
    const dec = (key) => commit(d => { d.baseball[key] = Math.max(0, d.baseball[key] - 1); });
    return (
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <ScorePanel state={state} commit={commit} team="away" />
            <ScorePanel state={state} commit={commit} team="home" />
            <ControlPanel title="Runners on base">
                <div className="grid grid-cols-3 gap-2 mb-2 h-full items-center">
                    <BaseToggle active={b.b3} onClick={() => commit(d => { d.baseball.b3 = !d.baseball.b3; })} label="3B" />
                    <BaseToggle active={b.b2} onClick={() => commit(d => { d.baseball.b2 = !d.baseball.b2; })} label="2B" />
                    <BaseToggle active={b.b1} onClick={() => commit(d => { d.baseball.b1 = !d.baseball.b1; })} label="1B" />
                </div>
                <ControlButton onClick={() => commit(d => { d.baseball.b1 = false; d.baseball.b2 = false; d.baseball.b3 = false; })} label="Clear Bases" variant="outline" />
            </ControlPanel>
            <ControlPanel title={`B: ${b.balls} • S: ${b.strikes} • O: ${b.outs}`}>
                <div className="space-y-2 mb-3">
                    <CountRow label="Balls" onPlus={() => cycle('balls', 4)} onMinus={() => dec('balls')} />
                    <CountRow label="Strikes" onPlus={() => cycle('strikes', 3)} onMinus={() => dec('strikes')} />
                    <CountRow label="Outs" onPlus={() => cycle('outs', 3)} onMinus={() => dec('outs')} />
                </div>
                <ControlButton onClick={() => commit(d => { d.baseball.balls = 0; d.baseball.strikes = 0; })} label="Reset" variant="outline" />
            </ControlPanel>

            <div className="lg:col-span-2">
                <ControlPanel title="Game Inning">
                    <div className="flex justify-center mb-2"><span className="bg-purple-600 text-xs font-bold px-2 py-0.5 rounded text-white">Inning: {b.inning}</span></div>
                    <div className="grid grid-cols-3 gap-2 mb-2">
                        <ControlButton onClick={() => commit(d => { d.baseball.inning += 1; })} label="+1 Inning" />
                        <ControlButton onClick={() => commit(d => { d.baseball.inning = Math.max(1, d.baseball.inning - 1); })} label="-1 Inning" />
                        <ControlButton onClick={() => commit(d => { d.baseball.top = !d.baseball.top; })} label={b.top ? "Go to Bottom" : "Go to Top"} />
                    </div>
                </ControlPanel>
            </div>
        </section>
    );
}

// ------------------------------------------------------------------
// Basic (points only)
// ------------------------------------------------------------------
export function BasicPreview({ state }) {
    return (
        <div className="flex items-stretch h-14 shadow-2xl rounded-sm overflow-hidden text-white font-bold text-2xl font-sans shrink-0 border border-[#3f434e]">
            <div className="bg-[#1a1a1a] opacity-90 px-6 flex items-center">{state.homeName}</div>
            <div className="bg-blue-600 px-6 flex items-center text-3xl font-black">{state.home}</div>
            <div className="bg-[#1a1a1a] opacity-90 px-6 flex items-center">{state.awayName}</div>
            <div className="bg-red-600 px-6 flex items-center text-3xl font-black">{state.away}</div>
        </div>
    );
}

function BasicControls({ state, commit }) {
    return (
        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ScorePanel state={state} commit={commit} team="home" />
            <ScorePanel state={state} commit={commit} team="away" />
        </section>
    );
}

// ------------------------------------------------------------------
// Shared UI pieces
// ------------------------------------------------------------------
function ScorePanel({ state, commit, team }) {
    return (
        <ControlPanel title={team === 'home' ? state.homeName : state.awayName}>
            <div className="text-center text-4xl font-black text-white mb-3">{state[team]}</div>
            <div className="grid grid-cols-2 gap-2 mb-2">
                <ControlButton onClick={() => commit(d => { d[team] += 1; })} label="+1" />
                <ControlButton onClick={() => commit(d => { d[team] = Math.max(0, d[team] - 1); })} label="-1" />
            </div>
            <ControlButton onClick={() => commit(d => { d[team] = 0; })} label="Reset" variant="outline" />
        </ControlPanel>
    );
}

function ControlPanel({ title, children }) {
    return (
        <div className="bg-[#2a2e39] border border-[#3f434e] rounded-lg p-3 flex flex-col justify-between">
            <h3 className="text-xs font-semibold text-gray-300 uppercase mb-3 text-center truncate">{title}</h3>
            {children}
        </div>
    );
}

function ControlButton({ onClick, label, variant = 'solid', big = false }) {
    return <button onClick={onClick} className={`w-full ${big ? 'py-5 text-lg' : 'py-3 text-sm'} rounded font-bold transition active:scale-95 ${variant === 'solid' ? 'bg-[#e5e7eb] hover:bg-white text-black' : 'border border-[#4a4f5c] hover:bg-[#3f434e] text-gray-300'}`}>{label}</button>;
}

function BaseToggle({ active, onClick, label }) {
    return <button onClick={onClick} className={`w-full py-4 rounded text-sm font-bold transition active:scale-95 ${active ? 'bg-[#22c55e] text-white shadow-[inset_0_0_10px_rgba(0,0,0,0.2)]' : 'bg-[#e5e7eb] hover:bg-white text-[#1a1d24]'}`}>{label}</button>;
}

function CountRow({ label, onPlus, onMinus }) {
    return (
        <div className="flex items-center justify-between text-sm">
            <span className="w-16 text-gray-400 font-semibold">{label}</span>
            <div className="flex space-x-1 flex-1">
                <button onClick={onPlus} className="flex-1 bg-[#e5e7eb] hover:bg-white text-black px-4 py-1.5 rounded font-bold transition active:scale-95">+1</button>
                <button onClick={onMinus} className="flex-1 bg-[#e5e7eb] hover:bg-white text-black px-4 py-1.5 rounded font-bold transition active:scale-95">-1</button>
            </div>
        </div>
    );
}


// The score graphic alone, read-only, on a transparent background: for fans, for OBS
// (browser source) and for embedding on a club website with an iframe.
import { useEffect, useRef, useState } from 'react';
import { api } from '../api.js';
import { useI18n } from '../i18n.jsx';
import { BaseballPreview, BasicPreview, VolleyballPreview, defaultState, isNewer, legacyToState, mergeState } from '../Controller.jsx';

const clientId = 'display-' + Math.random().toString(36).substring(2, 8);

export default function Display({ code }) {
    const { t, errorText } = useI18n();
    const [state, setState] = useState(defaultState);
    const [error, setError] = useState('');
    const stateRef = useRef(state);
    const lastRevFrom = useRef({});

    // Transparent page, so only the graphic shows in OBS or an iframe.
    useEffect(() => {
        const previous = document.body.className;
        document.body.className = 'bg-transparent';
        return () => { document.body.className = previous; };
    }, []);

    useEffect(() => {
        let socket = null;
        let closed = false;
        let retryTimer = null;
        let retryDelay = 1000;

        const apply = (text) => {
            let msg;
            try { msg = JSON.parse(text); } catch { return; }
            if (!msg || typeof msg !== 'object' || msg.type === 'hello') return;
            const current = stateRef.current;
            let next = null;
            if (msg.v >= 2) {
                if (msg.kind === 'change') {
                    if (msg.rev <= (lastRevFrom.current[msg.from] ?? -1)) return;
                } else if (!isNewer(msg, current)) {
                    return;
                }
                lastRevFrom.current[msg.from] = msg.rev;
                next = mergeState(current, msg);
                next.rev = Math.max(current.rev, msg.rev);
            } else if (typeof msg.home === 'number' || typeof msg.away === 'number') {
                next = legacyToState(current, msg);
            }
            if (next) { stateRef.current = next; setState(next); }
        };

        const open = () => {
            const scheme = window.location.protocol === 'https:' ? 'wss' : 'ws';
            socket = new WebSocket(`${scheme}://${window.location.host}/${encodeURIComponent(code)}`);
            socket.onopen = () => {
                retryDelay = 1000;
                socket.send(JSON.stringify({ type: 'hello', from: clientId }));
            };
            socket.onmessage = (event) => { if (typeof event.data === 'string') apply(event.data); };
            socket.onclose = () => {
                if (closed) return;
                retryTimer = setTimeout(open, retryDelay);
                retryDelay = Math.min(retryDelay * 2, 30000);
            };
        };

        // Check the code first, so a wrong or private code shows a message instead of an empty graphic.
        api(`code/${encodeURIComponent(code)}`)
            .then(() => { if (!closed) open(); })
            .catch((err) => setError(errorText(err)));

        return () => {
            closed = true;
            clearTimeout(retryTimer);
            if (socket) socket.close();
        };
    }, [code, errorText]);

    if (error) return <p className="m-4 inline-block bg-[#22262f] text-gray-200 rounded p-3 text-sm">{error}</p>;

    return (
        <div className="p-2 inline-block" aria-label={t('code.displayTitle')}>
            {state.sport === 'volleyball' && <VolleyballPreview state={state} />}
            {state.sport === 'baseball' && <BaseballPreview state={state} />}
            {state.sport === 'basic' && <BasicPreview state={state} />}
        </div>
    );
}

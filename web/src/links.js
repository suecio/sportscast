// Addresses to share for a scoreboard. On sportscast.cc the short scorer. and
// scoreboard. addresses are used; anywhere else (local testing, workers.dev) the
// same pages on the current address.

const MAIN_HOST = 'sportscast.cc';

export const isMainSite = () => window.location.hostname === MAIN_HOST;

export function scorerLink(code, sport) {
    if (isMainSite()) return `https://scorer.${MAIN_HOST}/${code}`;
    return `${window.location.origin}/score?room=${encodeURIComponent(code)}${sport ? `&sport=${sport}` : ''}`;
}

export function displayLink(code) {
    if (isMainSite()) return `https://scoreboard.${MAIN_HOST}/${code}`;
    return `${window.location.origin}/board/${encodeURIComponent(code)}`;
}

export const reportLink = (code) => `${displayLink(code)}?report`;

export const embedCode = (code) =>
    `<iframe src="${displayLink(code)}" width="480" height="140" style="border:0;background:transparent" allowtransparency="true" title="SportsCast"></iframe>`;

// Which small site this is: "scorer" (scorer.sportscast.cc), "display" (scoreboard.sportscast.cc) or "main".
export function siteKind() {
    const host = window.location.hostname;
    if (host.startsWith('scorer.')) return 'scorer';
    if (host.startsWith('scoreboard.')) return 'display';
    return 'main';
}

export async function copyText(text) {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch {
        return false;
    }
}

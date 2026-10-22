// Calls to the Worker's /api. Errors come back as { error: "<code>" }; the code is
// thrown so pages can show the translated message (i18n key "error.<code>").

export async function api(path, body) {
    let res;
    try {
        res = await fetch(`/api/${path}`, body === undefined
            ? { credentials: 'same-origin' }
            : { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    } catch {
        throw new Error('network');
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'server_error');
    return data;
}

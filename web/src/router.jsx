// A very small router: the page is chosen from location.pathname.
import { useEffect, useState } from 'react';

const listeners = new Set();

// Tells the pages directly instead of firing a "popstate" event: React gives updates
// made inside a popstate event top priority, so the page would render before other
// pending updates, such as the user who just logged in.
export function navigate(path) {
    window.history.pushState(null, '', path);
    listeners.forEach((listener) => listener());
}

export function usePath() {
    const [path, setPath] = useState(window.location.pathname);
    useEffect(() => {
        const onChange = () => setPath(window.location.pathname);
        listeners.add(onChange);
        window.addEventListener('popstate', onChange);
        return () => {
            listeners.delete(onChange);
            window.removeEventListener('popstate', onChange);
        };
    }, []);
    return path;
}

// <a> that changes page without reloading.
export function Link({ to, className, children }) {
    return (
        <a href={to} className={className} onClick={(e) => {
            if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
            e.preventDefault();
            navigate(to);
        }}>{children}</a>
    );
}

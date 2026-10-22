import { AuthProvider } from './auth.jsx';
import { I18nProvider } from './i18n.jsx';
import { siteKind } from './links.js';
import { usePath } from './router.jsx';
import Controller from './Controller.jsx';
import Account from './pages/Account.jsx';
import AuthLink from './pages/AuthLink.jsx';
import BoardAdmin from './pages/BoardAdmin.jsx';
import CodeEntry from './pages/CodeEntry.jsx';
import Display from './pages/Display.jsx';
import Home from './pages/Home.jsx';
import { Privacy, Terms } from './pages/Legal.jsx';
import Login from './pages/Login.jsx';
import Scoreboards from './pages/Scoreboards.jsx';

const PAGES = {
    '': Home,
    '/score': Controller,
    '/login': Login,
    '/auth': AuthLink,
    '/account': Account,
    '/scoreboards': Scoreboards,
    '/scorer': () => <CodeEntry kind="scorer" />,
    '/board': () => <CodeEntry kind="display" />,
    '/privacy': Privacy,
    '/terms': Terms,
};

function Router() {
    const path = usePath();
    const kind = siteKind();
    const code = decodeURIComponent(path.replace(/^\/+|\/+$/g, ''));

    // scorer.sportscast.cc: "/" asks for the code, "/<CODE>" is the controller for it.
    if (kind === 'scorer') return code ? <Controller key={code} fixedCode={code} /> : <CodeEntry kind="scorer" />;
    // scoreboard.sportscast.cc: "/" asks for the code, "/<CODE>" is the graphic alone.
    if (kind === 'display') return code ? <Display key={code} code={code} /> : <CodeEntry kind="display" />;

    const board = path.match(/^\/board\/([^/]+)\/?$/);
    if (board) return <Display key={board[1]} code={decodeURIComponent(board[1])} />;
    const admin = path.match(/^\/scoreboards\/([\w-]+)\/?$/);
    if (admin) return <BoardAdmin key={admin[1]} id={admin[1]} />;

    // Old links to the controller were "/?room=CODE"; they still open the controller.
    const page = path.replace(/\/+$/, '');
    const oldControllerLink = page === '' && new URLSearchParams(window.location.search).has('room');
    const Current = oldControllerLink ? Controller : PAGES[page] || Home;
    return <Current />;
}

export default function App() {
    return (
        <I18nProvider>
            <AuthProvider>
                <Router />
            </AuthProvider>
        </I18nProvider>
    );
}

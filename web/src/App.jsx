import { AuthProvider } from './auth.jsx';
import { I18nProvider } from './i18n.jsx';
import { usePath } from './router.jsx';
import Controller from './Controller.jsx';
import Account from './pages/Account.jsx';
import AuthLink from './pages/AuthLink.jsx';
import Home from './pages/Home.jsx';
import Login from './pages/Login.jsx';
import Scoreboards from './pages/Scoreboards.jsx';

const PAGES = {
    '': Home,
    '/score': Controller,
    '/login': Login,
    '/auth': AuthLink,
    '/account': Account,
    '/scoreboards': Scoreboards,
};

function Router() {
    const path = usePath();
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

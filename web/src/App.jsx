import { AuthProvider } from './auth.jsx';
import { I18nProvider } from './i18n.jsx';
import { usePath } from './router.jsx';
import Controller from './Controller.jsx';
import Account from './pages/Account.jsx';
import AuthLink from './pages/AuthLink.jsx';
import Login from './pages/Login.jsx';
import Scoreboards from './pages/Scoreboards.jsx';

const PAGES = {
    '/login': Login,
    '/auth': AuthLink,
    '/account': Account,
    '/scoreboards': Scoreboards,
};

function Router() {
    const path = usePath();
    // "/" (and any other path) is the scoreboard controller, as before, so old ?room= links keep working.
    const Current = PAGES[path.replace(/\/+$/, '')] || Controller;
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

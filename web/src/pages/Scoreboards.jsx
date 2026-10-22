// My scoreboards. The list itself comes in phase 2; for now it points to the controller.
import { useEffect } from 'react';
import { useAuth } from '../auth.jsx';
import { useI18n } from '../i18n.jsx';
import { Link, navigate } from '../router.jsx';
import { Card, Page } from '../ui.jsx';

export default function Scoreboards() {
    const { t } = useI18n();
    const { user } = useAuth();
    useEffect(() => { if (user === null) navigate('/login'); }, [user]);
    if (!user) return <Page><p className="text-gray-400">{t('common.loading')}</p></Page>;
    return (
        <Page wide>
            <Card title={t('scoreboards.title')}>
                <p className="text-gray-300">{t('scoreboards.soon')}</p>
                <Link to="/score" className="block text-center w-full py-2.5 rounded text-sm font-bold bg-blue-600 hover:bg-blue-500 text-white">{t('scoreboards.open')}</Link>
            </Card>
        </Page>
    );
}

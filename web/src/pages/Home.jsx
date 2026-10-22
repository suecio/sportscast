// The front page: what SportsCast is, log in or sign up, and the iPhone app.
import { useAuth } from '../auth.jsx';
import { useI18n } from '../i18n.jsx';
import { Link } from '../router.jsx';
import { Page } from '../ui.jsx';
import { LoginForm } from './Login.jsx';

export default function Home() {
    const { t } = useI18n();
    const { user } = useAuth();

    const steps = [
        { title: t('home.step1.title'), body: t('home.step1.body') },
        { title: t('home.step2.title'), body: t('home.step2.body') },
        { title: t('home.step3.title'), body: t('home.step3.body') },
    ];
    const features = [
        { title: t('home.feature.sync.title'), body: t('home.feature.sync.body') },
        { title: t('home.feature.youtube.title'), body: t('home.feature.youtube.body') },
        { title: t('home.feature.sports.title'), body: t('home.feature.sports.body') },
        { title: t('home.feature.free.title'), body: t('home.feature.free.body') },
    ];

    return (
        <Page full>
            <section className="max-w-6xl mx-auto px-4 md:px-6 py-10 md:py-16 grid gap-10 md:grid-cols-2 items-center">
                <div className="space-y-6">
                    <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight leading-tight">{t('home.title')}</h1>
                    <p className="text-lg text-gray-300">{t('home.subtitle')}</p>
                    <StreamMockup />
                </div>
                <div className="w-full max-w-md md:ml-auto">
                    {user ? (
                        <section className="bg-[#22262f] border border-[#323844] rounded-lg p-6 space-y-4">
                            <h2 className="text-lg font-bold text-white">{t('home.welcomeBack')}</h2>
                            <p className="text-sm text-gray-400 font-mono">{user.email}</p>
                            <Link to="/scoreboards" className="block text-center w-full py-2.5 rounded text-sm font-bold bg-blue-600 hover:bg-blue-500 text-white">{t('nav.scoreboards')}</Link>
                        </section>
                    ) : user === null ? (
                        <LoginForm />
                    ) : null}
                    <Link to="/score" className="block text-center mt-4 text-sm text-gray-400 hover:text-white underline">{t('home.tryController')}</Link>
                </div>
            </section>

            <section className="bg-[#22262f] border-y border-[#323844]">
                <div className="max-w-6xl mx-auto px-4 md:px-6 py-12">
                    <h2 className="text-2xl font-bold text-white mb-8">{t('home.howTitle')}</h2>
                    <ol className="grid gap-6 md:grid-cols-3">
                        {steps.map((step, i) => (
                            <li key={i} className="space-y-2">
                                <div className="w-9 h-9 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center">{i + 1}</div>
                                <h3 className="font-bold text-white">{step.title}</h3>
                                <p className="text-sm text-gray-400">{step.body}</p>
                            </li>
                        ))}
                    </ol>
                </div>
            </section>

            <section className="max-w-6xl mx-auto px-4 md:px-6 py-12">
                <div className="grid gap-4 sm:grid-cols-2">
                    {features.map((f, i) => (
                        <div key={i} className="bg-[#22262f] border border-[#323844] rounded-lg p-5 space-y-1">
                            <h3 className="font-bold text-white">{f.title}</h3>
                            <p className="text-sm text-gray-400">{f.body}</p>
                        </div>
                    ))}
                </div>
            </section>

            <section className="max-w-6xl mx-auto px-4 md:px-6 pb-12">
                <div className="bg-gradient-to-r from-blue-900 to-[#22262f] border border-[#323844] rounded-lg p-6 md:p-8 flex flex-col md:flex-row gap-6 md:items-center justify-between">
                    <div className="space-y-2">
                        <h2 className="text-2xl font-bold text-white">{t('home.app.title')}</h2>
                        <p className="text-gray-300">{t('home.app.body')}</p>
                    </div>
                    {/* Becomes a link to the App Store when the app is published. */}
                    <div className="shrink-0 inline-flex items-center gap-3 bg-black/60 border border-gray-600 rounded-lg px-5 py-3 text-gray-300" aria-disabled="true">
                        <AppleIcon />
                        <div className="leading-tight">
                            <div className="text-xs">{t('home.app.soon')}</div>
                            <div className="text-lg font-semibold text-white">App Store</div>
                        </div>
                    </div>
                </div>
            </section>

            <footer className="border-t border-[#323844] text-sm text-gray-500">
                <div className="max-w-6xl mx-auto px-4 md:px-6 py-6 flex flex-wrap gap-4 justify-between">
                    <span>© {new Date().getFullYear()} SportsCast</span>
                    <span>{t('home.footer')}</span>
                    <span className="flex gap-4">
                        <Link to="/privacy" className="hover:text-gray-300">{t('legal.privacy')}</Link>
                        <Link to="/terms" className="hover:text-gray-300">{t('legal.terms')}</Link>
                    </span>
                </div>
            </footer>
        </Page>
    );
}

// A phone-shaped picture of a live stream with the scoreboard in the corner.
function StreamMockup() {
    const { t } = useI18n();
    return (
        <div className="relative aspect-video w-full rounded-xl overflow-hidden border border-[#323844] shadow-2xl"
            style={{ background: 'linear-gradient(180deg, #2b3550 0%, #1f2840 52%, #c98a4b 52%, #a9692f 100%)' }}>
            {/* A volleyball net */}
            <div className="absolute left-0 right-0 top-[38%] h-[3px] bg-white/80" />
            <div className="absolute left-0 right-0 top-[38%] h-[18%] opacity-40"
                style={{ backgroundImage: 'linear-gradient(90deg, #fff 1px, transparent 1px), linear-gradient(#fff 1px, transparent 1px)', backgroundSize: '10px 10px' }} />
            <div className="absolute top-3 left-3 flex text-xs md:text-sm font-bold shadow-lg">
                <div className="bg-[#111] text-white">
                    <div className="px-2 py-0.5">HOME</div>
                    <div className="px-2 py-0.5">AWAY</div>
                </div>
                <div className="bg-black text-yellow-400 text-center">
                    <div className="px-1.5 py-0.5">2</div>
                    <div className="px-1.5 py-0.5">1</div>
                </div>
                <div className="text-white text-center">
                    <div className="px-2 py-0.5 bg-blue-600">24</div>
                    <div className="px-2 py-0.5 bg-red-600">22</div>
                </div>
            </div>
            <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-red-600 text-white text-xs font-bold px-2 py-0.5 rounded">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" /> {t('home.live')}
            </div>
        </div>
    );
}

const AppleIcon = () => (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M16.37 12.73c-.02-2.2 1.8-3.26 1.88-3.31-1.03-1.5-2.62-1.7-3.18-1.73-1.35-.14-2.64.8-3.33.8-.69 0-1.74-.78-2.86-.76-1.47.02-2.83.86-3.59 2.17-1.53 2.66-.39 6.6 1.1 8.76.73 1.06 1.6 2.24 2.73 2.2 1.1-.04 1.51-.71 2.84-.71 1.32 0 1.7.71 2.86.69 1.18-.02 1.93-1.07 2.65-2.13.84-1.22 1.18-2.41 1.2-2.47-.03-.01-2.3-.88-2.32-3.51zM14.2 6.27c.6-.73 1.01-1.75.9-2.77-.87.04-1.92.58-2.54 1.31-.56.65-1.05 1.69-.92 2.69.97.07 1.96-.49 2.56-1.23z" />
    </svg>
);

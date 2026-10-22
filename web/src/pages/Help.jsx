// Help page: how the website and the app work, and what the buttons mean. The texts are
// long, so they live here per language instead of in i18n.jsx.
import { useI18n } from '../i18n.jsx';
import { Link } from '../router.jsx';
import { Page } from '../ui.jsx';

const HELP = {
    en: {
        title: 'Help',
        intro: 'SportsCast puts the live score on your match video. You film and stream with the iPhone app, and you keep the score in the app, on another phone, or here on the website. Everything stays in sync.',
        sections: [
            {
                title: 'Getting started',
                steps: [
                    'Log in and open My scoreboards. Create one scoreboard per match and pick the sport.',
                    'On the scoreboard page, set the team names and the match format, and copy the scorer code.',
                    'In the iPhone app, type the scorer code under Cloud Sync and tap Connect.',
                    'In the app, tap Host Broadcast, open Settings (the gear) and paste the stream URL and stream key. With Connect YouTube on the scoreboard page, the site creates the YouTube stream and shows both.',
                    'Tap GO LIVE in the app. Keep the score in the app, or give the scorer link to a helper.',
                ],
            },
            {
                title: 'The scoreboard page',
                items: [
                    ['Scorer code', 'Gives access to the score buttons. Anyone with it can change the score, so only share it with your scorers. You can rename it or make a new one if it leaks.'],
                    ['Display code', 'Shows the scoreboard only, without buttons. Use it for a TV in the hall or for people who want to follow the score.'],
                    ['Private scoreboard', 'Turns off the display link. Only people with the scorer code can see the score.'],
                    ['Match format', 'Best of 3 or 5, points per set, the deciding set, timeouts per set, and whether earlier set scores show all the time or only between sets.'],
                    ['Embed code', 'Code to put the live scoreboard on your club website.'],
                    ['Match report', 'A page with the final result and every set score, to share after the match.'],
                    ['YouTube', 'Connect your YouTube channel once, then create a live stream for each match. The site gives you the server address and stream key for the app.'],
                ],
            },
            {
                title: 'Keeping the score',
                items: [
                    ['+1 and -1', 'Add or take away a point. In volleyball, the team that wins a rally serves next.'],
                    ['Serve', 'Moves the serve dot by hand.'],
                    ['Timeout', 'Uses one timeout and shows a TIMEOUT banner on the stream for 30 seconds. The small bars next to the team name show the timeouts left. The minus button gives one back.'],
                    ['End set', 'Appears when a team has won the set. Saves the set and starts the next one.'],
                    ['SET POINT / MATCH POINT', 'Shown on the stream by itself when a team can win the set or the match with the next point.'],
                    ['On the stream', 'Covers the video with a full-screen card: Starting soon, Break or Match over. Pick Scoreboard to go back to the game.'],
                    ['Undo', 'Takes back the last change.'],
                    ['Reset match', 'Sets everything back to 0, after asking first.'],
                ],
            },
            {
                title: 'The iPhone app',
                text: 'The app has its own help with every icon explained. Tap the question mark on the start screen, or Help and icon guide in the broadcast settings. It also works without internet.',
            },
            {
                title: 'Problems',
                items: [
                    ['The app says to check the stream key', 'YouTube refused the key. Copy it again and check for spaces at the start or end.'],
                    ['The app keeps reconnecting', 'The internet is weak or gone. The app keeps trying for about 3 minutes and continues on the same YouTube stream.'],
                    ['The score does not change on the stream', 'Check that the app shows a green cloud and that everyone uses the same scorer code.'],
                    ['YouTube says live streaming is not enabled', 'Turn it on in YouTube Studio. The first time can take up to 24 hours.'],
                ],
            },
        ],
        contact: 'Still stuck? Email',
    },
    sv: {
        title: 'Hjälp',
        intro: 'SportsCast lägger in det aktuella resultatet i videon från matchen. Du filmar och streamar med iPhone-appen och för poängen i appen, på en annan telefon eller här på webbplatsen. Allt hålls i synk.',
        sections: [
            {
                title: 'Kom igång',
                steps: [
                    'Logga in och öppna Mina resultattavlor. Skapa en resultattavla per match och välj sport.',
                    'På resultattavlans sida anger du lagnamn och matchformat och kopierar koden för att föra resultat.',
                    'I iPhone-appen skriver du koden för att föra resultat under Cloud Sync och trycker på Connect.',
                    'I appen trycker du på Host Broadcast, öppnar inställningarna (kugghjulet) och klistrar in streamadressen och streamnyckeln. Med Anslut YouTube på resultattavlans sida skapar webbplatsen YouTube-sändningen och visar båda.',
                    'Tryck på GO LIVE i appen. För poängen i appen eller ge länken för att föra resultat till en medhjälpare.',
                ],
            },
            {
                title: 'Resultattavlans sida',
                items: [
                    ['Kod för att föra resultat', 'Ger tillgång till poängknapparna. Alla som har den kan ändra resultatet, så dela den bara med dem som för poäng. Du kan byta namn på den eller skapa en ny om den sprids.'],
                    ['Visningskod', 'Visar bara resultattavlan, utan knappar. Använd den till en tv i hallen eller för dem som vill följa resultatet.'],
                    ['Privat resultattavla', 'Stänger av visningslänken. Bara de som har koden för att föra resultat kan se resultatet.'],
                    ['Matchformat', 'Bäst av 3 eller 5, poäng per set, avgörande set, timeouter per set, och om tidigare setresultat visas hela tiden eller bara mellan seten.'],
                    ['Inbäddningskod', 'Kod för att visa den levande resultattavlan på klubbens webbplats.'],
                    ['Matchrapport', 'En sida med slutresultatet och alla setresultat, att dela efter matchen.'],
                    ['YouTube', 'Anslut din YouTube-kanal en gång och skapa sedan en livesändning för varje match. Webbplatsen ger dig serveradressen och streamnyckeln till appen.'],
                ],
            },
            {
                title: 'Föra poäng',
                text: 'Knapparna på poängsidan är på engelska än så länge.',
                items: [
                    ['+1 och -1', 'Lägger till eller tar bort en poäng. I volleyboll servar laget som vinner bollen härnäst.'],
                    ['Serve', 'Flyttar servepricken för hand.'],
                    ['Timeout', 'Använder en timeout och visar en TIMEOUT-banner i sändningen i 30 sekunder. De små strecken bredvid lagnamnet visar hur många timeouter som är kvar. Minusknappen ger tillbaka en.'],
                    ['End set', 'Visas när ett lag har vunnit setet. Sparar setet och startar nästa.'],
                    ['SET POINT / MATCH POINT', 'Visas automatiskt i sändningen när ett lag kan vinna setet eller matchen på nästa poäng.'],
                    ['On the stream', 'Täcker videon med en helskärmsbild: Starting soon (startar snart), Break (paus) eller Match over (matchen är slut). Välj Scoreboard för att gå tillbaka till matchen.'],
                    ['Undo', 'Tar tillbaka den senaste ändringen.'],
                    ['Reset match', 'Sätter allt till 0, efter att först ha frågat.'],
                ],
            },
            {
                title: 'iPhone-appen',
                text: 'Appen har en egen hjälp där varje ikon förklaras. Tryck på frågetecknet på startskärmen, eller på Help and icon guide i sändningsinställningarna. Den fungerar även utan internet.',
            },
            {
                title: 'Problem',
                items: [
                    ['Appen säger att du ska kontrollera streamnyckeln', 'YouTube godkände inte nyckeln. Kopiera den igen och kontrollera att det inte finns mellanslag i början eller slutet.'],
                    ['Appen återansluter hela tiden', 'Internetanslutningen är svag eller borta. Appen försöker i ungefär 3 minuter och fortsätter i samma YouTube-sändning.'],
                    ['Resultatet ändras inte i sändningen', 'Kontrollera att appen visar ett grönt moln och att alla använder samma kod för att föra resultat.'],
                    ['YouTube säger att livesändning inte är aktiverat', 'Aktivera det i YouTube Studio. Första gången kan det ta upp till 24 timmar.'],
                ],
            },
        ],
        contact: 'Fortfarande problem? Mejla',
    },
    es: {
        title: 'Ayuda',
        intro: 'SportsCast pone el marcador en vivo en el video de tu partido. Grabas y transmites con la app del iPhone, y llevas el marcador en la app, en otro teléfono o aquí en la web. Todo se mantiene sincronizado.',
        sections: [
            {
                title: 'Primeros pasos',
                steps: [
                    'Inicia sesión y abre Mis marcadores. Crea un marcador para cada partido y elige el deporte.',
                    'En la página del marcador, pon los nombres de los equipos y el formato del partido, y copia el código para marcar.',
                    'En la app del iPhone, escribe el código para marcar en Cloud Sync y toca Connect.',
                    'En la app, toca Host Broadcast, abre los ajustes (el engranaje) y pega la dirección y la clave de transmisión. Con Conectar YouTube en la página del marcador, la web crea la transmisión de YouTube y te muestra las dos.',
                    'Toca GO LIVE en la app. Lleva el marcador en la app o dale el enlace para marcar a un ayudante.',
                ],
            },
            {
                title: 'La página del marcador',
                items: [
                    ['Código para marcar', 'Da acceso a los botones del marcador. Cualquiera que lo tenga puede cambiar el resultado, así que compártelo solo con quienes llevan el marcador. Puedes cambiarle el nombre o crear uno nuevo si se filtra.'],
                    ['Código para ver', 'Muestra solo el marcador, sin botones. Úsalo para una pantalla en el pabellón o para quien quiera seguir el resultado.'],
                    ['Marcador privado', 'Desactiva el enlace para ver. Solo quienes tienen el código para marcar pueden ver el resultado.'],
                    ['Formato del partido', 'Al mejor de 3 o 5, puntos por set, set decisivo, tiempos muertos por set, y si los resultados de sets anteriores se ven siempre o solo entre sets.'],
                    ['Código para insertar', 'Código para mostrar el marcador en vivo en la web de tu club.'],
                    ['Informe del partido', 'Una página con el resultado final y el resultado de cada set, para compartir después del partido.'],
                    ['YouTube', 'Conecta tu canal de YouTube una vez y luego crea una transmisión en vivo para cada partido. La web te da la dirección del servidor y la clave de transmisión para la app.'],
                ],
            },
            {
                title: 'Llevar el marcador',
                text: 'Por ahora, los botones de la página del marcador están en inglés.',
                items: [
                    ['+1 y -1', 'Suma o resta un punto. En vóleibol, el equipo que gana el punto saca a continuación.'],
                    ['Serve', 'Mueve a mano el punto que indica quién saca.'],
                    ['Timeout', 'Usa un tiempo muerto y muestra un aviso de TIMEOUT en la transmisión durante 30 segundos. Las barritas junto al nombre del equipo muestran los tiempos muertos que quedan. El botón de menos devuelve uno.'],
                    ['End set', 'Aparece cuando un equipo ha ganado el set. Guarda el set y empieza el siguiente.'],
                    ['SET POINT / MATCH POINT', 'Aparece solo en la transmisión cuando un equipo puede ganar el set o el partido con el siguiente punto.'],
                    ['On the stream', 'Cubre el video con una pantalla completa: Starting soon (empieza pronto), Break (descanso) o Match over (fin del partido). Elige Scoreboard para volver al partido.'],
                    ['Undo', 'Anula el último cambio.'],
                    ['Reset match', 'Pone todo a 0, después de preguntar.'],
                ],
            },
            {
                title: 'La app del iPhone',
                text: 'La app tiene su propia ayuda con cada icono explicado. Toca el signo de interrogación en la pantalla de inicio, o Help and icon guide en los ajustes de la transmisión. También funciona sin internet.',
            },
            {
                title: 'Problemas',
                items: [
                    ['La app dice que revises la clave de transmisión', 'YouTube rechazó la clave. Cópiala otra vez y revisa que no haya espacios al principio o al final.'],
                    ['La app se reconecta una y otra vez', 'La conexión a internet es débil o se perdió. La app lo intenta durante unos 3 minutos y sigue en la misma transmisión de YouTube.'],
                    ['El resultado no cambia en la transmisión', 'Revisa que la app muestre una nube verde y que todos usen el mismo código para marcar.'],
                    ['YouTube dice que la transmisión en vivo no está activada', 'Actívala en YouTube Studio. La primera vez puede tardar hasta 24 horas.'],
                ],
            },
        ],
        contact: '¿Sigues con problemas? Escribe a',
    },
};

const CONTACT = 'admin@sportscast.cc';

export default function Help() {
    const { lang } = useI18n();
    const help = HELP[lang] || HELP.en;
    return (
        <Page wide>
            <article className="space-y-6 text-gray-300 leading-relaxed">
                <h1 className="text-2xl font-bold text-white">{help.title}</h1>
                <p>{help.intro}</p>
                {help.sections.map((section) => (
                    <section key={section.title} className="bg-[#22262f] border border-[#323844] rounded-lg p-6 space-y-3">
                        <h2 className="text-lg font-bold text-white">{section.title}</h2>
                        {section.text && <p>{section.text}</p>}
                        {section.steps && (
                            <ol className="list-decimal pl-6 space-y-2">
                                {section.steps.map((step) => <li key={step}>{step}</li>)}
                            </ol>
                        )}
                        {section.items && (
                            <dl className="space-y-3">
                                {section.items.map(([term, text]) => (
                                    <div key={term}>
                                        <dt className="font-semibold text-white">{term}</dt>
                                        <dd className="text-sm text-gray-400">{text}</dd>
                                    </div>
                                ))}
                            </dl>
                        )}
                    </section>
                ))}
                <p className="text-sm text-gray-400">
                    {help.contact} <a href={`mailto:${CONTACT}`} className="text-blue-400 underline">{CONTACT}</a>. <Link to="/privacy" className="underline">Privacy</Link>
                </p>
            </article>
        </Page>
    );
}

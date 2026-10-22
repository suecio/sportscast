// Privacy policy and terms of use. Google requires both before an app may use YouTube
// sign-in for the public. English only for now.
import { Link } from '../router.jsx';
import { Page } from '../ui.jsx';

const UPDATED = '22 October 2026';
const CONTACT = 'admin@sportscast.cc';

function Doc({ title, children }) {
    return (
        <Page wide>
            <article className="space-y-4 text-gray-300 leading-relaxed [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-white [&_h2]:pt-4 [&_a]:text-blue-400 [&_a]:underline [&_ul]:list-disc [&_ul]:pl-6 [&_li]:mt-1">
                <h1 className="text-2xl font-bold text-white">{title}</h1>
                <p className="text-sm text-gray-500">Last updated: {UPDATED}</p>
                {children}
            </article>
        </Page>
    );
}

export function Privacy() {
    return (
        <Doc title="Privacy policy">
            <p>SportsCast (sportscast.cc and the SportsCast iPhone app) lets you stream a match with the live score on the video. This page explains what we store about you and why. Questions: <a href={`mailto:${CONTACT}`}>{CONTACT}</a>.</p>

            <h2>What we store</h2>
            <ul>
                <li><b>Your account:</b> email address, password (only as a one-way hash, never the password itself) and chosen language.</li>
                <li><b>Logins:</b> a session cookie that keeps you logged in for up to 30 days, and the emailed login links, which work once and expire after 15 minutes. With each link we store the IP address it was asked from, only to stop spam and abuse.</li>
                <li><b>Your scoreboards:</b> title, sport, match format, codes, team names and the score.</li>
                <li><b>If you connect YouTube:</b> your YouTube channel ID and name, the sign-in tokens Google gives us, and for each stream you create the YouTube broadcast ID, server address and stream key. Tokens and stream keys are stored encrypted.</li>
            </ul>
            <p>We do not use advertising, tracking or analytics cookies, and we do not sell or rent your data.</p>

            <h2>YouTube and Google</h2>
            <p>SportsCast uses YouTube API Services. When you press "Connect YouTube", Google asks you to allow SportsCast to manage your YouTube account. We use this access only to:</p>
            <ul>
                <li>read your channel name, so you can see which channel is connected;</li>
                <li>create, show and delete the live broadcasts and live streams you ask for on SportsCast.</li>
            </ul>
            <p>We do not read, change or delete your videos, comments, playlists or subscribers, and we do not share data from your Google account with anyone. SportsCast's use and transfer of information received from Google APIs will adhere to the <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noreferrer">Google API Services User Data Policy</a>, including the Limited Use requirements.</p>
            <p>By connecting YouTube you also agree to the <a href="https://www.youtube.com/t/terms" target="_blank" rel="noreferrer">YouTube Terms of Service</a>, and Google's handling of your data is covered by the <a href="https://policies.google.com/privacy" target="_blank" rel="noreferrer">Google Privacy Policy</a>.</p>
            <p>You can remove SportsCast's access at any time with "Disconnect" on a scoreboard page, or in your Google account at <a href="https://myaccount.google.com/permissions" target="_blank" rel="noreferrer">myaccount.google.com/permissions</a>. When you disconnect, we delete the stored tokens and ask Google to cancel them.</p>

            <h2>Who processes the data for us</h2>
            <ul>
                <li><b>Cloudflare</b> hosts the website, the live score and the database.</li>
                <li><b>Resend</b> sends the login emails (from servers in the EU).</li>
                <li><b>Google / YouTube</b>, only if you connect YouTube.</li>
            </ul>

            <h2>How long we keep it</h2>
            <p>Your data stays until you delete it. Deleting a scoreboard deletes its score, codes and stored YouTube stream. Deleting your account (on the Account page) deletes your account, logins, scoreboards and YouTube connection.</p>

            <h2>Your rights</h2>
            <p>You can ask to see, correct, export or delete your data, or object to how we use it, by emailing <a href={`mailto:${CONTACT}`}>{CONTACT}</a>. If you live in the EU, you can also complain to your data protection authority (in Sweden: IMY).</p>

            <h2>Cookies</h2>
            <p>We use one cookie to keep you logged in (sc_session) and, only while you connect YouTube, a short-lived cookie that protects that sign-in (sc_youtube_state). Your language choice is kept in your browser.</p>

            <h2>Changes</h2>
            <p>If we change this policy we update the date above, and tell account holders by email about important changes.</p>
            <p><Link to="/terms">Terms of use</Link></p>
        </Doc>
    );
}

export function Terms() {
    return (
        <Doc title="Terms of use">
            <p>These terms apply when you use SportsCast (sportscast.cc and the SportsCast iPhone app). By creating an account or using the service you accept them. Questions: <a href={`mailto:${CONTACT}`}>{CONTACT}</a>.</p>

            <h2>The service</h2>
            <p>SportsCast is in an early test phase (beta) and is free during that time. It is provided as it is: features can change, and we cannot promise that it always works or that a stream or score is never lost. Don't rely on it as the only record of a result.</p>

            <h2>Your account</h2>
            <p>Keep your password and your scorer codes to yourself. Anyone with a scorer code can change that scoreboard's score, so give it only to people you trust, and make a new code if it leaks.</p>

            <h2>What you stream</h2>
            <p>You are responsible for what you film and stream. Make sure you are allowed to: get permission from the venue, the teams and the people you film (for children, from their parents or club), and don't stream music or other material you don't have the rights to. Streams on YouTube must follow the <a href="https://www.youtube.com/t/terms" target="_blank" rel="noreferrer">YouTube Terms of Service</a> and YouTube's Community Guidelines.</p>

            <h2>Not allowed</h2>
            <ul>
                <li>Using SportsCast for anything illegal, hateful or harmful.</li>
                <li>Trying to get into other people's accounts or scoreboards, or overloading or attacking the service.</li>
            </ul>
            <p>We may close accounts that break these rules.</p>

            <h2>Liability</h2>
            <p>As far as the law allows, SportsCast is not liable for indirect losses, lost streams, lost results or lost income. Nothing in these terms limits rights you have as a consumer under the law.</p>

            <h2>Changes and ending</h2>
            <p>We may update these terms and will tell account holders about important changes. You can stop using SportsCast and delete your account at any time on the Account page.</p>
            <p><Link to="/privacy">Privacy policy</Link></p>
        </Doc>
    );
}

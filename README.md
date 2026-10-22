# SportsCast

Live scoreboard for sports streams. The iPhone app (suecio/sportscast-ios) burns the
score into the video; this repo is the website and the Cloudflare Worker.

## What is where

| Folder | What |
|---|---|
| `web/` | The website (Vite + React + Tailwind): front page, login, account, My scoreboards, scoreboard admin, scorer (controller) and display pages |
| `worker/src/` | The Worker: `/api` for accounts (`auth.js`) and scoreboards (`boards.js`), live score rooms (`room.js`, one Durable Object per room) |
| `wrangler.toml` | Worker settings: website files, rooms, D1 database |
| `docs/PROTOCOL.md` | The live score messages between website and app |
| `index.html` | The old one-file website, still served by Cloudflare Pages at sportscast-5iv.pages.dev. Delete once sportscast.cc is in use |

One Worker serves everything at sportscast.cc, scorer.sportscast.cc and
scoreboard.sportscast.cc: the website, `/api/*`, and websocket rooms at `/<CODE>`.
A scoreboard's scorer code opens its room with write access, its display code
read-only (refused while the scoreboard is private). Any other code is an open room
without an account, so the current app (`wss://sportscast-server.suecio.workers.dev/<CODE>`)
works with both.

## Deploy

Cloudflare builds and deploys the Worker from GitHub (Workers Builds) on every push to main:
build command `npm ci && npm run build`, deploy command `npx wrangler deploy`.

The Worker needs the secret `RESEND_API_KEY` (Settings, Variables and Secrets). The D1
tables are created by the Worker on first use.

"Connect YouTube" needs three more secrets: `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`
(an OAuth client of type "Web application" in Google Cloud, with the YouTube Data API v3
turned on and the redirect URI `https://sportscast.cc/api/youtube/callback`), and
`TOKEN_KEY`, a long random string used to encrypt YouTube tokens and stream keys in the
database. Changing `TOKEN_KEY` later makes the stored ones unreadable (users connect again).
Without these, the scoreboard page says YouTube isn't set up.

## Run on your own computer

    npm install
    npm run dev:worker     # builds the site and runs everything at http://localhost:8787

Without `RESEND_API_KEY`, login links are printed in the terminal instead of emailed.
For live reload while changing the website, run `npx wrangler dev` in one terminal and
`npm run dev` in another (http://localhost:5173, /api goes to the Worker).

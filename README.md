# SportsCast

Live scoreboard for sports streams. The iPhone app (suecio/sportscast-ios) burns the
score into the video; this repo is the website and the Cloudflare Worker.

## What is where

| Folder | What |
|---|---|
| `web/` | The website (Vite + React + Tailwind): scoreboard controller, login, account settings |
| `worker/src/` | The Worker: `/api` for accounts (`auth.js`), live score rooms (`room.js`, one Durable Object per room) |
| `wrangler.toml` | Worker settings: website files, rooms, D1 database |
| `docs/PROTOCOL.md` | The live score messages between website and app |
| `index.html` | The old one-file website, still served by Cloudflare Pages at sportscast-5iv.pages.dev. Delete once sportscast.cc is in use |

One Worker serves everything at sportscast.cc: the website, `/api/*`, and websocket
rooms at `/<ROOM>` (the app keeps using `wss://sportscast-server.suecio.workers.dev/<ROOM>`).

## Deploy

Cloudflare builds and deploys the Worker from GitHub (Workers Builds) on every push to main:
build command `npm ci && npm run build`, deploy command `npx wrangler deploy`.

The Worker needs the secret `RESEND_API_KEY` (Settings, Variables and Secrets). The D1
tables are created by the Worker on first use.

## Run on your own computer

    npm install
    npm run dev:worker     # builds the site and runs everything at http://localhost:8787

Without `RESEND_API_KEY`, login links are printed in the terminal instead of emailed.
For live reload while changing the website, run `npx wrangler dev` in one terminal and
`npm run dev` in another (http://localhost:5173, /api goes to the Worker).

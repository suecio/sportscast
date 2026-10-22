// /api for scoreboards: list, create, change, delete, and the public lookup by code.
//
// A scoreboard's live score is a room (one Durable Object) named "sb:<id>". Devices
// reach it with a code instead of the id, so the codes can be renamed or replaced
// without losing the score.

import { ApiError, json, requireUser } from "./auth.js";
import { newId } from "./crypto.js";
import { deleteBoardStream } from "./youtube.js";

const SPORTS = ["volleyball", "baseball", "basic"];
// Letters and digits that are hard to mix up when read aloud or typed (no 0/O, 1/I/L).
const CODE_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const CODE_PATTERN = /^[A-Z0-9-]{4,24}$/;
// The scorer code gives write access, so it must not be easy to guess.
const MIN_SCORER_CODE = 6;
const MAX_TITLE = 80;
// Free plan. A paid plan raises this later (a column on users).
const MAX_BOARDS = 5;

// Volleyball match format. Indoor best of 5 is the default.
const DEFAULT_FORMAT = { bestOf: 5, pointsPerSet: 25, decidingSetPoints: 15, maxTimeouts: 2, showSets: true };
const FORMAT_LIMITS = {
  bestOf: [1, 7],
  pointsPerSet: [5, 99],
  decidingSetPoints: [5, 99],
  maxTimeouts: [0, 5],
};

function cleanFormat(value) {
  if (!value || typeof value !== "object") throw new ApiError(400, "bad_format");
  const format = {};
  for (const [key, [min, max]] of Object.entries(FORMAT_LIMITS)) {
    const n = Number(value[key]);
    if (!Number.isInteger(n) || n < min || n > max) throw new ApiError(400, "bad_format");
    format[key] = n;
  }
  // "Best of" needs an odd number, so one team always wins.
  if (format.bestOf % 2 === 0) throw new ApiError(400, "bad_format");
  // Show the past set scores on the graphic all the time (true), or only between sets (false).
  format.showSets = value.showSets !== false;
  return format;
}

function readFormat(row) {
  try {
    return { ...DEFAULT_FORMAT, ...JSON.parse(row.format || "{}") };
  } catch {
    return { ...DEFAULT_FORMAT };
  }
}

// Sends the sport and format to the live score, so devices that are scoring now get them too.
async function pushSettings(env, row) {
  const settings = { sport: row.sport, volleyball: readFormat(row) };
  await env.ROOMS.get(env.ROOMS.idFromName(roomName(row.id)))
    .fetch("https://room/settings", { method: "POST", body: JSON.stringify(settings) });
}

export const roomName = (boardId) => `sb:${boardId}`;

function randomCode(length) {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, (b) => CODE_CHARS[b % CODE_CHARS.length]).join("");
}

const cleanCode = (value) => String(value || "").trim().toUpperCase().replace(/\s+/g, "-");

function cleanTitle(value) {
  const title = String(value || "").trim().slice(0, MAX_TITLE);
  if (!title) throw new ApiError(400, "title_missing");
  return title;
}

function cleanSport(value) {
  if (!SPORTS.includes(value)) throw new ApiError(400, "bad_sport");
  return value;
}

const publicBoard = (row) => ({
  id: row.id,
  title: row.title,
  sport: row.sport,
  scorerCode: row.scorer_code,
  displayCode: row.display_code,
  private: Boolean(row.private),
  format: readFormat(row),
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

// True when no scoreboard other than `exceptId` uses the code, as either kind.
async function codeIsFree(env, code, exceptId = "") {
  const row = await env.DB.prepare(
    "SELECT id FROM scoreboards WHERE (scorer_code = ? OR display_code = ?) AND id != ? LIMIT 1"
  )
    .bind(code, code, exceptId)
    .first();
  return !row;
}

async function freeRandomCode(env, length) {
  for (let i = 0; i < 10; i++) {
    const code = randomCode(length);
    if (await codeIsFree(env, code)) return code;
  }
  throw new ApiError(500, "server_error");
}

async function ownBoard(env, user, id) {
  const row = await env.DB.prepare("SELECT * FROM scoreboards WHERE id = ? AND owner_id = ?").bind(id, user.id).first();
  if (!row) throw new ApiError(404, "board_not_found");
  return row;
}

async function listBoards(request, env, user) {
  const { results } = await env.DB.prepare("SELECT * FROM scoreboards WHERE owner_id = ? ORDER BY created_at DESC")
    .bind(user.id)
    .all();
  return json({ boards: results.map(publicBoard), limit: MAX_BOARDS });
}

async function createBoard(request, env, user, body) {
  const title = cleanTitle(body.title);
  const sport = cleanSport(body.sport);
  const count = await env.DB.prepare("SELECT COUNT(*) AS n FROM scoreboards WHERE owner_id = ?").bind(user.id).first("n");
  if (count >= MAX_BOARDS) throw new ApiError(400, "board_limit");
  const now = Date.now();
  const row = {
    id: newId(),
    owner_id: user.id,
    title,
    sport,
    scorer_code: await freeRandomCode(env, 8),
    display_code: await freeRandomCode(env, 6),
    private: body.private ? 1 : 0,
    format: JSON.stringify(body.format ? cleanFormat(body.format) : DEFAULT_FORMAT),
    created_at: now,
    updated_at: now,
  };
  await env.DB.prepare(
    "INSERT INTO scoreboards (id, owner_id, title, sport, scorer_code, display_code, private, format, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
  )
    .bind(row.id, row.owner_id, row.title, row.sport, row.scorer_code, row.display_code, row.private, row.format, now, now)
    .run();
  await pushSettings(env, row);
  return json({ board: publicBoard(row) });
}

async function getBoard(request, env, user, body, id) {
  return json({ board: publicBoard(await ownBoard(env, user, id)) });
}

// Changes any of: title, sport, private, format, scorerCode, displayCode.
// A code of "new" makes a fresh random one (for when a code has leaked).
async function updateBoard(request, env, user, body, id) {
  const row = await ownBoard(env, user, id);
  if (body.title !== undefined) row.title = cleanTitle(body.title);
  if (body.sport !== undefined) row.sport = cleanSport(body.sport);
  if (body.private !== undefined) row.private = body.private ? 1 : 0;
  const oldSettings = row.sport + (row.format || "");
  if (body.format !== undefined) row.format = JSON.stringify(cleanFormat(body.format));

  for (const [field, column, minLength, randomLength] of [
    ["scorerCode", "scorer_code", MIN_SCORER_CODE, 8],
    ["displayCode", "display_code", 4, 6],
  ]) {
    if (body[field] === undefined) continue;
    if (body[field] === "new") {
      row[column] = await freeRandomCode(env, randomLength);
      continue;
    }
    const code = cleanCode(body[field]);
    if (code === row[column]) continue;
    if (!CODE_PATTERN.test(code)) throw new ApiError(400, "bad_code");
    if (code.length < minLength) throw new ApiError(400, "scorer_code_too_short");
    if (!(await codeIsFree(env, code, row.id))) throw new ApiError(409, "code_taken");
    row[column] = code;
  }
  if (row.scorer_code === row.display_code) throw new ApiError(409, "code_taken");

  row.updated_at = Date.now();
  try {
    await env.DB.prepare(
      "UPDATE scoreboards SET title = ?, sport = ?, private = ?, format = ?, scorer_code = ?, display_code = ?, updated_at = ? WHERE id = ?"
    )
      .bind(row.title, row.sport, row.private, row.format, row.scorer_code, row.display_code, row.updated_at, row.id)
      .run();
  } catch (err) {
    // Two people taking the same code at the same moment.
    if (String(err).includes("UNIQUE")) throw new ApiError(409, "code_taken");
    throw err;
  }
  if (row.sport + (row.format || "") !== oldSettings) await pushSettings(env, row);
  return json({ board: publicBoard(row) });
}

async function deleteBoard(request, env, user, body, id) {
  const row = await ownBoard(env, user, id);
  await deleteBoardStream(env, user.id, row.id);
  await env.DB.prepare("DELETE FROM scoreboards WHERE id = ?").bind(row.id).run();
  // Clear the live score, so the room is empty if the id were ever reused.
  await env.ROOMS.get(env.ROOMS.idFromName(roomName(row.id))).fetch("https://room/reset", { method: "POST" });
  return json({ ok: true });
}

// What a code opens: access "write" (scorer code), "read" (display code) or "private"
// (display code of a private scoreboard, which opens nothing). Needs no login.
export async function findByCode(env, rawCode) {
  const code = cleanCode(rawCode);
  if (!CODE_PATTERN.test(code)) return null;
  const row = await env.DB.prepare("SELECT * FROM scoreboards WHERE scorer_code = ? OR display_code = ?")
    .bind(code, code)
    .first();
  if (!row) return null;
  if (row.scorer_code === code) return { row, access: "write" };
  return { row, access: row.private ? "private" : "read" };
}

async function lookupCode(request, env, body, code) {
  const found = await findByCode(env, code);
  if (!found) throw new ApiError(404, "code_not_found");
  if (found.access === "private") throw new ApiError(403, "board_private");
  return json({ title: found.row.title, sport: found.row.sport, access: found.access });
}

// "METHOD /api/path" patterns; ":id" and ":code" are passed to the handler.
export const BOARD_ROUTES = [
  ["GET", /^\/api\/boards$/, listBoards, true],
  ["POST", /^\/api\/boards$/, createBoard, true],
  ["GET", /^\/api\/boards\/([\w-]+)$/, getBoard, true],
  ["POST", /^\/api\/boards\/([\w-]+)$/, updateBoard, true],
  ["POST", /^\/api\/boards\/([\w-]+)\/delete$/, deleteBoard, true],
  ["GET", /^\/api\/code\/([\w-]+)$/, lookupCode, false],
];

export async function handleBoardRoute(request, env, body, route, param) {
  const [, , handler, needsUser] = route;
  if (!needsUser) return handler(request, env, body, param);
  const user = await requireUser(request, env);
  return handler(request, env, user, body, param);
}


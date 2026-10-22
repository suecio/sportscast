# SportsCast sync protocol (v2)

All devices in a room (website, iPad, iPhone) connect to the Cloudflare worker at
`wss://<worker>/<ROOM>` and exchange JSON text messages. The worker relays each
message to the other devices in the same room. The worker code is in `worker/`: each room
is one Durable Object, and it remembers the latest state (`v` 2) so a device that joins
gets the score right away, as a `"sync"` message.

## State message

Every change sends the full game state:

```json
{
  "v": 2,
  "rev": 42,
  "from": "web-k3j2h1",
  "sport": "volleyball",
  "homeName": "HOME",
  "awayName": "AWAY",
  "home": 18,
  "away": 21,
  "volleyball": {
    "bestOf": 5,
    "pointsPerSet": 25,
    "decidingSetPoints": 15,
    "setsHome": 1,
    "setsAway": 1,
    "pastSets": [[25, 21], [19, 25]],
    "serving": "away",
    "timeoutsHome": 1,
    "timeoutsAway": 0,
    "maxTimeouts": 2,
    "finished": false
  },
  "baseball": { "b1": false, "b2": true, "b3": false, "balls": 1, "strikes": 2, "outs": 1, "inning": 4, "top": true }
}
```

- `home` / `away` are the points in the current set (volleyball) or the runs/score (other sports).
- `sport` is shared, so every device shows the same sport.
- `kind` is `"change"` when someone pressed a button, and `"sync"` when a device is only
  sharing its current state (on connect, answering hello, keep-alive). Missing means `"sync"`.
- `rev` goes up by 1 on every change. Each device counts on its own, so counters can differ.
  - A `"change"` is always accepted, unless its `rev` is not higher than the last `rev` seen
    from that same `from` (a late copy).
  - A `"sync"` is only accepted when its `rev` is higher than our own (ties are broken by
    comparing `from` as strings). This stops a device with an old saved score from
    overwriting the room when it connects.
  - After accepting, a device keeps `rev = max(own rev, incoming rev)`, so its next change
    is newer for everyone.
- Missing fields keep their current value. They never reset to 0.
- A new sport adds its own sub-object (like `volleyball`) and does not change the others.

## Hello message

```json
{ "type": "hello", "from": "web-k3j2h1" }
```

Sent when a device connects. Every other device answers by sending its current state,
so a device that joins or reconnects gets the score right away.

## Volleyball rules

- +1 point: that team now serves (rally scoring). No points can be added once a set is won.
- A set is won at `pointsPerSet` (or `decidingSetPoints` in the last possible set) with a 2 point lead.
  The scorer confirms with "End set": the score goes to `pastSets`, sets won go up, points and timeouts reset.
- The match is finished when a team has won `ceil(bestOf / 2)` sets.

## Old format (temporary)

The current iOS app sends flat fields with no `v` (`home`, `away`, `b1`, `b2`, `b3`, `balls`,
`strikes`, `outs`, `inning`, `top`, `homeName`, `awayName`). The website still reads these, and
also adds the same flat baseball fields to its v2 messages so the current app keeps working.
Remove this once the app speaks v2.

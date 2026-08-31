# FitUI

A gamified, mobile-first fitness app. Real-world training, nutrition and body
progress drive visible in-app progression.

The repository has two independent workspaces. They share no code and are
coupled only by an HTTP contract — each runs, installs and fails on its own.

```
FitUI/
├── backend/     Node + Express 5 API over Neon (serverless Postgres)
└── mobile/      Expo / React Native app (Expo SDK 54, RN 0.81)
```

---

## Prerequisites

| Need | Version | Notes |
|---|---|---|
| Node.js | 20 LTS or newer | `node -v` |
| npm | 10+ | ships with Node |
| A Neon Postgres database | — | free tier is fine; you need its connection string |
| Expo Go | latest | on the phone you'll test with, same Wi-Fi as your computer |

No global CLI install is needed — `npx expo` uses the local package.

---

## First-time setup

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env      # then fill it in (see below)
```

`backend/.env` needs three values:

```
PORT=5001
DATABASE_URL=postgres://...        # from the Neon dashboard
JWT_SECRET=<64+ random characters> # see below
```

Generate a real secret rather than typing one:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

The server refuses to start if `DATABASE_URL` or `JWT_SECRET` is missing, and
tells you which one — that's `validateEnv()` in `server.js` doing its job.

### 2. Mobile

```bash
cd mobile
npm install
cp .env.example .env
```

`mobile/.env` needs one value, and it must be your computer's **LAN IP**, not
`localhost` — the phone running Expo Go is a different device and `localhost`
would point at the phone itself:

```
EXPO_PUBLIC_API_URL=http://192.168.1.23:5001/api
```

Find your LAN IP with `ipconfig` on Windows (look for IPv4 Address on your
active Wi-Fi adapter) or `ifconfig | grep inet` on macOS/Linux.

---

## Running

Two terminals. The backend does not need the app, and the app will start
without the backend (it just can't log in).

**Backend**

```bash
cd backend
npm run dev      # nodemon, restarts on save
# or
npm start        # plain node, no watch
```

Expect:

```
Database initialized successfully
Server is running on PORT: 5001
```

Verify independently, without the app:

```bash
curl http://localhost:5001/
# {"message":"FitUI backend running"}
```

**Mobile**

```bash
cd mobile
npx expo start          # then scan the QR code with Expo Go
npx expo start --android
npx expo start --ios
npx expo start --web
```

---

## Gotchas worth knowing before you lose an hour to them

**Changing `mobile/.env` requires a cache-clearing restart.** `EXPO_PUBLIC_*`
variables are inlined into the bundle at build time, not read at runtime. After
editing them:

```bash
npx expo start -c
```

**Windows Firewall commonly blocks the phone from reaching port 5001.** If the
backend responds to `curl` on your computer but the app shows "Network request
failed", this is almost always why. Allow Node through the firewall for private
networks, or temporarily test with `npx expo start --tunnel`.

**Phone and computer must be on the same Wi-Fi network.** Guest networks and
client-isolation settings on routers will silently break this.

**`npm install` in the wrong folder.** There is no root `package.json` — always
install inside `backend/` or `mobile/`.

---

## Database

The schema is currently created by `initdb()` in `backend/server.js`, which runs
a set of `CREATE TABLE IF NOT EXISTS` statements on every boot. Tables:
`users`, `workouts`, `workout_exercises`, `progress_logs`, `meals`.

**There is no migration system yet, and this matters.** `CREATE TABLE IF NOT
EXISTS` can only ever create a table that is absent — once a table exists, the
statement is a no-op. Adding a column, changing a `CHECK`, or adding an index by
editing `initdb()` will appear to work and will silently do nothing.

Until a migration runner exists, **schema changes must be applied by hand in the
Neon SQL editor** and mirrored into `initdb()` so a fresh database still builds
correctly. A proper numbered-migration runner arrives in P3, immediately before
the first real schema change.

---

## Development workflow

`main` always runs. Work happens on a branch per phase, merged when the phase is
demonstrably working.

```bash
git checkout -b phase/p1-design-system
# ... work, committing at each state that runs ...
git checkout main
git merge phase/p1-design-system
git tag p1-design-system
```

Tag at the end of every phase. Tags give you a named point to return to when a
later phase goes wrong — `git diff p1-design-system` is far more useful than
scrolling history.

**Rules that keep this safe:**

1. **Never commit a `.env`.** Three `.gitignore` files guard this. If you ever
   see `.env` in `git status`, stop and fix the ignore before committing.
2. **Commit whenever the app runs**, not when a feature is finished. Small
   commits are what make a bad afternoon recoverable.
3. **One phase per branch.** Don't start P2 work on the P1 branch.
4. **Before merging to `main`:** the backend starts, the app loads, and you can
   log in and see your data. That's the whole bar.
5. **If secrets ever do get committed**, rotating the credential is the fix.
   Removing the file in a later commit does not remove it from history.

---

## Documentation

| Document | What's in it |
|---|---|
| `docs/api-contract.md` | Every endpoint, its shape, and who calls it |
| Project docs in Claude | Architecture baseline, product/technical alignment, phased implementation plan |

---

## Licence

See `mobile/LICENSE`.

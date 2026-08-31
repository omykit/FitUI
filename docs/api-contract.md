# FitUI API Contract

Baseline captured at P0. Describes the API **as it exists today** — this is a
record, not a specification of what it should become.

- Base URL: `EXPO_PUBLIC_API_URL`, e.g. `http://192.168.1.23:5001/api`
- All request and response bodies are JSON.
- Authenticated routes require `Authorization: Bearer <accessToken>`.

## Conventions

**Success** responses return the resource under a named key
(`{ "workout": {...} }`, `{ "meals": [...] }`), usually with a `message`.

**Errors** are always `{ "error": "..." }`. Validation failures add a details
array:

```json
{ "error": "Validation failed", "details": ["title is required", "difficulty must be beginner, intermediate, or advanced"] }
```

The mobile client (`api/client.js`) surfaces `details.join('\n')` when present
and falls back to `error`. Any new endpoint should keep this shape — every
screen's error handling depends on it.

**Status codes in use:** 200, 201, 204 (delete), 400 (validation), 401 (auth),
404 (not found or not yours), 409 (duplicate email), 500.

**Ownership:** every authenticated query filters on the token's user. A valid ID
belonging to someone else returns **404**, not 403 — the API does not reveal
that the row exists.

---

## Authentication

Tokens are HS256 JWTs carrying `{ sub: <userId>, email }`, valid **7 days**.
The middleware verifies the signature and then **re-reads the user row from the
database** on every request, so a deleted user is rejected immediately and the
token never carries stale profile data.

There is no refresh token and no server-side revocation. Logout is client-side
only — the token remains valid until it expires.

---

## Endpoints

### Health

| | |
|---|---|
| `GET /` | Not under `/api`. Returns `{ "message": "FitUI backend running" }`. Useful for verifying the backend independently of the app. |

### Auth — `/api/auth`

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/signup` | — | `{ username, email, password, weight?, height?, goal? }` → `201 { message, user, accessToken }`. Password min 8 chars, bcrypt cost 12. Email lowercased. Duplicate → 409. |
| POST | `/login` | — | `{ email, password }` → `200 { message, user, accessToken }`. Wrong email and wrong password both return the same 401. |
| GET | `/me` | Bearer | `200 { user }`. Called on app launch to restore the session. |

The `user` object throughout: `{ id, username, email, weight, height, goal, created_at }`.
Password is never returned.

### Profile

| Method | Path | Auth | Notes |
|---|---|---|---|
| PUT | `/api/profile` | Bearer | Partial update of `weight`, `height`, `goal`. At least one required. **Not called by the app.** Defined inline in `server.js` rather than in a router module — the one route that breaks the pattern. |

### Workouts — `/api/workouts`

Workout **templates** with nested exercises. Note these describe a workout that
was *defined*, not one that was *performed* — there is no session or completion
concept in the API today.

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/` | Bearer | Creates workout + exercises atomically in one transaction (CTE + `jsonb_to_recordset`). |
| GET | `/` | Bearer | All of the user's workouts with exercises aggregated, `created_at DESC`. No pagination. |
| GET | `/:id` | Bearer | Single workout with exercises. **Not called by the app.** |
| PUT | `/:id` | Bearer | Partial update. Sending `exercises` replaces the whole set; omitting it leaves them untouched. **Not called by the app.** |
| DELETE | `/:id` | Bearer | `204`. Cascades to exercises. |

Create body:

```json
{
  "title": "Push Day",
  "description": "optional, max 1000 chars",
  "source_type": "manual",
  "source_url": "optional",
  "thumbnail_url": "optional",
  "estimated_duration": 45,
  "difficulty": "intermediate",
  "exercises": [
    { "exercise_name": "Bench Press", "sets": 4, "reps": 8, "weight": 60, "rest_seconds": 90, "exercise_order": 1 }
  ]
}
```

- `source_type` ∈ `manual` | `instagram` | `youtube`. The app only ever sends `manual`; the other two are schema provision for the future importer.
- `difficulty` ∈ `beginner` | `intermediate` | `advanced`. Required, and **user-declared** — it is a label, not a measurement.
- `exercises` must be a non-empty array. `exercise_order` defaults to array position.

### Progress — `/api/progress`

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/` | Bearer | `{ weight, body_fat_percentage?, notes? }`. Weight required and > 0; body fat 0–100. |
| GET | `/` | Bearer | Full history, `logged_at DESC`. No pagination, no date filter. |
| GET | `/:id` | Bearer | **Not called by the app.** |
| PUT | `/:id` | Bearer | Partial update. **Not called by the app.** |
| DELETE | `/:id` | Bearer | `204`. |

### Meals — `/api/meals`

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/` | Bearer | `{ meal_name, meal_type, calories?, protein_grams?, carbs_grams?, fat_grams?, notes? }`. |
| GET | `/` | Bearer | Full history, `logged_at DESC`. Returns every macro — daily totals can be computed client-side without a new endpoint. |
| GET | `/:id` | Bearer | **Not called by the app.** |
| PUT | `/:id` | Bearer | Partial update. **Not called by the app.** |
| DELETE | `/:id` | Bearer | `204`. |

`meal_type` ∈ `breakfast` | `lunch` | `dinner` | `snack`.

---

## What the app actually uses

Eleven of the seventeen endpoints have callers. Unused today:

- `PUT /api/profile`
- `GET` and `PUT` on `/api/workouts/:id`, `/api/progress/:id`, `/api/meals/:id`

All six work. The four `PUT` routes are what P2's editing UI wires up — that
feature is frontend-only because the backend was written and never called.

---

## Known contract issues

**Timestamps are timezone-naive.** All `created_at` / `logged_at` columns are
`TIMESTAMP`, not `TIMESTAMPTZ`, and no user timezone is stored. Anything that
needs "the user's day" — streaks, daily quests, daily nutrition totals — cannot
be computed correctly server-side today.

**`logged_at` is when the row was written**, not when the thing happened. A meal
eaten at breakfast and logged at midnight records the later date.

**`goal` is free text** (`VARCHAR(100)`) and cannot drive logic.

**No pagination anywhere.** Every list endpoint returns full history, and no
foreign-key column is indexed — Postgres does not index them automatically.

**No rate limiting**, and `cors()` is open to all origins. Both are appropriate
for LAN development and neither is safe on a public host.

# TinyStep — Working Plan

Living planning doc. Sits next to the hackathon brief. No code here — just the
contract, who-builds-what, and the two features we're adding. Update as we go.

---

## What TinyStep is

Helps students with ADHD beat task-initiation paralysis. Paste an assignment →
the app breaks it into tiny concrete steps, the first always a "2-minute
starter" so small it feels silly to refuse. Each step has **Done** and
**I'm stuck**. Hitting stuck re-breaks that one step into even smaller pieces —
and adapts to the user's stall patterns over the session. That adaptation is the
pitch; everything below exists to make it real rather than a slogan.

---

## The API contract (locked)

Two routes. Response shape is identical for both: `{ "steps": [ ...strings ] }`.

### `POST /breakdown`
- **Request:** `{ "assignment": "<the pasted assignment>" }`
- **Response:** `{ "steps": ["step 1", "step 2", ...] }`
- First step must be a 2-minute starter.

### `POST /stuck` (revised)
- **Request:** `{ "step", "assignment", "reason", "stall_history" }`
  - `step` — the step the user is stuck on
  - `assignment` — the original assignment, for context
  - `reason` — one of `unclear` / `boring` / `scary` (from the button)
  - `stall_history` — running list of this session's reasons, e.g.
    `["scary", "scary", "unclear"]`
- **Response:** `{ "steps": ["smaller step 1", "smaller step 2", ...] }`
  - Drop the stray `assignment` key the current route returns — response is a
    clean `{ steps: [...] }`.

**Why `stall_history` matters:** it's what literally delivers "learns their
stall patterns over the session." It lives in `localStorage` on the client and
rides along in each `/stuck` request, so the **backend stays stateless** — no
sessions, no database. Without this field, the "learns their patterns" line in
the pitch is just words.

**Seam warning:** `reason` and `stall_history` are only worth sending if the
prompt actually uses them. The re-break prompt needs branches
(`unclear` → rephrase, `boring` → timebox/gamify, `scary` → shrink) and needs to
read `stall_history` to adjust granularity (e.g. repeated `scary` → go smaller by
default). This is the one piece the two of us co-design.

---

## Who builds what

### Jack — frontend (`index.html`, `static/app.js`, `static/styles.css`)
Owns the whole browser experience. Builds against the fake endpoints; nothing
changes when the AI lands because response shapes are identical.

### Teammate — AI layer (`app/ai.py`) + prompt design
Prototypes the two prompts in a chat window first (no code), then writes
`breakdown(assignment)` and `rebreak(step, assignment, reason, stall_history)`
returning plain lists of strings. Tests standalone before integration.

### Shared — `routes.py`
Stays as-is until integration. Final wiring (swap hardcoded lists for the `ai.py`
calls, add the new `/stuck` fields) is a small change we do together.

**Rule:** stay in your own files to avoid git conflicts. `pull` before you start,
`push` when you pause.

---

## Frontend punch-list (file by file)

### `index.html`
- Paste screen: a textarea + "Break it down" button.
- Steps view: a container for step cards + a progress bar.
- The "Why am I stuck?" question UI: one shame-free line + three buttons
  (unclear / boring / scary).

### `static/app.js`
- On "Break it down": `fetch` POST `/breakdown` with `{ assignment }`, render the
  returned steps as cards.
- Render each step as a card with **Done** and **I'm stuck** buttons.
- **Done:** mark the card complete, advance progress, bump the streak.
- **I'm stuck:** show the three-choice question (do NOT re-break immediately).
- On choosing a reason: append it to `stall_history` in `localStorage`, then
  `fetch` POST `/stuck` with `{ step, assignment, reason, stall_history }`, and
  swap the stuck card for the smaller steps returned.
- Progress + streak state (see Feature 2).

### `static/styles.css`
- Card styles, the 2-minute-starter badge, progress bar, done state, the
  micro-animation on completion.

---

## Feature 1 — "Why am I stuck?" (co-designed seam)

Changes the flow: **I'm stuck no longer re-breaks immediately.** It first shows a
single shame-free question with three choices: unclear / boring / scary.

The choice does two things:
1. Sent as `reason` in the `/stuck` call.
2. Appended to `stall_history` in `localStorage` so it persists across the
   session and rides along on the next call.

The AI's differentiated response (rephrase / timebox / shrink) is the teammate's
prompt work. The frontend job: capture the reason, store the pattern, send both.
This is the piece the two of us must co-design.

---

## Feature 2 — Dopamine progress (100% frontend, zero AI dependency)

Driven entirely by step state the JS already holds. No contract impact, no
waiting on the teammate.

- Filling progress bar tied to steps-completed.
- Streak counter for consecutive Done's.
- Satisfying micro-animation when a step is checked off (step resolves, bar
  advances).
- Lean into the 2-minute starter: make that very first tiny step give an
  instant, oversized dopamine hit — cheapest big win in the demo.

---

## Don't let this slip — the tester

The brief is blunt: the ADHD tester (day 1–2, before real code) is worth more to
judges than any feature, and the "they said → we changed" table is the
centerpiece of the Devpost writeup. The mid-week screen-share usability session
is largely on Jack (UI/UX owner). Line up that person **now**, in parallel with
everything above — it gates the schedule.

---

## Running plan

1. Lock the revised contract (with `reason` + `stall_history`) — DONE (this doc).
2. Build UI against the fake endpoints.
3. Add the two features.
4. Integrate (`ai.py` ↔ `routes.py`, together).
5. Tester session mid-week → capture "they said → we changed".

---

## Backend status (done)

- `POST /breakdown` — returns hardcoded steps. ✅
- `POST /stuck` — returns hardcoded smaller steps (still needs the `reason` /
  `stall_history` inputs + clean response when we integrate). ✅ for now

# TinyStep

Paste in an assignment. Get back a list of steps so small that starting stops being the hard part.

## The problem

For a lot of students with ADHD, the blocker isn't ability, it's activation. "Write a 5-page essay on the causes of WW1" is one giant, shapeless demand, and staring at it produces nothing except guilt. Most to-do apps make this worse: they store the giant task and then remind you about it.

TinyStep goes the other way. It breaks the assignment into steps of ten minutes or less, and the first step is always deliberately trivial (under two minutes, no thinking, no decisions). Something like "open a blank Google doc". You are not planning the essay. You are just opening a document. Momentum does the rest.

## How it works

1. Paste your assignment into the box and hit "Break it down".
2. Claude returns 4 to 7 tiny steps. Each one is concrete enough that you know for certain when it's done.
3. Tick steps off as you go. There's a progress bar and a streak counter, because finishing things should feel like finishing things.
4. When you clear a batch, hit "Continue" and TinyStep works out what's left and gives you the next few steps, starting with an easy re-entry step like "reread the last thing you wrote".

Deadlines and grades are deliberately never mentioned in the generated steps. Pressure is the thing we're trying to remove, so the prompts explicitly ban it.

## The "I'm stuck" button

This is the part we care about most. Every step has a stuck button. Press it and TinyStep asks *why* you're stuck, with four options:

- unclear – you don't understand the step, so it gets rephrased in plain words with a tiny example
- boring – the step is dull, not hard, so it gets timeboxed and turned into a small challenge
- scary – it feels high-stakes, so the pieces get tinier and the stakes get lowered ("write one bad sentence you can delete later")
- pointless – you can't see why it matters, so the wording is reframed so the payoff feels immediate

The stuck step is then re-broken into 2 or 3 smaller pieces, tailored to that reason. TinyStep also keeps a stall history for the session: if you keep hitting "scary" on the same kind of step, the model is told its normal response isn't landing and to go smaller and gentler.

Every stall gets logged, and the `/insights` endpoint aggregates them per device, so over time you can see your own pattern. Some people stall on boring; some people stall on scary. Knowing which one you are is genuinely useful.

## Tech stack

- Flask + vanilla JS frontend (no framework, one page)
- SQLite for persistence: a `tasks` table for saved task state and a `stall_events` table for the insights
- Anthropic API (Claude Sonnet) for all three AI operations: breakdown, re-break, and continuation
- Forced tool use for structured output. Every API call passes a `return_steps` tool with a JSON schema and sets `tool_choice` to require it, so the model physically can't reply with prose or markdown around the array. If a response somehow has no tool block, we raise `ModelOutputError` and the frontend shows a retry, worded so the failure is on us, not the user.

There are no accounts. A random device token is set as an HTTP-only cookie on first visit and everything (open tasks, stall history, insights) is keyed to it. Close the tab, come back tomorrow, and your unfinished task loads where you left it. For a tool aimed at people who find sign-up forms to be one more reason to bounce, that felt right.

## Running it locally

```bash
git clone https://github.com/JackP900/TinyStep.git
cd TinyStep
pip install -r requirements.txt
```

Create a `.env` file in the project root:

```
ANTHROPIC_API_KEY=your-key-here
```

The Anthropic client initialises at import time, so the app won't boot without this set.

Then:

```bash
flask --app tinystep run
```

and open http://127.0.0.1:5000. The SQLite database is created automatically on first run.

## What we'd build next

- Better insights: right now it's a count per stall reason. We'd like trends over time and per-subject breakdowns (the GROUP BY is already there, the UI isn't).
- A "task history" view so finished tasks aren't just gone.
- Optional gentle notifications for re-entry, with heavy emphasis on gentle.

## Team

Built by Jack Page and Sean Cryan for the IncludEDU Neurodiversity Hackathon (Track 1: AI for Learners Who Think Differently), in partnership with the Stanford Network for K-12 Neurodiversity Education and Advocacy.
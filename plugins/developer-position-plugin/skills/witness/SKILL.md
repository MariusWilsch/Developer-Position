---
name: witness
description: >
  Dev Lead witness ceremony for reviewing developer work — guided human experience of the system working.
  Use this skill when the user says /witness, "witness ceremony", "review this PR", "spot-check",
  "let's witness", or wants to verify developer deliverables through hands-on experience.
  Also triggers when the user references issue numbers in a review context.
  This skill replaces the old /witness command.
---

# Witness Ceremony

The ceremony exists for the human to experience the system working.

Everything in this skill serves that belief. Loading sources prepares the experience. Ceremony checks
verify the experience is possible. The approach discussion designs the experience with the human.
The witness steps deliver the experience. When you find yourself reading files instead of running
the system, you are verifying code — not facilitating witness.

## Operating Principles

**Cold view.** You have no implementation memory. You rebuild understanding from sources.
This removes bias — the AI that built a feature unconsciously skips what it "knows works."

**One step at a time.** Every ceremony check and witness step ends with AskUserQuestion.
The human decides: Approach, finding, or skip. Batching steps destroys the collaborative experience.

**Post findings immediately.** When a finding is confirmed, post it to the issue as a comment
right then. Not at the end. Not in batches.

**Findings format:**
```
## Dev Lead Witness — Finding N: {Title}

**Expected:** {what should exist}
**Witnessed:** {what was actually observed}

🤖
```

## Phase 1: Load Sources

```bash
uv run ~/.claude/lib/fetch_issue_context.py {issue_number}
```

Read these in order — each layer adds teaching depth:

1. **tracking.md** — WHAT to verify (ACs define the spec boundary)
2. **Project index** — WHERE + PROJECT CONTEXT (URLs, design docs, test rubrics, deployment surfaces)
3. **Design doc** — Fetch and read the design doc. Look specifically for:
   - **Test rubric section** (often Part 5) — what to test, success metrics, expected outcomes
   - **Deployment architecture** — how the system runs, what surfaces are witnessable
   - **Data artifacts** — golden data, test fixtures, evaluation datasets
4. **Issue comments** — Implementation decisions, session links, developer witness report

**Test rubric awareness:** If the design doc contains a test rubric, note it. This rubric shapes
the approach discussion in Phase 2.5 — the human should not have to figure out how to test.
If no test rubric exists, note that gap — it may itself be a finding.

Announce what you loaded and what gaps remain.

## Phase 2: Ceremony Checks

Present each check one at a time. After each, use AskUserQuestion for the human's verdict.

| # | Check | Gate |
|---|-------|------|
| 1 | PR exists (code repo, open) | Hard |
| 2 | ACs defined (tracking.md has Given-When-Then) | Hard |
| 3 | Developer witness report (PR comments or issue comments) | Hard |
| 4 | Deployed to staging | Hard |
| 5 | Conversations linked (session paths in issue comments) | Soft |
| 6 | tracking.md location (co-located or in deliverable-tracking) | Soft |

Hard gate failures block witness. Soft gate failures are findings — ceremony continues.

## Phase 2.5: Approach Discussion

After ceremony checks Approach, BEFORE starting AC witness steps — discuss the witness approach
with the human. This phase designs the experience together.

**Why this phase exists:** Different issue types need different witness strategies. A migration
needs a smoke test (send input, observe processing). An MCP server needs a live tool session.
A web app needs Chrome DevTools navigation. The human knows what experience would be meaningful —
the AI proposes, the human shapes.

**How to run this phase:**

1. **Classify the issue type** from what you loaded in Phase 1:
   - What kind of system is this? (web app, API, CLI tool, pipeline, MCP server, infrastructure)
   - What surfaces are witnessable? (URLs, endpoints, inboxes, CLI commands)
   - Does a test rubric exist? If yes, what methodology does it prescribe?

2. **Propose Approach** based on the issue type. The approach template from empirical evidence:

   **Behavioral (the human experiences the system):**
   ACs about system behavior — "does it actually work?" This is the centerpiece witness.
   The human triggers input, observes processing, validates output.

3. **Present the approach via AskUserQuestion.** Show the proposed Approach, what each covers,
   and what the behavioral test looks like concretely. The human approves, adjusts, or redirects.

4. **The agreed approach becomes the template for Phase 3.** The Approach you negotiated
   determine the structure of the witness steps.

## Phase 3: Witness Steps

Walk through ACs organized by the approach agreed in Phase 2.5.

**Three-beat witness step (mandatory):**

For each AC, present three beats:

1. **Teach** — The Given-When-Then acceptance criteria as context (why this step matters)
2. **Ground** — Reproducible action: navigate via Chrome DevTools, run a command, call an API,
   send an email — whatever produces something the human can see
3. **Witness** — Compact Action/Expected prompt for the human to verify

```
---

### {Approach name}: {Step title} (AC references)

*Given {precondition}, When {action}, Then {expected outcome}*

**Grounding:** {What you did to make this visible — screenshot, command output, URL navigated}

**Action:** {What the human does}
**Expected:** {What they should see}

---
```

Then AskUserQuestion with Approach / finding / skip options.

**Grounding depends on the approach:**
- **Web app:** Chrome DevTools — navigate to URL, take screenshot
- **API/Pipeline:** Run the command, show output
- **Infrastructure:** SSH and demonstrate live state
- **MCP server:** Connect and run a tool call

CLI-only grounding (telling the human "run this command") is acceptable when the system
has no visual interface. The principle is reproducibility and human experience, not the medium.

**Re-witness on findings:** When a previous witness produced findings that were fixed,
scope the re-witness to those findings — don't re-run the entire ceremony.

## After All Steps

When all ACs are witnessed:

1. Announce completion: "All ACs witnessed. Findings were posted as discovered."
2. Summarize: Approach, findings, skips
3. If findings exist, they're already posted to the issue — no batch posting needed

## Example: Approach (CI/CD Deployment Issue)

This example shows the approach discussion producing a structured witness plan for a deployment issue.

**Issue type:** Email-processing pipeline deployed via Docker + Makefile

**Phase 2.5 output (what the AI proposes):**

```
Approach — Behavioral (smoke test):
  AC1.1: Run `make` on server — help screen shows all targets, no deploy triggered
  AC1.2: Run `make staging` — deploys, /health confirms new git_sha
  AC1.3: Environment isolation smoke test:
    1. Send test email to staging inbox
    2. SSH into staging, tail logs, watch system pick it up
    3. Verify output files against golden data
    4. Confirm prod container still polls different inbox
```

## Troubleshooting

### AI skips approach discussion (Phase 2.5)

**Symptom:** After ceremony checks, AI jumps directly to "Phase 3: Witness Steps" without
discussing approach with the human.

**Why it happens:** The transition from ceremony checks to AC witness feels natural — the AI
has the ACs, has the sources, and defaults to proceeding. Phase 2.5 is the pause where
the human shapes the experience.

**What to check:** After the ceremony summary, is there a Phase 2.5 header? Is there an
AskUserQuestion about approach? If not, the phase was skipped.

### AI proposes file inspection even though behavioral tests are always mandatory

**Symptom:** For a deployment or pipeline issue, AI proposes reading compose files and
checking config instead of running the system.

**Why it happens:** File inspection is the path of least resistance. Reading files always
works — no SSH issues, no permission problems, no environment setup. But reading files
tells you what EXISTS, not whether it WORKS.

**The test:** Would the human walk away having SEEN the system work? If the witness was
all file reading, the answer is no. Propose the behavioral test first — the human can
always choose to simplify.

### Design doc test rubric not loaded

**Symptom:** AI asks the human "how should we test this?" when the answer is already
in the design doc's test rubric section.

**Why it happens:** Phase 1 loaded the design doc but didn't specifically extract the
test rubric. The rubric often lives in Part 5 or a "Testing" section — it needs to be
explicitly surfaced, not just loaded in passing.

**What to check:** During Phase 1 announcement, did the AI mention the test rubric?
If not, the rubric wasn't extracted and Phase 2.5 will start without it.

## Thinking Step

Before EACH step (ceremony check, approach proposal, or AC witness), use sequential_thinking
with 1 thought:
- What am I about to present?
- What evidence do I need to gather first?
- How do I ground this for the human to experience?

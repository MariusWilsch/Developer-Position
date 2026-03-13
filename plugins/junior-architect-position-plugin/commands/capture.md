---
description: "[2026-03-09] [Stage 2] JA capture pass — UPDATE → ASSESS"
---

### 1. Task context
Write RESOLVE resolutions into design docs and meeting agendas. UPDATE → ASSESS.
Follows /extract or reads resolutions from any conversation context.

### 2. Tone context
Disposition and beliefs come from the loaded JA protocol.

### 3. Background data

**Evidence: What good and bad UPDATE behavior looks like.**

These are real behavioral patterns from 5 JA sessions (CCI #604 Theme 2 triage, 401K tokens):

**GOOD — Per-section gate held:**
After user approved Part 3, AI drafted Part 5 diff separately and presented it with its own
Apply/Adjust gate. Each section got independent approval. User validated one component at a time.

**BAD — Gate collapsed after first Apply:**
After user approved Meeting Goal, AI wrote the ENTIRE meeting agenda (Pre-Read, 5 Discussion
Topics, Meeting Format, Related) in one shot. User caught it: "Why did you start off with
section 1 as component by component and not continue with that?"

**BAD — Sections batched without gate:**
After user approved Part 8 (Revenue Model), AI wrote Part 8 AND Part 9 (Lead Pipeline) in the
same edit without a gate between them. Two sections, one Apply — violated the rhythm.

**BAD — ASSESS skipped review:**
After publishing, AI immediately asked "Another extraction pass needed?" — user hadn't reviewed
the published docs yet. User caught it: "I saw you didn't verify the publish and you also
didn't open the commit."

### 4. Detailed task description & rules

**UPDATE: Per-Section Gate Loop**

YOU MUST follow this loop for EVERY section. No exceptions.

```
For EACH section (design doc) or component (meeting agenda):
  1. Use sequential_thinking to plan voice shift for THIS section
  2. Draft diff for THIS section ONLY
  3. Present via AskUserQuestion (Apply / Adjust)
  4. On Apply: write THAT section using Edit tool
  5. STOP. Do NOT write the next section yet.
  6. Draft next section. Return to step 1.
```

**Meeting agenda components (in order, each gets its own gate):**
Meeting Goal → Pre-Read → Discussion Topics (ONE at a time) → Meeting Format → Related

Writing 2+ sections after a single Apply = violation. Every time.
Writing the entire meeting agenda after approving Meeting Goal = violation. Every time.

**ASSESS: 5-Step Publish-Review Sequence**

After UPDATE is complete, YOU MUST execute these 5 steps in order. No skipping.

1. **Publish** all documents via `verify_publish.sh "{tier}" "{filename}"`
2. **Present** commit links + published URLs as a formatted list
3. **Pause** — say "Review when ready — I'll wait." Do NOT ask re-entry question yet.
4. **Wait** for user to signal review is complete (user messages back after reading)
5. **Scope** — use `sequential_thinking` to reason about next-pass scope based on what
   was discussed this session. THEN ask re-entry via AskUserQuestion.

Publishing then immediately asking "Another pass needed?" = skipped steps 3-5. Every time.
The user needs time to read the published artifact holistically (Speechify) before deciding.

### 7. Immediate task description or request

**BEFORE UPDATE:** Read reference files for structural knowledge (check plugin first, then local):
- `${CLAUDE_PLUGIN_ROOT}/references/design-doc-workflow.md` or `~/.claude/skills/hippocampus/references/design-doc-workflow.md` (stable components, template)
- `${CLAUDE_PLUGIN_ROOT}/references/meeting-agenda-workflow.md` or `~/.claude/skills/hippocampus/references/meeting-agenda-workflow.md` (5-question structure, template)

These define WHAT the documents look like — section names, component logic, discussion topic principles.

**UPDATE:** Write resolutions into documents. Follow the per-section gate loop in §4.

| RESOLVE outcome | Document |
|----------------|----------|
| Resolved items | Design doc (via hippocampus) |
| Undefined items | Meeting agenda (via hippocampus) |
| Mixed | Both — design doc first, meeting agenda second |

**Every turn MUST end with AskUserQuestion.** Never end with plain text questions. No exceptions.

Inline **Undefined** markers for unresolved items, linked to meeting agenda.
Per-element source attribution: Fireflies link + search anchor words (ideal),
session reference in Source section (minimum).

Voice shift: RESOLVE captured verbatim. UPDATE writes instructional prose for the
doc's reader.

Conversation paths go in Source section — available for future extraction passes.

**ASSESS:** Follow the 5-step publish-review sequence in §4.

If target document is NOT in hippocampus → commit changes, present git commit link as
the review artifact instead of verify_publish.sh.

### 8. Thinking step by step
Use sequential_thinking before writing each section diff to plan voice shift
from verbatim (RESOLVE) to instructional prose (UPDATE reader).

---
description: "[2026-02-15] [Stage 2] JA capture pass — UPDATE → ASSESS"
---

### 1. Task context
Write RESOLVE resolutions into design docs and meeting agendas. UPDATE → ASSESS.
Follows /extract or reads resolutions from any conversation context.

### 2. Tone context
Writer who transforms verbatim resolutions into instructional prose for the reader —
the Developer who implements, the client who aligns, the SA who reviews.

### 7. Immediate task description or request

**BEFORE UPDATE:** Read hippocampus reference files for structural knowledge:
- `~/.claude/skills/hippocampus/references/design-doc-workflow.md` (stable components, template)
- `~/.claude/skills/hippocampus/references/meeting-agenda-workflow.md` (5-question structure, template)

These define WHAT the documents look like — section names, component logic, discussion topic principles.

**UPDATE:** Write resolutions into documents. Routing is outcome-driven from RESOLVE:

| RESOLVE outcome | Document |
|----------------|----------|
| Resolved items | Design doc (via hippocampus) |
| Undefined items | Meeting agenda (via hippocampus) |
| Mixed | Both — design doc first, meeting agenda second |

**Every turn MUST end with AskUserQuestion.** Never end with plain text questions. No exceptions.

Diff-based, section-by-section, approval-gated. Present diff for ONE section →
AskUserQuestion with Apply / Adjust / feedback options → write edit → next section.

Inline **Undefined** markers for unresolved items, linked to meeting agenda.
Per-element source attribution: Fireflies link + search anchor words (ideal),
session reference in Source section (minimum).

Voice shift: RESOLVE captured verbatim. UPDATE writes instructional prose for the
doc's reader. Verbatim fallback in the doc = ambiguity not truly resolved.

Conversation paths go in Source section — available for future extraction passes.

**ASSESS:** Publish-verify-review.

1. If target document is in hippocampus → publish via `~/.claude/skills/hippocampus/scripts/verify_publish.sh "{tier}" "{filename}"`,
   present commit link + published doc URL
2. If target document is NOT in hippocampus → commit changes, present git commit link as
   the review artifact
3. User reviews (Speechify for published docs, git diff for commit links) — feedback loop
   until satisfied
4. Re-entry check via AskUserQuestion: "Another extraction pass needed on any part?"
   - Yes → AI proposes next scope, user decides → /issue-comment formalizes
   - No → session complete

### 8. Thinking step by step
Use sequential_thinking before writing each section diff to plan voice shift
from verbatim (RESOLVE) to instructional prose (UPDATE reader).

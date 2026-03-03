# Design Doc Workflow

Operational reference for AI during design doc creation via hippocampus skill.

**Source of truth:** [Design Doc & Meeting Agenda Methodology](https://mariuswilsch.github.io/public-wilsch-ai-pages/global/design-doc-methodology)

## Framing

Design docs are **alignment tools**, not output automation. They capture and verify understanding through stable components. AI always drafts first; user validates. The value is in the validation surface — without seeing it written, the user can't say "yes" or "not like that."

## Stable Components

Four components appear in every design doc. Headers are always the same — content is always project-specific.

| Component | Thinking Function | Mandatory Elements |
|-----------|------------------|-------------------|
| **Problem Statement** | Scope crystallization — what IS / ISN'T the problem | **Preconditions:** the conditions under which this problem exists (mandatory — every problem has them, and they need validation) |
| **Success Definition** | (1) "Done" boundary — high-level end state, above ACs. (2) Human judgment anchor — evaluation isn't automatable. (3) Client alignment surface — holdable agreement between parties. | Table format with Goal, Success, Done test |
| **Approach** | (1) AI-driven decomposition — breaks vague conceptual understanding into concrete named parts, user validates. (2) Conceptual ordering — parts arranged so each builds on understanding from the previous one (comprehension flow, not implementation steps). | Content is always project-specific |
| **Source** | JIT retrieval anchor — ensures next session can find and fetch sources directly without searching. Infrastructure, not thinking. | Findable links: conversation paths, transcript URLs, commit hashes. Not descriptions. |

No optional components by default. Only added if user explicitly requests them.

## Component-by-Component Rhythm

1. AI drafts **ONE** component AND asks questions about its own uncertainties within that component
2. User validates the draft AND resolves AI's questions
3. Next component
4. Repeat until all four are done

User controls pace. Small compressed drafts in chat → expanded in published document. Multiple review rounds are normal and expected.

## Extraction Pass: UPDATE

When updating an existing design doc with resolved findings from an extraction pass:

1. Present diff for ONE section at a time (component or approach part)
2. Wait for explicit `Apply` / `Adjust` / feedback
3. If feedback → revise diff → re-propose
4. If Apply → execute edit → next section
5. Place inline **Undefined:** markers at end of sections for flagged items, linked to meeting agenda
6. After all design doc sections: create/update meeting agenda (also component-by-component)
7. Update Source section with current session reference

**Diff works for both edits (-/+) and additions (all +).** User skims for instinctive judgment — the diff is a validation surface, not just a writing mechanism.

## Extraction Pass: ASSESS

After UPDATE writes are complete and committed:

1. Run `verify_publish.sh` — confirm published
2. Open commit link + published doc URL for user
3. User reads published doc (Speechify) — improve loop until satisfied
4. Ask: "Another extraction pass needed on any part?"
   - **Yes** → `/issue-comment` (capture which part + context) → session complete
   - **No** → session complete

**One extraction pass per session.** ASSESS completes the cycle.

## Component States

Each component has a binary state:

- **Defined:** Content is clear, no remaining questions. Written in full.
- **Undefined:** Content cannot be defined with current understanding. The uncertainty description lives in the **meeting agenda**, NOT in the design doc.

The design doc only contains what IS defined. Clean separation.

## Trust Gradient

The gap between conceptual and explicit knowledge widens from Problem → Approach. This is where AI's decomposition becomes most valuable.

| Component | User's Judgment | AI's Recall Advantage |
|-----------|----------------|----------------------|
| **Problem Statement** | Precise — "I know this IS the problem" | Low |
| **Success Definition** | Directional — "this feels like done" | Medium |
| **Approach** | Instinctive — "yes/no, can't articulate why" | High |

---

## Template

```markdown
---
publish: true
---

# {Title}
[[{phantom-node}]]

{One-line description of what this design doc covers and its scope.}

---

## Problem Statement

{Scope crystallization — what IS the problem, what ISN'T.}

**Preconditions:**
- {Condition under which this problem exists}
- {Another condition}

---

## Success Definition

| Element | Definition |
|---------|-----------|
| **Goal** | {High-level end state — above ACs, requires human judgment} |
| **Success** | {What the user validates against — holdable agreement} |
| **Done test** | {Binary test: "Can I write a meeting agenda with open design questions?" → If NO → design is complete} |

---

## Approach

{AI-driven decomposition of the solution into concrete named parts, ordered so each builds on understanding from the previous one.}

---

## Source

- **Transcripts:** {findable links to meeting transcripts}
- **Artifacts:** {findable links to related documents, PRs, designs}
- **Session:** {conversation path for this design doc session}
```

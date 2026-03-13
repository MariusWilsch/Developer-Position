---
name: create-release-epic
description: "Create CCI release epics from accumulated position epic observations (discovery: rubber-duck). Evaluate at rubber-duck when context includes CCI observations, position epics, and user mentions 'release epic', 'atmospheric pressure', 'discharge observations', or 'create release'. Takes over the session with a structured disposition walk — do NOT wait for rubber-duck confidence gate."
---

### 1. Task context
Create a release epic on DaveX2001/claude-code-improvements by transferring accumulated observations from position epics into themed, actionable work packages.

### 2. Tone context
Interactive and structured. Every disposition decision goes through AskUserQuestion. Never batch. Never assume.

### 4. Detailed task description & rules

**Guardrails — violations of these caused corrections in prior runs:**

- Fetch ALL observation comments. No subsetting. No "first 20." Every time.
- Walk observations one-by-one. Never batch dispositions. User rejected batch twice.
- Multiple observations of same pattern = more atmospheric pressure, NOT redundancy. Never supersede for "duplicate."
- Observations go in COMMENTS, not issue body. Body = themes + patterns + artifacts + cleanup summary.
- Fetch observation bodies via `gh api`, append to file, post from file. Zero AI rewriting of observation content. Every time.
- No DoD, no tracking file, no type label for epics. Epics are containers, not work items.
- Theme names in comments match theme names in body. No explicit URL linking needed.
- No limbo — every observation gets a home (theme, route, supersede) or stays on position epic. No orphans.
- Title is user judgment — AI proposes, user decides. The SE names the release after the concern the cluster addresses.
- Always CCI repo (DaveX2001/claude-code-improvements). Always linked as sub-issue of a user-selected position epic.

### 7. Immediate task description or request

**Phase A — Inventory (automated)**

Fetch ALL observation comments from the source position epic(s):
```bash
gh api repos/DaveX2001/claude-code-improvements/issues/{EPIC}/comments --paginate --jq '.[] | {id: .id, author: .author.login, date: .created_at, hook: (.body | split("\n")[0:2] | join(" "))}' > /tmp/observations-inventory.json
```
Present complete inventory: count + hook preview per observation.

If user identifies additional source epics, fetch those too. Combine into single inventory.

**Phase B — Theme Clustering (interactive)**

After reading all observations, propose 2-3 candidate themes:
- Each theme: name + behavioral pattern description + artifact targets
- Present via AskUserQuestion for user validation
- Themes are provisional — they can evolve during the walk

**Phase C — Disposition Walk (interactive, one-by-one)**

For EACH observation, use AskUserQuestion:

```
**Observation {N}/{total}:** {hook text, ~100 chars}
Source: {session ID or conversation path}
```

Options (adapt theme names to actual themes):
- Transfer to Theme 1: [name]
- Transfer to Theme 2: [name]
- Transfer to Theme 3: [name]
- Supersede (delete from source)
- Route to [other epic] (fetch → repost → delete)
- Stay on position epic
- Open in browser

When user selects "Open in browser": run `open "https://github.com/DaveX2001/claude-code-improvements/issues/{EPIC}#issuecomment-{ID}"`, then re-ask the same disposition question.

Track all decisions in a local disposition table for Phase D.

**Phase D — Draft Issue Body (auto-generate, user confirms)**

Generate issue body from template:
```markdown
## Release Epic: {Title} — Release {N}

**Parent:** #{position_epic}
**Position:** {position name}
**Observations:** {count} (transferred from #{sources})

---

### Theme 1: {Name} ({count} observations)
**Pattern:** {behavioral description from clustering}
**Artifacts:** {files/skills to modify}

### Theme 2: {Name} ({count} observations)
**Pattern:** {description}
**Artifacts:** {targets}

---

### Cleanup completed with this release
**Superseded (deleted from #{source}):** {list}
**Routed:** {list with targets}
**Stays on #{source}:** {list}
```

Present draft to user via AskUserQuestion: "Approve body?" / "Edit needed"

Title: ask user via AskUserQuestion — AI proposes based on themes, user decides.

**Phase E — Execute (3 grouped confirms)**

**Gate 1: Create + Post**

Confirm → then execute:
1. Create issue: `"$([ -f "${CLAUDE_PLUGIN_ROOT}/lib/create_tracking_issue.sh" ] && echo "${CLAUDE_PLUGIN_ROOT}/lib/create_tracking_issue.sh" || echo ~/.claude/lib/create_tracking_issue.sh)" --repo DaveX2001/claude-code-improvements --title "{title}" --body-file /tmp/release-epic-body.md --label "backlog"`
2. For each theme, fetch observation bodies and post as comment:
   ```bash
   # Collect all observation IDs for this theme
   for ID in {theme_comment_ids}; do
     gh api repos/DaveX2001/claude-code-improvements/issues/comments/$ID --jq '.body' >> /tmp/theme-N.md
     echo -e "\n---\n" >> /tmp/theme-N.md
   done
   # Prepend theme header
   # Post from file
   gh issue comment {NEW_ISSUE} --repo DaveX2001/claude-code-improvements --body-file /tmp/theme-N.md
   ```

**Gate 2: Link**

Confirm → then execute:
```bash
gh sub-issue add {POSITION_EPIC} {NEW_ISSUE} --repo DaveX2001/claude-code-improvements
```

**Gate 3: Cleanup**

Confirm → then execute:
1. Delete transferred + superseded observations from source epic(s):
   ```bash
   gh api -X DELETE repos/DaveX2001/claude-code-improvements/issues/comments/{ID}
   ```
2. Route misplaced observations: fetch body → post on target epic → delete from source
3. Verify remaining observations are intact on source epic

**Nudge**

After execution completes:
```
Release epic created: #{NEW_ISSUE}
Use /issue-comment to post execution context (theme order, session reference).
```

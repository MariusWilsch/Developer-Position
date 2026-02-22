---
description: "Install dependencies and configure MCP for claude-code-team-plugin"
---

### 1. Task context
Run first-time setup for the claude-code-team-plugin. Install core CLI tools, verify GitHub auth, and add the hand-picked-tools MCP server. Produce a clear final checklist showing what's ready and what (if anything) still needs manual action.

### 2. Tone context
Clear progress per step. Short and practical — not verbose. End with a scannable summary.

### 3. Detailed task description

**Step 1: Run dependency installer**

```bash
bash "${CLAUDE_PLUGIN_ROOT}/scripts/setup.sh"
```

If the script exits non-zero, show the output and stop — do not continue to the next steps.

**Step 2: Check GitHub CLI authentication**

```bash
gh auth status 2>&1
```

- Authenticated → note ✅
- Not authenticated → note that user must run `gh auth login` manually (requires browser/interactive terminal, cannot be automated)

**Step 3: Check and add hand-picked-tools MCP**

Check if already configured:
```bash
grep -r "hand-picked-tools" ~/.claude/settings.json ~/.claude/settings.local.json 2>/dev/null | head -1
```

If no output (missing), add it:
```bash
claude mcp add hand-picked-tools --transport http --scope user https://metamcp.iitr-cloud.de/metamcp/hand-picked-tools/mcp
```

**Step 4: Show setup summary**

Print a final checklist:

```
✅ Setup Complete

Core tools:       jq ✓   gh ✓   uv ✓
GitHub auth:      [✅ authenticated  /  ⚠ run: gh auth login]
MCP tools:        hand-picked-tools ✓

[If uv was just installed, also show:]
⚠  Shell restart required for uv PATH:
   source ~/.zshrc    # zsh
   source ~/.bashrc   # bash

[If gh not authenticated:]
Manual step:
  gh auth login
```

Once all items are ✅, tell the user they're ready to run `/onboarding`.

### 7. Immediate task description or request
Run first-time setup: install core deps, check GitHub auth, configure hand-picked-tools MCP.
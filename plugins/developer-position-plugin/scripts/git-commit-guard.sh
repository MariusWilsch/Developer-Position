#!/bin/bash
# Git Commit Guard - Requires issue reference + conversation link in commit messages
# Issue: #986 - Conversation trailer enforcement
# See: https://github.com/DaveX2001/claude-code-improvements/issues/125

CONVERSATION_URL_FILE="$HOME/.claude/.session-state/conversation-url"

# Read hook input from stdin
input=$(cat)

# Extract the bash command from the JSON
command=$(echo "$input" | jq -r '.tool_input.command // empty')

# Only validate git commit commands
if [[ ! "$command" =~ git\ commit ]]; then
  exit 0  # Not a git commit, allow it
fi

# --- Check 1: Issue reference ---
# Pattern: Refs {owner}/{repo}#{number}
if [[ ! "$command" =~ Refs\ [a-zA-Z0-9_-]+/[a-zA-Z0-9_-]+#[0-9]+ ]]; then
  cat >&2 << 'EOF'
**[require-issue-ref]**
**Issue reference required in commit message.**

This session is linked to an issue. All commits must include:

```
Refs {owner}/{repo}#N
```

Examples:
- Refs DaveX2001/deliverable-tracking#227
- Refs DaveX2001/claude-code-improvements#111
- Refs MariusWilsch/some-repo#42

Add this to your commit message before proceeding.
EOF
  exit 2
fi

# --- Check 2: Conversation trailer (only if URL file exists) ---
if [ -f "$CONVERSATION_URL_FILE" ]; then
  CONV_URL=$(cat "$CONVERSATION_URL_FILE" 2>/dev/null)
  if [ -n "$CONV_URL" ] && [[ ! "$command" =~ Conversation: ]]; then
    cat >&2 << CONVEOF
**[require-conversation-link]**
**Conversation trailer required in commit message.**

This session has a conversation URL. All commits must include:

\`\`\`
Conversation: $CONV_URL
\`\`\`

Add this trailer to your commit message before proceeding.
CONVEOF
    exit 2
  fi
fi

exit 0

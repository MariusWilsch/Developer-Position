#!/bin/bash
# Write key-value fields to session state file for statusline and onboarding.
#
# Multi-field format: each line is key:value. Existing fields are preserved
# when adding new ones. The SessionStart hook writes position:XX at startup;
# this script adds issue:REF during onboarding.
#
# Usage: write_session_state.sh <issue_ref>
# Example: write_session_state.sh "DaveX2001/deliverable-tracking#232"
#
# Design Context:
#   Session state file may already contain position:{POS} written by
#   session-start.sh hook. This script preserves existing lines and
#   appends/updates the issue reference.
#
# Requires CLAUDE_CODE_SESSION_ID environment variable.

set -e

if [ -z "$1" ]; then
    echo "Error: Issue reference required" >&2
    echo "Usage: $0 <issue_ref>" >&2
    exit 1
fi

if [ -z "$CLAUDE_CODE_SESSION_ID" ]; then
    echo "Error: CLAUDE_CODE_SESSION_ID not set" >&2
    exit 1
fi

ISSUE_REF="$1"
STATE_DIR="$HOME/.claude/.session-state"
STATE_FILE="$STATE_DIR/$CLAUDE_CODE_SESSION_ID"

mkdir -p "$STATE_DIR"

# Preserve existing fields (e.g., position), update/add issue field
if [ -f "$STATE_FILE" ]; then
    # Remove any existing issue line, keep everything else
    grep -v "^issue:" "$STATE_FILE" > "$STATE_FILE.tmp" 2>/dev/null || true
    mv "$STATE_FILE.tmp" "$STATE_FILE"
fi

echo "issue:$ISSUE_REF" >> "$STATE_FILE"

echo "Session linked to $ISSUE_REF"

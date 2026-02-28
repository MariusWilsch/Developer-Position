#!/bin/bash
# session-upload.sh - Upload conversation JSONL to conversation-store at session end
# Issue: #986 - Conversation Index: Associate Claude Code sessions with GitHub issues
#
# Receives JSON via stdin with transcript_path and session_id fields.
# Uploads conversation to MariusWilsch/claude-code-conversation-store via gh api.
# If session was linked to an issue (via onboarding), posts a session comment.
# Always exits 0 to not block session termination.

set -o pipefail

STORE_REPO="MariusWilsch/claude-code-conversation-store"
SESSION_STATE_DIR="$HOME/.claude/.session-state"

# --- Read stdin ---
INPUT=$(cat)

TRANSCRIPT_PATH=$(echo "$INPUT" | jq -r '.transcript_path // empty')
SESSION_ID=$(echo "$INPUT" | jq -r '.session_id // empty')

if [ -z "$TRANSCRIPT_PATH" ]; then
    echo "session-upload: No transcript_path in input" >&2
    exit 0
fi

if [ ! -f "$TRANSCRIPT_PATH" ]; then
    echo "session-upload: Transcript file not found: $TRANSCRIPT_PATH" >&2
    exit 0
fi

# --- Compute paths ---
# Strip ~/.claude/projects/ prefix → relative path
# Example: ~/.claude/projects/-Users-daveFem-.../{uuid}.jsonl → -Users-daveFem-.../{uuid}.jsonl
RELATIVE_PATH="${TRANSCRIPT_PATH#$HOME/.claude/projects/}"
STORE_PATH="projects/$RELATIVE_PATH"
UUID=$(basename "$TRANSCRIPT_PATH" .jsonl)
FOLDER=$(dirname "./$RELATIVE_PATH")
STORE_URL="https://github.com/$STORE_REPO/blob/main/$STORE_PATH"

# --- Upload via gh api (Contents API) ---
# Base64 encode and stream through jq to avoid shell variable limits on large files
UPLOAD_BODY=$(mktemp)
base64 < "$TRANSCRIPT_PATH" | tr -d '\n' | jq -Rsc --arg msg "Upload session: $UUID" '{message: $msg, content: .}' > "$UPLOAD_BODY" 2>/dev/null

if [ ! -s "$UPLOAD_BODY" ]; then
    echo "session-upload: Failed to encode transcript for upload" >&2
    rm -f "$UPLOAD_BODY"
    exit 0
fi

# Check if file already exists (need SHA for update)
EXISTING_SHA=$(gh api "repos/$STORE_REPO/contents/$STORE_PATH" --jq '.sha' 2>/dev/null)

if [ -n "$EXISTING_SHA" ]; then
    # Update existing file — add sha to body
    jq --arg sha "$EXISTING_SHA" '. + {sha: $sha}' "$UPLOAD_BODY" > "${UPLOAD_BODY}.tmp" && mv "${UPLOAD_BODY}.tmp" "$UPLOAD_BODY"
fi

gh api "repos/$STORE_REPO/contents/$STORE_PATH" -X PUT --input "$UPLOAD_BODY" > /dev/null 2>&1
UPLOAD_EXIT=$?
rm -f "$UPLOAD_BODY"

if [ $UPLOAD_EXIT -ne 0 ]; then
    echo "session-upload: Upload to $STORE_REPO failed (exit $UPLOAD_EXIT)" >&2
    exit 0
fi

# --- Determine focus issue ---
FOCUS_REPO=""
FOCUS_NUMBER=""

# Primary: session-state file written by onboarding (keyed by session_id)
if [ -n "$SESSION_ID" ] && [ -f "$SESSION_STATE_DIR/$SESSION_ID" ]; then
    STATE_CONTENT=$(cat "$SESSION_STATE_DIR/$SESSION_ID" 2>/dev/null)
    # Format: "owner/repo#number"
    FOCUS_REPO=$(echo "$STATE_CONTENT" | cut -d'#' -f1)
    FOCUS_NUMBER=$(echo "$STATE_CONTENT" | cut -d'#' -f2)
fi

# Secondary: try UUID from transcript path (onboarding writes {uuid}-keyed file)
if [ -z "$FOCUS_NUMBER" ] && [ -f "$SESSION_STATE_DIR/$UUID" ]; then
    STATE_CONTENT=$(cat "$SESSION_STATE_DIR/$UUID" 2>/dev/null)
    FOCUS_REPO=$(echo "$STATE_CONTENT" | cut -d'#' -f1)
    FOCUS_NUMBER=$(echo "$STATE_CONTENT" | cut -d'#' -f2)
fi

# Fallback: scan first 100 lines of JSONL for issue reference
if [ -z "$FOCUS_NUMBER" ]; then
    # Look for patterns like "deliverable-tracking#NNN" or "Refs DaveX2001/deliverable-tracking#NNN"
    MATCH=$(head -100 "$TRANSCRIPT_PATH" | grep -oE '[A-Za-z0-9_-]+/[A-Za-z0-9_-]+#[0-9]+' | head -1)
    if [ -n "$MATCH" ]; then
        FOCUS_REPO=$(echo "$MATCH" | cut -d'#' -f1)
        FOCUS_NUMBER=$(echo "$MATCH" | cut -d'#' -f2)
    fi
fi

# --- Post session comment on focus issue ---
if [ -n "$FOCUS_REPO" ] && [ -n "$FOCUS_NUMBER" ]; then
    SESSION_DATE=$(date +%Y-%m-%d)
    # Extract project name from folder (last segment after double-dash or full name)
    PROJECT_NAME=$(basename "$(dirname "./$RELATIVE_PATH")" 2>/dev/null || echo "$FOLDER")

    COMMENT_BODY=$(cat <<EOF
🗣️ [Session $SESSION_DATE]($STORE_URL) | $PROJECT_NAME

🤖
EOF
)

    gh issue comment "$FOCUS_NUMBER" --repo "$FOCUS_REPO" --body "$COMMENT_BODY" > /dev/null 2>&1 || {
        echo "session-upload: Failed to post session comment on $FOCUS_REPO#$FOCUS_NUMBER" >&2
    }
else
    echo "session-upload: No session-state ($SESSION_ID / $UUID), no JSONL match, skipping issue comment" >&2
fi

# Success
exit 0

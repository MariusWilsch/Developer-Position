---
name: conversation-reader
description: "Extract and read Claude conversation JSONL files with progressive disclosure (discovery: rubber-duck). Evaluate at rubber-duck or at any point in the session when task requires reading conversation history, verifying tool outputs, or auditing session behavior. Use instead of raw Read/grep on ~/.claude/projects/*.jsonl files."
---

# Conversation Reader

Extract conversation content from JSONL files. Use for self-reflection, verification, and audit.

## Quick Start

```bash
# Extract everything (all content types always included)
uv run --with tiktoken python "$([ -f "${CLAUDE_PLUGIN_ROOT}/lib/extract_conversation.py" ] && echo "${CLAUDE_PLUGIN_ROOT}/lib/extract_conversation.py" || echo ~/.claude/skills/manage-artifact/scripts/extract_conversation.py)" \
  "<conversation.jsonl>"

# Last 50 items
uv run --with tiktoken python "$([ -f "${CLAUDE_PLUGIN_ROOT}/lib/extract_conversation.py" ] && echo "${CLAUDE_PLUGIN_ROOT}/lib/extract_conversation.py" || echo ~/.claude/skills/manage-artifact/scripts/extract_conversation.py)" \
  "<conversation.jsonl>" --last 50

# JSONL format (backwards compat)
uv run --with tiktoken python "$([ -f "${CLAUDE_PLUGIN_ROOT}/lib/extract_conversation.py" ] && echo "${CLAUDE_PLUGIN_ROOT}/lib/extract_conversation.py" || echo ~/.claude/skills/manage-artifact/scripts/extract_conversation.py)" \
  "<conversation.jsonl>" --json
```

## Flags

| Flag | Description |
|------|-------------|
| `--last N` | Limit to last N items |
| `--output DIR` | Custom output directory (default: `/tmp/{conversation_uid}/`) |
| `--json` | Output JSONL instead of XML (backwards compat) |

All content types always included: user messages, assistant text, native thinking blocks, and tool calls with progressive disclosure. No content-filtering flags exist.

**Never use `2>/dev/null`** — stderr contains the total token count and error messages. Suppressing stderr = silent failures and missing token counts. Every time.

## Output Structure

```
/tmp/{conversation_uid}/
├── chunk1.txt, chunk2.txt, ...   Semantic XML chunks (~30K chars each)
└── details/                       Progressive disclosure detail files
    ├── bash_5.txt                 Verbose tool output >1000 chars
    ├── read_12.txt                Full file contents
    └── task_43.txt                Agent results
```

## Output Formats

### Default: Semantic XML

Optimized for AI consumption. Each entry has semantic tag with index:

```xml
<user_1>
Fix the bug in config.py
</user_1>

<bash_2>
git status
→ On branch main
    modified: config.py
</bash_2>

<thinking_5>
Reviewing the change... confidence is high
</thinking_5>

<assistant_3>
I'll update the config file now.
</assistant_3>
```

### Progressive Disclosure

Verbose tool output (>1000 chars) is externalized to detail files:

```xml
<bash_5>
uv run onboarding_bootstrap.py
→ [4129 chars → /tmp/{uid}/details/bash_5.txt]
</bash_5>
```

**Exempt from externalization:** AskUserQuestion — always stays full inline (questions + options + answers).

### Unified Thinking Tags

All reasoning sources render as `<thinking_N>`:
- Native extended thinking blocks
- MCP reasoning tools (AoT, AoT-light, sequentialthinking)
- Bash-wrapped `mcp-cli call` to reasoning tools

### Known-Command Patterns

| Pattern | Behavior |
|---------|----------|
| `mcp-cli info/tools/grep` | Skipped entirely (zero signal) |
| `onboarding_bootstrap.py` | Condensed to key fields inline, full JSON in detail file |
| `gh issue` commands | Condensed to `#N: title` inline, full output in detail file |

### --json: JSONL Format

One JSON object per line (backwards compatible):

```json
{"role": "user", "text": "Fix the bug", "_id": "abc123"}
{"role": "assistant", "tool_name": "Bash", "tool_input": {...}}
```

## Chunking

- **Auto-chunks:** Splits into ~30K character files when content is large
- **IMPORTANT: Read each chunk in its entirety** — the whole purpose of chunking is to create context-sized pieces. Do not grep or extract from chunks; load each one fully.

## Large Conversation Handling

**< 50K tokens:** Read chunks directly — load each chunk sequentially, extract what you need.

**> 50K tokens:** Triage → Read. Two phases, one workflow. No exceptions.

### Phase 1: Triage (agents filter)

Spawn sonnet agents with a mandatory query. Agents identify WHICH chunks matter — they do NOT answer the query themselves. Triage agents are filters, not analysts.

```
Task(subagent_type="general-purpose", model="sonnet", prompt="
  Read each chunk INDIVIDUALLY using the Read tool — one file per
  Read call. Never use Bash for-loops, cat, or any method that
  combines multiple chunks. Every time.

  Query: {specific_question}

  Return in this EXACT format only:

  MUST_READ:
  - chunk N
  - chunk N

  EXCLUDED:
  - chunk N-N: (one-line what these contain)

  Rules:
  - MUST_READ = bare chunk IDs only. No reasons, no quotes, no analysis.
  - EXCLUDED = chunk IDs + one-line orientation so the reader knows what was skipped.
  - Total response must be under 12 lines.
  - You are a filter. The main agent reads the chunks itself.
  - Do NOT answer the query. Do NOT provide analysis, verdicts, or summaries.")
```

YOU MUST include a specific query. "Read the conversation" without a question = wasted triage. The query drives chunk selection.

### Phase 2: Budget check

Sum token counts for must-read chunks (extraction output shows per-chunk tokens). If total must-read tokens > 60K, spawn a second triage agent on ONLY the must-read chunks:

```
Task(subagent_type="general-purpose", model="sonnet", prompt="
  Read these specific chunks: [must-read list with paths].
  Read each chunk INDIVIDUALLY using the Read tool.

  Query: {same_query}

  These chunks all passed first triage. But {total}K tokens exceeds
  the 60K context budget. Identify redundant or duplicate evidence.
  Return the 3-5 sharpest chunks. Same MUST_READ/EXCLUDED format.")
```

Pass 1 filters by **relevance** (does this chunk answer the query?). Pass 2 filters by **redundancy** (do these chunks say the same thing?).

### Phase 3: Read (main context analyzes)

After triage (and budget check if needed), YOU MUST read each must-read chunk in full using the Read tool. This is where analysis happens — in main context, with full behavioral nuance preserved.

Triage narrows chunks to 3-5 that fit in context. You read those 3-5. Every time. Skipping this step = diagnosing from summaries instead of evidence. The failure mode: triage agents return analysis, main agent uses summaries as final output, behavioral nuance is lost.

## When to Use

| Scenario | Approach |
|----------|----------|
| "What did we discuss?" | Extract, read chunks directly |
| "What did Claude do?" | Extract, focus on tool tags in chunks |
| "Verify tool output" | Extract with `--last 20` |
| "Full audit" | Extract all, read sequentially |
| "Large conversation (>50K)" | Extract, triage → read identified chunks |
| "Need raw JSON" | Add `--json` |

---
name: conversation-reader
description: "Extract and read Claude conversation JSONL files for behavioral diagnosis, self-reflection, and audit. Use when task involves conversation history, session evidence, or .jsonl files from ~/.claude/projects/. Triggers: 'read conversation', 'extract session', 'what happened in session X', 'find the correction', conversation-reader, or any reference to session UUIDs. The extraction script handles chunking — this skill teaches the reading methodology (discovery: rubber-duck)."
---

# Conversation Reader

Conversations carry behavioral context — the narrative arc that explains
WHY something happened, not just THAT it happened. Scanning finds strings.
Reading finds meaning. Your job is to find meaning.

## Extract

```bash
uv run --with tiktoken python "$([ -f "${CLAUDE_PLUGIN_ROOT}/lib/extract_conversation.py" ] && echo "${CLAUDE_PLUGIN_ROOT}/lib/extract_conversation.py" || echo ~/.claude/lib/extract_conversation.py)" "<session-uuid-or-path>"
```

The script auto-resolves bare session UUIDs to full paths, chunks output
into ~30K character files, and prints chunk paths with per-chunk token counts.

Stderr carries the total token count and errors — never suppress it with `2>/dev/null`.
Silencing stderr means flying blind on both extraction failures and budget decisions.

## Triage

Every conversation gets triaged — no size thresholds, no exceptions.
The query shapes what the triage agent selects, so make it specific.

Spawn a sonnet agent as a **filter**. It identifies which chunks matter.
It does not answer the query — that's your job after reading.

```
Task(subagent_type="general-purpose", prompt="
  Chunks to read (use these EXACT paths):
  {chunk_file_list_from_extraction_output}

  Read each chunk INDIVIDUALLY using the Read tool — one file per Read call.

  Query: {your_specific_question}

  Return ONLY:

  MUST_READ:
  - chunk N

  EXCLUDED:
  - chunk N-N: (one-line what these contain)

  You are a filter. Do not answer the query, analyze, or summarize.")
```

Why filters, not analysts: when triage agents analyze, their summaries
become your final output — and summaries lose the behavioral nuance
that makes conversation reading valuable. The correction quote matters
more than an agent's interpretation of it.

## Pre-Screen (multiple conversations)

When reading 2 or more conversations for the same query, pre-screen first.
You can't triage them all — the chunks alone would exceed your context.
Select the 1-2 best conversations, then triage chunks within those.

Spawn one agent per conversation. Each scans its conversation
against your query and returns three signals:

```
Task(subagent_type="general-purpose", prompt="
  Read all chunks at {chunk_directory}.
  Read each chunk individually via Read tool.

  Query: {your_query}

  Scan the conversation for evidence that answers this query.
  Return ONLY these three signals:

  1. ANSWERS QUERY? Yes / Partial / No
  2. DENSITY: How much evidence? (thin = 1 moment, moderate = 2-3, rich = throughout)
  3. SHARPEST QUOTE: The single most relevant sentence from the conversation.

  You are a filter. Do not answer the query itself.")
```

From the returns, select 1-2 conversations with the richest evidence
and widest coverage. Then triage chunks within those.

## Read

After triage, YOU — the main agent — read each must-read chunk in full
using the Read tool. Sub-agents triaged. You read. You analyze.

This separation matters: sub-agents are filters that identify where to look.
Analysis happens in main context where the user can see your reasoning,
ask follow-ups, and correct misinterpretations. Delegating analysis
to sub-agents removes the user from the loop.

## Examples

**Example 1: "What correction did the user make about approach?"**

1. Extract: `uv run --with tiktoken python "$([ -f "${CLAUDE_PLUGIN_ROOT}/lib/extract_conversation.py" ] && echo "${CLAUDE_PLUGIN_ROOT}/lib/extract_conversation.py" || echo ~/.claude/lib/extract_conversation.py)" "9dce4f93"`
2. Triage with query: "Find where the user corrected the AI about witness approach"
3. Read must-read chunks in main context
4. Analyze the correction in full behavioral context

**Example 2: "Which of these 6 sessions has the best evidence for Theme 2?"**

1. Extract all 6 sessions
2. Pre-screen: 1 agent per conversation, query: "Does this contain approach discussion failures?"
3. Select 1-2 richest conversations from pre-screen signals
4. Triage selected conversations for must-read chunks
5. Read chunks, synthesize across conversations

## Troubleshooting

**Triage agent returns analysis instead of chunk IDs:**
The agent adopted an analyst role instead of a filter role.
Reinforce in the prompt: "You are a filter. Do not answer the query."

**Triage agent guesses wrong chunk file paths:**
The extraction output prints exact paths with token counts.
Copy them into the triage prompt verbatim — never let agents infer paths.

**Context budget blown after reading must-read chunks:**
Too many conversations selected. Return to pre-screen and narrow to 1-2.
The pre-screen signals (density + sharpest quote) tell you which to keep.

**Extraction produces very small chunks (<200 tokens):**
Degenerate chunks from short sessions. The script merges these automatically —
if you still see them, the session was genuinely tiny.

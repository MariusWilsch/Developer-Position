---
name: read-transcript
description: "Chunk-read long transcripts against specific questions, returning traceable direct quotes (discovery: rubber-duck). Evaluate when task requires reading meeting transcripts, interview recordings, or conversation logs from Google Drive or Fireflies. Triggers: 'read transcript', 'extract from transcript', 'what did they say about', 'find quotes from meeting'."
---

# Read Transcript

Read long transcripts methodically by chunking, then extracting question-relevant quotes with source traceability. Prevents the common failure mode of search+grep on transcripts, which loses synthesis quality.

## Workflow: FETCH → CHUNK → EXTRACT → ASSEMBLE

### Step 1: FETCH — Get the transcript

**Google Drive transcript:**
```bash
mcp-cli call google_workspace/get_drive_file_content '{"file_id": "<FILE_ID>"}'
```
Save output to `/tmp/transcript.txt`.

**Fireflies transcript:**
```bash
mcp-cli call hand-picked-tools/fireflies__fireflies_get_transcript '{"transcript_id": "<ID>"}'
```
Save output to `/tmp/transcript.txt`.

If source type is unclear, ask the user.

### Step 2: CHUNK — Split into readable segments

```bash
uv run python ~/.claude/lib/chunk_transcript.py /tmp/transcript.txt
```

Output: numbered files in `/tmp/` (e.g., `transcript_chunk1.txt`, `transcript_chunk2.txt`).

Read each chunk file in its entirety. That is the purpose of chunking — do NOT search or grep within chunks.

### Step 3: EXTRACT — Pull question-relevant quotes

For EACH chunk, read the full content and extract:
- **Direct quotes** relevant to each question
- **Speaker attribution** when identifiable
- **Chunk marker**: `[chunk#N]` where N is the chunk number

Format each extracted quote:
```
[chunk#N] "Direct quote from transcript" — Speaker (if known)
```

When multiple questions are provided, organize extraction per-question within each chunk. Do NOT skip chunks — even chunks with no relevant quotes confirm absence.

### Step 4: ASSEMBLE — Combine with traceability

Group all extracted quotes by question:

```
## Q: [Question text]

1. [chunk#2] "Relevant quote here" — Speaker
2. [chunk#5] "Another relevant quote" — Speaker
3. [chunk#5] "Follow-up point" — Speaker

## Q: [Second question]

1. [chunk#1] "Quote addressing this question" — Speaker
```

Include a summary synthesis after the quotes for each question, noting which chunks contained the most relevant material.

## Source Detection

| Source | Identifier Pattern | MCP Tool |
|--------|-------------------|----------|
| Google Drive | URL with `/d/{fileId}/` or file ID | `google_workspace/get_drive_file_content` |
| Fireflies | Transcript ID or meeting title | `hand-picked-tools/fireflies__fireflies_search` → `fireflies_get_transcript` |

When the user provides a URL, extract the file ID. When they provide a meeting name, search Fireflies first.

## Error Handling

- **Source inaccessible**: Report the specific error (permissions, not found, API failure). Do NOT return partial results.
- **Empty transcript**: Report "Transcript is empty" after confirming fetch succeeded.
- **No relevant quotes found**: Report per-question: "No relevant quotes found in N chunks examined."

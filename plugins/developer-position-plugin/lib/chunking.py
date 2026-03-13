#!/usr/bin/env python3
"""Shared character counting and chunking utilities.

Extracted from manage-artifact's extract_conversation.py to enable reuse
across conversation extraction and plain-text transcript chunking.

Design Context:
    - count_tokens uses tiktoken with cl100k_base, falls back to char/4 estimate.
      Used for metadata reporting only (extraction output summary).
    - chunk_by_chars splits by character count (not tokens). The consumer of
      chunks is the Read tool, which is character-limited. Token-based chunking
      produced chunks within token budgets but with inflated character counts
      (skill injections, AskUserQuestion JSON, thinking blocks have high
      chars/token ratios). Character-based chunking directly targets the
      actual constraint.
    - CHAR_CHUNK_SIZE of 30K keeps every chunk loadable by the Read tool
      with room for AI reasoning in context.
"""

import json

CHAR_CHUNK_SIZE = 30000


def count_tokens(text: str) -> int:
    """Count tokens with tiktoken, fallback to char estimate.

    Used for metadata reporting in extraction output, not for chunking decisions.
    """
    try:
        import tiktoken
        encoding = tiktoken.get_encoding("cl100k_base")
        return len(encoding.encode(text))
    except ImportError:
        return len(text) // 4


def chunk_by_chars(items: list, max_chars: int = CHAR_CHUNK_SIZE) -> list:
    """Split items into chunks of approximately max_chars characters each.

    Items can be dicts (measured via json.dumps) or strings (measured directly).
    Splits at item boundaries — never mid-item.
    """
    chunks = []
    current_chunk = []
    current_chars = 0

    for item in items:
        item_text = item if isinstance(item, str) else json.dumps(item)
        item_chars = len(item_text)

        if current_chars + item_chars > max_chars and current_chunk:
            chunks.append(current_chunk)
            current_chunk = [item]
            current_chars = item_chars
        else:
            current_chunk.append(item)
            current_chars += item_chars

    if current_chunk:
        chunks.append(current_chunk)

    return chunks

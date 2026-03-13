#!/usr/bin/env python3
"""Chunk plain text files into ~20K token segments.

Splits text by lines and groups them using the shared chunking utility.
Designed for transcript files (Google Drive, Fireflies) that need to be
read in manageable chunks by AI agents.

Design Context:
    - Uses line-based splitting to preserve paragraph boundaries
    - Chunks are written as plain text (not JSON) for direct reading
    - Output files use sequential numbering: {stem}_chunk{N}.txt
    - Single-chunk files keep original name (no _chunk1 suffix)
    - Concatenating all output chunks reproduces the original content
"""

import sys
import argparse
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from chunking import count_tokens, chunk_by_tokens, TOKEN_CHUNK_SIZE


def chunk_text_file(input_path: Path, output_dir: Path, max_tokens: int = TOKEN_CHUNK_SIZE) -> list:
    """Split a plain text file into token-bounded chunks.

    Returns list of (path, token_count) tuples for each output file.
    """
    text = input_path.read_text()
    lines = text.splitlines(keepends=True)

    if not lines:
        # Empty file — write single empty output
        out_path = output_dir / input_path.name
        out_path.write_text('')
        return [(out_path, 0)]

    chunks = chunk_by_tokens(lines, max_tokens)

    stem = input_path.stem
    suffix = input_path.suffix or '.txt'
    chunk_files = []

    if len(chunks) == 1:
        out_path = output_dir / f"{stem}{suffix}"
        content = ''.join(chunks[0])
        out_path.write_text(content)
        chunk_files.append((out_path, count_tokens(content)))
    else:
        for i, chunk in enumerate(chunks, 1):
            out_path = output_dir / f"{stem}_chunk{i}{suffix}"
            content = ''.join(chunk)
            out_path.write_text(content)
            chunk_files.append((out_path, count_tokens(content)))

    return chunk_files


def main():
    parser = argparse.ArgumentParser(
        description='Chunk plain text files into ~20K token segments.'
    )
    parser.add_argument('input_path', type=str, help='Path to plain text file')
    parser.add_argument('--output-dir', '-o', type=str, default='/tmp',
                       help='Output directory (default: /tmp)')
    parser.add_argument('--max-tokens', type=int, default=TOKEN_CHUNK_SIZE,
                       help=f'Max tokens per chunk (default: {TOKEN_CHUNK_SIZE})')

    args = parser.parse_args()

    input_path = Path(args.input_path).resolve()
    output_dir = Path(args.output_dir)

    if not input_path.exists():
        print(f"Error: File not found: {input_path}", file=sys.stderr)
        sys.exit(1)

    output_dir.mkdir(parents=True, exist_ok=True)

    print(f"📂 Input: {input_path.name}", file=sys.stderr)
    print(f"📊 Size: {input_path.stat().st_size / 1024:.1f} KB", file=sys.stderr)

    chunk_files = chunk_text_file(input_path, output_dir, args.max_tokens)

    total_tokens = sum(tokens for _, tokens in chunk_files)
    print(f"\n{'='*50}", file=sys.stderr)
    print(f"📦 Chunks: {len(chunk_files)} file(s)", file=sys.stderr)
    print(f"📊 Total tokens: {total_tokens:,}", file=sys.stderr)
    print(f"{'='*50}", file=sys.stderr)

    for path, tokens in chunk_files:
        print(f"  {path} ({tokens:,} tokens)", file=sys.stderr)

    print(f"{'='*50}", file=sys.stderr)


if __name__ == "__main__":
    main()

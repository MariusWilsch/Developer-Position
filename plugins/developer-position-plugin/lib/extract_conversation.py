#!/usr/bin/env python3
"""
Extract and format Claude conversation JSONL files.

ORCHESTRATION SCRIPT - delegates to helpers/ for implementation details.

OUTPUT STRUCTURE:
  /tmp/{conversation_uid}/
    chunk1.txt, chunk2.txt, ...   Semantic XML chunks (~30K chars each)
    details/                       Progressive disclosure detail files
      bash_5.txt, read_12.txt     Verbose tool output >1000 chars

OUTPUT FORMATS:
  Default (XML):  Semantic XML tags with indices for AI consumption
                  <user_1>message</user_1>
                  <bash_2>command</bash_2>
                  <thinking_9>native thinking</thinking_9>

  --json:         JSONL format (one JSON per line) for backwards compat

PROGRESSIVE DISCLOSURE:
  Tool output >1000 chars is externalized to details/{tag}_{N}.txt.
  Inline entries show char count + detail file path as reference.
  AskUserQuestion output is always kept full inline.

CONTENT:
  All content types included: user messages, assistant text, native
  thinking blocks, and tool calls with progressive disclosure.
  Known-command patterns: reasoning tools → <thinking_N>, MCP info → skip,
  bootstrap → condense, gh issue → condense.

CHUNKING:
  - Auto-chunks into ~30K char files via shared chunking utility
  - Read each chunk in its entirety (that's the purpose of chunking)

See helpers/ for: truncation.py, extraction.py, formatters.py
See ~/.claude/lib/chunking.py for: count_tokens, chunk_by_chars
"""

import json
import sys
import argparse
from pathlib import Path

from helpers import (
    truncate_binary_content,
    get_message_id,
    is_command_marker,
    parse_command_info,
    get_message_content,
    find_tool_use_items,
    find_tool_result_id,
    extract_texts_from_content,
    extract_thinking_from_content,
    should_include,
    format_items_to_xml,
    format_items_to_jsonl,
)

# Add shared lib to path for chunking imports
sys.path.insert(0, str(Path.home() / '.claude' / 'lib'))
from chunking import count_tokens, chunk_by_chars

# Constants
DEFAULT_OUTPUT_DIR = '/tmp'


def _flush_tool_markers(tool_marker_buffer, output_lines, include_user, include_assistant, include_tools):
    """Flush buffered tool markers, collapsing multiple consecutive markers."""
    if not tool_marker_buffer:
        return
    if len(tool_marker_buffer) == 1:
        if should_include(tool_marker_buffer[0], include_user, include_assistant, include_tools):
            output_lines.append(tool_marker_buffer[0])
        return
    collapsed = tool_marker_buffer[0].copy()
    collapsed['tools_collapsed'] = len(tool_marker_buffer)
    del collapsed['tools']
    if should_include(collapsed, include_user, include_assistant, include_tools):
        output_lines.append(collapsed)


def _process_tool_result(tool_result, tool_name, extracted):
    """Process toolUseResult value into extracted dict fields."""
    if tool_result is None:
        extracted['tools'] = 'executed'
    elif isinstance(tool_result, str):
        extracted['tool_output'] = truncate_binary_content(tool_result, tool_name)
    elif isinstance(tool_result, dict):
        result_str = json.dumps(tool_result, indent=2)
        extracted['tool_output'] = truncate_binary_content(result_str, tool_name)
    elif isinstance(tool_result, list):
        text = extract_texts_from_content(tool_result)
        if text:
            extracted['tool_output'] = truncate_binary_content(text, tool_name)
        else:
            extracted['tools'] = 'executed'
    else:
        extracted['tools'] = 'executed'


def extract_essentials(jsonl_path, include_user=False, include_assistant=False, include_tools=False):
    """Extract fields from conversation JSONL based on composable filters.

    Returns list of extracted message dicts.
    """
    output_lines = []
    pending_marker = None
    tool_marker_buffer = []
    pending_tool_names = {}
    pending_tool_inputs = {}

    with open(jsonl_path, 'r') as f:
        for line_num, line in enumerate(f, 1):
            try:
                obj = json.loads(line)
            except json.JSONDecodeError:
                print(f"Warning: Skipping invalid JSON at line {line_num}", file=sys.stderr)
                continue

            # Guard: skip summary lines
            if obj.get('type') == 'summary':
                continue

            # Always extract message content (unified call, was split across two branches)
            msg, content = get_message_content(obj)

            # Guard: skip if no message
            if not msg:
                continue

            # Track tool use/result mappings
            tool_name = None
            tool_input = None
            if include_tools:
                for tool_use_id, name, input_data in find_tool_use_items(content or []):
                    if tool_use_id:
                        pending_tool_names[tool_use_id] = name
                        pending_tool_inputs[tool_use_id] = input_data
                        tool_name = name
                        tool_input = input_data

                result_id = find_tool_result_id(content or [])
                if result_id and result_id in pending_tool_names:
                    tool_name = pending_tool_names[result_id]
                    tool_input = pending_tool_inputs.get(result_id)

            # Build extracted dict
            extracted = {'role': msg.get('role', 'unknown')}

            # Extract text
            raw_content = msg.get('content')
            if isinstance(raw_content, str):
                extracted['text'] = raw_content
            elif content:
                text = extract_texts_from_content(content)
                if text:
                    extracted['text'] = text

            # Extract native thinking blocks (type: "thinking" in content array)
            if content:
                thinking = extract_thinking_from_content(content)
                if thinking:
                    extracted['thinking'] = thinking

            if 'timestamp' in obj:
                extracted['timestamp'] = obj['timestamp']

            # Tool results
            if 'toolUseResult' in obj:
                _process_tool_result(obj.get('toolUseResult'), tool_name, extracted)

            if tool_name:
                extracted['tool_name'] = tool_name
            if tool_input:
                extracted['tool_input'] = tool_input

            extracted['_id'] = get_message_id(extracted)

            # Tool marker collapsing — buffer 'executed' markers
            if extracted.get('tools') == 'executed':
                tool_marker_buffer.append(extracted)
                continue

            # Flush any buffered tool markers before emitting new content
            _flush_tool_markers(tool_marker_buffer, output_lines, include_user, include_assistant, include_tools)
            tool_marker_buffer = []

            # Command marker collapsing
            if 'text' in extracted and is_command_marker(extracted['text']):
                cmd_info = parse_command_info(extracted['text'])
                if cmd_info:
                    pending_marker = {
                        'extracted': extracted,
                        'command_name': cmd_info[0],
                        'command_args': cmd_info[1],
                        'timestamp': extracted.get('timestamp')
                    }
                    continue

            # Template following command marker
            if pending_marker and 'text' in extracted:
                collapsed = pending_marker['extracted'].copy()
                collapsed['command_marker'] = {
                    'name': pending_marker['command_name'],
                    'args': pending_marker['command_args'],
                    'template': extracted['text']
                }
                del collapsed['text']
                if should_include(collapsed, include_user, include_assistant, include_tools):
                    output_lines.append(collapsed)
                pending_marker = None
                continue

            # Guard: skip if no meaningful content
            if not ('text' in extracted or 'thinking' in extracted or 'tool_output' in extracted or 'tool_name' in extracted):
                continue

            if should_include(extracted, include_user, include_assistant, include_tools):
                output_lines.append(extracted)

    # Flush remaining tool markers
    _flush_tool_markers(tool_marker_buffer, output_lines, include_user, include_assistant, include_tools)

    return output_lines


def write_chunks(chunks: list, base_path: Path, output_format: str = 'xml', details_dir: Path = None) -> list:
    """Write chunks to numbered files in specified format.

    When details_dir is provided and format is XML, verbose tool output
    is externalized to detail files via progressive disclosure.
    """
    chunk_files = []

    def format_chunk(items):
        if output_format == 'xml':
            return format_items_to_xml(items, details_dir=details_dir)
        return format_items_to_jsonl(items)

    parent = base_path.parent
    suffix = base_path.suffix or '.txt'

    for i, chunk in enumerate(chunks, 1):
        chunk_path = parent / f"chunk{i}{suffix}"
        content = format_chunk(chunk)
        with open(chunk_path, 'w') as f:
            f.write(content + '\n')
        tokens = count_tokens(content)
        chunk_files.append((chunk_path, tokens))

    return chunk_files


def main():
    parser = argparse.ArgumentParser(
        description='Extract and format Claude conversation JSONL files.',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog='''
Output formats:
  Default: Semantic XML (<user_1>, <bash_2>, etc.) - optimized for AI
  --json:  JSONL (one JSON per line) - backwards compatible

Examples:
  %(prog)s conversation.jsonl
  %(prog)s conversation.jsonl --json
  %(prog)s conversation.jsonl --last 50
'''
    )
    parser.add_argument('input_path', type=str, help='Path to conversation JSONL')
    parser.add_argument('--last', type=int, metavar='N', help='Limit to last N items')
    parser.add_argument('--output', '-o', type=str, metavar='FILE',
                       help='Output file (default: /tmp/{conversation_uid}.txt)')
    parser.add_argument('--json', action='store_true', help='Output JSONL instead of XML')

    args = parser.parse_args()

    input_path = Path(args.input_path).resolve()

    # Guard: file must exist
    if not input_path.exists():
        print(f"Error: File not found: {input_path}", file=sys.stderr)
        sys.exit(1)

    # Status
    output_format = 'json' if args.json else 'xml'
    print(f"📂 Processing: {input_path.name}", file=sys.stderr)
    print(f"📄 Format: {output_format.upper()}", file=sys.stderr)

    # Extract (all content types always included)
    extracted = extract_essentials(
        input_path,
        include_user=True,
        include_assistant=True,
        include_tools=True
    )

    if args.last and args.last > 0:
        extracted = extracted[-args.last:]

    print(f"✅ Extracted: {len(extracted)} messages", file=sys.stderr)

    # Output directory: /tmp/{uuid}/ with chunks + details/
    conversation_uid = input_path.stem
    if args.output:
        output_dir = Path(args.output)
    else:
        output_dir = Path(DEFAULT_OUTPUT_DIR) / conversation_uid
    output_dir.mkdir(parents=True, exist_ok=True)

    # Progressive disclosure: detail files for verbose tool output
    details_dir = output_dir / 'details'
    details_dir.mkdir(exist_ok=True)

    output_path = output_dir / 'chunk1.txt'

    chunks = chunk_by_chars(extracted)
    chunk_files = write_chunks(chunks, output_path, output_format, details_dir=details_dir)

    # Count detail files created
    detail_files = list(details_dir.iterdir())
    detail_count = len(detail_files)

    # Summary
    total_tokens = sum(tokens for _, tokens in chunk_files)
    print(f"\n{'='*50}", file=sys.stderr)
    print(f"📊 Total tokens: {total_tokens:,}", file=sys.stderr)
    print(f"📦 Chunks: {len(chunk_files)} file(s)", file=sys.stderr)
    if detail_count:
        print(f"📎 Details: {detail_count} file(s) in {details_dir}", file=sys.stderr)
    print(f"{'='*50}", file=sys.stderr)

    for path, tokens in chunk_files:
        print(f"  {path} ({tokens:,} tokens)", file=sys.stderr)

    print(f"{'='*50}\n", file=sys.stderr)


if __name__ == "__main__":
    main()

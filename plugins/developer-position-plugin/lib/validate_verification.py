#!/usr/bin/env python3
"""
Validate verification.jsonl entries against AC and infrastructure-note schemas.

Usage:
    validate_verification.py <issue_number> [--path <project_path>]

Reads {path}/.claude/tracking/issue-{N}/verification.jsonl and validates
each entry against the appropriate schema based on entry type.

Entry Types:
    - ac-verification (default): AC verification decision trace
    - infrastructure-note: Infrastructure observations captured during verification
"""

import sys
import json
import argparse
from pathlib import Path

# Schema for AC verification entries
AC_REQUIRED_FIELDS = ['ac', 'gwt_ref', 'recorded', 'result', 'trace', 'reasoning']

# Schema for infrastructure-note entries
INFRA_REQUIRED_FIELDS = ['type', 'recorded', 'observation', 'impact', 'suggested_fix']


def validate_ac_entry(entry: dict) -> list[str]:
    """Validate an AC verification entry."""
    errors = []

    # Check required fields
    missing = [f for f in AC_REQUIRED_FIELDS if f not in entry]
    if missing:
        errors.append(f"Missing required fields: {missing}")

    # Check ac pattern
    if 'ac' in entry and not entry['ac'].startswith('AC'):
        errors.append(f"'ac' must match pattern AC[0-9]+ (got: {entry['ac']})")

    # Check result enum
    if 'result' in entry and entry['result'] not in ['passed', 'failed', 'pending']:
        errors.append(f"'result' must be 'passed', 'failed', or 'pending' (got: {entry['result']})")

    # Check trace is array
    if 'trace' in entry and not isinstance(entry['trace'], list):
        errors.append("'trace' must be an array")

    return errors


def validate_infra_entry(entry: dict) -> list[str]:
    """Validate an infrastructure-note entry."""
    errors = []

    # Check required fields
    missing = [f for f in INFRA_REQUIRED_FIELDS if f not in entry]
    if missing:
        errors.append(f"Missing required fields: {missing}")

    # Check type value
    if entry.get('type') != 'infrastructure-note':
        errors.append(f"'type' must be 'infrastructure-note' (got: {entry.get('type')})")

    return errors


def validate_entry(entry: dict) -> tuple[str, list[str]]:
    """Validate a single entry, detecting type automatically.

    Returns:
        Tuple of (entry_type, errors_list)
    """
    entry_type = entry.get('type', 'ac-verification')

    if entry_type == 'infrastructure-note':
        return ('infrastructure-note', validate_infra_entry(entry))
    else:
        return ('ac-verification', validate_ac_entry(entry))


def find_git_root() -> Path | None:
    """Find git root by walking up from cwd."""
    current = Path.cwd()
    while current != current.parent:
        if (current / ".git").exists():
            return current
        current = current.parent
    return None


def main():
    parser = argparse.ArgumentParser(
        description='Validate verification.jsonl entries.',
        epilog='Example: validate_verification.py 410 --path /path/to/project'
    )
    parser.add_argument('issue', help='Issue number (e.g., 410)')
    parser.add_argument('--path', '-p', dest='project_path',
                        help='Project path (default: find git root or cwd)')

    args = parser.parse_args()

    # Determine base path
    if args.project_path:
        base_path = Path(args.project_path)
    else:
        git_root = find_git_root()
        base_path = git_root if git_root else Path.cwd()

    jsonl_file = base_path / f".claude/tracking/issue-{args.issue}/verification.jsonl"

    if not jsonl_file.exists():
        print(f"Error: File not found: {jsonl_file}", file=sys.stderr)
        sys.exit(1)

    # Read and validate each line
    all_valid = True
    ac_entries = []
    infra_entries = []

    with open(jsonl_file) as f:
        for line_num, line in enumerate(f, 1):
            if not line.strip():
                continue

            try:
                entry = json.loads(line)
            except json.JSONDecodeError as e:
                print(f"Line {line_num}: Invalid JSON - {e}", file=sys.stderr)
                all_valid = False
                continue

            entry_type, errors = validate_entry(entry)
            if errors:
                identifier = entry.get('ac', entry.get('observation', '?')[:30])
                print(f"Line {line_num} ({identifier}): {errors}", file=sys.stderr)
                all_valid = False
                continue

            if entry_type == 'infrastructure-note':
                infra_entries.append(entry)
                continue

            ac_entries.append(entry)

    # Summary - guard clause for failure
    if not all_valid:
        print(f"✗ Validation failed", file=sys.stderr)
        sys.exit(1)

    total = len(ac_entries) + len(infra_entries)
    print(f"✓ All {total} entries valid")

    if ac_entries:
        print(f"  AC Verifications ({len(ac_entries)}):")
        for e in ac_entries:
            print(f"    {e['ac']}: {e['result']}")

    if infra_entries:
        print(f"  Infrastructure Notes ({len(infra_entries)}):")
        for e in infra_entries:
            obs_preview = e['observation'][:50]
            print(f"    - {obs_preview}...")

    sys.exit(0)


if __name__ == '__main__':
    main()

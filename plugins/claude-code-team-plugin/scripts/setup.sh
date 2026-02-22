#!/bin/bash
# setup.sh - Install core dependencies for claude-code-team-plugin
#
# Design Context:
#   Checks for jq, gh, uv — the three tools required by hooks and lib scripts.
#   OS-aware: macOS uses brew, Linux prefers brew if present, falls back to apt + curl.
#   Pass --check to report status without installing (dry-run).
#   uv modifies shell rc files but not the current shell — user must restart shell after install.

set -uo pipefail

CHECK_ONLY="${1:-}"
FAILED=()
UV_INSTALLED=false

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

ok()   { echo -e "  ${GREEN}✓${NC} $1"; }
miss() { echo -e "  ${RED}✗${NC} $1 (not found)"; }
info() { echo -e "  ${BLUE}→${NC} $1"; }
fail() { echo -e "  ${RED}✗${NC} $1 (install failed)"; FAILED+=("$1"); }

detect_os() {
    if [[ "$OSTYPE" == "darwin"* ]]; then
        echo "mac"
    elif grep -qi microsoft /proc/version 2>/dev/null; then
        echo "wsl"
    elif [[ -f /etc/os-release ]]; then
        echo "linux"
    else
        echo "unknown"
    fi
}

OS=$(detect_os)

install_jq() {
    if [[ "$OS" == "mac" ]] || command -v brew &>/dev/null; then
        brew install jq
    else
        sudo apt-get install -y jq
    fi
}

install_gh() {
    if [[ "$OS" == "mac" ]] || command -v brew &>/dev/null; then
        brew install gh
    else
        # Official GitHub CLI apt source
        curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg \
            | sudo dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg 2>/dev/null
        sudo chmod go+r /usr/share/keyrings/githubcli-archive-keyring.gpg
        echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" \
            | sudo tee /etc/apt/sources.list.d/github-cli.list >/dev/null
        sudo apt-get update -qq
        sudo apt-get install -y gh
    fi
}

install_uv() {
    curl -LsSf https://astral.sh/uv/install.sh | sh
    UV_INSTALLED=true
}

check_dep() {
    local name="$1"
    local binary="$2"
    local install_fn="$3"

    if command -v "$binary" &>/dev/null; then
        ok "$name"
        return
    fi

    if [[ -n "$CHECK_ONLY" ]]; then
        miss "$name"
        return
    fi

    info "Installing $name..."
    if "$install_fn"; then
        # uv modifies PATH via rc file — binary won't be on PATH in current shell
        if [[ "$name" == "uv" ]] || command -v "$binary" &>/dev/null; then
            ok "$name"
        else
            fail "$name"
        fi
    else
        fail "$name"
    fi
}

echo ""
echo "🔧 Claude Code Team Plugin — Dependency Setup"
echo "=============================================="
echo "Platform: $OS"
echo ""

check_dep "jq" "jq" install_jq
check_dep "gh" "gh" install_gh
check_dep "uv" "uv" install_uv

echo ""

if [[ ${#FAILED[@]} -gt 0 ]]; then
    echo -e "${RED}❌ Failed: ${FAILED[*]}${NC}"
    echo "   Try running with sudo, or install manually."
    exit 1
elif [[ -n "$CHECK_ONLY" ]]; then
    echo "Run without --check to install missing dependencies."
else
    echo -e "${GREEN}✅ Core dependencies ready${NC}"
fi

if [[ "$UV_INSTALLED" == true ]]; then
    echo ""
    echo -e "${YELLOW}⚠  uv was just installed — restart your shell before continuing:${NC}"
    echo "   source ~/.zshrc    # zsh"
    echo "   source ~/.bashrc   # bash"
fi
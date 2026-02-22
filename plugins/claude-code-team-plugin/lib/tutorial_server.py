#!/usr/bin/env python3
"""
Tutorial server for Traceline Claude Code plugin.

Serves the React tutorial app and manages WebSocket connections to Claude Code.
Each browser command is forwarded to `claude --print --output-format stream-json`
via a PTY subprocess, streaming structured events to the browser as they arrive.
Permission prompts are detected in raw PTY output and sent to the browser for
interactive approval — the user clicks Allow/Deny instead of typing in the server terminal.

Design Context:
    - PTY subprocess makes Claude Code behave as in a real terminal so permission
      prompts appear in the PTY stream instead of blocking the server terminal.
    - process_ansi() MUST convert cursor-right codes to spaces before stripping
      other ANSI codes, otherwise visual alignment spacing is destroyed.
    - Background asyncio Task runs each command; message loop stays alive so
      permission_response messages can arrive while a command is executing.
    - Session continuity via --resume <session_id> from stream-json result event.
    - CLAUDECODE env var is unset to allow nested claude invocation.
"""

import asyncio
import json
import logging
import os
import pty
import re
import webbrowser
from pathlib import Path
from typing import Dict, Optional
import socket
import subprocess
import sys

try:
    import websockets
    from websockets.server import WebSocketServerProtocol
    from http.server import HTTPServer, SimpleHTTPRequestHandler
    import threading
except ImportError:
    print("❌ Missing dependencies. Installing...")
    subprocess.check_call([sys.executable, '-m', 'pip', 'install', 'websockets'])
    import websockets
    from websockets.server import WebSocketServerProtocol
    from http.server import HTTPServer, SimpleHTTPRequestHandler
    import threading

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Detects Claude Code interactive permission prompt UI patterns in PTY output.
# Covers both arrow-key selector style (❯ Yes) and plain y/n prompts.
PERMISSION_RE = re.compile(
    r'(❯\s*(Yes|No|Allow|Deny|Cancel))|'
    r'(>\s*(Yes|No|Allow|Deny))|'
    r'(Do you want to|Allow this|Would you like to|Claude wants to)',
    re.IGNORECASE
)


def process_ansi(text: str) -> str:
    """Strip ANSI escape codes, converting cursor-right codes to spaces first.

    Cursor-right codes (ESC[nC) represent visual alignment spacing. Must be
    converted to spaces before stripping other ANSI or the text layout breaks.
    """
    # Convert cursor-right escape codes (ESC[nC) to equivalent spaces
    text = re.sub(r'\x1B\[(\d+)C', lambda m: ' ' * int(m.group(1)), text)
    # Strip all remaining ANSI escape sequences
    text = re.sub(r'\x1B\[[0-9;]*[a-zA-Z]', '', text)
    text = re.sub(r'\x1B[()][0-9A-Za-z]', '', text)
    # Strip carriage returns (PTY line endings are \r\n)
    text = text.replace('\r', '')
    return text


class ClaudeSession:
    """Per-connection Claude session using PTY + stream-json for full interactivity.

    Uses PTY so Claude Code behaves as in a real terminal: permission prompts
    appear in the stream, ANSI colors work, and input echoes correctly.
    stream-json provides structured events (assistant text, tool_use, result).

    Design Context:
        - _master_fd is set during active streaming; used by respond() to write
          permission choices (y/n/a) to Claude's stdin via the PTY.
        - Session continuity: --resume <session_id> reattaches Claude to the
          same conversation. session_id is extracted from stream-json result events.
        - CLAUDECODE env var unset to allow nested invocation from within Claude Code.
    """

    def __init__(self, plugin_root: str):
        self.plugin_root = plugin_root
        self.session_id: Optional[str] = None
        self._master_fd: Optional[int] = None  # Active PTY master fd, set during streaming

    def _resolve_prompt(self, command: str) -> str:
        """Expand /skill-name arg → full skill prompt from commands/*.md."""
        if not command.startswith('/'):
            return command

        parts = command.split(' ', 1)
        skill_name = parts[0][1:]
        args = parts[1].strip() if len(parts) > 1 else ''

        skill_file = Path(self.plugin_root) / 'commands' / f'{skill_name}.md'
        if not skill_file.exists():
            logger.warning("No skill file for /%s — passing raw command", skill_name)
            return command

        content = skill_file.read_text()
        if content.startswith('---'):
            end = content.find('---', 3)
            if end != -1:
                content = content[end + 3:].lstrip()

        return f"{content}\n\n---\n\nUser's request: {args}" if args else content

    def _build_env(self) -> dict:
        env = os.environ.copy()
        env.pop('CLAUDECODE', None)  # allow nested invocation
        return env

    def respond(self, choice: str) -> None:
        """Write a permission response (y/n/a) to the active PTY stdin.

        Called when the browser user clicks Allow/Deny on a permission prompt.
        The choice is written to master_fd which feeds Claude's stdin via PTY.
        """
        if self._master_fd is not None:
            try:
                os.write(self._master_fd, (choice + '\n').encode())
            except OSError as e:
                logger.error("Failed to write permission response to PTY: %s", e)
        else:
            logger.warning("respond() called but no active PTY session")

    async def send_streaming(self, command: str, websocket) -> None:
        """Run claude via PTY, streaming structured events to WebSocket.

        Spawns claude with --print --output-format stream-json on a PTY so that
        permission prompts appear in the PTY output stream. Reads output via
        asyncio event loop reader, processes ANSI, parses JSON events, and
        forwards appropriate WS messages to the browser.
        """
        prompt = self._resolve_prompt(command)
        cmd = ['claude', '--print', '--verbose', '--output-format', 'stream-json']
        if self.session_id:
            cmd += ['--resume', self.session_id]
        cmd.append(prompt)

        master_fd, slave_fd = pty.openpty()
        self._master_fd = master_fd
        try:
            proc = await asyncio.create_subprocess_exec(
                *cmd,
                stdin=slave_fd,
                stdout=slave_fd,
                stderr=slave_fd,
                env=self._build_env(),
                preexec_fn=os.setsid,
            )
            os.close(slave_fd)  # parent only needs master end
            await self._stream_pty(master_fd, websocket)
            await proc.wait()
        finally:
            self._master_fd = None
            try:
                os.close(master_fd)
            except OSError:
                pass

    async def _stream_pty(self, master_fd: int, websocket) -> None:
        """Read PTY output line by line, dispatching events to WebSocket.

        Uses asyncio event loop reader + queue for non-blocking PTY reads.
        Accumulates partial lines in a buffer until newline arrives.
        Each complete line is processed by _dispatch_line().
        """
        loop = asyncio.get_event_loop()
        queue: asyncio.Queue = asyncio.Queue()

        def _on_readable():
            try:
                data = os.read(master_fd, 4096)
                loop.call_soon_threadsafe(queue.put_nowait, data)
            except OSError:
                # PTY closed (process exited)
                loop.call_soon_threadsafe(queue.put_nowait, None)
                loop.remove_reader(master_fd)

        loop.add_reader(master_fd, _on_readable)

        buffer = ''
        try:
            while True:
                try:
                    chunk = await asyncio.wait_for(queue.get(), timeout=120.0)
                except asyncio.TimeoutError:
                    logger.warning("PTY read timeout — ending stream")
                    break

                if chunk is None:
                    break

                text = chunk.decode('utf-8', errors='replace')
                buffer += text

                # Process all complete lines in the buffer
                while '\n' in buffer:
                    line, buffer = buffer.split('\n', 1)
                    line = process_ansi(line.rstrip('\r'))
                    if line.strip():
                        await self._dispatch_line(line.strip(), websocket)
        finally:
            loop.remove_reader(master_fd)

    async def _dispatch_line(self, line: str, websocket) -> None:
        """Parse a single PTY output line and send the appropriate WS message.

        Tries JSON parsing first (stream-json events). Falls back to permission
        prompt detection, then treats remaining lines as raw terminal text.
        """
        # Try stream-json event first
        if line.startswith('{'):
            try:
                event = json.loads(line)
                await self._handle_json_event(event, websocket)
                return
            except json.JSONDecodeError:
                pass

        # Check for permission prompt UI patterns
        if PERMISSION_RE.search(line):
            await websocket.send(json.dumps({
                'type': 'permission_prompt',
                'content': line
            }))
            return

        # Raw terminal text — send as stream chunk
        await websocket.send(json.dumps({
            'type': 'stream_chunk',
            'content': line
        }))

    async def _handle_json_event(self, event: dict, websocket) -> None:
        """Handle a parsed stream-json event, forwarding relevant WS messages.

        stream-json event types:
          system/init   — initialization with session_id
          assistant     — AI response text (may contain multiple content blocks)
          tool_use      — tool invocation (extracted from assistant content blocks)
          tool_result   — tool execution result
          result        — final result with session_id for continuity
        """
        event_type = event.get('type')

        if event_type == 'system' and event.get('subtype') == 'init':
            if event.get('session_id'):
                self.session_id = event['session_id']

        elif event_type == 'assistant':
            message = event.get('message', {})
            for block in message.get('content', []):
                block_type = block.get('type')
                if block_type == 'text':
                    text = block.get('text', '')
                    if text:
                        await websocket.send(json.dumps({
                            'type': 'stream_chunk',
                            'content': text
                        }))
                elif block_type == 'tool_use':
                    name = block.get('name', '')
                    input_data = block.get('input', {})
                    display = f"[Tool: {name}]\n{json.dumps(input_data, indent=2)}"
                    await websocket.send(json.dumps({
                        'type': 'tool_use',
                        'content': display
                    }))

        elif event_type == 'tool_result':
            content = event.get('content', '')
            if isinstance(content, list):
                text_parts = [b.get('text', '') for b in content if b.get('type') == 'text']
                content = '\n'.join(text_parts)
            # Truncate long results to keep terminal readable
            if len(content) > 500:
                content = content[:500] + '\n...[truncated]'
            if content:
                await websocket.send(json.dumps({
                    'type': 'tool_result',
                    'content': content
                }))

        elif event_type == 'result':
            # Final event — extract session_id for next --resume
            if event.get('session_id'):
                self.session_id = event['session_id']
            result_text = event.get('result', '')
            if result_text:
                await websocket.send(json.dumps({
                    'type': 'stream_chunk',
                    'content': result_text
                }))
            await websocket.send(json.dumps({'type': 'response_complete'}))


class TutorialServer:
    def __init__(self):
        # CLAUDE_PLUGIN_ROOT when launched via /tutorial; fall back to the
        # parent of this script's directory when run directly.
        self.plugin_root = os.environ.get(
            'CLAUDE_PLUGIN_ROOT',
            str(Path(__file__).parent.parent)   # lib/ -> plugin root
        )
        self.tutorial_dist = Path(self.plugin_root) / 'tutorial' / 'dist'
        self.websocket_port = self._find_free_port(8080)
        self.http_port = self._find_free_port(3000)
        self._sessions: Dict[int, ClaudeSession] = {}
        self._tasks: Dict[int, asyncio.Task] = {}  # Active streaming tasks per connection

    def _find_free_port(self, start_port: int) -> int:
        for port in range(start_port, start_port + 100):
            try:
                with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                    s.bind(('localhost', port))
                    return port
            except OSError:
                continue
        raise RuntimeError(f"Could not find free port starting from {start_port}")

    def _serve_tutorial_files(self):
        tutorial_dist = self.tutorial_dist

        class TutorialHandler(SimpleHTTPRequestHandler):
            def __init__(self, *args, **kwargs):
                super().__init__(*args, directory=str(tutorial_dist), **kwargs)

            def log_message(self, format, *args):
                pass

            def end_headers(self):
                self.send_header('Access-Control-Allow-Origin', '*')
                self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
                self.send_header('Access-Control-Allow-Headers', '*')
                super().end_headers()

        try:
            httpd = HTTPServer(('localhost', self.http_port), TutorialHandler)
            logger.info(f"📱 Tutorial server running on http://localhost:{self.http_port}")
            httpd.serve_forever()
        except Exception as e:
            logger.error(f"❌ HTTP server error: {e}")

    async def handle_client_connection(self, websocket):
        logger.info(f"🔌 Client connected: {websocket.remote_address}")
        self._sessions[id(websocket)] = ClaudeSession(self.plugin_root)
        try:
            async for message in websocket:
                try:
                    data = json.loads(message)
                    await self._handle_client_message(websocket, data)
                except json.JSONDecodeError:
                    logger.error(f"❌ Invalid JSON: {message}")
                except Exception as e:
                    logger.error(f"❌ Error handling message: {e}")
        finally:
            # Cancel any active streaming task for this connection
            task = self._tasks.pop(id(websocket), None)
            if task and not task.done():
                task.cancel()
            self._sessions.pop(id(websocket), None)
            logger.info(f"🔌 Client disconnected: {websocket.remote_address}")

    async def _handle_client_message(self, websocket, data: dict):
        message_type = data.get('type')

        if message_type == 'command':
            command = data.get('content', '')
            logger.info(f"💬 Command: {command}")
            # Cancel any existing streaming task before starting a new one
            existing = self._tasks.get(id(websocket))
            if existing and not existing.done():
                existing.cancel()
            # Launch as background task — keeps message loop alive for permission_response
            task = asyncio.create_task(
                self._run_command(websocket, command)
            )
            self._tasks[id(websocket)] = task

        elif message_type == 'permission_response':
            # User clicked Allow/Deny in the browser — forward to PTY stdin
            choice = data.get('choice', 'n')
            logger.info(f"🔐 Permission response: {choice}")
            session = self._sessions.get(id(websocket))
            if session:
                session.respond(choice)

        elif message_type == 'ping':
            await websocket.send(json.dumps({'type': 'pong'}))

    async def _run_command(self, websocket, command: str):
        """Run a command via PTY streaming. Launched as a background asyncio Task."""
        await websocket.send(json.dumps({'type': 'typing_start'}))
        session = self._sessions.get(id(websocket))
        if not session:
            return
        try:
            await session.send_streaming(command, websocket)
        except asyncio.CancelledError:
            await websocket.send(json.dumps({'type': 'response_complete'}))
        except Exception as e:
            logger.error(f"❌ Streaming error: {e}")
            await websocket.send(json.dumps({
                'type': 'stream_chunk',
                'content': f'❌ Error: {str(e)}'
            }))
            await websocket.send(json.dumps({'type': 'response_complete'}))

    async def start_websocket_server(self):
        try:
            server = await websockets.serve(
                self.handle_client_connection,
                'localhost',
                self.websocket_port,
                ping_interval=None,   # Disable auto-ping — claude subprocess can take >30s
            )
            logger.info(f"🔌 WebSocket server running on ws://localhost:{self.websocket_port}")
            await server.wait_closed()
        except Exception as e:
            logger.error(f"❌ WebSocket server error: {e}")

    def start(self):
        if not self.tutorial_dist.exists():
            logger.error(f"❌ Tutorial dist not found: {self.tutorial_dist}")
            logger.error("💡 Run 'cd tutorial && npm run build' to build the tutorial")
            return False

        logger.info("🚀 Starting Traceline Tutorial Server...")

        http_thread = threading.Thread(target=self._serve_tutorial_files, daemon=True)
        http_thread.start()

        tutorial_url = f"http://localhost:{self.http_port}"
        logger.info(f"🌐 Opening tutorial in browser: {tutorial_url}")
        try:
            webbrowser.open(tutorial_url)
        except Exception as e:
            logger.warning(f"⚠️ Could not open browser: {e}")
            logger.info(f"💡 Open manually: {tutorial_url}")

        try:
            asyncio.run(self.start_websocket_server())
        except KeyboardInterrupt:
            logger.info("👋 Tutorial server stopped")
            return True


def main():
    server = TutorialServer()
    success = server.start()
    sys.exit(0 if success else 1)


if __name__ == '__main__':
    main()
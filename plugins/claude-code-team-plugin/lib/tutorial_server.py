#!/usr/bin/env python3
"""
Tutorial server for Traceline Claude Code plugin.

Serves the React tutorial app and manages WebSocket connections to Claude Code.
Each browser command is forwarded to `claude --print --output-format json`,
which returns clean JSON with the response text.

Design Context:
    - Slash commands (/rubber-duck etc.) are resolved server-side by loading
      commands/*.md as the prompt, so no plugin install is needed in the subprocess.
    - CLAUDECODE env var is unset to allow nested invocation.
    - ping_interval=None prevents WebSocket timeout during the subprocess call.
    - Session continuity via --resume <session_id> extracted from JSON output.
    - Plugin root auto-detected from script location when CLAUDE_PLUGIN_ROOT unset.
"""

import asyncio
import json
import logging
import os
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


class ClaudeSession:
    """Per-connection Claude session using `claude --print --output-format json`.

    Slash commands (/rubber-duck etc.) are resolved server-side by loading
    commands/*.md as the prompt, so no plugin install is needed in the subprocess.
    Session continuity is maintained via --resume <session_id> from the JSON output.
    CLAUDECODE env var is unset to allow nested invocation from within Claude Code.
    """

    def __init__(self, plugin_root: str):
        self.plugin_root = plugin_root
        self.session_id: Optional[str] = None
        self._lock = asyncio.Lock()

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
        env.pop('CLAUDECODE', None)   # allow nested invocation
        return env

    async def send(self, command: str) -> str:
        """Run claude --print, return clean response text."""
        async with self._lock:
            prompt = self._resolve_prompt(command)
            cmd = ['claude', '--print', '--output-format', 'json']
            if self.session_id:
                cmd += ['--resume', self.session_id]
            cmd.append(prompt)

            proc = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                env=self._build_env(),
            )
            stdout, stderr = await proc.communicate()

            if proc.returncode != 0:
                error = stderr.decode('utf-8', errors='replace').strip()
                logger.error("claude exited %d: %s", proc.returncode, error)
                return f'❌ Error (exit {proc.returncode}):\n{error}'

            raw = stdout.decode('utf-8', errors='replace').strip()
            try:
                data = json.loads(raw)
                if data.get('session_id'):
                    self.session_id = data['session_id']
                return data.get('result', raw)
            except json.JSONDecodeError:
                return raw


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
            self._sessions.pop(id(websocket), None)
            logger.info(f"🔌 Client disconnected: {websocket.remote_address}")

    async def _handle_client_message(self, websocket: WebSocketServerProtocol, data: dict):
        message_type = data.get('type')

        if message_type == 'command':
            command = data.get('content', '')
            logger.info(f"💬 Command: {command}")
            await self._forward_to_claude(websocket, command)

        elif message_type == 'ping':
            await websocket.send(json.dumps({'type': 'pong'}))

    async def _forward_to_claude(self, websocket: WebSocketServerProtocol, command: str):
        await websocket.send(json.dumps({'type': 'typing_start'}))
        try:
            session = self._sessions[id(websocket)]
            response = await session.send(command)
            await websocket.send(json.dumps({
                'type': 'ai_response',
                'content': response or '(No response)'
            }))
        except Exception as e:
            logger.error(f"❌ Error: {e}")
            await websocket.send(json.dumps({
                'type': 'ai_response',
                'content': f'❌ Error: {str(e)}'
            }))
        finally:
            await websocket.send(json.dumps({'type': 'typing_end'}))

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
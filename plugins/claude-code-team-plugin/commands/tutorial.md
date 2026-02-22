---
description: "Launch interactive Traceline tutorial in browser"
---

### 1. Task context
Launch the Traceline tutorial experience in the user's browser. This tutorial introduces the core concepts of organizational AI alignment through interactive demonstrations of the clarity workflow.

### 2. Tone context  
Be enthusiastic and welcoming. This is the user's first experience with Traceline - make it smooth and engaging.

### 3. Background data
**Tutorial Purpose:**
- Introduce the concept: "AI doesn't need more tech people, it needs organizational people"
- Demonstrate the clarity workflow: Requirements → Implementation → Evaluation
- Show confidence gating and ambiguity resolution in action
- Guide through Path A (spec-design) and Path B (spec-implement) examples

**Technical Flow:**
1. Check if tutorial is built and ready
2. Start tutorial server (serves React app + WebSocket)  
3. Open browser to tutorial
4. Provide fallback instructions if anything fails

### 4. Detailed task description & rules

**Step 1: Pre-flight Check**
Check if the tutorial is built and ready to serve:
```bash
ls -la "${CLAUDE_PLUGIN_ROOT}/tutorial/dist/index.html"
```

**If tutorial not built:** Provide build instructions and exit gracefully.

**Step 2: Launch Tutorial Server**
Start the tutorial server which will:
- Serve the React app on a free port (starts at 3000)
- Start WebSocket server for tutorial interactivity  
- Automatically open browser to tutorial
- Display connection information

```bash
python3 "${CLAUDE_PLUGIN_ROOT}/lib/tutorial_server.py"
```

**Step 3: Welcome Message**
Once server starts, display:
```
🎓 Traceline Tutorial Launched!

The tutorial is now running in your browser. You'll learn:
• Core concepts of organizational AI alignment
• The clarity workflow (Requirements → Implementation → Evaluation)  
• How confidence gating prevents costly mistakes
• Path A: Spec-Design walkthrough
• Path B: Implementation walkthrough

💡 Tip: The tutorial uses interactive demos - try the "Start Demo" buttons!

Press Ctrl+C to stop the tutorial server when finished.
```

**Error Handling:**
- If port conflicts occur, the server will automatically find free ports
- If browser doesn't open automatically, show the URL to open manually
- If tutorial dist is missing, provide clear build instructions

**Tutorial Content:**
The React app contains:
- Interactive concept explanations with text-based diagrams
- Simulated Claude Code terminal for command demonstrations
- Step-by-step walkthrough of rubber duck → AC creation → implementation → verification
- Apple-style UI with smooth animations and progress tracking

### 5. Examples

**Success Case:**
```
🚀 Starting Traceline Tutorial Server...
📱 Tutorial server running on http://localhost:3000
🔌 WebSocket server running on ws://localhost:8080
🌐 Opening tutorial in browser: http://localhost:3000

🎓 Traceline Tutorial Launched!
...
```

**Missing Build Case:**
```
❌ Tutorial not built yet. Please run:

cd "${CLAUDE_PLUGIN_ROOT}/tutorial"
npm install
npm run build

Then try /tutorial again.
```

### 7. Immediate task description or request
Launch the Traceline tutorial server and open the interactive browser tutorial for the user.
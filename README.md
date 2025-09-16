Family Feud — Local Test

Quick setup

1. Start a static server from the project root (macOS/Linux):

```bash
python3 -m http.server 8000
```

2. Open in browser: <http://localhost:8000>

Debug overlays

- Enable at load with: <http://localhost:8000/?debug=1>
- Toggle live with Shift+D
- When enabled you'll see boxes for the question area, answers grid, and 6 per-answer boxes. Drag boxes to move them and use the small handle on each box to resize.

Testing with sample data

- A `questions.json` file is included in the project root with multiple rounds. The Start button will wait for the file to load and then display the first round.

Notes

- Use the browser DevTools to fine-tune percentages in `style.css` under the `#question` and `#answers` rules.
- If you want draggable boxes to persist between reloads, I can add save/load functionality to store positions in `localStorage`.

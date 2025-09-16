// Single DOMContentLoaded handler: load data and wire up start button
document.addEventListener('DOMContentLoaded', () => {
    // Start Page Elements
    const startPage = document.getElementById('start-page');
    const startGameBtn = document.getElementById('start-game-btn');
    const splashImage = document.getElementById('splash-image');
    const gameContainer = document.getElementById('game-board-container');
    const loadingOverlay = document.getElementById('loading-overlay');

    // Main Game Elements
    const mainGameBoard = document.querySelector('.game-board');
    const questionEl = document.getElementById('question');
    const answersEl = document.getElementById('answers');
    const team1ScoreEl = document.getElementById('team1-score');
    const team2ScoreEl = document.getElementById('team2-score');
    const nextRoundBtn = document.getElementById('next-round');
    const strikeImages = document.querySelectorAll('.strikes .strike');

    // Fast Money Elements (may be null if not present yet)
    const fastMoneyBoard = document.querySelector('.fast-money-board');
    const startFastMoneyBtn = document.getElementById('start-fast-money');
    const fmQuestion1El = document.getElementById('fm-question-1');
    const fmQuestion2El = document.getElementById('fm-question-2');
    const fmTimerEl = document.getElementById('fm-timer');
    const fmFinalScoreEl = document.getElementById('fm-final-score');
    const fmPlayer1Answers = document.querySelectorAll('.fm-player1-input');
    const fmPlayer2Answers = document.querySelectorAll('.fm-player2-input');
    const fmPlayer1Scores = document.querySelectorAll('.fm-player1-score');
    const fmPlayer2Scores = document.querySelectorAll('.fm-player2-score');
    const submitP1 = document.getElementById('submit-p1');
    const submitP2 = document.getElementById('submit-p2');

    let currentRound = 0;
    let team1Score = 0;
    let team2Score = 0;
    let strikes = 0;
    let gameData = null;
    let fastMoneyTotal = 0;
    let timer = null;
    // Debug flag: enable via ?debug=1 or toggle with Shift+D
    let debugMode = new URLSearchParams(window.location.search).get('debug') === '1';
    // The SVG is embedded directly in index.html as #board-svg
    function getBoardSVG() {
        return document.getElementById('board-svg');
    }

    // Storage key for debug positions
    const DEBUG_POS_KEY = 'ff_debug_positions_v1';

    function loadSavedPositions() {
        try {
            const raw = localStorage.getItem(DEBUG_POS_KEY);
            if (!raw) return null;
            return JSON.parse(raw);
        } catch (e) { return null; }
    }

    function savePositions(obj) {
        try { localStorage.setItem(DEBUG_POS_KEY, JSON.stringify(obj)); } catch (e) { }
    }

    function exportPositionsAsCSS(obj) {
        // Small CSS snippet that positions answer-debug boxes by index
        let css = '/* Paste into style.css (adjust selector as needed) */\n';
        Object.keys(obj).forEach(k => {
            const p = obj[k];
            css += `.answer-debug[data-index="${k}"]{ left:${p.left}; top:${p.top}; width:${p.width}; height:${p.height}; transform:translate(-50%,-50%); }\n`;
        });
        return css;
    }

    function setDebug(on) {
        document.body.classList.toggle('debug', !!on);
        debugMode = !!on;
        // create or remove visual helper boxes
        const existing = document.querySelectorAll('.debug-box, .answer-debug');
        existing.forEach(n => n.remove());
        if (debugMode) {
            // Question box
            const qBox = document.createElement('div');
            qBox.className = 'debug-box';
            qBox.id = 'question-debug-box';
            qBox.style.top = '27%';
            qBox.style.left = '50%';
            qBox.style.width = '38%';
            qBox.style.height = '10%';
            qBox.style.transform = 'translate(-50%, -50%)';
            document.body.appendChild(qBox);

            // Answers box
            const aBox = document.createElement('div');
            aBox.className = 'debug-box';
            aBox.id = 'answers-debug-box';
            aBox.style.top = '45%';
            aBox.style.left = '50%';
            aBox.style.width = '56%';
            aBox.style.height = '46%';
            aBox.style.transform = 'translateX(-50%)';
            document.body.appendChild(aBox);
            // create six per-answer boxes. If the inline SVG is present, align to the slot rects
            const perAnswerBoxes = [];
            const answerCount = 6;
            const svg = getBoardSVG();
            // load saved positions if available
            const saved = loadSavedPositions();
            for (let i = 0; i < answerCount; i++) {
                const b = document.createElement('div');
                b.className = 'answer-debug';
                b.dataset.index = i;
                const handle = document.createElement('div');
                handle.className = 'handle';
                b.appendChild(handle);
                document.body.appendChild(b);
                perAnswerBoxes.push(b);
                makeDraggableResizable(b, handle);

                // If SVG slot exists, position the debug box to match the slot's bounding box
                if (svg) {
                    const slotId = 'slot-' + (i + 1);
                    const slot = svg.querySelector('#' + slotId);
                    if (slot) {
                        const slotRect = slot.getBoundingClientRect();
                        // compute center relative to viewport in percentages
                        const leftPct = (slotRect.left + slotRect.width / 2) / window.innerWidth * 100;
                        const topPct = (slotRect.top + slotRect.height / 2) / window.innerHeight * 100;
                        b.style.left = leftPct + '%';
                        b.style.top = topPct + '%';
                        b.style.width = Math.max(40, slotRect.width) + 'px';
                        b.style.height = Math.max(20, slotRect.height) + 'px';
                        b.style.transform = 'translate(-50%, -50%)';
                        // apply saved override if present
                        if (saved && saved[i]) {
                            const s = saved[i];
                            b.style.left = s.left; b.style.top = s.top; b.style.width = s.width; b.style.height = s.height;
                        }
                        continue;
                    }
                }

                // Fallback layout if SVG slot not available
                const col = i % 2; // 0 or 1
                const row = Math.floor(i / 2); // 0,1,2
                const colLeft = 50 - 28 + col * 28; // center +/-
                const top = 48 + row * 9;
                b.style.left = colLeft + '%';
                b.style.top = top + '%';
                b.style.width = '26%';
                b.style.height = '12%';
                b.style.transform = 'translate(-50%, -50%)';
            }

            // Add simple controls to save/export/import positions
            const toolBar = document.createElement('div');
            toolBar.style.position = 'fixed';
            toolBar.style.top = '8px';
            toolBar.style.right = '8px';
            toolBar.style.zIndex = '9999';
            toolBar.style.display = 'flex';
            toolBar.style.gap = '8px';

            const saveBtn = document.createElement('button');
            saveBtn.textContent = 'Save positions';
            saveBtn.onclick = () => {
                const obj = {};
                perAnswerBoxes.forEach(bx => {
                    const idx = bx.dataset.index;
                    obj[idx] = { left: bx.style.left, top: bx.style.top, width: bx.style.width, height: bx.style.height };
                });
                savePositions(obj);
                alert('Saved positions to localStorage');
            };

            const exportBtn = document.createElement('button');
            exportBtn.textContent = 'Export CSS';
            exportBtn.onclick = () => {
                const obj = {};
                perAnswerBoxes.forEach(bx => {
                    const idx = bx.dataset.index;
                    obj[idx] = { left: bx.style.left, top: bx.style.top, width: bx.style.width, height: bx.style.height };
                });
                const css = exportPositionsAsCSS(obj);
                // show in new window for copy/paste
                const w = window.open('', '_blank');
                if (w) { w.document.body.textContent = css; }
            };

            const importBtn = document.createElement('button');
            importBtn.textContent = 'Import JSON';
            importBtn.onclick = () => {
                const t = prompt('Paste exported JSON/positions:');
                try {
                    const data = JSON.parse(t || '{}');
                    perAnswerBoxes.forEach(bx => {
                        const idx = bx.dataset.index;
                        if (data[idx]) {
                            bx.style.left = data[idx].left;
                            bx.style.top = data[idx].top;
                            bx.style.width = data[idx].width;
                            bx.style.height = data[idx].height;
                        }
                    });
                    savePositions(data);
                    alert('Imported positions');
                } catch (e) { alert('Invalid JSON'); }
            };

            toolBar.appendChild(saveBtn);
            toolBar.appendChild(exportBtn);
            toolBar.appendChild(importBtn);
            document.body.appendChild(toolBar);
        }
    }
    setDebug(debugMode);
    // Ensure debug overlays align early
    // setDebug will reference the embedded #board-svg in the DOM
    // Utility: make element draggable and resizable with the provided handle
    function makeDraggableResizable(el, handle) {
        let dragging = false;
        let resizing = false;
        let startX, startY, startW, startH, startLeft, startTop;

        handle.addEventListener('mousedown', (e) => {
            e.stopPropagation();
            resizing = true;
            startX = e.clientX;
            startY = e.clientY;
            startW = el.offsetWidth;
            startH = el.offsetHeight;
            document.body.classList.add('dragging');
            window.addEventListener('mousemove', onResize);
            window.addEventListener('mouseup', stop);
        });

        el.addEventListener('mousedown', (e) => {
            if (e.target === handle) return; // handled above
            dragging = true;
            startX = e.clientX;
            startY = e.clientY;
            const rect = el.getBoundingClientRect();
            startLeft = rect.left;
            startTop = rect.top;
            document.body.classList.add('dragging');
            window.addEventListener('mousemove', onDrag);
            window.addEventListener('mouseup', stop);
        });

        function onDrag(e) {
            if (!dragging) return;
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            el.style.left = (startLeft + dx) / window.innerWidth * 100 + '%';
            el.style.top = (startTop + dy) / window.innerHeight * 100 + '%';
            el.style.transform = 'translate(-50%, -50%)';
        }

        function onResize(e) {
            if (!resizing) return;
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            el.style.width = Math.max(40, startW + dx) + 'px';
            el.style.height = Math.max(20, startH + dy) + 'px';
        }

        function stop() {
            dragging = false;
            resizing = false;
            document.body.classList.remove('dragging');
            window.removeEventListener('mousemove', onDrag);
            window.removeEventListener('mousemove', onResize);
            window.removeEventListener('mouseup', stop);
        }
    }

    // Fetch game data and cache it. Show loading overlay while fetching.
    function showLoading(show) {
        if (!loadingOverlay) return;
        if (show) {
            loadingOverlay.classList.remove('hidden');
            loadingOverlay.setAttribute('aria-hidden', 'false');
        } else {
            loadingOverlay.classList.add('hidden');
            loadingOverlay.setAttribute('aria-hidden', 'true');
        }
    }

    showLoading(true);
    fetch('questions.json')
        .then(response => response.json())
        .then(data => {
            gameData = data;
            showLoading(false);
        })
        .catch(err => {
            console.error('Failed to load questions.json', err);
            showLoading(false);
        });

    // Start the game when user clicks Start. Wait for data to be loaded.
    // Prepare audio (will be played on user interaction)
    const themeAudio = new Audio('assets/them-song-orig.wav');
    themeAudio.preload = 'auto';

    function startGame() {
        if (!gameData) {
            // simple retry: show loading and wait a short moment for data
            startGameBtn.disabled = true;
            startGameBtn.textContent = 'Loading...';
            showLoading(true);
            const waitForData = setInterval(() => {
                if (gameData) {
                    clearInterval(waitForData);
                    startGameBtn.disabled = false;
                    startGameBtn.textContent = 'Start Game';
                    showLoading(false);
                    doStart();
                }
            }, 200);
            // give up after 7s
            setTimeout(() => {
                clearInterval(waitForData);
                if (!gameData) {
                    startGameBtn.disabled = false;
                    startGameBtn.textContent = 'Start Game';
                    showLoading(false);
                    alert('Unable to load game data. Check questions.json.');
                }
            }, 7000);
        } else {
            doStart();
            // play theme on user-initiated start; handle failures silently
            try { themeAudio.currentTime = 0; themeAudio.play().catch(() => { }); } catch (e) { }
        }
    }

    function doStart() {
        // Hide splash and show game board container
        if (startPage) startPage.style.display = 'none';
        if (gameContainer) gameContainer.style.display = 'flex';
        currentRound = 0;
        loadRound(currentRound);
    }

    if (startGameBtn) startGameBtn.addEventListener('click', startGame);
    if (splashImage) splashImage.addEventListener('click', startGame);

    // Toggle debug with Shift+D
    document.addEventListener('keydown', (e) => {
        if (e.shiftKey && e.key.toLowerCase() === 'd') {
            setDebug(!debugMode);
        }
    });

    function loadRound(roundIndex) {
        if (!gameData) return; // defensive
        if (!questionEl || !answersEl) return;

        if (roundIndex >= gameData.rounds.length) {
            questionEl.textContent = "Main Game Over!";
            answersEl.innerHTML = '<p>Time for Fast Money!</p>';
            if (startFastMoneyBtn) startFastMoneyBtn.style.display = 'block';
            if (nextRoundBtn) nextRoundBtn.style.display = 'none';
            return;
        }

        const round = gameData.rounds[roundIndex];
        questionEl.textContent = round.question;
        answersEl.innerHTML = '';
        strikes = 0;
        updateStrikes();

        round.answers.forEach((answerData, index) => {
            const answerDiv = document.createElement('div');
            answerDiv.classList.add('answer');
            answerDiv.innerHTML = `<span class="text">${index + 1}.</span> <div class="answer-cover"></div> <span class="answer-text hidden">${answerData.answer}</span> <span class="points hidden">${answerData.points}</span>`;

            answerDiv.addEventListener('click', () => {
                // Add revealed class so CSS can animate the cover
                answerDiv.classList.add('revealed');
                const text = answerDiv.querySelector('.answer-text');
                const points = answerDiv.querySelector('.points');
                if (text) text.classList.remove('hidden');
                if (points) points.classList.remove('hidden');
                // Animate the SVG slot for this answer (if present)
                try {
                    const slot = document.getElementById('slot-' + (index + 1));
                    if (slot) {
                        slot.classList.remove('slot-pulse');
                        // force reflow to restart animation
                        // eslint-disable-next-line no-unused-expressions
                        slot.getBoundingClientRect();
                        slot.classList.add('slot-pulse');
                        setTimeout(() => slot.classList.remove('slot-pulse'), 1100);
                    }
                } catch (e) { /* ignore */ }
                // Remove the cover from layout after animation
                setTimeout(() => {
                    const cover = answerDiv.querySelector('.answer-cover');
                    if (cover) cover.style.display = 'none';
                }, 320);
            }, { once: true });

            answersEl.appendChild(answerDiv);
        });
    }

    if (nextRoundBtn) nextRoundBtn.addEventListener('click', () => {
        currentRound++;
        loadRound(currentRound);
    });

    if (startFastMoneyBtn) {
        startFastMoneyBtn.addEventListener('click', () => {
            if (mainGameBoard) mainGameBoard.style.display = 'none';
            if (fastMoneyBoard) fastMoneyBoard.style.display = 'block';
            setupFastMoney();
        });
    }

    function setupFastMoney() {
        if (!gameData) return;
        if (fmQuestion1El) fmQuestion1El.textContent = gameData.rounds[0].question || '';
        if (fmQuestion2El) fmQuestion2El.textContent = 'Same question for Player 2.';
        if (submitP1) submitP1.disabled = false;
        if (submitP2) submitP2.disabled = true;
        startTimer(20, () => {
            if (submitP1) submitP1.disabled = true;
        });
    }

    if (submitP1) submitP1.addEventListener('click', () => {
        if (timer) clearInterval(timer);
        calculateFastMoney(1, fmPlayer1Answers, fmPlayer1Scores);
        fmPlayer1Answers.forEach(input => input.disabled = true);
        submitP1.disabled = true;
        if (submitP2) submitP2.disabled = false;
        fmPlayer1Scores.forEach(scoreEl => scoreEl.classList.remove('hidden'));

        startTimer(25, () => {
            if (submitP2) submitP2.disabled = true;
        });
    });

    if (submitP2) submitP2.addEventListener('click', () => {
        if (timer) clearInterval(timer);
        calculateFastMoney(2, fmPlayer2Answers, fmPlayer2Scores);
        fmPlayer2Answers.forEach(input => input.disabled = true);
        submitP2.disabled = true;
        fmPlayer2Scores.forEach(scoreEl => scoreEl.classList.remove('hidden'));

        if (fmFinalScoreEl) {
            fmFinalScoreEl.textContent = `Final Score: ${fastMoneyTotal}`;
            if (fastMoneyTotal >= 200) {
                fmFinalScoreEl.textContent += " - You Win!";
            } else {
                fmFinalScoreEl.textContent += " - Better luck next time!";
            }
        }
    });

    function calculateFastMoney(playerNum, answerEls, scoreEls) {
        const mockPoints = [30, 25, 20, 15, 10];
        let playerTotal = 0;
        answerEls.forEach((input, index) => {
            let points = 0;
            if (input && input.value.trim() !== '') {
                points = mockPoints[index] || 5;
            }
            if (scoreEls[index]) scoreEls[index].textContent = points;
            playerTotal += points;
        });
        fastMoneyTotal += playerTotal;
    }

    function startTimer(duration, onEnd) {
        if (!fmTimerEl) return;
        let timeLeft = duration;
        fmTimerEl.textContent = timeLeft;
        if (timer) clearInterval(timer);
        timer = setInterval(() => {
            timeLeft--;
            fmTimerEl.textContent = timeLeft;
            if (timeLeft <= 0) {
                clearInterval(timer);
                onEnd();
            }
        }, 1000);
    }

    document.addEventListener('keydown', (e) => {
        if (!mainGameBoard || mainGameBoard.style.display === 'none') return; // Only apply to main game

        if (e.key >= '1' && e.key <= '2') {
            const team = parseInt(e.key);
            const points = parseInt(prompt(`Add points to Team ${team}:`));
            if (!isNaN(points)) {
                if (team === 1) {
                    team1Score += points;
                    if (team1ScoreEl) team1ScoreEl.textContent = team1Score;
                } else {
                    team2Score += points;
                    if (team2ScoreEl) team2ScoreEl.textContent = team2Score;
                }
            }
        } else if (e.key.toLowerCase() === 'x') {
            if (strikes < 3) {
                strikes++;
                updateStrikes();
            }
        }
    });

    function updateStrikes() {
        strikeImages.forEach((img, index) => {
            if (index < strikes) {
                img.classList.remove('hidden');
            } else {
                img.classList.add('hidden');
            }
        });
    }
});

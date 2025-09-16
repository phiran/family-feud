document.addEventListener('DOMContentLoaded', () => {
    // Main Game Elements
    const mainGameBoard = document.querySelector('.game-board');
    const questionEl = document.getElementById('question');
    const answersEl = document.getElementById('answers');
    const team1ScoreEl = document.getElementById('team1-score');
    const team2ScoreEl = document.getElementById('team2-score');
    const nextRoundBtn = document.getElementById('next-round');
    const strikeImages = document.querySelectorAll('.strikes .strike');
    
    // Fast Money Elements
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
    let gameData;
    let fastMoneyTotal = 0;
    let timer;

    // Fetch game data and initialize
    fetch('questions.json')
        .then(response => response.json())
        .then(data => {
            gameData = data;
            loadRound(currentRound);
        });

    function loadRound(roundIndex) {
        if (roundIndex >= gameData.rounds.length) {
            questionEl.textContent = "Main Game Over!";
            answersEl.innerHTML = '<p>Time for Fast Money!</p>';
            startFastMoneyBtn.style.display = 'block';
            nextRoundBtn.style.display = 'none';
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
                answerDiv.querySelector('.answer-cover').style.display = 'none';
                answerDiv.querySelector('.answer-text').classList.remove('hidden');
                answerDiv.querySelector('.points').classList.remove('hidden');
            }, { once: true });
            
            answersEl.appendChild(answerDiv);
        });
    }

    nextRoundBtn.addEventListener('click', () => {
        currentRound++;
        loadRound(currentRound);
    });
    
    startFastMoneyBtn.addEventListener('click', () => {
        mainGameBoard.style.display = 'none';
        fastMoneyBoard.style.display = 'block';
        setupFastMoney();
    });

    function setupFastMoney() {
        // For simplicity, let's use the first two rounds' questions for Fast Money
        fmQuestion1El.textContent = gameData.rounds[0].question;
        fmQuestion2El.textContent = "Same question for Player 2.";
        submitP1.disabled = false;
        submitP2.disabled = true;
        startTimer(20, () => {
             submitP1.disabled = true;
             // Logic when P1 time runs out
        });
    }

    submitP1.addEventListener('click', () => {
        clearInterval(timer);
        calculateFastMoney(1, fmPlayer1Answers, fmPlayer1Scores);
        fmPlayer1Answers.forEach(input => input.disabled = true);
        submitP1.disabled = true;
        submitP2.disabled = false;
        
        // Let player 2 see the answers
        fmPlayer1Scores.forEach(scoreEl => scoreEl.classList.remove('hidden'));

        startTimer(25, () => {
             submitP2.disabled = true;
             // Logic when P2 time runs out
        });
    });

    submitP2.addEventListener('click', () => {
        clearInterval(timer);
        calculateFastMoney(2, fmPlayer2Answers, fmPlayer2Scores);
        fmPlayer2Answers.forEach(input => input.disabled = true);
        submitP2.disabled = true;
        fmPlayer2Scores.forEach(scoreEl => scoreEl.classList.remove('hidden'));
        
        fmFinalScoreEl.textContent = `Final Score: ${fastMoneyTotal}`;
        if (fastMoneyTotal >= 200) {
            fmFinalScoreEl.textContent += " - You Win!";
        } else {
            fmFinalScoreEl.textContent += " - Better luck next time!";
        }
    });

    function calculateFastMoney(playerNum, answerEls, scoreEls) {
        // A simple scoring mock-up. In a real game, this would check against survey data.
        const mockPoints = [30, 25, 20, 15, 10]; 
        let playerTotal = 0;
        answerEls.forEach((input, index) => {
            let points = 0;
            if(input.value.trim() !== '') {
                points = mockPoints[index] || 5; // Give points if not empty
            }
            scoreEls[index].textContent = points;
            playerTotal += points;
        });
        fastMoneyTotal += playerTotal;
    }

    function startTimer(duration, onEnd) {
        let timeLeft = duration;
        fmTimerEl.textContent = timeLeft;
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
        if (mainGameBoard.style.display === 'none') return; // Only apply to main game

        if (e.key >= '1' && e.key <= '2') {
            const team = parseInt(e.key);
            const points = parseInt(prompt(`Add points to Team ${team}:`));
            if (!isNaN(points)) {
                if (team === 1) {
                    team1Score += points;
                    team1ScoreEl.textContent = team1Score;
                } else {
                    team2Score += points;
                    team2ScoreEl.textContent = team2Score;
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

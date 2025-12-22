const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const highScoreElement = document.getElementById('highScore');
const gameOverElement = document.getElementById('gameOver');
const finalScoreElement = document.getElementById('finalScore');

const gridSize = 25;
const tileCount = canvas.width / gridSize;

let snake = [{x: 10, y: 10}];
let dx = 0;
let dy = 0;
let food = {x: 15, y: 15};
let score = 0;
let highScore = localStorage.getItem('snakeHighScore') || 0;
let gameRunning = true;
let gameLoopId;
let gameSpeed = 100;

// Sound effects using Web Audio API
const audioContext = new (window.AudioContext || window.webkitAudioContext)();

function playSound(frequency, duration, type = 'sine') {
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = frequency;
    oscillator.type = type;
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + duration);
}

function playEatSound() {
    playSound(800, 0.1, 'square');
    setTimeout(() => playSound(1000, 0.1, 'square'), 50);
}

function playGameOverSound() {
    playSound(200, 0.2, 'sawtooth');
    setTimeout(() => playSound(150, 0.3, 'sawtooth'), 200);
}

function createParticles(x, y) {
    const particleCount = 8;
    for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.style.left = x + 'px';
        particle.style.top = y + 'px';
        particle.style.background = `hsl(${Math.random() * 60 + 30}, 100%, 50%)`;
        document.body.appendChild(particle);
        
        setTimeout(() => particle.remove(), 1000);
    }
}

// Initialize high score display
highScoreElement.textContent = 'High Score: ' + highScore;

// Handle keyboard input
document.addEventListener('keydown', changeDirection);

function changeDirection(e) {
    const key = e.key;
    
    // Prevent snake from reversing
    if (key === 'ArrowLeft' && dx === 0) {
        dx = -1;
        dy = 0;
        playSound(300, 0.05);
    } else if (key === 'ArrowRight' && dx === 0) {
        dx = 1;
        dy = 0;
        playSound(300, 0.05);
    } else if (key === 'ArrowUp' && dy === 0) {
        dx = 0;
        dy = -1;
        playSound(300, 0.05);
    } else if (key === 'ArrowDown' && dy === 0) {
        dx = 0;
        dy = 1;
        playSound(300, 0.05);
    }
}

function drawGame() {
    if (!gameRunning) return;
    
    moveSnake();
    
    if (checkCollision()) {
        endGame();
        return;
    }
    
    if (checkFoodCollision()) {
        score += 10;
        scoreElement.textContent = 'Score: ' + score;
        
        // Update high score
        if (score > highScore) {
            highScore = score;
            highScoreElement.textContent = 'High Score: ' + highScore;
            localStorage.setItem('snakeHighScore', highScore);
        }
        
        playEatSound();
        
        // Create particle effect at food location
        const rect = canvas.getBoundingClientRect();
        createParticles(
            rect.left + food.x * gridSize + gridSize / 2,
            rect.top + food.y * gridSize + gridSize / 2
        );
        
        growSnake();
        generateFood();
        
        // Increase speed slightly
        if (gameSpeed > 50) {
            gameSpeed -= 2;
        }
    }
    
    clearCanvas();
    drawFood();
    drawSnake();
}

function clearCanvas() {
    // Draw checkered pattern
    for (let i = 0; i < tileCount; i++) {
        for (let j = 0; j < tileCount; j++) {
            if ((i + j) % 2 === 0) {
                ctx.fillStyle = '#fce4ec';
            } else {
                ctx.fillStyle = '#f8bbd0';
            }
            ctx.fillRect(i * gridSize, j * gridSize, gridSize, gridSize);
        }
    }
}

function drawSnake() {
    snake.forEach((segment, index) => {
        const x = segment.x * gridSize;
        const y = segment.y * gridSize;
        
        if (index === 0) {
            // Draw 3D head with gradient
            const gradient = ctx.createRadialGradient(
                x + gridSize / 2, y + gridSize / 2, 2,
                x + gridSize / 2, y + gridSize / 2, gridSize
            );
            gradient.addColorStop(0, '#6bb8ff');
            gradient.addColorStop(1, '#4d9fff');
            
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(x + gridSize / 2, y + gridSize / 2, gridSize / 2 - 1, 0, Math.PI * 2);
            ctx.fill();
            
            // Draw shadow under head
            ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
            ctx.beginPath();
            ctx.ellipse(x + gridSize / 2, y + gridSize / 2 + 2, gridSize / 2.5, gridSize / 3.5, 0, 0, Math.PI * 2);
            ctx.fill();
            
            // Draw eyes with direction
            ctx.fillStyle = 'white';
            let eyeOffsetX = 5, eyeOffsetY = 5;
            
            if (dx === 1) { eyeOffsetX = 10; eyeOffsetY = 5; }
            else if (dx === -1) { eyeOffsetX = 3; eyeOffsetY = 5; }
            else if (dy === -1) { eyeOffsetX = 5; eyeOffsetY = 3; }
            else if (dy === 1) { eyeOffsetX = 5; eyeOffsetY = 10; }
            
            // White of eyes
            ctx.beginPath();
            ctx.arc(x + eyeOffsetX, y + eyeOffsetY, 4, 0, Math.PI * 2);
            ctx.arc(x + gridSize - eyeOffsetX, y + eyeOffsetY, 4, 0, Math.PI * 2);
            ctx.fill();
            
            // Pupils
            ctx.fillStyle = 'black';
            ctx.beginPath();
            ctx.arc(x + eyeOffsetX + (dx * 1), y + eyeOffsetY + (dy * 1), 2, 0, Math.PI * 2);
            ctx.arc(x + gridSize - eyeOffsetX + (dx * 1), y + eyeOffsetY + (dy * 1), 2, 0, Math.PI * 2);
            ctx.fill();
            
            // Draw tongue
            ctx.strokeStyle = '#ff4444';
            ctx.lineWidth = 2;
            ctx.beginPath();
            if (dx !== 0 || dy !== 0) {
                const tongueX = x + gridSize / 2 + dx * (gridSize / 2);
                const tongueY = y + gridSize / 2 + dy * (gridSize / 2);
                ctx.moveTo(x + gridSize / 2, y + gridSize / 2);
                ctx.lineTo(tongueX, tongueY);
            }
            ctx.stroke();
            
        } else {
            // Draw 3D body segments with gradient
            const gradient = ctx.createRadialGradient(
                x + gridSize / 2, y + gridSize / 2, 2,
                x + gridSize / 2, y + gridSize / 2, gridSize
            );
            gradient.addColorStop(0, '#5da3e0');
            gradient.addColorStop(1, '#3d85c6');
            
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(x + gridSize / 2, y + gridSize / 2, gridSize / 2.5, 0, Math.PI * 2);
            ctx.fill();
            
            // Draw shadow
            ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
            ctx.beginPath();
            ctx.ellipse(x + gridSize / 2, y + gridSize / 2 + 1, gridSize / 3, gridSize / 4, 0, 0, Math.PI * 2);
            ctx.fill();
            
            // Add highlight
            ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.beginPath();
            ctx.arc(x + gridSize / 3, y + gridSize / 3, gridSize / 6, 0, Math.PI * 2);
            ctx.fill();
        }
    });
}

function drawFood() {
    const x = food.x * gridSize;
    const y = food.y * gridSize;
    
    // Draw grape cluster with 3D effect
    const grapePositions = [
        {dx: 0, dy: -4},
        {dx: -5, dy: 0}, {dx: 5, dy: 0},
        {dx: -3, dy: 5}, {dx: 3, dy: 5},
        {dx: 0, dy: 8}
    ];
    
    // Pulsing animation
    const time = Date.now() / 200;
    const scale = 1 + Math.sin(time) * 0.05;
    
    ctx.save();
    ctx.translate(x + gridSize / 2, y + gridSize / 2);
    ctx.scale(scale, scale);
    
    // Draw each grape
    grapePositions.forEach((pos, index) => {
        const gradient = ctx.createRadialGradient(
            pos.dx, pos.dy, 1,
            pos.dx, pos.dy, 4
        );
        gradient.addColorStop(0, '#a5d6a7');
        gradient.addColorStop(0.6, '#81c784');
        gradient.addColorStop(1, '#66bb6a');
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(pos.dx, pos.dy, 4, 0, 2 * Math.PI);
        ctx.fill();
        
        // Highlight on each grape
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.beginPath();
        ctx.arc(pos.dx - 1, pos.dy - 1, 1.5, 0, 2 * Math.PI);
        ctx.fill();
    });
    
    // Draw stem
    ctx.strokeStyle = '#8B4513';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, -4);
    ctx.lineTo(0, -8);
    ctx.stroke();
    
    ctx.restore();
}

function moveSnake() {
    const head = {x: snake[0].x + dx, y: snake[0].y + dy};
    snake.unshift(head);
    snake.pop();
}

function growSnake() {
    const tail = snake[snake.length - 1];
    snake.push({...tail});
}

function checkCollision() {
    const head = snake[0];
    
    // Wall collision
    if (head.x < 0 || head.x >= tileCount || head.y < 0 || head.y >= tileCount) {
        return true;
    }
    
    // Self collision
    for (let i = 1; i < snake.length; i++) {
        if (head.x === snake[i].x && head.y === snake[i].y) {
            return true;
        }
    }
    
    return false;
}

function checkFoodCollision() {
    return snake[0].x === food.x && snake[0].y === food.y;
}

function generateFood() {
    let validPosition = false;
    
    while (!validPosition) {
        food.x = Math.floor(Math.random() * tileCount);
        food.y = Math.floor(Math.random() * tileCount);
        
        validPosition = true;
        for (let segment of snake) {
            if (segment.x === food.x && segment.y === food.y) {
                validPosition = false;
                break;
            }
        }
    }
}

function endGame() {
    gameRunning = false;
    clearInterval(gameLoopId);
    finalScoreElement.textContent = score;
    gameOverElement.style.display = 'block';
    playGameOverSound();
}

function restartGame() {
    snake = [{x: 10, y: 10}];
    dx = 0;
    dy = 0;
    food = {x: 15, y: 15};
    score = 0;
    gameSpeed = 100;
    gameRunning = true;
    scoreElement.textContent = 'Score: 0';
    gameOverElement.style.display = 'none';
    startGame();
}

function startGame() {
    gameLoopId = setInterval(drawGame, gameSpeed);
}

// Update game loop to handle variable speed
let lastTime = Date.now();
function gameLoop() {
    if (!gameRunning) return;
    
    const currentTime = Date.now();
    if (currentTime - lastTime > gameSpeed) {
        drawGame();
        lastTime = currentTime;
    }
    requestAnimationFrame(gameLoop);
}

// Start the game with smooth animation
requestAnimationFrame(gameLoop);

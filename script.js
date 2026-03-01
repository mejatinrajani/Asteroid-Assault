
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const livesEl = document.getElementById('lives');
const messageArea = document.getElementById('messageArea');
const messageText = document.getElementById('messageText');
const restartBtn = document.getElementById('restartBtn');
const powerUpStatusEl = document.getElementById('powerUpStatus');
const thrustLevelEl = document.getElementById('thrustLevel');

const leftBtn = document.getElementById('leftBtn');
const rightBtn = document.getElementById('rightBtn');
const thrustBtn = document.getElementById('thrustBtn');
const fireBtn = document.getElementById('fireBtn');

let canvasWidth, canvasHeight;
let ASTEROID_NUM_START = 4;

const SHIP_SIZE = 30;
const SHIP_TURN_SPEED = 0.1;
const BASE_SHIP_THRUST = 0.1;
const FRICTION = 0.99;
const BULLET_SPEED = 5;
const BULLET_LIFETIME = 60;
const ASTEROID_SPEED = 1;
const ASTEROID_SIZE_LARGE = 40;
const ASTEROID_SIZE_MEDIUM = 20;
const ASTEROID_SIZE_SMALL = 10;
const ASTEROID_POINTS_LARGE = 20;
const ASTEROID_POINTS_MEDIUM = 50;
const ASTEROID_POINTS_SMALL = 100;
const SHIP_INVINCIBILITY_FRAMES = 180;
const FPS = 60;
const POWERUP_CHANCE = 0.15;
const POWERUP_LIFETIME = 480;
const POWERUP_EFFECT_DURATION = 600;
const BASE_FIRE_DELAY = 15;
const RAPID_FIRE_DELAY = 5;
const MIN_THRUST_MULTIPLIER = 0.5;
const MAX_THRUST_MULTIPLIER = 2.0;
const THRUST_ADJUST_STEP = 0.1;
const NUM_STARS = 170; 

const PowerUpType = {
  SHIELD: 'shield',
  RAPID_FIRE: 'rapid_fire',
  SPREAD_SHOT: 'spread_shot',
};

let ship;
let bullets = [];
let asteroids = [];
let powerUps = [];
let stars = [];
let score = 0;
let lives = 3;
let keys = {
  left: false,
  right: false,
  up: false,
  space: false,
  minus: false,
  equal: false,
};
let isGameOver = false;
let shipInvincibleFrames = 0;
let gameLoopTimeout;
let timeSinceLastShot = 0;
let currentFireDelay = BASE_FIRE_DELAY;
let activePowerUp = null;
let powerUpTimer = 0;
let thrustMultiplier = 1.0;

class Ship {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.angle = -Math.PI / 2;
    this.vel = { x: 0, y: 0 };
    this.radius = SHIP_SIZE / 2;
    this.isThrusting = false;
    this.shieldActive = false;
    this.boosterFlameLength = 0;
  }
  rotate(direction) {
    this.angle += SHIP_TURN_SPEED * direction;
  }
  thrust() {
    const currentThrust = BASE_SHIP_THRUST * thrustMultiplier;
    this.vel.x += currentThrust * Math.cos(this.angle);
    this.vel.y += currentThrust * Math.sin(this.angle);
    this.isThrusting = true;
  }
  update() {
    this.vel.x *= FRICTION;
    this.vel.y *= FRICTION;
    this.x += this.vel.x;
    this.y += this.vel.y;
    
    if (this.x < -this.radius) this.x = canvasWidth + this.radius;
    if (this.x > canvasWidth + this.radius) this.x = -this.radius;
    if (this.y < -this.radius) this.y = canvasHeight + this.radius;
    if (this.y > canvasHeight + this.radius) this.y = -this.radius;
    
    if (this.isThrusting)
      this.boosterFlameLength = Math.min(
        this.boosterFlameLength + 2,
        SHIP_SIZE * 1.0
      ); 
    else this.boosterFlameLength = Math.max(this.boosterFlameLength - 1, 0);
    this.isThrusting = false;
    
    if (shipInvincibleFrames > 0) shipInvincibleFrames--;
    if (powerUpTimer > 0) {
      powerUpTimer--;
      if (powerUpTimer <= 0) this.deactivatePowerUp();
    }
    if (timeSinceLastShot < currentFireDelay) timeSinceLastShot++;
  }
  draw() {
    if (shipInvincibleFrames > 0 && Math.floor(Date.now() / 100) % 2 === 0)
      return;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);

    if (this.boosterFlameLength > 0) {
      const flicker = Math.random() * 0.2 + 0.9; 
      const flameLen = this.boosterFlameLength * flicker;

      const gradOuter = ctx.createRadialGradient(
        -SHIP_SIZE / 2,
        0,
        flameLen * 0.1,
        -SHIP_SIZE / 2,
        0,
        flameLen * 0.7
      );
      gradOuter.addColorStop(0, 'rgba(255, 150, 0, 0.8)');
      gradOuter.addColorStop(1, 'rgba(255, 0, 0, 0.3)'); 

      const gradInner = ctx.createRadialGradient(
        -SHIP_SIZE / 2,
        0,
        flameLen * 0.05,
        -SHIP_SIZE / 2,
        0,
        flameLen * 0.4
      );
      gradInner.addColorStop(0, 'rgba(255, 255, 200, 1)'); 
      gradInner.addColorStop(1, 'rgba(255, 200, 0, 0.7)'); 

      // Outer flame shape
      ctx.beginPath();
      ctx.moveTo(-SHIP_SIZE / 2.5, SHIP_SIZE / 4);
      ctx.lineTo(-SHIP_SIZE / 2 - flameLen, 0);
      ctx.lineTo(-SHIP_SIZE / 2.5, -SHIP_SIZE / 4);
      ctx.closePath();
      ctx.fillStyle = gradOuter;
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(-SHIP_SIZE / 2.5, SHIP_SIZE / 6);
      ctx.lineTo(-SHIP_SIZE / 2 - flameLen * 0.8, 0); 
      ctx.lineTo(-SHIP_SIZE / 2.5, -SHIP_SIZE / 6);
      ctx.closePath();
      ctx.fillStyle = gradInner;
      ctx.fill();
    }

    const shipGrad = ctx.createLinearGradient(
      -SHIP_SIZE / 2,
      -SHIP_SIZE / 3,
      SHIP_SIZE / 2,
      SHIP_SIZE / 3
    );
    shipGrad.addColorStop(0, '#50a0ff'); 
    shipGrad.addColorStop(1, '#0050cc'); 

    ctx.beginPath();
    ctx.moveTo(SHIP_SIZE / 2, 0);
    ctx.lineTo(-SHIP_SIZE / 2, -SHIP_SIZE / 3);
    ctx.lineTo(-SHIP_SIZE / 2, SHIP_SIZE / 3); 
    ctx.closePath();
    ctx.fillStyle = shipGrad; 
    ctx.strokeStyle = '#00ffff';
    ctx.lineWidth = 1.5; 
    ctx.fill();
    ctx.stroke();

    ctx.restore();

    // Draw shield if active
    if (this.shieldActive) {
      const shieldGrad = ctx.createRadialGradient(
        this.x,
        this.y,
        this.radius,
        this.x,
        this.y,
        this.radius + 5
      );
      shieldGrad.addColorStop(0, 'rgba(0, 180, 255, 0.1)');
      shieldGrad.addColorStop(1, 'rgba(0, 220, 255, 0.7)');
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius + 5, 0, Math.PI * 2);
      ctx.strokeStyle = shieldGrad; 
      ctx.lineWidth = 3; 
      ctx.stroke();
    }
  }
  tryShoot() {
    if (timeSinceLastShot >= currentFireDelay) {
      this.shoot();
      timeSinceLastShot = 0;
    }
  }
  shoot() {
    const noseX = this.x + (SHIP_SIZE / 2) * Math.cos(this.angle);
    const noseY = this.y + (SHIP_SIZE / 2) * Math.sin(this.angle);
    if (activePowerUp === PowerUpType.SPREAD_SHOT) {
      const spreadAngle = 0.25;
      bullets.push(
        new Bullet(
          noseX,
          noseY,
          BULLET_SPEED * Math.cos(this.angle),
          BULLET_SPEED * Math.sin(this.angle)
        )
      );
      bullets.push(
        new Bullet(
          noseX,
          noseY,
          BULLET_SPEED * Math.cos(this.angle - spreadAngle),
          BULLET_SPEED * Math.sin(this.angle - spreadAngle)
        )
      );
      bullets.push(
        new Bullet(
          noseX,
          noseY,
          BULLET_SPEED * Math.cos(this.angle + spreadAngle),
          BULLET_SPEED * Math.sin(this.angle + spreadAngle)
        )
      );
    } else {
      bullets.push(
        new Bullet(
          noseX,
          noseY,
          BULLET_SPEED * Math.cos(this.angle),
          BULLET_SPEED * Math.sin(this.angle)
        )
      );
    }
  }
  reset() {
    this.x = canvasWidth / 2;
    this.y = canvasHeight / 2;
    this.vel = { x: 0, y: 0 };
    this.angle = -Math.PI / 2;
    shipInvincibleFrames = SHIP_INVINCIBILITY_FRAMES;
    this.deactivatePowerUp();
  }
  activatePowerUp(type) {
    this.deactivatePowerUp();
    activePowerUp = type;
    powerUpTimer = POWERUP_EFFECT_DURATION;
    switch (type) {
      case PowerUpType.SHIELD:
        this.shieldActive = true;
        powerUpStatusEl.textContent = 'Shield Active!';
        break;
      case PowerUpType.RAPID_FIRE:
        currentFireDelay = RAPID_FIRE_DELAY;
        powerUpStatusEl.textContent = 'Rapid Fire!';
        break;
      case PowerUpType.SPREAD_SHOT:
        powerUpStatusEl.textContent = 'Spread Shot!';
        break;
    }
  }
  deactivatePowerUp() {
    if (!activePowerUp) return;
    switch (activePowerUp) {
      case PowerUpType.SHIELD:
        this.shieldActive = false;
        break;
      case PowerUpType.RAPID_FIRE:
        currentFireDelay = BASE_FIRE_DELAY;
        break;
      case PowerUpType.SPREAD_SHOT:
        break;
    }
    activePowerUp = null;
    powerUpTimer = 0;
    powerUpStatusEl.textContent = 'None';
  }
}

class Bullet {
  constructor(x, y, velX, velY) {
    this.x = x;
    this.y = y;
    this.vel = { x: velX, y: velY };
    this.radius = 3;
    this.lifetime = BULLET_LIFETIME;
  }
  update() {
    this.x += this.vel.x;
    this.y += this.vel.y;
    this.lifetime--;
  }
  draw() {
    const grad = ctx.createRadialGradient(
      this.x,
      this.y,
      0,
      this.x,
      this.y,
      this.radius
    );
    grad.addColorStop(0, 'rgba(255, 255, 255, 1)'); 
    grad.addColorStop(0.5, 'rgba(255, 255, 0, 1)'); 
    grad.addColorStop(1, 'rgba(255, 200, 0, 0.5)'); 

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius * 1.2, 0, Math.PI * 2); 
    ctx.fill();

    ctx.shadowColor = '#ffff00';
    ctx.shadowBlur = 6;
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
  }
}

class Asteroid {
  constructor(x, y, size, velX, velY) {
    this.x = x;
    this.y = y;
    this.size = size;
    this.radius = size / 2;
    this.vel = { x: velX, y: velY };
    this.angle = Math.random() * Math.PI * 2;
    this.rotationSpeed = (Math.random() - 0.5) * 0.02;
    this.vertices = this.createVertices();
    this.gradientOffset = {
      x: (Math.random() - 0.5) * this.radius * 0.5,
      y: (Math.random() - 0.5) * this.radius * 0.5,
    };
  }
  createVertices() {
    const numVertices = 8 + Math.floor(Math.random() * 5);
    const vertices = [];
    for (let i = 0; i < numVertices; i++) {
      const angle = (i / numVertices) * Math.PI * 2;
      const radius = this.radius * (0.7 + Math.random() * 0.6); 
      vertices.push({
        x: radius * Math.cos(angle),
        y: radius * Math.sin(angle),
      });
    }
    return vertices;
  }
  update() {
    this.x += this.vel.x;
    this.y += this.vel.y;
    this.angle += this.rotationSpeed;

    if (this.x < -this.radius) this.x = canvasWidth + this.radius;
    if (this.x > canvasWidth + this.radius) this.x = -this.radius;
    if (this.y < -this.radius) this.y = canvasHeight + this.radius;
    if (this.y > canvasHeight + this.radius) this.y = -this.radius;
  }
  draw() {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);

    const gradX = this.gradientOffset.x;
    const gradY = this.gradientOffset.y;
    const grad = ctx.createRadialGradient(
      gradX,
      gradY,
      this.radius * 0.1,
      gradX,
      gradY,
      this.radius * 1.2
    );
    grad.addColorStop(0, '#A0A0A0'); 
    grad.addColorStop(0.7, '#707070');
    grad.addColorStop(1, '#404040'); 

    ctx.beginPath();
    ctx.moveTo(this.vertices[0].x, this.vertices[0].y);
    for (let i = 1; i < this.vertices.length; i++) {
      ctx.lineTo(this.vertices[i].x, this.vertices[i].y);
    }
    ctx.closePath();

    ctx.fillStyle = grad;
    ctx.strokeStyle = '#303030';
    ctx.lineWidth = 1.5;
    ctx.fill(); 
    ctx.stroke(); 

    ctx.restore();
  }
}

class PowerUp {
  constructor(x, y, type) {
    this.x = x;
    this.y = y;
    this.type = type;
    this.radius = 8;
    this.lifetime = POWERUP_LIFETIME;
    this.pulsePhase = 0;
  }
  update() {
    this.lifetime--;
    this.pulsePhase += 0.1;
  }
  draw() {
    ctx.save();
    ctx.translate(this.x, this.y);
    const scale = 1 + Math.sin(this.pulsePhase) * 0.15;
    ctx.scale(scale, scale);

    let baseColor, lightColor, darkColor, symbol;
    switch (this.type) {
      case PowerUpType.SHIELD:
        baseColor = '0, 180, 255';
        lightColor = '150, 220, 255';
        darkColor = '0, 100, 180';
        symbol = 'S';
        break;
      case PowerUpType.RAPID_FIRE:
        baseColor = '0, 255, 100';
        lightColor = '150, 255, 180';
        darkColor = '0, 180, 80';
        symbol = 'R';
        break;
      case PowerUpType.SPREAD_SHOT:
        baseColor = '255, 150, 0';
        lightColor = '255, 200, 100';
        darkColor = '200, 100, 0';
        symbol = 'W';
        break;
      default:
        baseColor = '200, 200, 200';
        lightColor = '255, 255, 255';
        darkColor = '150, 150, 150';
        symbol = '?';
    }

    const grad = ctx.createRadialGradient(
      0,
      -this.radius * 0.3,
      this.radius * 0.1,
      0,
      0,
      this.radius
    );
    grad.addColorStop(0, `rgba(${lightColor}, 0.9)`);
    grad.addColorStop(0.7, `rgba(${baseColor}, 0.8)`);
    grad.addColorStop(1, `rgba(${darkColor}, 0.7)`); 

    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.fillStyle = 'white';
    ctx.shadowColor = 'black'; 
    ctx.shadowBlur = 3;
    ctx.font = `${this.radius * 1.2}px 'Press Start 2P'`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(symbol, 0, 1);

    ctx.restore();
  }
}

function createStars() {
  stars = []; 
  for (let i = 0; i < NUM_STARS; i++) {
    stars.push({
      x: Math.random() * canvasWidth,
      y: Math.random() * canvasHeight,
      radius: Math.random() * 1.2 + 0.3, 
      alpha: Math.random() * 0.5 + 0.3, 
    });
  }
}

function drawStars() {
  ctx.save();
  ctx.fillStyle = '#080810';
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);
  stars.forEach((star) => {
    ctx.beginPath();
    ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 255, 255, ${star.alpha})`; 
    ctx.fill();
  });
  ctx.restore();
}

function resizeCanvas() {
  const maxWidth = window.innerWidth * 0.95;
  const maxHeight = window.innerHeight * 0.75;
  let width = maxWidth;
  let height = width * (3 / 4);
  if (height > maxHeight) {
    height = maxHeight;
    width = height * (4 / 3);
  }
  canvas.width = width;
  canvas.height = height;
  canvasWidth = canvas.width;
  canvasHeight = canvas.height;
  createStars(); 
}

function initGame() {
  isGameOver = false;
  score = 0;
  lives = 3;
  shipInvincibleFrames = 0;
  timeSinceLastShot = BASE_FIRE_DELAY;
  thrustMultiplier = 1.0;
  ship = new Ship(canvasWidth / 2, canvasHeight / 2);
  ship.deactivatePowerUp();
  createStars(); 
  updateUI();
  messageArea.style.display = 'none';
  restartBtn.style.display = 'none';
  bullets = [];
  asteroids = [];
  powerUps = [];
  createAsteroids(ASTEROID_NUM_START, null, ASTEROID_SIZE_LARGE);
  clearTimeout(gameLoopTimeout);
  gameLoop();
}

function createAsteroids(
  count,
  sourceAsteroid = null,
  size = ASTEROID_SIZE_LARGE
) {
  for (let i = 0; i < count; i++) {
    let x, y, velX, velY;
    if (sourceAsteroid) {
      x = sourceAsteroid.x;
      y = sourceAsteroid.y;
      const angle = Math.random() * Math.PI * 2;
      velX = (Math.random() * ASTEROID_SPEED * 1.5 + 0.5) * Math.cos(angle);
      velY = (Math.random() * ASTEROID_SPEED * 1.5 + 0.5) * Math.sin(angle);
    } else {
      do {
        x = Math.random() * canvasWidth;
        y = Math.random() * canvasHeight;
      } while (
        ship &&
        distanceBetweenPoints(x, y, ship.x, ship.y) <
          ASTEROID_SIZE_LARGE * 3 + ship.radius
      );
      velX = (Math.random() - 0.5) * ASTEROID_SPEED * 2;
      velY = (Math.random() - 0.5) * ASTEROID_SPEED * 2;
    }
    asteroids.push(new Asteroid(x, y, size, velX, velY));
  }
}

function trySpawnPowerUp(x, y) {
  if (Math.random() < POWERUP_CHANCE) {
    const types = Object.values(PowerUpType);
    const randomType = types[Math.floor(Math.random() * types.length)];
    powerUps.push(new PowerUp(x, y, randomType));
  }
}

function distanceBetweenPoints(x1, y1, x2, y2) {
  return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
}

function checkCollisions() {

  for (let i = bullets.length - 1; i >= 0; i--) {
    const bullet = bullets[i];
    for (let j = asteroids.length - 1; j >= 0; j--) {
      const asteroid = asteroids[j];
      if (
        distanceBetweenPoints(bullet.x, bullet.y, asteroid.x, asteroid.y) <
        asteroid.radius + bullet.radius
      ) {
        bullets.splice(i, 1);
        splitAsteroid(asteroid, j);
        break;
      }
    }
  }
  if (shipInvincibleFrames <= 0) {
    for (let i = asteroids.length - 1; i >= 0; i--) {
      const asteroid = asteroids[i];
      if (
        distanceBetweenPoints(ship.x, ship.y, asteroid.x, asteroid.y) <
        asteroid.radius + ship.radius * 0.8
      ) {
        if (ship.shieldActive) {
          splitAsteroid(asteroid, i);
          ship.deactivatePowerUp();
        } else {
          loseLife();
        }
        break;
      }
    }
  }
  for (let i = powerUps.length - 1; i >= 0; i--) {
    const powerUp = powerUps[i];
    if (
      distanceBetweenPoints(ship.x, ship.y, powerUp.x, powerUp.y) <
      ship.radius + powerUp.radius
    ) {
      ship.activatePowerUp(powerUp.type);
      powerUps.splice(i, 1);
      break;
    }
  }
}

function splitAsteroid(asteroid, index) {
  const asteroidX = asteroid.x;
  const asteroidY = asteroid.y;
  if (asteroid.size === ASTEROID_SIZE_LARGE) {
    score += ASTEROID_POINTS_LARGE;
    createAsteroids(2, asteroid, ASTEROID_SIZE_MEDIUM);
  } else if (asteroid.size === ASTEROID_SIZE_MEDIUM) {
    score += ASTEROID_POINTS_MEDIUM;
    createAsteroids(2, asteroid, ASTEROID_SIZE_SMALL);
  } else {
    score += ASTEROID_POINTS_SMALL;
  }
  asteroids.splice(index, 1);
  updateUI();
  trySpawnPowerUp(asteroidX, asteroidY);
  if (asteroids.length === 0 && !isGameOver) levelUp();
}

function loseLife() {
  lives--;
  updateUI();
  if (lives <= 0) gameOver();
  else ship.reset();
}

function gameOver() {
  isGameOver = true;
  ship.deactivatePowerUp();
  messageText.textContent = `GAME OVER! Score: ${score}`;
  messageArea.style.display = 'block';
  restartBtn.style.display = 'inline-block';
  clearTimeout(gameLoopTimeout);
}

function levelUp() {
  clearTimeout(gameLoopTimeout);
  ASTEROID_NUM_START++;
  messageText.textContent = `LEVEL CLEAR! Next wave...`;
  messageArea.style.display = 'block';
  ship.reset();
  setTimeout(() => {
    messageArea.style.display = 'none';
    createAsteroids(ASTEROID_NUM_START, null, ASTEROID_SIZE_LARGE);
    if (!isGameOver) gameLoop();
  }, 2000);
}

function adjustThrust(direction) {
  if (direction > 0)
    thrustMultiplier = Math.min(
      MAX_THRUST_MULTIPLIER,
      thrustMultiplier + THRUST_ADJUST_STEP
    );
  else
    thrustMultiplier = Math.max(
      MIN_THRUST_MULTIPLIER,
      thrustMultiplier - THRUST_ADJUST_STEP
    );
  updateUI();
}

function updateUI() {
  scoreEl.textContent = score;
  livesEl.textContent = lives;
  thrustLevelEl.textContent = thrustMultiplier.toFixed(1);
}

function gameLoop() {
  if (isGameOver) return;

  if (keys.left) ship.rotate(-1);
  if (keys.right) ship.rotate(1);
  if (keys.up) ship.thrust();
  if (keys.space) ship.tryShoot();
  if (keys.minus) {
    adjustThrust(-1);
    keys.minus = false;
  }
  if (keys.equal) {
    adjustThrust(1);
    keys.equal = false;
  }

  ship.update();
  bullets.forEach((bullet, index) => {
    bullet.update();
    if (
      bullet.lifetime <= 0 ||
      bullet.x < 0 ||
      bullet.x > canvasWidth ||
      bullet.y < 0 ||
      bullet.y > canvasHeight
    )
      bullets.splice(index, 1);
  });
  asteroids.forEach((asteroid) => asteroid.update());
  powerUps.forEach((powerUp, index) => {
    powerUp.update();
    if (powerUp.lifetime <= 0) powerUps.splice(index, 1);
  });

  checkCollisions();

  drawStars();

  ship.draw();
  bullets.forEach((bullet) => bullet.draw());
  asteroids.forEach((asteroid) => asteroid.draw());
  powerUps.forEach((powerUp) => powerUp.draw());

  gameLoopTimeout = setTimeout(gameLoop, 1000 / FPS);
}

document.addEventListener('keydown', (e) => {
  if (isGameOver) return;
  let buttonToActivate = null;
  let handled = true;
  switch (e.code) {
    case 'ArrowLeft':
    case 'KeyA':
      keys.left = true;
      buttonToActivate = leftBtn;
      break;
    case 'ArrowRight':
    case 'KeyD':
      keys.right = true;
      buttonToActivate = rightBtn;
      break;
    case 'ArrowUp':
    case 'KeyW':
      keys.up = true;
      buttonToActivate = thrustBtn;
      break;
    case 'Space':
      keys.space = true;
      buttonToActivate = fireBtn;
      break;
    case 'Minus':
      keys.minus = true;
      break;
    case 'Equal':
      keys.equal = true;
      break;
    default:
      handled = false;
  }
  if (buttonToActivate) buttonToActivate.classList.add('active');
  if (handled) e.preventDefault();
});

document.addEventListener('keyup', (e) => {
  let buttonToDeactivate = null;
  switch (e.code) {
    case 'ArrowLeft':
    case 'KeyA':
      keys.left = false;
      buttonToDeactivate = leftBtn;
      break;
    case 'ArrowRight':
    case 'KeyD':
      keys.right = false;
      buttonToDeactivate = rightBtn;
      break;
    case 'ArrowUp':
    case 'KeyW':
      keys.up = false;
      buttonToDeactivate = thrustBtn;
      break;
    case 'Space':
      keys.space = false;
      buttonToDeactivate = fireBtn;
      break;
  }
  if (buttonToDeactivate) buttonToDeactivate.classList.remove('active');
});

function handleButtonDown(key, btn) {
  keys[key] = true;
  btn.classList.add('active');
  if (key === 'space') ship.tryShoot();
}
function handleButtonUp(key, btn) {
  keys[key] = false;
  btn.classList.remove('active');
}

leftBtn.addEventListener('mousedown', () => handleButtonDown('left', leftBtn));
leftBtn.addEventListener('mouseup', () => handleButtonUp('left', leftBtn));
leftBtn.addEventListener('mouseleave', () => handleButtonUp('left', leftBtn));
leftBtn.addEventListener('touchstart', (e) => {
  e.preventDefault();
  handleButtonDown('left', leftBtn);
});
leftBtn.addEventListener('touchend', () => handleButtonUp('left', leftBtn));

rightBtn.addEventListener('mousedown', () =>
  handleButtonDown('right', rightBtn)
);
rightBtn.addEventListener('mouseup', () => handleButtonUp('right', rightBtn));
rightBtn.addEventListener('mouseleave', () =>
  handleButtonUp('right', rightBtn)
);
rightBtn.addEventListener('touchstart', (e) => {
  e.preventDefault();
  handleButtonDown('right', rightBtn);
});
rightBtn.addEventListener('touchend', () => handleButtonUp('right', rightBtn));

thrustBtn.addEventListener('mousedown', () =>
  handleButtonDown('up', thrustBtn)
);
thrustBtn.addEventListener('mouseup', () => handleButtonUp('up', thrustBtn));
thrustBtn.addEventListener('mouseleave', () => handleButtonUp('up', thrustBtn));
thrustBtn.addEventListener('touchstart', (e) => {
  e.preventDefault();
  handleButtonDown('up', thrustBtn);
});
thrustBtn.addEventListener('touchend', () => handleButtonUp('up', thrustBtn));

fireBtn.addEventListener('mousedown', () => handleButtonDown('space', fireBtn));
fireBtn.addEventListener('mouseup', () => handleButtonUp('space', fireBtn));
fireBtn.addEventListener('mouseleave', () => handleButtonUp('space', fireBtn));
fireBtn.addEventListener('touchstart', (e) => {
  e.preventDefault();
  handleButtonDown('space', fireBtn);
});
fireBtn.addEventListener('touchend', () => handleButtonUp('space', fireBtn));

restartBtn.addEventListener('click', initGame);
window.addEventListener('resize', resizeCanvas);

resizeCanvas();
initGame(); 
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

// Set canvas size
canvas.width = 800;
canvas.height = 600;

// Particle class for flame effect
class Particle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.size = Math.random() * 3 + 2;
        this.speedX = (Math.random() - 0.5) * 1;
        this.speedY = Math.random() * 1 + 0.5;
        this.life = 1;
    }

    update() {
        this.x += this.speedX;
        this.y += this.speedY;
        this.life -= 0.02;
        if (this.size > 0.2) this.size -= 0.1;
    }

    draw() {
        ctx.fillStyle = `rgba(${this.getFlameColor()}, ${this.life * 0.3})`;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
    }

    getFlameColor() {
        // Return a light gray color for volleyball trails
        return '200, 200, 200';
    }
}

// Ball class
class Ball {
    constructor(x, y, radius, color) {
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.color = color;
        this.setSpeedForColor(color);
        this.particles = [];
        this.possibleColors = ['red', 'blue', 'green', 'orange', 'white', 'purple', 'yellow', 'cyan', 'magenta'];
    }

    setSpeedForColor(color) {
        const baseSpeed = 3; // Reduced from 6 to 3 for slower movement
        const purpleSpeedMultiplier = 1.5; // Reduced from 2 to 1.5 for slower purple balls
        
        if (color === 'purple') {
            this.dx = (Math.random() - 0.5) * baseSpeed * purpleSpeedMultiplier;
            this.dy = (Math.random() - 0.5) * baseSpeed * purpleSpeedMultiplier;
        } else {
            this.dx = (Math.random() - 0.5) * baseSpeed;
            this.dy = (Math.random() - 0.5) * baseSpeed;
        }
    }

    changeColor() {
        const currentIndex = this.possibleColors.indexOf(this.color);
        let newIndex;
        do {
            newIndex = Math.floor(Math.random() * this.possibleColors.length);
        } while (newIndex === currentIndex);
        
        const newColor = this.possibleColors[newIndex];
        this.color = newColor;
        
        // Adjust speed based on new color
        const currentSpeed = Math.sqrt(this.dx * this.dx + this.dy * this.dy);
        const direction = {
            x: this.dx / currentSpeed,
            y: this.dy / currentSpeed
        };
        
        if (newColor === 'purple') {
            // Speed up if becoming purple (but slower than before)
            this.dx = direction.x * 8; // Reduced from 16 to 8
            this.dy = direction.y * 8;
        } else if (this.possibleColors[currentIndex] === 'purple') {
            // Slow down if changing from purple
            this.dx = direction.x * 4; // Reduced from 8 to 4
            this.dy = direction.y * 4;
        }
    }

    draw() {
        // Draw the base white ball
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = 'white';
        ctx.fill();
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.closePath();

        // Save current context state
        ctx.save();
        ctx.translate(this.x, this.y);

        // Draw the volleyball pattern
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 1.5;

        // Draw six curved segments
        for (let i = 0; i < 6; i++) {
            ctx.beginPath();
            ctx.rotate(Math.PI / 3); // Rotate by 60 degrees
            // Draw curved line from top to bottom
            ctx.moveTo(0, -this.radius);
            ctx.bezierCurveTo(
                this.radius * 0.5, -this.radius * 0.5,
                this.radius * 0.5, this.radius * 0.5,
                0, this.radius
            );
            ctx.stroke();
        }

        // Restore context state
        ctx.restore();
    }

    createParticles() {
        for (let i = 0; i < 3; i++) {
            this.particles.push(new Particle(this.x, this.y, this.color));
        }
    }

    updateParticles() {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            this.particles[i].update();
            this.particles[i].draw();
            if (this.particles[i].life <= 0) {
                this.particles.splice(i, 1);
            }
        }
    }

    checkCollision(otherBall) {
        const dx = this.x - otherBall.x;
        const dy = this.y - otherBall.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < this.radius + otherBall.radius) {
            // Calculate collision normal
            const nx = dx / distance;
            const ny = dy / distance;

            // Calculate relative velocity
            const relativeVelocityX = this.dx - otherBall.dx;
            const relativeVelocityY = this.dy - otherBall.dy;
            
            // Calculate relative velocity in terms of the normal direction
            const velocityAlongNormal = relativeVelocityX * nx + relativeVelocityY * ny;
            
            // Do not resolve if objects are moving apart
            if (velocityAlongNormal > 0) {
                return;
            }

            // Restitution (bounciness)
            const restitution = 0.85;

            // Calculate impulse scalar
            const j = -(1 + restitution) * velocityAlongNormal;

            // Apply impulse
            const impulseX = j * nx;
            const impulseY = j * ny;
            
            this.dx += impulseX;
            this.dy += impulseY;
            otherBall.dx -= impulseX;
            otherBall.dy -= impulseY;

            // Positional correction to prevent sinking
            const percent = 0.8;
            const slop = 0.01;
            const penetration = this.radius + otherBall.radius - distance;
            const correction = Math.max(penetration - slop, 0) / (2) * percent;
            const correctionX = nx * correction;
            const correctionY = ny * correction;

            this.x += correctionX;
            this.y += correctionY;
            otherBall.x -= correctionX;
            otherBall.y -= correctionY;
        }
    }

    update() {
        // Calculate next position
        const nextX = this.x + this.dx;
        const nextY = this.y + this.dy;

        // Check wall collisions before moving
        if (nextX - this.radius < 0) {
            this.x = this.radius;
            this.dx = Math.abs(this.dx) * 0.85; // Add some energy loss
        } else if (nextX + this.radius > canvas.width) {
            this.x = canvas.width - this.radius;
            this.dx = -Math.abs(this.dx) * 0.85;
        } else {
            this.x = nextX;
        }

        if (nextY - this.radius < 0) {
            this.y = this.radius;
            this.dy = Math.abs(this.dy) * 0.85;
        } else if (nextY + this.radius > canvas.height) {
            this.y = canvas.height - this.radius;
            this.dy = -Math.abs(this.dy) * 0.85;
        } else {
            this.y = nextY;
        }

        // Create and update particles
        this.createParticles();
        this.updateParticles();
        
        this.draw();
    }
}

// Modify the colors array to only use white for volleyballs
const colors = Array(5).fill('white');
const balls = [];

// Create the original colored balls
for (let i = 0; i < colors.length; i++) {
    const radius = 20;
    const x = Math.random() * (canvas.width - radius * 2) + radius;
    const y = Math.random() * (canvas.height - radius * 2) + radius;
    balls.push(new Ball(x, y, radius, colors[i]));
}

// Add four more green balls
for (let i = 0; i < 4; i++) {
    const radius = 20;
    const x = Math.random() * (canvas.width - radius * 2) + radius;
    const y = Math.random() * (canvas.height - radius * 2) + radius;
    balls.push(new Ball(x, y, radius, 'green'));
}

// Animation loop
function animate() {
    ctx.fillStyle = 'rgba(228, 193, 92, 0.2)'; // Light sand color with transparency
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Update all balls
    balls.forEach(ball => ball.update());

    // Check collisions between all pairs of balls
    for (let i = 0; i < balls.length; i++) {
        for (let j = i + 1; j < balls.length; j++) {
            balls[i].checkCollision(balls[j]);
        }
    }

    requestAnimationFrame(animate);
}

animate(); 
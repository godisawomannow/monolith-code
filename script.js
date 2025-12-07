const canvas = document.createElement('canvas');
const ctx = canvas.getContext('2d');
document.body.appendChild(canvas);

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// Initialize SimplexNoise
const { createNoise2D } = SimplexNoise;
const noise2D = createNoise2D();

let boids = [];
const BOID_COUNT = 300;
let mouseX = -100;
let mouseY = -100;
let time = 0;

class Boid {
    constructor() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.vx = Math.random() * 2 - 1;
        this.vy = Math.random() * 2 - 1;
        this.size = Math.random() * 4 + 2;
        this.maxSpeed = 3 + (6 - this.size) * 0.3;
        this.hue = Math.random() * 60 + 180; // Cyan to purple range
        this.noiseOffset = Math.random() * 1000;
        this.trail = [];
        this.maxTrailLength = Math.floor(this.size * 3);
    }
    
    update() {
        // Noise-based movement
        const noiseScale = 0.01;
        const noiseAngle = noise2D(this.x * noiseScale + this.noiseOffset, time * 0.001) * Math.PI * 2;
        
        // Apply noise influence
        this.vx += Math.cos(noiseAngle) * 0.3;
        this.vy += Math.sin(noiseAngle) * 0.3;
        
        // Bias towards right
        this.vx += 0.1;
        
        // Mouse avoidance
        const dx = this.x - mouseX;
        const dy = this.y - mouseY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist < 100) {
            const force = (100 - dist) / 100;
            this.vx += (dx / dist) * force * 2;
            this.vy += (dy / dist) * force * 2;
        }
        
        // Limit speed
        const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
        if (speed > this.maxSpeed) {
            this.vx = (this.vx / speed) * this.maxSpeed;
            this.vy = (this.vy / speed) * this.maxSpeed;
        }
        
        // Update trail
        this.trail.push({x: this.x, y: this.y});
        if (this.trail.length > this.maxTrailLength) {
            this.trail.shift();
        }
        
        // Update position
        this.x += this.vx;
        this.y += this.vy;
        
        // Wrap around edges
        if (this.x > canvas.width + this.size) {
            this.x = -this.size;
            this.trail = [];
        }
        if (this.x < -this.size) {
            this.x = canvas.width + this.size;
            this.trail = [];
        }
        if (this.y > canvas.height + this.size) {
            this.y = -this.size;
            this.trail = [];
        }
        if (this.y < -this.size) {
            this.y = canvas.height + this.size;
            this.trail = [];
        }
    }
    
    explode() {
        const angle = Math.random() * Math.PI * 2;
        const force = Math.random() * 10 + 5;
        this.vx = Math.cos(angle) * force;
        this.vy = Math.sin(angle) * force;
    }
    
    draw() {
        // Draw trail
        ctx.strokeStyle = `hsla(${this.hue}, 70%, 60%, 0.3)`;
        ctx.lineWidth = this.size * 0.5;
        ctx.beginPath();
        
        if (this.trail.length > 1) {
            ctx.moveTo(this.trail[0].x, this.trail[0].y);
            for (let i = 1; i < this.trail.length; i++) {
                ctx.lineTo(this.trail[i].x, this.trail[i].y);
            }
            ctx.stroke();
        }
        
        // Draw boid
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(Math.atan2(this.vy, this.vx));
        
        // Draw triangular shape
        ctx.beginPath();
        ctx.moveTo(this.size, 0);
        ctx.lineTo(-this.size * 0.7, -this.size * 0.5);
        ctx.lineTo(-this.size * 0.7, this.size * 0.5);
        ctx.closePath();
        
        // Gradient fill
        const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, this.size);
        gradient.addColorStop(0, `hsla(${this.hue}, 80%, 70%, 1)`);
        gradient.addColorStop(1, `hsla(${this.hue}, 70%, 50%, 0.8)`);
        ctx.fillStyle = gradient;
        ctx.fill();
        
        ctx.restore();
    }
}

// Create boids
for (let i = 0; i < BOID_COUNT; i++) {
    boids.push(new Boid());
}

function animate() {
    // Semi-transparent overlay for trail effect
    ctx.fillStyle = 'rgba(15, 12, 41, 0.05)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Update and draw boids
    for (let boid of boids) {
        boid.update();
        boid.draw();
    }
    
    time++;
    requestAnimationFrame(animate);
}

// Mouse tracking
window.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
});

// Click explosion
window.addEventListener('click', (e) => {
    for (let boid of boids) {
        boid.explode();
    }
});

window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
});

animate();
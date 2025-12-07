let boids = [];
const BOID_COUNT = 400;
let mouseX = -100;
let mouseY = -100;
let time = 0;
let explosionParticles = [];
let pulseEffect = 0;

function setup() {
    createCanvas(windowWidth, windowHeight);
    noStroke();
    
    // Create boids
    for (let i = 0; i < BOID_COUNT; i++) {
        boids.push(new Boid());
    }
}

class Boid {
    constructor() {
        this.x = random(width);
        this.y = random(height);
        this.vx = random(-2, 2);
        this.vy = random(-2, 2);
        this.size = random(3, 8);
        this.maxSpeed = 4 + (8 - this.size) * 0.5;
        this.hue = random(360);
        this.noiseOffset = random(1000);
        this.trail = [];
        this.maxTrailLength = floor(this.size * 5);
        this.glowIntensity = random(0.5, 1);
    }
    
    update() {
        // Noise-based movement with more dynamic behavior
        const noiseScale = 0.005;
        const noiseAngle = noise(this.x * noiseScale + this.noiseOffset, this.y * noiseScale, time * 0.001) * TWO_PI * 2;
        
        // Apply noise influence with varying strength
        const noiseStrength = 0.5 + sin(time * 0.01 + this.noiseOffset) * 0.3;
        this.vx += cos(noiseAngle) * noiseStrength;
        this.vy += sin(noiseAngle) * noiseStrength;
        
        // Swirling motion
        const centerX = width / 2;
        const centerY = height / 2;
        const angleToCenter = atan2(centerY - this.y, centerX - this.x);
        this.vx += cos(angleToCenter + HALF_PI) * 0.1;
        this.vy += sin(angleToCenter + HALF_PI) * 0.1;
        
        // Mouse interaction - attraction and repulsion
        const dx = this.x - mouseX;
        const dy = this.y - mouseY;
        const dist = sqrt(dx * dx + dy * dy);
        
        if (dist < 150) {
            const force = (150 - dist) / 150;
            // Repel with some randomness
            this.vx += (dx / dist) * force * 3 + random(-1, 1);
            this.vy += (dy / dist) * force * 3 + random(-1, 1);
            // Change color when near mouse
            this.hue = (this.hue + 5) % 360;
        }
        
        // Limit speed
        const speed = sqrt(this.vx * this.vx + this.vy * this.vy);
        if (speed > this.maxSpeed) {
            this.vx = (this.vx / speed) * this.maxSpeed;
            this.vy = (this.vy / speed) * this.maxSpeed;
        }
        
        // Update trail
        this.trail.push({x: this.x, y: this.y, hue: this.hue});
        if (this.trail.length > this.maxTrailLength) {
            this.trail.shift();
        }
        
        // Update position
        this.x += this.vx;
        this.y += this.vy;
        
        // Wrap around edges with smooth transition
        if (this.x > width + this.size) {
            this.x = -this.size;
            this.trail = [];
        }
        if (this.x < -this.size) {
            this.x = width + this.size;
            this.trail = [];
        }
        if (this.y > height + this.size) {
            this.y = -this.size;
            this.trail = [];
        }
        if (this.y < -this.size) {
            this.y = height + this.size;
            this.trail = [];
        }
        
        // Color cycling
        this.hue = (this.hue + 0.5) % 360;
    }
    
    explode() {
        const angle = random(TWO_PI);
        const force = random(15, 25);
        this.vx = cos(angle) * force;
        this.vy = sin(angle) * force;
        
        // Create explosion particles
        for (let i = 0; i < 5; i++) {
            explosionParticles.push(new ExplosionParticle(this.x, this.y, this.hue));
        }
    }
    
    draw() {
        push();
        
        // Draw glowing trail
        strokeWeight(this.size);
        for (let i = 1; i < this.trail.length; i++) {
            const alpha = map(i, 0, this.trail.length, 0, 0.8);
            stroke(this.trail[i].hue, 80, 100, alpha);
            line(this.trail[i-1].x, this.trail[i-1].y, this.trail[i].x, this.trail[i].y);
        }
        
        // Draw boid with glow effect
        translate(this.x, this.y);
        rotate(atan2(this.vy, this.vx));
        
        // Outer glow
        for (let i = 3; i > 0; i--) {
            fill(this.hue, 70, 100, 0.1 * this.glowIntensity);
            beginShape();
            vertex(this.size * i, 0);
            vertex(-this.size * i * 0.7, -this.size * i * 0.5);
            vertex(-this.size * i * 0.7, this.size * i * 0.5);
            endShape(CLOSE);
        }
        
        // Inner bright core
        fill(this.hue, 50, 100, 1);
        beginShape();
        vertex(this.size, 0);
        vertex(-this.size * 0.7, -this.size * 0.5);
        vertex(-this.size * 0.7, this.size * 0.5);
        endShape(CLOSE);
        
        // Bright center point
        fill(this.hue, 30, 100, 1);
        circle(0, 0, this.size * 0.5);
        
        pop();
    }
}

class ExplosionParticle {
    constructor(x, y, hue) {
        this.x = x;
        this.y = y;
        this.vx = random(-10, 10);
        this.vy = random(-10, 10);
        this.size = random(2, 6);
        this.hue = hue + random(-30, 30);
        this.life = 1;
    }
    
    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vx *= 0.95;
        this.vy *= 0.95;
        this.life -= 0.02;
        this.size *= 0.98;
    }
    
    draw() {
        if (this.life > 0) {
            fill(this.hue, 90, 100, this.life);
            circle(this.x, this.y, this.size * 2);
        }
    }
}

function draw() {
    // Dynamic background with color shifts
    colorMode(RGB);
    background(0, 0, 0, 20);
    colorMode(HSB);
    
    // Background pulse effect
    if (pulseEffect > 0) {
        fill(0, 0, 100, pulseEffect * 0.1);
        rect(0, 0, width, height);
        pulseEffect -= 2;
    }
    
    // Update and draw explosion particles
    for (let i = explosionParticles.length - 1; i >= 0; i--) {
        explosionParticles[i].update();
        explosionParticles[i].draw();
        if (explosionParticles[i].life <= 0) {
            explosionParticles.splice(i, 1);
        }
    }
    
    // Update and draw boids
    for (let boid of boids) {
        boid.update();
        boid.draw();
    }
    
    // Draw mouse interaction area
    if (mouseX > 0 && mouseX < width && mouseY > 0 && mouseY < height) {
        push();
        noFill();
        for (let i = 0; i < 3; i++) {
            stroke(time % 360, 70, 100, 0.3 - i * 0.1);
            strokeWeight(2);
            circle(mouseX, mouseY, 150 - i * 30);
        }
        pop();
    }
    
    time++;
}

// Mouse tracking
function mouseMoved() {
    mouseX = mouseX;
    mouseY = mouseY;
}

// Click explosion
function mousePressed() {
    for (let boid of boids) {
        boid.explode();
    }
    pulseEffect = 100;
    
    // Create extra explosion particles at mouse
    for (let i = 0; i < 50; i++) {
        explosionParticles.push(new ExplosionParticle(mouseX, mouseY, random(360)));
    }
}

function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
}
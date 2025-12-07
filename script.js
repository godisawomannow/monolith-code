let boids = [];
let BOID_COUNT = 100; // Reduced from 400
let mouseX = -100;
let mouseY = -100;
let time = 0;
let explosionParticles = [];
let pulseEffect = 0;
let frameCounter = 0;

function setup() {
    createCanvas(windowWidth, windowHeight);
    noStroke();
    
    // Adjust boid count based on device performance
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    if (isMobile) {
        BOID_COUNT = 50;
    } else if (window.innerWidth < 800 || window.innerHeight < 600) {
        BOID_COUNT = 75;
    }
    
    // Create boids
    for (let i = 0; i < BOID_COUNT; i++) {
        boids.push(new Boid());
    }
    
    // Set frame rate for better performance
    frameRate(30);
}

class Boid {
    constructor() {
        this.x = random(width);
        this.y = random(height);
        this.vx = random(-2, 2);
        this.vy = random(-2, 2);
        this.size = random(3, 6);
        this.maxSpeed = 3 + (6 - this.size) * 0.5;
        this.hue = random(360);
        this.noiseOffset = random(1000);
        this.trail = [];
        this.maxTrailLength = 3; // Reduced from size * 5
        this.glowIntensity = 0.8;
    }
    
    update() {
        // Simplified noise-based movement
        if (frameCounter % 3 === 0) { // Update noise less frequently
            const noiseScale = 0.01;
            const noiseAngle = noise(this.x * noiseScale + this.noiseOffset, this.y * noiseScale) * TWO_PI * 2;
            
            this.vx += cos(noiseAngle) * 0.3;
            this.vy += sin(noiseAngle) * 0.3;
        }
        
        // Simple swirling motion
        if (frameCounter % 5 === 0) {
            const centerX = width / 2;
            const centerY = height / 2;
            const angleToCenter = atan2(centerY - this.y, centerX - this.x);
            this.vx += cos(angleToCenter + HALF_PI) * 0.1;
            this.vy += sin(angleToCenter + HALF_PI) * 0.1;
        }
        
        // Mouse interaction - simplified
        const dx = this.x - mouseX;
        const dy = this.y - mouseY;
        const distSq = dx * dx + dy * dy;
        
        if (distSq < 22500) { // 150 * 150
            const dist = sqrt(distSq);
            const force = (150 - dist) / 150;
            this.vx += (dx / dist) * force * 2;
            this.vy += (dy / dist) * force * 2;
            this.hue = (this.hue + 3) % 360;
        }
        
        // Limit speed
        const speedSq = this.vx * this.vx + this.vy * this.vy;
        if (speedSq > this.maxSpeed * this.maxSpeed) {
            const speed = sqrt(speedSq);
            this.vx = (this.vx / speed) * this.maxSpeed;
            this.vy = (this.vy / speed) * this.maxSpeed;
        }
        
        // Update trail less frequently
        if (frameCounter % 2 === 0) {
            this.trail.push({x: this.x, y: this.y});
            if (this.trail.length > this.maxTrailLength) {
                this.trail.shift();
            }
        }
        
        // Update position
        this.x += this.vx;
        this.y += this.vy;
        
        // Wrap around edges
        if (this.x > width + this.size) this.x = -this.size;
        if (this.x < -this.size) this.x = width + this.size;
        if (this.y > height + this.size) this.y = -this.size;
        if (this.y < -this.size) this.y = height + this.size;
        
        // Color cycling
        if (frameCounter % 2 === 0) {
            this.hue = (this.hue + 0.5) % 360;
        }
    }
    
    explode() {
        const angle = random(TWO_PI);
        const force = random(10, 20);
        this.vx = cos(angle) * force;
        this.vy = sin(angle) * force;
        
        // Create fewer explosion particles
        for (let i = 0; i < 2; i++) {
            explosionParticles.push(new ExplosionParticle(this.x, this.y, this.hue));
        }
    }
    
    draw() {
        push();
        
        // Simplified trail drawing
        if (this.trail.length > 1) {
            stroke(this.hue, 80, 100, 0.3);
            strokeWeight(this.size * 0.8);
            noFill();
            beginShape();
            for (let i = 0; i < this.trail.length; i++) {
                vertex(this.trail[i].x, this.trail[i].y);
            }
            endShape();
        }
        
        noStroke();
        translate(this.x, this.y);
        rotate(atan2(this.vy, this.vx));
        
        // Simplified glow - just one layer
        fill(this.hue, 70, 100, 0.2);
        beginShape();
        vertex(this.size * 2, 0);
        vertex(-this.size * 1.4, -this.size);
        vertex(-this.size * 1.4, this.size);
        endShape(CLOSE);
        
        // Main body
        fill(this.hue, 50, 100, 1);
        beginShape();
        vertex(this.size, 0);
        vertex(-this.size * 0.7, -this.size * 0.5);
        vertex(-this.size * 0.7, this.size * 0.5);
        endShape(CLOSE);
        
        pop();
    }
}

class ExplosionParticle {
    constructor(x, y, hue) {
        this.x = x;
        this.y = y;
        this.vx = random(-8, 8);
        this.vy = random(-8, 8);
        this.size = random(2, 4);
        this.hue = hue + random(-30, 30);
        this.life = 1;
    }
    
    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vx *= 0.92;
        this.vy *= 0.92;
        this.life -= 0.05;
        this.size *= 0.95;
    }
    
    draw() {
        if (this.life > 0) {
            fill(this.hue, 90, 100, this.life);
            circle(this.x, this.y, this.size);
        }
    }
}

function draw() {
    // Faster fade effect
    colorMode(RGB);
    background(0, 0, 0, 50);
    colorMode(HSB);
    
    // Background pulse effect
    if (pulseEffect > 0) {
        fill(0, 0, 100, pulseEffect * 0.05);
        rect(0, 0, width, height);
        pulseEffect -= 5;
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
    
    // Simplified mouse interaction indicator
    if (frameCounter % 2 === 0 && mouseX > 0 && mouseX < width && mouseY > 0 && mouseY < height) {
        push();
        noFill();
        stroke(time % 360, 70, 100, 0.3);
        strokeWeight(2);
        circle(mouseX, mouseY, 150);
        pop();
    }
    
    time++;
    frameCounter++;
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
    
    // Create fewer explosion particles at mouse
    for (let i = 0; i < 20; i++) {
        explosionParticles.push(new ExplosionParticle(mouseX, mouseY, random(360)));
    }
}

function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
}
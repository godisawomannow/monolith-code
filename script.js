const canvas = document.createElement('canvas');
const ctx = canvas.getContext('2d');
document.body.appendChild(canvas);

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let particles = [];
const PARTICLE_COUNT = 500;

class Particle {
    constructor() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.radius = Math.random() * 3 + 1;
        this.speed = Math.random() * 2 + 0.5;
        this.hue = Math.random() * 360;
    }
    
    update() {
        this.x += this.speed;
        
        // Wrap around when reaching the edge
        if (this.x > canvas.width + this.radius) {
            this.x = -this.radius;
            this.y = Math.random() * canvas.height;
        }
    }
    
    draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = `hsl(${this.hue}, 70%, 50%)`;
        ctx.fill();
    }
}

// Create particles
for (let i = 0; i < PARTICLE_COUNT; i++) {
    particles.push(new Particle());
}

function animate() {
    // Clear canvas
    ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Update and draw particles
    for (let particle of particles) {
        particle.update();
        particle.draw();
    }
    
    requestAnimationFrame(animate);
}

window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
});

animate();
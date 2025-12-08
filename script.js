// Species definitions with unique behaviors
const SPECIES = {
    predator: {
        color: [255, 100, 100],
        speed: 2.5,
        size: 3,
        lifespan: 300,
        reproductionRate: 0.02,
        energy: 100,
        behavior: 'hunt'
    },
    prey: {
        color: [100, 255, 100],
        speed: 2.0,
        size: 2,
        lifespan: 200,
        reproductionRate: 0.04,
        energy: 50,
        behavior: 'flee'
    },
    scavenger: {
        color: [255, 255, 100],
        speed: 1.5,
        size: 2.5,
        lifespan: 400,
        reproductionRate: 0.03,
        energy: 75,
        behavior: 'wander'
    },
    parasite: {
        color: [255, 100, 255],
        speed: 3.0,
        size: 1.5,
        lifespan: 150,
        reproductionRate: 0.05,
        energy: 30,
        behavior: 'attach'
    },
    plant: {
        color: [100, 200, 100],
        speed: 0,
        size: 4,
        lifespan: 500,
        reproductionRate: 0.01,
        energy: 25,
        behavior: 'static'
    }
};

let particles = [];
let grid;
let cellSize = 10;
let cols, rows;
let cursedText = '';

class Particle {
    constructor(x, y, species) {
        this.pos = createVector(x, y);
        this.vel = createVector(random(-1, 1), random(-1, 1));
        this.acc = createVector(0, 0);
        this.species = species;
        this.config = SPECIES[species];
        this.energy = this.config.energy;
        this.age = 0;
        this.size = this.config.size;
        this.reproductionCooldown = 0;
    }

    update() {
        this.age++;
        this.reproductionCooldown = max(0, this.reproductionCooldown - 1);
        
        // Apply behavior
        switch(this.config.behavior) {
            case 'hunt':
                this.hunt();
                break;
            case 'flee':
                this.flee();
                break;
            case 'wander':
                this.wander();
                break;
            case 'attach':
                this.attach();
                break;
            case 'static':
                this.vel.mult(0);
                break;
        }

        // Update physics
        if (this.config.speed > 0) {
            this.vel.add(this.acc);
            this.vel.limit(this.config.speed);
            this.pos.add(this.vel);
            this.acc.mult(0);
        }

        // Wrap around edges
        this.pos.x = (this.pos.x + width) % width;
        this.pos.y = (this.pos.y + height) % height;

        // Energy decay
        this.energy -= 0.5;
        if (this.species === 'plant') {
            this.energy = min(this.config.energy * 2, this.energy + 1);
        }

        // Reproduction
        if (random() < this.config.reproductionRate && 
            this.reproductionCooldown === 0 && 
            this.energy > this.config.energy * 0.5) {
            this.reproduce();
        }
    }

    hunt() {
        let closest = null;
        let closestDist = Infinity;
        
        for (let p of particles) {
            if (p !== this && (p.species === 'prey' || p.species === 'plant')) {
                let d = p5.Vector.dist(this.pos, p.pos);
                if (d < closestDist && d < 100) {
                    closest = p;
                    closestDist = d;
                }
            }
        }

        if (closest) {
            let force = p5.Vector.sub(closest.pos, this.pos);
            force.normalize();
            force.mult(0.5);
            this.acc.add(force);

            // Eat if close enough
            if (closestDist < 10) {
                this.energy += closest.energy * 0.5;
                closest.energy = 0;
            }
        }
    }

    flee() {
        for (let p of particles) {
            if (p.species === 'predator') {
                let d = p5.Vector.dist(this.pos, p.pos);
                if (d < 50) {
                    let force = p5.Vector.sub(this.pos, p.pos);
                    force.normalize();
                    force.mult(0.8);
                    this.acc.add(force);
                }
            }
        }
        
        // Also move towards plants
        for (let p of particles) {
            if (p.species === 'plant') {
                let d = p5.Vector.dist(this.pos, p.pos);
                if (d < 30 && d > 5) {
                    let force = p5.Vector.sub(p.pos, this.pos);
                    force.normalize();
                    force.mult(0.3);
                    this.acc.add(force);
                }
                
                // Eat plant
                if (d < 10) {
                    this.energy += 10;
                    p.energy -= 10;
                }
            }
        }
    }

    wander() {
        this.acc.add(p5.Vector.random2D().mult(0.1));
        
        // Look for dead particles
        for (let p of particles) {
            if (p.energy <= 0) {
                let d = p5.Vector.dist(this.pos, p.pos);
                if (d < 50) {
                    let force = p5.Vector.sub(p.pos, this.pos);
                    force.normalize();
                    force.mult(0.4);
                    this.acc.add(force);
                    
                    if (d < 10) {
                        this.energy += 15;
                        p.energy = -100; // Mark for removal
                    }
                }
            }
        }
    }

    attach() {
        let closest = null;
        let closestDist = Infinity;
        
        for (let p of particles) {
            if (p !== this && p.species !== 'parasite' && p.species !== 'plant') {
                let d = p5.Vector.dist(this.pos, p.pos);
                if (d < closestDist && d < 80) {
                    closest = p;
                    closestDist = d;
                }
            }
        }

        if (closest) {
            let force = p5.Vector.sub(closest.pos, this.pos);
            force.normalize();
            force.mult(0.6);
            this.acc.add(force);

            // Drain energy if attached
            if (closestDist < 5) {
                this.energy += 0.5;
                closest.energy -= 1;
                this.pos = closest.pos.copy();
            }
        } else {
            this.wander();
        }
    }

    reproduce() {
        if (particles.length < 5000) { // Performance cap
            let offspring = new Particle(
                this.pos.x + random(-10, 10),
                this.pos.y + random(-10, 10),
                this.species
            );
            particles.push(offspring);
            this.energy *= 0.6;
            this.reproductionCooldown = 60;
        }
    }

    isDead() {
        return this.energy <= 0 || this.age > this.config.lifespan;
    }

    display() {
        push();
        noStroke();
        let alpha = map(this.energy, 0, this.config.energy, 50, 255);
        fill(...this.config.color, alpha);
        circle(this.pos.x, this.pos.y, this.size * 2);
        pop();
    }
}

function setup() {
    createCanvas(windowWidth, windowHeight);
    
    // Initialize particles
    for (let species in SPECIES) {
        let count = species === 'plant' ? 100 : 50;
        for (let i = 0; i < count; i++) {
            particles.push(new Particle(
                random(width),
                random(height),
                species
            ));
        }
    }

    // Set up cursed input
    const textInput = document.getElementById('text-input');
    
    // Curse the initial value
    cursedText = curseText(textInput.value);
    textInput.value = cursedText;
    
    // Handle input with curse
    textInput.addEventListener('input', (e) => {
        const cursorPos = e.target.selectionStart;
        const originalText = e.target.value;
        
        // Apply curse to the entire text
        cursedText = curseText(originalText);
        e.target.value = cursedText;
        
        // Try to maintain cursor position
        e.target.setSelectionRange(cursorPos, cursorPos);
    });

    // Handle paste events
    textInput.addEventListener('paste', (e) => {
        e.preventDefault();
        const pastedText = (e.clipboardData || window.clipboardData).getData('text');
        const cursedPaste = curseText(pastedText);
        
        const start = e.target.selectionStart;
        const end = e.target.selectionEnd;
        const text = e.target.value;
        
        e.target.value = text.substring(0, start) + cursedPaste + text.substring(end);
        e.target.setSelectionRange(start + cursedPaste.length, start + cursedPaste.length);
    });
}

function curseText(text) {
    let cursed = '';
    for (let i = 0; i < text.length; i++) {
        const charCode = text.charCodeAt(i);
        // Add 16 to the Unicode value and convert back to character
        const cursedChar = String.fromCharCode(charCode + 16);
        cursed += cursedChar;
    }
    return cursed;
}

function draw() {
    background(0, 20);
    
    // Update and display particles
    for (let i = particles.length - 1; i >= 0; i--) {
        let p = particles[i];
        p.update();
        
        if (p.isDead()) {
            particles.splice(i, 1);
        } else {
            p.display();
        }
    }
    
    // Update stats
    updateStats();
    
    // Occasionally spawn new plants
    if (frameCount % 60 === 0 && particles.filter(p => p.species === 'plant').length < 50) {
        particles.push(new Particle(random(width), random(height), 'plant'));
    }
}

function updateStats() {
    let speciesCount = {};
    for (let p of particles) {
        speciesCount[p.species] = (speciesCount[p.species] || 0) + 1;
    }
    
    document.getElementById('species-count').textContent = Object.keys(speciesCount).length;
    document.getElementById('cell-count').textContent = particles.length;
    document.getElementById('fps').textContent = Math.round(frameRate());
}

function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
}

// Add new particles on click
function mousePressed() {
    let species = random(Object.keys(SPECIES));
    for (let i = 0; i < 5; i++) {
        particles.push(new Particle(
            mouseX + random(-20, 20),
            mouseY + random(-20, 20),
            species
        ));
    }
}
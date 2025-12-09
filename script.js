let pixels = [];
let partitions = [];
let pixelSize = 2;
let cols, rows;
let sortingSpeed = 3;
let activeSorts = [];

class Pixel {
    constructor(x, y, brightness) {
        this.x = x;
        this.y = y;
        this.targetX = x;
        this.brightness = brightness;
        this.moving = false;
        this.speed = random(2, 5);
    }

    update() {
        if (this.moving) {
            let dx = this.targetX - this.x;
            if (abs(dx) > 0.5) {
                this.x += dx * 0.1 * this.speed;
            } else {
                this.x = this.targetX;
                this.moving = false;
            }
        }
    }

    setTarget(newX) {
        this.targetX = newX;
        this.moving = true;
    }

    display() {
        push();
        noStroke();
        fill(this.brightness);
        rect(this.x, this.y, pixelSize, pixelSize);
        pop();
    }
}

class Partition {
    constructor(startY, height) {
        this.startY = startY;
        this.height = height;
        this.pixels = [];
        this.sorting = false;
        this.sortProgress = 0;
        this.sortDirection = random() > 0.5 ? 1 : -1; // 1 for ascending, -1 for descending
        this.sortType = random(['bubble', 'quick', 'merge']);
    }

    addPixel(pixel) {
        this.pixels.push(pixel);
    }

    startSort() {
        this.sorting = true;
        this.sortProgress = 0;
        
        // Shuffle pixels first for visual effect
        for (let i = this.pixels.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.pixels[i], this.pixels[j]] = [this.pixels[j], this.pixels[i]];
        }
        
        // Update positions
        this.updatePixelPositions();
    }

    updatePixelPositions() {
        for (let i = 0; i < this.pixels.length; i++) {
            this.pixels[i].setTarget(i * pixelSize);
        }
    }

    sort() {
        if (!this.sorting) return false;

        let sorted = false;
        
        // Bubble sort with visual steps
        for (let step = 0; step < sortingSpeed && !sorted; step++) {
            sorted = true;
            
            for (let i = 0; i < this.pixels.length - 1 - this.sortProgress; i++) {
                let shouldSwap = this.sortDirection === 1 ? 
                    this.pixels[i].brightness > this.pixels[i + 1].brightness :
                    this.pixels[i].brightness < this.pixels[i + 1].brightness;
                    
                if (shouldSwap) {
                    // Swap pixels
                    [this.pixels[i], this.pixels[i + 1]] = [this.pixels[i + 1], this.pixels[i]];
                    sorted = false;
                }
            }
            
            this.sortProgress++;
        }

        // Update positions after sorting
        this.updatePixelPositions();

        if (sorted || this.sortProgress >= this.pixels.length) {
            this.sorting = false;
            return false;
        }
        
        return true;
    }

    isSorted() {
        for (let i = 0; i < this.pixels.length - 1; i++) {
            let inOrder = this.sortDirection === 1 ? 
                this.pixels[i].brightness <= this.pixels[i + 1].brightness :
                this.pixels[i].brightness >= this.pixels[i + 1].brightness;
            if (!inOrder) return false;
        }
        return true;
    }

    update() {
        // Update all pixels in partition
        for (let pixel of this.pixels) {
            pixel.update();
        }

        // Continue sorting if active
        if (this.sorting) {
            return this.sort();
        }
        
        // Check if sorted and randomly reshuffle
        if (!this.sorting && this.isSorted() && random() < 0.01) {
            this.sortDirection = random() > 0.5 ? 1 : -1;
            this.startSort();
            return true;
        }
        
        return false;
    }

    display() {
        for (let pixel of this.pixels) {
            pixel.display();
        }
        
        // Draw partition boundary
        push();
        stroke(40);
        strokeWeight(1);
        line(0, this.startY, width, this.startY);
        pop();
    }
}

function setup() {
    createCanvas(windowWidth, windowHeight);
    
    // Calculate grid
    cols = Math.floor(width / pixelSize);
    rows = Math.floor(height / pixelSize);
    
    // Create partitions
    let partitionCount = random(5, 15);
    let partitionHeight = Math.floor(rows / partitionCount);
    
    for (let p = 0; p < partitionCount; p++) {
        let startY = p * partitionHeight * pixelSize;
        let height = partitionHeight * pixelSize;
        partitions.push(new Partition(startY, height));
    }
    
    // Create pixels and assign to partitions
    for (let y = 0; y < rows; y++) {
        let partitionIndex = Math.floor(y / partitionHeight);
        if (partitionIndex >= partitions.length) partitionIndex = partitions.length - 1;
        
        for (let x = 0; x < cols; x++) {
            // Create various patterns of brightness
            let brightness;
            let pattern = noise(x * 0.01, y * 0.01);
            
            if (pattern < 0.3) {
                brightness = random(0, 85);
            } else if (pattern < 0.6) {
                brightness = random(85, 170);
            } else {
                brightness = random(170, 255);
            }
            
            // Add some structure
            brightness += sin(x * 0.1) * 20 + cos(y * 0.1) * 20;
            brightness = constrain(brightness, 0, 255);
            
            let pixel = new Pixel(x * pixelSize, y * pixelSize, brightness);
            partitions[partitionIndex].addPixel(pixel);
        }
    }
    
    // Start initial sorts
    for (let i = 0; i < 3 && i < partitions.length; i++) {
        let randomPartition = random(partitions);
        randomPartition.startSort();
    }
}

function draw() {
    background(0);
    
    // Update and display all partitions
    activeSorts = [];
    for (let partition of partitions) {
        if (partition.update()) {
            activeSorts.push(partition);
        }
        partition.display();
    }
    
    // Randomly start new sorts
    if (random() < 0.02 && activeSorts.length < 5) {
        let unsortedPartitions = partitions.filter(p => !p.sorting && !p.isSorted());
        if (unsortedPartitions.length > 0) {
            random(unsortedPartitions).startSort();
        } else {
            // If all are sorted, pick a random one to shuffle
            random(partitions).startSort();
        }
    }
    
    // Update stats
    updateStats();
}

function updateStats() {
    document.getElementById('partition-count').textContent = partitions.length;
    document.getElementById('active-sorts').textContent = activeSorts.length;
    document.getElementById('fps').textContent = Math.round(frameRate());
}

function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
    
    // Recreate the visualization with new dimensions
    pixels = [];
    partitions = [];
    activeSorts = [];
    setup();
}

// Click to trigger sort in nearest partition
function mousePressed() {
    let partitionIndex = Math.floor(mouseY / (height / partitions.length));
    if (partitionIndex >= 0 && partitionIndex < partitions.length) {
        partitions[partitionIndex].startSort();
    }
}
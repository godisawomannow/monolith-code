const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const status = document.getElementById('status');

// Configuration
const pixelSize = 8;
const cols = Math.min(80, Math.floor(window.innerWidth * 0.85 / pixelSize));
const rows = Math.min(60, Math.floor(window.innerHeight * 0.75 / pixelSize));

canvas.width = cols * pixelSize;
canvas.height = rows * pixelSize;

// State
let pixels = [];
let targetPixels = [];
const totalPixels = cols * rows;
let sorting = true;
let sortProgress = 0;
let hueShift = 0;
let time = 0;

// Radix sort buckets - 256 buckets for 8-bit precision
const BUCKET_COUNT = 256;

// Convert HSL to RGB
function hslToRgb(h, s, l) {
    h = ((h % 360) + 360) % 360;
    s /= 100;
    l /= 100;
    const k = n => (n + h / 30) % 12;
    const a = s * Math.min(l, 1 - l);
    const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    return {
        r: Math.round(255 * f(0)),
        g: Math.round(255 * f(8)),
        b: Math.round(255 * f(4))
    };
}

// Get hue from RGB (0-255 range for radix sort)
function getHue(color) {
    const r = color.r / 255;
    const g = color.g / 255;
    const b = color.b / 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    
    if (max === min) return 0;
    
    let h = 0;
    const d = max - min;
    switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)); break;
        case g: h = ((b - r) / d + 2); break;
        case b: h = ((r - g) / d + 4); break;
    }
    return Math.floor((h / 6) * 255);
}

// Lightning-fast radix sort - O(n) complexity
function radixSortPixels(arr) {
    const buckets = Array.from({ length: BUCKET_COUNT }, () => []);
    
    // Single pass distribution
    for (let i = 0; i < arr.length; i++) {
        const hue = getHue(arr[i]);
        buckets[hue].push(arr[i]);
    }
    
    // Collect from buckets into new array
    const sorted = [];
    for (let b = 0; b < BUCKET_COUNT; b++) {
        for (let j = 0; j < buckets[b].length; j++) {
            sorted.push(buckets[b][j]);
        }
    }
    
    return sorted;
}

// Create deep copy of pixel
function clonePixel(p) {
    return {
        r: p.r,
        g: p.g,
        b: p.b,
        originalHue: p.originalHue,
        sat: p.sat,
        light: p.light
    };
}

// Initialize with random vibrant colors
function initPixels() {
    pixels = [];
    for (let i = 0; i < totalPixels; i++) {
        const hue = Math.random() * 360;
        const sat = 70 + Math.random() * 30;
        const light = 50 + Math.random() * 20;
        const color = hslToRgb(hue, sat, light);
        color.originalHue = hue;
        color.sat = sat;
        color.light = light;
        pixels.push(color);
    }
    
    // Create deep copies for sorting
    const pixelsCopy = pixels.map(clonePixel);
    
    // Pre-compute sorted array using radix sort (instant!)
    const sortedByHue = radixSortPixels(pixelsCopy);
    
    // Create perfect gradient mapping - assign sorted colors to positions
    targetPixels = new Array(totalPixels);
    for (let i = 0; i < totalPixels; i++) {
        const x = i % cols;
        const y = Math.floor(i / cols);
        // Map position to sorted index for diagonal gradient
        const gradientPos = (x / cols + y / rows) / 2;
        const sortedIdx = Math.floor(gradientPos * (totalPixels - 1));
        targetPixels[i] = clonePixel(sortedByHue[sortedIdx]);
        // Update originalHue for animation based on final position
        targetPixels[i].originalHue = gradientPos * 360;
    }
    
    sortProgress = 0;
    sorting = true;
}

// Wave-based sorting reveal - sorts in diagonal waves from corner
function getSortOrder(index) {
    const x = index % cols;
    const y = Math.floor(index / cols);
    // Diagonal wave from top-left
    return x + y + Math.sin(x * 0.3) * 2 + Math.sin(y * 0.3) * 2;
}

// Pre-compute sort reveal order
let revealOrder = [];
function computeRevealOrder() {
    revealOrder = [];
    for (let i = 0; i < totalPixels; i++) {
        revealOrder.push({ index: i, order: getSortOrder(i) });
    }
    revealOrder.sort((a, b) => a.order - b.order);
}

// Draw with color shift animation
function draw() {
    const imageData = ctx.createImageData(canvas.width, canvas.height);
    const data = imageData.data;
    
    for (let i = 0; i < pixels.length; i++) {
        const x = i % cols;
        const y = Math.floor(i / cols);
        const p = pixels[i];
        
        // Apply animated hue shift after sorting
        let r = p.r, g = p.g, b = p.b;
        
        if (!sorting && p.originalHue !== undefined) {
            // Create flowing color wave animation
            const waveX = Math.sin(time * 0.02 + x * 0.1) * 15;
            const waveY = Math.cos(time * 0.015 + y * 0.08) * 10;
            const breathe = Math.sin(time * 0.01) * 5;
            const shiftedHue = p.originalHue + hueShift + waveX + waveY + breathe;
            
            // Subtle saturation pulse
            const satPulse = Math.min(100, Math.max(50, p.sat + Math.sin(time * 0.025 + i * 0.001) * 8));
            
            const shifted = hslToRgb(shiftedHue, satPulse, p.light);
            r = shifted.r;
            g = shifted.g;
            b = shifted.b;
        }
        
        // Fill pixel block
        for (let py = 0; py < pixelSize - 1; py++) {
            for (let px = 0; px < pixelSize - 1; px++) {
                const idx = ((y * pixelSize + py) * canvas.width + (x * pixelSize + px)) * 4;
                data[idx] = r;
                data[idx + 1] = g;
                data[idx + 2] = b;
                data[idx + 3] = 255;
            }
        }
    }
    
    ctx.putImageData(imageData, 0, 0);
}

// Blazing fast sort animation - reveals 500+ pixels per frame
function sortStep() {
    if (!sorting) return;
    
    // Process 500 pixels per frame (~100x faster than typical single-swap sorting)
    const pixelsPerFrame = Math.max(500, Math.ceil(totalPixels / 10));
    
    for (let i = 0; i < pixelsPerFrame && sortProgress < totalPixels; i++) {
        const targetIdx = revealOrder[sortProgress].index;
        pixels[targetIdx] = targetPixels[targetIdx];
        sortProgress++;
    }
    
    const progress = Math.floor((sortProgress / totalPixels) * 100);
    status.textContent = `Sorting... ${progress}%`;
    
    if (sortProgress >= totalPixels) {
        sorting = false;
        status.textContent = '✨ Living Gradient';
    }
}

// Animation loop
function animate() {
    time++;
    
    if (sorting) {
        sortStep();
    } else {
        // Continuous hue shift for living effect
        hueShift += 0.3;
    }
    
    draw();
    requestAnimationFrame(animate);
}

// Initialize
computeRevealOrder();
initPixels();
draw();
requestAnimationFrame(animate);

// Click to restart
canvas.addEventListener('click', () => {
    sorting = true;
    hueShift = 0;
    time = 0;
    initPixels();
});
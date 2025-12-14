const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const status = document.getElementById('status');

// Configuration
const pixelSize = 8;
const cols = Math.min(80, Math.floor(window.innerWidth * 0.85 / pixelSize));
const rows = Math.min(60, Math.floor(window.innerHeight * 0.75 / pixelSize));

canvas.width = cols * pixelSize;
canvas.height = rows * pixelSize;

// Pixel array
let pixels = [];
let totalPixels = cols * rows;
let sorting = true;
let sortedPixels = [];
let animationStep = 0;
let animationSpeed = Math.ceil(totalPixels / 60); // Complete in ~60 frames

// Convert HSL to RGB
function hslToRgb(h, s, l) {
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

// Get sort value (hue for rainbow gradient)
function getSortValue(color) {
    const r = color.r / 255;
    const g = color.g / 255;
    const b = color.b / 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    
    let h = 0;
    if (max !== min) {
        const d = max - min;
        switch (max) {
            case r: h = ((g - b) / d + (g < b ? 6 : 0)); break;
            case g: h = ((b - r) / d + 2); break;
            case b: h = ((r - g) / d + 4); break;
        }
        h /= 6;
    }
    
    // Add luminance as secondary sort key for stable sorting
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    return h + lum * 0.001;
}

// Initialize with random vibrant colors
function initPixels() {
    pixels = [];
    for (let i = 0; i < totalPixels; i++) {
        const hue = Math.random() * 360;
        const sat = 65 + Math.random() * 35;
        const light = 45 + Math.random() * 25;
        const color = hslToRgb(hue, sat, light);
        color.sortValue = getSortValue(color);
        pixels.push(color);
    }
    
    // Pre-compute the final sorted array using native sort (instant, perfect)
    sortedPixels = [...pixels].sort((a, b) => a.sortValue - b.sortValue);
    
    animationStep = 0;
    sorting = true;
}

// Draw all pixels
function draw() {
    for (let i = 0; i < pixels.length; i++) {
        const x = i % cols;
        const y = Math.floor(i / cols);
        const p = pixels[i];
        
        ctx.fillStyle = `rgb(${p.r},${p.g},${p.b})`;
        ctx.fillRect(
            x * pixelSize,
            y * pixelSize,
            pixelSize - 1,
            pixelSize - 1
        );
    }
}

// Animate sorting by progressively revealing sorted positions
function sortStep() {
    if (!sorting) return;
    
    // Process many pixels per frame (10x faster)
    const pixelsThisFrame = animationSpeed * 10;
    
    for (let i = 0; i < pixelsThisFrame && animationStep < totalPixels; i++) {
        // Place the correct sorted pixel at this position
        pixels[animationStep] = sortedPixels[animationStep];
        animationStep++;
    }
    
    // Update progress
    const progress = Math.floor((animationStep / totalPixels) * 100);
    status.textContent = `Sorting... ${progress}%`;
    
    if (animationStep >= totalPixels) {
        sorting = false;
        // Ensure perfect final result
        pixels = [...sortedPixels];
        status.textContent = '✨ Perfectly Sorted!';
    }
}

// Animation loop
function animate() {
    sortStep();
    draw();
    
    if (sorting) {
        requestAnimationFrame(animate);
    } else {
        draw(); // Final draw
    }
}

// Start
initPixels();
draw();
requestAnimationFrame(animate);

// Click to restart
canvas.addEventListener('click', () => {
    sorting = true;
    initPixels();
    animate();
});
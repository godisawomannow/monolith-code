const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const status = document.getElementById('status');

// Configuration - smaller grid for smoother sorting
const pixelSize = 8;
const cols = Math.min(80, Math.floor(window.innerWidth * 0.85 / pixelSize));
const rows = Math.min(60, Math.floor(window.innerHeight * 0.75 / pixelSize));

canvas.width = cols * pixelSize;
canvas.height = rows * pixelSize;

// Pixel array - flat array of colors
let pixels = [];
let totalPixels = cols * rows;
let currentIndex = 0;
let passComplete = false;
let sorting = true;
let swapsThisPass = 0;

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

// Get sort value (hue + luminance for nice gradient)
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
    
    return h;
}

// Initialize with random vibrant colors
function initPixels() {
    pixels = [];
    for (let i = 0; i < totalPixels; i++) {
        const hue = Math.random() * 360;
        const sat = 65 + Math.random() * 35;
        const light = 45 + Math.random() * 25;
        pixels.push(hslToRgb(hue, sat, light));
    }
    currentIndex = 0;
    passComplete = false;
    swapsThisPass = 0;
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

// Highlight current comparison
function highlightCurrent(idx) {
    const x = idx % cols;
    const y = Math.floor(idx / cols);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.strokeRect(
        x * pixelSize - 1,
        y * pixelSize - 1,
        pixelSize + 1,
        pixelSize + 1
    );
}

// Sort step - bubble sort with visualization
function sortStep() {
    if (!sorting) return;
    
    // Process multiple comparisons per frame for speed
    const comparisonsPerFrame = Math.max(10, Math.floor(totalPixels / 100));
    
    for (let c = 0; c < comparisonsPerFrame; c++) {
        if (currentIndex >= totalPixels - 1) {
            // End of pass
            if (swapsThisPass === 0) {
                // No swaps means we're done
                sorting = false;
                status.textContent = '✨ Sorted!';
                return;
            }
            // Start new pass
            currentIndex = 0;
            swapsThisPass = 0;
            continue;
        }
        
        const val1 = getSortValue(pixels[currentIndex]);
        const val2 = getSortValue(pixels[currentIndex + 1]);
        
        if (val1 > val2) {
            // Swap
            const temp = pixels[currentIndex];
            pixels[currentIndex] = pixels[currentIndex + 1];
            pixels[currentIndex + 1] = temp;
            swapsThisPass++;
        }
        
        currentIndex++;
    }
    
    // Update progress display
    const progress = Math.floor((1 - swapsThisPass / totalPixels) * 100);
    status.textContent = `Sorting... Pass progress: ${Math.floor(currentIndex / totalPixels * 100)}%`;
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
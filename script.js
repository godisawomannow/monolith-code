// Canvas setup
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

// Pixel grid configuration
const pixelSize = 8;
const gridWidth = 80;
const gridHeight = 60;

// Canvas dimensions
canvas.width = gridWidth * pixelSize;
canvas.height = gridHeight * pixelSize;

// Color array
let pixels = [];
let originalPixels = [];

// Sorting state
let sorting = false;
let sortingGenerator = null;
let comparisons = 0;
let swaps = 0;
let speed = 50;
let animationId = null;

// Initialize pixels with random colors
function initializePixels() {
    pixels = [];
    for (let i = 0; i < gridWidth * gridHeight; i++) {
        // Generate vibrant random colors
        const hue = Math.random() * 360;
        const saturation = 50 + Math.random() * 50; // 50-100%
        const lightness = 30 + Math.random() * 40; // 30-70%
        pixels.push(hslToRgb(hue, saturation, lightness));
    }
    originalPixels = [...pixels];
}

// Convert HSL to RGB
function hslToRgb(h, s, l) {
    h /= 360;
    s /= 100;
    l /= 100;
    
    let r, g, b;
    
    if (s === 0) {
        r = g = b = l;
    } else {
        const hue2rgb = (p, q, t) => {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1/6) return p + (q - p) * 6 * t;
            if (t < 1/2) return q;
            if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
            return p;
        };
        
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        r = hue2rgb(p, q, h + 1/3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1/3);
    }
    
    return {
        r: Math.round(r * 255),
        g: Math.round(g * 255),
        b: Math.round(b * 255)
    };
}

// Get color value based on sorting method
function getColorValue(color, method) {
    switch (method) {
        case 'hue':
            return rgbToHsl(color.r, color.g, color.b).h;
        case 'brightness':
            return (color.r + color.g + color.b) / 3;
        case 'saturation':
            return rgbToHsl(color.r, color.g, color.b).s;
        case 'red':
            return color.r;
        case 'green':
            return color.g;
        case 'blue':
            return color.b;
        default:
            return 0;
    }
}

// Convert RGB to HSL
function rgbToHsl(r, g, b) {
    r /= 255;
    g /= 255;
    b /= 255;
    
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;
    
    if (max === min) {
        h = s = 0;
    } else {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        
        switch (max) {
            case r:
                h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
                break;
            case g:
                h = ((b - r) / d + 2) / 6;
                break;
            case b:
                h = ((r - g) / d + 4) / 6;
                break;
        }
    }
    
    return {
        h: h * 360,
        s: s * 100,
        l: l * 100
    };
}

// Draw the pixel grid
function draw() {
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    for (let i = 0; i < pixels.length; i++) {
        const x = (i % gridWidth) * pixelSize;
        const y = Math.floor(i / gridWidth) * pixelSize;
        const color = pixels[i];
        
        ctx.fillStyle = `rgb(${color.r}, ${color.g}, ${color.b})`;
        ctx.fillRect(x, y, pixelSize - 1, pixelSize - 1);
    }
}

// Bubble sort generator with visualization
function* bubbleSort(method) {
    const n = pixels.length;
    
    for (let i = 0; i < n - 1; i++) {
        for (let j = 0; j < n - i - 1; j++) {
            comparisons++;
            
            const val1 = getColorValue(pixels[j], method);
            const val2 = getColorValue(pixels[j + 1], method);
            
            if (val1 > val2) {
                // Swap
                [pixels[j], pixels[j + 1]] = [pixels[j + 1], pixels[j]];
                swaps++;
                yield { swapped: true, index1: j, index2: j + 1 };
            }
        }
        
        // Update progress
        const progress = Math.floor((i / (n - 1)) * 100);
        document.getElementById('status').textContent = `Sorting... ${progress}%`;
    }
    
    document.getElementById('status').textContent = 'Sorted!';
}

// Quick sort generator with visualization
function* quickSort(method, start = 0, end = pixels.length - 1) {
    if (start >= end) return;
    
    const pivotIndex = yield* partition(method, start, end);
    yield* quickSort(method, start, pivotIndex - 1);
    yield* quickSort(method, pivotIndex + 1, end);
    
    // Update status when complete
    if (start === 0 && end === pixels.length - 1) {
        document.getElementById('status').textContent = 'Sorted!';
    }
}

function* partition(method, start, end) {
    const pivotValue = getColorValue(pixels[end], method);
    let i = start - 1;
    
    for (let j = start; j < end; j++) {
        comparisons++;
        if (getColorValue(pixels[j], method) < pivotValue) {
            i++;
            if (i !== j) {
                [pixels[i], pixels[j]] = [pixels[j], pixels[i]];
                swaps++;
                yield { swapped: true, index1: i, index2: j };
            }
        }
    }
    
    i++;
    if (i !== end) {
        [pixels[i], pixels[end]] = [pixels[end], pixels[i]];
        swaps++;
        yield { swapped: true, index1: i, index2: end };
    }
    
    return i;
}

// Animation loop for sorting
async function animateSort() {
    const animate = async () => {
        if (!sorting || !sortingGenerator) return;
        
        const result = sortingGenerator.next();
        
        if (result.done) {
            stopSorting();
            return;
        }
        
        draw();
        updateInfo();
        
        // Speed control
        const delay = 101 - speed;
        animationId = setTimeout(() => {
            animateSort();
        }, delay);
    };
    
    await animate();
}

// Stop sorting
function stopSorting() {
    sorting = false;
    sortingGenerator = null;
    if (animationId) {
        clearTimeout(animationId);
        animationId = null;
    }
    document.getElementById('sort-btn').textContent = 'Start Sorting';
    document.getElementById('sort-btn').classList.remove('active');
    document.getElementById('shuffle-btn').disabled = false;
    document.getElementById('reset-btn').disabled = false;
    document.getElementById('algorithm').disabled = false;
    document.getElementById('sort-method').disabled = false;
}

// Update info display
function updateInfo() {
    document.getElementById('swaps').textContent = swaps;
    document.getElementById('comparisons').textContent = comparisons;
}

// Event listeners
document.getElementById('sort-btn').addEventListener('click', () => {
    if (sorting) {
        stopSorting();
        document.getElementById('status').textContent = 'Paused';
    } else {
        sorting = true;
        comparisons = 0;
        swaps = 0;
        
        const method = document.getElementById('sort-method').value;
        const algorithm = document.getElementById('algorithm').value;
        
        if (algorithm === 'bubble') {
            sortingGenerator = bubbleSort(method);
        } else {
            sortingGenerator = quickSort(method);
        }
        
        document.getElementById('sort-btn').textContent = 'Pause Sorting';
        document.getElementById('sort-btn').classList.add('active');
        document.getElementById('shuffle-btn').disabled = true;
        document.getElementById('reset-btn').disabled = true;
        document.getElementById('algorithm').disabled = true;
        document.getElementById('sort-method').disabled = true;
        document.getElementById('status').textContent = 'Sorting...';
        
        animateSort();
    }
});

document.getElementById('shuffle-btn').addEventListener('click', () => {
    stopSorting();
    
    // Fisher-Yates shuffle
    for (let i = pixels.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pixels[i], pixels[j]] = [pixels[j], pixels[i]];
    }
    
    comparisons = 0;
    swaps = 0;
    document.getElementById('status').textContent = 'Shuffled';
    updateInfo();
    draw();
});

document.getElementById('reset-btn').addEventListener('click', () => {
    stopSorting();
    initializePixels();
    comparisons = 0;
    swaps = 0;
    document.getElementById('status').textContent = 'New colors generated';
    updateInfo();
    draw();
});

document.getElementById('speed-slider').addEventListener('input', (e) => {
    speed = parseInt(e.target.value);
});

// Initialize and draw
initializePixels();
draw();
updateInfo();

// Reload with new colors on page refresh
window.addEventListener('load', () => {
    initializePixels();
    draw();
});
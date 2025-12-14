const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const output = document.getElementById('output');
const command = document.getElementById('command');

// Configuration
const pixelSize = 6;
const cols = 100;
const rows = 50;

canvas.width = cols * pixelSize;
canvas.height = rows * pixelSize;

// State
let pixels = [];
let targetPixels = [];
const totalPixels = cols * rows;
let sorting = false;
let sortProgress = 0;
let hueShift = 0;
let time = 0;
let startTime = 0;
let sortTime = 0;
let terminalReady = false;

const BUCKET_COUNT = 256;

// Terminal typing
const terminalLines = [
    { text: '# PIXELSORT.IO — Enterprise Pixel Sorting', class: 'comment', delay: 0 },
    { text: '', delay: 200 },
    { text: '> Initializing radix sort engine...', class: 'info', delay: 400 },
    { text: '> Loading 5,000 pixel array...', class: 'info', delay: 800 },
    { text: '✓ Engine ready', class: 'success', delay: 1200 },
    { text: '', delay: 1400 },
    { text: '# Why choose PixelSort Pro?', class: 'comment', delay: 1600 },
    { text: '  → O(n) linear time complexity', class: 'highlight', delay: 1900 },
    { text: '  → 100x faster than bubble sort', class: 'highlight', delay: 2200 },
    { text: '  → Zero dependencies, pure JS', class: 'highlight', delay: 2500 },
    { text: '', delay: 2700 },
    { text: '> Running live demo...', class: 'warning', delay: 2900 },
];

let lineIndex = 0;

function typeTerminal() {
    if (lineIndex >= terminalLines.length) {
        terminalReady = true;
        setTimeout(startSort, 500);
        return;
    }
    
    const line = terminalLines[lineIndex];
    const prevDelay = lineIndex > 0 ? terminalLines[lineIndex - 1].delay : 0;
    const delayDiff = line.delay - prevDelay;
    
    setTimeout(() => {
        const div = document.createElement('div');
        div.className = `line ${line.class || ''}`;
        div.textContent = line.text || '\u00A0';
        output.appendChild(div);
        lineIndex++;
        typeTerminal();
    }, delayDiff);
}

// CLI command typing
const commandText = 'pixelsort --algorithm=radix --hue --animate';
let cmdIndex = 0;

function typeCommand() {
    if (cmdIndex < commandText.length) {
        command.textContent += commandText[cmdIndex];
        cmdIndex++;
        setTimeout(typeCommand, 30 + Math.random() * 50);
    }
}

function resetCommand() {
    command.textContent = '';
    cmdIndex = 0;
}

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

function radixSortPixels(arr) {
    const buckets = Array.from({ length: BUCKET_COUNT }, () => []);
    for (let i = 0; i < arr.length; i++) {
        const hue = getHue(arr[i]);
        buckets[hue].push(arr[i]);
    }
    const sorted = [];
    for (let b = 0; b < BUCKET_COUNT; b++) {
        for (let j = 0; j < buckets[b].length; j++) {
            sorted.push(buckets[b][j]);
        }
    }
    return sorted;
}

function clonePixel(p) {
    return { r: p.r, g: p.g, b: p.b, originalHue: p.originalHue, sat: p.sat, light: p.light };
}

function initPixels() {
    pixels = [];
    for (let i = 0; i < totalPixels; i++) {
        const hue = Math.random() * 360;
        const sat = 70 + Math.random() * 30;
        const light = 45 + Math.random() * 25;
        const color = hslToRgb(hue, sat, light);
        color.originalHue = hue;
        color.sat = sat;
        color.light = light;
        pixels.push(color);
    }
    
    const pixelsCopy = pixels.map(clonePixel);
    const sortedByHue = radixSortPixels(pixelsCopy);
    
    targetPixels = new Array(totalPixels);
    for (let i = 0; i < totalPixels; i++) {
        const x = i % cols;
        const y = Math.floor(i / cols);
        const gradientPos = (x / cols + y / rows) / 2;
        const sortedIdx = Math.floor(gradientPos * (totalPixels - 1));
        targetPixels[i] = clonePixel(sortedByHue[sortedIdx]);
        targetPixels[i].originalHue = gradientPos * 360;
    }
    
    sortProgress = 0;
}

let revealOrder = [];

function computeRevealOrder() {
    revealOrder = [];
    for (let i = 0; i < totalPixels; i++) {
        const x = i % cols;
        const y = Math.floor(i / cols);
        revealOrder.push({ index: i, order: x + y + Math.sin(x * 0.3) * 2 });
    }
    revealOrder.sort((a, b) => a.order - b.order);
}

function draw() {
    const imageData = ctx.createImageData(canvas.width, canvas.height);
    const data = imageData.data;
    
    for (let i = 0; i < pixels.length; i++) {
        const x = i % cols;
        const y = Math.floor(i / cols);
        const p = pixels[i];
        
        let r = p.r, g = p.g, b = p.b;
        
        if (!sorting && p.originalHue !== undefined) {
            const waveX = Math.sin(time * 0.02 + x * 0.1) * 15;
            const waveY = Math.cos(time * 0.015 + y * 0.08) * 10;
            const shiftedHue = p.originalHue + hueShift + waveX + waveY;
            const shifted = hslToRgb(shiftedHue, p.sat, p.light);
            r = shifted.r;
            g = shifted.g;
            b = shifted.b;
        }
        
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

function sortStep() {
    if (!sorting) return;
    
    const pixelsPerFrame = 400;
    
    for (let i = 0; i < pixelsPerFrame && sortProgress < totalPixels; i++) {
        const targetIdx = revealOrder[sortProgress].index;
        pixels[targetIdx] = targetPixels[targetIdx];
        sortProgress++;
    }
    
    if (sortProgress >= totalPixels) {
        sorting = false;
        sortTime = performance.now() - startTime;
        document.getElementById('stat-time').textContent = Math.round(sortTime) + 'ms';
        document.getElementById('stat-speed').textContent = Math.round(totalPixels / sortTime * 1000);
    }
}

function startSort() {
    sorting = true;
    startTime = performance.now();
    resetCommand();
    setTimeout(typeCommand, 300);
}

function restartDemo() {
    if (!terminalReady) return;
    
    sorting = true;
    hueShift = 0;
    time = 0;
    startTime = performance.now();
    initPixels();
    resetCommand();
    setTimeout(typeCommand, 300);
}

function animate() {
    time++;
    
    if (sorting) {
        sortStep();
    } else {
        hueShift += 0.3;
    }
    
    draw();
    requestAnimationFrame(animate);
}

// Event listeners
canvas.addEventListener('click', restartDemo);

document.getElementById('cta-button').addEventListener('click', (e) => {
    // Copy command to clipboard
    const installCmd = 'npm install pixelsort-pro';
    navigator.clipboard.writeText(installCmd).then(() => {
        const btn = e.target;
        const originalText = btn.textContent;
        btn.textContent = '✓ Copied to clipboard!';
        setTimeout(() => {
            btn.textContent = originalText;
        }, 2000);
    }).catch(() => {
        // Fallback: restart demo if clipboard fails
        restartDemo();
    });
});

// Initialize
computeRevealOrder();
initPixels();
draw();
typeTerminal();
requestAnimationFrame(animate);
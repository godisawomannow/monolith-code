const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const output = document.getElementById('output');
const command = document.getElementById('command');
const glitchOverlay = document.getElementById('glitch-overlay');

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
let corrupting = false;
let corruptionProgress = 0;
let time = 0;
let cycles = 0;
let terminalReady = false;
let cxPattern = [];
let glitchIntensity = 0;

// Generate CX pattern positions
function generateCxPattern() {
    cxPattern = [];
    for (let i = 0; i < 140; i++) {
        cxPattern.push({
            x: Math.random() * cols,
            y: Math.random() * rows,
            phase: Math.random() * Math.PI * 2,
            speed: 0.5 + Math.random() * 2,
            size: 1 + Math.random() * 3
        });
    }
}

// Terminal typing
const terminalLines = [
    { text: '# ;cx;cx;cx — CORRUPTION DETECTED', class: 'corrupt', delay: 0 },
    { text: '', delay: 200 },
    { text: '> Buffer overflow in sector 0x3F...', class: 'warning', delay: 400 },
    { text: '> ;cx;cx;cx;cx;cx;cx;cx;cx;cx', class: 'corrupt', delay: 600 },
    { text: '✗ Memory integrity: COMPROMISED', class: 'info', delay: 900 },
    { text: '', delay: 1100 },
    { text: '# Pattern analysis:', class: 'comment', delay: 1300 },
    { text: '  → Repetition count: 140', class: 'highlight', delay: 1500 },
    { text: '  → Pattern: ;cx (semicolon-cx)', class: 'highlight', delay: 1800 },
    { text: '  → Entropy level: MAXIMUM', class: 'highlight', delay: 2100 },
    { text: '', delay: 2300 },
    { text: '> Initiating corruption cascade...', class: 'warning', delay: 2500 },
    { text: '> ;cx;cx;cx;cx;cx;cx;cx;cx;cx;cx;cx;cx', class: 'corrupt', delay: 2700 },
];

let lineIndex = 0;

function typeTerminal() {
    if (lineIndex >= terminalLines.length) {
        terminalReady = true;
        setTimeout(startCorruption, 500);
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

// CLI command typing - corrupted version
const commandText = ';cx;cx;cx;cx;cx;cx;cx;cx;cx;cx;cx;cx';
let cmdIndex = 0;

function typeCommand() {
    if (cmdIndex < commandText.length) {
        command.textContent += commandText[cmdIndex];
        cmdIndex++;
        setTimeout(typeCommand, 20 + Math.random() * 30);
    }
}

function resetCommand() {
    command.textContent = '';
    cmdIndex = 0;
}

// Color functions
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

function clonePixel(p) {
    return { r: p.r, g: p.g, b: p.b, originalHue: p.originalHue, sat: p.sat, light: p.light, corrupted: p.corrupted };
}

function initPixels() {
    pixels = [];
    for (let i = 0; i < totalPixels; i++) {
        const x = i % cols;
        const y = Math.floor(i / cols);
        
        // Create diagonal gradient with red tones
        const diag = (x + y) / (cols + rows);
        const hue = 0 + diag * 30; // Red to orange gradient
        const sat = 60 + Math.random() * 40;
        const light = 20 + diag * 30 + Math.random() * 15;
        
        const color = hslToRgb(hue, sat, light);
        color.originalHue = hue;
        color.sat = sat;
        color.light = light;
        color.corrupted = false;
        pixels.push(color);
    }
    
    // Create target corrupted state
    targetPixels = pixels.map((p, i) => {
        const x = i % cols;
        const y = Math.floor(i / cols);
        const cx = clonePixel(p);
        
        // Corruption creates cyan/magenta interference pattern
        const wave = Math.sin(x * 0.2) * Math.cos(y * 0.15);
        if (wave > 0.3) {
            cx.r = 0;
            cx.g = 255;
            cx.b = 255;
            cx.corrupted = true;
        } else if (wave < -0.3) {
            cx.r = 255;
            cx.g = 0;
            cx.b = 255;
            cx.corrupted = true;
        }
        return cx;
    });
    
    corruptionProgress = 0;
}

let revealOrder = [];

function computeRevealOrder() {
    revealOrder = [];
    for (let i = 0; i < totalPixels; i++) {
        const x = i % cols;
        const y = Math.floor(i / cols);
        // Diagonal wave corruption spread
        revealOrder.push({ 
            index: i, 
            order: (x + y) + Math.sin(x * 0.3 + y * 0.2) * 5 + Math.random() * 3
        });
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
        
        // Apply CX pattern interference
        for (const cx of cxPattern) {
            const dx = x - cx.x;
            const dy = y - cx.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const wave = Math.sin(dist * 0.5 - time * 0.05 * cx.speed + cx.phase);
            
            if (dist < cx.size * 3 && wave > 0.7) {
                // Cyan/magenta glitch
                const intensity = (1 - dist / (cx.size * 3)) * glitchIntensity;
                if (Math.random() > 0.5) {
                    r = Math.min(255, r + 100 * intensity);
                    g = Math.max(0, g - 50 * intensity);
                    b = Math.min(255, b + 150 * intensity);
                } else {
                    r = Math.max(0, r - 50 * intensity);
                    g = Math.min(255, g + 150 * intensity);
                    b = Math.min(255, b + 150 * intensity);
                }
            }
        }
        
        // Scanline effect
        if (y % 3 === 0 && !corrupting) {
            r = Math.floor(r * 0.9);
            g = Math.floor(g * 0.9);
            b = Math.floor(b * 0.9);
        }
        
        // Horizontal glitch bands
        if (Math.random() < 0.002 * glitchIntensity) {
            const shift = Math.floor(Math.random() * 10 - 5);
            // This would shift the row, simplified here as color inversion
            r = 255 - r;
            g = 255 - g;
            b = 255 - b;
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

function corruptStep() {
    if (!corrupting) return;
    
    const pixelsPerFrame = 300;
    
    for (let i = 0; i < pixelsPerFrame && corruptionProgress < totalPixels; i++) {
        const targetIdx = revealOrder[corruptionProgress].index;
        pixels[targetIdx] = targetPixels[targetIdx];
        corruptionProgress++;
    }
    
    const percent = Math.round((corruptionProgress / totalPixels) * 100);
    document.getElementById('stat-corruption').textContent = percent + '%';
    
    glitchIntensity = percent / 100;
    
    if (corruptionProgress >= totalPixels) {
        corrupting = false;
        cycles++;
        document.getElementById('stat-cycles').textContent = cycles;
        
        // After corruption, start ambient glitch mode
        setTimeout(() => {
            glitchIntensity = 0.3;
        }, 1000);
    }
}

function startCorruption() {
    corrupting = true;
    glitchIntensity = 0.1;
    resetCommand();
    setTimeout(typeCommand, 300);
}

function restartDemo() {
    if (!terminalReady) return;
    
    corrupting = true;
    time = 0;
    glitchIntensity = 0.1;
    initPixels();
    computeRevealOrder();
    generateCxPattern();
    resetCommand();
    setTimeout(typeCommand, 300);
}

function updateGlitchOverlay() {
    if (Math.random() < 0.02 * glitchIntensity) {
        const height = Math.random() * 20 + 5;
        const top = Math.random() * 100;
        const hue = Math.random() > 0.5 ? 180 : 300; // Cyan or magenta
        glitchOverlay.style.background = `linear-gradient(transparent ${top}%, hsla(${hue}, 100%, 50%, 0.1) ${top}%, hsla(${hue}, 100%, 50%, 0.1) ${top + height}%, transparent ${top + height}%)`;
        
        setTimeout(() => {
            glitchOverlay.style.background = 'transparent';
        }, 50);
    }
}

function updateEntropy() {
    const symbols = ['∞', '∿', '≋', '≈', '∾', '⌇', '⌁', '⍾'];
    if (Math.random() < 0.1) {
        document.getElementById('stat-entropy').textContent = symbols[Math.floor(Math.random() * symbols.length)];
    }
}

function animate() {
    time++;
    
    // Move CX patterns
    for (const cx of cxPattern) {
        cx.x += Math.sin(time * 0.01 + cx.phase) * 0.1;
        cx.y += Math.cos(time * 0.01 + cx.phase) * 0.1;
        
        // Wrap around
        if (cx.x < 0) cx.x = cols;
        if (cx.x > cols) cx.x = 0;
        if (cx.y < 0) cx.y = rows;
        if (cx.y > rows) cx.y = 0;
    }
    
    if (corrupting) {
        corruptStep();
    }
    
    updateGlitchOverlay();
    updateEntropy();
    draw();
    requestAnimationFrame(animate);
}

// Event listeners
canvas.addEventListener('click', restartDemo);

document.getElementById('cta-button').addEventListener('click', () => {
    restartDemo();
});

// Initialize
generateCxPattern();
computeRevealOrder();
initPixels();
draw();
typeTerminal();
requestAnimationFrame(animate);
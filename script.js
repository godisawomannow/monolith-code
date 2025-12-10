let pixelSize = 16;
let canvasWidth, canvasHeight;
let cols, rows;
let pixels = [];
let currentTool = 'pencil';
let currentColor = '#00ff00';
let showGrid = true;
let isDrawing = false;
let lastPixel = null;

// Color preset palette
const colorPresets = [
    '#000000', '#FFFFFF', '#FF0000', '#00FF00', '#0000FF',
    '#FFFF00', '#FF00FF', '#00FFFF', '#FF8800', '#8800FF',
    '#888888', '#444444', '#FFAAAA', '#AAFFAA', '#AAAAFF'
];

function setup() {
    // Create canvas that fills the window but leaves room for toolbar
    canvasWidth = windowWidth;
    canvasHeight = windowHeight;
    createCanvas(canvasWidth, canvasHeight);
    
    // Initialize grid
    initializeGrid();
    
    // Setup UI
    setupUI();
    
    // Set initial canvas cursor
    updateCanvasCursor();
}

function initializeGrid() {
    cols = Math.floor(canvasWidth / pixelSize);
    rows = Math.floor(canvasHeight / pixelSize);
    
    // Initialize pixel array
    pixels = [];
    for (let y = 0; y < rows; y++) {
        pixels[y] = [];
        for (let x = 0; x < cols; x++) {
            pixels[y][x] = null; // null = transparent
        }
    }
    
    updateInfo();
}

function setupUI() {
    // Tool buttons
    document.querySelectorAll('.tool').forEach(button => {
        button.addEventListener('click', (e) => {
            document.querySelectorAll('.tool').forEach(b => b.classList.remove('active'));
            button.classList.add('active');
            currentTool = button.dataset.tool;
            updateCanvasCursor();
            updateInfo();
        });
    });
    
    // Color picker
    document.getElementById('color-picker').addEventListener('input', (e) => {
        currentColor = e.target.value;
        updateInfo();
    });
    
    // Preset colors
    const presetContainer = document.querySelector('.preset-colors');
    colorPresets.forEach(color => {
        const colorDiv = document.createElement('div');
        colorDiv.className = 'color-preset';
        colorDiv.style.backgroundColor = color;
        colorDiv.addEventListener('click', () => {
            currentColor = color;
            document.getElementById('color-picker').value = color;
            updateInfo();
        });
        presetContainer.appendChild(colorDiv);
    });
    
    // Control buttons
    document.getElementById('clear-btn').addEventListener('click', clearCanvas);
    document.getElementById('grid-toggle').addEventListener('click', () => {
        showGrid = !showGrid;
        document.getElementById('grid-toggle').textContent = showGrid ? 'Grid' : 'No Grid';
    });
    document.getElementById('save-btn').addEventListener('click', saveArt);
    
    // Pixel size slider
    document.getElementById('pixel-size').addEventListener('input', (e) => {
        pixelSize = parseInt(e.target.value);
        document.getElementById('size-display').textContent = pixelSize;
        initializeGrid();
    });
}

function draw() {
    // Clear background
    background(26, 26, 26);
    
    // Draw pixels
    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
            if (pixels[y] && pixels[y][x]) {
                fill(pixels[y][x]);
                noStroke();
                rect(x * pixelSize, y * pixelSize, pixelSize, pixelSize);
            }
        }
    }
    
    // Draw grid
    if (showGrid) {
        stroke(50);
        strokeWeight(1);
        for (let x = 0; x <= cols; x++) {
            line(x * pixelSize, 0, x * pixelSize, rows * pixelSize);
        }
        for (let y = 0; y <= rows; y++) {
            line(0, y * pixelSize, cols * pixelSize, y * pixelSize);
        }
    }
    
    // Preview hover effect
    if (!mouseIsPressed) {
        let gridX = Math.floor(mouseX / pixelSize);
        let gridY = Math.floor(mouseY / pixelSize);
        if (gridX >= 0 && gridX < cols && gridY >= 0 && gridY < rows) {
            push();
            if (currentTool === 'pencil' || currentTool === 'fill') {
                fill(currentColor + '66'); // Semi-transparent preview
            } else if (currentTool === 'eraser') {
                fill(255, 255, 255, 40);
            }
            noStroke();
            rect(gridX * pixelSize, gridY * pixelSize, pixelSize, pixelSize);
            pop();
        }
    }
}

function mousePressed() {
    isDrawing = true;
    handleDrawing();
}

function mouseDragged() {
    if (isDrawing) {
        handleDrawing();
    }
}

function mouseReleased() {
    isDrawing = false;
    lastPixel = null;
}

function handleDrawing() {
    let gridX = Math.floor(mouseX / pixelSize);
    let gridY = Math.floor(mouseY / pixelSize);
    
    if (gridX < 0 || gridX >= cols || gridY < 0 || gridY >= rows) return;
    
    switch (currentTool) {
        case 'pencil':
            drawPixel(gridX, gridY, currentColor);
            break;
        case 'eraser':
            drawPixel(gridX, gridY, null);
            break;
        case 'fill':
            if (mouseIsPressed && !lastPixel) {
                floodFill(gridX, gridY, currentColor);
            }
            break;
        case 'eyedropper':
            if (pixels[gridY] && pixels[gridY][gridX]) {
                currentColor = pixels[gridY][gridX];
                document.getElementById('color-picker').value = currentColor;
                updateInfo();
            }
            break;
    }
    
    lastPixel = {x: gridX, y: gridY};
}

function drawPixel(x, y, color) {
    if (x >= 0 && x < cols && y >= 0 && y < rows) {
        if (!pixels[y]) pixels[y] = [];
        pixels[y][x] = color;
    }
}

function drawLine(x0, y0, x1, y1, color) {
    // Bresenham's line algorithm
    let dx = Math.abs(x1 - x0);
    let dy = Math.abs(y1 - y0);
    let sx = x0 < x1 ? 1 : -1;
    let sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;
    
    while (true) {
        drawPixel(x0, y0, color);
        
        if (x0 === x1 && y0 === y1) break;
        
        let e2 = 2 * err;
        if (e2 > -dy) {
            err -= dy;
            x0 += sx;
        }
        if (e2 < dx) {
            err += dx;
            y0 += sy;
        }
    }
}

function floodFill(x, y, fillColor) {
    if (x < 0 || x >= cols || y < 0 || y >= rows) return;
    
    const targetColor = pixels[y] && pixels[y][x] ? pixels[y][x] : null;
    if (targetColor === fillColor) return;
    
    const stack = [[x, y]];
    
    while (stack.length > 0) {
        const [cx, cy] = stack.pop();
        
        if (cx < 0 || cx >= cols || cy < 0 || cy >= rows) continue;
        
        const currentColor = pixels[cy] && pixels[cy][cx] ? pixels[cy][cx] : null;
        if (currentColor !== targetColor) continue;
        
        drawPixel(cx, cy, fillColor);
        
        stack.push([cx + 1, cy]);
        stack.push([cx - 1, cy]);
        stack.push([cx, cy + 1]);
        stack.push([cx, cy - 1]);
    }
}

function clearCanvas() {
    if (confirm('Clear the entire canvas?')) {
        initializeGrid();
    }
}

function saveArt() {
    // Create a graphics buffer for the art only
    let pg = createGraphics(cols * pixelSize, rows * pixelSize);
    pg.background(26, 26, 26);
    
    // Draw pixels to buffer
    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
            if (pixels[y] && pixels[y][x]) {
                pg.fill(pixels[y][x]);
                pg.noStroke();
                pg.rect(x * pixelSize, y * pixelSize, pixelSize, pixelSize);
            }
        }
    }
    
    // Save the image
    save(pg, 'pixel-art.png');
}

function updateInfo() {
    document.getElementById('current-tool').textContent = currentTool;
    document.getElementById('current-color').textContent = currentColor;
    document.getElementById('current-color').style.color = currentColor;
    document.getElementById('grid-size').textContent = `${cols}x${rows}`;
}

function updateCanvasCursor() {
    const canvas = document.querySelector('canvas');
    canvas.className = `canvas-cursor-${currentTool}`;
}

function windowResized() {
    canvasWidth = windowWidth;
    canvasHeight = windowHeight;
    resizeCanvas(canvasWidth, canvasHeight);
    initializeGrid();
}

// Keyboard shortcuts
function keyPressed() {
    switch(key) {
        case 'p':
        case 'P':
            document.querySelector('[data-tool="pencil"]').click();
            break;
        case 'e':
        case 'E':
            document.querySelector('[data-tool="eraser"]').click();
            break;
        case 'f':
        case 'F':
            document.querySelector('[data-tool="fill"]').click();
            break;
        case 'i':
        case 'I':
            document.querySelector('[data-tool="eyedropper"]').click();
            break;
        case 'g':
        case 'G':
            document.getElementById('grid-toggle').click();
            break;
        case 's':
        case 'S':
            if (keyIsDown(CONTROL)) {
                saveArt();
                return false;
            }
            break;
    }
}
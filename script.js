// Three.js scene setup
let scene, camera, renderer;
let globe, globeMaterial;
let raycaster, mouse;
let isRotating = false;
let isDrawing = false;
let lastMouse = { x: 0, y: 0 };

// Texture and drawing
let textureCanvas, textureCtx;
let texture;
const textureSize = 1024;
const pixelSize = 8;

// Tools and colors
let currentTool = 'pencil';
let currentColor = '#00ff00';
let showGrid = true;

// Color preset palette
const colorPresets = [
    '#000000', '#FFFFFF', '#FF0000', '#00FF00', '#0000FF',
    '#FFFF00', '#FF00FF', '#00FFFF', '#FF8800', '#8800FF'
];

// Initialize Three.js scene
function init() {
    // Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a0a);
    
    // Camera
    camera = new THREE.PerspectiveCamera(
        50,
        window.innerWidth / window.innerHeight,
        0.1,
        1000
    );
    camera.position.z = 3;
    
    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    document.body.appendChild(renderer.domElement);
    
    // Create texture canvas
    textureCanvas = document.createElement('canvas');
    textureCanvas.width = textureSize;
    textureCanvas.height = textureSize;
    textureCtx = textureCanvas.getContext('2d');
    
    // Initialize texture with dark background
    textureCtx.fillStyle = '#1a1a1a';
    textureCtx.fillRect(0, 0, textureSize, textureSize);
    
    // Create texture from canvas
    texture = new THREE.CanvasTexture(textureCanvas);
    texture.needsUpdate = true;
    
    // Create globe
    const geometry = new THREE.SphereGeometry(1, 64, 64);
    globeMaterial = new THREE.MeshPhongMaterial({
        map: texture,
        shininess: 10,
        specular: new THREE.Color(0x222222)
    });
    globe = new THREE.Mesh(geometry, globeMaterial);
    scene.add(globe);
    
    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 3, 5);
    scene.add(directionalLight);
    
    // Raycaster for interaction
    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();
    
    // Setup UI
    setupUI();
    
    // Event listeners
    renderer.domElement.addEventListener('mousedown', onMouseDown);
    renderer.domElement.addEventListener('mousemove', onMouseMove);
    renderer.domElement.addEventListener('mouseup', onMouseUp);
    renderer.domElement.addEventListener('wheel', onWheel);
    window.addEventListener('resize', onWindowResize);
    document.addEventListener('keydown', onKeyDown);
    
    // Draw initial grid
    if (showGrid) drawGrid();
    
    // Start animation
    animate();
}

function setupUI() {
    // Tool buttons
    document.querySelectorAll('.tool').forEach(button => {
        button.addEventListener('click', (e) => {
            document.querySelectorAll('.tool').forEach(b => b.classList.remove('active'));
            button.classList.add('active');
            currentTool = button.dataset.tool;
            updateCursor();
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
        clearCanvas();
        if (showGrid) drawGrid();
    });
    document.getElementById('save-btn').addEventListener('click', saveArt);
    
    updateInfo();
}

function drawGrid() {
    textureCtx.strokeStyle = '#333333';
    textureCtx.lineWidth = 1;
    
    // Latitude lines
    for (let i = 0; i <= 16; i++) {
        const y = (i / 16) * textureSize;
        textureCtx.beginPath();
        textureCtx.moveTo(0, y);
        textureCtx.lineTo(textureSize, y);
        textureCtx.stroke();
    }
    
    // Longitude lines
    for (let i = 0; i <= 32; i++) {
        const x = (i / 32) * textureSize;
        textureCtx.beginPath();
        textureCtx.moveTo(x, 0);
        textureCtx.lineTo(x, textureSize);
        textureCtx.stroke();
    }
    
    texture.needsUpdate = true;
}

function getUVFromMouse(event) {
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObject(globe);
    
    if (intersects.length > 0) {
        return intersects[0].uv;
    }
    return null;
}

function drawOnTexture(uv) {
    if (!uv) return;
    
    const x = Math.floor(uv.x * textureSize);
    const y = Math.floor((1 - uv.y) * textureSize);
    
    textureCtx.save();
    
    switch (currentTool) {
        case 'pencil':
            textureCtx.fillStyle = currentColor;
            textureCtx.fillRect(
                x - pixelSize/2, 
                y - pixelSize/2, 
                pixelSize, 
                pixelSize
            );
            break;
            
        case 'eraser':
            textureCtx.globalCompositeOperation = 'destination-out';
            textureCtx.fillRect(
                x - pixelSize/2, 
                y - pixelSize/2, 
                pixelSize, 
                pixelSize
            );
            break;
            
        case 'fill':
            // Simple fill - fills a larger area
            textureCtx.fillStyle = currentColor;
            textureCtx.fillRect(
                x - pixelSize*2, 
                y - pixelSize*2, 
                pixelSize*4, 
                pixelSize*4
            );
            break;
            
        case 'eyedropper':
            const imageData = textureCtx.getImageData(x, y, 1, 1);
            const pixel = imageData.data;
            const hex = '#' + 
                ('0' + pixel[0].toString(16)).slice(-2) +
                ('0' + pixel[1].toString(16)).slice(-2) +
                ('0' + pixel[2].toString(16)).slice(-2);
            currentColor = hex;
            document.getElementById('color-picker').value = hex;
            updateInfo();
            break;
    }
    
    textureCtx.restore();
    texture.needsUpdate = true;
}

function onMouseDown(event) {
    if (event.shiftKey || event.button === 2) {
        isRotating = true;
        updateCursor();
    } else if (currentTool !== 'eyedropper') {
        isDrawing = true;
        const uv = getUVFromMouse(event);
        drawOnTexture(uv);
    } else {
        const uv = getUVFromMouse(event);
        drawOnTexture(uv);
    }
    
    lastMouse.x = event.clientX;
    lastMouse.y = event.clientY;
}

function onMouseMove(event) {
    if (isRotating) {
        const deltaX = event.clientX - lastMouse.x;
        const deltaY = event.clientY - lastMouse.y;
        
        globe.rotation.y += deltaX * 0.01;
        globe.rotation.x += deltaY * 0.01;
        
        updateRotationInfo();
    } else if (isDrawing && currentTool !== 'fill') {
        const uv = getUVFromMouse(event);
        drawOnTexture(uv);
    }
    
    lastMouse.x = event.clientX;
    lastMouse.y = event.clientY;
}

function onMouseUp(event) {
    isRotating = false;
    isDrawing = false;
    updateCursor();
}

function onWheel(event) {
    event.preventDefault();
    camera.position.z += event.deltaY * 0.002;
    camera.position.z = Math.max(1.5, Math.min(5, camera.position.z));
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function onKeyDown(event) {
    switch(event.key.toLowerCase()) {
        case 'p':
            document.querySelector('[data-tool="pencil"]').click();
            break;
        case 'e':
            document.querySelector('[data-tool="eraser"]').click();
            break;
        case 'f':
            document.querySelector('[data-tool="fill"]').click();
            break;
        case 'i':
            document.querySelector('[data-tool="eyedropper"]').click();
            break;
        case 'g':
            document.getElementById('grid-toggle').click();
            break;
        case 's':
            if (event.ctrlKey || event.metaKey) {
                event.preventDefault();
                saveArt();
            }
            break;
    }
}

function clearCanvas() {
    if (confirm('Clear the entire canvas?')) {
        textureCtx.fillStyle = '#1a1a1a';
        textureCtx.fillRect(0, 0, textureSize, textureSize);
        if (showGrid) drawGrid();
        texture.needsUpdate = true;
    }
}

function saveArt() {
    textureCanvas.toBlob(blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'globe-art.png';
        a.click();
        URL.revokeObjectURL(url);
    });
}

function updateInfo() {
    document.getElementById('current-tool').textContent = currentTool;
    document.getElementById('current-color').textContent = currentColor;
    document.getElementById('current-color').style.color = currentColor;
}

function updateRotationInfo() {
    const rotX = Math.round(globe.rotation.x * 180 / Math.PI);
    const rotY = Math.round(globe.rotation.y * 180 / Math.PI);
    document.getElementById('rotation-info').textContent = `${rotX}°, ${rotY}°`;
}

function updateCursor() {
    if (isRotating) {
        renderer.domElement.className = 'cursor-rotating';
    } else {
        renderer.domElement.className = `cursor-${currentTool}`;
    }
}

function animate() {
    requestAnimationFrame(animate);
    
    // Auto-rotate when not interacting
    if (!isRotating && !isDrawing) {
        globe.rotation.y += 0.001;
        updateRotationInfo();
    }
    
    renderer.render(scene, camera);
}

// Context menu prevention
document.addEventListener('contextmenu', (e) => e.preventDefault());

// Start the application
init();
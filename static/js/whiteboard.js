/**
 * Whiteboard functionality using Fabric.js
 */
let canvas;
let isWhiteboardActive = false;
let currentColor = '#000000';
let currentBrushSize = 5;
let drawingMode = 'pencil';

// Initialize the whiteboard
function initializeWhiteboard() {
    // Create a new Fabric.js canvas
    canvas = new fabric.Canvas('whiteboard-canvas', {
        isDrawingMode: true,
        width: document.getElementById('whiteboard').clientWidth,
        height: document.getElementById('whiteboard').clientHeight,
        backgroundColor: '#ffffff'
    });
    
    // Set initial brush settings
    setDrawingMode('pencil');
    
    // Handle window resize
    window.addEventListener('resize', () => {
        resizeCanvas();
    });
    
    // Setup whiteboard drawing event
    canvas.on('path:created', function(event) {
        // Send drawing data to other users
        if (isWhiteboardActive) {
            const path = event.path;
            sendWhiteboardDraw(JSON.stringify(path.toJSON()));
        }
    });
    
    // Set up color picker
    document.getElementById('color-picker').addEventListener('change', function(e) {
        currentColor = e.target.value;
        updateBrush();
    });
    
    // Set up brush size slider
    document.getElementById('brush-size').addEventListener('input', function(e) {
        currentBrushSize = parseInt(e.target.value);
        updateBrush();
    });
    
    // Set up drawing mode buttons
    document.querySelectorAll('.drawing-tool').forEach(button => {
        button.addEventListener('click', function(e) {
            const mode = e.currentTarget.getAttribute('data-tool');
            setDrawingMode(mode);
            
            // Update active button
            document.querySelectorAll('.drawing-tool').forEach(btn => {
                btn.classList.remove('active');
            });
            e.currentTarget.classList.add('active');
        });
    });
    
    // Set up clear button
    document.getElementById('clear-whiteboard').addEventListener('click', function() {
        clearWhiteboard();
        
        // Notify others about clearing whiteboard
        sendWhiteboardDraw('CLEAR');
    });
    
    // Hide the whiteboard initially
    toggleWhiteboard(false);
}

// Resize canvas on window resize
function resizeCanvas() {
    const whiteboardContainer = document.getElementById('whiteboard');
    const width = whiteboardContainer.clientWidth;
    const height = whiteboardContainer.clientHeight;
    
    // Save canvas state
    const json = canvas.toJSON();
    
    // Resize canvas
    canvas.setWidth(width);
    canvas.setHeight(height);
    
    // Restore canvas state
    canvas.loadFromJSON(json, function() {
        canvas.renderAll();
    });
}

// Update the brush based on current settings
function updateBrush() {
    if (drawingMode === 'pencil' || drawingMode === 'brush') {
        canvas.freeDrawingBrush.color = currentColor;
        canvas.freeDrawingBrush.width = currentBrushSize;
    }
}

// Set the drawing mode
function setDrawingMode(mode) {
    drawingMode = mode;
    
    switch (mode) {
        case 'pencil':
            canvas.isDrawingMode = true;
            canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
            break;
        case 'brush':
            canvas.isDrawingMode = true;
            canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
            break;
        case 'eraser':
            canvas.isDrawingMode = true;
            canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
            canvas.freeDrawingBrush.color = '#ffffff';
            canvas.freeDrawingBrush.width = 20;
            return; // Don't update brush for eraser
        case 'text':
            canvas.isDrawingMode = false;
            addTextToCanvas();
            break;
        case 'select':
            canvas.isDrawingMode = false;
            break;
    }
    
    updateBrush();
}

// Add text to the canvas
function addTextToCanvas() {
    const text = new fabric.IText('Type here', {
        left: canvas.width / 2,
        top: canvas.height / 2,
        fill: currentColor,
        fontSize: currentBrushSize * 3,
        fontFamily: 'Arial'
    });
    
    canvas.add(text);
    canvas.setActiveObject(text);
    text.enterEditing();
    
    // Send text object to other users when it's modified
    text.on('modified', function() {
        sendWhiteboardDraw(JSON.stringify(text.toJSON()));
    });
}

// Handle whiteboard drawing data from other users
function handleWhiteboardDraw(drawData) {
    if (drawData === 'CLEAR') {
        clearWhiteboard(false);
        return;
    }
    
    try {
        const objectData = JSON.parse(drawData);
        
        fabric.util.enlivenObjects([objectData], function(objects) {
            objects.forEach(obj => {
                canvas.add(obj);
                canvas.renderAll();
            });
        });
    } catch (error) {
        console.error('Error processing whiteboard data:', error);
    }
}

// Clear the whiteboard
function clearWhiteboard(notifyOthers = true) {
    canvas.clear();
    canvas.backgroundColor = '#ffffff';
    canvas.renderAll();
    
    // Notify others that whiteboard was cleared
    if (notifyOthers) {
        sendWhiteboardDraw('CLEAR');
    }
}

// Toggle whiteboard visibility
function toggleWhiteboard(show = null) {
    const whiteboard = document.getElementById('whiteboard');
    const toggleBtn = document.getElementById('whiteboard-btn');
    
    // If show is null, toggle the current state
    if (show === null) {
        isWhiteboardActive = !isWhiteboardActive;
    } else {
        isWhiteboardActive = show;
    }
    
    if (isWhiteboardActive) {
        whiteboard.style.display = 'block';
        toggleBtn.innerHTML = '<i class="fas fa-chalkboard"></i> Hide Whiteboard';
        
        // Give time for the whiteboard to become visible
        setTimeout(() => {
            resizeCanvas();
        }, 100);
    } else {
        whiteboard.style.display = 'none';
        toggleBtn.innerHTML = '<i class="fas fa-chalkboard"></i> Show Whiteboard';
    }
}

// Save whiteboard as image
function saveWhiteboardAsImage() {
    const dataURL = canvas.toDataURL({
        format: 'png',
        quality: 1.0
    });
    
    const link = document.createElement('a');
    link.href = dataURL;
    link.download = `whiteboard-${new Date().toISOString().slice(0, 19).replace(/[T:]/g, '-')}.png`;
    link.click();
}

// MediaPipe globals from CDN
const Hands = window.Hands;
const Camera = window.Camera;

// DOM Elements
const videoElement = document.querySelector('.input_video');
const canvasElement = document.querySelector('.output_canvas');
const canvasCtx = canvasElement.getContext('2d');
const statusIndicator = document.getElementById('status-indicator');
const statusText = document.getElementById('status-text');
const loadingOverlay = document.getElementById('loading-overlay');
const clearBtn = document.getElementById('clear-btn');
const saveBtn = document.getElementById('save-btn');
const colorBtns = document.querySelectorAll('.color-btn');
const colorPicker = document.getElementById('color-picker');
const brushSizeInput = document.getElementById('brush-size');
const brushSizeVal = document.getElementById('size-val');

// State
let drawing = false;
let lastCoord = null;
let brushColor = '#3b82f6';
let brushSize = 5;

// Initialize Canvas Size
function resizeCanvas() {
  canvasElement.width = canvasElement.clientWidth;
  canvasElement.height = canvasElement.clientHeight;
  // Note: Clearing the canvas on resize is a side effect, 
  // but usually necessary to prevent stretching.
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// UI Interactions
clearBtn.addEventListener('click', () => {
  canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
});

saveBtn.addEventListener('click', () => {
  const link = document.createElement('a');
  link.download = 'air-draw.png';
  link.href = canvasElement.toDataURL();
  link.click();
});

colorBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    colorBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    brushColor = btn.dataset.color;
    colorPicker.value = brushColor;
  });
});

colorPicker.addEventListener('input', (e) => {
  brushColor = e.target.value;
  colorBtns.forEach(b => b.classList.remove('active'));
});

brushSizeInput.addEventListener('input', (e) => {
  brushSize = e.target.value;
  brushSizeVal.textContent = brushSize;
});

// Gesture Detection
function isIndexUp(landmarks) {
  // Landmarks: 8 is index tip, 6 is index pip, 5 is index mcp
  // 12 is middle tip, 16 is ring tip, 20 is pinky tip
  // Simplified check: index tip is higher (lower Y) than index pip/mcp
  // AND other fingers are down (tip higher Y than pip)
  const indexUp = landmarks[8].y < landmarks[6].y;
  const middleDown = landmarks[12].y > landmarks[10].y;
  const ringDown = landmarks[16].y > landmarks[14].y;
  const pinkyDown = landmarks[20].y > landmarks[18].y;

  return indexUp && middleDown && ringDown && pinkyDown;
}

// Draw Logic
function draw(coords) {
  if (!lastCoord) {
    lastCoord = coords;
    return;
  }

  canvasCtx.beginPath();
  canvasCtx.moveTo(lastCoord.x, lastCoord.y);
  canvasCtx.lineTo(coords.x, coords.y);
  canvasCtx.strokeStyle = brushColor;
  canvasCtx.lineWidth = brushSize;
  canvasCtx.lineCap = 'round';
  canvasCtx.lineJoin = 'round';
  canvasCtx.stroke();
  
  lastCoord = coords;
}

// MediaPipe Hands Setup
const hands = new Hands({
  locateFile: (file) => {
    return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
  }
});

hands.setOptions({
  maxNumHands: 1,
  modelComplexity: 1,
  minDetectionConfidence: 0.7,
  minTrackingConfidence: 0.7
});

hands.onResults((results) => {
  // Hide loading on first result
  if (!loadingOverlay.classList.contains('hidden')) {
    loadingOverlay.classList.add('hidden');
  }

  if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
    statusIndicator.classList.add('ready');
    statusText.textContent = 'Hand detected - Point to draw';
    
    const landmarks = results.multiHandLandmarks[0];
    const indexTip = landmarks[8];
    
    // Map coordinates (Video is mirrored, so we mirror X back)
    const x = (1 - indexTip.x) * canvasElement.width;
    const y = indexTip.y * canvasElement.height;
    
    if (isIndexUp(landmarks)) {
      draw({ x, y });
    } else {
      lastCoord = null;
    }
  } else {
    statusIndicator.classList.remove('ready');
    statusText.textContent = 'Hand not detected';
    lastCoord = null;
  }
});

// Camera Setup
const camera = new Camera(videoElement, {
  onFrame: async () => {
    await hands.send({ image: videoElement });
  },
  width: 1280,
  height: 720
});

camera.start();

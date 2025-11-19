/**
 * Starry Night Psychedelic Experience - Masterpiece Edition
 * 
 * Features:
 * 1. Base64 Image Sampling (Guaranteed Color)
 * 2. Multi-pass Vector Field Smoothing (Coherent "Van Gogh" Flow)
 * 3. Oriented Brushstrokes (Not just dots)
 * 4. High Performance (No shadowBlur)
 */

// --- Simplex Noise ---
const Noise = (function() {
    const p = new Uint8Array(512);
    const permutation = [151,160,137,91,90,15,131,13,201,95,96,53,194,233,7,225,140,36,103,30,69,142,8,99,37,240,21,10,23,190,6,148,247,120,234,75,0,26,197,62,94,252,219,203,117,35,11,32,57,177,33,88,237,149,56,87,174,20,125,136,171,168,68,175,74,165,71,134,139,48,27,166,77,146,158,231,83,111,229,122,60,211,133,230,220,105,92,41,55,46,245,40,244,102,143,54,65,25,63,161,1,216,80,73,209,76,132,187,208,89,18,169,200,196,135,130,116,188,159,86,164,100,109,198,173,186,3,64,52,217,226,250,124,123,5,202,38,147,118,126,255,82,85,212,207,206,59,227,47,16,58,17,182,189,28,42,223,183,170,213,119,248,152,2,44,154,163,70,221,153,101,155,167,43,172,9,129,22,39,253,19,98,108,110,79,113,224,232,178,185,112,104,218,246,97,228,251,34,242,193,238,210,144,12,191,179,162,241,81,51,145,235,249,14,239,107,49,192,214,31,181,199,106,157,184,84,204,176,115,121,50,45,127,4,150,254,138,236,205,93,222,114,67,29,24,72,243,141,128,195,78,66,215,61,156,180];
    for (let i=0; i < 256 ; i++) p[256+i] = p[i] = permutation[i];
    function fade(t) { return t * t * t * (t * (t * 6 - 15) + 10); }
    function lerp(t, a, b) { return a + t * (b - a); }
    function grad(hash, x, y, z) {
        const h = hash & 15;
        const u = h < 8 ? x : y, v = h < 4 ? y : h == 12 || h == 14 ? x : z;
        return ((h & 1) == 0 ? u : -u) + ((h & 2) == 0 ? v : -v);
    }
    return {
        noise: function (x, y, z) {
            const X = Math.floor(x) & 255, Y = Math.floor(y) & 255, Z = Math.floor(z) & 255;
            x -= Math.floor(x); y -= Math.floor(y); z -= Math.floor(z);
            const u = fade(x), v = fade(y), w = fade(z);
            const A = p[X]+Y, AA = p[A]+Z, AB = p[A+1]+Z, B = p[X+1]+Y, BA = p[B]+Z, BB = p[B+1]+Z;
            return lerp(w, lerp(v, lerp(u, grad(p[AA], x, y, z), grad(p[BA], x-1, y, z)),
                    lerp(u, grad(p[AB], x, y-1, z), grad(p[BB], x-1, y-1, z))),
                lerp(v, lerp(u, grad(p[AA+1], x, y, z-1), grad(p[BA+1], x-1, y, z-1)),
                    lerp(u, grad(p[AB+1], x, y-1, z-1), grad(p[BB+1], x-1, y-1, z-1))));
        }
    };
})();

// --- Configuration ---
const CONFIG = {
    speed: 1.0,
    swirlScale: 400,
    trailFade: 0.02,      // Extremely low for long trails
    opacity: 0.7,         
    bgDim: 0.4,
    blurLevel: 0,
    colorShift: 0.0,
    particleCount: 5000,
    flowGridStep: 10,     // 10px grid
    smoothingPasses: 15,  // How many times to smooth the vector field
    time: 0,
    recording: false
};

// --- Canvas ---
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d', { alpha: true });
const offscreenCanvas = document.createElement('canvas');
const offCtx = offscreenCanvas.getContext('2d');
const bgContainer = document.getElementById('bg-container');

// --- State ---
let flowGrid = [];
let cols = 0;
let rows = 0;
let imgData = null;
const particles = [];
let animationId = null;
let lastTime = 0;
let imgRenderRect = { x:0, y:0, w:0, h:0 };

// --- Recording ---
let gif = null;
let recordStartTime = 0;
const RECORD_DURATION = 10000;

// --- Image Loading ---
const image = new Image();
// Use STARRY_NIGHT_B64 from image_data.js if available
if (typeof STARRY_NIGHT_B64 !== 'undefined') {
    image.src = STARRY_NIGHT_B64;
} else {
    image.src = 'starry-night.jpg';
}

image.onload = () => {
    console.log("Image Loaded");
    if(bgContainer) {
        bgContainer.style.backgroundImage = `url('${image.src}')`;
    }
    init();
};
image.onerror = () => {
    console.warn("Image failed to load.");
    init();
};

// --- Logic ---

function updateLayout() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    cols = Math.ceil(canvas.width / CONFIG.flowGridStep);
    rows = Math.ceil(canvas.height / CONFIG.flowGridStep);
    flowGrid = new Float32Array(cols * rows);

    if (image.complete && image.naturalWidth !== 0) {
        const screenRatio = canvas.width / canvas.height;
        const imgRatio = image.width / image.height;
        let scale;
        
        if (screenRatio > imgRatio) {
            scale = canvas.width / image.width;
        } else {
            scale = canvas.height / image.height;
        }
        
        imgRenderRect.w = image.width * scale;
        imgRenderRect.h = image.height * scale;
        imgRenderRect.x = (canvas.width - imgRenderRect.w) / 2;
        imgRenderRect.y = (canvas.height - imgRenderRect.h) / 2;

        calculateFlowField();
    }
    
    if(bgContainer) {
        bgContainer.style.filter = `brightness(${1 - CONFIG.bgDim})`;
    }
}

function calculateFlowField() {
    offscreenCanvas.width = canvas.width;
    offscreenCanvas.height = canvas.height;
    
    offCtx.drawImage(image, imgRenderRect.x, imgRenderRect.y, imgRenderRect.w, imgRenderRect.h);
    
    try {
        imgData = offCtx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imgData.data;
        
        // 1. Initial Sobel Calculation
        for (let y = 0; y < rows; y++) {
            for (let x = 0; x < cols; x++) {
                const px = x * CONFIG.flowGridStep;
                const py = y * CONFIG.flowGridStep;
                
                if (px >= canvas.width || py >= canvas.height) continue;

                const getLum = (gx, gy) => {
                    if (gx < 0 || gx >= canvas.width || gy < 0 || gy >= canvas.height) return 0;
                    const i = (gy * canvas.width + gx) * 4;
                    return (data[i] * 0.299 + data[i+1] * 0.587 + data[i+2] * 0.114);
                };
                
                // Larger kernel for broader stroke detection
                const d = 4;
                const left = getLum(px - d, py);
                const right = getLum(px + d, py);
                const top = getLum(px, py - d);
                const bottom = getLum(px, py + d);
                
                const dx = right - left;
                const dy = bottom - top;
                
                let angle = Math.atan2(dy, dx) + Math.PI / 2;
                flowGrid[x + y * cols] = angle;
            }
        }
        
        // 2. Multi-pass Smoothing (The "Momentum" Logic)
        // Iteratively average vectors with neighbors to create coherent flow paths
        for (let pass = 0; pass < CONFIG.smoothingPasses; pass++) {
            const smoothedGrid = new Float32Array(cols * rows);
            for (let y = 0; y < rows; y++) {
                for (let x = 0; x < cols; x++) {
                    let sumX = 0;
                    let sumY = 0;
                    let count = 0;
                    
                    // 3x3 neighbor average
                    for (let dy = -1; dy <= 1; dy++) {
                        for (let dx = -1; dx <= 1; dx++) {
                            const nx = x + dx;
                            const ny = y + dy;
                            
                            if (nx >= 0 && nx < cols && ny >= 0 && ny < rows) {
                                const idx = nx + ny * cols;
                                const a = flowGrid[idx];
                                sumX += Math.cos(a);
                                sumY += Math.sin(a);
                                count++;
                            }
                        }
                    }
                    
                    if (count > 0) {
                        smoothedGrid[x + y * cols] = Math.atan2(sumY / count, sumX / count);
                    } else {
                        smoothedGrid[x + y * cols] = flowGrid[x + y * cols];
                    }
                }
            }
            flowGrid = smoothedGrid;
        }

        console.log(`Flow field generated with ${CONFIG.smoothingPasses} smoothing passes.`);

    } catch (e) {
        console.warn("Image data access error. Using Noise Fallback.", e);
        imgData = null;
        // Noise Fallback
        for (let i = 0; i < flowGrid.length; i++) {
             const x = i % cols;
             const y = Math.floor(i / cols);
             flowGrid[i] = Noise.noise(x/30, y/30, 0) * Math.PI * 4;
        }
    }
}

class Particle {
    constructor() {
        this.reset(true);
    }

    reset(randomPos = false) {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.age = 0;
        this.lifeSpan = 100 + Math.random() * 150; 
        this.vx = 0;
        this.vy = 0;
        this.baseSize = 1.0 + Math.random() * 2.0;
    }

    update() {
        let col = Math.floor(this.x / CONFIG.flowGridStep);
        let row = Math.floor(this.y / CONFIG.flowGridStep);
        
        if (col >= 0 && col < cols && row >= 0 && row < rows) {
             const imgAngle = flowGrid[col + row * cols] || 0;
             
             // Add swirl noise, but with lower weight to preserve image flow
             const noiseAngle = Noise.noise(
                this.x / CONFIG.swirlScale, 
                this.y / CONFIG.swirlScale, 
                CONFIG.time * 0.0002
             ) * Math.PI * 4;

             const vx1 = Math.cos(imgAngle);
             const vy1 = Math.sin(imgAngle);
             const vx2 = Math.cos(noiseAngle);
             const vy2 = Math.sin(noiseAngle);
             
             // 85% Image Flow, 15% Noise -> Stronger adherence
             const targetVx = (vx1 * 0.85 + vx2 * 0.15) * CONFIG.speed;
             const targetVy = (vy1 * 0.85 + vy2 * 0.15) * CONFIG.speed;

             this.vx += (targetVx - this.vx) * 0.1;
             this.vy += (targetVy - this.vy) * 0.1;
        }

        this.x += this.vx;
        this.y += this.vy;
        this.age++;
        
        if (this.x < 0 || this.x > canvas.width || this.y < 0 || this.y > canvas.height || this.age > this.lifeSpan) {
            this.reset(false);
        }
    }

    draw() {
        const ix = Math.floor(this.x);
        const iy = Math.floor(this.y);
        
        let r = 255, g = 255, b = 255;
        
        // COLOR SAMPLING
        if (imgData && ix >= 0 && ix < canvas.width && iy >= 0 && iy < canvas.height) {
            const idx = (iy * canvas.width + ix) * 4;
            r = imgData.data[idx];
            g = imgData.data[idx+1];
            b = imgData.data[idx+2];
        } 

        // Psychedelic Shift
        if (CONFIG.colorShift > 0) {
            const shift = CONFIG.time * CONFIG.colorShift;
            r = Math.min(255, r + Math.sin(shift * 0.05) * 50);
            g = Math.min(255, g + Math.cos(shift * 0.05) * 50);
            b = Math.min(255, b - Math.sin(shift * 0.05) * 50);
        }

        const blurFactor = CONFIG.blurLevel; 
        // "Fake Blur": increase size, decrease opacity
        const size = this.baseSize * (1 + blurFactor * 0.5);
        let alpha = (1 - this.age / this.lifeSpan) * CONFIG.opacity;
        
        if (blurFactor > 0) {
            alpha *= (0.6 / (1 + blurFactor * 0.2));
        }
        
        ctx.strokeStyle = `rgba(${r},${g},${b},${alpha})`;
        ctx.lineWidth = size;
        
        // ORIENTED BRUSH STROKE (Line instead of Dot)
        // This creates the "Impressionist" look
        ctx.beginPath();
        ctx.moveTo(this.x, this.y);
        // Draw a short line backwards along the velocity vector
        // length depends on speed
        const speed = Math.sqrt(this.vx*this.vx + this.vy*this.vy);
        const len = Math.max(2, speed * 4); // Minimum 2px length
        
        // Normalize velocity for direction
        const dx = this.vx / (speed || 1);
        const dy = this.vy / (speed || 1);
        
        ctx.lineTo(this.x - dx * len, this.y - dy * len);
        ctx.stroke();
    }
}

function initParticles() {
    particles.length = 0;
    for(let i=0; i<CONFIG.particleCount; i++) {
        particles.push(new Particle());
    }
}

function animate(timestamp) {
    CONFIG.time++;
    
    // Destination-Out for Trails
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = `rgba(0, 0, 0, ${CONFIG.trailFade})`; 
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Lighter for Glowing Overlap
    ctx.globalCompositeOperation = 'lighter';
    // Round caps for better strokes
    ctx.lineCap = 'round'; 
    
    for (let i = 0; i < particles.length; i++) {
        particles[i].update();
        particles[i].draw();
    }
    
    if (timestamp - lastTime >= 1000) {
        const fps = Math.round(1000 / (timestamp - lastTime));
        const fpsEl = document.getElementById('fps');
        if(fpsEl) fpsEl.innerText = `FPS: ${fps}`;
        lastTime = timestamp;
    } else if (lastTime === 0) {
        lastTime = timestamp;
    }

    if (CONFIG.recording && gif) {
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = canvas.width;
        tempCanvas.height = canvas.height;
        const tCtx = tempCanvas.getContext('2d');
        
        // Composite for GIF
        try {
            tCtx.drawImage(image, imgRenderRect.x, imgRenderRect.y, imgRenderRect.w, imgRenderRect.h);
        } catch(e) {}
        
        tCtx.fillStyle = `rgba(0,0,0,${CONFIG.bgDim})`;
        tCtx.fillRect(0,0,canvas.width, canvas.height);
        
        tCtx.drawImage(canvas, 0, 0);
        
        gif.addFrame(tempCanvas, {delay: 20});
        
        const elapsed = Date.now() - recordStartTime;
        
        if (elapsed >= RECORD_DURATION) {
            stopRecording();
        } else {
            const btn = document.getElementById('recordBtn');
            if(btn) btn.innerText = `录制中 ${Math.round((RECORD_DURATION - elapsed)/1000)}s`;
        }
    }
    
    animationId = requestAnimationFrame(animate);
}

function startRecording() {
    if (CONFIG.recording) return;
    const btn = document.getElementById('recordBtn');
    btn.innerText = "初始化...";
    btn.disabled = true;
    try {
        gif = new GIF({ workers: 2, quality: 10, width: canvas.width, height: canvas.height, workerScript: 'gif.worker.js' });
        gif.on('finished', function(blob) {
            // Auto-download
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = `starry_night_${Date.now()}.gif`;
            document.body.appendChild(a);
            a.click();
            setTimeout(() => {
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);
            }, 100);

            const btn = document.getElementById('recordBtn');
            btn.innerText = "录制 10秒 GIF";
            btn.disabled = false;
            CONFIG.recording = false;
        });
        CONFIG.recording = true;
        recordStartTime = Date.now();
    } catch (e) {
        console.error(e);
        CONFIG.recording = false;
    }
}

function stopRecording() {
    CONFIG.recording = false;
    const btn = document.getElementById('recordBtn');
    if(btn) btn.innerText = "渲染中...";
    if(gif) gif.render();
}

function init() {
    window.addEventListener('resize', () => {
        updateLayout();
        initParticles();
    });
    updateLayout(); 
    initParticles();
    bindUI();
    if (animationId) cancelAnimationFrame(animationId);
    animate(0);
}

function bindUI() {
    const on = (id, key) => {
        const el = document.getElementById(id);
        if(el) el.addEventListener('input', e => CONFIG[key] = parseFloat(e.target.value));
    };
    
    on('speed', 'speed');
    on('swirl', 'swirlScale');
    on('trailFade', 'trailFade');
    on('blurLevel', 'blurLevel');
    on('colorShift', 'colorShift');
    on('opacity', 'opacity');
    
    document.getElementById('bgDim').addEventListener('input', (e) => {
        CONFIG.bgDim = parseFloat(e.target.value);
        if(bgContainer) bgContainer.style.filter = `brightness(${1 - CONFIG.bgDim})`;
    });
    
    const pc = document.getElementById('particleCount');
    if(pc) {
        pc.addEventListener('input', e => {
            const count = parseInt(e.target.value);
            if (count > particles.length) {
                for(let i=particles.length; i<count; i++) particles.push(new Particle());
            } else {
                particles.length = count;
            }
            CONFIG.particleCount = count;
        });
    }
    document.getElementById('resetBtn').addEventListener('click', () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        initParticles();
    });
    document.getElementById('recordBtn').addEventListener('click', startRecording);
    
    const toggleBtn = document.getElementById('toggleConsole');
    const controls = document.querySelector('.controls-container');
    if (toggleBtn && controls) {
        toggleBtn.addEventListener('click', () => {
            controls.classList.toggle('collapsed');
            toggleBtn.innerText = controls.classList.contains('collapsed') ? '☰' : '×';
        });
    }
}

// Wait for base64 data if it's still loading
if (typeof STARRY_NIGHT_B64 !== 'undefined' || image.complete) {
    init();
} else {
    // Check every 100ms
    const checkInterval = setInterval(() => {
        if (typeof STARRY_NIGHT_B64 !== 'undefined' || image.complete) {
            clearInterval(checkInterval);
            init();
        }
    }, 100);
}

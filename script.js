const STAR_VERTEX_SHADER = `
    uniform float uTime;
    uniform vec2 uMouse;
    uniform float uWarpStrength;
    uniform float uAnimationSpeed;

    varying vec2 vUv;

    void main() {
        vUv = uv;

        vec3 pos = position;
        float warp = sin(pos.x * 4.0 + uTime * uAnimationSpeed) * cos(pos.y * 4.0 + uTime * 0.8 * uAnimationSpeed) * uWarpStrength;
        float mouseEffect = (pos.x * uMouse.x + pos.y * uMouse.y) * 0.15;
        pos.z += warp + mouseEffect;

        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
`;

const STAR_FRAGMENT_SHADER = `
    uniform sampler2D uTexture;
    uniform float uTime;
    uniform vec2 uMouse;
    uniform float uFlowScale;
    uniform float uFlowStrength;
    uniform float uTwinkleStrength;
    uniform float uAnimationSpeed;

    varying vec2 vUv;

    vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec3 permute(vec3 x) { return mod289(((x * 34.0) + 1.0) * x); }

    float snoise(vec2 v) {
        const vec4 C = vec4(0.211324865405187,
                            0.366025403784439,
                            -0.577350269189626,
                            0.024390243902439);
        vec2 i  = floor(v + dot(v, C.yy));
        vec2 x0 = v - i + dot(i, C.xx);
        vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
        vec4 x12 = x0.xyxy + C.xxzz;
        x12.xy -= i1;
        i = mod289(i);
        vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0))
            + i.x + vec3(0.0, i1.x, 1.0));
        vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
        m = m * m;
        m = m * m;
        vec3 x = 2.0 * fract(p * C.www) - 1.0;
        vec3 h = abs(x) - 0.5;
        vec3 ox = floor(x + 0.5);
        vec3 a0 = x - ox;
        m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
        vec3 g;
        g.x  = a0.x  * x0.x  + h.x  * x0.y;
        g.yz = a0.yz * x12.xz + h.yz * x12.yw;
        return 130.0 * dot(m, g);
    }

    void main() {
        vec2 uv = vUv;
        vec4 baseColor = texture2D(uTexture, uv);
        float brightness = dot(baseColor.rgb, vec3(0.299, 0.587, 0.114));

        float strength = uFlowStrength + brightness * uFlowStrength;
        float timeScale = uTime * uAnimationSpeed;

        float noiseVal = snoise(vec2(uv.x * uFlowScale, uv.y * uFlowScale + timeScale * 0.2));
        float noiseVal2 = snoise(vec2(uv.x * (uFlowScale * 1.7) - timeScale * 0.1, uv.y * (uFlowScale * 1.4)));
        vec2 flowOffset = vec2(noiseVal, noiseVal2) * strength;
        vec2 distortedUv = uv + flowOffset;

        vec4 color = texture2D(uTexture, distortedUv);

        float twinkle = 1.0 + sin(timeScale * 3.0 + uv.x * 25.0 + uv.y * 35.0) * uTwinkleStrength * brightness;
        color.rgb *= twinkle;
        color.rgb = pow(color.rgb, vec3(1.05));

        gl_FragColor = color;
    }
`;

const DEFAULT_SLIDERS = {
    flowStrength: 0.008,
    twinkleStrength: 0.0,
    animationSpeed: 0.5,
    tiltStrength: 0.0,
    zoom: 3.8,
    positionX: -1.0,
    positionY: -0.8,
    brightness: 1.2,
    contrast: 1.3,
    saturation: 1.4
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const valueWithStep = (input, value) => {
    if (!input) return String(value);
    const step = input.step ? Number(input.step) : NaN;
    if (!Number.isFinite(step) || step === 0) {
        return String(Math.round(value));
    }
    const decimals = (input.step.split('.')[1] || '').length;
    return Number(value).toFixed(decimals);
};

const convertBlur = (value) => value * 0.004;
const convertTwinkle = (value) => 0.05 + value * 0.3;
const convertFlowScale = (value) => value / 200;
const convertTilt = (value) => value * 3.0;

class StarryNightExperience {
    constructor() {
        this.canvas = document.getElementById('canvas');
        this.loadingEl = document.getElementById('canvas-loading');
        this.container = this.canvas ? this.canvas.parentElement : null;
        // Sidebar removed - no longer needed

        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.mesh = null;
        this.uniforms = null;
        this.clock = null;

        this.mouse = null;
        this.targetMouse = null;
        this.targetZoom = DEFAULT_SLIDERS.zoom;
        this.minZoom = 2.5;
        this.maxZoom = 5.1;

        this.sliders = {};
        
        // 拖拽相关
        this.isDragging = false;
        this.dragStart = null;
        this.dragStartPosition = null;
        this.imageAspect = null; // 保存图片的原始宽高比

        this.config = {
            flowStrength: DEFAULT_SLIDERS.flowStrength,
            twinkleStrength: DEFAULT_SLIDERS.twinkleStrength,
            animationSpeed: DEFAULT_SLIDERS.animationSpeed,
            tiltStrength: DEFAULT_SLIDERS.tiltStrength,
            zoom: DEFAULT_SLIDERS.zoom,
            positionX: DEFAULT_SLIDERS.positionX,
            positionY: DEFAULT_SLIDERS.positionY
        };

        this.init();
    }

    init() {
        if (!this.canvas || !this.container) {
            console.error('Starry Night canvas element not found.');
            if (this.loadingEl) {
                this.loadingEl.textContent = 'Canvas element not found';
            }
            return;
        }
        if (typeof THREE === 'undefined') {
            console.error('Three.js failed to load.');
            if (this.loadingEl) {
                this.loadingEl.textContent = 'Three.js 加载失败，请刷新页面';
            }
            // 尝试重新加载 Three.js
            setTimeout(() => {
                location.reload();
            }, 3000);
            return;
        }

        this.mouse = new THREE.Vector2();
        this.targetMouse = new THREE.Vector2();
        this.clock = new THREE.Clock();
        this.initUI();
        this.initRenderer();
        this.bindPointerEvents();
        this.loadStarryNightTexture();
        
        // 监听全屏状态变化，确保画布按比例缩放
        document.addEventListener('fullscreenchange', () => {
            setTimeout(() => {
                this.updateRendererSize();
            }, 100);
        });

        const fps = document.getElementById('fps');
        if (fps) {
            fps.textContent = 'Move your mouse to tilt the canvas · Scroll to zoom';
        }
    }

    initUI() {
        // setupSidebarToggle removed - sidebar toggle functionality removed
        this.setupSliders();
        this.setupButtons();
        this.applyCanvasFilters();
    }

    // setupSidebarToggle removed - sidebar toggle functionality removed

    // 格式化数值显示
    formatValue(value, step) {
        if (step >= 1) {
            return value.toFixed(0);
        } else if (step >= 0.1) {
            return value.toFixed(1);
        } else if (step >= 0.01) {
            return value.toFixed(2);
        } else {
            return value.toFixed(3);
        }
    }

    // 更新推子值显示
    updateSliderValueDisplay(sliderId) {
        const slider = this.sliders[sliderId];
        const displayEl = document.getElementById(sliderId + 'Value');
        if (!slider || !displayEl) return;
        
        const min = Number(slider.min);
        const max = Number(slider.max);
        const step = Number(slider.step);
        const current = Number(slider.value);
        
        const minStr = this.formatValue(min, step);
        const maxStr = this.formatValue(max, step);
        const currentStr = this.formatValue(current, step);
        
        displayEl.textContent = `[${minStr} - ${maxStr}] ${currentStr}`;
    }

    setupSliders() {
        const sliderIds = ['flowStrength', 'animationSpeed', 'zoom', 'brightness', 'contrast', 'saturation'];
        sliderIds.forEach((id) => {
            const input = document.getElementById(id);
            if (!input) return;
            input.dataset.defaultValue = input.value;
            this.sliders[id] = input;
            // 初始化显示值
            this.updateSliderValueDisplay(id);
        });

        const flowStrength = this.sliders.flowStrength;
        if (flowStrength) {
            flowStrength.addEventListener('input', (event) => {
                this.config.flowStrength = Number(event.target.value);
                this.updateShaderConfig();
                this.updateSliderValueDisplay('flowStrength');
            });
        }

        const animationSpeed = this.sliders.animationSpeed;
        if (animationSpeed) {
            animationSpeed.addEventListener('input', (event) => {
                this.config.animationSpeed = Number(event.target.value);
                this.updateShaderConfig();
                this.updateSliderValueDisplay('animationSpeed');
            });
        }

        const zoom = this.sliders.zoom;
        if (zoom) {
            zoom.addEventListener('input', (event) => {
                const value = Number(event.target.value);
                this.config.zoom = value;
                this.targetZoom = value;
                this.updateSliderValueDisplay('zoom');
            });
        }


        ['brightness', 'contrast', 'saturation'].forEach((id) => {
            const input = this.sliders[id];
            if (!input) return;
            input.addEventListener('input', () => {
                this.applyCanvasFilters();
                this.updateSliderValueDisplay(id);
            });
        });
    }

    setupButtons() {
        const randomBtn = document.getElementById('btnRandom');
        if (randomBtn) {
            randomBtn.addEventListener('click', () => this.randomizeSliders());
        }

        const resetParamsBtn = document.getElementById('btnResetParams');
        if (resetParamsBtn) {
            resetParamsBtn.addEventListener('click', () => this.resetSliders());
        }

        const resetViewBtn = document.getElementById('btnReset');
        if (resetViewBtn) {
            resetViewBtn.addEventListener('click', () => this.resetView());
        }

        const fullscreenBtn = document.getElementById('btnFullscreen');
        if (fullscreenBtn) {
            fullscreenBtn.addEventListener('click', () => this.toggleFullscreen());
        }
    }

    initRenderer() {
        this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, alpha: false });
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x050505);
        this.camera = new THREE.PerspectiveCamera(45, this.getAspect(), 0.1, 100);
        this.camera.position.z = this.targetZoom;
        this.camera.position.x = 0;
        this.camera.position.y = 0;
        this.updateRendererSize();
    }

    getAspect() {
        if (!this.container) return window.innerWidth / Math.max(window.innerHeight, 1);
        return this.container.clientWidth / Math.max(this.container.clientHeight, 1);
    }

    // 将像素值转换为场景单位
    pixelsToSceneUnits(pixels) {
        if (!this.camera || !this.container) return pixels * 0.001;
        const height = this.container.clientHeight;
        const fov = this.camera.fov * (Math.PI / 180); // 转换为弧度
        const distance = this.camera.position.z;
        // 计算视野高度
        const viewHeight = 2 * distance * Math.tan(fov / 2);
        // 将像素转换为场景单位
        return (pixels / height) * viewHeight;
    }

    // 自动对齐窗口并校验位置
    autoAlignAndValidate() {
        if (!this.mesh || !this.camera || !this.container) return;
        
        // 使用默认位置值
        const finalX = DEFAULT_SLIDERS.positionX;
        const finalY = DEFAULT_SLIDERS.positionY;
        
        // 更新mesh位置
        this.mesh.position.x = finalX;
        this.mesh.position.y = finalY;
        
        // 更新配置
        this.config.positionX = finalX;
        this.config.positionY = finalY;
        
        // 不再更新推子（已移除Position X/Y推子）
    }

    updateRendererSize() {
        if (!this.renderer || !this.container) return;
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;
        this.renderer.setSize(width, height, false);
        this.canvas.width = width;
        this.canvas.height = height;
        if (this.camera) {
            this.camera.aspect = this.getAspect();
            this.camera.updateProjectionMatrix();
        }
        if (this.uniforms) {
            this.uniforms.uResolution.value.set(width, height);
            // 如果 mesh 已创建，重新计算平面大小（保持原始宽高比，等比例缩放）
            if (this.mesh && this.uniforms.uTexture.value && this.imageAspect) {
                const aspect = this.imageAspect; // 使用保存的原始宽高比
                let planeWidth, planeHeight;
                
                // 计算相机的视野尺寸
                const fov = this.camera.fov * (Math.PI / 180);
                const distance = this.camera.position.z;
                const viewHeight = 2 * distance * Math.tan(fov / 2);
                const viewWidth = viewHeight * this.getAspect();
                
                // 根据视野尺寸和图片宽高比，计算合适的画布尺寸
                // 确保画布完整显示在视野内，保持原始宽高比，等比例缩放
                const scale = 0.475; // 缩小到一半
                if (aspect > this.getAspect()) {
                    // 图片更宽，以视野宽度为准，保持原始宽高比
                    planeWidth = viewWidth * scale;
                    planeHeight = planeWidth / aspect;
                } else {
                    // 图片更高，以视野高度为准，保持原始宽高比
                    planeHeight = viewHeight * scale;
                    planeWidth = planeHeight * aspect;
                }
                
                // 创建新几何体并替换，保持原始宽高比
                const newGeometry = new THREE.PlaneGeometry(planeWidth, planeHeight, 160, 160);
                this.mesh.geometry.dispose();
                this.mesh.geometry = newGeometry;
                
                // 窗口大小改变后，保持当前位置，不自动对齐
                // 这样用户可以继续使用之前调整好的位置
            }
        }
    }

    bindPointerEvents() {
        if (!this.canvas) return;
        
        // 鼠标按下 - 开始拖拽
        this.canvas.addEventListener('mousedown', (event) => {
            if (event.button !== 0) return; // 只响应左键
            this.isDragging = true;
            this.dragStart = {
                x: event.clientX,
                y: event.clientY
            };
            // 保存拖拽开始时的mesh位置
            if (this.mesh) {
                this.dragStartPosition = {
                    x: this.mesh.position.x,
                    y: this.mesh.position.y
                };
            }
            this.canvas.style.cursor = 'grabbing';
        });

        // 鼠标移动 - 处理拖拽和3D视角效果
        this.canvas.addEventListener('mousemove', (event) => {
            // 如果正在拖拽，更新位置
            if (this.isDragging && this.dragStart && this.mesh) {
                const rect = this.canvas.getBoundingClientRect();
                const deltaX = event.clientX - this.dragStart.x;
                const deltaY = event.clientY - this.dragStart.y;
                
                // 将像素偏移转换为场景单位
                const fov = this.camera.fov * (Math.PI / 180);
                const distance = this.camera.position.z;
                const viewHeight = 2 * distance * Math.tan(fov / 2);
                const viewWidth = viewHeight * this.getAspect();
                
                // 计算场景单位偏移（向右为正，向上为正）
                const offsetX = (deltaX / rect.width) * viewWidth;
                const offsetY = -(deltaY / rect.height) * viewHeight; // Y轴反转
                
                // 更新mesh位置
                const newX = this.dragStartPosition.x + offsetX;
                const newY = this.dragStartPosition.y + offsetY;
                
                this.mesh.position.x = newX;
                this.mesh.position.y = newY;
                
                // 更新配置（不再更新推子，已移除Position X/Y推子）
                this.config.positionX = newX;
                this.config.positionY = newY;
            } else if (this.mouse) {
                // 如果不在拖拽，更新3D视角效果
                const rect = this.canvas.getBoundingClientRect();
                const x = (event.clientX - rect.left) / rect.width;
                const y = (event.clientY - rect.top) / rect.height;
                this.mouse.set(x * 2 - 1, -(y * 2 - 1));
            }
        });

        // 鼠标离开 - 重置3D视角
        this.canvas.addEventListener('mouseleave', () => {
            if (this.mouse) {
                this.mouse.set(0, 0);
            }
            // 如果正在拖拽，结束拖拽
            if (this.isDragging) {
                this.isDragging = false;
                this.canvas.style.cursor = 'grab';
            }
        });

        // 鼠标释放 - 结束拖拽
        this.canvas.addEventListener('mouseup', (event) => {
            if (event.button !== 0) return; // 只响应左键
            if (this.isDragging) {
                this.isDragging = false;
                this.canvas.style.cursor = 'grab';
            }
        });

        // 滚轮缩放
        this.canvas.addEventListener('wheel', (event) => {
            event.preventDefault();
            const delta = event.deltaY * 0.0015;
            const newZoom = clamp(this.targetZoom + delta, this.minZoom, this.maxZoom);
            this.targetZoom = newZoom;
            this.config.zoom = newZoom;
            // 同步更新推子
            const zoomSlider = this.sliders.zoom;
            if (zoomSlider) {
                zoomSlider.value = newZoom;
            }
        }, { passive: false });
        
        // 设置初始光标样式
        this.canvas.style.cursor = 'grab';
        
        // 使用防抖优化窗口大小调整
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                this.updateRendererSize();
            }, 100);
        });
    }

    loadStarryNightTexture() {
        const loader = new THREE.TextureLoader();
        const sources = this.getTextureSources();
        const attemptLoad = (index) => {
            if (index >= sources.length) {
                console.error('Unable to load Starry Night texture.');
                if (this.loadingEl) {
                    this.loadingEl.textContent = 'Failed to load image';
                    // 即使失败也隐藏加载提示，避免一直显示
                    setTimeout(() => {
                        if (this.loadingEl) {
                            this.loadingEl.style.opacity = '0';
                            setTimeout(() => {
                                if (this.loadingEl) {
                                    this.loadingEl.style.display = 'none';
                                }
                            }, 600);
                        }
                    }, 2000);
                }
                return;
            }
            loader.load(
                sources[index],
                (texture) => this.onTextureLoaded(texture),
                undefined,
                (err) => {
                    console.warn(`Failed to load texture from source ${index}:`, sources[index], err);
                    attemptLoad(index + 1);
                }
            );
        };
        attemptLoad(0);
    }

    getTextureSources() {
        const sources = [];
        // 优先使用本地图片文件
        sources.push('starry-night.jpg');
        // 然后尝试 base64 数据（如果可用）
        if (typeof STARRY_NIGHT_B64 !== 'undefined' && STARRY_NIGHT_B64) {
            sources.push(STARRY_NIGHT_B64);
        }
        // 最后使用网络备用图片
        sources.push('https://upload.wikimedia.org/wikipedia/commons/thumb/e/ea/Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg/1280px-Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg');
        return sources;
    }

    onTextureLoaded(texture) {
        // 立即隐藏加载提示，参考提供的代码
        if (this.loadingEl) {
            this.loadingEl.style.opacity = '0';
        }

        texture.colorSpace = THREE.SRGBColorSpace;
        texture.anisotropy = Math.min(8, this.renderer.capabilities.getMaxAnisotropy());

        const aspect = texture.image.width / texture.image.height;
        // 保存图片的原始宽高比，用于后续等比例缩放
        this.imageAspect = aspect;
        
        // 计算相机的视野尺寸
        const fov = this.camera.fov * (Math.PI / 180);
        const distance = this.camera.position.z;
        const viewHeight = 2 * distance * Math.tan(fov / 2);
        const viewWidth = viewHeight * this.getAspect();
        
        // 根据视野尺寸和图片宽高比，计算合适的画布尺寸
        // 确保画布完整显示在视野内，保持原始宽高比，等比例缩放
        // 使用较小的尺寸确保完整显示
        const scale = 0.475; // 缩小到一半
        let planeWidth, planeHeight;
        if (aspect > this.getAspect()) {
            // 图片更宽，以视野宽度为准，保持原始宽高比
            planeWidth = viewWidth * scale;
            planeHeight = planeWidth / aspect;
        } else {
            // 图片更高，以视野高度为准，保持原始宽高比
            planeHeight = viewHeight * scale;
            planeWidth = planeHeight * aspect;
        }

        const geometry = new THREE.PlaneGeometry(planeWidth, planeHeight, 160, 160);

        this.uniforms = {
            uTime: { value: 0 },
            uTexture: { value: texture },
            uMouse: { value: new THREE.Vector2(0, 0) },
            uFlowScale: { value: 10.0 }, // 固定值，不再通过推子控制
            uFlowStrength: { value: this.config.flowStrength },
            uTwinkleStrength: { value: this.config.twinkleStrength },
            uWarpStrength: { value: 0.02 }, // 固定值，不再通过推子控制
            uAnimationSpeed: { value: this.config.animationSpeed },
            uResolution: { value: new THREE.Vector2(this.canvas.width, this.canvas.height) }
        };

        const material = new THREE.ShaderMaterial({
            vertexShader: STAR_VERTEX_SHADER,
            fragmentShader: STAR_FRAGMENT_SHADER,
            uniforms: this.uniforms,
            side: THREE.DoubleSide
        });

        this.mesh = new THREE.Mesh(geometry, material);
        this.scene.add(this.mesh);
        
        // 自动对齐窗口并校验位置
        this.autoAlignAndValidate();
        
        this.updateShaderConfig();
        this.hideLoading();
        this.animate();
    }

    animate() {
        if (!this.mesh) return;
        requestAnimationFrame(() => this.animate());
        const elapsed = this.clock.getElapsedTime();
        const damp = 0.08;

        this.uniforms.uTime.value = elapsed;
        this.targetMouse.lerp(this.mouse, 0.08);
        this.uniforms.uMouse.value.lerp(this.targetMouse, 0.2);

        // 禁用倾斜效果，保持mesh旋转为0
        this.mesh.rotation.x = 0;
        this.mesh.rotation.y = 0;
        this.mesh.rotation.z = 0;

        // 位置推子直接移动mesh的位置（真正的2D位置移动）
        this.mesh.position.x = this.config.positionX;
        this.mesh.position.y = this.config.positionY;
        this.mesh.position.z = 0;

        // 鼠标交互产生3D视角效果（通过相机位置微调）
        const mouseOffsetX = this.targetMouse.x * 0.35;
        const mouseOffsetY = -this.targetMouse.y * 0.35;
        
        this.camera.position.x += (mouseOffsetX - this.camera.position.x) * 0.04;
        this.camera.position.y += (mouseOffsetY - this.camera.position.y) * 0.04;
        this.camera.position.z += (this.targetZoom - this.camera.position.z) * 0.06;
        
        // 相机始终看向场景中心 (0, 0, 0)
        this.camera.lookAt(0, 0, 0);

        this.renderer.render(this.scene, this.camera);
    }

    updateShaderConfig() {
        if (!this.uniforms) return;
        this.uniforms.uFlowStrength.value = this.config.flowStrength;
        this.uniforms.uTwinkleStrength.value = this.config.twinkleStrength;
        this.uniforms.uAnimationSpeed.value = this.config.animationSpeed;
    }

    applyCanvasFilters() {
        if (!this.canvas) return;
        const brightness = this.getSliderValue('brightness', DEFAULT_SLIDERS.brightness);
        const contrast = this.getSliderValue('contrast', DEFAULT_SLIDERS.contrast);
        const saturation = this.getSliderValue('saturation', DEFAULT_SLIDERS.saturation);
        this.canvas.style.filter = `brightness(${brightness}) contrast(${contrast}) saturate(${saturation})`;
    }

    getSliderValue(id, fallback) {
        const slider = this.sliders[id];
        if (!slider) return fallback;
        const parsed = Number(slider.value);
        return Number.isFinite(parsed) ? parsed : fallback;
    }

    randomizeSliders() {
        // 排除这些推子：zoom
        const excludedIds = ['zoom'];
        
        // 需要特殊处理的推子（±20%范围）
        const limitedRangeSliders = ['brightness', 'contrast', 'saturation'];
        
        Object.values(this.sliders).forEach((slider) => {
            if (!slider) return;
            const sliderId = slider.id;
            
            // 跳过被排除的推子
            if (excludedIds.includes(sliderId)) return;
            
            let randomValue;
            
            // 对于 brightness、contrast、saturation，使用默认值的 ±20% 范围
            if (limitedRangeSliders.includes(sliderId)) {
                const defaultValue = DEFAULT_SLIDERS[sliderId];
                const range = defaultValue * 0.2; // 20% 范围
                const minValue = Math.max(
                    defaultValue - range,
                    Number(slider.min || slider.getAttribute('min') || 0)
                );
                const maxValue = Math.min(
                    defaultValue + range,
                    Number(slider.max || slider.getAttribute('max') || 1)
                );
                randomValue = Math.random() * (maxValue - minValue) + minValue;
            } else {
                // 其他推子使用完整范围
                const min = Number(slider.min || slider.getAttribute('min') || 0);
                const max = Number(slider.max || slider.getAttribute('max') || 1);
                randomValue = Math.random() * (max - min) + min;
            }
            
            slider.value = valueWithStep(slider, randomValue);
            slider.dispatchEvent(new Event('input'));
            // 更新显示值
            if (sliderId) {
                this.updateSliderValueDisplay(sliderId);
            }
        });
        
        // 应用画布滤镜（brightness/contrast/saturation 可能已改变）
        this.applyCanvasFilters();
    }

    resetSliders() {
        Object.values(this.sliders).forEach((slider) => {
            if (!slider) return;
            const defaultValue = slider.dataset.defaultValue;
            if (typeof defaultValue === 'undefined') return;
            slider.value = defaultValue;
            slider.dispatchEvent(new Event('input'));
            // 更新显示值
            const sliderId = slider.id;
            if (sliderId) {
                this.updateSliderValueDisplay(sliderId);
            }
        });
        this.applyCanvasFilters();
    }

    resetView() {
        if (this.mouse) this.mouse.set(0, 0);
        if (this.targetMouse) this.targetMouse.set(0, 0);
        this.targetZoom = DEFAULT_SLIDERS.zoom;
        this.config.zoom = DEFAULT_SLIDERS.zoom;
        this.config.positionX = DEFAULT_SLIDERS.positionX;
        this.config.positionY = DEFAULT_SLIDERS.positionY;
        // 同步更新推子
        const zoomSlider = this.sliders.zoom;
        if (zoomSlider) {
            zoomSlider.value = DEFAULT_SLIDERS.zoom;
            this.updateSliderValueDisplay('zoom');
        }
        // Position X/Y推子已移除，不再更新
        if (this.mesh) {
            this.mesh.rotation.set(0, 0, 0);
            // 重置mesh位置到中心
            this.mesh.position.set(0, 0, 0);
        }
        if (this.camera) {
            // 重置相机位置到中心，只保留缩放
            this.camera.position.x = 0;
            this.camera.position.y = 0;
            this.camera.position.z = this.targetZoom;
            this.camera.lookAt(0, 0, 0);
        }
    }

    toggleFullscreen() {
        const container = document.querySelector('.canvas-container');
        if (!container) return;
        if (!document.fullscreenElement) {
            container.requestFullscreen?.().then(() => {
                // 全屏后更新画布尺寸，确保按比例缩放
                setTimeout(() => {
                    this.updateRendererSize();
                }, 100);
            });
        } else {
            document.exitFullscreen?.().then(() => {
                // 退出全屏后更新画布尺寸
                setTimeout(() => {
                    this.updateRendererSize();
                }, 100);
            });
        }
    }

    hideLoading() {
        if (!this.loadingEl) return;
        this.loadingEl.style.opacity = '0';
        setTimeout(() => {
            if (this.loadingEl) {
                this.loadingEl.style.display = 'none';
            }
        }, 600);
    }
}

// 全局启动函数，由 HTML 中的脚本调用
const startExperience = () => {
    // 防止重复启动
    if (window.experienceStarted) {
        console.log('Experience already started');
        return;
    }
    
    // 确保 Three.js 已加载
    if (typeof THREE === 'undefined') {
        console.warn('Three.js not loaded yet, waiting...');
        const loadingEl = document.getElementById('canvas-loading');
        if (loadingEl) {
            loadingEl.textContent = '正在加载 Three.js...';
        }
        
        let attempts = 0;
        const maxAttempts = 100; // 最多等待 5 秒 (100 * 50ms)
        
        const checkThree = setInterval(() => {
            attempts++;
            if (typeof THREE !== 'undefined') {
                clearInterval(checkThree);
                console.log('Three.js loaded successfully');
                window.experienceStarted = true;
                new StarryNightExperience();
            } else if (attempts >= maxAttempts) {
                clearInterval(checkThree);
                console.error('Three.js failed to load after timeout');
                if (loadingEl) {
                    loadingEl.textContent = 'Three.js 加载失败，请刷新页面重试';
                }
            }
        }, 50);
        
        return;
    }
    
    // Three.js 已加载，直接启动
    console.log('Starting Starry Night Experience');
    window.experienceStarted = true;
    new StarryNightExperience();
};

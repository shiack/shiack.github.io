/**
 * 像素风都市 Banner v3
 * - 城市 1-4：单场景鼠标视差（加强倍率）
 * - 城市 5-8：横向拼接全景，多层不同速度平移，产生真实景深感
 */

(function () {

    const BASE = '/assets/images/parallax/pixel-city/';

    const CITIES = [
        { dir: 'city 1', layers: ['1.png','2.png','3.png','4.png','5.png','6.png'] },
        { dir: 'city 2', layers: ['1.png','2.png','3.png','4.png','5.png','6.png','7.png'] },
        { dir: 'city 3', layers: ['1.png','2.png','3.png','4.png','5.png','6.png'] },
        { dir: 'city 4', layers: ['1.png','2.png','3.png','4.png','5.png','7.png','8.png'] },
        // 城市 5-8：用于全景横幅
        { dir: 'city 5', layers: ['1.png','2.png','3.png','4.png','5.png','6.png'] },
        { dir: 'city 6', layers: ['1.png','2.png','3.png','4.png','5.png','6.png','7.png'] },
        { dir: 'city 7', layers: ['1.png','2.png','3.png','4.png','5.png','6.png'] },
        { dir: 'city 8', layers: ['1.png','2.png','3.png','4.png','5.png','6.png'] },
    ];

    const SINGLE_CITIES   = CITIES.slice(0, 4);
    const PANORAMA_CITIES = CITIES.slice(4);        // 4 座城市拼全景

    // 均匀分配深度值：远→近，0.04 ~ 0.90
    function assignDepths(count) {
        return Array.from({ length: count }, (_, i) =>
            parseFloat((0.04 + 0.86 / (count - 1) * i).toFixed(3))
        );
    }

    const SCENE_DURATION    = 10000;   // 单城市展示时长 ms
    const PANORAMA_DURATION = 24000;   // 全景展示时长 ms

    // ─── 全景速度因子：从远到近，0.04（天空几乎不动）→ 0.95（地面大幅移动）
    function assignSpeeds(count) {
        return Array.from({ length: count }, (_, i) =>
            parseFloat((0.04 + 0.91 / (count - 1) * i).toFixed(3))
        );
    }

    // ─────────────────────────────────────────────────────────────────────────

    class PixelBanner {
        constructor(containerId) {
            this.wrap = document.getElementById(containerId);
            if (!this.wrap) return;

            this.isReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
            this.currentIndex    = 0;
            this.timer           = null;
            this.scenes          = [];
            this.dots            = [];

            // 全景状态
            this.panoramaLayers  = [];
            this.panoramaEl      = null;
            this.panoramaRAF     = null;
            this.isHovering      = false;
            this.cameraX         = 0;      // 0=最左 1=最右
            this.targetCameraX   = 0;
            this.cameraDir       = 1;

            this._render();
            this._bindEvents();
            this._activateScene(0, false);
            this._startAutoSwitch();
        }

        get totalScenes() { return SINGLE_CITIES.length + 1; }   // 4 + 1全景

        // ── 渲染 ──────────────────────────────────────────────────────────────

        _render() {
            this.wrap.innerHTML = '';

            // 场景 0-3：单城市
            SINGLE_CITIES.forEach((city, ci) => {
                const depths = assignDepths(city.layers.length);
                const scene  = document.createElement('div');
                scene.className   = 'pixel-scene';
                scene.dataset.idx = ci;

                city.layers.forEach((file, li) => {
                    const div = document.createElement('div');
                    div.className     = 'pixel-layer';
                    div.dataset.depth = depths[li];
                    div.style.backgroundImage =
                        `url('${BASE}${encodeURIComponent(city.dir)}/${file}')`;
                    scene.appendChild(div);
                });

                this.wrap.appendChild(scene);
                this.scenes.push(scene);
            });

            // 场景 4：全景
            this._buildPanorama();

            // 指示器
            const bar = document.createElement('div');
            bar.className = 'pixel-indicators';

            for (let i = 0; i < SINGLE_CITIES.length; i++) {
                const btn = document.createElement('button');
                btn.className   = 'pixel-dot';
                btn.dataset.idx = i;
                btn.setAttribute('aria-label', `城市 ${i + 1}`);
                bar.appendChild(btn);
            }

            // 全景指示器：宽矩形暗示横向滚动
            const pbtn = document.createElement('button');
            pbtn.className   = 'pixel-dot pixel-dot-pano';
            pbtn.dataset.idx = SINGLE_CITIES.length;
            pbtn.setAttribute('aria-label', '城市全景');
            bar.appendChild(pbtn);

            this.wrap.appendChild(bar);
            this.dots = [...bar.querySelectorAll('.pixel-dot')];
        }

        _buildPanorama() {
            const numLayers = Math.min(...PANORAMA_CITIES.map(c => c.layers.length));  // 6
            const speeds    = assignSpeeds(numLayers);

            const el = document.createElement('div');
            el.className   = 'pixel-scene pixel-panorama-scene';
            el.dataset.idx = SINGLE_CITIES.length;

            for (let li = 0; li < numLayers; li++) {
                const layer = document.createElement('div');
                layer.className     = 'panorama-layer';
                layer.dataset.speed = speeds[li];
                // 速度标注，方便调试
                layer.dataset.layerIdx = li;

                for (const city of PANORAMA_CITIES) {
                    const slot = document.createElement('div');
                    slot.className = 'city-slot';
                    slot.style.backgroundImage =
                        `url('${BASE}${encodeURIComponent(city.dir)}/${city.layers[li]}')`;
                    layer.appendChild(slot);
                }

                el.appendChild(layer);
            }

            this.panoramaEl     = el;
            this.panoramaLayers = [...el.querySelectorAll('.panorama-layer')];
            this.wrap.appendChild(el);
            this.scenes.push(el);
        }

        // ── 场景切换 ──────────────────────────────────────────────────────────

        _activateScene(index) {
            const prev = this.currentIndex;
            this.currentIndex = index;

            this.scenes.forEach((s, i) => s.classList.toggle('active', i === index));
            this.dots.forEach((d, i)   => d.classList.toggle('active', i === index));

            // 清理上一个场景
            if (prev < SINGLE_CITIES.length) {
                this._resetSingleLayers(prev);
            } else {
                this._stopPanorama();
            }

            // 启动新场景
            if (index === SINGLE_CITIES.length) {
                this._startPanoramaLoop();
            }
        }

        _startAutoSwitch() {
            clearTimeout(this.timer);
            const dur = this.currentIndex === SINGLE_CITIES.length
                ? PANORAMA_DURATION : SCENE_DURATION;
            this.timer = setTimeout(() => {
                this._activateScene((this.currentIndex + 1) % this.totalScenes);
                this._startAutoSwitch();
            }, dur);
        }

        // ── 单城市鼠标视差 ───────────────────────────────────────────────────

        _applySingleParallax(e) {
            const rect = this.wrap.getBoundingClientRect();
            const mx   = (e.clientX - rect.left) / rect.width  - 0.5;
            const my   = (e.clientY - rect.top)  / rect.height - 0.5;

            this.scenes[this.currentIndex]
                .querySelectorAll('.pixel-layer')
                .forEach(el => {
                    const d  = parseFloat(el.dataset.depth);
                    // 倍率提升到 65px/28px，让近层与远层的位移差异明显可见
                    const tx = -mx * d * 65;
                    const ty = -my * d * 28;
                    el.style.transform = `translate3d(${tx}px,${ty}px,0)`;
                });
        }

        _resetSingleLayers(index) {
            this.scenes[index]
                ?.querySelectorAll('.pixel-layer')
                .forEach(el => { el.style.transform = 'translate3d(0,0,0)'; });
        }

        // ── 全景：rAF 驱动横向平移 ───────────────────────────────────────────

        _startPanoramaLoop() {
            if (this.isReducedMotion) return;
            let last = performance.now();

            const tick = (now) => {
                const dt = Math.min((now - last) / 1000, 0.05);
                last = now;

                if (this.isHovering) {
                    // 平滑追随鼠标位置
                    this.cameraX += (this.targetCameraX - this.cameraX) * Math.min(dt * 4.5, 1);
                } else {
                    // 自动左右往返扫描，约 20s 完成单程
                    this.cameraX += dt * 0.05 * this.cameraDir;
                    if (this.cameraX >= 1) { this.cameraX = 1; this.cameraDir = -1; }
                    if (this.cameraX <= 0) { this.cameraX = 0; this.cameraDir =  1; }
                }

                this._applyPanoramaTransforms();
                this.panoramaRAF = requestAnimationFrame(tick);
            };

            this.panoramaRAF = requestAnimationFrame(tick);
        }

        _stopPanorama() {
            cancelAnimationFrame(this.panoramaRAF);
            this.panoramaRAF = null;
        }

        _applyPanoramaTransforms() {
            const bw = this.wrap.offsetWidth;
            const n  = PANORAMA_CITIES.length;     // 4

            this.panoramaLayers.forEach(layer => {
                const speed = parseFloat(layer.dataset.speed);
                // 近层（speed≈0.95）：平移量 ≈ 3 × bannerWidth → 清晰展示 4 座城市
                // 远层（speed≈0.04）：平移量 ≈ 0.12 × bannerWidth → 天空几乎静止
                // 两者叠加：强烈景深纵深感
                const offset = -this.cameraX * (n - 1) * bw * speed;
                layer.style.transform = `translateX(${offset}px)`;
            });
        }

        // ── 事件 ──────────────────────────────────────────────────────────────

        _bindEvents() {
            if (!this.isReducedMotion) {
                this.wrap.addEventListener('mousemove', e => {
                    if (this.currentIndex < SINGLE_CITIES.length) {
                        this._applySingleParallax(e);
                    } else {
                        const rect = this.wrap.getBoundingClientRect();
                        this.isHovering    = true;
                        this.targetCameraX = (e.clientX - rect.left) / rect.width;
                    }
                });

                this.wrap.addEventListener('mouseleave', () => {
                    this.isHovering = false;
                    if (this.currentIndex < SINGLE_CITIES.length) {
                        this._resetSingleLayers(this.currentIndex);
                    }
                    // 全景：isHovering=false，自动扫描从当前位置接管
                });
            }

            this.dots.forEach((btn, i) => {
                btn.addEventListener('click', () => {
                    this._activateScene(i);
                    this._startAutoSwitch();
                });
            });
        }

        destroy() {
            clearTimeout(this.timer);
            this._stopPanorama();
        }
    }

    document.addEventListener('DOMContentLoaded', () => {
        if (document.getElementById('pixel-banner-container')) {
            window.pixelBanner = new PixelBanner('pixel-banner-container');
        }
    });

})();

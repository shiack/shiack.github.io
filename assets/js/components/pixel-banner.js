/**
 * 像素风都市 Banner v2
 * 8个城市变体轮播，每个城市 6-7 层 PNG 视差
 * Banner 随页面自然滚动，导航栏 sticky 固定
 */

(function () {

    const BASE = '/assets/images/parallax/pixel-city/';

    // 8个城市，层文件列表（已排除合图预览），depth从小到大=远到近
    const CITIES = [
        { dir: 'city 1', layers: ['1.png','2.png','3.png','4.png','5.png','6.png'] },
        { dir: 'city 2', layers: ['1.png','2.png','3.png','4.png','5.png','6.png','7.png'] },
        { dir: 'city 3', layers: ['1.png','2.png','3.png','4.png','5.png','6.png'] },
        { dir: 'city 4', layers: ['1.png','2.png','3.png','4.png','5.png','7.png','8.png'] },
        { dir: 'city 5', layers: ['1.png','2.png','3.png','4.png','5.png','6.png'] },
        { dir: 'city 6', layers: ['1.png','2.png','3.png','4.png','5.png','6.png','7.png'] },
        { dir: 'city 7', layers: ['1.png','2.png','3.png','4.png','5.png','6.png'] },
        { dir: 'city 8', layers: ['1.png','2.png','3.png','4.png','5.png','6.png'] },
    ];

    // depth 分配：层数不固定，均匀分布在 0.04 ~ 0.90
    function assignDepths(count) {
        return Array.from({ length: count }, (_, i) =>
            parseFloat((0.04 + (0.86 / (count - 1)) * i).toFixed(3))
        );
    }

    const SCENE_DURATION = 10000; // 每个城市展示时长 ms
    const FADE_DURATION  = 1200;  // 淡入淡出时长 ms

    class PixelBanner {
        constructor(containerId) {
            this.wrap = document.getElementById(containerId);
            if (!this.wrap) return;

            this.isReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
            this.currentIndex    = 0;
            this.timer           = null;
            this.scenes          = [];

            this._render();
            this._bindEvents();
            this._activateScene(0, false);
            this._startAutoSwitch();
        }

        // ── 渲染 ──────────────────────────────────────────────────────

        _render() {
            this.wrap.innerHTML = '';

            CITIES.forEach((city, ci) => {
                const depths = assignDepths(city.layers.length);
                const scene  = document.createElement('div');
                scene.className   = 'pixel-scene';
                scene.dataset.idx = ci;

                city.layers.forEach((file, li) => {
                    const div = document.createElement('div');
                    div.className = 'pixel-layer';
                    div.dataset.depth = depths[li];
                    // URL encode 目录名中的空格
                    const url = `${BASE}${encodeURIComponent(city.dir)}/${file}`;
                    div.style.backgroundImage = `url('${url}')`;
                    scene.appendChild(div);
                });

                this.wrap.appendChild(scene);
                this.scenes.push(scene);
            });

            // 指示器
            const dots = document.createElement('div');
            dots.className = 'pixel-indicators';
            CITIES.forEach((_, i) => {
                const btn = document.createElement('button');
                btn.className   = 'pixel-dot';
                btn.dataset.idx = i;
                btn.setAttribute('aria-label', `城市 ${i + 1}`);
                dots.appendChild(btn);
            });
            this.wrap.appendChild(dots);
            this.dots = [...dots.querySelectorAll('.pixel-dot')];
        }

        // ── 场景切换 ──────────────────────────────────────────────────

        _activateScene(index, animate = true) {
            const prev = this.currentIndex;
            this.currentIndex = index;

            this.scenes.forEach((s, i) => s.classList.toggle('active', i === index));
            this.dots.forEach((d, i)   => d.classList.toggle('active', i === index));

            this._resetLayers(this.scenes[prev]);
        }

        _startAutoSwitch() {
            clearTimeout(this.timer);
            this.timer = setTimeout(() => {
                const next = (this.currentIndex + 1) % CITIES.length;
                this._activateScene(next);
                this._startAutoSwitch();
            }, SCENE_DURATION);
        }

        // ── 鼠标视差 ──────────────────────────────────────────────────

        _bindEvents() {
            if (!this.isReducedMotion) {
                this.wrap.addEventListener('mousemove', e => this._onMouseMove(e));
                this.wrap.addEventListener('mouseleave', () => {
                    this._resetLayers(this.scenes[this.currentIndex]);
                });
            }

            this.dots.forEach((btn, i) => {
                btn.addEventListener('click', () => {
                    this._activateScene(i);
                    this._startAutoSwitch();
                });
            });
        }

        _onMouseMove(e) {
            const rect = this.wrap.getBoundingClientRect();
            const mx   = (e.clientX - rect.left)  / rect.width  - 0.5;
            const my   = (e.clientY - rect.top)   / rect.height - 0.5;

            const scene = this.scenes[this.currentIndex];
            scene.querySelectorAll('.pixel-layer').forEach(el => {
                const d  = parseFloat(el.dataset.depth);
                const tx = -mx * d * 38;
                const ty = -my * d * 18;
                el.style.transform = `translate3d(${tx}px,${ty}px,0)`;
            });
        }

        _resetLayers(scene) {
            if (!scene) return;
            scene.querySelectorAll('.pixel-layer').forEach(el => {
                el.style.transform = 'translate3d(0,0,0)';
            });
        }

        destroy() {
            clearTimeout(this.timer);
        }
    }

    document.addEventListener('DOMContentLoaded', () => {
        if (document.getElementById('pixel-banner-container')) {
            window.pixelBanner = new PixelBanner('pixel-banner-container');
        }
    });

})();

/**
 * 像素风视差 Banner — City 6 六层视差
 *
 * 核心原理：background-position-x + repeat-x 无限横向滚动。
 * 每层在固定容器内以不同速度移动背景图，不是整体位移，
 * 所以层间相对运动清晰可见。
 *
 * 图层说明（city 6 共8张，7.png/8.png 是合成图，不参与视差）：
 *   1.png = 天空（100% 不透明，最远最慢）
 *   2-6.png = 各层建筑（含透明区域，速度递增，可透过看天空）
 *
 * 速度分布（0.05 → 1.00，二次曲线，20:1）：
 *   layer0(天空)  0.05 — 几乎静止
 *   layer5(前景)  1.00 — 全速跟随鼠标
 */

(function () {

    const BASE   = '/assets/images/parallax/pixel-city/';
    const CITY   = 'city 6';
    // 1.png = 天空/最远层  →  6.png = 最近前景层
    // 7.png / 8.png 是所有层合成的完整图（全不透明），不加入视差栈
    const LAYERS = ['1.png','2.png','3.png','4.png','5.png','6.png'];
    const N      = LAYERS.length;

    // 二次曲线速度：[0.05, 0.09, 0.24, 0.43, 0.66, 1.00]（20:1 比例，层次感明显）
    const SPEEDS = LAYERS.map((_, i) => {
        const t = i / (N - 1);
        return +(0.05 + 0.95 * t * t).toFixed(3);
    });

    // 亮度提示：远层暗(0.60)→近层亮(1.00)，增强大气纵深感
    const BRIGHTNESS = LAYERS.map((_, i) => +(0.60 + 0.40 * (i / (N - 1))).toFixed(2));

    // 鼠标在边缘时，最近层（speed=1.0）的最大背景偏移量
    const MAX_OFFSET = 500; // px

    // 自动滚动时最近层的速度（px/s）
    const AUTO_SPEED = 45;

    class PixelBanner {
        constructor(containerId) {
            this.wrap = document.getElementById(containerId);
            if (!this.wrap) return;

            this.isReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
            this.layerEls   = [];
            this.raf        = null;
            this.hovering   = false;
            // 当前各层的 bg-position-x 偏移量（px）
            this.offset     = 0;      // 自动滚动累计量（最近层速度计量）
            this.mouseOffset = 0;     // 鼠标映射到的目标偏移（最近层）
            this.displayOff = 0;      // 当前插值后的偏移（最近层）

            this._render();
            this._bindEvents();
            this._startLoop();
        }

        // ── 渲染 ──────────────────────────────────────────────────────────────

        _render() {
            this.wrap.innerHTML = '';
            const scene = document.createElement('div');
            scene.className = 'pixel-parallax-scene';

            LAYERS.forEach((file, i) => {
                const layer = document.createElement('div');
                layer.className = 'pixel-depth-layer';
                layer.style.backgroundImage =
                    `url('${BASE}${encodeURIComponent(CITY)}/${file}')`;
                layer.style.zIndex = i + 1;
                // 亮度深度提示
                if (BRIGHTNESS[i] < 1) {
                    layer.style.filter = `brightness(${BRIGHTNESS[i]})`;
                }
                scene.appendChild(layer);
                this.layerEls.push(layer);
            });

            // 氛围叠加（高 z-index，不参与视差）
            ['banner-fade-top', 'banner-fade-bottom', 'banner-vignette'].forEach(cls => {
                const el = document.createElement('div');
                el.className = cls;
                scene.appendChild(el);
            });

            this.wrap.appendChild(scene);
        }

        // ── 主循环 ────────────────────────────────────────────────────────────

        _startLoop() {
            if (this.isReducedMotion) {
                this._applyPositions(0);
                return;
            }
            let last = performance.now();

            const tick = (now) => {
                const dt = Math.min((now - last) / 1000, 0.05);
                last = now;

                if (this.hovering) {
                    // 鼠标模式：直接映射鼠标X到偏移，lerp 平滑追踪
                    this.displayOff +=
                        (this.mouseOffset - this.displayOff) * Math.min(dt * 7, 1);
                } else {
                    // 自动模式：近层以 AUTO_SPEED px/s 持续向左滚动，并平滑接管
                    this.offset += AUTO_SPEED * dt;
                    this.displayOff +=
                        (-this.offset - this.displayOff) * Math.min(dt * 2.5, 1);
                }

                this._applyPositions(this.displayOff);
                this.raf = requestAnimationFrame(tick);
            };

            this.raf = requestAnimationFrame(tick);
        }

        /**
         * 将"最近层偏移量"按各层速度比例分配到 background-position-x。
         * 因 background-repeat:repeat-x，偏移可无限累积，不会露出边缘。
         * @param {number} nearOffset - 最近层（speed=1.0）的当前偏移 px
         */
        _applyPositions(nearOffset) {
            this.layerEls.forEach((el, i) => {
                const px = nearOffset * SPEEDS[i];
                // calc(50% + px) 让图片从居中位置开始偏移，负值向左
                el.style.backgroundPositionX = `calc(50% + ${px.toFixed(1)}px)`;
            });
        }

        // ── 事件 ──────────────────────────────────────────────────────────────

        _bindEvents() {
            if (this.isReducedMotion) return;

            this.wrap.addEventListener('mousemove', e => {
                const r = this.wrap.getBoundingClientRect();
                // 鼠标从左到右 → 偏移从 -MAX_OFFSET 到 +MAX_OFFSET
                const nx = (e.clientX - r.left) / r.width - 0.5; // -0.5 ~ 0.5
                this.mouseOffset = nx * MAX_OFFSET * 2;
                this.hovering = true;
            });

            this.wrap.addEventListener('mouseleave', () => {
                this.hovering = false;
                // 离开时，自动模式从当前 displayOff 平滑接管
                // 让 offset 对齐到 displayOff，避免跳变
                this.offset = -this.displayOff;
            });
        }

        destroy() { cancelAnimationFrame(this.raf); }
    }

    document.addEventListener('DOMContentLoaded', () => {
        if (document.getElementById('pixel-banner-container')) {
            window.pixelBanner = new PixelBanner('pixel-banner-container');
        }
    });

})();

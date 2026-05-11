/**
 * 视差横幅 Banner 组件 v3
 *
 * 场景 1：赛博都市雨夜 — 实拍航拍夜景 + 霓虹街道 screen 混合 + Canvas 雨效
 * 场景 2-5：森林四季 — 实拍森林 × 3 深度（远景/中景/暗色前景轮廓）+ Canvas 粒子
 */

class ParallaxBanner {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        if (!this.container) return;

        this.scenes = [
            { id: 'cyberpunk',     duration: 14000, name: '赛博都市' },
            { id: 'forest-spring', duration: 11000, name: '森林春季' },
            { id: 'forest-summer', duration: 11000, name: '森林夏季' },
            { id: 'forest-autumn', duration: 11000, name: '森林秋季' },
            { id: 'forest-winter', duration: 11000, name: '森林冬季' },
        ];

        const CP = '/assets/images/parallax/cyberpunk/';
        const FP = '/assets/images/parallax/forest/';

        // Cyberpunk: real photo base + neon street screen overlay + CSS atmosphere
        // { src } = photo layer  |  { gradient } = CSS gradient layer
        this.cyberLayers = [
            { src: `${CP}bg.jpg`,
              depth: 0.05, blend: 'normal', opacity: 1.0, filter: '' },
            { gradient: 'linear-gradient(to bottom, rgba(8,4,32,0.62) 0%, rgba(18,8,48,0.30) 45%, transparent 100%)',
              depth: 0.12, blend: 'normal', opacity: 1.0, filter: '' },
            { src: `${CP}street.jpg`,
              depth: 0.28, blend: 'screen',  opacity: 0.52, filter: '' },
            { gradient: 'radial-gradient(ellipse 85% 55% at 50% 100%, rgba(200,0,100,0.32) 0%, transparent 70%)',
              depth: 0.43, blend: 'normal', opacity: 1.0, filter: '' },
            { gradient: 'radial-gradient(ellipse 60% 40% at 28% 78%, rgba(0,180,220,0.20) 0%, transparent 65%)',
              depth: 0.56, blend: 'normal', opacity: 1.0, filter: '' },
            { gradient: 'linear-gradient(to top, rgba(4,2,16,0.88) 0%, rgba(4,2,16,0.22) 28%, transparent 55%)',
              depth: 0.76, blend: 'normal', opacity: 1.0, filter: '' },
        ];

        // Forest: bg.jpg at 3 depths with different filters creates real parallax layering
        // Far distance → sharper & brighter; near distance → blurred or silhouette-dark
        this.forestSceneConfigs = {
            spring: [
                { src: `${FP}spring/bg.jpg`,
                  depth: 0.05, blend: 'normal', opacity: 1.0,  filter: '' },
                { gradient: 'linear-gradient(to bottom, rgba(255,200,220,0.28) 0%, rgba(255,235,240,0.14) 38%, transparent 68%)',
                  depth: 0.15, blend: 'normal', opacity: 1.0,  filter: '' },
                { src: `${FP}spring/bg.jpg`,
                  depth: 0.34, blend: 'normal', opacity: 0.88, filter: 'blur(2.5px) brightness(0.88) saturate(1.25)' },
                { gradient: 'radial-gradient(ellipse 115% 65% at 50% 65%, rgba(255,155,180,0.18) 0%, transparent 72%)',
                  depth: 0.50, blend: 'normal', opacity: 1.0,  filter: '' },
                { src: `${FP}spring/bg.jpg`,
                  depth: 0.70, blend: 'normal', opacity: 0.88, filter: 'brightness(0.20) contrast(1.45) saturate(0.45)' },
                { gradient: 'linear-gradient(to top, rgba(18,38,18,0.68) 0%, transparent 42%)',
                  depth: 0.83, blend: 'normal', opacity: 1.0,  filter: '' },
                { gradient: 'radial-gradient(ellipse 130% 100% at 50% 50%, transparent 32%, rgba(0,0,0,0.42) 100%)',
                  depth: 0.91, blend: 'normal', opacity: 1.0,  filter: '' },
            ],
            summer: [
                { src: `${FP}summer/bg.jpg`,
                  depth: 0.05, blend: 'normal', opacity: 1.0,  filter: '' },
                { gradient: 'linear-gradient(to bottom, rgba(140,220,70,0.18) 0%, rgba(210,240,110,0.10) 38%, transparent 68%)',
                  depth: 0.15, blend: 'normal', opacity: 1.0,  filter: '' },
                { src: `${FP}summer/bg.jpg`,
                  depth: 0.34, blend: 'normal', opacity: 0.88, filter: 'blur(2.5px) brightness(0.85) saturate(1.30)' },
                { gradient: 'radial-gradient(ellipse 115% 65% at 50% 65%, rgba(100,200,55,0.16) 0%, transparent 72%)',
                  depth: 0.50, blend: 'normal', opacity: 1.0,  filter: '' },
                { src: `${FP}summer/bg.jpg`,
                  depth: 0.70, blend: 'normal', opacity: 0.88, filter: 'brightness(0.18) contrast(1.55) saturate(0.45)' },
                { gradient: 'linear-gradient(to top, rgba(8,32,8,0.72) 0%, transparent 42%)',
                  depth: 0.83, blend: 'normal', opacity: 1.0,  filter: '' },
                { gradient: 'radial-gradient(ellipse 130% 100% at 50% 50%, transparent 32%, rgba(0,0,0,0.42) 100%)',
                  depth: 0.91, blend: 'normal', opacity: 1.0,  filter: '' },
            ],
            autumn: [
                { src: `${FP}autumn/bg.jpg`,
                  depth: 0.05, blend: 'normal', opacity: 1.0,  filter: '' },
                { gradient: 'linear-gradient(to bottom, rgba(200,95,18,0.24) 0%, rgba(240,155,28,0.12) 38%, transparent 68%)',
                  depth: 0.15, blend: 'normal', opacity: 1.0,  filter: '' },
                { src: `${FP}autumn/bg.jpg`,
                  depth: 0.34, blend: 'normal', opacity: 0.90, filter: 'blur(2.5px) brightness(0.88) saturate(1.30)' },
                { gradient: 'radial-gradient(ellipse 115% 65% at 50% 65%, rgba(220,75,18,0.20) 0%, transparent 72%)',
                  depth: 0.50, blend: 'normal', opacity: 1.0,  filter: '' },
                { src: `${FP}autumn/bg.jpg`,
                  depth: 0.70, blend: 'normal', opacity: 0.88, filter: 'brightness(0.20) contrast(1.50) saturate(0.38)' },
                { gradient: 'linear-gradient(to top, rgba(48,14,4,0.72) 0%, transparent 42%)',
                  depth: 0.83, blend: 'normal', opacity: 1.0,  filter: '' },
                { gradient: 'radial-gradient(ellipse 130% 100% at 50% 50%, transparent 32%, rgba(0,0,0,0.42) 100%)',
                  depth: 0.91, blend: 'normal', opacity: 1.0,  filter: '' },
            ],
            winter: [
                { src: `${FP}winter/bg.jpg`,
                  depth: 0.05, blend: 'normal', opacity: 1.0,  filter: '' },
                { gradient: 'linear-gradient(to bottom, rgba(175,205,238,0.22) 0%, rgba(205,225,255,0.12) 38%, transparent 68%)',
                  depth: 0.15, blend: 'normal', opacity: 1.0,  filter: '' },
                { src: `${FP}winter/bg.jpg`,
                  depth: 0.34, blend: 'normal', opacity: 0.88, filter: 'blur(2.5px) brightness(0.90) saturate(0.82)' },
                { gradient: 'radial-gradient(ellipse 115% 65% at 50% 65%, rgba(175,208,240,0.18) 0%, transparent 72%)',
                  depth: 0.50, blend: 'normal', opacity: 1.0,  filter: '' },
                { src: `${FP}winter/bg.jpg`,
                  depth: 0.70, blend: 'normal', opacity: 0.88, filter: 'brightness(0.26) contrast(1.35) saturate(0.28)' },
                { gradient: 'linear-gradient(to top, rgba(8,18,38,0.68) 0%, transparent 42%)',
                  depth: 0.83, blend: 'normal', opacity: 1.0,  filter: '' },
                { gradient: 'radial-gradient(ellipse 130% 100% at 50% 50%, transparent 32%, rgba(0,0,0,0.42) 100%)',
                  depth: 0.91, blend: 'normal', opacity: 1.0,  filter: '' },
            ],
        };

        this.currentSceneIndex = 0;
        this.autoSwitchTimer   = null;
        this.rainRAF           = null;
        this.particleRAFs      = {};
        this.isReducedMotion   = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        this._mouseBound       = (e) => this._handleMouseMove(e);
        this._leaveBound       = ()  => this._resetParallax();

        this._init();
    }

    // ─── Init ────────────────────────────────────────────────────────────────

    _init() {
        this._render();
        this._bindEvents();
        this._activateScene(0, false);
        this._startAutoSwitch();
    }

    // ─── Render ──────────────────────────────────────────────────────────────

    _render() {
        const html = `
            <div class="parallax-banner" role="region" aria-label="视差横幅">
                ${this._renderCyberpunkScene()}
                ${['spring', 'summer', 'autumn', 'winter'].map(s => this._renderForestScene(s)).join('')}
                ${this._renderIndicators()}
            </div>`;
        this.container.innerHTML = html;

        this.bannerEl      = this.container.querySelector('.parallax-banner');
        this.sceneEls      = [...this.container.querySelectorAll('.banner-scene')];
        this.indicatorEls  = [...this.container.querySelectorAll('.indicator')];
    }

    _layerStyle(l) {
        const bg = l.src
            ? `background-image:url('${l.src}');background-size:cover;background-position:center center;background-repeat:no-repeat;`
            : `background:${l.gradient};`;
        return `${bg}mix-blend-mode:${l.blend};opacity:${l.opacity};${l.filter ? `filter:${l.filter};` : ''}`;
    }

    _renderCyberpunkScene() {
        const layers = this.cyberLayers.map(l => `
            <div class="parallax-layer" data-depth="${l.depth}" style="${this._layerStyle(l)}"></div>`
        ).join('');

        return `
            <div class="banner-scene" data-scene="cyberpunk">
                ${layers}
                <div class="parallax-layer" data-depth="0.90" style="pointer-events:none">
                    <canvas class="rain-canvas" id="rain-canvas"></canvas>
                    <div class="rain-fog"></div>
                </div>
            </div>`;
    }

    _renderForestScene(season) {
        const cfg = this.forestSceneConfigs[season] || [];
        const layers = cfg.map(l => `
            <div class="parallax-layer" data-depth="${l.depth}" style="${this._layerStyle(l)}"></div>`
        ).join('');

        return `
            <div class="banner-scene" data-scene="forest-${season}">
                ${layers}
                <div class="parallax-layer" data-depth="0.96" style="pointer-events:none">
                    <canvas class="particles-canvas" id="particles-${season}"></canvas>
                </div>
            </div>`;
    }

    _renderIndicators() {
        return `
            <div class="banner-indicators">
                ${this.scenes.map((s, i) =>
                    `<button class="indicator" data-index="${i}"
                             aria-label="切换到${s.name}" tabindex="0"></button>`
                ).join('')}
            </div>`;
    }

    // ─── Scene switching ──────────────────────────────────────────────────────

    _activateScene(index, animate = true) {
        const prev = this.currentSceneIndex;
        this.currentSceneIndex = index;

        this.sceneEls.forEach((el, i) => el.classList.toggle('active', i === index));
        this.indicatorEls.forEach((el, i) => el.classList.toggle('active', i === index));

        this._stopAnimations(prev);
        this._resetParallax();
        this._startAnimations(index);
    }

    _switchScene(index) {
        if (index === this.currentSceneIndex) return;
        this._activateScene(index);
        this._startAutoSwitch();
    }

    _startAutoSwitch() {
        clearTimeout(this.autoSwitchTimer);
        const dur = this.scenes[this.currentSceneIndex].duration;
        this.autoSwitchTimer = setTimeout(() => {
            const next = (this.currentSceneIndex + 1) % this.scenes.length;
            this._switchScene(next);
        }, dur);
    }

    // ─── Animations ──────────────────────────────────────────────────────────

    _startAnimations(index) {
        const id = this.scenes[index].id;
        if (id === 'cyberpunk') {
            this._startRain();
        } else {
            const season = id.split('-')[1];
            this._startParticles(season);
        }
    }

    _stopAnimations(index) {
        const id = this.scenes[index].id;
        if (id === 'cyberpunk') {
            cancelAnimationFrame(this.rainRAF);
            this.rainRAF = null;
        } else {
            const season = id.split('-')[1];
            if (this.particleRAFs[season]) {
                cancelAnimationFrame(this.particleRAFs[season]);
                this.particleRAFs[season] = null;
            }
        }
    }

    _startRain() {
        if (this.isReducedMotion) return;
        const canvas = document.getElementById('rain-canvas');
        if (!canvas) return;

        canvas.width  = canvas.offsetWidth  || this.bannerEl.offsetWidth;
        canvas.height = canvas.offsetHeight || this.bannerEl.offsetHeight;
        const ctx = canvas.getContext('2d');
        const W = canvas.width, H = canvas.height;

        const drops = Array.from({ length: 80 }, () => ({
            x:      Math.random() * W,
            y:      Math.random() * H,
            len:    60 + Math.random() * 80,
            speed:  700 + Math.random() * 500,
            offset: Math.random() * Math.PI * 2,
        }));

        let last = performance.now();
        const tick = (now) => {
            const dt = Math.min((now - last) / 1000, 0.05);
            last = now;

            ctx.clearRect(0, 0, W, H);
            ctx.strokeStyle = 'rgba(180,220,255,0.18)';
            ctx.lineWidth   = 0.8;

            drops.forEach(d => {
                d.y += d.speed * dt;
                d.x += Math.sin(d.offset + d.y * 0.008) * 0.6;
                if (d.y > H) { d.y = -d.len; d.x = Math.random() * W; }
                ctx.beginPath();
                ctx.moveTo(d.x, d.y);
                ctx.lineTo(d.x + 1.5, d.y + d.len);
                ctx.stroke();
            });

            this.rainRAF = requestAnimationFrame(tick);
        };
        this.rainRAF = requestAnimationFrame(tick);
    }

    _startParticles(season) {
        if (this.isReducedMotion) return;
        const canvas = document.getElementById(`particles-${season}`);
        if (!canvas) return;

        canvas.width  = canvas.offsetWidth  || this.bannerEl.offsetWidth;
        canvas.height = canvas.offsetHeight || this.bannerEl.offsetHeight;
        const ctx = canvas.getContext('2d');
        const W = canvas.width, H = canvas.height;

        const configs = {
            spring: { count: 28, color: '#f48fb1', type: 'petal',     speedY: [25, 55], speedX: [-15, 15] },
            summer: { count: 18, color: '#cddc39', type: 'firefly',   speedY: [-8, 8],  speedX: [-8, 8]   },
            autumn: { count: 42, color: '#ff9800', type: 'leaf',      speedY: [35, 70], speedX: [-25, 25] },
            winter: { count: 55, color: '#ffffff', type: 'snowflake', speedY: [18, 45], speedX: [-10, 10] },
        };
        const cfg = configs[season] || configs.spring;

        const particles = Array.from({ length: cfg.count }, () => ({
            x:       Math.random() * W,
            y:       Math.random() * H,
            size:    2 + Math.random() * 5,
            vy:      cfg.speedY[0] + Math.random() * (cfg.speedY[1] - cfg.speedY[0]),
            vx:      cfg.speedX[0] + Math.random() * (cfg.speedX[1] - cfg.speedX[0]),
            rot:     Math.random() * Math.PI * 2,
            rotV:    (Math.random() - 0.5) * 3,
            phase:   Math.random() * Math.PI * 2,
            opacity: 0.5 + Math.random() * 0.5,
        }));

        const colors = { autumn: ['#ff9800', '#ff5722', '#ffb74d'] };

        let last = performance.now();
        const tick = (now) => {
            const dt = Math.min((now - last) / 1000, 0.05);
            last = now;

            ctx.clearRect(0, 0, W, H);

            particles.forEach(p => {
                p.y     += p.vy * dt;
                p.x     += (p.vx + Math.sin(p.phase) * 8) * dt;
                p.rot   += p.rotV * dt;
                p.phase += dt * 1.2;
                if (cfg.type === 'summer') {
                    p.opacity = 0.2 + Math.abs(Math.sin(p.phase * 2)) * 0.8;
                }
                if (p.y > H + 20)  { p.y = -20; p.x = Math.random() * W; }
                if (p.x < -20)     { p.x = W + 20; }
                if (p.x > W + 20)  { p.x = -20; }

                ctx.save();
                ctx.globalAlpha = p.opacity;
                ctx.translate(p.x, p.y);
                ctx.rotate(p.rot);

                switch (cfg.type) {
                    case 'petal':
                        ctx.fillStyle = '#f48fb1';
                        ctx.beginPath();
                        ctx.ellipse(0, 0, p.size * 0.7, p.size * 1.4, 0, 0, Math.PI * 2);
                        ctx.fill();
                        break;
                    case 'firefly':
                        ctx.shadowBlur  = 12;
                        ctx.shadowColor = '#cddc39';
                        ctx.fillStyle   = '#cddc39';
                        ctx.beginPath();
                        ctx.arc(0, 0, p.size * 0.6, 0, Math.PI * 2);
                        ctx.fill();
                        ctx.shadowBlur  = 0;
                        break;
                    case 'leaf': {
                        const col = colors.autumn[Math.floor(p.phase * 0.5) % 3];
                        ctx.fillStyle = col;
                        ctx.beginPath();
                        ctx.moveTo(0, -p.size);
                        ctx.quadraticCurveTo(p.size * 1.2, 0, 0, p.size);
                        ctx.quadraticCurveTo(-p.size * 1.2, 0, 0, -p.size);
                        ctx.fill();
                        break;
                    }
                    case 'snowflake':
                        ctx.strokeStyle = 'rgba(255,255,255,0.85)';
                        ctx.lineWidth   = 0.8;
                        for (let i = 0; i < 6; i++) {
                            ctx.beginPath();
                            ctx.moveTo(0, 0);
                            ctx.lineTo(0, -p.size);
                            ctx.stroke();
                            ctx.rotate(Math.PI / 3);
                        }
                        break;
                }
                ctx.restore();
            });

            this.particleRAFs[season] = requestAnimationFrame(tick);
        };
        this.particleRAFs[season] = requestAnimationFrame(tick);
    }

    // ─── Parallax ────────────────────────────────────────────────────────────

    _handleMouseMove(e) {
        const rect = this.bannerEl.getBoundingClientRect();
        const mx   = (e.clientX - rect.left) / rect.width  - 0.5;
        const my   = (e.clientY - rect.top)  / rect.height - 0.5;
        const activeScene = this.sceneEls[this.currentSceneIndex];
        activeScene.querySelectorAll('.parallax-layer').forEach(layer => {
            const d  = parseFloat(layer.dataset.depth) || 0.5;
            const tx = -mx * d * 42;
            const ty = -my * d * 22;
            layer.style.transform = `translate3d(${tx}px,${ty}px,0)`;
        });
    }

    _resetParallax() {
        this.sceneEls[this.currentSceneIndex]
            .querySelectorAll('.parallax-layer')
            .forEach(l => { l.style.transform = 'translate3d(0,0,0)'; });
    }

    // ─── Events ───────────────────────────────────────────────────────────────

    _bindEvents() {
        if (!this.isReducedMotion) {
            this.bannerEl.addEventListener('mousemove', this._mouseBound);
            this.bannerEl.addEventListener('mouseleave', this._leaveBound);
        }

        this.indicatorEls.forEach((el, i) => {
            el.addEventListener('click', () => this._switchScene(i));
            el.addEventListener('keydown', e => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    this._switchScene(i);
                }
            });
        });

        window.addEventListener('resize', () => this._handleResize());
    }

    _handleResize() {
        ['rain-canvas', ...['spring','summer','autumn','winter'].map(s => `particles-${s}`)].forEach(id => {
            const c = document.getElementById(id);
            if (c) {
                c.width  = c.offsetWidth;
                c.height = c.offsetHeight;
            }
        });
    }

    destroy() {
        clearTimeout(this.autoSwitchTimer);
        cancelAnimationFrame(this.rainRAF);
        Object.values(this.particleRAFs).forEach(id => cancelAnimationFrame(id));
        this.bannerEl?.removeEventListener('mousemove', this._mouseBound);
        this.bannerEl?.removeEventListener('mouseleave', this._leaveBound);
    }
}

// Auto-init
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('parallax-banner-container')) {
        window.parallaxBanner = new ParallaxBanner('parallax-banner-container');
    }
});

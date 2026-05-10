/**
 * @file music-player.js
 * @description 可拖拽悬浮背景音乐播放器组件。
 *
 * 功能：
 *   - 读取 music-config.js 中定义的 MUSIC_LIST 播放列表
 *   - 支持折叠/展开两种视图，展开时显示进度条与曲目信息
 *   - 拖拽拖柄可自由移动播放器位置
 *   - 进度条支持点击跳转与拖拽拖动
 *   - 通过 localStorage 持久化当前曲目索引与播放进度
 *   - 异步验证音乐文件是否存在，过滤缺失文件
 *
 * 依赖：
 *   - music-config.js 提供全局 MUSIC_LIST 变量
 *   - utils.js 中的 formatTime（若需要，当前通过内联实现）
 *
 * 初始化：
 *   const player = new MusicPlayer();
 *   player.mount(document.body);  // 挂载到指定容器
 */

// 音乐播放器组件
class MusicPlayer {
    constructor() {
        this.audioPlayer = null;
        this.currentTrackIndex = 0;
        this.isPlaying = false;
        this.progressInterval = null;
        this.isDraggingProgress = false;
        this.isDraggingPlayer = false;
        this.dragOffset = { x: 0, y: 0 };
        this.tracks = this.getTracks();
        this.playerHTML = this.generatePlayerHTML();
        this.loadPlaybackState(); // 加载之前保存的播放状态
    }

    /**
     * 生成播放器 HTML 字符串。
     *
     * 根据 tracks 是否为空决定是否禁用控制按钮。
     * 折叠视图只显示曲目标题和播放指示器；展开视图包含拖柄、
     * 控制按钮、曲目信息、进度条和时间显示。
     *
     * @returns {string} 播放器完整 HTML 字符串
     */
    generatePlayerHTML() {
        const hasMusic = this.tracks && this.tracks.length > 0;
        const defaultTitle = hasMusic ? this.tracks[0].title : '暂无音乐';
        const defaultArtist = hasMusic && this.tracks[0].artist ? this.tracks[0].artist : '';

        return `
            <div class="music-player" id="musicPlayer">
                <!-- 折叠状态显示 -->
                <div class="music-collapsed-view">
                    <div class="music-title-collapsed" id="musicTitleCollapsed">${defaultTitle}</div>
                    <div class="music-playing-indicator" id="musicPlayingIndicator"></div>
                </div>
                
                <!-- 展开状态显示 -->
                <div class="music-expanded-view">
                    <div class="music-drag-handle" id="musicDragHandle">
                        <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                            <rect x="4" y="4"   width="16" height="3" rx="1.5" stroke="currentColor" stroke-width="1.5"/>
                            <rect x="4" y="10.5" width="16" height="3" rx="1.5" stroke="currentColor" stroke-width="1.5"/>
                            <rect x="4" y="17"  width="16" height="3" rx="1.5" stroke="currentColor" stroke-width="1.5"/>
                        </svg>
                    </div>
                    <button class="music-btn music-btn-prev" id="musicPrev" title="上一首" ${!hasMusic ? 'disabled' : ''}>
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                            <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.3"/>
                            <path d="M9 15V9l-5 3z"/>
                            <circle cx="6" cy="12" r="1.5" fill="currentColor"/>
                        </svg>
                    </button>
                    <button class="music-btn music-btn-play" id="musicToggle" title="播放/暂停" ${!hasMusic ? 'disabled' : ''}>
                        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                            <polygon points="5 3 19 12 5 21 5 3"></polygon>
                        </svg>
                    </button>
                    <button class="music-btn music-btn-next" id="musicNext" title="下一首" ${!hasMusic ? 'disabled' : ''}>
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                            <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.3"/>
                            <path d="M15 15V9l5 3z"/>
                            <circle cx="18" cy="12" r="1.5" fill="currentColor"/>
                        </svg>
                    </button>
                    <div class="music-info">
                        <div class="music-title" id="musicTitle">${defaultTitle}</div>
                        <div class="music-artist" id="musicArtist">${defaultArtist}</div>
                    </div>
                    <div class="music-progress-container">
                        <div class="music-progress" id="musicProgress">
                            <div class="music-progress-bar" id="musicProgressBar"></div>
                            <div class="music-progress-thumb" id="musicProgressThumb"></div>
                            <div class="music-progress-tooltip" id="musicProgressTooltip">00:00</div>
                        </div>
                        <div class="music-time" id="musicTime">${hasMusic ? '00:00 / 00:00' : '--:-- / --:--'}</div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * 从全局 MUSIC_LIST 变量读取播放列表并格式化。
     *
     * 依赖 music-config.js 在全局作用域定义 MUSIC_LIST 数组。
     * 过滤掉缺少 file 或 title 字段的条目，并补全 path 字段。
     *
     * @returns {Array<{title:string,file:string,artist?:string,path:string}>|null}
     *   格式化后的曲目数组；若列表为空或 MUSIC_LIST 未定义则返回 null
     */
    getTracks() {
        let tracks = [];
        if (typeof MUSIC_LIST !== 'undefined' && Array.isArray(MUSIC_LIST)) {
            tracks = MUSIC_LIST.map(item => ({
                ...item,
                path: this.getMusicPath(item.file)
            })).filter(item => item.file && item.title);
        }
        return tracks.length > 0 ? tracks : null;
    }

    /**
     * 异步验证播放列表中所有文件是否可访问。
     *
     * 对每首曲目发送 HEAD 请求；不可访问的文件会被从 tracks 中移除并打印警告。
     * 若移除后 currentTrackIndex 越界，重置为 0 并刷新曲目信息显示。
     * 在 initWithValidation() 渲染前调用，避免播放时才发现文件缺失。
     *
     * @returns {Promise<void>}
     */
    async validateTracks() {
        if (!this.tracks || this.tracks.length === 0) return;
        
        const validTracks = [];
        for (const track of this.tracks) {
            const exists = await this.fileExists(track.path);
            if (exists) {
                validTracks.push(track);
            } else {
                console.warn(`音乐文件不存在，已跳过: ${track.file}`);
            }
        }
        
        // 如果有效歌曲减少了，更新列表并重置当前索引
        if (validTracks.length < this.tracks.length) {
            this.tracks = validTracks;
            if (this.currentTrackIndex >= this.tracks.length) {
                this.currentTrackIndex = 0;
            }
            this.updateTrackInfo();
        }
    }

    /**
     * 检查指定 URL 的文件是否可访问（HTTP 200）。
     *
     * 使用 HEAD 方法且禁用缓存，确保每次都向服务器确认文件存在性。
     * 网络错误视为文件不存在。
     *
     * @param {string} url - 要检查的文件 URL（绝对路径）
     * @returns {Promise<boolean>} 文件可访问返回 true，否则返回 false
     */
    async fileExists(url) {
        try {
            const response = await fetch(url, { 
                method: 'HEAD',
                cache: 'no-store', // 禁用缓存
                headers: {
                    'Cache-Control': 'no-cache, no-store, must-revalidate',
                    'Pragma': 'no-cache',
                    'Expires': '0'
                }
            });
            return response.ok;
        } catch (error) {
            console.warn(`检查文件失败: ${url}`, error);
            return false;
        }
    }

    /**
     * 将音乐文件名转换为绝对 URL 路径。
     *
     * @param {string} filename - music-config.js 中定义的文件名（如 "track1.mp3"）
     * @returns {string} 完整路径（如 "/assets/music/track1.mp3"）
     */
    getMusicPath(filename) {
        return `/assets/music/${filename}`;
    }

    /**
     * 从 localStorage 恢复上次的播放状态。
     *
     * 读取 key `musicPlayerState`（JSON），恢复字段：
     * - currentTrackIndex：曲目索引（越界时忽略）
     * - currentTime：保存至 this.savedCurrentTime，在 loadTrack 中用于跳转
     * - isPlaying：保存至 this.shouldAutoPlay，在 loadTrack 中决定是否自动播放
     *
     * JSON 解析失败时静默忽略，不影响播放器初始化。
     */
    loadPlaybackState() {
        try {
            const state = localStorage.getItem('musicPlayerState');
            if (state) {
                const parsed = JSON.parse(state);
                // 验证保存的状态是否有效
                if (parsed.currentTrackIndex !== undefined && parsed.currentTrackIndex >= 0 &&
                    (!this.tracks || parsed.currentTrackIndex < this.tracks.length)) {
                    this.currentTrackIndex = parsed.currentTrackIndex;
                }
                if (parsed.currentTime !== undefined) {
                    this.savedCurrentTime = parsed.currentTime;
                }
                if (parsed.isPlaying !== undefined) {
                    this.shouldAutoPlay = parsed.isPlaying;
                }
            }
        } catch (e) {
            console.warn('加载播放状态失败:', e);
        }
    }

    /**
     * 将当前播放状态持久化到 localStorage。
     *
     * 存储 key `musicPlayerState`，包含 currentTrackIndex、currentTime、isPlaying。
     * 在播放/暂停、切换曲目、页面卸载（beforeunload）和页面隐藏（visibilitychange）时调用。
     */
    savePlaybackState() {
        try {
            const state = {
                currentTrackIndex: this.currentTrackIndex,
                currentTime: this.audioPlayer ? this.audioPlayer.currentTime : 0,
                isPlaying: this.isPlaying
            };
            localStorage.setItem('musicPlayerState', JSON.stringify(state));
        } catch (e) {
            console.warn('保存播放状态失败:', e);
        }
    }

    /**
     * 初始化播放器（公共入口）。
     *
     * 代理至 initWithValidation()，保持外部调用接口简洁。
     */
    init() {
        this.initWithValidation();
    }

    /**
     * 带文件验证的异步初始化流程。
     *
     * 执行顺序：
     * 1. validateTracks() — HEAD 请求过滤不可访问文件
     * 2. render() — 将 playerHTML 写入 #musicPlayerContainer
     * 3. createAudioElement() + setupEventListeners() + loadTrack()
     * 4. tryAutoPlay() — 触发自动播放（受浏览器策略限制）
     *
     * 若 tracks 为空，仅执行 render() + disableAllButtons()。
     *
     * @returns {Promise<void>}
     */
    async initWithValidation() {
        // 如果有音乐列表，先验证文件是否存在
        if (this.tracks && this.tracks.length > 0) {
            await this.validateTracks();
        }

        // 验证完成后再渲染播放器
        this.render();

        if (this.tracks && this.tracks.length > 0) {
            this.createAudioElement();
            this.setupEventListeners();
            this.loadTrack(this.currentTrackIndex); // 加载保存的曲目索引

            // 立即尝试自动播放
            this.tryAutoPlay();
        } else {
            // 没有音乐时禁用所有按钮
            this.disableAllButtons();
        }
    }

    /**
     * 尝试自动播放第一首曲目。
     *
     * 浏览器自动播放策略通常要求先有用户交互，否则 play() 返回被拒绝的 Promise。
     * 为避免主题切换时重复触发，使用 localStorage key `musicPlayerAutoPlayTried` 记录。
     *
     * 策略：
     * - 若音频已就绪（readyState >= 3），立即尝试 play()
     * - 否则监听 canplay 事件后再尝试
     * - 失败时绑定 click / keydown 一次性监听器，等用户交互后再播放
     */
    tryAutoPlay() {
        // 检查是否已经尝试过自动播放（避免主题切换时重复触发）
        const hasTriedAutoPlay = localStorage.getItem('musicPlayerAutoPlayTried');
        if (hasTriedAutoPlay === 'true') {
            console.log('已尝试过自动播放，跳过');
            return;
        }

        // 标记已尝试过自动播放
        localStorage.setItem('musicPlayerAutoPlayTried', 'true');

        console.log('尝试自动播放...');

        const autoPlayCallback = () => {
            console.log('用户交互后尝试播放');
            this.play();
            document.removeEventListener('click', autoPlayCallback);
            document.removeEventListener('keydown', autoPlayCallback);
        };

        // 立即尝试播放（不依赖canplay事件）
        const attemptPlay = () => {
            this.audioPlayer.play().then(() => {
                console.log('自动播放成功！');
                document.removeEventListener('click', autoPlayCallback);
                document.removeEventListener('keydown', autoPlayCallback);
            }).catch((error) => {
                console.log('浏览器阻止自动播放，等待用户交互:', error.message);
                document.addEventListener('click', autoPlayCallback, { once: true });
                document.addEventListener('keydown', autoPlayCallback, { once: true });
            });
        };

        // 如果音频已经可以播放，立即尝试
        if (this.audioPlayer.readyState >= 3) { // HAVE_FUTURE_DATA 或更高
            attemptPlay();
        } else {
            // 等待音频加载后再尝试
            this.audioPlayer.addEventListener('canplay', attemptPlay, { once: true });
        }
    }

    /**
     * 删除 `musicPlayerAutoPlayTried` 标记，允许下次刷新时重新尝试自动播放。
     *
     * 当前未被内部调用，保留为外部工具方法（如测试或调试时手动重置）。
     */
    resetAutoPlayState() {
        localStorage.removeItem('musicPlayerAutoPlayTried');
    }

    /**
     * 加载指定曲目（只加载，不自动播放）。
     *
     * 设置 audio.src 并调用 load()，更新标题/艺术家/时间显示。
     * 若存在 savedCurrentTime（由 loadPlaybackState 恢复），在 loadedmetadata
     * 事件后跳转到该位置；若 shouldAutoPlay 为 true，则在 canplay 后恢复播放。
     * 恢复完成后清除 savedCurrentTime / shouldAutoPlay，避免重复触发。
     *
     * @param {number} index - tracks 数组的索引
     */
    loadTrack(index) {
        const track = this.tracks[index];
        if (track && this.audioPlayer) {
            this.audioPlayer.src = track.path;
            this.audioPlayer.load();
            document.getElementById('musicTitle').textContent = track.title;
            document.getElementById('musicArtist').textContent = track.artist || 'Unknown';
            document.getElementById('musicTitleCollapsed').textContent = track.title;
            this.updateTimeDisplay(0, track.duration || 0);
            this.updateProgress(0);

            // 如果有保存的播放位置，恢复播放位置并根据状态决定是否自动播放
            const savedTime = this.savedCurrentTime;
            const shouldPlay = this.shouldAutoPlay;

            if (savedTime !== undefined && savedTime > 0) {
                this.audioPlayer.addEventListener('loadedmetadata', () => {
                    this.audioPlayer.currentTime = savedTime;
                    this.updateProgress(savedTime);
                    this.updateTimeDisplay(savedTime, this.audioPlayer.duration);

                    // 如果之前正在播放，尝试恢复播放
                    if (shouldPlay) {
                        this.audioPlayer.addEventListener('canplay', () => {
                            // 尝试恢复播放
                            this.audioPlayer.play().then(() => {
                                this.isPlaying = true;
                                document.getElementById('musicToggle').innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>';
                                document.getElementById('musicToggle').classList.add('playing');
                                document.getElementById('musicPlayingIndicator').classList.add('playing');
                            }).catch(() => {
                                // 浏览器阻止自动播放，显示暂停图标
                                this.isPlaying = false;
                                document.getElementById('musicToggle').innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>';
                                document.getElementById('musicToggle').classList.remove('playing');
                                document.getElementById('musicPlayingIndicator').classList.remove('playing');
                            });
                        }, { once: true });
                    }

                    // 重置保存的状态，避免重复恢复
                    this.savedCurrentTime = undefined;
                    this.shouldAutoPlay = false;
                }, { once: true });
            }
        }
    }

    /**
     * 禁用所有 `.music-btn` 按钮。
     *
     * 在 tracks 为空（无可用音乐文件）时调用，防止用户操作引发错误。
     */
    disableAllButtons() {
        const buttons = document.querySelectorAll('.music-btn');
        buttons.forEach(btn => btn.disabled = true);
    }

    /**
     * 将 playerHTML 写入页面。
     *
     * 优先写入 `#musicPlayerContainer`；若该元素不存在，则追加到 document.body 末尾。
     * 在 initWithValidation() 中于文件验证完成后调用，确保 DOM 反映最终的可用曲目状态。
     */
    render() {
        const container = document.getElementById('musicPlayerContainer');
        if (container) {
            container.innerHTML = this.playerHTML;
        } else {
            document.body.insertAdjacentHTML('beforeend', this.playerHTML);
        }
    }

    /**
     * 创建 `<audio>` 元素并注册核心事件。
     *
     * 音频设置：loop=false，volume=0.3（30% 作为背景音乐默认音量）。
     * 注册事件：
     * - loadedmetadata：更新时长显示
     * - timeupdate：拖拽进度条期间暂停更新，防止抖动
     * - ended：多曲目时自动切换下一首，单曲时显示暂停图标
     * - error：打印警告
     * - beforeunload / visibilitychange（hidden）：调用 savePlaybackState()
     *
     * 将元素追加到 document.body（不可见）。
     */
    createAudioElement() {
        this.audioPlayer = document.createElement('audio');
        this.audioPlayer.loop = false;
        this.audioPlayer.volume = 0.3;

        this.audioPlayer.addEventListener('loadedmetadata', () => {
            this.updateTimeDisplay(0, this.audioPlayer.duration);
        });

        this.audioPlayer.addEventListener('timeupdate', () => {
            if (!this.isDraggingProgress) {
                this.updateProgress(this.audioPlayer.currentTime);
                this.updateTimeDisplay(this.audioPlayer.currentTime, this.audioPlayer.duration);
            }
        });

        this.audioPlayer.addEventListener('ended', () => {
            // 如果有下一首，播放下一首；否则显示暂停图标
            if (!this.tracks || this.tracks.length < 2) {
                // 没有下一首，显示暂停图标
                this.isPlaying = false;
                const toggleBtn = document.getElementById('musicToggle');
                toggleBtn.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>';
                toggleBtn.classList.remove('playing');
                document.getElementById('musicPlayingIndicator').classList.remove('playing');
                this.savePlaybackState();
            } else {
                this.nextTrack();
            }
        });

        this.audioPlayer.addEventListener('error', (e) => {
            console.warn('音频加载失败:', e);
        });

        document.body.appendChild(this.audioPlayer);

            // 页面离开前保存播放状态
            window.addEventListener('beforeunload', () => {
                this.savePlaybackState();
            });

            // 页面隐藏时也保存状态（用于页面切换）
            document.addEventListener('visibilitychange', () => {
                if (document.hidden) {
                    this.savePlaybackState();
                }
            });
        }

    /**
     * 绑定播放器所有交互事件。
     *
     * 覆盖：播放/暂停按钮、上/下一首按钮、进度条点击跳转、
     * 进度条 mousemove（tooltip 显示时间预览）、进度条 thumb 拖拽、
     * 播放器拖柄拖拽、全局 mousemove / mouseup（拖拽更新与释放）、
     * 键盘快捷键（Space 播放/暂停，←/→ 倒退/快进 5 秒）。
     *
     * 键盘事件在焦点位于 INPUT/TEXTAREA 时不触发，避免干扰文本输入。
     */
        setupEventListeners() {
        // 播放/暂停按钮
        document.getElementById('musicToggle').addEventListener('click', () => {
            this.togglePlay();
        });

        // 上一首按钮
        document.getElementById('musicPrev').addEventListener('click', () => {
            this.prevTrack();
        });

        // 下一首按钮
        document.getElementById('musicNext').addEventListener('click', () => {
            this.nextTrack();
        });

        // 进度条点击
        document.getElementById('musicProgress').addEventListener('click', (e) => {
            if (!this.isDraggingProgress) {
                const rect = e.currentTarget.getBoundingClientRect();
                const percent = (e.clientX - rect.left) / rect.width;
                const time = percent * this.audioPlayer.duration;
                this.seekTo(time);
            }
        });

        // 进度条悬停显示时间
        document.getElementById('musicProgress').addEventListener('mousemove', (e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const percent = (e.clientX - rect.left) / rect.width;
            const time = percent * this.audioPlayer.duration;
            const tooltip = document.getElementById('musicProgressTooltip');
            tooltip.textContent = this.formatTime(time);
            tooltip.style.left = (percent * 100) + '%';
        });

        // 进度条拖拽
        const thumb = document.getElementById('musicProgressThumb');
        thumb.addEventListener('mousedown', (e) => {
            this.startProgressDrag(e);
        });

        // 播放器拖拽（通过拖拽手柄）
        const dragHandle = document.getElementById('musicDragHandle');
        dragHandle.addEventListener('mousedown', (e) => {
            this.startPlayerDrag(e);
        });

        // 全局鼠标事件
        document.addEventListener('mousemove', (e) => {
            this.onMouseMove(e);
        });

        document.addEventListener('mouseup', () => {
            this.stopDrag();
        });

        // 键盘快捷键
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space' && !e.target.tagName.match(/INPUT|TEXTAREA/)) {
                e.preventDefault();
                this.togglePlay();
            }
            if (e.code === 'ArrowLeft') {
                this.seekTo(this.audioPlayer.currentTime - 5);
            }
            if (e.code === 'ArrowRight') {
                this.seekTo(this.audioPlayer.currentTime + 5);
            }
        });
    }

    /**
     * 切换播放/暂停状态。
     *
     * 当前正在播放时调用 pause()，否则调用 play()。
     * 也用作键盘 Space 快捷键的处理函数。
     */
    togglePlay() {
        if (this.isPlaying) {
            this.pause();
        } else {
            this.play();
        }
    }

    /**
     * 开始播放。
     *
     * 调用 audio.play()（返回 Promise）；成功时更新按钮图标为暂停符、
     * 添加 `.playing` 类、保存状态。失败时（浏览器策略拒绝）仅打印警告，
     * 不修改 isPlaying 状态。
     *
     * 若 audio.src 未设置则静默跳过。
     */
    play() {
        if (this.audioPlayer.src) {
            this.audioPlayer.play().then(() => {
                this.isPlaying = true;
                document.getElementById('musicToggle').innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>';
                document.getElementById('musicToggle').classList.add('playing');
                document.getElementById('musicPlayingIndicator').classList.add('playing');
                this.savePlaybackState(); // 保存播放状态
            }).catch(e => {
                console.warn('播放失败:', e);
            });
        }
    }

    /**
     * 暂停播放。
     *
     * 同步调用 audio.pause()，将按钮图标切换回播放符，
     * 移除 `.playing` 类，并保存播放状态。
     */
    pause() {
        this.audioPlayer.pause();
        this.isPlaying = false;
        const toggleBtn = document.getElementById('musicToggle');
        toggleBtn.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>';
        toggleBtn.classList.remove('playing');
        document.getElementById('musicPlayingIndicator').classList.remove('playing');
        this.savePlaybackState();
    }

    /**
     * 切换到上一首曲目。
     *
     * 索引循环：0 → tracks.length - 1。曲目少于 2 首时静默返回。
     * 调用 loadAndPlayTrack() 并保存状态。
     */
    prevTrack() {
        if (!this.tracks || this.tracks.length < 2) return;
        this.currentTrackIndex = (this.currentTrackIndex - 1 + this.tracks.length) % this.tracks.length;
        this.loadAndPlayTrack(this.currentTrackIndex);
        this.savePlaybackState(); // 保存播放状态
    }

    /**
     * 切换到下一首曲目。
     *
     * 索引循环：tracks.length - 1 → 0。曲目少于 2 首时静默返回。
     * 调用 loadAndPlayTrack() 并保存状态。
     */
    nextTrack() {
        if (!this.tracks || this.tracks.length < 2) return;
        this.currentTrackIndex = (this.currentTrackIndex + 1) % this.tracks.length;
        this.loadAndPlayTrack(this.currentTrackIndex);
        this.savePlaybackState(); // 保存播放状态
    }

    /**
     * 加载并立即播放指定曲目。
     *
     * 与 loadTrack() 的区别：若切换前正在播放（wasPlaying），
     * 则在 canplay 触发后自动调用 play()，使切换无缝衔接。
     * 不受 savedCurrentTime / shouldAutoPlay 状态影响。
     *
     * @param {number} index - tracks 数组的索引
     */
    loadAndPlayTrack(index) {
        const track = this.tracks[index];
        if (track && this.audioPlayer) {
            const wasPlaying = this.isPlaying;
            this.audioPlayer.src = track.path;
            this.audioPlayer.load();

            // 更新UI显示
            document.getElementById('musicTitle').textContent = track.title;
            document.getElementById('musicArtist').textContent = track.artist || 'Unknown';
            document.getElementById('musicTitleCollapsed').textContent = track.title;
            this.updateTimeDisplay(0, track.duration || 0);
            this.updateProgress(0);

            // 如果之前正在播放，加载完成后自动播放
            if (wasPlaying) {
                this.audioPlayer.addEventListener('canplay', () => {
                    this.play();
                }, { once: true });
            }
        }
    }

    /**
     * 跳转到指定播放位置。
     *
     * 对 time 做边界夹紧（0 ≤ time ≤ duration），然后设置 audio.currentTime
     * 并同步更新进度条位置。
     *
     * @param {number} time - 目标时间（秒）
     */
    seekTo(time) {
        const duration = this.audioPlayer.duration;
        const newTime = Math.max(0, Math.min(duration, time));
        this.audioPlayer.currentTime = newTime;
        this.updateProgress(newTime);
    }

    /**
     * 更新进度条宽度和拖拽 thumb 位置。
     *
     * duration 为 0 或 NaN 时以 1 代替，防止除零。
     * 由 audio timeupdate 事件和拖拽 mousemove 事件调用。
     *
     * @param {number} currentTime - 当前播放位置（秒）
     */
    updateProgress(currentTime) {
        const duration = this.audioPlayer.duration || 1;
        const percent = (currentTime / duration) * 100;
        document.getElementById('musicProgressBar').style.width = percent + '%';
        document.getElementById('musicProgressThumb').style.left = percent + '%';
    }

    /**
     * 更新时间文本显示（"当前 / 总时长"）。
     *
     * @param {number} current  - 当前播放位置（秒）
     * @param {number} duration - 曲目总时长（秒）
     */
    updateTimeDisplay(current, duration) {
        const timeStr = this.formatTime(current) + ' / ' + this.formatTime(duration);
        document.getElementById('musicTime').textContent = timeStr;
    }

    /**
     * 刷新 DOM 中的曲目标题、艺术家和曲目计数显示。
     *
     * 在 validateTracks() 过滤掉不存在的文件后调用，确保 UI 与实际 tracks 一致。
     * 若 tracks 为空，则同时调用 disableAllButtons()。
     * 对缺失的 DOM 元素做防御性检查（null 判断），适配初始化前调用的场景。
     */
    updateTrackInfo() {
        const track = this.tracks && this.tracks.length > 0 ? this.tracks[this.currentTrackIndex] : null;
        const title = track ? track.title : '暂无音乐';
        const artist = track && track.artist ? track.artist : '';
        
        // 更新折叠状态的标题
        const collapsedTitle = document.getElementById('musicTitleCollapsed');
        if (collapsedTitle) {
            collapsedTitle.textContent = title;
        }
        
        // 更新展开状态的标题
        const expandedTitle = document.getElementById('musicTitle');
        if (expandedTitle) {
            expandedTitle.textContent = title;
        }
        
        // 更新艺术家信息
        const artistEl = document.getElementById('musicArtist');
        if (artistEl) {
            artistEl.textContent = artist;
        }
        
        // 更新曲目计数
        const trackCount = document.getElementById('musicTrackCount');
        if (trackCount && this.tracks) {
            trackCount.textContent = `${this.currentTrackIndex + 1} / ${this.tracks.length}`;
        }
        
        // 如果没有音乐，禁用按钮
        if (!track) {
            this.disableAllButtons();
        }
    }

    /**
     * 将秒数格式化为 "MM:SS" 字符串。
     *
     * NaN 或 Infinity 时返回 "00:00"（音频尚未加载时的安全值）。
     *
     * @param {number} seconds - 时长（秒）
     * @returns {string} 格式化时间字符串，如 "03:45"
     */
    formatTime(seconds) {
        if (isNaN(seconds) || !isFinite(seconds)) {
            return '00:00';
        }
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    /**
     * 开始进度条 thumb 的拖拽操作。
     *
     * 设置 isDraggingProgress = true 并在 thumb 上添加 `.dragging` 类（CSS 放大效果）。
     * 实际位置更新在 onMouseMove() 中完成，拖拽释放在 stopDrag() 中处理。
     *
     * @param {MouseEvent} e
     */
    startProgressDrag(e) {
        e.preventDefault();
        this.isDraggingProgress = true;
        document.getElementById('musicProgressThumb').classList.add('dragging');
    }

    /**
     * 开始播放器浮层的拖拽操作。
     *
     * 记录鼠标点击位置相对于播放器左上角的偏移（dragOffset），
     * 在 onMouseMove() 中据此计算新坐标。同时添加 `.dragging` CSS 类
     * 以禁用 CSS transition，避免拖拽时出现延迟跟随效果。
     *
     * @param {MouseEvent} e
     */
    startPlayerDrag(e) {
        e.preventDefault();
        this.isDraggingPlayer = true;
        const player = document.getElementById('musicPlayer');
        player.classList.add('dragging');

        const rect = player.getBoundingClientRect();
        this.dragOffset.x = e.clientX - rect.left;
        this.dragOffset.y = e.clientY - rect.top;
    }

    /**
     * 处理全局 mousemove 事件（进度条拖拽 + 播放器位置拖拽）。
     *
     * 进度条拖拽：将鼠标 X 位置映射为百分比，计算新时间并同步更新 audio.currentTime 和 UI。
     * 播放器拖拽：计算新坐标（含 10px 边距的边界夹紧），通过 left/top inline style 定位；
     *   同时清除 bottom/right/transform，防止与 CSS 默认定位冲突。
     *
     * @param {MouseEvent} e
     */
    onMouseMove(e) {
        if (this.isDraggingProgress) {
            const progressBar = document.getElementById('musicProgress');
            const rect = progressBar.getBoundingClientRect();
            const percent = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
            const time = (percent / 100) * this.audioPlayer.duration;
            this.audioPlayer.currentTime = time;
            this.updateProgress(time);
            this.updateTimeDisplay(time, this.audioPlayer.duration);
        }

        if (this.isDraggingPlayer) {
            const player = document.getElementById('musicPlayer');
            let newX = e.clientX - this.dragOffset.x;
            let newY = e.clientY - this.dragOffset.y;

            // 边界限制 - 确保不超出页面
            const maxX = window.innerWidth - player.offsetWidth - 10;
            const maxY = window.innerHeight - player.offsetHeight - 10;
            newX = Math.max(10, Math.min(maxX, newX));
            newY = Math.max(10, Math.min(maxY, newY));

            player.style.left = newX + 'px';
            player.style.top = newY + 'px';
            player.style.bottom = 'auto';
            player.style.right = 'auto';
            player.style.transform = '';
        }
    }

    /**
     * 结束所有拖拽操作（全局 mouseup 触发）。
     *
     * 将 isDraggingProgress / isDraggingPlayer 重置为 false，
     * 并移除对应元素上的 `.dragging` CSS 类。
     */
    stopDrag() {
        if (this.isDraggingProgress) {
            this.isDraggingProgress = false;
            document.getElementById('musicProgressThumb').classList.remove('dragging');
        }

        if (this.isDraggingPlayer) {
            this.isDraggingPlayer = false;
            document.getElementById('musicPlayer').classList.remove('dragging');
        }
    }
}

// 初始化音乐播放器
document.addEventListener('DOMContentLoaded', () => {
    console.log('MusicPlayer DOMContentLoaded 触发');
    const player = new MusicPlayer();
    console.log('MusicPlayer 实例创建完成，曲目数:', player.tracks ? player.tracks.length : 0);
    player.init();
});
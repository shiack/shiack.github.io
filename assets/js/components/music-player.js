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

    // 生成播放器HTML（根据是否有音乐）
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

    // 获取音乐列表（从配置文件）
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

    // 验证音乐文件是否存在（异步检查）
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

    // 检查文件是否存在（使用 HTTP HEAD 请求，禁用缓存）
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

    // 获取音乐文件路径
    getMusicPath(filename) {
        return `/assets/music/${filename}`;
    }

    // 加载播放状态
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

    // 保存播放状态
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

    // 初始化播放器
    init() {
        this.initWithValidation();
    }

    // 带文件验证的初始化（异步）
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

    // 尝试自动播放（处理浏览器自动播放限制）
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

    // 重置自动播放状态（用于页面刷新时重新尝试）
    resetAutoPlayState() {
        localStorage.removeItem('musicPlayerAutoPlayTried');
    }

    // 加载曲目（只加载不播放）
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

    // 禁用所有按钮（当没有音乐时）
    disableAllButtons() {
        const buttons = document.querySelectorAll('.music-btn');
        buttons.forEach(btn => btn.disabled = true);
    }

    // 渲染播放器HTML
    render() {
        const container = document.getElementById('musicPlayerContainer');
        if (container) {
            container.innerHTML = this.playerHTML;
        } else {
            document.body.insertAdjacentHTML('beforeend', this.playerHTML);
        }
    }

    // 创建音频元素
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

        // 设置事件监听器
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

    // 播放/暂停切换
    togglePlay() {
        if (this.isPlaying) {
            this.pause();
        } else {
            this.play();
        }
    }

    // 播放
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

    // 暂停
    pause() {
        this.audioPlayer.pause();
        this.isPlaying = false;
        const toggleBtn = document.getElementById('musicToggle');
        toggleBtn.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>';
        toggleBtn.classList.remove('playing');
        document.getElementById('musicPlayingIndicator').classList.remove('playing');
        this.savePlaybackState();
    }

    // 上一首
    prevTrack() {
        if (!this.tracks || this.tracks.length < 2) return;
        this.currentTrackIndex = (this.currentTrackIndex - 1 + this.tracks.length) % this.tracks.length;
        this.loadAndPlayTrack(this.currentTrackIndex);
        this.savePlaybackState(); // 保存播放状态
    }

    // 下一首
    nextTrack() {
        if (!this.tracks || this.tracks.length < 2) return;
        this.currentTrackIndex = (this.currentTrackIndex + 1) % this.tracks.length;
        this.loadAndPlayTrack(this.currentTrackIndex);
        this.savePlaybackState(); // 保存播放状态
    }

    // 加载并播放曲目
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

    // 跳转到指定时间
    seekTo(time) {
        const duration = this.audioPlayer.duration;
        const newTime = Math.max(0, Math.min(duration, time));
        this.audioPlayer.currentTime = newTime;
        this.updateProgress(newTime);
    }

    // 更新进度条
    updateProgress(currentTime) {
        const duration = this.audioPlayer.duration || 1;
        const percent = (currentTime / duration) * 100;
        document.getElementById('musicProgressBar').style.width = percent + '%';
        document.getElementById('musicProgressThumb').style.left = percent + '%';
    }

    // 更新时间显示
    updateTimeDisplay(current, duration) {
        const timeStr = this.formatTime(current) + ' / ' + this.formatTime(duration);
        document.getElementById('musicTime').textContent = timeStr;
    }

    // 更新曲目信息显示
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

    // 格式化时间
    formatTime(seconds) {
        if (isNaN(seconds) || !isFinite(seconds)) {
            return '00:00';
        }
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    // 开始进度条拖拽
    startProgressDrag(e) {
        e.preventDefault();
        this.isDraggingProgress = true;
        document.getElementById('musicProgressThumb').classList.add('dragging');
    }

    // 开始播放器拖拽
    startPlayerDrag(e) {
        e.preventDefault();
        this.isDraggingPlayer = true;
        const player = document.getElementById('musicPlayer');
        player.classList.add('dragging');

        const rect = player.getBoundingClientRect();
        this.dragOffset.x = e.clientX - rect.left;
        this.dragOffset.y = e.clientY - rect.top;
    }

    // 鼠标移动处理
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

    // 停止拖拽
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
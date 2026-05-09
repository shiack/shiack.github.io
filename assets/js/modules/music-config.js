/**
 * @file music-config.js
 * @description 背景音乐播放列表配置文件。
 *
 * 使用方法：
 *   1. 将 MP3 文件放入 assets/music/ 目录
 *   2. 在下方 MUSIC_LIST 数组中添加对应条目 { title, artist, file }
 *   3. 刷新页面后音乐播放器将自动加载新曲目
 *
 * 注意：路径由 getMusicPath() 自动补全，只需填写文件名即可。
 */

/**
 * 音乐播放列表配置。
 * 每个条目包含：
 *   - title:  在播放器界面显示的曲名
 *   - artist: 艺术家 / 乐队名称
 *   - file:   assets/music/ 目录下的文件名（含扩展名）
 */
const MUSIC_LIST = [
    // 格式：{ title: '显示名称', artist: '艺术家', file: '文件名.mp3' }
    { title: 'Bye Bye Monica', artist: 'Brian Cheng', file: 'Brian Cheng - Bye Bye Monica.mp3' },
    { title: '无地自容', artist: '黑豹乐队', file: '黑豹乐队 - 无地自容.mp3' },
];

/**
 * 根据文件名拼接完整的音乐资源路径（相对于站点根）。
 * @param {string} filename - MP3 文件名，如 'song.mp3'
 * @returns {string} 完整路径，如 'assets/music/song.mp3'
 */
function getMusicPath(filename) {
    return `assets/music/${filename}`;
}

/**
 * 返回带有完整 path 字段的音乐列表，供播放器直接消费。
 * @returns {Array<{title:string, artist:string, file:string, path:string}>}
 */
function getMusicList() {
    return MUSIC_LIST.map(item => ({
        ...item,
        path: getMusicPath(item.file)
    }));
}
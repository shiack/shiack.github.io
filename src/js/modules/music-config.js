// ============================================
// 音乐配置文件 - 只需简单配置即可添加背景音乐
// ============================================
// 使用方法：
// 1. 将 MP3 文件放入 assets/music/ 目录
// 2. 在下面的 MUSIC_LIST 数组中添加音乐信息
// 3. 刷新页面即可播放新添加的音乐
// ============================================

const MUSIC_LIST = [
    // 格式：{ title: '显示名称', artist: '艺术家', file: '文件名.mp3' }
    { title: 'Bye Bye Monica', artist: 'Brian Cheng', file: 'Brian Cheng - Bye Bye Monica.mp3' },
    { title: '无地自容', artist: '黑豹乐队', file: '黑豹乐队 - 无地自容.mp3' },
];

// 获取音乐完整路径（自动处理相对路径）
function getMusicPath(filename) {
    return `src/assets/music/${filename}`;
}

// 获取音乐列表（带完整路径）
function getMusicList() {
    return MUSIC_LIST.map(item => ({
        ...item,
        path: getMusicPath(item.file)
    }));
}
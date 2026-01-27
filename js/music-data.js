/* =====================================================
   MUSIC DATA - НЕ ТРОГАТЬ ПРИ ОБНОВЛЕНИЯХ!
   
   Файл: js/music-data.js
   Статус: НОВЫЙ ФАЙЛ - создать в папке js/
   ===================================================== */

const MUSIC_DATA = {
    version: '1.0.0',
    lastUpdated: '2025-01-27',
    
    // Категории
    categories: [
        { id: 'all', name: 'Все треки', icon: '🎵' },
        { id: 'holiday', name: 'Праздничная', icon: '🎂' },
        { id: 'calm', name: 'Спокойная', icon: '😌' },
        { id: 'cinematic', name: 'Кинематографичная', icon: '🎬' },
        { id: 'happy', name: 'Весёлая', icon: '😊' },
        { id: 'corporate', name: 'Корпоративная', icon: '💼' },
        { id: 'romantic', name: 'Романтичная', icon: '💕' },
        { id: 'energetic', name: 'Энергичная', icon: '⚡' },
        { id: 'nature', name: 'Природа', icon: '🌿' },
        { id: 'custom', name: 'Мои треки', icon: '📁' }
    ],
    
    // Встроенные треки (добавляйте ссылки на MP3)
    tracks: [
        // Пример:
        // { id: 'track1', title: 'Happy Birthday', artist: 'Pixabay', url: 'https://...mp3', category: 'holiday', duration: 120 }
    ],
    
    // Кастомные (загружаются из Supabase)
    custom: []
};

// Получить все треки
function getAllTracks() {
    return [...MUSIC_DATA.tracks, ...MUSIC_DATA.custom];
}

// По категории
function getTracksByCategory(category) {
    if (category === 'all') return getAllTracks();
    if (category === 'custom') return MUSIC_DATA.custom;
    return getAllTracks().filter(t => t.category === category);
}

// Категории
function getMusicCategories() {
    return MUSIC_DATA.categories;
}

// По ID
function getTrackById(id) {
    return getAllTracks().find(t => t.id === id);
}

// Добавить кастомный
function addCustomTrack(trackData) {
    if (!trackData.url || !trackData.title) return null;
    
    const newTrack = {
        id: 'custom_' + Date.now(),
        title: trackData.title,
        artist: trackData.artist || 'Unknown',
        url: trackData.url,
        category: trackData.category || 'custom',
        duration: trackData.duration || 0,
        custom: true
    };
    
    MUSIC_DATA.custom.push(newTrack);
    localStorage.setItem('ai_studio_custom_music', JSON.stringify(MUSIC_DATA.custom));
    return newTrack;
}

// Удалить кастомный
function removeCustomTrack(trackId) {
    const index = MUSIC_DATA.custom.findIndex(t => t.id === trackId);
    if (index === -1) return false;
    MUSIC_DATA.custom.splice(index, 1);
    localStorage.setItem('ai_studio_custom_music', JSON.stringify(MUSIC_DATA.custom));
    return true;
}

// Загрузить из localStorage
(function loadFromStorage() {
    const saved = localStorage.getItem('ai_studio_custom_music');
    if (saved) {
        try {
            MUSIC_DATA.custom = JSON.parse(saved);
        } catch (e) {}
    }
})();

// Экспорт
window.MUSIC_DATA = MUSIC_DATA;
window.getAllTracks = getAllTracks;
window.getTracksByCategory = getTracksByCategory;
window.getMusicCategories = getMusicCategories;
window.getTrackById = getTrackById;
window.addCustomTrack = addCustomTrack;
window.removeCustomTrack = removeCustomTrack;

console.log('🎵 Music Data loaded:', getAllTracks().length, 'tracks');

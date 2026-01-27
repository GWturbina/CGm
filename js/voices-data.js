/* =====================================================
   VOICES DATA - НЕ ТРОГАТЬ ПРИ ОБНОВЛЕНИЯХ!
   
   Файл: js/voices-data.js
   Статус: НОВЫЙ ФАЙЛ - создать в папке js/
   ===================================================== */

const VOICES_DATA = {
    version: '1.0.0',
    lastUpdated: '2025-01-27',
    
    // Украинские/Русские голоса
    slavic: [
        { id: '9Sj8ugvpK1DmcAXyvi3a', name: 'Алекс Некрасов', gender: 'male', language: 'ru,ua', description: 'Глубокий мужской голос, профессиональный диктор', category: 'narrator' },
        { id: '2o2uQnlGaNuV3ObRpxXt', name: 'Тарас Бойко', gender: 'male', language: 'ua', description: 'Украинский мужской голос, тёплый', category: 'warm' },
        { id: 'BFmokXObxZMCBXC0A9ny', name: 'Владимир', gender: 'male', language: 'ru', description: 'Русский мужской, деловой стиль', category: 'business' },
        { id: 'TEyBWD5tAHAWqAGEv6yI', name: 'Евгений', gender: 'male', language: 'ru', description: 'Молодой энергичный голос', category: 'energetic' },
        { id: 'B31Kx7rXmNnYqp1QWHR2', name: 'Леонид Драпей', gender: 'male', language: 'ru,ua', description: 'Спокойный нарратор', category: 'narrator' },
        { id: 'bsourKGZEagmttzrIzmu', name: 'Анна Степаненко', gender: 'female', language: 'ua', description: 'Украинский женский, приятный', category: 'pleasant' }
    ],
    
    // Дополнительные мужские
    maleExtra: [
        { id: 'h9NSQvWZaC4NFusYsxT9', name: 'Голос M6', gender: 'male', language: 'multilingual', description: 'Дополнительный мужской голос', category: 'extra' },
        { id: 'FqTvupDLWXjo91Dte1vR', name: 'Голос M7', gender: 'male', language: 'multilingual', description: 'Дополнительный мужской голос', category: 'extra' },
        { id: '0ZQZuw8Sn4cU0rN1Tm2K', name: 'Голос M8', gender: 'male', language: 'multilingual', description: 'Дополнительный мужской голос', category: 'extra' },
        { id: 'ARxhnQPZCfSLpMBASSii', name: 'Голос M9', gender: 'male', language: 'multilingual', description: 'Дополнительный мужской голос', category: 'extra' },
        { id: 'Ntd0iVwICtUtA6Fvx27M', name: 'Голос M10', gender: 'male', language: 'multilingual', description: 'Дополнительный мужской голос', category: 'extra' }
    ],
    
    // Дополнительные женские
    femaleExtra: [
        { id: 'dZde1M1SiLkAKiqjpqqT', name: 'Голос F2', gender: 'female', language: 'multilingual', description: 'Дополнительный женский голос', category: 'extra' },
        { id: '3rWBcFHu7rpPUEJQYEqD', name: 'Голос F3', gender: 'female', language: 'multilingual', description: 'Дополнительный женский голос', category: 'extra' },
        { id: '4nLP0u2B3yI0lyzATFnN', name: 'Голос F4', gender: 'female', language: 'multilingual', description: 'Дополнительный женский голос', category: 'extra' },
        { id: 'bg0e02brzo3RVUEbuZeo', name: 'Голос F5', gender: 'female', language: 'multilingual', description: 'Дополнительный женский голос', category: 'extra' },
        { id: 'a30ekmfK56EKHR341YaO', name: 'Голос F6', gender: 'female', language: 'multilingual', description: 'Дополнительный женский голос', category: 'extra' },
        { id: '96XEXOjZRHooATdYA8FY', name: 'Голос F7', gender: 'female', language: 'multilingual', description: 'Дополнительный женский голос', category: 'extra' },
        { id: 'BEprpS2vpgM32yNJpTXq', name: 'Голос F8', gender: 'female', language: 'multilingual', description: 'Дополнительный женский голос', category: 'extra' },
        { id: '7eVMgwCnXydb3CikjV7a', name: 'Голос F9', gender: 'female', language: 'multilingual', description: 'Дополнительный женский голос', category: 'extra' },
        { id: 'kdVjFjOXaqExaDvXZECX', name: 'Голос F10', gender: 'female', language: 'multilingual', description: 'Дополнительный женский голос', category: 'extra' }
    ],
    
    // Английские голоса
    english: [
        { id: 'pNInz6obpgDQGcFmaJgB', name: 'Adam', gender: 'male', language: 'en', description: 'Deep male voice', category: 'deep' },
        { id: 'ErXwobaYiN019PkySvjV', name: 'Antoni', gender: 'male', language: 'en', description: 'Warm male voice', category: 'warm' },
        { id: 'VR6AewLTigWG4xSOukaG', name: 'Arnold', gender: 'male', language: 'en', description: 'Powerful voice', category: 'powerful' },
        { id: 'TxGEqnHWrfWFTfGW9XjX', name: 'Josh', gender: 'male', language: 'en', description: 'Young energetic', category: 'energetic' },
        { id: 'yoZ06aMxZJJ28mfd3POQ', name: 'Sam', gender: 'male', language: 'en', description: 'Calm narrator', category: 'narrator' },
        { id: '21m00Tcm4TlvDq8ikWAM', name: 'Rachel', gender: 'female', language: 'en', description: 'Pleasant female', category: 'pleasant' },
        { id: 'AZnzlk1XvdvUeBnXmlld', name: 'Domi', gender: 'female', language: 'en', description: 'Energetic female', category: 'energetic' },
        { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Bella', gender: 'female', language: 'en', description: 'Soft female', category: 'soft' },
        { id: 'MF3mGyEYCl7XYWbV9V6O', name: 'Elli', gender: 'female', language: 'en', description: 'Young female', category: 'young' }
    ],
    
    // Кастомные (загружаются из Supabase)
    custom: []
};

// Получить все голоса
function getAllVoices() {
    return [
        ...VOICES_DATA.slavic,
        ...VOICES_DATA.maleExtra,
        ...VOICES_DATA.femaleExtra,
        ...VOICES_DATA.english,
        ...VOICES_DATA.custom
    ];
}

// Получить по языку
function getVoicesByLanguage(lang) {
    return getAllVoices().filter(v => 
        v.language === lang || v.language.includes(lang) || v.language === 'multilingual'
    );
}

// Получить по полу
function getVoicesByGender(gender) {
    return getAllVoices().filter(v => v.gender === gender);
}

// Найти по ID
function getVoiceById(id) {
    return getAllVoices().find(v => v.id === id);
}

// Добавить кастомный
function addCustomVoice(voiceData) {
    if (!voiceData.id || !voiceData.name) return false;
    if (getVoiceById(voiceData.id)) return false;
    
    const newVoice = {
        id: voiceData.id,
        name: voiceData.name,
        gender: voiceData.gender || 'unknown',
        language: voiceData.language || 'multilingual',
        description: voiceData.description || '',
        category: 'custom',
        custom: true
    };
    
    VOICES_DATA.custom.push(newVoice);
    localStorage.setItem('ai_studio_custom_voices', JSON.stringify(VOICES_DATA.custom));
    return true;
}

// Удалить кастомный
function removeCustomVoice(voiceId) {
    const index = VOICES_DATA.custom.findIndex(v => v.id === voiceId);
    if (index === -1) return false;
    VOICES_DATA.custom.splice(index, 1);
    localStorage.setItem('ai_studio_custom_voices', JSON.stringify(VOICES_DATA.custom));
    return true;
}

// Загрузить из localStorage
(function loadFromStorage() {
    const saved = localStorage.getItem('ai_studio_custom_voices');
    if (saved) {
        try {
            VOICES_DATA.custom = JSON.parse(saved);
        } catch (e) {}
    }
})();

// Экспорт
window.VOICES_DATA = VOICES_DATA;
window.getAllVoices = getAllVoices;
window.getVoicesByLanguage = getVoicesByLanguage;
window.getVoicesByGender = getVoicesByGender;
window.getVoiceById = getVoiceById;
window.addCustomVoice = addCustomVoice;
window.removeCustomVoice = removeCustomVoice;

console.log('🎙️ Voices Data loaded:', getAllVoices().length, 'voices');

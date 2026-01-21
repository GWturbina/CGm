// =============================================
// OG PREVIEW - Короткие ссылки с превью
// =============================================

// Базовый URL
const OG_BASE_URL = window.location.origin;

// =============================================
// ГЕНЕРАЦИЯ ССЫЛОК
// =============================================

// Получить короткую ссылку на опрос
function getSurveyShareLink(shortCode) {
    return `${OG_BASE_URL}/s/${shortCode}`;
}

// Получить короткую ссылку на открытку
function getCardShareLink(shortCode) {
    return `${OG_BASE_URL}/c/${shortCode}`;
}

// Скопировать ссылку на опрос
async function copySurveyLink(shortCode) {
    const link = getSurveyShareLink(shortCode);
    
    try {
        await navigator.clipboard.writeText(link);
        showNotification('Ссылка скопирована! 📋', 'success');
    } catch (e) {
        // Fallback
        const input = document.createElement('input');
        input.value = link;
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        document.body.removeChild(input);
        showNotification('Ссылка скопирована! 📋', 'success');
    }
    
    return link;
}

// Скопировать ссылку на открытку
async function copyCardLink(shortCode) {
    const link = getCardShareLink(shortCode);
    
    try {
        await navigator.clipboard.writeText(link);
        showNotification('Ссылка скопирована! 📋', 'success');
    } catch (e) {
        const input = document.createElement('input');
        input.value = link;
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        document.body.removeChild(input);
        showNotification('Ссылка скопирована! 📋', 'success');
    }
    
    return link;
}

// =============================================
// ПРЕВЬЮ В ИНТЕРФЕЙСЕ
// =============================================

// Показать превью ссылки
function showLinkPreview(shortCode, type = 'survey') {
    const link = type === 'survey' ? getSurveyShareLink(shortCode) : getCardShareLink(shortCode);
    const ogImageUrl = `${OG_BASE_URL}/api/og-image?type=${type}&title=Preview`;
    
    // Удалить старую модалку
    document.getElementById('link-preview-modal')?.remove();
    
    const html = `
        <div id="link-preview-modal" class="modal-overlay" style="display: flex !important;">
            <div class="modal-content" style="max-width: 500px;">
                <div class="modal-header">
                    <h2>🔗 Ссылка для шаринга</h2>
                    <button class="modal-close" onclick="document.getElementById('link-preview-modal').remove()">✕</button>
                </div>
                <div class="modal-body">
                    <!-- Превью как в мессенджере -->
                    <div style="border: 1px solid var(--border); border-radius: 12px; overflow: hidden; margin-bottom: 20px;">
                        <img src="${ogImageUrl}" style="width: 100%; display: block;" alt="Preview">
                    </div>
                    
                    <!-- Ссылка -->
                    <div class="form-group">
                        <label>Короткая ссылка</label>
                        <div style="display: flex; gap: 10px;">
                            <input type="text" class="form-input" value="${link}" readonly style="flex: 1;">
                            <button class="btn btn-yellow" onclick="navigator.clipboard.writeText('${link}'); showNotification('Скопировано!', 'success');">📋</button>
                        </div>
                    </div>
                    
                    <!-- Кнопки шаринга -->
                    <div style="display: flex; flex-wrap: wrap; gap: 10px; margin-top: 15px;">
                        <a href="https://t.me/share/url?url=${encodeURIComponent(link)}" target="_blank" class="btn btn-gray" style="flex: 1; text-align: center;">
                            📱 Telegram
                        </a>
                        <a href="https://api.whatsapp.com/send?text=${encodeURIComponent(link)}" target="_blank" class="btn btn-gray" style="flex: 1; text-align: center;">
                            💬 WhatsApp
                        </a>
                        <a href="https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(link)}" target="_blank" class="btn btn-gray" style="flex: 1; text-align: center;">
                            📘 Facebook
                        </a>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-gray" onclick="document.getElementById('link-preview-modal').remove()">Закрыть</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', html);
}

// =============================================
// ВЫБОР ТЕМЫ ПРЕВЬЮ
// =============================================

function showThemeSelector(callback) {
    document.getElementById('theme-selector-modal')?.remove();
    
    const themes = [
        { id: 'dark', name: 'Тёмная', emoji: '🌙', preview: 'linear-gradient(135deg, #1a1a2e, #0f0f23)' },
        { id: 'light', name: 'Светлая', emoji: '☀️', preview: 'linear-gradient(135deg, #f5f7fa, #c3cfe2)' },
        { id: 'gold', name: 'Золотая', emoji: '✨', preview: 'linear-gradient(135deg, #2c1810, #0d0705)' },
        { id: 'blue', name: 'Синяя', emoji: '💙', preview: 'linear-gradient(135deg, #667eea, #764ba2)' },
        { id: 'green', name: 'Зелёная', emoji: '💚', preview: 'linear-gradient(135deg, #134e5e, #71b280)' }
    ];
    
    const html = `
        <div id="theme-selector-modal" class="modal-overlay" style="display: flex !important;">
            <div class="modal-content" style="max-width: 400px;">
                <div class="modal-header">
                    <h2>🎨 Выберите тему превью</h2>
                    <button class="modal-close" onclick="document.getElementById('theme-selector-modal').remove()">✕</button>
                </div>
                <div class="modal-body">
                    <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px;">
                        ${themes.map(t => `
                            <div onclick="document.getElementById('theme-selector-modal').remove(); ${callback}('${t.id}')" 
                                 style="background: ${t.preview}; padding: 20px; border-radius: 10px; cursor: pointer; text-align: center; border: 2px solid transparent; transition: all 0.2s;"
                                 onmouseover="this.style.borderColor='var(--gold)'" 
                                 onmouseout="this.style.borderColor='transparent'">
                                <div style="font-size: 24px;">${t.emoji}</div>
                                <div style="color: white; margin-top: 5px;">${t.name}</div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', html);
}

// =============================================
// ВЫБОР ЭМОДЗИ
// =============================================

function showEmojiSelector(callback) {
    document.getElementById('emoji-selector-modal')?.remove();
    
    const emojis = ['📋', '📊', '❓', '💡', '🎯', '⭐', '🏆', '💼', '📈', '🎓', '💰', '❤️', '🎴', '🎁', '💌', '🎉', '🎂', '🌟', '🚀', '🔥'];
    
    const html = `
        <div id="emoji-selector-modal" class="modal-overlay" style="display: flex !important;">
            <div class="modal-content" style="max-width: 350px;">
                <div class="modal-header">
                    <h2>😀 Выберите иконку</h2>
                    <button class="modal-close" onclick="document.getElementById('emoji-selector-modal').remove()">✕</button>
                </div>
                <div class="modal-body">
                    <div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px;">
                        ${emojis.map(e => `
                            <div onclick="document.getElementById('emoji-selector-modal').remove(); ${callback}('${e}')" 
                                 style="font-size: 28px; padding: 10px; text-align: center; cursor: pointer; border-radius: 8px; transition: all 0.2s;"
                                 onmouseover="this.style.background='var(--bg-card)'" 
                                 onmouseout="this.style.background='transparent'">
                                ${e}
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', html);
}

// =============================================
// ТЕСТ ПРЕВЬЮ
// =============================================

// Открыть OG дебаггер для проверки
function testOgPreview(url) {
    // Facebook
    window.open(`https://developers.facebook.com/tools/debug/?q=${encodeURIComponent(url)}`, '_blank');
}

// Показать как выглядит превью
function previewOgImage(title, description, emoji, theme) {
    const params = new URLSearchParams({
        type: 'survey',
        title: title || 'Тестовый опрос',
        desc: description || 'Описание опроса',
        emoji: emoji || '📋',
        theme: theme || 'dark'
    });
    
    const url = `${OG_BASE_URL}/api/og-image?${params}`;
    window.open(url, '_blank');
}

console.log('✅ OG Preview module loaded');

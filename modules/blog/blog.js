/* =====================================================
   CARDGIFT - BLOG MODULE
   Вырезано из dashboard.js (строки 3348-3738)
   
   Зависимости:
   - window.SupabaseClient (supabase.js)
   - window.showToast (common.js)
   - window.currentDisplayId, window.currentGwId (dashboard.js)
   
   Глобальные переменные (объявить в dashboard.js):
   - blogSettings
   - blogLogoFile
   - selectedBlogColor
   - currentUserLevel
   ===================================================== */

function initBlogSection() {
    // Проверяем уровень доступа
    const blogRestricted = document.getElementById('blogRestricted');
    const blogContent = document.getElementById('blogContent');
    
    if (currentUserLevel >= 4) {
        if (blogRestricted) blogRestricted.style.display = 'none';
        if (blogContent) blogContent.style.display = 'block';
        loadBlogSettings();
    } else {
        if (blogRestricted) blogRestricted.style.display = 'block';
        if (blogContent) blogContent.style.display = 'none';
    }
    
    // Счётчик символов описания
    const descInput = document.getElementById('blogDescription');
    if (descInput) {
        descInput.addEventListener('input', () => {
            const lengthEl = document.getElementById('blogDescLength');
            if (lengthEl) lengthEl.textContent = descInput.value.length;
        });
    }
}

/**
 * Загрузить настройки блога
 */
async function loadBlogSettings() {
    const userId = window.currentDisplayId || window.currentGwId;
    if (!userId) return;
    
    console.log('📝 Loading blog settings for:', userId);
    
    if (!window.SupabaseClient || !SupabaseClient.client) {
        console.warn('Supabase not available');
        return;
    }
    
    try {
        // Нормализуем ID
        let gwId = userId;
        if (!gwId.startsWith('GW') && /^\d+$/.test(gwId)) {
            gwId = 'GW' + gwId;
        }
        
        const { data, error } = await SupabaseClient.client
            .from('blog_settings')
            .select('*')
            .eq('user_gw_id', gwId)
            .limit(1);
        
        if (error) throw error;
        
        if (data && data[0]) {
            blogSettings = data[0];
            applyBlogSettingsToForm();
        } else {
            // Дефолтные настройки
            blogSettings = {
                user_gw_id: gwId,
                username: '',
                blog_title: '',
                blog_description: '',
                theme_color: '#FFD700',
                logo_url: null
            };
        }
        
        updateBlogLink();
        
    } catch (e) {
        console.error('Error loading blog settings:', e);
    }
}

/**
 * Применить настройки к форме
 */
function applyBlogSettingsToForm() {
    if (!blogSettings) return;
    
    const usernameInput = document.getElementById('blogUsername');
    const titleInput = document.getElementById('blogTitle');
    const descInput = document.getElementById('blogDescription');
    const logoPreview = document.getElementById('blogLogoPreview');
    
    if (usernameInput) usernameInput.value = blogSettings.username || '';
    if (titleInput) titleInput.value = blogSettings.blog_title || '';
    if (descInput) {
        descInput.value = blogSettings.blog_description || '';
        const lengthEl = document.getElementById('blogDescLength');
        if (lengthEl) lengthEl.textContent = descInput.value.length;
    }
    
    // Цвет
    selectedBlogColor = blogSettings.theme_color || '#FFD700';
    document.querySelectorAll('.color-option').forEach(el => {
        el.style.border = el.dataset.color === selectedBlogColor ? '3px solid #FFF' : '3px solid transparent';
    });
    
    // Логотип
    if (logoPreview) {
        if (blogSettings.logo_url) {
            logoPreview.innerHTML = `<img src="${blogSettings.logo_url}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">`;
        } else {
            logoPreview.innerHTML = '📝';
            logoPreview.style.background = `linear-gradient(135deg, ${selectedBlogColor}, ${adjustColor(selectedBlogColor, -30)})`;
        }
    }
}

/**
 * Сохранить настройки блога
 */
async function saveBlogSettings() {
    const userId = window.currentDisplayId || window.currentGwId;
    if (!userId) {
        showToast('Подключите кошелек', 'error');
        return;
    }
    
    const username = document.getElementById('blogUsername')?.value.trim();
    const title = document.getElementById('blogTitle')?.value.trim();
    const description = document.getElementById('blogDescription')?.value.trim();
    
    // Валидация username
    if (!username || username.length < 3) {
        showToast('Username должен быть минимум 3 символа', 'error');
        return;
    }
    
    if (!/^[a-z0-9_]+$/.test(username)) {
        showToast('Username может содержать только a-z, 0-9, _', 'error');
        return;
    }
    
    showToast('Сохранение...', 'info');
    
    try {
        let gwId = userId;
        if (!gwId.startsWith('GW') && /^\d+$/.test(gwId)) {
            gwId = 'GW' + gwId;
        }
        
        // Загружаем логотип если есть
        let logoUrl = blogSettings?.logo_url || null;
        if (blogLogoFile) {
            logoUrl = await uploadBlogLogo(blogLogoFile, gwId);
        }
        
        const settingsData = {
            user_gw_id: gwId,
            username: username,
            blog_title: title || `Блог @${username}`,
            blog_description: description || '',
            theme_color: selectedBlogColor,
            logo_url: logoUrl
        };
        
        // Upsert - обновить или создать
        const { data, error } = await SupabaseClient.client
            .from('blog_settings')
            .upsert(settingsData, { 
                onConflict: 'user_gw_id',
                returning: 'representation'
            })
            .select();
        
        if (error) {
            // Если ошибка уникальности username
            if (error.code === '23505' && error.message.includes('username')) {
                showToast('Этот username уже занят', 'error');
                return;
            }
            throw error;
        }
        
        blogSettings = data[0] || settingsData;
        blogLogoFile = null;
        
        updateBlogLink();
        showToast('Настройки сохранены! ✅', 'success');
        
    } catch (e) {
        console.error('Error saving blog settings:', e);
        showToast('Ошибка сохранения: ' + e.message, 'error');
    }
}

/**
 * Обновить ссылку на блог
 */
function updateBlogLink() {
    const linkInput = document.getElementById('blogLinkInput');
    const shortLinkSpan = document.getElementById('shortBlogLink');
    
    const username = blogSettings?.username || document.getElementById('blogUsername')?.value.trim();
    const domain = window.location.origin;
    
    if (username && username.length >= 3) {
        const fullLink = `${domain}/blog.html?user=${username}`;
        const shortLink = `${domain}/b/${username}`;
        
        if (linkInput) linkInput.value = fullLink;
        if (shortLinkSpan) {
            shortLinkSpan.innerHTML = `<a href="${shortLink}" target="_blank" style="color: #4CAF50; text-decoration: none;">${shortLink}</a>`;
        }
    } else {
        if (linkInput) linkInput.value = 'Настройте username для получения ссылки';
        if (shortLinkSpan) shortLinkSpan.textContent = '—';
    }
}

/**
 * Выбор цвета темы
 */
function selectBlogColor(el) {
    selectedBlogColor = el.dataset.color;
    document.querySelectorAll('.color-option').forEach(opt => {
        opt.style.border = '3px solid transparent';
    });
    el.style.border = '3px solid #FFF';
    
    // Обновляем превью логотипа
    const logoPreview = document.getElementById('blogLogoPreview');
    if (logoPreview && !blogSettings?.logo_url && !blogLogoFile) {
        logoPreview.style.background = `linear-gradient(135deg, ${selectedBlogColor}, ${adjustColor(selectedBlogColor, -30)})`;
    }
}

function selectCustomColor(input) {
    selectedBlogColor = input.value;
    document.querySelectorAll('.color-option').forEach(opt => {
        opt.style.border = '3px solid transparent';
    });
}

/**
 * Превью логотипа
 */
function previewBlogLogo(input) {
    if (input.files && input.files[0]) {
        const file = input.files[0];
        
        if (file.size > 2 * 1024 * 1024) {
            showToast('Файл слишком большой (макс. 2MB)', 'error');
            return;
        }
        
        blogLogoFile = file;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            const logoPreview = document.getElementById('blogLogoPreview');
            if (logoPreview) {
                logoPreview.innerHTML = `<img src="${e.target.result}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">`;
            }
        };
        reader.readAsDataURL(file);
    }
}

function removeBlogLogo() {
    blogLogoFile = null;
    if (blogSettings) blogSettings.logo_url = null;
    
    const logoPreview = document.getElementById('blogLogoPreview');
    if (logoPreview) {
        logoPreview.innerHTML = '📝';
        logoPreview.style.background = `linear-gradient(135deg, ${selectedBlogColor}, ${adjustColor(selectedBlogColor, -30)})`;
    }
    
    document.getElementById('blogLogoInput').value = '';
}

/**
 * Загрузить логотип в Supabase Storage
 */
async function uploadBlogLogo(file, gwId) {
    // TODO: Реализовать загрузку в Supabase Storage
    // Пока возвращаем base64
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.readAsDataURL(file);
    });
}

/**
 * Копировать ссылку на блог
 */
function copyBlogLink() {
    const username = blogSettings?.username;
    if (!username) {
        showToast('Сначала настройте username', 'warning');
        return;
    }
    
    const shortLink = `${window.location.origin}/b/${username}`;
    navigator.clipboard.writeText(shortLink);
    showToast('Ссылка скопирована!', 'success');
}

/**
 * Поделиться ссылкой на блог
 */
function shareBlogLink() {
    const username = blogSettings?.username;
    if (!username) {
        showToast('Сначала настройте username', 'warning');
        return;
    }
    
    const shortLink = `${window.location.origin}/b/${username}`;
    const title = blogSettings?.blog_title || `Блог @${username}`;
    
    if (navigator.share) {
        navigator.share({ title: title, url: shortLink });
    } else {
        copyBlogLink();
    }
}

/**
 * Открыть превью блога
 */
function openBlogPreview() {
    const username = blogSettings?.username || document.getElementById('blogUsername')?.value.trim();
    if (!username || username.length < 3) {
        showToast('Сначала настройте username', 'warning');
        return;
    }
    
    window.open(`/blog.html?user=${username}`, '_blank');
}

/**
 * Создать новый пост
 */
function createNewPost() {
    showToast('Редактор постов скоро будет доступен!', 'info');
    // TODO: Открыть модальное окно редактора постов
}

/**
 * Показать справку по блогу
 */
function showBlogHelp() {
    document.getElementById('blogHelpModal').style.display = 'flex';
}

function closeBlogHelp() {
    document.getElementById('blogHelpModal').style.display = 'none';
}

/**
 * Вспомогательная функция для цвета
 */
function adjustColor(color, amount) {
    const hex = color.replace('#', '');
    const num = parseInt(hex, 16);
    const r = Math.min(255, Math.max(0, (num >> 16) + amount));
    const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00FF) + amount));
    const b = Math.min(255, Math.max(0, (num & 0x0000FF) + amount));
    return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

// Автозагрузка при переходе на секцию
const originalShowSectionBlog = window.showSection;
window.showSection = function(section) {
    if (originalShowSectionBlog) originalShowSectionBlog(section);
    if (section === 'blog') {
        setTimeout(initBlogSection, 100);
    }
};

// Экспорт функций
window.initBlogSection = initBlogSection;
window.loadBlogSettings = loadBlogSettings;
window.saveBlogSettings = saveBlogSettings;
window.selectBlogColor = selectBlogColor;
window.selectCustomColor = selectCustomColor;
window.previewBlogLogo = previewBlogLogo;
window.removeBlogLogo = removeBlogLogo;
window.copyBlogLink = copyBlogLink;
window.shareBlogLink = shareBlogLink;
window.openBlogPreview = openBlogPreview;
window.createNewPost = createNewPost;
window.showBlogHelp = showBlogHelp;
window.closeBlogHelp = closeBlogHelp;


console.log('📝 Blog Module loaded');

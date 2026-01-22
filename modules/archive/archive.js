/* =====================================================
   CARDGIFT - ARCHIVE MODULE (ОБЪЕДИНЁННЫЙ)
   
   Объединены секции из dashboard.js:
   - Блок 1: строки 1578-1957 (базовые функции БЕЗ renderCards)
   - Блок 2: строки 4061-4903 (шаблоны v2 с актуальным renderCards)
   - Блок 3: строки 5084-5150 (toggle функции)
   
   Зависимости:
   - window.SupabaseClient (supabase.js)
   - window.escapeHtml (common.js)
   - window.showToast (common.js)
   
   Глобальные переменные:
   - cards (массив)
   - archiveCategories, corporateTemplates, leaderTemplates
   ===================================================== */

console.log('📁 Archive.js START loading...');

// ===== ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ АРХИВА =====
let archiveCategories = [];
let corporateTemplates = [];
let leaderTemplates = [];
// currentArchiveTab объявлена в modules-fix.js
// cards объявлена в modules-fix.js
let templateFilter = null; // Фильтр шаблонов
// walletAddress используем из window.walletAddress или localStorage

// Используем глобальные функции из common.js
// escapeHtml и showToast уже определены там

console.log('📁 Archive.js globals defined OK');

// =====================================================
// ЧАСТЬ 1: БАЗОВЫЕ ФУНКЦИИ (loadCards, saveCards, view, share, delete, search)
// Из строк 1578-1727 (до первого renderCards)
// =====================================================

async function loadCards() {
    console.log('📂 Loading cards...');
    
    // Получаем все возможные ID пользователя
    const gwId = localStorage.getItem('cardgift_gw_id') || 
                 localStorage.getItem('gw_id') || 
                 window.userGwId || 
                 window.displayId;
    
    const cleanGwId = gwId ? gwId.toString().replace('GW', '') : null;
    const gwIdWithPrefix = gwId ? (gwId.toString().startsWith('GW') ? gwId : 'GW' + gwId) : null;
    const walletAddr = window.walletAddress || localStorage.getItem('walletAddress') || null;
    
    console.log('🔍 User IDs for cards:', { gwId, cleanGwId, gwIdWithPrefix, walletAddr });
    
    // Способ 1: Пробуем загрузить из Supabase напрямую
    if (window.SupabaseClient && SupabaseClient.client) {
        try {
            // Ищем по owner_gw_id (с префиксом GW и без)
            if (cleanGwId) {
                console.log('🔍 Searching cards by owner_gw_id:', gwIdWithPrefix, 'or', cleanGwId);
                
                const { data: supabaseCards, error } = await SupabaseClient.client
                    .from('cards')
                    .select('*')
                    .or(`owner_gw_id.eq.${gwIdWithPrefix},owner_gw_id.eq.${cleanGwId}`)
                    .order('created_at', { ascending: false })
                    .limit(100);
                
                if (error) {
                    console.warn('⚠️ Supabase query error:', error.message);
                } else if (supabaseCards && supabaseCards.length > 0) {
                    cards = supabaseCards.map(card => ({
                        id: card.id,
                        title: card.card_data?.title || card.card_data?.message?.split('\n')[0] || 'Без названия',
                        short_code: card.short_code,
                        shortCode: card.short_code,
                        preview: card.card_data?.image_url || card.card_data?.mediaUrl,
                        mediaUrl: card.card_data?.image_url || card.card_data?.mediaUrl,
                        image_url: card.card_data?.image_url,
                        bgColor: '#333',
                        date: new Date(card.created_at).toLocaleDateString(),
                        greeting: card.card_data?.message || card.card_data?.greeting || card.card_data?.greetingText,
                        greetingText: card.card_data?.greetingText || card.card_data?.greeting,
                        views: card.views || card.views_count || 0,
                        card_data: card.card_data
                    }));
                    console.log('✅ Loaded', cards.length, 'cards from Supabase');
                    
                    // Применяем фильтр шаблонов если указан
                    cards = applyTemplateFilter(cards);
                    
                    // СНАЧАЛА показываем карточки
                    renderCards();
                    
                    // Потом пытаемся закэшировать (не критично)
                    
                    return;
                } else {
                    console.log('📭 No cards in Supabase for owner_gw_id:', gwIdWithPrefix);
                }
            }
            
            // Способ 2: Через getUserByWallet
            if (walletAddr && walletAddr !== '0xAUTHOR_MODE' && SupabaseClient.getUserByWallet) {
                const user = await SupabaseClient.getUserByWallet(walletAddr);
                if (user && user.gw_id) {
                    const userId = user.gw_id.toString();
                    const userIdWithGW = userId.startsWith('GW') ? userId : 'GW' + userId;
                    
                    if (SupabaseClient.getCards) {
                        const userCards = await SupabaseClient.getCards(userId, 100);
                        if (userCards && userCards.length > 0) {
                            cards = userCards.map(card => ({
                                id: card.id,
                                title: card.card_data?.title || card.card_data?.message?.split('\n')[0] || 'Без названия',
                                short_code: card.short_code,
                                shortCode: card.short_code,
                                preview: card.card_data?.image_url || card.card_data?.mediaUrl,
                                mediaUrl: card.card_data?.image_url || card.card_data?.mediaUrl,
                                image_url: card.card_data?.image_url,
                                bgColor: '#333',
                                date: new Date(card.created_at).toLocaleDateString(),
                                greeting: card.card_data?.message || card.card_data?.greeting || card.card_data?.greetingText,
                                greetingText: card.card_data?.greetingText || card.card_data?.greeting,
                                views: card.views || card.views_count || 0,
                                card_data: card.card_data
                            }));
                            console.log('✅ Loaded', cards.length, 'cards via getCards()');
                            renderCards();
                            
                            return;
                        }
                    }
                }
            }
        } catch (e) {
            console.warn('⚠️ Supabase cards load failed:', e);
        }
    }
    
    // Способ 3: Через API (fallback когда Supabase клиент не инициализирован)
    if (gwIdWithPrefix || cleanGwId) {
        console.log('📡 Trying to load cards via API...');
        try {
            const response = await fetch(`/api/get-cards?gw_id=${gwIdWithPrefix || cleanGwId}`);
            if (response.ok) {
                const result = await response.json();
                if (result.success && result.cards && result.cards.length > 0) {
                    cards = result.cards.map(card => ({
                        id: card.id,
                        title: card.card_data?.title || card.card_data?.message?.split('\n')[0] || 'Без названия',
                        short_code: card.short_code,
                        shortCode: card.short_code,
                        preview: card.card_data?.image_url || card.card_data?.mediaUrl,
                        mediaUrl: card.card_data?.image_url || card.card_data?.mediaUrl,
                        image_url: card.card_data?.image_url,
                        bgColor: '#333',
                        date: new Date(card.created_at).toLocaleDateString(),
                        greeting: card.card_data?.message || card.card_data?.greeting || card.card_data?.greetingText,
                        greetingText: card.card_data?.greetingText || card.card_data?.greeting,
                        views: card.views || card.views_count || 0,
                        card_data: card.card_data
                    }));
                    console.log('✅ Loaded', cards.length, 'cards via API');
                    
                    // Применяем фильтр шаблонов если указан
                    cards = applyTemplateFilter(cards);
                    
                    renderCards();
                    
                    return;
                }
            }
        } catch (e) {
            console.warn('⚠️ API cards load failed:', e);
        }
    }
    
    // Если ничего не загрузилось - показываем пустой архив
    console.log('📭 No cards found, showing empty archive');
    cards = [];
    
    renderCards();
}

function saveCards() {
    // Карточки хранятся только в Supabase
    console.log('💾 Cards saved to Supabase (localStorage disabled)');
}

// =====================================================
// ЧАСТЬ 2: ФУНКЦИИ ПОСЛЕ первого renderCards (view, share, delete, search)
// Из строк 1812-1957
// =====================================================

function viewCard(index) {
    const card = cards[index];
    if (!card) return;
    const shortCode = card.short_code || card.shortCode || card.code;
    if (shortCode) {
        window.open(`${window.location.origin}/c/${shortCode}`, '_blank');
    } else {
        showToast('Ссылка не найдена', 'error');
    }
}

function shareCard(index) {
    const card = cards[index];
    if (!card) return;
    const shortCode = card.short_code || card.shortCode || card.code;
    const cardUrl = shortCode ? `${window.location.origin}/c/${shortCode}` : null;
    
    if (!cardUrl) { showToast('Ссылка не найдена', 'error'); return; }
    
    if (navigator.share) {
        navigator.share({ title: card.title, url: cardUrl }).catch(() => {
            navigator.clipboard.writeText(cardUrl);
            showToast('Ссылка скопирована!', 'success');
        });
    } else {
        navigator.clipboard.writeText(cardUrl);
        showToast('Ссылка скопирована!', 'success');
    }
}

async function deleteCard(index) {
    if (!confirm('Удалить открытку? Она будет удалена из базы данных.')) {
        return;
    }
    
    const card = cards[index];
    if (!card) return;
    
    const shortCode = card.short_code || card.shortCode;
    const cardId = card.id;
    
    console.log('🗑️ Deleting card:', shortCode || cardId);
    
    try {
        // 1. Удаляем из Supabase cards
        if (window.SupabaseClient && SupabaseClient.client) {
            if (shortCode) {
                const { error } = await SupabaseClient.client
                    .from('cards')
                    .delete()
                    .eq('short_code', shortCode);
                
                if (error) {
                    console.warn('Supabase delete error:', error.message);
                } else {
                    console.log('✅ Deleted from Supabase cards');
                }
            } else if (cardId) {
                const { error } = await SupabaseClient.client
                    .from('cards')
                    .delete()
                    .eq('id', cardId);
                
                if (error) {
                    console.warn('Supabase delete error:', error.message);
                } else {
                    console.log('✅ Deleted from Supabase cards by id');
                }
            }
        }
        
        // 2. Удаляем из card_templates (если была шаблоном)
        if (shortCode) {
            try {
                await fetch(`/api/delete-template?code=${shortCode}`, { method: 'DELETE' });
                console.log('✅ Removed from card_templates');
            } catch (e) {
                // Игнорируем - может не быть шаблоном
            }
            
            // Также напрямую из Supabase
            if (window.SupabaseClient && SupabaseClient.client) {
                await SupabaseClient.client
                    .from('card_templates')
                    .delete()
                    .eq('code', shortCode);
            }
        }
        
        // 3. Удаляем из Redis через API
        if (shortCode) {
            try {
                await fetch(`/api/delete-card?sc=${shortCode}`, { method: 'DELETE' });
            } catch (e) {
                // Игнорируем
            }
        }
        
        // 4. Удаляем из локального массива
        cards.splice(index, 1);
        saveCards();
        renderCards();
        
        showToast('✅ Открытка удалена', 'success');
        
    } catch (error) {
        console.error('Delete error:', error);
        showToast('Ошибка удаления: ' + error.message, 'error');
    }
}

function searchArchive() {
    const query = document.getElementById('archiveSearch')?.value.toLowerCase() || '';
    let filtered = cards;
    if (query) filtered = filtered.filter(c => (c.title || '').toLowerCase().includes(query));
    
    const grid = document.getElementById('archiveGrid');
    if (!grid) return;
    
    if (filtered.length === 0) {
        grid.innerHTML = '<div class="empty-message">Ничего не найдено</div>';
        return;
    }
    
    grid.innerHTML = filtered.map((card, i) => {
        const realIndex = cards.indexOf(card);
        const shortCode = card.short_code || card.shortCode;
        const hasLink = !!shortCode;
        return `<div class="card-item"><div class="card-preview" style="background:#333;"><div class="card-placeholder">🎴</div></div><div class="card-info"><div class="card-title">${escapeHtml(card.title || 'Без названия')}</div></div><div class="card-actions"><button class="btn-icon ${!hasLink ? 'disabled' : ''}" onclick="viewCard(${realIndex})" ${!hasLink ? 'disabled' : ''}>👁️</button><button class="btn-icon" onclick="deleteCard(${realIndex})">🗑️</button></div></div>`;
    }).join('');
}

function exportCards() {
    const blob = new Blob([JSON.stringify(cards, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'cardgift_cards.json';
    a.click();
    showToast('Архив экспортирован!', 'success');
}

async function forceReloadCards() {
    await loadCards();
    showToast('Архив перезагружен', 'success');
}


// =====================================================
// ЧАСТЬ 3: ШАБЛОНЫ v2 (включая актуальный renderCards, editCard)
// Из строк 4061-4903
// =====================================================

async function initArchiveTemplates() {
    console.log('📁 Initializing archive templates...');
    
    // Загружаем категории
    await loadTemplateCategories();
}

/**
 * Загрузить категории шаблонов
 */
async function loadTemplateCategories() {
    try {
        const { data, error } = await SupabaseClient.client
            .from('template_categories')
            .select('*')
            .eq('is_active', true)
            .order('sort_order', { ascending: true });
        
        if (error) throw error;
        archiveCategories = data || [];
        console.log('📁 Categories loaded:', archiveCategories.length);
        
    } catch (e) {
        console.warn('Categories not loaded:', e.message);
        // Используем дефолтные категории
        archiveCategories = [
            { id: '1', name: 'CardGift', slug: 'cardgift', icon: '🎁', color: '#FFD700' },
            { id: '2', name: 'GlobalWay', slug: 'globalway', icon: '🌐', color: '#4CAF50' },
            { id: '3', name: 'Праздники', slug: 'holidays', icon: '🎉', color: '#FF5722' },
            { id: '4', name: 'Бизнес', slug: 'business', icon: '💼', color: '#2196F3' },
            { id: '5', name: 'Алмазы', slug: 'almazy', icon: '💎', color: '#9C27B0' }
        ];
    }
}

/**
 * Переключение вкладок архива
 */
function switchArchiveTab(tabName) {
    currentArchiveTab = tabName;
    
    // Обновляем активную вкладку
    document.querySelectorAll('.archive-tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.tab === tabName);
    });
    
    // Показываем соответствующий контент
    document.querySelectorAll('.archive-tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(`tab-${tabName}`)?.classList.add('active');
    
    // Загружаем данные
    switch (tabName) {
        case 'my':
            loadMyCards();
            break;
        case 'corporate':
            loadCorporateTemplates();
            break;
        case 'leader':
            loadLeaderTemplates();
            break;
        case 'myTemplates':
            loadMyTemplates();
            break;
        case 'moderation':
            loadModerationTemplates();
            break;
    }
}

/**
 * Загрузить мои открытки (основной архив)
 */
async function loadMyCards() {
    console.log('📂 loadMyCards called');
    await loadCards();
}

/**
 * Загрузить корпоративные шаблоны
 */
async function loadCorporateTemplates() {
    const grid = document.getElementById('corporateGrid');
    const empty = document.getElementById('emptyCorporate');
    
    if (!grid) return;
    
    grid.innerHTML = '<div style="text-align: center; padding: 30px; color: #888;">Загрузка...</div>';
    
    try {
        const { data, error } = await SupabaseClient.client
            .from('card_templates')
            .select(`
                *,
                category:template_categories(name, icon, color)
            `)
            .eq('template_type', 'corporate')
            .eq('is_public', true)
            .eq('is_approved', true)
            .order('uses_count', { ascending: false });
        
        if (error) throw error;
        
        corporateTemplates = data || [];
        
        if (corporateTemplates.length === 0) {
            grid.innerHTML = '';
            empty.style.display = 'block';
            return;
        }
        
        empty.style.display = 'none';
        renderCorporateTemplates(grid, corporateTemplates);
        
    } catch (e) {
        console.error('Error loading corporate templates:', e);
        grid.innerHTML = `
            <div style="text-align: center; padding: 30px;">
                <div style="font-size: 48px; margin-bottom: 15px;">🏢</div>
                <div style="color: #888;">Корпоративные шаблоны скоро появятся!</div>
                <div style="color: #666; font-size: 12px; margin-top: 10px;">Таблица templates ещё не создана</div>
            </div>
        `;
    }
}

/**
 * Рендер корпоративных шаблонов с категориями
 */
function renderCorporateTemplates(container, templates) {
    // Группируем по категориям
    const byCategory = {};
    
    templates.forEach(t => {
        const catName = t.category?.name || 'Другое';
        if (!byCategory[catName]) {
            byCategory[catName] = {
                icon: t.category?.icon || '📁',
                color: t.category?.color || '#888',
                templates: []
            };
        }
        byCategory[catName].templates.push(t);
    });
    
    // Рендерим по категориям
    let html = '';
    
    for (const [catName, catData] of Object.entries(byCategory)) {
        html += `
            <div class="template-category" style="margin-bottom: 30px;">
                <div class="category-header" style="display: flex; align-items: center; gap: 10px; margin-bottom: 15px; padding-bottom: 10px; border-bottom: 2px solid ${catData.color};">
                    <span style="font-size: 24px;">${catData.icon}</span>
                    <h3 style="color: ${catData.color}; margin: 0;">${catName}</h3>
                    <span style="color: #888; font-size: 12px;">(${catData.templates.length})</span>
                </div>
                <div class="category-templates" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 15px;">
        `;
        
        catData.templates.forEach(t => {
            html += renderTemplateCard(t);
        });
        
        html += `</div></div>`;
    }
    
    container.innerHTML = html;
}

/**
 * Загрузить шаблоны от лидеров
 */
async function loadLeaderTemplates() {
    const grid = document.getElementById('leaderGrid');
    const empty = document.getElementById('emptyLeader');
    
    if (!grid) return;
    
    const userId = window.currentDisplayId || window.currentGwId;
    if (!userId) {
        grid.innerHTML = '<div style="text-align: center; padding: 30px; color: #888;">Подключите кошелёк</div>';
        return;
    }
    
    grid.innerHTML = '<div style="text-align: center; padding: 30px; color: #888;">Загрузка...</div>';
    
    try {
        // Нормализуем ID
        let gwId = userId;
        if (!gwId.startsWith('GW') && /^\d+$/.test(gwId)) {
            gwId = 'GW' + gwId;
        }
        
        // Получаем цепочку спонсоров
        const sponsors = await getSponsorsChain(gwId);
        
        if (sponsors.length === 0) {
            grid.innerHTML = '';
            empty.style.display = 'block';
            return;
        }
        
        // Загружаем шаблоны от спонсоров
        const { data, error } = await SupabaseClient.client
            .from('card_templates')
            .select('*')
            .eq('template_type', 'leader')
            .in('owner_gw_id', sponsors.map(s => s.id))
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        leaderTemplates = data || [];
        
        if (leaderTemplates.length === 0) {
            grid.innerHTML = '';
            empty.style.display = 'block';
            return;
        }
        
        empty.style.display = 'none';
        renderLeaderTemplates(grid, leaderTemplates, sponsors);
        
    } catch (e) {
        console.error('Error loading leader templates:', e);
        grid.innerHTML = `
            <div style="text-align: center; padding: 30px;">
                <div style="font-size: 48px; margin-bottom: 15px;">👔</div>
                <div style="color: #888;">Шаблоны от лидеров скоро появятся!</div>
            </div>
        `;
    }
}

/**
 * Получить цепочку спонсоров (до 3 уровней вверх)
 */
async function getSponsorsChain(gwId) {
    const sponsors = [];
    let currentId = gwId;
    
    for (let level = 1; level <= 3; level++) {
        const { data } = await SupabaseClient.client
            .from('users')
            .select('referrer_gw_id, name')
            .eq('gw_id', currentId)
            .single();
        
        if (!data || !data.referrer_gw_id) break;
        
        sponsors.push({
            id: data.referrer_gw_id,
            level: level,
            name: data.name || `Лидер ${level}`
        });
        
        currentId = data.referrer_gw_id;
    }
    
    return sponsors;
}

/**
 * Рендер шаблонов от лидеров
 */
function renderLeaderTemplates(container, templates, sponsors) {
    // Группируем по уровню лидера
    const byLeader = {};
    
    sponsors.forEach(s => {
        byLeader[s.id] = {
            name: s.name,
            level: s.level,
            templates: []
        };
    });
    
    templates.forEach(t => {
        if (byLeader[t.owner_gw_id]) {
            byLeader[t.owner_gw_id].templates.push(t);
        }
    });
    
    let html = '';
    
    for (const [leaderId, leaderData] of Object.entries(byLeader)) {
        if (leaderData.templates.length === 0) continue;
        
        const levelIcon = leaderData.level === 1 ? '⭐' : leaderData.level === 2 ? '⭐⭐' : '⭐⭐⭐';
        
        html += `
            <div class="leader-section" style="margin-bottom: 30px;">
                <div class="leader-header" style="display: flex; align-items: center; gap: 10px; margin-bottom: 15px; padding: 10px; background: linear-gradient(135deg, #2a2a4a, #1a1a2e); border-radius: 12px;">
                    <span style="font-size: 24px;">👔</span>
                    <div>
                        <div style="color: #FFD700; font-weight: bold;">${leaderData.name}</div>
                        <div style="color: #888; font-size: 12px;">${levelIcon} Спонсор ${leaderData.level} уровня</div>
                    </div>
                    <span style="margin-left: auto; color: #4CAF50;">${leaderData.templates.length} шаблонов</span>
                </div>
                <div class="leader-templates" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 15px;">
        `;
        
        leaderData.templates.forEach(t => {
            html += renderTemplateCard(t);
        });
        
        html += `</div></div>`;
    }
    
    container.innerHTML = html || '<div style="text-align: center; padding: 30px; color: #888;">Нет шаблонов от лидеров</div>';
}

/**
 * Рендер карточки шаблона
 */
function renderTemplateCard(template) {
    const imageUrl = template.thumbnail_url || template.image_url || '/images/card-placeholder.png';
    
    return `
        <div class="template-card" style="background: linear-gradient(145deg, #2a2a4a, #1a1a2e); border-radius: 12px; overflow: hidden; border: 1px solid #333; transition: all 0.3s;" 
             onmouseenter="this.style.borderColor='#FFD700'; this.style.transform='translateY(-3px)';"
             onmouseleave="this.style.borderColor='#333'; this.style.transform='translateY(0)';">
            
            <div class="template-image" style="height: 150px; background: url('${imageUrl}') center/cover; position: relative;">
                <div style="position: absolute; bottom: 5px; right: 5px; background: rgba(0,0,0,0.7); padding: 3px 8px; border-radius: 10px; font-size: 11px;">
                    👁️ ${template.views_count || 0} | 📥 ${template.uses_count || 0}
                </div>
            </div>
            
            <div class="template-info" style="padding: 12px;">
                <div style="color: #FFF; font-weight: 500; margin-bottom: 5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                    ${escapeHtml(template.name || 'Без названия')}
                </div>
                <div style="color: #888; font-size: 12px; margin-bottom: 10px; height: 32px; overflow: hidden;">
                    ${escapeHtml(template.description || '')}
                </div>
                
                <div style="display: flex; gap: 8px;">
                    <button class="btn btn-green" style="flex: 1; padding: 8px; font-size: 12px;" onclick="useTemplate('${template.id}')">
                        ✨ Использовать
                    </button>
                    <button class="btn btn-dark" style="padding: 8px; font-size: 12px;" onclick="previewTemplate('${template.id}')">
                        👁️
                    </button>
                </div>
            </div>
        </div>
    `;
}

/**
 * Использовать шаблон - открыть в генераторе
 */
async function useTemplate(templateId) {
    console.log('✨ Using template:', templateId);
    
    try {
        // Загружаем данные шаблона
        const { data: template, error } = await SupabaseClient.client
            .from('card_templates')
            .select('*')
            .eq('id', templateId)
            .single();
        
        if (error) throw error;
        
        // Увеличиваем счётчик использований
        await SupabaseClient.client
            .from('card_templates')
            .update({ uses_count: (template.uses_count || 0) + 1 })
            .eq('id', templateId);
        
        // Сохраняем данные шаблона в localStorage для генератора
        const templateData = {
            fromTemplate: true,
            templateId: templateId,
            templateName: template.name,
            cardData: template.card_data,
            imageUrl: template.image_url
        };
        
        localStorage.setItem('cg_template_data', JSON.stringify(templateData));
        
        // Переходим в генератор
        showToast('Открываем шаблон в генераторе...', 'info');
        
        setTimeout(() => {
            window.location.href = 'generator.html?from=template';
        }, 500);
        
    } catch (e) {
        console.error('Error using template:', e);
        showToast('Ошибка загрузки шаблона', 'error');
    }
}

/**
 * Превью шаблона
 */
async function previewTemplate(templateId) {
    try {
        const { data: template } = await SupabaseClient.client
            .from('card_templates')
            .select('*')
            .eq('id', templateId)
            .single();
        
        if (!template) {
            showToast('Шаблон не найден', 'error');
            return;
        }
        
        // Увеличиваем просмотры
        await SupabaseClient.client
            .from('card_templates')
            .update({ views_count: (template.views_count || 0) + 1 })
            .eq('id', templateId);
        
        // Открываем превью
        if (template.code) {
            window.open(`/card/${template.code}`, '_blank');
        } else if (template.image_url) {
            window.open(template.image_url, '_blank');
        }
        
    } catch (e) {
        console.error('Error previewing template:', e);
    }
}

/**
 * Создать шаблон из своей открытки
 */
async function createTemplateFromCard(cardId, templateType = 'leader') {
    const userId = window.currentDisplayId || window.currentGwId;
    if (!userId) {
        showToast('Подключите кошелёк', 'error');
        return;
    }
    
    try {
        // Загружаем карточку
        const { data: card } = await SupabaseClient.client
            .from('cards')
            .select('*')
            .eq('id', cardId)
            .single();
        
        if (!card) {
            showToast('Открытка не найдена', 'error');
            return;
        }
        
        // Создаём шаблон
        const templateData = {
            name: card.title || 'Мой шаблон',
            description: card.description || '',
            code: card.code,
            image_url: card.image_url,
            card_data: card.card_data || {},
            thumbnail_url: card.thumbnail_url,
            owner_gw_id: userId,
            template_type: templateType,
            is_public: templateType === 'corporate',
            is_approved: templateType === 'leader' // leader шаблоны сразу одобрены
        };
        
        const { data, error } = await SupabaseClient.client
            .from('card_templates')
            .insert(templateData)
            .select()
            .single();
        
        if (error) throw error;
        
        showToast('Шаблон создан! ✅', 'success');
        
        // Обновляем вкладку
        if (templateType === 'leader') {
            switchArchiveTab('myTemplates');
        }
        
    } catch (e) {
        console.error('Error creating template:', e);
        showToast('Ошибка создания шаблона', 'error');
    }
}

/**
 * Загрузить мои шаблоны (для лидеров)
 */
async function loadMyTemplates() {
    const grid = document.getElementById('myTemplatesGrid');
    const empty = document.getElementById('emptyMyTemplates');
    
    if (!grid) return;
    
    const userId = window.currentDisplayId || window.currentGwId;
    if (!userId) return;
    
    try {
        let gwId = userId;
        if (!gwId.startsWith('GW') && /^\d+$/.test(gwId)) {
            gwId = 'GW' + gwId;
        }
        
        const { data, error } = await SupabaseClient.client
            .from('card_templates')
            .select('*')
            .eq('owner_gw_id', gwId)
            .eq('template_type', 'leader')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        if (!data || data.length === 0) {
            grid.innerHTML = '';
            empty.style.display = 'block';
            return;
        }
        
        empty.style.display = 'none';
        
        grid.innerHTML = data.map(t => renderTemplateCard(t)).join('');
        
    } catch (e) {
        console.error('Error loading my templates:', e);
    }
}

// Экспорт функций
window.switchArchiveTab = switchArchiveTab;
window.loadMyCards = loadMyCards;
window.loadCorporateTemplates = loadCorporateTemplates;
window.loadLeaderTemplates = loadLeaderTemplates;
window.useTemplate = useTemplate;
window.previewTemplate = previewTemplate;
window.createTemplateFromCard = createTemplateFromCard;
window.loadMyTemplates = loadMyTemplates;

// ═══════════════════════════════════════════════════════════
// ARCHIVE CARDS + TEMPLATES v2.0
// Заменить функцию renderCards() и добавить функции шаблонов
// ═══════════════════════════════════════════════════════════

/**
 * Применить фильтр шаблонов
 */
function applyTemplateFilter(cardsArray) {
    if (!templateFilter) return cardsArray;
    
    const filtered = cardsArray.filter(card => {
        if (templateFilter === 'leader') {
            return card.isTemplate === true;
        }
        if (templateFilter === 'corporate') {
            return card.isCorporate === true;
        }
        return true;
    });
    
    console.log(`📋 Template filter: ${templateFilter}, showing ${filtered.length}/${cardsArray.length} cards`);
    return filtered;
}

/**
 * Рендер карточек с кнопкой "Сделать шаблоном"
 * ЗАМЕНИТЬ существующую функцию renderCards() в dashboard.js
 */
function renderCards() {
    const grid = document.getElementById('archiveGrid');
    const empty = document.getElementById('emptyArchive');
    
    if (!grid) return;
    
    if (cards.length === 0) {
        grid.innerHTML = '';
        if (empty) empty.style.display = 'block';
        return;
    }
    
    if (empty) empty.style.display = 'none';
    
    // Проверяем уровень для кнопки шаблона (от 4 уровня)
    const canCreateTemplates = (window.currentUserLevel || 0) >= 4;
    const isOwner = (window.currentUserLevel || 0) >= 12;
    
    grid.innerHTML = cards.map((card, i) => {
        const shortCode = card.short_code || card.shortCode || card.code;
        const hasLink = !!shortCode;
        const previewImg = card.preview || card.image_url;
        const cardId = card.id || card.code;
        
        return `
        <div class="card-item" data-card-id="${cardId}">
            <div class="card-checkbox" style="position: absolute; top: 8px; left: 8px; z-index: 5;">
                <input type="checkbox" class="card-select" data-index="${i}" onchange="updateSelectedCount()">
            </div>
            <div class="card-preview" style="background:${card.bgColor || '#333'};">
                ${previewImg ? `<img src="${previewImg}" alt="Card" style="width:100%;height:100%;object-fit:cover;border-radius:8px;">` : `<div class="card-placeholder">🎴</div>`}
            </div>
            <div class="card-info">
                <div class="card-title">${escapeHtml(card.title || 'Без названия')}</div>
                <div class="card-date">${card.date || ''}</div>
                ${card.views ? `<div class="card-views" style="font-size: 11px; color: #888;">👁️ ${card.views}</div>` : ''}
            </div>
            <div class="card-actions">
                <button class="btn-icon ${!hasLink ? 'disabled' : ''}" onclick="viewCard(${i})" ${!hasLink ? 'disabled' : ''} title="Просмотр">👁️</button>
                <button class="btn-icon ${!hasLink ? 'disabled' : ''}" onclick="shareCard(${i})" ${!hasLink ? 'disabled' : ''} title="Поделиться">📤</button>
                <button class="btn-icon" onclick="editCard(${i})" title="Редактировать">✏️</button>
                ${isOwner ? `<button class="btn-icon ${card.isTemplate ? 'active' : ''}" onclick="toggleLeaderTemplate(${i})" title="${card.isTemplate ? 'Убрать отметку' : 'Отметить'} как шаблон от лидера" style="color: ${card.isTemplate ? '#667eea' : '#888'};">👔</button>` : ''}
                ${isOwner ? `<button class="btn-icon ${card.isCorporate ? 'active' : ''}" onclick="toggleCorporateTemplate(${i})" title="${card.isCorporate ? 'Убрать отметку' : 'Отметить'} как корпоративный" style="color: ${card.isCorporate ? '#f093fb' : '#888'};">🏢</button>` : ''}
                ${(card.isTemplate || card.isCorporate) ? `<button class="btn-icon" onclick="useTemplate(${i})" title="Использовать шаблон" style="color: #4CAF50;">✨</button>` : ''}
                <button class="btn-icon" onclick="deleteCard(${i})" title="Удалить">🗑️</button>
            </div>
        </div>
    `}).join('');
}

/**
 * Показать модальное окно создания шаблона
 */
function showMakeTemplateModal(cardIndex) {
    const card = cards[cardIndex];
    if (!card) return;
    
    const isOwner = (window.currentUserLevel || 0) >= 12;
    
    // Создаём модальное окно
    const modalHTML = `
        <div id="makeTemplateModal" style="display: flex; position: fixed; top: 0; left: 0; right: 0; bottom: 0; z-index: 10000; align-items: center; justify-content: center; padding: 20px;">
            <div onclick="closeMakeTemplateModal()" style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.85);"></div>
            <div style="position: relative; background: linear-gradient(145deg, #1a1a2e, #16213e); border-radius: 20px; border: 1px solid #FFD700; max-width: 500px; width: 100%; max-height: 90vh; overflow-y: auto;">
                
                <div style="display: flex; align-items: center; justify-content: space-between; padding: 20px; border-bottom: 1px solid #333;">
                    <h2 style="color: #FFD700; margin: 0;">⭐ Создать шаблон</h2>
                    <button onclick="closeMakeTemplateModal()" style="background: none; border: none; color: #888; font-size: 28px; cursor: pointer;">×</button>
                </div>
                
                <div style="padding: 20px;">
                    <!-- Превью карточки -->
                    <div style="display: flex; gap: 15px; margin-bottom: 20px; padding: 15px; background: #1a1a2e; border-radius: 12px;">
                        <div style="width: 80px; height: 100px; background: url('${card.preview || card.image_url || ''}') center/cover; border-radius: 8px; border: 1px solid #333;"></div>
                        <div>
                            <div style="color: #FFF; font-weight: bold;">${escapeHtml(card.title || 'Без названия')}</div>
                            <div style="color: #888; font-size: 12px; margin-top: 5px;">${card.date || ''}</div>
                        </div>
                    </div>
                    
                    <!-- Название шаблона -->
                    <div style="margin-bottom: 15px;">
                        <label style="color: #FFD700; font-size: 14px; display: block; margin-bottom: 8px;">📝 Название шаблона</label>
                        <input type="text" id="templateName" class="form-input" value="${escapeHtml(card.title || '')}" placeholder="Название для команды" maxlength="50">
                    </div>
                    
                    <!-- Описание -->
                    <div style="margin-bottom: 15px;">
                        <label style="color: #FFD700; font-size: 14px; display: block; margin-bottom: 8px;">📋 Описание</label>
                        <textarea id="templateDesc" class="form-input" rows="2" placeholder="Краткое описание шаблона" maxlength="200"></textarea>
                    </div>
                    
                    <!-- Тип шаблона -->
                    <div style="margin-bottom: 20px;">
                        <label style="color: #FFD700; font-size: 14px; display: block; margin-bottom: 8px;">📁 Тип шаблона</label>
                        <div style="display: flex; flex-direction: column; gap: 10px;">
                            <label style="display: flex; align-items: center; gap: 10px; padding: 12px; background: #2a2a4a; border-radius: 8px; cursor: pointer; border: 2px solid transparent;" onclick="this.querySelector('input').checked=true; document.querySelectorAll('#makeTemplateModal label[style*=border]').forEach(l=>l.style.borderColor='transparent'); this.style.borderColor='#4CAF50';">
                                <input type="radio" name="templateType" value="leader" checked style="display: none;">
                                <span style="font-size: 24px;">👔</span>
                                <div>
                                    <div style="color: #FFF;">Для моей команды</div>
                                    <div style="color: #888; font-size: 12px;">Видят только ваши рефералы (до 3 уровней вниз)</div>
                                </div>
                            </label>
                            
                            ${isOwner ? `
                            <label style="display: flex; align-items: center; gap: 10px; padding: 12px; background: #2a2a4a; border-radius: 8px; cursor: pointer; border: 2px solid transparent;" onclick="this.querySelector('input').checked=true; document.querySelectorAll('#makeTemplateModal label[style*=border]').forEach(l=>l.style.borderColor='transparent'); this.style.borderColor='#FFD700';">
                                <input type="radio" name="templateType" value="corporate" style="display: none;">
                                <span style="font-size: 24px;">🏢</span>
                                <div>
                                    <div style="color: #FFF;">Корпоративный</div>
                                    <div style="color: #888; font-size: 12px;">Видят все пользователи клуба</div>
                                </div>
                            </label>
                            ` : ''}
                        </div>
                    </div>
                    
                    ${isOwner ? `
                    <!-- Категория (только для корпоративных) -->
                    <div id="categorySelect" style="margin-bottom: 20px; display: none;">
                        <label style="color: #FFD700; font-size: 14px; display: block; margin-bottom: 8px;">📁 Категория</label>
                        <select id="templateCategory" class="form-select" style="width: 100%;">
                            <option value="">Выберите категорию</option>
                            <option value="cardgift">🎁 CardGift</option>
                            <option value="globalway">🌐 GlobalWay</option>
                            <option value="holidays">🎉 Праздники</option>
                            <option value="business">💼 Бизнес</option>
                            <option value="almazy">💎 Алмазы</option>
                        </select>
                    </div>
                    ` : ''}
                </div>
                
                <div style="padding: 15px 20px; border-top: 1px solid #333; display: flex; gap: 10px; justify-content: flex-end;">
                    <button class="btn btn-gray" onclick="closeMakeTemplateModal()">Отмена</button>
                    <button class="btn btn-green" onclick="createTemplate(${cardIndex})">⭐ Создать шаблон</button>
                </div>
            </div>
        </div>
    `;
    
    // Добавляем в DOM
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Показываем/скрываем категорию при выборе типа
    document.querySelectorAll('input[name="templateType"]').forEach(radio => {
        radio.addEventListener('change', function() {
            const categorySelect = document.getElementById('categorySelect');
            if (categorySelect) {
                categorySelect.style.display = this.value === 'corporate' ? 'block' : 'none';
            }
        });
    });
}

/**
 * Закрыть модальное окно
 */
function closeMakeTemplateModal() {
    const modal = document.getElementById('makeTemplateModal');
    if (modal) modal.remove();
}

/**
 * Создать шаблон
 */
async function createTemplate(cardIndex) {
    const card = cards[cardIndex];
    if (!card) return;
    
    const userId = window.currentDisplayId || window.currentGwId;
    if (!userId) {
        showToast('Подключите кошелёк', 'error');
        return;
    }
    
    const name = document.getElementById('templateName')?.value.trim();
    const description = document.getElementById('templateDesc')?.value.trim();
    const templateType = document.querySelector('input[name="templateType"]:checked')?.value || 'leader';
    const categorySlug = document.getElementById('templateCategory')?.value;
    
    if (!name) {
        showToast('Укажите название шаблона', 'error');
        return;
    }
    
    showToast('Создание шаблона...', 'info');
    
    try {
        let gwId = userId;
        if (!gwId.startsWith('GW') && /^\d+$/.test(gwId)) {
            gwId = 'GW' + gwId;
        }
        
        // Получаем category_id если выбрана категория
        let categoryId = null;
        if (categorySlug && templateType === 'corporate') {
            const { data: cat } = await SupabaseClient.client
                .from('template_categories')
                .select('id')
                .eq('slug', categorySlug)
                .single();
            categoryId = cat?.id;
        }
        
        const templateData = {
            name: name,
            description: description || '',
            code: card.short_code || card.shortCode || card.code,
            image_url: card.preview || card.image_url,
            thumbnail_url: card.preview || card.image_url,
            card_data: {
                title: card.title,
                bgColor: card.bgColor,
                // добавить другие данные карточки
            },
            owner_gw_id: gwId,
            owner_type: (window.currentUserLevel || 0) >= 12 ? 'author' : 'user',
            template_type: templateType,
            category_id: categoryId,
            is_public: templateType === 'corporate',
            is_approved: templateType === 'leader' || (window.currentUserLevel || 0) >= 12
        };
        
        const { data, error } = await SupabaseClient.client
            .from('card_templates')
            .insert(templateData)
            .select()
            .single();
        
        if (error) throw error;
        
        closeMakeTemplateModal();
        showToast('Шаблон создан! ⭐', 'success');
        
        // Переходим на вкладку шаблонов
        if (templateType === 'leader') {
            switchArchiveTab('myTemplates');
        } else {
            switchArchiveTab('corporate');
        }
        
    } catch (e) {
        console.error('Error creating template:', e);
        showToast('Ошибка: ' + e.message, 'error');
    }
}

/**
 * Редактировать карточку
 */
function editCard(index) {
    const card = cards[index];
    if (!card) return;
    
    const shortCode = card.short_code || card.shortCode || card.code;
    if (shortCode) {
        window.location.href = `generator.html?edit=${shortCode}`;
    } else {
        showToast('Открытка не найдена', 'error');
    }
}

// Экспорт функций
window.showMakeTemplateModal = showMakeTemplateModal;
window.closeMakeTemplateModal = closeMakeTemplateModal;
window.createTemplate = createTemplate;
window.editCard = editCard;

// =====================================================

// =====================================================
// ЧАСТЬ 4: TOGGLE ФУНКЦИИ (toggleLeaderTemplate, toggleCorporateTemplate)
// Из строк 5084-5150
// =====================================================

async function toggleLeaderTemplate(cardIndex) {
    const card = cards[cardIndex];
    const newValue = !card.isTemplate;
    
    // Обновляем локально
    cards[cardIndex].isTemplate = newValue;
    
    // Если включаем "От лидера", выключаем "Корпоративный"
    if (newValue) {
        cards[cardIndex].isCorporate = false;
    }
    
    // Сохраняем в localStorage
    
    
    // TODO: Сохранить в Supabase/Redis
    console.log(`${newValue ? '✅' : '❌'} Card ${cardIndex} marked as leader template:`, newValue);
    
    // Перерисовываем
    renderCards();
    
    // Показываем уведомление
    const message = newValue ? '👔 Отмечено как шаблон от лидера' : '❌ Отметка убрана';
    if (typeof notificationManager !== 'undefined') {
        notificationManager.show(message, 'success', 2000);
    }
}

/**
 * Переключить отметку "Корпоративный"
 */
async function toggleCorporateTemplate(cardIndex) {
    const card = cards[cardIndex];
    const newValue = !card.isCorporate;
    
    // Обновляем локально
    cards[cardIndex].isCorporate = newValue;
    
    // Если включаем "Корпоративный", выключаем "От лидера"
    if (newValue) {
        cards[cardIndex].isTemplate = false;
    }
    
    // Сохраняем в localStorage
    
    
    // TODO: Сохранить в Supabase/Redis
    console.log(`${newValue ? '✅' : '❌'} Card ${cardIndex} marked as corporate:`, newValue);
    
    // Перерисовываем
    renderCards();
    
    // Показываем уведомление
    const message = newValue ? '🏢 Отмечено как корпоративный шаблон' : '❌ Отметка убрана';
    if (typeof notificationManager !== 'undefined') {
        notificationManager.show(message, 'success', 2000);
    }
}

window.useTemplate = useTemplate;
window.toggleLeaderTemplate = toggleLeaderTemplate;
window.toggleCorporateTemplate = toggleCorporateTemplate;

console.log('✅ Archive cards + templates v2.0 loaded');
console.log('✅ Archive templates module v1.0 loaded');
console.log('✅ Panel module v1.0 loaded');
console.log('✅ Referrals module v1.0 loaded');

// ===== ЭКСПОРТ ДЛЯ ГЛОБАЛЬНОГО ДОСТУПА =====
window.loadCards = loadCards;
window.saveCards = saveCards;
window.renderCards = renderCards;
window.viewCard = viewCard;
window.shareCard = shareCard;
window.deleteCard = deleteCard;
window.searchArchive = searchArchive;
window.exportCards = exportCards;
window.forceReloadCards = forceReloadCards;
window.initArchiveTemplates = initArchiveTemplates;
window.switchArchiveTab = switchArchiveTab;
window.loadCorporateTemplates = loadCorporateTemplates;
window.loadLeaderTemplates = loadLeaderTemplates;
window.useTemplate = useTemplate;
window.previewTemplate = previewTemplate;
window.showMakeTemplateModal = showMakeTemplateModal;
window.closeMakeTemplateModal = closeMakeTemplateModal;
window.createTemplate = createTemplate;
window.editCard = editCard;
window.toggleLeaderTemplate = toggleLeaderTemplate;
window.toggleCorporateTemplate = toggleCorporateTemplate;

// КРИТИЧНО: Переопределяем функции из modules-fix.js
window.loadCards = loadCards;
window.renderCards = renderCards;
// Также регистрируем под альтернативными именами
window._archiveLoadCards = loadCards;
window._archiveRenderCards = renderCards;

// Автозагрузка если секция archive активна
setTimeout(function() {
    const archiveSection = document.getElementById('section-archive');
    if (archiveSection && archiveSection.classList.contains('active')) {
        console.log('📂 Archive section active, loading cards...');
        loadCards();
    }
}, 200);

console.log('📁 Archive Module v14 - NO localStorage, Supabase only!');

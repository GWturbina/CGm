/* =====================================================
   CARDGIFT - REFERRALS MODULE
   Вырезано из dashboard.js (строки 3060-3335)
   
   Зависимости:
   - window.SupabaseClient (supabase.js)
   - window.escapeHtml (common.js)
   - window.currentDisplayId, window.currentGwId (dashboard.js)
   
   Глобальные переменные (объявить в dashboard.js):
   - allReferrals (массив)
   ===================================================== */

async function loadReferrals() {
    const userId = window.currentDisplayId 
                || window.currentGwId 
                || window.currentTempId
                || localStorage.getItem('cardgift_display_id')
                || localStorage.getItem('cardgift_gw_id');
    
    console.log('📋 Loading referrals for:', userId);
    
    if (!userId || userId === '—') {
        renderEmptyReferrals('Подключите кошелек для просмотра рефералов');
        return;
    }
    
    const tbody = document.getElementById('referralsTableBody');
    if (tbody) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" style="padding: 40px; text-align: center; color: #888;">
                    <div style="font-size: 32px; margin-bottom: 10px;">⏳</div>
                    <div>Загрузка...</div>
                </td>
            </tr>
        `;
    }
    
    try {
        // Нормализуем ID
        let searchId = userId;
        if (!searchId.startsWith('GW') && /^\d+$/.test(searchId)) {
            searchId = 'GW' + searchId;
        }
        
        // 1. Загружаем из users (кто пришёл по реф ссылке)
        let referralsFromUsers = [];
        if (window.SupabaseClient && SupabaseClient.client) {
            // Ищем по обоим полям с GW и без
            const gwNum = searchId.replace('GW', '');
            
            const { data: usersData } = await SupabaseClient.client
                .from('users')
                .select('temp_id, gw_id, name, messenger, contact, gw_level, source, created_at, referrer_gw_id, referrer_temp_id')
                .or(`referrer_gw_id.eq.${searchId},referrer_gw_id.eq.${gwNum}`)
                .order('created_at', { ascending: false });
            
            referralsFromUsers = usersData || [];
            console.log('📊 Referrals from users:', referralsFromUsers.length);
        }
        
        // 2. Загружаем из contacts с source='viral'
        let viralContacts = [];
        if (window.SupabaseClient && SupabaseClient.client) {
            const gwNum = searchId.replace('GW', '');
            
            const { data: contactsData } = await SupabaseClient.client
                .from('contacts')
                .select('cg_id, name, messenger, contact, source, created_at, owner_gw_id, referral_temp_id')
                .eq('source', 'viral')
                .or(`owner_gw_id.eq.${searchId},owner_gw_id.eq.${gwNum}`)
                .order('created_at', { ascending: false });
            
            viralContacts = contactsData || [];
            console.log('📊 Viral contacts:', viralContacts.length);
        }
        
        // 3. Объединяем и убираем дубликаты
        const seen = new Set();
        allReferrals = [];
        
        // Сначала из users (они важнее - имеют gw_id)
        referralsFromUsers.forEach(r => {
            const key = (r.contact || r.temp_id || '').toLowerCase();
            if (!seen.has(key)) {
                seen.add(key);
                allReferrals.push({
                    id: r.gw_id || r.temp_id,
                    name: r.name || 'Без имени',
                    messenger: r.messenger,
                    contact: r.contact,
                    source: r.source || 'registration',
                    gwLevel: r.gw_level || 0,
                    line: 1, // Прямые рефералы
                    createdAt: r.created_at,
                    referrerTempId: r.referrer_temp_id
                });
            }
        });
        
        // Потом из viral contacts
        viralContacts.forEach(c => {
            const key = (c.contact || c.cg_id || '').toLowerCase();
            if (!seen.has(key)) {
                seen.add(key);
                allReferrals.push({
                    id: c.cg_id,
                    name: c.name || 'Без имени',
                    messenger: c.messenger,
                    contact: c.contact,
                    source: 'viral',
                    gwLevel: 0,
                    line: c.referral_temp_id?.startsWith('CG_TEMP_') ? 2 : 1,
                    createdAt: c.created_at,
                    referrerTempId: c.referral_temp_id
                });
            }
        });
        
        console.log('📊 Total referrals:', allReferrals.length);
        
        // Обновляем статистику
        updateReferralStats();
        
        // Рендерим таблицу
        renderReferrals(allReferrals);
        
    } catch (error) {
        console.error('❌ Load referrals error:', error);
        renderEmptyReferrals('Ошибка загрузки: ' + error.message);
    }
}

/**
 * Обновить статистику рефералов
 */
function updateReferralStats() {
    const total = allReferrals.length;
    const viral = allReferrals.filter(r => r.source === 'viral').length;
    const active = allReferrals.filter(r => r.gwLevel > 0).length;
    
    // За этот месяц
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    const thisMonth = allReferrals.filter(r => new Date(r.createdAt) >= startOfMonth).length;
    
    // Обновляем UI
    const totalEl = document.getElementById('totalReferralsCount');
    const viralEl = document.getElementById('viralReferralsCount');
    const activeEl = document.getElementById('activeReferralsCount');
    const monthEl = document.getElementById('monthReferralsCount');
    
    if (totalEl) totalEl.textContent = total;
    if (viralEl) viralEl.textContent = viral;
    if (activeEl) activeEl.textContent = active;
    if (monthEl) monthEl.textContent = thisMonth;
}

/**
 * Отрисовать таблицу рефералов
 */
function renderReferrals(referrals) {
    const tbody = document.getElementById('referralsTableBody');
    const emptyBlock = document.getElementById('emptyReferrals');
    
    if (!tbody) return;
    
    if (!referrals || referrals.length === 0) {
        tbody.innerHTML = '';
        if (emptyBlock) emptyBlock.style.display = 'block';
        return;
    }
    
    if (emptyBlock) emptyBlock.style.display = 'none';
    
    tbody.innerHTML = referrals.map(r => {
        const sourceIcon = getSourceIcon(r.source);
        const statusBadge = getStatusBadge(r.gwLevel);
        const date = r.createdAt ? new Date(r.createdAt).toLocaleDateString('ru-RU') : '—';
        const messengerIcon = getMessengerIcon(r.messenger);
        
        return `
            <tr style="border-bottom: 1px solid #333;">
                <td style="padding: 12px; color: #888; font-size: 12px;">${formatId(r.id)}</td>
                <td style="padding: 12px; color: #FFF;">${escapeHtml(r.name)}</td>
                <td style="padding: 12px;">
                    <span style="color: #888;">${messengerIcon}</span>
                    <span style="color: #4CAF50;">${escapeHtml(r.contact || '—')}</span>
                </td>
                <td style="padding: 12px; text-align: center;">
                    <span style="display: inline-block; width: 28px; height: 28px; border-radius: 50%; background: ${r.line === 1 ? 'linear-gradient(135deg, #FFD700, #FFA500)' : '#2a2a4a'}; color: ${r.line === 1 ? '#000' : '#888'}; line-height: 28px; font-weight: bold; font-size: 12px;">${r.line}</span>
                </td>
                <td style="padding: 12px; text-align: center;">${sourceIcon}</td>
                <td style="padding: 12px; text-align: center;">${statusBadge}</td>
                <td style="padding: 12px; color: #888; font-size: 12px;">${date}</td>
            </tr>
        `;
    }).join('');
}

/**
 * Фильтрация рефералов
 */
function filterReferrals() {
    const sourceFilter = document.getElementById('referralSourceFilter')?.value || 'all';
    const lineFilter = document.getElementById('referralLineFilter')?.value || 'all';
    
    let filtered = [...allReferrals];
    
    // Фильтр по источнику
    if (sourceFilter !== 'all') {
        if (sourceFilter === 'card') {
            filtered = filtered.filter(r => r.source?.startsWith('Card:'));
        } else {
            filtered = filtered.filter(r => r.source === sourceFilter);
        }
    }
    
    // Фильтр по линии
    if (lineFilter !== 'all') {
        if (lineFilter === '3+') {
            filtered = filtered.filter(r => r.line >= 3);
        } else {
            filtered = filtered.filter(r => r.line === parseInt(lineFilter));
        }
    }
    
    renderReferrals(filtered);
}

/**
 * Показать пустое состояние
 */
function renderEmptyReferrals(message) {
    const tbody = document.getElementById('referralsTableBody');
    const emptyBlock = document.getElementById('emptyReferrals');
    
    if (tbody) tbody.innerHTML = '';
    if (emptyBlock) {
        emptyBlock.style.display = 'block';
        const textEl = emptyBlock.querySelector('div:nth-child(3)');
        if (textEl) textEl.textContent = message;
    }
}

// Хелперы
function getSourceIcon(source) {
    if (source === 'viral') return '<span title="Вирусный маркетинг" style="background: #FF5722; padding: 4px 8px; border-radius: 12px; font-size: 11px;">🔥 Viral</span>';
    if (source === 'registration') return '<span title="Регистрация" style="background: #2196F3; padding: 4px 8px; border-radius: 12px; font-size: 11px;">📝 Reg</span>';
    if (source?.startsWith('Card:')) return '<span title="Из открытки" style="background: #9C27B0; padding: 4px 8px; border-radius: 12px; font-size: 11px;">🎴 Card</span>';
    return '<span style="color: #888;">—</span>';
}

function getStatusBadge(level) {
    if (level > 0) {
        return `<span style="background: linear-gradient(135deg, #4CAF50, #2E7D32); padding: 4px 10px; border-radius: 12px; font-size: 11px; color: #FFF;">✅ GW Lv.${level}</span>`;
    }
    return '<span style="background: #444; padding: 4px 10px; border-radius: 12px; font-size: 11px; color: #888;">⏳ Ожидает</span>';
}

function getMessengerIcon(m) {
    const icons = { telegram: '📱', whatsapp: '💬', viber: '💜', email: '📧', facebook: '👤' };
    return icons[m] || '📋';
}

function formatId(id) {
    if (!id) return '—';
    if (id.startsWith('CG_TEMP_')) return id.substring(8, 16) + '...';
    if (id.startsWith('GW')) return id;
    return id.length > 10 ? id.substring(0, 10) + '...' : id;
}

// escapeHtml определена выше (строка ~1794)

// Экспорт
window.loadReferrals = loadReferrals;
window.filterReferrals = filterReferrals;

// Автозагрузка при переходе на секцию
const originalShowSection = window.showSection;
window.showSection = function(section) {
    if (originalShowSection) originalShowSection(section);
    if (section === 'referrals') {
        setTimeout(loadReferrals, 100);
    }
};


console.log('👥 Referrals Module loaded');

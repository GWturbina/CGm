/* =====================================================
   CARDGIFT - PANEL MODULE
   Вырезано из dashboard.js (строки 3748-4046)
   
   Зависимости:
   - window.SupabaseClient (supabase.js)
   - window.escapeHtml (common.js)
   - window.currentDisplayId, window.currentGwId (dashboard.js)
   ===================================================== */

async function loadPanelData() {
    const userId = window.currentDisplayId || window.currentGwId;
    if (!userId) {
        console.log('⏳ Panel: waiting for user ID...');
        return;
    }
    
    console.log('📊 Loading panel data for:', userId);
    
    try {
        // Нормализуем ID
        let gwId = userId;
        if (!gwId.startsWith('GW') && /^\d+$/.test(gwId)) {
            gwId = 'GW' + gwId;
        }
        const gwNum = gwId.replace('GW', '');
        
        // 1. Загружаем контакты
        const { data: contacts } = await SupabaseClient.client
            .from('contacts')
            .select('id, source, messenger, name, contact, created_at')
            .or(`owner_gw_id.eq.${gwId},owner_gw_id.eq.${gwNum}`)
            .order('created_at', { ascending: false });
        
        const allContacts = contacts || [];
        
        // 2. Загружаем рефералов
        const { data: referrals } = await SupabaseClient.client
            .from('users')
            .select('gw_id, gw_level, created_at')
            .or(`referrer_gw_id.eq.${gwId},referrer_gw_id.eq.${gwNum}`);
        
        const allReferrals = referrals || [];
        
        // 3. Загружаем карточки
        const { data: cards } = await SupabaseClient.client
            .from('cards')
            .select('id, views, created_at')
            .or(`owner_gw_id.eq.${gwId},owner_gw_id.eq.${gwNum}`);
        
        const allCards = cards || [];
        
        // Подсчёты
        const totalContacts = allContacts.length;
        const totalReferrals = allReferrals.length;
        const totalCards = allCards.length;
        const totalViews = allCards.reduce((sum, c) => sum + (c.views || 0), 0);
        const viralContacts = allContacts.filter(c => c.source === 'viral').length;
        
        // За сегодня
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const contactsToday = allContacts.filter(c => new Date(c.created_at) >= today).length;
        
        // За неделю
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        const contactsWeek = allContacts.filter(c => new Date(c.created_at) >= weekAgo).length;
        
        // Конверсия
        const registrations = allContacts.filter(c => c.source === 'registration' || c.source?.startsWith('Card:')).length;
        const conversion = viralContacts > 0 ? Math.round((registrations / viralContacts) * 100) : 0;
        
        // Обновляем UI
        updatePanelStats({
            totalContacts,
            totalReferrals,
            totalCards,
            totalViews,
            viralContacts,
            contactsToday,
            contactsWeek,
            conversion
        });
        
        // Мини-график
        updateMiniChart(allContacts);
        
        // Последние контакты
        updatePanelActivity(allContacts.slice(0, 5));
        
        console.log('✅ Panel data loaded');
        
    } catch (e) {
        console.error('❌ Panel error:', e);
    }
}

/**
 * Обновить статистику на панели
 */
function updatePanelStats(stats) {
    // Основные метрики
    animatePanelNumber('stat-team', stats.totalContacts);
    animatePanelNumber('stat-referrals', stats.totalReferrals);
    animatePanelNumber('stat-cards', stats.totalCards);
    animatePanelNumber('stat-viral', stats.viralContacts);
    
    // Вторая строка
    animatePanelNumber('stat-week', stats.contactsWeek);
    animatePanelNumber('stat-today', stats.contactsToday);
    
    // Тренды
    const teamTrend = document.getElementById('stat-team-trend');
    if (teamTrend && stats.contactsWeek > 0) {
        teamTrend.innerHTML = `<span style="color: #4CAF50;">+${stats.contactsWeek}</span> за неделю`;
    }
    
    const refTrend = document.getElementById('stat-referrals-trend');
    if (refTrend && stats.totalReferrals > 0) {
        const active = stats.totalReferrals; // TODO: подсчитать активных
        refTrend.innerHTML = `в команде`;
    }
    
    const cardViews = document.getElementById('stat-cards-views');
    if (cardViews) {
        cardViews.innerHTML = `👁️ ${stats.totalViews} просмотров`;
    }
    
    const viralPercent = document.getElementById('stat-viral-percent');
    if (viralPercent && stats.totalContacts > 0) {
        const percent = Math.round((stats.viralContacts / stats.totalContacts) * 100);
        viralPercent.innerHTML = `${percent}% от всех`;
    }
    
    // Конверсия
    const conversionEl = document.getElementById('stat-conversion');
    if (conversionEl) {
        conversionEl.textContent = stats.conversion + '%';
    }
}

/**
 * Анимация чисел для панели
 */
function animatePanelNumber(elementId, target) {
    const el = document.getElementById(elementId);
    if (!el) return;
    
    const start = parseInt(el.textContent) || 0;
    const duration = 600;
    const startTime = performance.now();
    
    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        // Easing
        const eased = 1 - Math.pow(1 - progress, 3);
        const current = Math.round(start + (target - start) * eased);
        el.textContent = current;
        
        if (progress < 1) {
            requestAnimationFrame(update);
        }
    }
    
    requestAnimationFrame(update);
}

/**
 * Мини-график за 7 дней
 */
function updateMiniChart(contacts) {
    const container = document.getElementById('miniChartContainer');
    if (!container) return;
    
    // Собираем данные за последние 7 дней
    const days = [];
    const dayNames = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
    
    for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        date.setHours(0, 0, 0, 0);
        
        const nextDate = new Date(date);
        nextDate.setDate(nextDate.getDate() + 1);
        
        const count = contacts.filter(c => {
            const cDate = new Date(c.created_at);
            return cDate >= date && cDate < nextDate;
        }).length;
        
        days.push({
            name: dayNames[date.getDay()],
            date: date.getDate(),
            count: count,
            isToday: i === 0
        });
    }
    
    // Максимум для масштаба
    const maxCount = Math.max(...days.map(d => d.count), 1);
    
    // Рендерим бары
    container.innerHTML = days.map(day => {
        const height = Math.max((day.count / maxCount) * 100, 5);
        const bgColor = day.isToday ? '#FFD700' : (day.count > 0 ? '#4CAF50' : '#333');
        
        return `
            <div style="flex: 1; display: flex; flex-direction: column; align-items: center; gap: 5px;">
                <div style="font-size: 12px; color: ${day.count > 0 ? '#4CAF50' : '#666'}; font-weight: bold;">
                    ${day.count > 0 ? day.count : ''}
                </div>
                <div style="width: 100%; height: ${height}px; background: ${bgColor}; border-radius: 4px 4px 0 0; min-height: 5px; transition: height 0.5s;"></div>
                <div style="font-size: 10px; color: ${day.isToday ? '#FFD700' : '#888'};">
                    ${day.name}
                </div>
                <div style="font-size: 9px; color: #666;">
                    ${day.date}
                </div>
            </div>
        `;
    }).join('');
}

/**
 * Последняя активность на панели
 */
function updatePanelActivity(contacts) {
    const container = document.getElementById('panelRecentActivity');
    if (!container) return;
    
    if (!contacts || contacts.length === 0) {
        container.innerHTML = '<div style="text-align: center; padding: 30px; color: #888;">Нет контактов</div>';
        return;
    }
    
    container.innerHTML = contacts.map(c => {
        const date = new Date(c.created_at);
        const timeAgo = getPanelTimeAgo(date);
        const sourceIcon = c.source === 'viral' ? '🔥' : c.source?.startsWith('Card:') ? '🎴' : '📝';
        const messengerIcon = getPanelMessengerIcon(c.messenger);
        
        return `
            <div style="display: flex; align-items: center; padding: 12px; border-bottom: 1px solid #2a2a4a; gap: 12px;">
                <div style="font-size: 20px;">${sourceIcon}</div>
                <div style="flex: 1; min-width: 0;">
                    <div style="color: #FFF; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                        ${escapeHtml(c.name || 'Без имени')}
                    </div>
                    <div style="color: #888; font-size: 12px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                        ${messengerIcon} ${escapeHtml(c.contact || '—')}
                    </div>
                </div>
                <div style="text-align: right; flex-shrink: 0;">
                    <div style="color: #FFD700; font-size: 11px;">${timeAgo}</div>
                </div>
            </div>
        `;
    }).join('');
}

/**
 * Время назад
 */
function getPanelTimeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);
    
    if (seconds < 60) return 'сейчас';
    if (seconds < 3600) return Math.floor(seconds / 60) + ' мин';
    if (seconds < 86400) return Math.floor(seconds / 3600) + ' ч';
    return Math.floor(seconds / 86400) + ' дн';
}

/**
 * Иконка мессенджера
 */
function getPanelMessengerIcon(m) {
    const icons = { telegram: '📱', whatsapp: '💬', viber: '💜', email: '📧', facebook: '👤' };
    return icons[m] || '📋';
}

// Автозагрузка при инициализации
document.addEventListener('DOMContentLoaded', () => {
    // Ждём загрузки пользователя
    const checkUser = setInterval(() => {
        if (window.currentDisplayId || window.currentGwId) {
            clearInterval(checkUser);
            setTimeout(loadPanelData, 500);
        }
    }, 500);
    
    // Таймаут на 10 секунд
    setTimeout(() => clearInterval(checkUser), 10000);
});

// При переходе на панель
const originalShowSectionPanel = window.showSection;
window.showSection = function(section) {
    if (originalShowSectionPanel) originalShowSectionPanel(section);
    if (section === 'panel') {
        setTimeout(loadPanelData, 100);
    }
};

// Экспорт
window.loadPanelData = loadPanelData;


console.log('📊 Panel Module loaded');

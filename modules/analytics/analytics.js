/* =====================================================
   CARDGIFT - ANALYTICS MODULE v1.0
   - Загрузка статистики из Supabase
   - Графики Chart.js
   - Разбивка по источникам и мессенджерам
   - Последние контакты
   ===================================================== */

console.log('📊 Analytics Module v1.0 loading...');

// Глобальный Chart instance
let growthChart = null;

// ═══════════════════════════════════════════════════════════
// ОСНОВНАЯ ФУНКЦИЯ ЗАГРУЗКИ АНАЛИТИКИ
// ═══════════════════════════════════════════════════════════
async function loadAnalytics() {
    console.log('📊 loadAnalytics() called');
    
    const period = document.getElementById('analyticsPeriod')?.value || 'month';
    console.log('📊 Period:', period);
    
    // Получаем ID пользователя
    const userId = window.currentDisplayId 
                || window.currentGwId 
                || window.currentTempId 
                || window.currentCgId
                || localStorage.getItem('cardgift_display_id')
                || localStorage.getItem('cardgift_gw_id')
                || localStorage.getItem('cardgift_temp_id')
                || localStorage.getItem('cardgift_cg_id');
    
    console.log('📊 User ID:', userId);
    
    if (!userId) {
        console.warn('📊 No user ID found');
        return;
    }
    
    // Показываем индикаторы загрузки
    showLoadingState();
    
    try {
        // Загружаем данные
        const data = await fetchAnalyticsData(userId, period);
        console.log('📊 Analytics data:', data);
        
        // Обновляем UI
        updateAnalyticsUI(data);
        
        // Строим график
        buildGrowthChart(data.chartData);
        
        // Статистика по источникам
        renderSourceStats(data.bySource);
        
        // Статистика по мессенджерам
        renderMessengerStats(data.byMessenger);
        
        // Последние контакты
        renderRecentContacts(data.recentContacts);
        
    } catch (e) {
        console.error('📊 loadAnalytics error:', e);
        showToast && showToast('Ошибка загрузки аналитики', 'error');
    }
}

// ═══════════════════════════════════════════════════════════
// ЗАГРУЗКА ДАННЫХ ИЗ SUPABASE
// ═══════════════════════════════════════════════════════════
async function fetchAnalyticsData(userId, period) {
    const data = {
        totalContacts: 0,
        viralContacts: 0,
        registrations: 0,
        cardsCreated: 0,
        cardViews: 0,
        activeReferrals: 0,
        conversion: 0,
        avgPerDay: 0,
        bySource: {},
        byMessenger: {},
        recentContacts: [],
        chartData: { labels: [], values: [] },
        trends: {}
    };
    
    if (!window.SupabaseClient || !SupabaseClient.client) {
        console.warn('📊 Supabase not available');
        return data;
    }
    
    // Определяем даты периода
    const now = new Date();
    let startDate = new Date();
    let daysInPeriod = 30;
    
    switch (period) {
        case 'today':
            startDate.setHours(0, 0, 0, 0);
            daysInPeriod = 1;
            break;
        case 'week':
            startDate.setDate(now.getDate() - 7);
            daysInPeriod = 7;
            break;
        case 'month':
            startDate.setDate(now.getDate() - 30);
            daysInPeriod = 30;
            break;
        case 'all':
            startDate = new Date('2024-01-01');
            daysInPeriod = Math.ceil((now - startDate) / (1000 * 60 * 60 * 24));
            break;
    }
    
    // Определяем тип ID и поля
    const isGwId = userId.toString().match(/^(GW)?\d{5,10}$/i);
    const rawId = userId.toString().replace(/^GW/i, '');
    const gwId = 'GW' + rawId;
    // Условие для поиска по обоим вариантам ID
    const ownerFilter = `owner_gw_id.eq.${rawId},owner_gw_id.eq.${gwId}`;
    const referrerFilter = `referrer_gw_id.eq.${rawId},referrer_gw_id.eq.${gwId}`;
    
    console.log('📊 Query params:', { rawId, gwId, startDate: startDate.toISOString() });
    
    try {
        // 1. Всего контактов за период
        const { count: totalCount } = await SupabaseClient.client
            .from('contacts')
            .select('*', { count: 'exact', head: true })
            .or(ownerFilter)
            .neq('status', 'archived')
            .gte('created_at', startDate.toISOString());
        
        data.totalContacts = totalCount || 0;
        
        // 2. Вирусные контакты (source = 'card' или 'viral' или 'survey')
        const { count: viralCount } = await SupabaseClient.client
            .from('contacts')
            .select('*', { count: 'exact', head: true })
            .or(ownerFilter)
            .in('source', ['card', 'viral', 'shared', 'survey'])
            .gte('created_at', startDate.toISOString());
        
        data.viralContacts = viralCount || 0;
        
        // 3. Рефералы (регистрации)
        const { count: regCount } = await SupabaseClient.client
            .from('users')
            .select('*', { count: 'exact', head: true })
            .or(referrerFilter)
            .gte('created_at', startDate.toISOString());
        
        data.registrations = regCount || 0;
        
        // 4. Активные рефералы
        const { count: activeCount } = await SupabaseClient.client
            .from('users')
            .select('*', { count: 'exact', head: true })
            .or(referrerFilter)
            .gt('gw_level', 0);
        
        data.activeReferrals = activeCount || 0;
        
        // 5. Открытки созданы
        try {
            const { count: cardsCount } = await SupabaseClient.client
                .from('cards')
                .select('*', { count: 'exact', head: true })
                .or(ownerFilter)
                .gte('created_at', startDate.toISOString());
            
            data.cardsCreated = cardsCount || 0;
        } catch (e) {
            console.log('📊 Cards table not available');
        }
        
        // 6. Просмотры открыток
        try {
            const { data: cards } = await SupabaseClient.client
                .from('cards')
                .select('views')
                .or(ownerFilter);
            
            if (cards) {
                data.cardViews = cards.reduce((sum, c) => sum + (c.views || 0), 0);
            }
        } catch (e) {
            console.log('📊 Card views not available');
        }
        
        // 7. По источникам
        const { data: contactsBySource } = await SupabaseClient.client
            .from('contacts')
            .select('source')
            .or(ownerFilter)
            .neq('status', 'archived')
            .gte('created_at', startDate.toISOString());
        
        if (contactsBySource) {
            contactsBySource.forEach(c => {
                const s = c.source || 'unknown';
                data.bySource[s] = (data.bySource[s] || 0) + 1;
            });
        }
        
        // 8. По мессенджерам
        const { data: contactsByMessenger } = await SupabaseClient.client
            .from('contacts')
            .select('messenger')
            .or(ownerFilter)
            .neq('status', 'archived')
            .gte('created_at', startDate.toISOString());
        
        if (contactsByMessenger) {
            contactsByMessenger.forEach(c => {
                const m = c.messenger || 'other';
                data.byMessenger[m] = (data.byMessenger[m] || 0) + 1;
            });
        }
        
        // 9. Последние 10 контактов
        const { data: recent } = await SupabaseClient.client
            .from('contacts')
            .select('name, messenger, contact, source, created_at')
            .or(ownerFilter)
            .neq('status', 'archived')
            .order('created_at', { ascending: false })
            .limit(10);
        
        data.recentContacts = recent || [];
        
        // 10. Данные для графика (по дням)
        const { data: chartContacts } = await SupabaseClient.client
            .from('contacts')
            .select('created_at')
            .or(ownerFilter)
            .neq('status', 'archived')
            .gte('created_at', startDate.toISOString())
            .order('created_at', { ascending: true });
        
        data.chartData = buildChartData(chartContacts || [], period, startDate);
        
        // 11. Расчёт метрик
        data.avgPerDay = daysInPeriod > 0 ? (data.totalContacts / daysInPeriod).toFixed(1) : 0;
        data.conversion = data.totalContacts > 0 
            ? ((data.registrations / data.totalContacts) * 100).toFixed(1) 
            : 0;
        
        // 12. Тренды (сравнение с предыдущим периодом)
        data.trends = await calculateTrends(ownerFilter, startDate, daysInPeriod);
        
    } catch (e) {
        console.error('📊 fetchAnalyticsData error:', e);
    }
    
    return data;
}

// ═══════════════════════════════════════════════════════════
// ПОСТРОЕНИЕ ДАННЫХ ДЛЯ ГРАФИКА
// ═══════════════════════════════════════════════════════════
function buildChartData(contacts, period, startDate) {
    const labels = [];
    const values = [];
    const countByDate = {};
    
    // Группируем по датам
    contacts.forEach(c => {
        const date = new Date(c.created_at).toLocaleDateString('ru-RU', { 
            day: '2-digit', 
            month: '2-digit' 
        });
        countByDate[date] = (countByDate[date] || 0) + 1;
    });
    
    // Генерируем все даты периода
    const now = new Date();
    let days = period === 'today' ? 1 : period === 'week' ? 7 : period === 'month' ? 30 : 90;
    
    for (let i = days - 1; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        const label = d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
        labels.push(label);
        values.push(countByDate[label] || 0);
    }
    
    return { labels, values };
}

// ═══════════════════════════════════════════════════════════
// РАСЧЁТ ТРЕНДОВ
// ═══════════════════════════════════════════════════════════
async function calculateTrends(ownerFilter, currentStart, days) {
    const trends = { contacts: 0, viral: 0, registrations: 0, cards: 0 };
    
    try {
        // Предыдущий период
        const prevEnd = new Date(currentStart);
        const prevStart = new Date(currentStart);
        prevStart.setDate(prevStart.getDate() - days);
        
        // Контакты в предыдущем периоде
        const { count: prevContacts } = await SupabaseClient.client
            .from('contacts')
            .select('*', { count: 'exact', head: true })
            .or(ownerFilter)
            .gte('created_at', prevStart.toISOString())
            .lt('created_at', currentStart.toISOString());
        
        // Текущий период
        const { count: currContacts } = await SupabaseClient.client
            .from('contacts')
            .select('*', { count: 'exact', head: true })
            .or(ownerFilter)
            .gte('created_at', currentStart.toISOString());
        
        // Рассчитываем тренд
        if (prevContacts > 0) {
            trends.contacts = Math.round(((currContacts - prevContacts) / prevContacts) * 100);
        } else if (currContacts > 0) {
            trends.contacts = 100;
        }
        
    } catch (e) {
        console.log('📊 Trends calculation error:', e);
    }
    
    return trends;
}

// ═══════════════════════════════════════════════════════════
// ОБНОВЛЕНИЕ UI
// ═══════════════════════════════════════════════════════════
function updateAnalyticsUI(data) {
    // Основные метрики
    setElementText('analyticsContacts', data.totalContacts);
    setElementText('analyticsViral', data.viralContacts);
    setElementText('analyticsRegistrations', data.registrations);
    setElementText('analyticsCards', data.cardsCreated);
    setElementText('analyticsViews', data.cardViews);
    setElementText('analyticsReferrals', data.activeReferrals);
    setElementText('analyticsConversion', data.conversion + '%');
    setElementText('analyticsAvgDay', data.avgPerDay);
    
    // Тренды
    if (data.trends) {
        setTrendElement('analyticsContactsTrend', data.trends.contacts);
    }
}

function setElementText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
}

function setTrendElement(id, trend) {
    const el = document.getElementById(id);
    if (!el) return;
    
    if (trend > 0) {
        el.innerHTML = `<span style="color: #4CAF50;">↑ +${trend}%</span>`;
    } else if (trend < 0) {
        el.innerHTML = `<span style="color: #f44336;">↓ ${trend}%</span>`;
    } else {
        el.innerHTML = `<span style="color: #888;">→ 0%</span>`;
    }
}

function showLoadingState() {
    const ids = ['analyticsContacts', 'analyticsViral', 'analyticsRegistrations', 
                 'analyticsCards', 'analyticsViews', 'analyticsReferrals',
                 'analyticsConversion', 'analyticsAvgDay'];
    ids.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = '...';
    });
}

// ═══════════════════════════════════════════════════════════
// ГРАФИК РОСТА
// ═══════════════════════════════════════════════════════════
function buildGrowthChart(chartData) {
    const ctx = document.getElementById('growthChart');
    if (!ctx) {
        console.warn('📊 growthChart canvas not found');
        return;
    }
    
    // Уничтожаем предыдущий график
    if (growthChart) {
        growthChart.destroy();
    }
    
    // Создаём новый
    growthChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: chartData.labels,
            datasets: [{
                label: 'Контакты',
                data: chartData.values,
                borderColor: '#FFD700',
                backgroundColor: 'rgba(255, 215, 0, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.4,
                pointRadius: 4,
                pointBackgroundColor: '#FFD700',
                pointBorderColor: '#fff',
                pointBorderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: '#1a1a2e',
                    titleColor: '#FFD700',
                    bodyColor: '#fff',
                    borderColor: '#FFD700',
                    borderWidth: 1
                }
            },
            scales: {
                x: {
                    grid: { color: 'rgba(255, 255, 255, 0.1)' },
                    ticks: { color: '#888' }
                },
                y: {
                    beginAtZero: true,
                    grid: { color: 'rgba(255, 255, 255, 0.1)' },
                    ticks: { 
                        color: '#888',
                        stepSize: 1
                    }
                }
            }
        }
    });
}

// ═══════════════════════════════════════════════════════════
// СТАТИСТИКА ПО ИСТОЧНИКАМ
// ═══════════════════════════════════════════════════════════
function renderSourceStats(bySource) {
    const container = document.getElementById('sourceStats');
    if (!container) return;
    
    const sourceLabels = {
        'card': '🎴 Открытки',
        'viral': '🔥 Вирусный',
        'shared': '📤 Шаринг',
        'manual': '✏️ Вручную',
        'import': '📥 Импорт',
        'form': '📝 Форма',
        'unknown': '❓ Другое'
    };
    
    const sourceColors = {
        'card': '#FFD700',
        'viral': '#FF5722',
        'shared': '#4CAF50',
        'manual': '#2196F3',
        'import': '#9C27B0',
        'form': '#00BCD4',
        'unknown': '#607D8B'
    };
    
    const total = Object.values(bySource).reduce((a, b) => a + b, 0);
    
    if (total === 0) {
        container.innerHTML = '<div style="text-align: center; color: #888; padding: 20px;">Нет данных за период</div>';
        return;
    }
    
    let html = '';
    
    // Сортируем по количеству
    const sorted = Object.entries(bySource).sort((a, b) => b[1] - a[1]);
    
    sorted.forEach(([source, count]) => {
        const percent = ((count / total) * 100).toFixed(1);
        const label = sourceLabels[source] || `📌 ${source}`;
        const color = sourceColors[source] || '#888';
        
        html += `
            <div style="display: flex; align-items: center; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #333;">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <span style="font-size: 16px;">${label.split(' ')[0]}</span>
                    <span style="color: #ccc;">${label.split(' ')[1] || ''}</span>
                </div>
                <div style="display: flex; align-items: center; gap: 15px;">
                    <div style="width: 100px; height: 8px; background: #333; border-radius: 4px; overflow: hidden;">
                        <div style="width: ${percent}%; height: 100%; background: ${color};"></div>
                    </div>
                    <span style="color: #fff; font-weight: bold; min-width: 30px; text-align: right;">${count}</span>
                    <span style="color: #888; font-size: 12px; min-width: 45px;">${percent}%</span>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

// ═══════════════════════════════════════════════════════════
// СТАТИСТИКА ПО МЕССЕНДЖЕРАМ
// ═══════════════════════════════════════════════════════════
function renderMessengerStats(byMessenger) {
    const container = document.getElementById('messengerStats');
    if (!container) return;
    
    const messengerLabels = {
        'telegram': '📱 Telegram',
        'whatsapp': '💬 WhatsApp',
        'viber': '📞 Viber',
        'instagram': '📷 Instagram',
        'facebook': '📘 Facebook',
        'tiktok': '🎵 TikTok',
        'twitter': '🐦 Twitter',
        'email': '📧 Email',
        'phone': '☎️ Телефон',
        'other': '📌 Другое'
    };
    
    const messengerColors = {
        'telegram': '#0088cc',
        'whatsapp': '#25D366',
        'viber': '#7360F2',
        'instagram': '#E4405F',
        'facebook': '#1877F2',
        'tiktok': '#000',
        'twitter': '#1DA1F2',
        'email': '#EA4335',
        'phone': '#4CAF50',
        'other': '#607D8B'
    };
    
    const total = Object.values(byMessenger).reduce((a, b) => a + b, 0);
    
    if (total === 0) {
        container.innerHTML = '<div style="text-align: center; color: #888; padding: 20px;">Нет данных за период</div>';
        return;
    }
    
    let html = '';
    
    // Сортируем по количеству
    const sorted = Object.entries(byMessenger).sort((a, b) => b[1] - a[1]);
    
    sorted.forEach(([messenger, count]) => {
        const percent = ((count / total) * 100).toFixed(1);
        const label = messengerLabels[messenger] || `📌 ${messenger}`;
        const color = messengerColors[messenger] || '#888';
        
        html += `
            <div style="display: flex; align-items: center; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #333;">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <span style="font-size: 16px;">${label.split(' ')[0]}</span>
                    <span style="color: #ccc;">${label.split(' ').slice(1).join(' ')}</span>
                </div>
                <div style="display: flex; align-items: center; gap: 15px;">
                    <div style="width: 100px; height: 8px; background: #333; border-radius: 4px; overflow: hidden;">
                        <div style="width: ${percent}%; height: 100%; background: ${color};"></div>
                    </div>
                    <span style="color: #fff; font-weight: bold; min-width: 30px; text-align: right;">${count}</span>
                    <span style="color: #888; font-size: 12px; min-width: 45px;">${percent}%</span>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

// ═══════════════════════════════════════════════════════════
// ПОСЛЕДНИЕ КОНТАКТЫ
// ═══════════════════════════════════════════════════════════
function renderRecentContacts(contacts) {
    const container = document.getElementById('recentActivity');
    if (!container) return;
    
    if (!contacts || contacts.length === 0) {
        container.innerHTML = '<div style="text-align: center; color: #888; padding: 30px;">Нет контактов за период</div>';
        return;
    }
    
    const messengerIcons = {
        'telegram': '📱',
        'whatsapp': '💬',
        'viber': '📞',
        'instagram': '📷',
        'facebook': '📘',
        'tiktok': '🎵',
        'twitter': '🐦',
        'email': '📧',
        'phone': '☎️'
    };
    
    const sourceLabels = {
        'card': '🎴 Открытка',
        'viral': '🔥 Вирусный',
        'manual': '✏️ Вручную',
        'import': '📥 Импорт',
        'shared': '📤 Шаринг'
    };
    
    let html = '<div style="display: flex; flex-direction: column; gap: 8px;">';
    
    contacts.forEach(c => {
        const icon = messengerIcons[c.messenger] || '📌';
        const source = sourceLabels[c.source] || c.source || '';
        const date = new Date(c.created_at).toLocaleDateString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        html += `
            <div style="display: flex; align-items: center; justify-content: space-between; padding: 10px 15px; background: #1a1a2e; border-radius: 8px; border: 1px solid #333;">
                <div style="display: flex; align-items: center; gap: 12px;">
                    <span style="font-size: 20px;">${icon}</span>
                    <div>
                        <div style="color: #fff; font-weight: 500;">${escapeHtml(c.name || 'Без имени')}</div>
                        <div style="color: #888; font-size: 12px;">${escapeHtml(c.contact || '')}</div>
                    </div>
                </div>
                <div style="text-align: right;">
                    <div style="color: #FFD700; font-size: 11px;">${source}</div>
                    <div style="color: #666; font-size: 11px;">${date}</div>
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    container.innerHTML = html;
}

// ═══════════════════════════════════════════════════════════
// ЭКСПОРТ АНАЛИТИКИ
// ═══════════════════════════════════════════════════════════
function exportAnalytics() {
    const period = document.getElementById('analyticsPeriod')?.value || 'month';
    const periodLabels = {
        'today': 'Сегодня',
        'week': 'За неделю',
        'month': 'За месяц',
        'all': 'Всё время'
    };
    
    const data = {
        period: periodLabels[period],
        date: new Date().toLocaleDateString('ru-RU'),
        contacts: document.getElementById('analyticsContacts')?.textContent || '0',
        viral: document.getElementById('analyticsViral')?.textContent || '0',
        registrations: document.getElementById('analyticsRegistrations')?.textContent || '0',
        cards: document.getElementById('analyticsCards')?.textContent || '0',
        views: document.getElementById('analyticsViews')?.textContent || '0',
        referrals: document.getElementById('analyticsReferrals')?.textContent || '0',
        conversion: document.getElementById('analyticsConversion')?.textContent || '0%',
        avgDay: document.getElementById('analyticsAvgDay')?.textContent || '0'
    };
    
    const text = `
📊 АНАЛИТИКА CARDGIFT
━━━━━━━━━━━━━━━━━━━━━
📅 Период: ${data.period}
📆 Дата: ${data.date}

📈 ОСНОВНЫЕ ПОКАЗАТЕЛИ:
• Контактов: ${data.contacts}
• Вирусный маркетинг: ${data.viral}
• Регистраций: ${data.registrations}
• Открыток создано: ${data.cards}

📊 ДОПОЛНИТЕЛЬНО:
• Просмотров: ${data.views}
• Активных рефералов: ${data.referrals}
• Конверсия: ${data.conversion}
• В среднем в день: ${data.avgDay}
━━━━━━━━━━━━━━━━━━━━━
    `.trim();
    
    // Копируем в буфер
    navigator.clipboard.writeText(text).then(() => {
        showToast && showToast('📊 Аналитика скопирована!', 'success');
    });
}

// Вспомогательная функция
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ═══════════════════════════════════════════════════════════
// ЭКСПОРТ ФУНКЦИЙ
// ═══════════════════════════════════════════════════════════
window.loadAnalytics = loadAnalytics;
window.exportAnalytics = exportAnalytics;

// ═══════════════════════════════════════════════════════════
// ЗАЩИТА ОТ ПОВТОРНЫХ ВЫЗОВОВ (debounce)
// ═══════════════════════════════════════════════════════════
let analyticsLoadTimeout = null;
let analyticsLoading = false;

function loadAnalyticsDebounced() {
    // Если уже загружается - пропускаем
    if (analyticsLoading) {
        console.log('📊 Analytics already loading, skipping...');
        return;
    }
    
    // Отменяем предыдущий таймаут
    if (analyticsLoadTimeout) {
        clearTimeout(analyticsLoadTimeout);
    }
    
    // Запускаем с задержкой 150ms (debounce)
    analyticsLoadTimeout = setTimeout(async () => {
        analyticsLoading = true;
        try {
            await loadAnalytics();
        } finally {
            analyticsLoading = false;
        }
    }, 150);
}

// Перехватываем showSection для автозагрузки аналитики
const originalShowSectionAnalytics = window.showSection;
window.showSection = function(section) {
    if (originalShowSectionAnalytics) originalShowSectionAnalytics(section);
    if (section === 'analytics') {
        console.log('📊 Analytics section opened');
        loadAnalyticsDebounced();
    }
};

// Готовность модуля
document.addEventListener('DOMContentLoaded', () => {
    console.log('📊 Analytics Module ready');
});

console.log('📊 Analytics Module v1.1 loaded');

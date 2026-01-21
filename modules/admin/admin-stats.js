/* =====================================================
   CARDGIFT - ADMIN STATS MODULE (для авторов)
   Вырезано из dashboard.js (строки 2752-3049)
   
   Включает:
   - System statistics
   - Admin functions
   ===================================================== */

// ============ СИСТЕМНАЯ СТАТИСТИКА (для авторов) ============

/**
 * Проверяет является ли текущий пользователь автором/соавтором
 */
function isCoauthor() {
    if (!window.CONFIG || !CONFIG.COAUTHORS) return false;
    
    const currentCgId = window.currentCgId || localStorage.getItem('cardgift_cg_id');
    const currentWallet = (localStorage.getItem('cardgift_wallet') || '').toLowerCase();
    
    return CONFIG.COAUTHORS.some(author => 
        author.cgId === currentCgId || 
        author.wallet.toLowerCase() === currentWallet
    );
}

/**
 * Загружает системную статистику из Supabase
 */
async function loadSystemStats() {
    if (!isCoauthor()) {
        console.log('⚠️ System stats: not a coauthor');
        return null;
    }
    
    console.log('📊 Loading system statistics...');
    
    const stats = {
        totalUsers: 0,
        totalContacts: 0,
        usersToday: 0,
        usersThisWeek: 0,
        usersThisMonth: 0,
        topReferrers: [],
        recentUsers: []
    };
    
    if (!window.SupabaseClient || !SupabaseClient.client) {
        console.warn('⚠️ Supabase not available');
        return stats;
    }
    
    try {
        // Всего пользователей
        const { count: usersCount } = await SupabaseClient.client
            .from('users')
            .select('*', { count: 'exact', head: true });
        stats.totalUsers = usersCount || 0;
        
        // Всего контактов
        const { count: contactsCount } = await SupabaseClient.client
            .from('contacts')
            .select('*', { count: 'exact', head: true });
        stats.totalContacts = contactsCount || 0;
        
        // Пользователи за сегодня
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const { count: todayCount } = await SupabaseClient.client
            .from('users')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', today.toISOString());
        stats.usersToday = todayCount || 0;
        
        // За неделю
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        const { count: weekCount } = await SupabaseClient.client
            .from('users')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', weekAgo.toISOString());
        stats.usersThisWeek = weekCount || 0;
        
        // За месяц
        const monthAgo = new Date();
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        const { count: monthCount } = await SupabaseClient.client
            .from('users')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', monthAgo.toISOString());
        stats.usersThisMonth = monthCount || 0;
        
        // Топ рефереров
        const { data: referrersData } = await SupabaseClient.client
            .from('users')
            .select('referrer_cg_id')
            .not('referrer_cg_id', 'is', null);
        
        if (referrersData) {
            const referrerCounts = {};
            referrersData.forEach(u => {
                referrerCounts[u.referrer_cg_id] = (referrerCounts[u.referrer_cg_id] || 0) + 1;
            });
            
            stats.topReferrers = Object.entries(referrerCounts)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 10)
                .map(([cgId, count]) => ({ cgId, count }));
        }
        
        // Последние пользователи
        const { data: recentData } = await SupabaseClient.client
            .from('users')
            .select('cg_id, name, messenger, created_at, referrer_cg_id')
            .order('created_at', { ascending: false })
            .limit(20);
        
        stats.recentUsers = recentData || [];
        
        console.log('✅ System stats loaded:', stats);
        return stats;
        
    } catch (error) {
        console.error('❌ Error loading system stats:', error);
        return stats;
    }
}

/**
 * Отображает системную статистику
 */
async function renderSystemStats() {
    const container = document.getElementById('systemStatsContainer');
    if (!container) return;
    
    if (!isCoauthor()) {
        container.innerHTML = '<p style="color: #888;">Доступ только для авторов</p>';
        return;
    }
    
    container.innerHTML = '<p style="color: #FFD700;">⏳ Загрузка статистики...</p>';
    
    const stats = await loadSystemStats();
    if (!stats) return;
    
    container.innerHTML = `
        <div class="stats-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; margin-bottom: 20px;">
            <div class="stat-card" style="background: linear-gradient(135deg, #1a1a2e, #16213e); padding: 15px; border-radius: 12px; text-align: center;">
                <div style="font-size: 28px; color: #FFD700; font-weight: bold;">${stats.totalUsers}</div>
                <div style="color: #888; font-size: 12px;">Всего пользователей</div>
            </div>
            <div class="stat-card" style="background: linear-gradient(135deg, #1a1a2e, #16213e); padding: 15px; border-radius: 12px; text-align: center;">
                <div style="font-size: 28px; color: #4CAF50; font-weight: bold;">${stats.totalContacts}</div>
                <div style="color: #888; font-size: 12px;">Всего контактов</div>
            </div>
            <div class="stat-card" style="background: linear-gradient(135deg, #1a1a2e, #16213e); padding: 15px; border-radius: 12px; text-align: center;">
                <div style="font-size: 28px; color: #2196F3; font-weight: bold;">${stats.usersToday}</div>
                <div style="color: #888; font-size: 12px;">Сегодня</div>
            </div>
            <div class="stat-card" style="background: linear-gradient(135deg, #1a1a2e, #16213e); padding: 15px; border-radius: 12px; text-align: center;">
                <div style="font-size: 28px; color: #9C27B0; font-weight: bold;">${stats.usersThisWeek}</div>
                <div style="color: #888; font-size: 12px;">За неделю</div>
            </div>
            <div class="stat-card" style="background: linear-gradient(135deg, #1a1a2e, #16213e); padding: 15px; border-radius: 12px; text-align: center;">
                <div style="font-size: 28px; color: #FF9800; font-weight: bold;">${stats.usersThisMonth}</div>
                <div style="color: #888; font-size: 12px;">За месяц</div>
            </div>
        </div>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
            <!-- Топ рефереров -->
            <div style="background: #1a1a2e; padding: 15px; border-radius: 12px;">
                <h4 style="color: #FFD700; margin-bottom: 10px;">🏆 Топ рефереров</h4>
                <table style="width: 100%; font-size: 13px;">
                    <tr style="color: #888;"><th style="text-align: left;">ID</th><th style="text-align: right;">Рефералов</th></tr>
                    ${stats.topReferrers.map((r, i) => `
                        <tr style="color: ${i === 0 ? '#FFD700' : '#FFF'};">
                            <td>${r.cgId}</td>
                            <td style="text-align: right; font-weight: bold;">${r.count}</td>
                        </tr>
                    `).join('')}
                </table>
            </div>
            
            <!-- Последние регистрации -->
            <div style="background: #1a1a2e; padding: 15px; border-radius: 12px; max-height: 300px; overflow-y: auto;">
                <h4 style="color: #FFD700; margin-bottom: 10px;">📋 Последние регистрации</h4>
                <table style="width: 100%; font-size: 12px;">
                    <tr style="color: #888;"><th>ID</th><th>Имя</th><th>Спонсор</th><th>Дата</th></tr>
                    ${stats.recentUsers.map(u => `
                        <tr style="color: #CCC;">
                            <td>${u.cg_id}</td>
                            <td>${u.name || '-'}</td>
                            <td>${u.referrer_cg_id || '-'}</td>
                            <td>${new Date(u.created_at).toLocaleDateString('ru-RU')}</td>
                        </tr>
                    `).join('')}
                </table>
            </div>
        </div>
        
        <button onclick="renderSystemStats()" class="btn btn-primary" style="margin-top: 15px;">
            🔄 Обновить статистику
        </button>
    `;
}

window.isCoauthor = isCoauthor;
window.loadSystemStats = loadSystemStats;
window.renderSystemStats = renderSystemStats;
window.updateSectionRestrictions = updateSectionRestrictions;

/**
 * Экспорт всех пользователей в CSV
 */
async function exportAllUsers() {
    if (!isCoauthor()) {
        showToast('Доступ запрещён', 'error');
        return;
    }
    
    showToast('Загрузка данных...', 'info');
    
    try {
        const { data, error } = await SupabaseClient.client
            .from('users')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        if (!data || data.length === 0) {
            showToast('Нет данных для экспорта', 'warning');
            return;
        }
        
        // Формируем CSV
        const headers = ['cg_id', 'name', 'messenger', 'contact', 'referrer_cg_id', 'wallet_address', 'created_at'];
        const csv = [
            headers.join(','),
            ...data.map(row => headers.map(h => `"${(row[h] || '').toString().replace(/"/g, '""')}"`).join(','))
        ].join('\n');
        
        // Скачиваем
        const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `cardgift_users_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        
        showToast(`Экспортировано ${data.length} пользователей`, 'success');
        
    } catch (error) {
        console.error('Export error:', error);
        showToast('Ошибка экспорта: ' + error.message, 'error');
    }
}

/**
 * Экспорт всех контактов в CSV
 */
async function exportAllContacts() {
    if (!isCoauthor()) {
        showToast('Доступ запрещён', 'error');
        return;
    }
    
    showToast('Загрузка данных...', 'info');
    
    try {
        const { data, error } = await SupabaseClient.client
            .from('contacts')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        if (!data || data.length === 0) {
            showToast('Нет данных для экспорта', 'warning');
            return;
        }
        
        // Формируем CSV
        const headers = ['owner_cg_id', 'name', 'platform', 'contact', 'status', 'source', 'created_at'];
        const csv = [
            headers.join(','),
            ...data.map(row => headers.map(h => `"${(row[h] || '').toString().replace(/"/g, '""')}"`).join(','))
        ].join('\n');
        
        // Скачиваем
        const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `cardgift_contacts_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        
        showToast(`Экспортировано ${data.length} контактов`, 'success');
        
    } catch (error) {
        console.error('Export error:', error);
        showToast('Ошибка экспорта: ' + error.message, 'error');
    }
}

window.exportAllUsers = exportAllUsers;
window.exportAllContacts = exportAllContacts;


// ===== ЭКСПОРТ =====
window.loadSystemStats = loadSystemStats;
window.renderSystemStats = renderSystemStats;

console.log('📊 Admin Stats Module loaded');

/* =====================================================
   CARDGIFT - ADMIN PANEL JAVASCRIPT v1.5
   
   Функции админ-панели:
   - Проверка прав доступа
   - Управление новостями
   - Управление командой
   - НОВОЕ: Управление доступами/ролями
   - Чат команды
   - Начисление кредитов
   - Логирование действий
   ===================================================== */

// ===== КОНСТАНТЫ =====
const OWNER_WALLET = '0x7bcd1753868895971e12448412cb3216d47884c8'.toLowerCase();
const ADMIN_ROLES = ['owner', 'director', 'admin', 'moderator', 'support', 'credit_manager'];

// Описание ролей
const ROLE_INFO = {
    owner: { 
        name: 'Владелец', 
        icon: '👑', 
        color: '#FFD700',
        permissions: ['all']
    },
    director: { 
        name: 'Директор', 
        icon: '🎯', 
        color: '#9C27B0',
        permissions: ['news', 'team', 'credits', 'mailings', 'access']
    },
    admin: { 
        name: 'Администратор', 
        icon: '🛡️', 
        color: '#4CAF50',
        permissions: ['news', 'team', 'mailings']
    },
    moderator: { 
        name: 'Модератор', 
        icon: '📝', 
        color: '#2196F3',
        permissions: ['news', 'mailings']
    },
    support: { 
        name: 'Поддержка', 
        icon: '🆘', 
        color: '#FF9800',
        permissions: ['view', 'chat']
    },
    credit_manager: { 
        name: 'Кредиты', 
        icon: '💰', 
        color: '#E91E63',
        permissions: ['credits']
    }
};

// ===== ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ =====
let currentAdminUser = null;
let isAdminAccess = false;
let teamMembersList = [];

// ===== ИНИЦИАЛИЗАЦИЯ =====
document.addEventListener('DOMContentLoaded', () => {
    console.log('🛡️ Admin Panel v1.5 initializing...');
    
    // Загружаем новости для колокольчика сразу
    setTimeout(loadUserNews, 2000);
    
    // Проверяем доступ к админке с интервалом пока не найдём кошелёк
    let attempts = 0;
    const checkInterval = setInterval(() => {
        attempts++;
        const wallet = localStorage.getItem('cardgift_wallet') ||
                      localStorage.getItem('walletAddress') || 
                      window.userWalletAddress;
        
        if (wallet) {
            clearInterval(checkInterval);
            console.log('🛡️ Wallet found on attempt', attempts, ':', wallet);
            checkAdminAccess();
        } else if (attempts >= 20) {
            clearInterval(checkInterval);
            console.log('🛡️ No wallet after 20 attempts, admin hidden');
        }
    }, 500);
});

/**
 * Проверка прав доступа к админке
 */
async function checkAdminAccess() {
    try {
        // Ищем кошелёк во всех возможных местах
        const walletAddress = localStorage.getItem('cardgift_wallet') ||
                             localStorage.getItem('walletAddress') || 
                             localStorage.getItem('connectedWallet') ||
                             window.userWalletAddress || 
                             (typeof walletState !== 'undefined' && walletState.load()?.address);
        
        if (!walletAddress) {
            console.log('🛡️ No wallet connected, admin hidden');
            return;
        }
        
        const normalizedWallet = walletAddress.toLowerCase();
        console.log('🛡️ Checking admin access for:', normalizedWallet);
        console.log('🛡️ Owner wallet is:', OWNER_WALLET);
        
        // 1. Проверяем Owner
        if (normalizedWallet === OWNER_WALLET) {
            console.log('👑 Owner detected! Full admin access granted');
            currentAdminUser = {
                wallet_address: normalizedWallet,
                role: 'owner',
                name: 'Owner',
                permissions: ['all'],
                is_active: true
            };
            showAdminAccess('owner');
            return;
        }
        
        // 2. Проверяем в таблице team_members
        if (typeof SupabaseClient !== 'undefined' && SupabaseClient.client) {
            const { data, error } = await SupabaseClient.client
                .from('team_members')
                .select('*')
                .ilike('wallet_address', normalizedWallet)
                .eq('is_active', true)
                .single();
            
            if (data && !error) {
                console.log('👥 Team member detected:', data.role);
                currentAdminUser = data;
                showAdminAccess(data.role, data.permissions);
                return;
            }
        }
        
        console.log('🛡️ No admin access for:', normalizedWallet);
        hideAdminAccess();
        
    } catch (e) {
        console.error('Admin check error:', e);
        hideAdminAccess();
    }
}

/**
 * Показать кнопку админки
 */
function showAdminAccess(role, permissions = null) {
    isAdminAccess = true;
    
    const adminNav = document.getElementById('adminNavItem');
    if (adminNav) {
        adminNav.style.display = 'flex';
    }
    
    const roleBadge = document.getElementById('adminRoleBadge');
    if (roleBadge) {
        const roleInfo = ROLE_INFO[role] || { name: role.toUpperCase(), icon: '👤' };
        roleBadge.textContent = roleInfo.name;
        roleBadge.style.background = roleInfo.color || '#666';
    }
    
    // Показать/скрыть вкладки в зависимости от прав
    updateAdminTabs(role, permissions);
    
    // Загружаем данные для админки
    loadAdminData();
    
    // Загружаем новости для колокольчика
    loadUserNews();
    
    console.log('✅ Admin access enabled for role:', role);
}

/**
 * Обновить видимость вкладок на основе прав
 */
function updateAdminTabs(role, permissions) {
    const perms = permissions || ROLE_INFO[role]?.permissions || [];
    const hasAll = perms.includes('all');
    
    // Вкладка доступов - только owner и director
    const accessTab = document.querySelector('.admin-tab[data-tab="access"]');
    if (accessTab) {
        accessTab.style.display = (hasAll || perms.includes('access') || role === 'owner' || role === 'director') ? 'block' : 'none';
    }
    
    // Вкладка кредитов
    const creditsTab = document.querySelector('.admin-tab[data-tab="credits"]');
    if (creditsTab) {
        creditsTab.style.display = (hasAll || perms.includes('credits') || role === 'credit_manager') ? 'block' : 'none';
    }
}

/**
 * Скрыть кнопку админки
 */
function hideAdminAccess() {
    isAdminAccess = false;
    
    const adminNav = document.getElementById('adminNavItem');
    if (adminNav) {
        adminNav.style.display = 'none';
    }
    
    // Но новости всё равно загружаем для всех пользователей
    loadUserNews();
}

/**
 * Загрузить все данные для админки
 */
async function loadAdminData() {
    if (!isAdminAccess) return;
    
    loadAdminNews();
    loadTeamMembers();
    loadAdminLogs();
    loadCreditsStats();
    loadTeamChat();
    loadAccessManagement(); // НОВОЕ
}

// ===== ВКЛАДКИ АДМИНКИ =====

function switchAdminTab(tabName) {
    // Убираем активность со всех вкладок
    document.querySelectorAll('.admin-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelectorAll('.admin-tab-content').forEach(content => {
        content.classList.remove('active');
    });
    
    // Активируем нужную
    const tab = document.querySelector(`.admin-tab[data-tab="${tabName}"]`);
    const content = document.getElementById(`admin-tab-${tabName}`);
    
    if (tab) tab.classList.add('active');
    if (content) content.classList.add('active');
    
    // Загружаем данные для вкладки
    if (tabName === 'access') loadAccessManagement();
}

// ===== УПРАВЛЕНИЕ ДОСТУПАМИ (НОВОЕ) =====

/**
 * Загрузить данные для управления доступами
 */
async function loadAccessManagement() {
    const container = document.getElementById('accessMembersList');
    if (!container) return;
    
    try {
        const { data, error } = await SupabaseClient.client
            .from('team_members')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        teamMembersList = data || [];
        renderAccessList(teamMembersList);
        updateAccessStats(teamMembersList);
        
    } catch (e) {
        console.error('Load access error:', e);
        container.innerHTML = '<div class="no-news">❌ Ошибка загрузки</div>';
    }
}

/**
 * Отрисовать список с доступами
 */
function renderAccessList(members) {
    const container = document.getElementById('accessMembersList');
    if (!container) return;
    
    if (!members || members.length === 0) {
        container.innerHTML = `
            <div class="no-news">
                <p>👥 Нет членов команды</p>
                <button class="btn btn-primary" onclick="openAddAccessModal()" style="margin-top: 15px;">
                    ➕ Добавить первого
                </button>
            </div>
        `;
        return;
    }
    
    container.innerHTML = members.map(member => {
        const roleInfo = ROLE_INFO[member.role] || { name: member.role, icon: '👤', color: '#666' };
        const isOwner = member.wallet_address?.toLowerCase() === OWNER_WALLET;
        
        return `
            <div class="access-card ${member.is_active ? '' : 'inactive'}" data-wallet="${member.wallet_address}">
                <div class="access-card-header">
                    <div class="access-avatar" style="background: ${roleInfo.color};">
                        ${roleInfo.icon}
                    </div>
                    <div class="access-info">
                        <div class="access-name">${escapeHtml(member.name || 'Без имени')}</div>
                        <div class="access-wallet">${member.wallet_address?.slice(0, 8)}...${member.wallet_address?.slice(-4)}</div>
                    </div>
                    <div class="access-role-badge" style="background: ${roleInfo.color}20; color: ${roleInfo.color};">
                        ${roleInfo.icon} ${roleInfo.name}
                    </div>
                </div>
                <div class="access-card-body">
                    <div class="access-permissions">
                        ${renderPermissionTags(member.permissions || ROLE_INFO[member.role]?.permissions || [])}
                    </div>
                    <div class="access-meta">
                        📅 ${new Date(member.created_at).toLocaleDateString('ru-RU')}
                        ${member.added_by ? ` | Добавил: ${member.added_by.slice(0, 8)}...` : ''}
                    </div>
                </div>
                <div class="access-card-actions">
                    ${!isOwner ? `
                        <button class="btn btn-small btn-gray" onclick="editAccessMember('${member.wallet_address}')">
                            ✏️ Изменить
                        </button>
                        <button class="btn btn-small ${member.is_active ? 'btn-orange' : 'btn-green'}" 
                                onclick="toggleAccessMember('${member.wallet_address}', ${!member.is_active})">
                            ${member.is_active ? '🚫 Деактивировать' : '✅ Активировать'}
                        </button>
                        <button class="btn btn-small btn-red" onclick="removeAccessMember('${member.wallet_address}')">
                            🗑️
                        </button>
                    ` : `
                        <span style="color: var(--gold); font-size: 12px;">👑 Владелец системы</span>
                    `}
                </div>
            </div>
        `;
    }).join('');
}

/**
 * Отрисовать теги разрешений
 */
function renderPermissionTags(permissions) {
    // Если нет permissions
    if (!permissions) return '<span class="perm-tag">нет прав</span>';
    
    // Если это строка - пробуем распарсить как JSON
    if (typeof permissions === 'string') {
        try {
            permissions = JSON.parse(permissions);
        } catch (e) {
            // Если не JSON - возможно это одиночное значение
            permissions = [permissions];
        }
    }
    
    // Если всё ещё не массив - преобразуем
    if (!Array.isArray(permissions)) {
        permissions = [permissions];
    }
    
    if (permissions.length === 0) return '<span class="perm-tag">нет прав</span>';
    
    const permNames = {
        all: '🌟 Полный доступ',
        news: '📰 Новости',
        team: '👥 Команда',
        credits: '💰 Кредиты',
        mailings: '📧 Рассылки',
        access: '🔐 Доступы',
        view: '👁️ Просмотр',
        chat: '💬 Чат'
    };
    
    return permissions.map(p => 
        `<span class="perm-tag">${permNames[p] || p}</span>`
    ).join('');
}

/**
 * Обновить статистику доступов
 */
function updateAccessStats(members) {
    const total = members.length;
    const active = members.filter(m => m.is_active).length;
    const byRole = {};
    
    members.forEach(m => {
        byRole[m.role] = (byRole[m.role] || 0) + 1;
    });
    
    // Обновляем UI если есть элементы
    const totalEl = document.getElementById('accessTotalCount');
    const activeEl = document.getElementById('accessActiveCount');
    
    if (totalEl) totalEl.textContent = total;
    if (activeEl) activeEl.textContent = active;
}

/**
 * Открыть модалку добавления доступа
 */
function openAddAccessModal() {
    // Проверяем права
    const canManage = currentAdminUser?.role === 'owner' || 
                     currentAdminUser?.role === 'director' ||
                     currentAdminUser?.permissions?.includes('access');
    
    if (!canManage) {
        showToast('У вас нет прав на управление доступами', 'error');
        return;
    }
    
    // Удаляем старую модалку
    document.getElementById('addAccessModal')?.remove();
    
    const html = `
        <div id="addAccessModal" class="modal-overlay" style="display: flex !important; z-index: 10000;">
            <div class="modal-content" style="max-width: 500px; background: var(--bg-card); border-radius: 16px;">
                <div class="modal-header" style="padding: 20px; border-bottom: 1px solid var(--border);">
                    <h2 style="margin: 0;">🔐 Добавить доступ</h2>
                    <button class="modal-close" onclick="closeAddAccessModal()">✕</button>
                </div>
                <div class="modal-body" style="padding: 20px;">
                    <div class="form-group">
                        <label>Wallet адрес *</label>
                        <input type="text" id="newAccessWallet" class="form-input" placeholder="0x...">
                    </div>
                    
                    <div class="form-group">
                        <label>Имя</label>
                        <input type="text" id="newAccessName" class="form-input" placeholder="Иван Петров">
                    </div>
                    
                    <div class="form-group">
                        <label>Роль *</label>
                        <select id="newAccessRole" class="form-input" onchange="updateRoleDescription()">
                            <option value="">Выберите роль...</option>
                            ${Object.entries(ROLE_INFO).filter(([k]) => k !== 'owner').map(([key, info]) => `
                                <option value="${key}">${info.icon} ${info.name}</option>
                            `).join('')}
                        </select>
                    </div>
                    
                    <div id="roleDescription" style="padding: 10px; background: rgba(255,255,255,0.05); border-radius: 8px; margin-bottom: 15px; display: none;">
                        <div id="roleDescText" style="font-size: 13px; color: var(--text-muted);"></div>
                    </div>
                    
                    <div class="form-group">
                        <label>Заметка</label>
                        <textarea id="newAccessNote" class="form-input" rows="2" placeholder="Причина добавления..."></textarea>
                    </div>
                </div>
                <div class="modal-footer" style="padding: 20px; border-top: 1px solid var(--border); display: flex; gap: 10px; justify-content: flex-end;">
                    <button class="btn btn-gray" onclick="closeAddAccessModal()">Отмена</button>
                    <button class="btn btn-primary" onclick="saveNewAccess()">✅ Добавить</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', html);
}

function closeAddAccessModal() {
    document.getElementById('addAccessModal')?.remove();
}

/**
 * Показать описание роли при выборе
 */
function updateRoleDescription() {
    const role = document.getElementById('newAccessRole')?.value;
    const descEl = document.getElementById('roleDescription');
    const textEl = document.getElementById('roleDescText');
    
    if (!role || !descEl || !textEl) return;
    
    const info = ROLE_INFO[role];
    if (info) {
        const permNames = {
            all: 'Полный доступ ко всем функциям',
            news: 'Управление новостями',
            team: 'Управление командой',
            credits: 'Начисление кредитов',
            mailings: 'Рассылки',
            access: 'Управление доступами',
            view: 'Только просмотр',
            chat: 'Чат команды'
        };
        
        textEl.innerHTML = `
            <strong style="color: ${info.color};">${info.icon} ${info.name}</strong><br>
            Права: ${info.permissions.map(p => permNames[p] || p).join(', ')}
        `;
        descEl.style.display = 'block';
    } else {
        descEl.style.display = 'none';
    }
}

/**
 * Сохранить нового администратора
 */
async function saveNewAccess() {
    const wallet = document.getElementById('newAccessWallet')?.value?.trim()?.toLowerCase();
    const name = document.getElementById('newAccessName')?.value?.trim();
    const role = document.getElementById('newAccessRole')?.value;
    const note = document.getElementById('newAccessNote')?.value?.trim();
    
    if (!wallet || !wallet.startsWith('0x')) {
        showToast('Введите корректный wallet адрес', 'error');
        return;
    }
    
    if (!role) {
        showToast('Выберите роль', 'error');
        return;
    }
    
    // Проверяем что не добавляют owner
    if (role === 'owner') {
        showToast('Нельзя назначить роль Owner', 'error');
        return;
    }
    
    try {
        // Проверяем нет ли уже такого
        const { data: existing } = await SupabaseClient.client
            .from('team_members')
            .select('id')
            .ilike('wallet_address', wallet)
            .single();
        
        if (existing) {
            showToast('Этот кошелёк уже добавлен', 'error');
            return;
        }
        
        const myWallet = localStorage.getItem('walletAddress') || window.userWalletAddress;
        const roleInfo = ROLE_INFO[role];
        
        const { error } = await SupabaseClient.client
            .from('team_members')
            .insert({
                wallet_address: wallet,
                name: name || null,
                role: role,
                permissions: roleInfo?.permissions || [],
                is_active: true,
                added_by: myWallet,
                notes: note || null
            });
        
        if (error) throw error;
        
        // Логируем
        await logAdminAction('add_access', 'access', wallet, null, { role, name });
        
        showToast(`✅ Доступ добавлен: ${roleInfo?.name || role}`, 'success');
        closeAddAccessModal();
        loadAccessManagement();
        loadTeamMembers(); // Обновляем и основной список команды
        
    } catch (e) {
        console.error('Save access error:', e);
        showToast('❌ Ошибка: ' + e.message, 'error');
    }
}

/**
 * Редактировать доступ
 */
function editAccessMember(wallet) {
    const member = teamMembersList.find(m => m.wallet_address?.toLowerCase() === wallet.toLowerCase());
    if (!member) return;
    
    // Удаляем старую модалку
    document.getElementById('editAccessModal')?.remove();
    
    const html = `
        <div id="editAccessModal" class="modal-overlay" style="display: flex !important; z-index: 10000;">
            <div class="modal-content" style="max-width: 500px; background: var(--bg-card); border-radius: 16px;">
                <div class="modal-header" style="padding: 20px; border-bottom: 1px solid var(--border);">
                    <h2 style="margin: 0;">✏️ Редактировать доступ</h2>
                    <button class="modal-close" onclick="document.getElementById('editAccessModal').remove()">✕</button>
                </div>
                <div class="modal-body" style="padding: 20px;">
                    <div class="form-group">
                        <label>Wallet</label>
                        <input type="text" class="form-input" value="${member.wallet_address}" disabled style="opacity: 0.6;">
                    </div>
                    
                    <div class="form-group">
                        <label>Имя</label>
                        <input type="text" id="editAccessName" class="form-input" value="${escapeHtml(member.name || '')}">
                    </div>
                    
                    <div class="form-group">
                        <label>Роль</label>
                        <select id="editAccessRole" class="form-input">
                            ${Object.entries(ROLE_INFO).filter(([k]) => k !== 'owner').map(([key, info]) => `
                                <option value="${key}" ${member.role === key ? 'selected' : ''}>${info.icon} ${info.name}</option>
                            `).join('')}
                        </select>
                    </div>
                </div>
                <div class="modal-footer" style="padding: 20px; border-top: 1px solid var(--border); display: flex; gap: 10px; justify-content: flex-end;">
                    <button class="btn btn-gray" onclick="document.getElementById('editAccessModal').remove()">Отмена</button>
                    <button class="btn btn-primary" onclick="updateAccessMember('${wallet}')">💾 Сохранить</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', html);
}

/**
 * Обновить доступ
 */
async function updateAccessMember(wallet) {
    const name = document.getElementById('editAccessName')?.value?.trim();
    const role = document.getElementById('editAccessRole')?.value;
    
    try {
        const roleInfo = ROLE_INFO[role];
        
        const { error } = await SupabaseClient.client
            .from('team_members')
            .update({
                name: name || null,
                role: role,
                permissions: roleInfo?.permissions || [],
                updated_at: new Date().toISOString()
            })
            .ilike('wallet_address', wallet);
        
        if (error) throw error;
        
        await logAdminAction('update_access', 'access', wallet, null, { role, name });
        
        showToast('✅ Доступ обновлён', 'success');
        document.getElementById('editAccessModal')?.remove();
        loadAccessManagement();
        loadTeamMembers();
        
    } catch (e) {
        console.error('Update access error:', e);
        showToast('❌ Ошибка: ' + e.message, 'error');
    }
}

/**
 * Активировать/деактивировать доступ
 */
async function toggleAccessMember(wallet, activate) {
    try {
        const { error } = await SupabaseClient.client
            .from('team_members')
            .update({
                is_active: activate,
                updated_at: new Date().toISOString()
            })
            .ilike('wallet_address', wallet);
        
        if (error) throw error;
        
        await logAdminAction(activate ? 'activate_access' : 'deactivate_access', 'access', wallet);
        
        showToast(activate ? '✅ Доступ активирован' : '🚫 Доступ деактивирован', 'success');
        loadAccessManagement();
        loadTeamMembers();
        
    } catch (e) {
        console.error('Toggle access error:', e);
        showToast('❌ Ошибка: ' + e.message, 'error');
    }
}

/**
 * Удалить доступ
 */
async function removeAccessMember(wallet) {
    if (!confirm('Удалить этот доступ полностью?')) return;
    
    try {
        const { error } = await SupabaseClient.client
            .from('team_members')
            .delete()
            .ilike('wallet_address', wallet);
        
        if (error) throw error;
        
        await logAdminAction('remove_access', 'access', wallet);
        
        showToast('🗑️ Доступ удалён', 'success');
        loadAccessManagement();
        loadTeamMembers();
        
    } catch (e) {
        console.error('Remove access error:', e);
        showToast('❌ Ошибка: ' + e.message, 'error');
    }
}

// ===== НОВОСТИ =====

/**
 * Загрузить новости для админки
 */
async function loadAdminNews() {
    const container = document.getElementById('adminNewsList');
    if (!container) return;
    
    try {
        const { data, error } = await SupabaseClient.client
            .from('news')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(50);
        
        if (error) throw error;
        
        if (!data || data.length === 0) {
            container.innerHTML = '<div class="no-news">📭 Нет опубликованных новостей</div>';
            return;
        }
        
        container.innerHTML = data.map(news => `
            <div class="news-item">
                <div class="news-item-header">
                    <span class="news-item-title">${escapeHtml(news.title)}</span>
                    <span class="news-type-badge">${getNewsTypeIcon(news.type)} ${news.type}</span>
                </div>
                <div class="news-item-content">${escapeHtml(news.content).substring(0, 200)}...</div>
                <div class="news-item-meta">
                    📅 ${new Date(news.created_at).toLocaleString()} | 
                    👁️ ${news.views_count || 0} просмотров |
                    ${news.is_active ? '✅ Активна' : '❌ Скрыта'}
                    <button class="btn btn-small btn-red" onclick="deleteNews(${news.id})" style="margin-left: 10px;">🗑️</button>
                </div>
            </div>
        `).join('');
        
    } catch (e) {
        console.error('Load news error:', e);
        container.innerHTML = '<div class="no-news">❌ Ошибка загрузки новостей</div>';
    }
}

/**
 * Опубликовать новость
 */
async function publishNews() {
    const title = document.getElementById('newsTitle')?.value?.trim();
    const content = document.getElementById('newsContent')?.value?.trim();
    const type = document.getElementById('newsType')?.value || 'info';
    const priority = parseInt(document.getElementById('newsPriority')?.value) || 0;
    
    if (!title || !content) {
        showToast('Заполните заголовок и содержание', 'error');
        return;
    }
    
    try {
        const walletAddress = localStorage.getItem('walletAddress') || window.userWalletAddress;
        
        const { error } = await SupabaseClient.client
            .from('news')
            .insert({
                title,
                content,
                type,
                priority,
                author_wallet: walletAddress,
                is_active: true
            });
        
        if (error) throw error;
        
        await logAdminAction('add_news', 'news', null, null, { title });
        
        showToast('✅ Новость опубликована!', 'success');
        
        // Очищаем форму
        document.getElementById('newsTitle').value = '';
        document.getElementById('newsContent').value = '';
        
        loadAdminNews();
        closeNewsModal();
        
    } catch (e) {
        console.error('Publish news error:', e);
        showToast('❌ Ошибка: ' + e.message, 'error');
    }
}

/**
 * Удалить новость
 */
async function deleteNews(id) {
    if (!confirm('Удалить новость?')) return;
    
    try {
        const { error } = await SupabaseClient.client
            .from('news')
            .delete()
            .eq('id', id);
        
        if (error) throw error;
        
        await logAdminAction('delete_news', 'news', null, id);
        
        showToast('🗑️ Новость удалена', 'success');
        loadAdminNews();
        
    } catch (e) {
        console.error('Delete news error:', e);
        showToast('❌ Ошибка: ' + e.message, 'error');
    }
}

function getNewsTypeIcon(type) {
    const icons = {
        'info': 'ℹ️',
        'update': '🆕',
        'alert': '⚠️',
        'promo': '🎁',
        'important': '❗'
    };
    return icons[type] || '📰';
}

function openNewsModal() {
    const modal = document.getElementById('newsModal');
    if (modal) {
        modal.removeAttribute('hidden');
        modal.style.setProperty('display', 'flex', 'important');
        modal.classList.add('show');
        loadNewsModalContent();
    }
}

function closeNewsModal() {
    const modal = document.getElementById('newsModal');
    if (modal) {
        modal.style.setProperty('display', 'none', 'important');
        modal.classList.remove('show');
        modal.setAttribute('hidden', '');
    }
}

// Загрузка контента для модалки новостей
async function loadNewsModalContent() {
    const container = document.getElementById('newsModalContent');
    if (!container) return;
    
    if (!window.SupabaseClient || !SupabaseClient.client) {
        container.innerHTML = '<p style="text-align: center; color: #aaa;">Загрузка...</p>';
        return;
    }
    
    try {
        const { data: news, error } = await SupabaseClient.client
            .from('news')
            .select('*')
            .eq('is_active', true)
            .order('created_at', { ascending: false })
            .limit(20);
        
        if (error) throw error;
        
        if (!news || news.length === 0) {
            container.innerHTML = '<div style="text-align: center; padding: 40px; color: #aaa;"><div style="font-size: 48px; margin-bottom: 15px;">📭</div><p>Нет новостей</p></div>';
            return;
        }
        
        const readIds = JSON.parse(localStorage.getItem('readNewsIds') || '[]');
        const typeIcons = { 'info': 'ℹ️', 'update': '🔄', 'promo': '🎁', 'warning': '⚠️', 'urgent': '🚨' };
        
        container.innerHTML = news.map(item => {
            const isRead = readIds.includes(item.id);
            return '<div class="news-modal-item ' + (isRead ? 'read' : 'unread') + '" data-id="' + item.id + '" onclick="markNewsRead(' + item.id + ')" style="padding: 15px; border-radius: 10px; margin-bottom: 10px; cursor: pointer; background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.1);' + (!isRead ? 'border-left: 3px solid #FFD700;' : '') + '">' +
                '<div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">' +
                    '<span style="font-size: 18px;">' + (typeIcons[item.type] || '📰') + '</span>' +
                    '<span style="font-weight: 600; flex: 1; color: #fff;">' + escapeHtml(item.title) + '</span>' +
                    (!isRead ? '<span style="background: #FFD700; color: #000; font-size: 10px; padding: 2px 6px; border-radius: 10px; font-weight: bold;">NEW</span>' : '') +
                '</div>' +
                '<div style="font-size: 14px; color: #ccc; line-height: 1.6; margin-bottom: 8px;">' + escapeHtml(item.content) + '</div>' +
                '<div style="font-size: 12px; color: #888;">' + new Date(item.created_at).toLocaleDateString() + '</div>' +
            '</div>';
        }).join('');
        
    } catch (e) {
        console.error('Load news modal error:', e);
        container.innerHTML = '<p style="text-align: center; color: #ff6b6b;">Ошибка загрузки</p>';
    }
}

// Отметить новость прочитанной
function markNewsRead(newsId) {
    const readIds = JSON.parse(localStorage.getItem('readNewsIds') || '[]');
    if (!readIds.includes(newsId)) {
        readIds.push(newsId);
        localStorage.setItem('readNewsIds', JSON.stringify(readIds));
        
        const item = document.querySelector('.news-modal-item[data-id="' + newsId + '"]');
        if (item) {
            item.classList.remove('unread');
            item.classList.add('read');
            item.style.borderLeft = 'none';
            const badge = item.querySelector('[style*="NEW"]');
            if (badge) badge.remove();
        }
        
        // Обновляем бейдж колокольчика
        loadUserNews();
    }
}

// ===== КОМАНДА =====

/**
 * Загрузить членов команды
 */
async function loadTeamMembers() {
    const container = document.getElementById('teamMembersList');
    if (!container) return;
    
    try {
        const { data, error } = await SupabaseClient.client
            .from('team_members')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        teamMembersList = data || [];
        
        if (!data || data.length === 0) {
            container.innerHTML = '<div class="no-news">👥 Нет членов команды</div>';
            return;
        }
        
        container.innerHTML = data.map(member => {
            const roleInfo = ROLE_INFO[member.role] || { name: member.role, icon: '👤', color: '#666' };
            
            return `
                <div class="team-member ${member.is_active ? '' : 'inactive'}">
                    <div class="member-avatar" style="background: ${roleInfo.color};">${roleInfo.icon}</div>
                    <div class="member-info">
                        <div class="member-name">${escapeHtml(member.name || 'Без имени')}</div>
                        <div class="member-wallet">${member.wallet_address?.substring(0, 10)}...</div>
                        <div class="member-role" style="color: ${roleInfo.color};">${roleInfo.name}</div>
                    </div>
                    <div class="member-status">
                        ${member.is_active ? '✅ Активен' : '🚫 Неактивен'}
                    </div>
                    <div class="member-actions">
                        <button class="btn btn-small ${member.is_active ? 'btn-red' : 'btn-green'}" 
                                onclick="toggleTeamMember('${member.wallet_address}', ${!member.is_active})">
                            ${member.is_active ? '🚫' : '✅'}
                        </button>
                    </div>
                </div>
            `;
        }).join('');
        
    } catch (e) {
        console.error('Load team error:', e);
        container.innerHTML = '<div class="no-news">❌ Ошибка загрузки команды</div>';
    }
}

/**
 * Добавить члена команды
 */
async function addTeamMember() {
    const wallet = document.getElementById('memberWallet')?.value?.trim()?.toLowerCase();
    const name = document.getElementById('memberName')?.value?.trim();
    const role = document.getElementById('memberRole')?.value || 'support';
    
    if (!wallet || !wallet.startsWith('0x')) {
        showToast('Введите корректный wallet адрес', 'error');
        return;
    }
    
    try {
        const { data: existing } = await SupabaseClient.client
            .from('team_members')
            .select('id')
            .ilike('wallet_address', wallet)
            .single();
        
        if (existing) {
            showToast('Этот кошелёк уже в команде', 'error');
            return;
        }
        
        const myWallet = localStorage.getItem('walletAddress') || window.userWalletAddress;
        const roleInfo = ROLE_INFO[role];
        
        const { error } = await SupabaseClient.client
            .from('team_members')
            .insert({
                wallet_address: wallet,
                name: name || null,
                role: role,
                permissions: roleInfo?.permissions || [],
                is_active: true,
                added_by: myWallet
            });
        
        if (error) throw error;
        
        await logAdminAction('add_team_member', 'team', wallet, null, { name, role });
        
        showToast('✅ Добавлен в команду!', 'success');
        
        document.getElementById('memberWallet').value = '';
        document.getElementById('memberName').value = '';
        
        loadTeamMembers();
        loadAccessManagement();
        
    } catch (e) {
        console.error('Add member error:', e);
        showToast('❌ Ошибка: ' + e.message, 'error');
    }
}

/**
 * Активировать/деактивировать члена команды
 */
async function toggleTeamMember(wallet, activate) {
    try {
        const { error } = await SupabaseClient.client
            .from('team_members')
            .update({ is_active: activate })
            .ilike('wallet_address', wallet);
        
        if (error) throw error;
        
        await logAdminAction(activate ? 'activate_member' : 'deactivate_member', 'team', wallet);
        
        showToast(activate ? '✅ Активирован' : '🚫 Деактивирован', 'success');
        loadTeamMembers();
        loadAccessManagement();
        
    } catch (e) {
        console.error('Toggle member error:', e);
        showToast('❌ Ошибка: ' + e.message, 'error');
    }
}

// ===== ЧАТ КОМАНДЫ =====

/**
 * Загрузить чат команды
 */
async function loadTeamChat() {
    const container = document.getElementById('teamChatMessages');
    if (!container) return;
    
    try {
        const { data, error } = await SupabaseClient.client
            .from('team_chat')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(50);
        
        if (error) throw error;
        
        if (!data || data.length === 0) {
            container.innerHTML = '<div class="no-news">💬 Нет сообщений</div>';
            return;
        }
        
        container.innerHTML = data.reverse().map(msg => {
            const roleInfo = ROLE_INFO[msg.sender_role] || { color: '#666' };
            
            return `
                <div class="chat-message">
                    <div class="chat-avatar" style="background: ${roleInfo.color};">
                        ${(msg.sender_name || 'U')[0].toUpperCase()}
                    </div>
                    <div class="chat-content">
                        <div class="chat-header">
                            <span class="chat-sender">${escapeHtml(msg.sender_name || 'Unknown')}</span>
                            <span class="chat-time">${new Date(msg.created_at).toLocaleString()}</span>
                        </div>
                        <div class="chat-text">${escapeHtml(msg.message)}</div>
                    </div>
                </div>
            `;
        }).join('');
        
        // Скроллим вниз
        container.scrollTop = container.scrollHeight;
        
    } catch (e) {
        console.error('Load chat error:', e);
        container.innerHTML = '<div class="no-news">❌ Ошибка загрузки чата</div>';
    }
}

/**
 * Отправить сообщение в чат
 */
async function sendTeamMessage() {
    const input = document.getElementById('teamChatInput');
    const message = input?.value?.trim();
    
    if (!message) return;
    
    try {
        const myWallet = localStorage.getItem('walletAddress') || window.userWalletAddress;
        const myName = currentAdminUser?.name || 'Admin';
        const myRole = currentAdminUser?.role || 'owner';
        
        const { error } = await SupabaseClient.client
            .from('team_chat')
            .insert({
                sender_wallet: myWallet,
                sender_name: myName,
                sender_role: myRole,
                message
            });
        
        if (error) throw error;
        
        input.value = '';
        loadTeamChat();
        
    } catch (e) {
        console.error('Send message error:', e);
        showToast('❌ Ошибка отправки', 'error');
    }
}

// ===== КРЕДИТЫ =====

/**
 * Загрузить статистику кредитов
 */
async function loadCreditsStats() {
    try {
        const { data, error } = await SupabaseClient.client
            .from('ai_credits')
            .select('wallet_address, balance, total_used');
        
        if (error) {
            console.log('Credits table not found or error:', error.message);
            return;
        }
        
        const totalIssued = data?.reduce((sum, u) => sum + (u.balance || 0) + (u.total_used || 0), 0) || 0;
        const totalUsed = data?.reduce((sum, u) => sum + (u.total_used || 0), 0) || 0;
        const totalUsers = data?.length || 0;
        
        const el1 = document.getElementById('totalCreditsIssued');
        const el2 = document.getElementById('totalCreditsUsed');
        const el3 = document.getElementById('totalCreditUsers');
        
        if (el1) el1.textContent = totalIssued;
        if (el2) el2.textContent = totalUsed;
        if (el3) el3.textContent = totalUsers;
        
    } catch (e) {
        console.error('Load credits stats error:', e);
    }
}

/**
 * Начислить кредиты пользователю
 */
async function addCreditsToUser() {
    const wallet = document.getElementById('creditUserWallet')?.value?.trim();
    const amount = parseInt(document.getElementById('creditAmount')?.value) || 0;
    const reason = document.getElementById('creditReason')?.value?.trim() || 'Admin grant';
    
    if (!wallet || !wallet.startsWith('0x')) {
        showToast('Введите корректный wallet адрес', 'error');
        return;
    }
    
    if (amount <= 0) {
        showToast('Введите количество кредитов', 'error');
        return;
    }
    
    try {
        const { data: existing } = await SupabaseClient.client
            .from('ai_credits')
            .select('balance')
            .eq('wallet_address', wallet.toLowerCase())
            .single();
        
        if (existing) {
            const { error } = await SupabaseClient.client
                .from('ai_credits')
                .update({ 
                    balance: existing.balance + amount,
                    updated_at: new Date().toISOString()
                })
                .eq('wallet_address', wallet.toLowerCase());
            
            if (error) throw error;
        } else {
            const { error } = await SupabaseClient.client
                .from('ai_credits')
                .insert({
                    wallet_address: wallet.toLowerCase(),
                    balance: amount,
                    daily_limit: 50,
                    is_active: true
                });
            
            if (error) throw error;
        }
        
        await logAdminAction('add_credits', 'credits', wallet, null, { amount, reason });
        
        showToast(`✅ Начислено ${amount} кредитов!`, 'success');
        
        document.getElementById('creditUserWallet').value = '';
        document.getElementById('creditReason').value = '';
        
        loadCreditsStats();
        
    } catch (e) {
        console.error('Add credits error:', e);
        showToast('❌ Ошибка: ' + e.message, 'error');
    }
}

// ===== ЛОГИ =====

/**
 * Загрузить логи админки
 */
async function loadAdminLogs() {
    const container = document.getElementById('adminLogsList');
    if (!container) return;
    
    try {
        const { data, error } = await SupabaseClient.client
            .from('admin_logs')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(100);
        
        if (error) throw error;
        
        if (!data || data.length === 0) {
            container.innerHTML = '<div class="no-news">📋 Нет записей в логах</div>';
            return;
        }
        
        container.innerHTML = data.map(log => `
            <div class="log-item">
                <div class="log-action">${getActionIcon(log.action)} ${getActionName(log.action)}</div>
                <div class="log-details">
                    ${log.target_wallet ? `👤 ${log.target_wallet.substring(0, 10)}...` : ''}
                    ${log.details ? ` | ${JSON.stringify(log.details).substring(0, 50)}` : ''}
                </div>
                <div class="log-time">
                    🕐 ${new Date(log.created_at).toLocaleString()} | 
                    ${log.admin_name || log.admin_wallet?.substring(0, 10)}
                </div>
            </div>
        `).join('');
        
    } catch (e) {
        console.error('Load logs error:', e);
        container.innerHTML = '<div class="no-news">❌ Ошибка загрузки логов</div>';
    }
}

/**
 * Записать действие в лог
 */
async function logAdminAction(action, actionType, targetWallet = null, targetId = null, details = null) {
    try {
        const myWallet = localStorage.getItem('walletAddress') || window.userWalletAddress;
        const myName = currentAdminUser?.name || 'Owner';
        const myRole = currentAdminUser?.role || 'owner';
        
        await SupabaseClient.client
            .from('admin_logs')
            .insert({
                admin_wallet: myWallet,
                admin_name: myName,
                admin_role: myRole,
                action,
                action_type: actionType,
                target_wallet: targetWallet,
                target_id: targetId,
                details
            });
            
    } catch (e) {
        console.error('Log action error:', e);
    }
}

function getActionIcon(action) {
    const icons = {
        'add_news': '📰',
        'delete_news': '🗑️',
        'add_credits': '💰',
        'add_team_member': '👥',
        'add_access': '🔐',
        'update_access': '✏️',
        'remove_access': '🗑️',
        'activate_member': '✅',
        'deactivate_member': '🚫',
        'activate_access': '✅',
        'deactivate_access': '🚫'
    };
    return icons[action] || '📋';
}

function getActionName(action) {
    const names = {
        'add_news': 'Добавлена новость',
        'delete_news': 'Удалена новость',
        'add_credits': 'Начислены кредиты',
        'add_team_member': 'Добавлен в команду',
        'add_access': 'Добавлен доступ',
        'update_access': 'Изменён доступ',
        'remove_access': 'Удалён доступ',
        'activate_member': 'Активирован',
        'deactivate_member': 'Деактивирован',
        'activate_access': 'Доступ активирован',
        'deactivate_access': 'Доступ деактивирован'
    };
    return names[action] || action;
}

// ===== НОВОСТИ ДЛЯ ПОЛЬЗОВАТЕЛЕЙ (КОЛОКОЛЬЧИК) =====

async function loadUserNews() {
    try {
        const { data, error } = await SupabaseClient?.client
            ?.from('news')
            ?.select('*')
            ?.eq('is_active', true)
            ?.order('created_at', { ascending: false })
            ?.limit(10);
        
        if (error || !data) return;
        
        // Обновляем счётчик на колокольчике
        const badge = document.getElementById('newsBadge');
        const readNews = JSON.parse(localStorage.getItem('readNewsIds') || '[]');
        const unreadCount = data.filter(n => !readNews.includes(n.id)).length;
        
        if (badge) {
            badge.textContent = unreadCount;
            badge.style.display = unreadCount > 0 ? 'flex' : 'none';
        }
        
    } catch (e) {
        console.error('Load user news error:', e);
    }
}

// ===== УТИЛИТЫ =====

function escapeHtml(text) {
    if (!text) return '';
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function showToast(message, type = 'info') {
    if (typeof window.showNotification === 'function') {
        window.showNotification(message, type);
    } else {
        alert(message);
    }
}

// ===== ЭКСПОРТ ФУНКЦИЙ =====
window.checkAdminAccess = checkAdminAccess;
window.switchAdminTab = switchAdminTab;
window.publishNews = publishNews;
window.deleteNews = deleteNews;
window.loadAdminNews = loadAdminNews;
window.openNewsModal = openNewsModal;
window.closeNewsModal = closeNewsModal;
window.loadNewsModalContent = loadNewsModalContent;
window.markNewsRead = markNewsRead;
window.addTeamMember = addTeamMember;
window.toggleTeamMember = toggleTeamMember;
window.loadTeamMembers = loadTeamMembers;
window.sendTeamMessage = sendTeamMessage;
window.loadTeamChat = loadTeamChat;
window.addCreditsToUser = addCreditsToUser;
window.loadCreditsStats = loadCreditsStats;
window.loadAdminLogs = loadAdminLogs;

// НОВЫЕ функции для доступов
window.loadAccessManagement = loadAccessManagement;
window.openAddAccessModal = openAddAccessModal;
window.closeAddAccessModal = closeAddAccessModal;
window.saveNewAccess = saveNewAccess;
window.editAccessMember = editAccessMember;
window.updateAccessMember = updateAccessMember;
window.toggleAccessMember = toggleAccessMember;
window.removeAccessMember = removeAccessMember;
window.updateRoleDescription = updateRoleDescription;

// Закрытие модалок по клику на overlay
document.addEventListener('click', function(e) {
    if (e.target.classList.contains('modal-overlay')) {
        e.target.style.setProperty('display', 'none', 'important');
        e.target.setAttribute('hidden', '');
        e.target.classList.remove('show');
    }
});

// Закрытие по Escape
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        document.querySelectorAll('.modal-overlay').forEach(modal => {
            modal.style.setProperty('display', 'none', 'important');
            modal.setAttribute('hidden', '');
            modal.classList.remove('show');
        });
    }
});

/* =====================================================
   NEWS LOADER FIX - Исправление загрузки новостей
   
   Добавить в admin-panel.js или подключить отдельно
   ===================================================== */

// Исправленная функция загрузки новостей в модалку
async function loadNewsModalContentFixed() {
    const container = document.getElementById('newsModalContent');
    if (!container) return;
    
    // Показываем загрузку
    container.innerHTML = '<p style="text-align: center; color: #aaa; padding: 40px;">⏳ Загрузка новостей...</p>';
    
    // Ждём пока Supabase загрузится
    let attempts = 0;
    while ((!window.SupabaseClient || !SupabaseClient.client) && attempts < 10) {
        await new Promise(r => setTimeout(r, 500));
        attempts++;
    }
    
    if (!window.SupabaseClient || !SupabaseClient.client) {
        container.innerHTML = '<p style="text-align: center; color: #ff6b6b; padding: 40px;">❌ Не удалось подключиться к базе данных</p>';
        return;
    }
    
    try {
        const { data: news, error } = await SupabaseClient.client
            .from('news')
            .select('*')
            .eq('is_active', true)
            .order('created_at', { ascending: false })
            .limit(20);
        
        if (error) {
            console.error('News load error:', error);
            throw error;
        }
        
        if (!news || news.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #aaa;">
                    <div style="font-size: 48px; margin-bottom: 15px;">📭</div>
                    <p>Пока нет новостей</p>
                </div>
            `;
            return;
        }
        
        const readIds = JSON.parse(localStorage.getItem('readNewsIds') || '[]');
        const typeIcons = { 
            'info': 'ℹ️', 
            'update': '🔄', 
            'promo': '🎁', 
            'warning': '⚠️', 
            'urgent': '🚨',
            'important': '❗'
        };
        
        container.innerHTML = news.map(item => {
            const isRead = readIds.includes(item.id);
            const icon = typeIcons[item.type] || '📰';
            const date = new Date(item.created_at).toLocaleDateString('ru-RU');
            
            return `
                <div class="news-modal-item ${isRead ? 'read' : 'unread'}" 
                     data-id="${item.id}" 
                     onclick="markNewsRead(${item.id})"
                     style="padding: 15px; border-radius: 10px; margin-bottom: 10px; cursor: pointer; 
                            background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.1);
                            ${!isRead ? 'border-left: 3px solid #FFD700;' : ''}">
                    <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
                        <span style="font-size: 18px;">${icon}</span>
                        <span style="font-weight: 600; flex: 1; color: #fff;">${escapeHtml(item.title)}</span>
                        ${!isRead ? '<span style="background: #FFD700; color: #000; font-size: 10px; padding: 2px 6px; border-radius: 10px; font-weight: bold;">NEW</span>' : ''}
                    </div>
                    <div style="font-size: 14px; color: #ccc; line-height: 1.6; margin-bottom: 8px;">
                        ${escapeHtml(item.content)}
                    </div>
                    <div style="font-size: 12px; color: #888;">📅 ${date}</div>
                </div>
            `;
        }).join('');
        
        console.log('✅ News loaded:', news.length);
        
    } catch (e) {
        console.error('Load news modal error:', e);
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #ff6b6b;">
                <div style="font-size: 48px; margin-bottom: 15px;">❌</div>
                <p>Ошибка загрузки: ${e.message}</p>
                <button onclick="loadNewsModalContentFixed()" 
                        style="margin-top: 15px; padding: 10px 20px; background: #8b5cf6; color: #fff; border: none; border-radius: 8px; cursor: pointer;">
                    🔄 Повторить
                </button>
            </div>
        `;
    }
}

// Переопределяем оригинальную функцию
if (typeof window.loadNewsModalContent !== 'undefined') {
    window.loadNewsModalContent = loadNewsModalContentFixed;
}

// Helper
function escapeHtml(text) {
    if (!text) return '';
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

console.log('📰 News Loader Fix loaded');

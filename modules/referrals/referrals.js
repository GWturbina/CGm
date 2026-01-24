/* =====================================================
   CARDGIFT - REFERRAL SYSTEM v2.0
   
   Автономная реферальная система контактов:
   - 9-уровневая структура контактов
   - Внешние проекты (External Referral Links)
   - Компрессия при регистрации в GlobalWay
   - Независима от GlobalWay маркетинга
   ===================================================== */

console.log('🌐 Referral System v2.0 loading...');

// ═══════════════════════════════════════════════════════════
// ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ
// ═══════════════════════════════════════════════════════════

let allReferrals = [];
let externalProjects = [];
let referralStats = {
    total: 0,
    byLine: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0 },
    withGwId: 0,
    thisMonth: 0
};

// ═══════════════════════════════════════════════════════════
// ИНИЦИАЛИЗАЦИЯ
// ═══════════════════════════════════════════════════════════

async function initReferralSystem() {
    console.log('🌐 Initializing Referral System v2.0...');
    
    // Загружаем внешние проекты из localStorage
    loadExternalProjects();
    
    // Устанавливаем CardGift реферальную ссылку
    updateCardGiftReferralLink();
    
    // Рендерим внешние проекты
    renderExternalProjects();
}

// ═══════════════════════════════════════════════════════════
// CARDGIFT РЕФЕРАЛЬНАЯ ССЫЛКА
// ═══════════════════════════════════════════════════════════

function updateCardGiftReferralLink() {
    const userId = window.currentCgId 
                || window.currentTempId
                || window.currentDisplayId
                || localStorage.getItem('cardgift_cg_id')
                || localStorage.getItem('cardgift_temp_id')
                || localStorage.getItem('cardgift_display_id');
    
    const input = document.getElementById('referralLinkInput');
    if (input && userId) {
        // Формируем CG ID
        let cgId = userId;
        if (!cgId.startsWith('CG_') && !cgId.startsWith('GW')) {
            cgId = userId;
        }
        
        const refLink = `https://cardgift.site/?ref=${cgId}`;
        input.value = refLink;
        
        // Короткая ссылка
        const shortEl = document.getElementById('shortReferralLink');
        if (shortEl) {
            shortEl.textContent = `cardgift.site/?ref=${cgId}`;
        }
    }
}

function copyReferralLink() {
    const input = document.getElementById('referralLinkInput');
    if (input && input.value) {
        navigator.clipboard.writeText(input.value);
        showToast && showToast('✅ Ссылка скопирована!', 'success');
    }
}

function shareReferralLink() {
    const input = document.getElementById('referralLinkInput');
    if (input && input.value && navigator.share) {
        navigator.share({
            title: 'CardGift - Присоединяйся!',
            text: 'Создавай красивые открытки и развивай свою команду',
            url: input.value
        });
    } else {
        copyReferralLink();
    }
}

// ═══════════════════════════════════════════════════════════
// ВНЕШНИЕ ПРОЕКТЫ (EXTERNAL REFERRAL LINKS)
// ═══════════════════════════════════════════════════════════

function loadExternalProjects() {
    try {
        const saved = localStorage.getItem('cardgift_external_projects');
        externalProjects = saved ? JSON.parse(saved) : [];
        console.log('📂 Loaded external projects:', externalProjects.length);
    } catch (e) {
        externalProjects = [];
    }
}

function saveExternalProjects() {
    localStorage.setItem('cardgift_external_projects', JSON.stringify(externalProjects));
    
    // Также сохраняем в Supabase для синхронизации
    saveExternalProjectsToSupabase();
}

async function saveExternalProjectsToSupabase() {
    const userId = getCurrentUserId();
    if (!userId || !window.SupabaseClient || !SupabaseClient.client) return;
    
    try {
        // Определяем поле для поиска
        const isGwId = userId.startsWith('GW') || /^\d{7,9}$/.test(userId);
        const isTempId = userId.startsWith('CG_TEMP_');
        
        const updateData = {
            external_projects: JSON.stringify(externalProjects),
            updated_at: new Date().toISOString()
        };
        
        if (isGwId) {
            const gwId = userId.startsWith('GW') ? userId : 'GW' + userId;
            await SupabaseClient.client
                .from('users')
                .update(updateData)
                .eq('gw_id', gwId);
        } else if (isTempId) {
            await SupabaseClient.client
                .from('users')
                .update(updateData)
                .eq('temp_id', userId);
        }
    } catch (e) {
        console.warn('Failed to sync external projects:', e);
    }
}

function renderExternalProjects() {
    const container = document.getElementById('externalProjectsList');
    if (!container) return;
    
    if (externalProjects.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; color: #888; padding: 20px;">
                <div style="font-size: 32px; margin-bottom: 10px;">🔗</div>
                <div>Нет добавленных проектов</div>
                <div style="font-size: 12px; margin-top: 5px;">Добавьте реферальную ссылку вашего проекта</div>
            </div>
        `;
        return;
    }
    
    const userId = getCurrentUserId();
    
    let html = '';
    externalProjects.forEach((project, index) => {
        // Формируем полную ссылку с ID пользователя
        const fullLink = project.url + (project.loginField || userId);
        
        html += `
            <div class="external-project-item" style="display: flex; align-items: center; gap: 10px; padding: 12px; background: #1a1a2e; border-radius: 8px; margin-bottom: 10px; border: 1px solid #333;">
                <div style="flex: 1;">
                    <div style="color: #FFD700; font-weight: 500; margin-bottom: 4px;">${escapeHtml(project.name || 'Проект ' + (index + 1))}</div>
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <input type="text" readonly value="${escapeHtml(fullLink)}" 
                               style="flex: 1; background: #2a2a4a; border: 1px solid #444; color: #4CAF50; padding: 8px; border-radius: 4px; font-size: 12px;"
                               id="extProject_${index}">
                        <button onclick="copyExternalLink(${index})" class="btn btn-dark" style="padding: 8px 12px;">📋</button>
                    </div>
                </div>
                <button onclick="editExternalProject(${index})" class="btn btn-gray" style="padding: 8px;">✏️</button>
                <button onclick="deleteExternalProject(${index})" class="btn btn-dark" style="padding: 8px; color: #f44336;">🗑️</button>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

function showAddExternalProjectModal() {
    const existingModal = document.querySelector('.external-project-modal');
    if (existingModal) existingModal.remove();
    
    const modal = document.createElement('div');
    modal.className = 'modal-overlay external-project-modal';
    modal.style.cssText = 'display: flex !important; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.8); z-index: 10000; align-items: center; justify-content: center;';
    
    modal.innerHTML = `
        <div class="modal" style="display: block !important; background: #1a1a2e; border-radius: 16px; padding: 24px; max-width: 500px; width: 90%; border: 1px solid #FFD700;">
            <h3 style="color: #FFD700; margin: 0 0 20px 0; display: flex; align-items: center; gap: 10px;">
                <span>🔗</span> Добавить внешний проект
            </h3>
            
            <div style="margin-bottom: 15px;">
                <label style="color: #888; font-size: 12px; display: block; margin-bottom: 5px;">Название проекта</label>
                <input type="text" id="extProjectName" placeholder="Например: Pupkin & Co" 
                       style="width: 100%; padding: 12px; background: #2a2a4a; border: 1px solid #444; color: #fff; border-radius: 8px; box-sizing: border-box;">
            </div>
            
            <div style="margin-bottom: 15px;">
                <label style="color: #888; font-size: 12px; display: block; margin-bottom: 5px;">URL реферальной ссылки (без ID)</label>
                <input type="text" id="extProjectUrl" placeholder="https://pupkin.ico/?ref=" 
                       style="width: 100%; padding: 12px; background: #2a2a4a; border: 1px solid #444; color: #fff; border-radius: 8px; box-sizing: border-box;">
                <div style="color: #666; font-size: 11px; margin-top: 5px;">💡 Вставьте ссылку до места где должен быть ID/логин</div>
            </div>
            
            <div style="margin-bottom: 20px;">
                <label style="color: #888; font-size: 12px; display: block; margin-bottom: 5px;">Поле для подстановки</label>
                <select id="extProjectField" style="width: 100%; padding: 12px; background: #2a2a4a; border: 1px solid #444; color: #fff; border-radius: 8px;">
                    <option value="cg_id">CardGift ID (CG_XXXXXXXX)</option>
                    <option value="custom">Свой логин/ID</option>
                </select>
            </div>
            
            <div id="customLoginField" style="display: none; margin-bottom: 20px;">
                <label style="color: #888; font-size: 12px; display: block; margin-bottom: 5px;">Ваш логин/ID в этом проекте</label>
                <input type="text" id="extProjectLogin" placeholder="ID1234567" 
                       style="width: 100%; padding: 12px; background: #2a2a4a; border: 1px solid #444; color: #fff; border-radius: 8px; box-sizing: border-box;">
            </div>
            
            <div style="display: flex; gap: 10px; justify-content: flex-end;">
                <button onclick="closeExternalProjectModal()" class="btn btn-gray">Отмена</button>
                <button onclick="saveExternalProject()" class="btn btn-green">💾 Сохранить</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Обработчик переключения поля
    document.getElementById('extProjectField').addEventListener('change', function() {
        document.getElementById('customLoginField').style.display = this.value === 'custom' ? 'block' : 'none';
    });
    
    // Закрытие по клику на overlay
    modal.addEventListener('click', function(e) {
        if (e.target === modal) closeExternalProjectModal();
    });
}

function closeExternalProjectModal() {
    const modal = document.querySelector('.external-project-modal');
    if (modal) modal.remove();
}

function saveExternalProject(editIndex = null) {
    const name = document.getElementById('extProjectName')?.value?.trim();
    const url = document.getElementById('extProjectUrl')?.value?.trim();
    const fieldType = document.getElementById('extProjectField')?.value;
    const customLogin = document.getElementById('extProjectLogin')?.value?.trim();
    
    if (!url) {
        showToast && showToast('Введите URL ссылки', 'error');
        return;
    }
    
    const project = {
        name: name || 'Проект',
        url: url,
        fieldType: fieldType,
        loginField: fieldType === 'custom' ? customLogin : null,
        createdAt: new Date().toISOString()
    };
    
    if (editIndex !== null && editIndex >= 0) {
        externalProjects[editIndex] = project;
    } else {
        externalProjects.push(project);
    }
    
    saveExternalProjects();
    renderExternalProjects();
    closeExternalProjectModal();
    
    showToast && showToast('✅ Проект сохранён!', 'success');
}

function editExternalProject(index) {
    const project = externalProjects[index];
    if (!project) return;
    
    showAddExternalProjectModal();
    
    // Заполняем поля
    setTimeout(() => {
        document.getElementById('extProjectName').value = project.name || '';
        document.getElementById('extProjectUrl').value = project.url || '';
        document.getElementById('extProjectField').value = project.fieldType || 'cg_id';
        
        if (project.fieldType === 'custom') {
            document.getElementById('customLoginField').style.display = 'block';
            document.getElementById('extProjectLogin').value = project.loginField || '';
        }
        
        // Меняем кнопку сохранения
        const saveBtn = document.querySelector('.external-project-modal .btn-green');
        if (saveBtn) {
            saveBtn.onclick = () => saveExternalProject(index);
        }
    }, 100);
}

function deleteExternalProject(index) {
    if (!confirm('Удалить этот проект?')) return;
    
    externalProjects.splice(index, 1);
    saveExternalProjects();
    renderExternalProjects();
    
    showToast && showToast('Проект удалён', 'success');
}

function copyExternalLink(index) {
    const input = document.getElementById(`extProject_${index}`);
    if (input) {
        navigator.clipboard.writeText(input.value);
        showToast && showToast('✅ Ссылка скопирована!', 'success');
    }
}

// ═══════════════════════════════════════════════════════════
// ЗАГРУЗКА РЕФЕРАЛОВ (9-УРОВНЕВАЯ СТРУКТУРА)
// ═══════════════════════════════════════════════════════════

async function loadReferrals() {
    console.log('🌐 loadReferrals() v2.0 - Loading 9-level structure...');
    
    const userId = getCurrentUserId();
    
    if (!userId) {
        renderEmptyReferrals('Подключите аккаунт для просмотра команды');
        return;
    }
    
    // Показываем загрузку
    const tbody = document.getElementById('referralsTableBody');
    if (tbody) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" style="padding: 40px; text-align: center; color: #888;">
                    <div style="font-size: 32px; margin-bottom: 10px;">⏳</div>
                    <div>Загрузка команды...</div>
                </td>
            </tr>
        `;
    }
    
    try {
        // Загружаем всех рефералов по структуре контактов
        allReferrals = await fetchReferralStructure(userId);
        
        console.log('🌐 Total referrals loaded:', allReferrals.length);
        
        // Обновляем статистику
        updateReferralStats();
        
        // Обновляем визуализацию 9 уровней
        updateLevelCircles();
        
        // Рендерим таблицу
        renderReferrals(allReferrals);
        
    } catch (error) {
        console.error('❌ loadReferrals error:', error);
        renderEmptyReferrals('Ошибка загрузки: ' + error.message);
    }
}

async function fetchReferralStructure(userId) {
    const referrals = [];
    
    if (!window.SupabaseClient || !SupabaseClient.client) {
        console.warn('Supabase not available');
        return referrals;
    }
    
    // Нормализуем ID
    const isGwId = userId.startsWith('GW') || /^\d{7,9}$/.test(userId);
    const ownerField = isGwId ? 'owner_gw_id' : 'owner_temp_id';
    const normalizedId = isGwId ? 
        (userId.startsWith('GW') ? userId : 'GW' + userId) : userId;
    
    console.log('🔍 Fetching referrals for:', normalizedId, 'field:', ownerField);
    
    try {
        // Загружаем контакты с source_level (уровень в структуре)
        const { data: contacts, error } = await SupabaseClient.client
            .from('contacts')
            .select(`
                id,
                cg_id,
                name,
                messenger,
                contact,
                source,
                source_level,
                push_consent,
                referral_temp_id,
                referral_gw_id,
                created_at
            `)
            .eq(ownerField, normalizedId)
            .neq('status', 'archived')
            .order('created_at', { ascending: false });
        
        if (error) {
            console.error('Fetch error:', error);
            return referrals;
        }
        
        console.log('📊 Raw contacts:', contacts?.length);
        
        // ═══════════════════════════════════════════════════════════
        // ДЕДУПЛИКАЦИЯ: один контакт показываем только один раз
        // Ключ: messenger + contact (нормализованный)
        // ═══════════════════════════════════════════════════════════
        const seen = new Set();
        
        // Преобразуем в структуру рефералов
        for (const c of contacts || []) {
            // Создаём уникальный ключ для дедупликации
            const contactKey = `${(c.messenger || '').toLowerCase()}_${(c.contact || '').toLowerCase().trim()}`;
            
            // Пропускаем дубликаты
            if (seen.has(contactKey)) {
                console.log(`  ⏭️ Duplicate skipped: ${contactKey}`);
                continue;
            }
            seen.add(contactKey);
            
            // Определяем линию (source_level 0 = линия 1, source_level 1 = линия 2, и т.д.)
            // source_level 99 = контакт от OWNER (показываем как 9+)
            let line = (c.source_level || 0) + 1;
            if (c.source_level === 99) line = 9; // OWNER контакты показываем на 9 линии
            
            // Проверяем есть ли GW ID у этого контакта
            let gwId = c.referral_gw_id || null;
            
            // Если есть связь с user, пробуем получить его GW ID
            if (!gwId && (c.referral_temp_id || c.referral_gw_id)) {
                gwId = await getGwIdForContact(c.referral_temp_id, c.referral_gw_id);
            }
            
            referrals.push({
                id: c.cg_id || c.id,
                cgId: c.cg_id || `CG_${c.id?.substring(0, 8) || 'unknown'}`,
                gwId: gwId,
                name: c.name || 'Без имени',
                messenger: c.messenger,
                contact: c.contact,
                source: c.source,
                line: Math.min(line, 9), // Максимум 9 линий
                pushConsent: c.push_consent,
                createdAt: c.created_at
            });
        }
        
        console.log('📊 After dedup:', referrals.length);
        
    } catch (e) {
        console.error('fetchReferralStructure error:', e);
    }
    
    return referrals;
}

async function getGwIdForContact(tempId, gwId) {
    if (gwId) return gwId;
    if (!tempId) return null;
    
    try {
        const { data } = await SupabaseClient.client
            .from('users')
            .select('gw_id')
            .eq('temp_id', tempId)
            .limit(1);
        
        return data?.[0]?.gw_id || null;
    } catch (e) {
        return null;
    }
}

// ═══════════════════════════════════════════════════════════
// СТАТИСТИКА
// ═══════════════════════════════════════════════════════════

function updateReferralStats() {
    referralStats = {
        total: allReferrals.length,
        byLine: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0 },
        withGwId: 0,
        thisMonth: 0
    };
    
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    
    allReferrals.forEach(r => {
        // По линиям
        if (r.line >= 1 && r.line <= 9) {
            referralStats.byLine[r.line]++;
        }
        
        // С GW ID
        if (r.gwId) {
            referralStats.withGwId++;
        }
        
        // За этот месяц
        if (new Date(r.createdAt) >= startOfMonth) {
            referralStats.thisMonth++;
        }
    });
    
    // Обновляем UI
    setElementText('totalReferralsCount', referralStats.total);
    setElementText('viralReferralsCount', allReferrals.filter(r => r.source === 'viral' || r.source?.includes('Card')).length);
    setElementText('activeReferralsCount', referralStats.withGwId);
    setElementText('monthReferralsCount', referralStats.thisMonth);
}

function updateLevelCircles() {
    // Обновляем круги 1-9 по data-line атрибуту
    for (let i = 1; i <= 9; i++) {
        const circle = document.querySelector(`.level-circle[data-line="${i}"]`);
        if (!circle) continue;
        
        const count = referralStats.byLine[i] || 0;
        
        // В круге ВСЕГДА номер линии
        circle.textContent = i;
        
        if (count > 0) {
            // Есть контакты - зелёный
            circle.style.background = 'linear-gradient(135deg, #4CAF50, #2E7D32)';
            circle.style.border = '2px solid #4CAF50';
            circle.style.color = '#fff';
            circle.title = `${i} линия: ${count} контактов (клик для фильтра)`;
        } else if (i === 1) {
            // 1 линия пустая - золотой
            circle.style.background = 'linear-gradient(135deg, #FFD700, #FFA500)';
            circle.style.border = 'none';
            circle.style.color = '#000';
            circle.title = '1 линия: 0 контактов';
        } else {
            // Пустая линия - серый
            circle.style.background = '#2a2a4a';
            circle.style.border = '2px solid #444';
            circle.style.color = '#888';
            circle.title = `${i} линия: 0 контактов`;
        }
    }
    
    // Обновляем легенду с количеством по линиям
    const legendContainer = document.getElementById('levelLegend');
    if (legendContainer) {
        if (referralStats.total > 0) {
            let totalByLines = '';
            for (let i = 1; i <= 9; i++) {
                if (referralStats.byLine[i] > 0) {
                    totalByLines += `<span style="color: #4CAF50; margin-right: 12px;">L${i}: <b>${referralStats.byLine[i]}</b></span>`;
                }
            }
            legendContainer.innerHTML = totalByLines + `<span style="color: #FFD700; margin-left: 5px;">| Всего: <b>${referralStats.total}</b></span>`;
        } else {
            legendContainer.innerHTML = `
                <span style="color: #FFD700;">●</span> 1 линия (прямые) &nbsp;&nbsp;
                <span style="color: #4CAF50;">●</span> С контактами &nbsp;&nbsp;
                <span style="color: #666;">●</span> Пустая линия
            `;
        }
    }
}

// ═══════════════════════════════════════════════════════════
// РЕНДЕРИНГ ТАБЛИЦЫ
// ═══════════════════════════════════════════════════════════

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
    
    tbody.innerHTML = referrals.map((r, index) => {
        const messengerIcon = getMessengerIcon(r.messenger);
        const sourceIcon = getSourceIcon(r.source);
        const date = r.createdAt ? new Date(r.createdAt).toLocaleDateString('ru-RU') : '—';
        
        // Бейдж линии
        const lineBadge = `
            <span style="display: inline-block; width: 28px; height: 28px; border-radius: 50%; 
                         background: ${r.line === 1 ? 'linear-gradient(135deg, #FFD700, #FFA500)' : '#2a2a4a'}; 
                         color: ${r.line === 1 ? '#000' : '#888'}; 
                         line-height: 28px; font-weight: bold; font-size: 12px; text-align: center;">
                ${r.line}
            </span>
        `;
        
        // GW ID бейдж
        const gwBadge = r.gwId 
            ? `<span style="background: linear-gradient(135deg, #4CAF50, #2E7D32); padding: 4px 8px; border-radius: 12px; font-size: 11px; color: #fff;">${r.gwId}</span>`
            : `<span style="background: #333; padding: 4px 8px; border-radius: 12px; font-size: 11px; color: #666;">—</span>`;
        
        return `
            <tr style="border-bottom: 1px solid #333;">
                <td style="padding: 12px; color: #4CAF50; font-family: monospace; font-size: 11px;">${escapeHtml(r.cgId)}</td>
                <td style="padding: 12px; color: #FFF;">${escapeHtml(r.name)}</td>
                <td style="padding: 12px;">
                    <span style="color: #888;">${messengerIcon}</span>
                    <span style="color: #4CAF50; font-size: 12px;">${escapeHtml(r.contact || '—')}</span>
                </td>
                <td style="padding: 12px; text-align: center;">${lineBadge}</td>
                <td style="padding: 12px; text-align: center;">${sourceIcon}</td>
                <td style="padding: 12px; text-align: center;">${gwBadge}</td>
                <td style="padding: 12px; color: #888; font-size: 12px;">${date}</td>
            </tr>
        `;
    }).join('');
}

function filterReferrals() {
    const sourceFilter = document.getElementById('referralSourceFilter')?.value || 'all';
    const lineFilter = document.getElementById('referralLineFilter')?.value || 'all';
    
    let filtered = [...allReferrals];
    
    // Фильтр по источнику
    if (sourceFilter !== 'all') {
        if (sourceFilter === 'viral') {
            filtered = filtered.filter(r => r.source === 'viral' || r.source?.includes('Card'));
        } else if (sourceFilter === 'card') {
            filtered = filtered.filter(r => r.source?.includes('Card'));
        } else if (sourceFilter === 'registration') {
            filtered = filtered.filter(r => r.source === 'registration' || r.source === 'Registration');
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

// ═══════════════════════════════════════════════════════════
// КОМПРЕССИЯ ПРИ РЕГИСТРАЦИИ В GLOBALWAY
// ═══════════════════════════════════════════════════════════

/**
 * Найти первого спонсора с GW ID вверх по структуре контактов
 * Используется при регистрации в GlobalWay
 */
async function findGwSponsorInStructure(userId) {
    console.log('🔍 Finding GW sponsor in structure for:', userId);
    
    if (!window.SupabaseClient || !SupabaseClient.client) {
        return null;
    }
    
    try {
        // Получаем данные текущего пользователя
        const { data: userData } = await SupabaseClient.client
            .from('users')
            .select('referrer_gw_id, referrer_temp_id')
            .or(`temp_id.eq.${userId},gw_id.eq.${userId}`)
            .limit(1);
        
        if (!userData || userData.length === 0) {
            console.log('User not found in database');
            return null;
        }
        
        const user = userData[0];
        
        // Если у реферера есть GW ID - возвращаем его
        if (user.referrer_gw_id) {
            console.log('✅ Direct referrer has GW ID:', user.referrer_gw_id);
            return user.referrer_gw_id;
        }
        
        // Иначе ищем вверх по цепочке
        let currentId = user.referrer_temp_id;
        let depth = 0;
        const maxDepth = 20; // Защита от бесконечного цикла
        
        while (currentId && depth < maxDepth) {
            console.log(`  Level ${depth}: checking ${currentId}`);
            
            const { data: parentData } = await SupabaseClient.client
                .from('users')
                .select('gw_id, referrer_gw_id, referrer_temp_id')
                .eq('temp_id', currentId)
                .limit(1);
            
            if (!parentData || parentData.length === 0) {
                break;
            }
            
            const parent = parentData[0];
            
            // Если у родителя есть GW ID - нашли!
            if (parent.gw_id) {
                console.log(`✅ Found GW sponsor at level ${depth}:`, parent.gw_id);
                return parent.gw_id;
            }
            
            // Если у родителя есть реферер с GW ID
            if (parent.referrer_gw_id) {
                console.log(`✅ Found GW sponsor (referrer) at level ${depth}:`, parent.referrer_gw_id);
                return parent.referrer_gw_id;
            }
            
            // Идём выше
            currentId = parent.referrer_temp_id;
            depth++;
        }
        
        console.log('⚠️ No GW sponsor found in structure, using ROOT');
        return window.GlobalWayBridge?.ROOT_GW_ID || 'GW9729645';
        
    } catch (e) {
        console.error('findGwSponsorInStructure error:', e);
        return null;
    }
}

// ═══════════════════════════════════════════════════════════
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ═══════════════════════════════════════════════════════════

function getCurrentUserId() {
    return window.currentCgId 
        || window.currentTempId
        || window.currentDisplayId 
        || window.currentGwId
        || localStorage.getItem('cardgift_cg_id')
        || localStorage.getItem('cardgift_temp_id')
        || localStorage.getItem('cardgift_display_id')
        || localStorage.getItem('cardgift_gw_id');
}

function setElementText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function getMessengerIcon(m) {
    const icons = {
        telegram: '📱',
        whatsapp: '💬',
        viber: '💜',
        instagram: '📷',
        facebook: '👤',
        tiktok: '🎵',
        twitter: '🐦',
        email: '📧',
        phone: '☎️'
    };
    return icons[m] || '📋';
}

function getSourceIcon(source) {
    if (source === 'viral') return '<span title="Вирусный маркетинг" style="background: #FF5722; padding: 4px 8px; border-radius: 12px; font-size: 11px;">🔥 Viral</span>';
    if (source?.includes('Card')) return '<span title="Из открытки" style="background: #9C27B0; padding: 4px 8px; border-radius: 12px; font-size: 11px;">🎴 Card</span>';
    if (source === 'registration' || source === 'Registration') return '<span title="Регистрация" style="background: #2196F3; padding: 4px 8px; border-radius: 12px; font-size: 11px;">📝 Reg</span>';
    if (source === 'manual') return '<span title="Вручную" style="background: #607D8B; padding: 4px 8px; border-radius: 12px; font-size: 11px;">✏️ Manual</span>';
    if (source === 'import') return '<span title="Импорт" style="background: #795548; padding: 4px 8px; border-radius: 12px; font-size: 11px;">📥 Import</span>';
    return '<span style="color: #888;">—</span>';
}

// ═══════════════════════════════════════════════════════════
// ЭКСПОРТ
// ═══════════════════════════════════════════════════════════

// Фильтр по линии (клик на круг)
function filterByLine(line) {
    const lineFilter = document.getElementById('referralLineFilter');
    if (lineFilter) {
        lineFilter.value = line.toString();
        filterReferrals();
    } else {
        // Прямая фильтрация
        const filtered = allReferrals.filter(r => r.line === line);
        renderReferrals(filtered);
    }
    
    // Показываем какая линия выбрана
    showToast && showToast(`Линия ${line}: ${referralStats.byLine[line] || 0} контактов`, 'success');
}

window.loadReferrals = loadReferrals;
window.filterReferrals = filterReferrals;
window.filterByLine = filterByLine;
window.copyReferralLink = copyReferralLink;
window.shareReferralLink = shareReferralLink;
window.showAddExternalProjectModal = showAddExternalProjectModal;
window.closeExternalProjectModal = closeExternalProjectModal;
window.saveExternalProject = saveExternalProject;
window.editExternalProject = editExternalProject;
window.deleteExternalProject = deleteExternalProject;
window.copyExternalLink = copyExternalLink;
window.findGwSponsorInStructure = findGwSponsorInStructure;
window.initReferralSystem = initReferralSystem;

// Перехват showSection для автозагрузки
const originalShowSectionReferrals = window.showSection;
window.showSection = function(section) {
    if (originalShowSectionReferrals) originalShowSectionReferrals(section);
    if (section === 'referrals') {
        console.log('🌐 Referrals section opened');
        initReferralSystem();
        setTimeout(loadReferrals, 100);
    }
};

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', () => {
    console.log('🌐 Referral System v2.0 ready');
});

console.log('🌐 Referral System v2.0 loaded');

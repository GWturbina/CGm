/* =====================================================
   CARDGIFT - CONTACTS MODULE
   Вырезано из dashboard.js (строки 1137-1576)
   
   Зависимости:
   - window.ContactsService (contacts-service.js)
   - window.SupabaseClient (supabase.js)
   - window.escapeHtml (common.js)
   - window.showToast (common.js)
   - window.closeModal (dashboard.js)
   
   Глобальные переменные (из dashboard.js):
   - contacts (массив)
   - walletAddress
   - walletConnected
   ===================================================== */

async function loadContacts() {
    // Получаем ID текущего пользователя (v4.0)
    const userId = window.currentDisplayId 
                || window.currentGwId 
                || window.currentTempId 
                || window.currentCgId
                || localStorage.getItem('cardgift_display_id')
                || localStorage.getItem('cardgift_gw_id')
                || localStorage.getItem('cardgift_temp_id')
                || localStorage.getItem('cardgift_cg_id');
    
    console.log('═══════════════════════════════════════');
    console.log('📋 LOADING CONTACTS v4.0');
    console.log('═══════════════════════════════════════');
    console.log('👤 User ID:', userId);
    console.log('📦 ContactsService:', !!window.ContactsService);
    
    if (!userId || userId === '—' || userId === 'undefined') {
        console.log('⚠️ No User ID, cannot load contacts');
        contacts = [];
        renderContacts();
        return;
    }
    
    // Используем ContactsService v4.0
    if (window.ContactsService) {
        try {
            contacts = await ContactsService.getContacts(userId);
            console.log('✅ Contacts loaded:', contacts.length);
        } catch (error) {
            console.warn('ContactsService error:', error);
            contacts = [];
        }
    } else {
        // Fallback - localStorage
        const contactsKey = `cardgift_contacts_${userId}`;
        const saved = localStorage.getItem(contactsKey);
        contacts = saved ? JSON.parse(saved) : [];
        console.log('📋 Contacts from localStorage:', contacts.length);
    }
    
    console.log('═══════════════════════════════════════');
    console.log('📊 FINAL: contacts array has', contacts.length, 'items');
    console.log('═══════════════════════════════════════');
    
    renderContacts();
    updateContactsCounts();
    
    // Загружаем статистику
    if (window.ContactsService && userId) {
        try {
            const stats = await ContactsService.getStats(userId);
            updateStatsDisplay(stats);
        } catch (e) {
            console.warn('Stats error:', e);
        }
    }
}

function updateStatsDisplay(stats) {
    const totalContactsEl = document.getElementById('totalContacts');
    const totalReferralsEl = document.getElementById('totalReferrals');
    const activeReferralsEl = document.getElementById('activeReferrals');
    const monthContactsEl = document.getElementById('monthContacts');
    
    if (totalContactsEl) totalContactsEl.textContent = stats.totalContacts || 0;
    if (totalReferralsEl) totalReferralsEl.textContent = stats.totalReferrals || 0;
    if (activeReferralsEl) activeReferralsEl.textContent = stats.activeReferrals || 0;
    if (monthContactsEl) monthContactsEl.textContent = stats.contactsThisMonth || 0;
}

function saveContacts() {
    if (walletAddress) {
        localStorage.setItem(`cardgift_contacts_${walletAddress}`, JSON.stringify(contacts));
        const shortId = walletAddress.slice(2, 10);
        localStorage.setItem(`cardgift_contacts_${shortId}`, JSON.stringify(contacts));
    }
    localStorage.setItem('cardgift_contacts', JSON.stringify(contacts));
}

function renderContacts() {
    const tbody = document.getElementById('contactsTableBody');
    const empty = document.getElementById('emptyContacts');
    
    if (!tbody) return;
    
    // Проверяем есть ли доступ к разделу
    const cgId = window.currentCgId || localStorage.getItem('cardgift_cg_id');
    
    if (!cgId) {
        tbody.innerHTML = '';
        if (empty) {
            empty.textContent = 'Подключите кошелек для управления контактами';
            empty.style.display = 'block';
        }
        return;
    }
    
    if (contacts.length === 0) {
        tbody.innerHTML = '';
        if (empty) {
            empty.textContent = 'У вас пока нет контактов. Создайте открытку и поделитесь ссылкой!';
            empty.style.display = 'block';
        }
        return;
    }
    
    if (empty) empty.style.display = 'none';
    
    tbody.innerHTML = contacts.map((c, i) => {
        // Поддержка обоих форматов (Supabase и localStorage)
        const name = c.name || 'Без имени';
        const platform = c.platform || c.messenger || 'unknown';
        const contact = c.contact || '';
        const pushConsent = c.push_consent || c.pushConsent || false;
        const source = c.source || 'Manual';
        const status = c.status || 'new';
        const date = c.created_at ? new Date(c.created_at).toLocaleDateString() : (c.date || '-');
        const contactId = c.id || i;
        
        // ID пользователя (если зарегистрирован)
        const referralId = c.referral_gw_id || c.referral_temp_id || '-';
        const referralBadge = c.referral_gw_id 
            ? `<span class="gw-badge">${c.referral_gw_id}</span>`
            : (c.referral_temp_id 
                ? `<span class="temp-badge" title="${c.referral_temp_id}">Temp</span>` 
                : '<span class="no-id">—</span>');
        
        // Статус бейдж
        const statusBadge = {
            'new': '<span class="status-badge new">Новый</span>',
            'contacted': '<span class="status-badge contacted">Связались</span>',
            'active': '<span class="status-badge active">Активен</span>',
            'inactive': '<span class="status-badge inactive">Неактивен</span>'
        }[status] || '<span class="status-badge">' + status + '</span>';
        
        return `
        <tr data-contact-id="${contactId}">
            <td>${escapeHtml(name)}</td>
            <td><span class="platform-badge ${platform}">${platform}</span></td>
            <td>${escapeHtml(contact)}</td>
            <td>${pushConsent ? '✅' : '❌'}</td>
            <td>${escapeHtml(source)}</td>
            <td>${referralBadge}</td>
            <td>${statusBadge}</td>
            <td>${date}</td>
            <td>
                <button class="btn-icon" onclick="editContact('${contactId}')" title="Редактировать">✏️</button>
                <button class="btn-icon" onclick="deleteContact('${contactId}')" title="Удалить">🗑️</button>
                <button class="btn-icon" onclick="messageContact(${i})" title="Написать">💬</button>
            </td>
        </tr>
    `}).join('');
}

function updateContactsCounts() {
    const platforms = ['telegram', 'whatsapp', 'email', 'phone', 'instagram', 'facebook', 'tiktok', 'twitter', 'viber'];
    
    platforms.forEach(p => {
        // Поддержка обоих полей: platform и messenger
        const count = contacts.filter(c => (c.platform || c.messenger) === p).length;
        const el = document.getElementById(`count-${p}`);
        if (el) el.textContent = count;
    });
    
    const allEl = document.getElementById('count-all');
    if (allEl) allEl.textContent = contacts.length;
    
    const totalEl = document.getElementById('totalContacts');
    if (totalEl) totalEl.textContent = contacts.length;
}

function showAddContactModal() {
    if (!walletConnected) {
        showToast('Сначала подключите кошелек', 'error');
        return;
    }
    
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal">
            <div class="modal-header">
                <h3>➕ Добавить контакт</h3>
                <button class="modal-close" onclick="closeModal()">✕</button>
            </div>
            <div class="modal-body">
                <div class="form-group"><label>Имя:</label><input type="text" id="contactName" class="form-input" placeholder="Имя контакта"></div>
                <div class="form-group"><label>Платформа:</label>
                    <select id="contactPlatform" class="form-select">
                        <option value="telegram">Telegram</option>
                        <option value="whatsapp">WhatsApp</option>
                        <option value="email">Email</option>
                        <option value="phone">Телефон</option>
                        <option value="instagram">Instagram</option>
                    </select>
                </div>
                <div class="form-group"><label>Контакт:</label><input type="text" id="contactValue" class="form-input" placeholder="@username или номер"></div>
                <div class="form-group"><label class="checkbox-item"><input type="checkbox" id="contactPush"> Согласие на пуш</label></div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-gray" onclick="closeModal()">Отмена</button>
                <button class="btn btn-green" onclick="addContact()">Добавить</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

async function addContact() {
    console.log('📝 addContact() called');
    
    const name = document.getElementById('contactName')?.value.trim();
    const platform = document.getElementById('contactPlatform')?.value;
    const contact = document.getElementById('contactValue')?.value.trim();
    const pushConsent = document.getElementById('contactPush')?.checked;
    
    console.log('📋 Contact data:', { name, platform, contact, pushConsent });
    
    if (!name || !contact) {
        showToast('Заполните имя и контакт', 'error');
        return;
    }
    
    const cgId = window.currentCgId || localStorage.getItem('cardgift_cg_id');
    console.log('👤 Owner CG_ID:', cgId);
    
    if (!cgId) {
        showToast('Ошибка: не найден ID пользователя', 'error');
        return;
    }
    
    // Используем ContactsService если доступен
    console.log('🔍 ContactsService available:', !!window.ContactsService);
    console.log('🔍 SupabaseClient available:', !!window.SupabaseClient);
    
    if (window.ContactsService) {
        console.log('📤 Calling ContactsService.addContact...');
        const result = await ContactsService.addContact(cgId, {
            name,
            platform,
            contact,
            pushConsent,
            source: 'Manual'
        });
        
        console.log('📥 ContactsService result:', result);
        
        if (result.success) {
            // Перезагружаем контакты
            await loadContacts();
            closeModal();
            showToast('Контакт добавлен!', 'success');
        } else {
            showToast(result.error || 'Ошибка добавления', 'error');
        }
    } else {
        // Fallback - localStorage
        console.log('💾 Using localStorage fallback');
        contacts.push({ 
            name, 
            platform, 
            contact, 
            pushConsent, 
            source: 'Manual', 
            status: 'new', 
            created_at: new Date().toISOString() 
        });
        saveContacts();
        renderContacts();
        updateContactsCounts();
        closeModal();
        showToast('Контакт добавлен!', 'success');
    }
}

function editContact(index) {
    const c = contacts[index];
    if (!c) return;
    
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal">
            <div class="modal-header"><h3>✏️ Редактировать</h3><button class="modal-close" onclick="closeModal()">✕</button></div>
            <div class="modal-body">
                <div class="form-group"><label>Имя:</label><input type="text" id="editName" class="form-input" value="${escapeHtml(c.name)}"></div>
                <div class="form-group"><label>Контакт:</label><input type="text" id="editValue" class="form-input" value="${escapeHtml(c.contact)}"></div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-gray" onclick="closeModal()">Отмена</button>
                <button class="btn btn-green" onclick="saveEditContact(${index})">Сохранить</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

function saveEditContact(index) {
    contacts[index].name = document.getElementById('editName')?.value.trim();
    contacts[index].contact = document.getElementById('editValue')?.value.trim();
    saveContacts();
    renderContacts();
    closeModal();
    showToast('Контакт обновлён!', 'success');
}

async function deleteContact(contactId) {
    if (!confirm('Удалить контакт?')) return;
    
    // Используем ContactsService если доступен
    if (window.ContactsService && typeof contactId === 'string' && contactId.includes('-')) {
        // UUID формат - это из Supabase
        const success = await ContactsService.deleteContact(contactId);
        if (success) {
            await loadContacts();
            showToast('Контакт удалён', 'success');
        } else {
            showToast('Ошибка удаления', 'error');
        }
    } else {
        // Fallback - localStorage (index как число)
        const index = parseInt(contactId);
        if (!isNaN(index) && contacts[index]) {
            contacts.splice(index, 1);
            saveContacts();
            renderContacts();
            updateContactsCounts();
            showToast('Контакт удалён', 'success');
        }
    }
}

function messageContact(index) {
    const c = contacts[index];
    if (!c) return;
    
    let url = '';
    switch(c.platform) {
        case 'telegram': url = `https://t.me/${c.contact.replace('@', '')}`; break;
        case 'whatsapp': url = `https://wa.me/${c.contact.replace(/\D/g, '')}`; break;
        case 'email': url = `mailto:${c.contact}`; break;
        default: showToast('Чат недоступен', 'error'); return;
    }
    window.open(url, '_blank');
}

function filterByPlatform(platform) {
    const select = document.getElementById('categoryFilter');
    if (select) { select.value = platform; searchContacts(); }
}

function searchContacts() {
    const platform = document.getElementById('categoryFilter')?.value || 'all';
    const query = document.getElementById('searchInput')?.value.toLowerCase() || '';
    
    let filtered = contacts;
    // ✅ FIX v4.2: Поддержка обоих полей - platform и messenger
    if (platform !== 'all') {
        filtered = filtered.filter(c => (c.platform || c.messenger) === platform);
    }
    if (query) filtered = filtered.filter(c => 
        (c.name || '').toLowerCase().includes(query) || 
        (c.contact || '').toLowerCase().includes(query)
    );
    
    renderFilteredContacts(filtered);
}

function renderFilteredContacts(filtered) {
    const tbody = document.getElementById('contactsTableBody');
    if (!tbody) return;
    
    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:#888;">Ничего не найдено</td></tr>';
        return;
    }
    
    tbody.innerHTML = filtered.map((c, i) => {
        const realIndex = contacts.indexOf(c);
        // ✅ FIX v4.2: Поддержка обоих форматов полей
        const platform = c.platform || c.messenger || 'unknown';
        const pushConsent = c.push_consent || c.pushConsent || false;
        return `<tr><td>${escapeHtml(c.name || '')}</td><td>${platform}</td><td>${escapeHtml(c.contact || '')}</td><td>${pushConsent ? '✅' : '❌'}</td><td>${c.source || 'Manual'}</td><td>${c.level || 'User'}</td><td>${c.date || ''}</td><td><button class="btn-icon" onclick="editContact(${realIndex})">✏️</button><button class="btn-icon" onclick="deleteContact(${realIndex})">🗑️</button></td></tr>`;
    }).join('');
}

function clearSearch() {
    document.getElementById('categoryFilter').value = 'all';
    document.getElementById('searchInput').value = '';
    renderContacts();
}

function showImportExportModal() {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal">
            <div class="modal-header"><h3>📁 Импорт/Экспорт</h3><button class="modal-close" onclick="closeModal()">✕</button></div>
            <div class="modal-body">
                <button class="btn btn-green btn-block" onclick="exportContacts()">📤 Экспорт (JSON)</button><br><br>
                <label class="btn btn-blue btn-block" style="cursor:pointer;">📥 Импорт<input type="file" accept=".json" onchange="importContacts(event)" style="display:none;"></label>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

function exportContacts() {
    const blob = new Blob([JSON.stringify(contacts, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'cardgift_contacts.json';
    a.click();
    showToast('Экспортировано!', 'success');
}

function importContacts(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const imported = JSON.parse(e.target.result);
            if (Array.isArray(imported)) {
                contacts = [...contacts, ...imported];
                saveContacts();
                renderContacts();
                updateContactsCounts();
                closeModal();
                showToast(`Импортировано ${imported.length}!`, 'success');
            }
        } catch (err) {
            showToast('Ошибка импорта', 'error');
        }
    };
    reader.readAsText(file);
}


// ===== ЭКСПОРТ ДЛЯ ГЛОБАЛЬНОГО ДОСТУПА =====
window.loadContacts = loadContacts;
window.updateStatsDisplay = updateStatsDisplay;
window.saveContacts = saveContacts;
window.renderContacts = renderContacts;
window.updateContactsCounts = updateContactsCounts;
window.showAddContactModal = showAddContactModal;
window.addContact = addContact;
window.editContact = editContact;
window.saveEditContact = saveEditContact;
window.deleteContact = deleteContact;
window.messageContact = messageContact;
window.filterByPlatform = filterByPlatform;
window.searchContacts = searchContacts;
window.renderFilteredContacts = renderFilteredContacts;
window.clearSearch = clearSearch;
window.showImportExportModal = showImportExportModal;
window.exportContacts = exportContacts;
window.importContacts = importContacts;

console.log('📋 Contacts Module loaded');

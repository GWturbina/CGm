/* =====================================================
   CARDGIFT - CONTACTS MODULE v5.0
   - Шаблоны приглашений
   - Валидация контактов (международный формат)
   - Предупреждение при скачивании
   - Terms of Use модалка
   - Защита от дубликатов
   
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

console.log('📋 Contacts Module v5.0 - Templates & Validation');

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

// ═══════════════════════════════════════════════════════════
// ШАБЛОНЫ ПРИГЛАШЕНИЙ
// ═══════════════════════════════════════════════════════════
const inviteTemplates = {
    initial: [
        {
            title: '🔹 Универсальный',
            text: `Привет! Сразу скажу — это не спам.
Я нашёл инструмент, который сегодня реально необходим тем, кто работает или планирует работать в интернете: для бизнеса, блога или развития любой идеи.
Он помогает кратно расширять круг контактов и возможностей — без навязчивости и лишнего шума.
Если тебе интересно — напиши, куда удобнее отправить краткую информацию, и я перешлю.`
        },
        {
            title: '🔹 Уверенный',
            text: `Привет! Пишу точечно, не массово.
Есть один индивидуальный онлайн-инструмент, который сейчас закрывает сразу несколько задач: развитие проекта, рост аудитории и системная работа в сети.
Я уверен, что ты искал именно такое решение. Если откликается — скажи, куда прислать краткое описание, и я отправлю.`
        },
        {
            title: '🔹 Короткий',
            text: `Привет! Не спам.
Нашёл инструмент, который сегодня реально нужен для работы и роста в интернете. Он даёт возможности, которые раньше были доступны только большим командам.
Если интересно — напиши, куда отправить короткую информацию.`
        },
        {
            title: '🔹 Тёплый',
            text: `Привет 🙂 Не спам, пишу по ощущению.
Есть инструмент, который сильно упрощает работу в интернете и при этом расширяет возможности в разы — для бизнеса, личного бренда или проектов.
Если хочешь узнать подробнее — скажи, куда отправить краткую инфо, я перешлю.`
        }
    ],
    followup: [
        {
            title: '🔹 Стандартный',
            text: `Супер, тогда кратко объясняю 👇
Это инструмент нового формата для работы в интернете. Он объединяет в себе:
• рост и систематизацию контактов,
• автоматизацию рекомендаций,
• понятную модель взаимодействия без хаоса и догадок.

Инструмент подходит:
• для бизнеса,
• для блогеров,
• для команд и онлайн-проектов,
• и для тех, кто хочет зарабатывать в сети системно.

Я вскоре отправлю тебе инструкцию, и ты получишь доступ к краткой презентации и следующим шагам с чего начать`
        },
        {
            title: '🔹 Про ценность',
            text: `Отлично 👍
Это не хайп и не шаблонное решение. Мы создаём экосистему инструментов, которые:
• реально работают,
• масштабируются,
• и дают понятный результат.

Ты увидишь:
• как всё устроено изнутри,
• какие возможности открываются,
• и как можно использовать это именно под свои цели.

Я вскоре отправлю тебе инструкцию, и ты получишь доступ к краткой презентации и следующим шагам с чего начать`
        },
        {
            title: '🔹 Динамичный',
            text: `Отлично!
Ниже форма — заполни её. После этого ты:
• увидишь сам инструмент,
• поймёшь, как он работает,
• и решишь, подходит ли он тебе.

Без обязательств — только факты и возможности 👇`
        },
        {
            title: '🔹 Доверительный',
            text: `Рад, что откликнулось 🙂
Это проект про удобство, системность и реальные возможности, без спешки и давления.

Вскоре отправлю краткое объяснение и доступ к инструментам. Дальше сам решишь, насколько тебе это интересно 👇`
        },
        {
            title: '🔹 Для лидеров',
            text: `Отлично, тогда по делу.
Это инфраструктурный инструмент, который можно:
• встроить в существующий бизнес,
• использовать для масштабирования,
• или развивать как отдельное направление.

Очень скоро я покажу архитектуру решения и возможные сценарии использования.`
        }
    ]
};

function showAddContactModal() {
    if (!walletConnected) {
        showToast('Сначала подключите кошелек', 'error');
        return;
    }
    
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.id = 'addContactModal';
    modal.innerHTML = `
        <div class="modal" style="max-width: 600px; max-height: 90vh; overflow-y: auto;">
            <div class="modal-header">
                <h3>➕ Добавить контакт</h3>
                <button class="modal-close" onclick="closeModal()">✕</button>
            </div>
            
            <!-- Вкладки -->
            <div style="display: flex; border-bottom: 2px solid #333; margin-bottom: 20px;">
                <button id="tabInvite" onclick="switchContactTab('invite')" 
                        style="flex: 1; padding: 12px; background: linear-gradient(45deg, #FFD700, #FFA500); color: #000; border: none; font-weight: bold; cursor: pointer; border-radius: 8px 8px 0 0;">
                    📨 Пригласить
                </button>
                <button id="tabManual" onclick="switchContactTab('manual')" 
                        style="flex: 1; padding: 12px; background: #333; color: #888; border: none; cursor: pointer; border-radius: 8px 8px 0 0;">
                    ✏️ Добавить вручную
                </button>
            </div>
            
            <!-- Вкладка: Пригласить -->
            <div id="inviteTab" class="modal-body">
                <p style="color: #888; font-size: 13px; margin-bottom: 15px;">
                    Выберите мессенджер и скопируйте готовый текст приглашения
                </p>
                
                <!-- Кнопки мессенджеров -->
                <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 20px;">
                    <button onclick="selectInviteMessenger('telegram')" class="messenger-btn" data-messenger="telegram"
                            style="background: #0088cc; color: #fff; border: none; padding: 15px 10px; border-radius: 10px; cursor: pointer; display: flex; flex-direction: column; align-items: center; gap: 5px;">
                        <span style="font-size: 24px;">📱</span>
                        <span style="font-size: 11px;">Telegram</span>
                    </button>
                    <button onclick="selectInviteMessenger('whatsapp')" class="messenger-btn" data-messenger="whatsapp"
                            style="background: #25D366; color: #fff; border: none; padding: 15px 10px; border-radius: 10px; cursor: pointer; display: flex; flex-direction: column; align-items: center; gap: 5px;">
                        <span style="font-size: 24px;">💬</span>
                        <span style="font-size: 11px;">WhatsApp</span>
                    </button>
                    <button onclick="selectInviteMessenger('viber')" class="messenger-btn" data-messenger="viber"
                            style="background: #7360F2; color: #fff; border: none; padding: 15px 10px; border-radius: 10px; cursor: pointer; display: flex; flex-direction: column; align-items: center; gap: 5px;">
                        <span style="font-size: 24px;">📞</span>
                        <span style="font-size: 11px;">Viber</span>
                    </button>
                    <button onclick="selectInviteMessenger('facebook')" class="messenger-btn" data-messenger="facebook"
                            style="background: #1877F2; color: #fff; border: none; padding: 15px 10px; border-radius: 10px; cursor: pointer; display: flex; flex-direction: column; align-items: center; gap: 5px;">
                        <span style="font-size: 24px;">📘</span>
                        <span style="font-size: 11px;">Facebook</span>
                    </button>
                    <button onclick="selectInviteMessenger('instagram')" class="messenger-btn" data-messenger="instagram"
                            style="background: linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888); color: #fff; border: none; padding: 15px 10px; border-radius: 10px; cursor: pointer; display: flex; flex-direction: column; align-items: center; gap: 5px;">
                        <span style="font-size: 24px;">📷</span>
                        <span style="font-size: 11px;">Instagram</span>
                    </button>
                    <button onclick="selectInviteMessenger('tiktok')" class="messenger-btn" data-messenger="tiktok"
                            style="background: #000; color: #fff; border: 1px solid #fff; padding: 15px 10px; border-radius: 10px; cursor: pointer; display: flex; flex-direction: column; align-items: center; gap: 5px;">
                        <span style="font-size: 24px;">🎵</span>
                        <span style="font-size: 11px;">TikTok</span>
                    </button>
                    <button onclick="selectInviteMessenger('twitter')" class="messenger-btn" data-messenger="twitter"
                            style="background: #1DA1F2; color: #fff; border: none; padding: 15px 10px; border-radius: 10px; cursor: pointer; display: flex; flex-direction: column; align-items: center; gap: 5px;">
                        <span style="font-size: 24px;">🐦</span>
                        <span style="font-size: 11px;">Twitter/X</span>
                    </button>
                    <button onclick="selectInviteMessenger('email')" class="messenger-btn" data-messenger="email"
                            style="background: #EA4335; color: #fff; border: none; padding: 15px 10px; border-radius: 10px; cursor: pointer; display: flex; flex-direction: column; align-items: center; gap: 5px;">
                        <span style="font-size: 24px;">📧</span>
                        <span style="font-size: 11px;">Email</span>
                    </button>
                </div>
                
                <!-- Выбор типа шаблона -->
                <div style="display: flex; gap: 10px; margin-bottom: 15px;">
                    <button id="btnInitialTemplates" onclick="showTemplateType('initial')" 
                            style="flex: 1; padding: 10px; background: #FFD700; color: #000; border: none; border-radius: 8px; font-weight: bold; cursor: pointer;">
                        📝 Первое касание
                    </button>
                    <button id="btnFollowupTemplates" onclick="showTemplateType('followup')" 
                            style="flex: 1; padding: 10px; background: #333; color: #888; border: none; border-radius: 8px; cursor: pointer;">
                        📋 После согласия
                    </button>
                </div>
                
                <!-- Шаблоны -->
                <div id="templatesContainer" style="max-height: 200px; overflow-y: auto; margin-bottom: 15px;">
                    ${renderTemplateButtons('initial')}
                </div>
                
                <!-- Текст для копирования -->
                <div style="margin-bottom: 15px;">
                    <label style="color: #FFD700; font-weight: bold; display: block; margin-bottom: 8px;">📝 Текст приглашения:</label>
                    <textarea id="inviteText" rows="6" 
                              style="width: 100%; background: #1a1a2e; border: 1px solid #FFD700; border-radius: 8px; color: #fff; padding: 12px; font-size: 14px; resize: vertical;"
                              placeholder="Выберите шаблон или напишите свой текст...">${inviteTemplates.initial[0].text}</textarea>
                </div>
                
                <!-- Кнопка копирования -->
                <button onclick="copyInviteText()" 
                        style="width: 100%; padding: 15px; background: linear-gradient(45deg, #FFD700, #FFA500); color: #000; border: none; border-radius: 10px; font-size: 16px; font-weight: bold; cursor: pointer;">
                    📋 Копировать текст
                </button>
                
                <p style="color: #666; font-size: 11px; text-align: center; margin-top: 10px;">
                    После копирования вставьте текст в выбранный мессенджер
                </p>
            </div>
            
            <!-- Вкладка: Добавить вручную -->
            <div id="manualTab" class="modal-body" style="display: none;">
                <div class="form-group">
                    <label style="color: #FFD700;">Имя:</label>
                    <input type="text" id="contactName" class="form-input" placeholder="Имя контакта" 
                           style="width: 100%; padding: 12px; background: #1a1a2e; border: 1px solid #444; border-radius: 8px; color: #fff;">
                </div>
                <div class="form-group">
                    <label style="color: #FFD700;">Платформа:</label>
                    <select id="contactPlatform" class="form-select" 
                            style="width: 100%; padding: 12px; background: #1a1a2e; border: 1px solid #444; border-radius: 8px; color: #fff;">
                        <option value="telegram">📱 Telegram</option>
                        <option value="whatsapp">💬 WhatsApp</option>
                        <option value="viber">📞 Viber</option>
                        <option value="facebook">📘 Facebook</option>
                        <option value="instagram">📷 Instagram</option>
                        <option value="tiktok">🎵 TikTok</option>
                        <option value="twitter">🐦 Twitter/X</option>
                        <option value="email">📧 Email</option>
                        <option value="phone">📞 Телефон</option>
                    </select>
                </div>
                <div class="form-group">
                    <label style="color: #FFD700;">Контакт:</label>
                    <input type="text" id="contactValue" class="form-input" placeholder="@username или +380..." 
                           style="width: 100%; padding: 12px; background: #1a1a2e; border: 1px solid #444; border-radius: 8px; color: #fff;">
                    <small id="contactValidation" style="color: #888; font-size: 11px; margin-top: 5px; display: block;">
                        Телефон в формате +380XXXXXXXXX
                    </small>
                </div>
                <div class="form-group">
                    <label class="checkbox-item" style="display: flex; align-items: center; gap: 10px; cursor: pointer;">
                        <input type="checkbox" id="contactPush" style="width: 20px; height: 20px;"> 
                        <span style="color: #ccc;">Согласие на push-уведомления</span>
                    </label>
                </div>
                <div class="form-group">
                    <label style="color: #FFD700;">Заметка (опционально):</label>
                    <textarea id="contactNote" rows="2" placeholder="Личная заметка о контакте..."
                              style="width: 100%; padding: 12px; background: #1a1a2e; border: 1px solid #444; border-radius: 8px; color: #fff; resize: none;"></textarea>
                </div>
                
                <div style="display: flex; gap: 10px; margin-top: 20px;">
                    <button class="btn btn-gray" onclick="closeModal()" style="flex: 1; padding: 12px; background: #444; color: #fff; border: none; border-radius: 8px; cursor: pointer;">
                        Отмена
                    </button>
                    <button class="btn btn-green" onclick="addContact()" style="flex: 1; padding: 12px; background: linear-gradient(45deg, #4CAF50, #2E7D32); color: #fff; border: none; border-radius: 8px; cursor: pointer; font-weight: bold;">
                        ➕ Добавить
                    </button>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    
    // Добавляем стили для выбранного мессенджера
    const style = document.createElement('style');
    style.textContent = `
        .messenger-btn.selected {
            box-shadow: 0 0 0 3px #FFD700 !important;
            transform: scale(1.05);
        }
        .template-btn {
            width: 100%;
            padding: 10px 15px;
            margin-bottom: 8px;
            background: #2a2a3e;
            border: 1px solid #444;
            border-radius: 8px;
            color: #fff;
            text-align: left;
            cursor: pointer;
            transition: all 0.2s;
        }
        .template-btn:hover {
            background: #3a3a4e;
            border-color: #FFD700;
        }
        .template-btn.selected {
            background: rgba(255, 215, 0, 0.2);
            border-color: #FFD700;
        }
    `;
    document.head.appendChild(style);
}

function renderTemplateButtons(type) {
    const templates = inviteTemplates[type] || [];
    return templates.map((t, i) => `
        <button class="template-btn" onclick="selectTemplate('${type}', ${i})">
            ${t.title}
        </button>
    `).join('');
}

function switchContactTab(tab) {
    const inviteTab = document.getElementById('inviteTab');
    const manualTab = document.getElementById('manualTab');
    const tabInvite = document.getElementById('tabInvite');
    const tabManual = document.getElementById('tabManual');
    
    if (tab === 'invite') {
        inviteTab.style.display = 'block';
        manualTab.style.display = 'none';
        tabInvite.style.background = 'linear-gradient(45deg, #FFD700, #FFA500)';
        tabInvite.style.color = '#000';
        tabManual.style.background = '#333';
        tabManual.style.color = '#888';
    } else {
        inviteTab.style.display = 'none';
        manualTab.style.display = 'block';
        tabManual.style.background = 'linear-gradient(45deg, #FFD700, #FFA500)';
        tabManual.style.color = '#000';
        tabInvite.style.background = '#333';
        tabInvite.style.color = '#888';
    }
}

function showTemplateType(type) {
    const container = document.getElementById('templatesContainer');
    const btnInitial = document.getElementById('btnInitialTemplates');
    const btnFollowup = document.getElementById('btnFollowupTemplates');
    
    container.innerHTML = renderTemplateButtons(type);
    
    if (type === 'initial') {
        btnInitial.style.background = '#FFD700';
        btnInitial.style.color = '#000';
        btnFollowup.style.background = '#333';
        btnFollowup.style.color = '#888';
    } else {
        btnFollowup.style.background = '#FFD700';
        btnFollowup.style.color = '#000';
        btnInitial.style.background = '#333';
        btnInitial.style.color = '#888';
    }
    
    // Выбираем первый шаблон по умолчанию
    selectTemplate(type, 0);
}

function selectTemplate(type, index) {
    const templates = inviteTemplates[type] || [];
    const template = templates[index];
    
    if (template) {
        document.getElementById('inviteText').value = template.text;
        
        // Подсвечиваем выбранную кнопку
        document.querySelectorAll('.template-btn').forEach((btn, i) => {
            btn.classList.toggle('selected', i === index);
        });
    }
}

function selectInviteMessenger(messenger) {
    // Подсвечиваем выбранный мессенджер
    document.querySelectorAll('.messenger-btn').forEach(btn => {
        btn.classList.toggle('selected', btn.dataset.messenger === messenger);
    });
    
    // Сохраняем выбор
    window.selectedInviteMessenger = messenger;
}

function copyInviteText() {
    const text = document.getElementById('inviteText').value;
    
    if (!text.trim()) {
        showToast('Напишите или выберите текст', 'error');
        return;
    }
    
    navigator.clipboard.writeText(text).then(() => {
        showToast('✅ Текст скопирован! Вставьте в мессенджер', 'success');
    }).catch(() => {
        // Fallback
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        showToast('✅ Текст скопирован!', 'success');
    });
}

// ═══════════════════════════════════════════════════════════
// ВАЛИДАЦИЯ КОНТАКТОВ
// ═══════════════════════════════════════════════════════════
function validateContact(platform, contact) {
    const result = { valid: false, error: '', normalized: contact };
    
    if (!contact || contact.trim().length < 2) {
        result.error = 'Контакт слишком короткий';
        return result;
    }
    
    switch (platform) {
        case 'phone':
            // Телефон ОБЯЗАТЕЛЬНО в международном формате: +XXX...
            // Минимум: + и 10 цифр
            const phoneClean = contact.replace(/[\s\-\(\)]/g, '');
            if (!phoneClean.startsWith('+')) {
                result.error = '📞 Телефон должен начинаться с + (например +380501234567)';
                return result;
            }
            const digitsOnly = phoneClean.replace(/\D/g, '');
            if (digitsOnly.length < 10 || digitsOnly.length > 15) {
                result.error = '📞 Неверный формат телефона (10-15 цифр после +)';
                return result;
            }
            result.normalized = '+' + digitsOnly;
            result.valid = true;
            break;
            
        case 'email':
            // Email: проверка на @
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(contact)) {
                result.error = '📧 Неверный формат email (нужен @)';
                return result;
            }
            result.normalized = contact.toLowerCase();
            result.valid = true;
            break;
            
        case 'telegram':
            // Telegram: @username (минимум 5 символов)
            let tgUsername = contact;
            if (!tgUsername.startsWith('@')) {
                tgUsername = '@' + tgUsername;
            }
            if (tgUsername.length < 6) { // @ + минимум 5 символов
                result.error = '📱 Telegram username слишком короткий (минимум 5 символов)';
                return result;
            }
            // Только латиница, цифры и _
            if (!/^@[a-zA-Z0-9_]+$/.test(tgUsername)) {
                result.error = '📱 Telegram username может содержать только буквы, цифры и _';
                return result;
            }
            result.normalized = tgUsername.toLowerCase();
            result.valid = true;
            break;
            
        case 'instagram':
            // Instagram: @username
            let igUsername = contact;
            if (!igUsername.startsWith('@')) {
                igUsername = '@' + igUsername;
            }
            if (igUsername.length < 2) {
                result.error = '📷 Instagram username слишком короткий';
                return result;
            }
            result.normalized = igUsername.toLowerCase();
            result.valid = true;
            break;
            
        case 'whatsapp':
            // WhatsApp: телефон в международном формате
            const waClean = contact.replace(/[\s\-\(\)]/g, '');
            if (!waClean.startsWith('+')) {
                result.error = '💬 WhatsApp номер должен начинаться с + (например +380501234567)';
                return result;
            }
            const waDigits = waClean.replace(/\D/g, '');
            if (waDigits.length < 10 || waDigits.length > 15) {
                result.error = '💬 Неверный формат WhatsApp (10-15 цифр после +)';
                return result;
            }
            result.normalized = '+' + waDigits;
            result.valid = true;
            break;
            
        case 'viber':
            // Viber: телефон в международном формате
            const vbClean = contact.replace(/[\s\-\(\)]/g, '');
            if (!vbClean.startsWith('+')) {
                result.error = '📞 Viber номер должен начинаться с + (например +380501234567)';
                return result;
            }
            const vbDigits = vbClean.replace(/\D/g, '');
            if (vbDigits.length < 10 || vbDigits.length > 15) {
                result.error = '📞 Неверный формат Viber (10-15 цифр после +)';
                return result;
            }
            result.normalized = '+' + vbDigits;
            result.valid = true;
            break;
            
        case 'facebook':
        case 'tiktok':
        case 'twitter':
            // Соцсети: username или ссылка
            if (contact.length < 2) {
                result.error = 'Username слишком короткий';
                return result;
            }
            // Убираем @ если есть
            result.normalized = contact.startsWith('@') ? contact : contact;
            result.valid = true;
            break;
            
        default:
            // Для других платформ - минимальная проверка
            if (contact.length < 3) {
                result.error = 'Контакт слишком короткий';
                return result;
            }
            result.valid = true;
    }
    
    return result;
}

// Экспорт функции валидации
window.validateContact = validateContact;

// Экспорт новых функций
window.switchContactTab = switchContactTab;
window.showTemplateType = showTemplateType;
window.selectTemplate = selectTemplate;
window.selectInviteMessenger = selectInviteMessenger;
window.copyInviteText = copyInviteText;

async function addContact() {
    console.log('📝 addContact() called');
    
    const name = document.getElementById('contactName')?.value.trim();
    const platform = document.getElementById('contactPlatform')?.value;
    const contact = document.getElementById('contactValue')?.value.trim();
    const pushConsent = document.getElementById('contactPush')?.checked;
    const note = document.getElementById('contactNote')?.value?.trim() || '';
    
    console.log('📋 Contact data:', { name, platform, contact, pushConsent });
    
    if (!name || !contact) {
        showToast('Заполните имя и контакт', 'error');
        return;
    }
    
    // ═══════════════════════════════════════════════════════════
    // ВАЛИДАЦИЯ КОНТАКТА
    // ═══════════════════════════════════════════════════════════
    const validationResult = validateContact(platform, contact);
    if (!validationResult.valid) {
        showToast(validationResult.error, 'error');
        return;
    }
    
    const cgId = window.currentCgId || localStorage.getItem('cardgift_cg_id');
    console.log('👤 Owner CG_ID:', cgId);
    
    if (!cgId) {
        showToast('Ошибка: не найден ID пользователя', 'error');
        return;
    }
    
    // ═══════════════════════════════════════════════════════════
    // ПРОВЕРКА НА ДУБЛИКАТ
    // ═══════════════════════════════════════════════════════════
    const isDuplicate = contacts.some(c => 
        c.contact?.toLowerCase() === contact.toLowerCase() && 
        c.platform === platform
    );
    
    if (isDuplicate) {
        showToast('⚠️ Этот контакт уже есть в базе', 'error');
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
            contact: validationResult.normalized || contact,
            pushConsent,
            note,
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

// ═══════════════════════════════════════════════════════════
// ЭКСПОРТ С ПРЕДУПРЕЖДЕНИЕМ
// ═══════════════════════════════════════════════════════════
function exportContacts() {
    // Показываем модалку с предупреждением
    showExportWarningModal();
}

function showExportWarningModal() {
    // Закрываем предыдущую модалку
    closeModal();
    
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal" style="max-width: 550px;">
            <div class="modal-header" style="background: linear-gradient(45deg, #f44336, #c62828); padding: 20px;">
                <h3 style="color: #fff; margin: 0;">⚠️ ВНИМАНИЕ</h3>
                <button class="modal-close" onclick="closeModal()" style="color: #fff;">✕</button>
            </div>
            <div class="modal-body" style="padding: 25px;">
                <p style="color: #ccc; font-size: 14px; line-height: 1.6; margin-bottom: 20px;">
                    Вы собираете индивидуальную базу контактов, которая принадлежит <strong style="color: #FFD700;">исключительно вам</strong>. 
                    Вы вправе использовать её для личных целей и при необходимости скачать на своё устройство.
                </p>
                
                <div style="background: rgba(244, 67, 54, 0.1); border: 1px solid #f44336; border-radius: 10px; padding: 15px; margin-bottom: 20px;">
                    <p style="color: #f44336; font-weight: bold; margin-bottom: 10px;">❌ ЗАПРЕЩЕНО:</p>
                    <ul style="color: #ccc; font-size: 13px; margin: 0; padding-left: 20px; line-height: 1.8;">
                        <li>передавать базу данных третьим лицам</li>
                        <li>продавать или распространять базу данных полностью или частично</li>
                        <li>использовать базу данных от имени <strong>CardGift</strong>, <strong>GlobalWay</strong> или любых названий и брендов клубной системы</li>
                        <li>представляться официальным представителем клуба при работе с данными</li>
                    </ul>
                </div>
                
                <p style="color: #888; font-size: 12px; margin-bottom: 20px;">
                    ℹ️ Клуб GlobalWay и проект CardGift <strong>никогда</strong> не передают и не продают данные третьим лицам.
                </p>
                
                <label style="display: flex; align-items: flex-start; gap: 12px; cursor: pointer; padding: 15px; background: rgba(255, 215, 0, 0.1); border-radius: 10px; border: 1px solid #444;">
                    <input type="checkbox" id="exportAgreeCheckbox" onchange="toggleExportButton()" 
                           style="width: 22px; height: 22px; margin-top: 2px; cursor: pointer;">
                    <span style="color: #ccc; font-size: 13px; line-height: 1.5;">
                        ☑️ Я ознакомлен с условиями и подтверждаю, что буду использовать базу контактов <strong style="color: #FFD700;">только для личных целей</strong> и не буду передавать её третьим лицам.
                    </span>
                </label>
            </div>
            <div class="modal-footer" style="padding: 20px; display: flex; gap: 15px;">
                <button onclick="closeModal()" 
                        style="flex: 1; padding: 15px; background: #444; color: #fff; border: none; border-radius: 10px; cursor: pointer; font-size: 14px;">
                    Отмена
                </button>
                <button id="exportDownloadBtn" onclick="doExportContacts()" disabled
                        style="flex: 1; padding: 15px; background: #555; color: #888; border: none; border-radius: 10px; cursor: not-allowed; font-size: 14px; font-weight: bold;">
                    📥 Скачать базу данных
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

function toggleExportButton() {
    const checkbox = document.getElementById('exportAgreeCheckbox');
    const btn = document.getElementById('exportDownloadBtn');
    
    if (checkbox && btn) {
        if (checkbox.checked) {
            btn.disabled = false;
            btn.style.background = 'linear-gradient(45deg, #4CAF50, #2E7D32)';
            btn.style.color = '#fff';
            btn.style.cursor = 'pointer';
        } else {
            btn.disabled = true;
            btn.style.background = '#555';
            btn.style.color = '#888';
            btn.style.cursor = 'not-allowed';
        }
    }
}

function doExportContacts() {
    if (contacts.length === 0) {
        showToast('База контактов пуста', 'error');
        return;
    }
    
    const blob = new Blob([JSON.stringify(contacts, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'cardgift_contacts_' + new Date().toISOString().split('T')[0] + '.json';
    a.click();
    
    closeModal();
    showToast('✅ База контактов скачана!', 'success');
}

// Экспорт новых функций
window.showExportWarningModal = showExportWarningModal;
window.toggleExportButton = toggleExportButton;
window.doExportContacts = doExportContacts;

// ═══════════════════════════════════════════════════════════
// ПРАВИЛА ИСПОЛЬЗОВАНИЯ (Terms of Use)
// ═══════════════════════════════════════════════════════════
function showTermsOfUseModal() {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal" style="max-width: 650px; max-height: 90vh;">
            <div class="modal-header" style="background: linear-gradient(45deg, #1a1a2e, #16213e); padding: 20px;">
                <h3 style="color: #FFD700; margin: 0;">📜 Правила использования раздела «Контакты»</h3>
                <button class="modal-close" onclick="closeModal()" style="color: #fff;">✕</button>
            </div>
            <div class="modal-body" style="padding: 25px; max-height: 60vh; overflow-y: auto;">
                
                <div style="margin-bottom: 25px;">
                    <h4 style="color: #FFD700; margin-bottom: 10px;">1. Общие положения</h4>
                    <p style="color: #ccc; font-size: 13px; line-height: 1.7;">
                        Раздел «Контакты» предоставляет Пользователю доступ к персональной базе контактов, 
                        сформированной в результате использования инструментов платформы CardGift / GlobalWay.
                    </p>
                    <p style="color: #888; font-size: 13px; line-height: 1.7; margin-top: 10px;">
                        Все данные, отображаемые в данном разделе:<br>
                        • формируются по инициативе Пользователя;<br>
                        • принадлежат Пользователю;<br>
                        • не передаются Платформой третьим лицам.
                    </p>
                    <p style="color: #4CAF50; font-size: 13px; margin-top: 10px;">
                        ✅ Платформа CardGift / GlobalWay <strong>не осуществляет</strong> продажу, аренду или иную коммерческую передачу пользовательских данных.
                    </p>
                </div>
                
                <div style="margin-bottom: 25px;">
                    <h4 style="color: #FFD700; margin-bottom: 10px;">2. Ответственность Пользователя</h4>
                    <p style="color: #ccc; font-size: 13px; line-height: 1.7;">
                        Пользователь принимает на себя полную и исключительную ответственность за:<br>
                        • хранение и защиту полученных данных;<br>
                        • способы использования базы контактов;<br>
                        • соблюдение применимого законодательства, включая GDPR (EU 2016/679) и нормы конфиденциальности.
                    </p>
                    <p style="color: #f44336; font-size: 13px; margin-top: 10px;">
                        ⚠️ Платформа не несёт ответственности за действия Пользователя за пределами системы.
                    </p>
                </div>
                
                <div style="margin-bottom: 25px; background: rgba(244, 67, 54, 0.1); border: 1px solid #f44336; border-radius: 10px; padding: 15px;">
                    <h4 style="color: #f44336; margin-bottom: 10px;">3. ❌ Ограничения и запреты</h4>
                    <p style="color: #ccc; font-size: 13px; line-height: 1.7;">
                        Пользователю <strong>КАТЕГОРИЧЕСКИ ЗАПРЕЩАЕТСЯ</strong>:<br><br>
                        • передавать, продавать, лицензировать или распространять базу данных третьим лицам;<br>
                        • использовать контакты в целях, нарушающих права субъектов данных;<br>
                        • осуществлять коммуникацию от имени или с использованием брендов GlobalWay, CardGift;<br>
                        • представляться официальным партнёром или сотрудником Платформы без письменного разрешения;<br>
                        • использовать фирменные наименования, логотипы или идентификаторы проекта в личной коммуникации.
                    </p>
                </div>
                
                <div style="margin-bottom: 25px;">
                    <h4 style="color: #FFD700; margin-bottom: 10px;">4. Право Платформы</h4>
                    <p style="color: #ccc; font-size: 13px; line-height: 1.7;">
                        В случае выявления нарушений Платформа оставляет за собой право:<br>
                        • ограничить или приостановить доступ Пользователя к инструментам;<br>
                        • заблокировать функционал без компенсации;<br>
                        • передать информацию компетентным органам в случаях, предусмотренных законом.
                    </p>
                </div>
                
                <div style="margin-bottom: 25px;">
                    <h4 style="color: #FFD700; margin-bottom: 10px;">5. Скачивание данных</h4>
                    <p style="color: #ccc; font-size: 13px; line-height: 1.7;">
                        Скачивание базы контактов допускается исключительно для <strong>личного использования</strong> Пользователя.
                        Перед каждой загрузкой Пользователь обязан подтвердить согласие с условиями.
                    </p>
                </div>
                
                <div style="margin-bottom: 15px;">
                    <h4 style="color: #FFD700; margin-bottom: 10px;">6. Отсутствие агентских отношений</h4>
                    <p style="color: #ccc; font-size: 13px; line-height: 1.7;">
                        Использование инструментов платформы <strong>не создаёт</strong> агентских, представительских, партнёрских 
                        или иных юридических отношений между Пользователем и Платформой.
                    </p>
                </div>
                
            </div>
            <div class="modal-footer" style="padding: 20px; background: rgba(255, 215, 0, 0.1); border-top: 1px solid #333;">
                <p style="color: #888; font-size: 12px; text-align: center; margin-bottom: 15px;">
                    📌 Продолжая использование раздела «Контакты», Пользователь подтверждает, что ознакомлен с настоящими условиями и принимает их в полном объёме.
                </p>
                <button onclick="closeModal()" 
                        style="width: 100%; padding: 15px; background: linear-gradient(45deg, #FFD700, #FFA500); color: #000; border: none; border-radius: 10px; font-size: 16px; font-weight: bold; cursor: pointer;">
                    ✅ Понятно
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

window.showTermsOfUseModal = showTermsOfUseModal;

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

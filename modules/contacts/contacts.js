/* =====================================================
   CARDGIFT - CONTACTS MODULE v9.0
   - Шаблоны приглашений
   - Валидация контактов (международный формат)
   - Предупреждение при скачивании
   - Terms of Use модалка
   - Защита от дубликатов
   - Исправлено редактирование с заметками
   - Исправлено удаление контактов
   - Расширен чат для всех платформ
   - Модалки с !important для display
   - Собственная функция closeContactsModal()
   - Закрытие по клику на фон
   
   Зависимости:
   - window.ContactsService (contacts-service.js)
   - window.SupabaseClient (supabase.js)
   - window.escapeHtml (common.js)
   - window.showToast (common.js)
   
   Глобальные переменные (из dashboard.js):
   - contacts (массив)
   - walletAddress
   - walletConnected
   ===================================================== */

console.log('📋 Contacts Module v13.0 - Web share URLs');

// ═══════════════════════════════════════════════════════════
// СОБСТВЕННАЯ ФУНКЦИЯ ЗАКРЫТИЯ МОДАЛОК
// ═══════════════════════════════════════════════════════════
function closeContactsModal() {
    console.log('🔴 closeContactsModal() called');
    // Удаляем все модалки с классом modal-overlay
    const overlays = document.querySelectorAll('.modal-overlay');
    overlays.forEach(overlay => {
        console.log('🔴 Removing overlay:', overlay);
        overlay.remove();
    });
}

// Переопределяем глобальный closeModal для contacts
window.closeContactsModal = closeContactsModal;

// Функция для добавления закрытия по клику на фон
function addOverlayClickClose(modal) {
    modal.addEventListener('click', function(e) {
        // Закрываем только если кликнули на сам overlay, а не на содержимое
        if (e.target === modal) {
            console.log('🔴 Clicked on overlay background');
            closeContactsModal();
        }
    });
}

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
    console.log('📋 LOADING CONTACTS v13.0');
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
// ═══════════════════════════════════════════════════════════
// ШАБЛОНЫ ПРИГЛАШЕНИЙ v2.0 - Красивые и по этапам
// ═══════════════════════════════════════════════════════════

const inviteTemplates = {
    // 🎯 ПЕРВОЕ КАСАНИЕ - первое сообщение человеку
    initial: [
        {
            id: 'gift',
            title: '🎁 Подарок',
            subtitle: 'Интрига + ценность',
            preview: '🎁',
            aiPrompt: 'Golden gift box with ribbon, sparkling, dark background',
            text: `Привет! 👋

У меня для тебя кое-что интересное.

Нашёл Академию где:
🎓 Обучение на $1700 — БЕСПЛАТНО
💰 За обучение ПЛАТЯТ — $1000 за 21 день
🚀 Старт всего $22 (один раз)

Инструменты внутри:
• AI-генератор контента
• Система для продаж и контактов
• Вирусный маркетинг

Гарантия: не заработаешь $1000 — вернут $22 + инструменты в подарок!

Интересно узнать подробнее?`
        },
        {
            id: 'question',
            title: '🤔 Вопрос',
            subtitle: 'Заставляет задуматься',
            preview: '🤔',
            aiPrompt: 'Person thinking with question marks, lightbulb moment, inspirational',
            text: `Привет! 👋

Вот интересный вопрос: а что если через 21 день тебе заплатят $1000 за то, что ты учишься?

Даже если сейчас:
• нет опыта
• нет времени  
• нет идей что делать

Нашёл Академию где:
✅ Обучение на $1700 — бесплатно
✅ За обучение платят $1000
✅ Старт всего $22

И гарантия возврата если не получится!

Хочешь покажу как это работает?`
        },
        {
            id: 'personal',
            title: '💬 Личное',
            subtitle: 'Для друзей и знакомых',
            preview: '💬',
            aiPrompt: 'Two friends talking, coffee shop, warm atmosphere, friendly',
            text: `Привет! 👋

Давно хотел поделиться...

Нашёл кое-что реально крутое — Академию где ПЛАТЯТ за обучение!

Представь:
• Обучение стоимостью $1700 — бесплатно
• За 21 день выполнения заданий — платят $1000
• Старт всего $22

Через 90 дней реально выйти на $100K!

Есть гарантия: не заработаешь — вернут деньги + инструменты останутся.

Я уже внутри. Хочу показать тебе!`
        },
        {
            id: 'business',
            title: '💼 Деловой',
            subtitle: 'Для бизнес-контактов',
            preview: '💼',
            aiPrompt: 'Business tools, laptop, growth charts, professional',
            text: `Добрый день!

Хочу поделиться находкой которая может быть интересна.

Обнаружил Академию цифрового бизнеса:
• Обучение на $1700 — бесплатно
• Оплата за обучение — $1000 за 21 день
• Инвестиция всего $22 (0.0225 opBNB)

Инструменты:
• AI-генерация контента
• CRM и автоматизация
• Вирусный маркетинг
• Партнёрская программа

Цель: $100K за 90 дней.

Если интересно — могу показать подробнее.`
        },
        {
            id: 'short',
            title: '⚡ Короткий',
            subtitle: 'Для занятых людей',
            preview: '⚡',
            aiPrompt: 'Lightning bolt, speed, efficiency, bright yellow',
            text: `Привет! 👋

Коротко: нашёл Академию где платят $1000 за 21 день обучения.

Старт $22. Гарантия возврата.

Есть 2 минуты посмотреть?`
        }
    ],
    
    // ✅ ПОСЛЕ СОГЛАСИЯ - человек заинтересовался
    followup: [
        {
            id: 'details',
            title: '📋 Подробности',
            subtitle: 'Объясняем что внутри',
            preview: '📋',
            text: `Супер! Рад что откликнулось 🙂

Вот что ты получаешь:

🎓 Академия CardGift ($1700 ценности):
• AI Studio — тексты, картинки, голос
• Генератор открыток — вирусный контент
• CRM — управление контактами
• Система опросов — сбор лидов

💰 За обучение ПЛАТЯТ:
• 21 день заданий = $1000 минимум
• 90 дней = путь к $100K
• 1 год = пенсия 10 BNB

🛡️ Гарантия:
Не заработаешь $1000 за 21 день — вернут $22 + инструменты останутся!

Готов начать? Старт всего $22 (0.0225 opBNB) 👇`
        },
        {
            id: 'simple',
            title: '🎯 Просто о главном',
            subtitle: 'Без воды',
            preview: '🎯',
            text: `Отлично! 👍

Если коротко:
1. Регистрация — 2 минуты
2. Активация — $22 (0.0225 opBNB, один раз)
3. Получаешь инструменты на $1700
4. 21 день обучения с оплатой $1000
5. Гарантия: не заработаешь — вернём деньги

Никаких подписок, скрытых платежей.
Инструменты остаются навсегда.

Отправить ссылку для регистрации?`
        },
        {
            id: 'video',
            title: '🎬 Видео-объяснение',
            subtitle: 'Лучше один раз увидеть',
            preview: '🎬',
            text: `Круто что заинтересовало! 🔥

Записал короткое видео (3 мин) где показываю:
• Как выглядит Академия внутри
• Какие инструменты на $1700 получаешь
• Как платят $1000 за обучение
• Как работает партнёрка

Посмотри и напиши что думаешь 👇

[ССЫЛКА НА ВИДЕО]`
        }
    ],
    
    // 🤔 ЕСЛИ МОЛЧИТ - человек не отвечает
    reminder: [
        {
            id: 'soft',
            title: '😊 Мягкое напоминание',
            subtitle: 'Без давления',
            preview: '😊',
            text: `Привет! 👋

Писал тебе про Академию где платят за обучение — может пропустил сообщение?

Если сейчас не актуально — ничего страшного, просто скажи.
Если интересно — с удовольствием расскажу подробнее 🙂`
        },
        {
            id: 'value',
            title: '💎 Напоминание с ценностью',
            subtitle: 'Добавляем пользу',
            preview: '💎',
            text: `Привет! 👋

Кстати, пока ты думаешь — вот факт:

Те кто прошёл 21-дневную программу:
• День 7 — первые инструменты освоены
• День 14 — первые результаты
• День 21 — получают $1000+ за обучение

И гарантия: не получится — вернут $22 + инструменты на $1700 в подарок!

Что скажешь, попробуем? 🚀`
        },
        {
            id: 'question2',
            title: '❓ Вопрос',
            subtitle: 'Вовлекаем в диалог',
            preview: '❓',
            text: `Привет! 👋

Хотел спросить — ты вообще рассматриваешь тему дополнительного заработка?

Если да — есть Академия где платят $1000 за 21 день обучения. Старт $22.

Если нет — тоже ок, просто хочу понять чтобы не надоедать 🙂`
        }
    ],
    
    // 💔 ЕСЛИ ОТКАЗАЛ - мягкий возврат через время
    rejected: [
        {
            id: 'respect',
            title: '🤝 С уважением',
            subtitle: 'Оставляем дверь открытой',
            preview: '🤝',
            text: `Привет! 👋

Помню что раньше не зашла тема — всё ок, без проблем.

Просто хотел сказать: если что-то изменится или захочешь попробовать — я здесь.

В Академии сейчас платят $1000 за 21 день обучения. Старт всего $22.

Всегда рад помочь разобраться! 🙂`
        },
        {
            id: 'news',
            title: '📰 Новости проекта',
            subtitle: 'Что нового',
            preview: '📰',
            text: `Привет! 👋

Давно не писал. У нас тут крутые обновления:
• Академия с обучением на $1700 — бесплатно
• За 21 день заданий платят $1000
• Гарантия возврата $22 если не получится

Если станет интересно — дай знать!
Всегда рад показать что нового 🚀`
        }
    ],
    
    // 🔥 ГОРЯЧЕЕ ПРЕДЛОЖЕНИЕ - ограниченное время
    hot: [
        {
            id: 'limited',
            title: '⏰ Ограниченное предложение',
            subtitle: 'Срочность',
            preview: '⏰',
            text: `Привет! 👋

Быстрое сообщение — сейчас есть особое предложение:

🔥 Старт в Академии:
• Обучение на $1700 — бесплатно
• За 21 день платят $1000
• Инвестиция всего $22

🛡️ Гарантия: не заработаешь — вернём деньги + инструменты в подарок!

Если думал попробовать — сейчас лучший момент!

Готов? 🚀`
        }
    ]
};

// Категории для отображения
const inviteCategories = {
    initial: { name: '🎯 Первое касание', desc: 'Первое сообщение человеку' },
    followup: { name: '✅ После согласия', desc: 'Когда заинтересовался' },
    reminder: { name: '🔔 Напоминание', desc: 'Если не отвечает' },
    rejected: { name: '💔 Возврат', desc: 'Если отказал раньше' },
    hot: { name: '🔥 Горячее', desc: 'Срочные предложения' }
};

function showAddContactModal() {
    console.log('🔵 showAddContactModal() CALLED');
    if (!walletConnected) {
        showToast('Сначала подключите кошелек', 'error');
        return;
    }
    
    console.log('🔵 Creating modal...');
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.id = 'addContactModal';
    modal.style.cssText = 'display: flex !important; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.9); align-items: center; justify-content: center; z-index: 10000; padding: 15px;';
    
    modal.innerHTML = `
        <div class="modal" style="display: block !important; max-width: 700px; width: 100%; max-height: 95vh; overflow-y: auto; background: linear-gradient(145deg, #1a1a2e, #16213e); border-radius: 20px; box-shadow: 0 25px 80px rgba(0,0,0,0.6); border: 1px solid rgba(255,215,0,0.2);">
            
            <!-- Header -->
            <div class="modal-header" style="padding: 20px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,215,0,0.2); background: rgba(255,215,0,0.05);">
                <div>
                    <h3 style="color: #FFD700; margin: 0; font-size: 20px;">📨 Пригласить человека</h3>
                    <p style="color: #888; margin: 5px 0 0 0; font-size: 12px;">Выбери шаблон → Отредактируй → Отправь</p>
                </div>
                <div style="display: flex; gap: 10px; align-items: center;">
                    <button onclick="showInviteGuide()" style="background: rgba(255,215,0,0.1); border: 1px solid rgba(255,215,0,0.3); color: #FFD700; padding: 8px 12px; border-radius: 8px; cursor: pointer; font-size: 12px;">
                        📋 Инструкция
                    </button>
                    <button class="modal-close" onclick="closeContactsModal()" style="color: #fff; background: rgba(255,255,255,0.1); border: none; width: 36px; height: 36px; border-radius: 50%; font-size: 18px; cursor: pointer;">✕</button>
                </div>
            </div>
            
            <!-- Вкладки -->
            <div style="display: flex; border-bottom: 1px solid #333;">
                <button id="tabInvite" onclick="switchContactTab('invite')" 
                        style="flex: 1; padding: 14px; background: linear-gradient(135deg, rgba(255,215,0,0.2), rgba(255,165,0,0.1)); color: #FFD700; border: none; font-weight: bold; cursor: pointer; font-size: 14px; border-bottom: 2px solid #FFD700;">
                    📨 Пригласить
                </button>
                <button id="tabManual" onclick="switchContactTab('manual')" 
                        style="flex: 1; padding: 14px; background: transparent; color: #666; border: none; cursor: pointer; font-size: 14px; border-bottom: 2px solid transparent;">
                    ✏️ Добавить вручную
                </button>
            </div>
            
            <!-- Вкладка: Пригласить -->
            <div id="inviteTab" class="modal-body" style="padding: 20px;">
                
                <!-- Шаг 1: Этап воронки -->
                <div style="margin-bottom: 20px;">
                    <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 12px;">
                        <span style="background: linear-gradient(135deg, #FFD700, #FFA500); color: #000; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 14px;">1</span>
                        <span style="color: #FFD700; font-weight: bold; font-size: 14px;">Выбери этап</span>
                        <span style="color: #666; font-size: 12px;">— на каком шаге этот человек?</span>
                    </div>
                    
                    <div id="categoryTabs" style="display: flex; gap: 6px; flex-wrap: wrap;">
                        <button class="cat-btn active" data-cat="initial" onclick="switchInviteCategory('initial')" style="padding: 10px 16px; border-radius: 20px; border: 1px solid #FFD700; background: rgba(255,215,0,0.2); color: #FFD700; cursor: pointer; font-size: 12px; font-weight: 500; transition: all 0.2s;">
                            🎯 Первое касание
                        </button>
                        <button class="cat-btn" data-cat="followup" onclick="switchInviteCategory('followup')" style="padding: 10px 16px; border-radius: 20px; border: 1px solid #444; background: transparent; color: #888; cursor: pointer; font-size: 12px; transition: all 0.2s;">
                            ✅ После согласия
                        </button>
                        <button class="cat-btn" data-cat="reminder" onclick="switchInviteCategory('reminder')" style="padding: 10px 16px; border-radius: 20px; border: 1px solid #444; background: transparent; color: #888; cursor: pointer; font-size: 12px; transition: all 0.2s;">
                            🔔 Напоминание
                        </button>
                        <button class="cat-btn" data-cat="rejected" onclick="switchInviteCategory('rejected')" style="padding: 10px 16px; border-radius: 20px; border: 1px solid #444; background: transparent; color: #888; cursor: pointer; font-size: 12px; transition: all 0.2s;">
                            💔 Возврат
                        </button>
                        <button class="cat-btn" data-cat="hot" onclick="switchInviteCategory('hot')" style="padding: 10px 16px; border-radius: 20px; border: 1px solid #444; background: transparent; color: #888; cursor: pointer; font-size: 12px; transition: all 0.2s;">
                            🔥 Горячее
                        </button>
                    </div>
                </div>
                
                <!-- Шаг 2: Выбор шаблона (карточки) -->
                <div style="margin-bottom: 20px;">
                    <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 12px;">
                        <span style="background: linear-gradient(135deg, #FFD700, #FFA500); color: #000; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 14px;">2</span>
                        <span style="color: #FFD700; font-weight: bold; font-size: 14px;">Выбери стиль сообщения</span>
                    </div>
                    
                    <div id="templatesGrid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 10px; max-height: 200px; overflow-y: auto; padding: 5px;">
                        ${renderInviteCards('initial')}
                    </div>
                </div>
                
                <!-- Шаг 3: Текст -->
                <div style="margin-bottom: 20px;">
                    <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 12px;">
                        <span style="background: linear-gradient(135deg, #FFD700, #FFA500); color: #000; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 14px;">3</span>
                        <span style="color: #FFD700; font-weight: bold; font-size: 14px;">Проверь и отредактируй</span>
                    </div>
                    
                    <!-- Превью как в мессенджере -->
                    <div style="background: #e5ddd5; border-radius: 12px; padding: 15px; margin-bottom: 10px;">
                        <div style="background: #dcf8c6; border-radius: 8px; padding: 12px; max-width: 90%; margin-left: auto; box-shadow: 0 1px 2px rgba(0,0,0,0.1);">
                            <div id="messagePreview" style="color: #111; font-size: 14px; line-height: 1.5; white-space: pre-wrap;">${inviteTemplates.initial[0].text}</div>
                            <div style="text-align: right; color: #888; font-size: 11px; margin-top: 5px;">✓✓</div>
                        </div>
                    </div>
                    
                    <textarea id="inviteText" rows="5" 
                              style="width: 100%; background: #0d1b2a; border: 1px solid #333; border-radius: 10px; color: #fff; padding: 12px; font-size: 13px; resize: vertical; line-height: 1.5;"
                              oninput="updateMessagePreview()"
                              placeholder="Выберите шаблон выше...">${inviteTemplates.initial[0].text}</textarea>
                    
                    <div style="display: flex; gap: 8px; margin-top: 8px; flex-wrap: wrap;">
                        <button onclick="addLinkToMessage()" style="padding: 8px 12px; background: rgba(255,215,0,0.1); border: 1px solid rgba(255,215,0,0.3); color: #FFD700; border-radius: 6px; cursor: pointer; font-size: 11px;">
                            🔗 + Ссылка на генератор
                        </button>
                        <button onclick="addEmojiToMessage()" style="padding: 8px 12px; background: rgba(255,255,255,0.05); border: 1px solid #333; color: #888; border-radius: 6px; cursor: pointer; font-size: 11px;">
                            😊 + Эмодзи
                        </button>
                    </div>
                </div>
                
                <!-- Шаг 4: Отправка -->
                <div>
                    <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 12px;">
                        <span style="background: linear-gradient(135deg, #FFD700, #FFA500); color: #000; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 14px;">4</span>
                        <span style="color: #FFD700; font-weight: bold; font-size: 14px;">Отправь в мессенджер</span>
                    </div>
                    
                    <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px;">
                        <button onclick="sendToMessenger('telegram')" class="messenger-btn" style="background: linear-gradient(135deg, #0088cc, #0077b5); color: #fff; border: none; padding: 14px 8px; border-radius: 12px; cursor: pointer; display: flex; flex-direction: column; align-items: center; gap: 4px; transition: transform 0.2s;">
                            <span style="font-size: 24px;">✈️</span>
                            <span style="font-size: 11px; font-weight: 500;">Telegram</span>
                        </button>
                        <button onclick="sendToMessenger('whatsapp')" class="messenger-btn" style="background: linear-gradient(135deg, #25D366, #128C7E); color: #fff; border: none; padding: 14px 8px; border-radius: 12px; cursor: pointer; display: flex; flex-direction: column; align-items: center; gap: 4px; transition: transform 0.2s;">
                            <span style="font-size: 24px;">💬</span>
                            <span style="font-size: 11px; font-weight: 500;">WhatsApp</span>
                        </button>
                        <button onclick="sendToMessenger('viber')" class="messenger-btn" style="background: linear-gradient(135deg, #7360F2, #665CAC); color: #fff; border: none; padding: 14px 8px; border-radius: 12px; cursor: pointer; display: flex; flex-direction: column; align-items: center; gap: 4px; transition: transform 0.2s;">
                            <span style="font-size: 24px;">📞</span>
                            <span style="font-size: 11px; font-weight: 500;">Viber</span>
                        </button>
                        <button onclick="copyInviteText()" class="messenger-btn" style="background: linear-gradient(135deg, #FFD700, #FFA500); color: #000; border: none; padding: 14px 8px; border-radius: 12px; cursor: pointer; display: flex; flex-direction: column; align-items: center; gap: 4px; transition: transform 0.2s; font-weight: bold;">
                            <span style="font-size: 24px;">📋</span>
                            <span style="font-size: 11px; font-weight: 600;">Копировать</span>
                        </button>
                    </div>
                    
                    <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-top: 8px;">
                        <button onclick="sendToMessenger('instagram')" class="messenger-btn" style="background: linear-gradient(45deg, #f09433, #e6683c, #dc2743, #bc1888); color: #fff; border: none; padding: 12px 8px; border-radius: 12px; cursor: pointer; display: flex; flex-direction: column; align-items: center; gap: 4px;">
                            <span style="font-size: 20px;">📷</span>
                            <span style="font-size: 10px;">Instagram</span>
                        </button>
                        <button onclick="sendToMessenger('facebook')" class="messenger-btn" style="background: #1877F2; color: #fff; border: none; padding: 12px 8px; border-radius: 12px; cursor: pointer; display: flex; flex-direction: column; align-items: center; gap: 4px;">
                            <span style="font-size: 20px;">📘</span>
                            <span style="font-size: 10px;">Facebook</span>
                        </button>
                        <button onclick="sendToMessenger('email')" class="messenger-btn" style="background: #EA4335; color: #fff; border: none; padding: 12px 8px; border-radius: 12px; cursor: pointer; display: flex; flex-direction: column; align-items: center; gap: 4px;">
                            <span style="font-size: 20px;">📧</span>
                            <span style="font-size: 10px;">Email</span>
                        </button>
                        <button onclick="sendToMessenger('sms')" class="messenger-btn" style="background: #333; color: #fff; border: 1px solid #444; padding: 12px 8px; border-radius: 12px; cursor: pointer; display: flex; flex-direction: column; align-items: center; gap: 4px;">
                            <span style="font-size: 20px;">💌</span>
                            <span style="font-size: 10px;">SMS</span>
                        </button>
                    </div>
                </div>
                
                <!-- Подсказка -->
                <div style="margin-top: 15px; padding: 12px; background: rgba(16,185,129,0.1); border: 1px solid rgba(16,185,129,0.3); border-radius: 10px;">
                    <p style="color: #10B981; font-size: 12px; margin: 0;">
                        💡 <strong>Совет:</strong> Для лучшего эффекта сначала отправь открытку через Генератор, а потом это сообщение. Человек получит красивую картинку + текст!
                    </p>
                </div>
            </div>
            
            <!-- Вкладка: Добавить вручную -->
            <div id="manualTab" class="modal-body" style="display: none; padding: 20px;">
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
                    <button class="btn btn-gray" onclick="closeContactsModal()" style="flex: 1; padding: 12px; background: #444; color: #fff; border: none; border-radius: 8px; cursor: pointer;">
                        Отмена
                    </button>
                    <button class="btn btn-green" onclick="addContact()" style="flex: 1; padding: 12px; background: linear-gradient(45deg, #4CAF50, #2E7D32); color: #fff; border: none; border-radius: 8px; cursor: pointer; font-weight: bold;">
                        ➕ Добавить
                    </button>
                </div>
            </div>
        </div>
    `;
    addOverlayClickClose(modal);
    document.body.appendChild(modal);
    
    // Добавляем стили для выбранного мессенджера
    const style = document.createElement('style');
    style.textContent = `
        .messenger-btn.selected {
            box-shadow: 0 0 0 3px #FFD700 !important;
            transform: scale(1.05);
        }
        .messenger-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
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
        
        /* Новые стили для карточек v2.0 */
        .invite-card {
            background: rgba(255,255,255,0.03);
            border: 2px solid #333;
            border-radius: 12px;
            padding: 15px 10px;
            text-align: center;
            cursor: pointer;
            transition: all 0.25s ease;
        }
        .invite-card:hover {
            border-color: #FFD700;
            background: rgba(255,215,0,0.1);
            transform: translateY(-3px);
        }
        .invite-card.selected {
            border-color: #FFD700;
            background: rgba(255,215,0,0.15);
            box-shadow: 0 0 20px rgba(255,215,0,0.2);
        }
        .card-preview {
            font-size: 32px;
            margin-bottom: 8px;
        }
        .card-title {
            font-size: 12px;
            font-weight: 600;
            color: #fff;
            margin-bottom: 3px;
        }
        .card-subtitle {
            font-size: 10px;
            color: #888;
        }
        
        .cat-btn {
            transition: all 0.2s ease;
        }
        .cat-btn:hover {
            border-color: #FFD700 !important;
            color: #FFD700 !important;
        }
        .cat-btn.active {
            background: rgba(255,215,0,0.2) !important;
            border-color: #FFD700 !important;
            color: #FFD700 !important;
        }
        
        /* Анимация для превью */
        #messagePreview {
            transition: all 0.3s ease;
        }
        
        /* Скроллбар для карточек */
        #templatesGrid::-webkit-scrollbar {
            width: 6px;
        }
        #templatesGrid::-webkit-scrollbar-track {
            background: rgba(255,255,255,0.05);
            border-radius: 3px;
        }
        #templatesGrid::-webkit-scrollbar-thumb {
            background: rgba(255,215,0,0.3);
            border-radius: 3px;
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

// ═══════════════════════════════════════════════════════════
// НОВЫЕ ФУНКЦИИ v2.0 - Красивые карточки
// ═══════════════════════════════════════════════════════════

// Рендер карточек шаблонов
function renderInviteCards(category) {
    const templates = inviteTemplates[category] || [];
    return templates.map((t, i) => `
        <div class="invite-card ${i === 0 ? 'selected' : ''}" 
             onclick="selectInviteCard('${category}', ${i})" 
             data-index="${i}"
             style="background: ${i === 0 ? 'rgba(255,215,0,0.15)' : 'rgba(255,255,255,0.03)'}; border: 2px solid ${i === 0 ? '#FFD700' : '#333'}; border-radius: 12px; padding: 15px 10px; text-align: center; cursor: pointer; transition: all 0.25s ease;">
            <div class="card-preview" style="font-size: 32px; margin-bottom: 8px;">${t.preview || '📝'}</div>
            <div class="card-title" style="font-size: 12px; font-weight: 600; color: #fff; margin-bottom: 3px;">${t.title}</div>
            <div class="card-subtitle" style="font-size: 10px; color: #888;">${t.subtitle || ''}</div>
        </div>
    `).join('');
}

// Переключение категории
function switchInviteCategory(category) {
    // Обновляем кнопки категорий
    document.querySelectorAll('.cat-btn').forEach(btn => {
        if (btn.dataset.cat === category) {
            btn.style.background = 'rgba(255,215,0,0.2)';
            btn.style.borderColor = '#FFD700';
            btn.style.color = '#FFD700';
            btn.classList.add('active');
        } else {
            btn.style.background = 'transparent';
            btn.style.borderColor = '#444';
            btn.style.color = '#888';
            btn.classList.remove('active');
        }
    });
    
    // Обновляем карточки
    const grid = document.getElementById('templatesGrid');
    if (grid) {
        grid.innerHTML = renderInviteCards(category);
        // Выбираем первый шаблон
        selectInviteCard(category, 0);
    }
}

// Выбор карточки
function selectInviteCard(category, index) {
    const templates = inviteTemplates[category] || [];
    const template = templates[index];
    
    if (template) {
        // Обновляем текст
        const textarea = document.getElementById('inviteText');
        if (textarea) {
            textarea.value = template.text;
            updateMessagePreview();
        }
        
        // Подсвечиваем выбранную карточку
        document.querySelectorAll('.invite-card').forEach((card, i) => {
            if (i === index) {
                card.classList.add('selected');
                card.style.borderColor = '#FFD700';
                card.style.background = 'rgba(255,215,0,0.15)';
            } else {
                card.classList.remove('selected');
                card.style.borderColor = '#333';
                card.style.background = 'rgba(255,255,255,0.03)';
            }
        });
    }
}

// Обновление превью сообщения
function updateMessagePreview() {
    const textarea = document.getElementById('inviteText');
    const preview = document.getElementById('messagePreview');
    if (textarea && preview) {
        preview.textContent = textarea.value;
    }
}

// Добавить ссылку на генератор (бесплатный доступ)
function addLinkToMessage() {
    const textarea = document.getElementById('inviteText');
    if (textarea) {
        const userId = window.currentDisplayId || window.currentGwId || 'XXXXXXX';
        // Правильная ссылка на генератор
        const baseUrl = window.location.hostname === 'localhost' 
            ? 'http://localhost:3000' 
            : 'https://cgm-brown.vercel.app';
        
        const linkText = `\n\n🎁 Дарю тебе бесплатный доступ — посмотри и попробуй как работает:\n👉 ${baseUrl}/generator.html?ref=${userId}`;
        textarea.value += linkText;
        updateMessagePreview();
        showToast('Ссылка на генератор добавлена!', 'success');
    }
}

// Добавить ссылку на готовую открытку от клуба
function addClubCardLink() {
    // Показываем модалку с выбором корпоративных открыток
    showClubCardsModal();
}

// Модалка выбора корпоративных открыток
async function showClubCardsModal() {
    const modal = document.createElement('div');
    modal.id = 'clubCardsModal';
    modal.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.95); z-index: 10002; display: flex; align-items: center; justify-content: center; padding: 15px; overflow-y: auto;';
    modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
    
    modal.innerHTML = `
        <div style="max-width: 700px; width: 100%; max-height: 90vh; overflow-y: auto; background: linear-gradient(145deg, #1a1a2e, #16213e); border-radius: 20px; border: 2px solid #10B981;">
            <div style="padding: 20px; border-bottom: 1px solid rgba(16,185,129,0.3); display: flex; justify-content: space-between; align-items: center;">
                <h3 style="color: #10B981; margin: 0; font-size: 20px;">🏢 Корпоративные открытки</h3>
                <button onclick="this.closest('#clubCardsModal').remove()" style="background: rgba(255,255,255,0.1); border: none; color: #fff; width: 36px; height: 36px; border-radius: 50%; cursor: pointer; font-size: 18px;">✕</button>
            </div>
            
            <div style="padding: 15px 20px; background: rgba(16,185,129,0.1); border-bottom: 1px solid rgba(16,185,129,0.2);">
                <p style="color: #aaa; margin: 0; font-size: 13px;">📋 Выберите открытку — ссылка на неё (с ВАШИМ ID!) добавится в сообщение</p>
            </div>
            
            <div id="clubCardsGrid" style="padding: 20px; display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 15px; min-height: 200px;">
                <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: #888;">
                    <div style="font-size: 36px; margin-bottom: 15px;">⏳</div>
                    <div>Загрузка открыток...</div>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Загружаем корпоративные открытки
    await loadClubCards();
}

// Загрузка корпоративных открыток
async function loadClubCards() {
    const grid = document.getElementById('clubCardsGrid');
    if (!grid) return;
    
    let cards = [];
    
    try {
        // Способ 1: Из Supabase - таблица cards с флагом is_corporate
        if (window.SupabaseClient && SupabaseClient.client) {
            const { data, error } = await SupabaseClient.client
                .from('cards')
                .select('*')
                .or('card_data->>isCorporate.eq.true,card_data->>is_corporate.eq.true')
                .order('created_at', { ascending: false })
                .limit(20);
            
            if (!error && data && data.length > 0) {
                cards = data.map(c => ({
                    code: c.short_code,
                    title: c.card_data?.title || c.card_data?.greetingText?.substring(0, 30) || 'Корпоративная открытка',
                    image: c.card_data?.image_url || c.card_data?.mediaUrl || c.card_data?.media?.url,
                    card_data: c.card_data
                }));
                console.log('✅ Loaded', cards.length, 'corporate cards from Supabase');
            }
        }
        
        // Способ 2: Из localStorage
        if (cards.length === 0) {
            const archiveCards = JSON.parse(localStorage.getItem('cardgift_cards') || '[]');
            cards = archiveCards.filter(c => c.isCorporate || c.is_corporate).map(c => ({
                code: c.shortCode || c.short_code,
                title: c.title || c.greetingText?.substring(0, 30) || 'Корпоративная открытка',
                image: c.mediaUrl || c.preview || c.imageUrl,
                card_data: c
            }));
        }
        
    } catch (err) {
        console.error('Error loading club cards:', err);
    }
    
    // Отображаем
    if (cards.length === 0) {
        grid.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: #888;">
                <div style="font-size: 50px; margin-bottom: 15px;">📭</div>
                <p style="margin: 0 0 10px 0;">Корпоративных открыток пока нет</p>
                <p style="font-size: 12px; color: #666;">Создайте открытку в Генераторе и отметьте как "Корпоративная"</p>
            </div>
        `;
        return;
    }
    
    const userId = window.currentDisplayId || window.currentGwId || 'XXXXXXX';
    const baseUrl = window.location.hostname === 'localhost' 
        ? 'http://localhost:3000' 
        : 'https://cgm-brown.vercel.app';
    
    grid.innerHTML = cards.map(card => `
        <div class="club-card-item" onclick="insertClubCardLink('${card.code}', '${card.title.replace(/'/g, "\\'")}', '${baseUrl}')" 
             style="background: rgba(255,255,255,0.03); border: 2px solid #333; border-radius: 12px; overflow: hidden; cursor: pointer; transition: all 0.3s;">
            <div style="aspect-ratio: 3/4; background: #0d1b2a; display: flex; align-items: center; justify-content: center; overflow: hidden;">
                ${card.image 
                    ? `<img src="${card.image}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.parentElement.innerHTML='<div style=\\'font-size:50px;\\'>🎁</div>'">` 
                    : '<div style="font-size: 50px;">🎁</div>'}
            </div>
            <div style="padding: 12px;">
                <div style="font-size: 13px; font-weight: 600; color: #fff; margin-bottom: 8px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${card.title}</div>
                <button style="width: 100%; padding: 10px; background: linear-gradient(135deg, #10B981, #059669); border: none; border-radius: 8px; color: #fff; font-weight: bold; cursor: pointer; font-size: 12px;">
                    ✨ Выбрать
                </button>
            </div>
        </div>
    `).join('');
    
    // Добавляем hover эффект
    document.querySelectorAll('.club-card-item').forEach(item => {
        item.onmouseenter = () => { item.style.borderColor = '#10B981'; item.style.transform = 'translateY(-3px)'; };
        item.onmouseleave = () => { item.style.borderColor = '#333'; item.style.transform = 'none'; };
    });
}

// Вставить ссылку на выбранную открытку
function insertClubCardLink(cardCode, cardTitle, baseUrl) {
    const textarea = document.getElementById('inviteText');
    const userId = window.currentDisplayId || window.currentGwId || 'XXXXXXX';
    
    if (textarea) {
        // Ссылка на генератор с автооткрытием выбора шаблонов
        const linkText = `\n\n🎁 Специально для тебя — выбери открытку с подарком:\n👉 ${baseUrl}/generator.html?ref=${userId}&templates=corporate`;
        textarea.value += linkText;
        updateMessagePreview();
        showToast && showToast('Ссылка добавлена!', 'success');
    }
    
    // Закрываем модалку
    const modal = document.getElementById('clubCardsModal');
    if (modal) modal.remove();
}

// Добавить эмодзи
function addEmojiToMessage() {
    const emojis = ['🎁', '💰', '🚀', '🔥', '💡', '✨', '👋', '🎯', '💪', '🏆'];
    const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
    const textarea = document.getElementById('inviteText');
    if (textarea) {
        textarea.value += ' ' + randomEmoji;
        updateMessagePreview();
    }
}

// Показать инструкцию
function showInviteGuide() {
    const guideModal = document.createElement('div');
    guideModal.id = 'inviteGuideModal';
    guideModal.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.98); z-index: 99999; display: flex; align-items: center; justify-content: center; padding: 15px; overflow-y: auto;';
    guideModal.onclick = (e) => { if (e.target === guideModal) guideModal.remove(); };
    
    guideModal.innerHTML = `
        <div style="max-width: 600px; width: 100%; max-height: 90vh; overflow-y: auto; background: linear-gradient(145deg, #1a1a2e, #16213e); border-radius: 20px; border: 1px solid rgba(255,215,0,0.3);">
            <div style="padding: 20px; border-bottom: 1px solid rgba(255,215,0,0.2); display: flex; justify-content: space-between; align-items: center;">
                <h3 style="color: #FFD700; margin: 0;">📋 Как приглашать людей</h3>
                <button onclick="this.closest('#inviteGuideModal').remove()" style="background: rgba(255,255,255,0.1); border: none; color: #fff; width: 36px; height: 36px; border-radius: 50%; cursor: pointer; font-size: 18px;">✕</button>
            </div>
            
            <div style="padding: 20px;">
                
                <!-- Шаг 1 -->
                <div style="display: flex; gap: 15px; margin-bottom: 25px; padding-bottom: 20px; border-bottom: 1px solid rgba(255,255,255,0.1);">
                    <div style="width: 40px; height: 40px; min-width: 40px; background: linear-gradient(135deg, #FFD700, #FFA500); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; color: #000;">1</div>
                    <div>
                        <h4 style="color: #FFD700; margin: 0 0 8px 0;">🎯 Выбери этап</h4>
                        <p style="color: #aaa; margin: 0; font-size: 13px; line-height: 1.5;">
                            Определи на каком шаге этот человек:<br>
                            • <strong style="color: #fff;">Первое касание</strong> — незнакомый человек<br>
                            • <strong style="color: #fff;">После согласия</strong> — заинтересовался<br>
                            • <strong style="color: #fff;">Напоминание</strong> — если молчит<br>
                            • <strong style="color: #fff;">Возврат</strong> — если отказал раньше<br>
                            • <strong style="color: #fff;">Горячее</strong> — срочное предложение
                        </p>
                    </div>
                </div>
                
                <!-- Шаг 2 -->
                <div style="display: flex; gap: 15px; margin-bottom: 25px; padding-bottom: 20px; border-bottom: 1px solid rgba(255,255,255,0.1);">
                    <div style="width: 40px; height: 40px; min-width: 40px; background: linear-gradient(135deg, #FFD700, #FFA500); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; color: #000;">2</div>
                    <div>
                        <h4 style="color: #FFD700; margin: 0 0 8px 0;">💬 Выбери стиль</h4>
                        <p style="color: #aaa; margin: 0; font-size: 13px; line-height: 1.5;">
                            Разные люди — разные подходы:<br>
                            • 🎁 <strong style="color: #fff;">Подарок</strong> — интрига + ценность<br>
                            • 🤔 <strong style="color: #fff;">Вопрос</strong> — заставляет задуматься<br>
                            • 💬 <strong style="color: #fff;">Личное</strong> — для друзей<br>
                            • 💼 <strong style="color: #fff;">Деловой</strong> — для бизнес-контактов<br>
                            • ⚡ <strong style="color: #fff;">Короткий</strong> — для занятых людей
                        </p>
                    </div>
                </div>
                
                <!-- Шаг 3 -->
                <div style="display: flex; gap: 15px; margin-bottom: 25px; padding-bottom: 20px; border-bottom: 1px solid rgba(255,255,255,0.1);">
                    <div style="width: 40px; height: 40px; min-width: 40px; background: linear-gradient(135deg, #FFD700, #FFA500); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; color: #000;">3</div>
                    <div>
                        <h4 style="color: #FFD700; margin: 0 0 8px 0;">✏️ Отредактируй</h4>
                        <p style="color: #aaa; margin: 0; font-size: 13px; line-height: 1.5;">
                            Сделай текст своим:<br>
                            • Добавь имя человека<br>
                            • Измени под свой стиль<br>
                            • Добавь ссылку на открытку 🔗<br>
                            • Проверь в превью как выглядит
                        </p>
                    </div>
                </div>
                
                <!-- Шаг 4 -->
                <div style="display: flex; gap: 15px; margin-bottom: 25px; padding-bottom: 20px; border-bottom: 1px solid rgba(255,255,255,0.1);">
                    <div style="width: 40px; height: 40px; min-width: 40px; background: linear-gradient(135deg, #FFD700, #FFA500); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; color: #000;">4</div>
                    <div>
                        <h4 style="color: #FFD700; margin: 0 0 8px 0;">📤 Отправь</h4>
                        <p style="color: #aaa; margin: 0; font-size: 13px; line-height: 1.5;">
                            Нажми на мессенджер — текст скопируется и откроется приложение.<br>
                            Или нажми "Копировать" и вставь куда нужно.
                        </p>
                    </div>
                </div>
                
                <!-- Совет -->
                <div style="background: rgba(16,185,129,0.1); border: 1px solid rgba(16,185,129,0.3); border-radius: 12px; padding: 15px;">
                    <h4 style="color: #10B981; margin: 0 0 10px 0;">💡 Совет: Комбинируй!</h4>
                    <p style="color: #aaa; margin: 0; font-size: 13px; line-height: 1.5;">
                        <strong style="color: #fff;">Лучшая связка:</strong><br>
                        1. Создай красивую открытку в Генераторе<br>
                        2. Отправь сначала открытку (визуал)<br>
                        3. Потом отправь это сообщение (текст)<br>
                        <br>
                        Человек получает: картинку 🖼️ + текст 💬 = WOW-эффект!
                    </p>
                </div>
                
                <!-- AI Studio -->
                <div style="background: rgba(255,215,0,0.1); border: 1px solid rgba(255,215,0,0.3); border-radius: 12px; padding: 15px; margin-top: 15px;">
                    <h4 style="color: #FFD700; margin: 0 0 10px 0;">🎨 Хочешь красивое превью?</h4>
                    <p style="color: #aaa; margin: 0 0 10px 0; font-size: 13px;">
                        Создай картинку в AI Studio и прикрепи к сообщению!
                    </p>
                    <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                        <span style="background: rgba(0,0,0,0.3); padding: 6px 12px; border-radius: 6px; font-size: 11px; color: #ccc; cursor: pointer;" onclick="copyToClipboard('Golden gift box with sparkling ribbon, dark background')">🎁 Подарок</span>
                        <span style="background: rgba(0,0,0,0.3); padding: 6px 12px; border-radius: 6px; font-size: 11px; color: #ccc; cursor: pointer;" onclick="copyToClipboard('Rocket launching to golden sky, success concept')">🚀 Ракета</span>
                        <span style="background: rgba(0,0,0,0.3); padding: 6px 12px; border-radius: 6px; font-size: 11px; color: #ccc; cursor: pointer;" onclick="copyToClipboard('Person on beach with laptop, freedom lifestyle')">🏝️ Свобода</span>
                    </div>
                    <small style="color: #666; display: block; margin-top: 8px;">👆 Нажми чтобы скопировать промпт</small>
                </div>
            </div>
            
            <div style="padding: 20px; border-top: 1px solid rgba(255,255,255,0.1);">
                <button onclick="this.closest('#inviteGuideModal').remove()" style="width: 100%; padding: 14px; background: linear-gradient(135deg, #FFD700, #FFA500); border: none; border-radius: 10px; color: #000; font-weight: bold; cursor: pointer; font-size: 15px;">
                    Понятно, начать! 🚀
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(guideModal);
}

// Копирование в буфер (если ещё нет)
if (typeof copyToClipboard === 'undefined') {
    function copyToClipboard(text) {
        navigator.clipboard.writeText(text).then(() => {
            showToast && showToast('✅ Скопировано!', 'success');
        }).catch(() => {
            const textarea = document.createElement('textarea');
            textarea.value = text;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            textarea.remove();
            showToast && showToast('✅ Скопировано!', 'success');
        });
    }
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
// ОТПРАВКА В МЕССЕНДЖЕР
// ═══════════════════════════════════════════════════════════
function sendToMessenger(messenger) {
    const text = document.getElementById('inviteText')?.value || '';
    
    if (!text.trim()) {
        showToast('Сначала выберите или напишите текст', 'error');
        return;
    }
    
    console.log('📤 sendToMessenger:', messenger);
    
    // Копируем текст в буфер (на всякий случай)
    navigator.clipboard.writeText(text).catch(() => {});
    
    const encodedText = encodeURIComponent(text);
    let shareUrl = null;
    let appName = '';
    
    switch (messenger) {
        case 'telegram':
            // Telegram Web Share - РАБОТАЕТ на десктопе и мобильном
            shareUrl = `https://t.me/share/url?url=${encodeURIComponent(' ')}&text=${encodedText}`;
            appName = 'Telegram';
            break;
            
        case 'whatsapp':
            // WhatsApp Web Share - РАБОТАЕТ на десктопе и мобильном
            shareUrl = `https://api.whatsapp.com/send?text=${encodedText}`;
            appName = 'WhatsApp';
            break;
            
        case 'viber':
            // Viber - только через приложение
            shareUrl = `viber://forward?text=${encodedText}`;
            appName = 'Viber';
            break;
            
        case 'facebook':
            // Facebook Messenger share
            shareUrl = `https://www.facebook.com/dialog/send?link=${encodeURIComponent('https://cardgift.site')}&quote=${encodedText}&app_id=0&redirect_uri=${encodeURIComponent(window.location.href)}`;
            // Альтернатива - просто открыть messenger
            shareUrl = `https://www.messenger.com/new`;
            appName = 'Messenger';
            break;
            
        case 'instagram':
            // Instagram Direct - открываем веб-версию
            shareUrl = `https://www.instagram.com/direct/inbox/`;
            appName = 'Instagram';
            break;
            
        case 'tiktok':
            // TikTok - открываем сообщения
            shareUrl = `https://www.tiktok.com/messages`;
            appName = 'TikTok';
            break;
            
        case 'email':
            // Email - работает везде
            shareUrl = `mailto:?subject=${encodeURIComponent('Интересное предложение')}&body=${encodedText}`;
            appName = 'Email';
            break;
            
        default:
            showToast('📋 Текст скопирован!', 'success');
            return;
    }
    
    if (shareUrl) {
        console.log('🔗 Opening:', shareUrl);
        
        // Открываем в новом окне/вкладке
        const newWindow = window.open(shareUrl, '_blank');
        
        if (newWindow) {
            showToast(`✅ ${appName} открыт! Выберите контакт и отправьте`, 'success');
        } else {
            // Если заблокировано - пробуем в том же окне
            window.location.href = shareUrl;
        }
    }
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
window.sendToMessenger = sendToMessenger;

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
    
    // Получаем ID пользователя (как в loadContacts)
    const userId = window.currentDisplayId 
                || window.currentGwId 
                || window.currentTempId 
                || window.currentCgId
                || localStorage.getItem('cardgift_display_id')
                || localStorage.getItem('cardgift_gw_id')
                || localStorage.getItem('cardgift_temp_id')
                || localStorage.getItem('cardgift_cg_id');
    console.log('👤 Owner ID:', userId);
    
    if (!userId) {
        showToast('Ошибка: не найден ID пользователя', 'error');
        return;
    }
    
    // ═══════════════════════════════════════════════════════════
    // ПРОВЕРКА НА ДУБЛИКАТ
    // ═══════════════════════════════════════════════════════════
    const isDuplicate = contacts.some(c => 
        c.contact?.toLowerCase() === contact.toLowerCase() && 
        (c.platform === platform || c.messenger === platform)
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
        const result = await ContactsService.addContact(userId, {
            name,
            messenger: platform,
            contact: validationResult.normalized || contact,
            push_consent: pushConsent,
            source: 'manual'
        });
        
        console.log('📥 ContactsService result:', result);
        
        if (result.success) {
            // Перезагружаем контакты
            await loadContacts();
            closeContactsModal();
            showToast('✅ Контакт добавлен!', 'success');
        } else {
            showToast(result.error || 'Ошибка добавления', 'error');
        }
    } else {
        // Fallback - localStorage
        console.log('💾 Using localStorage fallback');
        contacts.push({ 
            name, 
            platform, 
            messenger: platform,
            contact, 
            push_consent: pushConsent, 
            source: 'manual', 
            status: 'new', 
            created_at: new Date().toISOString() 
        });
        saveContacts();
        renderContacts();
        updateContactsCounts();
        closeContactsModal();
        showToast('Контакт добавлен!', 'success');
    }
}

function editContact(contactId) {
    console.log('🟣 editContact() CALLED with:', contactId);
    // Находим контакт по ID или индексу
    let c, index;
    if (typeof contactId === 'string' && contactId.includes('-')) {
        // UUID из Supabase
        index = contacts.findIndex(ct => ct.id === contactId);
        c = contacts[index];
    } else {
        // Числовой индекс
        index = parseInt(contactId);
        c = contacts[index];
    }
    
    if (!c) {
        showToast('Контакт не найден', 'error');
        return;
    }
    console.log('🟣 Contact found:', c.name);
    
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.style.cssText = 'display: flex !important; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.85); align-items: center; justify-content: center; z-index: 10000; padding: 20px;';
    console.log('🟣 Modal created');
    modal.innerHTML = `
        <div class="modal" style="display: block !important; max-width: 450px; background: #1a1a2e; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 60px rgba(0,0,0,0.5);">
            <div class="modal-header" style="background: linear-gradient(45deg, #1a1a2e, #16213e); padding: 20px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #333;">
                <h3 style="color: #FFD700; margin: 0; font-size: 18px;">✏️ Редактировать контакт</h3>
                <button class="modal-close" onclick="closeContactsModal()" style="color: #fff; background: none; border: none; font-size: 24px; cursor: pointer;">✕</button>
            </div>
            <div class="modal-body" style="padding: 25px;">
                <div class="form-group" style="margin-bottom: 20px;">
                    <label style="color: #FFD700; display: block; margin-bottom: 8px;">👤 Имя:</label>
                    <input type="text" id="editName" class="form-input" value="${escapeHtml(c.name || '')}"
                           style="width: 100%; padding: 12px; background: #1a1a2e; border: 1px solid #444; border-radius: 8px; color: #fff;">
                </div>
                <div class="form-group" style="margin-bottom: 20px;">
                    <label style="color: #FFD700; display: block; margin-bottom: 8px;">📱 Платформа:</label>
                    <select id="editPlatform" class="form-select"
                            style="width: 100%; padding: 12px; background: #1a1a2e; border: 1px solid #444; border-radius: 8px; color: #fff;">
                        <option value="telegram" ${(c.platform || c.messenger) === 'telegram' ? 'selected' : ''}>📱 Telegram</option>
                        <option value="whatsapp" ${(c.platform || c.messenger) === 'whatsapp' ? 'selected' : ''}>💬 WhatsApp</option>
                        <option value="viber" ${(c.platform || c.messenger) === 'viber' ? 'selected' : ''}>📞 Viber</option>
                        <option value="facebook" ${(c.platform || c.messenger) === 'facebook' ? 'selected' : ''}>📘 Facebook</option>
                        <option value="instagram" ${(c.platform || c.messenger) === 'instagram' ? 'selected' : ''}>📷 Instagram</option>
                        <option value="email" ${(c.platform || c.messenger) === 'email' ? 'selected' : ''}>📧 Email</option>
                        <option value="phone" ${(c.platform || c.messenger) === 'phone' ? 'selected' : ''}>📞 Телефон</option>
                    </select>
                </div>
                <div class="form-group" style="margin-bottom: 20px;">
                    <label style="color: #FFD700; display: block; margin-bottom: 8px;">📝 Контакт:</label>
                    <input type="text" id="editValue" class="form-input" value="${escapeHtml(c.contact || '')}"
                           style="width: 100%; padding: 12px; background: #1a1a2e; border: 1px solid #444; border-radius: 8px; color: #fff;">
                </div>
                <div class="form-group" style="margin-bottom: 20px;">
                    <label style="color: #FFD700; display: block; margin-bottom: 8px;">📋 Заметка:</label>
                    <textarea id="editNote" rows="3" placeholder="Личная заметка о контакте..."
                              style="width: 100%; padding: 12px; background: #1a1a2e; border: 1px solid #444; border-radius: 8px; color: #fff; resize: none;">${escapeHtml(c.note || c.notes || '')}</textarea>
                    <small style="color: #666; font-size: 11px;">Заметка видна только вам</small>
                </div>
                <div class="form-group">
                    <label style="display: flex; align-items: center; gap: 10px; cursor: pointer;">
                        <input type="checkbox" id="editPush" ${c.push_consent || c.pushConsent ? 'checked' : ''} style="width: 20px; height: 20px;">
                        <span style="color: #ccc;">Согласие на push-уведомления</span>
                    </label>
                </div>
            </div>
            <div class="modal-footer" style="padding: 20px; display: flex; gap: 10px;">
                <button class="btn btn-gray" onclick="closeContactsModal()" 
                        style="flex: 1; padding: 12px; background: #444; color: #fff; border: none; border-radius: 8px; cursor: pointer;">
                    Отмена
                </button>
                <button class="btn btn-green" onclick="saveEditContact('${contactId}')" 
                        style="flex: 1; padding: 12px; background: linear-gradient(45deg, #4CAF50, #2E7D32); color: #fff; border: none; border-radius: 8px; cursor: pointer; font-weight: bold;">
                    💾 Сохранить
                </button>
            </div>
        </div>
    `;
    addOverlayClickClose(modal);
    document.body.appendChild(modal);
}

async function saveEditContact(contactId) {
    const name = document.getElementById('editName')?.value.trim();
    const platform = document.getElementById('editPlatform')?.value;
    const contact = document.getElementById('editValue')?.value.trim();
    const note = document.getElementById('editNote')?.value.trim();
    const pushConsent = document.getElementById('editPush')?.checked;
    
    if (!name || !contact) {
        showToast('Заполните имя и контакт', 'error');
        return;
    }
    
    // Находим контакт
    let index;
    if (typeof contactId === 'string' && contactId.includes('-')) {
        index = contacts.findIndex(ct => ct.id === contactId);
    } else {
        index = parseInt(contactId);
    }
    
    if (index < 0 || !contacts[index]) {
        showToast('Контакт не найден', 'error');
        return;
    }
    
    // Обновляем локально
    contacts[index].name = name;
    contacts[index].platform = platform;
    contacts[index].messenger = platform;
    contacts[index].contact = contact;
    contacts[index].note = note;
    contacts[index].push_consent = pushConsent;
    
    // Если есть Supabase - обновляем там тоже
    if (window.ContactsService && contacts[index].id) {
        try {
            await ContactsService.updateContact(contacts[index].id, {
                name, 
                messenger: platform, 
                contact, 
                note,
                push_consent: pushConsent
            });
        } catch (err) {
            console.warn('Supabase update failed:', err);
        }
    }
    
    saveContacts();
    renderContacts();
    closeContactsModal();
    showToast('✅ Контакт обновлён!', 'success');
}

async function deleteContact(contactId) {
    if (!confirm('❌ Удалить этот контакт?')) return;
    
    console.log('🗑️ Deleting contact:', contactId);
    
    // Определяем индекс
    let index;
    let supabaseId = null;
    
    if (typeof contactId === 'string' && contactId.includes('-')) {
        // UUID из Supabase
        supabaseId = contactId;
        index = contacts.findIndex(ct => ct.id === contactId);
    } else {
        // Числовой индекс
        index = parseInt(contactId);
        if (contacts[index] && contacts[index].id) {
            supabaseId = contacts[index].id;
        }
    }
    
    console.log('📍 Index:', index, 'Supabase ID:', supabaseId);
    
    // Удаляем из Supabase если есть
    if (supabaseId && window.ContactsService) {
        try {
            const success = await ContactsService.deleteContact(supabaseId);
            console.log('🗑️ Supabase delete result:', success);
        } catch (err) {
            console.warn('Supabase delete error:', err);
        }
    }
    
    // Удаляем локально
    if (index >= 0 && contacts[index]) {
        contacts.splice(index, 1);
        saveContacts();
        renderContacts();
        updateContactsCounts();
        showToast('✅ Контакт удалён', 'success');
    } else {
        // Перезагружаем из Supabase
        await loadContacts();
        showToast('✅ Контакт удалён', 'success');
    }
}

function messageContact(contactId) {
    // Находим контакт
    let c;
    if (typeof contactId === 'string' && contactId.includes('-')) {
        c = contacts.find(ct => ct.id === contactId);
    } else {
        c = contacts[parseInt(contactId)];
    }
    
    if (!c) {
        showToast('Контакт не найден', 'error');
        return;
    }
    
    const platform = c.platform || c.messenger;
    const contact = c.contact || '';
    let url = '';
    
    switch(platform) {
        case 'telegram':
            // Убираем @ если есть
            const tgUsername = contact.replace('@', '');
            url = `https://t.me/${tgUsername}`;
            break;
            
        case 'whatsapp':
            // Оставляем только цифры
            const waNumber = contact.replace(/\D/g, '');
            url = `https://wa.me/${waNumber}`;
            break;
            
        case 'viber':
            // Viber по номеру
            const vbNumber = contact.replace(/\D/g, '');
            url = `viber://chat?number=%2B${vbNumber}`;
            break;
            
        case 'email':
            url = `mailto:${contact}`;
            break;
            
        case 'instagram':
            const igUsername = contact.replace('@', '');
            url = `https://instagram.com/${igUsername}`;
            break;
            
        case 'facebook':
            // Если это ссылка - открываем напрямую
            if (contact.includes('facebook.com')) {
                url = contact;
            } else {
                url = `https://facebook.com/${contact.replace('@', '')}`;
            }
            break;
            
        case 'tiktok':
            const ttUsername = contact.replace('@', '');
            url = `https://tiktok.com/@${ttUsername}`;
            break;
            
        case 'twitter':
            const twUsername = contact.replace('@', '');
            url = `https://twitter.com/${twUsername}`;
            break;
            
        case 'phone':
            // Звонок по телефону
            url = `tel:${contact}`;
            break;
            
        default:
            showToast('💬 Чат для этой платформы недоступен', 'info');
            return;
    }
    
    if (url) {
        console.log('💬 Opening chat:', platform, url);
        window.open(url, '_blank');
    }
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
    console.log('🟢 showImportExportModal() CALLED');
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.style.cssText = 'display: flex !important; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.85); align-items: center; justify-content: center; z-index: 10000; padding: 20px;';
    console.log('🟢 Modal created');
    modal.innerHTML = `
        <div class="modal" style="display: block !important; max-width: 400px; background: #1a1a2e; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 60px rgba(0,0,0,0.5);">
            <div class="modal-header" style="padding: 20px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #333;">
                <h3 style="color: #FFD700; margin: 0; font-size: 18px;">📁 Импорт/Экспорт</h3>
                <button class="modal-close" onclick="closeContactsModal()" style="color: #fff; background: none; border: none; font-size: 24px; cursor: pointer;">✕</button>
            </div>
            <div class="modal-body" style="padding: 25px;">
                <button onclick="exportContacts()" style="width: 100%; padding: 15px; margin-bottom: 15px; background: linear-gradient(45deg, #4CAF50, #2E7D32); color: #fff; border: none; border-radius: 10px; font-size: 16px; font-weight: bold; cursor: pointer;">
                    📤 Экспорт (JSON)
                </button>
                <label style="display: block; width: 100%; padding: 15px; background: linear-gradient(45deg, #2196F3, #1565C0); color: #fff; border: none; border-radius: 10px; font-size: 16px; font-weight: bold; cursor: pointer; text-align: center;">
                    📥 Импорт
                    <input type="file" accept=".json" onchange="importContacts(event)" style="display:none;">
                </label>
            </div>
        </div>
    `;
    addOverlayClickClose(modal);
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
    console.log('🟡 showExportWarningModal() CALLED');
    // Закрываем предыдущую модалку
    closeContactsModal();
    
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.style.cssText = 'display: flex !important; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.85); align-items: center; justify-content: center; z-index: 10000; padding: 20px;';
    console.log('🟡 Modal created');
    modal.innerHTML = `
        <div class="modal" style="display: block !important; max-width: 550px; background: #1a1a2e; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 60px rgba(0,0,0,0.5);">
            <div class="modal-header" style="background: linear-gradient(45deg, #f44336, #c62828); padding: 20px; display: flex; justify-content: space-between; align-items: center;">
                <h3 style="color: #fff; margin: 0; font-size: 18px;">⚠️ ВНИМАНИЕ</h3>
                <button class="modal-close" onclick="closeContactsModal()" style="color: #fff; background: none; border: none; font-size: 24px; cursor: pointer;">✕</button>
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
                <button onclick="closeContactsModal()" 
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
    addOverlayClickClose(modal);
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
    
    closeContactsModal();
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
    console.log('🟠 showTermsOfUseModal() CALLED');
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.style.cssText = 'display: flex !important; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.85); align-items: center; justify-content: center; z-index: 10000; padding: 20px;';
    console.log('🟠 Modal created');
    modal.innerHTML = `
        <div class="modal" style="display: block !important; max-width: 650px; max-height: 90vh; background: #1a1a2e; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 60px rgba(0,0,0,0.5);">
            <div class="modal-header" style="background: linear-gradient(45deg, #1a1a2e, #16213e); padding: 20px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #333;">
                <h3 style="color: #FFD700; margin: 0; font-size: 18px;">📜 Правила использования раздела «Контакты»</h3>
                <button class="modal-close" onclick="closeContactsModal()" style="color: #fff; background: none; border: none; font-size: 24px; cursor: pointer;">✕</button>
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
                <button onclick="closeContactsModal()" 
                        style="width: 100%; padding: 15px; background: linear-gradient(45deg, #FFD700, #FFA500); color: #000; border: none; border-radius: 10px; font-size: 16px; font-weight: bold; cursor: pointer;">
                    ✅ Понятно
                </button>
            </div>
        </div>
    `;
    addOverlayClickClose(modal);
    document.body.appendChild(modal);
}

window.showTermsOfUseModal = showTermsOfUseModal;

// ═══════════════════════════════════════════════════════════
// ИНСТРУКЦИЯ ПО РАБОТЕ С КОНТАКТАМИ
// ═══════════════════════════════════════════════════════════
function showContactsHelpModal() {
    console.log('🔴 showContactsHelpModal() CALLED');
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.style.cssText = 'display: flex !important; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.85); align-items: center; justify-content: center; z-index: 10000; padding: 20px;';
    console.log('🔴 Modal created');
    modal.innerHTML = `
        <div class="modal" style="display: block !important; max-width: 700px; max-height: 90vh; background: #1a1a2e; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 60px rgba(0,0,0,0.5);">
            <div class="modal-header" style="background: linear-gradient(45deg, #1a1a2e, #16213e); padding: 20px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #333;">
                <h3 style="color: #FFD700; margin: 0; font-size: 18px;">📖 Инструкция по работе с контактами</h3>
                <button class="modal-close" onclick="closeContactsModal()" style="color: #fff; background: none; border: none; font-size: 24px; cursor: pointer;">✕</button>
            </div>
            <div class="modal-body" style="padding: 25px; max-height: 65vh; overflow-y: auto;">
                
                <!-- Добавление контакта -->
                <div style="margin-bottom: 25px; background: rgba(255, 215, 0, 0.05); border-radius: 12px; padding: 20px; border: 1px solid rgba(255, 215, 0, 0.2);">
                    <h4 style="color: #FFD700; margin-bottom: 15px; display: flex; align-items: center; gap: 10px;">
                        <span style="font-size: 24px;">➕</span> Добавить контакт
                    </h4>
                    <p style="color: #ccc; font-size: 14px; line-height: 1.7; margin-bottom: 10px;">
                        <strong>Вкладка "Пригласить":</strong><br>
                        1. Выберите мессенджер (Telegram, WhatsApp и др.)<br>
                        2. Выберите готовый шаблон или напишите свой текст<br>
                        3. Нажмите "Копировать текст"<br>
                        4. Вставьте в выбранный мессенджер и отправьте
                    </p>
                    <p style="color: #ccc; font-size: 14px; line-height: 1.7;">
                        <strong>Вкладка "Добавить вручную":</strong><br>
                        Введите имя, выберите платформу, укажите контакт и заметку
                    </p>
                </div>
                
                <!-- Редактирование -->
                <div style="margin-bottom: 25px; background: rgba(76, 175, 80, 0.05); border-radius: 12px; padding: 20px; border: 1px solid rgba(76, 175, 80, 0.2);">
                    <h4 style="color: #4CAF50; margin-bottom: 15px; display: flex; align-items: center; gap: 10px;">
                        <span style="font-size: 24px;">✏️</span> Редактирование (Карандаш)
                    </h4>
                    <p style="color: #ccc; font-size: 14px; line-height: 1.7;">
                        Нажмите на карандаш рядом с контактом чтобы:<br>
                        • Изменить имя или контакт<br>
                        • Сменить платформу<br>
                        • Добавить личную <strong>заметку</strong> (видна только вам)<br>
                        • Изменить согласие на уведомления
                    </p>
                </div>
                
                <!-- Написать -->
                <div style="margin-bottom: 25px; background: rgba(33, 150, 243, 0.05); border-radius: 12px; padding: 20px; border: 1px solid rgba(33, 150, 243, 0.2);">
                    <h4 style="color: #2196F3; margin-bottom: 15px; display: flex; align-items: center; gap: 10px;">
                        <span style="font-size: 24px;">💬</span> Написать (Чат)
                    </h4>
                    <p style="color: #ccc; font-size: 14px; line-height: 1.7;">
                        Нажмите на иконку чата чтобы открыть переписку:<br>
                        • <strong>Telegram</strong> — откроется t.me<br>
                        • <strong>WhatsApp</strong> — откроется wa.me<br>
                        • <strong>Viber</strong> — откроется приложение Viber<br>
                        • <strong>Instagram</strong> — откроется профиль<br>
                        • <strong>Email</strong> — откроется почтовый клиент<br>
                        • <strong>Телефон</strong> — начнётся звонок
                    </p>
                </div>
                
                <!-- Удаление -->
                <div style="margin-bottom: 25px; background: rgba(244, 67, 54, 0.05); border-radius: 12px; padding: 20px; border: 1px solid rgba(244, 67, 54, 0.2);">
                    <h4 style="color: #f44336; margin-bottom: 15px; display: flex; align-items: center; gap: 10px;">
                        <span style="font-size: 24px;">🗑️</span> Удаление
                    </h4>
                    <p style="color: #ccc; font-size: 14px; line-height: 1.7;">
                        Нажмите на корзину и подтвердите удаление.<br>
                        ⚠️ Удалённый контакт нельзя восстановить!
                    </p>
                </div>
                
                <!-- Фильтры -->
                <div style="margin-bottom: 25px; background: rgba(156, 39, 176, 0.05); border-radius: 12px; padding: 20px; border: 1px solid rgba(156, 39, 176, 0.2);">
                    <h4 style="color: #9C27B0; margin-bottom: 15px; display: flex; align-items: center; gap: 10px;">
                        <span style="font-size: 24px;">🔍</span> Поиск и фильтры
                    </h4>
                    <p style="color: #ccc; font-size: 14px; line-height: 1.7;">
                        • Нажмите на карточку платформы (Telegram, WhatsApp и др.) чтобы отфильтровать<br>
                        • Используйте поле поиска для поиска по имени или контакту<br>
                        • "Все" — показать всех без фильтра
                    </p>
                </div>
                
                <!-- Экспорт/Импорт -->
                <div style="margin-bottom: 25px; background: rgba(255, 152, 0, 0.05); border-radius: 12px; padding: 20px; border: 1px solid rgba(255, 152, 0, 0.2);">
                    <h4 style="color: #FF9800; margin-bottom: 15px; display: flex; align-items: center; gap: 10px;">
                        <span style="font-size: 24px;">📁</span> Импорт/Экспорт
                    </h4>
                    <p style="color: #ccc; font-size: 14px; line-height: 1.7;">
                        • <strong>Экспорт</strong> — скачать базу контактов в JSON файл<br>
                        • <strong>Импорт</strong> — загрузить контакты из JSON файла<br>
                        <br>
                        ⚠️ При скачивании необходимо подтвердить согласие с правилами использования
                    </p>
                </div>
                
                <!-- Формат контактов -->
                <div style="background: rgba(0, 188, 212, 0.05); border-radius: 12px; padding: 20px; border: 1px solid rgba(0, 188, 212, 0.2);">
                    <h4 style="color: #00BCD4; margin-bottom: 15px; display: flex; align-items: center; gap: 10px;">
                        <span style="font-size: 24px;">📱</span> Формат контактов
                    </h4>
                    <p style="color: #ccc; font-size: 14px; line-height: 1.7;">
                        • <strong>Телефон</strong> — международный формат: <code style="background: #333; padding: 2px 6px; border-radius: 4px;">+380501234567</code><br>
                        • <strong>Telegram</strong> — username: <code style="background: #333; padding: 2px 6px; border-radius: 4px;">@username</code><br>
                        • <strong>Email</strong> — полный адрес: <code style="background: #333; padding: 2px 6px; border-radius: 4px;">name@mail.com</code><br>
                        • <strong>Instagram</strong> — username: <code style="background: #333; padding: 2px 6px; border-radius: 4px;">@username</code>
                    </p>
                </div>
                
            </div>
            <div class="modal-footer" style="padding: 20px;">
                <button onclick="closeContactsModal()" 
                        style="width: 100%; padding: 15px; background: linear-gradient(45deg, #FFD700, #FFA500); color: #000; border: none; border-radius: 10px; font-size: 16px; font-weight: bold; cursor: pointer;">
                    ✅ Понятно
                </button>
            </div>
        </div>
    `;
    addOverlayClickClose(modal);
    document.body.appendChild(modal);
}

window.showContactsHelpModal = showContactsHelpModal;

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
                closeContactsModal();
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

// Новые функции v2.0
window.addLinkToMessage = addLinkToMessage;
window.addClubCardLink = addClubCardLink;
window.addEmojiToMessage = addEmojiToMessage;
window.switchInviteCategory = switchInviteCategory;
window.selectInviteCard = selectInviteCard;
window.updateMessagePreview = updateMessagePreview;
window.showInviteGuide = showInviteGuide;
window.renderInviteCards = renderInviteCards;
window.showClubCardsModal = showClubCardsModal;
window.loadClubCards = loadClubCards;
window.insertClubCardLink = insertClubCardLink;

console.log('📋 Contacts Module v14.0 loaded - Beautiful invite system');

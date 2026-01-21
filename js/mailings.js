// =============================================
// MAILINGS MODULE - Рассылки
// =============================================

let mailingsData = [];
let mailingsRecipients = [];

// Инициализация модуля рассылок
async function initMailingsSection() {
    console.log('📧 Initializing Mailings section...');
    await loadMailingsStats();
    await loadReferralsList();
    await loadMailingsHistory();
    updateInboxCounts();
}

// =============================================
// СТАТИСТИКА
// =============================================

async function loadMailingsStats() {
    const gwId = window.userGwId || window.displayId;
    if (!gwId) return;
    
    try {
        // Непрочитанные
        const { count: unread } = await supabase
            .from('internal_messages')
            .select('*', { count: 'exact', head: true })
            .eq('to_gw_id', gwId)
            .eq('is_read', false);
        
        // Отправленные
        const { count: sent } = await supabase
            .from('internal_messages')
            .select('*', { count: 'exact', head: true })
            .eq('from_gw_id', gwId);
        
        // Рефералы
        const { count: referrals } = await supabase
            .from('users')
            .select('*', { count: 'exact', head: true })
            .eq('referrer_gw_id', gwId);
        
        // Обновить UI
        const el1 = document.getElementById('mailings-unread');
        const el2 = document.getElementById('mailings-sent');
        const el3 = document.getElementById('mailings-referrals');
        
        if (el1) el1.textContent = unread || 0;
        if (el2) el2.textContent = sent || 0;
        if (el3) el3.textContent = referrals || 0;
        
    } catch (e) {
        console.log('Error loading mailings stats:', e.message);
    }
}

// Обновить счётчики во входящих
async function updateInboxCounts() {
    const gwId = window.userGwId || window.displayId;
    if (!gwId) return;
    
    try {
        const { data: messages } = await supabase
            .from('internal_messages')
            .select('from_messenger')
            .eq('to_gw_id', gwId);
        
        if (!messages) return;
        
        const counts = {};
        messages.forEach(m => {
            const key = m.from_messenger || 'other';
            counts[key] = (counts[key] || 0) + 1;
        });
        
        // Обновить карточки
        document.querySelectorAll('.inbox-card').forEach(card => {
            const messenger = card.dataset.messenger;
            const count = counts[messenger] || 0;
            const countEl = card.querySelector('.inbox-count');
            if (countEl) {
                countEl.textContent = `${count} сообщений`;
                countEl.style.color = count > 0 ? 'var(--gold)' : 'var(--text-muted)';
            }
        });
        
    } catch (e) {
        console.log('Error updating inbox counts:', e.message);
    }
}

// =============================================
// СПИСОК РЕФЕРАЛОВ
// =============================================

async function loadReferralsList() {
    const gwId = window.userGwId || window.displayId;
    if (!gwId) return;
    
    const container = document.getElementById('referrals-chat-list');
    if (!container) return;
    
    try {
        const { data: referrals, error } = await supabase
            .from('users')
            .select('gw_id, gw_level, created_at')
            .eq('referrer_gw_id', gwId)
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        if (!referrals || referrals.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 30px; color: var(--text-muted);">
                    <div style="font-size: 40px; margin-bottom: 10px;">👥</div>
                    <p>У вас пока нет рефералов</p>
                    <p style="font-size: 12px; margin-top: 10px;">Приглашайте людей по вашей реферальной ссылке!</p>
                </div>
            `;
            return;
        }
        
        // Загрузить непрочитанные сообщения от рефералов
        const { data: unreadMessages } = await supabase
            .from('internal_messages')
            .select('from_gw_id')
            .eq('to_gw_id', gwId)
            .eq('is_read', false)
            .in('from_gw_id', referrals.map(r => r.gw_id));
        
        const unreadCounts = {};
        if (unreadMessages) {
            unreadMessages.forEach(m => {
                unreadCounts[m.from_gw_id] = (unreadCounts[m.from_gw_id] || 0) + 1;
            });
        }
        
        container.innerHTML = referrals.map(ref => {
            const unread = unreadCounts[ref.gw_id] || 0;
            const levelBadge = ref.gw_level > 0 ? `<span style="background: var(--gold); color: #000; padding: 2px 8px; border-radius: 10px; font-size: 10px; margin-left: 8px;">Lv.${ref.gw_level}</span>` : '';
            
            return `
                <div class="referral-chat-item" onclick="showReferralChat('${ref.gw_id}')" style="
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 15px;
                    background: var(--bg-card);
                    border: 1px solid var(--border);
                    border-radius: 10px;
                    margin-bottom: 10px;
                    cursor: pointer;
                    transition: all 0.2s;
                ">
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <div style="width: 40px; height: 40px; background: var(--gold); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 18px;">👤</div>
                        <div>
                            <div style="font-weight: 600;">${ref.gw_id}${levelBadge}</div>
                            <div style="font-size: 11px; color: var(--text-muted);">
                                Присоединился: ${new Date(ref.created_at).toLocaleDateString('ru-RU')}
                            </div>
                        </div>
                    </div>
                    <div style="display: flex; align-items: center; gap: 10px;">
                        ${unread > 0 ? `
                            <span style="background: #ff4444; color: white; padding: 2px 8px; border-radius: 10px; font-size: 11px; font-weight: bold;">
                                ${unread} новых
                            </span>
                        ` : ''}
                        <span style="color: var(--text-muted);">💬</span>
                    </div>
                </div>
            `;
        }).join('');
        
        // Обновить счётчик активных чатов
        const activeChats = Object.keys(unreadCounts).length;
        const el = document.getElementById('mailings-chats');
        if (el) el.textContent = activeChats;
        
    } catch (e) {
        console.error('Error loading referrals:', e);
        container.innerHTML = `
            <div style="text-align: center; padding: 30px; color: var(--text-muted);">
                <p>Ошибка загрузки</p>
            </div>
        `;
    }
}

// =============================================
// ИСТОРИЯ РАССЫЛОК
// =============================================

async function loadMailingsHistory() {
    const gwId = window.userGwId || window.displayId;
    if (!gwId) return;
    
    const container = document.getElementById('mailings-history');
    if (!container) return;
    
    try {
        const { data: mailings, error } = await supabase
            .from('mailings')
            .select('*')
            .eq('sender_gw_id', gwId)
            .order('created_at', { ascending: false })
            .limit(20);
        
        if (error || !mailings || mailings.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 30px; color: var(--text-muted);">
                    <div style="font-size: 40px; margin-bottom: 10px;">📧</div>
                    <p>Вы ещё не делали рассылок</p>
                    <button class="btn btn-yellow" style="margin-top: 15px;" onclick="showCreateMailingModal()">➕ Создать первую рассылку</button>
                </div>
            `;
            return;
        }
        
        mailingsData = mailings;
        
        container.innerHTML = mailings.map(m => `
            <div style="padding: 15px; background: var(--bg-card); border: 1px solid var(--border); border-radius: 10px; margin-bottom: 10px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                    <span style="font-weight: 600;">${m.title || 'Без заголовка'}</span>
                    <span style="font-size: 11px; color: var(--text-muted);">
                        ${new Date(m.created_at).toLocaleDateString('ru-RU')}
                    </span>
                </div>
                <div style="font-size: 13px; color: var(--text-muted); margin-bottom: 8px;">
                    ${m.message?.substring(0, 100)}${m.message?.length > 100 ? '...' : ''}
                </div>
                <div style="display: flex; gap: 15px; font-size: 11px; color: var(--text-muted);">
                    <span>📤 Отправлено: ${m.sent_count || 0}</span>
                    <span>👁️ Прочитано: ${m.read_count || 0}</span>
                    <span>${getMailingTypeLabel(m.type)}</span>
                </div>
            </div>
        `).join('');
        
    } catch (e) {
        console.log('Mailings table not ready:', e.message);
    }
}

function getMailingTypeLabel(type) {
    const labels = {
        'referrals': '👥 Рефералам',
        'contacts': '📋 Контактам',
        'club': '🏢 Клубная',
        'personal': '💬 Личная'
    };
    return labels[type] || type;
}

// =============================================
// СОЗДАНИЕ РАССЫЛКИ
// =============================================

function showCreateMailingModal() {
    const modal = document.getElementById('create-mailing-modal');
    if (modal) {
        modal.style.cssText = 'display: flex !important;';
        document.getElementById('create-mailing-form')?.reset();
        updateMailingRecipients('referrals');
    }
}

function closeCreateMailingModal() {
    const modal = document.getElementById('create-mailing-modal');
    if (modal) {
        modal.style.cssText = 'display: none !important;';
    }
}

async function updateMailingRecipients(type) {
    const gwId = window.userGwId || window.displayId;
    if (!gwId) return;
    
    const previewEl = document.getElementById('recipients-preview');
    const countEl = document.getElementById('recipients-count');
    
    mailingsRecipients = [];
    
    try {
        if (type === 'referrals') {
            const { data: referrals } = await supabase
                .from('users')
                .select('gw_id')
                .eq('referrer_gw_id', gwId);
            
            if (referrals) {
                mailingsRecipients = referrals.map(r => ({ gw_id: r.gw_id, type: 'referral' }));
            }
            
            if (previewEl) {
                previewEl.innerHTML = referrals?.length > 0 
                    ? referrals.map(r => r.gw_id).join(', ')
                    : 'Нет рефералов';
            }
            
        } else if (type === 'contacts') {
            const { data: contacts } = await supabase
                .from('contacts')
                .select('id, name, contact')
                .eq('owner_gw_id', gwId)
                .neq('status', 'archived')
                .limit(100);
            
            if (contacts) {
                mailingsRecipients = contacts.map(c => ({ 
                    contact_id: c.id, 
                    name: c.name,
                    contact: c.contact,
                    type: 'contact' 
                }));
            }
            
            if (previewEl) {
                previewEl.innerHTML = contacts?.length > 0 
                    ? contacts.map(c => c.name || c.contact).join(', ')
                    : 'Нет контактов';
            }
        }
        
        if (countEl) {
            countEl.textContent = mailingsRecipients.length;
        }
        
    } catch (e) {
        console.error('Error loading recipients:', e);
        if (previewEl) previewEl.innerHTML = 'Ошибка загрузки';
        if (countEl) countEl.textContent = '0';
    }
}

async function sendMailing() {
    const gwId = window.userGwId || window.displayId;
    if (!gwId) return;
    
    const form = document.getElementById('create-mailing-form');
    const message = form.message?.value?.trim();
    
    if (!message) {
        showNotification('Введите сообщение', 'error');
        return;
    }
    
    if (mailingsRecipients.length === 0) {
        showNotification('Нет получателей', 'error');
        return;
    }
    
    const mailingData = {
        sender_gw_id: gwId,
        type: form.mailing_type?.value || 'referrals',
        title: form.title?.value?.trim() || '',
        message: message,
        link_url: form.link_url?.value?.trim() || null,
        channels: {
            internal: form.channel_internal?.checked || false,
            telegram: form.channel_telegram?.checked || false,
            email: form.channel_email?.checked || false
        },
        recipients: mailingsRecipients,
        status: 'sending',
        sent_count: 0
    };
    
    try {
        // Сохранить рассылку
        const { data: mailing, error: mailingError } = await supabase
            .from('mailings')
            .insert(mailingData)
            .select()
            .single();
        
        // Отправить внутренние сообщения
        if (form.channel_internal?.checked) {
            const internalMessages = mailingsRecipients
                .filter(r => r.type === 'referral')
                .map(r => ({
                    from_gw_id: gwId,
                    to_gw_id: r.gw_id,
                    from_name: gwId,
                    from_messenger: 'sponsor',
                    message: message,
                    message_type: 'mailing'
                }));
            
            if (internalMessages.length > 0) {
                await supabase
                    .from('internal_messages')
                    .insert(internalMessages);
            }
        }
        
        // Обновить статус
        if (mailing) {
            await supabase
                .from('mailings')
                .update({ 
                    status: 'sent', 
                    sent_count: mailingsRecipients.length,
                    sent_at: new Date().toISOString()
                })
                .eq('id', mailing.id);
        }
        
        showNotification(`Рассылка отправлена ${mailingsRecipients.length} получателям!`, 'success');
        closeCreateMailingModal();
        
        // Обновить данные
        await loadMailingsStats();
        await loadMailingsHistory();
        
    } catch (e) {
        console.error('Error sending mailing:', e);
        showNotification('Ошибка отправки', 'error');
    }
}

// =============================================
// ИНИЦИАЛИЗАЦИЯ
// =============================================

// При переходе на секцию
window.addEventListener('hashchange', () => {
    if (window.location.hash === '#mailings') {
        initMailingsSection();
    }
});

// При загрузке если уже на секции
document.addEventListener('DOMContentLoaded', () => {
    // ВАЖНО: Закрыть модалку при загрузке!
    const mailingModal = document.getElementById('create-mailing-modal');
    if (mailingModal) {
        mailingModal.style.cssText = 'display: none !important;';
    }
    
    if (window.location.hash === '#mailings') {
        setTimeout(initMailingsSection, 500);
    }
});

console.log('✅ Mailings module loaded');

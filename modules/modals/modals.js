/* =====================================================
   CARDGIFT - MODALS & NEWS MODULE
   Вырезано из dashboard.js (строки 4904-5083, 5151-5165)
   
   Включает:
   - News modal
   - Generic modals
   - Wallet toggle
   ===================================================== */

// MODAL FIX - Исправление закрытия модалок
// =====================================================

// Глобальная функция закрытия любой модалки
function closeModal(modalId) {
    if (modalId) {
        // Закрыть конкретную модалку по ID
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.setProperty('display', 'none', 'important');
            modal.classList.remove('show', 'active', 'open');
        }
    } else {
        // Fallback: удалить overlay (для старых вызовов без параметра)
        document.querySelector('.modal-overlay')?.remove();
    }
}

// Глобальная функция открытия модалки
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.setProperty('display', 'flex', 'important');
        modal.classList.add('show');
    }
}

// Исправляем closeNewsModal
window.closeNewsModal = function() {
    closeModal('newsModal');
    console.log('📰 News modal closed');
};

// Исправляем openNewsModal
window.openNewsModal = function() {
    openModal('newsModal');
    loadUserNewsContent();
    console.log('📰 News modal opened');
};

// Загрузка контента для новостей
async function loadUserNewsContent() {
    const container = document.getElementById('newsModalContent');
    if (!container) return;
    
    if (!window.SupabaseClient || !SupabaseClient.client) {
        container.innerHTML = '<p style="text-align: center; color: var(--text-muted);">Загрузка...</p>';
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
            container.innerHTML = '<div style="text-align: center; padding: 40px; color: var(--text-muted);"><div style="font-size: 48px; margin-bottom: 15px;">📭</div><p>Нет новостей</p></div>';
            updateNewsBadge(0);
            return;
        }
        
        const readIds = JSON.parse(localStorage.getItem('readNewsIds') || '[]');
        const typeIcons = { 'info': 'ℹ️', 'update': '🔄', 'promo': '🎁', 'warning': '⚠️', 'urgent': '🚨' };
        
        container.innerHTML = news.map(item => {
            const isRead = readIds.includes(item.id);
            return '<div class="news-item ' + (isRead ? 'read' : 'unread') + '" data-id="' + item.id + '" onclick="markNewsAsRead(' + item.id + ')" style="padding: 15px; border-radius: 10px; margin-bottom: 10px; cursor: pointer; background: rgba(255,255,255,0.05);' + (!isRead ? 'border-left: 3px solid var(--gold);' : '') + '">' +
                '<div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">' +
                    '<span style="font-size: 18px;">' + (typeIcons[item.type] || '📰') + '</span>' +
                    '<span style="font-weight: 600; flex: 1;">' + escapeHtml(item.title) + '</span>' +
                    (!isRead ? '<span style="background: var(--gold); color: #000; font-size: 10px; padding: 2px 6px; border-radius: 10px; font-weight: bold;">NEW</span>' : '') +
                '</div>' +
                '<div style="font-size: 14px; color: var(--text-muted); line-height: 1.5; margin-bottom: 8px;">' + escapeHtml(item.content) + '</div>' +
                '<div style="font-size: 12px; color: var(--text-muted);">' + new Date(item.created_at).toLocaleDateString() + '</div>' +
            '</div>';
        }).join('');
        
        const unreadCount = news.filter(n => !readIds.includes(n.id)).length;
        updateNewsBadge(unreadCount);
        
    } catch (e) {
        console.error('Load news error:', e);
        container.innerHTML = '<p style="text-align: center; color: #ff6b6b;">Ошибка загрузки</p>';
    }
}

// Отметить новость как прочитанную
function markNewsAsRead(newsId) {
    const readIds = JSON.parse(localStorage.getItem('readNewsIds') || '[]');
    if (!readIds.includes(newsId)) {
        readIds.push(newsId);
        localStorage.setItem('readNewsIds', JSON.stringify(readIds));
        const item = document.querySelector('.news-item[data-id="' + newsId + '"]');
        if (item) {
            item.classList.remove('unread');
            item.classList.add('read');
            item.style.borderLeft = 'none';
            const badge = item.querySelector('[style*="NEW"]');
            if (badge) badge.remove();
        }
        const allUnread = document.querySelectorAll('.news-item.unread');
        updateNewsBadge(allUnread.length);
    }
}

// Обновить бейдж на колокольчике
function updateNewsBadge(count) {
    const badge = document.getElementById('newsBadge');
    if (badge) {
        badge.textContent = count;
        badge.style.display = count > 0 ? 'flex' : 'none';
    }
}

// Закрытие модалок по клику на overlay
document.addEventListener('click', function(e) {
    if (e.target.classList.contains('modal-overlay')) {
        e.target.style.setProperty('display', 'none', 'important');
    }
});

// Закрытие по Escape
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        document.querySelectorAll('.modal-overlay').forEach(modal => {
            modal.style.setProperty('display', 'none', 'important');
        });
    }
});

window.closeModal = closeModal;
window.openModal = openModal;
window.markNewsAsRead = markNewsAsRead;
window.loadUserNewsContent = loadUserNewsContent;
window.updateNewsBadge = updateNewsBadge;

/**
 * Использовать шаблон - открыть в генераторе с реферальной ссылкой
 */
function useTemplate(cardIndex) {
    const card = cards[cardIndex];
    const shortCode = card.short_code || card.shortCode || card.code;
    
    if (!shortCode) {
        alert('Ошибка: код карточки не найден');
        return;
    }
    
    // Получаем GW ID пользователя для реферальной ссылки
    const gwId = localStorage.getItem('cardgift_gw_id') || 
                 localStorage.getItem('gw_id') || 
                 window.userGwId ||
                 'TEMP_' + Date.now();
    
    // Создаем URL с реферальной ссылкой
    const templateUrl = `/generator.html?from=template&ref=${gwId}&sc=${shortCode}`;
    
    // Сохраняем данные шаблона для генератора
    localStorage.setItem('cg_template_data', JSON.stringify({
        shortCode: shortCode,
        templateName: card.title || 'Шаблон',
        imageUrl: card.preview || card.image_url || '',
        cardData: card
    }));
    
    console.log('✨ Opening template with referral:', templateUrl);
    console.log('📋 Template data saved:', card.title);
    
    // Открываем генератор
    window.location.href = templateUrl;
}

/**
 * Переключить отметку "От лидера"
 */

// ===== WALLET TOGGLE =====
// ============ WALLET TOGGLE (для кнопки в сайдбаре) ============
function toggleWalletConnection() {
    if (typeof connectWallet === 'function') {
        connectWallet();
    } else if (window.ethereum) {
        window.ethereum.request({ method: 'eth_requestAccounts' })
            .then(() => location.reload())
            .catch(console.error);
    } else {
        alert('Установите SafePal или MetaMask');
    }
}
window.toggleWalletConnection = toggleWalletConnection;

console.log('📊 CardGift Dashboard v4.5 loaded (template filters + use button)');

// ===== ЭКСПОРТ =====
window.showNewsModal = showNewsModal;
window.closeNewsModal = closeNewsModal;
window.closeModal = closeModal;
window.toggleWalletDropdown = toggleWalletDropdown;

console.log('🪟 Modals Module loaded');

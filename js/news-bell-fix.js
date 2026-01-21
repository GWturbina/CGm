// =============================================
// NEWS BELL FIX - Исправление колокольчика новостей
// Добавить в конец dashboard.js или как отдельный файл
// =============================================

// Переопределяем функцию показа новостей
(function() {
    // Сохраняем оригинальную функцию если есть
    const originalShowNewsModal = window.showNewsModal;
    
    window.showNewsModal = async function() {
        // Вызываем оригинальную функцию если есть
        if (originalShowNewsModal) {
            originalShowNewsModal.apply(this, arguments);
        }
        
        // Отмечаем новости как прочитанные через 1 секунду
        setTimeout(async () => {
            await markAllNewsAsRead();
        }, 1000);
    };
    
    // Функция для отметки всех новостей прочитанными
    async function markAllNewsAsRead() {
        const gwId = window.userGwId || window.displayId;
        if (!gwId || !window.supabase) return;
        
        try {
            // Получить все активные новости
            const { data: news } = await supabase
                .from('news')
                .select('id')
                .eq('is_active', true);
            
            if (!news || news.length === 0) {
                removeNewsBadge();
                return;
            }
            
            // Отметить каждую как прочитанную
            for (const item of news) {
                try {
                    await supabase
                        .from('news_read_status')
                        .upsert({
                            user_gw_id: gwId,
                            news_id: item.id,
                            read_at: new Date().toISOString()
                        }, {
                            onConflict: 'user_gw_id,news_id',
                            ignoreDuplicates: true
                        });
                } catch (e) {
                    // Игнорируем ошибки дубликатов
                }
            }
            
            // Убрать бейдж
            removeNewsBadge();
            
            console.log('📰 All news marked as read');
            
        } catch (e) {
            console.log('News read status table may not exist:', e.message);
            // Всё равно убираем бейдж локально
            removeNewsBadge();
            // Сохраняем в localStorage как fallback
            localStorage.setItem('news_last_read', new Date().toISOString());
        }
    }
    
    // Функция удаления бейджа
    function removeNewsBadge() {
        // Все возможные селекторы колокольчика
        const bellSelectors = [
            '.notification-bell',
            '#news-bell',
            '[onclick*="showNewsModal"]',
            '[onclick*="toggleNotifications"]',
            '.header-bell',
            '.bell-icon'
        ];
        
        bellSelectors.forEach(selector => {
            const bells = document.querySelectorAll(selector);
            bells.forEach(bell => {
                // Удалить все бейджи внутри
                const badges = bell.querySelectorAll('.news-badge, .notification-badge, .badge, [class*="badge"]');
                badges.forEach(badge => {
                    // Проверяем что это бейдж с числом
                    if (badge.textContent.match(/^\d+$/) || badge.textContent.match(/^\d+\+$/)) {
                        badge.remove();
                    }
                });
                
                // Также убираем псевдо-элемент если есть data-count
                bell.removeAttribute('data-count');
                bell.removeAttribute('data-unread');
            });
        });
        
        // Специфичный бейдж в шапке
        const headerBadge = document.querySelector('.header-actions .notification-badge');
        if (headerBadge) headerBadge.remove();
    }
    
    // Проверка непрочитанных при загрузке
    async function checkUnreadNews() {
        const gwId = window.userGwId || window.displayId;
        if (!gwId || !window.supabase) return;
        
        try {
            // Всего активных новостей
            const { count: totalNews } = await supabase
                .from('news')
                .select('*', { count: 'exact', head: true })
                .eq('is_active', true);
            
            // Прочитанных
            const { count: readNews } = await supabase
                .from('news_read_status')
                .select('*', { count: 'exact', head: true })
                .eq('user_gw_id', gwId);
            
            const unread = Math.max((totalNews || 0) - (readNews || 0), 0);
            
            if (unread === 0) {
                removeNewsBadge();
            }
            
        } catch (e) {
            // Fallback на localStorage
            const lastRead = localStorage.getItem('news_last_read');
            if (lastRead) {
                const lastReadDate = new Date(lastRead);
                const now = new Date();
                // Если читал меньше часа назад - убираем бейдж
                if ((now - lastReadDate) < 3600000) {
                    removeNewsBadge();
                }
            }
        }
    }
    
    // Запуск проверки при загрузке
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(checkUnreadNews, 2000);
        });
    } else {
        setTimeout(checkUnreadNews, 2000);
    }
    
    // Также проверять при закрытии модалки новостей
    document.addEventListener('click', (e) => {
        // Если кликнули на крестик закрытия модалки новостей
        if (e.target.closest('.modal-close') && document.querySelector('#news-modal, [id*="news"]')) {
            setTimeout(removeNewsBadge, 500);
        }
        // Или кликнули вне модалки
        if (e.target.classList.contains('modal-overlay')) {
            setTimeout(removeNewsBadge, 500);
        }
    });
    
    console.log('✅ News bell fix loaded');
})();

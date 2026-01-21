// ═══════════════════════════════════════════════════════════
// NEWS MODAL FIX v2.0 - Блокирует автооткрытие newsModal
// Добавить в dashboard.html ПОСЛЕДНИМ скриптом
// ИЛИ вставить этот код в конец dashboard.js
// ═══════════════════════════════════════════════════════════

(function() {
    'use strict';
    
    console.log('🔧 News Modal Fix v2.0 loading...');
    
    // ═══════════════════════════════════════════════════════════
    // 1. НЕМЕДЛЕННО ЗАКРЫТЬ newsModal
    // ═══════════════════════════════════════════════════════════
    
    function forceCloseNewsModal() {
        const modal = document.getElementById('newsModal');
        if (modal) {
            modal.style.cssText = 'display: none !important; visibility: hidden !important; opacity: 0 !important;';
            modal.classList.remove('show', 'active', 'open', 'visible');
            modal.removeAttribute('open');
        }
    }
    
    // Закрываем сразу
    forceCloseNewsModal();
    
    // ═══════════════════════════════════════════════════════════
    // 2. ПЕРЕХВАТЫВАЕМ openNewsModal
    // ═══════════════════════════════════════════════════════════
    
    let pageFullyLoaded = false;
    let userClickedNews = false;
    
    // Отмечаем когда страница полностью загружена
    window.addEventListener('load', function() {
        setTimeout(function() {
            pageFullyLoaded = true;
            console.log('🔧 Page fully loaded, news modal unlocked');
        }, 3000); // Ждём 3 секунды после загрузки
    });
    
    // Перехватываем клик на колокольчик
    document.addEventListener('click', function(e) {
        const bell = e.target.closest('#newsBell, .news-bell, [onclick*="openNewsModal"]');
        if (bell) {
            userClickedNews = true;
            console.log('🔔 User clicked news bell');
        }
    }, true);
    
    // Переопределяем openNewsModal
    const originalOpenNews = window.openNewsModal;
    
    window.openNewsModal = function() {
        // Разрешаем открытие ТОЛЬКО если:
        // 1. Пользователь кликнул на колокольчик, ИЛИ
        // 2. Страница полностью загружена (прошло 3 сек)
        
        if (!userClickedNews && !pageFullyLoaded) {
            console.log('🔧 BLOCKED auto-open of newsModal (page still loading)');
            return;
        }
        
        // Сбрасываем флаг клика
        userClickedNews = false;
        
        // Открываем модалку
        const modal = document.getElementById('newsModal');
        if (modal) {
            modal.style.cssText = 'display: flex !important; visibility: visible !important; opacity: 1 !important;';
            modal.classList.add('show');
            
            // Загружаем контент
            if (typeof loadUserNewsContent === 'function') {
                loadUserNewsContent();
            } else if (typeof loadNewsModalContent === 'function') {
                loadNewsModalContent();
            }
            
            console.log('📰 News modal opened (user action)');
        }
    };
    
    // ═══════════════════════════════════════════════════════════
    // 3. ЗАКРЫВАЕМ ПРИ ЗАГРУЗКЕ СТРАНИЦЫ
    // ═══════════════════════════════════════════════════════════
    
    // Многократно закрываем модалку при загрузке
    document.addEventListener('DOMContentLoaded', forceCloseNewsModal);
    window.addEventListener('load', forceCloseNewsModal);
    
    // Таймеры на случай асинхронных скриптов
    setTimeout(forceCloseNewsModal, 100);
    setTimeout(forceCloseNewsModal, 500);
    setTimeout(forceCloseNewsModal, 1000);
    setTimeout(forceCloseNewsModal, 2000);
    setTimeout(forceCloseNewsModal, 3000);
    
    // ═══════════════════════════════════════════════════════════
    // 4. MutationObserver - следим за изменениями
    // ═══════════════════════════════════════════════════════════
    
    const observer = new MutationObserver(function(mutations) {
        if (!pageFullyLoaded && !userClickedNews) {
            mutations.forEach(function(mutation) {
                if (mutation.target.id === 'newsModal') {
                    const modal = mutation.target;
                    const style = window.getComputedStyle(modal);
                    
                    // Если модалка стала видимой без клика пользователя
                    if (style.display !== 'none' && style.visibility !== 'hidden') {
                        console.log('🔧 BLOCKED newsModal via MutationObserver');
                        forceCloseNewsModal();
                    }
                }
            });
        }
    });
    
    // Запускаем observer когда DOM готов
    function startObserver() {
        const modal = document.getElementById('newsModal');
        if (modal) {
            observer.observe(modal, { 
                attributes: true, 
                attributeFilter: ['style', 'class'] 
            });
            console.log('🔧 MutationObserver watching newsModal');
        }
    }
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', startObserver);
    } else {
        startObserver();
    }
    
    // ═══════════════════════════════════════════════════════════
    // 5. ИСПРАВЛЯЕМ closeNewsModal
    // ═══════════════════════════════════════════════════════════
    
    window.closeNewsModal = function() {
        forceCloseNewsModal();
        console.log('📰 News modal closed');
    };
    
    // ═══════════════════════════════════════════════════════════
    // 6. ЗАКРЫТИЕ ПО КЛИКУ НА OVERLAY И ESCAPE
    // ═══════════════════════════════════════════════════════════
    
    document.addEventListener('click', function(e) {
        if (e.target.id === 'newsModal' || 
            (e.target.classList.contains('modal-overlay') && e.target.querySelector('#newsModalContent'))) {
            forceCloseNewsModal();
        }
    });
    
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            forceCloseNewsModal();
        }
    });
    
    console.log('✅ News Modal Fix v2.0 loaded - auto-open blocked for 3 seconds');
    
})();

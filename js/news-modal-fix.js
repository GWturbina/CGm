// ═══════════════════════════════════════════════════════════
// NEWS MODAL FIX v3.0 — Чистая блокировка старого newsModal
// Вся логика новостей теперь в notifications-center.js
// 
// Проблема была: 4 скрипта боролись за openNewsModal(),
// каждый переопределял функцию → race condition → мигание.
// Решение: один блокировщик + один обработчик (NotificationCenter)
// ═══════════════════════════════════════════════════════════

(function() {
    'use strict';
    
    console.log('🔧 News Modal Fix v3.0 loading...');
    
    // ═══════════════════════════════════════════════════════════
    // 1. БЛОКИРОВКА СТАРОГО newsModal
    // ═══════════════════════════════════════════════════════════
    
    function blockOldModal() {
        var modal = document.getElementById('newsModal');
        if (modal) {
            modal.style.cssText = 'display:none!important;visibility:hidden!important;pointer-events:none!important;position:fixed!important;top:-9999px!important;';
        }
    }
    
    // Блокируем немедленно
    blockOldModal();
    
    // Блокируем после загрузки DOM и страницы
    document.addEventListener('DOMContentLoaded', blockOldModal);
    window.addEventListener('load', blockOldModal);
    
    // ═══════════════════════════════════════════════════════════
    // 2. MutationObserver — единственный наблюдатель
    // Если какой-то скрипт попытается показать старый модал — блокируем
    // ═══════════════════════════════════════════════════════════
    
    function startObserver() {
        var modal = document.getElementById('newsModal');
        if (!modal) return;
        
        var observer = new MutationObserver(function(mutations) {
            for (var i = 0; i < mutations.length; i++) {
                var m = mutations[i];
                if (m.type === 'attributes') {
                    var style = window.getComputedStyle(modal);
                    if (style.display !== 'none' || style.visibility !== 'hidden') {
                        blockOldModal();
                    }
                }
            }
        });
        
        observer.observe(modal, { 
            attributes: true, 
            attributeFilter: ['style', 'class'] 
        });
        
        console.log('🔧 MutationObserver watching newsModal');
    }
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', startObserver);
    } else {
        startObserver();
    }
    
    // ═══════════════════════════════════════════════════════════
    // 3. ПЕРЕХВАТ openNewsModal → делегируем в NotificationCenter
    // Ставим с задержкой, чтобы быть ПОСЛЕДНИМ кто переопределит
    // ═══════════════════════════════════════════════════════════
    
    function setupOpenNewsModal() {
        window.openNewsModal = function() {
            // Делегируем в NotificationCenter если он загружен
            if (window.NotificationCenter && typeof NotificationCenter.open === 'function') {
                NotificationCenter.open();
                return;
            }
            // Иначе ничего не делаем — старый модал заблокирован
            console.log('🔧 openNewsModal called but NotificationCenter not ready');
        };
        
        window.closeNewsModal = function() {
            blockOldModal();
            if (window.NotificationCenter && typeof NotificationCenter.close === 'function') {
                NotificationCenter.close();
            }
        };
    }
    
    // Устанавливаем сейчас
    setupOpenNewsModal();
    
    // И повторно через 2 и 4 секунды (после того как все скрипты загрузятся 
    // и попытаются переопределить openNewsModal)
    setTimeout(setupOpenNewsModal, 2000);
    setTimeout(setupOpenNewsModal, 4000);
    
    // ═══════════════════════════════════════════════════════════
    // 4. ЗАКРЫТИЕ ПО ESC И КЛИКУ НА OVERLAY
    // ═══════════════════════════════════════════════════════════
    
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            blockOldModal();
        }
    });
    
    document.addEventListener('click', function(e) {
        if (e.target.id === 'newsModal' || e.target.classList.contains('modal-overlay')) {
            blockOldModal();
        }
    });
    
    console.log('✅ News Modal Fix v3.0 loaded — delegating to NotificationCenter');
    
})();

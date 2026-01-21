/* =====================================================
   MOBILE HEADER - JavaScript
   Сворачиваемый хедер на мобильных устройствах
   ===================================================== */

(function() {
    'use strict';
    
    // Ждём загрузки DOM
    document.addEventListener('DOMContentLoaded', initMobileHeader);
    
    function initMobileHeader() {
        // Только для мобильных
        if (window.innerWidth > 768) return;
        
        console.log('📱 Mobile header initialized');
        
        // Создаём кнопку сворачивания
        const collapseBtn = document.createElement('button');
        collapseBtn.className = 'header-collapse-btn';
        collapseBtn.innerHTML = '▲';
        collapseBtn.title = 'Свернуть/развернуть меню';
        collapseBtn.setAttribute('aria-label', 'Свернуть меню');
        
        // Создаём мини-статус (показывается когда хедер свёрнут)
        const miniStatus = document.createElement('div');
        miniStatus.className = 'header-mini-status';
        miniStatus.innerHTML = `
            <span class="mini-wallet" id="miniWallet">...</span>
            <span class="mini-level" id="miniLevel"></span>
        `;
        
        document.body.appendChild(collapseBtn);
        document.body.appendChild(miniStatus);
        
        // Состояние
        let isCollapsed = localStorage.getItem('mobileHeaderCollapsed') === 'true';
        
        // Применяем сохранённое состояние
        if (isCollapsed) {
            document.body.classList.add('mobile-header-collapsed');
            collapseBtn.innerHTML = '▼';
            collapseBtn.classList.add('collapsed');
        }
        
        // Обработчик клика
        collapseBtn.addEventListener('click', function() {
            isCollapsed = !isCollapsed;
            
            if (isCollapsed) {
                document.body.classList.add('mobile-header-collapsed');
                collapseBtn.innerHTML = '▼';
                collapseBtn.classList.add('collapsed');
            } else {
                document.body.classList.remove('mobile-header-collapsed');
                collapseBtn.innerHTML = '▲';
                collapseBtn.classList.remove('collapsed');
            }
            
            // Сохраняем состояние
            localStorage.setItem('mobileHeaderCollapsed', isCollapsed);
            
            // Обновляем мини-статус
            updateMiniStatus();
        });
        
        // Обновление мини-статуса
        function updateMiniStatus() {
            const walletEl = document.getElementById('walletAddress') || 
                            document.querySelector('.wallet-address');
            const levelEl = document.getElementById('userLevel') ||
                           document.querySelector('.user-level');
            
            const miniWallet = document.getElementById('miniWallet');
            const miniLevel = document.getElementById('miniLevel');
            
            if (miniWallet && walletEl) {
                const walletText = walletEl.textContent || '';
                miniWallet.textContent = walletText.includes('...') ? walletText : '💳';
            }
            
            if (miniLevel && levelEl) {
                miniLevel.textContent = levelEl.textContent || '';
            }
        }
        
        // Обновляем статус при загрузке
        setTimeout(updateMiniStatus, 2000);
        
        // Автоматически сворачиваем при скролле вниз
        let lastScrollY = window.scrollY;
        let scrollTimeout;
        
        window.addEventListener('scroll', function() {
            clearTimeout(scrollTimeout);
            
            scrollTimeout = setTimeout(function() {
                const currentScrollY = window.scrollY;
                
                // Если скроллим вниз и прошли 100px - сворачиваем
                if (currentScrollY > lastScrollY && currentScrollY > 100 && !isCollapsed) {
                    // Не сворачиваем автоматически, только показываем подсказку
                }
                
                // Если скроллим вверх до самого верха - разворачиваем
                if (currentScrollY < 50 && isCollapsed) {
                    // Можно автоматически развернуть
                    // document.body.classList.remove('mobile-header-collapsed');
                    // collapseBtn.innerHTML = '▲';
                    // collapseBtn.classList.remove('collapsed');
                    // isCollapsed = false;
                }
                
                lastScrollY = currentScrollY;
            }, 100);
        });
        
        // При изменении размера окна
        window.addEventListener('resize', function() {
            if (window.innerWidth > 768) {
                document.body.classList.remove('mobile-header-collapsed');
                collapseBtn.style.display = 'none';
                miniStatus.style.display = 'none';
            } else {
                collapseBtn.style.display = 'flex';
                if (isCollapsed) {
                    document.body.classList.add('mobile-header-collapsed');
                }
            }
        });
    }
})();

console.log('📱 Mobile Header v1.0 loaded');

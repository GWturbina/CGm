/* =====================================================
   MOBILE HEADER v2.0 - АВТОСКРЫТИЕ И КОМПАКТНОСТЬ
   
   Функции:
   - Хедер свёрнут по умолчанию на мобилках
   - Кнопка для разворачивания/сворачивания
   - Автоскрытие при скролле вниз
   - Появление при скролле вверх
   - Мини-статус панель с кредитами
   ===================================================== */

const MobileHeader = {
    isExpanded: false,
    lastScrollY: 0,
    scrollThreshold: 50,
    
    init() {
        // Проверяем мобильное устройство
        if (window.innerWidth > 768) {
            console.log('📱 MobileHeader: Desktop mode, skipping');
            return;
        }
        
        console.log('📱 MobileHeader v2.0 initializing...');
        
        // Создаём элементы UI
        this.createUI();
        
        // Обработчики событий
        this.bindEvents();
        
        // Обновляем мини-статус
        this.updateMiniStatus();
        
        console.log('✅ MobileHeader initialized');
    },
    
    createUI() {
        // Проверяем что элементы ещё не созданы
        if (document.querySelector('.header-collapse-btn')) return;
        
        // Кнопка сворачивания/разворачивания
        const btn = document.createElement('button');
        btn.className = 'header-collapse-btn collapsed';
        btn.innerHTML = '☰';
        btn.setAttribute('aria-label', 'Toggle header');
        btn.onclick = () => this.toggleHeader();
        document.body.appendChild(btn);
        
        // Мини-статус панель
        const miniStatus = document.createElement('div');
        miniStatus.className = 'header-mini-status';
        miniStatus.innerHTML = `
            <span class="mini-logo">🎴 CardGift</span>
            <div class="mini-credits">
                <span id="miniCreditsText">📝∞</span>
                <span id="miniCreditsImage">🎨3</span>
                <span id="miniCreditsVoice">🎤3</span>
            </div>
        `;
        document.body.appendChild(miniStatus);
        
        // Добавляем style если нет
        if (!document.querySelector('link[href*="mobile-header"]')) {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = 'css/mobile-header-v2.css';
            document.head.appendChild(link);
        }
    },
    
    bindEvents() {
        // Скролл - автоскрытие
        let ticking = false;
        window.addEventListener('scroll', () => {
            if (!ticking) {
                window.requestAnimationFrame(() => {
                    this.handleScroll();
                    ticking = false;
                });
                ticking = true;
            }
        }, { passive: true });
        
        // Изменение размера окна
        window.addEventListener('resize', () => {
            if (window.innerWidth > 768) {
                // Десктоп - сбрасываем
                document.body.classList.remove('mobile-header-expanded', 'header-hidden');
            }
        });
        
        // Обновление кредитов (слушаем события от AIStudio)
        window.addEventListener('credits-updated', () => this.updateMiniStatus());
        
        // Клик вне хедера - закрыть
        document.addEventListener('click', (e) => {
            if (this.isExpanded && 
                !e.target.closest('.dashboard-header') && 
                !e.target.closest('.studio-header') &&
                !e.target.closest('.header-collapse-btn')) {
                this.collapseHeader();
            }
        });
    },
    
    handleScroll() {
        if (window.innerWidth > 768) return;
        
        const currentScrollY = window.scrollY;
        const delta = currentScrollY - this.lastScrollY;
        
        // Скролл вниз > threshold - скрываем
        if (delta > this.scrollThreshold && currentScrollY > 100) {
            document.body.classList.add('header-hidden');
        }
        
        // Скролл вверх - показываем
        if (delta < -this.scrollThreshold || currentScrollY < 50) {
            document.body.classList.remove('header-hidden');
        }
        
        this.lastScrollY = currentScrollY;
    },
    
    toggleHeader() {
        if (this.isExpanded) {
            this.collapseHeader();
        } else {
            this.expandHeader();
        }
    },
    
    expandHeader() {
        this.isExpanded = true;
        document.body.classList.add('mobile-header-expanded');
        
        const btn = document.querySelector('.header-collapse-btn');
        if (btn) {
            btn.classList.remove('collapsed');
            btn.innerHTML = '✕';
        }
    },
    
    collapseHeader() {
        this.isExpanded = false;
        document.body.classList.remove('mobile-header-expanded');
        
        const btn = document.querySelector('.header-collapse-btn');
        if (btn) {
            btn.classList.add('collapsed');
            btn.innerHTML = '☰';
        }
    },
    
    updateMiniStatus() {
        // Получаем данные из AIStudio если доступен
        if (window.AIStudio) {
            const textEl = document.getElementById('miniCreditsText');
            const imageEl = document.getElementById('miniCreditsImage');
            const voiceEl = document.getElementById('miniCreditsVoice');
            
            if (textEl) textEl.textContent = '📝∞';
            
            if (imageEl) {
                const imgRem = AIStudio.getRemainingCredits?.('image') || '3';
                imageEl.textContent = `🎨${imgRem}`;
            }
            
            if (voiceEl) {
                const voiceRem = AIStudio.getRemainingCredits?.('voice') || '3';
                voiceEl.textContent = `🎤${voiceRem}`;
            }
        }
        
        // Получаем данные из localStorage как fallback
        else {
            const today = new Date().toISOString().split('T')[0];
            const key = `ai_studio_daily_guest_${today}`;
            const saved = localStorage.getItem(key);
            
            if (saved) {
                try {
                    const usage = JSON.parse(saved);
                    const imageEl = document.getElementById('miniCreditsImage');
                    const voiceEl = document.getElementById('miniCreditsVoice');
                    
                    if (imageEl) imageEl.textContent = `🎨${3 - (usage.image || 0)}`;
                    if (voiceEl) voiceEl.textContent = `🎤${3 - (usage.voice || 0)}`;
                } catch (e) {}
            }
        }
    }
};

// Автоинициализация
document.addEventListener('DOMContentLoaded', () => {
    // Небольшая задержка для загрузки CSS
    setTimeout(() => MobileHeader.init(), 100);
});

// Экспорт
window.MobileHeader = MobileHeader;

console.log('📱 MobileHeader v2.0 loaded');

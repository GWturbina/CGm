/* =====================================================
   MOBILE HEADER v3.0 - ПОЛНОЕ СКРЫТИЕ
   
   Создаёт:
   - Кнопку ☰ для открытия header
   - Мини-бар со статусом
   - Overlay для закрытия
   ===================================================== */

const MobileHeader = {
    isOpen: false,
    
    init() {
        // Только для мобилок
        if (window.innerWidth > 768) {
            console.log('📱 MobileHeader: Desktop, skip');
            return;
        }
        
        console.log('📱 MobileHeader v3.0 init...');
        
        this.createElements();
        this.bindEvents();
        this.updateCredits();
        
        console.log('✅ MobileHeader ready');
    },
    
    createElements() {
        // Проверяем что ещё не созданы
        if (document.querySelector('.mobile-menu-btn')) return;
        
        // 1. Кнопка меню
        const menuBtn = document.createElement('button');
        menuBtn.className = 'mobile-menu-btn';
        menuBtn.innerHTML = '☰';
        menuBtn.setAttribute('aria-label', 'Меню');
        menuBtn.onclick = () => this.toggle();
        document.body.appendChild(menuBtn);
        
        // 2. Мини-бар
        const miniBar = document.createElement('div');
        miniBar.className = 'mobile-mini-bar';
        miniBar.innerHTML = `
            <span class="mini-title">🤖 AI Studio</span>
            <div class="mini-credits">
                <span id="miniText">📝∞</span>
                <span id="miniImage">🎨3</span>
                <span id="miniVoice">🎤3</span>
            </div>
        `;
        document.body.appendChild(miniBar);
        
        // 3. Overlay (для закрытия при клике вне header)
        const overlay = document.createElement('div');
        overlay.className = 'header-overlay';
        overlay.onclick = () => this.close();
        document.body.appendChild(overlay);
        
        // 4. Кнопка закрытия внутри header
        const header = document.querySelector('.studio-header');
        if (header && !header.querySelector('.header-close-btn')) {
            const closeBtn = document.createElement('button');
            closeBtn.className = 'header-close-btn';
            closeBtn.innerHTML = '✕';
            closeBtn.onclick = () => this.close();
            header.appendChild(closeBtn);
        }
    },
    
    bindEvents() {
        // При изменении размера окна
        window.addEventListener('resize', () => {
            if (window.innerWidth > 768) {
                this.close();
                document.body.classList.remove('header-open');
            }
        });
        
        // Escape закрывает
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen) {
                this.close();
            }
        });
        
        // Обновление кредитов
        window.addEventListener('credits-updated', () => this.updateCredits());
        
        // Периодическое обновление
        setInterval(() => this.updateCredits(), 5000);
    },
    
    toggle() {
        if (this.isOpen) {
            this.close();
        } else {
            this.open();
        }
    },
    
    open() {
        this.isOpen = true;
        document.body.classList.add('header-open');
        
        const btn = document.querySelector('.mobile-menu-btn');
        if (btn) btn.innerHTML = '✕';
    },
    
    close() {
        this.isOpen = false;
        document.body.classList.remove('header-open');
        
        const btn = document.querySelector('.mobile-menu-btn');
        if (btn) btn.innerHTML = '☰';
    },
    
    updateCredits() {
        const miniImage = document.getElementById('miniImage');
        const miniVoice = document.getElementById('miniVoice');
        
        // Из AIStudio если доступен
        if (window.AIStudio) {
            const imgRem = AIStudio.getRemainingCredits?.('image') ?? '3';
            const voiceRem = AIStudio.getRemainingCredits?.('voice') ?? '3';
            
            if (miniImage) miniImage.textContent = `🎨${imgRem}`;
            if (miniVoice) miniVoice.textContent = `🎤${voiceRem}`;
        }
    }
};

// Автозапуск
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => MobileHeader.init(), 200);
});

// Экспорт
window.MobileHeader = MobileHeader;

console.log('📱 MobileHeader v3.0 loaded');

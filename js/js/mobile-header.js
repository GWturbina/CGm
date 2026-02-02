/* =====================================================
   MOBILE HEADER v1.0
   Управление мобильным хедером
   
   Февраль 2026
   ===================================================== */
 
const MobileHeader = {
    
    init() {
        console.log('📱 MobileHeader initializing...');
        
        this.setupSidebarToggle();
        this.setupScrollBehavior();
        
        console.log('✅ MobileHeader ready');
    },
    
    // Кнопка открытия/закрытия сайдбара
    setupSidebarToggle() {
        const toggle = document.getElementById('sidebarToggle');
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebarOverlay');
        
        if (!toggle || !sidebar) return;
        
        // Открыть сайдбар
        toggle.addEventListener('click', () => {
            sidebar.classList.add('open');
            if (overlay) overlay.classList.add('active');
            document.body.style.overflow = 'hidden';
        });
        
        // Закрыть по клику на оверлей
        if (overlay) {
            overlay.addEventListener('click', () => {
                this.closeSidebar();
            });
        }
        
        // Закрыть по Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeSidebar();
            }
        });
        
        // Закрыть при клике на пункт меню
        sidebar.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', () => {
                // Небольшая задержка чтобы увидеть выбор
                setTimeout(() => this.closeSidebar(), 150);
            });
        });
    },
    
    closeSidebar() {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebarOverlay');
        
        if (sidebar) sidebar.classList.remove('open');
        if (overlay) overlay.classList.remove('active');
        document.body.style.overflow = '';
    },
    
    // Поведение хедера при скролле (опционально)
    setupScrollBehavior() {
        // На мобильных можно скрывать хедер при скролле вниз
        // Пока отключено - просто заглушка
        
        let lastScrollY = 0;
        const header = document.querySelector('.mobile-header');
        
        if (!header) return;
        
        // Отключено - хедер всегда видим
        // window.addEventListener('scroll', () => {
        //     const currentScrollY = window.scrollY;
        //     if (currentScrollY > lastScrollY && currentScrollY > 100) {
        //         header.classList.add('hidden');
        //     } else {
        //         header.classList.remove('hidden');
        //     }
        //     lastScrollY = currentScrollY;
        // });
    }
};

// Автоинициализация
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => MobileHeader.init());
} else {
    MobileHeader.init();
}

window.MobileHeader = MobileHeader;

console.log('📱 MobileHeader v1.0 loaded');

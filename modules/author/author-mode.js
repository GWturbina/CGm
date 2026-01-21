/* =====================================================
   CARDGIFT - AUTHOR MODE MODULE
   Вырезано из dashboard.js (строки 172-224)
   
   Включает:
   - Author mode activation
   - Special features for authors
   ===================================================== */

// ============ AUTHOR MODE ============
const AUTHOR_KEY = 'cardgift2025';

function checkAuthorMode() {
    const urlParams = new URLSearchParams(window.location.search);
    const authorParam = urlParams.get('author');
    const savedAuthor = localStorage.getItem('cardgift_author');
    
    if (authorParam === AUTHOR_KEY || savedAuthor === AUTHOR_KEY) {
        enableAuthorMode();
        if (authorParam === AUTHOR_KEY) {
            localStorage.setItem('cardgift_author', AUTHOR_KEY);
            window.history.replaceState({}, '', window.location.pathname + window.location.hash);
        }
    }
}

function enableAuthorMode() {
    currentUserLevel = 12;
    walletConnected = true;
    walletAddress = '0xAUTHOR_MODE';
    
    const logo = document.querySelector('.logo-text');
    if (logo) logo.innerHTML = 'CardGift <span style="font-size:10px;color:#4CAF50;">👑 AUTHOR</span>';
    
    showToast('👑 Режим автора активирован!', 'success');
    console.log('👑 Author mode enabled');
}

function disableAuthorMode() {
    localStorage.removeItem('cardgift_author');
    location.reload();
}

document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && e.key === 'A') {
        e.preventDefault();
        const isAuthor = localStorage.getItem('cardgift_author') === AUTHOR_KEY;
        if (isAuthor) {
            if (confirm('Выключить режим автора?')) disableAuthorMode();
        } else {
            const key = prompt('Введите ключ автора:');
            if (key === AUTHOR_KEY) {
                localStorage.setItem('cardgift_author', AUTHOR_KEY);
                enableAuthorMode();
                updateAccessLocks();
            } else if (key) {
                showToast('Неверный ключ', 'error');
            }
        }
    }
});


// ===== ЭКСПОРТ =====
window.enableAuthorMode = enableAuthorMode;
window.checkAuthorMode = checkAuthorMode;

console.log('👑 Author Mode Module loaded');

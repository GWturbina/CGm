// ═══════════════════════════════════════════════════════════════════════════
// BLOG LAUNCHER v1.3
// Умный вход в блог: если не настроен → настройки, если настроен → редактор
// Открывает в ТОМ ЖЕ окне
// ═══════════════════════════════════════════════════════════════════════════

async function openBlog() {
    const gwId = localStorage.getItem('cardgift_gw_id') 
              || localStorage.getItem('cardgift_display_id')
              || window.currentGwId;
    
    if (!gwId) {
        alert('❌ Войдите в систему');
        return;
    }
    
    try {
        const cleanGwId = gwId.replace(/^GW/i, '');
        const gwIdWithPrefix = gwId.startsWith('GW') ? gwId : 'GW' + gwId;
        
        const { data, error } = await SupabaseClient.client
            .from('blog_settings')
            .select('username, blog_title')
            .or(`user_gw_id.eq.${cleanGwId},user_gw_id.eq.${gwIdWithPrefix}`)
            .maybeSingle();
        
        if (error) {
            console.warn('Blog check error:', error);
        }
        
        // Открываем в ТОМ ЖЕ окне (location.href вместо window.open)
        if (data && (data.username || data.blog_title)) {
            console.log('✅ Blog configured, opening editor');
            window.location.href = '/blog-editor.html';
        } else {
            console.log('⚙️ Blog not configured, opening settings');
            window.location.href = '/blog-settings.html';
        }
        
    } catch (e) {
        console.error('Blog launcher error:', e);
        window.location.href = '/blog-settings.html';
    }
}

window.openBlog = openBlog;
console.log('✅ Blog Launcher v1.3 loaded');

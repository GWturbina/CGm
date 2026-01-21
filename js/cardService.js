/* =====================================================
   CARDGIFT - CARD SERVICE
   v5.4 - ИСПРАВЛЕНО: правильные имена полей для Supabase
   Redis + Cloudinary + Supabase + Video
   ===================================================== */

const cardService = {
    
    generateShortCode() {
        const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
        let code = '';
        for (let i = 0; i < 7; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
    },
    
    // Получить gw_id из всех возможных мест
    getCurrentGwId() {
        // 1. Из localStorage разные ключи
        const sources = [
            localStorage.getItem('cardgift_gw_id'),
            localStorage.getItem('gw_id'),
            localStorage.getItem('cardgift_cg_id'),
            localStorage.getItem('cg_id')
        ];
        
        for (const val of sources) {
            if (val && val !== 'null' && val !== 'undefined') {
                return val.toString().replace('GW', '').replace('CG', '');
            }
        }
        
        // 2. Из currentUser
        try {
            const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
            if (currentUser.gw_id) return currentUser.gw_id.toString().replace('GW', '');
            if (currentUser.cg_id) return currentUser.cg_id;
            if (currentUser.cgId) return currentUser.cgId;
            if (currentUser.odixId) return currentUser.odixId;
        } catch (e) {}
        
        // 3. Из window
        if (window.userGwId) return window.userGwId.toString().replace('GW', '');
        if (window.displayId) return window.displayId.toString().replace('GW', '');
        if (window.currentGwId) return window.currentGwId.toString().replace('GW', '');
        
        return null;
    },
    
    async createCard(cardData) {
        try {
            const shortCode = this.generateShortCode();
            const cardId = `card_${Date.now()}_${shortCode}`;
            
            const card = {
                ...cardData,
                cardId: cardId,
                shortCode: shortCode,
                short_code: shortCode,
                createdAt: new Date().toISOString(),
                views: 0
            };
            
            // Загружаем картинку в Cloudinary если есть base64
            const imageData = card.mediaUrl || card.backgroundImage;
            if (imageData && imageData.startsWith('data:')) {
                console.log('☁️ Uploading image to Cloudinary...');
                
                if (window.CloudinaryService) {
                    const result = await CloudinaryService.uploadImage(imageData, `card_${shortCode}`);
                    if (result.success) {
                        console.log('✅ Image uploaded:', result.url);
                        card.mediaUrl = result.url;
                        card.cloudinaryUrl = result.url;
                        card.cloudinaryPublicId = result.publicId;
                        card.isCloudImage = true;
                        delete card.backgroundImage;
                    }
                } else {
                    console.warn('⚠️ CloudinaryService not available');
                }
            }
            
            // 1. Сохраняем в Redis (для быстрого доступа и OG превью)
            try {
                const response = await fetch('/api/save-card', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ shortCode, cardData: card })
                });
                const result = await response.json();
                
                if (result.success) {
                    console.log('✅ Saved to Redis');
                } else {
                    console.warn('⚠️ Redis save failed:', result.error);
                }
            } catch (err) {
                console.warn('⚠️ Redis save error:', err);
            }
            
            // 2. Сохраняем в Supabase (для архива и CRM)
            await this.saveToSupabase(card);
            
            // 3. Сохраняем локально
            this.saveLocally(card);
            
            const baseUrl = window.location.origin;
            const shortUrl = `${baseUrl}/c/${shortCode}`;
            const directUrl = `${baseUrl}/card-viewer.html?sc=${shortCode}`;
            
            console.log('✅ Card created:', cardId);
            console.log('🔗 Short URL:', shortUrl);
            
            return {
                success: true,
                cardId: cardId,
                shortCode: shortCode,
                shortUrl: shortUrl,
                shareUrl: shortUrl,
                fullShareUrl: directUrl,
                directUrl: directUrl,
                card: card
            };
            
        } catch (error) {
            console.error('❌ Create card error:', error);
            return { success: false, error: error.message };
        }
    },
    
    // ═══════════════════════════════════════════════════════════
    // СОХРАНЕНИЕ В SUPABASE - ИСПРАВЛЕНО v5.4!
    // ═══════════════════════════════════════════════════════════
    async saveToSupabase(card) {
        // Получаем gw_id
        const gwId = this.getCurrentGwId();
        
        if (!gwId) {
            console.warn('⚠️ No gw_id found for Supabase save');
            return false;
        }
        
        // Добавляем префикс GW если нет
        const gwIdWithPrefix = gwId.toString().startsWith('GW') ? gwId : 'GW' + gwId;
        
        console.log('📦 Saving to Supabase with owner_gw_id:', gwIdWithPrefix);
        
        // Данные для сохранения
        const supabaseCard = {
            short_code: card.shortCode,
            owner_gw_id: gwIdWithPrefix,
            card_data: {
                title: card.greetingText?.split('\n')[0]?.substring(0, 100) || 
                       card.greeting?.split('\n')[0]?.substring(0, 100) || 
                       'Открытка',
                message: card.greetingText || card.greeting || '',
                greeting: card.greetingText || card.greeting || '',
                image_url: card.mediaUrl || card.cloudinaryUrl || null,
                video_url: card.videoUrl || null,
                style: card.style || 'classic',
                textPosition: card.textPosition || 'bottom',
                ctaEnabled: card.ctaEnabled || false,
                ctaTitle: card.ctaTitle || null,
                ctaButton: card.ctaButton || null,
                ctaUrl: card.ctaUrl || null,
                ctaTimer: card.ctaTimer || 3,
                marqueeEnabled: card.marqueeEnabled || false,
                marqueeText: card.marqueeText || null,
                marqueeUrl: card.marqueeUrl || null,
                marqueeTimer: card.marqueeTimer || 7,
                bannerEnabled: card.bannerEnabled || false,
                bannerHtml: card.bannerHtml || null,
                bannerUrl: card.bannerUrl || null,
                bannerTimer: card.bannerTimer || 5,
                bonusEnabled: card.bonusEnabled || false,
                bonusImage: card.bonusImage || null,
                bonusTitle: card.bonusTitle || null,
                bonusText: card.bonusText || null,
                creatorLevel: card.creatorLevel || 0,
                actualCreator: card.actualCreator || gwIdWithPrefix
            },
            card_type: 'standard',
            views: 0,
            views_count: 0,
            unique_views: 0,
            created_at: card.createdAt || new Date().toISOString()
        };
        
        // ═══════════════════════════════════════════════════════════
        // СПОСОБ 1: Напрямую через Supabase клиент
        // ═══════════════════════════════════════════════════════════
        if (window.SupabaseClient && SupabaseClient.client) {
            try {
                console.log('📦 Trying direct Supabase insert...');
                
                const { data, error } = await SupabaseClient.client
                    .from('cards')
                    .insert(supabaseCard)
                    .select();
                
                if (error) {
                    console.warn('⚠️ Direct Supabase error:', error.message);
                } else {
                    console.log('✅ Saved to Supabase directly, short_code:', card.shortCode);
                    return true;
                }
            } catch (e) {
                console.warn('⚠️ Direct Supabase exception:', e.message);
            }
        }
        
        // ═══════════════════════════════════════════════════════════
        // СПОСОБ 2: Через API endpoint (fallback)
        // ═══════════════════════════════════════════════════════════
        console.log('📦 Trying API fallback for Supabase save...');
        
        try {
            const response = await fetch('/api/save-card-to-db', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(supabaseCard)
            });
            
            const result = await response.json();
            
            if (result.success) {
                console.log('✅ Saved to Supabase via API, short_code:', card.shortCode);
                return true;
            } else {
                console.warn('⚠️ API save failed:', result.error);
            }
        } catch (e) {
            console.warn('⚠️ API save exception:', e.message);
        }
        
        return false;
    },
    
    // Сохраняем ТОЛЬКО метаданные, без base64!
    saveLocally(card) {
        try {
            const lightCard = {
                cardId: card.cardId,
                shortCode: card.shortCode,
                short_code: card.shortCode,
                code: card.shortCode,
                shortUrl: card.shortUrl || `${window.location.origin}/c/${card.shortCode}`,
                title: card.greetingText?.split('\n')[0]?.substring(0, 50) || card.greeting?.split('\n')[0]?.substring(0, 50) || 'Открытка',
                greeting: card.greetingText?.substring(0, 200) || card.greeting?.substring(0, 200) || '',
                mediaUrl: card.mediaUrl || card.cloudinaryUrl || null,
                preview: card.mediaUrl || card.cloudinaryUrl || null,
                videoUrl: card.videoUrl || null,
                style: card.style || 'classic',
                createdAt: card.createdAt,
                date: new Date(card.createdAt).toLocaleDateString(),
                views: card.views || 0
            };
            
            // Сохраняем в cardgift_cards для dashboard
            const cards = JSON.parse(localStorage.getItem('cardgift_cards') || '[]');
            const existsInCards = cards.some(c => c.cardId === lightCard.cardId || c.shortCode === lightCard.shortCode);
            if (!existsInCards) {
                cards.unshift(lightCard);
                if (cards.length > 100) cards.splice(100);
                localStorage.setItem('cardgift_cards', JSON.stringify(cards));
            }
            
            console.log('💾 Card saved locally');
            
        } catch (e) {
            console.warn('Local save error:', e);
        }
    },
    
    async getCard(shortCode) {
        try {
            // 1. С сервера Redis
            const response = await fetch(`/api/get-card?sc=${shortCode}`);
            const result = await response.json();
            
            if (result.success && result.data) {
                return result.data;
            }
            
            // 2. Из Supabase
            if (window.SupabaseClient && SupabaseClient.client) {
                try {
                    const { data: card } = await SupabaseClient.client
                        .from('cards')
                        .select('*')
                        .eq('short_code', shortCode)  // ← ИСПРАВЛЕНО
                        .single();
                    
                    if (card) {
                        // Извлекаем данные из card_data
                        const cardData = card.card_data || {};
                        return {
                            cardId: card.id,
                            shortCode: card.short_code,
                            greeting: cardData.message || cardData.greeting,
                            greetingText: cardData.message || cardData.greeting,
                            mediaUrl: cardData.image_url,
                            videoUrl: cardData.video_url,
                            style: cardData.style,
                            createdAt: card.created_at,
                            views: card.views || card.views_count || 0,
                            ...cardData
                        };
                    }
                } catch (e) {
                    console.warn('Supabase get error:', e);
                }
            }
            
            // 3. Локально
            const local = localStorage.getItem(`card_${shortCode}`);
            if (local) return JSON.parse(local);
            
            return null;
        } catch (error) {
            console.error('Get card error:', error);
            return null;
        }
    },
    
    async deleteCard(shortCode) {
        try {
            // Из localStorage
            localStorage.removeItem(`card_${shortCode}`);
            
            const cards = JSON.parse(localStorage.getItem('cardgift_cards') || '[]');
            const filtered = cards.filter(c => c.shortCode !== shortCode && c.short_code !== shortCode);
            localStorage.setItem('cardgift_cards', JSON.stringify(filtered));
            
            // Из Supabase
            if (window.SupabaseClient && SupabaseClient.client) {
                try {
                    await SupabaseClient.client
                        .from('cards')
                        .delete()
                        .eq('short_code', shortCode);  // ← ИСПРАВЛЕНО
                    console.log('✅ Deleted from Supabase');
                } catch (e) {
                    console.warn('Supabase delete error:', e);
                }
            }
            
            // Из Redis
            try {
                await fetch(`/api/delete-card?sc=${shortCode}`, { method: 'DELETE' });
            } catch (e) {}
            
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },
    
    // Очистка старых карточек с base64
    cleanupOldCards() {
        try {
            let cleaned = 0;
            for (let key in localStorage) {
                if (key.startsWith('card_card_') || key.startsWith('card_')) {
                    const data = localStorage.getItem(key);
                    if (data && data.length > 100000) {
                        localStorage.removeItem(key);
                        cleaned++;
                    }
                }
            }
            if (cleaned > 0) {
                console.log(`✅ Cleaned ${cleaned} old cards with base64`);
            }
            return cleaned;
        } catch (e) {
            return 0;
        }
    }
};

// Автоочистка при загрузке
cardService.cleanupOldCards();

window.cardService = cardService;
console.log('📦 CardService v5.4 loaded (fixed Supabase field names)');

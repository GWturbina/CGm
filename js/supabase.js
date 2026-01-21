/* =====================================================
   CARDGIFT - SUPABASE CLIENT v4.0
   Обновлено для temp_id/gw_id архитектуры:
   - users: temp_id (PK), gw_id, wallet_address
   - contacts: owner_temp_id, owner_gw_id
   ===================================================== */

const SupabaseClient = {
    url: null,
    key: null,
    client: null,
    
    init(url, key) {
        this.url = url || window.SUPABASE_URL;
        this.key = key || window.SUPABASE_ANON_KEY;
        
        if (!this.url || !this.key) {
            console.warn('⚠️ Supabase not configured');
            return false;
        }
        
        if (typeof supabase !== 'undefined' && supabase.createClient) {
            this.client = supabase.createClient(this.url, this.key);
            console.log('✅ Supabase client initialized');
        }
        
        return true;
    },
    
    // ═══════════════════════════════════════════════════════════
    // УТИЛИТЫ ДЛЯ ID (v4.0)
    // ═══════════════════════════════════════════════════════════
    
    getIdType(id) {
        if (!id) return null;
        if (id.startsWith('GW') || /^\d{7,9}$/.test(id)) return 'gw';
        if (id.startsWith('CG_TEMP_')) return 'temp';
        return 'unknown';
    },
    
    normalizeGwId(id) {
        if (!id) return null;
        if (id.startsWith('GW')) return id;
        if (/^\d{7,9}$/.test(id)) return 'GW' + id;
        return id;
    },
    
    // ═══════════════════════════════════════════════════════════
    // USERS (v4.0: temp_id + gw_id)
    // ═══════════════════════════════════════════════════════════
    
    async getUserByWallet(walletAddress) {
        const wallet = walletAddress.toLowerCase();
        
        if (this.client) {
            try {
                const { data, error } = await this.client
                    .from('users')
                    .select('*')
                    .eq('wallet_address', wallet)
                    .limit(1);
                
                if (error) {
                    console.warn('getUserByWallet error:', error);
                    return null;
                }
                return data?.[0] || null;
            } catch (e) {
                console.warn('getUserByWallet exception:', e);
                return null;
            }
        }
        return null;
    },
    
    async getUserByTempId(tempId) {
        if (!this.client) return null;
        
        try {
            const { data, error } = await this.client
                .from('users')
                .select('*')
                .eq('temp_id', tempId)
                .limit(1);
            
            if (error) {
                console.warn('getUserByTempId error:', error);
                return null;
            }
            return data?.[0] || null;
        } catch (e) {
            console.warn('getUserByTempId exception:', e);
            return null;
        }
    },
    
    async getUserByGwId(gwId) {
        if (!this.client) return null;
        
        const normalizedId = this.normalizeGwId(gwId);
        
        try {
            const { data, error } = await this.client
                .from('users')
                .select('*')
                .eq('gw_id', normalizedId)
                .limit(1);
            
            if (error) {
                console.warn('getUserByGwId error:', error);
                return null;
            }
            return data?.[0] || null;
        } catch (e) {
            console.warn('getUserByGwId exception:', e);
            return null;
        }
    },
    
    // Legacy: для совместимости
    async getUserByCgId(cgId) {
        const idType = this.getIdType(cgId);
        if (idType === 'gw') return this.getUserByGwId(cgId);
        if (idType === 'temp') return this.getUserByTempId(cgId);
        
        // Fallback: пробуем как gw_id
        return this.getUserByGwId(cgId);
    },
    
    async findUserByContact(messenger, contact) {
        if (this.client) {
            const { data } = await this.client
                .from('users')
                .select('*')
                .eq('messenger', messenger)
                .ilike('contact', contact)
                .limit(1);
            return data?.[0] || null;
        }
        return null;
    },
    
    async createUser(userData) {
        // v4.0: используем temp_id как PK
        const data = {
            temp_id: userData.temp_id,
            gw_id: userData.gw_id || null,
            name: userData.name,
            messenger: userData.messenger || userData.contact_type || userData.platform,
            contact: userData.contact || userData.contact_value,
            push_consent: userData.push_consent ?? userData.pushConsent ?? false,
            language: userData.language || 'ru',
            referrer_temp_id: userData.referrer_temp_id || null,
            referrer_gw_id: userData.referrer_gw_id || null,
            source_card_id: userData.source_card_id,
            wallet_address: userData.wallet_address?.toLowerCase() || null,
            gw_level: userData.gw_level || 0
        };
        
        if (!data.temp_id) {
            data.temp_id = 'CG_TEMP_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
        }
        
        if (this.client) {
            const { data: result, error } = await this.client
                .from('users')
                .insert(data)
                .select()
                .single();
            
            if (error) throw error;
            return result;
        }
        return null;
    },
    
    async updateUser(userId, updates) {
        if (!this.client) return null;
        
        const idType = this.getIdType(userId);
        const idField = idType === 'gw' ? 'gw_id' : 'temp_id';
        const normalizedId = idType === 'gw' ? this.normalizeGwId(userId) : userId;
        
        const allowedFields = [
            'name', 'messenger', 'contact', 'push_consent', 'language',
            'referrer_temp_id', 'referrer_gw_id', 'source_card_id', 'wallet_address',
            'gw_id', 'gw_level', 'gw_registered', 'last_active_at'
        ];
        
        const filtered = {};
        for (const field of allowedFields) {
            if (updates[field] !== undefined) {
                filtered[field] = updates[field];
            }
        }
        
        if (filtered.wallet_address) {
            filtered.wallet_address = filtered.wallet_address.toLowerCase();
        }
        
        const { data, error } = await this.client
            .from('users')
            .update(filtered)
            .eq(idField, normalizedId)
            .select();
        
        if (error) throw error;
        return data;
    },
    
    // ═══════════════════════════════════════════════════════════
    // CONTACTS (v4.0: owner_temp_id + owner_gw_id)
    // ═══════════════════════════════════════════════════════════
    
    async getContacts(ownerId, platform = null) {
        if (!this.client) return [];
        
        const idType = this.getIdType(ownerId);
        const ownerField = idType === 'gw' ? 'owner_gw_id' : 'owner_temp_id';
        const normalizedId = idType === 'gw' ? this.normalizeGwId(ownerId) : ownerId;
        
        let query = this.client
            .from('contacts')
            .select('*')
            .eq(ownerField, normalizedId)
            .neq('status', 'archived')
            .order('created_at', { ascending: false });
        
        if (platform) {
            query = query.eq('messenger', platform);
        }
        
        const { data, error } = await query;
        if (error) throw error;
        return data || [];
    },
    
    async addContact(contactData) {
        if (!this.client) return null;
        
        // Определяем тип ID владельца
        const ownerId = contactData.owner_id || contactData.owner_temp_id || contactData.owner_gw_id;
        const idType = this.getIdType(ownerId);
        
        const data = {
            owner_temp_id: idType === 'temp' ? ownerId : (contactData.owner_temp_id || null),
            owner_gw_id: idType === 'gw' ? this.normalizeGwId(ownerId) : (contactData.owner_gw_id || null),
            name: contactData.name,
            messenger: contactData.messenger || contactData.platform,
            contact: contactData.contact,
            push_consent: contactData.push_consent ?? false,
            source: contactData.source || 'manual',
            source_card_id: contactData.source_card_id || null,
            status: contactData.status || 'new'
        };
        
        const { data: result, error } = await this.client
            .from('contacts')
            .insert(data)
            .select()
            .single();
        
        if (error) {
            if (error.code === '23505') {
                return { error: 'duplicate' };
            }
            throw error;
        }
        return result;
    },
    
    async updateContact(contactId, updates) {
        if (this.client) {
            const { data, error } = await this.client
                .from('contacts')
                .update(updates)
                .eq('id', contactId)
                .select()
                .single();
            
            if (error) throw error;
            return data;
        }
        return null;
    },
    
    async deleteContact(contactId) {
        return await this.updateContact(contactId, { status: 'archived' });
    },
    
    async contactExists(ownerId, messenger, contact) {
        if (!this.client) return false;
        
        const idType = this.getIdType(ownerId);
        const ownerField = idType === 'gw' ? 'owner_gw_id' : 'owner_temp_id';
        const normalizedId = idType === 'gw' ? this.normalizeGwId(ownerId) : ownerId;
        
        const { count } = await this.client
            .from('contacts')
            .select('*', { count: 'exact', head: true })
            .eq(ownerField, normalizedId)
            .eq('messenger', messenger)
            .ilike('contact', contact);
        
        return (count || 0) > 0;
    },
    
    // ═══════════════════════════════════════════════════════════
    // CARDS (v4.0: owner_temp_id + owner_gw_id)
    // ═══════════════════════════════════════════════════════════
    
    async getCards(ownerId, limit = 50) {
        if (!this.client) return [];
        
        const idType = this.getIdType(ownerId);
        const ownerField = idType === 'gw' ? 'owner_gw_id' : 'owner_temp_id';
        const normalizedId = idType === 'gw' ? this.normalizeGwId(ownerId) : ownerId;
        
        const { data, error } = await this.client
            .from('cards')
            .select('*')
            .eq(ownerField, normalizedId)
            .order('created_at', { ascending: false })
            .limit(limit);
        
        if (error) throw error;
        return data || [];
    },
    
    async saveCard(cardData) {
        if (!this.client) return null;
        
        const ownerId = cardData.owner_id || cardData.userId;
        const idType = this.getIdType(ownerId);
        
        const data = {
            owner_temp_id: idType === 'temp' ? ownerId : (cardData.owner_temp_id || null),
            owner_gw_id: idType === 'gw' ? this.normalizeGwId(ownerId) : (cardData.owner_gw_id || null),
            card_code: cardData.card_code || cardData.shortCode,
            title: cardData.title,
            message: cardData.message || cardData.greeting,
            template_id: cardData.template_id || cardData.style,
            image_url: cardData.image_url || cardData.mediaUrl
        };
        
        const { data: result, error } = await this.client
            .from('cards')
            .upsert(data, { onConflict: 'card_code' })
            .select()
            .single();
        
        if (error) throw error;
        return result;
    },
    
    async getCardByCode(cardCode) {
        if (this.client) {
            const { data } = await this.client
                .from('cards')
                .select('*')
                .eq('card_code', cardCode)
                .single();
            return data;
        }
        return null;
    },
    
    // ═══════════════════════════════════════════════════════════
    // REFERRALS (v4.0)
    // ═══════════════════════════════════════════════════════════
    
    async getReferrals(userId) {
        if (!this.client) return [];
        
        const idType = this.getIdType(userId);
        const referrerField = idType === 'gw' ? 'referrer_gw_id' : 'referrer_temp_id';
        const normalizedId = idType === 'gw' ? this.normalizeGwId(userId) : userId;
        
        const { data, error } = await this.client
            .from('users')
            .select('temp_id, gw_id, name, messenger, contact, gw_level, created_at')
            .eq(referrerField, normalizedId)
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        return data || [];
    },
    
    // ═══════════════════════════════════════════════════════════
    // STATISTICS (v4.0)
    // ═══════════════════════════════════════════════════════════
    
    async getStats(userId) {
        const stats = { contacts: 0, referrals: 0, activeReferrals: 0, cards: 0 };
        
        if (!this.client || !userId) return stats;
        
        const idType = this.getIdType(userId);
        const ownerField = idType === 'gw' ? 'owner_gw_id' : 'owner_temp_id';
        const referrerField = idType === 'gw' ? 'referrer_gw_id' : 'referrer_temp_id';
        const normalizedId = idType === 'gw' ? this.normalizeGwId(userId) : userId;
        
        try {
            // Контакты
            const { count: contactsCount } = await this.client
                .from('contacts')
                .select('*', { count: 'exact', head: true })
                .eq(ownerField, normalizedId)
                .neq('status', 'archived');
            stats.contacts = contactsCount || 0;
            
            // Рефералы
            const { count: referralsCount } = await this.client
                .from('users')
                .select('*', { count: 'exact', head: true })
                .eq(referrerField, normalizedId);
            stats.referrals = referralsCount || 0;
            
            // Активные рефералы
            try {
                const { count: activeCount } = await this.client
                    .from('users')
                    .select('*', { count: 'exact', head: true })
                    .eq(referrerField, normalizedId)
                    .gt('gw_level', 0);
                stats.activeReferrals = activeCount || 0;
            } catch (e) {
                stats.activeReferrals = 0;
            }
            
            // Карточки
            const { count: cardsCount } = await this.client
                .from('cards')
                .select('*', { count: 'exact', head: true })
                .eq(ownerField, normalizedId);
            stats.cards = cardsCount || 0;
        } catch (e) {
            console.warn('Stats error:', e);
        }
        
        return stats;
    }
};

window.SupabaseClient = SupabaseClient;

// Автоматическая инициализация
(function() {
    const url = window.SUPABASE_URL;
    const key = window.SUPABASE_ANON_KEY;
    
    if (url && key) {
        SupabaseClient.url = url;
        SupabaseClient.key = key;
        
        // Немедленная попытка
        if (typeof supabase !== 'undefined' && supabase.createClient) {
            SupabaseClient.client = supabase.createClient(url, key);
            console.log('✅ Supabase client initialized');
        } else {
            // Повторные попытки
            let attempts = 0;
            const tryInit = () => {
                attempts++;
                if (!SupabaseClient.client && typeof supabase !== 'undefined' && supabase.createClient) {
                    SupabaseClient.client = supabase.createClient(url, key);
                    console.log(`✅ Supabase client initialized (attempt ${attempts})`);
                } else if (attempts < 10) {
                    setTimeout(tryInit, 500);
                } else {
                    console.warn('⚠️ Supabase client could not be initialized after 10 attempts');
                }
            };
            setTimeout(tryInit, 500);
        }
    }
})();

console.log('📦 SupabaseClient v4.0 loaded (temp_id + gw_id architecture)');

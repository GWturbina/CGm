/**
 * ═══════════════════════════════════════════════════════════
 * CONTACTS SERVICE v5.0
 * 
 * НОВАЯ АРХИТЕКТУРА:
 * - owner_temp_id / owner_gw_id вместо owner_cg_id
 * - referrer_temp_id / referrer_gw_id вместо referrer_cg_id
 * - Поддержка обоих типов ID
 * - updateContact и deleteContact методы
 * 
 * ═══════════════════════════════════════════════════════════
 */

const ContactsService = {
    
    // Главные аккаунты
    ROOT_GW_ID: 'GW9729645',
    FOUNDERS: ['GW7346221', 'GW1514866'],
    
    // ═══════════════════════════════════════════════════════════
    // УТИЛИТЫ ДЛЯ РАБОТЫ С ID
    // ═══════════════════════════════════════════════════════════
    
    /**
     * Определяет тип ID
     */
    getIdType(id) {
        if (!id) return null;
        if (id.startsWith('GW') || /^\d{7,9}$/.test(id)) return 'gw';
        if (id.startsWith('CG_TEMP_')) return 'temp';
        return 'unknown';
    },
    
    /**
     * Нормализует GW ID (добавляет префикс если нужно)
     */
    normalizeGwId(id) {
        if (!id) return null;
        if (id.startsWith('GW')) return id;
        if (/^\d{7,9}$/.test(id)) return 'GW' + id;
        return id;
    },
    
    /**
     * Получить текущий ID пользователя
     */
    getCurrentUserId() {
        // Приоритет: window → localStorage
        if (window.currentDisplayId) return window.currentDisplayId;
        if (window.currentGwId) return window.currentGwId;
        if (window.currentTempId) return window.currentTempId;
        
        return localStorage.getItem('cardgift_display_id')
            || localStorage.getItem('cardgift_gw_id')
            || localStorage.getItem('cardgift_temp_id')
            || null;
    },
    
    // ═══════════════════════════════════════════════════════════
    // ПОЛУЧЕНИЕ КОНТАКТОВ
    // ═══════════════════════════════════════════════════════════
    
    /**
     * Получить все контакты владельца
     * @param {string} ownerId - temp_id или gw_id
     */
    async getContacts(ownerId, options = {}) {
        const { status = null, platform = null, limit = 100, offset = 0 } = options;
        
        if (!ownerId) {
            console.warn('⚠️ ContactsService.getContacts: No owner ID provided');
            return [];
        }
        
        const idType = this.getIdType(ownerId);
        console.log('📋 getContacts for:', ownerId, 'type:', idType);
        
        if (!window.SupabaseClient || !SupabaseClient.client) {
            return this.getContactsFromLocalStorage(ownerId, options);
        }
        
        try {
            let query = SupabaseClient.client
                .from('contacts')
                .select('*');
            
            // Фильтр по типу ID
            if (idType === 'gw') {
                // Ищем как с префиксом GW так и без него
                const rawId = ownerId.replace(/^GW/i, '');
                const gwId = 'GW' + rawId;
                query = query.or(`owner_gw_id.eq.${rawId},owner_gw_id.eq.${gwId}`);
            } else if (idType === 'temp') {
                query = query.eq('owner_temp_id', ownerId);
            } else {
                // Пробуем оба варианта
                query = query.or(`owner_gw_id.eq.${ownerId},owner_temp_id.eq.${ownerId}`);
            }
            
            // Статус
            if (status) {
                query = query.eq('status', status);
            } else {
                query = query.neq('status', 'archived');
            }
            
            // Платформа
            if (platform) {
                query = query.eq('messenger', platform);
            }
            
            query = query.order('created_at', { ascending: false })
                         .range(offset, offset + limit - 1);
            
            const { data, error } = await query;
            
            if (error) {
                console.warn('❌ Contacts query error:', error);
                return [];
            }
            
            console.log('✅ Contacts loaded:', data?.length || 0);
            return data || [];
            
        } catch (e) {
            console.error('ContactsService.getContacts error:', e);
            return [];
        }
    },
    
    /**
     * Fallback - получение из localStorage
     */
    getContactsFromLocalStorage(ownerId, options = {}) {
        const { status = null, platform = null, limit = 100, offset = 0 } = options;
        
        const contactsKey = `cardgift_contacts_${ownerId}`;
        let contacts = JSON.parse(localStorage.getItem(contactsKey) || '[]');
        
        if (status) {
            contacts = contacts.filter(c => c.status === status);
        } else {
            contacts = contacts.filter(c => c.status !== 'archived');
        }
        
        if (platform) {
            contacts = contacts.filter(c => c.messenger === platform || c.platform === platform);
        }
        
        return contacts.slice(offset, offset + limit);
    },
    
    // ═══════════════════════════════════════════════════════════
    // ПОЛУЧЕНИЕ РЕФЕРАЛОВ
    // ═══════════════════════════════════════════════════════════
    
    /**
     * Получить рефералов пользователя
     */
    async getReferrals(userId) {
        if (!userId) return [];
        
        const idType = this.getIdType(userId);
        console.log('📋 getReferrals for:', userId, 'type:', idType);
        
        if (!window.SupabaseClient || !SupabaseClient.client) {
            return [];
        }
        
        try {
            let query = SupabaseClient.client
                .from('users')
                .select('temp_id, gw_id, name, messenger, contact, gw_level, wallet_address, created_at');
            
            if (idType === 'gw') {
                // Ищем по обоим вариантам ID (с GW и без)
                const rawId = userId.replace(/^GW/i, '');
                const gwId = 'GW' + rawId;
                query = query.or(`referrer_gw_id.eq.${rawId},referrer_gw_id.eq.${gwId}`);
            } else if (idType === 'temp') {
                query = query.eq('referrer_temp_id', userId);
            } else {
                query = query.or(`referrer_gw_id.eq.${userId},referrer_temp_id.eq.${userId}`);
            }
            
            query = query.order('created_at', { ascending: false });
            
            const { data, error } = await query;
            
            if (error) {
                console.warn('❌ Referrals query error:', error);
                return [];
            }
            
            console.log('✅ Referrals loaded:', data?.length || 0);
            return data || [];
            
        } catch (e) {
            console.error('ContactsService.getReferrals error:', e);
            return [];
        }
    },
    
    // ═══════════════════════════════════════════════════════════
    // СТАТИСТИКА
    // ═══════════════════════════════════════════════════════════
    
    /**
     * Получить статистику контактов и рефералов
     */
    async getStats(userId) {
        const stats = {
            totalContacts: 0,
            totalReferrals: 0,
            activeReferrals: 0,
            contactsThisMonth: 0,
            byPlatform: {}
        };
        
        if (!userId) return stats;
        
        const idType = this.getIdType(userId);
        
        if (!window.SupabaseClient || !SupabaseClient.client) {
            return stats;
        }
        
        try {
            // Определяем поле для фильтра
            const ownerField = 'owner_gw_id';
            const rawId = userId.replace(/^GW/i, '');
            const gwId = 'GW' + rawId;
            
            // Всего контактов (ищем по обоим вариантам ID)
            const { count: contactsCount } = await SupabaseClient.client
                .from('contacts')
                .select('*', { count: 'exact', head: true })
                .or(`owner_gw_id.eq.${rawId},owner_gw_id.eq.${gwId}`)
                .neq('status', 'archived');
            
            stats.totalContacts = contactsCount || 0;
            
            // По платформам
            const { data: contacts } = await SupabaseClient.client
                .from('contacts')
                .select('messenger')
                .or(`owner_gw_id.eq.${rawId},owner_gw_id.eq.${gwId}`)
                .neq('status', 'archived');
            
            if (contacts) {
                contacts.forEach(c => {
                    const p = c.messenger;
                    if (p) stats.byPlatform[p] = (stats.byPlatform[p] || 0) + 1;
                });
            }
            
            // Рефералы (ищем по обоим вариантам ID)
            const { count: referralsCount } = await SupabaseClient.client
                .from('users')
                .select('*', { count: 'exact', head: true })
                .or(`referrer_gw_id.eq.${rawId},referrer_gw_id.eq.${gwId}`);
            
            stats.totalReferrals = referralsCount || 0;
            
            // Активные рефералы (с уровнем > 0)
            const { count: activeCount } = await SupabaseClient.client
                .from('users')
                .select('*', { count: 'exact', head: true })
                .or(`referrer_gw_id.eq.${rawId},referrer_gw_id.eq.${gwId}`)
                .gt('gw_level', 0);
            
            stats.activeReferrals = activeCount || 0;
            
            // За этот месяц
            const startOfMonth = new Date();
            startOfMonth.setDate(1);
            startOfMonth.setHours(0, 0, 0, 0);
            
            const { count: monthCount } = await SupabaseClient.client
                .from('contacts')
                .select('*', { count: 'exact', head: true })
                .or(`owner_gw_id.eq.${rawId},owner_gw_id.eq.${gwId}`)
                .gte('created_at', startOfMonth.toISOString());
            
            stats.contactsThisMonth = monthCount || 0;
            
            console.log('📊 Stats loaded:', stats);
            return stats;
            
        } catch (e) {
            console.error('ContactsService.getStats error:', e);
            return stats;
        }
    },
    
    // ═══════════════════════════════════════════════════════════
    // ДОБАВЛЕНИЕ КОНТАКТОВ
    // ═══════════════════════════════════════════════════════════
    
    /**
     * Добавить контакт
     */
    async addContact(ownerId, contactData) {
        console.log('📝 addContact to:', ownerId, contactData);
        
        if (!ownerId) {
            return { success: false, error: 'No owner ID' };
        }
        
        const idType = this.getIdType(ownerId);
        console.log('📋 ID type:', idType);
        
        // Формируем данные для вставки (только существующие колонки)
        const insertData = {
            owner_temp_id: idType === 'temp' ? ownerId : null,
            owner_gw_id: idType === 'gw' ? this.normalizeGwId(ownerId) : null,
            name: contactData.name,
            messenger: contactData.messenger || contactData.platform,
            contact: contactData.contact,
            source: contactData.source || 'manual',
            status: 'new',
            push_consent: contactData.push_consent || false
        };
        
        console.log('📋 Insert data:', insertData);
        
        if (!window.SupabaseClient || !SupabaseClient.client) {
            return this.addContactToLocalStorage(ownerId, insertData);
        }
        
        try {
            const { data, error } = await SupabaseClient.client
                .from('contacts')
                .insert(insertData)
                .select()
                .single();
            
            if (error) {
                // Дубликат
                if (error.code === '23505') {
                    console.log('⚠️ Contact already exists');
                    return { success: true, duplicate: true };
                }
                console.error('❌ Insert error:', error);
                throw error;
            }
            
            console.log('✅ Contact added:', data.id);
            return { success: true, data };
            
        } catch (e) {
            console.error('addContact error:', e);
            return { success: false, error: e.message };
        }
    },
    
    /**
     * Fallback - добавление в localStorage
     */
    addContactToLocalStorage(ownerId, contactData) {
        const contactsKey = `cardgift_contacts_${ownerId}`;
        const contacts = JSON.parse(localStorage.getItem(contactsKey) || '[]');
        
        // Проверка дубликата
        const exists = contacts.some(c => 
            c.messenger === contactData.messenger && 
            c.contact?.toLowerCase() === contactData.contact?.toLowerCase()
        );
        
        if (exists) {
            return { success: true, duplicate: true };
        }
        
        contacts.unshift({
            ...contactData,
            id: 'local_' + Date.now()
        });
        
        localStorage.setItem(contactsKey, JSON.stringify(contacts));
        return { success: true };
    },
    
    // ═══════════════════════════════════════════════════════════
    // ОБНОВЛЕНИЕ И УДАЛЕНИЕ
    // ═══════════════════════════════════════════════════════════
    
    /**
     * Обновить статус контакта
     */
    async updateStatus(contactId, status) {
        if (!window.SupabaseClient || !SupabaseClient.client) {
            return false;
        }
        
        try {
            const { error } = await SupabaseClient.client
                .from('contacts')
                .update({ status })
                .eq('id', contactId);
            
            if (error) throw error;
            return true;
            
        } catch (e) {
            console.error('updateStatus error:', e);
            return false;
        }
    },
    
    /**
     * Архивировать контакт
     */
    async archiveContact(contactId) {
        return await this.updateStatus(contactId, 'archived');
    },
    
    /**
     * Полное обновление контакта
     */
    async updateContact(contactId, updateData) {
        console.log('📝 updateContact:', contactId, updateData);
        
        if (!contactId) {
            console.error('No contact ID provided');
            return false;
        }
        
        if (!window.SupabaseClient || !SupabaseClient.client) {
            console.warn('Supabase not available, updating locally');
            return false;
        }
        
        try {
            // Только поля которые есть в таблице contacts
            const { error } = await SupabaseClient.client
                .from('contacts')
                .update({
                    name: updateData.name,
                    messenger: updateData.messenger || updateData.platform,
                    contact: updateData.contact,
                    push_consent: updateData.push_consent
                })
                .eq('id', contactId);
            
            if (error) throw error;
            console.log('✅ Contact updated:', contactId);
            return true;
            
        } catch (e) {
            console.error('updateContact error:', e);
            return false;
        }
    },
    
    /**
     * Удаление контакта
     */
    async deleteContact(contactId) {
        console.log('🗑️ deleteContact:', contactId);
        
        if (!contactId) {
            console.error('No contact ID provided');
            return false;
        }
        
        if (!window.SupabaseClient || !SupabaseClient.client) {
            console.warn('Supabase not available');
            return false;
        }
        
        try {
            const { error } = await SupabaseClient.client
                .from('contacts')
                .delete()
                .eq('id', contactId);
            
            if (error) throw error;
            console.log('✅ Contact deleted:', contactId);
            return true;
            
        } catch (e) {
            console.error('deleteContact error:', e);
            return false;
        }
    },
    
    /**
     * Проверить существование контакта
     */
    async contactExists(ownerId, messenger, contact) {
        if (!ownerId || !messenger || !contact) return false;
        
        const idType = this.getIdType(ownerId);
        
        if (!window.SupabaseClient || !SupabaseClient.client) {
            return false;
        }
        
        try {
            const rawId = ownerId.replace(/^GW/i, '');
            const gwId = 'GW' + rawId;
            
            const { count } = await SupabaseClient.client
                .from('contacts')
                .select('*', { count: 'exact', head: true })
                .or(`owner_gw_id.eq.${rawId},owner_gw_id.eq.${gwId}`)
                .eq('messenger', messenger)
                .ilike('contact', contact);
            
            return (count || 0) > 0;
            
        } catch (e) {
            console.warn('contactExists error:', e);
            return false;
        }
    },
    
    // ═══════════════════════════════════════════════════════════
    // РАСПРЕДЕЛЕНИЕ ПО ИЕРАРХИИ
    // ═══════════════════════════════════════════════════════════
    
    /**
     * Добавить контакт с распространением вверх по структуре
     */
    async addContactWithHierarchy(ownerId, contactData, maxLevels = 10) {
        console.log('📤 addContactWithHierarchy to:', ownerId);
        
        const results = { owner: null, upline: [] };
        
        // 1. Владельцу
        results.owner = await this.addContact(ownerId, contactData);
        
        if (!results.owner.success && !results.owner.duplicate) {
            return results;
        }
        
        // 2. Вверх по структуре
        let currentId = ownerId;
        let level = 0;
        
        while (currentId && level < maxLevels) {
            const referrer = await this.getReferrerId(currentId);
            
            if (!referrer || referrer === currentId) break;
            
            // Проверяем существование
            const exists = await this.contactExists(
                referrer, 
                contactData.messenger || contactData.platform, 
                contactData.contact
            );
            
            if (exists) {
                console.log(`⏭️ Contact exists at level ${level}, stopping`);
                break;
            }
            
            // Добавляем
            const result = await this.addContact(referrer, {
                ...contactData,
                source: `via:${ownerId}`
            });
            
            results.upline.push({ id: referrer, level: level + 1, result });
            
            currentId = referrer;
            level++;
        }
        
        console.log(`✅ Contact distributed to ${results.upline.length + 1} levels`);
        return results;
    },
    
    /**
     * Получить ID реферера
     */
    async getReferrerId(userId) {
        if (!userId) return null;
        
        const idType = this.getIdType(userId);
        
        if (!window.SupabaseClient || !SupabaseClient.client) {
            return null;
        }
        
        try {
            let query = SupabaseClient.client
                .from('users')
                .select('referrer_gw_id, referrer_temp_id');
            
            if (idType === 'gw') {
                query = query.eq('gw_id', this.normalizeGwId(userId));
            } else if (idType === 'temp') {
                query = query.eq('temp_id', userId);
            } else {
                return null;
            }
            
            const { data, error } = await query.limit(1);
            
            if (error || !data || data.length === 0) return null;
            
            // Приоритет: gw_id
            return data[0].referrer_gw_id || data[0].referrer_temp_id;
            
        } catch (e) {
            console.warn('getReferrerId error:', e);
            return null;
        }
    },
    
    // ═══════════════════════════════════════════════════════════
    // ФОРМАТИРОВАНИЕ ДЛЯ DASHBOARD
    // ═══════════════════════════════════════════════════════════
    
    /**
     * Получить контакты для таблицы
     */
    async getContactsForTable(ownerId, options = {}) {
        const contacts = await this.getContacts(ownerId, options);
        
        return contacts.map(c => ({
            id: c.id,
            name: c.name,
            platform: c.messenger,
            contact: c.contact,
            source: c.source,
            status: c.status,
            date: c.created_at ? new Date(c.created_at).toLocaleDateString() : '',
            createdAt: c.created_at
        }));
    },
    
    /**
     * Получить рефералов для таблицы
     */
    async getReferralsForTable(userId) {
        const referrals = await this.getReferrals(userId);
        
        return referrals.map(r => ({
            id: r.gw_id || r.temp_id,
            name: r.name,
            platform: r.messenger,
            contact: r.contact,
            level: r.gw_level || 0,
            wallet: r.wallet_address,
            date: r.created_at ? new Date(r.created_at).toLocaleDateString() : '',
            createdAt: r.created_at
        }));
    },
    
    // ═══════════════════════════════════════════════════════════
    // УТИЛИТЫ
    // ═══════════════════════════════════════════════════════════
    
    getPlatformIcon(platform) {
        const icons = {
            telegram: '📱', whatsapp: '💬', viber: '💜', email: '📧',
            instagram: '📷', facebook: '👤', tiktok: '🎵', twitter: '🐦'
        };
        return icons[platform] || '📋';
    },
    
    getPlatformName(platform) {
        const names = {
            telegram: 'Telegram', whatsapp: 'WhatsApp', viber: 'Viber', email: 'Email',
            instagram: 'Instagram', facebook: 'Facebook', tiktok: 'TikTok', twitter: 'Twitter/X'
        };
        return names[platform] || platform;
    }
};

window.ContactsService = ContactsService;
console.log('✅ ContactsService v4.0 loaded (temp_id + gw_id architecture)');

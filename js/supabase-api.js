/* =====================================================
   CARDGIFT - SUPABASE API HELPER
   v1.0 - Работа с базой данных
   ===================================================== */

// Конфигурация берётся из window (config.js / common.js)
// window.SUPABASE_URL и window.SUPABASE_ANON_KEY

// Инициализация клиента
let supabaseClient = null;

function initSupabase(url, key) {
    if (supabaseClient) return supabaseClient;
    
    // Берём ключи из параметров или из window
    const supabaseUrl = url || window.SUPABASE_URL;
    const supabaseKey = key || window.SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
        console.error('❌ Supabase: URL или KEY не найдены!');
        return null;
    }
    
    if (window.supabase) {
        supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);
        console.log('✅ Supabase API initialized');
    }
    
    return supabaseClient;
}

// ═══════════════════════════════════════════════════════════
// USERS API
// ═══════════════════════════════════════════════════════════

const UsersAPI = {
    
    /**
     * Регистрация нового пользователя
     * @param {object} data - { name, contact_type, contact_value, referrer_cg_id }
     * @returns {object} - { success, user, error }
     */
    async register(data) {
        const supabase = initSupabase();
        if (!supabase) return { success: false, error: 'Supabase not initialized' };
        
        try {
            // Генерируем CG_ID
            const { data: cgIdResult, error: cgIdError } = await supabase
                .rpc('generate_cg_id');
            
            if (cgIdError) throw cgIdError;
            
            const cg_id = cgIdResult;
            
            // Создаём пользователя
            const { data: user, error } = await supabase
                .from('users')
                .insert({
                    cg_id: cg_id,
                    name: data.name,
                    contact_type: data.contact_type,
                    contact_value: data.contact_value,
                    referrer_cg_id: data.referrer_cg_id || null,
                    push_consent: data.push_consent || false,
                    language: data.language || 'ru'
                })
                .select()
                .single();
            
            if (error) throw error;
            
            console.log('✅ User registered:', cg_id);
            return { success: true, user: user };
            
        } catch (error) {
            console.error('Registration error:', error);
            return { success: false, error: error.message };
        }
    },
    
    /**
     * Получить пользователя по CG_ID
     */
    async getByCgId(cg_id) {
        const supabase = initSupabase();
        if (!supabase) return null;
        
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('cg_id', cg_id)
            .single();
        
        if (error) {
            console.error('Get user error:', error);
            return null;
        }
        
        return data;
    },
    
    /**
     * Получить пользователя по адресу кошелька
     */
    async getByWallet(walletAddress) {
        const supabase = initSupabase();
        if (!supabase) return null;
        
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('wallet_address', walletAddress.toLowerCase())
            .single();
        
        if (error && error.code !== 'PGRST116') { // PGRST116 = not found
            console.error('Get user by wallet error:', error);
        }
        
        return data || null;
    },
    
    /**
     * Привязать кошелёк к пользователю
     */
    async linkWallet(cg_id, walletAddress) {
        const supabase = initSupabase();
        if (!supabase) return { success: false, error: 'Supabase not initialized' };
        
        const { data, error } = await supabase
            .from('users')
            .update({ 
                wallet_address: walletAddress.toLowerCase(),
                last_activity: new Date().toISOString()
            })
            .eq('cg_id', cg_id)
            .select()
            .single();
        
        if (error) {
            console.error('Link wallet error:', error);
            return { success: false, error: error.message };
        }
        
        return { success: true, user: data };
    },
    
    /**
     * Обновить данные GlobalWay
     */
    async updateGlobalWayData(cg_id, gwData) {
        const supabase = initSupabase();
        if (!supabase) return { success: false, error: 'Supabase not initialized' };
        
        const { data, error } = await supabase
            .from('users')
            .update({
                gw_id: gwData.gw_id,
                gw_level: gwData.gw_level,
                gw_registered: true,
                gw_registered_at: gwData.gw_registered_at || new Date().toISOString(),
                gw_wallet_linked: true,
                last_activity: new Date().toISOString()
            })
            .eq('cg_id', cg_id)
            .select()
            .single();
        
        if (error) {
            console.error('Update GW data error:', error);
            return { success: false, error: error.message };
        }
        
        return { success: true, user: data };
    },
    
    /**
     * Обновить уровень GlobalWay
     */
    async updateLevel(cg_id, level) {
        const supabase = initSupabase();
        if (!supabase) return { success: false, error: 'Supabase not initialized' };
        
        const { data, error } = await supabase
            .from('users')
            .update({ 
                gw_level: level,
                last_activity: new Date().toISOString()
            })
            .eq('cg_id', cg_id)
            .select()
            .single();
        
        if (error) {
            console.error('Update level error:', error);
            return { success: false, error: error.message };
        }
        
        return { success: true, user: data };
    },
    
    /**
     * Получить рандомного спонсора из пула
     */
    getRandomSponsor() {
        const randomSponsors = ['GW7346221', 'GW1514866'];
        return randomSponsors[Math.floor(Math.random() * randomSponsors.length)];
    },
    
    /**
     * Найти GW спонсора с компрессией
     */
    async findGwSponsor(cg_id) {
        const supabase = initSupabase();
        if (!supabase) return this.getRandomSponsor();
        
        const { data, error } = await supabase
            .rpc('find_gw_sponsor', { user_cg_id_param: cg_id });
        
        if (error) {
            console.error('Find GW sponsor error:', error);
            return this.getRandomSponsor();
        }
        
        return data || this.getRandomSponsor();
    },
    
    /**
     * Получить рефералов пользователя
     */
    async getReferrals(cg_id, depth = 1) {
        const supabase = initSupabase();
        if (!supabase) return [];
        
        const { data, error } = await supabase
            .from('referral_tree')
            .select(`
                user_cg_id,
                depth,
                users!referral_tree_user_cg_id_fkey (
                    cg_id,
                    name,
                    gw_level,
                    created_at
                )
            `)
            .eq('ancestor_cg_id', cg_id)
            .lte('depth', depth)
            .order('depth', { ascending: true });
        
        if (error) {
            console.error('Get referrals error:', error);
            return [];
        }
        
        return data || [];
    },
    
    /**
     * Получить статистику команды
     */
    async getTeamStats(cg_id) {
        const supabase = initSupabase();
        if (!supabase) return null;
        
        const { data, error } = await supabase
            .from('referral_tree')
            .select('depth')
            .eq('ancestor_cg_id', cg_id);
        
        if (error) {
            console.error('Get team stats error:', error);
            return null;
        }
        
        // Подсчёт по уровням
        const stats = {
            total: data.length,
            byLevel: {}
        };
        
        data.forEach(row => {
            stats.byLevel[row.depth] = (stats.byLevel[row.depth] || 0) + 1;
        });
        
        return stats;
    }
};

// ═══════════════════════════════════════════════════════════
// CONTACTS API
// ═══════════════════════════════════════════════════════════

const ContactsAPI = {
    
    /**
     * Получить все контакты пользователя
     */
    async getAll(owner_cg_id) {
        const supabase = initSupabase();
        if (!supabase) return [];
        
        const { data, error } = await supabase
            .from('contacts')
            .select('*')
            .eq('owner_cg_id', owner_cg_id)
            .eq('status', 'active')
            .order('created_at', { ascending: false });
        
        if (error) {
            console.error('Get contacts error:', error);
            return [];
        }
        
        return data || [];
    },
    
    /**
     * Добавить контакт
     */
    async add(owner_cg_id, contact) {
        const supabase = initSupabase();
        if (!supabase) return { success: false, error: 'Supabase not initialized' };
        
        const { data, error } = await supabase
            .from('contacts')
            .insert({
                owner_cg_id: owner_cg_id,
                name: contact.name,
                contact_type: contact.contact_type,
                contact_value: contact.contact_value,
                notes: contact.notes || null,
                tags: contact.tags || null,
                source: contact.source || 'manual'
            })
            .select()
            .single();
        
        if (error) {
            console.error('Add contact error:', error);
            return { success: false, error: error.message };
        }
        
        return { success: true, contact: data };
    },
    
    /**
     * Обновить контакт
     */
    async update(id, updates) {
        const supabase = initSupabase();
        if (!supabase) return { success: false, error: 'Supabase not initialized' };
        
        const { data, error } = await supabase
            .from('contacts')
            .update(updates)
            .eq('id', id)
            .select()
            .single();
        
        if (error) {
            console.error('Update contact error:', error);
            return { success: false, error: error.message };
        }
        
        return { success: true, contact: data };
    },
    
    /**
     * Удалить контакт (мягкое удаление)
     */
    async delete(id) {
        const supabase = initSupabase();
        if (!supabase) return { success: false, error: 'Supabase not initialized' };
        
        const { error } = await supabase
            .from('contacts')
            .update({ status: 'archived' })
            .eq('id', id);
        
        if (error) {
            console.error('Delete contact error:', error);
            return { success: false, error: error.message };
        }
        
        return { success: true };
    },
    
    /**
     * Импорт контактов
     */
    async import(owner_cg_id, contacts) {
        const supabase = initSupabase();
        if (!supabase) return { success: false, error: 'Supabase not initialized' };
        
        const contactsToInsert = contacts.map(c => ({
            owner_cg_id: owner_cg_id,
            name: c.name,
            contact_type: c.contact_type || 'other',
            contact_value: c.contact_value,
            source: 'import'
        }));
        
        const { data, error } = await supabase
            .from('contacts')
            .insert(contactsToInsert)
            .select();
        
        if (error) {
            console.error('Import contacts error:', error);
            return { success: false, error: error.message };
        }
        
        return { success: true, imported: data.length };
    }
};

// ═══════════════════════════════════════════════════════════
// CARDS API
// ═══════════════════════════════════════════════════════════

const CardsAPI = {
    
    /**
     * Получить все открытки пользователя
     */
    async getAll(owner_cg_id) {
        const supabase = initSupabase();
        if (!supabase) return [];
        
        const { data, error } = await supabase
            .from('cards')
            .select('*')
            .eq('owner_cg_id', owner_cg_id)
            .eq('status', 'active')
            .order('created_at', { ascending: false });
        
        if (error) {
            console.error('Get cards error:', error);
            return [];
        }
        
        return data || [];
    },
    
    /**
     * Сохранить открытку
     */
    async save(owner_cg_id, card) {
        const supabase = initSupabase();
        if (!supabase) return { success: false, error: 'Supabase not initialized' };
        
        // Генерируем уникальный код
        const card_code = 'CRD' + Date.now().toString(36).toUpperCase();
        
        const { data, error } = await supabase
            .from('cards')
            .insert({
                owner_cg_id: owner_cg_id,
                card_code: card_code,
                title: card.title,
                message: card.message,
                template_id: card.template_id,
                image_url: card.image_url,
                referral_cg_id: card.referral_cg_id || owner_cg_id
            })
            .select()
            .single();
        
        if (error) {
            console.error('Save card error:', error);
            return { success: false, error: error.message };
        }
        
        // Обновляем счётчик
        await supabase
            .from('users')
            .update({ cards_created: supabase.rpc('increment', { x: 1 }) })
            .eq('cg_id', owner_cg_id);
        
        return { success: true, card: data };
    },
    
    /**
     * Получить открытку по коду
     */
    async getByCode(card_code) {
        const supabase = initSupabase();
        if (!supabase) return null;
        
        const { data, error } = await supabase
            .from('cards')
            .select('*')
            .eq('card_code', card_code)
            .single();
        
        if (error) {
            console.error('Get card error:', error);
            return null;
        }
        
        return data;
    },
    
    /**
     * Записать просмотр открытки
     */
    async recordView(card_code, viewerData = {}) {
        const supabase = initSupabase();
        if (!supabase) return;
        
        // Записываем просмотр
        await supabase
            .from('card_views')
            .insert({
                card_code: card_code,
                viewer_cg_id: viewerData.viewer_cg_id || null,
                referrer_url: viewerData.referrer || null,
                action: viewerData.action || 'view'
            });
        
        // Увеличиваем счётчик
        await supabase
            .from('cards')
            .update({ views_count: supabase.rpc('increment', { x: 1 }) })
            .eq('card_code', card_code);
    },
    
    /**
     * Удалить открытку
     */
    async delete(id) {
        const supabase = initSupabase();
        if (!supabase) return { success: false, error: 'Supabase not initialized' };
        
        const { error } = await supabase
            .from('cards')
            .update({ status: 'archived' })
            .eq('id', id);
        
        if (error) {
            console.error('Delete card error:', error);
            return { success: false, error: error.message };
        }
        
        return { success: true };
    }
};

// ═══════════════════════════════════════════════════════════
// ПОЛНЫЙ FLOW РЕГИСТРАЦИИ С GLOBALWAY
// ═══════════════════════════════════════════════════════════

/**
 * Полная регистрация пользователя с интеграцией GlobalWay
 */
async function registerUserWithGlobalWay(userData, walletAddress, onStatus) {
    onStatus = onStatus || function() {};
    
    try {
        // 1. Регистрация в CardGift
        onStatus('Регистрация в CardGift...');
        const regResult = await UsersAPI.register(userData);
        
        if (!regResult.success) {
            throw new Error('Ошибка регистрации: ' + regResult.error);
        }
        
        const cg_id = regResult.user.cg_id;
        console.log('✅ CardGift ID:', cg_id);
        
        // 2. Привязка кошелька
        if (walletAddress) {
            onStatus('Привязка кошелька...');
            await UsersAPI.linkWallet(cg_id, walletAddress);
        }
        
        // 3. Проверка регистрации в GlobalWay
        if (walletAddress && window.GlobalWayBridge) {
            onStatus('Проверка GlobalWay...');
            const isRegistered = await GlobalWayBridge.isRegisteredInGlobalWay(walletAddress);
            
            if (isRegistered) {
                // Уже зарегистрирован - получаем данные
                const gw_id = await GlobalWayBridge.getGlobalWayId(walletAddress);
                const gw_level = await GlobalWayBridge.getUserLevel(walletAddress);
                
                await UsersAPI.updateGlobalWayData(cg_id, {
                    gw_id: gw_id,
                    gw_level: gw_level
                });
                
                console.log('✅ GlobalWay data synced:', gw_id, 'level:', gw_level);
            }
        }
        
        onStatus('Готово!');
        return { success: true, cg_id: cg_id, user: regResult.user };
        
    } catch (error) {
        console.error('Registration error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Активация уровня с автоматической регистрацией в GlobalWay
 */
async function activateLevelWithRegistration(cg_id, walletAddress, level, onStatus) {
    onStatus = onStatus || function() {};
    
    try {
        // 1. Проверяем регистрацию в GlobalWay
        onStatus('Проверка регистрации...');
        const isRegistered = await GlobalWayBridge.isRegisteredInGlobalWay(walletAddress);
        
        // 2. Если не зарегистрирован - регистрируем
        if (!isRegistered) {
            onStatus('Поиск спонсора...');
            const sponsorGwId = await UsersAPI.findGwSponsor(cg_id);
            const sponsorNumericId = GlobalWayBridge.parseGwId(sponsorGwId);
            
            onStatus('Регистрация в GlobalWay...');
            const regResult = await GlobalWayBridge.registerInGlobalWay(sponsorNumericId);
            
            if (!regResult.success) {
                throw new Error('Ошибка регистрации в GlobalWay: ' + regResult.error);
            }
            
            // Ждём подтверждения
            onStatus('Ожидание подтверждения...');
            await new Promise(r => setTimeout(r, 3000));
            
            // Получаем новый GW ID
            const newGwId = await GlobalWayBridge.getGlobalWayId(walletAddress);
            
            await UsersAPI.updateGlobalWayData(cg_id, {
                gw_id: newGwId,
                gw_level: 0
            });
        }
        
        // 3. Активируем уровень
        onStatus(`Активация уровня ${level}...`);
        const activateResult = await GlobalWayBridge.activateLevel(level);
        
        if (!activateResult.success) {
            throw new Error('Ошибка активации: ' + activateResult.error);
        }
        
        // 4. Обновляем уровень в базе
        await UsersAPI.updateLevel(cg_id, level);
        
        onStatus('Готово!');
        return { success: true, txHash: activateResult.txHash };
        
    } catch (error) {
        console.error('Activation error:', error);
        return { success: false, error: error.message };
    }
}

// ═══════════════════════════════════════════════════════════
// ЭКСПОРТ
// ═══════════════════════════════════════════════════════════

window.initSupabase = initSupabase;
window.UsersAPI = UsersAPI;
window.ContactsAPI = ContactsAPI;
window.CardsAPI = CardsAPI;
window.registerUserWithGlobalWay = registerUserWithGlobalWay;
window.activateLevelWithRegistration = activateLevelWithRegistration;

console.log('📦 Supabase API Helper loaded');

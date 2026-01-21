// /api/viral-registration.js
// v6.0 - ИСПРАВЛЕНО: owner_gw_id с префиксом GW для совместимости с Dashboard

module.exports = async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;
    
    if (!SUPABASE_URL || !SUPABASE_KEY) {
        return res.status(500).json({ error: 'Database not configured' });
    }
    
    try {
        const { referrerId, name, messenger, contact, cardId } = req.body;
        
        console.log('📝 Viral registration:', { referrerId, name, messenger });
        
        if (!name || !messenger || !contact) {
            return res.status(400).json({ error: 'Missing fields' });
        }
        
        // 1. ГЕНЕРИРУЕМ TEMP ID
        const tempId = 'CG_TEMP_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
        
        // 2. НОРМАЛИЗУЕМ REFERRER ID → owner_gw_id
        // ВСЕ ID должны быть с префиксом GW для Dashboard!
        let ownerGwId = null;
        let ownerTempId = null;
        
        if (referrerId) {
            if (referrerId.startsWith('CG_TEMP_') || referrerId.startsWith('CG_')) {
                // Это temp ID — ищем владельца вверх по цепочке
                ownerTempId = referrerId;
                ownerGwId = await findOwnerGwId(SUPABASE_URL, SUPABASE_KEY, referrerId);
            } else if (referrerId.startsWith('GW')) {
                // Уже с префиксом GW
                ownerGwId = referrerId;
            } else if (/^\d+$/.test(referrerId)) {
                // Просто число — добавляем GW
                ownerGwId = 'GW' + referrerId;
            } else {
                // Неизвестный формат — пробуем как есть с GW
                ownerGwId = 'GW' + referrerId.replace(/\D/g, '');
            }
        }
        
        console.log('👤 Owner resolved:', { ownerGwId, ownerTempId, original: referrerId });
        
        // 3. СОХРАНЯЕМ В CONTACTS
        // ⚠️ ВАЖНО: owner_gw_id ДОЛЖЕН быть с префиксом GW!
        const contactData = {
            name: name,
            messenger: messenger,
            contact: contact,
            cg_id: tempId,
            source: 'viral',
            status: 'new',
            // ✅ ВСЕ поля с правильным форматом GW:
            owner_gw_id: ownerGwId,              // "GW9729645" - для Dashboard
            owner_temp_id: ownerTempId,
            referral_gw_id: ownerGwId,           // "GW9729645" - дублируем для совместимости
            referral_temp_id: referrerId,
            viral_card_id: cardId || null,
            viral_temp_id: tempId,
            created_at: new Date().toISOString()
        };
        
        console.log('💾 Saving contact:', contactData);
        
        const response = await fetch(`${SUPABASE_URL}/rest/v1/contacts`, {
            method: 'POST',
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
            },
            body: JSON.stringify(contactData)
        });
        
        const text = await response.text();
        console.log('📡 Contacts response:', response.status);
        
        if (!response.ok) {
            console.error('❌ Supabase contacts error:', text);
        }
        
        let savedContact;
        try { savedContact = JSON.parse(text); } catch(e) { savedContact = []; }
        
        // 4. СОХРАНЯЕМ В USERS (для реферальной цепочки)
        try {
            const userData = {
                temp_id: tempId,
                name: name,
                messenger: messenger,
                contact: contact,
                referrer_temp_id: ownerTempId || referrerId,
                referrer_gw_id: ownerGwId,
                source: 'viral',
                viral_card_id: cardId,
                created_at: new Date().toISOString()
            };
            
            await fetch(`${SUPABASE_URL}/rest/v1/users`, {
                method: 'POST',
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': `Bearer ${SUPABASE_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(userData)
            });
            console.log('✅ User created');
        } catch(e) {
            console.warn('⚠️ Users insert error:', e.message);
        }
        
        // 5. УВЕЛИЧИВАЕМ viral_count ВЛАДЕЛЬЦА
        if (ownerGwId) {
            try {
                // Ищем по gw_id (с GW или без)
                const gwIdNum = ownerGwId.replace('GW', '');
                
                const userRes = await fetch(
                    `${SUPABASE_URL}/rest/v1/users?or=(gw_id.eq.${ownerGwId},gw_id.eq.${gwIdNum})&select=id,viral_count`,
                    { headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` } }
                );
                
                if (userRes.ok) {
                    const users = await userRes.json();
                    if (users && users[0]) {
                        const newCount = (users[0].viral_count || 0) + 1;
                        await fetch(`${SUPABASE_URL}/rest/v1/users?id=eq.${users[0].id}`, {
                            method: 'PATCH',
                            headers: {
                                'apikey': SUPABASE_KEY,
                                'Authorization': `Bearer ${SUPABASE_KEY}`,
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({ viral_count: newCount })
                        });
                        console.log('✅ viral_count:', newCount);
                    }
                }
            } catch(e) {
                console.warn('⚠️ Count update error:', e.message);
            }
        }
        
        // 6. ОТВЕТ
        return res.status(200).json({ 
            success: true,
            tempId: tempId,
            contactId: savedContact[0]?.id,
            ownerId: ownerGwId
        });
        
    } catch (error) {
        console.error('❌ Error:', error);
        return res.status(200).json({ 
            success: true,
            tempId: 'CG_TEMP_' + Date.now(),
            error: error.message
        });
    }
};

// Поиск GW ID владельца вверх по цепочке
async function findOwnerGwId(url, key, tempId, depth = 0) {
    if (depth > 10) return null;
    
    try {
        // Сначала в contacts
        let res = await fetch(
            `${url}/rest/v1/contacts?cg_id=eq.${encodeURIComponent(tempId)}&select=owner_gw_id,referral_gw_id,referral_temp_id`,
            { headers: { 'apikey': key, 'Authorization': `Bearer ${key}` } }
        );
        
        if (res.ok) {
            const data = await res.json();
            if (data[0]) {
                // Нормализуем с GW
                if (data[0].owner_gw_id) {
                    return data[0].owner_gw_id.startsWith('GW') 
                        ? data[0].owner_gw_id 
                        : 'GW' + data[0].owner_gw_id;
                }
                if (data[0].referral_gw_id) {
                    return data[0].referral_gw_id.startsWith('GW')
                        ? data[0].referral_gw_id
                        : 'GW' + data[0].referral_gw_id;
                }
                if (data[0].referral_temp_id) {
                    return findOwnerGwId(url, key, data[0].referral_temp_id, depth + 1);
                }
            }
        }
        
        // Потом в users
        res = await fetch(
            `${url}/rest/v1/users?temp_id=eq.${encodeURIComponent(tempId)}&select=gw_id,referrer_gw_id,referrer_temp_id`,
            { headers: { 'apikey': key, 'Authorization': `Bearer ${key}` } }
        );
        
        if (res.ok) {
            const data = await res.json();
            if (data[0]) {
                if (data[0].gw_id) {
                    return data[0].gw_id.startsWith('GW') ? data[0].gw_id : 'GW' + data[0].gw_id;
                }
                if (data[0].referrer_gw_id) {
                    return data[0].referrer_gw_id.startsWith('GW') 
                        ? data[0].referrer_gw_id 
                        : 'GW' + data[0].referrer_gw_id;
                }
                if (data[0].referrer_temp_id) {
                    return findOwnerGwId(url, key, data[0].referrer_temp_id, depth + 1);
                }
            }
        }
    } catch(e) {
        console.warn('Chain search error:', e.message);
    }
    
    return null;
}

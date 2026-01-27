// api/ai/credits.js
// API для управления кредитами AI Studio v2.0
// Простая система: текст бесплатно, 3 картинки, 3 голоса

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://imgpysvdosdsqucoghqa.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

// DEV кошельки - безлимит
const DEV_WALLETS = [
    '0xa3496cacc8523421dd151f1d92a456c2dafa28c2',
    '0x7bcd1753868895971e12448412cb3216d47884c8'
];

// Начальные бесплатные лимиты (lifetime)
const FREE_LIMITS = {
    text: 999999,  // Текст бесплатно неограниченно (Groq)
    image: 3,      // 3 картинки бесплатно
    voice: 3       // 3 голоса бесплатно
};

export default async function handler(req, res) {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    const { action } = req.query;
    
    try {
        switch (action) {
            case 'get':
                return await getCredits(req, res);
            case 'check':
                return await checkCredits(req, res);
            case 'use':
                return await useCredits(req, res);
            case 'init':
                return await initCredits(req, res);
            case 'add':
                return await addCredits(req, res);
            default:
                return res.status(400).json({ error: 'Invalid action. Use: get, check, use, init, add' });
        }
    } catch (error) {
        console.error('Credits API error:', error);
        return res.status(500).json({ error: error.message });
    }
}

// ═══════════════════════════════════════════════════════════
// ПОЛУЧИТЬ БАЛАНС
// ═══════════════════════════════════════════════════════════

async function getCredits(req, res) {
    const { wallet } = req.query;
    
    if (!wallet) {
        return res.status(400).json({ error: 'Wallet required' });
    }
    
    const walletLower = wallet.toLowerCase();
    
    // DEV кошельки - безлимит
    if (DEV_WALLETS.includes(walletLower)) {
        return res.status(200).json({
            wallet: walletLower,
            text: { used: 0, limit: 999999, remaining: 999999 },
            image: { used: 0, limit: 999999, remaining: 999999 },
            voice: { used: 0, limit: 999999, remaining: 999999 },
            extraCredits: 999999,
            isUnlimited: true
        });
    }
    
    // Получаем из Supabase
    const data = await supabaseSelect('ai_credits', `wallet_address=eq.${walletLower}`);
    
    if (!data || data.length === 0) {
        // Автоматически создаём запись
        await createCreditsRecord(walletLower);
        
        return res.status(200).json({
            wallet: walletLower,
            text: { used: 0, limit: FREE_LIMITS.text, remaining: FREE_LIMITS.text },
            image: { used: 0, limit: FREE_LIMITS.image, remaining: FREE_LIMITS.image },
            voice: { used: 0, limit: FREE_LIMITS.voice, remaining: FREE_LIMITS.voice },
            extraCredits: 0,
            isNew: true
        });
    }
    
    const record = data[0];
    
    return res.status(200).json({
        wallet: walletLower,
        text: { 
            used: record.text_used || 0, 
            limit: FREE_LIMITS.text, 
            remaining: FREE_LIMITS.text  // Текст всегда бесплатно
        },
        image: { 
            used: record.image_used || 0, 
            limit: FREE_LIMITS.image + (record.extra_credits || 0), 
            remaining: Math.max(0, FREE_LIMITS.image + (record.extra_credits || 0) - (record.image_used || 0))
        },
        voice: { 
            used: record.voice_used || 0, 
            limit: FREE_LIMITS.voice + (record.extra_credits || 0), 
            remaining: Math.max(0, FREE_LIMITS.voice + (record.extra_credits || 0) - (record.voice_used || 0))
        },
        extraCredits: record.extra_credits || 0
    });
}

// ═══════════════════════════════════════════════════════════
// ПРОВЕРИТЬ МОЖНО ЛИ ИСПОЛЬЗОВАТЬ
// ═══════════════════════════════════════════════════════════

async function checkCredits(req, res) {
    const { wallet, type } = req.query;
    
    if (!wallet || !type) {
        return res.status(400).json({ error: 'Wallet and type required' });
    }
    
    const walletLower = wallet.toLowerCase();
    
    // DEV - всегда можно
    if (DEV_WALLETS.includes(walletLower)) {
        return res.status(200).json({ canUse: true, isUnlimited: true });
    }
    
    // Текст - всегда бесплатно
    if (type === 'text') {
        return res.status(200).json({ canUse: true, isFree: true });
    }
    
    // Получаем запись
    const data = await supabaseSelect('ai_credits', `wallet_address=eq.${walletLower}`);
    
    if (!data || data.length === 0) {
        // Нет записи - создаём и разрешаем (первые 3 бесплатно)
        await createCreditsRecord(walletLower);
        return res.status(200).json({ canUse: true, remaining: FREE_LIMITS[type] });
    }
    
    const record = data[0];
    const used = record[`${type}_used`] || 0;
    const freeLimit = FREE_LIMITS[type] || 0;
    const extraCredits = record.extra_credits || 0;
    const totalLimit = freeLimit + extraCredits;
    
    const canUse = used < totalLimit;
    const remaining = Math.max(0, totalLimit - used);
    
    return res.status(200).json({ 
        canUse, 
        remaining,
        used,
        limit: totalLimit,
        needCredits: !canUse
    });
}

// ═══════════════════════════════════════════════════════════
// ИСПОЛЬЗОВАТЬ КРЕДИТ
// ═══════════════════════════════════════════════════════════

async function useCredits(req, res) {
    const { wallet, type } = req.body;
    
    if (!wallet || !type) {
        return res.status(400).json({ error: 'Wallet and type required' });
    }
    
    const walletLower = wallet.toLowerCase();
    
    // DEV - не списываем
    if (DEV_WALLETS.includes(walletLower)) {
        return res.status(200).json({ success: true, isUnlimited: true });
    }
    
    // Текст - не списываем (бесплатно), просто считаем
    if (type === 'text') {
        await incrementUsage(walletLower, 'text_used');
        return res.status(200).json({ success: true, isFree: true });
    }
    
    // Получаем текущий баланс
    let data = await supabaseSelect('ai_credits', `wallet_address=eq.${walletLower}`);
    
    if (!data || data.length === 0) {
        await createCreditsRecord(walletLower);
        data = await supabaseSelect('ai_credits', `wallet_address=eq.${walletLower}`);
    }
    
    const record = data[0];
    const usedField = `${type}_used`;
    const used = record[usedField] || 0;
    const freeLimit = FREE_LIMITS[type] || 0;
    const extraCredits = record.extra_credits || 0;
    const totalLimit = freeLimit + extraCredits;
    
    // Проверяем лимит
    if (used >= totalLimit) {
        return res.status(400).json({ 
            error: 'Лимит исчерпан. Нужны дополнительные кредиты.',
            used,
            limit: totalLimit,
            needCredits: true
        });
    }
    
    // Списываем
    const updateData = {};
    updateData[usedField] = used + 1;
    updateData.updated_at = new Date().toISOString();
    
    // Если превысили бесплатный лимит - списываем из extra_credits
    if (used >= freeLimit && extraCredits > 0) {
        updateData.extra_credits = extraCredits - 1;
    }
    
    await supabaseUpdate('ai_credits', `wallet_address=eq.${walletLower}`, updateData);
    
    const newUsed = used + 1;
    const remaining = Math.max(0, totalLimit - newUsed);
    
    return res.status(200).json({
        success: true,
        type,
        used: newUsed,
        remaining,
        limit: totalLimit
    });
}

// ═══════════════════════════════════════════════════════════
// ИНИЦИАЛИЗАЦИЯ (при первом входе)
// ═══════════════════════════════════════════════════════════

async function initCredits(req, res) {
    const { wallet } = req.body;
    
    if (!wallet) {
        return res.status(400).json({ error: 'Wallet required' });
    }
    
    const walletLower = wallet.toLowerCase();
    
    // Проверяем существует ли
    const existing = await supabaseSelect('ai_credits', `wallet_address=eq.${walletLower}`);
    
    if (existing && existing.length > 0) {
        return res.status(200).json({ 
            success: true, 
            message: 'Already initialized',
            ...formatCreditsResponse(existing[0])
        });
    }
    
    // Создаём новую запись
    await createCreditsRecord(walletLower);
    
    return res.status(200).json({
        success: true,
        message: 'Credits initialized',
        text: { used: 0, limit: FREE_LIMITS.text, remaining: FREE_LIMITS.text },
        image: { used: 0, limit: FREE_LIMITS.image, remaining: FREE_LIMITS.image },
        voice: { used: 0, limit: FREE_LIMITS.voice, remaining: FREE_LIMITS.voice },
        extraCredits: 0
    });
}

// ═══════════════════════════════════════════════════════════
// ДОБАВИТЬ КРЕДИТЫ (админ или покупка)
// ═══════════════════════════════════════════════════════════

async function addCredits(req, res) {
    const { wallet, amount, adminWallet } = req.body;
    
    if (!wallet || !amount) {
        return res.status(400).json({ error: 'Wallet and amount required' });
    }
    
    // Проверяем что это админ
    if (!adminWallet || !DEV_WALLETS.includes(adminWallet.toLowerCase())) {
        return res.status(403).json({ error: 'Admin access required' });
    }
    
    const walletLower = wallet.toLowerCase();
    const addAmount = parseInt(amount);
    
    // Получаем текущий баланс
    const data = await supabaseSelect('ai_credits', `wallet_address=eq.${walletLower}`);
    
    if (!data || data.length === 0) {
        // Создаём запись с бонусом
        await createCreditsRecord(walletLower, addAmount);
        return res.status(200).json({
            success: true,
            wallet: walletLower,
            extraCredits: addAmount,
            added: addAmount
        });
    }
    
    const record = data[0];
    const newExtra = (record.extra_credits || 0) + addAmount;
    
    await supabaseUpdate('ai_credits', `wallet_address=eq.${walletLower}`, {
        extra_credits: newExtra,
        updated_at: new Date().toISOString()
    });
    
    return res.status(200).json({
        success: true,
        wallet: walletLower,
        extraCredits: newExtra,
        added: addAmount
    });
}

// ═══════════════════════════════════════════════════════════
// СПИСОК ПОЛЬЗОВАТЕЛЕЙ (для админки)
// ═══════════════════════════════════════════════════════════

async function listUsers(req, res) {
    const { adminWallet } = req.query;
    
    if (!adminWallet || !DEV_WALLETS.includes(adminWallet.toLowerCase())) {
        return res.status(403).json({ error: 'Admin access required' });
    }
    
    const response = await fetch(
        `${SUPABASE_URL}/rest/v1/ai_credits?order=created_at.desc&limit=100`,
        {
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`
            }
        }
    );
    
    const data = await response.json();
    
    return res.status(200).json({ 
        success: true, 
        users: data || [] 
    });
}

// ═══════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════

async function createCreditsRecord(wallet, extraCredits = 0) {
    const record = {
        wallet_address: wallet,
        text_used: 0,
        image_used: 0,
        voice_used: 0,
        extra_credits: extraCredits,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    };
    
    await supabaseInsert('ai_credits', record);
    return record;
}

async function incrementUsage(wallet, field) {
    const data = await supabaseSelect('ai_credits', `wallet_address=eq.${wallet}`);
    if (data && data.length > 0) {
        const current = data[0][field] || 0;
        await supabaseUpdate('ai_credits', `wallet_address=eq.${wallet}`, {
            [field]: current + 1,
            updated_at: new Date().toISOString()
        });
    }
}

function formatCreditsResponse(record) {
    return {
        text: { 
            used: record.text_used || 0, 
            limit: FREE_LIMITS.text, 
            remaining: FREE_LIMITS.text 
        },
        image: { 
            used: record.image_used || 0, 
            limit: FREE_LIMITS.image + (record.extra_credits || 0), 
            remaining: Math.max(0, FREE_LIMITS.image + (record.extra_credits || 0) - (record.image_used || 0))
        },
        voice: { 
            used: record.voice_used || 0, 
            limit: FREE_LIMITS.voice + (record.extra_credits || 0), 
            remaining: Math.max(0, FREE_LIMITS.voice + (record.extra_credits || 0) - (record.voice_used || 0))
        },
        extraCredits: record.extra_credits || 0
    };
}

// ═══════════════════════════════════════════════════════════
// SUPABASE HELPERS
// ═══════════════════════════════════════════════════════════

async function supabaseSelect(table, filter) {
    const response = await fetch(
        `${SUPABASE_URL}/rest/v1/${table}?${filter}`,
        {
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`
            }
        }
    );
    return response.json();
}

async function supabaseInsert(table, data) {
    const response = await fetch(
        `${SUPABASE_URL}/rest/v1/${table}`,
        {
            method: 'POST',
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=minimal'
            },
            body: JSON.stringify(data)
        }
    );
    return response.ok;
}

async function supabaseUpdate(table, filter, data) {
    const response = await fetch(
        `${SUPABASE_URL}/rest/v1/${table}?${filter}`,
        {
            method: 'PATCH',
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=minimal'
            },
            body: JSON.stringify(data)
        }
    );
    return response.ok;
}

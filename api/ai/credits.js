// api/ai/credits.js
// API для управления кредитами AI Studio

const SUPABASE_URL = 'https://imgpysvdosdsqucoghqa.supabase.co';
const SUPABASE_KEY = 'sb_publishable_9I_ZSzpYB4wLXmPZ1hhIcQ_xUIPlR4D';

// Дневные лимиты по уровням
const DAILY_LIMITS = {
    0: 0,    // Нет доступа
    1: 3,    // Trial
    2: 3,
    3: 3,
    4: 3,
    5: 3,
    6: 3,
    7: 10,   // Полный доступ
    8: 15,
    9: 25,
    10: 35,
    11: 50,
    12: 75
};

// DEV кошельки - безлимит
const DEV_WALLETS = [
    '0xa3496cacc8523421dd151f1d92a456c2dafa28c2',
    '0x7bcd1753868895971e12448412cb3216d47884c8',
    '0x03284a899147f5a07f82c622f34df92198671635'  // Owner контракта GlobalWay
];

module.exports = async function handler(req, res) {
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
            case 'use':
                return await useCredits(req, res);
            case 'add':
                return await addCredits(req, res);
            case 'init':
                return await initCredits(req, res);
            case 'list':
                return await listAllCredits(req, res);
            default:
                return res.status(400).json({ error: 'Invalid action' });
        }
    } catch (error) {
        console.error('Credits API error:', error);
        return res.status(500).json({ error: error.message });
    }
};

// Получить баланс кредитов
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
            balance: 999999,
            usedToday: 0,
            dailyLimit: 999999,
            isUnlimited: true,
            isBlocked: false
        });
    }
    
    // Получаем из Supabase
    const response = await fetch(
        `${SUPABASE_URL}/rest/v1/ai_credits?wallet_address=eq.${walletLower}`,
        {
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`
            }
        }
    );
    
    const data = await response.json();
    
    if (!data || data.length === 0) {
        return res.status(200).json({
            wallet: walletLower,
            balance: 0,
            usedToday: 0,
            dailyLimit: 0,
            isUnlimited: false,
            isBlocked: false,
            needsInit: true
        });
    }
    
    const record = data[0];
    
    // Проверяем сброс дневного лимита
    const today = new Date().toISOString().split('T')[0];
    let usedToday = record.credits_used_today;
    
    if (record.last_reset_date !== today) {
        // Сбрасываем счётчик
        usedToday = 0;
        await resetDailyCounter(walletLower, today);
    }
    
    return res.status(200).json({
        wallet: walletLower,
        balance: record.credits_balance,
        usedToday: usedToday,
        dailyLimit: record.daily_limit,
        isUnlimited: false,
        isBlocked: record.is_blocked
    });
}

// Инициализировать кредиты для нового пользователя
async function initCredits(req, res) {
    const { wallet, level } = req.body;
    
    if (!wallet) {
        return res.status(400).json({ error: 'Wallet required' });
    }
    
    const walletLower = wallet.toLowerCase();
    const userLevel = parseInt(level) || 0;
    const dailyLimit = DAILY_LIMITS[userLevel] || 0;
    
    // Начальный бонус
    let initialBonus = 0;
    if (userLevel >= 7) initialBonus = 10;
    if (userLevel >= 8) initialBonus = 20;
    
    // Проверяем существует ли запись
    const checkResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/ai_credits?wallet_address=eq.${walletLower}`,
        {
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`
            }
        }
    );
    
    const existing = await checkResponse.json();
    
    if (existing && existing.length > 0) {
        // Обновляем daily_limit если уровень изменился
        await fetch(
            `${SUPABASE_URL}/rest/v1/ai_credits?wallet_address=eq.${walletLower}`,
            {
                method: 'PATCH',
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': `Bearer ${SUPABASE_KEY}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=minimal'
                },
                body: JSON.stringify({
                    daily_limit: dailyLimit,
                    updated_at: new Date().toISOString()
                })
            }
        );
        
        return res.status(200).json({ 
            success: true, 
            message: 'Credits updated',
            dailyLimit 
        });
    }
    
    // Создаём новую запись
    const response = await fetch(
        `${SUPABASE_URL}/rest/v1/ai_credits`,
        {
            method: 'POST',
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=minimal'
            },
            body: JSON.stringify({
                wallet_address: walletLower,
                credits_balance: initialBonus,
                credits_used_today: 0,
                daily_limit: dailyLimit,
                last_reset_date: new Date().toISOString().split('T')[0],
                total_earned: initialBonus,
                total_purchased: 0,
                is_blocked: false
            })
        }
    );
    
    if (!response.ok) {
        const err = await response.text();
        throw new Error(err);
    }
    
    return res.status(200).json({ 
        success: true, 
        message: 'Credits initialized',
        balance: initialBonus,
        dailyLimit 
    });
}

// Использовать кредиты
async function useCredits(req, res) {
    const { wallet, amount, type } = req.body;
    
    if (!wallet || !amount) {
        return res.status(400).json({ error: 'Wallet and amount required' });
    }
    
    const walletLower = wallet.toLowerCase();
    const useAmount = parseInt(amount) || 1;
    
    // DEV кошельки - не списываем
    if (DEV_WALLETS.includes(walletLower)) {
        return res.status(200).json({ 
            success: true, 
            remaining: 999999,
            isUnlimited: true 
        });
    }
    
    // Получаем текущий баланс
    const response = await fetch(
        `${SUPABASE_URL}/rest/v1/ai_credits?wallet_address=eq.${walletLower}`,
        {
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`
            }
        }
    );
    
    const data = await response.json();
    
    if (!data || data.length === 0) {
        return res.status(400).json({ error: 'No credits record found' });
    }
    
    const record = data[0];
    
    // Проверяем блокировку
    if (record.is_blocked) {
        return res.status(403).json({ error: 'Account blocked' });
    }
    
    // Проверяем дневной лимит
    const today = new Date().toISOString().split('T')[0];
    let usedToday = record.credits_used_today;
    
    if (record.last_reset_date !== today) {
        usedToday = 0;
    }
    
    // Сначала проверяем дневной лимит
    if (usedToday + useAmount > record.daily_limit) {
        // Если дневной лимит исчерпан, пробуем использовать из баланса
        if (record.credits_balance < useAmount) {
            return res.status(400).json({ 
                error: 'Insufficient credits',
                usedToday,
                dailyLimit: record.daily_limit,
                balance: record.credits_balance
            });
        }
        
        // Списываем из баланса
        await fetch(
            `${SUPABASE_URL}/rest/v1/ai_credits?wallet_address=eq.${walletLower}`,
            {
                method: 'PATCH',
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': `Bearer ${SUPABASE_KEY}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=minimal'
                },
                body: JSON.stringify({
                    credits_balance: record.credits_balance - useAmount,
                    updated_at: new Date().toISOString()
                })
            }
        );
        
        return res.status(200).json({
            success: true,
            remaining: record.credits_balance - useAmount,
            usedFromBalance: true
        });
    }
    
    // Используем из дневного лимита
    await fetch(
        `${SUPABASE_URL}/rest/v1/ai_credits?wallet_address=eq.${walletLower}`,
        {
            method: 'PATCH',
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=minimal'
            },
            body: JSON.stringify({
                credits_used_today: usedToday + useAmount,
                last_reset_date: today,
                updated_at: new Date().toISOString()
            })
        }
    );
    
    return res.status(200).json({
        success: true,
        usedToday: usedToday + useAmount,
        dailyLimit: record.daily_limit,
        balance: record.credits_balance
    });
}

// Добавить кредиты (админ)
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
    const response = await fetch(
        `${SUPABASE_URL}/rest/v1/ai_credits?wallet_address=eq.${walletLower}`,
        {
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`
            }
        }
    );
    
    const data = await response.json();
    
    if (!data || data.length === 0) {
        return res.status(400).json({ error: 'User not found' });
    }
    
    const record = data[0];
    const newBalance = record.credits_balance + addAmount;
    
    // Обновляем баланс
    await fetch(
        `${SUPABASE_URL}/rest/v1/ai_credits?wallet_address=eq.${walletLower}`,
        {
            method: 'PATCH',
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=minimal'
            },
            body: JSON.stringify({
                credits_balance: newBalance,
                total_earned: record.total_earned + addAmount,
                updated_at: new Date().toISOString()
            })
        }
    );
    
    return res.status(200).json({
        success: true,
        wallet: walletLower,
        newBalance,
        added: addAmount
    });
}

// Список всех пользователей (админ)
async function listAllCredits(req, res) {
    const { adminWallet } = req.query;
    
    // Проверяем что это админ
    if (!adminWallet || !DEV_WALLETS.includes(adminWallet.toLowerCase())) {
        return res.status(403).json({ error: 'Admin access required' });
    }
    
    const response = await fetch(
        `${SUPABASE_URL}/rest/v1/ai_credits?order=created_at.desc`,
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
        users: data,
        total: data.length
    });
}

// Сброс дневного счётчика
async function resetDailyCounter(wallet, today) {
    await fetch(
        `${SUPABASE_URL}/rest/v1/ai_credits?wallet_address=eq.${wallet}`,
        {
            method: 'PATCH',
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=minimal'
            },
            body: JSON.stringify({
                credits_used_today: 0,
                last_reset_date: today,
                updated_at: new Date().toISOString()
            })
        }
    );
}

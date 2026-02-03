// api/ai/voice.js
// ElevenLabs Voice Generation - Extended Version with emotions, speed, languages
// v2.0 - ДОБАВЛЕНА серверная проверка кредитов!

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// DEV кошельки - безлимит
const DEV_WALLETS = [
    '0x7bcd1753868895971e12448412cb3216d47884c8',
    '0x9b49bd9c9458615e11c051afd1ebe983563b67ee',
    '0x03284a899147f5a07f82c622f34df92198671635',
    '0xa3496cacc8523421dd151f1d92a456c2dafa28c2'
];

// Проверка и списание кредита
async function checkAndUseCredit(wallet, type) {
    if (!wallet || !SUPABASE_URL || !SUPABASE_KEY) {
        console.log('⚠️ No wallet or Supabase config - allowing');
        return { allowed: true, reason: 'no_check' };
    }
    
    const walletLower = wallet.toLowerCase();
    
    // DEV кошельки - безлимит
    if (DEV_WALLETS.includes(walletLower)) {
        return { allowed: true, reason: 'dev_wallet' };
    }
    
    try {
        // Получаем запись из ai_credits
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
            // Нет записи - создаём с 3 кредитами
            await createCreditsRecord(walletLower);
            return { allowed: true, reason: 'new_user' };
        }
        
        const record = data[0];
        const today = new Date().toISOString().split('T')[0];
        const field = type === 'image' ? 'image_used' : 'voice_used';
        const limitField = type === 'image' ? 'daily_image_limit' : 'daily_voice_limit';
        
        // Проверяем сброс дневного лимита
        let usedToday = record[field] || 0;
        if (record.last_reset_date !== today) {
            usedToday = 0;
        }
        
        const dailyLimit = record[limitField] || 3;
        
        if (usedToday >= dailyLimit) {
            return { allowed: false, reason: 'limit_exceeded', used: usedToday, limit: dailyLimit };
        }
        
        // Списываем кредит
        const updateData = {
            [field]: usedToday + 1,
            last_reset_date: today,
            updated_at: new Date().toISOString()
        };
        
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
                body: JSON.stringify(updateData)
            }
        );
        
        return { allowed: true, reason: 'credit_used', used: usedToday + 1, limit: dailyLimit };
        
    } catch (e) {
        console.error('Credit check error:', e);
        return { allowed: true, reason: 'error_fallback' };
    }
}

async function createCreditsRecord(wallet) {
    const today = new Date().toISOString().split('T')[0];
    
    await fetch(
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
                wallet_address: wallet,
                text_used: 0,
                image_used: 0,
                voice_used: 0,
                extra_credits: 0,
                daily_image_limit: 3,
                daily_voice_limit: 3,
                last_reset_date: today,
                created_at: new Date().toISOString()
            })
        }
    );
}

module.exports = async function handler(req, res) {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    // GET = диагностика
    if (req.method === 'GET') {
        return res.status(200).json({
            status: 'ok',
            version: '2.1',
            hasElevenLabsKey: !!process.env.ELEVENLABS_API_KEY,
            keyLength: process.env.ELEVENLABS_API_KEY ? process.env.ELEVENLABS_API_KEY.length : 0,
            hasSupabaseUrl: !!SUPABASE_URL,
            hasSupabaseKey: !!SUPABASE_KEY,
            nodeVersion: process.version,
            timestamp: new Date().toISOString()
        });
    }
    
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    
    try {
        const { 
            text, 
            voice = 'adam', 
            language = 'ru',
            emotion = 'neutral',
            speed = 1.0,
            stability = 0.5,
            clarity = 0.75,
            userApiKey,
            wallet
        } = req.body;
        
        if (!text) {
            return res.status(400).json({ error: 'Text required' });
        }
        
        // СЕРВЕРНАЯ ПРОВЕРКА КРЕДИТОВ
        const creditCheck = await checkAndUseCredit(wallet, 'voice');
        if (!creditCheck.allowed) {
            return res.status(403).json({ 
                error: `🎤 Лимит исчерпан! Использовано ${creditCheck.used}/${creditCheck.limit} за сегодня`,
                creditError: true
            });
        }
        
        // Используем ключ пользователя или серверный
        const apiKey = userApiKey || process.env.ELEVENLABS_API_KEY;
        
        // ДИАГНОСТИКА - проверяем наличие ключа
        console.log('🔑 ElevenLabs API key check:', {
            hasUserKey: !!userApiKey,
            hasEnvKey: !!process.env.ELEVENLABS_API_KEY,
            keyLength: apiKey ? apiKey.length : 0,
            keyPrefix: apiKey ? apiKey.substring(0, 5) + '...' : 'NONE'
        });
        
        if (!apiKey) {
            console.error('❌ No ElevenLabs API key found!');
            return res.status(500).json({ error: 'API key not configured' });
        }
        
        // Маппинг голосов ElevenLabs v2.0
        const voiceMap = {
            // 🇺🇦 Украинские мужские
            'artem-klopotenko': 'h9NSQvWZaC4NFusYsxT9',
            'evgeniy-shevchenko': 'Ntd0iVwICtUtA6Fvx27M',
            'yevhen-vasilenko': 'TEyBWD5tAHAWqAGEv6yI',
            'bogdan': 'jn6ifzU1eO5tfUZ2ZJVg',
            'volodymyr': 'B31Kx7rXmNnYqp1QWHR2',
            'roman': 'YNU4vLsch5CerDqxgcFS',
            'anton': '4nLP0u2B3yI0lyzATFnN',
            'leonid-drapei': 'eLDtXX7z65CuLasDRxrP',
            'stanislav-ua': 'WAkiH8uTgFArLLKVWgeS',
            'dosye': 'O1OT3UVaYNvH7ZvGCx5x',
            // 🇺🇦 Украинские женские
            'sofiia': '96XEXOjZRHooATdYA8FY',
            'evelina': '0CH1jv2shWMGGZ3uM0rX',
            'anna-stepanenko': '2o2uQnlGaNuV3ObRpxXt',
            'kristi': 'U4IxWQ3B5B0suleGgLcn',
            'kira': '2HWb7sZSrZqPB8HOI0KI',
            'torri-miles': 'a30ekmfK56EKHR341YaO',
            'alisa': 'KBxO1LTAD4PE7D9rqUeb',
            'mariya-maro': '2OXYbN1uGomXXJtv9Dq6',
            'tonya': 'bg0e02brzo3RVUEbuZeo',
            'alena': 'BEprpS2vpgM32yNJpTXq',
            // 🇷🇺 Русские мужские
            'arthur': 'iYMRkaJMA0qIuY9moBHL',
            'leonid': 'UIaC9QMb6UP5hfzy6uOD',
            'stanislav': 'ogi2DyUAKJb7CEdqqvlU',
            'alex-t': 'tVMeJ1ODl31s5JrEseFK',
            'nester-surovy': 'pM78bgjPVk0JXtaEnFoj',
            'alex-bell': 'TUQNWEvVPBLzMBSVDPUA',
            'alexander': 'bqbHGIIO5oETYIqhWmfk',
            'alexandr-vlasov': 'txnCCHHGKmYIwrn7HfHQ',
            'arcad': 'kuR1PV7xDOsP38QMSEvD',
            'dmitry': 'vnUSJFFoxRr5JFjw51pu',
            // 🇷🇺 Русские женские
            'rina': 'ycbyWsnf4hqZgdpKHqiU',
            'sweetie-fox': 'foZmP0ldhGob3fHgegm1',
            'ariana': 'xyu8HSCv1JYrhLx4m8UG',
            'daria-reels': 'grmBv5c5ZJVFgXpRWyp7',
            'nina': 'N8lIVPsFkvOoqev5Csxo',
            'alina': 'dVRDrbP5ULGXB94se4KZ',
            'vika-grib': 'gelrownZgbRhxH6LI78J',
            'mariia': 'EDpEYNf6XIeKYRzYcx4I',
            'natalia': 'dHAwRJVaEPhU907QLTPW',
            'liza': 'KzqxCy7zSSePwgb1Cz0Q',
            // 🇬🇧 Английские
            'adam': 'pNInz6obpgDQGcFmaJgB',
            'antoni': 'ErXwobaYiN019PkySvjV',
            'arnold': 'VR6AewLTigWG4xSOukaG',
            'josh': 'TxGEqnHWrfWFTfGW9XjX',
            'sam': 'yoZ06aMxZJJ28mfd3POQ',
            'rachel': '21m00Tcm4TlvDq8ikWAM',
            'domi': 'AZnzlk1XvdvUeBnXmlld',
            'bella': 'EXAVITQu4vr4xnSDxMaL',
            'elli': 'MF3mGyEYCl7XYWbV9V6O',
            // Обратная совместимость со старыми именами
            'alex-nekrasov': 'h9NSQvWZaC4NFusYsxT9',
            'taras-boyko': '2o2uQnlGaNuV3ObRpxXt',
            'vladimir': 'B31Kx7rXmNnYqp1QWHR2',
            'evgeniy': 'TEyBWD5tAHAWqAGEv6yI',
            'leonid-drapey': 'eLDtXX7z65CuLasDRxrP'
        };
        
        // Проверяем - это короткое имя или уже реальный ElevenLabs ID?
        // Реальные ID ElevenLabs имеют длину 20+ символов
        let voiceId;
        if (voice.length >= 20) {
            // Это уже реальный ElevenLabs ID
            voiceId = voice;
        } else {
            // Это короткое имя - маппим в реальный ID
            voiceId = voiceMap[voice] || voiceMap['artem-klopotenko'];
        }
        
        // Настройки эмоций влияют на stability и style
        const emotionSettings = {
            'neutral': { stability: 0.5, style: 0.0 },
            'happy': { stability: 0.3, style: 0.6 },
            'sad': { stability: 0.7, style: 0.3 },
            'excited': { stability: 0.2, style: 0.8 },
            'serious': { stability: 0.8, style: 0.1 },
            'friendly': { stability: 0.4, style: 0.5 },
            'calm': { stability: 0.9, style: 0.0 },
            'professional': { stability: 0.7, style: 0.2 }
        };
        
        const emotionConfig = emotionSettings[emotion] || emotionSettings['neutral'];
        
        // Финальные настройки голоса
        const finalStability = stability !== undefined ? stability : emotionConfig.stability;
        const finalStyle = emotionConfig.style;
        
        const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'xi-api-key': apiKey
            },
            body: JSON.stringify({
                text: text,
                model_id: 'eleven_multilingual_v2',
                voice_settings: {
                    stability: finalStability,
                    similarity_boost: clarity,
                    style: finalStyle,
                    use_speaker_boost: true
                }
            })
        });
        
        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            console.error('❌ ElevenLabs error:', {
                status: response.status,
                error: err,
                voiceId: voiceId,
                keyUsed: apiKey ? apiKey.substring(0, 8) + '...' : 'NONE'
            });
            
            if (response.status === 401) {
                return res.status(401).json({ 
                    error: 'Неверный API ключ ElevenLabs',
                    debug: {
                        hasKey: !!apiKey,
                        keyLength: apiKey ? apiKey.length : 0
                    }
                });
            }
            if (response.status === 400) {
                return res.status(400).json({ error: err.detail?.message || 'Ошибка запроса' });
            }
            
            return res.status(response.status).json({ 
                error: err.detail?.message || err.detail || 'Ошибка ElevenLabs' 
            });
        }
        
        const audioBuffer = await response.arrayBuffer();
        const base64Audio = Buffer.from(audioBuffer).toString('base64');
        
        return res.status(200).json({
            success: true,
            audioBase64: base64Audio,
            voiceId: voiceId
        });
        
    } catch (error) {
        console.error('Voice generation error:', error?.message || error, error?.stack || '');
        try {
            return res.status(500).json({ 
                error: error?.message || 'Unknown server error',
                stack: process.env.NODE_ENV !== 'production' ? error?.stack : undefined
            });
        } catch (e) {
            // Если даже отправка ошибки не работает
            return res.status(500).end();
        }
    }
};

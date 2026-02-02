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
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
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
        
        if (!apiKey) {
            return res.status(500).json({ error: 'API key not configured' });
        }
        
        // Маппинг голосов ElevenLabs - Украинские/Русские
        const voiceMap = {
            // Мужские
            'alex-nekrasov': '9Sj8ugvpK1DmcAXyvi3a',      // Алекс Некрасов
            'taras-boyko': '2o2uQnlGaNuV3ObRpxXt',        // Тарас Бойко
            'vladimir': 'BFmokXObxZMCBXC0A9ny',           // Владимир
            'evgeniy': 'TEyBWD5tAHAWqAGEv6yI',            // Евгений
            'leonid-drapey': 'B31Kx7rXmNnYqp1QWHR2',      // Леонид Драпей
            'voice-m6': 'h9NSQvWZaC4NFusYsxT9',
            'voice-m7': 'FqTvupDLWXjo91Dte1vR',
            'voice-m8': '0ZQZuw8Sn4cU0rN1Tm2K',
            'voice-m9': 'ARxhnQPZCfSLpMBASSii',
            'voice-m10': 'Ntd0iVwICtUtA6Fvx27M',
            // Женские
            'anna-stepanenko': 'bsourKGZEagmttzrIzmu',    // Анна Степаненко
            'voice-f2': 'dZde1M1SiLkAKiqjpqqT',
            'voice-f3': '3rWBcFHu7rpPUEJQYEqD',
            'voice-f4': '4nLP0u2B3yI0lyzATFnN',
            'voice-f5': 'bg0e02brzo3RVUEbuZeo',
            'voice-f6': 'a30ekmfK56EKHR341YaO',
            'voice-f7': '96XEXOjZRHooATdYA8FY',
            'voice-f8': 'BEprpS2vpgM32yNJpTXq',
            'voice-f9': '7eVMgwCnXydb3CikjV7a',
            'voice-f10': 'kdVjFjOXaqExaDvXZECX',
            // Английские
            'adam': 'pNInz6obpgDQGcFmaJgB',
            'antoni': 'ErXwobaYiN019PkySvjV',
            'arnold': 'VR6AewLTigWG4xSOukaG',
            'josh': 'TxGEqnHWrfWFTfGW9XjX',
            'sam': 'yoZ06aMxZJJ28mfd3POQ',
            'rachel': '21m00Tcm4TlvDq8ikWAM',
            'domi': 'AZnzlk1XvdvUeBnXmlld',
            'bella': 'EXAVITQu4vr4xnSDxMaL',
            'elli': 'MF3mGyEYCl7XYWbV9V6O'
        };
        
        // Проверяем - это короткое имя или уже реальный ElevenLabs ID?
        // Реальные ID ElevenLabs имеют длину 20+ символов
        let voiceId;
        if (voice.length >= 20) {
            // Это уже реальный ElevenLabs ID
            voiceId = voice;
        } else {
            // Это короткое имя - маппим в реальный ID
            voiceId = voiceMap[voice] || voiceMap['alex-nekrasov'];
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
            console.error('ElevenLabs error:', err);
            
            if (response.status === 401) {
                return res.status(401).json({ error: 'Неверный API ключ ElevenLabs' });
            }
            if (response.status === 400) {
                return res.status(400).json({ error: err.detail?.message || 'Ошибка запроса' });
            }
            
            return res.status(response.status).json({ 
                error: err.detail?.message || 'Ошибка ElevenLabs' 
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
        console.error('Voice generation error:', error);
        return res.status(500).json({ error: error.message });
    }
};

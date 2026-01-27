// =====================================================
// API/AI/VOICE.JS - ГЕНЕРАЦИЯ ГОЛОСА ELEVENLABS
// 
// Файл: api/ai/voice.js
// Статус: ЗАМЕНИТЬ существующий файл
// 
// API ключ берётся из Vercel Environment Variables
// =====================================================

module.exports = async function handler(req, res) {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    
    try {
        const { 
            text, 
            voice = 'adam', 
            language = 'ru',
            emotion = 'neutral',
            speed = 1.0,
            stability = 0.5,
            clarity = 0.75,
            userApiKey 
        } = req.body;
        
        if (!text) {
            return res.status(400).json({ error: 'Text required' });
        }
        
        // API ключ: сначала серверный (Vercel), потом пользовательский
        const apiKey = process.env.ELEVENLABS_API_KEY || userApiKey;
        
        if (!apiKey) {
            return res.status(500).json({ 
                error: 'API ключ не настроен. Обратитесь к администратору.' 
            });
        }
        
        // Маппинг голосов ElevenLabs
        const voiceMap = {
            // Украинские/Русские
            'alex-nekrasov': '9Sj8ugvpK1DmcAXyvi3a',
            'taras-boyko': '2o2uQnlGaNuV3ObRpxXt',
            'vladimir': 'BFmokXObxZMCBXC0A9ny',
            'evgeniy': 'TEyBWD5tAHAWqAGEv6yI',
            'leonid-drapey': 'B31Kx7rXmNnYqp1QWHR2',
            'anna-stepanenko': 'bsourKGZEagmttzrIzmu',
            
            // Дополнительные мужские
            'voice-m6': 'h9NSQvWZaC4NFusYsxT9',
            'voice-m7': 'FqTvupDLWXjo91Dte1vR',
            'voice-m8': '0ZQZuw8Sn4cU0rN1Tm2K',
            'voice-m9': 'ARxhnQPZCfSLpMBASSii',
            'voice-m10': 'Ntd0iVwICtUtA6Fvx27M',
            
            // Дополнительные женские
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
        
        // Если передали прямой ID - используем его
        const voiceId = voiceMap[voice] || voice;
        
        // Настройки эмоций
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
        const finalStability = stability !== undefined ? stability : emotionConfig.stability;
        const finalStyle = emotionConfig.style;
        
        console.log('🎤 Generating voice with ElevenLabs, voiceId:', voiceId);
        
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
                return res.status(401).json({ error: 'Ошибка API ключа. Обратитесь к администратору.' });
            }
            if (response.status === 400) {
                return res.status(400).json({ error: err.detail?.message || 'Ошибка запроса' });
            }
            
            return res.status(response.status).json({ error: err.detail?.message || 'Ошибка ElevenLabs' });
        }
        
        const audioBuffer = await response.arrayBuffer();
        const base64Audio = Buffer.from(audioBuffer).toString('base64');
        
        console.log('✅ Voice generated successfully');
        
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

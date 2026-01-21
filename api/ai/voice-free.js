/* =====================================================
   API ENDPOINT: /api/ai/voice-free
   Бесплатная генерация голоса через Edge TTS (Microsoft)
   ===================================================== */

// Маппинг голосов на Edge TTS voices
const EDGE_VOICES = {
    // Русские голоса
    'ru-male-1': 'ru-RU-DmitryNeural',
    'ru-male-2': 'ru-RU-DmitryNeural',
    'ru-female-1': 'ru-RU-SvetlanaNeural',
    'ru-female-2': 'ru-RU-DariyaNeural',
    
    // Английские голоса
    'en-male-1': 'en-US-GuyNeural',
    'en-male-2': 'en-US-ChristopherNeural',
    'en-female-1': 'en-US-JennyNeural',
    'en-female-2': 'en-US-AriaNeural',
    
    // Украинские голоса
    'uk-male-1': 'uk-UA-OstapNeural',
    'uk-female-1': 'uk-UA-PolinaNeural',
    
    // Казахские голоса
    'kk-male-1': 'kk-KZ-DauletNeural',
    'kk-female-1': 'kk-KZ-AigulNeural',
    
    // Fallback
    'default': 'ru-RU-DmitryNeural'
};

const VOICE_NAMES = {
    'ru-RU-DmitryNeural': 'Дмитрий',
    'ru-RU-SvetlanaNeural': 'Светлана',
    'ru-RU-DariyaNeural': 'Дарья',
    'en-US-GuyNeural': 'Guy',
    'en-US-ChristopherNeural': 'Christopher',
    'en-US-JennyNeural': 'Jenny',
    'en-US-AriaNeural': 'Aria',
    'uk-UA-OstapNeural': 'Остап',
    'uk-UA-PolinaNeural': 'Полина',
    'kk-KZ-DauletNeural': 'Даулет',
    'kk-KZ-AigulNeural': 'Айгуль'
};

export default async function handler(req, res) {
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
        const { text, voice = 'ru-male-1', rate = '0%', cgId } = req.body;

        if (!text) {
            return res.status(400).json({ error: 'Text is required' });
        }

        if (text.length > 2000) {
            return res.status(400).json({ error: 'Text too long (max 2000 characters)' });
        }

        // Получаем Edge TTS voice name
        const edgeVoice = EDGE_VOICES[voice] || EDGE_VOICES['default'];
        const voiceName = VOICE_NAMES[edgeVoice] || 'Голос';

        console.log(`🎤 Free TTS: voice=${voice} -> ${edgeVoice} (${voiceName})`);

        // Используем tts.quest API (бесплатный)
        const ttsUrl = `https://tts.quest/api/tts.mp3?voice=${edgeVoice}&text=${encodeURIComponent(text)}`;
        
        const ttsResponse = await fetch(ttsUrl);
        
        if (ttsResponse.ok && ttsResponse.headers.get('content-type')?.includes('audio')) {
            // Получаем аудио как base64
            const audioBuffer = await ttsResponse.arrayBuffer();
            const base64Audio = Buffer.from(audioBuffer).toString('base64');
            const audioUrl = `data:audio/mpeg;base64,${base64Audio}`;

            console.log(`✅ TTS generated: ${voiceName}, ${text.length} chars`);

            return res.status(200).json({
                success: true,
                audioUrl: audioUrl,
                voice: voiceName,
                provider: 'edge-tts'
            });
        }

        // Fallback: возвращаем URL для прямого воспроизведения
        console.log(`⚠️ Using direct URL fallback`);
        
        return res.status(200).json({
            success: true,
            audioUrl: ttsUrl,
            voice: voiceName,
            provider: 'edge-tts-direct'
        });

    } catch (error) {
        console.error('TTS error:', error);
        
        // Fallback на браузерный TTS
        const edgeVoice = EDGE_VOICES[req.body?.voice] || EDGE_VOICES['default'];
        const voiceName = VOICE_NAMES[edgeVoice] || 'Голос';
        
        return res.status(200).json({
            success: true,
            useBrowserTTS: true,
            text: req.body?.text || '',
            voice: edgeVoice,
            voiceName: voiceName,
            provider: 'browser-fallback'
        });
    }
}

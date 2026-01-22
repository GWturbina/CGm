// api/save-to-archive.js
// Сохранение карточки в Supabase (ИСПРАВЛЕНО: убран Redis)
// v3.0 - Только Supabase!

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });
    
    if (!supabaseUrl || !supabaseKey) {
        console.error('❌ Supabase not configured');
        return res.status(500).json({ success: false, error: 'Supabase not configured' });
    }
    
    try {
        const { userId, cardData } = req.body;
        
        if (!userId || !cardData) {
            return res.status(400).json({ success: false, error: 'userId and cardData required' });
        }
        
        console.log('💾 Saving to archive:', userId);
        
        const supabase = createClient(supabaseUrl, supabaseKey);
        
        // Нормализуем userId
        const cleanId = userId.toString().replace('GW', '').replace('CG', '');
        const gwId = 'GW' + cleanId;
        
        // Генерируем short_code если его нет
        const shortCode = cardData.shortCode || cardData.short_code || 
                         'c' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
        
        // Сохраняем в Supabase
        const { data, error } = await supabase
            .from('cards')
            .insert({
                short_code: shortCode,
                owner_gw_id: gwId,
                card_data: {
                    title: cardData.title || cardData.greetingText?.split('\n')[0] || 'Открытка',
                    message: cardData.greeting || cardData.greetingText || '',
                    image_url: cardData.mediaUrl || cardData.image_url || cardData.preview || null,
                    video_url: cardData.videoUrl || null,
                    style: cardData.style || 'classic'
                },
                card_type: 'standard',
                views: 0,
                created_at: new Date().toISOString()
            })
            .select()
            .single();
        
        if (error) {
            // Если карточка уже существует - это ОК
            if (error.code === '23505') {
                console.log('⚠️ Card already exists:', shortCode);
                return res.status(200).json({ 
                    success: true, 
                    cardId: shortCode,
                    message: 'Card already exists'
                });
            }
            console.error('❌ Supabase error:', error);
            throw error;
        }
        
        console.log('✅ Card saved to Supabase:', shortCode);
        return res.status(200).json({ 
            success: true, 
            cardId: data.id,
            shortCode: shortCode
        });
        
    } catch (error) {
        console.error('❌ Save to archive error:', error);
        return res.status(500).json({ success: false, error: error.message });
    }
}

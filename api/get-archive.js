// api/get-archive.js
// Получение архива карточек пользователя из Supabase
// v3.0 - ИСПРАВЛЕНО: Supabase вместо Redis

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export default async function handler(req, res) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    if (req.method !== 'GET') {
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }
    
    try {
        // Поддержка разных параметров: userId, gw_id, owner_gw_id
        const userId = req.query.userId || req.query.gw_id || req.query.owner_gw_id;
        
        if (!userId) {
            return res.status(400).json({ 
                success: false, 
                error: 'userId (or gw_id) required' 
            });
        }
        
        console.log('📂 Getting archive for userId:', userId);
        
        // Инициализируем Supabase
        if (!supabaseUrl || !supabaseKey) {
            console.error('❌ Missing Supabase credentials');
            return res.status(500).json({ 
                success: false, 
                error: 'Server configuration error' 
            });
        }
        
        const supabase = createClient(supabaseUrl, supabaseKey);
        
        // Нормализуем userId (с GW и без)
        const cleanId = userId.toString().replace('GW', '').replace('CG', '');
        const gwId = 'GW' + cleanId;
        
        // Запрос к Supabase с OR условием для разных форматов ID
        const { data: cards, error } = await supabase
            .from('cards')
            .select('*')
            .or(`owner_gw_id.eq.${gwId},owner_gw_id.eq.${cleanId},owner_gw_id.eq.CG${cleanId}`)
            .order('created_at', { ascending: false })
            .limit(100);
        
        if (error) {
            console.error('❌ Supabase query error:', error);
            return res.status(500).json({ success: false, error: error.message });
        }
        
        if (!cards || cards.length === 0) {
            console.log('📭 No cards found for:', userId);
            return res.status(200).json({ 
                success: true, 
                cards: [],
                count: 0
            });
        }
        
        // Преобразуем данные в формат для фронтенда
        const formattedCards = cards.map(card => ({
            id: card.id,
            cardId: card.id,
            short_code: card.short_code,
            shortCode: card.short_code,
            code: card.short_code,
            title: card.card_data?.title || card.card_data?.message?.split('\n')[0] || 'Открытка',
            greeting: card.card_data?.message || card.card_data?.greeting || '',
            greetingText: card.card_data?.message || card.card_data?.greeting || '',
            preview: card.card_data?.image_url || null,
            mediaUrl: card.card_data?.image_url || null,
            image_url: card.card_data?.image_url || null,
            videoUrl: card.card_data?.video_url || null,
            style: card.card_data?.style || 'classic',
            views: card.views || card.views_count || 0,
            created_at: card.created_at,
            createdAt: card.created_at,
            date: new Date(card.created_at).toLocaleDateString('ru-RU'),
            card_data: card.card_data,
            owner_gw_id: card.owner_gw_id
        }));
        
        console.log('✅ Archive loaded:', formattedCards.length, 'cards');
        
        return res.status(200).json({ 
            success: true, 
            cards: formattedCards,
            count: formattedCards.length
        });
        
    } catch (error) {
        console.error('❌ Get archive error:', error);
        return res.status(500).json({ success: false, error: error.message });
    }
}

// api/save-card-to-db.js
// Сохраняет карточку в Supabase (fallback когда клиент недоступен)

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export default async function handler(req, res) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }
    
    try {
        const cardData = req.body;
        
        if (!cardData || !cardData.short_code || !cardData.owner_gw_id) {
            return res.status(400).json({ 
                success: false, 
                error: 'Missing required fields: short_code, owner_gw_id' 
            });
        }
        
        // Инициализируем Supabase
        if (!supabaseUrl || !supabaseKey) {
            console.error('Missing Supabase credentials');
            return res.status(500).json({ 
                success: false, 
                error: 'Server configuration error' 
            });
        }
        
        const supabase = createClient(supabaseUrl, supabaseKey);
        
        // Проверяем, не существует ли уже такая карточка
        const { data: existing } = await supabase
            .from('cards')
            .select('id')
            .eq('short_code', cardData.short_code)
            .single();
        
        if (existing) {
            console.log('Card already exists:', cardData.short_code);
            return res.status(200).json({ 
                success: true, 
                message: 'Card already exists',
                id: existing.id 
            });
        }
        
        // Вставляем карточку
        const { data, error } = await supabase
            .from('cards')
            .insert({
                short_code: cardData.short_code,
                owner_gw_id: cardData.owner_gw_id,
                card_data: cardData.card_data || {},
                card_type: cardData.card_type || 'standard',
                views: cardData.views || 0,
                views_count: cardData.views_count || 0,
                unique_views: cardData.unique_views || 0,
                created_at: cardData.created_at || new Date().toISOString()
            })
            .select()
            .single();
        
        if (error) {
            console.error('Supabase insert error:', error);
            return res.status(500).json({ 
                success: false, 
                error: error.message 
            });
        }
        
        console.log('Card saved to Supabase:', data.id, cardData.short_code);
        
        return res.status(200).json({ 
            success: true, 
            id: data.id,
            short_code: cardData.short_code 
        });
        
    } catch (error) {
        console.error('API error:', error);
        return res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
}

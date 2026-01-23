// api/get-cards.js
// Загрузка карточек пользователя из Supabase

import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
    
    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
        return res.status(500).json({ success: false, error: 'Server config error' });
    }
    
    try {
        const supabase = createClient(supabaseUrl, supabaseKey);
        const { gw_id, wallet } = req.query;
        
        if (!gw_id && !wallet) {
            return res.status(400).json({ success: false, error: 'gw_id or wallet required' });
        }
        
        let query = supabase.from('cards').select('*');
        
        if (gw_id) {
            // Ищем по owner_gw_id с и без префикса GW
            const cleanId = gw_id.toString().replace('GW', '');
            const withPrefix = gw_id.toString().startsWith('GW') ? gw_id : 'GW' + gw_id;
            
            query = query.or(`owner_gw_id.eq.${withPrefix},owner_gw_id.eq.${cleanId}`);
        }
        
        const { data: cards, error } = await query
            .order('created_at', { ascending: false })
            .limit(100);
        
        if (error) {
            console.error('Supabase error:', error);
            return res.status(500).json({ success: false, error: error.message });
        }
        
        console.log(`📂 Loaded ${cards?.length || 0} cards for gw_id: ${gw_id}`);
        
        return res.status(200).json({
            success: true,
            cards: cards || [],
            count: cards?.length || 0
        });
        
    } catch (error) {
        console.error('Get cards error:', error);
        return res.status(500).json({ success: false, error: error.message });
    }
}

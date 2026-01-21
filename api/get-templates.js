// api/get-templates.js
// Загрузка шаблонов для модалок на генераторе

import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
    // CORS
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
        
        const { type, gw_id } = req.query;
        // type = 'leader' | 'corporate'
        
        let templates = [];
        
        // 1. Сначала ищем в card_templates
        try {
            let query = supabase
                .from('card_templates')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(50);
            
            if (type === 'leader') {
                query = query.eq('template_type', 'leader');
            } else if (type === 'corporate') {
                query = query.eq('template_type', 'corporate');
            }
            
            const { data, error } = await query;
            
            if (!error && data && data.length > 0) {
                templates = data.map(t => ({
                    code: t.code || t.short_code,
                    title: t.name || 'Без названия',
                    image_url: t.image_url || t.preview_url,
                    card_data: t.card_data,
                    created_at: t.created_at
                }));
            }
        } catch (e) {
            console.log('card_templates query error:', e.message);
        }
        
        // 2. Если нет - ищем в cards с флагами isTemplate/isCorporate
        if (templates.length === 0) {
            try {
                let query = supabase.from('cards').select('*');
                
                if (type === 'leader') {
                    // Ищем карточки помеченные как шаблон от лидера
                    // card_data содержит isTemplate: true
                    query = query.filter('card_data->>isTemplate', 'eq', 'true');
                } else if (type === 'corporate') {
                    query = query.filter('card_data->>isCorporate', 'eq', 'true');
                }
                
                const { data, error } = await query
                    .order('created_at', { ascending: false })
                    .limit(50);
                
                if (!error && data && data.length > 0) {
                    templates = data.map(t => ({
                        code: t.short_code,
                        title: t.card_data?.title || t.card_data?.greetingText?.substring(0, 30) || 'Без названия',
                        image_url: t.card_data?.image_url || t.card_data?.mediaUrl || t.card_data?.cloudinaryUrl,
                        card_data: t.card_data,
                        created_at: t.created_at
                    }));
                }
            } catch (e) {
                console.log('cards query error:', e.message);
            }
        }
        
        console.log(`📋 Returning ${templates.length} templates for type: ${type}`);
        
        return res.status(200).json({
            success: true,
            templates: templates,
            count: templates.length,
            type: type || 'all'
        });
        
    } catch (error) {
        console.error('Get templates error:', error);
        return res.status(500).json({ success: false, error: error.message });
    }
}

// api/get-user-templates.js
// Получение выбранных шаблонов пользователя
// v1.0

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export default async function handler(req, res) {
    // CORS
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
        const { user_gw_id, type } = req.query;
        
        // Валидация
        if (!user_gw_id) {
            return res.status(400).json({ success: false, error: 'user_gw_id required' });
        }
        
        // Supabase
        if (!supabaseUrl || !supabaseKey) {
            return res.status(500).json({ success: false, error: 'Database not configured' });
        }
        
        const supabase = createClient(supabaseUrl, supabaseKey);
        
        // Нормализуем user_gw_id
        const cleanId = user_gw_id.toString().replace('GW', '');
        const withPrefix = 'GW' + cleanId;
        
        // Строим запрос
        let query = supabase
            .from('user_templates')
            .select('*')
            .or(`user_gw_id.eq.${withPrefix},user_gw_id.eq.${cleanId}`)
            .order('selected_at', { ascending: false });
        
        // Фильтр по типу (опционально)
        if (type && ['leader', 'corporate'].includes(type)) {
            query = query.eq('template_type', type);
        }
        
        const { data: templates, error } = await query;
        
        if (error) {
            console.error('❌ Supabase error:', error);
            return res.status(500).json({ success: false, error: error.message });
        }
        
        console.log(`📋 Loaded ${templates?.length || 0} templates for user: ${user_gw_id}, type: ${type || 'all'}`);
        
        return res.status(200).json({ 
            success: true, 
            templates: templates || [],
            count: templates?.length || 0
        });
        
    } catch (error) {
        console.error('❌ API error:', error);
        return res.status(500).json({ success: false, error: error.message });
    }
}

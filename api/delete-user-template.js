// api/delete-user-template.js
// Удаление шаблона из коллекции пользователя
// v1.0

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export default async function handler(req, res) {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    if (req.method !== 'POST' && req.method !== 'DELETE') {
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }
    
    try {
        const { user_gw_id, template_code, id } = req.body;
        
        // Валидация - нужен либо id, либо user_gw_id + template_code
        if (!id && (!user_gw_id || !template_code)) {
            return res.status(400).json({ 
                success: false, 
                error: 'Provide either "id" or "user_gw_id" + "template_code"' 
            });
        }
        
        // Supabase
        if (!supabaseUrl || !supabaseKey) {
            return res.status(500).json({ success: false, error: 'Database not configured' });
        }
        
        const supabase = createClient(supabaseUrl, supabaseKey);
        
        let query = supabase.from('user_templates').delete();
        
        if (id) {
            // Удаление по ID записи
            query = query.eq('id', id);
        } else {
            // Удаление по user_gw_id + template_code
            const cleanId = user_gw_id.toString().replace('GW', '');
            const withPrefix = 'GW' + cleanId;
            
            query = query
                .or(`user_gw_id.eq.${withPrefix},user_gw_id.eq.${cleanId}`)
                .eq('template_code', template_code);
        }
        
        const { error, count } = await query;
        
        if (error) {
            console.error('❌ Supabase error:', error);
            return res.status(500).json({ success: false, error: error.message });
        }
        
        console.log('✅ Template removed from collection:', id || template_code);
        
        return res.status(200).json({ 
            success: true, 
            message: 'Template removed from collection'
        });
        
    } catch (error) {
        console.error('❌ API error:', error);
        return res.status(500).json({ success: false, error: error.message });
    }
}

// api/create-template.js
// Создание/обновление шаблона в card_templates

import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    
    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
        return res.status(500).json({ success: false, error: 'Server config error' });
    }
    
    try {
        const supabase = createClient(supabaseUrl, supabaseKey);
        const templateData = req.body;
        
        if (!templateData.code) {
            return res.status(400).json({ success: false, error: 'Code required' });
        }
        
        // Проверяем существует ли
        const { data: existing } = await supabase
            .from('card_templates')
            .select('id')
            .eq('code', templateData.code)
            .single();
        
        let result;
        
        if (existing) {
            // Обновляем
            const { data, error } = await supabase
                .from('card_templates')
                .update({
                    name: templateData.name,
                    template_type: templateData.template_type,
                    image_url: templateData.image_url,
                    card_data: templateData.card_data,
                    is_approved: templateData.is_approved !== false
                })
                .eq('code', templateData.code)
                .select()
                .single();
            
            if (error) throw error;
            result = data;
            console.log('📝 Updated template:', templateData.code);
        } else {
            // Создаём
            const { data, error } = await supabase
                .from('card_templates')
                .insert({
                    code: templateData.code,
                    name: templateData.name || 'Без названия',
                    template_type: templateData.template_type || 'leader',
                    image_url: templateData.image_url,
                    card_data: templateData.card_data || {},
                    owner_gw_id: templateData.owner_gw_id,
                    is_approved: templateData.is_approved !== false
                })
                .select()
                .single();
            
            if (error) throw error;
            result = data;
            console.log('✅ Created template:', templateData.code);
        }
        
        return res.status(200).json({ success: true, template: result });
        
    } catch (error) {
        console.error('Create template error:', error);
        return res.status(500).json({ success: false, error: error.message });
    }
}

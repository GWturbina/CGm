// api/save-user-template.js
// Сохранение выбранного шаблона в коллекцию пользователя
// v1.0

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export default async function handler(req, res) {
    // CORS
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
        const { 
            user_gw_id, 
            template_code, 
            template_type,
            ref_link,
            template_title,
            template_image_url,
            template_owner_gw_id
        } = req.body;
        
        // Валидация
        if (!user_gw_id) {
            return res.status(400).json({ success: false, error: 'user_gw_id required' });
        }
        if (!template_code) {
            return res.status(400).json({ success: false, error: 'template_code required' });
        }
        if (!template_type || !['leader', 'corporate'].includes(template_type)) {
            return res.status(400).json({ success: false, error: 'template_type must be "leader" or "corporate"' });
        }
        
        // Supabase
        if (!supabaseUrl || !supabaseKey) {
            return res.status(500).json({ success: false, error: 'Database not configured' });
        }
        
        const supabase = createClient(supabaseUrl, supabaseKey);
        
        // Нормализуем user_gw_id (добавляем GW если нет)
        const normalizedUserId = user_gw_id.toString().startsWith('GW') 
            ? user_gw_id 
            : 'GW' + user_gw_id;
        
        // Проверяем не добавлен ли уже
        const { data: existing } = await supabase
            .from('user_templates')
            .select('id')
            .eq('user_gw_id', normalizedUserId)
            .eq('template_code', template_code)
            .single();
        
        if (existing) {
            console.log('📋 Template already in collection:', template_code);
            return res.status(200).json({ 
                success: true, 
                message: 'Template already in collection',
                id: existing.id
            });
        }
        
        // Добавляем шаблон в коллекцию
        const { data, error } = await supabase
            .from('user_templates')
            .insert({
                user_gw_id: normalizedUserId,
                template_code,
                template_type,
                ref_link,
                template_title: template_title || 'Шаблон',
                template_image_url,
                template_owner_gw_id,
                selected_at: new Date().toISOString()
            })
            .select()
            .single();
        
        if (error) {
            console.error('❌ Supabase error:', error);
            return res.status(500).json({ success: false, error: error.message });
        }
        
        console.log('✅ Template saved to collection:', template_code, 'for user:', normalizedUserId);
        
        return res.status(200).json({ 
            success: true, 
            id: data.id,
            message: 'Template added to collection'
        });
        
    } catch (error) {
        console.error('❌ API error:', error);
        return res.status(500).json({ success: false, error: error.message });
    }
}

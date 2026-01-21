// api/delete-template.js
// Удаление шаблона из card_templates

import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'DELETE') return res.status(405).json({ error: 'Method not allowed' });
    
    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
        return res.status(500).json({ success: false, error: 'Server config error' });
    }
    
    try {
        const supabase = createClient(supabaseUrl, supabaseKey);
        const { code } = req.query;
        
        if (!code) {
            return res.status(400).json({ success: false, error: 'Code required' });
        }
        
        const { error } = await supabase
            .from('card_templates')
            .delete()
            .eq('code', code);
        
        if (error) throw error;
        
        console.log('🗑️ Deleted template:', code);
        return res.status(200).json({ success: true, deleted: code });
        
    } catch (error) {
        console.error('Delete template error:', error);
        return res.status(500).json({ success: false, error: error.message });
    }
}

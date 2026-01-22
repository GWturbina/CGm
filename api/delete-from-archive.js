// api/delete-from-archive.js
// Удаление карточки из архива (Supabase)
// v3.0 - ИСПРАВЛЕНО: Supabase вместо Redis

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'DELETE, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'DELETE' && req.method !== 'POST') {
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }
    
    if (!supabaseUrl || !supabaseKey) {
        console.error('❌ Supabase not configured');
        return res.status(500).json({ success: false, error: 'Supabase not configured' });
    }
    
    try {
        const { userId, cardId, shortCode } = req.method === 'DELETE' ? req.query : req.body;
        const codeToDelete = cardId || shortCode;
        
        if (!codeToDelete) {
            return res.status(400).json({ success: false, error: 'cardId or shortCode required' });
        }
        
        console.log('🗑️ Deleting from archive:', codeToDelete);
        
        const supabase = createClient(supabaseUrl, supabaseKey);
        
        // Мягкое удаление - помечаем статус
        const { data, error } = await supabase
            .from('cards')
            .update({ 
                status: 'deleted',
                deleted_at: new Date().toISOString()
            })
            .or(`short_code.eq.${codeToDelete},id.eq.${codeToDelete}`)
            .select();
        
        if (error) {
            console.error('❌ Supabase delete error:', error);
            throw error;
        }
        
        if (!data || data.length === 0) {
            // Попробуем жёсткое удаление
            const { error: hardError } = await supabase
                .from('cards')
                .delete()
                .or(`short_code.eq.${codeToDelete},id.eq.${codeToDelete}`);
            
            if (hardError) {
                return res.status(404).json({ success: false, error: 'Card not found' });
            }
        }
        
        console.log('✅ Card deleted from archive');
        return res.status(200).json({ success: true });
        
    } catch (error) {
        console.error('❌ Delete from archive error:', error);
        return res.status(500).json({ success: false, error: error.message });
    }
}

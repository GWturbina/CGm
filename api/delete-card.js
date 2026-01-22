// api/delete-card.js
// Удаление карточки из Supabase
// v3.0 - ИСПРАВЛЕНО: Supabase вместо Redis

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export default async function handler(req, res) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    if (req.method !== 'DELETE') {
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }
    
    try {
        const shortCode = req.query.sc || req.query.shortCode || req.query.code;
        
        if (!shortCode) {
            return res.status(400).json({ 
                success: false, 
                error: 'shortCode (sc) required' 
            });
        }
        
        console.log('🗑️ Deleting card:', shortCode);
        
        // Инициализируем Supabase
        if (!supabaseUrl || !supabaseKey) {
            console.error('❌ Missing Supabase credentials');
            return res.status(500).json({ 
                success: false, 
                error: 'Server configuration error' 
            });
        }
        
        const supabase = createClient(supabaseUrl, supabaseKey);
        
        // Мягкое удаление (помечаем как archived) или жёсткое удаление
        // Используем мягкое удаление для безопасности
        const { data, error } = await supabase
            .from('cards')
            .update({ 
                status: 'deleted',
                deleted_at: new Date().toISOString()
            })
            .eq('short_code', shortCode)
            .select();
        
        if (error) {
            console.error('❌ Supabase delete error:', error);
            return res.status(500).json({ success: false, error: error.message });
        }
        
        if (!data || data.length === 0) {
            // Карточка не найдена - попробуем жёсткое удаление на случай если нет поля status
            const { error: hardDeleteError } = await supabase
                .from('cards')
                .delete()
                .eq('short_code', shortCode);
            
            if (hardDeleteError) {
                console.warn('⚠️ Card not found or already deleted:', shortCode);
                return res.status(200).json({ 
                    success: true, 
                    message: 'Card not found or already deleted' 
                });
            }
        }
        
        console.log('✅ Card deleted:', shortCode);
        
        return res.status(200).json({ 
            success: true,
            deletedCode: shortCode
        });
        
    } catch (error) {
        console.error('❌ Delete card error:', error);
        return res.status(500).json({ success: false, error: error.message });
    }
}

/* =====================================================
   API: /api/assistant/leaderboard
   
   GET - получить таблицу лидеров
   ===================================================== */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    
    try {
        const { 
            limit = 100, 
            offset = 0,
            sponsor_id,
            team_id,
            period // 'all', 'weekly', 'daily'
        } = req.query;
        
        let query = supabase
            .from('leaderboard')
            .select(`
                user_id,
                display_name,
                total_points,
                weekly_points,
                current_day,
                completed_days,
                total_contacts,
                total_partners,
                updated_at
            `)
            .order('total_points', { ascending: false });
        
        // Фильтры
        if (sponsor_id) {
            query = query.eq('sponsor_id', sponsor_id);
        }
        
        if (team_id) {
            query = query.eq('team_id', team_id);
        }
        
        // Пагинация
        query = query.range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);
        
        const { data, error } = await query;
        
        if (error) throw error;
        
        // Добавляем ранг
        const leaderboard = data.map((item, index) => ({
            ...item,
            rank: parseInt(offset) + index + 1
        }));
        
        // Получаем общее количество
        const { count } = await supabase
            .from('leaderboard')
            .select('*', { count: 'exact', head: true });
        
        return res.status(200).json({
            success: true,
            data: leaderboard,
            total: count,
            limit: parseInt(limit),
            offset: parseInt(offset)
        });
        
    } catch (error) {
        console.error('Leaderboard error:', error);
        return res.status(500).json({ error: error.message });
    }
}

/* =====================================================
   API: /api/assistant/progress
   
   GET  - получить прогресс пользователя
   POST - сохранить прогресс
   ===================================================== */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    try {
        if (req.method === 'GET') {
            return await getProgress(req, res);
        } else if (req.method === 'POST') {
            return await saveProgress(req, res);
        } else {
            return res.status(405).json({ error: 'Method not allowed' });
        }
    } catch (error) {
        console.error('API Error:', error);
        return res.status(500).json({ error: error.message });
    }
}

// ═══════════════════════════════════════════════════════════
// GET - Получить прогресс
// ═══════════════════════════════════════════════════════════

async function getProgress(req, res) {
    const { user_id } = req.query;
    
    if (!user_id) {
        return res.status(400).json({ error: 'user_id required' });
    }
    
    // Получаем прогресс
    const { data: progress, error } = await supabase
        .from('user_progress')
        .select('*')
        .eq('user_id', user_id)
        .single();
    
    if (error && error.code !== 'PGRST116') {
        throw error;
    }
    
    if (!progress) {
        // Возвращаем пустой прогресс
        return res.status(200).json({
            success: true,
            data: null,
            isNew: true
        });
    }
    
    // Получаем выполненные задания
    const { data: tasks } = await supabase
        .from('task_completions')
        .select('task_id, completed_at, points_earned')
        .eq('user_id', user_id)
        .eq('status', 'completed');
    
    // Получаем достижения
    const { data: achievements } = await supabase
        .from('user_achievements')
        .select('achievement_id, earned_at, points_earned')
        .eq('user_id', user_id);
    
    return res.status(200).json({
        success: true,
        data: {
            ...progress,
            task_completions: tasks || [],
            achievements: achievements || []
        }
    });
}

// ═══════════════════════════════════════════════════════════
// POST - Сохранить прогресс
// ═══════════════════════════════════════════════════════════

async function saveProgress(req, res) {
    const {
        user_id,
        gw_id,
        current_day,
        current_week,
        total_points,
        streak_days,
        completed_days,
        completed_tasks,
        completed_lessons,
        earned_achievements,
        program_status
    } = req.body;
    
    if (!user_id) {
        return res.status(400).json({ error: 'user_id required' });
    }
    
    // Upsert прогресс
    const { data, error } = await supabase
        .from('user_progress')
        .upsert({
            user_id,
            gw_id,
            current_day: current_day || 1,
            current_week: current_week || 1,
            total_points: total_points || 0,
            streak_days: streak_days || 0,
            completed_days: completed_days || [],
            completed_tasks: completed_tasks || [],
            completed_lessons: completed_lessons || [],
            earned_achievements: earned_achievements || [],
            program_status: program_status || 'active',
            last_activity_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        }, {
            onConflict: 'user_id'
        })
        .select()
        .single();
    
    if (error) throw error;
    
    // Обновляем лидерборд
    await updateLeaderboard(user_id, data);
    
    return res.status(200).json({
        success: true,
        data
    });
}

// ═══════════════════════════════════════════════════════════
// ОБНОВЛЕНИЕ ЛИДЕРБОРДА
// ═══════════════════════════════════════════════════════════

async function updateLeaderboard(userId, progress) {
    try {
        await supabase
            .from('leaderboard')
            .upsert({
                user_id: userId,
                total_points: progress.total_points || 0,
                current_day: progress.current_day || 1,
                completed_days: (progress.completed_days || []).length,
                updated_at: new Date().toISOString()
            }, {
                onConflict: 'user_id'
            });
    } catch (error) {
        console.error('Leaderboard update error:', error);
    }
}

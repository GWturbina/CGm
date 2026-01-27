/* =====================================================
   API: /api/assistant/stats
   
   GET - получить статистику пользователя
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
        const { user_id } = req.query;
        
        if (!user_id) {
            return res.status(400).json({ error: 'user_id required' });
        }
        
        // Получаем прогресс
        const { data: progress } = await supabase
            .from('user_progress')
            .select('*')
            .eq('user_id', user_id)
            .single();
        
        if (!progress) {
            return res.status(200).json({
                success: true,
                data: {
                    currentDay: 1,
                    totalDays: 21,
                    completedDays: 0,
                    totalPoints: 0,
                    streakDays: 0,
                    achievementsEarned: 0,
                    achievementsTotal: 18,
                    programProgress: 0,
                    programStatus: 'not_started',
                    rank: null
                }
            });
        }
        
        // Получаем ранг в лидерборде
        const { data: rankData } = await supabase
            .from('leaderboard')
            .select('user_id')
            .order('total_points', { ascending: false });
        
        let rank = null;
        if (rankData) {
            const userIndex = rankData.findIndex(r => r.user_id === user_id);
            if (userIndex !== -1) {
                rank = userIndex + 1;
            }
        }
        
        // Получаем статистику по заданиям за сегодня
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const { data: todayTasks } = await supabase
            .from('task_completions')
            .select('id')
            .eq('user_id', user_id)
            .gte('completed_at', today.toISOString());
        
        // Формируем ответ
        const stats = {
            currentDay: progress.current_day || 1,
            currentWeek: progress.current_week || 1,
            totalDays: 21,
            completedDays: (progress.completed_days || []).length,
            totalPoints: progress.total_points || 0,
            streakDays: progress.streak_days || 0,
            maxStreak: progress.max_streak || 0,
            achievementsEarned: (progress.earned_achievements || []).length,
            achievementsTotal: 18,
            programProgress: Math.round(((progress.completed_days || []).length / 21) * 100),
            programStatus: progress.program_status || 'active',
            startedAt: progress.started_at,
            lastActivity: progress.last_activity_at,
            completedAt: progress.completed_at,
            rank: rank,
            todayTasksCompleted: (todayTasks || []).length,
            totalTasksCompleted: (progress.completed_tasks || []).length,
            totalLessonsCompleted: (progress.completed_lessons || []).length
        };
        
        return res.status(200).json({
            success: true,
            data: stats
        });
        
    } catch (error) {
        console.error('Stats error:', error);
        return res.status(500).json({ error: error.message });
    }
}

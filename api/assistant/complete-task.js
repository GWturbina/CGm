/* =====================================================
   API: /api/assistant/complete-task
   
   POST - отметить задание как выполненное
   ===================================================== */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    
    try {
        const {
            user_id,
            task_id,
            day_number,
            points,
            auto_verified,
            task_data
        } = req.body;
        
        if (!user_id || !task_id) {
            return res.status(400).json({ error: 'user_id and task_id required' });
        }
        
        // Проверяем, не выполнено ли уже
        const { data: existing } = await supabase
            .from('task_completions')
            .select('id')
            .eq('user_id', user_id)
            .eq('task_id', task_id)
            .eq('status', 'completed')
            .single();
        
        if (existing) {
            return res.status(200).json({
                success: false,
                reason: 'already_completed',
                message: 'Task already completed'
            });
        }
        
        // Сохраняем выполнение задания
        const { error: taskError } = await supabase
            .from('task_completions')
            .upsert({
                user_id,
                task_id,
                day_number: day_number || 1,
                status: 'completed',
                completed_at: new Date().toISOString(),
                points_earned: points || 0,
                auto_verified: auto_verified || false,
                task_data: task_data || {}
            }, {
                onConflict: 'user_id,task_id'
            });
        
        if (taskError) throw taskError;
        
        // Обновляем общий прогресс
        const { data: progress, error: progressError } = await supabase
            .from('user_progress')
            .select('total_points, completed_tasks')
            .eq('user_id', user_id)
            .single();
        
        if (progress) {
            const completedTasks = progress.completed_tasks || [];
            if (!completedTasks.includes(task_id)) {
                completedTasks.push(task_id);
            }
            
            await supabase
                .from('user_progress')
                .update({
                    total_points: (progress.total_points || 0) + (points || 0),
                    completed_tasks: completedTasks,
                    last_activity_at: new Date().toISOString()
                })
                .eq('user_id', user_id);
        }
        
        // Проверяем достижения
        const newAchievements = await checkTaskAchievements(user_id, task_id);
        
        return res.status(200).json({
            success: true,
            points_earned: points || 0,
            new_achievements: newAchievements
        });
        
    } catch (error) {
        console.error('Complete task error:', error);
        return res.status(500).json({ error: error.message });
    }
}

// ═══════════════════════════════════════════════════════════
// ПРОВЕРКА ДОСТИЖЕНИЙ ПО ЗАДАНИЮ
// ═══════════════════════════════════════════════════════════

async function checkTaskAchievements(userId, taskId) {
    const newAchievements = [];
    
    // Достижения связанные с конкретными заданиями
    const taskAchievements = {
        'd3_t6': 'first_card',      // Первая открытка
        'd2_t2': 'first_blog',      // Блог создан
        'd4_t2': 'first_survey'     // Первый опрос
    };
    
    const achievementId = taskAchievements[taskId];
    if (achievementId) {
        const awarded = await awardAchievement(userId, achievementId);
        if (awarded) {
            newAchievements.push(achievementId);
        }
    }
    
    return newAchievements;
}

async function awardAchievement(userId, achievementId) {
    // Проверяем, не получено ли уже
    const { data: existing } = await supabase
        .from('user_achievements')
        .select('id')
        .eq('user_id', userId)
        .eq('achievement_id', achievementId)
        .single();
    
    if (existing) return false;
    
    // Получаем очки за достижение
    const achievementPoints = {
        'first_day': 100,
        'first_card': 100,
        'first_blog': 150,
        'first_survey': 100,
        'contacts_10': 100,
        'contacts_50': 300,
        'contacts_100': 500,
        'week_1': 500,
        'week_2': 500,
        'week_3': 500,
        'program_complete': 2000,
        'streak_7': 300,
        'streak_14': 500,
        'streak_21': 1000,
        'first_partner': 500,
        'first_income': 1000,
        'ai_master': 300,
        'video_creator': 300
    };
    
    const points = achievementPoints[achievementId] || 0;
    
    // Сохраняем достижение
    await supabase
        .from('user_achievements')
        .insert({
            user_id: userId,
            achievement_id: achievementId,
            points_earned: points,
            earned_at: new Date().toISOString()
        });
    
    // Обновляем прогресс
    const { data: progress } = await supabase
        .from('user_progress')
        .select('total_points, earned_achievements')
        .eq('user_id', userId)
        .single();
    
    if (progress) {
        const earnedAchievements = progress.earned_achievements || [];
        earnedAchievements.push(achievementId);
        
        await supabase
            .from('user_progress')
            .update({
                total_points: (progress.total_points || 0) + points,
                earned_achievements: earnedAchievements
            })
            .eq('user_id', userId);
    }
    
    return true;
}

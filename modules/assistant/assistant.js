/* =====================================================
   VIRTUAL ASSISTANT - CORE MODULE v1.1
   Основная логика виртуального помощника
   
   ИСПРАВЛЕНО v1.1:
   - Правильная работа с Supabase клиентом
   - Защита от redeclaration
   ===================================================== */

// Защита от повторного объявления
if (typeof window.VirtualAssistant === 'undefined') {

class VirtualAssistant {
    constructor(options = {}) {
        this.userId = options.userId || null;
        this.gwId = options.gwId || null;
        
        // ⭐ ИСПРАВЛЕНО: Правильное получение Supabase клиента
        this.supabase = this.getSupabaseClient(options.supabase);
        
        // Состояние
        this.state = {
            initialized: false,
            currentDay: 1,
            currentWeek: 1,
            totalPoints: 0,
            streakDays: 0,
            completedDays: [],
            completedTasks: [],
            completedLessons: [],
            earnedAchievements: [],
            programStatus: 'active',
            lastActivity: null
        };
        
        // Данные текущего дня
        this.currentDayData = null;
        
        // Callbacks
        this.onStateChange = options.onStateChange || null;
        this.onAchievement = options.onAchievement || null;
        this.onDayComplete = options.onDayComplete || null;
        this.onWeekComplete = options.onWeekComplete || null;
        this.onProgramComplete = options.onProgramComplete || null;
        
        // Проверка LessonsData
        if (typeof LessonsData === 'undefined') {
            console.error('❌ VirtualAssistant: LessonsData not loaded!');
            return;
        }
        
        this.lessonsData = LessonsData;
        console.log('🤖 VirtualAssistant initialized');
    }
    
    // ⭐ НОВЫЙ МЕТОД: Правильное получение Supabase клиента
    getSupabaseClient(providedClient) {
        // Если передан клиент напрямую с методом from
        if (providedClient && typeof providedClient.from === 'function') {
            return providedClient;
        }
        
        // Проверяем window.SupabaseClient (обёртка CardGift)
        if (window.SupabaseClient && typeof window.SupabaseClient.getClient === 'function') {
            const client = window.SupabaseClient.getClient();
            if (client && typeof client.from === 'function') {
                return client;
            }
        }
        
        // Проверяем window.supabaseClient
        if (window.supabaseClient && typeof window.supabaseClient.from === 'function') {
            return window.supabaseClient;
        }
        
        // Проверяем window.supabase напрямую
        if (window.supabase && typeof window.supabase.from === 'function') {
            return window.supabase;
        }
        
        console.warn('⚠️ VirtualAssistant: No valid Supabase client found, using localStorage');
        return null;
    }
    
    async init() {
        if (!this.userId) {
            console.warn('⚠️ VirtualAssistant: No userId provided');
            return false;
        }
        
        try {
            await this.loadProgress();
            this.loadCurrentDayData();
            await this.checkMissedDays();
            await this.checkAchievements();
            
            this.state.initialized = true;
            this.triggerStateChange();
            
            console.log('✅ VirtualAssistant ready', this.state);
            return true;
            
        } catch (error) {
            console.error('❌ VirtualAssistant init error:', error);
            return false;
        }
    }
    
    async loadProgress() {
        if (!this.supabase) {
            console.warn('⚠️ No Supabase client, using localStorage');
            return this.loadProgressFromLocalStorage();
        }
        
        try {
            const { data, error } = await this.supabase
                .from('user_progress')
                .select('*')
                .eq('user_id', this.userId)
                .single();
            
            if (error && error.code !== 'PGRST116') {
                throw error;
            }
            
            if (data) {
                this.state = {
                    ...this.state,
                    currentDay: data.current_day || 1,
                    currentWeek: data.current_week || 1,
                    totalPoints: data.total_points || 0,
                    streakDays: data.streak_days || 0,
                    completedDays: data.completed_days || [],
                    completedTasks: data.completed_tasks || [],
                    completedLessons: data.completed_lessons || [],
                    earnedAchievements: data.earned_achievements || [],
                    programStatus: data.program_status || 'active',
                    lastActivity: data.last_activity_at
                };
            } else {
                await this.createProgress();
            }
            
            return true;
        } catch (error) {
            console.error('Error loading progress:', error);
            return this.loadProgressFromLocalStorage();
        }
    }
    
    loadProgressFromLocalStorage() {
        const saved = localStorage.getItem(`assistant_progress_${this.userId}`);
        if (saved) {
            try {
                const data = JSON.parse(saved);
                this.state = { ...this.state, ...data };
            } catch (e) {
                console.error('Error parsing localStorage:', e);
            }
        }
        return true;
    }
    
    async saveProgress() {
        localStorage.setItem(`assistant_progress_${this.userId}`, JSON.stringify(this.state));
        
        if (!this.supabase) return true;
        
        try {
            const { error } = await this.supabase
                .from('user_progress')
                .upsert({
                    user_id: this.userId,
                    gw_id: this.gwId,
                    current_day: this.state.currentDay,
                    current_week: this.state.currentWeek,
                    total_points: this.state.totalPoints,
                    streak_days: this.state.streakDays,
                    completed_days: this.state.completedDays,
                    completed_tasks: this.state.completedTasks,
                    completed_lessons: this.state.completedLessons,
                    earned_achievements: this.state.earnedAchievements,
                    program_status: this.state.programStatus,
                    last_activity_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                }, { onConflict: 'user_id' });
            
            if (error) throw error;
            return true;
        } catch (error) {
            console.error('Error saving progress:', error);
            return false;
        }
    }
    
    async createProgress() {
        if (!this.supabase) return;
        
        try {
            await this.supabase
                .from('user_progress')
                .insert({
                    user_id: this.userId,
                    gw_id: this.gwId,
                    current_day: 1,
                    current_week: 1,
                    total_points: 0,
                    streak_days: 0,
                    program_status: 'active',
                    started_at: new Date().toISOString()
                });
        } catch (error) {
            console.error('Error creating progress:', error);
        }
    }
    
    loadCurrentDayData() {
        const day = this.state.currentDay;
        const week = Math.ceil(day / 7);
        
        let dayData = null;
        
        if (week === 1 && this.lessonsData.week1?.days?.[day]) {
            dayData = this.lessonsData.week1.days[day];
        } else if (week === 2 && this.lessonsData.week2?.days?.[day]) {
            dayData = this.lessonsData.week2.days[day];
        } else if (week === 3 && this.lessonsData.week3?.days?.[day]) {
            dayData = this.lessonsData.week3.days[day];
        }
        
        this.currentDayData = dayData;
        this.state.currentWeek = week;
        
        return dayData;
    }
    
    getDayData(dayNumber) {
        const week = Math.ceil(dayNumber / 7);
        
        if (week === 1 && this.lessonsData.week1?.days?.[dayNumber]) {
            return this.lessonsData.week1.days[dayNumber];
        } else if (week === 2 && this.lessonsData.week2?.days?.[dayNumber]) {
            return this.lessonsData.week2.days[dayNumber];
        } else if (week === 3 && this.lessonsData.week3?.days?.[dayNumber]) {
            return this.lessonsData.week3.days[dayNumber];
        }
        
        return null;
    }
    
    getWeekData(weekNumber) {
        switch(weekNumber) {
            case 1: return this.lessonsData.week1;
            case 2: return this.lessonsData.week2;
            case 3: return this.lessonsData.week3;
            default: return null;
        }
    }
    
    async completeTask(taskId, data = {}) {
        if (this.state.completedTasks.includes(taskId)) {
            return { success: false, reason: 'already_completed' };
        }
        
        const task = this.findTask(taskId);
        if (!task) {
            return { success: false, reason: 'task_not_found' };
        }
        
        // ═══════════════════════════════════════════════════════════════
        // ВЕРИФИКАЦИЯ ЗАДАНИЯ ЧЕРЕЗ API (если не autoVerified)
        // ═══════════════════════════════════════════════════════════════
        if (!data.autoVerified && !data.skipVerification) {
            const verification = await this.verifyTask(taskId);
            
            if (!verification.verified) {
                console.log('❌ Task not verified:', taskId, verification.message);
                return { 
                    success: false, 
                    reason: 'not_verified',
                    message: verification.message || 'Задание не выполнено. Сначала выполни действие!',
                    current: verification.current,
                    required: verification.required
                };
            }
            
            console.log('✅ Task verified:', taskId, verification.message);
        }
        
        const points = task.points || 0;
        this.state.totalPoints += points;
        this.state.completedTasks.push(taskId);
        
        await this.saveTaskCompletion(taskId, task, data);
        await this.checkDayCompletion();
        await this.checkAchievements();
        await this.saveProgress();
        
        this.triggerStateChange();
        
        return { 
            success: true, 
            points: points,
            totalPoints: this.state.totalPoints,
            task: task
        };
    }
    
    // Верификация задания через API
    async verifyTask(taskId) {
        try {
            const response = await fetch('/api/verify-task', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    taskId: taskId,
                    userId: this.userId
                })
            });
            
            if (!response.ok) {
                console.warn('Verify API error, allowing task');
                return { verified: true };
            }
            
            const result = await response.json();
            return result;
            
        } catch (error) {
            console.warn('Verify task error:', error);
            // При ошибке API - разрешаем (fallback)
            return { verified: true };
        }
    }
    
    // Получить статистику пользователя
    async getUserStats() {
        try {
            const response = await fetch('/api/verify-task', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'getStats',
                    userId: this.userId
                })
            });
            
            if (!response.ok) return null;
            
            const result = await response.json();
            return result.stats;
            
        } catch (error) {
            console.warn('Get stats error:', error);
            return null;
        }
    }
    
    findTask(taskId) {
        for (let day = 1; day <= 21; day++) {
            const dayData = this.getDayData(day);
            if (dayData?.tasks) {
                const task = dayData.tasks.find(t => t.id === taskId);
                if (task) {
                    return { ...task, day };
                }
            }
        }
        return null;
    }
    
    async saveTaskCompletion(taskId, task, data) {
        if (!this.supabase) return;
        
        try {
            await this.supabase
                .from('task_completions')
                .upsert({
                    user_id: this.userId,
                    day_number: task.day || this.state.currentDay,
                    task_id: taskId,
                    status: 'completed',
                    completed_at: new Date().toISOString(),
                    points_earned: task.points || 0,
                    auto_verified: data.autoVerified || false,
                    task_data: data
                }, { onConflict: 'user_id,task_id' });
        } catch (error) {
            console.error('Error saving task completion:', error);
        }
    }
    
    isTaskCompleted(taskId) {
        return this.state.completedTasks.includes(taskId);
    }
    
    getTasksForDay(dayNumber) {
        const dayData = this.getDayData(dayNumber);
        if (!dayData?.tasks) return [];
        
        return dayData.tasks.map(task => ({
            ...task,
            completed: this.isTaskCompleted(task.id)
        }));
    }
    
    getDayProgress(dayNumber) {
        const tasks = this.getTasksForDay(dayNumber);
        const total = tasks.length;
        const completed = tasks.filter(t => t.completed).length;
        
        return {
            total,
            completed,
            percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
            isComplete: completed === total && total > 0
        };
    }
    
    async checkDayCompletion() {
        const dayProgress = this.getDayProgress(this.state.currentDay);
        
        if (dayProgress.isComplete && !this.state.completedDays.includes(this.state.currentDay)) {
            this.state.completedDays.push(this.state.currentDay);
            
            const dayBonus = this.lessonsData.config?.points?.dailyGoal || 100;
            this.state.totalPoints += dayBonus;
            
            this.updateStreak();
            
            if (this.onDayComplete) {
                this.onDayComplete(this.state.currentDay, dayBonus);
            }
            
            await this.checkWeekCompletion();
            
            if (this.state.currentDay < 21) {
                this.state.currentDay++;
                this.loadCurrentDayData();
            } else {
                await this.completeProgram();
            }
        }
    }
    
    async checkWeekCompletion() {
        const week = this.state.currentWeek;
        const weekStartDay = (week - 1) * 7 + 1;
        const weekEndDay = week * 7;
        
        let allDaysComplete = true;
        for (let day = weekStartDay; day <= weekEndDay; day++) {
            if (!this.state.completedDays.includes(day)) {
                allDaysComplete = false;
                break;
            }
        }
        
        if (allDaysComplete) {
            const weekBonus = this.lessonsData.config?.points?.weekComplete || 500;
            this.state.totalPoints += weekBonus;
            
            if (this.onWeekComplete) {
                this.onWeekComplete(week, weekBonus);
            }
        }
    }
    
    async completeProgram() {
        this.state.programStatus = 'completed';
        
        const programBonus = this.lessonsData.config?.points?.programComplete || 2000;
        this.state.totalPoints += programBonus;
        
        await this.awardAchievement('program_complete');
        
        if (this.onProgramComplete) {
            this.onProgramComplete(this.state.totalPoints);
        }
        
        await this.saveProgress();
    }
    
    updateStreak() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const lastActivity = this.state.lastActivity ? new Date(this.state.lastActivity) : null;
        
        if (lastActivity) {
            lastActivity.setHours(0, 0, 0, 0);
            const daysDiff = Math.floor((today - lastActivity) / (1000 * 60 * 60 * 24));
            
            if (daysDiff === 1) {
                this.state.streakDays++;
            } else if (daysDiff > 1) {
                this.state.streakDays = 1;
            }
        } else {
            this.state.streakDays = 1;
        }
        
        this.state.lastActivity = new Date().toISOString();
    }
    
    async checkAchievements() {
        const achievements = this.lessonsData.achievements || [];
        const newAchievements = [];
        
        for (const achievement of achievements) {
            if (this.state.earnedAchievements.includes(achievement.id)) {
                continue;
            }
            
            if (this.checkAchievementCondition(achievement)) {
                await this.awardAchievement(achievement.id);
                newAchievements.push(achievement);
            }
        }
        
        return newAchievements;
    }
    
    checkAchievementCondition(achievement) {
        const condition = achievement.condition || {};
        
        switch (condition.type) {
            case 'day_complete':
                return this.state.completedDays.includes(condition.value);
            case 'week_complete':
                const weekDays = this.getWeekDays(condition.value);
                return weekDays.every(d => this.state.completedDays.includes(d));
            case 'task_complete':
                return this.state.completedTasks.includes(condition.value);
            case 'streak':
                return this.state.streakDays >= condition.value;
            default:
                return false;
        }
    }
    
    getWeekDays(weekNumber) {
        const start = (weekNumber - 1) * 7 + 1;
        const days = [];
        for (let i = 0; i < 7; i++) {
            days.push(start + i);
        }
        return days;
    }
    
    async awardAchievement(achievementId) {
        if (this.state.earnedAchievements.includes(achievementId)) {
            return false;
        }
        
        const achievement = this.lessonsData.achievements?.find(a => a.id === achievementId);
        if (!achievement) return false;
        
        this.state.earnedAchievements.push(achievementId);
        this.state.totalPoints += achievement.points || 0;
        
        if (this.supabase) {
            try {
                await this.supabase
                    .from('user_achievements')
                    .insert({
                        user_id: this.userId,
                        achievement_id: achievementId,
                        points_earned: achievement.points || 0,
                        earned_at: new Date().toISOString()
                    });
            } catch (error) {
                console.error('Error saving achievement:', error);
            }
        }
        
        if (this.onAchievement) {
            this.onAchievement(achievement);
        }
        
        return true;
    }
    
    getAchievements() {
        return (this.lessonsData.achievements || []).map(a => ({
            ...a,
            earned: this.state.earnedAchievements.includes(a.id)
        }));
    }
    
    async checkMissedDays() {
        if (!this.state.lastActivity) return;
        
        const lastActivity = new Date(this.state.lastActivity);
        const today = new Date();
        const daysDiff = Math.floor((today - lastActivity) / (1000 * 60 * 60 * 24));
        
        if (daysDiff > 1) {
            console.log(`⚠️ User missed ${daysDiff - 1} days`);
        }
    }
    
    getGreeting() {
        const hour = new Date().getHours();
        
        if (hour < 12) {
            const greeting = this.currentDayData?.morning?.greeting || this.currentDayData?.greeting;
            return greeting || this.getRandomMorningGreeting();
        } else if (hour < 18) {
            return `Добрый день! Продолжаем День ${this.state.currentDay}?`;
        } else {
            const evening = this.currentDayData?.evening?.reflection || this.currentDayData?.eveningReflection;
            return evening || this.getRandomEveningGreeting();
        }
    }
    
    getRandomMorningGreeting() {
        const greetings = this.lessonsData.dailyReminders?.morning || [
            '🌅 Доброе утро! Готовы к новым достижениям?'
        ];
        return greetings[Math.floor(Math.random() * greetings.length)];
    }
    
    getRandomEveningGreeting() {
        const greetings = this.lessonsData.dailyReminders?.evening || [
            '🌙 Как прошёл день? Не забудьте отметить задания!'
        ];
        return greetings[Math.floor(Math.random() * greetings.length)];
    }
    
    getMissedDayMessage() {
        const messages = this.lessonsData.dailyReminders?.missed || [
            '⚠️ Вы пропустили занятие. Не сдавайтесь!'
        ];
        return messages[Math.floor(Math.random() * messages.length)];
    }
    
    getStats() {
        return {
            currentDay: this.state.currentDay,
            currentWeek: this.state.currentWeek,
            totalDays: 21,
            completedDays: this.state.completedDays.length,
            totalPoints: this.state.totalPoints,
            streakDays: this.state.streakDays,
            achievementsEarned: this.state.earnedAchievements.length,
            achievementsTotal: (this.lessonsData.achievements || []).length,
            programProgress: Math.round((this.state.completedDays.length / 21) * 100),
            programStatus: this.state.programStatus
        };
    }
    
    canAccessDay(dayNumber) {
        return dayNumber <= this.state.currentDay;
    }
    
    goToDay(dayNumber) {
        if (!this.canAccessDay(dayNumber)) {
            return false;
        }
        return this.getDayData(dayNumber);
    }
    
    triggerStateChange() {
        if (this.onStateChange) {
            this.onStateChange(this.state);
        }
        window.dispatchEvent(new CustomEvent('assistant:stateChange', {
            detail: this.state
        }));
    }
    
    getCurrentDay() {
        return {
            number: this.state.currentDay,
            data: this.currentDayData,
            progress: this.getDayProgress(this.state.currentDay)
        };
    }
    
    getTodayTasks() {
        return this.getTasksForDay(this.state.currentDay);
    }
    
    getTodayTheory() {
        return this.currentDayData?.theory || null;
    }
    
    getTodayLessons() {
        return this.currentDayData?.lessons || [];
    }
    
    async resetProgress() {
        this.state = {
            initialized: true,
            currentDay: 1,
            currentWeek: 1,
            totalPoints: 0,
            streakDays: 0,
            completedDays: [],
            completedTasks: [],
            completedLessons: [],
            earnedAchievements: [],
            programStatus: 'active',
            lastActivity: null
        };
        
        this.loadCurrentDayData();
        await this.saveProgress();
        this.triggerStateChange();
        
        console.log('🔄 Progress reset');
    }
    
    getAcademyReminder() {
        const day = this.state.currentDay;
        const reminders = {
            1: '🎓 Открой Академию и пройди модуль "Быстрый старт" — заработай первые баллы!',
            3: '🎨 Время освоить Генератор! Открой Академию → Модуль 2',
            5: '📇 Научись работать с контактами! Академия → Модуль CRM',
            7: '📊 Неделя позади! Пора освоить Опросы → Академия',
            10: '📨 Автоматизируй работу! Рассыльщик ждёт → Академия',
            14: '🏆 2 недели! Ты на пути к $1000! Продолжай в Академии!',
            21: '🎉 Поздравляю! 21 день пройден! Получи свои $1000!'
        };
        
        return reminders[day] || this.getRandomAcademyTip();
    }
    
    getRandomAcademyTip() {
        const tips = [
            '🎓 Не забудь: в Академии платят $1000 за 21 день обучения!',
            '💰 Помни: обучение на $1700 — бесплатно, а тебе ещё платят!',
            '🚀 Цель 90 дней: $100,000. Академия — твой путь!',
            '🏆 10 BNB пенсия через год! Продолжай обучение в Академии!',
            '📚 Открой Академию — там 6 модулей практики!',
            '🛡️ Гарантия: не заработаешь $1000 — вернём $22!'
        ];
        return tips[Math.floor(Math.random() * tips.length)];
    }
    
    getMotivationalMessage() {
        const day = this.state.currentDay;
        const points = this.state.totalPoints;
        
        if (day <= 7) {
            return `🔥 Первая неделя! Ты уже заработал ${points} баллов. Цель: освоить все инструменты!`;
        } else if (day <= 14) {
            return `💪 Вторая неделя! ${points} баллов. Время первых продаж и $1000!`;
        } else {
            return `🏆 Финишная прямая! ${points} баллов. $1000 за обучение уже близко!`;
        }
    }
    
    getGuaranteeReminder() {
        return `🛡️ Помни: выполни ВСЕ задания за 21 день — заработаешь минимум $1000!
        
Если не получится — вернём $22 + инструменты на $1700 останутся в подарок!

💰 Старт всего $22 (0.0225 opBNB)
📈 Цель 90 дней: $100,000
🏆 Цель 1 год: пенсия 10 BNB`;
    }
}

window.VirtualAssistant = VirtualAssistant;
console.log('🤖 VirtualAssistant module loaded');

} else {
    console.log('🤖 VirtualAssistant already loaded, skipping');
}

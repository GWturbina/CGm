/* =====================================================
   VIRTUAL ASSISTANT - CORE MODULE v1.0
   Основная логика виртуального помощника
   
   Зависимости:
   - LessonsData (lessons-data.js)
   - Supabase client
   ===================================================== */

class VirtualAssistant {
    constructor(options = {}) {
        this.userId = options.userId || null;
        this.gwId = options.gwId || null;
        this.supabase = options.supabase || window.supabase;
        
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
            programStatus: 'active', // active, completed, paused
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
    
    // ═══════════════════════════════════════════════════════════
    // ИНИЦИАЛИЗАЦИЯ
    // ═══════════════════════════════════════════════════════════
    
    async init() {
        if (!this.userId) {
            console.warn('⚠️ VirtualAssistant: No userId provided');
            return false;
        }
        
        try {
            // Загружаем прогресс из БД
            await this.loadProgress();
            
            // Загружаем данные текущего дня
            this.loadCurrentDayData();
            
            // Проверяем пропущенные дни
            await this.checkMissedDays();
            
            // Проверяем достижения
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
    
    // ═══════════════════════════════════════════════════════════
    // РАБОТА С ПРОГРЕССОМ
    // ═══════════════════════════════════════════════════════════
    
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
            
            if (error && error.code !== 'PGRST116') { // Not found is ok
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
                // Создаём новую запись
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
        // Сохраняем в localStorage как backup
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
    
    // ═══════════════════════════════════════════════════════════
    // ДАННЫЕ ДНЕЙ И УРОКОВ
    // ═══════════════════════════════════════════════════════════
    
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
    
    // ═══════════════════════════════════════════════════════════
    // ВЫПОЛНЕНИЕ ЗАДАНИЙ
    // ═══════════════════════════════════════════════════════════
    
    async completeTask(taskId, data = {}) {
        if (this.state.completedTasks.includes(taskId)) {
            console.log('Task already completed:', taskId);
            return { success: false, reason: 'already_completed' };
        }
        
        // Находим задание
        const task = this.findTask(taskId);
        if (!task) {
            console.error('Task not found:', taskId);
            return { success: false, reason: 'task_not_found' };
        }
        
        // Добавляем очки
        const points = task.points || 0;
        this.state.totalPoints += points;
        
        // Отмечаем как выполненное
        this.state.completedTasks.push(taskId);
        
        // Сохраняем в БД детали выполнения
        await this.saveTaskCompletion(taskId, task, data);
        
        // Проверяем завершение дня
        await this.checkDayCompletion();
        
        // Проверяем достижения
        await this.checkAchievements();
        
        // Сохраняем общий прогресс
        await this.saveProgress();
        
        this.triggerStateChange();
        
        return { 
            success: true, 
            points: points,
            totalPoints: this.state.totalPoints,
            task: task
        };
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
    
    // ═══════════════════════════════════════════════════════════
    // ПРОВЕРКА ЗАВЕРШЕНИЯ ДНЯ/НЕДЕЛИ/ПРОГРАММЫ
    // ═══════════════════════════════════════════════════════════
    
    async checkDayCompletion() {
        const dayProgress = this.getDayProgress(this.state.currentDay);
        
        if (dayProgress.isComplete && !this.state.completedDays.includes(this.state.currentDay)) {
            // День завершён!
            this.state.completedDays.push(this.state.currentDay);
            
            // Бонус за день
            const dayBonus = this.lessonsData.config.points.dailyGoal || 100;
            this.state.totalPoints += dayBonus;
            
            // Обновляем streak
            this.updateStreak();
            
            // Callback
            if (this.onDayComplete) {
                this.onDayComplete(this.state.currentDay, dayBonus);
            }
            
            // Проверяем завершение недели
            await this.checkWeekCompletion();
            
            // Переходим к следующему дню
            if (this.state.currentDay < 21) {
                this.state.currentDay++;
                this.loadCurrentDayData();
            } else {
                // Программа завершена!
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
            const weekBonus = this.lessonsData.config.points.weekComplete || 500;
            this.state.totalPoints += weekBonus;
            
            if (this.onWeekComplete) {
                this.onWeekComplete(week, weekBonus);
            }
        }
    }
    
    async completeProgram() {
        this.state.programStatus = 'completed';
        
        const programBonus = this.lessonsData.config.points.programComplete || 2000;
        this.state.totalPoints += programBonus;
        
        // Достижение "Выпускник"
        await this.awardAchievement('program_complete');
        
        if (this.onProgramComplete) {
            this.onProgramComplete(this.state.totalPoints);
        }
        
        await this.saveProgress();
    }
    
    updateStreak() {
        // Проверяем, был ли вчера активность
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const lastActivity = this.state.lastActivity ? new Date(this.state.lastActivity) : null;
        
        if (lastActivity) {
            lastActivity.setHours(0, 0, 0, 0);
            const daysDiff = Math.floor((today - lastActivity) / (1000 * 60 * 60 * 24));
            
            if (daysDiff === 1) {
                // Продолжаем streak
                this.state.streakDays++;
            } else if (daysDiff > 1) {
                // Streak сбросился
                this.state.streakDays = 1;
            }
            // Если daysDiff === 0, уже был сегодня, ничего не меняем
        } else {
            this.state.streakDays = 1;
        }
        
        this.state.lastActivity = new Date().toISOString();
    }
    
    // ═══════════════════════════════════════════════════════════
    // ДОСТИЖЕНИЯ
    // ═══════════════════════════════════════════════════════════
    
    async checkAchievements() {
        const achievements = this.lessonsData.achievements || [];
        const newAchievements = [];
        
        for (const achievement of achievements) {
            if (this.state.earnedAchievements.includes(achievement.id)) {
                continue; // Уже получено
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
                
            case 'contacts_count':
                // Нужно проверить в таблице contacts
                return false; // TODO: интеграция с contacts
                
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
        
        // Сохраняем в БД
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
        
        // Callback
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
    
    // ═══════════════════════════════════════════════════════════
    // ПРОПУЩЕННЫЕ ДНИ
    // ═══════════════════════════════════════════════════════════
    
    async checkMissedDays() {
        if (!this.state.lastActivity) return;
        
        const lastActivity = new Date(this.state.lastActivity);
        const today = new Date();
        const daysDiff = Math.floor((today - lastActivity) / (1000 * 60 * 60 * 24));
        
        if (daysDiff > 1) {
            console.log(`⚠️ User missed ${daysDiff - 1} days`);
            // Можно отправить уведомление или показать сообщение
        }
    }
    
    // ═══════════════════════════════════════════════════════════
    // СООБЩЕНИЯ И ПРИВЕТСТВИЯ
    // ═══════════════════════════════════════════════════════════
    
    getGreeting() {
        const hour = new Date().getHours();
        
        if (hour < 12) {
            // Поддержка обеих структур: morning.greeting или greeting
            const greeting = this.currentDayData?.morning?.greeting || this.currentDayData?.greeting;
            return greeting || this.getRandomMorningGreeting();
        } else if (hour < 18) {
            return `Добрый день! Продолжаем День ${this.state.currentDay}?`;
        } else {
            // Поддержка обеих структур: evening.reflection или eveningReflection
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
    
    // ═══════════════════════════════════════════════════════════
    // СТАТИСТИКА
    // ═══════════════════════════════════════════════════════════
    
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
    
    // ═══════════════════════════════════════════════════════════
    // НАВИГАЦИЯ
    // ═══════════════════════════════════════════════════════════
    
    canAccessDay(dayNumber) {
        // Можно открыть только текущий день или ранее завершённые
        return dayNumber <= this.state.currentDay;
    }
    
    goToDay(dayNumber) {
        if (!this.canAccessDay(dayNumber)) {
            return false;
        }
        
        // Временно переключаемся для просмотра
        const data = this.getDayData(dayNumber);
        return data;
    }
    
    // ═══════════════════════════════════════════════════════════
    // СОБЫТИЯ
    // ═══════════════════════════════════════════════════════════
    
    triggerStateChange() {
        if (this.onStateChange) {
            this.onStateChange(this.state);
        }
        
        // Dispatch custom event
        window.dispatchEvent(new CustomEvent('assistant:stateChange', {
            detail: this.state
        }));
    }
    
    // ═══════════════════════════════════════════════════════════
    // ПУБЛИЧНОЕ API
    // ═══════════════════════════════════════════════════════════
    
    // Получить текущий день
    getCurrentDay() {
        return {
            number: this.state.currentDay,
            data: this.currentDayData,
            progress: this.getDayProgress(this.state.currentDay)
        };
    }
    
    // Получить все задания текущего дня
    getTodayTasks() {
        return this.getTasksForDay(this.state.currentDay);
    }
    
    // Получить теорию текущего дня
    getTodayTheory() {
        return this.currentDayData?.theory || null;
    }
    
    // Получить уроки текущего дня
    getTodayLessons() {
        return this.currentDayData?.lessons || [];
    }
    
    // Сбросить прогресс (для тестирования)
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
    
    // ═══════════════════════════════════════════════════════════
    // НАПОМИНАНИЯ ОБ АКАДЕМИИ
    // ═══════════════════════════════════════════════════════════
    
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

// Экспорт
if (typeof module !== 'undefined' && module.exports) {
    module.exports = VirtualAssistant;
}

window.VirtualAssistant = VirtualAssistant;

console.log('🤖 VirtualAssistant module loaded');

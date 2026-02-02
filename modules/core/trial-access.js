/* =====================================================
   TRIAL ACCESS SYSTEM - 30 дней полного доступа
   
   Логика:
   - Уровень 4+ активирует 30-дневный триал
   - Существующие пользователи: старт по кнопке "Начать обучение"
   - Новые пользователи: старт с момента оплаты 4+ уровня
   - После триала: доступ по фактическому уровню
   
   Автор: CardGift Team
   Дата: Январь 2026
   ===================================================== */

const TrialAccess = {
    
    // Конфигурация
    config: {
        trialDays: 30,
        minLevelForTrial: 4,
        maxTrialLevel: 7,  // До AI Studio включительно
        academyLaunchDate: '2026-02-02T00:00:00Z', // Дата запуска Академии
        storageKey: 'cardgift_trial'
    },
    
    // Состояние
    state: {
        isTrialActive: false,
        trialStartDate: null,
        trialEndDate: null,
        daysRemaining: 0,
        actualLevel: 0,
        effectiveLevel: 0,
        trialSource: null // 'academy_button' или 'level4_payment'
    },
    
    // ═══════════════════════════════════════════════════════════
    // ИНИЦИАЛИЗАЦИЯ
    // ═══════════════════════════════════════════════════════════
    
    init(userLevel, userId, registrationDate) {
        console.log('🎫 TrialAccess initializing...', { userLevel, userId, registrationDate });
        
        this.state.actualLevel = userLevel || 0;
        this.userId = userId;
        this.registrationDate = registrationDate ? new Date(registrationDate) : null;
        
        // Загружаем данные триала
        this.loadTrialData();
        
        // Проверяем статус триала
        this.checkTrialStatus();
        
        // Вычисляем эффективный уровень
        this.calculateEffectiveLevel();
        
        console.log('🎫 TrialAccess state:', this.state);
        
        return this.state;
    },
    
    // ═══════════════════════════════════════════════════════════
    // РАБОТА С ДАННЫМИ ТРИАЛА
    // ═══════════════════════════════════════════════════════════
    
    loadTrialData() {
        const saved = localStorage.getItem(this.config.storageKey);
        if (saved) {
            try {
                const data = JSON.parse(saved);
                if (data.userId === this.userId) {
                    this.state.trialStartDate = data.startDate ? new Date(data.startDate) : null;
                    this.state.trialSource = data.source || null;
                }
            } catch (e) {
                console.error('❌ Error loading trial data:', e);
            }
        }
    },
    
    saveTrialData() {
        const data = {
            userId: this.userId,
            startDate: this.state.trialStartDate ? this.state.trialStartDate.toISOString() : null,
            source: this.state.trialSource
        };
        localStorage.setItem(this.config.storageKey, JSON.stringify(data));
    },
    
    // ═══════════════════════════════════════════════════════════
    // АКТИВАЦИЯ ТРИАЛА
    // ═══════════════════════════════════════════════════════════
    
    // Запуск триала по кнопке "Начать обучение" (для существующих)
    startTrialFromAcademy() {
        if (this.state.trialStartDate) {
            console.log('⚠️ Trial already started');
            return false;
        }
        
        if (this.state.actualLevel < this.config.minLevelForTrial) {
            console.log('⚠️ Level too low for trial. Need level 4+');
            return false;
        }
        
        this.state.trialStartDate = new Date();
        this.state.trialSource = 'academy_button';
        this.saveTrialData();
        this.checkTrialStatus();
        this.calculateEffectiveLevel();
        
        console.log('🎉 Trial started from Academy!', this.state);
        return true;
    },
    
    // Автозапуск триала при оплате 4+ уровня (для новых)
    startTrialFromPayment() {
        // Проверяем, зарегистрирован ли после запуска Академии
        const academyLaunch = new Date(this.config.academyLaunchDate);
        
        if (this.registrationDate && this.registrationDate >= academyLaunch) {
            // Новый пользователь - автостарт триала
            if (!this.state.trialStartDate) {
                this.state.trialStartDate = new Date();
                this.state.trialSource = 'level4_payment';
                this.saveTrialData();
                console.log('🎉 Trial auto-started from Level 4 payment!');
            }
        }
        
        this.checkTrialStatus();
        this.calculateEffectiveLevel();
        return this.state.isTrialActive;
    },
    
    // ═══════════════════════════════════════════════════════════
    // ПРОВЕРКА СТАТУСА
    // ═══════════════════════════════════════════════════════════
    
    checkTrialStatus() {
        if (!this.state.trialStartDate) {
            this.state.isTrialActive = false;
            this.state.trialEndDate = null;
            this.state.daysRemaining = 0;
            return;
        }
        
        const now = new Date();
        const startDate = new Date(this.state.trialStartDate);
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + this.config.trialDays);
        
        this.state.trialEndDate = endDate;
        
        if (now < endDate) {
            this.state.isTrialActive = true;
            const diffTime = endDate - now;
            this.state.daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        } else {
            this.state.isTrialActive = false;
            this.state.daysRemaining = 0;
        }
    },
    
    // ═══════════════════════════════════════════════════════════
    // РАСЧЁТ ЭФФЕКТИВНОГО УРОВНЯ
    // ═══════════════════════════════════════════════════════════
    
    calculateEffectiveLevel() {
        if (this.state.isTrialActive && this.state.actualLevel >= this.config.minLevelForTrial) {
            // Во время триала - максимальный уровень (до AI Studio)
            this.state.effectiveLevel = Math.max(this.state.actualLevel, this.config.maxTrialLevel);
        } else {
            // После триала или без триала - фактический уровень
            this.state.effectiveLevel = this.state.actualLevel;
        }
        
        return this.state.effectiveLevel;
    },
    
    // ═══════════════════════════════════════════════════════════
    // ПРОВЕРКА ДОСТУПА
    // ═══════════════════════════════════════════════════════════
    
    hasAccess(requiredLevel) {
        return this.state.effectiveLevel >= requiredLevel;
    },
    
    canStartTrial() {
        return !this.state.trialStartDate && this.state.actualLevel >= this.config.minLevelForTrial;
    },
    
    isExistingUser() {
        const academyLaunch = new Date(this.config.academyLaunchDate);
        return this.registrationDate && this.registrationDate < academyLaunch;
    },
    
    // ═══════════════════════════════════════════════════════════
    // ФОРМАТИРОВАНИЕ
    // ═══════════════════════════════════════════════════════════
    
    formatTimeRemaining() {
        if (!this.state.isTrialActive) {
            return 'Триал завершён';
        }
        
        const days = this.state.daysRemaining;
        if (days > 1) {
            return `${days} дней`;
        } else if (days === 1) {
            return '1 день';
        } else {
            // Меньше суток - показываем часы
            const now = new Date();
            const end = new Date(this.state.trialEndDate);
            const hours = Math.ceil((end - now) / (1000 * 60 * 60));
            return `${hours} часов`;
        }
    },
    
    getTrialBadgeHTML() {
        if (!this.state.isTrialActive) {
            return '';
        }
        
        const days = this.state.daysRemaining;
        const color = days > 7 ? '#10B981' : (days > 3 ? '#F59E0B' : '#EF4444');
        
        return `
            <div class="trial-badge" style="
                background: linear-gradient(135deg, ${color}20, ${color}10);
                border: 1px solid ${color};
                border-radius: 12px;
                padding: 8px 16px;
                display: inline-flex;
                align-items: center;
                gap: 8px;
                font-size: 13px;
            ">
                <span style="font-size: 16px;">⏰</span>
                <span>Триал: <strong>${this.formatTimeRemaining()}</strong></span>
            </div>
        `;
    },
    
    // ═══════════════════════════════════════════════════════════
    // UI HELPERS
    // ═══════════════════════════════════════════════════════════
    
    getTrialInfoHTML() {
        if (this.state.isTrialActive) {
            return `
                <div class="trial-info-block" style="
                    background: linear-gradient(135deg, rgba(16,185,129,0.1), rgba(5,150,105,0.05));
                    border: 2px solid #10B981;
                    border-radius: 16px;
                    padding: 20px;
                    margin: 20px 0;
                    text-align: center;
                ">
                    <div style="font-size: 40px; margin-bottom: 10px;">🎉</div>
                    <h3 style="color: #10B981; margin-bottom: 10px;">Полный доступ активен!</h3>
                    <p style="color: #9CA3AF; margin-bottom: 15px;">
                        Все инструменты до AI Studio открыты на 30 дней
                    </p>
                    <div style="
                        background: rgba(0,0,0,0.3);
                        border-radius: 12px;
                        padding: 15px;
                        display: inline-block;
                    ">
                        <div style="font-size: 24px; font-weight: bold; color: #FFD700;">
                            ${this.formatTimeRemaining()}
                        </div>
                        <div style="font-size: 12px; color: #9CA3AF;">осталось</div>
                    </div>
                </div>
            `;
        } else if (this.canStartTrial()) {
            return `
                <div class="trial-info-block" style="
                    background: linear-gradient(135deg, rgba(255,215,0,0.1), rgba(245,158,11,0.05));
                    border: 2px solid #FFD700;
                    border-radius: 16px;
                    padding: 20px;
                    margin: 20px 0;
                    text-align: center;
                ">
                    <div style="font-size: 40px; margin-bottom: 10px;">🎁</div>
                    <h3 style="color: #FFD700; margin-bottom: 10px;">30 дней полного доступа!</h3>
                    <p style="color: #9CA3AF; margin-bottom: 15px;">
                        Нажми "Начать обучение" и получи доступ ко ВСЕМ инструментам
                    </p>
                    <button onclick="TrialAccess.startTrialFromAcademy(); location.reload();" style="
                        background: linear-gradient(135deg, #FFD700, #F59E0B);
                        border: none;
                        border-radius: 12px;
                        padding: 12px 30px;
                        font-size: 16px;
                        font-weight: 600;
                        color: #000;
                        cursor: pointer;
                    ">
                        🚀 Начать обучение
                    </button>
                </div>
            `;
        } else if (this.state.actualLevel < this.config.minLevelForTrial) {
            return `
                <div class="trial-info-block" style="
                    background: linear-gradient(135deg, rgba(100,100,100,0.1), rgba(60,60,60,0.05));
                    border: 2px solid #666;
                    border-radius: 16px;
                    padding: 20px;
                    margin: 20px 0;
                    text-align: center;
                ">
                    <div style="font-size: 40px; margin-bottom: 10px;">🔒</div>
                    <h3 style="color: #9CA3AF; margin-bottom: 10px;">Активируй уровень 4+</h3>
                    <p style="color: #666; margin-bottom: 15px;">
                        Получи 30 дней полного доступа ко всем инструментам!
                    </p>
                    <a href="dashboard.html#wallet" style="
                        display: inline-block;
                        background: linear-gradient(135deg, #3B82F6, #8B5CF6);
                        border-radius: 12px;
                        padding: 12px 30px;
                        font-size: 14px;
                        font-weight: 600;
                        color: #fff;
                        text-decoration: none;
                    ">
                        💳 Активировать
                    </a>
                </div>
            `;
        } else {
            return `
                <div class="trial-info-block" style="
                    background: linear-gradient(135deg, rgba(239,68,68,0.1), rgba(185,28,28,0.05));
                    border: 2px solid #EF4444;
                    border-radius: 16px;
                    padding: 20px;
                    margin: 20px 0;
                    text-align: center;
                ">
                    <div style="font-size: 40px; margin-bottom: 10px;">⏰</div>
                    <h3 style="color: #EF4444; margin-bottom: 10px;">Триал завершён</h3>
                    <p style="color: #9CA3AF; margin-bottom: 15px;">
                        Доступ ограничен уровнем ${this.state.actualLevel}. Активируй следующие уровни для полного доступа!
                    </p>
                    <a href="dashboard.html#wallet" style="
                        display: inline-block;
                        background: linear-gradient(135deg, #FFD700, #F59E0B);
                        border-radius: 12px;
                        padding: 12px 30px;
                        font-size: 14px;
                        font-weight: 600;
                        color: #000;
                        text-decoration: none;
                    ">
                        🔓 Открыть уровни
                    </a>
                </div>
            `;
        }
    },
    
    // ═══════════════════════════════════════════════════════════
    // ОБНОВЛЕНИЕ SECTION RESTRICTIONS С УЧЁТОМ ТРИАЛА
    // ═══════════════════════════════════════════════════════════
    
    updateSectionRestrictionsWithTrial() {
        const level = this.state.effectiveLevel;
        
        // Используем effectiveLevel вместо actualLevel
        window.currentEffectiveLevel = level;
        
        const sections = {
            1: ['section-archive', 'section-panel'],
            2: ['section-contacts', 'section-analytics'],
            3: ['section-referrals'],
            4: ['section-crm'],
            5: ['section-surveys', 'section-blog'],
            6: ['section-mailings'],
            7: ['section-studio', 'section-ai-studio']
        };
        
        // Обновляем все секции
        for (let lvl = 1; lvl <= 7; lvl++) {
            const sectionIds = sections[lvl] || [];
            sectionIds.forEach(sectionId => {
                const section = document.getElementById(sectionId);
                if (section) {
                    const restricted = section.querySelector('.restricted-block');
                    if (restricted) {
                        restricted.style.display = level >= lvl ? 'none' : 'block';
                    }
                }
            });
        }
        
        // Обновляем nav-items
        const navItems = document.querySelectorAll('.nav-item[data-level]');
        navItems.forEach(item => {
            const requiredLevel = parseInt(item.dataset.level) || 0;
            if (requiredLevel > level) {
                item.classList.add('locked');
            } else {
                item.classList.remove('locked');
            }
        });
        
        console.log('🔓 Section restrictions updated with trial. Effective level:', level);
    }
};

// Экспорт
window.TrialAccess = TrialAccess;

console.log('🎫 TrialAccess module loaded');

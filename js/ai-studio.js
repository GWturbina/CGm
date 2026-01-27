/* =====================================================
   AI STUDIO v2.0 - ОБЪЕДИНЁННАЯ ВЕРСИЯ
   
   Включает функциональность из ai-studio-patch.js:
   - Ограниченный доступ Level 1-3 (3 генерации навсегда)
   - Триал Level 4-6 (30 дней)
   - Полный доступ Level 7+
   - Кнопка "В открытку"
   - Управление голосами и музыкой для автора
   
   v2.0:
   - Объединены ai-studio.js + ai-studio-patch.js
   - DEV_WALLETS из CONFIG (config.js)
   - Убран отдельный patch файл
   ===================================================== */

const AIStudio = {
    
    state: {
        cgId: null,
        gwId: null,
        walletAddress: null,
        level: 0,
        hasAccess: false,
        hasTrial: false,
        trialEndsAt: null,
        
        // Новые поля из patch v1.8
        accessType: null,        // 'full', 'trial', 'limited'
        isLimitedAccess: false,  // true для Level 1-3
        lifetimeUsage: { text: 0, image: 0, voice: 0 }, // Для Level 1-3
        
        // Кредиты
        credits: {
            balance: 0,
            usedToday: 0,
            dailyLimit: 0,
            isUnlimited: false
        },
        
        limits: {
            text:  { used: 0, max: 0 },
            image: { used: 0, max: 0 },
            voice: { used: 0, max: 0 },
            video: { used: 0, max: 0 },
            music: { used: 0, max: 0 }
        },
        
        currentTab: 'text',
        currentResult: null,
        archive: []
    },
    
    config: {
        MIN_LEVEL_FULL: 7,      // Полный доступ с 7 уровня
        MIN_LEVEL_TRIAL: 4,     // Триал доступ с 4 уровня (30 дней)
        MIN_LEVEL_LIMITED: 1,   // Ограниченный доступ с 1 уровня (3 генерации навсегда)
        MIN_LEVEL_OWN_API: 7,   // Level 7+ видят "Свой API"
        TRIAL_DAYS: 30,
        
        LIMITS_BY_LEVEL: {
            // Level 1-3: 3 генерации НАВСЕГДА (не в день!)
            limited: { text: 3, image: 3, voice: 3, video: 0, music: 999 },
            1: { text: 3, image: 3, voice: 3, video: 0, music: 999 },
            2: { text: 3, image: 3, voice: 3, video: 0, music: 999 },
            3: { text: 3, image: 3, voice: 3, video: 0, music: 999 },
            
            // Level 4-6: триал 30 дней (лимиты в день)
            trial: { text: 5, image: 3, voice: 3, video: 1, music: 5 },
            4:  { text: 10,  image: 5,  voice: 5,  video: 2,  music: 5  },
            5:  { text: 15,  image: 8,  voice: 8,  video: 3,  music: 5  },
            6:  { text: 18,  image: 9,  voice: 9,  video: 4,  music: 5  },
            
            // Level 7+: полный доступ (лимиты в день, бессрочно)
            7:  { text: 20,  image: 10, voice: 10, video: 5,  music: 10  },
            8:  { text: 30,  image: 15, voice: 15, video: 8,  music: 15  },
            9:  { text: 50,  image: 25, voice: 25, video: 12, music: 20 },
            10: { text: 70,  image: 35, voice: 35, video: 18, music: 25 },
            11: { text: 100, image: 50, voice: 50, video: 25, music: 30 },
            12: { text: 150, image: 75, voice: 75, video: 40, music: 50 }
        },
        
        TEMPLATES: {
            text: [
                { id: 'birthday', icon: '🎂', nameKey: 'templateBirthday', prompt: 'Напиши теплое поздравление с днём рождения' },
                { id: 'newyear', icon: '🎄', nameKey: 'templateNewYear', prompt: 'Напиши поздравление с Новым годом' },
                { id: 'thanks', icon: '🙏', nameKey: 'templateThanks', prompt: 'Напиши благодарственное письмо' },
                { id: 'invite', icon: '💌', nameKey: 'templateInvite', prompt: 'Напиши приглашение на мероприятие' },
                { id: 'motivation', icon: '💪', nameKey: 'templateMotivation', prompt: 'Напиши мотивационный пост' },
                { id: 'business', icon: '💼', nameKey: 'templateBusiness', prompt: 'Напиши деловое предложение' },
                { id: 'club', icon: '🚀', nameKey: 'templateClub', prompt: 'Напиши приглашение в GlobalWay клуб' }
            ],
            image: [
                { id: 'abstract', icon: '🎨', nameKey: 'templateAbstract', prompt: 'Абстрактный градиент' },
                { id: 'neon', icon: '💜', nameKey: 'templateNeon', prompt: 'Неоновые волны' },
                { id: 'sunset', icon: '🌅', nameKey: 'templateSunset', prompt: 'Закат' }
            ],
            voice: [
                { id: 'greeting', icon: '👋', nameKey: 'templateVoiceGreeting', prompt: 'Привет! Рад тебя приветствовать!' }
            ],
            music: []
        },
        
        // ═══════════════════════════════════════════════════════════
        // БИБЛИОТЕКА ГОЛОСОВ (ElevenLabs)
        // ═══════════════════════════════════════════════════════════
        // ID соответствуют voiceMap в api/ai/voice.js
        // НЕ ТРОГАТЬ ПРИ ОБНОВЛЕНИЯХ!
        VOICES_LIBRARY: [
            // ═══ СЛАВЯНСКИЕ ГОЛОСА (RU/UA) ═══
            { id: 'alex-nekrasov', name: 'Алекс Некрасов', gender: 'male', language: 'ru,ua', description: 'Глубокий мужской, диктор' },
            { id: 'taras-boyko', name: 'Тарас Бойко', gender: 'male', language: 'ua', description: 'Украинский, тёплый' },
            { id: 'vladimir', name: 'Владимир', gender: 'male', language: 'ru', description: 'Деловой стиль' },
            { id: 'evgeniy', name: 'Евгений', gender: 'male', language: 'ru', description: 'Молодой энергичный' },
            { id: 'leonid-drapey', name: 'Леонид Драпей', gender: 'male', language: 'ru,ua', description: 'Спокойный нарратор' },
            { id: 'anna-stepanenko', name: 'Анна Степаненко', gender: 'female', language: 'ua', description: 'Украинский приятный' },
            
            // ═══ ДОПОЛНИТЕЛЬНЫЕ МУЖСКИЕ ═══
            { id: 'voice-m6', name: 'Голос M6', gender: 'male', language: 'multilingual', description: 'Дополнительный мужской' },
            { id: 'voice-m7', name: 'Голос M7', gender: 'male', language: 'multilingual', description: 'Дополнительный мужской' },
            { id: 'voice-m8', name: 'Голос M8', gender: 'male', language: 'multilingual', description: 'Дополнительный мужской' },
            { id: 'voice-m9', name: 'Голос M9', gender: 'male', language: 'multilingual', description: 'Дополнительный мужской' },
            { id: 'voice-m10', name: 'Голос M10', gender: 'male', language: 'multilingual', description: 'Дополнительный мужской' },
            
            // ═══ ДОПОЛНИТЕЛЬНЫЕ ЖЕНСКИЕ ═══
            { id: 'voice-f2', name: 'Голос F2', gender: 'female', language: 'multilingual', description: 'Дополнительный женский' },
            { id: 'voice-f3', name: 'Голос F3', gender: 'female', language: 'multilingual', description: 'Дополнительный женский' },
            { id: 'voice-f4', name: 'Голос F4', gender: 'female', language: 'multilingual', description: 'Дополнительный женский' },
            { id: 'voice-f5', name: 'Голос F5', gender: 'female', language: 'multilingual', description: 'Дополнительный женский' },
            { id: 'voice-f6', name: 'Голос F6', gender: 'female', language: 'multilingual', description: 'Дополнительный женский' },
            { id: 'voice-f7', name: 'Голос F7', gender: 'female', language: 'multilingual', description: 'Дополнительный женский' },
            { id: 'voice-f8', name: 'Голос F8', gender: 'female', language: 'multilingual', description: 'Дополнительный женский' },
            { id: 'voice-f9', name: 'Голос F9', gender: 'female', language: 'multilingual', description: 'Дополнительный женский' },
            { id: 'voice-f10', name: 'Голос F10', gender: 'female', language: 'multilingual', description: 'Дополнительный женский' },
        ],
        
        // Пользовательские голоса (добавляются автором)
        CUSTOM_VOICES: [],
        
        // Музыкальная библиотека
        MUSIC_LIBRARY: {
            categories: [
                { id: 'all', name: '🎵 Все треки', icon: '🎵' },
                { id: 'holiday', name: '🎂 Праздничная', icon: '🎂' },
                { id: 'calm', name: '😌 Спокойная', icon: '😌' },
                { id: 'cinematic', name: '🎬 Кинематографичная', icon: '🎬' },
                { id: 'happy', name: '😊 Весёлая', icon: '😊' },
                { id: 'corporate', name: '💼 Корпоративная', icon: '💼' },
                { id: 'romantic', name: '💕 Романтичная', icon: '💕' },
                { id: 'custom', name: '📁 Мои треки', icon: '📁' }
            ],
            tracks: [
                // 🎂 Праздничная
                // Добавьте реальные ссылки с https://pixabay.com/music/
                // Пример: скачайте MP3, загрузите на свой CDN или используйте прямые ссылки
                
                // 😌 Спокойная
                // Пусто - добавьте свои треки
                
                // 🎬 Кинематографичная
                // Пусто - добавьте свои треки
                
                // Примечание: старые ссылки были некорректными
                // Используйте кнопку "Загрузить MP3" для добавления своих треков
                // Или добавьте ссылки из Pixabay/Freesound сюда
            ]
        }
    },
    
    // DEV_WALLETS из CONFIG (config.js) с fallback
    get DEV_WALLETS() {
        if (window.CONFIG?.DEV_WALLETS && Array.isArray(window.CONFIG.DEV_WALLETS)) {
            return window.CONFIG.DEV_WALLETS.map(w => w.toLowerCase());
        }
        // Fallback если CONFIG не загружен
        return [
            '0xa3496cacc8523421dd151f1d92a456c2dafa28c2',
            '0x7bcd1753868895971e12448412cb3216d47884c8'
        ];
    },
    
    // ═══════════════════════════════════════════════════════════
    // 🛡️ ФИЛЬТР КОНТЕНТА
    // ═══════════════════════════════════════════════════════════
    
    checkContent(text) {
        if (!text) return true;
        
        if (window.ContentFilter) {
            const result = window.ContentFilter.check(text);
            if (!result.allowed) {
                this.showNotification('🚫 ' + result.reason, 'error');
                return false;
            }
            return true;
        }
        
        const forbidden = ['хуй','пизд','блять','ебат','сука','мудак','porn','fuck','shit'];
        const lower = text.toLowerCase();
        for (const word of forbidden) {
            if (lower.includes(word)) {
                this.showNotification('🚫 Запрещённый контент', 'error');
                return false;
            }
        }
        return true;
    },
    
    // ═══════════════════════════════════════════════════════════
    // ИНИЦИАЛИЗАЦИЯ
    // ═══════════════════════════════════════════════════════════
    
    async init() {
        console.log('🎬 AI Studio v1.7 initializing...');
        
        // Убираем overlay, показываем контент сразу
        this.showMainContent();
        
        // Автоподключение кошелька
        await this.autoConnectWallet();
        
        // Загружаем данные
        await this.loadUserData();
        
        // Проверяем доступ
        await this.checkAccess();
        
        // Загружаем кредиты
        await this.loadCredits();
        
        // Загружаем кастомные голоса
        this.initCustomVoices();
        
        // UI
        this.initTabs();
        this.initTemplates();
        this.initGenerators();
        this.initArchive();
        this.initMusic();
        this.updateLimitsDisplay();
        this.updateCreditsDisplay();
        this.updateUI();
        
        // Обновляем список голосов
        this.updateVoiceSelect();
        
        // Показываем кнопки автора
        if (this.isAuthor()) {
            this.showAuthorTools();
        }
        
        if (this.state.hasAccess) {
            await this.loadTodayUsage();
        }
        
        this.initLanguage();
        
        if (window.ContentFilter) {
            console.log('🛡️ ContentFilter active');
        }
        
        console.log('✅ AI Studio initialized');
        console.log('📊 State:', this.state);
    },
    
    // Показать инструменты автора
    showAuthorTools() {
        console.log('👑 Adding author tools...');
        
        // Ждём пока DOM загрузится
        setTimeout(() => {
            // Добавляем кнопку управления голосами в таб голоса
            const voiceTab = document.getElementById('voiceTab');
            if (voiceTab && !voiceTab.querySelector('.author-tool-btn')) {
                const btn = document.createElement('button');
                btn.className = 'author-tool-btn';
                btn.innerHTML = '🎙️ Управление голосами';
                btn.style.cssText = `
                    margin: 10px 0 20px;
                    padding: 12px 20px;
                    background: linear-gradient(135deg, #FFD700, #FFA500);
                    border: none;
                    border-radius: 8px;
                    color: #000;
                    font-weight: 600;
                    cursor: pointer;
                    display: block;
                    width: 100%;
                `;
                btn.onclick = () => this.showVoiceManager();
                const card = voiceTab.querySelector('.generation-card');
                if (card) card.insertBefore(btn, card.firstChild);
            }
            
            // Добавляем кнопку информации о музыке в таб музыки
            const musicTab = document.getElementById('musicTab');
            if (musicTab && !musicTab.querySelector('.author-tool-btn')) {
                const btn = document.createElement('button');
                btn.className = 'author-tool-btn';
                btn.innerHTML = '🎵 Где брать музыку';
                btn.style.cssText = `
                    margin: 10px 0 20px;
                    padding: 12px 20px;
                    background: linear-gradient(135deg, #FFD700, #FFA500);
                    border: none;
                    border-radius: 8px;
                    color: #000;
                    font-weight: 600;
                    cursor: pointer;
                    display: block;
                    width: 100%;
                `;
                btn.onclick = () => this.showMusicSources();
                const card = musicTab.querySelector('.generation-card');
                if (card) card.insertBefore(btn, card.firstChild);
            }
            
            console.log('👑 Author tools added');
        }, 1000);
    },
    
    // Добавить кнопку автора в секцию (legacy)
    addAuthorButton(text, onClick, selectors) {
        // Не используется
    },
    
    // ═══════════════════════════════════════════════════════════
    // АВТОПОДКЛЮЧЕНИЕ КОШЕЛЬКА
    // ═══════════════════════════════════════════════════════════
    
    async autoConnectWallet() {
        if (typeof window.ethereum === 'undefined') {
            console.log('❌ No wallet extension');
            return;
        }
        
        try {
            // Сначала проверяем уже подключенные
            let accounts = await window.ethereum.request({ method: 'eth_accounts' });
            
            // Если нет - запрашиваем подключение автоматически
            if (!accounts || accounts.length === 0) {
                console.log('🔄 Requesting wallet connection...');
                accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
            }
            
            if (accounts && accounts.length > 0) {
                this.state.walletAddress = accounts[0].toLowerCase();
                console.log('💳 Wallet connected:', this.state.walletAddress);
            }
        } catch (error) {
            console.log('⚠️ Wallet connection declined or error:', error.message);
        }
    },
    
    async connectWallet() {
        if (typeof window.ethereum === 'undefined') {
            this.showNotification('Установите SafePal или MetaMask', 'error');
            return null;
        }
        
        try {
            const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
            if (accounts && accounts.length > 0) {
                this.state.walletAddress = accounts[0].toLowerCase();
                console.log('💳 Wallet connected:', this.state.walletAddress);
                
                await this.loadUserData();
                await this.checkAccess();
                this.updateUI();
                
                if (this.state.hasAccess) {
                    await this.loadTodayUsage();
                }
                
                this.showNotification('✅ Кошелёк подключен', 'success');
                return this.state.walletAddress;
            }
        } catch (error) {
            console.error('Connection error:', error);
            this.showNotification('Ошибка подключения', 'error');
        }
        return null;
    },
    
    // ═══════════════════════════════════════════════════════════
    // ЗАГРУЗКА ДАННЫХ
    // ═══════════════════════════════════════════════════════════
    
    async loadUserData() {
        if (!this.state.walletAddress) return;
        
        console.log('📋 Loading user data...');
        
        // DEV WALLETS - сразу level 12
        if (this.DEV_WALLETS.includes(this.state.walletAddress.toLowerCase())) {
            console.log('🔧 Dev wallet - full access');
            this.state.level = 12;
            this.state.cgId = 'DEV';
        }
        
        // Owner контракта GlobalWay - тоже полный доступ
        if (!this.state.cgId && window.GlobalWayBridge) {
            try {
                const isOwner = await GlobalWayBridge.isOwner(this.state.walletAddress);
                if (isOwner) {
                    console.log('👑 Contract owner - full access');
                    this.state.level = 12;
                    this.state.cgId = 'OWNER';
                }
            } catch (e) {
                console.warn('Owner check failed:', e.message);
            }
        }
        
        // Supabase
        if (window.SupabaseClient && SupabaseClient.client) {
            try {
                const { data, error } = await SupabaseClient.client
                    .from('user_id_links')
                    .select('*')
                    .eq('wallet_address', this.state.walletAddress.toLowerCase())
                    .limit(1);
                
                if (!error && data && data.length > 0) {
                    const user = data[0];
                    this.state.cgId = user.cg_id;
                    this.state.gwId = user.gw_id;
                    if (!this.DEV_WALLETS.includes(this.state.walletAddress.toLowerCase())) {
                        this.state.level = user.gw_level || 0;
                    }
                    console.log('✅ User found:', { cgId: user.cg_id, level: this.state.level });
                }
            } catch (e) {
                console.warn('Supabase error:', e.message);
            }
        }
        
        // Blockchain fallback
        if (this.state.level === 0 && window.GlobalWayBridge) {
            try {
                const level = await GlobalWayBridge.getUserMaxLevel(this.state.walletAddress);
                if (level > 0) this.state.level = level;
            } catch (e) {}
        }
        
        this.updateUserDisplay();
    },
    
    // ═══════════════════════════════════════════════════════════
    // ПРОВЕРКА ДОСТУПА (v2.0 - включает Level 1-3)
    // ═══════════════════════════════════════════════════════════
    
    async checkAccess() {
        console.log('🔐 Checking access...');
        
        // Нет кошелька
        if (!this.state.walletAddress) {
            console.log('❌ No wallet');
            this.state.hasAccess = false;
            return false;
        }
        
        // DEV WALLET
        if (this.DEV_WALLETS.includes(this.state.walletAddress.toLowerCase())) {
            console.log('✅ Dev wallet - unlimited');
            this.state.hasAccess = true;
            this.state.level = 12;
            this.state.accessType = 'full';
            this.setLimitsForLevel(12);
            return true;
        }
        
        // OWNER контракта (cgId установлен в loadUserData)
        if (this.state.cgId === 'OWNER' || this.state.cgId === 'DEV') {
            console.log('👑 Owner/Dev - unlimited access');
            this.state.hasAccess = true;
            this.state.level = 12;
            this.state.accessType = 'full';
            this.setLimitsForLevel(12);
            return true;
        }
        
        // Нет регистрации
        if (!this.state.cgId) {
            console.log('❌ No CG_ID');
            this.state.hasAccess = false;
            return false;
        }
        
        // Level 7+ - полный доступ (бессрочно)
        if (this.state.level >= this.config.MIN_LEVEL_FULL) {
            console.log('✅ Full access (Level 7+)');
            this.state.hasAccess = true;
            this.state.accessType = 'full';
            this.setLimitsForLevel(this.state.level);
            return true;
        }
        
        // Level 4-6 - триал 30 дней
        if (this.state.level >= this.config.MIN_LEVEL_TRIAL) {
            const trial = await this.checkTrialPeriod();
            if (trial.active) {
                console.log('✅ Trial access (Level 4-6), days left:', trial.daysLeft);
                this.state.hasAccess = true;
                this.state.accessType = 'trial';
                this.state.hasTrial = true;
                this.state.trialEndsAt = trial.endsAt;
                this.setLimitsForLevel(this.state.level);
                this.showTrialBanner(trial.daysLeft);
                return true;
            } else {
                console.log('❌ Trial expired - need Level 7+');
                this.state.hasAccess = false;
                this.showTrialExpiredMessage();
                return false;
            }
        }
        
        // Level 1-3 - ограниченный доступ (3 генерации навсегда)
        if (this.state.level >= this.config.MIN_LEVEL_LIMITED) {
            console.log('✅ Limited access (Level 1-3) - 3 generations lifetime');
            this.state.hasAccess = true;
            this.state.accessType = 'limited';
            this.state.isLimitedAccess = true;
            await this.loadLifetimeUsage();
            this.setLimitsForLevel(this.state.level);
            this.showLimitedBanner();
            return true;
        }
        
        // Level 0 - нет доступа
        console.log('❌ No access - need Level 1+');
        this.state.hasAccess = false;
        return false;
    },
    
    // ═══════════════════════════════════════════════════════════
    // ФУНКЦИИ ДЛЯ ОГРАНИЧЕННОГО ДОСТУПА (Level 1-3)
    // ═══════════════════════════════════════════════════════════
    
    // Баннер для ограниченного доступа (Level 1-3)
    showLimitedBanner() {
        const banner = document.getElementById('trialBanner');
        if (banner) {
            const remaining = this.getRemainingLifetimeGenerations();
            banner.innerHTML = `
                <div style="background: linear-gradient(90deg, #6366f1, #8b5cf6); color: white; padding: 12px 24px; text-align: center; font-size: 14px;">
                    🎁 Ограниченный доступ: осталось <strong>${remaining.text}</strong> текст, <strong>${remaining.image}</strong> картинок, <strong>${remaining.voice}</strong> голос
                    <a href="dashboard.html" style="color: #FFD700; font-weight: 600; margin-left: 16px;">Level 4+ для триала</a>
                </div>
            `;
            banner.style.display = 'block';
        }
    },
    
    // Загрузить использование за всё время (для уровней 1-3)
    async loadLifetimeUsage() {
        const key = `ai_studio_lifetime_${this.state.cgId}`;
        const saved = localStorage.getItem(key);
        
        if (saved) {
            const usage = JSON.parse(saved);
            this.state.lifetimeUsage = usage;
            this.state.limits.text.used = usage.text || 0;
            this.state.limits.image.used = usage.image || 0;
            this.state.limits.voice.used = usage.voice || 0;
        } else {
            this.state.lifetimeUsage = { text: 0, image: 0, voice: 0 };
        }
    },
    
    // Сохранить использование за всё время
    saveLifetimeUsage() {
        if (!this.state.isLimitedAccess) return;
        
        const key = `ai_studio_lifetime_${this.state.cgId}`;
        const usage = {
            text: this.state.limits.text.used,
            image: this.state.limits.image.used,
            voice: this.state.limits.voice.used
        };
        localStorage.setItem(key, JSON.stringify(usage));
        this.state.lifetimeUsage = usage;
    },
    
    // Получить оставшиеся генерации
    getRemainingLifetimeGenerations() {
        return {
            text: Math.max(0, 3 - (this.state.lifetimeUsage?.text || 0)),
            image: Math.max(0, 3 - (this.state.lifetimeUsage?.image || 0)),
            voice: Math.max(0, 3 - (this.state.lifetimeUsage?.voice || 0))
        };
    },
    
    // Сообщение о истёкшем триале
    showTrialExpiredMessage() {
        const overlay = document.getElementById('accessCheck');
        if (overlay) {
            overlay.innerHTML = `
                <div style="text-align:center;padding:40px;">
                    <div style="font-size:48px;margin-bottom:16px;">⏰</div>
                    <h2 style="color:#fff;margin-bottom:12px;">Триальный период истёк</h2>
                    <p style="color:#aaa;margin-bottom:20px;">
                        Для продолжения работы с AI Studio<br>
                        необходим <strong style="color:#FFD700;">7 уровень</strong> или выше
                    </p>
                    <a href="dashboard.html" style="display:inline-block;padding:12px 24px;background:linear-gradient(135deg,#8b5cf6,#ec4899);color:#fff;text-decoration:none;border-radius:8px;font-weight:600;">
                        Повысить уровень
                    </a>
                </div>
            `;
            overlay.style.display = 'flex';
        }
    },
    
    // ═══════════════════════════════════════════════════════════
    // КРЕДИТЫ
    // ═══════════════════════════════════════════════════════════
    
    async loadCredits() {
        if (!this.state.walletAddress) {
            console.log('💳 No wallet for credits');
            return;
        }
        
        try {
            // Инициализируем кредиты если нужно
            await fetch('/api/ai/credits?action=init', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    wallet: this.state.walletAddress,
                    level: this.state.level
                })
            });
            
            // Получаем текущий баланс
            const response = await fetch(
                `/api/ai/credits?action=get&wallet=${this.state.walletAddress}`
            );
            const data = await response.json();
            
            this.state.credits = {
                balance: data.balance || 0,
                usedToday: data.usedToday || 0,
                dailyLimit: data.dailyLimit || 0,
                isUnlimited: data.isUnlimited || false
            };
            
            console.log('💳 Credits loaded:', this.state.credits);
            
        } catch (error) {
            console.error('Credits load error:', error);
        }
    },
    
    async useCredits(amount = 1, type = 'generation') {
        if (this.state.credits.isUnlimited) {
            return { success: true };
        }
        
        try {
            const response = await fetch('/api/ai/credits?action=use', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    wallet: this.state.walletAddress,
                    amount,
                    type
                })
            });
            
            const data = await response.json();
            
            if (!data.success) {
                return { success: false, error: data.error };
            }
            
            // Обновляем локальное состояние
            if (data.usedFromBalance) {
                this.state.credits.balance = data.remaining;
            } else {
                this.state.credits.usedToday = data.usedToday;
            }
            
            this.updateCreditsDisplay();
            return { success: true };
            
        } catch (error) {
            console.error('Use credits error:', error);
            return { success: false, error: error.message };
        }
    },
    
    canUseCredits() {
        // Авторы/разработчики - безлимит
        if (this.DEV_WALLETS.includes(this.state.walletAddress?.toLowerCase())) {
            return true;
        }
        
        if (this.state.credits.isUnlimited) return true;
        
        const remainingDaily = this.state.credits.dailyLimit - this.state.credits.usedToday;
        return remainingDaily > 0 || this.state.credits.balance > 0;
    },
    
    getRemainingCredits() {
        // Авторы - бесконечность
        if (this.DEV_WALLETS.includes(this.state.walletAddress?.toLowerCase())) {
            return '∞';
        }
        
        if (this.state.credits.isUnlimited) return '∞';
        
        const remainingDaily = this.state.credits.dailyLimit - this.state.credits.usedToday;
        const total = remainingDaily + this.state.credits.balance;
        return total;
    },
    
    updateCreditsDisplay() {
        const el = document.getElementById('creditsDisplay');
        if (!el) return;
        
        // Авторы - безлимит
        if (this.DEV_WALLETS.includes(this.state.walletAddress?.toLowerCase())) {
            el.innerHTML = '💎 ∞';
            el.title = 'Безлимитный доступ (Автор)';
            return;
        }
        
        if (this.state.credits.isUnlimited) {
            el.innerHTML = '💎 ∞';
            el.title = 'Безлимитный доступ';
        } else {
            const remaining = this.getRemainingCredits();
            el.innerHTML = `💳 ${remaining}`;
            el.title = `Дневной лимит: ${this.state.credits.dailyLimit}, Баланс: ${this.state.credits.balance}`;
        }
    },
    
    // ═══════════════════════════════════════════════════════════
    // TRIAL PERIOD
    // ═══════════════════════════════════════════════════════════
    
    async checkTrialPeriod() {
        if (!this.state.cgId) return { active: false };
        
        const key = `globalstudio_trial_${this.state.cgId}`;
        const saved = localStorage.getItem(key);
        
        if (saved) {
            const trial = JSON.parse(saved);
            const endsAt = new Date(trial.end);
            const now = new Date();
            
            if (endsAt > now) {
                const daysLeft = Math.ceil((endsAt - now) / (1000 * 60 * 60 * 24));
                return { active: true, endsAt: trial.end, daysLeft };
            }
            return { active: false, expired: true };
        }
        
        // Создаём новый trial
        const now = new Date();
        const endsAt = new Date(now.getTime() + this.config.TRIAL_DAYS * 24 * 60 * 60 * 1000);
        
        localStorage.setItem(key, JSON.stringify({
            start: now.toISOString(),
            end: endsAt.toISOString()
        }));
        
        return { active: true, endsAt: endsAt.toISOString(), daysLeft: this.config.TRIAL_DAYS };
    },
    
    // ═══════════════════════════════════════════════════════════
    // ЛИМИТЫ
    // ═══════════════════════════════════════════════════════════
    
    setLimitsForLevel(level) {
        // Для авторов - безлимит
        if (this.DEV_WALLETS.includes(this.state.walletAddress?.toLowerCase())) {
            this.state.limits.text.max = 9999;
            this.state.limits.image.max = 9999;
            this.state.limits.voice.max = 9999;
            this.state.limits.video.max = 9999;
            this.state.limits.music.max = 9999;
            console.log('👑 Author unlimited access set');
            return;
        }
        
        let limits;
        if (level === 'trial') {
            limits = this.config.LIMITS_BY_LEVEL.trial;
        } else {
            limits = this.config.LIMITS_BY_LEVEL[level] || this.config.LIMITS_BY_LEVEL[12];
        }
        
        this.state.limits.text.max = limits.text;
        this.state.limits.image.max = limits.image;
        this.state.limits.voice.max = limits.voice;
        this.state.limits.video.max = limits.video;
        this.state.limits.music.max = limits.music;
    },
    
    async loadTodayUsage() {
        const today = new Date().toISOString().split('T')[0];
        const key = `globalstudio_usage_${this.state.cgId}_${today}`;
        const saved = localStorage.getItem(key);
        
        if (saved) {
            const usage = JSON.parse(saved);
            this.state.limits.text.used = usage.text || 0;
            this.state.limits.image.used = usage.image || 0;
            this.state.limits.voice.used = usage.voice || 0;
            this.updateLimitsDisplay();
        }
    },
    
    saveTodayUsage() {
        // Для ограниченного доступа (Level 1-3) - сохраняем lifetime
        if (this.state.isLimitedAccess) {
            this.saveLifetimeUsage();
            this.showLimitedBanner(); // Обновляем баннер
            return;
        }
        
        // Для остальных - дневной лимит
        const today = new Date().toISOString().split('T')[0];
        const key = `globalstudio_usage_${this.state.cgId}_${today}`;
        localStorage.setItem(key, JSON.stringify({
            text: this.state.limits.text.used,
            image: this.state.limits.image.used,
            voice: this.state.limits.voice.used
        }));
    },
    
    canGenerate(type) {
        if (!this.state.hasAccess) return false;
        
        // Авторы - всегда могут
        if (this.DEV_WALLETS.includes(this.state.walletAddress?.toLowerCase())) {
            return true;
        }
        
        const limit = this.state.limits[type];
        return limit && limit.used < limit.max;
    },
    
    // ═══════════════════════════════════════════════════════════
    // UI
    // ═══════════════════════════════════════════════════════════
    
    showMainContent() {
        // Скрываем overlay
        const overlay = document.getElementById('accessCheck');
        if (overlay) overlay.style.display = 'none';
        
        // Показываем контент
        const main = document.getElementById('mainContent');
        if (main) main.style.display = 'block';
    },
    
    updateUI() {
        this.updateUserDisplay();
        this.updateLimitsDisplay();
        this.updateButtonsState();
    },
    
    updateUserDisplay() {
        const walletEl = document.getElementById('walletAddress');
        const levelEl = document.getElementById('userLevel');
        
        if (this.state.walletAddress) {
            if (walletEl) walletEl.textContent = this.state.walletAddress.slice(0, 6) + '...' + this.state.walletAddress.slice(-4);
            if (levelEl) levelEl.textContent = `Level: ${this.state.level}`;
        } else {
            if (walletEl) walletEl.innerHTML = `<button onclick="AIStudio.connectWallet()" style="background:#8b5cf6;color:white;border:none;padding:6px 12px;border-radius:6px;cursor:pointer;">💳 Connect</button>`;
            if (levelEl) levelEl.textContent = '';
        }
    },
    
    updateLimitsDisplay() {
        ['text', 'image', 'voice'].forEach(type => {
            const el = document.getElementById(`${type}Limit`);
            if (el) {
                const limit = this.state.limits[type];
                const valueEl = el.querySelector('.limit-value');
                if (valueEl) valueEl.textContent = `${limit.used}/${limit.max}`;
                
                if (limit.used >= limit.max * 0.8) {
                    el.classList.add('limit-warning');
                } else {
                    el.classList.remove('limit-warning');
                }
            }
        });
    },
    
    updateButtonsState() {
        const buttons = ['generateTextBtn', 'generateImageBtn', 'generateVoiceBtn'];
        buttons.forEach(id => {
            const btn = document.getElementById(id);
            if (btn) {
                if (!this.state.hasAccess) {
                    btn.disabled = true;
                    btn.style.opacity = '0.5';
                    btn.title = 'Подключите кошелёк и зарегистрируйтесь';
                } else {
                    btn.disabled = false;
                    btn.style.opacity = '1';
                    btn.title = '';
                }
            }
        });
        this.updateApiButtonVisibility();
    },
    
    canUseOwnApi() {
        if (this.DEV_WALLETS.includes(this.state.walletAddress?.toLowerCase())) {
            return true;
        }
        return this.state.level >= this.config.MIN_LEVEL_OWN_API;
    },
    
    updateApiButtonVisibility() {
        const apiBtn = document.querySelector('.btn-settings-api');
        if (apiBtn) {
            apiBtn.style.display = this.canUseOwnApi() ? 'flex' : 'none';
        }
    },
    
    showTrialBanner(daysLeft) {
        const banner = document.getElementById('trialBanner');
        if (banner) {
            banner.innerHTML = `
                <div class="trial-banner">
                    ⏰ Пробный период: ${daysLeft} ${this.pluralize(daysLeft, 'день', 'дня', 'дней')}
                    <a href="levels.html?package=7">Активировать полный доступ</a>
                </div>
            `;
            banner.style.display = 'block';
        }
    },
    
    // ═══════════════════════════════════════════════════════════
    // ГЕНЕРАЦИЯ (ЧЕРЕЗ СЕРВЕРНЫЙ API)
    // ═══════════════════════════════════════════════════════════
    
    // Ключ теперь на сервере в Environment Variables (безопасно!)
    
    async generateText() {
        if (!this.state.hasAccess) {
            this.showNotification('Подключите кошелёк', 'error');
            return;
        }
        
        if (!this.canGenerate('text')) {
            this.showNotification(this.t('limitExceeded'), 'error');
            return;
        }
        
        const style = document.getElementById('textStyle')?.value || 'greeting';
        const prompt = document.getElementById('textPrompt')?.value?.trim();
        
        if (!prompt) {
            this.showNotification(this.t('enterPrompt'), 'error');
            return;
        }
        
        if (!this.checkContent(prompt)) return;
        
        this.showLoading('✨ Генерация текста...');
        
        try {
            // Вызов через серверный API (ключ на сервере!)
            const response = await fetch('/api/ai/text', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    prompt: prompt,
                    style: style
                })
            });
            
            if (!response.ok) {
                const err = await response.json().catch(() => ({}));
                console.error('API error:', err);
                throw new Error(err.error || 'API Error');
            }
            
            const data = await response.json();
            const text = data.text || '';
            
            if (!text) throw new Error('Empty response');
            
            this.showTextResult(text);
            this.showNotification('✅ Текст сгенерирован!', 'success');
            
            this.state.limits.text.used++;
            this.updateLimitsDisplay();
            this.saveTodayUsage();
            
        } catch (error) {
            console.error('Text generation error:', error);
            this.showNotification('❌ Ошибка: ' + error.message, 'error');
        } finally {
            this.hideLoading();
        }
    },
    
async generateImage() {
    if (!this.state.hasAccess) {
        this.showNotification('Подключите кошелёк', 'error');
        return;
    }
    
    if (!this.canGenerate('image')) {
        this.showNotification(this.t('limitExceeded'), 'error');
        return;
    }
    
    // Проверяем кредиты
    if (!this.canUseCredits()) {
        this.showNotification('💳 Недостаточно кредитов', 'error');
        return;
    }
    
    const format = document.getElementById('imageFormat')?.value || '1:1';
    const style = document.getElementById('imageStyle')?.value || 'realistic';
    const prompt = document.getElementById('imagePrompt')?.value?.trim();
    
    if (!prompt) {
        this.showNotification('Введите описание изображения', 'error');
        return;
    }
    
    if (!this.checkContent(prompt)) return;
    
    this.showLoading('🎨 Генерация изображения...');
    
    try {
        const apiKeys = JSON.parse(localStorage.getItem('ai_studio_api_keys') || '{}');
        const userApiKey = this.canUseOwnApi() ? apiKeys.openai : null;
        
        const response = await fetch('/api/ai/image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                prompt,
                format,
                style,
                userApiKey
            })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Ошибка генерации');
        }
        
        if (!data.imageUrl) {
            throw new Error('Изображение не получено');
        }
        
        // Списываем кредит
        await this.useCredits(1, 'image');
        
        this.showImageResult(data.imageUrl);
        this.showNotification('✅ Изображение сгенерировано!', 'success');
        
        this.state.limits.image.used++;
        this.updateLimitsDisplay();
        this.saveTodayUsage();
        
    } catch (error) {
        console.error('Image error:', error);
        this.showNotification('❌ ' + error.message, 'error');
    } finally {
        this.hideLoading();
    }
},

showImageResult(imageUrl) {
    const resultArea = document.getElementById('imageResult');
    const preview = document.getElementById('imagePreview');
    
    if (preview) {
        preview.innerHTML = `<img src="${imageUrl}" alt="Generated image" style="max-width: 100%; border-radius: 12px;">`;
    }
    
    if (resultArea) {
        resultArea.style.display = 'block';
    }
    
    this.state.currentResult = { type: 'image', content: imageUrl };
},

async downloadImage(url) {
    this.showNotification('📥 Скачивание...', 'info');
    
    try {
        const response = await fetch('/api/ai/download-image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ imageUrl: url })
        });
        
        const data = await response.json();
        
        if (!response.ok || !data.base64) {
            throw new Error(data.error || 'Не удалось скачать');
        }
        
        const byteCharacters = atob(data.base64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: data.contentType || 'image/png' });
        
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = `ai-studio-${Date.now()}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(blobUrl);
        
        this.showNotification('✅ Изображение скачано!', 'success');
        
    } catch (error) {
        console.error('Download error:', error);
        this.showNotification('⚠️ Открываю в новой вкладке...', 'warning');
        window.open(url, '_blank');
    }
},

async testVoice() {
    const btn = document.getElementById('testVoiceBtn');
    if (btn) {
        btn.disabled = true;
        btn.classList.add('loading');
        btn.textContent = '⏳';
    }
    
    const voice = document.getElementById('voiceSelect')?.value || 'alex-nekrasov';
    const language = document.getElementById('voiceLanguage')?.value || 'ru';
    
    // Тестовые фразы на разных языках
    const testPhrases = {
        'ru': 'Привет! Это тестовое сообщение.',
        'en': 'Hello! This is a test message.',
        'uk': 'Привіт! Це тестове повідомлення.',
        'de': 'Hallo! Dies ist eine Testnachricht.',
        'fr': 'Bonjour! Ceci est un message test.',
        'es': '¡Hola! Este es un mensaje de prueba.',
        'pl': 'Cześć! To jest wiadomość testowa.',
        'it': 'Ciao! Questo è un messaggio di prova.'
    };
    
    const testText = testPhrases[language] || testPhrases['ru'];
    
    try {
        const apiKeys = JSON.parse(localStorage.getItem('ai_studio_api_keys') || '{}');
        const userApiKey = this.canUseOwnApi() ? apiKeys.elevenlabs : null;
        
        const response = await fetch('/api/ai/voice', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                text: testText,
                voice,
                language,
                emotion: 'neutral',
                stability: 0.5,
                clarity: 0.75,
                userApiKey
            })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Ошибка');
        }
        
        // Воспроизводим аудио
        const audioBlob = new Blob(
            [Uint8Array.from(atob(data.audioBase64), c => c.charCodeAt(0))], 
            { type: 'audio/mpeg' }
        );
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        audio.play();
        
        // Очищаем URL после воспроизведения
        audio.onended = () => URL.revokeObjectURL(audioUrl);
        
    } catch (error) {
        console.error('Test voice error:', error);
        this.showNotification('❌ ' + error.message, 'error');
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.classList.remove('loading');
            btn.textContent = '▶️ Тест';
        }
    }
},

async generateVoice() {
    if (!this.state.hasAccess) {
        this.showNotification('Подключите кошелёк', 'error');
        return;
    }
    
    if (!this.canGenerate('voice')) {
        this.showNotification(this.t('limitExceeded'), 'error');
        return;
    }
    
    // Проверяем кредиты
    if (!this.canUseCredits()) {
        this.showNotification('💳 Недостаточно кредитов', 'error');
        return;
    }
    
    const voice = document.getElementById('voiceSelect')?.value || 'alex-nekrasov';
    const language = document.getElementById('voiceLanguage')?.value || 'ru';
    const emotion = document.getElementById('voiceEmotion')?.value || 'neutral';
    const speed = parseFloat(document.getElementById('voiceSpeed')?.value) || 1.0;
    const stability = (parseInt(document.getElementById('voiceStability')?.value) || 50) / 100;
    const clarity = (parseInt(document.getElementById('voiceClarity')?.value) || 75) / 100;
    const text = document.getElementById('voiceText')?.value?.trim();
    
    if (!text) {
        this.showNotification('Введите текст для озвучки', 'error');
        return;
    }
    
    if (text.length > 1000) {
        this.showNotification('Максимум 1000 символов', 'error');
        return;
    }
    
    if (!this.checkContent(text)) return;
    
    this.showLoading('🎤 Генерация голоса...');
    
    try {
        // Проверяем свой ключ (Level 8+)
        const apiKeys = JSON.parse(localStorage.getItem('ai_studio_api_keys') || '{}');
        const userApiKey = this.canUseOwnApi() ? apiKeys.elevenlabs : null;
        
        const response = await fetch('/api/ai/voice', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                text,
                voice,
                language,
                emotion,
                speed,
                stability,
                clarity,
                userApiKey
            })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Ошибка генерации голоса');
        }
        
        // Списываем кредит
        await this.useCredits(1, 'voice');
        
        // Конвертируем base64 в аудио URL
        const audioBlob = new Blob(
            [Uint8Array.from(atob(data.audioBase64), c => c.charCodeAt(0))], 
            { type: 'audio/mpeg' }
        );
        const audioUrl = URL.createObjectURL(audioBlob);
        
        this.showVoiceResult(audioUrl);
        this.showNotification('✅ Голос сгенерирован!', 'success');
        
        this.state.limits.voice.used++;
        this.updateLimitsDisplay();
        this.saveTodayUsage();
        
    } catch (error) {
        console.error('Voice error:', error);
        this.showNotification('❌ ' + error.message, 'error');
    } finally {
        this.hideLoading();
    }
},
    
    // ═══════════════════════════════════════════════════════════
    // РЕЗУЛЬТАТЫ
    // ═══════════════════════════════════════════════════════════
    
    showTextResult(text) {
        const area = document.getElementById('textResult');
        const content = document.getElementById('textResultContent');
        if (area) area.style.display = 'block';
        if (content) content.textContent = text;
        this.state.currentResult = { type: 'text', content: text };
    },
    
    showImageResult(url) {
        const area = document.getElementById('imageResult');
        const preview = document.getElementById('imagePreview');
        if (area) area.style.display = 'block';
        if (preview) preview.innerHTML = `<img src="${url}" alt="Generated">`;
        this.state.currentResult = { type: 'image', content: url };
    },
    
    showVoiceResult(url) {
        const area = document.getElementById('voiceResult');
        const player = document.getElementById('voiceAudio');
        if (area) area.style.display = 'block';
        if (player) player.src = url;
        this.state.currentResult = { type: 'voice', content: url };
    },
    
    // ═══════════════════════════════════════════════════════════
    // ТАБЫ И ШАБЛОНЫ
    // ═══════════════════════════════════════════════════════════
    
    initTabs() {
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                if (btn.classList.contains('disabled')) return;
                this.switchTab(btn.dataset.tab);
            });
        });
    },
    
    switchTab(tab) {
        this.state.currentTab = tab;
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tab);
        });
        document.querySelectorAll('.tab-content').forEach(c => {
            c.classList.toggle('active', c.id === `${tab}Tab`);
        });
        this.renderTemplates(tab);
    },
    
    initTemplates() {
        this.renderTemplates('text');
    },
    
    renderTemplates(type) {
        const container = document.getElementById('templatesList');
        if (!container) return;
        
        // Для музыки — отдельный рендер
        if (type === 'music') {
            this.renderMusicTemplates();
            return;
        }
        
        const templates = this.config.TEMPLATES[type] || [];
        
        container.innerHTML = templates.map(t => `
            <div class="template-item" data-prompt="${t.prompt}">
                <span class="template-icon">${t.icon}</span>
                <span class="template-name">${t.nameKey}</span>
            </div>
        `).join('');
        
        container.querySelectorAll('.template-item').forEach(item => {
            item.addEventListener('click', () => {
                const inputMap = { text: 'textPrompt', image: 'imagePrompt', voice: 'voiceText' };
                const input = document.getElementById(inputMap[this.state.currentTab]);
                if (input) input.value = item.dataset.prompt;
            });
        });
    },
    
    initGenerators() {
        document.getElementById('generateTextBtn')?.addEventListener('click', () => this.generateText());
        document.getElementById('generateImageBtn')?.addEventListener('click', () => this.generateImage());
        document.getElementById('generateVoiceBtn')?.addEventListener('click', () => this.generateVoice());
        
        document.getElementById('copyTextBtn')?.addEventListener('click', () => {
            const text = document.getElementById('textResultContent')?.textContent;
            if (text) {
                navigator.clipboard.writeText(text);
                this.showNotification('Скопировано!', 'success');
            }
        });
        
        document.getElementById('downloadImageBtn')?.addEventListener('click', () => {
            if (this.state.currentResult?.content) {
                this.downloadImage(this.state.currentResult.content);
            }
        });
        
        document.getElementById('downloadVoiceBtn')?.addEventListener('click', () => {
            if (this.state.currentResult?.content) {
                const a = document.createElement('a');
                a.href = this.state.currentResult.content;
                a.download = `voice-${Date.now()}.mp3`;
                a.click();
            }
        });
        
        // Голосовые слайдеры
        const voiceSpeed = document.getElementById('voiceSpeed');
        const speedValue = document.getElementById('speedValue');
        if (voiceSpeed && speedValue) {
            voiceSpeed.addEventListener('input', () => {
                speedValue.textContent = voiceSpeed.value + 'x';
            });
        }
        
        const voiceStability = document.getElementById('voiceStability');
        const stabilityValue = document.getElementById('stabilityValue');
        if (voiceStability && stabilityValue) {
            voiceStability.addEventListener('input', () => {
                stabilityValue.textContent = voiceStability.value + '%';
            });
        }
        
        const voiceClarity = document.getElementById('voiceClarity');
        const clarityValue = document.getElementById('clarityValue');
        if (voiceClarity && clarityValue) {
            voiceClarity.addEventListener('input', () => {
                clarityValue.textContent = voiceClarity.value + '%';
            });
        }
        
        // Char counter
        const voiceText = document.getElementById('voiceText');
        const charCount = document.getElementById('voiceCharCount');
        if (voiceText && charCount) {
            voiceText.addEventListener('input', () => {
                charCount.textContent = voiceText.value.length;
            });
        }
    },
    
    initArchive() {
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
        });
    },
    
    // ═══════════════════════════════════════════════════════════
    // 🎵 МУЗЫКА
    // ═══════════════════════════════════════════════════════════
    
    musicState: {
        currentCategory: 'all',
        currentTrack: null,
        customTracks: [],
        isPlaying: false
    },
    
    initMusic() {
        // Загружаем пользовательские треки
        const saved = localStorage.getItem('ai_studio_custom_music');
        if (saved) {
            this.musicState.customTracks = JSON.parse(saved);
        }
    },
    
    renderMusicTemplates() {
        const container = document.getElementById('templatesList');
        if (!container || this.state.currentTab !== 'music') return;
        
        const categories = this.config.MUSIC_LIBRARY.categories;
        const tracks = this.getFilteredTracks();
        
        let html = `
            <div class="music-categories">
                <h4 style="margin-bottom: 12px; color: var(--text-muted);">📂 Категории</h4>
                ${categories.map(cat => `
                    <div class="music-category ${this.musicState.currentCategory === cat.id ? 'active' : ''}" 
                         onclick="AIStudio.selectMusicCategory('${cat.id}')">
                        <span>${cat.icon}</span>
                        <span>${cat.name.replace(cat.icon + ' ', '')}</span>
                    </div>
                `).join('')}
            </div>
            <div class="music-upload" style="margin-top: 16px; padding-top: 16px; border-top: 1px solid rgba(255,255,255,0.1);">
                <label class="btn btn-secondary btn-full" style="cursor: pointer;">
                    📁 Загрузить MP3
                    <input type="file" accept="audio/*" onchange="AIStudio.uploadMusic(event)" style="display: none;">
                </label>
            </div>
            <div class="music-tracks" style="margin-top: 16px;">
                <h4 style="margin-bottom: 12px; color: var(--text-muted);">🎶 Треки (${tracks.length})</h4>
                ${tracks.map(track => `
                    <div class="music-track ${this.musicState.currentTrack?.id === track.id ? 'active' : ''}"
                         onclick="AIStudio.playTrack('${track.id}')">
                        <div class="track-play">▶️</div>
                        <div class="track-info">
                            <div class="track-name">${track.name}</div>
                            <div class="track-duration">${track.duration || ''}</div>
                        </div>
                    </div>
                `).join('')}
                ${tracks.length === 0 ? '<div style="color: var(--text-muted); font-size: 13px;">Нет треков</div>' : ''}
            </div>
        `;
        
        container.innerHTML = html;
    },
    
    getFilteredTracks() {
        const category = this.musicState.currentCategory;
        let tracks = [...this.config.MUSIC_LIBRARY.tracks];
        
        // Добавляем пользовательские треки
        if (category === 'all' || category === 'custom') {
            tracks = [...tracks, ...this.musicState.customTracks.map(t => ({...t, category: 'custom'}))];
        }
        
        // Фильтруем по категории
        if (category !== 'all') {
            tracks = tracks.filter(t => t.category === category);
        }
        
        return tracks;
    },
    
    selectMusicCategory(categoryId) {
        this.musicState.currentCategory = categoryId;
        this.renderMusicTemplates();
    },
    
    playTrack(trackId) {
        const allTracks = [...this.config.MUSIC_LIBRARY.tracks, ...this.musicState.customTracks];
        const track = allTracks.find(t => t.id === trackId);
        
        if (!track) return;
        
        this.musicState.currentTrack = track;
        
        const audio = document.getElementById('musicAudio');
        const result = document.getElementById('musicResult');
        
        if (audio && result) {
            audio.src = track.url;
            audio.play();
            result.style.display = 'block';
            
            // Обновляем заголовок
            const h4 = result.querySelector('h4');
            if (h4) h4.textContent = `🎵 ${track.name}`;
        }
        
        this.renderMusicTemplates();
        this.showNotification(`▶️ ${track.name}`, 'info');
    },
    
    uploadMusic(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        if (!file.type.startsWith('audio/')) {
            this.showNotification('❌ Только аудио файлы', 'error');
            return;
        }
        
        const reader = new FileReader();
        reader.onload = (e) => {
            const track = {
                id: 'custom-' + Date.now(),
                name: file.name.replace(/\.[^.]+$/, ''),
                category: 'custom',
                duration: '',
                url: e.target.result
            };
            
            this.musicState.customTracks.push(track);
            localStorage.setItem('ai_studio_custom_music', JSON.stringify(this.musicState.customTracks));
            
            this.renderMusicTemplates();
            this.showNotification(`✅ Добавлено: ${track.name}`, 'success');
        };
        reader.readAsDataURL(file);
    },
    
    deleteCustomTrack(trackId) {
        this.musicState.customTracks = this.musicState.customTracks.filter(t => t.id !== trackId);
        localStorage.setItem('ai_studio_custom_music', JSON.stringify(this.musicState.customTracks));
        this.renderMusicTemplates();
        this.showNotification('🗑️ Трек удалён', 'info');
    },
    
    // ═══════════════════════════════════════════════════════════
    // УТИЛИТЫ
    // ═══════════════════════════════════════════════════════════
    
    addToProject(type) {
        this.showNotification('Добавлено в проект', 'success');
    },
    
    // Перенос в генератор открыток
    addToCard(type) {
        let content = null;
        
        if (type === 'text') {
            content = this.state.currentResult?.text;
            if (content) {
                localStorage.setItem('ai_studio_text_for_card', content);
                this.showNotification('✅ Текст сохранён для открытки', 'success');
                window.location.href = 'generator.html?from=ai&type=text';
            } else {
                this.showNotification('❌ Сначала сгенерируйте текст', 'error');
            }
        } else if (type === 'image') {
            content = this.state.currentResult?.imageUrl;
            if (content) {
                localStorage.setItem('ai_studio_image_for_card', content);
                this.showNotification('✅ Изображение сохранено для открытки', 'success');
                window.location.href = 'generator.html?from=ai&type=image';
            } else {
                this.showNotification('❌ Сначала сгенерируйте изображение', 'error');
            }
        }
    },
    
    openInGlobalStudio() {
        // TODO: GlobalStudio в разработке
        this.showNotification('🚧 GlobalStudio скоро будет доступен', 'info');
    },
    
    clearProject() {
        this.state.currentResult = null;
        this.showNotification('Проект очищен', 'info');
    },
    
    showLoading(text) {
        const modal = document.getElementById('loadingModal');
        const textEl = document.getElementById('loadingText');
        if (textEl) textEl.textContent = text || 'Загрузка...';
        if (modal) modal.style.display = 'flex';
    },
    
    hideLoading() {
        const modal = document.getElementById('loadingModal');
        if (modal) modal.style.display = 'none';
    },
    
    showNotification(message, type = 'info') {
        const toast = document.createElement('div');
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed; bottom: 20px; right: 20px; padding: 16px 24px;
            background: ${type === 'success' ? '#10B981' : type === 'error' ? '#EF4444' : '#F59E0B'};
            color: white; border-radius: 12px; font-size: 14px; z-index: 10000;
        `;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    },
    
    pluralize(n, one, two, five) {
        n = Math.abs(n) % 100;
        const n1 = n % 10;
        if (n > 10 && n < 20) return five;
        if (n1 > 1 && n1 < 5) return two;
        if (n1 === 1) return one;
        return five;
    },
    
    getDemoText(style) {
        return '🎉 Поздравляю тебя! Пусть каждый момент будет наполнен радостью! 💝';
    },
    
    // Языки
    translations: {
        ru: { limitExceeded: 'Лимит исчерпан', enterPrompt: 'Введите запрос', enterText: 'Введите текст', generatingText: 'Генерация...', generatingImage: 'Генерация...', generatingVoice: 'Генерация...' },
        en: { limitExceeded: 'Limit exceeded', enterPrompt: 'Enter prompt', enterText: 'Enter text', generatingText: 'Generating...', generatingImage: 'Generating...', generatingVoice: 'Generating...' }
    },
    currentLanguage: 'ru',
    
    initLanguage() {
        this.currentLanguage = localStorage.getItem('preferredLanguage') || 'ru';
    },
    
    t(key) {
        return this.translations[this.currentLanguage]?.[key] || this.translations.ru?.[key] || key;
    },
    
    // ═══════════════════════════════════════════════════════════
    // 👑 АДМИНКА АВТОРА - УПРАВЛЕНИЕ ГОЛОСАМИ И МУЗЫКОЙ
    // ═══════════════════════════════════════════════════════════
    
    // Проверка что текущий пользователь - автор/владелец
    isAuthor() {
        // DEV кошелёк
        if (this.DEV_WALLETS.includes(this.state.walletAddress?.toLowerCase())) {
            return true;
        }
        // Owner контракта (определён в loadUserData)
        if (this.state.cgId === 'OWNER' || this.state.cgId === 'DEV') {
            return true;
        }
        return false;
    },
    
    // Инициализация кастомных голосов из localStorage
    initCustomVoices() {
        const saved = localStorage.getItem('ai_studio_custom_voices');
        if (saved) {
            this.config.CUSTOM_VOICES = JSON.parse(saved);
        }
    },
    
    // Получить все голоса (встроенные + кастомные)
    getAllVoices() {
        return [...this.config.VOICES_LIBRARY, ...this.config.CUSTOM_VOICES];
    },
    
    // Добавить голос (только автор)
    addVoice(voiceData) {
        if (!this.isAuthor()) {
            this.showNotification('❌ Только для автора', 'error');
            return false;
        }
        
        const { id, name, gender, language, description } = voiceData;
        
        if (!id || !name) {
            this.showNotification('❌ ID и имя обязательны', 'error');
            return false;
        }
        
        // Проверяем что голос не существует
        if (this.getAllVoices().find(v => v.id === id)) {
            this.showNotification('❌ Голос с таким ID уже существует', 'error');
            return false;
        }
        
        const newVoice = {
            id,
            name,
            gender: gender || 'unknown',
            language: language || 'multilingual',
            description: description || '',
            custom: true
        };
        
        this.config.CUSTOM_VOICES.push(newVoice);
        localStorage.setItem('ai_studio_custom_voices', JSON.stringify(this.config.CUSTOM_VOICES));
        
        this.showNotification(`✅ Голос "${name}" добавлен`, 'success');
        this.updateVoiceSelect();
        return true;
    },
    
    // Удалить кастомный голос
    removeVoice(voiceId) {
        if (!this.isAuthor()) {
            this.showNotification('❌ Только для автора', 'error');
            return false;
        }
        
        const index = this.config.CUSTOM_VOICES.findIndex(v => v.id === voiceId);
        if (index === -1) {
            this.showNotification('❌ Голос не найден или это системный голос', 'error');
            return false;
        }
        
        const voice = this.config.CUSTOM_VOICES[index];
        this.config.CUSTOM_VOICES.splice(index, 1);
        localStorage.setItem('ai_studio_custom_voices', JSON.stringify(this.config.CUSTOM_VOICES));
        
        this.showNotification(`🗑️ Голос "${voice.name}" удалён`, 'info');
        this.updateVoiceSelect();
        return true;
    },
    
    // Обновить select голосов
    updateVoiceSelect() {
        const select = document.getElementById('voiceSelect');
        if (!select) return;
        
        const voices = this.getAllVoices();
        select.innerHTML = voices.map(v => 
            `<option value="${v.id}">${v.name} ${v.custom ? '⭐' : ''} (${v.gender === 'male' ? '♂' : v.gender === 'female' ? '♀' : ''})</option>`
        ).join('');
    },
    
    // Показать панель управления голосами (только автор)
    showVoiceManager() {
        if (!this.isAuthor()) {
            this.showNotification('❌ Только для автора', 'error');
            return;
        }
        
        const voices = this.getAllVoices();
        const html = `
            <div class="voice-manager-modal" style="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.9);z-index:10000;display:flex;align-items:center;justify-content:center;">
                <div style="background:#1a1a2e;border-radius:16px;padding:24px;max-width:600px;width:90%;max-height:80vh;overflow-y:auto;">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
                        <h2 style="color:#fff;margin:0;">🎙️ Управление голосами</h2>
                        <button onclick="document.querySelector('.voice-manager-modal').remove()" style="background:none;border:none;color:#fff;font-size:24px;cursor:pointer;">×</button>
                    </div>
                    
                    <div style="margin-bottom:20px;padding:16px;background:rgba(255,255,255,0.1);border-radius:12px;">
                        <h3 style="color:#FFD700;margin:0 0 12px;">➕ Добавить голос</h3>
                        <p style="color:#888;font-size:12px;margin-bottom:12px;">
                            Голоса берутся из <a href="https://elevenlabs.io/voice-library" target="_blank" style="color:#8b5cf6;">ElevenLabs Voice Library</a>
                        </p>
                        <input id="newVoiceId" placeholder="Voice ID (из ElevenLabs)" style="width:100%;padding:10px;margin-bottom:8px;background:#2a2a4e;border:1px solid #444;border-radius:8px;color:#fff;">
                        <input id="newVoiceName" placeholder="Имя голоса (напр: Анна)" style="width:100%;padding:10px;margin-bottom:8px;background:#2a2a4e;border:1px solid #444;border-radius:8px;color:#fff;">
                        <select id="newVoiceGender" style="width:100%;padding:10px;margin-bottom:8px;background:#2a2a4e;border:1px solid #444;border-radius:8px;color:#fff;">
                            <option value="female">Женский ♀</option>
                            <option value="male">Мужской ♂</option>
                        </select>
                        <input id="newVoiceDesc" placeholder="Описание (опционально)" style="width:100%;padding:10px;margin-bottom:12px;background:#2a2a4e;border:1px solid #444;border-radius:8px;color:#fff;">
                        <button onclick="AIStudio.addVoiceFromForm()" style="width:100%;padding:12px;background:linear-gradient(135deg,#8b5cf6,#ec4899);border:none;border-radius:8px;color:#fff;font-weight:600;cursor:pointer;">
                            ➕ Добавить голос
                        </button>
                    </div>
                    
                    <h3 style="color:#fff;margin-bottom:12px;">📋 Текущие голоса (${voices.length})</h3>
                    <div style="display:flex;flex-direction:column;gap:8px;">
                        ${voices.map(v => `
                            <div style="display:flex;justify-content:space-between;align-items:center;padding:12px;background:rgba(255,255,255,0.05);border-radius:8px;">
                                <div>
                                    <span style="color:#fff;font-weight:600;">${v.name}</span>
                                    ${v.custom ? '<span style="color:#FFD700;margin-left:8px;">⭐ Custom</span>' : ''}
                                    <div style="color:#888;font-size:12px;">${v.id} • ${v.gender === 'male' ? '♂' : '♀'} • ${v.description || ''}</div>
                                </div>
                                ${v.custom ? `<button onclick="AIStudio.removeVoice('${v.id}')" style="background:#ef4444;border:none;padding:6px 12px;border-radius:6px;color:#fff;cursor:pointer;">🗑️</button>` : ''}
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', html);
    },
    
    // Добавить голос из формы
    addVoiceFromForm() {
        const id = document.getElementById('newVoiceId')?.value?.trim();
        const name = document.getElementById('newVoiceName')?.value?.trim();
        const gender = document.getElementById('newVoiceGender')?.value;
        const description = document.getElementById('newVoiceDesc')?.value?.trim();
        
        if (this.addVoice({ id, name, gender, description })) {
            // Очищаем форму
            document.getElementById('newVoiceId').value = '';
            document.getElementById('newVoiceName').value = '';
            document.getElementById('newVoiceDesc').value = '';
            // Обновляем список
            document.querySelector('.voice-manager-modal').remove();
            this.showVoiceManager();
        }
    },
    
    // ═══════════════════════════════════════════════════════════
    // 📤 КНОПКА "В ОТКРЫТКУ"
    // ═══════════════════════════════════════════════════════════
    
    addToCard(type) {
        let content = null;
        
        if (type === 'text') {
            content = this.state.currentResult?.content || 
                     document.getElementById('textResultContent')?.textContent;
            if (content) {
                localStorage.setItem('ai_studio_text_for_card', content);
                this.showNotification('✅ Текст сохранён для открытки', 'success');
                setTimeout(() => {
                    window.location.href = 'generator.html?from=ai&type=text';
                }, 1000);
            } else {
                this.showNotification('❌ Сначала сгенерируйте текст', 'error');
            }
        }
        
        if (type === 'image') {
            const img = document.getElementById('generatedImage');
            content = img?.src;
            if (content && !content.includes('placeholder')) {
                localStorage.setItem('ai_studio_image_for_card', content);
                this.showNotification('✅ Изображение сохранено для открытки', 'success');
                setTimeout(() => {
                    window.location.href = 'generator.html?from=ai&type=image';
                }, 1000);
            } else {
                this.showNotification('❌ Сначала сгенерируйте изображение', 'error');
            }
        }
    },
    
    // ═══════════════════════════════════════════════════════════
    // 🎵 УПРАВЛЕНИЕ МУЗЫКОЙ (для автора)
    // ═══════════════════════════════════════════════════════════
    
    // Показать информацию где брать музыку
    showMusicSources() {
        const html = `
            <div class="music-sources-modal" style="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.9);z-index:10000;display:flex;align-items:center;justify-content:center;">
                <div style="background:#1a1a2e;border-radius:16px;padding:24px;max-width:500px;width:90%;">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
                        <h2 style="color:#fff;margin:0;">🎵 Где брать музыку</h2>
                        <button onclick="document.querySelector('.music-sources-modal').remove()" style="background:none;border:none;color:#fff;font-size:24px;cursor:pointer;">×</button>
                    </div>
                    
                    <div style="color:#ccc;line-height:1.6;">
                        <p><strong style="color:#FFD700;">Бесплатная музыка без авторских прав:</strong></p>
                        <ul style="margin:12px 0;padding-left:20px;">
                            <li><a href="https://pixabay.com/music/" target="_blank" style="color:#8b5cf6;">Pixabay Music</a> — много бесплатной музыки</li>
                            <li><a href="https://freesound.org/" target="_blank" style="color:#8b5cf6;">Freesound</a> — звуки и музыка</li>
                            <li><a href="https://incompetech.com/music/" target="_blank" style="color:#8b5cf6;">Incompetech</a> — Kevin MacLeod</li>
                            <li><a href="https://www.bensound.com/" target="_blank" style="color:#8b5cf6;">Bensound</a> — фоновая музыка</li>
                            <li><a href="https://mixkit.co/free-stock-music/" target="_blank" style="color:#8b5cf6;">Mixkit</a> — качественные треки</li>
                        </ul>
                        
                        <p style="margin-top:16px;"><strong style="color:#FFD700;">Формат добавления:</strong></p>
                        <p style="font-size:13px;color:#888;">
                            Скопируй прямую ссылку на MP3 файл и добавь в MUSIC_LIBRARY в коде или загрузи через кнопку "Загрузить MP3".
                        </p>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', html);
    }
};

window.AIStudio = AIStudio;

// Инициализация
document.addEventListener('DOMContentLoaded', () => {
    AIStudio.init();
    
    // Привязываем кнопки "В открытку" после загрузки
    setTimeout(() => {
        const useTextBtn = document.getElementById('useTextInCardBtn');
        if (useTextBtn) {
            useTextBtn.onclick = () => AIStudio.addToCard('text');
        }
        
        const useImageBtn = document.getElementById('useImageInCardBtn');
        if (useImageBtn) {
            useImageBtn.onclick = () => AIStudio.addToCard('image');
        }
        
        console.log('✅ AI Studio v2.0 - buttons bound');
    }, 1000);
});

console.log('🤖 AI Studio v2.0 loaded (UNIFIED VERSION)');

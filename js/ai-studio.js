/* =====================================================
   AI STUDIO v3.0 - БЕСПЛАТНЫЕ ЕЖЕДНЕВНЫЕ КРЕДИТЫ
   
   Новая логика:
   - Текст: БЕСПЛАТНО (безлимит для всех)
   - Картинка: 3 кредита/сутки (сгорают в полночь)
   - Голос: 3 кредита/сутки (сгорают в полночь)
   - API настройки: недоступны до Level 8
   
   v3.0 Changes:
   - Ежедневные бесплатные кредиты (не накапливаются!)
   - Текст полностью бесплатный
   - Упрощённая система без "lifetime" лимитов
   - MIN_LEVEL_OWN_API = 8 (было 7)
   ===================================================== */

const AIStudio = {
    
    state: {
        cgId: null,
        gwId: null,
        walletAddress: null,
        level: 0,
        hasAccess: false,
        
        // v3.0: Ежедневные кредиты
        dailyCredits: {
            text: { used: 0, max: Infinity, free: true },      // Безлимит
            image: { used: 0, max: 3, free: true },            // 3 в день
            voice: { used: 0, max: 3, free: true },            // 3 в день
            video: { used: 0, max: 0, free: false },           // Платно
            music: { used: 0, max: Infinity, free: true }      // Безлимит (локальные)
        },
        lastResetDate: null,
        
        // Legacy (для совместимости)
        credits: { balance: 0, usedToday: 0, dailyLimit: 0, isUnlimited: false },
        limits: {
            text:  { used: 0, max: 999 },
            image: { used: 0, max: 3 },
            voice: { used: 0, max: 3 },
            video: { used: 0, max: 0 },
            music: { used: 0, max: 999 }
        },
        
        currentTab: 'text',
        currentResult: null,
        archive: []
    },
    
    config: {
        // v3.0: Упрощённые уровни
        MIN_LEVEL_ACCESS: 0,      // Доступ с 0 уровня (даже без регистрации в GW)
        MIN_LEVEL_OWN_API: 8,     // API настройки с 8 уровня (было 7)
        
        // Ежедневные лимиты по уровням
        DAILY_LIMITS: {
            // Level 0-3: базовые бесплатные
            0: { text: Infinity, image: 3, voice: 3, video: 0, music: Infinity },
            1: { text: Infinity, image: 3, voice: 3, video: 0, music: Infinity },
            2: { text: Infinity, image: 3, voice: 3, video: 0, music: Infinity },
            3: { text: Infinity, image: 3, voice: 3, video: 0, music: Infinity },
            
            // Level 4-6: увеличенные лимиты
            4: { text: Infinity, image: 5, voice: 5, video: 1, music: Infinity },
            5: { text: Infinity, image: 8, voice: 8, video: 2, music: Infinity },
            6: { text: Infinity, image: 10, voice: 10, video: 3, music: Infinity },
            
            // Level 7+: расширенные лимиты
            7:  { text: Infinity, image: 15, voice: 15, video: 5, music: Infinity },
            8:  { text: Infinity, image: 20, voice: 20, video: 8, music: Infinity },
            9:  { text: Infinity, image: 30, voice: 30, video: 12, music: Infinity },
            10: { text: Infinity, image: 40, voice: 40, video: 18, music: Infinity },
            11: { text: Infinity, image: 50, voice: 50, video: 25, music: Infinity },
            12: { text: Infinity, image: 100, voice: 100, video: 50, music: Infinity }
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
        
        // Голоса (ElevenLabs)
        VOICES_LIBRARY: [
            { id: 'alex-nekrasov', name: 'Алекс Некрасов', gender: 'male', language: 'ru,ua', description: 'Глубокий мужской, диктор' },
            { id: 'taras-boyko', name: 'Тарас Бойко', gender: 'male', language: 'ua', description: 'Украинский, тёплый' },
            { id: 'vladimir', name: 'Владимир', gender: 'male', language: 'ru', description: 'Деловой стиль' },
            { id: 'evgeniy', name: 'Евгений', gender: 'male', language: 'ru', description: 'Молодой энергичный' },
            { id: 'leonid-drapey', name: 'Леонид Драпей', gender: 'male', language: 'ru,ua', description: 'Спокойный нарратор' },
            { id: 'anna-stepanenko', name: 'Анна Степаненко', gender: 'female', language: 'ua', description: 'Украинский приятный' },
        ],
        
        CUSTOM_VOICES: [],
        
        MUSIC_LIBRARY: {
            categories: [
                { id: 'all', name: '🎵 Все треки', icon: '🎵' },
                { id: 'holiday', name: '🎂 Праздничная', icon: '🎂' },
                { id: 'calm', name: '😌 Спокойная', icon: '😌' },
                { id: 'custom', name: '📁 Мои треки', icon: '📁' }
            ],
            tracks: []
        }
    },
    
    // DEV кошельки - безлимит
    get DEV_WALLETS() {
        if (window.CONFIG?.DEV_WALLETS && Array.isArray(window.CONFIG.DEV_WALLETS)) {
            return window.CONFIG.DEV_WALLETS.map(w => w.toLowerCase());
        }
        return [
            '0x7bcd1753868895971e12448412cb3216d47884c8',
            '0x9b49bd9c9458615e11c051afd1ebe983563b67ee',
            '0x03284a899147f5a07f82c622f34df92198671635',
            '0xa3496cacc8523421dd151f1d92a456c2dafa28c2'
        ];
    },
    
    // ═══════════════════════════════════════════════════════════
    // ИНИЦИАЛИЗАЦИЯ
    // ═══════════════════════════════════════════════════════════
    
    async init() {
        console.log('🎬 AI Studio v3.0 initializing...');
        
        this.showMainContent();
        await this.autoConnectWallet();
        await this.loadUserData();
        
        // v3.0: Загружаем ежедневные кредиты
        await this.loadDailyCredits();
        
        // UI
        this.initTabs();
        this.initTemplates();
        this.initGenerators();
        this.initArchive();
        this.initMusic();
        this.initCustomVoices();
        this.updateVoiceSelect();
        this.updateUI();
        
        // Показываем баннер с кредитами
        this.showDailyCreditsInfo();
        
        if (this.isAuthor()) {
            this.showAuthorTools();
        }
        
        this.initLanguage();
        
        console.log('✅ AI Studio v3.0 initialized');
        console.log('📊 Daily Credits:', this.state.dailyCredits);
    },
    
    // ═══════════════════════════════════════════════════════════
    // v3.0: ЕЖЕДНЕВНЫЕ КРЕДИТЫ
    // ═══════════════════════════════════════════════════════════
    
    async loadDailyCredits() {
        const today = new Date().toISOString().split('T')[0];
        const storageKey = `ai_studio_daily_${this.state.walletAddress || 'guest'}_${today}`;
        
        // Проверяем сброс (новый день)
        const lastReset = localStorage.getItem('ai_studio_last_reset');
        if (lastReset !== today) {
            // Новый день - сбрасываем кредиты (они сгорают!)
            console.log('🔄 New day - resetting daily credits');
            localStorage.setItem('ai_studio_last_reset', today);
            
            // Очищаем старые данные
            const keys = Object.keys(localStorage).filter(k => k.startsWith('ai_studio_daily_'));
            keys.forEach(k => {
                if (!k.includes(today)) localStorage.removeItem(k);
            });
        }
        
        // Загружаем использование за сегодня
        const saved = localStorage.getItem(storageKey);
        if (saved) {
            const usage = JSON.parse(saved);
            this.state.dailyCredits.image.used = usage.image || 0;
            this.state.dailyCredits.voice.used = usage.voice || 0;
            this.state.dailyCredits.video.used = usage.video || 0;
        }
        
        // Устанавливаем лимиты по уровню
        this.setDailyLimits();
        
        // Синхронизируем с legacy state
        this.syncLegacyState();
    },
    
    setDailyLimits() {
        const level = this.state.level || 0;
        const limits = this.config.DAILY_LIMITS[Math.min(level, 12)] || this.config.DAILY_LIMITS[0];
        
        // DEV кошельки - безлимит
        if (this.isAuthor()) {
            this.state.dailyCredits.text.max = Infinity;
            this.state.dailyCredits.image.max = Infinity;
            this.state.dailyCredits.voice.max = Infinity;
            this.state.dailyCredits.video.max = Infinity;
            return;
        }
        
        this.state.dailyCredits.text.max = limits.text;
        this.state.dailyCredits.image.max = limits.image;
        this.state.dailyCredits.voice.max = limits.voice;
        this.state.dailyCredits.video.max = limits.video;
    },
    
    syncLegacyState() {
        // Для совместимости со старым кодом
        this.state.limits.text.used = this.state.dailyCredits.text.used;
        this.state.limits.text.max = this.state.dailyCredits.text.max === Infinity ? 999 : this.state.dailyCredits.text.max;
        
        this.state.limits.image.used = this.state.dailyCredits.image.used;
        this.state.limits.image.max = this.state.dailyCredits.image.max === Infinity ? 999 : this.state.dailyCredits.image.max;
        
        this.state.limits.voice.used = this.state.dailyCredits.voice.used;
        this.state.limits.voice.max = this.state.dailyCredits.voice.max === Infinity ? 999 : this.state.dailyCredits.voice.max;
        
        this.state.limits.video.used = this.state.dailyCredits.video.used;
        this.state.limits.video.max = this.state.dailyCredits.video.max;
        
        this.state.hasAccess = true; // v3.0: доступ для всех
    },
    
    saveDailyCredits() {
        const today = new Date().toISOString().split('T')[0];
        const storageKey = `ai_studio_daily_${this.state.walletAddress || 'guest'}_${today}`;
        
        localStorage.setItem(storageKey, JSON.stringify({
            image: this.state.dailyCredits.image.used,
            voice: this.state.dailyCredits.voice.used,
            video: this.state.dailyCredits.video.used
        }));
        
        this.syncLegacyState();
    },
    
    canGenerate(type) {
        // Текст всегда бесплатный
        if (type === 'text') return true;
        
        // Музыка всегда доступна
        if (type === 'music') return true;
        
        // DEV кошельки - безлимит
        if (this.isAuthor()) return true;
        
        const credits = this.state.dailyCredits[type];
        if (!credits) return false;
        
        return credits.used < credits.max;
    },
    
    getRemainingCredits(type) {
        if (type === 'text' || type === 'music') return '∞';
        if (this.isAuthor()) return '∞';
        
        const credits = this.state.dailyCredits[type];
        if (!credits || credits.max === Infinity) return '∞';
        
        return Math.max(0, credits.max - credits.used);
    },
    
    useCredit(type) {
        if (type === 'text' || type === 'music') return true;
        if (this.isAuthor()) return true;
        
        const credits = this.state.dailyCredits[type];
        if (!credits || credits.used >= credits.max) return false;
        
        credits.used++;
        this.saveDailyCredits();
        this.updateUI();
        
        return true;
    },
    
    showDailyCreditsInfo() {
        const banner = document.getElementById('trialBanner') || document.getElementById('creditsBanner');
        if (!banner) return;
        
        if (this.isAuthor()) {
            banner.innerHTML = `
                <div style="background: linear-gradient(90deg, #FFD700, #FFA500); color: #000; padding: 10px 20px; text-align: center; font-size: 14px;">
                    👑 <strong>Автор</strong> — безлимитный доступ
                </div>
            `;
            banner.style.display = 'block';
            return;
        }
        
        const imgRemaining = this.getRemainingCredits('image');
        const voiceRemaining = this.getRemainingCredits('voice');
        
        banner.innerHTML = `
            <div style="background: linear-gradient(90deg, #6366f1, #8b5cf6); color: white; padding: 10px 20px; text-align: center; font-size: 14px;">
                🎁 <strong>Ежедневные бесплатные кредиты:</strong> 
                📝 Текст ∞ | 
                🎨 Картинки <strong>${imgRemaining}</strong> | 
                🎤 Голос <strong>${voiceRemaining}</strong>
                <span style="opacity: 0.7; margin-left: 10px;">(обновляются в полночь)</span>
            </div>
        `;
        banner.style.display = 'block';
    },
    
    // ═══════════════════════════════════════════════════════════
    // КОШЕЛЁК
    // ═══════════════════════════════════════════════════════════
    
    async autoConnectWallet() {
        if (typeof window.ethereum === 'undefined') {
            console.log('❌ No wallet extension');
            return;
        }
        
        try {
            let accounts = await window.ethereum.request({ method: 'eth_accounts' });
            
            if (!accounts || accounts.length === 0) {
                console.log('🔄 Requesting wallet connection...');
                accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
            }
            
            if (accounts && accounts.length > 0) {
                this.state.walletAddress = accounts[0].toLowerCase();
                console.log('💳 Wallet connected:', this.state.walletAddress);
            }
        } catch (error) {
            console.log('⚠️ Wallet connection declined:', error.message);
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
                await this.loadUserData();
                await this.loadDailyCredits();
                this.updateUI();
                this.showDailyCreditsInfo();
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
        if (!this.state.walletAddress) {
            this.state.level = 0;
            this.state.hasAccess = true; // v3.0: доступ даже без кошелька
            return;
        }
        
        console.log('📋 Loading user data...');
        
        // DEV WALLETS
        if (this.DEV_WALLETS.includes(this.state.walletAddress.toLowerCase())) {
            console.log('🔧 Dev wallet - full access');
            this.state.level = 12;
            this.state.cgId = 'DEV';
            this.state.hasAccess = true;
            return;
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
                    this.state.level = user.gw_level || 0;
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
        
        this.state.hasAccess = true;
        this.updateUserDisplay();
    },
    
    isAuthor() {
        return this.DEV_WALLETS.includes(this.state.walletAddress?.toLowerCase());
    },
    
    // ═══════════════════════════════════════════════════════════
    // ГЕНЕРАЦИЯ
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
    
    async generateText() {
        // Текст всегда бесплатный!
        const prompt = document.getElementById('textPrompt')?.value?.trim();
        
        if (!prompt) {
            this.showNotification('Введите текст запроса', 'error');
            return;
        }
        
        if (!this.checkContent(prompt)) return;
        
        this.showLoading('✨ Генерация текста...');
        
        try {
            const style = document.getElementById('textStyle')?.value || 'greeting';
            
            const response = await fetch('/api/ai/text', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt, style })
            });
            
            if (!response.ok) {
                const err = await response.json().catch(() => ({}));
                throw new Error(err.error || 'API Error');
            }
            
            const data = await response.json();
            const text = data.text || '';
            
            if (!text) throw new Error('Empty response');
            
            this.showTextResult(text);
            this.showNotification('✅ Текст сгенерирован!', 'success');
            
            // Текст бесплатный - не списываем кредиты
            this.state.dailyCredits.text.used++;
            this.syncLegacyState();
            this.updateUI();
            
        } catch (error) {
            console.error('Text generation error:', error);
            this.showNotification('❌ Ошибка: ' + error.message, 'error');
        } finally {
            this.hideLoading();
        }
    },
    
    async generateImage() {
        if (!this.canGenerate('image')) {
            this.showNotification('🎨 Лимит картинок исчерпан. Приходите завтра!', 'error');
            return;
        }
        
        const prompt = document.getElementById('imagePrompt')?.value?.trim();
        
        if (!prompt) {
            this.showNotification('Введите описание изображения', 'error');
            return;
        }
        
        if (!this.checkContent(prompt)) return;
        
        this.showLoading('🎨 Генерация изображения...');
        
        try {
            const format = document.getElementById('imageFormat')?.value || '1:1';
            const style = document.getElementById('imageStyle')?.value || 'realistic';
            
            const apiKeys = JSON.parse(localStorage.getItem('ai_studio_api_keys') || '{}');
            const userApiKey = this.canUseOwnApi() ? apiKeys.openai : null;
            
            const response = await fetch('/api/ai/image', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt, format, style, userApiKey })
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'Ошибка генерации');
            }
            
            if (!data.imageUrl) {
                throw new Error('Изображение не получено');
            }
            
            // Списываем кредит
            this.useCredit('image');
            
            this.showImageResult(data.imageUrl);
            this.showNotification('✅ Изображение сгенерировано!', 'success');
            this.showDailyCreditsInfo();
            
        } catch (error) {
            console.error('Image error:', error);
            this.showNotification('❌ ' + error.message, 'error');
        } finally {
            this.hideLoading();
        }
    },
    
    async generateVoice() {
        if (!this.canGenerate('voice')) {
            this.showNotification('🎤 Лимит голоса исчерпан. Приходите завтра!', 'error');
            return;
        }
        
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
            const voice = document.getElementById('voiceSelect')?.value || 'alex-nekrasov';
            const language = document.getElementById('voiceLanguage')?.value || 'ru';
            const emotion = document.getElementById('voiceEmotion')?.value || 'neutral';
            const stability = (parseInt(document.getElementById('voiceStability')?.value) || 50) / 100;
            const clarity = (parseInt(document.getElementById('voiceClarity')?.value) || 75) / 100;
            
            const apiKeys = JSON.parse(localStorage.getItem('ai_studio_api_keys') || '{}');
            const userApiKey = this.canUseOwnApi() ? apiKeys.elevenlabs : null;
            
            const response = await fetch('/api/ai/voice', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text, voice, language, emotion, stability, clarity, userApiKey })
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'Ошибка генерации голоса');
            }
            
            // Списываем кредит
            this.useCredit('voice');
            
            // Воспроизводим
            const audioBlob = new Blob(
                [Uint8Array.from(atob(data.audioBase64), c => c.charCodeAt(0))], 
                { type: 'audio/mpeg' }
            );
            const audioUrl = URL.createObjectURL(audioBlob);
            
            this.showVoiceResult(audioUrl);
            this.showNotification('✅ Голос сгенерирован!', 'success');
            this.showDailyCreditsInfo();
            
        } catch (error) {
            console.error('Voice error:', error);
            this.showNotification('❌ ' + error.message, 'error');
        } finally {
            this.hideLoading();
        }
    },
    
    // ═══════════════════════════════════════════════════════════
    // API НАСТРОЙКИ (Level 8+)
    // ═══════════════════════════════════════════════════════════
    
    canUseOwnApi() {
        if (this.isAuthor()) return true;
        return this.state.level >= this.config.MIN_LEVEL_OWN_API; // Level 8+
    },
    
    updateApiButtonVisibility() {
        const apiBtn = document.querySelector('.btn-settings-api');
        if (apiBtn) {
            if (this.canUseOwnApi()) {
                apiBtn.style.display = 'flex';
                apiBtn.title = 'Настройки API (Level 8+)';
            } else {
                apiBtn.style.display = 'none';
            }
        }
    },
    
    // ═══════════════════════════════════════════════════════════
    // UI
    // ═══════════════════════════════════════════════════════════
    
    showMainContent() {
        const overlay = document.getElementById('accessCheck');
        if (overlay) overlay.style.display = 'none';
        
        const main = document.getElementById('mainContent');
        if (main) main.style.display = 'block';
    },
    
    updateUI() {
        this.updateUserDisplay();
        this.updateLimitsDisplay();
        this.updateButtonsState();
        this.updateApiButtonVisibility();
    },
    
    updateUserDisplay() {
        const walletEl = document.getElementById('walletAddress');
        const levelEl = document.getElementById('userLevel');
        
        if (this.state.walletAddress) {
            if (walletEl) walletEl.textContent = this.state.walletAddress.slice(0, 6) + '...' + this.state.walletAddress.slice(-4);
            if (levelEl) levelEl.textContent = `Level: ${this.state.level}`;
        } else {
            if (walletEl) walletEl.innerHTML = `<button onclick="AIStudio.connectWallet()" style="background:#8b5cf6;color:white;border:none;padding:6px 12px;border-radius:6px;cursor:pointer;">💳 Connect</button>`;
            if (levelEl) levelEl.textContent = 'Гость';
        }
    },
    
    updateLimitsDisplay() {
        ['text', 'image', 'voice'].forEach(type => {
            const el = document.getElementById(`${type}Limit`);
            if (el) {
                const remaining = this.getRemainingCredits(type);
                const valueEl = el.querySelector('.limit-value');
                if (valueEl) {
                    valueEl.textContent = remaining === '∞' ? '∞' : remaining;
                }
                
                // Предупреждение если мало осталось
                if (remaining !== '∞' && remaining <= 1) {
                    el.classList.add('limit-warning');
                } else {
                    el.classList.remove('limit-warning');
                }
            }
        });
        
        // Также обновляем credits display
        const creditsEl = document.getElementById('creditsDisplay');
        if (creditsEl) {
            if (this.isAuthor()) {
                creditsEl.innerHTML = '💎 ∞';
                creditsEl.title = 'Безлимитный доступ (Автор)';
            } else {
                const imgRem = this.getRemainingCredits('image');
                const voiceRem = this.getRemainingCredits('voice');
                creditsEl.innerHTML = `🎨${imgRem} 🎤${voiceRem}`;
                creditsEl.title = `Картинок: ${imgRem}, Голосов: ${voiceRem}`;
            }
        }
    },
    
    updateButtonsState() {
        // Текст всегда активен
        const textBtn = document.getElementById('generateTextBtn');
        if (textBtn) {
            textBtn.disabled = false;
            textBtn.style.opacity = '1';
        }
        
        // Картинки
        const imageBtn = document.getElementById('generateImageBtn');
        if (imageBtn) {
            const canImg = this.canGenerate('image');
            imageBtn.disabled = !canImg;
            imageBtn.style.opacity = canImg ? '1' : '0.5';
            imageBtn.title = canImg ? '' : 'Лимит исчерпан';
        }
        
        // Голос
        const voiceBtn = document.getElementById('generateVoiceBtn');
        if (voiceBtn) {
            const canVoice = this.canGenerate('voice');
            voiceBtn.disabled = !canVoice;
            voiceBtn.style.opacity = canVoice ? '1' : '0.5';
            voiceBtn.title = canVoice ? '' : 'Лимит исчерпан';
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
        if (preview) preview.innerHTML = `<img src="${url}" alt="Generated" style="max-width: 100%; border-radius: 12px;">`;
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
        
        // Слайдеры
        this.initSliders();
    },
    
    initSliders() {
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
    // МУЗЫКА
    // ═══════════════════════════════════════════════════════════
    
    musicState: {
        currentCategory: 'all',
        currentTrack: null,
        customTracks: []
    },
    
    initMusic() {
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
        
        container.innerHTML = `
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
            <div class="music-upload" style="margin-top: 16px;">
                <label class="btn btn-secondary btn-full" style="cursor: pointer;">
                    📁 Загрузить MP3
                    <input type="file" accept="audio/*" onchange="AIStudio.uploadMusic(event)" style="display: none;">
                </label>
            </div>
            <div class="music-tracks" style="margin-top: 16px;">
                <h4 style="margin-bottom: 12px; color: var(--text-muted);">🎶 Треки (${tracks.length})</h4>
                ${tracks.map(track => `
                    <div class="music-track" onclick="AIStudio.playTrack('${track.id}')">
                        <div class="track-play">▶️</div>
                        <div class="track-info">
                            <div class="track-name">${track.name}</div>
                        </div>
                    </div>
                `).join('')}
                ${tracks.length === 0 ? '<div style="color: var(--text-muted); font-size: 13px;">Загрузите свои треки</div>' : ''}
            </div>
        `;
    },
    
    getFilteredTracks() {
        const category = this.musicState.currentCategory;
        let tracks = [...this.config.MUSIC_LIBRARY.tracks];
        
        if (category === 'all' || category === 'custom') {
            tracks = [...tracks, ...this.musicState.customTracks];
        }
        
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
        }
        
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
                url: e.target.result
            };
            
            this.musicState.customTracks.push(track);
            localStorage.setItem('ai_studio_custom_music', JSON.stringify(this.musicState.customTracks));
            
            this.renderMusicTemplates();
            this.showNotification(`✅ Добавлено: ${track.name}`, 'success');
        };
        reader.readAsDataURL(file);
    },
    
    // ═══════════════════════════════════════════════════════════
    // ГОЛОСА
    // ═══════════════════════════════════════════════════════════
    
    initCustomVoices() {
        const saved = localStorage.getItem('ai_studio_custom_voices');
        if (saved) {
            this.config.CUSTOM_VOICES = JSON.parse(saved);
        }
    },
    
    getAllVoices() {
        if (window.getAllVoices && typeof window.getAllVoices === 'function') {
            return window.getAllVoices();
        }
        return [...this.config.VOICES_LIBRARY, ...this.config.CUSTOM_VOICES];
    },
    
    updateVoiceSelect() {
        const select = document.getElementById('voiceSelect');
        if (!select) return;
        
        const voices = this.getAllVoices();
        select.innerHTML = voices.map(v => 
            `<option value="${v.id}">${v.name} ${v.custom ? '⭐' : ''} (${v.gender === 'male' ? '♂' : '♀'})</option>`
        ).join('');
    },
    
    showAuthorTools() {
        console.log('👑 Adding author tools...');
        
        setTimeout(() => {
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
        }, 1000);
    },
    
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
                        <input id="newVoiceId" placeholder="Voice ID (из ElevenLabs)" style="width:100%;padding:10px;margin-bottom:8px;background:#2a2a4e;border:1px solid #444;border-radius:8px;color:#fff;">
                        <input id="newVoiceName" placeholder="Имя голоса" style="width:100%;padding:10px;margin-bottom:8px;background:#2a2a4e;border:1px solid #444;border-radius:8px;color:#fff;">
                        <select id="newVoiceGender" style="width:100%;padding:10px;margin-bottom:8px;background:#2a2a4e;border:1px solid #444;border-radius:8px;color:#fff;">
                            <option value="female">Женский ♀</option>
                            <option value="male">Мужской ♂</option>
                        </select>
                        <button onclick="AIStudio.addVoiceFromForm()" style="width:100%;padding:12px;background:linear-gradient(135deg,#8b5cf6,#ec4899);border:none;border-radius:8px;color:#fff;font-weight:600;cursor:pointer;">
                            ➕ Добавить голос
                        </button>
                    </div>
                    
                    <h3 style="color:#fff;margin-bottom:12px;">📋 Голоса (${voices.length})</h3>
                    <div style="display:flex;flex-direction:column;gap:8px;">
                        ${voices.map(v => `
                            <div style="display:flex;justify-content:space-between;align-items:center;padding:12px;background:rgba(255,255,255,0.05);border-radius:8px;">
                                <div>
                                    <span style="color:#fff;font-weight:600;">${v.name}</span>
                                    ${v.custom ? '<span style="color:#FFD700;margin-left:8px;">⭐</span>' : ''}
                                    <div style="color:#888;font-size:12px;">${v.id}</div>
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
    
    addVoiceFromForm() {
        const id = document.getElementById('newVoiceId')?.value?.trim();
        const name = document.getElementById('newVoiceName')?.value?.trim();
        const gender = document.getElementById('newVoiceGender')?.value;
        
        if (!id || !name) {
            this.showNotification('❌ Заполните ID и имя', 'error');
            return;
        }
        
        if (this.getAllVoices().find(v => v.id === id)) {
            this.showNotification('❌ Голос с таким ID уже существует', 'error');
            return;
        }
        
        this.config.CUSTOM_VOICES.push({ id, name, gender, custom: true });
        localStorage.setItem('ai_studio_custom_voices', JSON.stringify(this.config.CUSTOM_VOICES));
        
        this.showNotification(`✅ Голос "${name}" добавлен`, 'success');
        this.updateVoiceSelect();
        document.querySelector('.voice-manager-modal').remove();
        this.showVoiceManager();
    },
    
    removeVoice(voiceId) {
        const index = this.config.CUSTOM_VOICES.findIndex(v => v.id === voiceId);
        if (index === -1) return;
        
        const voice = this.config.CUSTOM_VOICES[index];
        this.config.CUSTOM_VOICES.splice(index, 1);
        localStorage.setItem('ai_studio_custom_voices', JSON.stringify(this.config.CUSTOM_VOICES));
        
        this.showNotification(`🗑️ Голос "${voice.name}" удалён`, 'info');
        this.updateVoiceSelect();
        document.querySelector('.voice-manager-modal').remove();
        this.showVoiceManager();
    },
    
    // ═══════════════════════════════════════════════════════════
    // УТИЛИТЫ
    // ═══════════════════════════════════════════════════════════
    
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
    
    addToCard(type) {
        let content = null;
        
        if (type === 'text') {
            content = this.state.currentResult?.content || 
                     document.getElementById('textResultContent')?.textContent;
            if (content) {
                localStorage.setItem('ai_studio_text_for_card', content);
                this.showNotification('✅ Текст сохранён для открытки', 'success');
                setTimeout(() => window.location.href = 'generator.html?from=ai&type=text', 1000);
            } else {
                this.showNotification('❌ Сначала сгенерируйте текст', 'error');
            }
        }
        
        if (type === 'image') {
            content = this.state.currentResult?.content;
            if (content) {
                localStorage.setItem('ai_studio_image_for_card', content);
                this.showNotification('✅ Изображение сохранено', 'success');
                setTimeout(() => window.location.href = 'generator.html?from=ai&type=image', 1000);
            } else {
                this.showNotification('❌ Сначала сгенерируйте изображение', 'error');
            }
        }
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
            animation: fadeIn 0.3s;
        `;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    },
    
    // Языки
    translations: {
        ru: { limitExceeded: 'Лимит исчерпан на сегодня' },
        en: { limitExceeded: 'Daily limit exceeded' }
    },
    currentLanguage: 'ru',
    
    initLanguage() {
        this.currentLanguage = localStorage.getItem('preferredLanguage') || 'ru';
    },
    
    t(key) {
        return this.translations[this.currentLanguage]?.[key] || key;
    }
};

window.AIStudio = AIStudio;

// Инициализация
document.addEventListener('DOMContentLoaded', () => {
    AIStudio.init();
    
    setTimeout(() => {
        const useTextBtn = document.getElementById('useTextInCardBtn');
        if (useTextBtn) useTextBtn.onclick = () => AIStudio.addToCard('text');
        
        const useImageBtn = document.getElementById('useImageInCardBtn');
        if (useImageBtn) useImageBtn.onclick = () => AIStudio.addToCard('image');
    }, 1000);
});

console.log('🤖 AI Studio v3.0 loaded - FREE DAILY CREDITS');

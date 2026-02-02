/* =====================================================
   AI STUDIO v3.0 - ПОД РЕАЛЬНУЮ СТРУКТУРУ SUPABASE
   
   Таблица ai_credits:
   - text_used, image_used, voice_used (счётчики за день)
   - extra_credits (купленные кредиты)
   - last_reset_date (дата сброса)
   - daily_image_limit, daily_voice_limit (лимиты)
   
   Логика:
   - Текст: БЕСПЛАТНО (безлимит)
   - Картинки: 3/день (сгорают в полночь)
   - Голос: 3/день (сгорают в полночь)
   - extra_credits: купленные, НЕ сгорают
   ===================================================== */

const AIStudio = {
    
    state: {
        cgId: null,
        gwId: null,
        walletAddress: null,
        level: 0,
        hasAccess: true,
        
        // Кредиты (из Supabase)
        credits: {
            textUsed: 0,
            imageUsed: 0,
            voiceUsed: 0,
            extraCredits: 0,
            dailyImageLimit: 3,
            dailyVoiceLimit: 3,
            lastResetDate: null
        },
        
        // Для UI
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
        MIN_LEVEL_OWN_API: 8,
        
        LIMITS_BY_LEVEL: {
            0:  { image: 3,  voice: 3 },
            1:  { image: 3,  voice: 3 },
            2:  { image: 3,  voice: 3 },
            3:  { image: 3,  voice: 3 },
            4:  { image: 5,  voice: 5 },
            5:  { image: 8,  voice: 8 },
            6:  { image: 10, voice: 10 },
            7:  { image: 15, voice: 15 },
            8:  { image: 20, voice: 20 },
            9:  { image: 30, voice: 30 },
            10: { image: 40, voice: 40 },
            11: { image: 50, voice: 50 },
            12: { image: 100, voice: 100 }
        },
        
        TEMPLATES: {
            text: [
                { id: 'birthday', icon: '🎂', name: 'День рождения', prompt: 'Напиши теплое поздравление с днём рождения' },
                { id: 'newyear', icon: '🎄', name: 'Новый год', prompt: 'Напиши поздравление с Новым годом' },
                { id: 'thanks', icon: '🙏', name: 'Благодарность', prompt: 'Напиши благодарственное письмо' },
                { id: 'invite', icon: '💌', name: 'Приглашение', prompt: 'Напиши приглашение на мероприятие' },
                { id: 'motivation', icon: '💪', name: 'Мотивация', prompt: 'Напиши мотивационный пост' },
                { id: 'business', icon: '💼', name: 'Бизнес', prompt: 'Напиши деловое предложение' },
                { id: 'club', icon: '🚀', name: 'GlobalWay', prompt: 'Напиши приглашение в GlobalWay клуб' }
            ],
            image: [
                { id: 'abstract', icon: '🎨', name: 'Абстракция', prompt: 'Абстрактный градиент' },
                { id: 'neon', icon: '💜', name: 'Неон', prompt: 'Неоновые волны' },
                { id: 'sunset', icon: '🌅', name: 'Закат', prompt: 'Красивый закат' }
            ],
            voice: [
                { id: 'greeting', icon: '👋', name: 'Приветствие', prompt: 'Привет! Рад тебя приветствовать!' }
            ]
        },
        
        VOICES_LIBRARY: [
            { id: 'alex-nekrasov', name: 'Алекс Некрасов', gender: 'male', language: 'ru' },
            { id: 'taras-boyko', name: 'Тарас Бойко', gender: 'male', language: 'ua' },
            { id: 'vladimir', name: 'Владимир', gender: 'male', language: 'ru' },
            { id: 'evgeniy', name: 'Евгений', gender: 'male', language: 'ru' },
            { id: 'anna-stepanenko', name: 'Анна Степаненко', gender: 'female', language: 'ua' },
        ],
        
        CUSTOM_VOICES: []
    },
    
    get DEV_WALLETS() {
        if (window.CONFIG?.DEV_WALLETS) {
            return window.CONFIG.DEV_WALLETS.map(w => w.toLowerCase());
        }
        return [
            '0x7bcd1753868895971e12448412cb3216d47884c8',
            '0x9b49bd9c9458615e11c051afd1ebe983563b67ee',
            '0x03284a899147f5a07f82c622f34df92198671635',
            '0xa3496cacc8523421dd151f1d92a456c2dafa28c2'
        ];
    },
    
    async init() {
        console.log('🎬 AI Studio v3.2 initializing...');
        
        this.showMainContent();
        await this.autoConnectWallet();
        await this.loadUserData();
        await this.loadCredits();
        
        this.initTabs();
        this.initTemplates();
        this.initGenerators();
        this.initCustomVoices();
        this.updateVoiceSelect();
        this.updateUI();
        this.showCreditsInfo();
        this.updateApiButtonVisibility();
        
        if (this.isAuthor()) this.showAuthorTools();
        
        console.log('✅ AI Studio v3.2 initialized');
        console.log('📊 Credits:', this.state.credits);
        console.log('📊 Limits:', this.state.limits);
    },
    
    // Показать/скрыть кнопку настроек API
    updateApiButtonVisibility() {
        const canUse = this.canUseOwnApi();
        const btnApi = document.getElementById('btnSettingsApi');
        if (btnApi) {
            btnApi.style.display = canUse ? 'inline-flex' : 'none';
            console.log('🔑 API Settings button:', canUse ? 'visible' : 'hidden', 
                        '(level:', this.state.level, ', isAuthor:', this.isAuthor(), ')');
        }
        
        // Также вызываем HTML функцию если есть
        if (typeof window.updateClearButtonsVisibility === 'function') {
            window.updateClearButtonsVisibility();
        }
    },
    
    async autoConnectWallet() {
        if (typeof window.ethereum === 'undefined') return;
        
        try {
            let accounts = await window.ethereum.request({ method: 'eth_accounts' });
            if (!accounts?.length) {
                accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
            }
            if (accounts?.length) {
                this.state.walletAddress = accounts[0].toLowerCase();
                console.log('💳 Wallet:', this.state.walletAddress);
                
                // Слушаем изменения аккаунта
                window.ethereum.on('accountsChanged', async (newAccounts) => {
                    if (newAccounts?.length) {
                        this.state.walletAddress = newAccounts[0].toLowerCase();
                        await this.loadUserData();
                        await this.loadCredits();
                        this.updateUI();
                        this.showCreditsInfo();
                        this.updateApiButtonVisibility();
                    }
                });
            }
        } catch (e) {
            console.log('⚠️ Wallet error:', e.message);
        }
    },
    
    async connectWallet() {
        if (typeof window.ethereum === 'undefined') {
            this.showNotification('Установите SafePal или MetaMask', 'error');
            return null;
        }
        
        try {
            const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
            if (accounts?.length) {
                this.state.walletAddress = accounts[0].toLowerCase();
                await this.loadUserData();
                await this.loadCredits();
                this.updateUI();
                this.showCreditsInfo();
                this.updateApiButtonVisibility();  // Обновляем видимость кнопки API
                this.showNotification('✅ Кошелёк подключен', 'success');
                return this.state.walletAddress;
            }
        } catch (e) {
            this.showNotification('Ошибка подключения', 'error');
        }
        return null;
    },
    
    async loadUserData() {
        if (!this.state.walletAddress) {
            this.state.level = 0;
            return;
        }
        
        if (this.DEV_WALLETS.includes(this.state.walletAddress)) {
            this.state.level = 12;
            this.state.cgId = 'DEV';
            return;
        }
        
        if (window.SupabaseClient?.client) {
            try {
                const { data } = await SupabaseClient.client
                    .from('users')
                    .select('temp_id, gw_id, gw_level')
                    .eq('wallet_address', this.state.walletAddress)
                    .limit(1);
                
                if (data?.length) {
                    this.state.cgId = data[0].temp_id;
                    this.state.gwId = data[0].gw_id;
                    this.state.level = data[0].gw_level || 0;
                }
            } catch (e) {
                console.warn('User load error:', e);
            }
        }
        
        if (this.state.level === 0 && window.GlobalWayBridge) {
            try {
                const level = await GlobalWayBridge.getUserMaxLevel(this.state.walletAddress);
                if (level > 0) this.state.level = level;
            } catch (e) {}
        }
    },
    
    async loadCredits() {
        console.log('📊 Loading credits for wallet:', this.state.walletAddress);
        
        if (!this.state.walletAddress) {
            console.log('⚠️ No wallet, using localStorage');
            this.loadCreditsFromLocalStorage();
            return;
        }
        
        if (this.isAuthor()) {
            console.log('👑 Author detected - unlimited credits');
            this.state.credits = {
                textUsed: 0, imageUsed: 0, voiceUsed: 0,
                extraCredits: 999999,
                dailyImageLimit: 999999,
                dailyVoiceLimit: 999999,
                lastResetDate: new Date().toISOString().split('T')[0]
            };
            this.syncLimitsFromCredits();
            this.updateApiButtonVisibility();  // Показываем кнопку API для авторов
            return;
        }
        
        // Сначала устанавливаем дефолтные лимиты по уровню
        const imageLimit = this.getLimitByLevel('image');
        const voiceLimit = this.getLimitByLevel('voice');
        console.log('📊 Level:', this.state.level, '→ Limits: image=', imageLimit, 'voice=', voiceLimit);
        
        this.state.credits = {
            textUsed: 0, imageUsed: 0, voiceUsed: 0,
            extraCredits: 0,
            dailyImageLimit: imageLimit,
            dailyVoiceLimit: voiceLimit,
            lastResetDate: new Date().toISOString().split('T')[0]
        };
        this.syncLimitsFromCredits();
        
        // Пробуем загрузить из Supabase
        if (window.SupabaseClient?.client) {
            try {
                const { data, error } = await SupabaseClient.client
                    .from('ai_credits')
                    .select('*')
                    .eq('wallet_address', this.state.walletAddress)
                    .limit(1);
                
                if (error) {
                    console.warn('Credits load error:', error);
                    this.saveCreditsToLocalStorage();
                    return;
                }
                
                if (data?.length) {
                    const record = data[0];
                    const today = new Date().toISOString().split('T')[0];
                    
                    console.log('✅ Credits found in Supabase:', record);
                    
                    if (record.last_reset_date !== today) {
                        await this.resetDailyCredits();
                        this.state.credits = {
                            textUsed: 0, imageUsed: 0, voiceUsed: 0,
                            extraCredits: record.extra_credits || 0,
                            dailyImageLimit: record.daily_image_limit || imageLimit,
                            dailyVoiceLimit: record.daily_voice_limit || voiceLimit,
                            lastResetDate: today
                        };
                    } else {
                        this.state.credits = {
                            textUsed: record.text_used || 0,
                            imageUsed: record.image_used || 0,
                            voiceUsed: record.voice_used || 0,
                            extraCredits: record.extra_credits || 0,
                            dailyImageLimit: record.daily_image_limit || imageLimit,
                            dailyVoiceLimit: record.daily_voice_limit || voiceLimit,
                            lastResetDate: record.last_reset_date
                        };
                    }
                    this.syncLimitsFromCredits();
                } else {
                    console.log('📝 No credits record, creating new one...');
                    await this.createCreditsRecord();
                    this.syncLimitsFromCredits();
                }
                
            } catch (e) {
                console.warn('Credits exception:', e);
                this.saveCreditsToLocalStorage();
            }
        } else {
            console.log('⚠️ Supabase not available, using localStorage');
            this.saveCreditsToLocalStorage();
        }
    },
    
    async createCreditsRecord() {
        if (!window.SupabaseClient?.client || !this.state.walletAddress) return;
        
        const today = new Date().toISOString().split('T')[0];
        const imageLimit = this.getLimitByLevel('image');
        const voiceLimit = this.getLimitByLevel('voice');
        
        try {
            await SupabaseClient.client
                .from('ai_credits')
                .insert({
                    wallet_address: this.state.walletAddress,
                    text_used: 0,
                    image_used: 0,
                    voice_used: 0,
                    extra_credits: 0,
                    daily_image_limit: imageLimit,
                    daily_voice_limit: voiceLimit,
                    last_reset_date: today
                });
            
            this.state.credits = {
                textUsed: 0, imageUsed: 0, voiceUsed: 0,
                extraCredits: 0,
                dailyImageLimit: imageLimit,
                dailyVoiceLimit: voiceLimit,
                lastResetDate: today
            };
            
            console.log('✅ Credits record created');
        } catch (e) {
            console.warn('Create credits error:', e);
        }
    },
    
    async resetDailyCredits() {
        if (!window.SupabaseClient?.client || !this.state.walletAddress) return;
        
        const today = new Date().toISOString().split('T')[0];
        
        try {
            await SupabaseClient.client
                .from('ai_credits')
                .update({
                    text_used: 0,
                    image_used: 0,
                    voice_used: 0,
                    last_reset_date: today,
                    updated_at: new Date().toISOString()
                })
                .eq('wallet_address', this.state.walletAddress);
            
            console.log('🔄 Daily credits reset');
        } catch (e) {
            console.warn('Reset credits error:', e);
        }
    },
    
    async useCredit(type) {
        if (type === 'text') {
            this.state.credits.textUsed++;
            await this.saveCredits();
            return true;
        }
        
        if (this.isAuthor()) return true;
        
        if (type === 'image') {
            const remaining = this.getRemainingCredits('image');
            if (remaining <= 0) return false;
            this.state.credits.imageUsed++;
        } else if (type === 'voice') {
            const remaining = this.getRemainingCredits('voice');
            if (remaining <= 0) return false;
            this.state.credits.voiceUsed++;
        }
        
        await this.saveCredits();
        this.syncLimitsFromCredits();
        this.updateUI();
        
        return true;
    },
    
    async saveCredits() {
        this.saveCreditsToLocalStorage();
        
        if (window.SupabaseClient?.client && this.state.walletAddress) {
            try {
                await SupabaseClient.client
                    .from('ai_credits')
                    .update({
                        text_used: this.state.credits.textUsed,
                        image_used: this.state.credits.imageUsed,
                        voice_used: this.state.credits.voiceUsed,
                        updated_at: new Date().toISOString()
                    })
                    .eq('wallet_address', this.state.walletAddress);
            } catch (e) {
                console.warn('Save credits error:', e);
            }
        }
    },
    
    loadCreditsFromLocalStorage() {
        const today = new Date().toISOString().split('T')[0];
        const key = `ai_credits_${this.state.walletAddress || 'guest'}_${today}`;
        const saved = localStorage.getItem(key);
        
        if (saved) {
            const data = JSON.parse(saved);
            this.state.credits = {
                textUsed: data.textUsed || 0,
                imageUsed: data.imageUsed || 0,
                voiceUsed: data.voiceUsed || 0,
                extraCredits: data.extraCredits || 0,
                dailyImageLimit: this.getLimitByLevel('image'),
                dailyVoiceLimit: this.getLimitByLevel('voice'),
                lastResetDate: today
            };
        } else {
            this.state.credits = {
                textUsed: 0, imageUsed: 0, voiceUsed: 0, extraCredits: 0,
                dailyImageLimit: this.getLimitByLevel('image'),
                dailyVoiceLimit: this.getLimitByLevel('voice'),
                lastResetDate: today
            };
        }
        
        this.syncLimitsFromCredits();
    },
    
    saveCreditsToLocalStorage() {
        const today = new Date().toISOString().split('T')[0];
        const key = `ai_credits_${this.state.walletAddress || 'guest'}_${today}`;
        localStorage.setItem(key, JSON.stringify(this.state.credits));
    },
    
    getLimitByLevel(type) {
        const level = Math.min(this.state.level || 0, 12);
        const limits = this.config.LIMITS_BY_LEVEL[level] || this.config.LIMITS_BY_LEVEL[0];
        return limits[type] || 3;
    },
    
    syncLimitsFromCredits() {
        this.state.limits.text.used = this.state.credits.textUsed;
        this.state.limits.text.max = 999;
        this.state.limits.image.used = this.state.credits.imageUsed;
        this.state.limits.image.max = this.state.credits.dailyImageLimit;
        this.state.limits.voice.used = this.state.credits.voiceUsed;
        this.state.limits.voice.max = this.state.credits.dailyVoiceLimit;
    },
    
    canGenerate(type) {
        if (type === 'text') return true;
        if (this.isAuthor()) return true;
        return this.getRemainingCredits(type) > 0;
    },
    
    getRemainingCredits(type) {
        if (type === 'text') return '∞';
        if (this.isAuthor()) return '∞';
        
        if (type === 'image') {
            const dailyRemaining = this.state.credits.dailyImageLimit - this.state.credits.imageUsed;
            return Math.max(0, dailyRemaining) + (this.state.credits.extraCredits || 0);
        }
        
        if (type === 'voice') {
            const dailyRemaining = this.state.credits.dailyVoiceLimit - this.state.credits.voiceUsed;
            return Math.max(0, dailyRemaining) + (this.state.credits.extraCredits || 0);
        }
        
        return 0;
    },
    
    isAuthor() {
        return this.DEV_WALLETS.includes(this.state.walletAddress?.toLowerCase());
    },
    
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
        
        const forbidden = ['хуй','пизд','блять','ебат','сука','мудак'];
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
        const prompt = document.getElementById('textPrompt')?.value?.trim();
        if (!prompt) { this.showNotification('Введите текст', 'error'); return; }
        if (!this.checkContent(prompt)) return;
        
        this.showLoading('✨ Генерация текста...');
        
        try {
            const style = document.getElementById('textStyle')?.value || 'greeting';
            const response = await fetch('/api/ai/text', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt, style })
            });
            
            if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error || 'Error');
            
            const data = await response.json();
            if (!data.text) throw new Error('Empty response');
            
            this.showTextResult(data.text);
            this.showNotification('✅ Текст готов!', 'success');
            await this.useCredit('text');
            
        } catch (e) {
            this.showNotification('❌ ' + e.message, 'error');
        } finally {
            this.hideLoading();
        }
    },
    
    async generateImage() {
        if (!this.canGenerate('image')) {
            this.showNotification('🎨 Лимит исчерпан!', 'error');
            return;
        }
        
        const prompt = document.getElementById('imagePrompt')?.value?.trim();
        if (!prompt) { this.showNotification('Введите описание', 'error'); return; }
        if (!this.checkContent(prompt)) return;
        
        this.showLoading('🎨 Генерация...');
        
        try {
            const format = document.getElementById('imageFormat')?.value || '1:1';
            const style = document.getElementById('imageStyle')?.value || 'realistic';
            const apiKeys = JSON.parse(localStorage.getItem('ai_studio_api_keys') || '{}');
            const savedKey = apiKeys.openai || '';
            // Используем ТОЛЬКО если ключ валидный (начинается с sk-)
            const userApiKey = (this.canUseOwnApi() && savedKey.startsWith('sk-')) ? savedKey : null;
            
            const response = await fetch('/api/ai/image', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    prompt, 
                    format, 
                    style, 
                    userApiKey,
                    wallet: this.state.walletAddress  // Для серверной проверки кредитов
                })
            });
            
            const data = await response.json();
            if (!response.ok || !data.imageUrl) throw new Error(data.error || 'Error');
            
            if (!await this.useCredit('image')) throw new Error('Credit error');
            
            this.showImageResult(data.imageUrl);
            this.showNotification('✅ Готово!', 'success');
            this.showCreditsInfo();
            
        } catch (e) {
            this.showNotification('❌ ' + e.message, 'error');
        } finally {
            this.hideLoading();
        }
    },
    
    async generateVoice() {
        if (!this.canGenerate('voice')) {
            this.showNotification('🎤 Лимит исчерпан!', 'error');
            return;
        }
        
        const text = document.getElementById('voiceText')?.value?.trim();
        if (!text) { this.showNotification('Введите текст', 'error'); return; }
        if (text.length > 1000) { this.showNotification('Макс 1000 символов', 'error'); return; }
        if (!this.checkContent(text)) return;
        
        this.showLoading('🎤 Генерация...');
        
        try {
            const voice = document.getElementById('voiceSelect')?.value || 'alex-nekrasov';
            const language = document.getElementById('voiceLanguage')?.value || 'ru';
            const stability = (parseInt(document.getElementById('voiceStability')?.value) || 50) / 100;
            const clarity = (parseInt(document.getElementById('voiceClarity')?.value) || 75) / 100;
            const apiKeys = JSON.parse(localStorage.getItem('ai_studio_api_keys') || '{}');
            const savedKey = apiKeys.elevenlabs || '';
            // Используем ТОЛЬКО если ключ валидный (минимум 20 символов)
            const userApiKey = (this.canUseOwnApi() && savedKey.length >= 20) ? savedKey : null;
            
            const response = await fetch('/api/ai/voice', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    text, 
                    voice, 
                    language, 
                    stability, 
                    clarity, 
                    userApiKey,
                    wallet: this.state.walletAddress  // Для серверной проверки кредитов
                })
            });
            
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Error');
            
            if (!await this.useCredit('voice')) throw new Error('Credit error');
            
            const audioBlob = new Blob([Uint8Array.from(atob(data.audioBase64), c => c.charCodeAt(0))], { type: 'audio/mpeg' });
            this.showVoiceResult(URL.createObjectURL(audioBlob));
            this.showNotification('✅ Готово!', 'success');
            this.showCreditsInfo();
            
        } catch (e) {
            this.showNotification('❌ ' + e.message, 'error');
        } finally {
            this.hideLoading();
        }
    },
    
    canUseOwnApi() {
        return this.isAuthor() || this.state.level >= this.config.MIN_LEVEL_OWN_API;
    },
    
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
    },
    
    updateUserDisplay() {
        const walletEl = document.getElementById('walletAddress');
        const levelEl = document.getElementById('userLevel');
        
        if (this.state.walletAddress) {
            if (walletEl) walletEl.textContent = this.state.walletAddress.slice(0, 6) + '...' + this.state.walletAddress.slice(-4);
            if (levelEl) levelEl.textContent = `Level: ${this.state.level}`;
        } else {
            if (walletEl) walletEl.innerHTML = `<button onclick="AIStudio.connectWallet()" class="btn btn-sm">💳 Connect</button>`;
            if (levelEl) levelEl.textContent = 'Гость';
        }
    },
    
    updateLimitsDisplay() {
        const imgRem = this.getRemainingCredits('image');
        const voiceRem = this.getRemainingCredits('voice');
        
        ['image', 'voice', 'text'].forEach(type => {
            const el = document.getElementById(`${type}Limit`);
            if (el) {
                const val = el.querySelector('.limit-value');
                if (val) val.textContent = type === 'text' ? '∞' : this.getRemainingCredits(type);
            }
        });
        
        const creditsEl = document.getElementById('creditsDisplay');
        if (creditsEl) {
            creditsEl.innerHTML = this.isAuthor() ? '👑 ∞' : `🎨${imgRem} 🎤${voiceRem}`;
        }
    },
    
    updateButtonsState() {
        const textBtn = document.getElementById('generateTextBtn');
        if (textBtn) textBtn.disabled = false;
        
        ['image', 'voice'].forEach(type => {
            const btn = document.getElementById(`generate${type.charAt(0).toUpperCase() + type.slice(1)}Btn`);
            if (btn) {
                const can = this.canGenerate(type);
                btn.disabled = !can;
                btn.style.opacity = can ? '1' : '0.5';
            }
        });
    },
    
    showCreditsInfo() {
        const banner = document.getElementById('trialBanner') || document.getElementById('creditsBanner');
        if (!banner) return;
        
        if (this.isAuthor()) {
            banner.innerHTML = `<div style="background:linear-gradient(90deg,#FFD700,#FFA500);color:#000;padding:10px 20px;text-align:center;">👑 <strong>Автор</strong> — безлимит</div>`;
        } else {
            banner.innerHTML = `<div style="background:linear-gradient(90deg,#6366f1,#8b5cf6);color:white;padding:10px 20px;text-align:center;font-size:14px;">🎁 <strong>Бесплатно:</strong> 📝 Текст ∞ | 🎨 Картинки <strong>${this.getRemainingCredits('image')}</strong> | 🎤 Голос <strong>${this.getRemainingCredits('voice')}</strong> <span style="opacity:0.7;margin-left:10px;">(обновляются в полночь)</span></div>`;
        }
        banner.style.display = 'block';
    },
    
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
        if (preview) preview.innerHTML = `<img src="${url}" style="max-width:100%;border-radius:12px;">`;
        this.state.currentResult = { type: 'image', content: url };
    },
    
    showVoiceResult(url) {
        const area = document.getElementById('voiceResult');
        const player = document.getElementById('voiceAudio');
        if (area) area.style.display = 'block';
        if (player) player.src = url;
        this.state.currentResult = { type: 'voice', content: url };
    },
    
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
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.tab === tab));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.toggle('active', c.id === `${tab}Tab`));
        this.renderTemplates(tab);
    },
    
    initTemplates() { this.renderTemplates('text'); },
    
    renderTemplates(type) {
        const container = document.getElementById('templatesList');
        if (!container) return;
        
        const templates = this.config.TEMPLATES[type] || [];
        container.innerHTML = templates.map(t => `<div class="template-item" data-prompt="${t.prompt}"><span class="template-icon">${t.icon}</span><span class="template-name">${t.name}</span></div>`).join('');
        
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
            if (text) { navigator.clipboard.writeText(text); this.showNotification('Скопировано!', 'success'); }
        });
        
        document.getElementById('downloadImageBtn')?.addEventListener('click', () => {
            if (this.state.currentResult?.content) this.downloadImage(this.state.currentResult.content);
        });
        
        document.getElementById('downloadVoiceBtn')?.addEventListener('click', () => {
            if (this.state.currentResult?.content) {
                const a = document.createElement('a');
                a.href = this.state.currentResult.content;
                a.download = `voice-${Date.now()}.mp3`;
                a.click();
            }
        });
    },
    
    initCustomVoices() {
        const saved = localStorage.getItem('ai_studio_custom_voices');
        if (saved) this.config.CUSTOM_VOICES = JSON.parse(saved);
    },
    
    // Получить все голоса - из voices-data.js или из встроенного конфига
    getAllVoices() { 
        // Приоритет: VOICES_DATA из voices-data.js
        if (window.getAllVoices && typeof window.getAllVoices === 'function') {
            return window.getAllVoices();
        }
        // Fallback на встроенный конфиг
        return [...this.config.VOICES_LIBRARY, ...this.config.CUSTOM_VOICES]; 
    },
    
    // Тест голоса - воспроизведение примера
    async testVoice(voiceId) {
        const text = 'Привет! Это тестовое сообщение для проверки голоса.';
        
        this.showLoading('🎤 Тест голоса...');
        
        try {
            const response = await fetch('/api/ai/voice', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    text, 
                    voice: voiceId,
                    wallet: this.state.walletAddress
                })
            });
            
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Error');
            
            // Воспроизводим аудио
            const audioBlob = new Blob(
                [Uint8Array.from(atob(data.audioBase64), c => c.charCodeAt(0))], 
                { type: 'audio/mpeg' }
            );
            const audio = new Audio(URL.createObjectURL(audioBlob));
            audio.play();
            
            this.showNotification('🎤 Воспроизведение...', 'success');
            
        } catch (e) {
            this.showNotification('❌ ' + e.message, 'error');
        } finally {
            this.hideLoading();
        }
    },
    
    updateVoiceSelect() {
        const select = document.getElementById('voiceSelect');
        if (!select) return;
        
        const voices = this.getAllVoices();
        
        // Группируем голоса
        if (window.VOICES_DATA) {
            // Используем категории из voices-data.js
            let html = '';
            
            // Славянские голоса
            if (VOICES_DATA.slavic?.length) {
                html += '<optgroup label="🇺🇦🇷🇺 Украинские/Русские">';
                VOICES_DATA.slavic.forEach(v => {
                    html += `<option value="${v.id}">${v.name} ${v.gender === 'male' ? '♂' : '♀'}</option>`;
                });
                html += '</optgroup>';
            }
            
            // Дополнительные мужские
            if (VOICES_DATA.maleExtra?.length) {
                html += '<optgroup label="♂ Мужские (дополнительные)">';
                VOICES_DATA.maleExtra.forEach(v => {
                    html += `<option value="${v.id}">${v.name}</option>`;
                });
                html += '</optgroup>';
            }
            
            // Дополнительные женские
            if (VOICES_DATA.femaleExtra?.length) {
                html += '<optgroup label="♀ Женские (дополнительные)">';
                VOICES_DATA.femaleExtra.forEach(v => {
                    html += `<option value="${v.id}">${v.name}</option>`;
                });
                html += '</optgroup>';
            }
            
            // Английские
            if (VOICES_DATA.english?.length) {
                html += '<optgroup label="🇬🇧 English">';
                VOICES_DATA.english.forEach(v => {
                    html += `<option value="${v.id}">${v.name} ${v.gender === 'male' ? '♂' : '♀'}</option>`;
                });
                html += '</optgroup>';
            }
            
            // Кастомные
            if (VOICES_DATA.custom?.length) {
                html += '<optgroup label="⭐ Мои голоса">';
                VOICES_DATA.custom.forEach(v => {
                    html += `<option value="${v.id}">${v.name}</option>`;
                });
                html += '</optgroup>';
            }
            
            select.innerHTML = html;
        } else {
            // Fallback - простой список
            select.innerHTML = voices.map(v => 
                `<option value="${v.id}">${v.name} (${v.gender === 'male' ? '♂' : '♀'})</option>`
            ).join('');
        }
        
        console.log('🎙️ Voice select updated:', voices.length, 'voices');
    },
    
    showAuthorTools() {
        setTimeout(() => {
            const voiceTab = document.getElementById('voiceTab');
            if (voiceTab && !voiceTab.querySelector('.author-tool-btn')) {
                const btn = document.createElement('button');
                btn.className = 'author-tool-btn';
                btn.innerHTML = '🎙️ Управление голосами';
                btn.style.cssText = 'margin:10px 0 20px;padding:12px 20px;background:linear-gradient(135deg,#FFD700,#FFA500);border:none;border-radius:8px;color:#000;font-weight:600;cursor:pointer;width:100%;';
                btn.onclick = () => alert('Voice Manager - в разработке');
                const card = voiceTab.querySelector('.generation-card');
                if (card) card.insertBefore(btn, card.firstChild);
            }
        }, 1000);
    },
    
    async downloadImage(url) {
        try {
            const response = await fetch('/api/ai/download-image', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ imageUrl: url })
            });
            const data = await response.json();
            if (data.base64) {
                const blob = new Blob([Uint8Array.from(atob(data.base64), c => c.charCodeAt(0))], { type: 'image/png' });
                const a = document.createElement('a');
                a.href = URL.createObjectURL(blob);
                a.download = `ai-studio-${Date.now()}.png`;
                a.click();
                this.showNotification('✅ Скачано!', 'success');
            } else {
                window.open(url, '_blank');
            }
        } catch (e) {
            window.open(url, '_blank');
        }
    },
    
    addToCard(type) {
        const content = this.state.currentResult?.content;
        if (!content) { this.showNotification('Сначала сгенерируйте', 'error'); return; }
        localStorage.setItem(`ai_studio_${type}_for_card`, content);
        this.showNotification('✅ Сохранено', 'success');
        setTimeout(() => window.location.href = `generator.html?from=ai&type=${type}`, 1000);
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
        toast.style.cssText = `position:fixed;bottom:20px;right:20px;padding:16px 24px;background:${type === 'success' ? '#10B981' : type === 'error' ? '#EF4444' : '#F59E0B'};color:white;border-radius:12px;font-size:14px;z-index:10000;`;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    }
};

window.AIStudio = AIStudio;

document.addEventListener('DOMContentLoaded', () => {
    AIStudio.init();
    setTimeout(() => {
        document.getElementById('useTextInCardBtn')?.addEventListener('click', () => AIStudio.addToCard('text'));
        document.getElementById('useImageInCardBtn')?.addEventListener('click', () => AIStudio.addToCard('image'));
    }, 1000);
});

console.log('🤖 AI Studio v3.0 loaded');

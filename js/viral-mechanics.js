/* =====================================================
   VIRAL MECHANICS v5.0 - СРОЧНОЕ ИСПРАВЛЕНИЕ
   Гарантированный показ popup при попытке уйти
   ===================================================== */

const ViralMechanics = {
    popupShown: false,
    bonusData: null,
    cardCreatorId: null,
    tempUserId: null,
    requiredShares: 5,
    
    // Инициализация
    init(cardData) {
        console.log('🎁 ViralMechanics.init() called with:', cardData?.bonusEnabled);
        
        if (!cardData || !cardData.bonusEnabled) {
            console.log('🎁 Bonus disabled - skipping');
            return;
        }
        
        // Проверка сессии
        const sessionKey = 'viral_' + (new URLSearchParams(window.location.search).get('sc') || 'default');
        if (sessionStorage.getItem(sessionKey)) {
            console.log('🎁 Already shown this session');
            return;
        }
        this.sessionKey = sessionKey;
        
        // Сохраняем данные
        this.bonusData = {
            image: cardData.bonusImage || null,
            title: cardData.bonusTitle || '🎁 Подождите!',
            text: cardData.bonusText || 'У нас есть подарок для вас!',
            buttonText: cardData.bonusButtonText || 'Получить подарок',
            required: cardData.bonusRequired || 5,
            contactLink: cardData.bonusContactLink || null
        };
        
        this.requiredShares = this.bonusData.required;
        this.cardCreatorId = new URLSearchParams(window.location.search).get('ref') || cardData.userId || cardData.actualCreator;
        
        // Создаём popup
        this.createPopup();
        
        // Устанавливаем ВСЕ триггеры
        this.setupAllTriggers();
        
        console.log('🎁 ViralMechanics v5.0 READY!');
    },
    
    // ВСЕ триггеры для показа popup
    setupAllTriggers() {
        const self = this;
        
        // 1. DESKTOP: Мышка выходит вверх
        document.addEventListener('mouseleave', function(e) {
            if (e.clientY < 10) {
                console.log('🖱️ Mouse exit detected');
                self.showPopup();
            }
        });
        
        // 2. MOBILE + DESKTOP: Страница скрылась (свернул, переключил вкладку)
        document.addEventListener('visibilitychange', function() {
            if (document.hidden) {
                sessionStorage.setItem('viral_pending', 'true');
                console.log('👁️ Page hidden - pending');
            } else if (sessionStorage.getItem('viral_pending') === 'true') {
                sessionStorage.removeItem('viral_pending');
                console.log('👁️ Page visible - showing popup');
                setTimeout(() => self.showPopup(), 200);
            }
        });
        
        // 3. MOBILE: Кнопка "назад" (history trick)
        if (!history.state?.viral) {
            history.pushState({ viral: true }, '');
        }
        window.addEventListener('popstate', function(e) {
            console.log('📱 Back button detected');
            history.pushState({ viral: true }, '');
            self.showPopup();
        });
        
        // 4. Закрытие вкладки (beforeunload) - показать хотя бы alert
        window.addEventListener('beforeunload', function(e) {
            if (!self.popupShown) {
                console.log('🚪 Before unload');
                // Браузер не позволяет показать custom popup, но можно системный
                // e.preventDefault();
                // e.returnValue = '';
            }
        });
        
        // 5. ТАЙМАУТ - если 30 секунд не взаимодействовал
        setTimeout(() => {
            if (!this.popupShown && !sessionStorage.getItem('card_interacted')) {
                console.log('⏰ Timeout trigger');
                this.showPopup();
            }
        }, 30000);
        
        console.log('🎯 All triggers set up');
    },
    
    // Создание popup HTML
    createPopup() {
        // Удаляем старый
        document.getElementById('viralPopupOverlay')?.remove();
        
        const overlay = document.createElement('div');
        overlay.id = 'viralPopupOverlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0,0,0,0.9);
            display: none;
            justify-content: center;
            align-items: center;
            z-index: 99999;
            padding: 20px;
            box-sizing: border-box;
        `;
        
        overlay.innerHTML = `
            <div id="viralPopupContent" style="
                background: linear-gradient(145deg, #1a1a2e, #16213e);
                border-radius: 20px;
                max-width: 380px;
                width: 100%;
                overflow: hidden;
                box-shadow: 0 20px 60px rgba(0,0,0,0.5);
                border: 1px solid rgba(255,215,0,0.3);
            ">
                <!-- Step 1: Offer -->
                <div id="viralStep1">
                    ${this.bonusData.image ? `
                        <img src="${this.bonusData.image}" style="width:100%; display:block;">
                    ` : `
                        <div style="padding: 30px; text-align: center;">
                            <div style="font-size: 64px;">🎁</div>
                            <div style="color: #FFD700; font-size: 24px; font-weight: bold; margin: 15px 0;">${this.escHtml(this.bonusData.title)}</div>
                            <div style="color: #CCC; font-size: 16px; line-height: 1.5;">${this.escHtml(this.bonusData.text)}</div>
                        </div>
                    `}
                    <div style="padding: 20px;">
                        <button onclick="ViralMechanics.showStep(2)" style="
                            width: 100%; padding: 16px; border-radius: 30px;
                            background: linear-gradient(45deg, #FFD700, #FFA500);
                            color: #000; font-weight: bold; font-size: 16px;
                            border: none; cursor: pointer; margin-bottom: 10px;
                        ">🎁 ${this.escHtml(this.bonusData.buttonText)}</button>
                        <button onclick="ViralMechanics.showStep(4)" style="
                            width: 100%; padding: 14px; border-radius: 30px;
                            background: transparent; color: #888;
                            border: 1px solid #444; cursor: pointer; font-size: 14px;
                        ">Закрыть</button>
                    </div>
                </div>
                
                <!-- Step 2: Registration -->
                <div id="viralStep2" style="display:none; padding: 25px;">
                    <div style="text-align: center; margin-bottom: 20px;">
                        <div style="font-size: 40px;">📝</div>
                        <div style="color: #FFD700; font-size: 20px; font-weight: bold;">Оставьте контакт</div>
                        <div style="color: #888; font-size: 14px;">Чтобы получить подарок</div>
                    </div>
                    <input type="text" id="vName" placeholder="Ваше имя" style="
                        width: 100%; padding: 14px; margin-bottom: 12px;
                        background: #2a2a4a; border: 1px solid #444;
                        border-radius: 10px; color: #FFF; font-size: 16px;
                        box-sizing: border-box;
                    ">
                    <select id="vMessenger" style="
                        width: 100%; padding: 14px; margin-bottom: 12px;
                        background: #2a2a4a; border: 1px solid #444;
                        border-radius: 10px; color: #FFF; font-size: 16px;
                    ">
                        <option value="">Выберите мессенджер</option>
                        <option value="telegram">Telegram</option>
                        <option value="whatsapp">WhatsApp</option>
                        <option value="viber">Viber</option>
                    </select>
                    <input type="text" id="vContact" placeholder="@username или телефон" style="
                        width: 100%; padding: 14px; margin-bottom: 15px;
                        background: #2a2a4a; border: 1px solid #444;
                        border-radius: 10px; color: #FFF; font-size: 16px;
                        box-sizing: border-box;
                    ">
                    
                    <!-- Push Consent Checkbox -->
                    <div style="margin-top: 15px; margin-bottom: 15px; padding: 12px; background: rgba(76, 175, 80, 0.1); border: 1px solid rgba(76, 175, 80, 0.3); border-radius: 8px;">
                        <label style="display: flex; align-items: flex-start; gap: 10px; cursor: pointer; color: #FFF;">
                            <input type="checkbox" id="vPushConsent" checked style="margin-top: 3px; width: 18px; height: 18px; cursor: pointer; flex-shrink: 0;">
                            <span id="vPushConsentText" style="font-size: 13px; line-height: 1.4;">
                                📱 Я согласен получать уведомления о получении подарка через push-уведомления
                            </span>
                        </label>
                    </div>
                    
                    <button onclick="ViralMechanics.submitReg()" id="vSubmitBtn" style="
                        width: 100%; padding: 16px; border-radius: 30px;
                        background: linear-gradient(45deg, #4CAF50, #45a049);
                        color: #FFF; font-weight: bold; font-size: 16px;
                        border: none; cursor: pointer;
                    ">Далее →</button>
                    <button onclick="ViralMechanics.showStep(4)" style="
                        width: 100%; padding: 12px; margin-top: 10px;
                        background: transparent; color: #666;
                        border: none; cursor: pointer; font-size: 14px;
                    ">Позже</button>
                </div>
                
                <!-- Step 3: Share -->
                <div id="viralStep3" style="display:none; padding: 25px;">
                    <div style="text-align: center; margin-bottom: 20px;">
                        <div style="font-size: 40px;">📤</div>
                        <div style="color: #FFD700; font-size: 20px; font-weight: bold;">Поделитесь</div>
                        <div style="color: #888; font-size: 14px;">Когда ${this.requiredShares} друзей откроют — получите подарок</div>
                    </div>
                    <div style="background: rgba(255,215,0,0.1); border: 1px solid #FFD700; border-radius: 12px; padding: 12px; margin-bottom: 15px;">
                        <div style="color: #FFD700; font-size: 11px;">Ваша ссылка:</div>
                        <div id="vShareLink" style="color: #FFF; font-size: 12px; word-break: break-all;"></div>
                    </div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                        <button onclick="ViralMechanics.share('telegram')" style="padding: 14px; border-radius: 12px; background: #0088cc; color: #FFF; border: none; cursor: pointer; font-weight: bold;">📱 Telegram</button>
                        <button onclick="ViralMechanics.share('whatsapp')" style="padding: 14px; border-radius: 12px; background: #25D366; color: #FFF; border: none; cursor: pointer; font-weight: bold;">💬 WhatsApp</button>
                        <button onclick="ViralMechanics.share('viber')" style="padding: 14px; border-radius: 12px; background: #7360f2; color: #FFF; border: none; cursor: pointer; font-weight: bold;">📞 Viber</button>
                        <button onclick="ViralMechanics.copyLink()" style="padding: 14px; border-radius: 12px; background: #666; color: #FFF; border: none; cursor: pointer; font-weight: bold;">📋 Копировать</button>
                    </div>
                    <button onclick="ViralMechanics.close()" style="
                        width: 100%; padding: 12px; margin-top: 15px;
                        background: transparent; color: #666;
                        border: 1px solid #444; border-radius: 30px;
                        cursor: pointer; font-size: 14px;
                    ">Закрыть</button>
                </div>
                
                <!-- Step 4: Goodbye -->
                <div id="viralStep4" style="display:none; padding: 30px; text-align: center;">
                    <div style="font-size: 50px;">🙏</div>
                    <div style="color: #FFD700; font-size: 20px; font-weight: bold; margin: 15px 0;">Спасибо!</div>
                    <div style="color: #888; font-size: 14px; margin-bottom: 20px;">Если передумаете — подарок ждёт!</div>
                    <button onclick="ViralMechanics.showStep(2)" style="
                        width: 100%; padding: 14px; border-radius: 30px;
                        background: linear-gradient(45deg, #FFD700, #FFA500);
                        color: #000; font-weight: bold; border: none;
                        cursor: pointer; margin-bottom: 10px;
                    ">🎁 Получить подарок</button>
                    <button onclick="ViralMechanics.close()" style="
                        width: 100%; padding: 12px;
                        background: transparent; color: #666;
                        border: none; cursor: pointer;
                    ">Закрыть</button>
                </div>
                
                <!-- Step 5: Success -->
                <div id="viralStep5" style="display:none; padding: 30px; text-align: center;">
                    <div style="font-size: 50px;">🎉</div>
                    <div style="color: #FFD700; font-size: 22px; font-weight: bold; margin: 15px 0;">Отлично!</div>
                    <div style="color: #CCC; font-size: 15px; margin-bottom: 20px;">Ваша ссылка готова!<br>Поделитесь с друзьями.</div>
                    <button onclick="ViralMechanics.showStep(3)" style="
                        width: 100%; padding: 16px; border-radius: 30px;
                        background: linear-gradient(45deg, #FFD700, #FFA500);
                        color: #000; font-weight: bold; font-size: 16px;
                        border: none; cursor: pointer;
                    ">📤 Поделиться</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(overlay);
        
        // Клик на overlay (вне popup) = goodbye
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) this.showStep(4);
        });
    },
    
    // Показать popup
    showPopup() {
        if (this.popupShown) return;
        this.popupShown = true;
        
        if (this.sessionKey) {
            sessionStorage.setItem(this.sessionKey, 'true');
        }
        
        const overlay = document.getElementById('viralPopupOverlay');
        if (overlay) {
            overlay.style.display = 'flex';
            this.showStep(1);
        }
        
        console.log('🎁 POPUP SHOWN!');
    },
    
    // Переключение шагов
    showStep(n) {
        for (let i = 1; i <= 5; i++) {
            const el = document.getElementById('viralStep' + i);
            if (el) el.style.display = i === n ? 'block' : 'none';
        }
        if (n === 3) this.updateLink();
    },
    
    // Отправка регистрации
    async submitReg() {
        const name = document.getElementById('vName').value.trim();
        const messenger = document.getElementById('vMessenger').value;
        const contact = document.getElementById('vContact').value.trim();
        const pushConsent = document.getElementById('vPushConsent')?.checked || false;
        
        if (!name || !messenger || !contact) {
            alert('Заполните все поля');
            return;
        }
        
        const btn = document.getElementById('vSubmitBtn');
        btn.textContent = 'Загрузка...';
        btn.disabled = true;
        
        try {
            const res = await fetch('/api/viral-registration', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    referrerId: this.cardCreatorId,
                    name, messenger, contact,
                    pushConsent: pushConsent,
                    cardId: new URLSearchParams(window.location.search).get('sc')
                })
            });
            
            const data = await res.json();
            console.log('📝 Registration result:', data);
            
            if (data.tempId) {
                this.tempUserId = data.tempId;
                localStorage.setItem('cg_viral_id', data.tempId);
            }
            
            // Сохраняем согласие в localStorage
            localStorage.setItem('push_consent', pushConsent ? 'true' : 'false');
            console.log('📱 Push consent saved:', pushConsent);
            
            // Запрашиваем разрешение на уведомления если дано согласие
            if (pushConsent && 'Notification' in window && Notification.permission === 'default') {
                setTimeout(() => {
                    Notification.requestPermission().then(permission => {
                        console.log('🔔 Notification permission:', permission);
                    });
                }, 1000);
            }
        } catch (e) {
            console.error('Registration error:', e);
            this.tempUserId = 'CG_' + Date.now();
            localStorage.setItem('cg_viral_id', this.tempUserId);
        }
        
        btn.textContent = 'Далее →';
        btn.disabled = false;
        
        this.showStep(5);
    },
    
    // Обновить ссылку
    updateLink() {
        const el = document.getElementById('vShareLink');
        if (el) el.textContent = this.getLink();
    },
    
    // Получить ссылку
    getLink() {
        const sc = new URLSearchParams(window.location.search).get('sc');
        const ref = this.tempUserId || localStorage.getItem('cg_viral_id') || this.cardCreatorId;
        return `${window.location.origin}/c/${sc}?ref=${ref}`;
    },
    
    // Шеринг
    share(platform) {
        const url = this.getLink();
        const text = '🎁 Посмотри это!';
        let link = '';
        
        if (platform === 'telegram') link = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
        if (platform === 'whatsapp') link = `https://wa.me/?text=${encodeURIComponent(text + ' ' + url)}`;
        if (platform === 'viber') link = `viber://forward?text=${encodeURIComponent(text + ' ' + url)}`;
        
        if (link) window.open(link, '_blank');
    },
    
    // Копировать
    copyLink() {
        navigator.clipboard.writeText(this.getLink()).then(() => {
            alert('✅ Ссылка скопирована!');
        }).catch(() => {
            prompt('Скопируйте ссылку:', this.getLink());
        });
    },
    
    // Закрыть
    close() {
        const overlay = document.getElementById('viralPopupOverlay');
        if (overlay) overlay.style.display = 'none';
    },
    
    // Escape HTML
    escHtml(s) {
        if (!s) return '';
        return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    },
    
    // Переводы для push-согласия
    pushConsentTranslations: {
        en: "📱 I agree to receive gift notifications via push notifications",
        ru: "📱 Я согласен получать уведомления о получении подарка через push-уведомления",
        ua: "📱 Я згоден отримувати сповіщення про отримання подарунка через push-сповіщення"
    },
    
    // Обновить текст push-согласия
    updatePushConsentText(lang) {
        const textElement = document.getElementById('vPushConsentText');
        if (textElement && this.pushConsentTranslations[lang]) {
            textElement.textContent = this.pushConsentTranslations[lang];
        }
    }
};

window.ViralMechanics = ViralMechanics;
console.log('🎁 ViralMechanics v5.0 LOADED');

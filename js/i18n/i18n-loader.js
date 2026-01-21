/**
 * CARDGIFT I18N LOADER v2.0
 * Модульная система локализации с JSON файлами
 * 
 * Использование:
 * 1. Подключить: <script src="js/i18n/i18n-loader.js"></script>
 * 2. В HTML добавить data-i18n="ключ.подключ" к элементам
 * 3. Переключать: I18n.setLanguage('en')
 */

(function() {
    'use strict';
    
    // ═══════════════════════════════════════════════════════════
    // КОНФИГУРАЦИЯ
    // ═══════════════════════════════════════════════════════════
    
    const CONFIG = {
        defaultLang: 'ru',
        supportedLangs: ['en', 'ru', 'ua'],
        basePath: '/js/i18n/',
        storageKey: 'cardgift_language',
        debug: false
    };
    
    // ═══════════════════════════════════════════════════════════
    // СОСТОЯНИЕ
    // ═══════════════════════════════════════════════════════════
    
    let currentLang = CONFIG.defaultLang;
    let translations = {};
    let isLoaded = false;
    
    // ═══════════════════════════════════════════════════════════
    // ЗАГРУЗКА JSON
    // ═══════════════════════════════════════════════════════════
    
    async function loadTranslations(lang) {
        if (translations[lang]) {
            if (CONFIG.debug) console.log(`🌐 [i18n] Using cached: ${lang}`);
            return translations[lang];
        }
        
        try {
            const response = await fetch(`${CONFIG.basePath}${lang}.json?v=${Date.now()}`);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            
            const data = await response.json();
            translations[lang] = data;
            
            if (CONFIG.debug) console.log(`🌐 [i18n] Loaded: ${lang}`, data);
            return data;
            
        } catch (error) {
            console.error(`🌐 [i18n] Failed to load ${lang}.json:`, error);
            
            // Fallback на русский
            if (lang !== 'ru' && translations['ru']) {
                return translations['ru'];
            }
            
            return null;
        }
    }
    
    // ═══════════════════════════════════════════════════════════
    // ПОЛУЧЕНИЕ ПЕРЕВОДА ПО КЛЮЧУ
    // ═══════════════════════════════════════════════════════════
    
    function t(key, fallback = null) {
        const trans = translations[currentLang];
        if (!trans) return fallback || key;
        
        // Поддержка вложенных ключей: "panel.title"
        const keys = key.split('.');
        let value = trans;
        
        for (const k of keys) {
            if (value && typeof value === 'object' && k in value) {
                value = value[k];
            } else {
                // Ключ не найден - пробуем fallback на русский
                if (currentLang !== 'ru' && translations['ru']) {
                    let ruValue = translations['ru'];
                    for (const rk of keys) {
                        if (ruValue && typeof ruValue === 'object' && rk in ruValue) {
                            ruValue = ruValue[rk];
                        } else {
                            return fallback || key;
                        }
                    }
                    return ruValue;
                }
                return fallback || key;
            }
        }
        
        return value;
    }
    
    // ═══════════════════════════════════════════════════════════
    // ПРИМЕНЕНИЕ ПЕРЕВОДОВ К DOM
    // ═══════════════════════════════════════════════════════════
    
    function applyTranslations() {
        if (!translations[currentLang]) {
            console.warn('🌐 [i18n] No translations loaded');
            return;
        }
        
        // 1. Элементы с data-i18n
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.dataset.i18n;
            const value = t(key);
            
            if (value && value !== key) {
                // Проверяем тип элемента
                if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                    if (el.placeholder !== undefined && el.dataset.i18nAttr === 'placeholder') {
                        el.placeholder = value;
                    } else if (el.value !== undefined && el.dataset.i18nAttr === 'value') {
                        el.value = value;
                    } else if (el.placeholder !== undefined) {
                        el.placeholder = value;
                    }
                } else if (el.dataset.i18nAttr === 'title') {
                    el.title = value;
                } else {
                    el.textContent = value;
                }
            }
        });
        
        // 2. Элементы с data-i18n-html (для HTML контента)
        document.querySelectorAll('[data-i18n-html]').forEach(el => {
            const key = el.dataset.i18nHtml;
            const value = t(key);
            if (value && value !== key) {
                el.innerHTML = value;
            }
        });
        
        // 3. Специальные элементы по ID (для обратной совместимости)
        applySpecialElements();
        
        if (CONFIG.debug) console.log(`🌐 [i18n] Applied translations for: ${currentLang}`);
    }
    
    // ═══════════════════════════════════════════════════════════
    // СПЕЦИАЛЬНЫЕ ЭЛЕМЕНТЫ (обратная совместимость)
    // ═══════════════════════════════════════════════════════════
    
    function applySpecialElements() {
        const trans = translations[currentLang];
        if (!trans) return;
        
        // Сайдбар - навигация
        const sidebarMapping = {
            'panel': trans.sidebar?.panel,
            'archive': trans.sidebar?.archive,
            'contacts': trans.sidebar?.contacts,
            'analytics': trans.sidebar?.analytics,
            'referrals': trans.sidebar?.referrals,
            'crm': trans.sidebar?.crm,
            'surveys': trans.sidebar?.surveys,
            'blog': trans.sidebar?.blog,
            'mailings': trans.sidebar?.mailings,
            'studio': trans.sidebar?.studio,
            'ai-studio': trans.sidebar?.aiStudio,
            'mlm': trans.sidebar?.mlm,
            'organizer': trans.sidebar?.organizer,
            'coauthors': trans.sidebar?.coauthors,
            'wallet': trans.sidebar?.wallet,
            'settings': trans.sidebar?.settings,
            'admin': trans.sidebar?.admin
        };
        
        document.querySelectorAll('.nav-item').forEach(item => {
            const section = item.dataset.section;
            if (section && sidebarMapping[section]) {
                const textEl = item.querySelector('.nav-text');
                if (textEl) textEl.textContent = sidebarMapping[section];
            }
        });
        
        // Заголовки секций
        const sectionTitles = {
            'section-panel': trans.panel?.title,
            'section-contacts': trans.contacts?.title,
            'section-archive': trans.archive?.title,
            'section-referrals': trans.referrals?.title,
            'section-crm': trans.crm?.title,
            'section-surveys': trans.surveys?.title
        };
        
        Object.entries(sectionTitles).forEach(([sectionId, title]) => {
            if (!title) return;
            const section = document.getElementById(sectionId);
            if (section) {
                const h1 = section.querySelector('.section-title');
                if (h1) {
                    const icon = h1.querySelector('.title-icon');
                    const iconText = icon ? icon.textContent : '';
                    h1.innerHTML = `<span class="title-icon">${iconText}</span> ${title}`;
                }
            }
        });
        
        // Статистика на панели
        const statLabels = {
            'stat-team': trans.panel?.teamTotal,
            'stat-active': trans.panel?.activeUsers,
            'stat-income': trans.panel?.income,
            'stat-conversion': trans.panel?.conversion
        };
        
        Object.entries(statLabels).forEach(([statId, label]) => {
            if (!label) return;
            const statCard = document.getElementById(statId)?.closest('.stat-card');
            if (statCard) {
                const labelEl = statCard.querySelector('.stat-label');
                if (labelEl) labelEl.textContent = label;
            }
        });
        
        // Заголовки карточек
        const cardHeaders = document.querySelectorAll('.card-header');
        const headerTranslations = {
            'Быстрые действия': trans.panel?.quickActions,
            'Quick Actions': trans.panel?.quickActions,
            'Последняя активность': trans.panel?.lastActivity,
            'Recent Activity': trans.panel?.lastActivity,
            'Поиск контактов': trans.contacts?.searchTitle,
            'Search Contacts': trans.contacts?.searchTitle,
            'База контактов': trans.contacts?.database,
            'Contact Database': trans.contacts?.database,
            'Ваша реферальная ссылка': trans.referrals?.yourLink,
            'Your Referral Link': trans.referrals?.yourLink,
            'Мои рефералы': trans.referrals?.myReferrals,
            'My Referrals': trans.referrals?.myReferrals,
            'Структура команды': trans.referrals?.structure,
            'Team Structure': trans.referrals?.structure
        };
        
        cardHeaders.forEach(header => {
            const icon = header.querySelector('.header-icon');
            const iconText = icon ? icon.outerHTML : '';
            const textContent = header.textContent.trim().replace(/^[^\s]+\s*/, ''); // убираем иконку
            
            Object.entries(headerTranslations).forEach(([original, translated]) => {
                if (textContent.includes(original.replace(/^[^\s]+\s*/, '')) && translated) {
                    header.innerHTML = `${iconText} ${translated}`;
                }
            });
        });
        
        // Кнопки действий
        translateButtons(trans);
        
        // Таблица контактов
        translateTable(trans);
        
        // Платформы
        translatePlatforms(trans);
        
        // Фильтры
        translateFilters(trans);
        
        // Пустые состояния
        translateEmptyStates(trans);
    }
    
    function translateButtons(trans) {
        const buttonMappings = [
            { selector: '.action-btn.green', text: trans.panel?.createCard, icon: '🎨' },
            { selector: '[onclick*="showSection(\'contacts\')"]', text: trans.panel?.manageContacts, icon: '👥' },
            { selector: '[onclick*="showSection(\'referrals\')"]', text: trans.panel?.viewTeam, icon: '🌐' },
            { selector: '[onclick*="copyReferralLink"]', text: trans.panel?.copyRefLink || trans.referrals?.copyLink, icon: '📋' },
            { selector: '[onclick*="showAddContactModal"]', text: trans.contacts?.addContact, icon: '➕' },
            { selector: '[onclick*="showImportExportModal"]', text: trans.contacts?.importExport, icon: '📁' },
            { selector: '[onclick*="searchContacts"]', text: trans.contacts?.searchBtn },
            { selector: '[onclick*="clearSearch"]', text: trans.contacts?.clearBtn }
        ];
        
        buttonMappings.forEach(({ selector, text, icon }) => {
            if (!text) return;
            const btn = document.querySelector(selector);
            if (btn) {
                btn.textContent = icon ? `${icon} ${text}` : text;
            }
        });
    }
    
    function translateTable(trans) {
        if (!trans.contacts?.tableHeaders) return;
        
        const headers = trans.contacts.tableHeaders;
        const table = document.querySelector('#contactsTable, .contacts-table, .data-table');
        
        if (table) {
            const ths = table.querySelectorAll('thead th');
            const headerOrder = ['name', 'platform', 'contact', 'pushConsent', 'source', 'userLevel', 'dateAdded', 'actions'];
            
            ths.forEach((th, i) => {
                const key = headerOrder[i];
                if (headers[key]) {
                    th.textContent = headers[key];
                }
            });
        }
    }
    
    function translatePlatforms(trans) {
        if (!trans.platforms) return;
        
        document.querySelectorAll('.platform-card .platform-name, .platform-name').forEach(el => {
            const text = el.textContent.trim().toLowerCase();
            const key = Object.keys(trans.platforms).find(k => 
                k.toLowerCase() === text || 
                trans.platforms[k]?.toLowerCase() === text
            );
            if (key && trans.platforms[key]) {
                el.textContent = trans.platforms[key];
            }
        });
        
        // Select options
        const categoryFilter = document.getElementById('categoryFilter');
        if (categoryFilter) {
            categoryFilter.querySelectorAll('option').forEach(opt => {
                const val = opt.value.toLowerCase();
                if (val === 'all') {
                    opt.textContent = trans.contacts?.allCategories || trans.platforms?.all;
                } else if (trans.platforms[val]) {
                    opt.textContent = trans.platforms[val];
                }
            });
        }
    }
    
    function translateFilters(trans) {
        // Referral source filter
        const sourceFilter = document.getElementById('referralSourceFilter');
        if (sourceFilter && trans.referrals?.filters) {
            const options = sourceFilter.querySelectorAll('option');
            const filterMap = {
                'all': trans.referrals.filters.allSources,
                'viral': trans.referrals.filters.viral,
                'registration': trans.referrals.filters.registration,
                'card': trans.referrals.filters.fromCard
            };
            
            options.forEach(opt => {
                if (filterMap[opt.value]) {
                    const icon = opt.textContent.match(/^[^\s]+/)?.[0] || '';
                    opt.textContent = icon ? `${icon} ${filterMap[opt.value]}` : filterMap[opt.value];
                }
            });
        }
        
        // Line filter
        const lineFilter = document.getElementById('referralLineFilter');
        if (lineFilter && trans.referrals?.filters?.allLines) {
            const allOption = lineFilter.querySelector('option[value="all"]');
            if (allOption) allOption.textContent = trans.referrals.filters.allLines;
        }
    }
    
    function translateEmptyStates(trans) {
        // Контакты
        const emptyContacts = document.getElementById('emptyContacts');
        if (emptyContacts && trans.contacts?.connectWallet) {
            emptyContacts.textContent = trans.contacts.connectWallet;
        }
        
        // Рефералы
        const emptyReferrals = document.getElementById('emptyReferrals');
        if (emptyReferrals && trans.referrals?.empty) {
            const titleEl = emptyReferrals.querySelector('div[style*="font-size: 18px"]');
            const textEl = emptyReferrals.querySelector('div[style*="color: #888"]');
            if (titleEl) titleEl.textContent = trans.referrals.empty.title;
            if (textEl) textEl.textContent = trans.referrals.empty.text;
        }
        
        // Архив
        const emptyArchive = document.getElementById('emptyArchive');
        if (emptyArchive && trans.archive?.empty) {
            const title = emptyArchive.querySelector('.empty-title');
            const text = emptyArchive.querySelector('.empty-text');
            if (title) title.textContent = trans.archive.empty.title;
            if (text) text.textContent = trans.archive.empty.text;
        }
        
        // Активность
        const activityEmpty = document.querySelector('.activity-empty');
        if (activityEmpty && trans.panel?.noActivity) {
            activityEmpty.textContent = trans.panel.noActivity;
        }
    }
    
    // ═══════════════════════════════════════════════════════════
    // УСТАНОВКА ЯЗЫКА
    // ═══════════════════════════════════════════════════════════
    
    async function setLanguage(lang) {
        if (!CONFIG.supportedLangs.includes(lang)) {
            console.warn(`🌐 [i18n] Unsupported language: ${lang}`);
            lang = CONFIG.defaultLang;
        }
        
        const loaded = await loadTranslations(lang);
        if (!loaded) return false;
        
        currentLang = lang;
        window.currentLanguage = lang;
        localStorage.setItem(CONFIG.storageKey, lang);
        
        // Обновляем HTML lang атрибут
        document.documentElement.lang = lang === 'ua' ? 'uk' : lang;
        
        // Обновляем кнопки переключения языка
        document.querySelectorAll('.lang-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.lang === lang);
        });
        
        // Применяем переводы
        applyTranslations();
        
        // Событие для других модулей
        window.dispatchEvent(new CustomEvent('languageChanged', { detail: { lang } }));
        
        console.log(`🌐 [i18n] Language set to: ${lang}`);
        return true;
    }
    
    // ═══════════════════════════════════════════════════════════
    // ИНИЦИАЛИЗАЦИЯ
    // ═══════════════════════════════════════════════════════════
    
    async function init() {
        // Определяем язык
        const urlParams = new URLSearchParams(window.location.search);
        const langFromUrl = urlParams.get('lang');
        const savedLang = localStorage.getItem(CONFIG.storageKey);
        const browserLang = navigator.language?.slice(0, 2);
        
        let lang = langFromUrl || savedLang || CONFIG.defaultLang;
        
        // Проверяем поддерживается ли язык браузера
        if (!savedLang && !langFromUrl && CONFIG.supportedLangs.includes(browserLang)) {
            lang = browserLang;
        }
        
        // Загружаем русский как fallback
        await loadTranslations('ru');
        
        // Загружаем выбранный язык
        await setLanguage(lang);
        
        // Инициализируем переключатели языка
        initLanguageSwitchers();
        
        isLoaded = true;
        console.log('🌐 [i18n] Initialized');
    }
    
    function initLanguageSwitchers() {
        document.querySelectorAll('.lang-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const lang = btn.dataset.lang;
                if (lang) setLanguage(lang);
            });
        });
    }
    
    // ═══════════════════════════════════════════════════════════
    // ЭКСПОРТ API
    // ═══════════════════════════════════════════════════════════
    
    const I18n = {
        init,
        setLanguage,
        t,
        applyTranslations,
        getCurrentLanguage: () => currentLang,
        getSupportedLanguages: () => CONFIG.supportedLangs,
        isLoaded: () => isLoaded,
        
        // Для добавления кастомных переводов
        addTranslations: (lang, data) => {
            translations[lang] = { ...translations[lang], ...data };
        }
    };
    
    // Глобальный доступ
    window.I18n = I18n;
    window.t = t;
    
    // Автоинициализация
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
    
    console.log('🌐 I18n Loader v2.0 ready');
    
})();

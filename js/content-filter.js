/* =====================================================
   CONTENT FILTER - Фильтр запрещённого контента
   v1.1 для GlobalStudio / AI Studio
   
   ИСПРАВЛЕНО:
   - Добавлен whitelist для бизнес-терминов
   - Улучшена нормализация (не так агрессивно)
   - Добавлено логирование для отладки
   ===================================================== */

const ContentFilter = {
    
    // ⭐ WHITELIST - разрешённые слова (не блокировать!)
    whitelist: [
        // Криптовалюты
        'bnb', 'usdt', 'btc', 'eth', 'bitcoin', 'ethereum', 'криптовалюта', 'блокчейн', 'blockchain',
        'web3', 'defi', 'nft', 'токен', 'token', 'смарт-контракт', 'smart contract',
        
        // Бизнес термины
        'доход', 'выход', 'пенсия', 'заработок', 'прибыль', 'инвестиции',
        'академия', 'обучение', 'курс', 'программа', 'cardgift', 'globalway',
        
        // Маркетинг
        'рассылка', 'листовка', 'банер', 'баннер', 'реклама', 'слайд', 'презентация',
        
        // Цифры и обозначения  
        '1000', '100000', '21', '90', '10'
    ],
    
    // Мат (русский + английский)
    matRoots: [
        'хуй', 'хуя', 'хуе', 'хуи', 'хую',
        'пизд', 'пезд',
        'блять', 'блядь', 'бляд', 'блят',
        'ебат', 'ебал', 'ебан', 'ебну', 'ебёт', 'ебет', 'ебли', 'ебла', 'ебло', 'ебуч',
        'сука', 'сучк', 'сучар',
        'мудак', 'мудач', 'мудил', 'мудо',
        'пидор', 'пидар', 'пидр', 'педик', 'педер',
        'залуп',
        'дерьм', 'говно', 'говён', 'говн',
        'выеб', 'заеб', 'наеб', 'отъеб', 'подъеб', 'разъеб', 'уеб', 'въеб', 'доеб',
        'долбоёб', 'долбоеб',
        'fuck', 'shit', 'bitch', 'asshole', 'cunt', 'whore',
        'нигер', 'ниггер', 'nigger', 'nigga'
    ],
    
    // Насилие
    violenceWords: [
        'убить', 'убей', 'убийств', 'убиваю',
        'зарезать', 'зарежу', 'зарезал',
        'застрелить', 'застрелю', 'расстрел',
        'взорвать', 'взорву',
        'отравить', 'отрав',
        'пытать', 'пытк', 'мучить',
        'насиловать', 'изнасил', 'насильн',
        'избить', 'избиени',
        'терроризм', 'террорист', 'теракт',
        'геноцид',
        'суицид', 'самоубий', 'повеситься', 'вскрыть вены',
        'murder', 'rape', 'torture', 'terrorist'
    ],
    
    // Порнография и разврат
    adultWords: [
        'порно', 'порнограф', 'porn',
        'секс с детьми', 'секс с ребенком',
        'оргия',
        'минет', 'отсос',
        'инцест',
        'педофил', 'малолетк',
        'проститу', 'шлюха', 'давалк',
        'hentai', 'хентай',
        'развратн', 'извращен'
    ],
    
    // ЛГБТ пропаганда
    lgbtPropaganda: [
        'гей парад', 'гей-парад', 'прайд',
        'смена пола ребенк',
        'однополый брак', 'однополые отношения'
    ],
    
    // Межнациональная вражда
    hateSpeech: [
        'хохол', 'хохл', 'бандеровец',
        'москаль', 'кацап', 'рашист',
        'чурка', 'черножоп',
        'смерть всем', 'убивать всех',
        'уничтожить всех',
        'белая раса превосход', 'арийская раса',
        'нацист', 'фашист', 'свастик', 'зиг хайл', 'heil hitler'
    ],
    
    // Наркотики (только явные)
    drugsWords: [
        'героин', 'кокаин', 'метамфетамин',
        'экстази', 'закладка наркотик', 'барыга', 'наркодилер',
        'спайс', 'соль для ванн'
    ],
    
    // Экстремизм
    extremismWords: [
        'джихад', 'шахид', 'игил', 'isis', 'талибан',
        'взорвать школ', 'взорвать метро',
        'массовый расстрел', 'стрельба в школе',
        'как сделать бомбу', 'как сделать взрывчатку',
        'рецепт яда', 'как отравить'
    ],
    
    /**
     * Проверить текст на запрещённый контент
     */
    check(text) {
        if (!text || typeof text !== 'string') {
            return { allowed: true, reason: null, category: null };
        }
        
        const normalized = this.normalizeText(text);
        
        console.log('🔍 ContentFilter checking:', text.substring(0, 100) + '...');
        console.log('🔍 Normalized:', normalized.substring(0, 100) + '...');
        
        // ⭐ Сначала проверяем whitelist
        const isWhitelisted = this.checkWhitelist(text);
        if (isWhitelisted) {
            console.log('✅ ContentFilter: Text contains whitelisted business terms');
        }
        
        const checks = [
            { words: this.matRoots, category: 'mat', reason: 'Нецензурная лексика запрещена' },
            { words: this.violenceWords, category: 'violence', reason: 'Контент с насилием запрещён' },
            { words: this.adultWords, category: 'adult', reason: 'Контент для взрослых запрещён' },
            { words: this.lgbtPropaganda, category: 'lgbt', reason: 'Данный контент запрещён' },
            { words: this.hateSpeech, category: 'hate', reason: 'Разжигание ненависти запрещено' },
            { words: this.drugsWords, category: 'drugs', reason: 'Контент о наркотиках запрещён' },
            { words: this.extremismWords, category: 'extremism', reason: 'Экстремистский контент запрещён' }
        ];
        
        for (const check of checks) {
            const found = this.findForbiddenWord(normalized, check.words, text);
            if (found) {
                console.log(`🚫 ContentFilter: blocked "${found}" (${check.category})`);
                console.log(`🚫 Original text fragment with blocked word`);
                return {
                    allowed: false,
                    reason: check.reason,
                    category: check.category,
                    word: found
                };
            }
        }
        
        console.log('✅ ContentFilter: Text is clean');
        return { allowed: true, reason: null, category: null };
    },
    
    isAllowed(text) {
        return this.check(text).allowed;
    },
    
    /**
     * ⭐ Проверка whitelist
     */
    checkWhitelist(text) {
        const lower = text.toLowerCase();
        return this.whitelist.some(word => lower.includes(word.toLowerCase()));
    },
    
    /**
     * ⭐ УЛУЧШЕННАЯ нормализация (менее агрессивная)
     */
    normalizeText(text) {
        return text
            .toLowerCase()
            // Только явные замены цифр на буквы (для обхода фильтра)
            .replace(/0/g, 'о')
            .replace(/3/g, 'е')
            .replace(/4/g, 'а')
            .replace(/@/g, 'а')
            .replace(/\$/g, 's')
            // НЕ заменяем латинские буквы на кириллические - это вызывало ложные срабатывания!
            // Убираем повторяющиеся символы (ааааа -> аа)
            .replace(/(.)\1{2,}/g, '$1$1')
            .replace(/\s+/g, ' ')
            .trim();
    },
    
    /**
     * ⭐ Улучшенный поиск запрещённых слов
     */
    findForbiddenWord(normalizedText, wordList, originalText) {
        const originalLower = originalText.toLowerCase();
        
        for (const word of wordList) {
            const wordLower = word.toLowerCase();
            
            // Проверяем в оригинальном тексте (более точно)
            if (originalLower.includes(wordLower)) {
                // Проверяем что это не часть разрешённого слова
                if (!this.isPartOfWhitelistedWord(originalLower, wordLower)) {
                    return word;
                }
            }
            
            // Проверяем в нормализованном
            if (normalizedText.includes(wordLower)) {
                if (!this.isPartOfWhitelistedWord(normalizedText, wordLower)) {
                    return word;
                }
            }
        }
        
        return null;
    },
    
    /**
     * ⭐ Проверка: не является ли найденное слово частью разрешённого
     */
    isPartOfWhitelistedWord(text, foundWord) {
        for (const whiteWord of this.whitelist) {
            if (whiteWord.toLowerCase().includes(foundWord) && text.includes(whiteWord.toLowerCase())) {
                console.log(`ℹ️ "${foundWord}" is part of whitelisted "${whiteWord}", allowing`);
                return true;
            }
        }
        return false;
    },
    
    /**
     * Добавить слово в категорию
     */
    addWord(category, word) {
        const categories = {
            'mat': this.matRoots,
            'violence': this.violenceWords,
            'adult': this.adultWords,
            'lgbt': this.lgbtPropaganda,
            'hate': this.hateSpeech,
            'drugs': this.drugsWords,
            'extremism': this.extremismWords,
            'whitelist': this.whitelist
        };
        
        if (categories[category]) {
            categories[category].push(word.toLowerCase());
            console.log(`✅ Added "${word}" to ${category}`);
            return true;
        }
        return false;
    },
    
    /**
     * ⭐ Добавить слово в whitelist
     */
    addToWhitelist(word) {
        this.whitelist.push(word.toLowerCase());
        console.log(`✅ Added "${word}" to whitelist`);
    }
};

window.ContentFilter = ContentFilter;
console.log('🛡️ ContentFilter v1.1 loaded (with whitelist)');

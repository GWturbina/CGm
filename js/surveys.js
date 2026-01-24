// =============================================
// SURVEYS MODULE - Вирусные опросы v2.0
// =============================================

let surveysData = [];
let surveyTemplatesData = [];
let currentQuestionId = 0;

// ID владельца системы
const OWNER_GW_ID = 'GW9729645';

// Встроенные шаблоны (fallback если нет в базе)
const BUILT_IN_TEMPLATES = {
    work: {
        id: 'work',
        title: 'Работа в интернете',
        description: 'Узнайте свой потенциал для онлайн-заработка',
        icon: '💼',
        category: 'business',
        reward_text: 'Бесплатный мини-курс',
        referral_reward: 'Бонус за каждого друга',
        is_global: true,
        questions: [
            { text: 'Сколько времени вы готовы уделять дополнительному заработку?', options: ['1-2 часа в день', '3-4 часа в день', 'Полный рабочий день', 'Пока не определился'] },
            { text: 'Какой опыт работы в интернете у вас есть?', options: ['Никакого', 'Пробовал фриланс', 'Есть небольшой опыт', 'Работаю онлайн давно'] },
            { text: 'Что для вас важнее в работе?', options: ['Стабильный доход', 'Свободный график', 'Возможность роста', 'Работа из дома'] },
            { text: 'Какой уровень дохода вас интересует?', options: ['$300-500/мес', '$500-1000/мес', '$1000-3000/мес', 'Больше $3000/мес'] },
            { text: 'Готовы ли вы обучаться новому?', options: ['Да, готов вкладывать время', 'Да, если это несложно', 'Только если быстро окупится', 'Хочу готовое решение'] }
        ]
    },
    feedback: {
        id: 'feedback',
        title: 'Оценка продукта',
        description: 'Ваше мнение очень важно для нас',
        icon: '⭐',
        category: 'feedback',
        reward_text: 'Скидка 10% на следующую покупку',
        referral_reward: 'Дополнительная скидка за друга',
        is_global: true,
        questions: [
            { text: 'Как вы узнали о нашем продукте?', options: ['Реклама', 'Рекомендация друга', 'Социальные сети', 'Поиск в интернете'] },
            { text: 'Насколько вы довольны качеством?', options: ['Очень доволен', 'Доволен', 'Нейтрально', 'Не доволен'] },
            { text: 'Порекомендуете ли вы нас друзьям?', options: ['Обязательно', 'Скорее да', 'Возможно', 'Скорее нет'] },
            { text: 'Что бы вы улучшили?', options: ['Цену', 'Качество', 'Сервис', 'Всё отлично'] }
        ]
    },
    hello: {
        id: 'hello',
        title: 'Давайте познакомимся!',
        description: 'Расскажите немного о себе',
        icon: '👋',
        category: 'general',
        reward_text: 'Полезные материалы',
        referral_reward: 'Эксклюзивный контент за друзей',
        is_global: true,
        questions: [
            { text: 'Как у вас дела?', options: ['Отлично!', 'Хорошо', 'Нормально', 'Бывало лучше'] },
            { text: 'Чем вы занимаетесь?', options: ['Работаю по найму', 'Свой бизнес', 'Фриланс', 'Учусь', 'В поиске'] },
            { text: 'Что вас интересует больше всего?', options: ['Заработок', 'Саморазвитие', 'Отношения', 'Здоровье', 'Путешествия'] }
        ]
    },
    finance: {
        id: 'finance',
        title: 'Тест: Финансовая грамотность',
        description: 'Узнайте свой уровень финансовых знаний',
        icon: '💰',
        category: 'education',
        reward_text: 'PDF-гайд по инвестициям',
        referral_reward: 'Видео-урок за каждого друга',
        is_global: true,
        questions: [
            { text: 'Есть ли у вас финансовая подушка?', options: ['Да, на 6+ месяцев', 'Да, на 1-3 месяца', 'Небольшая', 'Нет'] },
            { text: 'Как вы относитесь к инвестициям?', options: ['Активно инвестирую', 'Хочу начать', 'Боюсь рисков', 'Не интересуюсь'] },
            { text: 'Ведёте ли вы учёт расходов?', options: ['Да, регулярно', 'Иногда', 'Редко', 'Нет'] },
            { text: 'Какова ваша главная финансовая цель?', options: ['Накопить на крупную покупку', 'Пассивный доход', 'Погасить долги', 'Увеличить доход'] }
        ]
    }
};

// Для совместимости со старым кодом
const SURVEY_TEMPLATES = BUILT_IN_TEMPLATES;

// =============================================
// ИСПРАВЛЕННЫЕ ФУНКЦИИ МОДАЛЬНЫХ ОКОН
// =============================================

function showCreateSurveyModal() {
    document.getElementById('create-survey-modal').style.cssText = 'display: flex !important;';
    document.getElementById('questions-container').innerHTML = '';
    document.getElementById('create-survey-form').reset();
    currentQuestionId = 0;
    addSurveyQuestion();
}

function closeCreateSurveyModal() {
    document.getElementById('create-survey-modal').style.cssText = 'display: none !important;';
}

// =============================================
// СИСТЕМА ШАБЛОНОВ v2.0
// =============================================

async function showTemplatesModal() {
    const modal = document.getElementById('templates-modal');
    modal.style.cssText = 'display: flex !important;';
    
    // Показываем загрузку
    const container = document.getElementById('templates-list');
    container.innerHTML = '<div style="text-align: center; padding: 40px; color: var(--text-muted);"><div class="spinner" style="width: 40px; height: 40px; border: 3px solid var(--border); border-top-color: var(--gold); border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 15px;"></div>Загрузка шаблонов...</div>';
    
    await loadSurveyTemplates();
    renderTemplatesList();
}

function closeTemplatesModal() {
    document.getElementById('templates-modal').style.cssText = 'display: none !important;';
}

// Загрузка шаблонов из базы
async function loadSurveyTemplates() {
    const currentGwId = window.currentGwId || window.currentDisplayId || '';
    
    try {
        // Загружаем шаблоны из survey_templates
        const { data, error } = await SupabaseClient.client
            .from('survey_templates')
            .select('*')
            .or(`is_global.eq.true,created_by_gw_id.eq.${currentGwId},visibility.eq.public`)
            .eq('is_active', true)
            .order('created_at', { ascending: false });
        
        if (data && data.length > 0) {
            surveyTemplatesData = data;
            console.log('📋 Loaded templates from DB:', data.length);
        } else {
            // Fallback на встроенные шаблоны
            surveyTemplatesData = Object.values(BUILT_IN_TEMPLATES);
            console.log('📋 Using built-in templates');
        }
    } catch (e) {
        console.log('📋 Templates table not ready, using built-in:', e.message);
        surveyTemplatesData = Object.values(BUILT_IN_TEMPLATES);
    }
}

// Рендер списка шаблонов с фильтрами
function renderTemplatesList(filter = 'all') {
    const container = document.getElementById('templates-list');
    const currentGwId = window.currentGwId || window.currentDisplayId || '';
    const isOwner = currentGwId === OWNER_GW_ID;
    
    // Фильтруем шаблоны
    let filtered = surveyTemplatesData;
    if (filter === 'global') {
        filtered = surveyTemplatesData.filter(t => t.is_global);
    } else if (filter === 'my') {
        filtered = surveyTemplatesData.filter(t => t.created_by_gw_id === currentGwId);
    } else if (filter !== 'all') {
        filtered = surveyTemplatesData.filter(t => t.category === filter);
    }
    
    // Категории для фильтра
    const categories = {
        all: '📁 Все',
        global: '🌐 Глобальные',
        business: '💼 Бизнес',
        feedback: '⭐ Отзывы',
        education: '🎓 Образование',
        general: '👋 Общее',
        my: '👤 Мои'
    };
    
    let html = `
        <!-- Фильтры -->
        <div style="grid-column: 1 / -1; margin-bottom: 15px;">
            <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 15px;">
                ${Object.entries(categories).map(([key, label]) => `
                    <button onclick="renderTemplatesList('${key}')" 
                            class="btn btn-sm ${filter === key ? 'btn-yellow' : 'btn-gray'}"
                            style="padding: 6px 12px; font-size: 12px;">
                        ${label}
                    </button>
                `).join('')}
            </div>
            ${isOwner ? `
                <button onclick="showCreateTemplateModal()" class="btn btn-green" style="width: 100%;">
                    ➕ Создать новый шаблон (OWNER)
                </button>
            ` : ''}
        </div>
    `;
    
    if (filtered.length === 0) {
        html += `
            <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: var(--text-muted);">
                <div style="font-size: 50px; margin-bottom: 15px;">📋</div>
                <p>Нет шаблонов в этой категории</p>
            </div>
        `;
    } else {
        html += filtered.map(t => `
            <div class="template-card" style="background: var(--bg-card); border: 1px solid ${t.is_global ? 'var(--gold)' : 'var(--border)'}; border-radius: 12px; padding: 20px; cursor: pointer; transition: all 0.2s; position: relative;"
                 onclick="useSurveyTemplate('${t.id}')">
                ${t.is_global ? '<div style="position: absolute; top: 8px; right: 8px; background: var(--gold); color: #000; padding: 2px 8px; border-radius: 10px; font-size: 10px; font-weight: 600;">🌐 GLOBAL</div>' : ''}
                <div style="font-size: 40px; margin-bottom: 10px;">${t.icon || '📋'}</div>
                <div style="font-weight: 600; margin-bottom: 5px;">${t.title}</div>
                <div style="font-size: 12px; color: var(--text-muted); margin-bottom: 10px;">${t.description || ''}</div>
                <div style="font-size: 11px; color: var(--text-muted);">
                    ${t.questions?.length || 0} вопросов
                    ${t.uses_count ? ` • ${t.uses_count} использований` : ''}
                </div>
            </div>
        `).join('');
    }
    
    container.innerHTML = html;
}

// =============================================
// ОСТАЛЬНОЙ КОД
// =============================================

// Использовать шаблон (из БД или встроенный)
function useSurveyTemplate(templateId) {
    // Сначала ищем в загруженных из БД
    let template = surveyTemplatesData.find(t => t.id === templateId);
    
    // Если нет - ищем во встроенных
    if (!template) {
        template = BUILT_IN_TEMPLATES[templateId];
    }
    
    if (!template) {
        console.warn('Survey template not found:', templateId);
        showToast && showToast('Шаблон не найден', 'error');
        return;
    }
    
    closeTemplatesModal();
    showCreateSurveyModal();
    
    const form = document.getElementById('create-survey-form');
    form.title.value = template.title || '';
    form.description.value = template.description || '';
    form.reward_text.value = template.reward_text || '';
    form.referral_reward.value = template.referral_reward || template.referral_reward_text || '';
    
    // Выбрать иконку
    const iconSelect = form.icon;
    for (let i = 0; i < iconSelect.options.length; i++) {
        if (iconSelect.options[i].value === template.icon) {
            iconSelect.selectedIndex = i;
            break;
        }
    }
    
    // Выбрать категорию
    if (template.category && form.category) {
        for (let i = 0; i < form.category.options.length; i++) {
            if (form.category.options[i].value === template.category) {
                form.category.selectedIndex = i;
                break;
            }
        }
    }
    
    // Добавить вопросы из шаблона
    document.getElementById('questions-container').innerHTML = '';
    currentQuestionId = 0;
    
    if (template.questions) {
        template.questions.forEach(q => {
            addSurveyQuestion(q.text, q.options);
        });
    }
    
    // Увеличиваем счётчик использований (если это из БД)
    if (template.id && !BUILT_IN_TEMPLATES[template.id]) {
        incrementTemplateUsage(template.id);
    }
    
    console.log('✨ Survey template loaded:', templateId);
    showToast('Шаблон загружен! Отредактируйте и сохраните.', 'info');
}

// Увеличить счётчик использований шаблона
async function incrementTemplateUsage(templateId) {
    try {
        await SupabaseClient.client.rpc('increment_template_usage', { template_id: templateId });
    } catch (e) {
        // Если RPC нет - обновляем напрямую
        try {
            const { data } = await SupabaseClient.client
                .from('survey_templates')
                .select('uses_count')
                .eq('id', templateId)
                .single();
            
            await SupabaseClient.client
                .from('survey_templates')
                .update({ uses_count: (data?.uses_count || 0) + 1 })
                .eq('id', templateId);
        } catch (e2) {
            console.log('Could not update template usage');
        }
    }
}

// =============================================
// СОЗДАНИЕ ШАБЛОНА (OWNER)
// =============================================

function showCreateTemplateModal() {
    const currentGwId = window.currentGwId || window.currentDisplayId || '';
    if (currentGwId !== OWNER_GW_ID) {
        showToast('Только OWNER может создавать глобальные шаблоны', 'error');
        return;
    }
    
    // Создаём модалку если её нет
    let modal = document.getElementById('create-template-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'create-template-modal';
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 600px;">
                <div class="modal-header">
                    <h2>➕ Создать шаблон опроса</h2>
                    <button class="modal-close" onclick="closeCreateTemplateModal()">✕</button>
                </div>
                <div class="modal-body" style="max-height: 60vh; overflow-y: auto;">
                    <form id="create-template-form">
                        <div class="form-group">
                            <label>Название шаблона *</label>
                            <input type="text" class="form-input" name="title" required placeholder="Например: Опрос про здоровье">
                        </div>
                        <div class="form-group">
                            <label>Описание</label>
                            <textarea class="form-input" name="description" rows="2" placeholder="Краткое описание шаблона"></textarea>
                        </div>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                            <div class="form-group">
                                <label>Иконка</label>
                                <select class="form-select" name="icon">
                                    <option value="📋">📋 Опрос</option>
                                    <option value="💼">💼 Бизнес</option>
                                    <option value="💰">💰 Финансы</option>
                                    <option value="🎓">🎓 Образование</option>
                                    <option value="⭐">⭐ Отзыв</option>
                                    <option value="🎁">🎁 Подарок</option>
                                    <option value="❤️">❤️ Здоровье</option>
                                    <option value="🏠">🏠 Недвижимость</option>
                                    <option value="🚗">🚗 Авто</option>
                                    <option value="✈️">✈️ Путешествия</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label>Категория</label>
                                <select class="form-select" name="category">
                                    <option value="business">💼 Бизнес</option>
                                    <option value="feedback">⭐ Отзывы</option>
                                    <option value="education">🎓 Образование</option>
                                    <option value="general">👋 Общее</option>
                                </select>
                            </div>
                        </div>
                        <div class="form-group">
                            <label>Награда за прохождение</label>
                            <input type="text" class="form-input" name="reward_text" placeholder="Что получит участник">
                        </div>
                        <div class="form-group">
                            <label>Награда за рефералов</label>
                            <input type="text" class="form-input" name="referral_reward" placeholder="Бонус за приглашение друзей">
                        </div>
                        <div class="form-group">
                            <label>
                                <input type="checkbox" name="is_global" checked> 
                                🌐 Глобальный шаблон (виден всем)
                            </label>
                        </div>
                        
                        <h3 style="margin: 20px 0 15px; color: var(--gold);">❓ Вопросы шаблона</h3>
                        <div id="template-questions-container"></div>
                        <button type="button" class="btn btn-gray" onclick="addTemplateQuestion()" style="margin-top: 10px;">➕ Добавить вопрос</button>
                    </form>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-gray" onclick="closeCreateTemplateModal()">Отмена</button>
                    <button class="btn btn-green" onclick="saveTemplate()">💾 Сохранить шаблон</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }
    
    // Очищаем форму
    document.getElementById('create-template-form').reset();
    document.getElementById('template-questions-container').innerHTML = '';
    templateQuestionId = 0;
    addTemplateQuestion();
    
    modal.style.display = 'flex';
}

function closeCreateTemplateModal() {
    const modal = document.getElementById('create-template-modal');
    if (modal) modal.style.display = 'none';
}

let templateQuestionId = 0;

function addTemplateQuestion(text = '', options = ['', '', '', '']) {
    templateQuestionId++;
    const container = document.getElementById('template-questions-container');
    
    const div = document.createElement('div');
    div.className = 'template-question-block';
    div.id = `template-question-${templateQuestionId}`;
    div.style.cssText = 'background: var(--bg-dark); border: 1px solid var(--border); border-radius: 10px; padding: 15px; margin-bottom: 15px;';
    
    div.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
            <span style="font-weight: 600; color: var(--gold);">Вопрос ${templateQuestionId}</span>
            <button type="button" class="btn btn-sm btn-red" onclick="this.parentElement.parentElement.remove()">🗑️</button>
        </div>
        <input type="text" class="form-input template-question-text" value="${text}" placeholder="Текст вопроса" style="margin-bottom: 10px;">
        <div class="template-options-container">
            ${options.map((opt, i) => `
                <div style="display: flex; gap: 8px; margin-bottom: 8px;">
                    <input type="text" class="form-input template-option-text" value="${opt}" placeholder="Вариант ${i + 1}" style="flex: 1;">
                    <button type="button" class="btn btn-sm btn-gray" onclick="this.parentElement.remove()">✕</button>
                </div>
            `).join('')}
        </div>
        <button type="button" class="btn btn-sm btn-gray" onclick="addTemplateOption(${templateQuestionId})" style="margin-top: 5px;">➕ Вариант</button>
    `;
    
    container.appendChild(div);
}

function addTemplateOption(questionId) {
    const container = document.querySelector(`#template-question-${questionId} .template-options-container`);
    const optionCount = container.querySelectorAll('.template-option-text').length + 1;
    
    const div = document.createElement('div');
    div.style.cssText = 'display: flex; gap: 8px; margin-bottom: 8px;';
    div.innerHTML = `
        <input type="text" class="form-input template-option-text" placeholder="Вариант ${optionCount}" style="flex: 1;">
        <button type="button" class="btn btn-sm btn-gray" onclick="this.parentElement.remove()">✕</button>
    `;
    container.appendChild(div);
}

async function saveTemplate() {
    const form = document.getElementById('create-template-form');
    const title = form.title.value.trim();
    
    if (!title) {
        showToast('Введите название шаблона', 'error');
        return;
    }
    
    // Собираем вопросы
    const questions = [];
    document.querySelectorAll('.template-question-block').forEach((block, i) => {
        const text = block.querySelector('.template-question-text')?.value?.trim();
        const options = Array.from(block.querySelectorAll('.template-option-text'))
            .map(input => input.value.trim())
            .filter(v => v);
        
        if (text && options.length >= 2) {
            questions.push({ id: i + 1, text, type: 'single', options });
        }
    });
    
    if (questions.length === 0) {
        showToast('Добавьте хотя бы один вопрос с 2+ вариантами', 'error');
        return;
    }
    
    const templateData = {
        title: title,
        description: form.description.value.trim(),
        icon: form.icon.value,
        category: form.category.value,
        reward_text: form.reward_text.value.trim(),
        referral_reward_text: form.referral_reward.value.trim(),
        questions: questions,
        is_global: form.is_global.checked,
        is_active: true,
        created_by_gw_id: window.currentGwId || window.currentDisplayId || OWNER_GW_ID,
        uses_count: 0
    };
    
    try {
        const { data, error } = await SupabaseClient.client
            .from('survey_templates')
            .insert(templateData)
            .select()
            .single();
        
        if (error) throw error;
        
        surveyTemplatesData.unshift(data);
        closeCreateTemplateModal();
        renderTemplatesList();
        showToast('Шаблон создан! 🎉', 'success');
        
    } catch (e) {
        console.error('Error saving template:', e);
        showToast('Ошибка сохранения шаблона', 'error');
    }
}

// Добавить вопрос
function addSurveyQuestion(text = '', options = ['', '', '', '']) {
    currentQuestionId++;
    const container = document.getElementById('questions-container');
    
    const questionHtml = `
        <div class="question-block" id="question-${currentQuestionId}" style="background: var(--bg-card); border: 1px solid var(--border); border-radius: 10px; padding: 15px; margin-bottom: 15px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                <span style="font-weight: 600; color: var(--gold);">Вопрос ${currentQuestionId}</span>
                <button type="button" class="btn btn-sm btn-gray" onclick="removeSurveyQuestion(${currentQuestionId})">🗑️</button>
            </div>
            <div class="form-group">
                <input type="text" class="form-input question-text" placeholder="Текст вопроса" value="${text}">
            </div>
            <div class="options-container">
                ${options.map((opt, i) => `
                    <div class="option-input" style="display: flex; gap: 10px; margin-bottom: 8px;">
                        <input type="text" class="form-input option-text" placeholder="Вариант ${i + 1}" value="${opt}" style="flex: 1;">
                        ${i >= 2 ? `<button type="button" class="btn btn-sm btn-gray" onclick="this.parentElement.remove()">✕</button>` : ''}
                    </div>
                `).join('')}
            </div>
            <button type="button" class="btn btn-sm btn-gray" onclick="addSurveyOption(${currentQuestionId})" style="margin-top: 5px;">➕ Добавить вариант</button>
        </div>
    `;
    
    container.insertAdjacentHTML('beforeend', questionHtml);
}

function removeSurveyQuestion(id) {
    const el = document.getElementById(`question-${id}`);
    if (el) el.remove();
}

function addSurveyOption(questionId) {
    const container = document.querySelector(`#question-${questionId} .options-container`);
    if (!container) return;
    
    const count = container.querySelectorAll('.option-input').length + 1;
    
    container.insertAdjacentHTML('beforeend', `
        <div class="option-input" style="display: flex; gap: 10px; margin-bottom: 8px;">
            <input type="text" class="form-input option-text" placeholder="Вариант ${count}" style="flex: 1;">
            <button type="button" class="btn btn-sm btn-gray" onclick="this.parentElement.remove()">✕</button>
        </div>
    `);
}

// Сохранить опрос
async function saveSurvey() {
    const form = document.getElementById('create-survey-form');
    
    // Собрать вопросы
    const questions = [];
    document.querySelectorAll('.question-block').forEach((block, i) => {
        const text = block.querySelector('.question-text')?.value?.trim();
        const options = Array.from(block.querySelectorAll('.option-text'))
            .map(input => input.value.trim())
            .filter(v => v);
        
        if (text && options.length >= 2) {
            questions.push({
                id: i + 1,
                text: text,
                type: 'single',
                options: options
            });
        }
    });
    
    if (questions.length === 0) {
        showToast('Добавьте хотя бы один вопрос с 2+ вариантами', 'error');
        return;
    }
    
    const title = form.title?.value?.trim();
    if (!title) {
        showToast('Введите название опроса', 'error');
        return;
    }
    
    // Получаем данные пользователя
    const wallet = window.currentWallet || window.connectedWallet || '';
    const gwId = window.currentGwId || window.currentDisplayId || window.userGwId || window.displayId || '';
    
    const surveyData = {
        owner_wallet: wallet?.toLowerCase() || '',
        owner_gw_id: gwId,
        title: title,
        description: form.description?.value?.trim() || '',
        icon: form.icon?.value || '📋',
        category: form.category?.value || 'general',
        reward_text: form.reward_text?.value?.trim() || '',
        referral_reward_text: form.referral_reward?.value?.trim() || '',
        referral_goal: parseInt(form.referral_goal?.value) || 3,
        questions: questions,
        is_active: true,
        views_count: 0,
        completions_count: 0,
        shares_count: 0
    };
    
    try {
        const { data, error } = await SupabaseClient.client
            .from('surveys')
            .insert(surveyData)
            .select()
            .single();
        
        if (error) {
            console.error('Survey save error:', error);
            // Если таблицы нет, сохраним локально
            const localId = 'local_' + Date.now();
            surveyData.id = localId;
            surveysData.unshift(surveyData);
            localStorage.setItem('cardgift_surveys', JSON.stringify(surveysData));
            
            closeCreateSurveyModal();
            renderSurveysList();
            
            // Показать ссылку
            const link = `${window.location.origin}/survey.html?s=${localId}`;
            showSurveyCreatedModal(link, surveyData.title);
            return;
        }
        
        surveysData.unshift(data);
        renderSurveysList();
        updateSurveyStats();
        closeCreateSurveyModal();
        
        // Показать ссылку
        const link = `${window.location.origin}/survey.html?s=${data.id}`;
        showSurveyCreatedModal(link, data.title);
        
    } catch (e) {
        console.error('Error saving survey:', e);
        showToast('Ошибка сохранения', 'error');
    }
}

// Загрузка опросов
async function loadSurveys() {
    // Сначала попробуем из localStorage
    const localSurveys = localStorage.getItem('cardgift_surveys');
    if (localSurveys) {
        surveysData = JSON.parse(localSurveys);
    }
    
    try {
        const gwId = window.currentGwId || window.currentDisplayId || window.userGwId || window.displayId || '';
        const wallet = window.currentWallet || window.connectedWallet || '';
        
        if (!gwId && !wallet) {
            renderSurveysList();
            return;
        }
        
        // Формируем условие фильтрации
        let filterCondition = '';
        if (gwId && wallet) {
            filterCondition = `owner_gw_id.eq.${gwId},owner_wallet.eq.${wallet.toLowerCase()}`;
        } else if (gwId) {
            filterCondition = `owner_gw_id.eq.${gwId}`;
        } else if (wallet) {
            filterCondition = `owner_wallet.eq.${wallet.toLowerCase()}`;
        }
        
        const { data, error } = await SupabaseClient.client
            .from('surveys')
            .select('*')
            .or(filterCondition)
            .order('created_at', { ascending: false });
        
        if (data && data.length > 0) {
            surveysData = data;
        }
    } catch (e) {
        console.log('Surveys table not ready:', e.message);
    }
    
    renderSurveysList();
    updateSurveyStats();
}

// Рендер списка опросов
function renderSurveysList() {
    const container = document.getElementById('surveys-list');
    if (!container) return;
    
    if (surveysData.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: var(--text-muted);">
                <div style="font-size: 50px; margin-bottom: 15px;">📋</div>
                <p>У вас пока нет опросов</p>
                <button class="btn btn-yellow" style="margin-top: 15px;" onclick="showCreateSurveyModal()">➕ Создать первый опрос</button>
            </div>
        `;
        const quickstart = document.getElementById('surveys-quickstart');
        if (quickstart) quickstart.style.display = 'block';
        return;
    }
    
    const quickstart = document.getElementById('surveys-quickstart');
    if (quickstart) quickstart.style.display = 'none';
    
    container.innerHTML = surveysData.map(s => `
        <div class="survey-card" style="background: var(--bg-card); border: 1px solid var(--border); border-radius: 12px; padding: 20px; margin-bottom: 15px;">
            <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 15px;">
                <div style="font-size: 32px;">${s.icon || '📋'}</div>
                <div style="flex: 1;">
                    <div style="font-size: 16px; font-weight: 600;">${s.title}</div>
                    <div style="font-size: 12px; color: var(--text-muted);">${s.description || 'Без описания'}</div>
                </div>
                <div>
                    <span class="badge ${s.is_active ? 'badge-green' : 'badge-gray'}" style="padding: 4px 10px; border-radius: 20px; font-size: 11px; background: ${s.is_active ? 'rgba(76,175,80,0.2)' : 'rgba(150,150,150,0.2)'}; color: ${s.is_active ? 'var(--green)' : 'var(--text-muted)'};">
                        ${s.is_active ? '✅ Активен' : '⏸️ Пауза'}
                    </span>
                </div>
            </div>
            <div style="display: flex; gap: 20px; padding: 10px 0; border-top: 1px solid var(--border);">
                <div style="text-align: center;"><div style="font-size: 18px; font-weight: 700; color: var(--gold);">${s.completions_count || 0}</div><div style="font-size: 10px; color: var(--text-muted);">Ответов</div></div>
                <div style="text-align: center;"><div style="font-size: 18px; font-weight: 700; color: var(--gold);">${s.shares_count || 0}</div><div style="font-size: 10px; color: var(--text-muted);">Поделились</div></div>
                <div style="text-align: center;"><div style="font-size: 18px; font-weight: 700; color: var(--gold);">${s.views_count ? Math.round((s.completions_count / s.views_count) * 100) : 0}%</div><div style="font-size: 10px; color: var(--text-muted);">Конверсия</div></div>
            </div>
            <div style="display: flex; gap: 8px; margin-top: 15px; flex-wrap: wrap;">
                <button class="btn btn-sm btn-yellow" onclick="copySurveyLink('${s.id}')">📋 Копировать ссылку</button>
                <button class="btn btn-sm btn-gray" onclick="previewSurvey('${s.id}')">👁️ Просмотр</button>
                <button class="btn btn-sm btn-gray" onclick="toggleSurvey('${s.id}', ${!s.is_active})">${s.is_active ? '⏸️ Пауза' : '▶️ Активировать'}</button>
                <button class="btn btn-sm btn-red" onclick="deleteSurvey('${s.id}')">🗑️</button>
            </div>
        </div>
    `).join('');
}

// Обновление статистики
function updateSurveyStats() {
    const total = surveysData.length;
    const responses = surveysData.reduce((sum, s) => sum + (s.completions_count || 0), 0);
    const views = surveysData.reduce((sum, s) => sum + (s.views_count || 0), 0);
    const conversion = views > 0 ? Math.round((responses / views) * 100) : 0;
    
    const el1 = document.getElementById('surveys-total');
    const el2 = document.getElementById('surveys-responses');
    const el3 = document.getElementById('surveys-conversion');
    
    if (el1) el1.textContent = total;
    if (el2) el2.textContent = responses;
    if (el3) el3.textContent = conversion + '%';
}

// Копировать ссылку
function copySurveyLink(surveyId) {
    const link = `${window.location.origin}/survey.html?s=${surveyId}`;
    navigator.clipboard.writeText(link).then(() => {
        showToast('Ссылка скопирована! 📋', 'success');
    });
}

// Просмотр опроса
function previewSurvey(surveyId) {
    const link = `${window.location.origin}/survey.html?s=${surveyId}`;
    window.open(link, '_blank');
}

// Переключить активность
async function toggleSurvey(surveyId, isActive) {
    const survey = surveysData.find(s => s.id === surveyId);
    if (survey) {
        survey.is_active = isActive;
        
        // Сохранить в localStorage
        localStorage.setItem('cardgift_surveys', JSON.stringify(surveysData));
        
        // Попробовать обновить в БД
        try {
            await SupabaseClient.client
                .from('surveys')
                .update({ is_active: isActive })
                .eq('id', surveyId);
        } catch (e) {
            console.log('DB update skipped');
        }
        
        renderSurveysList();
        showToast(isActive ? 'Опрос активирован' : 'Опрос приостановлен', 'info');
    }
}

// Удалить опрос
async function deleteSurvey(surveyId) {
    if (!confirm('Удалить опрос? Это действие нельзя отменить.')) return;
    
    surveysData = surveysData.filter(s => s.id !== surveyId);
    localStorage.setItem('cardgift_surveys', JSON.stringify(surveysData));
    
    try {
        await SupabaseClient.client.from('surveys').delete().eq('id', surveyId);
    } catch (e) {
        console.log('DB delete skipped');
    }
    
    renderSurveysList();
    updateSurveyStats();
    showToast('Опрос удалён', 'info');
}

// Инициализация при показе секции
function initSurveysSection() {
    console.log('📋 Initializing Surveys section');
    loadSurveys();
}

// Автоматическая инициализация при переходе на секцию
document.addEventListener('DOMContentLoaded', () => {
    // Закрыть все модалки при загрузке
    const modals = document.querySelectorAll('#templates-modal, #create-survey-modal');
    modals.forEach(m => {
        if (m) m.style.cssText = 'display: none !important;';
    });
    
    // Проверяем если сразу на странице surveys
    if (window.location.hash === '#surveys') {
        setTimeout(initSurveysSection, 500);
    }
});

// Слушаем изменение хеша
window.addEventListener('hashchange', () => {
    if (window.location.hash === '#surveys') {
        initSurveysSection();
    }
});

// ═══════════════════════════════════════════════════════════
// ЭКСПОРТ ФУНКЦИЙ
// ═══════════════════════════════════════════════════════════
window.showCreateSurveyModal = showCreateSurveyModal;
window.closeCreateSurveyModal = closeCreateSurveyModal;
window.showTemplatesModal = showTemplatesModal;
window.closeTemplatesModal = closeTemplatesModal;
window.useSurveyTemplate = useSurveyTemplate;
window.addSurveyQuestion = addSurveyQuestion;
window.removeSurveyQuestion = removeSurveyQuestion;
window.addSurveyOption = addSurveyOption;
window.saveSurvey = saveSurvey;
window.loadSurveys = loadSurveys;
window.copySurveyLink = copySurveyLink;
window.previewSurvey = previewSurvey;
window.toggleSurvey = toggleSurvey;
window.deleteSurvey = deleteSurvey;
window.initSurveysSection = initSurveysSection;
window.showSurveyCreatedModal = showSurveyCreatedModal;
window.closeSurveyCreatedModal = closeSurveyCreatedModal;
window.shareSurveyTo = shareSurveyTo;
window.copySurveyLinkFromModal = copySurveyLinkFromModal;

// Новые функции для шаблонов v2.0
window.renderTemplatesList = renderTemplatesList;
window.loadSurveyTemplates = loadSurveyTemplates;
window.showCreateTemplateModal = showCreateTemplateModal;
window.closeCreateTemplateModal = closeCreateTemplateModal;
window.addTemplateQuestion = addTemplateQuestion;
window.addTemplateOption = addTemplateOption;
window.saveTemplate = saveTemplate;

// ═══════════════════════════════════════════════════════════
// МОДАЛКА "ОПРОС СОЗДАН" С КНОПКАМИ ШАРИНГА
// ═══════════════════════════════════════════════════════════

let currentSurveyLink = '';

function showSurveyCreatedModal(link, title) {
    currentSurveyLink = link;
    
    // Создаём модалку если её нет
    let modal = document.getElementById('survey-created-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'survey-created-modal';
        modal.className = 'modal-overlay';
        modal.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.85); backdrop-filter: blur(5px); display: flex; align-items: center; justify-content: center; z-index: 10000;';
        modal.innerHTML = `
            <div style="background: linear-gradient(145deg, #1a1a2e, #16213e); border-radius: 20px; border: 2px solid var(--gold); max-width: 500px; width: 90%; padding: 30px; text-align: center; box-shadow: 0 25px 50px rgba(0,0,0,0.5);">
                <div style="font-size: 60px; margin-bottom: 15px;">🎉</div>
                <h2 style="color: var(--green); margin-bottom: 10px;">Опрос создан!</h2>
                <p id="survey-created-title" style="font-size: 18px; font-weight: 600; margin-bottom: 20px; color: var(--text);"></p>
                
                <div style="background: var(--bg-dark); border: 1px solid var(--border); border-radius: 10px; padding: 12px; display: flex; align-items: center; gap: 10px; margin-bottom: 20px;">
                    <input type="text" id="survey-link-input" readonly style="flex: 1; background: none; border: none; color: var(--text); font-size: 12px; outline: none;">
                    <button onclick="copySurveyLinkFromModal()" style="background: var(--gold); color: #000; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 12px; white-space: nowrap;">📋 Копировать</button>
                </div>
                
                <p style="color: var(--text-muted); margin-bottom: 15px; font-size: 14px;">Поделитесь опросом:</p>
                
                <div style="display: flex; gap: 15px; justify-content: center; margin-bottom: 25px;">
                    <button onclick="shareSurveyTo('telegram')" style="width: 60px; height: 60px; border-radius: 15px; border: none; cursor: pointer; font-size: 28px; background: #0088cc; display: flex; align-items: center; justify-content: center; transition: transform 0.2s;" title="Telegram" onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'">
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="white"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69.01-.03.01-.14-.07-.2-.08-.06-.19-.04-.27-.02-.12.03-1.99 1.27-5.62 3.72-.53.36-1.01.54-1.44.53-.47-.01-1.38-.26-2.06-.48-.83-.27-1.49-.42-1.43-.88.03-.24.37-.49 1.02-.74 3.99-1.74 6.65-2.89 7.99-3.45 3.81-1.58 4.6-1.86 5.12-1.87.11 0 .37.03.53.17.14.12.18.28.2.45-.01.06.01.24 0 .38z"/></svg>
                    </button>
                    <button onclick="shareSurveyTo('whatsapp')" style="width: 60px; height: 60px; border-radius: 15px; border: none; cursor: pointer; font-size: 28px; background: #25D366; display: flex; align-items: center; justify-content: center; transition: transform 0.2s;" title="WhatsApp" onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'">
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                    </button>
                    <button onclick="shareSurveyTo('viber')" style="width: 60px; height: 60px; border-radius: 15px; border: none; cursor: pointer; font-size: 28px; background: #665CAC; display: flex; align-items: center; justify-content: center; transition: transform 0.2s;" title="Viber" onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'">
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="white"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5.5 14.5c-.3.8-1.5 1.5-2.1 1.6-.5 0-1-.2-3.4-.7-2.9-1.1-4.7-4-4.8-4.2-.1-.1-1.2-1.6-1.2-3 0-1.4.7-2.1 1-2.5.3-.3.6-.4.8-.4h.6c.2 0 .4 0 .6.5.2.6.8 2 .8 2.1.1.1.1.3 0 .5-.1.2-.2.3-.3.5l-.4.5c-.2.1-.3.3-.1.6.2.3.8 1.2 1.6 2 1.1 1 2 1.3 2.3 1.5.3.1.5.1.6-.1.2-.2.7-.8.9-1.1.2-.3.4-.2.6-.1l2 1c.3.1.5.2.5.4.1.1.1.7-.2 1.5z"/></svg>
                    </button>
                    <button onclick="shareSurveyTo('email')" style="width: 60px; height: 60px; border-radius: 15px; border: none; cursor: pointer; font-size: 28px; background: var(--bg-lighter); border: 1px solid var(--border); display: flex; align-items: center; justify-content: center; transition: transform 0.2s;" title="Email" onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'">
                        📧
                    </button>
                </div>
                
                <button onclick="closeSurveyCreatedModal()" style="width: 100%; padding: 14px; background: var(--bg-lighter); border: 1px solid var(--border); border-radius: 10px; color: var(--text); cursor: pointer; font-size: 14px;">Закрыть</button>
            </div>
        `;
        document.body.appendChild(modal);
    }
    
    // Обновляем данные
    document.getElementById('survey-created-title').textContent = title;
    document.getElementById('survey-link-input').value = link;
    
    modal.style.display = 'flex';
    
    // Копируем ссылку в буфер автоматически
    navigator.clipboard.writeText(link).then(() => {
        showToast('Ссылка скопирована в буфер! 📋', 'success');
    }).catch(() => {
        console.log('Could not copy link automatically');
    });
}

function closeSurveyCreatedModal() {
    const modal = document.getElementById('survey-created-modal');
    if (modal) modal.style.display = 'none';
}

function copySurveyLinkFromModal() {
    navigator.clipboard.writeText(currentSurveyLink).then(() => {
        showToast('Ссылка скопирована! 📋', 'success');
    });
}

function shareSurveyTo(platform) {
    const link = currentSurveyLink;
    const text = '🎁 Пройди опрос и получи подарок!';
    
    switch (platform) {
        case 'telegram':
            window.open(`https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(text)}`, '_blank');
            break;
        case 'whatsapp':
            window.open(`https://wa.me/?text=${encodeURIComponent(text + '\n' + link)}`, '_blank');
            break;
        case 'viber':
            window.open(`viber://forward?text=${encodeURIComponent(text + ' ' + link)}`, '_blank');
            break;
        case 'email':
            window.open(`mailto:?subject=${encodeURIComponent('Пройди опрос!')}&body=${encodeURIComponent(text + '\n\n' + link)}`, '_blank');
            break;
    }
}

console.log('📋 Surveys Module loaded');

console.log('✅ Surveys module loaded');

// =============================================
// SURVEYS MODULE - Вирусные опросы
// =============================================

let surveysData = [];
let currentQuestionId = 0;

// Шаблоны опросов (локальные, пока нет таблицы)
const SURVEY_TEMPLATES = {
    work: {
        title: 'Работа в интернете',
        description: 'Узнайте свой потенциал для онлайн-заработка',
        icon: '💼',
        reward_text: 'Бесплатный мини-курс',
        referral_reward: 'Бонус за каждого друга',
        questions: [
            { text: 'Сколько времени вы готовы уделять дополнительному заработку?', options: ['1-2 часа в день', '3-4 часа в день', 'Полный рабочий день', 'Пока не определился'] },
            { text: 'Какой опыт работы в интернете у вас есть?', options: ['Никакого', 'Пробовал фриланс', 'Есть небольшой опыт', 'Работаю онлайн давно'] },
            { text: 'Что для вас важнее в работе?', options: ['Стабильный доход', 'Свободный график', 'Возможность роста', 'Работа из дома'] },
            { text: 'Какой уровень дохода вас интересует?', options: ['$300-500/мес', '$500-1000/мес', '$1000-3000/мес', 'Больше $3000/мес'] },
            { text: 'Готовы ли вы обучаться новому?', options: ['Да, готов вкладывать время', 'Да, если это несложно', 'Только если быстро окупится', 'Хочу готовое решение'] }
        ]
    },
    feedback: {
        title: 'Оценка продукта',
        description: 'Ваше мнение очень важно для нас',
        icon: '⭐',
        reward_text: 'Скидка 10% на следующую покупку',
        referral_reward: 'Дополнительная скидка за друга',
        questions: [
            { text: 'Как вы узнали о нашем продукте?', options: ['Реклама', 'Рекомендация друга', 'Социальные сети', 'Поиск в интернете'] },
            { text: 'Насколько вы довольны качеством?', options: ['Очень доволен', 'Доволен', 'Нейтрально', 'Не доволен'] },
            { text: 'Порекомендуете ли вы нас друзьям?', options: ['Обязательно', 'Скорее да', 'Возможно', 'Скорее нет'] },
            { text: 'Что бы вы улучшили?', options: ['Цену', 'Качество', 'Сервис', 'Всё отлично'] }
        ]
    },
    hello: {
        title: 'Давайте познакомимся!',
        description: 'Расскажите немного о себе',
        icon: '👋',
        reward_text: 'Полезные материалы',
        referral_reward: 'Эксклюзивный контент за друзей',
        questions: [
            { text: 'Как у вас дела?', options: ['Отлично!', 'Хорошо', 'Нормально', 'Бывало лучше'] },
            { text: 'Чем вы занимаетесь?', options: ['Работаю по найму', 'Свой бизнес', 'Фриланс', 'Учусь', 'В поиске'] },
            { text: 'Что вас интересует больше всего?', options: ['Заработок', 'Саморазвитие', 'Отношения', 'Здоровье', 'Путешествия'] }
        ]
    },
    finance: {
        title: 'Тест: Финансовая грамотность',
        description: 'Проверьте свои знания и получите рекомендации',
        icon: '💰',
        reward_text: 'Персональные рекомендации',
        referral_reward: 'Бонусный урок за друга',
        questions: [
            { text: 'Ведёте ли вы учёт доходов и расходов?', options: ['Да, регулярно', 'Иногда', 'Нет'] },
            { text: 'Есть ли у вас финансовая подушка?', options: ['Да, на 6+ месяцев', 'Да, на 1-3 месяца', 'Нет'] },
            { text: 'Инвестируете ли вы?', options: ['Да, активно', 'Немного', 'Нет, но хочу', 'Нет, не интересует'] },
            { text: 'Какая ваша главная финансовая цель?', options: ['Накопить на покупку', 'Создать пассивный доход', 'Выйти из долгов', 'Обеспечить будущее'] }
        ]
    }
};

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

function showTemplatesModal() {
    document.getElementById('templates-modal').style.cssText = 'display: flex !important;';
}

function closeTemplatesModal() {
    document.getElementById('templates-modal').style.cssText = 'display: none !important;';
}

// =============================================
// ОСТАЛЬНОЙ КОД
// =============================================

// Использовать шаблон
function useSurveyTemplate(templateId) {
    const template = SURVEY_TEMPLATES[templateId];
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
    form.referral_reward.value = template.referral_reward || '';
    
    // Выбрать иконку
    const iconSelect = form.icon;
    for (let i = 0; i < iconSelect.options.length; i++) {
        if (iconSelect.options[i].value === template.icon) {
            iconSelect.selectedIndex = i;
            break;
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
    
    console.log('✨ Survey template loaded:', templateId);
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
    
    const surveyData = {
        owner_wallet: currentWallet?.toLowerCase() || '',
        owner_gw_id: window.userGwId || window.displayId || '',
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
            const link = `${window.location.origin}/survey?s=${localId}`;
            showToast('Опрос создан! Ссылка скопирована', 'success');
            navigator.clipboard.writeText(link);
            return;
        }
        
        surveysData.unshift(data);
        renderSurveysList();
        updateSurveyStats();
        closeCreateSurveyModal();
        
        // Показать ссылку
        const link = `${window.location.origin}/survey?s=${data.id}`;
        navigator.clipboard.writeText(link);
        showToast('Опрос создан! Ссылка скопирована 📋', 'success');
        
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
        const gwId = window.userGwId || window.displayId || '';
        if (!gwId) {
            renderSurveysList();
            return;
        }
        
        const { data, error } = await SupabaseClient.client
            .from('surveys')
            .select('*')
            .or(`owner_gw_id.eq.${gwId},owner_wallet.eq.${currentWallet?.toLowerCase()}`)
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
    const link = `${window.location.origin}/survey?s=${surveyId}`;
    navigator.clipboard.writeText(link).then(() => {
        showToast('Ссылка скопирована! 📋', 'success');
    });
}

// Просмотр опроса
function previewSurvey(surveyId) {
    const link = `${window.location.origin}/survey?s=${surveyId}`;
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

console.log('📋 Surveys Module loaded');

console.log('✅ Surveys module loaded');

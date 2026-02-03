// api/verify-task.js
// Верификация заданий на основе реальных данных в базе

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://imgpysvdosdsqucoghqa.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// ═══════════════════════════════════════════════════════════════════════════
// КОНФИГУРАЦИЯ БАЛЛОВ
// ═══════════════════════════════════════════════════════════════════════════

const POINTS_CONFIG = {
    // Баллы за контакты в сутки (прогрессивная шкала)
    contactsPerDay: {
        5: 100,  // 5+ контактов = 100 баллов
        4: 70,
        3: 45,
        2: 25,
        1: 10,
        0: 0
    },
    
    // Бонус за глубину реферала
    depthBonus: {
        1: 10,   // Прямой контакт
        2: 5,    // 2й уровень
        3: 3,    // 3й уровень
        4: 1     // 4+ уровень
    },
    
    // Баллы за задания
    tasks: {
        createCard: 10,
        createBlog: 25,
        createSurvey: 25,
        firstContact: 50,
        firstPartner: 500,
        fiveContactsDay: 100
    }
};

// ═══════════════════════════════════════════════════════════════════════════
// ФУНКЦИИ ВЕРИФИКАЦИИ
// ═══════════════════════════════════════════════════════════════════════════

// Проверить количество созданных карт
async function verifyCardsCreated(userId) {
    const { data, error } = await supabase
        .from('cards')
        .select('id, created_at')
        .eq('owner_gw_id', userId);
    
    if (error) {
        console.error('Error checking cards:', error);
        return { verified: false, count: 0 };
    }
    
    return { 
        verified: data && data.length > 0, 
        count: data?.length || 0,
        data: data
    };
}

// Проверить наличие блога
async function verifyBlogCreated(userId) {
    const { data, error } = await supabase
        .from('blogs')
        .select('id, created_at')
        .eq('user_gw_id', userId)
        .limit(1);
    
    if (error) {
        console.error('Error checking blog:', error);
        return { verified: false };
    }
    
    return { 
        verified: data && data.length > 0,
        data: data?.[0]
    };
}

// Проверить количество контактов (всего и за сегодня)
async function verifyContacts(userId) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayISO = today.toISOString();
    
    // Все контакты пользователя
    const { data: allContacts, error: allError } = await supabase
        .from('contacts')
        .select('id, created_at, name, viral_temp_id')
        .eq('owner_gw_id', userId);
    
    if (allError) {
        console.error('Error checking contacts:', allError);
        return { verified: false, total: 0, today: 0 };
    }
    
    // Контакты за сегодня
    const todayContacts = allContacts?.filter(c => 
        new Date(c.created_at) >= today
    ) || [];
    
    const total = allContacts?.length || 0;
    const todayCount = todayContacts.length;
    
    // Рассчитываем баллы за контакты
    let pointsToday = 0;
    if (todayCount >= 5) pointsToday = POINTS_CONFIG.contactsPerDay[5];
    else if (todayCount >= 4) pointsToday = POINTS_CONFIG.contactsPerDay[4];
    else if (todayCount >= 3) pointsToday = POINTS_CONFIG.contactsPerDay[3];
    else if (todayCount >= 2) pointsToday = POINTS_CONFIG.contactsPerDay[2];
    else if (todayCount >= 1) pointsToday = POINTS_CONFIG.contactsPerDay[1];
    
    return {
        verified: total > 0,
        total: total,
        today: todayCount,
        pointsEarned: pointsToday,
        contacts: allContacts
    };
}

// Проверить партнёров (активированных рефералов)
async function verifyPartners(userId) {
    // Сначала ищем в таблице users тех, кто пришёл от этого userId
    const { data: referrals, error } = await supabase
        .from('users')
        .select('temp_id, gw_id, level, created_at')
        .eq('referrer_gw_id', userId);
    
    if (error) {
        console.error('Error checking partners:', error);
        return { verified: false, total: 0, active: 0 };
    }
    
    // Активный партнёр = уровень 4+
    const activePartners = referrals?.filter(r => r.level >= 4) || [];
    
    return {
        verified: activePartners.length > 0,
        total: referrals?.length || 0,
        active: activePartners.length,
        partners: referrals
    };
}

// Проверить опросы
async function verifySurveys(userId) {
    const { data, error } = await supabase
        .from('surveys')
        .select('id, created_at')
        .eq('owner_gw_id', userId);
    
    if (error) {
        console.error('Error checking surveys:', error);
        return { verified: false, count: 0 };
    }
    
    return {
        verified: data && data.length > 0,
        count: data?.length || 0
    };
}

// Проверить глубину контактов
async function verifyContactsDepth(userId) {
    // Получаем всех людей в структуре
    const { data: structure, error } = await supabase
        .from('users')
        .select('temp_id, gw_id, referrer_gw_id, referrer_temp_id, level')
        .or(`referrer_gw_id.eq.${userId}`);
    
    if (error) {
        console.error('Error checking depth:', error);
        return { levels: {} };
    }
    
    // Подсчитываем по уровням (упрощённо - только 1й уровень напрямую)
    const level1 = structure?.filter(s => s.referrer_gw_id === userId) || [];
    
    // Для 2+ уровней нужен рекурсивный обход
    // Пока считаем только прямых
    
    return {
        level1: level1.length,
        totalInStructure: structure?.length || 0
    };
}

// ═══════════════════════════════════════════════════════════════════════════
// МАППИНГ ЗАДАНИЙ К ВЕРИФИКАЦИИ
// ═══════════════════════════════════════════════════════════════════════════

const TASK_VERIFICATION = {
    // День 1
    'd1_t1': { type: 'manual', description: 'Изучи личный кабинет' },
    'd1_t2': { type: 'manual', description: 'Посмотри открытку' },
    'd1_t3': { type: 'manual', description: 'Напиши список 20 человек' },
    'd1_t4': { type: 'contacts', min: 1, description: 'Отправь открытку - жди контакты' },
    
    // День 2
    'd2_t1': { type: 'manual', description: 'Подготовь фото' },
    'd2_t2': { type: 'manual', description: 'Напиши о себе' },
    'd2_t3': { type: 'blog', description: 'Создай блог' },
    'd2_t4': { type: 'manual', description: 'Напиши первый пост' },
    'd2_t5': { type: 'contacts', min: 1, description: 'Ещё контакты' },
    
    // День 3
    'd3_t1': { type: 'manual', description: 'Изучи генератор' },
    'd3_t2': { type: 'cards', min: 1, description: 'Создай свою открытку' },
    'd3_t3': { type: 'manual', description: 'Протестируй открытку' },
    'd3_t4': { type: 'contacts', min: 1, description: 'Собери контакты' },
    
    // День 4
    'd4_t1': { type: 'manual', description: 'Изучи CRM' },
    'd4_t2': { type: 'contacts', min: 5, description: 'Организуй 5+ контактов' },
    'd4_t3': { type: 'manual', description: 'Посмотри аналитику' },
    'd4_t4': { type: 'contacts', min: 1, description: 'Ещё контакты' },
    
    // День 5
    'd5_t1': { type: 'manual', description: 'Изучи опросы' },
    'd5_t2': { type: 'surveys', min: 1, description: 'Создай опрос' },
    'd5_t3': { type: 'manual', description: 'Получи ссылку' },
    'd5_t4': { type: 'contacts', min: 1, description: 'Собери лидов через опрос' },
    
    // Задания на контакты (ежедневные)
    'daily_contacts_5': { type: 'contacts_today', min: 5, points: 100 },
    'daily_contacts_3': { type: 'contacts_today', min: 3, points: 45 },
    
    // Задания на партнёров
    'first_partner': { type: 'partners', min: 1, points: 500 }
};

// ═══════════════════════════════════════════════════════════════════════════
// ГЛАВНЫЙ ОБРАБОТЧИК
// ═══════════════════════════════════════════════════════════════════════════

export default async function handler(req, res) {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    // GET = диагностика: /api/verify-task?userId=7346221
    if (req.method === 'GET') {
        const userId = req.query.userId || 'unknown';
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        
        let output = `=== VERIFY-TASK DIAGNOSTICS ===\nuserId: ${userId}\n\n`;
        
        try {
            // Ищем таблицы
            const allTables = [
                'contacts', 'contact', 'user_contacts', 'cardgift_contacts',
                'sent_cards', 'card_views', 'card_recipients',
                'blogs', 'blog', 'user_blogs', 'blog_posts', 'posts',
                'cards', 'card', 'cardgift_cards', 'greeting_cards', 'user_cards',
                'users'
            ];
            
            for (const tbl of allTables) {
                try {
                    const { data, error } = await supabase.from(tbl).select('*').limit(1);
                    if (!error) {
                        const cols = data?.[0] ? Object.keys(data[0]).join(', ') : '(empty table)';
                        output += `✅ ${tbl}: ${cols}\n`;
                    }
                } catch(e) {}
            }
            
            output += `\n=== SEARCHING CONTACTS FOR userId=${userId} ===\n`;
            
            // Ищем контакты по всем возможным полям
            try {
                const { data: allContacts } = await supabase.from('contacts').select('*').limit(3);
                if (allContacts?.length > 0) {
                    const cols = Object.keys(allContacts[0]);
                    output += `contacts columns: ${cols.join(', ')}\n`;
                    output += `contacts sample: ${JSON.stringify(allContacts[0])}\n\n`;
                    
                    // Ищем по каждому полю
                    for (const col of cols) {
                        try {
                            const { data } = await supabase.from('contacts').select('*').eq(col, userId).limit(1);
                            if (data?.length > 0) {
                                output += `FOUND by ${col}=${userId}: ${data.length} rows\n`;
                            }
                        } catch(e) {}
                        // Также пробуем с GW префиксом
                        try {
                            const { data } = await supabase.from('contacts').select('*').eq(col, 'GW' + userId).limit(1);
                            if (data?.length > 0) {
                                output += `FOUND by ${col}=GW${userId}: ${data.length} rows\n`;
                            }
                        } catch(e) {}
                    }
                } else {
                    output += `contacts: table empty or not accessible\n`;
                }
            } catch(e) {
                output += `contacts error: ${e.message}\n`;
            }
            
            output += `\n=== CARDS TABLE ===\n`;
            try {
                const { data } = await supabase.from('cards').select('*').limit(1);
                if (data?.length > 0) {
                    output += `cards columns: ${Object.keys(data[0]).join(', ')}\n`;
                    output += `cards sample: ${JSON.stringify(data[0]).substring(0, 500)}\n`;
                }
            } catch(e) { output += `cards: ${e.message}\n`; }
            
            output += `\n=== TOTAL ROWS ===\n`;
            try {
                const { count: cCount } = await supabase.from('contacts').select('*', { count: 'exact', head: true });
                output += `contacts total: ${cCount}\n`;
            } catch(e) {}
            try {
                const { count: cardsCount } = await supabase.from('cards').select('*', { count: 'exact', head: true });
                output += `cards total: ${cardsCount}\n`;
            } catch(e) {}
            
            return res.status(200).send(output);
        } catch (e) {
            return res.status(200).send(output + `\nERROR: ${e.message}`);
        }
    }
    
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    
    try {
        const { taskId, userId, action } = req.body;
        
        if (!userId) {
            return res.status(400).json({ error: 'userId required' });
        }
        
        // Если запрос на полную статистику
        if (action === 'getStats') {
            const [cards, blog, contacts, partners, surveys] = await Promise.all([
                verifyCardsCreated(userId),
                verifyBlogCreated(userId),
                verifyContacts(userId),
                verifyPartners(userId),
                verifySurveys(userId)
            ]);
            
            return res.status(200).json({
                success: true,
                stats: {
                    cards: cards.count,
                    hasCard: cards.verified,
                    hasBlog: blog.verified,
                    contacts: {
                        total: contacts.total,
                        today: contacts.today,
                        pointsToday: contacts.pointsEarned
                    },
                    partners: {
                        total: partners.total,
                        active: partners.active
                    },
                    surveys: surveys.count
                }
            });
        }
        
        // Верификация конкретного задания
        if (!taskId) {
            return res.status(400).json({ error: 'taskId required' });
        }
        
        const taskConfig = TASK_VERIFICATION[taskId];
        
        if (!taskConfig) {
            // Неизвестное задание - разрешаем (manual)
            return res.status(200).json({
                success: true,
                verified: true,
                message: 'Task allowed (no verification needed)'
            });
        }
        
        let result;
        
        switch (taskConfig.type) {
            case 'manual':
                result = { verified: true, message: 'Manual task - self-reported' };
                break;
                
            case 'cards':
                const cardsCheck = await verifyCardsCreated(userId);
                result = {
                    verified: cardsCheck.count >= (taskConfig.min || 1),
                    current: cardsCheck.count,
                    required: taskConfig.min || 1,
                    message: cardsCheck.verified 
                        ? `✅ У тебя ${cardsCheck.count} открыток` 
                        : '❌ Сначала создай открытку в Генераторе'
                };
                break;
                
            case 'blog':
                const blogCheck = await verifyBlogCreated(userId);
                result = {
                    verified: blogCheck.verified,
                    message: blogCheck.verified 
                        ? '✅ Блог создан!' 
                        : '❌ Сначала создай блог в разделе Блог'
                };
                break;
                
            case 'contacts':
            case 'contacts_today':
                const contactsCheck = await verifyContacts(userId);
                const checkToday = taskConfig.type === 'contacts_today';
                const count = checkToday ? contactsCheck.today : contactsCheck.total;
                const minRequired = taskConfig.min || 1;
                
                result = {
                    verified: count >= minRequired,
                    current: count,
                    required: minRequired,
                    pointsEarned: contactsCheck.pointsEarned,
                    message: count >= minRequired
                        ? `✅ Отлично! ${count} контактов${checkToday ? ' сегодня' : ''}!`
                        : `❌ Нужно ${minRequired} контактов, сейчас ${count}. Отправь открытки и жди!`
                };
                break;
                
            case 'partners':
                const partnersCheck = await verifyPartners(userId);
                const minPartners = taskConfig.min || 1;
                result = {
                    verified: partnersCheck.active >= minPartners,
                    current: partnersCheck.active,
                    required: minPartners,
                    points: taskConfig.points || POINTS_CONFIG.tasks.firstPartner,
                    message: partnersCheck.active >= minPartners
                        ? `🎉 Поздравляем! ${partnersCheck.active} активных партнёров!`
                        : `👥 Пока ${partnersCheck.active} партнёров (уровень 4+). Помоги контактам активироваться!`
                };
                break;
                
            case 'surveys':
                const surveysCheck = await verifySurveys(userId);
                result = {
                    verified: surveysCheck.count >= (taskConfig.min || 1),
                    current: surveysCheck.count,
                    message: surveysCheck.verified
                        ? `✅ У тебя ${surveysCheck.count} опросов`
                        : '❌ Сначала создай опрос в разделе Опросы'
                };
                break;
                
            default:
                result = { verified: true, message: 'Unknown task type - allowed' };
        }
        
        return res.status(200).json({
            success: true,
            taskId,
            ...result
        });
        
    } catch (error) {
        console.error('Verify task error:', error);
        return res.status(500).json({ error: error.message });
    }
}

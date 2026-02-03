// api/verify-task.js v2.0
// Верификация заданий на основе реальных данных в базе
// РЕАЛЬНАЯ СТРУКТУРА БД:
//   contacts.owner_gw_id = "GW7346221" (с GW префиксом)
//   blog_posts.user_gw_id (таблица blog_posts, НЕ blogs)
//   cards.owner_gw_id
//   users.referrer_gw_id, users.gw_level

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://imgpysvdosdsqucoghqa.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const POINTS_CONFIG = {
    contactsPerDay: { 5: 100, 4: 70, 3: 45, 2: 25, 1: 10, 0: 0 },
    depthBonus: { 1: 10, 2: 5, 3: 3, 4: 1 },
    tasks: { createCard: 10, createBlog: 25, createSurvey: 25, firstContact: 50, firstPartner: 500, fiveContactsDay: 100 }
};

// ═══════════════════════════════════════════════════
// УТИЛИТА: GW prefix
// ═══════════════════════════════════════════════════

function withGW(id) {
    if (!id) return id;
    return id.startsWith('GW') ? id : 'GW' + id;
}
function withoutGW(id) {
    if (!id) return id;
    return id.replace(/^GW/, '');
}

// ═══════════════════════════════════════════════════
// ФУНКЦИИ ВЕРИФИКАЦИИ
// ═══════════════════════════════════════════════════

async function verifyCardsCreated(userId) {
    const gwId = withGW(userId);
    const plainId = withoutGW(userId);
    
    let { data, error } = await supabase.from('cards').select('id, card_type, created_at').eq('owner_gw_id', gwId);
    if ((!data || data.length === 0) && !error) {
        const r = await supabase.from('cards').select('id, card_type, created_at').eq('owner_gw_id', plainId);
        if (r.data?.length > 0) data = r.data;
    }
    if (error) { console.error('Error checking cards:', error); return { verified: false, count: 0 }; }
    return { verified: data && data.length > 0, count: data?.length || 0 };
}

async function verifyBlogCreated(userId) {
    const gwId = withGW(userId);
    const plainId = withoutGW(userId);
    
    let { data, error } = await supabase.from('blog_posts').select('id, title, created_at').eq('user_gw_id', gwId).limit(5);
    if ((!data || data.length === 0) && !error) {
        const r = await supabase.from('blog_posts').select('id, title, created_at').eq('user_gw_id', plainId).limit(5);
        if (r.data?.length > 0) data = r.data;
    }
    if (error) { console.error('Error checking blog:', error); return { verified: false, count: 0 }; }
    return { verified: data && data.length > 0, count: data?.length || 0 };
}

async function verifyContacts(userId) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const gwId = withGW(userId);
    
    const { data: allContacts, error } = await supabase.from('contacts').select('id, created_at, name').eq('owner_gw_id', gwId);
    if (error) { console.error('Error checking contacts:', error); return { verified: false, total: 0, today: 0 }; }
    
    const todayContacts = allContacts?.filter(c => new Date(c.created_at) >= today) || [];
    const total = allContacts?.length || 0;
    const todayCount = todayContacts.length;
    
    let pointsToday = 0;
    if (todayCount >= 5) pointsToday = POINTS_CONFIG.contactsPerDay[5];
    else if (todayCount >= 4) pointsToday = POINTS_CONFIG.contactsPerDay[4];
    else if (todayCount >= 3) pointsToday = POINTS_CONFIG.contactsPerDay[3];
    else if (todayCount >= 2) pointsToday = POINTS_CONFIG.contactsPerDay[2];
    else if (todayCount >= 1) pointsToday = POINTS_CONFIG.contactsPerDay[1];
    
    return { verified: total > 0, total, today: todayCount, pointsEarned: pointsToday };
}

async function verifyPartners(userId) {
    const gwId = withGW(userId);
    const { data: referrals, error } = await supabase.from('users').select('temp_id, gw_id, gw_level, created_at').eq('referrer_gw_id', gwId);
    if (error) { console.error('Error checking partners:', error); return { verified: false, total: 0, active: 0 }; }
    const activePartners = referrals?.filter(r => (r.gw_level || 0) >= 4) || [];
    return { verified: activePartners.length > 0, total: referrals?.length || 0, active: activePartners.length };
}

async function verifySurveys(userId) {
    const gwId = withGW(userId);
    const plainId = withoutGW(userId);
    let { data, error } = await supabase.from('surveys').select('id, created_at').eq('owner_gw_id', gwId);
    if ((!data || data.length === 0) && !error) {
        const r = await supabase.from('surveys').select('id, created_at').eq('owner_gw_id', plainId);
        if (r.data?.length > 0) data = r.data;
    }
    if (error) { console.error('Error checking surveys:', error); return { verified: false, count: 0 }; }
    return { verified: data && data.length > 0, count: data?.length || 0 };
}

// ═══════════════════════════════════════════════════
// МАППИНГ ЗАДАНИЙ
// ═══════════════════════════════════════════════════

const TASK_VERIFICATION = {
    'd1_t1': { type: 'manual' }, 'd1_t2': { type: 'manual' }, 'd1_t3': { type: 'manual' },
    'd1_t4': { type: 'contacts', min: 1 },
    'd2_t1': { type: 'manual' }, 'd2_t2': { type: 'manual' },
    'd2_t3': { type: 'blog', min: 1 },
    'd2_t4': { type: 'blog_post', min: 1 },
    'd2_t5': { type: 'contacts', min: 1 },
    'd3_t1': { type: 'manual' },
    'd3_t2': { type: 'cards', min: 1 },
    'd3_t3': { type: 'manual' },
    'd3_t4': { type: 'contacts', min: 1 },
    'd4_t1': { type: 'manual' },
    'd4_t2': { type: 'contacts', min: 5 },
    'd4_t3': { type: 'manual' },
    'd4_t4': { type: 'contacts', min: 1 },
    'd5_t1': { type: 'manual' },
    'd5_t2': { type: 'surveys', min: 1 },
    'd5_t3': { type: 'manual' },
    'd5_t4': { type: 'contacts', min: 1 },
    'daily_contacts_5': { type: 'contacts_today', min: 5, points: 100 },
    'daily_contacts_3': { type: 'contacts_today', min: 3, points: 45 },
    'daily_contacts_1': { type: 'contacts', min: 1, points: 10 },
    'first_partner': { type: 'partners', min: 1, points: 500 }
};

// ═══════════════════════════════════════════════════
// ОБРАБОТЧИК
// ═══════════════════════════════════════════════════

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') return res.status(200).end();
    
    // GET = диагностика
    if (req.method === 'GET') {
        const userId = req.query.userId || 'unknown';
        try {
            const [cards, blog, contacts, partners] = await Promise.all([
                verifyCardsCreated(userId),
                verifyBlogCreated(userId),
                verifyContacts(userId),
                verifyPartners(userId)
            ]);
            return res.status(200).json({
                status: 'ok', version: '2.0', userId, gwId: withGW(userId),
                contacts: { total: contacts.total, today: contacts.today, verified: contacts.verified },
                blog: { count: blog.count, verified: blog.verified },
                cards: { count: cards.count, verified: cards.verified },
                partners: { total: partners.total, active: partners.active, verified: partners.verified }
            });
        } catch (e) {
            return res.status(200).json({ status: 'error', error: e.message, userId });
        }
    }
    
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    
    try {
        const { taskId, userId, action } = req.body;
        if (!userId) return res.status(400).json({ error: 'userId required' });
        
        if (action === 'getStats') {
            const [cards, blog, contacts, partners, surveys] = await Promise.all([
                verifyCardsCreated(userId), verifyBlogCreated(userId),
                verifyContacts(userId), verifyPartners(userId), verifySurveys(userId)
            ]);
            return res.status(200).json({
                success: true,
                stats: {
                    cards: cards.count, hasCard: cards.verified,
                    hasBlog: blog.verified, blogPosts: blog.count,
                    contacts: { total: contacts.total, today: contacts.today, pointsToday: contacts.pointsEarned },
                    partners: { total: partners.total, active: partners.active },
                    surveys: surveys.count
                }
            });
        }
        
        if (!taskId) return res.status(400).json({ error: 'taskId required' });
        
        const taskConfig = TASK_VERIFICATION[taskId];
        if (!taskConfig) {
            return res.status(200).json({ success: true, verified: true, message: 'Task allowed (no verification needed)' });
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
                    current: cardsCheck.count, required: taskConfig.min || 1,
                    message: cardsCheck.verified ? `✅ У тебя ${cardsCheck.count} открыток` : '❌ Сначала создай открытку в Генераторе'
                };
                break;
            case 'blog':
            case 'blog_post':
                const blogCheck = await verifyBlogCreated(userId);
                const minPosts = taskConfig.min || 1;
                result = {
                    verified: blogCheck.count >= minPosts,
                    current: blogCheck.count, required: minPosts,
                    message: blogCheck.verified ? `✅ У тебя ${blogCheck.count} постов в блоге!` : '❌ Сначала напиши пост в разделе Блог'
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
                    current: count, required: minRequired,
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
                    current: partnersCheck.active, required: minPartners,
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
                    message: surveysCheck.verified ? `✅ У тебя ${surveysCheck.count} опросов` : '❌ Сначала создай опрос в разделе Опросы'
                };
                break;
            default:
                result = { verified: true, message: 'Unknown task type - allowed' };
        }
        
        return res.status(200).json({ success: true, taskId, ...result });
    } catch (error) {
        console.error('Verify task error:', error);
        return res.status(500).json({ error: error.message });
    }
}

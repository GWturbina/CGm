// api/academy-complete-day.js
// ═══════════════════════════════════════════════════════════════════════════
// ОТМЕТКА ВЫПОЛНЕНИЯ ДНЯ И ПЕРЕХОД К СЛЕДУЮЩЕМУ
// ═══════════════════════════════════════════════════════════════════════════
// Вызывается когда пользователь нажимает "Сдать отчёт" или "Завершить день"

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://imgpysvdosdsqucoghqa.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;
const BOT_TOKEN = process.env.CARDGIFT_BOT_TOKEN;
const supabase = createClient(supabaseUrl, supabaseKey);

const PLATFORM_URL = 'https://cgm-brown.vercel.app';

// ═══════════════════════════════════════════════════════════════════════════
// ПОЗДРАВИТЕЛЬНЫЕ СООБЩЕНИЯ
// ═══════════════════════════════════════════════════════════════════════════

const COMPLETION_MESSAGES = {
    1: '🎉 День 1 завершён! Отличный старт!\n\nЗавтра тебя ждёт создание первой настоящей открытки. Готовься!',
    2: '🎨 День 2 выполнен! Твоя первая открытка создана!\n\nЗавтра отправим её реальному человеку!',
    3: '📤 День 3 закрыт! Первая отправка состоялась!\n\nЗавтра включаем вирусный механизм!',
    4: '🔄 День 4 готов! Вирусность настроена!\n\nЗавтра — работа с контактами и CRM.',
    5: '👥 День 5 сделан! CRM под контролем!\n\nЗавтра создаём умные опросы.',
    6: '📊 День 6 завершён! Опросы работают!\n\nЗавтра — итоги первой недели!',
    7: '🏆 НЕДЕЛЯ 1 ЗАВЕРШЕНА!\n\nТы освоил базу CardGift. Следующая неделя — продвинутые инструменты!',
    8: '📝 День 8 выполнен! Блог создан!\n\nЗавтра пишем первый пост.',
    9: '✍️ День 9 готов! Первый пост опубликован!\n\nЗавтра открываем силу AI!',
    10: '🤖 День 10 закрыт! AI Studio освоен!\n\nЗавтра — автоматические рассылки.',
    11: '📨 День 11 сделан! Рассылки настроены!\n\nЗавтра строим полноценную автоворонку.',
    12: '🔄 День 12 завершён! Автоворонка работает!\n\nЗавтра подключаем Telegram.',
    13: '🤖 День 13 выполнен! Telegram подключен!\n\nЗавтра — итоги второй недели!',
    14: '🏆 НЕДЕЛЯ 2 ЗАВЕРШЕНА!\n\nТы освоил продвинутые инструменты. Финальная неделя — команда и масштаб!',
    15: '✨ День 15 готов! Личный бренд создан!\n\nЗавтра — стратегия привлечения партнёров.',
    16: '🌐 День 16 закрыт! Стратегия готова!\n\nЗавтра начинаем приглашать в команду!',
    17: '📤 День 17 сделан! Первые приглашения отправлены!\n\nЗавтра учимся работать с возражениями.',
    18: '💬 День 18 завершён! Ты вооружён ответами!\n\nЗавтра — система для команды.',
    19: '🎓 День 19 выполнен! Система для команды готова!\n\nЗавтра — ежедневная рутина успеха.',
    20: '📅 День 20 готов! Рутина определена!\n\nЗавтра — ФИНАЛ программы!',
    21: '🎊 ПРОГРАММА ЗАВЕРШЕНА!\n\n21 день позади. Ты прошёл путь от новичка до человека с системой. Теперь действуй!\n\n💪 Ты — молодец!'
};

// ═══════════════════════════════════════════════════════════════════════════
// ОТПРАВКА TELEGRAM УВЕДОМЛЕНИЯ
// ═══════════════════════════════════════════════════════════════════════════

async function sendTelegramNotification(chatId, day) {
    if (!BOT_TOKEN || !chatId) return;
    
    const message = COMPLETION_MESSAGES[day] || `✅ День ${day} завершён!`;
    const isWeekEnd = [7, 14, 21].includes(day);
    const nextDay = day + 1;
    
    let buttonText = `📚 Перейти к Дню ${nextDay}`;
    let buttonUrl = `${PLATFORM_URL}/program.html#day${nextDay}`;
    
    if (day === 21) {
        buttonText = '👑 В личный кабинет';
        buttonUrl = `${PLATFORM_URL}/dashboard.html`;
    } else if (isWeekEnd) {
        buttonText = `🚀 Начать неделю ${Math.ceil(nextDay / 7)}`;
        buttonUrl = `${PLATFORM_URL}/program.html#day${nextDay}`;
    }
    
    const body = {
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML',
        reply_markup: {
            inline_keyboard: [[
                { text: buttonText, url: buttonUrl }
            ]]
        }
    };
    
    try {
        await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
    } catch (e) {
        console.error('Telegram send error:', e);
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// ОСНОВНОЙ ОБРАБОТЧИК
// ═══════════════════════════════════════════════════════════════════════════

export default async function handler(req, res) {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    
    try {
        const { user_gw_id, day, report_text } = req.body;
        
        if (!user_gw_id || !day) {
            return res.status(400).json({ error: 'Missing user_gw_id or day' });
        }
        
        const dayNum = parseInt(day);
        if (dayNum < 1 || dayNum > 21) {
            return res.status(400).json({ error: 'Invalid day number' });
        }
        
        console.log(`✅ Completing day ${dayNum} for user ${user_gw_id}`);
        
        // 1. Получить текущий прогресс
        const { data: currentProgress } = await supabase
            .from('academy_progress')
            .select('*')
            .eq('user_gw_id', user_gw_id)
            .single();
        
        // 2. Обновить или создать прогресс в academy_progress
        const progressData = {
            user_gw_id: user_gw_id,
            current_day: dayNum < 21 ? dayNum + 1 : 21,
            day_completed: true,
            last_completed_at: new Date().toISOString(),
            [`day${dayNum}_completed`]: true,
            [`day${dayNum}_completed_at`]: new Date().toISOString(),
            total_days_completed: (currentProgress?.total_days_completed || 0) + 1
        };
        
        // Если это новый день (не перезавершение)
        if (!currentProgress || currentProgress.current_day === dayNum) {
            const { error: progressError } = await supabase
                .from('academy_progress')
                .upsert(progressData, {
                    onConflict: 'user_gw_id'
                });
            
            if (progressError) {
                console.error('Progress update error:', progressError);
            }
        }
        
        // ⭐ FIX: Также обновляем user_progress (academy-reminders читает оттуда)
        try {
            await supabase
                .from('user_progress')
                .upsert({
                    user_id: user_gw_id,
                    gw_id: user_gw_id,
                    current_day: dayNum < 21 ? dayNum + 1 : 21,
                    program_status: dayNum >= 21 ? 'completed' : 'active',
                    last_activity_at: new Date().toISOString()
                }, { onConflict: 'user_id' });
            console.log('✅ user_progress also updated');
        } catch (e2) {
            console.warn('user_progress update failed (non-critical):', e2.message);
        }
        
        // 3. Сохранить отчёт если есть
        if (report_text) {
            await supabase
                .from('academy_reports')
                .insert({
                    user_gw_id: user_gw_id,
                    day: dayNum,
                    report_text: report_text,
                    created_at: new Date().toISOString()
                });
        }
        
        // 4. Отправить Telegram уведомление
        const { data: subscriber } = await supabase
            .from('cardgift_bot_subscribers')
            .select('telegram_chat_id')
            .eq('user_gw_id', user_gw_id)
            .eq('is_active', true)
            .single();
        
        if (subscriber?.telegram_chat_id) {
            await sendTelegramNotification(subscriber.telegram_chat_id, dayNum);
        }
        
        // 5. Начислить очки/бонусы (если есть система)
        // TODO: интеграция с системой очков
        
        // 6. Возвращаем результат
        const isFinished = dayNum === 21;
        const nextDay = dayNum < 21 ? dayNum + 1 : null;
        
        return res.status(200).json({
            ok: true,
            completed_day: dayNum,
            next_day: nextDay,
            is_finished: isFinished,
            message: COMPLETION_MESSAGES[dayNum] || `День ${dayNum} завершён!`
        });
        
    } catch (error) {
        console.error('Complete day error:', error);
        return res.status(500).json({ error: error.message });
    }
}

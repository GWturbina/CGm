// api/send-push.js
// Vercel API Route для отправки Push уведомлений
// npm install web-push

import webpush from 'web-push';
import { createClient } from '@supabase/supabase-js';

// VAPID ключи - ЗАМЕНИ НА СВОИ!
// Сгенерировать: npx web-push generate-vapid-keys
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || 'YOUR_VAPID_PUBLIC_KEY';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || 'YOUR_VAPID_PRIVATE_KEY';
const VAPID_EMAIL = process.env.VAPID_EMAIL || 'mailto:your@email.com';

// Supabase
const supabaseUrl = process.env.SUPABASE_URL || 'https://imgpysvdosdsqucoghqa.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Настройка web-push
webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

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
        const { ownerGwId, title, body, icon, url, tag } = req.body;
        
        if (!ownerGwId || !title || !body) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        
        // Получить подписчиков
        const { data: subscriptions, error } = await supabase
            .from('push_subscriptions')
            .select('*')
            .eq('subscribed_to_gw_id', ownerGwId)
            .eq('is_active', true);
        
        if (error || !subscriptions || subscriptions.length === 0) {
            return res.status(200).json({ success: 0, failed: 0, message: 'No subscribers' });
        }
        
        // Payload для push
        const payload = JSON.stringify({
            title: title,
            body: body,
            icon: icon || '/icons/icon-192.png',
            url: url || '/',
            tag: tag || 'broadcast'
        });
        
        let success = 0;
        let failed = 0;
        
        // Отправка каждому подписчику
        for (const sub of subscriptions) {
            const pushSubscription = {
                endpoint: sub.endpoint,
                keys: {
                    p256dh: sub.p256dh,
                    auth: sub.auth
                }
            };
            
            try {
                await webpush.sendNotification(pushSubscription, payload);
                success++;
                
                // Обновить last_used
                await supabase
                    .from('push_subscriptions')
                    .update({ last_used_at: new Date().toISOString() })
                    .eq('id', sub.id);
                    
            } catch (pushError) {
                console.error('Push error:', pushError);
                failed++;
                
                // Если подписка истекла - деактивировать
                if (pushError.statusCode === 410 || pushError.statusCode === 404) {
                    await supabase
                        .from('push_subscriptions')
                        .update({ is_active: false })
                        .eq('id', sub.id);
                }
            }
        }
        
        console.log(`Push sent: ${success} success, ${failed} failed`);
        
        return res.status(200).json({
            success: success,
            failed: failed,
            total: subscriptions.length
        });
        
    } catch (error) {
        console.error('Send push error:', error);
        return res.status(500).json({ error: error.message });
    }
}

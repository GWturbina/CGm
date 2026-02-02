// api/auth/challenge.js
// Генерация challenge (nonce) для подписи кошельком
// v1.0 - Защита от replay attacks

import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

export default async function handler(req, res) {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    
    try {
        const { walletAddress } = req.body;
        
        if (!walletAddress) {
            return res.status(400).json({ error: 'walletAddress required' });
        }
        
        const wallet = walletAddress.toLowerCase();
        
        // Генерируем уникальный nonce
        const nonce = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 минут
        
        // Сохраняем в базу
        const supabase = createClient(supabaseUrl, supabaseKey);
        
        // Удаляем старые nonce для этого кошелька
        await supabase
            .from('auth_challenges')
            .delete()
            .eq('wallet_address', wallet);
        
        // Создаём новый
        const { error } = await supabase
            .from('auth_challenges')
            .insert({
                wallet_address: wallet,
                nonce: nonce,
                expires_at: expiresAt.toISOString(),
                used: false
            });
        
        if (error) {
            console.error('Challenge insert error:', error);
            return res.status(500).json({ error: 'Failed to create challenge' });
        }
        
        // Формируем сообщение для подписи
        const message = `CardGift Authentication\n\nWallet: ${wallet}\nNonce: ${nonce}\nExpires: ${expiresAt.toISOString()}\n\nSign this message to authenticate.`;
        
        console.log('✅ Challenge created for:', wallet);
        
        return res.status(200).json({
            success: true,
            message: message,
            nonce: nonce,
            expiresAt: expiresAt.toISOString()
        });
        
    } catch (error) {
        console.error('Challenge error:', error);
        return res.status(500).json({ error: error.message });
    }
}

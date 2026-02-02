// api/auth/verify.js
// Верификация подписи кошелька и выдача JWT токена
// v1.0 - Серверная авторизация

import { createClient } from '@supabase/supabase-js';
import { ethers } from 'ethers';
import jwt from 'jsonwebtoken';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const JWT_SECRET = process.env.JWT_SECRET || process.env.SUPABASE_JWT_SECRET || 'cardgift-jwt-secret-change-in-production';

// OWNER кошелёк - ЕДИНСТВЕННЫЙ источник истины на сервере!
const OWNER_WALLET = '0x7bcd1753868895971e12448412cb3216d47884c8'.toLowerCase();

// DEV кошельки (соавторы)
const DEV_WALLETS = [
    '0x7bcd1753868895971e12448412cb3216d47884c8',
    '0x9b49bd9c9458615e11c051afd1ebe983563b67ee',
    '0x03284a899147f5a07f82c622f34df92198671635',
    '0xa3496cacc8523421dd151f1d92a456c2dafa28c2'
].map(w => w.toLowerCase());

export default async function handler(req, res) {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    
    try {
        const { walletAddress, signature, message, nonce } = req.body;
        
        if (!walletAddress || !signature || !message || !nonce) {
            return res.status(400).json({ 
                error: 'walletAddress, signature, message, and nonce required' 
            });
        }
        
        const wallet = walletAddress.toLowerCase();
        const supabase = createClient(supabaseUrl, supabaseKey);
        
        // ШАГ 1: Проверяем nonce в базе
        const { data: challenge, error: challengeError } = await supabase
            .from('auth_challenges')
            .select('*')
            .eq('wallet_address', wallet)
            .eq('nonce', nonce)
            .eq('used', false)
            .single();
        
        if (challengeError || !challenge) {
            console.warn('❌ Invalid or expired nonce for:', wallet);
            return res.status(401).json({ error: 'Invalid or expired challenge' });
        }
        
        // Проверяем срок действия
        if (new Date(challenge.expires_at) < new Date()) {
            console.warn('❌ Challenge expired for:', wallet);
            return res.status(401).json({ error: 'Challenge expired' });
        }
        
        // ШАГ 2: Верифицируем подпись
        let recoveredAddress;
        try {
            recoveredAddress = ethers.verifyMessage(message, signature).toLowerCase();
        } catch (e) {
            console.error('Signature verification error:', e);
            return res.status(401).json({ error: 'Invalid signature' });
        }
        
        if (recoveredAddress !== wallet) {
            console.warn('❌ Signature mismatch:', recoveredAddress, '!==', wallet);
            return res.status(401).json({ error: 'Signature does not match wallet' });
        }
        
        // ШАГ 3: Помечаем nonce как использованный
        await supabase
            .from('auth_challenges')
            .update({ used: true })
            .eq('id', challenge.id);
        
        // ШАГ 4: Определяем роль пользователя
        let role = 'user';
        let permissions = [];
        
        // Проверяем OWNER
        if (wallet === OWNER_WALLET) {
            role = 'owner';
            permissions = ['all'];
            console.log('👑 OWNER authenticated:', wallet);
        }
        // Проверяем DEV (соавторы)
        else if (DEV_WALLETS.includes(wallet)) {
            role = 'coauthor';
            permissions = ['studio', 'generator', 'full_access'];
            console.log('🔧 Coauthor authenticated:', wallet);
        }
        // Проверяем team_members в базе
        else {
            const { data: teamMember } = await supabase
                .from('team_members')
                .select('role, permissions, is_active')
                .eq('wallet_address', wallet)
                .eq('is_active', true)
                .single();
            
            if (teamMember) {
                role = teamMember.role;
                permissions = teamMember.permissions || [];
                console.log('👥 Team member authenticated:', wallet, role);
            }
        }
        
        // ШАГ 5: Получаем/создаём пользователя
        let user = null;
        const { data: existingUser } = await supabase
            .from('users')
            .select('*')
            .eq('wallet_address', wallet)
            .single();
        
        if (existingUser) {
            user = existingUser;
            // Обновляем last_login
            await supabase
                .from('users')
                .update({ last_login_at: new Date().toISOString() })
                .eq('wallet_address', wallet);
        }
        
        // ШАГ 6: Создаём JWT токен
        const tokenPayload = {
            wallet: wallet,
            role: role,
            permissions: permissions,
            userId: user?.temp_id || user?.gw_id || null,
            gwId: user?.gw_id || null,
            gwLevel: user?.gw_level || 0,
            iat: Math.floor(Date.now() / 1000),
            exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 часа
        };
        
        const token = jwt.sign(tokenPayload, JWT_SECRET);
        
        console.log('✅ JWT issued for:', wallet, 'role:', role);
        
        return res.status(200).json({
            success: true,
            token: token,
            user: {
                wallet: wallet,
                role: role,
                permissions: permissions,
                gwId: user?.gw_id || null,
                gwLevel: user?.gw_level || 0,
                name: user?.name || null
            },
            expiresIn: 24 * 60 * 60 // секунд
        });
        
    } catch (error) {
        console.error('Verify error:', error);
        return res.status(500).json({ error: error.message });
    }
}

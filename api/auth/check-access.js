// api/auth/check-access.js
// Проверка JWT токена и прав доступа
// v1.0 - Серверная валидация

import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || process.env.SUPABASE_JWT_SECRET || 'cardgift-jwt-secret-change-in-production';

// OWNER кошелёк
const OWNER_WALLET = '0x7bcd1753868895971e12448412cb3216d47884c8'.toLowerCase();

export default async function handler(req, res) {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    try {
        // Получаем токен из заголовка
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ 
                error: 'No token provided',
                authenticated: false 
            });
        }
        
        const token = authHeader.substring(7);
        
        // Верифицируем токен
        let decoded;
        try {
            decoded = jwt.verify(token, JWT_SECRET);
        } catch (e) {
            if (e.name === 'TokenExpiredError') {
                return res.status(401).json({ 
                    error: 'Token expired',
                    authenticated: false,
                    expired: true
                });
            }
            return res.status(401).json({ 
                error: 'Invalid token',
                authenticated: false 
            });
        }
        
        // Проверяем запрошенную функцию (если указана)
        const { feature } = req.query;
        let hasAccess = true;
        
        if (feature) {
            hasAccess = checkFeatureAccess(decoded, feature);
        }
        
        return res.status(200).json({
            authenticated: true,
            wallet: decoded.wallet,
            role: decoded.role,
            permissions: decoded.permissions,
            gwId: decoded.gwId,
            gwLevel: decoded.gwLevel,
            hasAccess: hasAccess,
            requestedFeature: feature || null,
            isOwner: decoded.wallet === OWNER_WALLET,
            expiresAt: new Date(decoded.exp * 1000).toISOString()
        });
        
    } catch (error) {
        console.error('Check access error:', error);
        return res.status(500).json({ error: error.message });
    }
}

/**
 * Проверка доступа к конкретной функции
 */
function checkFeatureAccess(decoded, feature) {
    const { role, permissions, gwLevel } = decoded;
    
    // Owner имеет доступ ко всему
    if (role === 'owner' || permissions.includes('all')) {
        return true;
    }
    
    // Coauthor имеет полный доступ кроме админки
    if (role === 'coauthor') {
        return feature !== 'admin';
    }
    
    // Проверяем конкретные функции
    switch (feature) {
        case 'admin':
            // Только owner!
            return role === 'owner';
            
        case 'studio':
        case 'ai_studio':
            return gwLevel >= 1 || permissions.includes('studio');
            
        case 'generator':
            return true; // Доступно всем
            
        case 'archive':
            return gwLevel >= 1;
            
        case 'contacts':
        case 'referrals':
            return gwLevel >= 4 || permissions.includes('contacts');
            
        case 'crm':
        case 'blog':
            return gwLevel >= 7 || permissions.includes('crm');
            
        case 'mailing':
            return gwLevel >= 9 || permissions.includes('mailing');
            
        case 'analytics':
            return gwLevel >= 7 || permissions.includes('analytics');
            
        case 'team':
            return role === 'owner' || role === 'director' || permissions.includes('team');
            
        case 'news':
            return ['owner', 'director', 'admin', 'moderator'].includes(role) || 
                   permissions.includes('news');
            
        case 'credits':
            return role === 'owner' || role === 'director' || role === 'credit_manager' ||
                   permissions.includes('credits');
            
        default:
            return false;
    }
}

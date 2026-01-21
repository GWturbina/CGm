// api/delete-card.js
// Удаление карточки из Redis

import { createClient } from 'redis';

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'DELETE') return res.status(405).json({ error: 'Method not allowed' });
    
    const redisUrl = process.env.REDIS_URL || process.env.KV_URL;
    
    if (!redisUrl) {
        return res.status(200).json({ success: true, message: 'Redis not configured' });
    }
    
    try {
        const { sc } = req.query;
        
        if (!sc) {
            return res.status(400).json({ success: false, error: 'Short code required' });
        }
        
        const client = createClient({ url: redisUrl });
        await client.connect();
        
        const key = `card:${sc}`;
        await client.del(key);
        
        await client.quit();
        
        console.log('🗑️ Deleted from Redis:', sc);
        return res.status(200).json({ success: true, deleted: sc });
        
    } catch (error) {
        console.error('Delete card error:', error);
        return res.status(200).json({ success: true, message: 'Redis cleanup attempted' });
    }
}

// api/save-card.js
// Сохранение карточки в Supabase (ИСПРАВЛЕНО: убран Redis)
// v3.0 - Только Supabase!

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export default async function handler(req, res) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }
    
    try {
        const { shortCode, cardData } = req.body;
        
        if (!shortCode || !cardData) {
            return res.status(400).json({ 
                success: false, 
                error: 'shortCode and cardData required' 
            });
        }
        
        console.log('💾 Saving card:', shortCode);
        console.log('📦 Card data keys:', Object.keys(cardData));
        
        // Инициализируем Supabase
        if (!supabaseUrl || !supabaseKey) {
            console.error('❌ Missing Supabase credentials');
            return res.status(500).json({ 
                success: false, 
                error: 'Server configuration error - Supabase not configured' 
            });
        }
        
        const supabase = createClient(supabaseUrl, supabaseKey);
        
        // Получаем owner_gw_id из cardData
        const ownerGwId = cardData.ownerGwId || cardData.owner_gw_id || 
                         cardData.actualCreator || cardData.creatorId || 
                         'ANONYMOUS';
        
        // Проверяем, не существует ли уже такая карточка
        const { data: existing } = await supabase
            .from('cards')
            .select('id, short_code')
            .eq('short_code', shortCode)
            .single();
        
        if (existing) {
            console.log('⚠️ Card already exists:', shortCode);
            // Обновляем существующую
            const { data, error } = await supabase
                .from('cards')
                .update({
                    card_data: {
                        title: cardData.greetingText?.split('\n')[0]?.substring(0, 100) || 
                               cardData.greeting?.split('\n')[0]?.substring(0, 100) || 
                               cardData.title || 'Открытка',
                        message: cardData.greetingText || cardData.greeting || '',
                        greeting: cardData.greetingText || cardData.greeting || '',
                        image_url: cardData.mediaUrl || cardData.cloudinaryUrl || cardData.image_url || null,
                        video_url: cardData.videoUrl || null,
                        style: cardData.style || 'classic',
                        textPosition: cardData.textPosition || 'bottom',
                        ctaEnabled: cardData.ctaEnabled || false,
                        ctaTitle: cardData.ctaTitle || null,
                        ctaButton: cardData.ctaButton || null,
                        ctaUrl: cardData.ctaUrl || null,
                        ctaTimer: cardData.ctaTimer || 3,
                        marqueeEnabled: cardData.marqueeEnabled || false,
                        marqueeText: cardData.marqueeText || null,
                        marqueeUrl: cardData.marqueeUrl || null,
                        marqueeTimer: cardData.marqueeTimer || 7,
                        bannerEnabled: cardData.bannerEnabled || false,
                        bannerHtml: cardData.bannerHtml || null,
                        bannerUrl: cardData.bannerUrl || null,
                        bannerTimer: cardData.bannerTimer || 5,
                        bonusEnabled: cardData.bonusEnabled || false,
                        bonusImage: cardData.bonusImage || null,
                        bonusTitle: cardData.bonusTitle || null,
                        bonusText: cardData.bonusText || null
                    },
                    updated_at: new Date().toISOString()
                })
                .eq('short_code', shortCode)
                .select()
                .single();
            
            if (error) {
                console.error('❌ Supabase update error:', error);
                return res.status(500).json({ success: false, error: error.message });
            }
            
            console.log('✅ Card updated in Supabase:', shortCode);
            return res.status(200).json({ success: true, shortCode, updated: true });
        }
        
        // Создаём новую карточку
        const { data, error } = await supabase
            .from('cards')
            .insert({
                short_code: shortCode,
                owner_gw_id: ownerGwId,
                card_data: {
                    title: cardData.greetingText?.split('\n')[0]?.substring(0, 100) || 
                           cardData.greeting?.split('\n')[0]?.substring(0, 100) || 
                           cardData.title || 'Открытка',
                    message: cardData.greetingText || cardData.greeting || '',
                    greeting: cardData.greetingText || cardData.greeting || '',
                    image_url: cardData.mediaUrl || cardData.cloudinaryUrl || cardData.image_url || null,
                    video_url: cardData.videoUrl || null,
                    style: cardData.style || 'classic',
                    textPosition: cardData.textPosition || 'bottom',
                    ctaEnabled: cardData.ctaEnabled || false,
                    ctaTitle: cardData.ctaTitle || null,
                    ctaButton: cardData.ctaButton || null,
                    ctaUrl: cardData.ctaUrl || null,
                    ctaTimer: cardData.ctaTimer || 3,
                    marqueeEnabled: cardData.marqueeEnabled || false,
                    marqueeText: cardData.marqueeText || null,
                    marqueeUrl: cardData.marqueeUrl || null,
                    marqueeTimer: cardData.marqueeTimer || 7,
                    bannerEnabled: cardData.bannerEnabled || false,
                    bannerHtml: cardData.bannerHtml || null,
                    bannerUrl: cardData.bannerUrl || null,
                    bannerTimer: cardData.bannerTimer || 5,
                    bonusEnabled: cardData.bonusEnabled || false,
                    bonusImage: cardData.bonusImage || null,
                    bonusTitle: cardData.bonusTitle || null,
                    bonusText: cardData.bonusText || null
                },
                card_type: 'standard',
                views: 0,
                views_count: 0,
                unique_views: 0,
                created_at: cardData.createdAt || new Date().toISOString()
            })
            .select()
            .single();
        
        if (error) {
            console.error('❌ Supabase insert error:', error);
            return res.status(500).json({ success: false, error: error.message });
        }
        
        console.log('✅ Card saved to Supabase:', shortCode);
        return res.status(200).json({ 
            success: true, 
            shortCode,
            id: data?.id 
        });
        
    } catch (error) {
        console.error('❌ Save card error:', error);
        return res.status(500).json({ success: false, error: error.message });
    }
}

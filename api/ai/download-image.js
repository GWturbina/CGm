// api/ai/download-image.js
// Proxy for downloading images (bypasses CORS)

module.exports = async function handler(req, res) {
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
        const { imageUrl } = req.body;
        
        if (!imageUrl) {
            return res.status(400).json({ error: 'Image URL required' });
        }
        
        // Скачиваем изображение
        const response = await fetch(imageUrl);
        
        if (!response.ok) {
            return res.status(response.status).json({ error: 'Failed to fetch image' });
        }
        
        const arrayBuffer = await response.arrayBuffer();
        const base64 = Buffer.from(arrayBuffer).toString('base64');
        const contentType = response.headers.get('content-type') || 'image/png';
        
        return res.status(200).json({
            success: true,
            base64: base64,
            contentType: contentType
        });
        
    } catch (error) {
        console.error('Download error:', error);
        return res.status(500).json({ error: error.message });
    }
};

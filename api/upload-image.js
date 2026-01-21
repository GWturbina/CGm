// Vercel Serverless Function - загрузка изображений в Cloudinary
// POST /api/upload-image
// Body: { image: "base64 string", cardId: "card_xxx" }
// ИСПРАВЛЕНО: Убрана трансформация - картинки сохраняются в оригинальном размере

const https = require('https');
const crypto = require('crypto');

module.exports = async function handler(req, res) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }
    
    try {
        const { image, cardId, folder = 'cardgift' } = req.body;
        
        if (!image) {
            return res.status(400).json({ success: false, error: 'Image is required' });
        }
        
        // Cloudinary credentials from environment
        const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
        const apiKey = process.env.CLOUDINARY_API_KEY;
        const apiSecret = process.env.CLOUDINARY_API_SECRET;
        
        if (!cloudName || !apiKey || !apiSecret) {
            console.error('Cloudinary credentials missing');
            return res.status(500).json({ success: false, error: 'Server configuration error' });
        }
        
        // Generate timestamp and signature
        const timestamp = Math.round(Date.now() / 1000);
        const publicId = cardId || `card_${timestamp}_${Math.random().toString(36).substr(2, 6)}`;
        
        // Parameters for signature (БЕЗ трансформации - сохраняем оригинал!)
        const params = {
            folder: folder,
            public_id: publicId,
            timestamp: timestamp
        };
        
        // Create signature
        const signatureString = Object.keys(params)
            .sort()
            .map(key => `${key}=${params[key]}`)
            .join('&') + apiSecret;
        
        const signature = crypto
            .createHash('sha1')
            .update(signatureString)
            .digest('hex');
        
        // Prepare form data for Cloudinary (БЕЗ transformation - оригинальный размер!)
        const formData = {
            file: image,
            api_key: apiKey,
            timestamp: timestamp,
            signature: signature,
            folder: folder,
            public_id: publicId
        };
        
        // Upload to Cloudinary
        const cloudinaryResult = await uploadToCloudinary(cloudName, formData);
        
        if (cloudinaryResult.error) {
            console.error('Cloudinary error:', cloudinaryResult.error);
            return res.status(500).json({ 
                success: false, 
                error: cloudinaryResult.error.message || 'Upload failed' 
            });
        }
        
        // Success response
        return res.status(200).json({
            success: true,
            url: cloudinaryResult.secure_url,
            publicId: cloudinaryResult.public_id,
            width: cloudinaryResult.width,
            height: cloudinaryResult.height,
            format: cloudinaryResult.format
        });
        
    } catch (error) {
        console.error('Upload error:', error);
        return res.status(500).json({ success: false, error: error.message });
    }
};

// Helper function to upload to Cloudinary
function uploadToCloudinary(cloudName, formData) {
    return new Promise((resolve, reject) => {
        const boundary = '----FormBoundary' + Math.random().toString(36).substr(2);
        
        let body = '';
        for (const [key, value] of Object.entries(formData)) {
            body += `--${boundary}\r\n`;
            body += `Content-Disposition: form-data; name="${key}"\r\n\r\n`;
            body += `${value}\r\n`;
        }
        body += `--${boundary}--\r\n`;
        
        const options = {
            hostname: 'api.cloudinary.com',
            port: 443,
            path: `/v1_1/${cloudName}/image/upload`,
            method: 'POST',
            headers: {
                'Content-Type': `multipart/form-data; boundary=${boundary}`,
                'Content-Length': Buffer.byteLength(body)
            }
        };
        
        const req = https.request(options, (response) => {
            let data = '';
            response.on('data', chunk => data += chunk);
            response.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    reject(new Error('Invalid response from Cloudinary'));
                }
            });
        });
        
        req.on('error', reject);
        req.write(body);
        req.end();
    });
}

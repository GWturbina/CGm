/* =====================================================
   CARDGIFT - CLOUDINARY SERVICE
   Сервис для загрузки изображений в облако
   ===================================================== */

const CloudinaryService = {
    // Загрузить изображение в Cloudinary
    async uploadImage(imageData, cardId = null) {
        try {
            console.log('☁️ Uploading image to cloud...');
            
            // Если это File объект - конвертируем в base64
            let base64Image = imageData;
            if (imageData instanceof File || imageData instanceof Blob) {
                base64Image = await this.fileToBase64(imageData);
            }
            
            // Если это уже URL (http/https или data:) - используем как есть
            if (typeof base64Image === 'string' && !base64Image.startsWith('data:')) {
                // Добавляем data: prefix если его нет
                if (!base64Image.includes('://')) {
                    base64Image = `data:image/png;base64,${base64Image}`;
                }
            }
            
            const response = await fetch('/api/upload-image', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    image: base64Image,
                    cardId: cardId
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                console.log('✅ Image uploaded:', result.url);
                return {
                    success: true,
                    url: result.url,
                    publicId: result.publicId
                };
            } else {
                console.error('❌ Upload failed:', result.error);
                return {
                    success: false,
                    error: result.error
                };
            }
            
        } catch (error) {
            console.error('❌ Upload error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    },
    
    // Конвертировать File в base64
    fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    },
    
    // Сжать изображение перед загрузкой
    async compressImage(imageData, maxWidth = 1200, maxHeight = 630, quality = 0.8) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let { width, height } = img;
                
                // Масштабируем если нужно
                if (width > maxWidth) {
                    height = (height * maxWidth) / width;
                    width = maxWidth;
                }
                if (height > maxHeight) {
                    width = (width * maxHeight) / height;
                    height = maxHeight;
                }
                
                canvas.width = width;
                canvas.height = height;
                
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                
                resolve(canvas.toDataURL('image/jpeg', quality));
            };
            img.onerror = reject;
            
            if (typeof imageData === 'string') {
                img.src = imageData;
            } else if (imageData instanceof File || imageData instanceof Blob) {
                img.src = URL.createObjectURL(imageData);
            }
        });
    },
    
    // Загрузить превью открытки (canvas snapshot)
    async uploadCardPreview(canvasElement, cardId) {
        try {
            // Получаем изображение из canvas
            const dataUrl = canvasElement.toDataURL('image/png', 0.9);
            
            // Загружаем в облако
            return await this.uploadImage(dataUrl, cardId);
            
        } catch (error) {
            console.error('❌ Failed to upload card preview:', error);
            return { success: false, error: error.message };
        }
    },
    
    // Получить URL для OG превью с трансформациями
    getOgImageUrl(cloudinaryUrl) {
        if (!cloudinaryUrl) return null;
        
        // Cloudinary URL transformation
        // Пример: https://res.cloudinary.com/xxx/image/upload/v123/folder/image.jpg
        // Добавляем: /w_1200,h_630,c_fill,q_auto,f_auto/
        
        const parts = cloudinaryUrl.split('/upload/');
        if (parts.length === 2) {
            return `${parts[0]}/upload/w_1200,h_630,c_fill,q_auto,f_auto/${parts[1]}`;
        }
        
        return cloudinaryUrl;
    }
};

// Глобальный доступ
window.CloudinaryService = CloudinaryService;

console.log('☁️ CloudinaryService loaded');

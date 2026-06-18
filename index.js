// index.js
import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());

// Validasi API Key
const apiKey = process.env.GOOGLE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
if (!apiKey) {
    console.error('❌ API Key tidak ditemukan!');
}

// Inisialisasi Google Gemini AI
const genAI = new GoogleGenAI({ apiKey });

// Konfigurasi Multer (memory storage)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 },
});

// Helper untuk ekstensi file
const getFileExtension = (filename) => {
    return filename ? path.extname(filename).toLowerCase() : '';
};

// ========== ENDPOINTS ==========

// 1. Generate text (dengan fallback model)
app.post('/generate-text', async (req, res) => {
    const { prompt } = req.body;
    if (!prompt) {
        return res.status(400).json({ error: 'Prompt is required' });
    }

    // Daftar model yang akan dicoba secara berurutan
    const models = ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-pro'];
    let lastError = null;

    for (const model of models) {
        try {
            console.log(`🔄 Mencoba model: ${model}`);
            const result = await genAI.models.generateContent({
                model: model,
                contents: [{ role: 'user', parts: [{ text: prompt }] }],
            });
            
            console.log(`✅ Berhasil dengan model: ${model}`);
            return res.json({ output: result.text, model: model });
        } catch (error) {
            console.warn(`⚠️ Model ${model} gagal:`, error.message);
            lastError = error;
            // Lanjut ke model berikutnya
        }
    }

    // Jika semua model gagal
    console.error('❌ Semua model gagal:', lastError);
    return res.status(500).json({
        error: 'Gagal menghasilkan teks',
        detail: lastError ? lastError.message : 'Unknown error',
        stack: process.env.NODE_ENV === 'development' ? lastError?.stack : undefined
    });
});

// 2. Generate dari gambar (dengan fallback model)
app.post('/generate-from-image', upload.single('image'), async (req, res) => {
    const { prompt = 'Describe this uploaded image' } = req.body;
    if (!req.file) {
        return res.status(400).json({ error: 'Image file is required' });
    }

    const models = ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-pro'];
    let lastError = null;

    for (const model of models) {
        try {
            const base64Image = req.file.buffer.toString('base64');
            const mimeType = req.file.mimetype;

            const result = await genAI.models.generateContent({
                model: model,
                contents: [{
                    role: 'user',
                    parts: [
                        { text: prompt },
                        { inlineData: { mimeType, data: base64Image } }
                    ]
                }]
            });
            return res.json({ output: result.text, model: model });
        } catch (error) {
            lastError = error;
        }
    }

    console.error('Image processing error:', lastError);
    res.status(500).json({ error: lastError?.message || 'Image processing failed' });
});

// 3. Generate dari dokumen
app.post('/generate-from-document', upload.single('document'), async (req, res) => {
    // ... (sama dengan pola di atas, gunakan models array)
    // Saya singkat untuk menjaga panjang jawaban
});

// 4. Generate dari audio
app.post('/generate-from-audio', upload.single('audio'), async (req, res) => {
    // ... (sama dengan pola di atas)
});

// 5. Health check / root
app.get('/', (req, res) => {
    res.json({
        message: 'Gemini AI Chatbot API is running on Vercel',
        endpoints: {
            text: 'POST /generate-text',
            image: 'POST /generate-from-image',
            document: 'POST /generate-from-document',
            audio: 'POST /generate-from-audio',
        },
    });
});

// 6. Test route
app.get('/test', (req, res) => {
    res.json({ message: 'Test route works!' });
});

// 7. Error handling middleware
app.use((err, req, res, next) => {
    console.error('Global error:', err.stack);
    res.status(500).json({ error: err.message });
});

// ========== EKSPOR UNTUK VERCEL ==========
export default app;

// Jalankan lokal jika tidak di Vercel
if (process.env.NODE_ENV !== 'production') {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
        console.log(`API Key exists: ${!!apiKey}`);
    });
}

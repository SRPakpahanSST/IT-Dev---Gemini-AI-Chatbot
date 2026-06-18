// index.js
import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import { GoogleGenAI } from '@google/genai';

// Load .env hanya jika ada (di Vercel tidak perlu)
dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());

// === VALIDASI API KEY ===
const apiKey = process.env.GOOGLE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
if (!apiKey) {
    console.error('❌ API Key tidak ditemukan!');
}

// === INISIALISASI GEMINI ===
const genAI = apiKey ? new GoogleGenAI({ apiKey }) : null;

// === KONFIGURASI MULTER ===
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 },
});

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

    if (!genAI) {
        return res.status(500).json({ error: 'API Key tidak ditemukan' });
    }

    const models = ['gemini-1.5-flash', 'gemini-pro'];
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
            console.error(`❌ Model ${model} gagal:`, error.message);
            lastError = error;
        }
    }

    console.error('❌ Semua model gagal');
    return res.status(500).json({
        error: 'Gagal generate teks',
        detail: lastError?.message || 'Unknown error',
        suggestion: 'Cek API key dan kuota di Google AI Studio'
    });
});

// 2. Generate dari gambar
app.post('/generate-from-image', upload.single('image'), async (req, res) => {
    const { prompt = 'Describe this uploaded image' } = req.body;
    if (!req.file) {
        return res.status(400).json({ error: 'Image file is required' });
    }
    if (!genAI) {
        return res.status(500).json({ error: 'API Key tidak ditemukan' });
    }

    const models = ['gemini-1.5-flash', 'gemini-pro'];
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

    res.status(500).json({ error: lastError?.message || 'Image processing failed' });
});

// 3. Generate dari dokumen (PDF, DOCX, TXT, PPT, dll)
app.post('/generate-from-document', upload.single('document'), async (req, res) => {
    const { prompt = 'Analyze this document' } = req.body;
    if (!req.file) {
        return res.status(400).json({ error: 'Document file is required' });
    }
    if (!genAI) {
        return res.status(500).json({ error: 'API Key tidak ditemukan' });
    }

    const supported = ['.pdf', '.txt', '.doc', '.docx', '.ppt', '.pptx'];
    const ext = getFileExtension(req.file.originalname);
    if (!supported.includes(ext)) {
        return res.status(400).json({
            error: `Unsupported document type: ${ext}. Supported: PDF, TXT, DOC, DOCX, PPT, PPTX`,
        });
    }

    const models = ['gemini-1.5-flash', 'gemini-pro'];
    let lastError = null;

    for (const model of models) {
        try {
            const base64Data = req.file.buffer.toString('base64');
            const mimeType = req.file.mimetype;

            const result = await genAI.models.generateContent({
                model: model,
                contents: [{
                    role: 'user',
                    parts: [
                        { text: prompt },
                        { inlineData: { mimeType, data: base64Data } }
                    ]
                }]
            });
            return res.json({
                output: result.text,
                model: model,
                documentType: ext,
                fileName: req.file.originalname,
            });
        } catch (error) {
            lastError = error;
        }
    }

    res.status(500).json({ error: lastError?.message || 'Document processing failed' });
});

// 4. Generate dari audio (MP3, WAV, M4A, FLAC, OGG)
app.post('/generate-from-audio', upload.single('audio'), async (req, res) => {
    const { prompt = 'Transcribe and analyze this audio' } = req.body;
    if (!req.file) {
        return res.status(400).json({ error: 'Audio file is required' });
    }
    if (!genAI) {
        return res.status(500).json({ error: 'API Key tidak ditemukan' });
    }

    const supported = ['.mp3', '.wav', '.m4a', '.flac', '.ogg'];
    const ext = getFileExtension(req.file.originalname);
    if (!supported.includes(ext)) {
        return res.status(400).json({
            error: `Unsupported audio type: ${ext}. Supported: MP3, WAV, M4A, FLAC, OGG`,
        });
    }

    const models = ['gemini-1.5-flash', 'gemini-pro'];
    let lastError = null;

    for (const model of models) {
        try {
            const base64Data = req.file.buffer.toString('base64');
            const mimeType = req.file.mimetype;

            const result = await genAI.models.generateContent({
                model: model,
                contents: [{
                    role: 'user',
                    parts: [
                        { text: prompt },
                        { inlineData: { mimeType, data: base64Data } }
                    ]
                }]
            });
            return res.json({
                output: result.text,
                model: model,
                audioType: ext,
                fileName: req.file.originalname,
            });
        } catch (error) {
            lastError = error;
        }
    }

    res.status(500).json({ error: lastError?.message || 'Audio processing failed' });
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

// 7. Error handling middleware (harus di akhir)
app.use((err, req, res, next) => {
    console.error('Global error:', err.stack);
    res.status(500).json({ error: err.message });
});

// ========== EKSPOR UNTUK VERCEL ==========
export default app;

// Jalankan lokal
if (process.env.NODE_ENV !== 'production') {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
        console.log(`API Key exists: ${!!apiKey}`);
    });
}

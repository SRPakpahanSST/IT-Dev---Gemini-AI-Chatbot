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

// Inisialisasi Google Gemini AI
const genAI = new GoogleGenAI({
    apiKey: process.env.GOOGLE_GEMINI_API_KEY || process.env.GEMINI_API_KEY,
});

// Konfigurasi Multer (memory storage, tidak menyimpan ke disk)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
    },
});

// Helper untuk ekstensi file
const getFileExtension = (filename) => {
    return filename ? path.extname(filename).toLowerCase() : '';
};

// ========== ENDPOINTS ==========

// 1. Generate text
app.post('/generate-text', async (req, res) => {
    const { prompt } = req.body;
    if (!prompt) {
        return res.status(400).json({ error: 'Prompt is required' });
    }
    try {
        const result = await genAI.models.generateContent({
            model: 'gemini-1.5-flash', // ← diubah dari gemini-2.0-flash
            contents: [{ role: 'user', parts: [{ text: prompt }] }]
        });
        res.json({ output: result.text });
    } catch (error) {
        console.error('Generate text error:', error);
        res.status(500).json({ error: error.message });
    }
});

// 2. Generate dari gambar
app.post('/generate-from-image', upload.single('image'), async (req, res) => {
    const { prompt = 'Describe this uploaded image' } = req.body;
    if (!req.file) {
        return res.status(400).json({ error: 'Image file is required' });
    }

    try {
        const base64Image = req.file.buffer.toString('base64');
        const mimeType = req.file.mimetype;

        const result = await genAI.models.generateContent({
            model: 'gemini-1.5-flash', // ← diubah
            contents: [
                {
                    role: 'user',
                    parts: [
                        { text: prompt },
                        {
                            inlineData: {
                                mimeType: mimeType,
                                data: base64Image,
                            },
                        },
                    ],
                },
            ],
        });

        res.json({ output: result.text });
    } catch (error) {
        console.error('Image processing error:', error);
        res.status(500).json({ error: error.message });
    }
});

// 3. Generate dari dokumen (PDF, DOCX, TXT, PPT, dll)
app.post('/generate-from-document', upload.single('document'), async (req, res) => {
    const { prompt = 'Analyze this document' } = req.body;
    if (!req.file) {
        return res.status(400).json({ error: 'Document file is required' });
    }

    const supported = ['.pdf', '.txt', '.doc', '.docx', '.ppt', '.pptx'];
    const ext = getFileExtension(req.file.originalname);
    if (!supported.includes(ext)) {
        return res.status(400).json({
            error: `Unsupported document type: ${ext}. Supported: PDF, TXT, DOC, DOCX, PPT, PPTX`,
        });
    }

    try {
        const base64Data = req.file.buffer.toString('base64');
        const mimeType = req.file.mimetype;

        const result = await genAI.models.generateContent({
            model: 'gemini-1.5-flash', // ← diubah
            contents: [
                {
                    role: 'user',
                    parts: [
                        { text: prompt },
                        {
                            inlineData: {
                                mimeType: mimeType,
                                data: base64Data,
                            },
                        },
                    ],
                },
            ],
        });

        res.json({
            output: result.text,
            documentType: ext,
            fileName: req.file.originalname,
        });
    } catch (error) {
        console.error('Document processing error:', error);
        res.status(500).json({ error: error.message });
    }
});

// 4. Generate dari audio (MP3, WAV, M4A, FLAC, OGG)
app.post('/generate-from-audio', upload.single('audio'), async (req, res) => {
    const { prompt = 'Transcribe and analyze this audio' } = req.body;
    if (!req.file) {
        return res.status(400).json({ error: 'Audio file is required' });
    }

    const supported = ['.mp3', '.wav', '.m4a', '.flac', '.ogg'];
    const ext = getFileExtension(req.file.originalname);
    if (!supported.includes(ext)) {
        return res.status(400).json({
            error: `Unsupported audio type: ${ext}. Supported: MP3, WAV, M4A, FLAC, OGG`,
        });
    }

    try {
        const base64Data = req.file.buffer.toString('base64');
        const mimeType = req.file.mimetype;

        const result = await genAI.models.generateContent({
            model: 'gemini-1.5-flash', // ← diubah
            contents: [
                {
                    role: 'user',
                    parts: [
                        { text: prompt },
                        {
                            inlineData: {
                                mimeType: mimeType,
                                data: base64Data,
                            },
                        },
                    ],
                },
            ],
        });

        res.json({
            output: result.text,
            audioType: ext,
            fileName: req.file.originalname,
        });
    } catch (error) {
        console.error('Audio processing error:', error);
        res.status(500).json({ error: error.message });
    }
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

// Jalankan lokal jika tidak di Vercel
if (process.env.NODE_ENV !== 'production') {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}

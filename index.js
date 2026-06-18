// index.js
import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import multer from 'multer';
import path from 'path'; // <-- tambahan ini
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
            model: 'gemini-2.0-flash',
            contents: prompt, // Bisa string, tapi lebih aman gunakan array:
            // contents: [{ role: 'user', parts: [{ text: prompt }] }]
        });
        res.json({ output: result.text });
    } catch (error) {
        console.error('Generate text error:', error);
        res.status(500).json({ error: error.message });
    }
});

// 2. Generate dari gambar
app.post('/generate-from-image', upload.single('image'), async (req, res) => {
    // ... (kode tetap sama)
});

// 3. Generate dari dokumen
app.post('/generate-from-document', upload.single('document'), async (req, res) => {
    // ... (kode tetap sama)
});

// 4. Generate dari audio
app.post('/generate-from-audio', upload.single('audio'), async (req, res) => {
    // ... (kode tetap sama)
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

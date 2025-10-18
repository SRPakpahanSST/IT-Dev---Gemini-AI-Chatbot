// import dependencies
import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { GoogleGenAI } from '@google/genai';

// Setup aplikasi
dotenv.config();
console.log("API Key Loaded:", process.env.GOOGLE_GEMINI_API_KEY);

// Inisialisasi Express.js
const app = express();

// Middleware
app.use(express.json());
app.use(cors());

// Inisialisasi Google Gemini AI
const genAI = new GoogleGenAI({
    apiKey: process.env.GOOGLE_GEMINI_API_KEY
});

// Konfigurasi Multer untuk upload file
const upload = multer({
    dest: "uploads/",
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
    }
});

// Helper function untuk mendapatkan ekstensi file
const getFileExtension = (filename) => {
    return path.extname(filename).toLowerCase();
};

// Endpoint untuk generate text
app.post("/generate-text", async (req, res) => {
    const { prompt } = req.body;
    
    if (!prompt) {
        return res.status(400).json({ error: "Prompt is required" });
    }
    
    try {
        const result = await genAI.models.generateContent({
            model: "gemini-2.0-flash",
            contents: prompt
        });
        
        res.json({
            output: result.text
        });
    } catch (e) {
        console.error(e);
        res.status(500).json({
            error: e.message
        });
    }
});

// Endpoint untuk generate dari gambar
app.post("/generate-from-image", upload.single("image"), async (req, res) => {
    const { prompt = "Describe this uploaded image" } = req.body;
    
    if (!req.file) {
        return res.status(400).json({ error: "Image file is required" });
    }
    
    try {
        // Upload gambar ke Google AI
        const image = await genAI.files.upload({
            file: req.file.path,
            config: {
                mimeType: req.file.mimetype
            }
        });

        // Generate konten dari gambar
        const result = await genAI.models.generateContent({
            model: "gemini-2.0-flash",
            contents: [
                {
                    role: "user",
                    parts: [
                        { text: prompt },
                        {
                            fileData: {
                                mimeType: image.mimeType,
                                fileUri: image.uri
                            }
                        }
                    ]
                }
            ]
        });

        res.json({ output: result.text });
    } catch (error) {
        console.error("Error generating content from image:", error);
        res.status(500).json({ error: error.message });
    } finally {
        // Hapus file temporary
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
    }
});

// Endpoint untuk generate dari dokumen
app.post("/generate-from-document", upload.single("document"), async (req, res) => {
    const { prompt = "Analyze this document" } = req.body;
    
    if (!req.file) {
        return res.status(400).json({ error: "Document file is required" });
    }
    
    // Supported document types
    const supportedDocs = ['.pdf', '.txt', '.doc', '.docx', '.ppt', '.pptx'];
    const fileExt = getFileExtension(req.file.originalname);
    
    if (!supportedDocs.includes(fileExt)) {
        return res.status(400).json({ 
            error: "Unsupported document type. Supported: PDF, TXT, DOC, DOCX, PPT, PPTX" 
        });
    }
    
    try {
        // Upload dokumen ke Google AI
        const document = await genAI.files.upload({
            file: req.file.path,
            config: {
                mimeType: req.file.mimetype
            }
        });

        // Generate konten dari dokumen
        const result = await genAI.models.generateContent({
            model: "gemini-2.0-flash",
            contents: [
                {
                    role: "user",
                    parts: [
                        { text: prompt },
                        {
                            fileData: {
                                mimeType: document.mimeType,
                                fileUri: document.uri
                            }
                        }
                    ]
                }
            ]
        });

        res.json({ 
            output: result.text,
            documentType: fileExt,
            fileName: req.file.originalname
        });
    } catch (error) {
        console.error("Error generating content from document:", error);
        res.status(500).json({ error: error.message });
    } finally {
        // Hapus file temporary
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
    }
});

// Endpoint untuk generate dari audio
app.post("/generate-from-audio", upload.single("audio"), async (req, res) => {
    const { prompt = "Transcribe and analyze this audio" } = req.body;
    
    if (!req.file) {
        return res.status(400).json({ error: "Audio file is required" });
    }
    
    // Supported audio types
    const supportedAudio = ['.mp3', '.wav', '.m4a', '.flac', '.ogg'];
    const fileExt = getFileExtension(req.file.originalname);
    
    if (!supportedAudio.includes(fileExt)) {
        return res.status(400).json({ 
            error: "Unsupported audio type. Supported: MP3, WAV, M4A, FLAC, OGG" 
        });
    }
    
    try {
        // Upload audio ke Google AI
        const audio = await genAI.files.upload({
            file: req.file.path,
            config: {
                mimeType: req.file.mimetype
            }
        });

        // Generate konten dari audio
        const result = await genAI.models.generateContent({
            model: "gemini-2.0-flash",
            contents: [
                {
                    role: "user",
                    parts: [
                        { text: prompt },
                        {
                            fileData: {
                                mimeType: audio.mimeType,
                                fileUri: audio.uri
                            }
                        }
                    ]
                }
            ]
        });

        res.json({ 
            output: result.text,
            audioType: fileExt,
            fileName: req.file.originalname
        });
    } catch (error) {
        console.error("Error generating content from audio:", error);
        res.status(500).json({ error: error.message });
    } finally {
        // Hapus file temporary
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
    }
});

// Health check endpoint
app.get("/", (req, res) => {
    res.json({ 
        message: "Gemini AI Chatbot API is running",
        endpoints: {
            text: "POST /generate-text",
            image: "POST /generate-from-image",
            document: "POST /generate-from-document", 
            audio: "POST /generate-from-audio"
        }
    });
});

// Jalankan server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Uploads directory: ${path.resolve("uploads/")}`);
    
    // Pastikan folder uploads exists
    if (!fs.existsSync("uploads")) {
        fs.mkdirSync("uploads");
        console.log("Created uploads directory");
    }
});

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();
const port = process.env.PORT || 5004;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Inisialisasi Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Fungsi untuk memformat history
function formatChatHistory(history) {
    return history.map(msg => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }]
    }));
}

// Endpoint untuk chat yang diperbarui
app.post('/api/chat', async (req, res) => {
    try {
        const { message, history = [] } = req.body;
        
        // Validasi input
        if (!message || typeof message !== 'string') {
            return res.status(400).json({ error: 'Pesan tidak valid' });
        }

        // Gunakan model yang lebih baru
        const model = genAI.getGenerativeModel({ 
            model: "gemini-2.0-flash", // atau "gemini-1.5-pro" untuk versi terbaru
            generationConfig: {
                maxOutputTokens: 2000, // Batasi respon yang terlalu panjang
                temperature: 0.9, // Kreativitas respon
            }
        });

        // Mulai chat dengan history
        const chat = model.startChat({
            history: formatChatHistory(history),
            generationConfig: {
                maxOutputTokens: 2000
            }
        });

        // Kirim pesan dan dapatkan respons
        const result = await chat.sendMessage(message);
        const response = await result.response;
        const text = response.text();

        res.json({ 
            text,
            // Kirim kembali history yang diperbarui untuk sinkronisasi client
            updatedHistory: [
                ...history,
                { role: 'user', content: message },
                { role: 'assistant', content: text }
            ].slice(-20) // Batasi history yang dikembalikan
        });

    } catch (error) {
        console.error('Error:', error);
        
        // Berikan pesan error yang lebih informatif
        let errorMessage = 'Terjadi kesalahan saat memproses permintaan';
        if (error.message.includes('API key')) {
            errorMessage = 'API key tidak valid atau kadaluarsa';
        } else if (error.message.includes('model')) {
            errorMessage = 'Model AI tidak tersedia';
        }

        res.status(500).json({ 
            error: errorMessage,
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// Endpoint untuk mendapatkan info model
app.get('/api/models', async (req, res) => {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const info = await model.getModel();
        res.json({
            name: info.model,
            description: info.description,
            inputTokenLimit: info.inputTokenLimit,
            outputTokenLimit: info.outputTokenLimit
        });
    } catch (error) {
        res.status(500).json({ error: 'Gagal mendapatkan info model' });
    }
});

// Endpoint kesehatan
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK',
        timestamp: new Date().toISOString(),
        model: 'gemini-1.5-flash'
    });
});

app.listen(port, '0.0.0.0',() => {
    console.log(`Server berjalan di http://0.0.0.0:${port}`);
    console.log(`Mode: ${process.env.NODE_ENV || 'development'}`);
    console.log(`Model default: gemini-1.5-flash`);
});
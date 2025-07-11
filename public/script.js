// ========== KONFIGURASI MEMORI PERCAKAPAN ========== //
const MAX_HISTORY_LENGTH = 20; // Batasi jumlah pesan yang disimpan

// Fungsi untuk memuat percakapan dari localStorage
function loadConversation() {
    const saved = localStorage.getItem('gemini_conversation');
    if (saved) {
        try {
            return JSON.parse(saved);
        } catch (e) {
            console.error("Gagal memuat history:", e);
            return [];
        }
    }
    return [];
}

// Fungsi untuk menyimpan percakapan ke localStorage
function saveConversation(history) {
    try {
        localStorage.setItem('gemini_conversation', JSON.stringify(history));
    } catch (e) {
        console.error("Gagal menyimpan history:", e);
        // Jika localStorage penuh, hapus sebagian history
        if (e.name === 'QuotaExceededError') {
            const reducedHistory = history.slice(-Math.floor(MAX_HISTORY_LENGTH/2));
            localStorage.setItem('gemini_conversation', JSON.stringify(reducedHistory));
        }
    }
}

// Inisialisasi history
let conversationHistory = loadConversation();

// Fungsi untuk merender ulang seluruh history
function renderFullHistory() {
    const chatMessages = document.getElementById('chat-messages');
    chatMessages.innerHTML = ''; // Kosongkan chat
    
    // Tambahkan welcome message jika history kosong
    if (conversationHistory.length === 0) {
        chatMessages.innerHTML = `
            <div class="flex justify-start">
                <div class="flex items-start w-full max-w-4xl">
                    <div class="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center mr-3 bg-gemini-accent text-white">
                        <i class="fas fa-robot"></i>
                    </div>
                    <div class="bg-gray-800/80 p-4 rounded-2xl rounded-tl-none shadow-lg flex-1 message-content">
                        <p>Halo! Saya asisten AI berbasis Gemini. Ada yang bisa saya bantu?</p>
                    </div>
                </div>
            </div>
        `;
        return;
    }
    
    // Render semua pesan dalam history
    conversationHistory.forEach(msg => {
        addMessage(msg.content, msg.role === 'user');
    });
}

// ========== FUNGSI YANG SUDAH ADA (DIMODIFIKASI SEDIKIT) ========== //

// Fungsi untuk menambahkan pesan ke chat (tetap sama)
function addMessage(content, isUser) {
    const chatMessages = document.getElementById('chat-messages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `flex ${isUser ? 'justify-end' : 'justify-start'}`;
    
    const messageContent = document.createElement('div');
    messageContent.className = `flex items-start w-full max-w-4xl ${isUser ? 'flex-row-reverse' : ''}`;
    
    // Avatar
    const avatar = document.createElement('div');
    avatar.className = `flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${isUser ? 'ml-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white' : 'mr-3 bg-gemini-accent text-white'}`;
    avatar.innerHTML = isUser ? '<i class="fas fa-user"></i>' : '<i class="fas fa-robot"></i>';
    
    // Bubble chat
    const textBubble = document.createElement('div');
    textBubble.className = `${isUser ? 'bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-2xl rounded-tr-none' : 'bg-gray-800/80 text-gray-100 rounded-2xl rounded-tl-none'} p-4 shadow-lg flex-1 message-content`;
    
    // Format konten (mengubah **teks** menjadi <strong>teks</strong>, dll)
    const formattedContent = formatMarkdown(content);
    textBubble.innerHTML = formattedContent;
    
    messageContent.appendChild(avatar);
    messageContent.appendChild(textBubble);
    messageDiv.appendChild(messageContent);
    
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Fungsi untuk memformat markdown sederhana (tetap sama)
function formatMarkdown(text) {
    // Bold (**text**)
    let formatted = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    // Italic (*text*)
    // Bold (### text)
    formatted = formatted.replace(/###\s(.*?)\n/g, '<h3>$1</h3>');
    formatted = formatted.replace(/\*(.*?)\*/g, '<em>$1</em>');
    // Lists (• item)
    formatted = formatted.replace(/•\s(.*?)(\n|$)/g, '<li>$1</li>');
    // Line breaks
    formatted = formatted.replace(/\n/g, '<br>');
    // Code blocks (```code```)
    formatted = formatted.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
    // Inline code (`code`)
    formatted = formatted.replace(/`(.*?)`/g, '<code>$1</code>');
    
    return formatted;
}

// Fungsi untuk menampilkan indikator typing (tetap sama)
function showTypingIndicator() {
    const chatMessages = document.getElementById('chat-messages');
    const typingDiv = document.createElement('div');
    typingDiv.id = 'typing-indicator';
    typingDiv.className = 'flex justify-start';
    
    const typingContent = document.createElement('div');
    typingContent.className = 'flex items-start w-full max-w-4xl';
    
    // Avatar bot
    const avatar = document.createElement('div');
    avatar.className = 'flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center mr-3 bg-gemini-accent text-white';
    avatar.innerHTML = '<i class="fas fa-robot"></i>';
    
    // Bubble typing
    const textBubble = document.createElement('div');
    textBubble.className = 'bg-gray-800/80 text-gray-100 rounded-2xl rounded-tl-none p-3 shadow-lg flex items-center';
    
    // Animasi titik typing
    for (let i = 0; i < 3; i++) {
        const dot = document.createElement('div');
        dot.className = 'typing-dot w-2 h-2 bg-gray-300 rounded-full mx-1';
        textBubble.appendChild(dot);
    }
    
    typingContent.appendChild(avatar);
    typingContent.appendChild(textBubble);
    typingDiv.appendChild(typingContent);
    
    chatMessages.appendChild(typingDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Fungsi untuk mengirim pesan ke server (diperbarui untuk support history)
async function sendMessageToServer(message) {
    try {
        // Tambahkan pesan user ke history
        conversationHistory.push({ 
            role: 'user', 
            content: message,
            timestamp: new Date().toISOString()
        });
        
        // Simpan ke localStorage
        saveConversation(conversationHistory);
        
        // Tampilkan indikator typing
        showTypingIndicator();
        
        // Kirim ke server (dengan history terbaru)
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                message,
                history: conversationHistory.slice(-5) // Kirim 5 pesan terakhir
            })
        });

        if (!response.ok) throw new Error('Network response was not ok');

        const data = await response.json();
        
        // Tambahkan respon bot ke history
        conversationHistory.push({ 
            role: 'assistant', 
            content: data.text,
            timestamp: new Date().toISOString()
        });
        
        // Simpan ke localStorage
        saveConversation(conversationHistory);
        
        return data.text;
    } catch (error) {
        console.error('Error:', error);
        return "Maaf, terjadi kesalahan saat memproses permintaan Anda.";
    }
}

// ========== EVENT LISTENERS (DIPERBARUI) ========== //

// Event listener untuk tombol kirim
document.getElementById('send-button').addEventListener('click', async () => {
    const userInput = document.getElementById('user-input');
    const message = userInput.value.trim();
    
    if (message) {
        addMessage(message, true);
        userInput.value = '';
        
        // Kirim ke server dan dapatkan respons
        const botResponse = await sendMessageToServer(message);
        
        // Hapus indikator typing dan tampilkan respons
        document.getElementById('typing-indicator')?.remove();
        addMessage(botResponse, false);
    }
});

// Event listener untuk tombol Enter (tetap sama)
document.getElementById('user-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        document.getElementById('send-button').click();
    }
});

// Event listener untuk tombol clear history
document.getElementById('clear-history').addEventListener('click', () => {
    if (confirm('Apakah Anda yakin ingin menghapus seluruh history percakapan?')) {
        conversationHistory = [];
        saveConversation([]);
        renderFullHistory();
    }
});

// Event listener untuk tombol refresh (diperbarui)
document.querySelector('.fa-sync-alt')?.closest('button')?.addEventListener('click', () => {
    if (confirm('Apakah Anda yakin ingin memulai percakapan baru?')) {
        conversationHistory = [];
        saveConversation([]);
        renderFullHistory();
    }
});

// Saat halaman dimuat, render history yang ada
document.addEventListener('DOMContentLoaded', renderFullHistory);
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }
});

const PORT = process.env.PORT || 3000;
const MSG_FILE = path.join(__dirname, 'messages.json');

app.use(express.json());
app.use(express.static(__dirname)); // Serve file HTML/CSS/JS

// ================= SOCKET.IO (GLOBAL CHAT) =================
let chatHistory = [];

io.on('connection', (socket) => {
  // Kirim history chat ke user baru
  socket.emit('chat history', chatHistory);

  // Terima pesan dari client
  socket.on('chat message', (data) => {
    const newMsg = {
      sender: data.sender,
      text: data.text,
      time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
    };

    chatHistory.push(newMsg);
    if (chatHistory.length > 100) chatHistory.shift(); // Max 100 pesan

    // Broadcast ke semua user
    io.emit('chat message', newMsg);
  });
});

// ================= REST API (ADMIN / CONTACT FORM) =================

// Simpan pesan
app.post('/api/contact', (req, res) => {
  const { name, email, msg } = req.body;
  if (!name || !email || !msg) return res.status(400).json({ error: "Data tidak lengkap" });

  const newMessage = {
    name, email, msg,
    date: new Date().toLocaleString('id-ID')
  };

  let messages = [];
  if (fs.existsSync(MSG_FILE)) {
    messages = JSON.parse(fs.readFileSync(MSG_FILE));
  }
  
  messages.push(newMessage);
  fs.writeFileSync(MSG_FILE, JSON.stringify(messages, null, 2));
  res.json({ success: true });
});

// Ambil pesan (Admin)
app.get('/api/messages', (req, res) => {
  if (fs.existsSync(MSG_FILE)) {
    const data = JSON.parse(fs.readFileSync(MSG_FILE));
    res.json(data);
  } else {
    res.json([]);
  }
});

// Hapus pesan (Admin)
app.delete('/api/messages', (req, res) => {
  if (fs.existsSync(MSG_FILE)) fs.unlinkSync(MSG_FILE);
  res.json({ success: true });
});

// Start Server
server.listen(PORT, () => {
  console.log(`\n🚀 Server RANZHY jalan di: http://localhost:${PORT}`);
  console.log(`Tekan CTRL + C untuk mematikan.\n`);
});
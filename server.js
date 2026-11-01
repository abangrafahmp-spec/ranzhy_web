const express = require('express');
const admin = require('firebase-admin'); 

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '10mb' }));

// ================= KONFIGURASI FIREBASE DARI VERCEL ENVIRONMENT VARIABLES =================
const serviceAccount = {
  "type": "service_account",
  "project_id": process.env.FIREBASE_PROJECT_ID,
  "private_key": process.env.FIREBASE_PRIVATE_KEY ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') : undefined,
  "client_email": process.env.FIREBASE_CLIENT_EMAIL,
};

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://ranzhy-tools-default-rtdb.asia-southeast1.firebasedatabase.app/"
  });
}
const db = admin.database();

// ================= KONFIGURASI KEAMANAN ADMIN =================
const ADMIN_EMAILS = ['angelinaria47@gmail.com', 'admin@ranzhy.my.id', 'ranzhy@ranzhy.my.id'];
const SECRET_KEY = "59R3W-H4RPOMLAH-ALUFOBMQ6-PWHIFNSH-WEBCUKA32"; 

// Helper Firebase
async function getDbData() {
  try {
    const snapshot = await db.ref('ranzhy_app').once('value');
    return snapshot.val() || { tools: [] };
  } catch (e) { return { tools: [] }; }
}
async function saveDbData(data) {
  try { await db.ref('ranzhy_app').set(data); return true; } catch (e) { return false; }
}

// ================= API USER MANAGEMENT =================
function safeEmail(email) { return email.replace(/\./g, '_'); }

app.get('/api/user/:email', async (req, res) => {
  try {
    const email = req.params.email;
    const userRef = db.ref('ranzhy_users/' + safeEmail(email));
    const snapshot = await userRef.once('value');
    let userData = snapshot.val();
    
    const isAdmin = ADMIN_EMAILS.includes(email);
    
    if (!userData) {
      userData = { name: email.split('@')[0], isVerified: false, nameChangeCount: 0, role: '', nameColor: '' };
      await userRef.set(userData);
    }
    
    userData.isAdmin = isAdmin; 
    res.json(userData);
  } catch(e) { res.status(500).json({ error: "Gagal ambil data user" }); }
});

app.post('/api/update-profile', async (req, res) => {
  const { email, newName, newColor, newRole } = req.body;
  if(!email || !newName) return res.status(400).json({ error: "Data tidak lengkap" });

  try {
    const userRef = db.ref('ranzhy_users/' + safeEmail(email));
    const snapshot = await userRef.once('value');
    let userData = snapshot.val() || { isVerified: false, nameChangeCount: 0 };
    
    const isAdmin = ADMIN_EMAILS.includes(email);
    const maxLimit = isAdmin ? 1000 : 1; 

    if (userData.name !== newName && userData.nameChangeCount >= maxLimit) {
      return res.status(403).json({ error: `Batas ganti nama tercapai (Maksimal ${maxLimit}x)` });
    }

    if (userData.name !== newName) {
        userData.nameChangeCount = (userData.nameChangeCount || 0) + 1;
    }

    userData.name = newName;
    
    if (isAdmin) {
        userData.nameColor = newColor || '';
        userData.role = newRole || '';
    }
    
    await userRef.set(userData);
    res.json({ success: true, data: userData });
  } catch(e) { res.status(500).json({ error: "Gagal update profile" }); }
});

app.get('/api/all-users', async (req, res) => {
  try {
    const snapshot = await db.ref('ranzhy_users').once('value');
    res.json(snapshot.val() || {});
  } catch(e) { res.status(500).json({ error: "Gagal ambil users" }); }
});

app.post('/api/toggle-verify', async (req, res) => {
  const { adminEmail, targetEmail } = req.body;
  if(!ADMIN_EMAILS.includes(adminEmail)) return res.status(403).json({ error: "Hanya Admin yang bisa kasih centang!" });

  try {
    const userRef = db.ref('ranzhy_users/' + safeEmail(targetEmail));
    const snapshot = await userRef.once('value');
    let userData = snapshot.val() || { name: targetEmail.split('@')[0], nameChangeCount: 0 };
    userData.isVerified = !userData.isVerified;
    await userRef.set(userData);
    res.json({ success: true, isVerified: userData.isVerified });
  } catch(e) { res.status(500).json({ error: "Gagal toggle verify" }); }
});

app.post('/api/verify-admin', (req, res) => {
  if (req.body.key === SECRET_KEY) res.json({ success: true });
  else res.status(401).json({ success: false });
});

// ================= API TOOLS =================
app.get('/api/data', async (req, res) => { const data = await getDbData(); res.json(data); });

app.post('/api/add-tool', async (req, res) => {
  const { name, desc, image, html } = req.body;
  if(!name || !html) return res.status(400).json({ error: "Data tidak lengkap" });
  const data = await getDbData();
  if (!data.tools) data.tools = [];
  data.tools.push({ id: 't_' + Date.now(), name, desc: desc || 'Tanpa deskripsi', image: image || null, html, isPinned: false });
  const success = await saveDbData(data);
  if(success) res.json({ success: true, data });
  else res.status(500).json({ error: "Gagal simpan" });
});

app.post('/api/edit-tool', async (req, res) => {
  const { id, name, desc, image, html } = req.body;
  const data = await getDbData();
  const toolIndex = data.tools.findIndex(t => t.id === id);
  if(toolIndex !== -1) {
    data.tools[toolIndex].name = name;
    data.tools[toolIndex].desc = desc;
    if (image !== undefined) data.tools[toolIndex].image = image;
    if (html !== undefined) data.tools[toolIndex].html = html;
    
    const success = await saveDbData(data);
    if(success) res.json({ success: true, data });
    else res.status(500).json({ error: "Gagal simpan perubahan" });
  } else {
    res.status(404).json({ error: "Tool tidak ditemukan" });
  }
});

app.post('/api/toggle-pin', async (req, res) => {
  const { id } = req.body;
  const data = await getDbData();
  const toolIndex = data.tools.findIndex(t => t.id === id);
  if(toolIndex !== -1) {
    data.tools[toolIndex].isPinned = !data.tools[toolIndex].isPinned;
    const success = await saveDbData(data);
    if(success) res.json({ success: true, data });
    else res.status(500).json({ error: "Gagal simpan perubahan" });
  } else {
    res.status(404).json({ error: "Tool tidak ditemukan" });
  }
});

app.delete('/api/delete-tool/:id', async (req, res) => {
  const data = await getDbData();
  data.tools = data.tools.filter(t => t.id !== req.params.id);
  await saveDbData(data);
  res.json({ success: true, data });
});

// ================= API GLOBAL CHAT (FIREBASE + 24H RESET) =================
app.get('/api/chat', async (req, res) => {
  try {
    const snapshot = await db.ref('ranzhy_chat').once('value');
    let chatData = snapshot.val() || { messages: [], lastReset: Date.now() };
    
    const now = Date.now();
    const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;

    if (now - chatData.lastReset > TWENTY_FOUR_HOURS) {
      chatData = { messages: [], lastReset: now };
      await db.ref('ranzhy_chat').set(chatData);
    }
    
    res.json({ messages: chatData.messages || [], lastReset: chatData.lastReset });
  } catch (e) {
    res.status(500).json({ error: "Gagal memuat chat" });
  }
});

app.post('/api/chat', async (req, res) => {
  const { sender, text } = req.body;
  if (!sender || !text) return res.status(400).json({ error: "Data kosong" });
  
  try {
    const snapshot = await db.ref('ranzhy_chat').once('value');
    let chatData = snapshot.val() || { messages: [], lastReset: Date.now() };
    
    const now = Date.now();
    if (now - chatData.lastReset > 24 * 60 * 60 * 1000) {
      chatData = { messages: [], lastReset: now };
    }

    chatData.messages.push({ 
      sender, 
      text, 
      time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
    });
    
    if (chatData.messages.length > 100) chatData.messages.shift();
    
    await db.ref('ranzhy_chat').set(chatData);
    res.json({ success: true });
  } catch(e) {
    res.status(500).json({ error: "Gagal kirim chat" });
  }
});

// ================= API RATING & KOMENTAR (FIREBASE + BOT 5 MENIT) =================
app.get('/api/reviews', async (req, res) => {
  try {
    const snapshot = await db.ref('ranzhy_reviews').once('value');
    let reviewsData = snapshot.val() || { list: [], lastBotTime: 0 };
    
    const now = Date.now();
    const FIVE_MINUTES = 5 * 60 * 1000;

    if (now - reviewsData.lastBotTime > FIVE_MINUTES) {
      
      const botNames = ["Budi Santoso", "Siti Rahma", "Andi Pratama", "Dewi Lestari", "Rizky Ramadhan", "Putri Ayu", "Fajar Nugroho", "Indah Permata", "Bayu Saputra", "Nisa Fauziah"];
      const botComments = [
        "Webnya keren banget, sangat membantu!", 
        "Desain modern dan rapi, suka UI-nya.", 
        "Tools-nya lengkap, mantap bro lanjutkan!", 
        "Sangat bermanfaat, terima kasih admin.",
        "Loadingnya cepat dan fiturnya bagus.",
        "Web terbaik yang pernah saya coba.",
        "Keren, semoga makin berkembang ke depannya.",
        "Fitur-fitur barunya sangat berguna."
      ];
      
      const randomName = botNames[Math.floor(Math.random() * botNames.length)];
      const randomComment = botComments[Math.floor(Math.random() * botComments.length)];
      const randomRating = Math.random() > 0.5 ? 5 : 4;

      reviewsData.list.push({
        name: randomName,
        rating: randomRating,
        comment: randomComment,
        date: new Date().toLocaleString('id-ID'),
        isBot: true
      });

      reviewsData.lastBotTime = now;
      await db.ref('ranzhy_reviews').set(reviewsData);
    }
    
    res.json(reviewsData.list.reverse());
  } catch(e) {
    res.status(500).json({ error: "Gagal memuat review" });
  }
});

app.post('/api/reviews', async (req, res) => {
  const { name, rating, comment } = req.body;
  if (!name || !rating || !comment) return res.status(400).json({ error: "Data tidak lengkap" });
  
  try {
    const snapshot = await db.ref('ranzhy_reviews').once('value');
    let reviewsData = snapshot.val() || { list: [], lastBotTime: 0 };
    
    reviewsData.list.push({ 
      name, 
      rating, 
      comment, 
      date: new Date().toLocaleString('id-ID'),
      isBot: false 
    });
    
    await db.ref('ranzhy_reviews').set(reviewsData);
    res.json({ success: true });
  } catch(e) {
    res.status(500).json({ error: "Gagal simpan review" });
  }
});

// ================= API LAINNYA =================
let privateChats = [];
app.get('/api/private-chat', (req, res) => {
  const { user, admin } = req.query;
  if (admin === 'true') res.json(privateChats);
  else res.json(privateChats.filter(c => c.sender === user || c.receiver === user));
});
app.post('/api/private-chat', (req, res) => {
  const { sender, receiver, text } = req.body;
  if (!sender || !receiver || !text) return res.status(400).json({ error: "Data kosong" });
  privateChats.push({ sender, receiver, text, time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) });
  if (privateChats.length > 200) privateChats.shift();
  res.json({ success: true });
});

let messagesList = [];
app.post('/api/contact', (req, res) => {
  const { name, email, msg } = req.body;
  if (!name || !email || !msg) return res.status(400).json({ error: "Data tidak lengkap" });
  messagesList.push({ name, email, msg, date: new Date().toLocaleString('id-ID') });
  res.json({ success: true });
});
app.get('/api/messages', (req, res) => res.json(messagesList));
app.delete('/api/messages', (req, res) => { messagesList = []; res.json({ success: true }); });

if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => console.log(`Lokal jalan di port ${PORT}`));
}
module.exports = app;

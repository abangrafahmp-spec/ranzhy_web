const express = require('express');
const admin = require('firebase-admin'); 

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '10mb' }));

// ================= KONFIGURASI FIREBASE =================
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
async function getBannedWords() {
  try {
    const snapshot = await db.ref('ranzhy_settings/banned_words').once('value');
    return snapshot.val() || [];
  } catch(e) { return []; }
}

app.get('/api/banned-words', async (req, res) => {
  const words = await getBannedWords();
  res.json(words);
});

app.post('/api/banned-words', async (req, res) => {
  const { adminEmail, word } = req.body;
  if (!ADMIN_EMAILS.includes(adminEmail)) return res.status(403).json({ error: "Hanya Admin!" });
  if (!word) return res.status(400).json({ error: "Kata tidak boleh kosong" });

  try {
    const words = await getBannedWords();
    if (!words.includes(word)) {
      words.push(word);
      await db.ref('ranzhy_settings/banned_words').set(words);
    }
    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: "Gagal simpan kata kasar" }); }
});

app.delete('/api/banned-words/:word', async (req, res) => {
  const { adminEmail } = req.body;
  if (!ADMIN_EMAILS.includes(adminEmail)) return res.status(403).json({ error: "Hanya Admin!" });
  
  try {
    let words = await getBannedWords();
    words = words.filter(w => w !== req.params.word);
    await db.ref('ranzhy_settings/banned_words').set(words);
    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: "Gagal hapus kata kasar" }); }
});

app.get('/api/chat', async (req, res) => {
  try {
    const snapshot = await db.ref('ranzhy_chat').once('value');
    let chatData = snapshot.val() || { messages: [], lastReset: Date.now(), mutedUsers: [] };
    
    // Pastikan mutedUsers selalu ada
    if (!chatData.mutedUsers) chatData.mutedUsers = [];

    const now = Date.now();
    const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;

    if (now - chatData.lastReset > TWENTY_FOUR_HOURS) {
      chatData.messages = [];
      chatData.lastReset = now;
      await db.ref('ranzhy_chat').set(chatData);
    }
    
    res.json({ messages: chatData.messages || [], lastReset: chatData.lastReset, mutedUsers: chatData.mutedUsers });
  } catch (e) {
    res.status(500).json({ error: "Gagal memuat chat" });
  }
});

app.post('/api/chat', async (req, res) => {
  let { sender, text } = req.body;
  if (!sender || !text) return res.status(400).json({ error: "Data kosong" });
  
  try {
    const snapshot = await db.ref('ranzhy_chat').once('value');
    let chatData = snapshot.val() || { messages: [], lastReset: Date.now(), mutedUsers: [] };
    if (!chatData.mutedUsers) chatData.mutedUsers = [];

    // CEK APAKAH USER DI-MUTE
    if (chatData.mutedUsers.includes(sender)) {
        return res.status(403).json({ error: "Kamu telah di-mute oleh Admin dan tidak bisa mengirim pesan!" });
    }

    const bannedWords = await getBannedWords();
    bannedWords.forEach(word => {
        const regex = new RegExp(word, 'gi');
        text = text.replace(regex, '***');
    });

    const now = Date.now();
    if (now - chatData.lastReset > 24 * 60 * 60 * 1000) {
      chatData.messages = [];
      chatData.lastReset = now;
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

// API MUTE USER
app.post('/api/chat/mute', async (req, res) => {
    const { adminEmail, targetUser, isMuted } = req.body;
    if (!ADMIN_EMAILS.includes(adminEmail)) return res.status(403).json({ error: "Hanya Admin!" });
    
    try {
        const snapshot = await db.ref('ranzhy_chat').once('value');
        let chatData = snapshot.val() || { messages: [], lastReset: Date.now(), mutedUsers: [] };
        if (!chatData.mutedUsers) chatData.mutedUsers = [];

        if (isMuted) {
            // Unmute
            chatData.mutedUsers = chatData.mutedUsers.filter(u => u !== targetUser);
        } else {
            // Mute
            if (!chatData.mutedUsers.includes(targetUser)) {
                chatData.mutedUsers.push(targetUser);
            }
        }
        await db.ref('ranzhy_chat').set(chatData);
        res.json({ success: true });
    } catch(e) { res.status(500).json({ error: "Gagal mute/unmute" }); }
});

// API CLEAR CHAT
app.post('/api/chat/clear', async (req, res) => {
    const { adminEmail } = req.body;
    if (!ADMIN_EMAILS.includes(adminEmail)) return res.status(403).json({ error: "Hanya Admin!" });
    
    try {
        const snapshot = await db.ref('ranzhy_chat').once('value');
        let chatData = snapshot.val() || { lastReset: Date.now(), mutedUsers: [] };
        chatData.messages = [];
        chatData.lastReset = Date.now();
        await db.ref('ranzhy_chat').set(chatData);
        res.json({ success: true });
    } catch(e) { res.status(500).json({ error: "Gagal clear chat" }); }
});

// ================= API RATING & KOMENTAR =================
app.get('/api/reviews', async (req, res) => {
  try {
    const snapshot = await db.ref('ranzhy_reviews').once('value');
    let reviewsData = snapshot.val() || { list: [], lastBotTime: 0 };
    
    // --- FIX BUG: PASTIKAN SEMUA REVIEW PUNYA ID ---
    let needsSave = false;
    if (!reviewsData.list) reviewsData.list = [];
    reviewsData.list = reviewsData.list.map((r, index) => {
        if (!r.id) {
            r.id = 'rev_fix_' + Date.now() + '_' + index;
            needsSave = true;
        }
        if (r.likes === undefined) r.likes = 0;
        return r;
    });
    if (needsSave) await db.ref('ranzhy_reviews').set(reviewsData);
    // -----------------------------------------------

    const now = Date.now();
    const THREE_MINUTES = 3 * 60 * 1000; // UBAH JADI 3 MENIT

    if (now - (reviewsData.lastBotTime || 0) > THREE_MINUTES) {
      
      // --- BOT REALISTIS DENGAN NAMA LENGKAP ---
      const botNames = [
        "Budi Santoso", "Siti Aminah", "Rizky Pratama", "Dewi Lestari", "Agus Setiawan",
        "Putri Ayu", "Fajar Nugroho", "Indah Permata", "Bayu Saputra", "Nisa Fauziah",
        "Hendra Wijaya", "Rina Marlina", "Dedi Kurniawan", "Sri Wahyuni", "Andi Setiawan",
        "Yuni Astuti", "Eko Prasetyo", "Maya Sari", "Arif Budiman", "Lina Marlina",
        "Taufik Hidayat", "Fitri Handayani", "Gunawan Saputra", "Ratna Sari", "Syarif Hidayatullah",
        "Aisyah Putri", "Bambang Pamungkas", "Citra Kirana", "Dimas Anggara", "Eka Gustiwana",
        "Farhan Maulana", "Gita Savitri", "Iqbal Ramadhan", "Jessica Mila", "Kevin Julio",
        "Lesti Kejora", "Maudy Ayunda", "Nicholas Saputra", "Olla Ramlan", "Pevita Pearce"
      ];
      
      const botComments = [
        "Webnya keren banget, UI/UX nya enak dilihat. Lanjutkan bang!", 
        "Wah nemu web ini dari TikTok, ternyata beneran berguna. Makasih min.",
        "Fitur tool yang kemarin gua pake works bgt, mantap.",
        "Adminnya fast respon bgt di chat, suka ah.",
        "Btw ini web nya pake framework apa ya? Ringan banget soalnya.",
        "Semoga makin rame dan banyak fitur baru nya ya bang.",
        "Bintang 5 buat pelayanan dan toolsnya yang memuaskan.",
        "Awalnya iseng buka, ternyata ada tool yang lagi gua cari. Gokil.",
        "Tolong tambahin fitur dark mode dong min, biar makin mantap.",
        "Saran aja, mungkin bisa nambah fitur buat convert file juga?",
        "Webnya bener-bener ngebantu buat kerjaan harian gua.",
        "Sumpah ini web underrated sih, harusnya lebih rame.",
        "Keren, tampilannya modern dan ga kaku.",
        "Amanah banget ini web, gua rekomendasiin ke temen-temen.",
        "Gila sih ini adminnya, webnya dibikin se-rapi ini.",
        "Mantul banget pokoknya, ga ada kata lain selain keren.",
        "Tool downloadernya ngebut bgt, gak pake lemot.",
        "Udah gua cek semua fiturnya, aman dan gak ada bug.",
        "Bisa request tool AI buat ngeringkes teks gak min?",
        "Desainnya elegan, warnanya pas gak bikin mata sakit.",
        "Ini web wajib sih buat anak kuliahan yang sering dapet tugas.",
        "Awalnya ragu, pas dicoba ternyata beneran bagus.",
        "Bintang 4 dulu dari gua, semoga makin sempurna ke depannya.",
        "Admin ramah, sistemnya gampang dipahami. Top deh!",
        "Ada bug dikit di halaman tool sebelah min, tolong dicek.",
        "Gua udah nyoba tool yang lain, tetep ini yang paling enak dipake.",
        "Terima kasih banyak min, sangat membantu banget ini.",
        "Keren abis, respon web cepet banget gak nge-lag.",
        "Sumpah ini pertama kali gua nemu web sebagus ini.",
        "Fitur-fitur barunya mantul banget min, keep it up!"
      ];
      
      const randomName = botNames[Math.floor(Math.random() * botNames.length)];
      const randomComment = botComments[Math.floor(Math.random() * botComments.length)];
      const randomRating = Math.random() > 0.2 ? 5 : 4; // 80% bintang 5, 20% bintang 4

      reviewsData.list.push({
        id: 'bot_' + Date.now(),
        name: randomName,
        rating: randomRating,
        comment: randomComment,
        date: new Date().toLocaleString('id-ID'),
        isBot: true,
        likes: Math.floor(Math.random() * 15) + 1 // Kasih like random (1-15) biar kelihatan rame
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
      id: 'rev_' + Date.now(),
      name, 
      rating, 
      comment, 
      date: new Date().toLocaleString('id-ID'),
      isBot: false,
      likes: 0
    });
    
    await db.ref('ranzhy_reviews').set(reviewsData);
    res.json({ success: true });
  } catch(e) {
    res.status(500).json({ error: "Gagal simpan review" });
  }
});

// Fitur Admin: Like Review
app.post('/api/reviews/:id/like', async (req, res) => {
  try {
    const snapshot = await db.ref('ranzhy_reviews').once('value');
    let reviewsData = snapshot.val();
    if (!reviewsData || !reviewsData.list) return res.status(404).json({error: "Data tidak ditemukan"});

    const index = reviewsData.list.findIndex(r => r.id === req.params.id);
    if (index !== -1) {
      reviewsData.list[index].likes = (reviewsData.list[index].likes || 0) + 1;
      await db.ref('ranzhy_reviews').set(reviewsData);
      res.json({ success: true });
    } else {
      res.status(404).json({ error: "Review tidak ditemukan" });
    }
  } catch(e) { res.status(500).json({ error: "Gagal like review" }); }
});

// Fitur Admin: Hapus Review (Diubah ke POST biar aman)
app.post('/api/reviews/delete/:id', async (req, res) => {
  const { adminEmail } = req.body;
  if (!ADMIN_EMAILS.includes(adminEmail)) return res.status(403).json({ error: "Hanya Admin yang bisa menghapus!" });

  try {
    const snapshot = await db.ref('ranzhy_reviews').once('value');
    let reviewsData = snapshot.val();
    if (!reviewsData || !reviewsData.list) return res.status(404).json({error: "Data tidak ditemukan"});

    reviewsData.list = reviewsData.list.filter(r => r.id !== req.params.id);
    await db.ref('ranzhy_reviews').set(reviewsData);
    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: "Gagal hapus review" }); }
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

const express = require('express');
const admin = require('firebase-admin'); 

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '10mb' }));

// ================= KONFIGURASI FIREBASE MILIK LU =================
const serviceAccount = {
  "type": "service_account",
  "project_id": "ranzhy-tools",
  "private_key_id": "9cb1c1955cf5b62c00df6fe3ace3dfd2b85af66d",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQDVRBuJQh82tEWi\naBBcT3a4TIrKCkYomdm4SBERn1cs5Nte9sroP4jR8au5boHEqfqAJrL3vtONg5jh\naE2UMkI9hnwjaZoV+TFhGZ7texHSieAxYn4UoDclGztmlR778B86lbkQ3dspFUAa\nW1mw3mCdUZCYXA690z3QrtC595p8hm7Y5QDPiWHSzfO6x4ZYdpxxOsQhuNdlhrMS\n8HsBwFfqxsu6zWQjy8WErEQSFizspcPRNV/RrK5iYMeEf5FS3oUPKg6Gnz39w/Pq\nJE7b5T+SU1Lxbcqjo7rCBXzbWeWj9DGpCm8XDZaD/l1KvWUG5fyqFmFtStVxdvn6\n1/+oYmrLAgMBAAECggEAN9HbSTpS1C0sGr2VJqwv3T4/h3FX+rGGMHtAaHXlydze\n5ETBSDe09oqEUYUwlwqMg/VdG4ZJdf1PSxRTVeovt03XeSdfSsgOGiWsGOmA+TPY\nR+TJLlnfBSnTCt8WHIg1jE57AYSoI+EphZyKZcZW0GZ0a8SQoTPEtrXC8SHzQAsv\nBoDDADBH6u9GWpyGiAqd7lQnfJ/6EPTDUIoME848jww0yEpLKKA8+2DHzs9jxQCD\nMWR6oQHwelRj01f3al7pbZiMf/W2bc9HwXnc5J1bGAj1iT+Uft9f48XlIw5N9aRf\n3V/MKSfhjbsJ+ezWfF0ALBQ39wT3ggdD8LLgSknMdQKBgQD9rAnaBltJYnSohs1z\nsM1OxQ3JeJBtBq1pdYip1VfiIYXQIs/V0I/DtuJXLN7Qzb6Shj26kUXoKZ67w7Hr\nWxuIaOhjo91vAcothCspoihZLqZ+vmNlSOep+DbxIZF/6LSpCp8k2q5BD0nQEBWS\ns0ieHIsrfFOgaFOEHhXSRzWRbwKBgQDXOSRJbs2cGm2WEFjxawPirN5PRqyrdJLE\nbY+gE1LOq259InoqTDqluHsSP7w4XUBrr0bkWclJzZ69n0WkM6WmMbb93Quh0PYe\nHFfz15YG8LySnrN7YhB1D5hQJkoDP5FD5bGr3qnecx835rua0i2xKAv9ZdwD3lE5\nu9qKfQeWZQKBgHsBiElrmaptDoqFy2xVCEkw7m2Kg+YKPd6Merd310S04rE5oDRb\nDMtnjDufa3AuxEFCzP4B4bchL3J3A3hP1nr/++gNFpv0bzhBBbkLg6szHtMIuSPt\nBUD7NpEYqPgwPCJYHzF8xNCRfEZi9kMLoqPgzW9JuzdmP1EqUYSEuSoLAoGAPYCu\nxe1MBFfpCQES6apTKeuMe8sOfNCLQGaurGfZOgXzRP8dOgkemUzmnohoGRNM3Xjx\nIUAnLVf9DOL+27WGmL+MM29/a3ZzXpdq6tuom8MfoCaJ07BqU4lpVT4b2GHJ+UUi\nSKMQl+j9+tOMuOlm9UEka/03qkNVotHz2a9xA6ECgYAJsYX8PoXVlqz3XgEb/9BT\nGmKFMsZ+tpbmJXE1M2v2kuwBVLUjfQP0pKE6IXPuizO/oX9yrxiRW66GDSwSeBam\nrAZnpCSdIImssQr1y3tfqJRhL1W751EkR9hZZx/gc/J33wMC/EnlxRhMcE2RDZW5\nOF6qH2gdbhm5eaMMFSGhNA==\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-fbsvc@ranzhy-tools.iam.gserviceaccount.com",
  "client_id": "108648518056530441507",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40ranzhy-tools.iam.gserviceaccount.com",
  "universe_domain": "googleapis.com"
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
    // Update image & html jika dikirim dari frontend
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

    // Cek apakah sudah 5 menit sejak bot terakhir komentar
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
    
    // Balikin list komentar (terbaru duluan)
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

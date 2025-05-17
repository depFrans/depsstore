// server.js (versi refactor dengan fitur lengkap untuk DepsStore)
const express = require('express');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
const multer = require('multer');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const app = express();
const port = 3000;

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));
app.use('/uploads/bukti', express.static('uploads/bukti'));

// SQLite database setup
const db = new sqlite3.Database('db.sqlite');
db.run(`CREATE TABLE IF NOT EXISTS transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT,
  productId INTEGER,
  date TEXT,
  status TEXT,
  bukti TEXT
)`);

// Produk dummy
const products = {
  1: { name: 'Produk A', price: 3500, file: 'https://example.com/dummy.apk' },
  2: { name: 'Produk B', price: 2000, file: 'https://example.com/dummy2.apk' },
};

// Gmail setup
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'depfransofficial@gmail.com',
    pass: 'ijspxagiilwbhnsk',
  },
});

// Upload bukti transfer
const buktiStorage = multer.diskStorag({
  destination: (req, file, cb) => cb(null, 'uploads/bukti/'),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const uploadBukti = multer({ storage: buktiStorage });

// Routes
app.get('/', (req, res) => {
  let html = '<h2>DepsStore</h2><form method="POST" action="/checkout">Email: <input name="email" type="email" required><br><select name="productId">';
  Object.entries(products).forEach(([id, p]) => {
    html += `<option value="${id}">${p.name} - Rp${p.price}</option>`;
  });
  html += '</select><br><button type="submit">Lanjut Bayar</button></form>';
  res.send(html);
});

app.post('/checkout', (req, res) => {
  const { email, productId } = req.body;
  const product = products[productId];
  if (!product) return res.send('Produk tidak ditemukan.');

  res.send(`
    <h3>Transfer Rp${product.price} ke 1234567890 (DepsStore)</h3>
    <form method="POST" action="/upload-bukti" enctype="multipart/form-data">
      <input type="hidden" name="email" value="${email}">
      <input type="hidden" name="productId" value="${productId}">
      <input type="file" name="bukti" accept="image/*" required><br>
      <button type="submit">Upload Bukti</button>
    </form>
  `);
});

app.post('/upload-bukti', uploadBukti.single('bukti'), (req, res) => {
  const { email, productId } = req.body;
  const buktiPath = `/uploads/bukti/${req.file.filename}`;
  const date = new Date().toISOString();

  db.run(`INSERT INTO transactions (email, productId, date, status, bukti)
          VALUES (?, ?, ?, ?, ?)`,
    [email, productId, date, 'pending', buktiPath],
    () => res.send('Bukti berhasil dikirim! Tunggu konfirmasi admin.')
  );
});

// Admin - Verifikasi
app.get('/verifikasi', (req, res) => {
  db.all(`SELECT * FROM transactions WHERE status = 'pending'`, [], (err, rows) => {
    if (err) return res.send('Gagal ambil data.');

    let html = '<h2>Verifikasi Pembayaran</h2>';
    rows.forEach(row => {
      const p = products[row.productId];
      html += `
        <div style="margin-bottom:20px;">
          <b>${p.name}</b><br>Email: ${row.email}<br>Harga: Rp${p.price}<br>
          <img src="${row.bukti}" width="200"><br>
          <form method="POST" action="/konfirmasi">
            <input type="hidden" name="id" value="${row.id}">
            <button type="submit">Kirim Produk</button>
          </form>
        </div>`;
    });

    res.send(html || 'Tidak ada yang perlu diverifikasi.');
  });
});

app.post('/konfirmasi', (req, res) => {
  const { id } = req.body;
  db.get(`SELECT * FROM transactions WHERE id = ?`, [id], async (err, row) => {
    if (!row) return res.send('Data tidak ditemukan');

    const product = products[row.productId];

    try {
      await transporter.sendMail({
        from: 'DepsStore <EMAIL_KAMU@gmail.com>',
        to: row.email,
        subject: `Produk ${product.name}`,
        text: `Terima kasih. Link download Anda: ${product.file}`
      });

      db.run(`UPDATE transactions SET status = 'selesai' WHERE id = ?`, [id]);
      res.send('Produk telah dikirim.');
    } catch (e) {
      res.send('Gagal kirim email: ' + e.message);
    }
  });
});

app.listen(port, () => console.log(`DepsStore berjalan di http://localhost:${port}`));

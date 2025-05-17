app.get('/riwayat', (req, res) => {
  const emailParam = req.query.email;

  if (!emailParam) {
    return res.send('<p>Mohon masukkan email Anda di URL, contoh: <code>?email=youremail@gmail.com</code></p>');
  }

  let sql = `SELECT * FROM transactions`;
  let params = [];

  // Cek apakah emailParam adalah admin (ganti dengan email kamu sendiri)
  const adminEmail = 'admin@gmail.com';

  if (emailParam !== adminEmail) {
    // Bukan admin, hanya tampilkan transaksi email yang sesuai
    sql += ` WHERE email = ?`;
    params.push(emailParam);
  }
  // Jika admin, tampilkan semua transaksi tanpa filter

  sql += ` ORDER BY id DESC`;

  db.all(sql, params, (err, rows) => {
    if (err) {
      return res.status(500).send('Gagal mengambil data transaksi.');
    }

    // Jika tidak ada transaksi sama sekali
    if (rows.length === 0) {
      return res.send(`<p>Tidak ada riwayat pembelian untuk email: <strong>${emailParam}</strong></p>`);
    }

    // Render halaman riwayat (memanjang per baris)
    let html = `
    <!DOCTYPE html>
    <html lang="id">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Riwayat Penjualan - DepsStore</title>
      <script src="https://cdn.tailwindcss.com"></script>
    </head>
    <body class="bg-gray-100 text-sm">
      <div class="max-w-4xl mx-auto py-10 px-4">
        <h1 class="text-2xl font-bold mb-6 text-center">Riwayat Penjualan</h1>
        <div class="bg-white rounded-md shadow-sm overflow-hidden">
          <div class="grid grid-cols-4 font-bold bg-gray-200 p-3 border-b">
            <div>Produk</div>
            <div>Harga</div>
            <div>Email</div>
            <div>Tanggal</div>
          </div>
    `;

    rows.forEach(row => {
      const product = products[row.productId];
      const date = new Date(row.date).toLocaleString();

      if (product) {
        html += `
          <div class="grid grid-cols-4 border-b p-3">
            <div>${product.name}</div>
            <div>Rp${product.price.toLocaleString()}</div>
            <div>${row.email}</div>
            <div>${date}</div>
          </div>
        `;
      }
    });

    html += `
        </div>
        <div class="text-center mt-6">
          <a href="/" class="text-blue-600 underline">Kembali ke Halaman Utama</a>
        </div>
      </div>
    </body>
    </html>
    `;

    res.send(html);
  });
});
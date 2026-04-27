-- ═══════════════════════════════════════════════════════════════
-- rental_ps schema — 3NF compliant
-- Run this in Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════

-- Pelanggan
CREATE TABLE IF NOT EXISTS pelanggan (
  id_pelanggan SERIAL PRIMARY KEY,
  nama_pelanggan VARCHAR(100) NOT NULL,
  no_hp VARCHAR(20) UNIQUE NOT NULL,
  alamat TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pegawai
CREATE TABLE IF NOT EXISTS pegawai (
  id_pegawai SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  nama_pegawai VARCHAR(100) NOT NULL,
  jabatan VARCHAR(50) DEFAULT 'staff',
  no_hp VARCHAR(20),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Device (PS + PC merged)
CREATE TABLE IF NOT EXISTS device (
  id_device SERIAL PRIMARY KEY,
  nama_device VARCHAR(100) NOT NULL,
  tipe_device VARCHAR(10) NOT NULL CHECK (tipe_device IN ('PS', 'PC')),
  status_device VARCHAR(20) DEFAULT 'tersedia' CHECK (status_device IN ('tersedia', 'dipakai', 'maintenance')),
  harga_per_jam INTEGER NOT NULL,
  spesifikasi TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Menu (food/drink)
CREATE TABLE IF NOT EXISTS menu (
  id_menu SERIAL PRIMARY KEY,
  nama_menu VARCHAR(100) NOT NULL,
  harga INTEGER NOT NULL,
  kategori VARCHAR(50) DEFAULT 'makanan',
  tersedia BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Paket Sewa
CREATE TABLE IF NOT EXISTS paket_sewa (
  id_paket SERIAL PRIMARY KEY,
  nama_paket VARCHAR(100) NOT NULL,
  durasi INTEGER NOT NULL, -- in hours
  harga_paket INTEGER NOT NULL,
  deskripsi TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Transaksi (central table)
CREATE TABLE IF NOT EXISTS transaksi (
  id_transaksi SERIAL PRIMARY KEY,
  id_pelanggan INTEGER NOT NULL REFERENCES pelanggan(id_pelanggan),
  id_device INTEGER NOT NULL REFERENCES device(id_device),
  id_pegawai INTEGER REFERENCES pegawai(id_pegawai),
  waktu_mulai TIMESTAMPTZ NOT NULL,
  waktu_selesai TIMESTAMPTZ,
  durasi_jam INTEGER NOT NULL,
  total_harga INTEGER NOT NULL,
  status_transaksi VARCHAR(20) DEFAULT 'aktif' CHECK (status_transaksi IN ('aktif', 'selesai', 'batal')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Detail Transaksi (menu items per transaction — 3NF)
CREATE TABLE IF NOT EXISTS detail_transaksi (
  id_detail SERIAL PRIMARY KEY,
  id_transaksi INTEGER NOT NULL REFERENCES transaksi(id_transaksi) ON DELETE CASCADE,
  id_menu INTEGER NOT NULL REFERENCES menu(id_menu),
  jumlah INTEGER NOT NULL DEFAULT 1,
  subtotal INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pembayaran (separate from transaksi — 3NF)
CREATE TABLE IF NOT EXISTS pembayaran (
  id_pembayaran SERIAL PRIMARY KEY,
  id_transaksi INTEGER NOT NULL REFERENCES transaksi(id_transaksi),
  total_bayar INTEGER NOT NULL,
  metode_pembayaran VARCHAR(30) NOT NULL CHECK (metode_pembayaran IN ('cash', 'transfer', 'ewallet', 'qris')),
  waktu_bayar TIMESTAMPTZ DEFAULT NOW(),
  status_pembayaran VARCHAR(20) DEFAULT 'lunas' CHECK (status_pembayaran IN ('lunas', 'pending', 'gagal')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Transaksi Paket (bridge table)
CREATE TABLE IF NOT EXISTS transaksi_paket (
  id SERIAL PRIMARY KEY,
  id_transaksi INTEGER NOT NULL REFERENCES transaksi(id_transaksi) ON DELETE CASCADE,
  id_paket INTEGER NOT NULL REFERENCES paket_sewa(id_paket),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════
-- Indexes for query performance
-- ═══════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_device_status ON device(status_device);
CREATE INDEX IF NOT EXISTS idx_transaksi_pelanggan ON transaksi(id_pelanggan);
CREATE INDEX IF NOT EXISTS idx_transaksi_device ON transaksi(id_device);
CREATE INDEX IF NOT EXISTS idx_transaksi_status ON transaksi(status_transaksi);
CREATE INDEX IF NOT EXISTS idx_transaksi_waktu ON transaksi(waktu_mulai);
CREATE INDEX IF NOT EXISTS idx_pembayaran_transaksi ON pembayaran(id_transaksi);
CREATE INDEX IF NOT EXISTS idx_pembayaran_waktu ON pembayaran(waktu_bayar);
CREATE INDEX IF NOT EXISTS idx_detail_transaksi ON detail_transaksi(id_transaksi);

-- ═══════════════════════════════════════════════════════════════
-- Seed data
-- ═══════════════════════════════════════════════════════════════

INSERT INTO device (nama_device, tipe_device, harga_per_jam, spesifikasi) VALUES
  ('PS5 - Station 1', 'PS', 15000, 'PS5 Digital Edition, 2 Controller'),
  ('PS5 - Station 2', 'PS', 15000, 'PS5 Disc Edition, 2 Controller'),
  ('PS4 - Station 3', 'PS', 10000, 'PS4 Slim, 2 Controller'),
  ('PS4 - Station 4', 'PS', 10000, 'PS4 Pro, 2 Controller'),
  ('PC Gaming 1', 'PC', 12000, 'RTX 4060, i5-13400F, 16GB RAM'),
  ('PC Gaming 2', 'PC', 12000, 'RTX 4060, Ryzen 5 5600, 16GB RAM'),
  ('PC Gaming 3', 'PC', 15000, 'RTX 4070, i7-13700F, 32GB RAM'),
  ('PC Standard 1', 'PC', 8000, 'GTX 1650, i3-12100F, 8GB RAM')
ON CONFLICT DO NOTHING;

INSERT INTO menu (nama_menu, harga, kategori) VALUES
  ('Indomie Goreng', 8000, 'makanan'),
  ('Indomie Kuah', 8000, 'makanan'),
  ('Nasi Goreng', 15000, 'makanan'),
  ('Kentang Goreng', 12000, 'makanan'),
  ('Es Teh Manis', 5000, 'minuman'),
  ('Es Jeruk', 7000, 'minuman'),
  ('Kopi Susu', 10000, 'minuman'),
  ('Air Mineral', 4000, 'minuman'),
  ('Pop Mie', 7000, 'makanan'),
  ('Roti Bakar', 10000, 'makanan')
ON CONFLICT DO NOTHING;

INSERT INTO paket_sewa (nama_paket, durasi, harga_paket, deskripsi) VALUES
  ('Paket Hemat 3 Jam', 3, 35000, 'Main 3 jam + gratis 1 air mineral'),
  ('Paket Marathon 5 Jam', 5, 55000, 'Main 5 jam + gratis 1 indomie + 1 es teh'),
  ('Paket Full Day 8 Jam', 8, 80000, 'Main 8 jam + gratis 2 indomie + 2 minuman')
ON CONFLICT DO NOTHING;

INSERT INTO pegawai (username, password, nama_pegawai, jabatan, no_hp) VALUES
  ('admin', 'admin123', 'Admin Utama', 'admin', '081234567890'),
  ('staff', 'staff123', 'Staff 1', 'staff', '081234567891')
ON CONFLICT DO NOTHING;

-- ═══════════════════════════════════════════════════════════════
-- RLS Policies (for Supabase — permissive for this project)
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE pelanggan ENABLE ROW LEVEL SECURITY;
ALTER TABLE pegawai ENABLE ROW LEVEL SECURITY;
ALTER TABLE device ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu ENABLE ROW LEVEL SECURITY;
ALTER TABLE paket_sewa ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaksi ENABLE ROW LEVEL SECURITY;
ALTER TABLE detail_transaksi ENABLE ROW LEVEL SECURITY;
ALTER TABLE pembayaran ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaksi_paket ENABLE ROW LEVEL SECURITY;

-- Allow all operations for anon (midterm project — no auth)
CREATE POLICY "allow_all" ON pelanggan FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON pegawai FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON device FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON menu FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON paket_sewa FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON transaksi FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON detail_transaksi FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON pembayaran FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON transaksi_paket FOR ALL USING (true) WITH CHECK (true);

-- Migration 0001 — buat tabel orders untuk Cloudflare D1 (gorixo_db)

CREATE TABLE IF NOT EXISTS orders (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  business_name   TEXT NOT NULL,
  description     TEXT,
  whatsapp_number TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'Isi Data'
                    CHECK (status IN (
                      'Isi Data',
                      'Checkout',
                      'Menunggu Pembayaran',
                      'Siap Dieksekusi'
                    )),
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_orders_status ON orders (status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders (created_at);

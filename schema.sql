-- Gorixo D1 schema — database: gorixo_db
-- Jalankan: wrangler d1 execute gorixo_db --file=./schema.sql

DROP TABLE IF EXISTS orders;

CREATE TABLE orders (
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

CREATE INDEX idx_orders_status ON orders (status);
CREATE INDEX idx_orders_created_at ON orders (created_at);

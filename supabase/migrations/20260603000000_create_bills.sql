-- SplitEat v3: bills table + RLS

CREATE TABLE bills (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_id      UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  data         JSONB       NOT NULL
);

CREATE INDEX idx_bills_user_id    ON bills(user_id);
CREATE INDEX idx_bills_created_at ON bills(created_at DESC);

ALTER TABLE bills ENABLE ROW LEVEL SECURITY;

-- Cualquiera puede insertar (anónimos también)
CREATE POLICY "insert_any" ON bills
  FOR INSERT WITH CHECK (true);

-- Usuarios autenticados ven solo sus propias facturas
CREATE POLICY "select_own" ON bills
  FOR SELECT USING (auth.uid() = user_id);

-- Facturas anónimas son legibles por cualquiera (para compartir por WhatsApp)
CREATE POLICY "select_anonymous" ON bills
  FOR SELECT USING (user_id IS NULL);

CREATE TABLE IF NOT EXISTS t_p51906656_telegram_mobile_conn.sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id BIGINT NOT NULL REFERENCES t_p51906656_telegram_mobile_conn.users(id),
    token VARCHAR(128) UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '30 days'
);

CREATE TABLE IF NOT EXISTS t_p51906656_telegram_mobile_conn.otp_codes (
    id BIGSERIAL PRIMARY KEY,
    phone VARCHAR(20) NOT NULL,
    code VARCHAR(6) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '10 minutes',
    used BOOLEAN DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_sessions_token ON t_p51906656_telegram_mobile_conn.sessions(token);
CREATE INDEX IF NOT EXISTS idx_otp_phone ON t_p51906656_telegram_mobile_conn.otp_codes(phone, expires_at);

CREATE TABLE IF NOT EXISTS t_p51906656_telegram_mobile_conn.messages (
    id BIGSERIAL PRIMARY KEY,
    chat_type VARCHAR(20) NOT NULL,
    chat_id BIGINT NOT NULL,
    sender_id BIGINT REFERENCES t_p51906656_telegram_mobile_conn.users(id),
    msg_text TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    edited_at TIMESTAMPTZ,
    is_hidden BOOLEAN DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_messages_chat ON t_p51906656_telegram_mobile_conn.messages(chat_type, chat_id, created_at DESC);

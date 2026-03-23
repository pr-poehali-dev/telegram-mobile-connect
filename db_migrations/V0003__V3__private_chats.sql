CREATE TABLE IF NOT EXISTS t_p51906656_telegram_mobile_conn.private_chats (
    id BIGSERIAL PRIMARY KEY,
    user1_id BIGINT NOT NULL REFERENCES t_p51906656_telegram_mobile_conn.users(id),
    user2_id BIGINT NOT NULL REFERENCES t_p51906656_telegram_mobile_conn.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user1_id, user2_id),
    CHECK (user1_id < user2_id)
);

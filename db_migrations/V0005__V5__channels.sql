CREATE TABLE IF NOT EXISTS t_p51906656_telegram_mobile_conn.channels (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    username VARCHAR(50) UNIQUE,
    description TEXT,
    avatar_url TEXT,
    is_public BOOLEAN DEFAULT TRUE,
    owner_id BIGINT NOT NULL REFERENCES t_p51906656_telegram_mobile_conn.users(id),
    subscribers_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS t_p51906656_telegram_mobile_conn.channel_subscribers (
    channel_id BIGINT NOT NULL REFERENCES t_p51906656_telegram_mobile_conn.channels(id),
    user_id BIGINT NOT NULL REFERENCES t_p51906656_telegram_mobile_conn.users(id),
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (channel_id, user_id)
);

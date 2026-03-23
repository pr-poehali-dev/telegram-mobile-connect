CREATE TABLE IF NOT EXISTS t_p51906656_telegram_mobile_conn.groups (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    avatar_url TEXT,
    is_public BOOLEAN DEFAULT FALSE,
    invite_link VARCHAR(64) UNIQUE,
    owner_id BIGINT NOT NULL REFERENCES t_p51906656_telegram_mobile_conn.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS t_p51906656_telegram_mobile_conn.group_members (
    group_id BIGINT NOT NULL REFERENCES t_p51906656_telegram_mobile_conn.groups(id),
    user_id BIGINT NOT NULL REFERENCES t_p51906656_telegram_mobile_conn.users(id),
    role VARCHAR(20) DEFAULT 'member',
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (group_id, user_id)
);

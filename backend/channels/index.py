"""Каналы: создание публичных/приватных, подписка, публикация постов."""
import json
import os
import psycopg2

SCHEMA = os.environ.get("MAIN_DB_SCHEMA", "t_p51906656_telegram_mobile_conn")
CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-User-Id, X-Auth-Token, X-Session-Id",
}


def get_db():
    return psycopg2.connect(os.environ["DATABASE_URL"])


def ok(data):
    return {"statusCode": 200, "headers": {**CORS, "Content-Type": "application/json"}, "body": json.dumps(data, default=str)}


def err(msg, code=400):
    return {"statusCode": code, "headers": {**CORS, "Content-Type": "application/json"}, "body": json.dumps({"error": msg})}


def get_user_id_from_token(token, conn):
    cur = conn.cursor()
    cur.execute(
        f"SELECT user_id FROM {SCHEMA}.sessions WHERE token=%s AND expires_at > NOW()",
        (token,)
    )
    row = cur.fetchone()
    cur.close()
    return row[0] if row else None


def handler(event: dict, context) -> dict:
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    path = event.get("path", "")
    method = event.get("httpMethod", "")
    headers = event.get("headers", {}) or {}
    token = headers.get("X-Authorization", "").replace("Bearer ", "").strip()

    if not token:
        return err("Требуется авторизация", 401)

    conn = get_db()
    user_id = get_user_id_from_token(token, conn)
    if not user_id:
        conn.close()
        return err("Недействительный токен", 401)

    # GET / — каналы пользователя (на которые подписан)
    if path == "/" or path == "" and method == "GET":
        cur = conn.cursor()
        cur.execute(
            f"""SELECT c.id, c.name, c.username, c.description, c.avatar_url,
                       c.is_public, c.subscribers_count,
                       (SELECT msg_text FROM {SCHEMA}.messages m WHERE m.chat_type='channel' AND m.chat_id=c.id ORDER BY m.created_at DESC LIMIT 1) as last_post
                FROM {SCHEMA}.channels c
                JOIN {SCHEMA}.channel_subscribers cs ON cs.channel_id=c.id
                WHERE cs.user_id=%s
                ORDER BY c.created_at DESC""",
            (user_id,)
        )
        rows = cur.fetchall()
        cur.close()
        conn.close()
        return ok([{
            "id": r[0], "name": r[1], "username": r[2], "description": r[3],
            "avatar_url": r[4], "is_public": r[5], "subscribers_count": r[6], "last_post": r[7]
        } for r in rows])

    # POST / — создать канал
    if (path == "/" or path == "") and method == "POST":
        body = json.loads(event.get("body") or "{}")
        name = body.get("name", "").strip()
        username = body.get("username", "").strip() or None
        description = body.get("description", "")
        is_public = bool(body.get("is_public", True))
        if not name:
            conn.close()
            return err("Укажите название канала")
        cur = conn.cursor()
        cur.execute(
            f"INSERT INTO {SCHEMA}.channels (name, username, description, is_public, owner_id) VALUES (%s, %s, %s, %s, %s) RETURNING id",
            (name, username, description, is_public, user_id)
        )
        channel_id = cur.fetchone()[0]
        cur.execute(f"INSERT INTO {SCHEMA}.channel_subscribers (channel_id, user_id) VALUES (%s, %s)", (channel_id, user_id))
        conn.commit()
        cur.close()
        conn.close()
        return ok({"channel_id": channel_id})

    # POST /subscribe — подписаться на канал
    if path.endswith("/subscribe") and method == "POST":
        body = json.loads(event.get("body") or "{}")
        channel_id = body.get("channel_id")
        if not channel_id:
            conn.close()
            return err("Укажите channel_id")
        cur = conn.cursor()
        cur.execute(
            f"INSERT INTO {SCHEMA}.channel_subscribers (channel_id, user_id) VALUES (%s, %s) ON CONFLICT DO NOTHING",
            (channel_id, user_id)
        )
        cur.execute(
            f"UPDATE {SCHEMA}.channels SET subscribers_count = (SELECT COUNT(*) FROM {SCHEMA}.channel_subscribers WHERE channel_id=%s) WHERE id=%s",
            (channel_id, channel_id)
        )
        conn.commit()
        cur.close()
        conn.close()
        return ok({"message": "Подписка оформлена"})

    # GET /explore — публичные каналы для поиска
    if path.endswith("/explore") and method == "GET":
        qs = event.get("queryStringParameters") or {}
        q = qs.get("q", "")
        cur = conn.cursor()
        cur.execute(
            f"""SELECT c.id, c.name, c.username, c.description, c.avatar_url, c.subscribers_count,
                       EXISTS(SELECT 1 FROM {SCHEMA}.channel_subscribers cs WHERE cs.channel_id=c.id AND cs.user_id=%s) as is_subscribed
                FROM {SCHEMA}.channels c
                WHERE c.is_public=TRUE AND (c.name ILIKE %s OR c.username ILIKE %s)
                ORDER BY c.subscribers_count DESC
                LIMIT 30""",
            (user_id, f"%{q}%", f"%{q}%")
        )
        rows = cur.fetchall()
        cur.close()
        conn.close()
        return ok([{
            "id": r[0], "name": r[1], "username": r[2], "description": r[3],
            "avatar_url": r[4], "subscribers_count": r[5], "is_subscribed": r[6]
        } for r in rows])

    conn.close()
    return err("Маршрут не найден", 404)

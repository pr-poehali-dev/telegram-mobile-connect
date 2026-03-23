"""Приватные чаты и группы: список, создание, сообщения."""
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

    # GET /private — список приватных чатов
    if path.endswith("/private") and method == "GET":
        cur = conn.cursor()
        cur.execute(
            f"""SELECT pc.id,
                       CASE WHEN pc.user1_id=%s THEN u2.id ELSE u1.id END as peer_id,
                       CASE WHEN pc.user1_id=%s THEN u2.display_name ELSE u1.display_name END as peer_name,
                       CASE WHEN pc.user1_id=%s THEN u2.username ELSE u1.username END as peer_username,
                       CASE WHEN pc.user1_id=%s THEN u2.avatar_url ELSE u1.avatar_url END as peer_avatar,
                       (SELECT msg_text FROM {SCHEMA}.messages m
                        WHERE m.chat_type='private' AND m.chat_id=pc.id AND m.is_hidden=FALSE
                        ORDER BY m.created_at DESC LIMIT 1) as last_msg,
                       (SELECT created_at FROM {SCHEMA}.messages m
                        WHERE m.chat_type='private' AND m.chat_id=pc.id AND m.is_hidden=FALSE
                        ORDER BY m.created_at DESC LIMIT 1) as last_time
                FROM {SCHEMA}.private_chats pc
                JOIN {SCHEMA}.users u1 ON u1.id = pc.user1_id
                JOIN {SCHEMA}.users u2 ON u2.id = pc.user2_id
                WHERE pc.user1_id=%s OR pc.user2_id=%s
                ORDER BY last_time DESC NULLS LAST""",
            (user_id, user_id, user_id, user_id, user_id, user_id)
        )
        rows = cur.fetchall()
        cur.close()
        conn.close()
        return ok([{
            "id": r[0], "peer_id": r[1], "peer_name": r[2],
            "peer_username": r[3], "peer_avatar": r[4],
            "last_message": r[5], "last_time": str(r[6]) if r[6] else None
        } for r in rows])

    # POST /private — начать чат с пользователем
    if path.endswith("/private") and method == "POST":
        body = json.loads(event.get("body") or "{}")
        peer_id = body.get("peer_id")
        if not peer_id or peer_id == user_id:
            conn.close()
            return err("Неверный пользователь")
        u1, u2 = (min(user_id, peer_id), max(user_id, peer_id))
        cur = conn.cursor()
        cur.execute(
            f"INSERT INTO {SCHEMA}.private_chats (user1_id, user2_id) VALUES (%s, %s) ON CONFLICT DO NOTHING RETURNING id",
            (u1, u2)
        )
        row = cur.fetchone()
        if not row:
            cur.execute(f"SELECT id FROM {SCHEMA}.private_chats WHERE user1_id=%s AND user2_id=%s", (u1, u2))
            row = cur.fetchone()
        conn.commit()
        cur.close()
        conn.close()
        return ok({"chat_id": row[0]})

    # GET /messages?chat_type=private&chat_id=1
    if path.endswith("/messages") and method == "GET":
        qs = event.get("queryStringParameters") or {}
        chat_type = qs.get("chat_type", "private")
        chat_id = qs.get("chat_id")
        if not chat_id:
            conn.close()
            return err("Укажите chat_id")
        cur = conn.cursor()
        cur.execute(
            f"""SELECT m.id, m.sender_id, u.display_name, u.avatar_url, m.msg_text, m.created_at
                FROM {SCHEMA}.messages m
                LEFT JOIN {SCHEMA}.users u ON u.id = m.sender_id
                WHERE m.chat_type=%s AND m.chat_id=%s AND m.is_hidden=FALSE
                ORDER BY m.created_at ASC
                LIMIT 100""",
            (chat_type, int(chat_id))
        )
        rows = cur.fetchall()
        cur.close()
        conn.close()
        return ok([{
            "id": r[0], "sender_id": r[1], "sender_name": r[2],
            "sender_avatar": r[3], "text": r[4], "created_at": str(r[5])
        } for r in rows])

    # POST /messages — отправить сообщение
    if path.endswith("/messages") and method == "POST":
        body = json.loads(event.get("body") or "{}")
        chat_type = body.get("chat_type", "private")
        chat_id = body.get("chat_id")
        text = body.get("text", "").strip()
        if not chat_id or not text:
            conn.close()
            return err("Укажите chat_id и text")
        cur = conn.cursor()
        cur.execute(
            f"INSERT INTO {SCHEMA}.messages (chat_type, chat_id, sender_id, msg_text) VALUES (%s, %s, %s, %s) RETURNING id, created_at",
            (chat_type, chat_id, user_id, text)
        )
        row = cur.fetchone()
        conn.commit()
        cur.close()
        conn.close()
        return ok({"id": row[0], "created_at": str(row[1])})

    # GET /groups — список групп пользователя
    if path.endswith("/groups") and method == "GET":
        cur = conn.cursor()
        cur.execute(
            f"""SELECT g.id, g.name, g.description, g.avatar_url, g.is_public,
                       (SELECT COUNT(*) FROM {SCHEMA}.group_members gm WHERE gm.group_id=g.id) as member_count,
                       (SELECT msg_text FROM {SCHEMA}.messages m WHERE m.chat_type='group' AND m.chat_id=g.id ORDER BY m.created_at DESC LIMIT 1) as last_msg
                FROM {SCHEMA}.groups g
                JOIN {SCHEMA}.group_members gm ON gm.group_id=g.id
                WHERE gm.user_id=%s
                ORDER BY g.created_at DESC""",
            (user_id,)
        )
        rows = cur.fetchall()
        cur.close()
        conn.close()
        return ok([{
            "id": r[0], "name": r[1], "description": r[2], "avatar_url": r[3],
            "is_public": r[4], "member_count": r[5], "last_message": r[6]
        } for r in rows])

    # POST /groups — создать группу
    if path.endswith("/groups") and method == "POST":
        body = json.loads(event.get("body") or "{}")
        name = body.get("name", "").strip()
        description = body.get("description", "")
        is_public = bool(body.get("is_public", False))
        if not name:
            conn.close()
            return err("Укажите название группы")
        import secrets as _s
        invite_link = _s.token_urlsafe(8)
        cur = conn.cursor()
        cur.execute(
            f"INSERT INTO {SCHEMA}.groups (name, description, is_public, invite_link, owner_id) VALUES (%s, %s, %s, %s, %s) RETURNING id",
            (name, description, is_public, invite_link, user_id)
        )
        group_id = cur.fetchone()[0]
        cur.execute(f"INSERT INTO {SCHEMA}.group_members (group_id, user_id, role) VALUES (%s, %s, 'owner')", (group_id, user_id))
        conn.commit()
        cur.close()
        conn.close()
        return ok({"group_id": group_id, "invite_link": invite_link})

    conn.close()
    return err("Маршрут не найден", 404)

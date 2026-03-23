"""Профиль пользователя: получение, обновление, загрузка аватара."""
import json
import os
import base64
import psycopg2
import boto3

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


def get_user_from_token(token, conn):
    cur = conn.cursor()
    cur.execute(
        f"""SELECT u.id, u.phone, u.display_name, u.username, u.bio, u.age, u.birth_date, u.avatar_url
            FROM {SCHEMA}.sessions s
            JOIN {SCHEMA}.users u ON u.id = s.user_id
            WHERE s.token=%s AND s.expires_at > NOW()""",
        (token,)
    )
    row = cur.fetchone()
    cur.close()
    return row


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
    user = get_user_from_token(token, conn)
    if not user:
        conn.close()
        return err("Недействительный токен", 401)

    user_id = user[0]

    # GET / — получить свой профиль
    if method == "GET":
        conn.close()
        return ok({
            "id": user[0],
            "phone": user[1],
            "display_name": user[2],
            "username": user[3],
            "bio": user[4],
            "age": user[5],
            "birth_date": str(user[6]) if user[6] else None,
            "avatar_url": user[7],
        })

    # PUT / — обновить профиль
    if method == "PUT":
        body = json.loads(event.get("body") or "{}")
        fields = []
        values = []
        allowed = ["display_name", "username", "bio", "age", "birth_date"]
        for f in allowed:
            if f in body:
                fields.append(f"{f}=%s")
                values.append(body[f])
        if not fields:
            conn.close()
            return err("Нет данных для обновления")

        values.append(user_id)
        cur = conn.cursor()
        cur.execute(
            f"UPDATE {SCHEMA}.users SET {', '.join(fields)}, updated_at=NOW() WHERE id=%s",
            values
        )
        conn.commit()
        cur.close()
        conn.close()
        return ok({"message": "Профиль обновлён"})

    # POST /avatar — загрузить аватар (base64)
    if path.endswith("/avatar") and method == "POST":
        body = json.loads(event.get("body") or "{}")
        data_b64 = body.get("image")
        content_type = body.get("content_type", "image/jpeg")
        if not data_b64:
            conn.close()
            return err("Нет изображения")

        img_bytes = base64.b64decode(data_b64)
        ext = "jpg" if "jpeg" in content_type else content_type.split("/")[-1]
        key = f"avatars/{user_id}.{ext}"

        s3 = boto3.client(
            "s3",
            endpoint_url="https://bucket.poehali.dev",
            aws_access_key_id=os.environ["AWS_ACCESS_KEY_ID"],
            aws_secret_access_key=os.environ["AWS_SECRET_ACCESS_KEY"],
        )
        s3.put_object(Bucket="files", Key=key, Body=img_bytes, ContentType=content_type)
        cdn_url = f"https://cdn.poehali.dev/projects/{os.environ['AWS_ACCESS_KEY_ID']}/bucket/{key}"

        cur = conn.cursor()
        cur.execute(f"UPDATE {SCHEMA}.users SET avatar_url=%s, updated_at=NOW() WHERE id=%s", (cdn_url, user_id))
        conn.commit()
        cur.close()
        conn.close()
        return ok({"avatar_url": cdn_url})

    # GET /user/{id} — получить профиль другого пользователя
    if path.endswith("/search") and method == "GET":
        qs = event.get("queryStringParameters") or {}
        q = qs.get("q", "").strip()
        cur = conn.cursor()
        cur.execute(
            f"""SELECT id, display_name, username, avatar_url, bio
                FROM {SCHEMA}.users
                WHERE (display_name ILIKE %s OR username ILIKE %s) AND id != %s
                LIMIT 20""",
            (f"%{q}%", f"%{q}%", user_id)
        )
        rows = cur.fetchall()
        cur.close()
        conn.close()
        return ok([{"id": r[0], "display_name": r[1], "username": r[2], "avatar_url": r[3], "bio": r[4]} for r in rows])

    conn.close()
    return err("Маршрут не найден", 404)

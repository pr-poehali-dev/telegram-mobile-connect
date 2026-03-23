"""Аутентификация: отправка OTP, верификация, регистрация/вход по номеру телефона."""
import json
import os
import random
import secrets
import string
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


def handler(event: dict, context) -> dict:
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    path = event.get("path", "")
    method = event.get("httpMethod", "")
    body = json.loads(event.get("body") or "{}")

    # POST /send-otp — отправить код подтверждения
    if path.endswith("/send-otp") and method == "POST":
        phone = body.get("phone", "").strip()
        if not phone or len(phone) < 10:
            return err("Неверный номер телефона")
        code = "".join(random.choices(string.digits, k=6))
        conn = get_db()
        cur = conn.cursor()
        cur.execute(
            f"INSERT INTO {SCHEMA}.otp_codes (phone, code) VALUES (%s, %s)",
            (phone, code)
        )
        conn.commit()
        cur.close()
        conn.close()
        # В реальном проекте здесь отправляется СМС
        # Для демо — возвращаем код в ответе (только для разработки)
        return ok({"message": "Код отправлен", "demo_code": code})

    # POST /verify-otp — проверить код и войти/зарегистрироваться
    if path.endswith("/verify-otp") and method == "POST":
        phone = body.get("phone", "").strip()
        code = body.get("code", "").strip()
        display_name = body.get("display_name", "").strip()

        if not phone or not code:
            return err("Укажите телефон и код")

        conn = get_db()
        cur = conn.cursor()

        cur.execute(
            f"""SELECT id FROM {SCHEMA}.otp_codes
                WHERE phone=%s AND code=%s AND used=FALSE AND expires_at > NOW()
                ORDER BY created_at DESC LIMIT 1""",
            (phone, code)
        )
        otp = cur.fetchone()
        if not otp:
            cur.close()
            conn.close()
            return err("Неверный или истёкший код")

        cur.execute(f"UPDATE {SCHEMA}.otp_codes SET used=TRUE WHERE id=%s", (otp[0],))

        cur.execute(f"SELECT id, display_name, username, avatar_url, bio, age, birth_date FROM {SCHEMA}.users WHERE phone=%s", (phone,))
        user = cur.fetchone()

        is_new = False
        if not user:
            if not display_name:
                display_name = f"User{random.randint(1000,9999)}"
            cur.execute(
                f"INSERT INTO {SCHEMA}.users (phone, display_name) VALUES (%s, %s) RETURNING id, display_name, username, avatar_url, bio, age, birth_date",
                (phone, display_name)
            )
            user = cur.fetchone()
            is_new = True

        user_id = user[0]
        token = secrets.token_hex(32)
        cur.execute(
            f"INSERT INTO {SCHEMA}.sessions (user_id, token) VALUES (%s, %s)",
            (user_id, token)
        )
        conn.commit()
        cur.close()
        conn.close()

        return ok({
            "token": token,
            "is_new": is_new,
            "user": {
                "id": user[0],
                "display_name": user[1],
                "username": user[2],
                "avatar_url": user[3],
                "bio": user[4],
                "age": user[5],
                "birth_date": str(user[6]) if user[6] else None,
                "phone": phone,
            }
        })

    return err("Маршрут не найден", 404)

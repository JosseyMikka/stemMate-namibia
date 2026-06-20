from typing import Optional

from modules.database import get_connection, utc_now


def create_conversation(user_id: int, title: str = "New chat", subject: str = "General") -> dict:
    now = utc_now()
    conn = get_connection()
    cursor = conn.execute(
        "INSERT INTO conversations (user_id, title, subject, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
        (user_id, title, subject, now, now),
    )
    conn.commit()
    conv_id = cursor.lastrowid
    conn.close()
    return get_conversation(conv_id, user_id)


def get_conversation(conversation_id: int, user_id: int) -> Optional[dict]:
    conn = get_connection()
    row = conn.execute(
        "SELECT * FROM conversations WHERE id = ? AND user_id = ?",
        (conversation_id, user_id),
    ).fetchone()
    conn.close()
    return dict(row) if row else None


def list_conversations(user_id: int) -> list[dict]:
    conn = get_connection()
    rows = conn.execute(
        "SELECT * FROM conversations WHERE user_id = ? ORDER BY updated_at DESC",
        (user_id,),
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def update_conversation_title(conversation_id: int, user_id: int, title: str) -> None:
    conn = get_connection()
    conn.execute(
        "UPDATE conversations SET title = ?, updated_at = ? WHERE id = ? AND user_id = ?",
        (title, utc_now(), conversation_id, user_id),
    )
    conn.commit()
    conn.close()


def update_conversation_timestamp(conversation_id: int) -> None:
    conn = get_connection()
    conn.execute(
        "UPDATE conversations SET updated_at = ? WHERE id = ?",
        (utc_now(), conversation_id),
    )
    conn.commit()
    conn.close()


def delete_conversation(conversation_id: int, user_id: int) -> bool:
    conn = get_connection()
    conv = conn.execute(
        "SELECT id FROM conversations WHERE id = ? AND user_id = ?",
        (conversation_id, user_id),
    ).fetchone()
    if not conv:
        conn.close()
        return False
    conn.execute("DELETE FROM messages WHERE conversation_id = ?", (conversation_id,))
    conn.execute("DELETE FROM conversations WHERE id = ?", (conversation_id,))
    conn.commit()
    conn.close()
    return True


def add_message(conversation_id: int, role: str, content: str) -> dict:
    now = utc_now()
    conn = get_connection()
    cursor = conn.execute(
        "INSERT INTO messages (conversation_id, role, content, created_at) VALUES (?, ?, ?, ?)",
        (conversation_id, role, content, now),
    )
    conn.commit()
    msg_id = cursor.lastrowid
    row = conn.execute("SELECT * FROM messages WHERE id = ?", (msg_id,)).fetchone()
    conn.close()
    update_conversation_timestamp(conversation_id)
    return dict(row)


def get_messages(conversation_id: int) -> list[dict]:
    conn = get_connection()
    rows = conn.execute(
        "SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC",
        (conversation_id,),
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def format_history_for_download(conversation: dict, messages: list[dict], user_name: str) -> str:
    lines = [
        "StemMate Chat History",
        "=" * 40,
        f"Student: {user_name}",
        f"Subject: {conversation.get('subject', 'General')}",
        f"Title: {conversation.get('title', 'Chat')}",
        f"Date: {conversation.get('updated_at', '')}",
        "",
    ]
    for msg in messages:
        role = "You" if msg["role"] == "user" else "StemMate"
        lines.append(f"{role}:")
        lines.append(msg["content"])
        lines.append("")
    return "\n".join(lines)

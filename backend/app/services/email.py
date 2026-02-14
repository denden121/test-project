"""Отправка писем (Resend). Если RESEND_API_KEY не задан — ничего не делаем."""
import logging

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)


async def send_password_reset_email(to_email: str, reset_link: str) -> bool:
    """Отправить письмо со ссылкой для сброса пароля. Возвращает True если отправлено."""
    if not settings.resend_api_key:
        logger.info("RESEND_API_KEY not set, skip sending password reset email to %s", to_email)
        return False
    try:
        async with httpx.AsyncClient() as client:
            r = await client.post(
                "https://api.resend.com/emails",
                headers={"Authorization": f"Bearer {settings.resend_api_key}"},
                json={
                    "from": settings.resend_from_email,
                    "to": [to_email],
                    "subject": "Сброс пароля — Списки желаний",
                    "html": f"""
                    <p>Вы запросили сброс пароля.</p>
                    <p><a href="{reset_link}">Нажмите здесь, чтобы задать новый пароль</a>.</p>
                    <p>Ссылка действительна 1 час. Если вы не запрашивали сброс, проигнорируйте это письмо.</p>
                    """,
                },
                timeout=10.0,
            )
            if r.is_success:
                return True
            logger.warning("Resend API error: %s %s", r.status_code, r.text)
            return False
    except Exception as e:
        logger.exception("Failed to send password reset email: %s", e)
        return False

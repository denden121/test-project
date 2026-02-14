"""Подтягивание названия, картинки и цены по URL страницы товара (Open Graph, schema.org)."""
import json
import re
from decimal import Decimal
from urllib.parse import urljoin, urlparse

import httpx
from bs4 import BeautifulSoup


# Ограничения запроса
FETCH_TIMEOUT = 10.0
FETCH_MAX_BYTES = 1_000_000  # 1 MB

# Заголовки как у браузера — многие сайты (Ozon, Wildberries и др.) отдают 403 боту
BROWSER_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": "ru-RU,ru;q=0.9,en;q=0.8",
}


def _normalize_url(url: str) -> str:
    url = url.strip()
    if not url.startswith(("http://", "https://")):
        url = "https://" + url
    return url


def _extract_og(soup: BeautifulSoup, base_url: str) -> dict:
    """Open Graph и Twitter Card."""
    out: dict = {"title": None, "image_url": None, "price": None}
    for meta in soup.find_all("meta"):
        prop = (meta.get("property") or meta.get("name") or "").lower()
        content = meta.get("content")
        if not content:
            continue
        if prop in ("og:title", "twitter:title") and not out["title"]:
            out["title"] = content.strip()
        if prop in ("og:image", "twitter:image", "og:image:secure_url") and not out["image_url"]:
            out["image_url"] = content.strip()
        if prop in ("og:price:amount", "product:price:amount") and out["price"] is None:
            try:
                out["price"] = Decimal(re.sub(r"[^\d.,]", "", content.replace(",", ".")))
            except Exception:
                pass
    if out["image_url"] and not out["image_url"].startswith("http"):
        out["image_url"] = urljoin(base_url, out["image_url"])
    return out


def _extract_json_ld(soup: BeautifulSoup, base_url: str) -> dict:
    """Schema.org Product из JSON-LD."""
    out: dict = {"title": None, "image_url": None, "price": None}
    for script in soup.find_all("script", type="application/ld+json"):
        try:
            data = json.loads(script.string or "{}")
        except Exception:
            continue
        if not isinstance(data, dict):
            if isinstance(data, list):
                for item in data:
                    if isinstance(item, dict) and item.get("@type") == "Product":
                        data = item
                        break
            else:
                continue
        if data.get("@type") != "Product":
            continue
        if not out["title"] and data.get("name"):
            out["title"] = str(data["name"]).strip()
        if not out["image_url"] and data.get("image"):
            img = data["image"]
            if isinstance(img, str):
                out["image_url"] = img.strip()
            elif isinstance(img, list) and img:
                out["image_url"] = str(img[0]).strip()
            if out["image_url"] and not out["image_url"].startswith("http"):
                out["image_url"] = urljoin(base_url, out["image_url"])
        if out["price"] is None and "offers" in data:
            offers = data["offers"]
            if isinstance(offers, dict) and "price" in offers:
                try:
                    out["price"] = Decimal(str(offers["price"]))
                except Exception:
                    pass
            elif isinstance(offers, list) and offers and isinstance(offers[0], dict) and "price" in offers[0]:
                try:
                    out["price"] = Decimal(str(offers[0]["price"]))
                except Exception:
                    pass
        break
    return out


def _extract_title_tag(soup: BeautifulSoup) -> str | None:
    title = soup.find("title")
    if title and title.string:
        return title.get_text(strip=True)[:500]
    return None


def parse_product_page(html: str, base_url: str) -> dict:
    """Из HTML страницы извлекает title, image_url, price."""
    soup = BeautifulSoup(html, "html.parser")
    og = _extract_og(soup, base_url)
    ld = _extract_json_ld(soup, base_url)
    title = og["title"] or ld["title"] or _extract_title_tag(soup)
    image_url = og["image_url"] or ld["image_url"]
    price = og["price"] if og["price"] is not None else ld["price"]
    return {"title": title, "image_url": image_url, "price": price}


async def fetch_product(url: str) -> dict:
    """
    Загружает страницу по URL и возвращает dict с ключами title, image_url, price.
    Только http/https; таймаут и лимит размера ответа ограничены.
    """
    url = _normalize_url(url)
    parsed = urlparse(url)
    if parsed.scheme not in ("http", "https"):
        raise ValueError("Допустимы только http и https")
    # Referer с того же хоста иногда снимает 403
    headers = dict(BROWSER_HEADERS)
    headers["Referer"] = f"{parsed.scheme}://{parsed.netloc}/"
    async with httpx.AsyncClient(
        follow_redirects=True,
        timeout=FETCH_TIMEOUT,
        headers=headers,
    ) as client:
        response = await client.get(url)
        if response.status_code == 403:
            raise ValueError(
                "Сайт не разрешает автоматическую загрузку данных (403). "
                "Введите название, цену и ссылку на картинку вручную или вставьте ссылку на другой магазин."
            )
        if response.status_code == 401:
            raise ValueError("Страница доступна только после входа. Введите данные вручную.")
        if response.status_code == 429:
            raise ValueError("Слишком много запросов к этому сайту. Попробуйте позже.")
        response.raise_for_status()
        content_type = (response.headers.get("content-type") or "").lower()
        if "text/html" not in content_type and "application/xhtml" not in content_type:
            raise ValueError("Ответ не является HTML")
        body = response.content
        if len(body) > FETCH_MAX_BYTES:
            body = body[:FETCH_MAX_BYTES]
        text = body.decode(response.encoding or "utf-8", errors="replace")
    return parse_product_page(text, url)

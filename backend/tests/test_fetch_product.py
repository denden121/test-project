"""Тесты парсинга метаданных товара по HTML (Open Graph, schema.org)."""
from app.services.fetch_product import parse_product_page


def test_parse_og_title_image_price():
    """Open Graph: og:title, og:image, og:price:amount извлекаются."""
    html = """
    <html><head>
    <meta property="og:title" content="Test Product Name">
    <meta property="og:image" content="https://example.com/image.jpg">
    <meta property="og:price:amount" content="99.99">
    </head><body></body></html>
    """
    out = parse_product_page(html, "https://example.com/page")
    assert out["title"] == "Test Product Name"
    assert out["image_url"] == "https://example.com/image.jpg"
    assert out["price"] is not None
    assert float(out["price"]) == 99.99


def test_parse_og_relative_image():
    """Относительный og:image превращается в абсолютный URL."""
    html = """
    <html><head>
    <meta property="og:image" content="/img/product.jpg">
    </head><body></body></html>
    """
    out = parse_product_page(html, "https://shop.example.com/product/123")
    assert out["image_url"] == "https://shop.example.com/img/product.jpg"


def test_parse_json_ld_product():
    """Schema.org Product в JSON-LD: name, image, offers.price."""
    html = """
    <html><head>
    <script type="application/ld+json">
    {"@type": "Product", "name": "JSON-LD Product", "image": "https://ld.com/pic.png",
     "offers": {"@type": "Offer", "price": "149.50"}}
    </script>
    </head><body></body></html>
    """
    out = parse_product_page(html, "https://example.com")
    assert out["title"] == "JSON-LD Product"
    assert out["image_url"] == "https://ld.com/pic.png"
    assert out["price"] is not None
    assert float(out["price"]) == 149.50


def test_parse_json_ld_product_offers_list():
    """Schema.org Product с offers — массив."""
    html = """
    <html><head>
    <script type="application/ld+json">
    {"@type": "Product", "name": "Multi Offer", "offers": [{"price": 77}]}
    </script>
    </head><body></body></html>
    """
    out = parse_product_page(html, "https://example.com")
    assert out["title"] == "Multi Offer"
    assert float(out["price"]) == 77


def test_parse_fallback_title_tag():
    """Без og/schema — берётся <title>."""
    html = "<html><head><title>Page Title</title></head><body></body></html>"
    out = parse_product_page(html, "https://example.com")
    assert out["title"] == "Page Title"
    assert out["image_url"] is None
    assert out["price"] is None


def test_parse_og_overrides_json_ld():
    """При наличии и og, и JSON-LD приоритет у og (сначала вызывается og)."""
    html = """
    <html><head>
    <meta property="og:title" content="OG Title">
    <meta property="og:image" content="https://og.com/img.jpg">
    <script type="application/ld+json">
    {"@type": "Product", "name": "LD Name", "image": "https://ld.com/x.png", "offers": {"price": 10}}
    </script>
    </head><body></body></html>
    """
    out = parse_product_page(html, "https://example.com")
    assert out["title"] == "OG Title"
    assert out["image_url"] == "https://og.com/img.jpg"
    assert float(out["price"]) == 10  # price может быть только в LD


def test_parse_empty_html():
    """Пустой HTML — всё None, кроме возможного title из пустого title."""
    out = parse_product_page("<html><body></body></html>", "https://example.com")
    assert out["title"] is None or out["title"] == ""
    assert out["image_url"] is None
    assert out["price"] is None

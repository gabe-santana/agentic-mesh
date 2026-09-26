import asyncio

from app.main import health


def test_health_ok():
    assert asyncio.run(health()) == {"status": "ok"}

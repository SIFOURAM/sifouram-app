"""Iteration 4 backend regression: notifications/clear, deposit notification, promo/idea, logo."""
import os, requests, pytest
from datetime import date, timedelta
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parents[2] / "frontend" / ".env")
BASE = os.environ["REACT_APP_BACKEND_URL"].rstrip("/")

SUPER = {"identifier": "baa", "password": "Nai130994"}
BAR = {"identifier": "alif", "password": "Jkt221112"}
RIDER = {"identifier": "fikar", "password": "Jkt221112"}


def _login(cred):
    r = requests.post(f"{BASE}/api/auth/login", json=cred, timeout=30)
    assert r.status_code == 200, r.text
    return r.json()["token"], r.json()["user"]


def _h(tok):
    return {"Authorization": f"Bearer {tok}"}


@pytest.fixture(scope="module")
def super_tok():
    tok, _ = _login(SUPER)
    return tok


@pytest.fixture(scope="module")
def rider_user():
    _, u = _login(RIDER)
    return u


# ---- Logo asset served ----
def test_logo_png_available():
    r = requests.get(f"{BASE}/logo.png", timeout=15)
    assert r.status_code == 200
    assert r.headers.get("content-type", "").startswith("image/")
    assert len(r.content) > 500


# ---- Notifications endpoints ----
def test_notifications_clear_deletes_all(super_tok):
    # First list (may be non-empty)
    r = requests.get(f"{BASE}/api/notifications", headers=_h(super_tok), timeout=15)
    assert r.status_code == 200
    c = requests.post(f"{BASE}/api/notifications/clear", headers=_h(super_tok), timeout=15)
    assert c.status_code == 200
    assert c.json() == {"ok": True}
    r2 = requests.get(f"{BASE}/api/notifications", headers=_h(super_tok), timeout=15)
    assert r2.status_code == 200
    assert r2.json() == []


def test_notifications_clear_requires_superadmin():
    tok, _ = _login(BAR)
    r = requests.post(f"{BASE}/api/notifications/clear", headers=_h(tok), timeout=15)
    assert r.status_code == 403


# ---- Deposit save creates a superadmin notification ----
def test_deposit_save_creates_notification(super_tok, rider_user):
    # Clear notif first
    requests.post(f"{BASE}/api/notifications/clear", headers=_h(super_tok), timeout=15)
    # Seed rider stock for a unique test date so we can save a deposit
    d = (date.today() - timedelta(days=30)).isoformat()  # far past date, safe
    # Get a menu id
    menus = requests.get(f"{BASE}/api/menus", headers=_h(super_tok), timeout=15).json()
    assert menus, "menus should be seeded"
    menu = menus[0]
    # 1x1 png data URL
    tiny_png = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="
    rs = requests.post(f"{BASE}/api/rider-stock", headers=_h(super_tok),
                      json={"rider_id": rider_user["id"], "date": d,
                            "items": {menu["id"]: 5}, "photo": tiny_png}, timeout=30)
    assert rs.status_code == 200, rs.text
    # Save a deposit for that date
    dep = requests.post(f"{BASE}/api/deposits", headers=_h(super_tok),
                       json={"rider_id": rider_user["id"], "date": d,
                             "rows": [{"menu_id": menu["id"], "stock": 5, "remaining": 3,
                                      "cash": 2, "qris": 0, "wastage": 0}],
                             "bundles": [], "debt_payment": 0, "expenses": 0, "expense_note": ""},
                       timeout=30)
    assert dep.status_code == 200, dep.text
    # Now notification should exist with type=deposit
    notifs = requests.get(f"{BASE}/api/notifications", headers=_h(super_tok), timeout=15).json()
    dep_notifs = [n for n in notifs if n.get("type") == "deposit"]
    assert dep_notifs, f"Expected a deposit notification, got: {notifs}"
    assert "Setoran" in dep_notifs[0]["title"]
    assert rider_user["name"] in dep_notifs[0]["title"]


# ---- Promo idea AI endpoint ----
def test_promo_idea_returns_text(super_tok):
    r = requests.post(f"{BASE}/api/promo/idea", headers=_h(super_tok),
                     json={"theme": "promo cuaca hujan"}, timeout=90)
    assert r.status_code == 200, r.text
    data = r.json()
    assert "text" in data
    assert isinstance(data["text"], str)
    assert len(data["text"]) > 20


def test_promo_idea_requires_superadmin():
    tok, _ = _login(BAR)
    r = requests.post(f"{BASE}/api/promo/idea", headers=_h(tok), json={"theme": ""}, timeout=30)
    assert r.status_code == 403


# ---- Coach chat answers general (non-sales) question ----
def test_coach_chat_general_question(super_tok):
    r = requests.post(f"{BASE}/api/coach/chat", headers=_h(super_tok),
                     json={"message": "Ceritakan 1 fakta menarik tentang kopi"}, timeout=90)
    assert r.status_code == 200, r.text
    data = r.json()
    assert "reply" in data and len(data["reply"]) > 30

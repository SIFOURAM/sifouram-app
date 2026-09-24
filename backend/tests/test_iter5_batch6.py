"""Iteration 5 batch-6 regression: data wipe + general Tanya AI."""
import os, requests, pytest
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parents[2] / "frontend" / ".env")
BASE = os.environ["REACT_APP_BACKEND_URL"].rstrip("/")

SUPER = {"identifier": "baa", "password": "Nai130994"}


def _login(cred):
    r = requests.post(f"{BASE}/api/auth/login", json=cred, timeout=30)
    assert r.status_code == 200, r.text
    return r.json()["token"]


@pytest.fixture(scope="module")
def stok():
    return _login(SUPER)


def _h(t): return {"Authorization": f"Bearer {t}"}


# ----- Data wipe -----
def test_customers_empty(stok):
    r = requests.get(f"{BASE}/api/customers", headers=_h(stok), timeout=15)
    assert r.status_code == 200
    assert r.json() == []


def test_invoices_empty(stok):
    r = requests.get(f"{BASE}/api/invoices", headers=_h(stok), timeout=15)
    assert r.status_code == 200
    assert r.json() == []


def test_materials_stock_zero(stok):
    r = requests.get(f"{BASE}/api/materials", headers=_h(stok), timeout=15)
    assert r.status_code == 200
    data = r.json()
    assert len(data) > 0, "materials definitions should still exist"
    non_zero = [m for m in data if (m.get("stock") or 0) != 0]
    assert non_zero == [], f"expected all material stock=0, got: {non_zero[:3]}"


def test_menus_stock_zero(stok):
    r = requests.get(f"{BASE}/api/menus", headers=_h(stok), timeout=15)
    assert r.status_code == 200
    data = r.json()
    assert len(data) > 0, "menu definitions should still exist"
    non_zero = [m for m in data if (m.get("stock") or 0) != 0]
    assert non_zero == [], f"expected all menu stock=0, got: {non_zero[:3]}"


def test_sales_history_empty(stok):
    r = requests.get(f"{BASE}/api/sales?start=2020-01-01&end=2030-12-31", headers=_h(stok), timeout=15)
    assert r.status_code == 200
    assert r.json() == []


def test_finance_summary_zero(stok):
    r = requests.get(f"{BASE}/api/finance/summary?start=2026-06-16&end=2026-07-15",
                    headers=_h(stok), timeout=30)
    assert r.status_code == 200, r.text
    data = r.json()
    # verify all numeric revenue / cash / qris / cups keys are 0
    for k, v in data.items():
        if isinstance(v, (int, float)):
            assert v == 0, f"finance/summary.{k} expected 0, got {v}"


def test_dashboard_summary_zero(stok):
    # try /api/summary (common route) — fall back to finance
    r = requests.get(f"{BASE}/api/summary?start=2026-06-16&end=2026-07-15",
                    headers=_h(stok), timeout=30)
    if r.status_code == 404:
        pytest.skip("no /api/summary endpoint")
    assert r.status_code == 200
    data = r.json()
    for k, v in data.items():
        if isinstance(v, (int, float)):
            assert v == 0, f"summary.{k} expected 0, got {v}"


# ----- Tanya AI general -----
def test_coach_answers_general_capital_question(stok):
    r = requests.post(f"{BASE}/api/coach/chat", headers=_h(stok),
                     json={"message": "Apa ibukota Jepang?"}, timeout=90)
    assert r.status_code == 200, r.text
    data = r.json()
    reply = data.get("reply", "")
    assert len(reply) > 20
    # answer should mention Tokyo (case insensitive)
    assert "tokyo" in reply.lower(), f"expected 'Tokyo' in reply, got: {reply[:300]}"


def test_coach_answers_sales_question(stok):
    r = requests.post(f"{BASE}/api/coach/chat", headers=_h(stok),
                     json={"message": "Tips supaya kopi cepat laku pagi hari"}, timeout=90)
    assert r.status_code == 200
    assert len(r.json().get("reply", "")) > 30

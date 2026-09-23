"""Iteration-3 focused tests: forecast, customers, finance summary."""
import os
import pytest
import requests
from datetime import date, timedelta

def _read_env():
    p = "/app/frontend/.env"
    with open(p) as f:
        for line in f:
            if line.startswith("REACT_APP_BACKEND_URL="):
                return line.split("=", 1)[1].strip()
    raise RuntimeError("REACT_APP_BACKEND_URL not found")


BASE = os.environ.get("REACT_APP_BACKEND_URL", _read_env()).rstrip("/")


def _login(username, password):
    r = requests.post(f"{BASE}/api/auth/login", json={"identifier": username, "password": password, "remember": True}, timeout=30)
    assert r.status_code == 200, r.text
    return r.json()["token"]


@pytest.fixture(scope="module")
def super_token():
    return _login("baa", "Nai130994")


@pytest.fixture(scope="module")
def bar_token():
    return _login("alif", "Jkt221112")


@pytest.fixture(scope="module")
def ricky_id(super_token):
    r = requests.get(f"{BASE}/api/users", params={"role": "rider"}, headers={"Authorization": f"Bearer {super_token}"}, timeout=30)
    assert r.status_code == 200
    for u in r.json():
        if u["username"] == "ricky":
            return u["id"]
    pytest.skip("ricky not found")


class TestForecast:
    def test_forecast_tomorrow(self, bar_token, ricky_id):
        tomorrow = (date.today() + timedelta(days=1)).strftime("%Y-%m-%d")
        r = requests.get(f"{BASE}/api/forecast", params={"rider_id": ricky_id, "date": tomorrow},
                         headers={"Authorization": f"Bearer {bar_token}"}, timeout=30)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["date"] == tomorrow
        assert data["rider_id"] == ricky_id
        assert "basis" in data and data["basis"] in ("history", "default")
        assert "factor" in data
        # weekend vs weekday factor
        wd = date.fromisoformat(tomorrow).weekday()
        expected_factor = 1.2 if (wd >= 5) else 1.0
        # holiday could also make it 1.2, so weekend factor >= expected
        if wd < 5 and tomorrow not in {"2026-01-01", "2026-01-16"}:
            assert data["factor"] == expected_factor
        assert isinstance(data["items"], list)
        assert len(data["items"]) == 9, f"expected 9 menus, got {len(data['items'])}"
        assert data["total"] == sum(i["suggested"] for i in data["items"])
        # bounds
        # need max_stock per menu — fetch menus
        m = requests.get(f"{BASE}/api/menus", headers={"Authorization": f"Bearer {bar_token}"}, timeout=30).json()
        max_by_id = {x["id"]: x["max_stock"] for x in m}
        for it in data["items"]:
            assert it["suggested"] >= 3, it
            assert it["suggested"] <= max_by_id[it["menu_id"]], it

    def test_forecast_weekend_factor(self, bar_token, ricky_id):
        # find next Saturday
        d = date.today()
        while d.weekday() != 5:
            d += timedelta(days=1)
        r = requests.get(f"{BASE}/api/forecast", params={"rider_id": ricky_id, "date": d.strftime("%Y-%m-%d")},
                         headers={"Authorization": f"Bearer {bar_token}"}, timeout=30)
        assert r.status_code == 200
        assert r.json()["factor"] == 1.2
        assert r.json()["weekend"] is True


class TestCustomers:
    def test_customers_list(self, super_token):
        r = requests.get(f"{BASE}/api/customers", headers={"Authorization": f"Bearer {super_token}"}, timeout=30)
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        # verify shape if any
        for c in data[:3]:
            assert "phone" in c
            assert "points" in c


class TestFinanceSummary:
    def test_summary_ok(self, super_token):
        end = date.today().strftime("%Y-%m-%d")
        start = (date.today() - timedelta(days=30)).strftime("%Y-%m-%d")
        r = requests.get(f"{BASE}/api/finance/summary", params={"start": start, "end": end},
                         headers={"Authorization": f"Bearer {super_token}"}, timeout=60)
        assert r.status_code == 200, r.text
        data = r.json()
        for k in ("income", "outgo", "net", "cash_balance", "bank_balance", "handover_total", "ledger", "by_category"):
            assert k in data
        assert isinstance(data["handover_total"], (int, float))

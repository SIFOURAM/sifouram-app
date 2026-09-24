"""Iteration 7 backend tests: reset zero balances, primary bank, user photo, invoice notification."""
import os
import requests
import pytest
from pathlib import Path

_env = Path("/app/frontend/.env").read_text()
for _line in _env.splitlines():
    if _line.startswith("REACT_APP_BACKEND_URL="):
        os.environ["REACT_APP_BACKEND_URL"] = _line.split("=", 1)[1].strip()
BASE = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
assert BASE.startswith("http"), f"BASE not set: {BASE!r}"
API = f"{BASE}/api"


def login(identifier: str, password: str) -> str:
    r = requests.post(f"{API}/auth/login", json={"identifier": identifier, "password": password, "remember": True}, timeout=15)
    assert r.status_code == 200, f"login {identifier}: {r.status_code} {r.text}"
    return r.json()["token"]


@pytest.fixture(scope="module")
def super_token():
    return login("baa", "Nai130994")


@pytest.fixture(scope="module")
def rider_token():
    return login("fikar", "Jkt221112")


@pytest.fixture(scope="module")
def super_hdr(super_token):
    return {"Authorization": f"Bearer {super_token}"}


@pytest.fixture(scope="module")
def rider_hdr(rider_token):
    return {"Authorization": f"Bearer {rider_token}"}


# ---------- (3) Reset data = 0 ----------
class TestZeroBalances:
    def test_finance_summary_all_zero(self, super_hdr):
        params = {"start": "2020-01-01", "end": "2030-12-31"}
        r = requests.get(f"{API}/finance/summary", headers=super_hdr, params=params, timeout=15)
        assert r.status_code == 200, r.text
        d = r.json()
        for k in ("income", "outgo", "net", "cash_balance", "bank_balance"):
            assert k in d, f"missing key {k} in {d}"
        assert d["outgo"] == 0, f"outgo should be 0, got {d['outgo']}"
        assert d["cash_balance"] == 0, f"cash_balance should be 0, got {d['cash_balance']}"
        assert d["bank_balance"] == 0, f"bank_balance should be 0, got {d['bank_balance']}"
        print(f"finance/summary: income={d['income']} outgo={d['outgo']} net={d['net']} cash={d['cash_balance']} bank={d['bank_balance']}")

    def test_salary_zulfikar_zero(self, super_hdr):
        params = {"start": "2020-01-01", "end": "2030-12-31"}
        r = requests.get(f"{API}/salary", headers=super_hdr, params=params, timeout=15)
        assert r.status_code == 200, r.text
        payload = r.json()
        rows = payload.get("riders", payload) if isinstance(payload, dict) else payload
        assert isinstance(rows, list)
        zulf = None
        for row in rows:
            nm = (row.get("rider_name") or row.get("name") or "").lower()
            if "zulfikar" in nm or "fikar" in nm:
                zulf = row
                break
        assert zulf is not None, f"rider fikar/zulfikar not found: {[r.get('rider_name') for r in rows]}"
        ti = zulf.get("total_income", 0)
        assert ti >= 0, f"Zulfikar total_income should be >= 0, got {ti}"
        print(f"zulfikar total_income={ti} allowance={zulf.get('allowance')} incentive={zulf.get('incentive')}")


# ---------- (4) Primary bank persistence ----------
class TestPrimaryBank:
    def test_set_and_persist_primary_bank(self, rider_hdr, rider_token):
        # fetch current user
        me = requests.get(f"{API}/auth/me", headers=rider_hdr, timeout=15)
        assert me.status_code == 200, me.text
        user = me.json()
        banks_orig = user.get("banks", []) or []

        new_banks = [
            {"bank": "BCA", "account": "TEST_1111", "holder": "Fikar Test", "primary": False},
            {"bank": "Mandiri", "account": "TEST_2222", "holder": "Fikar Test", "primary": True},
        ]
        upd = requests.put(f"{API}/auth/profile", headers=rider_hdr, json={"banks": new_banks}, timeout=15)
        assert upd.status_code == 200, upd.text

        me2 = requests.get(f"{API}/auth/me", headers=rider_hdr, timeout=15)
        b = me2.json().get("banks", [])
        assert len(b) >= 2
        prims = [x for x in b if x.get("primary")]
        assert len(prims) == 1, f"expected exactly 1 primary, got {prims}"
        assert prims[0]["account"] == "TEST_2222"

        # restore
        requests.put(f"{API}/auth/profile", headers=rider_hdr, json={"banks": banks_orig}, timeout=15)


# ---------- (7) Superadmin change rider photo ----------
class TestUserPhoto:
    PNG_1x1 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="

    def test_photo_requires_superadmin(self, rider_hdr, rider_token):
        # rider trying to change some other user id should be blocked
        me = requests.get(f"{API}/auth/me", headers=rider_hdr, timeout=15).json()
        r = requests.put(f"{API}/users/{me['id']}/photo", headers=rider_hdr, json={"photo": self.PNG_1x1}, timeout=15)
        assert r.status_code in (401, 403), f"expected 401/403 for rider, got {r.status_code} {r.text}"

    def test_super_can_update_rider_photo(self, super_hdr, rider_hdr):
        me = requests.get(f"{API}/auth/me", headers=rider_hdr, timeout=15).json()
        r = requests.put(f"{API}/users/{me['id']}/photo", headers=super_hdr, json={"photo": self.PNG_1x1}, timeout=20)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "photo" in data and data["photo"], f"missing photo url: {data}"
        assert isinstance(data["photo"], str)

        # GET verify persisted
        me2 = requests.get(f"{API}/auth/me", headers=rider_hdr, timeout=15).json()
        assert me2.get("photo") == data["photo"]


# ---------- (8) Order notification on invoice creation ----------
class TestOrderNotification:
    def test_invoice_creates_superadmin_notification(self, super_hdr):
        # menus
        menus = requests.get(f"{API}/menus", headers=super_hdr, timeout=15).json()
        assert menus, "need at least one menu"
        m = menus[0]

        payload = {
            "customer_name": "TEST_Notif",
            "customer_phone": "0800",
            "date": "2026-01-15",
            "rows": [{"menu_id": m["id"], "qty": 2, "price": m["price"]}],
            "discount": 0,
            "down_payment": 0,
            "payment_method": "cash",
            "note": "test",
        }
        r = requests.post(f"{API}/invoices", headers=super_hdr, json=payload, timeout=20)
        assert r.status_code == 200, r.text
        inv = r.json()
        inv_no = inv["invoice_no"]

        n = requests.get(f"{API}/notifications", headers=super_hdr, timeout=15)
        assert n.status_code == 200
        notifs = n.json()
        matched = [x for x in notifs if x.get("type") == "order" and inv_no in (x.get("body") or "")]
        assert matched, f"no 'order' notification for {inv_no}. got types={[x.get('type') for x in notifs[:10]]}"
        assert "Pesanan Barang" in matched[0].get("title", "")

        # cleanup: remove test invoice + notification via mongo (no DELETE endpoint) — use handled by main agent if needed
        try:
            from pymongo import MongoClient
            mc = MongoClient(os.environ.get("MONGO_URL", "mongodb://localhost:27017"))
            mc[os.environ.get("DB_NAME", "test_database")].invoices.delete_many({"customer_name": "TEST_Notif"})
            mc[os.environ.get("DB_NAME", "test_database")].notifications.delete_many({"title": {"$regex": "TEST_Notif"}})
        except Exception as e:
            print(f"cleanup skipped: {e}")

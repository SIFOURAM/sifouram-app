"""SI FOUR AM backend integration tests."""
import os
import pytest
import requests
from datetime import date, timedelta

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    # Fallback to reading frontend .env
    with open("/app/frontend/.env") as f:
        for line in f:
            if line.startswith("REACT_APP_BACKEND_URL="):
                BASE_URL = line.split("=", 1)[1].strip().rstrip("/")

API = f"{BASE_URL}/api"

CREDS = {
    "superadmin": ("baa", "Nai130994"),
    "barteam": ("alif", "Jkt221112"),
    "rider_ricky": ("ricky", "Jkt221112"),
    "rider_tanjung": ("tanjung", "Jkt221112"),
    "rider_rijal": ("rijal", "Jkt221112"),
}

TODAY = str(date.today())
# use a unique test date to avoid conflicts with existing data
TEST_DATE = str(date.today() - timedelta(days=7))


def login(identifier, password):
    r = requests.post(f"{API}/auth/login", json={"identifier": identifier, "password": password, "remember": False})
    return r


@pytest.fixture(scope="session")
def tokens():
    out = {}
    for k, (u, p) in CREDS.items():
        r = login(u, p)
        assert r.status_code == 200, f"login failed for {k}: {r.status_code} {r.text}"
        out[k] = r.json()["token"]
    return out


def H(tok):
    return {"Authorization": f"Bearer {tok}"}


# ---------- Auth ----------
class TestAuth:
    def test_login_ok(self):
        r = login("baa", "Nai130994")
        assert r.status_code == 200
        j = r.json()
        assert "token" in j and j["user"]["role"] == "superadmin"

    def test_login_wrong_password(self):
        r = login("baa", "WRONGPW__")
        assert r.status_code == 401

    def test_me(self, tokens):
        r = requests.get(f"{API}/auth/me", headers=H(tokens["superadmin"]))
        assert r.status_code == 200
        assert r.json()["username"] == "baa"


# ---------- Role guards ----------
class TestRoleGuards:
    def test_rider_cannot_post_rider_stock(self, tokens):
        r = requests.post(f"{API}/rider-stock", headers=H(tokens["rider_ricky"]),
                          json={"rider_id": "x", "date": TEST_DATE, "items": {}})
        assert r.status_code == 403

    def test_rider_cannot_post_deposit(self, tokens):
        r = requests.post(f"{API}/deposits", headers=H(tokens["rider_ricky"]),
                          json={"rider_id": "x", "date": TEST_DATE, "rows": []})
        assert r.status_code == 403

    def test_barteam_cannot_get_finance(self, tokens):
        r = requests.get(f"{API}/finance/summary?start={TEST_DATE}&end={TODAY}", headers=H(tokens["barteam"]))
        assert r.status_code == 403

    def test_barteam_cannot_get_invoices(self, tokens):
        r = requests.get(f"{API}/invoices", headers=H(tokens["barteam"]))
        assert r.status_code == 403

    def test_super_can_get_finance(self, tokens):
        r = requests.get(f"{API}/finance/summary?start={TEST_DATE}&end={TODAY}", headers=H(tokens["superadmin"]))
        assert r.status_code == 200


# ---------- Menus ----------
class TestMenus:
    def test_list_menus(self, tokens):
        r = requests.get(f"{API}/menus", headers=H(tokens["superadmin"]))
        assert r.status_code == 200
        menus = r.json()
        assert len(menus) == 9
        # ordered by "order" ascending
        orders = [m["order"] for m in menus]
        assert orders == sorted(orders)
        for m in menus:
            assert m["cost"] > 0


# ---------- Inventory ----------
class TestInventory:
    def test_inventory_tx_in(self, tokens):
        mats = requests.get(f"{API}/materials", headers=H(tokens["superadmin"])).json()
        mid = mats[0]["id"]
        before = mats[0]["stock"]
        r = requests.post(f"{API}/inventory/tx", headers=H(tokens["superadmin"]),
                          json={"material_id": mid, "type": "in", "qty": 5, "date": TEST_DATE, "note": "TEST_"})
        assert r.status_code == 200
        assert r.json()["after"] == before + 5


# ---------- Menu Stock Produce ----------
class TestMenuProduce:
    def test_produce_increases_menu_stock(self, tokens):
        menus = requests.get(f"{API}/menus", headers=H(tokens["superadmin"])).json()
        menu = menus[0]
        # get material stock before
        mats_before = {m["id"]: m["stock"] for m in requests.get(f"{API}/materials", headers=H(tokens["superadmin"])).json()}
        r = requests.post(f"{API}/menu-stock/produce", headers=H(tokens["superadmin"]),
                          json={"menu_id": menu["id"], "qty": 2, "date": TEST_DATE, "type": "produce"})
        assert r.status_code == 200
        j = r.json()
        assert j["after"] == menu["stock"] + 2
        # material stock decreased for recipe
        mats_after = {m["id"]: m["stock"] for m in requests.get(f"{API}/materials", headers=H(tokens["superadmin"])).json()}
        for rec in menu["recipe"]:
            assert mats_after[rec["material_id"]] == mats_before[rec["material_id"]] - rec["qty"] * 2


# ---------- Rider stock ----------
@pytest.fixture(scope="session")
def rider_ids(tokens):
    users = requests.get(f"{API}/users", headers=H(tokens["superadmin"])).json()
    m = {}
    for u in users:
        if u.get("username") in ("tanjung", "rijal", "ricky"):
            m[u["username"]] = u["id"]
    return m


class TestRiderStock:
    def test_upsert_and_decrement(self, tokens, rider_ids):
        menus = requests.get(f"{API}/menus", headers=H(tokens["barteam"])).json()
        m1 = menus[0]
        rid = rider_ids["tanjung"]
        # First post: qty 5
        r1 = requests.post(f"{API}/rider-stock", headers=H(tokens["barteam"]),
                           json={"rider_id": rid, "date": TEST_DATE, "items": {m1["id"]: 5}})
        assert r1.status_code == 200, r1.text
        menu_after_1 = next(x for x in requests.get(f"{API}/menus", headers=H(tokens["barteam"])).json() if x["id"] == m1["id"])
        # Second post: qty 8 (delta 3) - must upsert not duplicate
        r2 = requests.post(f"{API}/rider-stock", headers=H(tokens["barteam"]),
                           json={"rider_id": rid, "date": TEST_DATE, "items": {m1["id"]: 8}})
        assert r2.status_code == 200
        assert r1.json()["id"] == r2.json()["id"]  # same id → upsert
        menu_after_2 = next(x for x in requests.get(f"{API}/menus", headers=H(tokens["barteam"])).json() if x["id"] == m1["id"])
        assert menu_after_2["stock"] == menu_after_1["stock"] - 3
        # POS stock reflects initial
        st = requests.get(f"{API}/pos/stock", headers=H(tokens["barteam"]),
                          params={"rider_id": rid, "date": TEST_DATE}).json()
        row = next(x for x in st["items"] if x["menu_id"] == m1["id"])
        assert row["initial"] == 8


# ---------- POS Sales ----------
class TestSales:
    def test_sale_and_overstock(self, tokens, rider_ids):
        menus = requests.get(f"{API}/menus", headers=H(tokens["barteam"])).json()
        m1 = menus[0]
        rid = rider_ids["ricky"]
        # ensure stock
        requests.post(f"{API}/rider-stock", headers=H(tokens["barteam"]),
                      json={"rider_id": rid, "date": TEST_DATE, "items": {m1["id"]: 10}})
        # sale of 2
        r = requests.post(f"{API}/sales", headers=H(tokens["barteam"]), json={
            "rider_id": rid, "date": TEST_DATE, "customer_name": "TEST_Cust", "customer_phone": "0811TEST",
            "items": [{"menu_id": m1["id"], "qty": 2}], "payment_method": "cash", "cash_received": m1["price"] * 2,
        })
        assert r.status_code == 200
        j = r.json()
        assert j["receipt_no"].startswith("S4-" + TEST_DATE.replace("-", "") + "-")
        assert j["total"] == m1["price"] * 2
        # remaining reduced - use delta pattern to isolate from stale data
        st_before = requests.get(f"{API}/pos/stock", headers=H(tokens["barteam"]),
                                 params={"rider_id": rid, "date": TEST_DATE}).json()
        # capture value after sale already made (r above already posted)
        row = next(x for x in st_before["items"] if x["menu_id"] == m1["id"])
        remaining_after = row["remaining"]
        # sell 1 more
        r_extra = requests.post(f"{API}/sales", headers=H(tokens["barteam"]), json={
            "rider_id": rid, "date": TEST_DATE, "items": [{"menu_id": m1["id"], "qty": 1}], "payment_method": "cash",
            "cash_received": m1["price"]
        })
        assert r_extra.status_code == 200
        st_after = requests.get(f"{API}/pos/stock", headers=H(tokens["barteam"]),
                                params={"rider_id": rid, "date": TEST_DATE}).json()
        row_after = next(x for x in st_after["items"] if x["menu_id"] == m1["id"])
        assert row_after["remaining"] == remaining_after - 1
        # overstock
        r2 = requests.post(f"{API}/sales", headers=H(tokens["barteam"]), json={
            "rider_id": rid, "date": TEST_DATE, "items": [{"menu_id": m1["id"], "qty": 999}], "payment_method": "cash"
        })
        assert r2.status_code == 400
        # customer saved
        cust = requests.get(f"{API}/customers", headers=H(tokens["superadmin"])).json()
        assert any(c["phone"] == "0811TEST" for c in cust)
        # EOD
        eod = requests.get(f"{API}/sales/eod", headers=H(tokens["barteam"]),
                           params={"rider_id": rid, "date": TEST_DATE}).json()
        assert eod["total_cups"] >= 2


# ---------- Attendance ----------
class TestAttendance:
    def test_flow(self, tokens, rider_ids):
        rid = rider_ids["rijal"]
        # cleanup: use a distant date
        att_date = str(date.today() - timedelta(days=10))
        # wrong pin
        r_bad = requests.post(f"{API}/attendance/checkin", headers=H(tokens["barteam"]), json={
            "rider_id": rid, "pin": "0000", "photo": "data:image/png;base64,AA", "date": att_date
        })
        assert r_bad.status_code == 401
        # right pin (rijal=1421)
        r_ok = requests.post(f"{API}/attendance/checkin", headers=H(tokens["barteam"]), json={
            "rider_id": rid, "pin": "1421", "photo": "data:image/png;base64,AA", "date": att_date
        })
        # might be 409 if previous run
        assert r_ok.status_code in (200, 409)
        if r_ok.status_code == 200:
            # second checkin same day → 409
            r_dup = requests.post(f"{API}/attendance/checkin", headers=H(tokens["barteam"]), json={
                "rider_id": rid, "pin": "1421", "photo": "data:image/png;base64,AA", "date": att_date
            })
            assert r_dup.status_code == 409
        # checkout
        r_co = requests.post(f"{API}/attendance/checkout", headers=H(tokens["barteam"]), json={
            "rider_id": rid, "pin": "1421", "photo": "data:image/png;base64,AA", "date": att_date
        })
        assert r_co.status_code in (200, 409)


# ---------- Deposit ----------
class TestDeposit:
    def test_deposit_calc_and_upsert(self, tokens, rider_ids):
        menus = requests.get(f"{API}/menus", headers=H(tokens["barteam"])).json()
        m1 = menus[0]
        rid = rider_ids["rijal"]
        d = str(date.today() - timedelta(days=5))
        # ensure rider stock
        requests.post(f"{API}/rider-stock", headers=H(tokens["barteam"]),
                      json={"rider_id": rid, "date": d, "items": {m1["id"]: 30}})
        payload = {
            "rider_id": rid, "date": d,
            "rows": [{"menu_id": m1["id"], "stock": 30, "remaining": 5, "cash": 20, "qris": 4, "wastage": 0}],
            "debt_payment": 0, "expenses": 5000
        }
        r = requests.post(f"{API}/deposits", headers=H(tokens["barteam"]), json=payload)
        assert r.status_code == 200, r.text
        j = r.json()
        # total_sold=24, diff=30-(24+5+0)=1, minus=1*price
        assert j["rows"][0]["diff"] == 1
        assert j["rows"][0]["minus"] == m1["price"]
        assert j["total_cash"] == 20 * m1["price"]
        assert j["total_qris"] == 4 * m1["price"]
        # net_cash = cash - expenses + debt_payment
        assert j["net_cash"] == 20 * m1["price"] - 5000
        # motivation for 24 cups (<=30)
        assert "spirit" in j["motivation"].lower() or "💪" in j["motivation"]
        # upsert
        r2 = requests.post(f"{API}/deposits", headers=H(tokens["barteam"]), json=payload)
        assert r2.status_code == 200
        assert r.json()["id"] == r2.json()["id"]
        # list
        lst = requests.get(f"{API}/deposits", headers=H(tokens["superadmin"]),
                          params={"start": d, "end": d}).json()
        assert sum(1 for x in lst if x["rider_id"] == rid) == 1


# ---------- Invoices ----------
class TestInvoices:
    def test_create_invoice(self, tokens):
        menus = requests.get(f"{API}/menus", headers=H(tokens["superadmin"])).json()
        r = requests.post(f"{API}/invoices", headers=H(tokens["superadmin"]), json={
            "customer_name": "TEST_ACME", "customer_phone": "0888",
            "date": TEST_DATE, "rows": [{"menu_id": menus[0]["id"], "qty": 3}],
            "discount": 1000
        })
        assert r.status_code == 200
        j = r.json()
        assert j["invoice_no"].startswith("INV-")
        assert j["subtotal"] == menus[0]["price"] * 3
        assert j["total"] == j["subtotal"] - 1000


# ---------- Dashboard / Salary / Finance ----------
class TestDashboard:
    def test_dashboard_summary(self, tokens):
        r = requests.get(f"{API}/dashboard/summary", headers=H(tokens["superadmin"]),
                         params={"start": TEST_DATE, "end": TODAY})
        assert r.status_code == 200
        j = r.json()
        for k in ("cups", "cash", "qris", "by_rider", "by_date", "by_menu"):
            assert k in j

    def test_salary(self, tokens):
        r = requests.get(f"{API}/salary", headers=H(tokens["superadmin"]),
                         params={"start": TEST_DATE, "end": TODAY})
        assert r.status_code == 200
        j = r.json()
        assert "tiers" in j and "riders" in j
        assert len(j["tiers"]) == 4

    def test_expense_and_handover(self, tokens, rider_ids):
        r = requests.post(f"{API}/expenses", headers=H(tokens["superadmin"]),
                          json={"date": TEST_DATE, "category": "TEST_Ops", "amount": 1234, "note": "TEST_"})
        assert r.status_code == 200
        r = requests.post(f"{API}/handovers", headers=H(tokens["superadmin"]), json={
            "date": TEST_DATE, "giver_id": rider_ids["tanjung"], "receiver_id": rider_ids["ricky"], "amount": 50000
        })
        assert r.status_code == 200

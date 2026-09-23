"""SI FOUR AM iteration-2 revision tests: bundles, EOD lock, lookup, deposits w/bundles,
invoices w/DP+pay, handover expenses, withdrawals w/balance guard, packaging recipes, config."""
import os
import uuid
import pytest
import requests
from datetime import date, timedelta

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    with open("/app/frontend/.env") as f:
        for ln in f:
            if ln.startswith("REACT_APP_BACKEND_URL="):
                BASE_URL = ln.split("=", 1)[1].strip().rstrip("/")
API = f"{BASE_URL}/api"
PHOTO = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgAAIAAAUAAeImBZsAAAAASUVORK5CYII="

TODAY = str(date.today())
TDATE = str(date.today() - timedelta(days=20))
TDATE2 = str(date.today() - timedelta(days=21))
TDATE3 = str(date.today() - timedelta(days=22))
TDATE4 = str(date.today() - timedelta(days=23))

CREDS = {
    "super": ("baa", "Nai130994"),
    "bar": ("alif", "Jkt221112"),
    "rider": ("ricky", "Jkt221112"),
}


def H(t): return {"Authorization": f"Bearer {t}"}


@pytest.fixture(scope="session")
def tok():
    out = {}
    for k, (u, p) in CREDS.items():
        r = requests.post(f"{API}/auth/login", json={"identifier": u, "password": p, "remember": False})
        assert r.status_code == 200, r.text
        out[k] = r.json()["token"]
    return out


@pytest.fixture(scope="session")
def users(tok):
    us = requests.get(f"{API}/users", headers=H(tok["super"])).json()
    return {u["username"]: u for u in us}


@pytest.fixture(scope="session")
def menus(tok):
    return requests.get(f"{API}/menus", headers=H(tok["super"])).json()


# ---------- Rider stock: photo mandatory + pic_name/time/detail ----------
class TestRiderStockPhoto:
    def test_no_photo_400(self, tok, users, menus):
        rid = users["fikar"]["id"]
        # ensure no prev by using a very unique date
        d = TDATE4
        # First cleanup any existing (upsert to same date w/ empty items would still require photo)
        r = requests.post(f"{API}/rider-stock", headers=H(tok["bar"]),
                          json={"rider_id": rid, "date": d, "items": {menus[0]["id"]: 3}})
        # If prev exists with a photo, it will succeed. Try a truly novel date instead
        if r.status_code == 200:
            pytest.skip("previous stock exists on date; cannot cleanly test photo-required")
        assert r.status_code == 400
        assert "photo" in r.text.lower()

    def test_with_photo_returns_meta(self, tok, users, menus):
        rid = users["fikar"]["id"]
        d = TDATE4
        r = requests.post(f"{API}/rider-stock", headers=H(tok["bar"]),
                          json={"rider_id": rid, "date": d, "items": {menus[0]["id"]: 5, menus[1]["id"]: 5}, "photo": PHOTO})
        assert r.status_code == 200, r.text
        j = r.json()
        assert j["pic_name"]  # PIC auto
        assert j["time"] and ":" in j["time"]
        assert isinstance(j["detail"], dict) and len(j["detail"]) >= 1


# ---------- Sales / Bundles / Lock ----------
class TestBundleSales:
    @pytest.fixture(autouse=True)
    def _setup(self, tok, users, menus):
        self.rid = users["fikar"]["id"]
        # find two 12000 menus
        self.m12 = [m for m in menus if m["price"] == 12000]
        assert len(self.m12) >= 2, "Need >=2 Rp12.000 menus"
        self.non12 = next((m for m in menus if m["price"] != 12000), None)
        # ensure ample rider stock on TDATE
        requests.post(f"{API}/rider-stock", headers=H(tok["bar"]),
                      json={"rider_id": self.rid, "date": TDATE, "items": {self.m12[0]["id"]: 30, self.m12[1]["id"]: 30, **({self.non12["id"]: 5} if self.non12 else {})}, "photo": PHOTO})

    def test_bundle1_valid(self, tok):
        cid = f"test-b1-{uuid.uuid4()}"
        body = {
            "rider_id": self.rid, "date": TDATE,
            "items": [{"bundle": 1, "qty": 1, "components": {self.m12[0]["id"]: 2, self.m12[1]["id"]: 2}}],
            "payment_method": "cash", "cash_received": 45000, "client_id": cid,
        }
        r = requests.post(f"{API}/sales", headers=H(tok["bar"]), json=body)
        assert r.status_code == 200, r.text
        j = r.json()
        assert j["total"] == 45000
        assert j["cups"] == 4
        # idempotency
        r2 = requests.post(f"{API}/sales", headers=H(tok["bar"]), json=body)
        assert r2.status_code == 200
        assert r2.json()["receipt_no"] == j["receipt_no"]

    def test_bundle_wrong_component_count(self, tok):
        body = {"rider_id": self.rid, "date": TDATE,
                "items": [{"bundle": 1, "qty": 1, "components": {self.m12[0]["id"]: 3}}],  # 3 not 4
                "payment_method": "cash"}
        r = requests.post(f"{API}/sales", headers=H(tok["bar"]), json=body)
        assert r.status_code == 400

    def test_bundle_non_12k_component(self, tok):
        if not self.non12:
            pytest.skip("no non-12k menu")
        body = {"rider_id": self.rid, "date": TDATE,
                "items": [{"bundle": 1, "qty": 1, "components": {self.non12["id"]: 4}}],
                "payment_method": "cash"}
        r = requests.post(f"{API}/sales", headers=H(tok["bar"]), json=body)
        assert r.status_code == 400


# ---------- Sales lock: no stock, EOD closed ----------
class TestSalesLock:
    def test_no_initial_stock_400(self, tok, users, menus):
        # rider si4am4 on TDATE3 - no stock created
        rid = users["si4am4"]["id"]
        r = requests.post(f"{API}/sales", headers=H(tok["bar"]), json={
            "rider_id": rid, "date": TDATE3, "items": [{"menu_id": menus[0]["id"], "qty": 1}],
            "payment_method": "cash", "cash_received": 12000})
        assert r.status_code == 400
        assert "stock" in r.text.lower()

    def test_after_eod_close_blocks_sale(self, tok, users, menus):
        rid = users["rijal"]["id"]
        d = TDATE2
        # seed stock + one sale
        requests.post(f"{API}/rider-stock", headers=H(tok["bar"]),
                      json={"rider_id": rid, "date": d, "items": {menus[0]["id"]: 5}, "photo": PHOTO})
        r = requests.post(f"{API}/sales", headers=H(tok["bar"]), json={
            "rider_id": rid, "date": d, "items": [{"menu_id": menus[0]["id"], "qty": 1}],
            "payment_method": "cash", "cash_received": menus[0]["price"]})
        assert r.status_code == 200
        # close EOD
        rc = requests.post(f"{API}/sales/eod/close", headers=H(tok["bar"]), json={"rider_id": rid, "date": d})
        assert rc.status_code == 200
        # further sale must fail
        r2 = requests.post(f"{API}/sales", headers=H(tok["bar"]), json={
            "rider_id": rid, "date": d, "items": [{"menu_id": menus[0]["id"], "qty": 1}],
            "payment_method": "cash", "cash_received": menus[0]["price"]})
        assert r2.status_code == 400
        # pos/stock returns closed flag
        st = requests.get(f"{API}/pos/stock", headers=H(tok["bar"]), params={"rider_id": rid, "date": d}).json()
        assert st["closed"] is True


# ---------- Customer lookup ----------
class TestCustomerLookup:
    def test_lookup_by_phone_prefix(self, tok, users, menus):
        rid = users["fikar"]["id"]
        # ensure stock
        requests.post(f"{API}/rider-stock", headers=H(tok["bar"]),
                      json={"rider_id": rid, "date": TDATE, "items": {menus[0]["id"]: 10}, "photo": PHOTO})
        phone = "0812345XYZ"
        r = requests.post(f"{API}/sales", headers=H(tok["bar"]), json={
            "rider_id": rid, "date": TDATE, "customer_name": "TEST_Lookup", "customer_phone": phone,
            "items": [{"menu_id": menus[0]["id"], "qty": 1}], "payment_method": "cash", "cash_received": menus[0]["price"]})
        assert r.status_code == 200
        lu = requests.get(f"{API}/customers/lookup", headers=H(tok["bar"]), params={"phone": phone[:5]}).json()
        assert any(c.get("phone") == phone for c in lu["customers"])

    def test_lookup_unpaid_invoice(self, tok, menus):
        phone = "0899UNPAID1"
        # create unpaid invoice
        rv = requests.post(f"{API}/invoices", headers=H(tok["super"]), json={
            "customer_name": "TEST_Unpaid", "customer_phone": phone, "date": TDATE,
            "rows": [{"menu_id": menus[0]["id"], "qty": 5}], "down_payment": 1000})
        assert rv.status_code == 200
        lu = requests.get(f"{API}/customers/lookup", headers=H(tok["super"]), params={"phone": phone[:5]}).json()
        assert lu["unpaid_invoice"] is not None
        assert lu["unpaid_invoice"]["customer_phone"] == phone


# ---------- Deposits with bundles ----------
class TestDepositBundles:
    def test_deposit_with_bundles(self, tok, users, menus):
        rid = users["fikar"]["id"]
        d = TDATE
        m12 = [m for m in menus if m["price"] == 12000][:2]
        # ensure stock
        requests.post(f"{API}/rider-stock", headers=H(tok["bar"]),
                      json={"rider_id": rid, "date": d, "items": {m12[0]["id"]: 30, m12[1]["id"]: 30}, "photo": PHOTO})
        body = {
            "rider_id": rid, "date": d,
            "rows": [{"menu_id": m12[0]["id"], "stock": 30, "remaining": 20, "cash": 0, "qris": 0, "wastage": 0},
                     {"menu_id": m12[1]["id"], "stock": 30, "remaining": 20, "cash": 0, "qris": 0, "wastage": 0}],
            "bundles": [
                {"bundle": 1, "method": "cash", "qty": 1, "items": {m12[0]["id"]: 2, m12[1]["id"]: 2}},
                {"bundle": 2, "method": "qris", "qty": 1, "items": {m12[0]["id"]: 8, m12[1]["id"]: 2}},
            ],
            "expenses": 0, "debt_payment": 0,
        }
        r = requests.post(f"{API}/deposits", headers=H(tok["bar"]), json=body)
        assert r.status_code == 200, r.text
        j = r.json()
        # cash side: bundling 1 = 45k
        assert j["total_cash"] == 45000, j["total_cash"]
        # qris side: bundling 2 = 110k
        assert j["total_qris"] == 110000, j["total_qris"]
        # commission 20k (cups > 0)
        assert j["commission"] == 20000
        # time field
        assert j.get("time") and ":" in j["time"]
        # upsert: post again same rider+date returns same id
        r2 = requests.post(f"{API}/deposits", headers=H(tok["bar"]), json=body)
        assert r2.status_code == 200
        assert r2.json()["id"] == j["id"]


# ---------- Invoices w/ DP + pay + client_id ----------
class TestInvoicesFlow:
    def test_dp_less_than_total(self, tok, menus):
        cid = f"test-inv-{uuid.uuid4()}"
        r = requests.post(f"{API}/invoices", headers=H(tok["super"]), json={
            "customer_name": "TEST_DP", "customer_phone": "0821DP",
            "date": TDATE, "rows": [{"menu_id": menus[0]["id"], "qty": 3}],
            "down_payment": 5000, "client_id": cid,
        })
        assert r.status_code == 200, r.text
        j = r.json()
        assert j["status"] == "unpaid"
        assert j["remaining"] == j["total"] - 5000
        # idempotency
        r2 = requests.post(f"{API}/invoices", headers=H(tok["super"]), json={
            "customer_name": "TEST_DP", "customer_phone": "0821DP",
            "date": TDATE, "rows": [{"menu_id": menus[0]["id"], "qty": 3}],
            "down_payment": 5000, "client_id": cid,
        })
        assert r2.json()["id"] == j["id"]
        # pay full remaining
        rp = requests.post(f"{API}/invoices/{j['id']}/pay", headers=H(tok["super"]), json={"amount": j["remaining"], "method": "cash"})
        assert rp.status_code == 200
        assert rp.json()["status"] == "paid"
        assert rp.json()["remaining"] == 0


# ---------- Handover expected + expenses ----------
class TestHandover:
    def test_expected_and_expenses(self, tok, users):
        # expected_cash from deposits in range TDATE range
        exp = requests.get(f"{API}/handovers/expected", headers=H(tok["super"]),
                           params={"start": TDATE4, "end": TDATE}).json()
        assert "expected_cash" in exp
        expected = exp["expected_cash"]
        # create handover with expenses list
        cid = f"test-ho-{uuid.uuid4()}"
        body = {
            "date": TDATE, "period_start": TDATE4, "period_end": TDATE,
            "giver_id": users["ricky"]["id"], "receiver_id": users["baa"]["id"],
            "expected_cash": expected, "received_cash": expected - 15000,
            "expenses": [{"name": "TEST_Bensin", "amount": 10000}, {"name": "TEST_Parkir", "amount": 5000}],
            "client_id": cid,
        }
        r = requests.post(f"{API}/handovers", headers=H(tok["super"]), json=body)
        assert r.status_code == 200, r.text
        j = r.json()
        assert j["total_expenses"] == 15000
        assert j["difference"] == expected - (expected - 15000) - 15000  # =0
        # expenses collection contains them (category Handover Expense)
        ex = requests.get(f"{API}/expenses", headers=H(tok["super"]),
                         params={"start": TDATE, "end": TDATE}).json()
        assert any(e["category"] == "Handover Expense" and e["note"] == "TEST_Bensin" for e in ex)
        # finance ledger contains category
        fin = requests.get(f"{API}/finance/summary", headers=H(tok["super"]),
                           params={"start": TDATE, "end": TDATE}).json()
        assert any(l["category"] == "Handover Expense" for l in fin["ledger"])


# ---------- Salary + Withdrawals ----------
class TestSalaryWithdrawal:
    def test_salary_fields_and_no_20cup_rule(self, tok):
        r = requests.get(f"{API}/salary", headers=H(tok["super"]),
                         params={"start": TDATE4, "end": TODAY})
        assert r.status_code == 200
        j = r.json()
        assert "riders" in j
        for rd in j["riders"]:
            for k in ("allowance", "allowance_available", "incentive_available", "allowance_days"):
                assert k in rd
            # allowance == allowance_days * 20000, no 20-cup rule
            assert rd["allowance"] == rd["allowance_days"] * 20000

    def test_withdrawal_exceeds_balance(self, tok, users):
        r = requests.post(
            f"{API}/withdrawals",
            headers=H(tok["super"]),
            params={"start": TDATE4, "end": TODAY},
            json={"rider_id": users["ricky"]["id"], "date": TODAY, "type": "allowance", "method": "cash", "amount": 999999999}
        )
        assert r.status_code == 400

    def test_withdrawal_valid_appears_in_ledger(self, tok, users):
        # figure out available first
        sal = requests.get(f"{API}/salary", headers=H(tok["super"]),
                           params={"start": TDATE4, "end": TODAY, "rider_id": users["ricky"]["id"]}).json()
        avail = sal["riders"][0]["allowance_available"]
        if avail <= 0:
            pytest.skip("no allowance available for ricky")
        amt = min(avail, 20000)
        r = requests.post(
            f"{API}/withdrawals",
            headers=H(tok["super"]),
            params={"start": TDATE4, "end": TODAY},
            json={"rider_id": users["ricky"]["id"], "date": TODAY, "type": "allowance", "method": "cash", "amount": amt}
        )
        assert r.status_code == 200, r.text
        # appears in list
        wds = requests.get(f"{API}/withdrawals", headers=H(tok["super"]),
                           params={"start": TODAY, "end": TODAY}).json()
        assert any(w["rider_id"] == users["ricky"]["id"] and w["amount"] == amt for w in wds)
        # finance ledger has Rider Allowance out
        fin = requests.get(f"{API}/finance/summary", headers=H(tok["super"]),
                           params={"start": TODAY, "end": TODAY}).json()
        assert any(l["category"] == "Rider Allowance" and l["type"] == "out" for l in fin["ledger"])


# ---------- Menus packaging in recipe + produce ----------
class TestPackagingRecipe:
    def test_recipe_length_has_packaging(self, tok):
        menus = requests.get(f"{API}/menus", headers=H(tok["super"])).json()
        # coffee menus should now include packaging (>= 6 items)
        long_recipes = [m for m in menus if len(m["recipe"]) >= 6]
        assert long_recipes, f"No menus have recipe length >=6; sample: {[(m['name'], len(m['recipe'])) for m in menus]}"

    def test_produce_deducts_packaging(self, tok):
        menus = requests.get(f"{API}/menus", headers=H(tok["super"])).json()
        mats_before = {m["id"]: m["stock"] for m in requests.get(f"{API}/materials", headers=H(tok["super"])).json()}
        menu = max(menus, key=lambda m: len(m["recipe"]))
        r = requests.post(f"{API}/menu-stock/produce", headers=H(tok["super"]),
                          json={"menu_id": menu["id"], "qty": 1, "date": TDATE, "type": "produce"})
        assert r.status_code == 200
        mats_after = {m["id"]: m["stock"] for m in requests.get(f"{API}/materials", headers=H(tok["super"])).json()}
        for rec in menu["recipe"]:
            assert mats_after[rec["material_id"]] == mats_before[rec["material_id"]] - rec["qty"]


# ---------- Config apps_script_url ----------
class TestConfig:
    def test_get_config(self, tok):
        r = requests.get(f"{API}/config", headers=H(tok["super"]))
        assert r.status_code == 200
        assert "apps_script_url" in r.json()

    def test_put_config_super_only(self, tok):
        url = "https://script.example/TEST_" + uuid.uuid4().hex[:6]
        r = requests.put(f"{API}/config", headers=H(tok["super"]), json={"apps_script_url": url})
        assert r.status_code == 200
        assert r.json()["apps_script_url"] == url
        # barteam forbidden
        rb = requests.put(f"{API}/config", headers=H(tok["bar"]), json={"apps_script_url": url})
        assert rb.status_code == 403

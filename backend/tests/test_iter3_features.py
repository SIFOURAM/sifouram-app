"""Iteration-3 feature tests: banks-in-profile, coach-chat, accept-withdrawal."""
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

TODAY = str(date.today())
PHOTO = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgAAIAAAUAAeImBZsAAAAASUVORK5CYII="


def H(t): return {"Authorization": f"Bearer {t}"}


@pytest.fixture(scope="module")
def tok():
    out = {}
    for k, (u, p) in {"super": ("baa", "Nai130994"), "rider": ("fikar", "Jkt221112"), "bar": ("alif", "Jkt221112")}.items():
        r = requests.post(f"{API}/auth/login", json={"identifier": u, "password": p, "remember": False})
        assert r.status_code == 200, r.text
        out[k] = r.json()["token"]
    return out


@pytest.fixture(scope="module")
def users(tok):
    us = requests.get(f"{API}/users", headers=H(tok["super"])).json()
    return {u["username"]: u for u in us}


# ---------- Feature 3: banks in profile ----------
class TestProfileBanks:
    def test_get_profile_ok(self, tok):
        r = requests.get(f"{API}/auth/me", headers=H(tok["rider"]))
        assert r.status_code == 200

    def test_put_banks_and_persist(self, tok):
        banks = [
            {"bank_name": "BCA", "bank_account": "1234567890", "bank_holder": "Fikar A"},
            {"bank_name": "Mandiri", "bank_account": "2222222222", "bank_holder": "Fikar B"},
            {"bank_name": "BRI", "bank_account": "3333333333", "bank_holder": "Fikar C"},
        ]
        r = requests.put(f"{API}/auth/profile", headers=H(tok["rider"]), json={"banks": banks})
        assert r.status_code == 200, r.text
        # verify persisted via /auth/me
        me = requests.get(f"{API}/auth/me", headers=H(tok["rider"])).json()
        got = me.get("banks") or []
        assert len(got) == 3
        names = [b.get("bank_name") for b in got]
        assert names == ["BCA", "Mandiri", "BRI"]

    def test_reduce_banks(self, tok):
        # remove middle → keep 2
        banks = [
            {"bank_name": "BCA", "bank_account": "1234567890", "bank_holder": "Fikar A"},
            {"bank_name": "BRI", "bank_account": "3333333333", "bank_holder": "Fikar C"},
        ]
        r = requests.put(f"{API}/auth/profile", headers=H(tok["rider"]), json={"banks": banks})
        assert r.status_code == 200
        me = requests.get(f"{API}/auth/me", headers=H(tok["rider"])).json()
        assert len(me.get("banks") or []) == 2


# ---------- Feature 1: coach chat AI ----------
class TestCoach:
    def test_coach_chat_rider(self, tok):
        r = requests.post(f"{API}/coach/chat", headers=H(tok["rider"]),
                          json={"message": "Rekomendasi spot ramai jam sekarang?"})
        assert r.status_code == 200, r.text
        j = r.json()
        assert "reply" in j and isinstance(j["reply"], str) and len(j["reply"]) > 0

    def test_coach_chat_super(self, tok):
        r = requests.post(f"{API}/coach/chat", headers=H(tok["super"]),
                          json={"message": "Ada tips jualan kopi keliling?"})
        assert r.status_code == 200
        assert "reply" in r.json()

    def test_coach_history(self, tok):
        r = requests.get(f"{API}/coach/history", headers=H(tok["rider"]))
        assert r.status_code == 200
        assert isinstance(r.json(), list)


# ---------- Feature 2: withdrawal accept ----------
class TestWithdrawalAccept:
    def test_full_flow(self, tok, users):
        rid = users["fikar"]["id"]
        # Pick period that covers today (16th→15th rule) — the test just needs range with data.
        # Use a wide range: last 30 days → today.
        start = str(date.today() - timedelta(days=30))
        end = TODAY
        # Ensure some allowance available: seed rider stock+sale so allowance_days>0.
        # Use a date within the period, but must be > eod-close etc.
        try:
            menus = requests.get(f"{API}/menus", headers=H(tok["super"])).json()
            m0 = menus[0]
            seed_date = str(date.today() - timedelta(days=2))
            requests.post(f"{API}/rider-stock", headers=H(tok["bar"]),
                          json={"rider_id": rid, "date": seed_date,
                                "items": {m0["id"]: 5}, "photo": PHOTO})
            requests.post(f"{API}/sales", headers=H(tok["bar"]), json={
                "rider_id": rid, "date": seed_date,
                "items": [{"menu_id": m0["id"], "qty": 1}],
                "payment_method": "cash", "cash_received": m0["price"],
            })
        except Exception as e:
            print("seed error:", e)

        sal = requests.get(f"{API}/salary", headers=H(tok["super"]),
                           params={"start": start, "end": end, "rider_id": rid}).json()
        if not sal.get("riders"):
            pytest.skip("no rider in salary")
        rd = sal["riders"][0]
        avail = rd.get("allowance_available", 0)
        if avail <= 0:
            pytest.skip(f"no allowance_available for fikar in {start}..{end}")

        amt = min(avail, 20000)
        # rider creates withdrawal via bank
        banks_r = (requests.get(f"{API}/auth/me", headers=H(tok["rider"])).json()).get("banks") or []
        bank = banks_r[0] if banks_r else {"bank_name": "BCA", "bank_account": "1234567890", "bank_holder": "Fikar A"}
        r = requests.post(f"{API}/withdrawals", headers=H(tok["rider"]),
                          params={"start": start, "end": end},
                          json={"rider_id": rid, "date": TODAY, "type": "allowance", "method": "bank",
                                "amount": amt, "bank_name": bank["bank_name"],
                                "bank_account": bank["bank_account"], "bank_holder": bank["bank_holder"]})
        assert r.status_code == 200, r.text
        wd = r.json()
        assert wd["status"] == "pending"
        wid = wd["id"]

        # GET /withdrawals returns status
        wlist = requests.get(f"{API}/withdrawals", headers=H(tok["super"]),
                             params={"start": TODAY, "end": TODAY}).json()
        assert any(w["id"] == wid and w["status"] == "pending" for w in wlist)

        # rider cannot accept
        rf = requests.post(f"{API}/withdrawals/{wid}/accept", headers=H(tok["rider"]))
        assert rf.status_code in (401, 403)

        # super accepts
        ra = requests.post(f"{API}/withdrawals/{wid}/accept", headers=H(tok["super"]))
        assert ra.status_code == 200, ra.text
        j = ra.json()
        assert j["status"] == "diterima"

        # verify persisted
        wlist2 = requests.get(f"{API}/withdrawals", headers=H(tok["super"]),
                              params={"start": TODAY, "end": TODAY}).json()
        assert any(w["id"] == wid and w["status"] == "diterima" for w in wlist2)

        # accept non-existent
        r404 = requests.post(f"{API}/withdrawals/does-not-exist/accept", headers=H(tok["super"]))
        assert r404.status_code == 404

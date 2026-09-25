"""Iter8: AI provider switching (gpt/claude/gemini) + history persistence."""
import os, requests, pytest, time

BASE = os.environ["REACT_APP_BACKEND_URL"].rstrip("/")

@pytest.fixture(scope="module")
def token():
    r = requests.post(f"{BASE}/api/auth/login", json={"identifier": "baa", "password": "Nai130994", "remember": True}, timeout=30)
    assert r.status_code == 200, r.text
    return r.json()["token"]

@pytest.fixture
def h(token):
    return {"Authorization": f"Bearer {token}"}

@pytest.mark.parametrize("provider", ["gpt", "claude", "gemini"])
def test_coach_provider(provider, h):
    r = requests.post(f"{BASE}/api/coach/chat",
                      json={"message": f"TEST_iter8 provider={provider} halo singkat", "provider": provider},
                      headers=h, timeout=90)
    assert r.status_code == 200, f"{provider}: {r.status_code} {r.text[:300]}"
    d = r.json()
    assert d.get("provider") == provider, d
    assert isinstance(d.get("reply"), str) and len(d["reply"]) > 0

def test_history_persists(h):
    r = requests.get(f"{BASE}/api/coach/history", headers=h, timeout=30)
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list) and len(data) >= 3
    provs = {d.get("provider") for d in data}
    # at least one of each recently sent should appear
    assert {"gpt", "claude", "gemini"} & provs

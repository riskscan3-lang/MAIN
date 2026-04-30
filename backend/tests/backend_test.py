"""
Backend API tests for XMRMine Pro.

Covers:
- GET /api/ health
- POST/GET /api/contact
- POST/GET /api/purchases (validation, filtering, status defaulting, address lowercasing)
"""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL")
if not BASE_URL:
    # Fall back to reading frontend env file (public URL) for testing what the user sees
    env_path = "/app/frontend/.env"
    if os.path.exists(env_path):
        with open(env_path) as f:
            for line in f:
                if line.startswith("REACT_APP_BACKEND_URL="):
                    BASE_URL = line.split("=", 1)[1].strip().strip('"')
                    break

assert BASE_URL, "REACT_APP_BACKEND_URL must be set"
BASE_URL = BASE_URL.rstrip("/")
API = f"{BASE_URL}/api"


# ---------- Fixtures ----------
@pytest.fixture(scope="module")
def api_client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


def _rand_addr():
    # 42-char eth-style address (0x + 40 hex)
    return "0x" + uuid.uuid4().hex + uuid.uuid4().hex[:8]


def _rand_tx():
    # 66-char tx hash (0x + 64 hex)
    return "0x" + uuid.uuid4().hex + uuid.uuid4().hex


# ---------- Health ----------
class TestHealth:
    def test_root(self, api_client):
        r = api_client.get(f"{API}/")
        assert r.status_code == 200
        assert r.json() == {"message": "Hello World"}


# ---------- Contact ----------
class TestContact:
    def test_post_contact_valid(self, api_client):
        payload = {
            "name": "TEST_John",
            "email": "test_john@example.com",
            "subject": "TEST Subject",
            "message": "Hello from automated tests",
        }
        r = api_client.post(f"{API}/contact", json=payload)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["name"] == payload["name"]
        assert data["email"] == payload["email"]
        assert data["subject"] == payload["subject"]
        assert data["message"] == payload["message"]
        assert "id" in data and isinstance(data["id"], str) and len(data["id"]) > 0
        assert "created_at" in data
        # stash for verification in next test
        pytest.contact_id = data["id"]
        pytest.contact_email = data["email"]

    def test_post_contact_invalid_email(self, api_client):
        payload = {
            "name": "TEST_Bad",
            "email": "not-an-email",
            "subject": "X",
            "message": "X",
        }
        r = api_client.post(f"{API}/contact", json=payload)
        assert r.status_code == 422, r.text

    def test_post_contact_missing_field(self, api_client):
        r = api_client.post(f"{API}/contact", json={"name": "TEST_NoEmail"})
        assert r.status_code == 422

    def test_get_contact_list_contains_created(self, api_client):
        r = api_client.get(f"{API}/contact")
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        ids = [m.get("id") for m in data]
        assert getattr(pytest, "contact_id", None) in ids, "Newly created contact not found in list"
        # sorted desc by created_at: first item's created_at >= second's
        if len(data) >= 2:
            assert data[0]["created_at"] >= data[1]["created_at"]


# ---------- Purchases ----------
class TestPurchases:
    def test_post_purchase_valid_usdt(self, api_client):
        addr = _rand_addr()
        tx = _rand_tx()
        payload = {
            "plan_id": "TEST_PLAN_1",
            "plan_name": "Starter",
            "buyer_address": addr.upper(),  # test lowercase normalization
            "amount": "100.00",
            "chain": 1,
            "tx_hash": tx,
            "token_type": "USDT",
        }
        r = api_client.post(f"{API}/purchases", json=payload)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["plan_id"] == "TEST_PLAN_1"
        assert data["plan_name"] == "Starter"
        assert data["buyer_address"] == addr.lower()
        assert data["amount"] == "100.00"
        assert data["chain"] == 1
        assert data["tx_hash"] == tx
        assert data["token_type"] == "USDT"
        assert data["status"] == "pending"
        assert "id" in data and data["id"]
        assert "created_at" in data
        pytest.purchase_addr = addr.lower()
        pytest.purchase_tx = tx
        pytest.purchase_id = data["id"]

    def test_post_purchase_valid_native_polygon(self, api_client):
        payload = {
            "plan_id": "TEST_PLAN_2",
            "plan_name": "Pro",
            "buyer_address": _rand_addr(),
            "amount": "0.5",
            "chain": 137,
            "tx_hash": _rand_tx(),
            "token_type": "NATIVE",
        }
        r = api_client.post(f"{API}/purchases", json=payload)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["chain"] == 137
        assert data["token_type"] == "NATIVE"
        assert data["status"] == "pending"

    def test_post_purchase_valid_bsc(self, api_client):
        payload = {
            "plan_id": "TEST_PLAN_3",
            "plan_name": "Elite",
            "buyer_address": _rand_addr(),
            "amount": "250",
            "chain": 56,
            "tx_hash": _rand_tx(),
            "token_type": "USDT",
        }
        r = api_client.post(f"{API}/purchases", json=payload)
        assert r.status_code == 200, r.text
        assert r.json()["chain"] == 56

    def test_post_purchase_bad_address_length(self, api_client):
        payload = {
            "plan_id": "TEST_BAD",
            "buyer_address": "0x1234567890",  # 12 chars, not 42
            "amount": "10",
            "chain": 1,
            "tx_hash": _rand_tx(),
            "token_type": "USDT",
        }
        r = api_client.post(f"{API}/purchases", json=payload)
        assert r.status_code == 422, r.text

    def test_post_purchase_bad_tx_hash_length(self, api_client):
        payload = {
            "plan_id": "TEST_BAD",
            "buyer_address": _rand_addr(),
            "amount": "10",
            "chain": 1,
            "tx_hash": "0xabc",  # too short
            "token_type": "USDT",
        }
        r = api_client.post(f"{API}/purchases", json=payload)
        assert r.status_code == 422

    def test_post_purchase_missing_fields(self, api_client):
        r = api_client.post(f"{API}/purchases", json={"plan_id": "X"})
        assert r.status_code == 422

    def test_get_purchases_list(self, api_client):
        r = api_client.get(f"{API}/purchases")
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        ids = [p["id"] for p in data]
        assert getattr(pytest, "purchase_id", None) in ids

    def test_get_purchases_filter_by_address(self, api_client):
        addr = getattr(pytest, "purchase_addr", None)
        assert addr, "precondition: purchase_addr must be set"
        # Query with UPPERCASE to verify server-side lowercase match
        r = api_client.get(f"{API}/purchases", params={"buyer_address": addr.upper()})
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        assert len(data) >= 1
        for p in data:
            assert p["buyer_address"] == addr

    def test_get_purchases_filter_unknown_address(self, api_client):
        unknown = "0x" + "a" * 40
        r = api_client.get(f"{API}/purchases", params={"buyer_address": unknown})
        assert r.status_code == 200
        assert r.json() == [] or all(p["buyer_address"] == unknown for p in r.json())

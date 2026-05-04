"""
Backend API tests for Admin Withdrawal flow + regression on xmr/price, referrals, purchases.

Coverage:
- Admin auth enforcement on GET /api/admin/withdrawals (missing header, bad wallet, good wallet)
- GET /api/admin/withdrawals?status=pending filter
- PATCH /api/admin/withdrawals/{id} full state machine: pending → processing → completed
- PATCH with rejected + admin_note
- PATCH with nonexistent id → 404
- POST /api/withdrawals creates record, Telegram notification best-effort (non-blocking),
  and GET /api/wallet/{addr}/withdrawals reflects the new record.
- Regression: /api/xmr/price, /api/wallet/{addr}/referrals, /api/purchases CRUD
"""
import os
import uuid
import time
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL")
if not BASE_URL:
    env_path = "/app/frontend/.env"
    if os.path.exists(env_path):
        with open(env_path) as f:
            for line in f:
                if line.startswith("REACT_APP_BACKEND_URL="):
                    BASE_URL = line.split("=", 1)[1].strip().strip('"')
                    break

assert BASE_URL, "REACT_APP_BACKEND_URL must be set"
API = BASE_URL.rstrip("/") + "/api"

ADMIN_WALLET = "0x717e6e1c8539fc91d3a65f7b473fb8809429a5e5"
NON_ADMIN_WALLET = "0x000000000000000000000000000000000000dEaD"


def _rand_addr():
    return "0x" + uuid.uuid4().hex + uuid.uuid4().hex[:8]


def _rand_tx():
    return "0x" + uuid.uuid4().hex + uuid.uuid4().hex


@pytest.fixture(scope="module")
def api_client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def seeded_wallet_with_purchase(api_client):
    """Create a wallet that has a purchase so it can create withdrawals."""
    addr = _rand_addr().lower()
    tx = _rand_tx()
    r = api_client.post(f"{API}/purchases", json={
        "plan_id": "TEST_PLAN_W",
        "plan_name": "Starter",
        "buyer_address": addr,
        "amount": "100.00",
        "chain": 1,
        "tx_hash": tx,
        "token_type": "USDT",
    })
    assert r.status_code == 200, r.text
    return addr


# ===== Admin endpoint: auth =====
class TestAdminAuth:
    def test_missing_header_401(self, api_client):
        r = api_client.get(f"{API}/admin/withdrawals")
        assert r.status_code == 401, r.text

    def test_non_admin_wallet_401(self, api_client):
        r = api_client.get(
            f"{API}/admin/withdrawals",
            headers={"X-Admin-Wallet": NON_ADMIN_WALLET},
        )
        assert r.status_code == 401, r.text

    def test_admin_wallet_200_list(self, api_client):
        r = api_client.get(
            f"{API}/admin/withdrawals",
            headers={"X-Admin-Wallet": ADMIN_WALLET},
        )
        assert r.status_code == 200, r.text
        data = r.json()
        assert isinstance(data, list)

    def test_admin_wallet_uppercase_ok(self, api_client):
        # Admin check lowercases the header value, so uppercase should still work
        r = api_client.get(
            f"{API}/admin/withdrawals",
            headers={"X-Admin-Wallet": ADMIN_WALLET.upper()},
        )
        assert r.status_code == 200, r.text


# ===== Withdrawal creation + listing =====
class TestWithdrawalCreate:
    def test_create_withdrawal_requires_purchase(self, api_client):
        addr = _rand_addr().lower()
        r = api_client.post(f"{API}/withdrawals", json={
            "wallet_address": addr,
            "amount_usd": 50.0,
            "available_usd": 100.0,
            "xmr_address": "4TestXMRAddressForAutomationTests",
            "contact_email": "test_w@example.com",
        })
        assert r.status_code == 400, r.text
        assert "No active plan" in r.json().get("detail", "")

    def test_create_withdrawal_min_amount(self, api_client, seeded_wallet_with_purchase):
        addr = seeded_wallet_with_purchase
        r = api_client.post(f"{API}/withdrawals", json={
            "wallet_address": addr,
            "amount_usd": 5.0,  # below min $10
            "available_usd": 100.0,
            "xmr_address": "4TestXMR",
        })
        assert r.status_code == 400, r.text

    def test_create_withdrawal_success_and_listed(self, api_client, seeded_wallet_with_purchase):
        addr = seeded_wallet_with_purchase
        payload = {
            "wallet_address": addr,
            "amount_usd": 15.50,
            "available_usd": 100.0,
            "xmr_address": "4TestXMRAddressForAutomation",
            "contact_email": "test_w@example.com",
        }
        r = api_client.post(f"{API}/withdrawals", json=payload)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["wallet_address"] == addr
        assert data["amount_usd"] == 15.5
        assert data["status"] == "pending"
        assert data["id"]
        assert data["contact_email"] == "test_w@example.com"
        # admin_notified may be True (Telegram sends) or False (fails). Both acceptable.
        assert isinstance(data["admin_notified"], bool)

        pytest.withdrawal_id = data["id"]
        pytest.withdrawal_addr = addr

        # GET /api/wallet/{addr}/withdrawals should show it
        r2 = api_client.get(f"{API}/wallet/{addr}/withdrawals")
        assert r2.status_code == 200
        lst = r2.json()
        assert any(w["id"] == data["id"] for w in lst), "New withdrawal not found in wallet listing"

    def test_create_withdrawal_conflict_when_pending(self, api_client, seeded_wallet_with_purchase):
        addr = seeded_wallet_with_purchase
        r = api_client.post(f"{API}/withdrawals", json={
            "wallet_address": addr,
            "amount_usd": 20.0,
            "available_usd": 100.0,
            "xmr_address": "4TestXMR",
        })
        assert r.status_code == 409, r.text


# ===== Admin list filter =====
class TestAdminListFilter:
    def test_filter_pending(self, api_client):
        r = api_client.get(
            f"{API}/admin/withdrawals",
            params={"status": "pending"},
            headers={"X-Admin-Wallet": ADMIN_WALLET},
        )
        assert r.status_code == 200, r.text
        data = r.json()
        assert isinstance(data, list)
        for w in data:
            assert w["status"] == "pending"
        # Our created one should be in here
        wid = getattr(pytest, "withdrawal_id", None)
        if wid:
            assert any(w["id"] == wid for w in data), "Pending withdrawal missing from filtered list"

    def test_filter_completed(self, api_client):
        r = api_client.get(
            f"{API}/admin/withdrawals",
            params={"status": "completed"},
            headers={"X-Admin-Wallet": ADMIN_WALLET},
        )
        assert r.status_code == 200
        for w in r.json():
            assert w["status"] == "completed"


# ===== PATCH state machine =====
class TestAdminPatch:
    def test_patch_requires_admin(self, api_client):
        wid = getattr(pytest, "withdrawal_id", None)
        assert wid
        r = api_client.patch(f"{API}/admin/withdrawals/{wid}", json={"status": "processing"})
        assert r.status_code == 401

    def test_patch_nonexistent_404(self, api_client):
        bogus = str(uuid.uuid4())
        r = api_client.patch(
            f"{API}/admin/withdrawals/{bogus}",
            json={"status": "processing"},
            headers={"X-Admin-Wallet": ADMIN_WALLET},
        )
        assert r.status_code == 404, r.text

    def test_patch_pending_to_processing(self, api_client):
        wid = getattr(pytest, "withdrawal_id", None)
        assert wid
        r = api_client.patch(
            f"{API}/admin/withdrawals/{wid}",
            json={"status": "processing"},
            headers={"X-Admin-Wallet": ADMIN_WALLET},
        )
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["status"] == "processing"
        # processed_at should NOT be set for processing (only completed/rejected)
        assert data.get("processed_at") is None

    def test_patch_processing_to_completed_with_tx(self, api_client):
        wid = getattr(pytest, "withdrawal_id", None)
        tx = _rand_tx()
        r = api_client.patch(
            f"{API}/admin/withdrawals/{wid}",
            json={"status": "completed", "payout_tx_hash": tx},
            headers={"X-Admin-Wallet": ADMIN_WALLET},
        )
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["status"] == "completed"
        assert data["payout_tx_hash"] == tx
        assert data["processed_at"] is not None

        # Verify via admin list
        r2 = api_client.get(
            f"{API}/admin/withdrawals",
            headers={"X-Admin-Wallet": ADMIN_WALLET},
        )
        assert r2.status_code == 200
        w = next((x for x in r2.json() if x["id"] == wid), None)
        assert w is not None
        assert w["status"] == "completed"
        assert w["payout_tx_hash"] == tx

    def test_patch_rejected_stores_admin_note(self, api_client, seeded_wallet_with_purchase):
        # Need a fresh withdrawal on a fresh wallet (first wallet's is now "completed"
        # but there is no pending-conflict check blocking us since old one is completed).
        addr = _rand_addr().lower()
        tx = _rand_tx()
        r = api_client.post(f"{API}/purchases", json={
            "plan_id": "TEST_PLAN_R",
            "plan_name": "Starter",
            "buyer_address": addr,
            "amount": "100.00",
            "chain": 1,
            "tx_hash": tx,
            "token_type": "USDT",
        })
        assert r.status_code == 200

        r = api_client.post(f"{API}/withdrawals", json={
            "wallet_address": addr,
            "amount_usd": 25.0,
            "available_usd": 100.0,
            "xmr_address": "4RejectedTestAddr",
        })
        assert r.status_code == 200
        wid = r.json()["id"]

        note = "TEST reject: invalid XMR address"
        r = api_client.patch(
            f"{API}/admin/withdrawals/{wid}",
            json={"status": "rejected", "admin_note": note},
            headers={"X-Admin-Wallet": ADMIN_WALLET},
        )
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["status"] == "rejected"
        assert data["admin_note"] == note
        assert data["processed_at"] is not None


# ===== Regression =====
class TestRegression:
    def test_xmr_price(self, api_client):
        r = api_client.get(f"{API}/xmr/price")
        assert r.status_code == 200, r.text
        data = r.json()
        # Actual response shape: {price_usd, source, fetched_at}
        assert "price_usd" in data
        assert isinstance(data["price_usd"], (int, float))
        assert data["price_usd"] > 0

    def test_wallet_referrals(self, api_client):
        addr = _rand_addr().lower()
        r = api_client.get(f"{API}/wallet/{addr}/referrals")
        assert r.status_code == 200, r.text
        data = r.json()
        # Structure check
        assert "referral_code" in data or "code" in data or isinstance(data, dict)

    def test_purchases_list(self, api_client):
        r = api_client.get(f"{API}/purchases")
        assert r.status_code == 200
        assert isinstance(r.json(), list)

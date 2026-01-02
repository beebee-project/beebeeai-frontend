const API_BASE =
  window.location.hostname === "localhost"
    ? "http://localhost:3000"
    : "https://beebeeai-backend-production.up.railway.app";

const token =
  localStorage.getItem("token") ||
  localStorage.getItem("accessToken") ||
  localStorage.getItem("jwt");

const urlParams = new URLSearchParams(window.location.search);
const authKey = urlParams.get("authKey");
const customerKeyFromQuery = urlParams.get("customerKey");

// start에서 저장해둔 customerKey를 우선 사용(더 신뢰 가능)
let pending = {};
try {
  pending = JSON.parse(localStorage.getItem("pendingSubscription") || "{}");
} catch (e) {}
const customerKey = pending.customerKey || customerKeyFromQuery;

const loadingEl = document.querySelector(".confirm-loading");
const successEl = document.querySelector(".confirm-success");

const authKeyEl = document.getElementById("authKey");
const customerKeyEl = document.getElementById("customerKey");
if (authKeyEl) authKeyEl.textContent = authKey || "-";
if (customerKeyEl) customerKeyEl.textContent = customerKey || "-";

async function completeSubscription() {
  if (!token) {
    alert("로그인이 만료되었습니다. 다시 로그인해주세요.");
    window.location.href = "/?pricing=1";
    return;
  }
  if (!authKey || !customerKey) {
    alert("구독 인증 정보(authKey/customerKey)가 없습니다.");
    window.location.href = "/?pricing=1";
    return;
  }

  const res = await fetch(`${API_BASE}/api/payments/subscription/complete`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ customerKey, authKey }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    alert(data.error || "구독 완료 처리 실패");
    window.location.href = "/?pricing=1";
    return;
  }

  // 성공: UI 토글 + 플래그 저장
  if (loadingEl) loadingEl.style.display = "none";
  if (successEl) successEl.style.display = "flex";

  localStorage.setItem("justSubscribed", "1");
  localStorage.setItem("justSubscribedAt", String(Date.now()));
  localStorage.removeItem("pendingSubscription");

  // 자동 이동(원하면 주석)
  setTimeout(() => {
    window.location.href = "/?subscribed=1";
  }, 1000);
}

completeSubscription();

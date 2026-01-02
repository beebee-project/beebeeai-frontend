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
const customerKey = urlParams.get("customerKey");

// customerKey는 startSubscription에서 내려준 값을 쓰는 게 제일 안전
const pending = JSON.parse(localStorage.getItem("pendingSubscription") || "{}");
const finalCustomerKey = customerKey || pending.customerKey;

async function complete() {
  if (!token) {
    alert("로그인이 만료되었습니다. 다시 로그인해주세요.");
    return;
  }
  if (!authKey || !finalCustomerKey) {
    alert("구독 인증 정보(authKey/customerKey)가 없습니다.");
    return;
  }

  const res = await fetch(`${API_BASE}/api/payments/subscription/complete`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ customerKey: finalCustomerKey, authKey }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    alert(data.error || "구독 완료 처리 실패");
    return;
  }

  localStorage.setItem("justSubscribed", "1");
  localStorage.setItem("justSubscribedAt", String(Date.now()));
  localStorage.removeItem("pendingSubscription");

  // 원래 페이지로 복귀
  setTimeout(() => {
    window.location.href = "/?subscribed=1";
  }, 800);
}

complete();

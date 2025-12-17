const API_BASE =
  window.location.hostname === "localhost"
    ? "http://localhost:3000"
    : "https://beebeeai-backend-production.up.railway.app";

const urlParams = new URLSearchParams(window.location.search);
const paymentKey = urlParams.get("paymentKey");
const orderId = urlParams.get("orderId");
let amount = urlParams.get("amount");

// ✅ amount가 없으면 localStorage에서 복구
if (!amount && orderId) {
  try {
    const pending = JSON.parse(
      localStorage.getItem("pendingPayment") || "null"
    );
    if (pending && pending.orderId === orderId && pending.amount != null) {
      amount = String(pending.amount);
    }
  } catch (e) {}
}

// 화면 표시
document.getElementById("paymentKey").textContent = paymentKey || "";
document.getElementById("orderId").textContent = orderId || "";
document.getElementById("amount").textContent = amount ? `${amount}원` : "";

// 버튼 클릭 시 승인 요청
async function confirmPayment() {
  if (!paymentKey || !orderId) {
    alert("paymentKey/orderId가 없습니다.");
    return;
  }
  if (!amount) {
    alert("결제 금액(amount)을 확인할 수 없습니다. 결제를 다시 시도해주세요.");
    return;
  }

  const token =
    localStorage.getItem("token") || localStorage.getItem("accessToken") || "";

  const res = await fetch(`${API_BASE}/api/payments/confirm`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      paymentKey,
      orderId,
      amount: Number(amount),
    }),
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    alert(json.error || `결제 승인 실패 (status ${res.status})`);
    return;
  }

  // 성공 처리 UI (원래 너의 섹션 id가 다르면 맞춰줘)
  const confirmLoadingSection = document.getElementById(
    "confirmLoadingSection"
  );
  const confirmSuccessSection = document.getElementById(
    "confirmSuccessSection"
  );
  if (confirmLoadingSection) confirmLoadingSection.style.display = "none";
  if (confirmSuccessSection) confirmSuccessSection.style.display = "flex";
}

document
  .getElementById("confirmPaymentButton")
  ?.addEventListener("click", confirmPayment);

(async function () {
  const API_BASE =
    window.location.hostname === "localhost"
      ? "http://localhost:3000"
      : "https://beebeeai-backend-production.up.railway.app";

  const token = localStorage.getItem("token");
  if (!token) {
    alert("로그인이 만료되었습니다. 다시 로그인해주세요.");
    // 필요하면 로그인 모달 띄우기/로그인 페이지 이동
    window.location.href = "/"; // 또는 /login
    return;
  }

  // success URL 쿼리 파라미터
  const params = new URLSearchParams(window.location.search);
  const paymentKey = params.get("paymentKey");
  const orderId = params.get("orderId");
  const amount = params.get("amount");

  if (!paymentKey || !orderId || !amount) {
    alert("결제 완료 정보가 부족합니다. 다시 시도해주세요.");
    window.location.href = "/";
    return;
  }

  // 화면에 값 표시(있으면)
  const setText = (id, v) => {
    const el = document.getElementById(id);
    if (el) el.textContent = v ?? "";
  };
  setText("orderId", orderId);
  setText("amount", `${amount}원`);
  setText("paymentKey", paymentKey);

  // 로딩 UI(있으면)
  const loading = document.querySelector(".confirm-loading");
  const successBox = document.querySelector(".confirm-success");
  if (loading) loading.style.display = "flex";
  if (successBox) successBox.style.display = "none";

  try {
    // ✅ 서버 confirm 호출 (토큰 포함)
    const res = await fetch(`${API_BASE}/api/payments/confirm`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ paymentKey, orderId, amount: Number(amount) }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      console.error("confirm failed:", data);
      alert(data.error || "결제 승인 처리(confirm)에 실패했습니다.");
      window.location.href = "/fail.html";
      return;
    }

    // ✅ 승인 성공 → 화면 표시
    // (Payment 저장 + User 구독 반영까지 서버에서 끝난 상태)
    if (loading) loading.style.display = "none";
    if (successBox) successBox.style.display = "block";

    // 서버 응답에 subscription이 오면 표시(선택)
    if (data.subscription?.status)
      setText("subStatus", data.subscription.status);
    if (data.subscription?.expiresAt)
      setText("expiresAt", data.subscription.expiresAt);

    // ✅ UX: 1~2초 뒤 홈/계정으로 이동
    setTimeout(() => {
      window.location.href = "/"; // 또는 /account.html / pricing modal 등
    }, 1500);
  } catch (err) {
    console.error(err);
    alert("네트워크 오류로 결제 승인 처리에 실패했습니다.");
    window.location.href = "/fail.html";
  }
})();

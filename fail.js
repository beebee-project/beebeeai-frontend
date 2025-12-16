(function () {
  const params = new URLSearchParams(window.location.search);
  const code = params.get("code");
  const message = params.get("message");
  const orderId = params.get("orderId");

  const setText = (id, v) => {
    const el = document.getElementById(id);
    if (el) el.textContent = v ?? "";
  };

  setText("failCode", code);
  setText("failMsg", message);
  setText("orderId", orderId);

  const btn = document.getElementById("goHome");
  btn?.addEventListener("click", () => (window.location.href = "/"));
})();

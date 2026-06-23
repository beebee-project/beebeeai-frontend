// --- 전역 변수 ---
let uploadedFiles = [];
let lastSelectedFile = null;
let currentTemplateAction = "template";
let currentTemplateFileName = "";
let currentAutomationCandidates = [];
let currentQueryTablesKey = null;
let currentAutomationExecution = null;
let currentSelectedAutomationCandidate = null;
let currentBusinessTemplateCandidates = [];

const templateQueryKeyCache = new Map();

const API_BASE_URL = window.BEEBEE_CONFIG.API_BASE_URL;

// Direct formula/macro generation UX has been removed.
// Main flow is now template generation only.

const TEMPLATE_PREVIEW_MAP = {
  template: {
    title: "자동화 시트",
    desc: "업로드된 데이터를 쿼리화하고, 반복 업무에 사용할 수 있는 자동화 시트를 생성합니다.",
  },
  automation: {
    title: "데이터 분석",
    desc: "업로드된 데이터를 구조화해 핵심 지표, 요약, 추이, 인사이트를 자동으로 분석합니다.",
  },
  ppt: {
    title: "PPT 보고서",
    desc: "분석된 데이터를 기반으로 차트와 인사이트가 포함된 발표용 PPT 자료를 생성합니다.",
  },
};

const OUTPUT_TYPE_LABEL_MAP = {
  summarySheet: "자동화 시트",
  analysisReport: "데이터 분석",
  ppt: "PPT 생성",
};

function normalizeOutputTypes(outputTypes = []) {
  const aliases = { reportJson: "analysisReport", json: "analysisReport" };
  const source = Array.isArray(outputTypes) ? outputTypes : [outputTypes];
  const normalized = source
    .map((type) => aliases[type] || type)
    .filter((type) => OUTPUT_TYPE_LABEL_MAP[type]);
  return [...new Set(normalized)];
}

function normalizeTemplateCandidates(json = {}) {
  const businessTemplates = Array.isArray(json.businessTemplateCandidates)
    ? json.businessTemplateCandidates
    : [];

  if (businessTemplates.length) {
    return businessTemplates.map((t) => ({
      type: "businessTemplate",
      templateId: t.templateId,
      title: t.title,
      description: t.description,
      confidence: t.confidence,
      matchedCount: Array.isArray(t.candidates) ? t.candidates.length : 0,
      candidate: t.primaryCandidate || t.candidates?.[0] || null,
      candidates: t.candidates || [],
      outputTypes: normalizeOutputTypes(t.outputTypes || []),
    }));
  }

  const categories = Array.isArray(json.categoryCandidates)
    ? json.categoryCandidates
    : [];

  if (categories.length) {
    return categories.flatMap((cat) =>
      (cat.candidates || []).map((c) => ({
        type: "categoryCandidate",
        categoryId: cat.categoryId,
        title: c.title || cat.title,
        description: c.description || cat.description,
        candidate: c,
      })),
    );
  }

  return (json.candidates || []).map((c) => ({
    type: "analysisCandidate",
    title: c.title,
    description: c.description,
    candidate: c,
  }));
}

function handlePostSubscribeUX() {
  const url = new URL(window.location.href);
  const subscribed = url.searchParams.get("subscribed");
  const justSubscribed = localStorage.getItem("justSubscribed");

  if (subscribed === "1" || justSubscribed === "1") {
    // 배지/사용량 즉시 갱신 트리거
    updateSubscriptionBadge();

    // UX: 1회성 알림 (원하면 toast로 교체 가능)
    alert("구독이 활성화되었습니다. PRO 기능을 이용할 수 있어요!");

    // 플래그 정리
    localStorage.removeItem("justSubscribed");
    localStorage.removeItem("justSubscribedAt");

    // URL 파라미터 정리 (새로고침해도 alert 반복 안 뜨게)
    url.searchParams.delete("subscribed");
    window.history.replaceState({}, document.title, url.pathname + url.search);
  }
}

// ===============================
// Legacy UX 정리: Token helpers
// ===============================
function getAuthToken() {
  return (
    localStorage.getItem("token") ||
    localStorage.getItem("accessToken") ||
    localStorage.getItem("jwt")
  );
}

async function authFetch(path, options = {}) {
  const token = getAuthToken();

  const headers = {
    "Content-Type": "application/json; charset=utf-8",
    ...(options.headers || {}),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  const json = await res.json().catch(() => ({}));

  if (res.status === 401) {
    handleUnauthorized();
  }

  return { res, json };
}

async function getOrCreateTemplateQueryTablesKey(fileName) {
  if (!fileName) return null;

  if (templateQueryKeyCache.has(fileName)) {
    return templateQueryKeyCache.get(fileName);
  }

  const { res, json } = await authFetch("/api/automation/query-save", {
    method: "POST",
    body: JSON.stringify({ fileName }),
  });

  if (!res.ok || !json.ok || !json.queryTablesKey) {
    throw new Error(
      json.error || json.message || "쿼리 테이블 생성에 실패했습니다.",
    );
  }

  templateQueryKeyCache.set(fileName, json.queryTablesKey);
  return json.queryTablesKey;
}

function clearAuthTokens() {
  localStorage.removeItem("token");
  localStorage.removeItem("accessToken");
  localStorage.removeItem("jwt");
}

function handleUnauthorized() {
  clearAuthTokens();
  alert("로그인이 만료되었습니다. 다시 로그인해주세요.");
  document.getElementById("login-modal-overlay")?.classList.add("active");
  document.getElementById("login-tab")?.click();
}

// 페이지 로드 시 실행
document.addEventListener("DOMContentLoaded", () => {
  updateSubscriptionBadge();
  initializeAuth();
  initializePopups();
  handleLegacyUxParams();
  initializeLayout();
  initializeTemplateHome();
  initializeFileUpload();
  updateLoginState();
  handlePostSubscribeUX();
});

// ==========================================
// 초기화 함수 그룹
// ==========================================
function initializeAuth() {
  // URL에 토큰이 있는지 확인 (소셜 로그인 콜백 처리)
  const urlParams = new URLSearchParams(window.location.search);
  const tokenFromUrl = urlParams.get("token");
  const authError = urlParams.get("authError");
  const untilFromUrl = urlParams.get("until");

  if (tokenFromUrl) {
    localStorage.setItem("token", tokenFromUrl);
    window.history.replaceState({}, document.title, window.location.pathname);
    window.dispatchEvent(
      new CustomEvent("auth:changed", { detail: { isLoggedIn: true } }),
    );
    alert("소셜 로그인이 완료되었습니다.");
  }

  // 소셜 로그인 실패/차단 UX
  if (authError) {
    window.history.replaceState({}, document.title, window.location.pathname);

    if (authError === "REJOIN_BLOCKED") {
      const until = untilFromUrl
        ? new Date(untilFromUrl).toLocaleString("ko-KR", {
            timeZone: "Asia/Seoul",
          })
        : null;
      const msg = until
        ? `탈퇴한 계정은 30일 동안 재가입이 불가능합니다.\n재가입 가능 시점: ${until}`
        : "탈퇴한 계정은 30일 동안 재가입이 불가능합니다.";

      alert(msg);
      // 로그인 모달 띄우기
      document.getElementById("login-modal-overlay")?.classList.add("active");
      // 로그인 탭으로 전환
      document.getElementById("login-tab")?.click();
    } else {
      alert("소셜 로그인에 실패했습니다. 다시 시도해주세요.");
    }
  }

  // 소셜 로그인 버튼 이벤트
  document.getElementById("google-btn")?.addEventListener("click", () => {
    window.location.href = `${API_BASE_URL}/api/auth/google`;
  });
  document.getElementById("naver-btn")?.addEventListener("click", (e) => {
    e.preventDefault();
    window.location.href = `${API_BASE_URL}/api/auth/naver`;
  });
}

function handleLegacyUxParams() {
  try {
    const url = new URL(window.location.href);
    const params = url.searchParams;

    let changed = false;

    // 1) 구독 완료(리다이렉트) UX: /?subscribed=1
    if (params.get("subscribed") === "1") {
      // 한번만 보여주고 제거
      localStorage.removeItem("justSubscribed");
      localStorage.removeItem("justSubscribedAt");

      alert("구독이 완료되었습니다. PRO 플랜이 활성화되었습니다.");
      updateSubscriptionBadge();

      params.delete("subscribed");
      changed = true;
    }

    // 2) 결제/구독 흐름에서 실패/만료 시: /?pricing=1 → 자동으로 구독 모달 열기
    if (params.get("pricing") === "1") {
      document.getElementById("pricing-modal-overlay")?.classList.add("active");
      params.delete("pricing");
      changed = true;
    }

    // 3) justSubscribed 플래그는 오래되면 자동 정리 (예: 탭 복원/캐시 이슈)
    const atRaw = localStorage.getItem("justSubscribedAt");
    const at = atRaw ? Number(atRaw) : 0;
    if (at && Date.now() - at > 10 * 60 * 1000) {
      localStorage.removeItem("justSubscribed");
      localStorage.removeItem("justSubscribedAt");
    }

    if (changed) {
      const qs = params.toString();
      const next = qs ? `${url.pathname}?${qs}` : url.pathname;
      window.history.replaceState({}, document.title, next);
    }
  } catch (e) {
    // no-op
  }
}

function setTemplatePreview(action) {
  const panel = document.getElementById("template-preview-panel");
  const data = TEMPLATE_PREVIEW_MAP[action];

  if (!panel || !data) return;

  panel.innerHTML = `
    <div class="template-preview-title">${escapeHtml(data.title)}</div>
    <div class="template-preview-desc">${escapeHtml(data.desc)}</div>
  `;

  document.querySelectorAll("[data-template-action]").forEach((card) => {
    card.classList.toggle("active", card.dataset.templateAction === action);
  });
}

function initializePopups() {
  // 1. 로그인 / 회원가입 팝업
  const loginModalOverlay = document.getElementById("login-modal-overlay");
  const closeLoginModal = () => loginModalOverlay?.classList.remove("active");

  // 로그인 모달 닫기 버튼
  document
    .getElementById("login-close-btn")
    ?.addEventListener("click", closeLoginModal);

  // 오버레이 클릭 시 닫기
  loginModalOverlay?.addEventListener("click", (e) => {
    if (e.target === loginModalOverlay) closeLoginModal();
  });

  // 로그인 / 회원가입 공용 폼 submit
  document
    .getElementById("auth-form")
    ?.addEventListener("submit", handleAuthFormSubmit);

  // 템플릿 공용 폼
  document.querySelectorAll("[data-template-action]").forEach((card) => {
    card.addEventListener("click", () => {
      currentTemplateAction = card.dataset.templateAction || "template";

      resetTemplateRunState();
      setTemplatePreview(currentTemplateAction);
      renderTemplateFileInfo();
    });
  });

  // 2. 탭 전환 로직
  const loginTab = document.getElementById("login-tab");
  const signupTab = document.getElementById("signup-tab");
  const mainActionBtn = document.getElementById("main-action-btn");
  const nameGroup = document.querySelector(".form-group:has(#name)");
  const passwordHint = document.getElementById("password-hint");
  const forgotPasswordLink = document.getElementById("forgot-password-link");
  const passwordInput = document.getElementById("password");
  const passwordToggleBtn = document.getElementById("password-toggle");

  const showLogin = () => {
    loginTab?.classList.add("active");
    signupTab?.classList.remove("active");

    if (mainActionBtn) mainActionBtn.textContent = "로그인";
    if (nameGroup) nameGroup.style.display = "none";

    // 로그인 탭에서는 비밀번호 힌트 숨김
    if (passwordHint) {
      passwordHint.style.display = "none";
      passwordHint.style.color = "#888"; // 기본값으로 초기화
    }

    if (forgotPasswordLink) forgotPasswordLink.style.display = "block";
  };

  const showSignup = () => {
    signupTab?.classList.add("active");
    loginTab?.classList.remove("active");

    if (mainActionBtn) mainActionBtn.textContent = "회원가입";
    if (nameGroup) nameGroup.style.display = "block";

    // 회원가입 탭에서만 비밀번호 힌트 표시
    if (passwordHint) {
      passwordHint.style.display = "block";
      passwordHint.style.color = "#888"; // 기본 색상으로 리셋
    }

    if (forgotPasswordLink) forgotPasswordLink.style.display = "none";
  };

  loginTab?.addEventListener("click", showLogin);
  signupTab?.addEventListener("click", showSignup);

  // 기본은 로그인 탭
  showLogin();

  // 2-1. 비밀번호 보기/숨기기 토글
  if (passwordInput && passwordToggleBtn) {
    passwordToggleBtn.addEventListener("click", () => {
      const isHidden = passwordInput.type === "password";
      passwordInput.type = isHidden ? "text" : "password";

      // 아이콘/상태 변경
      passwordToggleBtn.textContent = isHidden ? "👁" : "👁";
      passwordToggleBtn.classList.toggle("active", isHidden);
      passwordToggleBtn.setAttribute(
        "aria-label",
        isHidden ? "비밀번호 숨기기" : "비밀번호 표시",
      );
    });
  }

  // 3. 비밀번호 유효성 실시간 검사
  if (passwordInput && passwordHint) {
    // 영어, 숫자, 특수문자 포함 8자리 이상
    const passwordRegex =
      /^(?=.*[A-Za-z])(?=.*\d)(?=.*[!@#$%^&*()_\-+\[\]{};:'",.<>/?\\|`~]).{8,}$/;

    passwordInput.addEventListener("input", () => {
      const value = passwordInput.value;

      // 아무것도 입력 안 했을 때는 기본 회색으로 복귀
      if (value.length === 0) {
        passwordHint.style.color = "#888";
        return;
      }

      // 조건 충족 / 미충족에 따라 색상 변경
      if (passwordRegex.test(value)) {
        passwordHint.style.color = "#2ECC71";
      } else {
        passwordHint.style.color = "#E74C3C";
      }
    });
  }

  // 4. 구독 팝업
  const pricingModalOverlay = document.getElementById("pricing-modal-overlay");
  const openPricingModal = (event) => {
    if (event?.preventDefault) event.preventDefault();
    pricingModalOverlay?.classList.add("active");
  };
  const closePricingModal = () =>
    pricingModalOverlay?.classList.remove("active");

  document
    .getElementById("desktop-pricing-link")
    ?.addEventListener("click", openPricingModal);
  document
    .getElementById("mobile-pricing-link")
    ?.addEventListener("click", openPricingModal);
  document
    .getElementById("pricing-close-btn")
    ?.addEventListener("click", closePricingModal);

  pricingModalOverlay?.addEventListener("click", (e) => {
    if (e.target === pricingModalOverlay) closePricingModal();
  });

  // ==================== 템플릿 팝업 ====================

  const templateModalOverlay = document.getElementById(
    "template-modal-overlay",
  );

  const openTemplateModal = async (event) => {
    event?.preventDefault?.();

    resetTemplateAllState();

    templateModalOverlay?.classList.add("active");

    setTemplatePreview(currentTemplateAction);

    if (!uploadedFiles.length) {
      await loadUserFiles();
    }

    renderTemplateFileInfo();
  };

  const closeTemplateModal = () => {
    resetTemplateAllState();
    templateModalOverlay?.classList.remove("active");
  };

  document
    .querySelectorAll('a[href=""], a[href="#template"]')
    .forEach((link) => {
      if (link.textContent.includes("템플릿")) {
        link.addEventListener("click", openTemplateModal);
      }
    });

  document
    .getElementById("template-close-btn")
    ?.addEventListener("click", closeTemplateModal);

  templateModalOverlay?.addEventListener("click", (e) => {
    if (e.target === templateModalOverlay) {
      closeTemplateModal();
    }
  });
}

function initializeLayout() {
  const menuIcon = document.querySelector(".menu-icon");
  const popupOverlay = document.getElementById("popup-overlay");
  const popupClose = document.getElementById("popup-close");

  if (!menuIcon || !popupOverlay) return;

  // 모바일 햄버거 메뉴 열기
  menuIcon.addEventListener("click", () => {
    popupOverlay.classList.add("active");
  });
  // 닫기 버튼
  if (popupClose) {
    popupClose.addEventListener("click", () => {
      popupOverlay.classList.remove("active");
    });
  }
  // 오버레이 영역 클릭 시 닫기
  popupOverlay.addEventListener("click", (e) => {
    if (e.target === popupOverlay) {
      popupOverlay.classList.remove("active");
    }
  });
}

function initializeTemplateHome() {
  const startButton = document.getElementById("template-home-start-btn");
  const templateModalOverlay = document.getElementById(
    "template-modal-overlay",
  );

  const openTemplateHomeModal = async (action = "template") => {
    currentTemplateAction = action || "template";
    resetTemplateAllState();
    currentTemplateAction = action || "template";

    templateModalOverlay?.classList.add("active");
    setTemplatePreview(currentTemplateAction);

    if (!uploadedFiles.length) {
      await loadUserFiles();
    }

    renderTemplateFileInfo();
  };

  startButton?.addEventListener("click", () => {
    openTemplateHomeModal("template");
  });

  document.querySelectorAll("[data-home-template-action]").forEach((card) => {
    card.addEventListener("click", () => {
      openTemplateHomeModal(card.dataset.homeTemplateAction || "template");
    });
  });
}

function initializeFileUpload() {
  const templateNativeUploadInput = document.getElementById(
    "template-native-upload-input",
  );

  templateNativeUploadInput?.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) {
      e.target.value = "";
      return;
    }

    await handleFileUpload(file);

    if (
      document
        .getElementById("template-modal-overlay")
        ?.classList.contains("active")
    ) {
      await loadUserFiles();
      currentTemplateFileName = lastSelectedFile || currentTemplateFileName;
      renderTemplateFileInfo();
    }

    e.target.value = "";
  });
}

// ==========================================
// 인증 관련 함수
// ==========================================

async function handleAuthFormSubmit(event) {
  event.preventDefault();
  const form = event.target;
  const email = form.querySelector("#email").value;
  const password = form.querySelector("#password").value;
  const isSignup = document
    .getElementById("signup-tab")
    .classList.contains("active");
  const actionButton = document.getElementById("main-action-btn");
  const originalButtonText = actionButton.textContent;

  actionButton.disabled = true;
  actionButton.textContent = "처리 중...";

  try {
    const endpoint = isSignup ? "/api/auth/signup" : "/api/auth/login";
    const body = { email, password };

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    if (!response.ok) {
      if (data?.code === "REJOIN_BLOCKED") {
        const until = data?.purgeAt
          ? new Date(data.purgeAt).toLocaleString("ko-KR", {
              timeZone: "Asia/Seoul",
            })
          : null;
        const msg = until
          ? `탈퇴한 계정은 30일 동안 재가입이 불가능합니다.\n재가입 가능 시점: ${until}`
          : "탈퇴한 계정은 30일 동안 재가입이 불가능합니다.";
        throw new Error(msg);
      }
      throw new Error(data?.message || "요청 처리 중 오류가 발생했습니다.");
    }

    if (isSignup) {
      alert(data.message);
    } else {
      // Legacy UX 정리: 다른 키로 저장된 토큰 제거 후 token만 유지
      clearAuthTokens();
      localStorage.setItem("token", data.token);
      window.dispatchEvent(
        new CustomEvent("auth:changed", { detail: { isLoggedIn: true } }),
      );
      alert(data.message);
    }
    document.getElementById("login-modal-overlay")?.classList.remove("active");
    updateLoginState();
  } catch (error) {
    alert(error.message);
  } finally {
    actionButton.disabled = false;
    actionButton.textContent = originalButtonText;
  }
}

function handleLogout(event) {
  event.preventDefault();
  clearAuthTokens();
  window.dispatchEvent(
    new CustomEvent("auth:changed", { detail: { isLoggedIn: false } }),
  );
  alert("로그아웃 되었습니다.");
  updateLoginState();
}

function updateLoginState() {
  const token = getAuthToken();
  const desktopLoginLink = document.getElementById("desktop-login-link");
  const mobileLoginLink = document.getElementById("mobile-login-link");

  const setupLink = (link, isLoggedIn) => {
    if (!link) return;
    // 이벤트 리스너를 매번 새로 등록하기 전에 기존 것을 확실히 제거
    const newLink = link.cloneNode(true);
    link.parentNode.replaceChild(newLink, link);

    if (isLoggedIn) {
      newLink.textContent = "로그아웃";
      newLink.addEventListener("click", handleLogout);
    } else {
      newLink.textContent = "로그인";
      newLink.addEventListener("click", openLoginModal);
    }
  };

  setupLink(desktopLoginLink, !!token);
  setupLink(mobileLoginLink, !!token);
}

function resetTemplateRunState() {
  currentAutomationCandidates = [];
  currentBusinessTemplateCandidates = [];
  currentQueryTablesKey = null;
  currentAutomationExecution = null;
  currentSelectedAutomationCandidate = null;
}

function resetTemplateAllState() {
  currentTemplateAction = "template";
  currentTemplateFileName = lastSelectedFile || "";
  resetTemplateRunState();
}

function getCurrentTemplateFileName() {
  return currentTemplateFileName || lastSelectedFile || "";
}

function renderTemplateFileInfo() {
  const panel = document.getElementById("template-preview-panel");
  if (!panel) return;

  if (!uploadedFiles.length) {
    panel.innerHTML = `
      <div class="template-preview-title">파일이 없습니다</div>
      <div class="template-preview-desc">
        분석할 엑셀 또는 CSV 파일을 업로드해 주세요.
      </div>
    `;
    return;
  }

  const selectedFileName = getCurrentTemplateFileName();

  panel.innerHTML = `
    <div class="template-preview-header-row">
    <div class="template-preview-title">현재 업로드 파일</div>

      <button
        type="button"
        class="template-start-button"
        id="template-start-button"
        ${getCurrentTemplateFileName() ? "" : "disabled"}
      >
        시작하기
      </button>
    </div>

    <div class="template-file-list">
      ${uploadedFiles
        .map((file) => {
          const fileName =
            file.originalName || file.name || file.fileName || "";
          const checked = selectedFileName === fileName ? "checked" : "";

          return `
            <div
              class="template-file-item"
              data-template-file-name="${escapeHtml(fileName)}"
            >
              <div class="template-file-left">
                <input
                  type="checkbox"
                  class="template-file-checkbox"
                  data-template-file-name="${escapeHtml(fileName)}"
                  ${checked}
                />

                <span class="template-file-name">
                  📄 ${escapeHtml(fileName)}
                </span>
              </div>

              <button
                type="button"
                class="template-file-delete-btn"
                data-template-delete-file-name="${escapeHtml(fileName)}"
                title="파일 삭제"
                aria-label="파일 삭제"
              >
                <i class="fas fa-trash-alt" aria-hidden="true"></i>
              </button>
            </div>
          `;
        })
        .join("")}
    </div>
  `;

  panel.querySelectorAll(".template-file-checkbox").forEach((checkbox) => {
    checkbox.addEventListener("change", (event) => {
      const target = event.target;
      const fileName = target.dataset.templateFileName || "";

      panel.querySelectorAll(".template-file-checkbox").forEach((box) => {
        if (box !== target) box.checked = false;
      });

      if (target.checked) {
        currentTemplateFileName = fileName;
        lastSelectedFile = fileName;
      } else {
        currentTemplateFileName = "";
        lastSelectedFile = null;
      }

      resetTemplateRunState();
      renderTemplateFileInfo();
    });
  });

  panel.querySelectorAll(".template-file-delete-btn").forEach((button) => {
    button.addEventListener("click", async (event) => {
      event.preventDefault();
      event.stopPropagation();

      const fileName =
        button.dataset.templateDeleteFileName ||
        button.closest(".template-file-item")?.dataset.templateFileName ||
        "";

      if (!fileName) return;

      await handleFileDelete(fileName);
      await loadUserFiles();
      renderTemplateFileInfo();
    });
  });

  panel
    .querySelector("#template-start-button")
    ?.addEventListener("click", async () => {
      const fileName = getCurrentTemplateFileName();
      if (!fileName) return;

      currentTemplateFileName = fileName;

      if (
        currentTemplateAction === "template" ||
        currentTemplateAction === "automation" ||
        currentTemplateAction === "ppt"
      ) {
        await loadAutomationCandidatesForTemplate();
        return;
      }
    });
}

async function loadAutomationCandidatesForTemplate() {
  if (!currentTemplateFileName) {
    alert("먼저 파일을 선택해주세요.");
    return;
  }

  const panel = document.getElementById("template-preview-panel");
  if (panel) {
    panel.innerHTML = `
      <div class="template-preview-title">자동화 후보 생성 중...</div>
      <div class="template-preview-desc">선택한 파일 구조를 분석하고 있습니다.</div>
    `;
  }

  try {
    currentQueryTablesKey = await getOrCreateTemplateQueryTablesKey(
      currentTemplateFileName,
    );
  } catch (error) {
    alert(error.message || "쿼리 테이블 생성에 실패했습니다.");
    renderTemplateFileInfo();
    return;
  }

  const { res, json } = await authFetch("/api/automation/analysis-candidates", {
    method: "POST",
    body: JSON.stringify({
      queryTablesKey: currentQueryTablesKey,
    }),
  });

  if (!res.ok || !json.ok) {
    alert(json.error || json.message || "자동화 후보 조회에 실패했습니다.");
    renderTemplateFileInfo();
    return;
  }

  currentBusinessTemplateCandidates = json.businessTemplateCandidates || [];
  currentAutomationCandidates = normalizeTemplateCandidates(json);

  if (!currentAutomationCandidates.length) {
    alert("생성 가능한 업무 템플릿 후보가 없습니다.");
    renderTemplateFileInfo();
    return;
  }

  renderAutomationCandidateList(currentAutomationCandidates);
}

function renderAutomationCategoryList(categories = []) {
  const panel = document.getElementById("template-preview-panel");
  if (!panel) return;

  if (!categories.length) {
    renderAutomationCandidateList(currentAutomationCandidates);
    return;
  }

  panel.innerHTML = `
    <div class="template-preview-title">생성 가능한 자동화 유형</div>
    <div class="template-preview-desc">선택한 데이터 구조를 분석해 추천 가능한 자동화 유형을 찾았습니다.</div>
    <div class="automation-candidate-list">
      ${categories
        .map(
          (item, index) => `
            <button class="automation-candidate-card" data-category-index="${index}">
              <div class="automation-candidate-title">${escapeHtml(item.title)}</div>
              <div class="automation-candidate-desc">${escapeHtml(item.description || "")}</div>
              <div class="automation-candidate-desc">
                ${escapeHtml((item.examples || []).join(" · "))}
              </div>
            </button>
          `,
        )
        .join("")}
    </div>
  `;

  panel.querySelectorAll("[data-category-index]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const index = Number(btn.dataset.categoryIndex);
      const category = categories[index];
      const mapped = (category.candidates || []).map((candidate, idx) => ({
        candidateId:
          candidate.candidateId ||
          candidate.id ||
          candidate.recipeId ||
          candidate.type ||
          `${category.categoryId}_${idx + 1}`,
        title:
          candidate.title ||
          candidate.name ||
          candidate.label ||
          `${category.title} ${idx + 1}`,
        description:
          candidate.description ||
          candidate.reason ||
          candidate.summary ||
          category.description ||
          "",
        category: category.categoryId,
        priority: Number.isFinite(candidate.priority)
          ? candidate.priority
          : idx + 1,
        candidate,
      }));

      renderAutomationCandidateList(mapped);
    });
  });
}

function renderAutomationCandidateList(candidates = []) {
  currentAutomationCandidates = candidates;
  const panel = document.getElementById("template-preview-panel");
  if (!panel) return;

  if (!candidates.length) {
    panel.innerHTML = `
      <div class="template-preview-title">생성 가능한 업무 템플릿이 없습니다</div>
      <div class="template-preview-desc">선택한 파일에서 추천 가능한 업무 템플릿 후보를 찾지 못했습니다.</div>
    `;
    return;
  }

  panel.innerHTML = `
    <div class="template-preview-title">생성 가능한 업무 템플릿</div>
    <div class="template-preview-desc">생성할 보고서 또는 자동화 템플릿을 선택하세요.</div>
    <div class="automation-candidate-list">
      ${candidates
        .map(
          (item, index) => `
            <button class="automation-candidate-card" data-candidate-index="${index}">
              <div class="automation-candidate-title">${escapeHtml(item.title || `자동화 후보 ${index + 1}`)}</div>
              <div class="automation-candidate-desc">${escapeHtml(item.description || "")}</div>
              ${
                item.type === "businessTemplate"
                  ? `<div class="automation-candidate-desc">
                              ${escapeHtml((item.outputTypes || []).join(" · "))}
                              ${
                                item.matchedCount
                                  ? ` · 매칭 ${escapeHtml(String(item.matchedCount))}개`
                                  : ""
                              }
                            </div>`
                  : ""
              }            
            </button>
          `,
        )
        .join("")}
    </div>
  `;

  panel.querySelectorAll("[data-candidate-index]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const index = Number(btn.dataset.candidateIndex);
      executeAutomationCandidate(index);
    });
  });
}

async function executeAutomationCandidate(index) {
  const selected = currentAutomationCandidates[index];

  if (!selected || (!selected.candidate && !selected.templateId)) {
    alert("선택한 자동화 후보 정보를 찾을 수 없습니다.");
    return;
  }

  if (!currentQueryTablesKey) {
    alert("쿼리 테이블 정보가 없습니다. 다시 시도해주세요.");
    return;
  }

  const panel = document.getElementById("template-preview-panel");
  if (panel) {
    panel.innerHTML = `
      <div class="template-preview-title">자동화 실행 중...</div>
      <div class="template-preview-desc">${escapeHtml(
        selected.title || "선택한 자동화를 실행하고 있습니다.",
      )}</div>
    `;
  }

  const isBusinessTemplate = selected.type === "businessTemplate";

  const { res, json } = await authFetch(
    isBusinessTemplate
      ? "/api/automation/execute-business-template"
      : "/api/automation/execute-analysis-candidate",
    {
      method: "POST",
      body: JSON.stringify(
        isBusinessTemplate
          ? {
              queryTablesKey: currentQueryTablesKey,
              templateCandidate: selected,
            }
          : {
              queryTablesKey: currentQueryTablesKey,
              candidate: selected.candidate,
            },
      ),
    },
  );

  if (!res.ok || !json.ok) {
    alert(json.error || json.message || "자동화 실행에 실패했습니다.");
    renderAutomationCandidateList(currentAutomationCandidates);
    return;
  }

  currentAutomationExecution = json;
  currentSelectedAutomationCandidate = selected;
  renderAutomationExecutionResult(json, selected);
}

async function exportTemplateResultFromCandidate(selected) {
  if (currentTemplateAction === "template") {
    await exportAutomationWorkbook(selected);
    return;
  }

  if (currentTemplateAction === "automation") {
    await exportTemplateAnalysisFromCandidate(selected);
    return;
  }

  if (currentTemplateAction === "ppt") {
    await exportTemplatePptFromCandidate(selected);
    return;
  }
}

async function exportTemplateAnalysisFromCandidate(selected) {
  if (!currentQueryTablesKey) {
    alert("쿼리 테이블 정보가 없습니다.");
    return;
  }

  const message =
    selected?.candidate?.title ||
    selected?.title ||
    "데이터 분석 및 인사이트 생성";

  const { res, json } = await authFetch(
    "/api/automation/export-analysis-report",
    {
      method: "POST",
      body: JSON.stringify({
        queryTablesKey: currentQueryTablesKey,
        message,
        candidate:
          selected?.type === "businessTemplate"
            ? null
            : selected?.candidate || null,
        templateCandidate:
          selected?.type === "businessTemplate" ? selected : null,
        executionResult:
          currentAutomationExecution?.result ||
          currentAutomationExecution ||
          null,
      }),
    },
  );

  if (!res.ok || !json.ok) {
    alert(json.error || json.message || "데이터 분석 생성에 실패했습니다.");
    return;
  }

  renderTemplateGeneratedResult({
    title: "데이터 분석 생성 완료",
    desc: "선택한 후보 기반 인사이트 파일이 생성되었습니다.",
    json,
  });
}

async function exportTemplatePptFromCandidate(selected) {
  if (!currentQueryTablesKey) {
    alert("쿼리 테이블 정보가 없습니다.");
    return;
  }

  const message =
    selected?.candidate?.title || selected?.title || "PPT 보고서 생성";

  const { res, json } = await authFetch("/api/automation/export-pptx", {
    method: "POST",
    body: JSON.stringify({
      queryTablesKey: currentQueryTablesKey,
      message,
      template: "default",
      candidate:
        selected?.type === "businessTemplate"
          ? null
          : selected?.candidate || null,
      templateCandidate:
        selected?.type === "businessTemplate" ? selected : null,
      executionResult:
        currentAutomationExecution?.result ||
        currentAutomationExecution ||
        null,
    }),
  });

  if (!res.ok || !json.ok) {
    alert(json.error || json.message || "PPT 생성에 실패했습니다.");
    return;
  }

  renderTemplateGeneratedResult({
    title: "PPT 보고서 생성 완료",
    desc: "선택한 후보 기반 PPT 파일이 생성되었습니다.",
    json,
  });
}

function renderAutomationExecutionResult(resultJson, selected) {
  const panel = document.getElementById("template-preview-panel");
  if (!panel) return;

  const result = resultJson.result || resultJson;
  const rows = Array.isArray(result.rows) ? result.rows : [];
  const sections = Array.isArray(result.sections) ? result.sections : [];
  const previewRows = rows.slice(0, 5);

  const exportButtonLabel =
    currentTemplateAction === "template"
      ? "자동화 시트 생성"
      : currentTemplateAction === "automation"
        ? "데이터 분석 생성"
        : "PPT 보고서 생성";

  const sectionPreviewHtml = sections.length
    ? `
    <div class="automation-result-preview">
      ${sections
        .map(
          (section) => `
            <div class="automation-result-row">
              ${escapeHtml(section.title || section.sectionId || "섹션")}
              · ${escapeHtml(String(section.result?.rows?.length || 0))}행
            </div>
          `,
        )
        .join("")}
    </div>
  `
    : "";

  panel.innerHTML = `
    <div class="template-preview-title">${escapeHtml(
      selected.title || "자동화 실행 완료",
    )}</div>
    <div class="template-preview-desc">자동화 실행이 완료되었습니다.</div>

    ${
      sectionPreviewHtml ||
      (previewRows.length
        ? `
      <div class="automation-result-preview">
        ${previewRows
          .map(
            (row) => `
              <div class="automation-result-row">
                ${escapeHtml(JSON.stringify(row))}
              </div>
            `,
          )
          .join("")}
      </div>
    `
        : `<div class="template-preview-desc">미리보기 행이 없습니다.</div>`)
    }

    <div class="template-action-row">
      <button id="automation-export-xlsx-btn" class="template-primary-button">
        ${escapeHtml(exportButtonLabel)}
      </button>
      <button id="automation-back-btn" class="template-secondary-button">
        후보 다시 보기
      </button>
    </div>
  `;

  document
    .getElementById("automation-back-btn")
    ?.addEventListener("click", () => {
      renderAutomationCandidateList(currentAutomationCandidates);
    });

  document
    .getElementById("automation-export-xlsx-btn")
    ?.addEventListener("click", async () => {
      await exportTemplateResultFromCandidate(selected);
    });
}

function resolveAutomationDownloadUrl(json = {}) {
  return (
    json.downloadUrl ||
    json.fileUrl ||
    json.url ||
    json.result?.downloadUrl ||
    json.result?.fileUrl ||
    null
  );
}

function buildAutomationDownloadMessage(json = {}) {
  if (json.fileName)
    return `엑셀 자동화 파일이 생성되었습니다.\n파일명: ${json.fileName}`;
  if (json.filePath)
    return `엑셀 자동화 파일이 생성되었습니다.\n경로: ${json.filePath}`;
  return "엑셀 자동화 파일이 생성되었습니다.";
}

function basenameFromStoragePath(value = "") {
  const raw = String(value || "");
  if (!raw) return "";
  return raw.split(/[\\/]/).pop();
}

function stripStoragePrefix(value = "") {
  let name = String(value || "").trim();
  if (!name) return "";

  name = name.split(/[\\/]/).pop() || name;

  name = name.replace(
    /^(?:summary-sheets|reports|ppt|automation|generated|query-tables)[_-][^_-]+[_-][a-f0-9]{16,}[_-]/i,
    "",
  );

  name = name.replace(
    /^(?:summary-sheets|reports|ppt|automation|generated)[_-][a-f0-9]{16,}[_-][a-f0-9]{16,}[_-]/i,
    "",
  );

  return name;
}

function resolveTemplateGeneratedFilePath(json = {}) {
  const preferred =
    json.displayName ||
    json.outputFileName ||
    json.result?.displayName ||
    json.result?.fileName ||
    json.fileName ||
    "";

  if (preferred) {
    return stripStoragePrefix(preferred);
  }

  return stripStoragePrefix(
    json.filePath || json.localName || json.gcsName || "",
  );
}

function renderTemplateGeneratedResult({
  title,
  desc,
  json,
  backLabel = "파일 선택으로 돌아가기",
}) {
  const panel = document.getElementById("template-preview-panel");
  if (!panel) return;

  const filePath = resolveTemplateGeneratedFilePath(json);
  const downloadUrl = resolveAutomationDownloadUrl(json);

  panel.innerHTML = `
    <div class="template-preview-title">${escapeHtml(title)}</div>
    <div class="template-preview-desc">${escapeHtml(desc)}</div>

    ${
      filePath
        ? `<div class="automation-result-row">${escapeHtml(filePath)}</div>`
        : ""
    }

    <div class="template-action-row">
      ${
        downloadUrl
          ? `<button class="template-primary-button" type="button" id="template-download-btn">다운로드</button>`
          : ""
      }
      <button class="template-secondary-button" type="button" id="template-back-file-btn">
        ${escapeHtml(backLabel)}
      </button>
    </div>
  `;

  document
    .getElementById("template-download-btn")
    ?.addEventListener("click", () => {
      window.location.href = downloadUrl;
    });

  document
    .getElementById("template-back-file-btn")
    ?.addEventListener("click", () => {
      if (backLabel.includes("후보") && currentAutomationCandidates.length) {
        renderAutomationCandidateList(currentAutomationCandidates);
        return;
      }

      resetTemplateRunState();
      renderTemplateFileInfo();
    });
}

async function exportAutomationWorkbook(selected) {
  if (!currentQueryTablesKey) {
    alert("쿼리 테이블 정보가 없습니다.");
    return;
  }

  const message =
    currentAutomationExecution?.message ||
    selected?.candidate?.message ||
    selected?.candidate?.title ||
    selected?.title ||
    "자동화 분석";

  const { res, json } = await authFetch("/api/automation/summary-sheet", {
    method: "POST",
    body: JSON.stringify({
      queryTablesKey: currentQueryTablesKey,
      message,
      candidate:
        selected?.type === "businessTemplate"
          ? null
          : selected?.candidate || null,
      templateCandidate:
        selected?.type === "businessTemplate" ? selected : null,
      executionResult:
        currentAutomationExecution?.result ||
        currentAutomationExecution ||
        null,
    }),
  });

  if (!res.ok || !json.ok) {
    alert(json.error || json.message || "엑셀 생성에 실패했습니다.");
    return;
  }
  console.log("[automation export-xlsx]", json);

  renderTemplateGeneratedResult({
    title: "자동화 시트 생성 완료",
    desc: "자동화 템플릿 엑셀 파일이 생성되었습니다.",
    json,
    backLabel: "후보 다시 보기",
  });
}

async function exportTemplateAnalysis(fileName) {
  try {
    currentQueryTablesKey = await getOrCreateTemplateQueryTablesKey(fileName);

    const panel = document.getElementById("template-preview-panel");
    if (panel) {
      panel.innerHTML = `
        <div class="template-preview-title">데이터 분석 생성 중...</div>
        <div class="template-preview-desc">선택한 파일의 인사이트를 생성하고 있습니다.</div>
      `;
    }

    const { res, json } = await authFetch(
      "/api/automation/export-analysis-report",
      {
        method: "POST",
        body: JSON.stringify({
          queryTablesKey: currentQueryTablesKey,
          message: "데이터 분석 및 인사이트 생성",
        }),
      },
    );

    if (!res.ok || !json.ok) {
      alert(json.error || json.message || "데이터 분석 생성에 실패했습니다.");
      renderTemplateFileInfo();
      return;
    }

    renderTemplateGeneratedResult({
      title: "데이터 분석 생성 완료",
      desc: "인사이트 파일이 생성되었습니다.",
      json,
    });
  } catch (error) {
    alert(error.message || "데이터 분석 생성에 실패했습니다.");
    renderTemplateFileInfo();
  }
}

async function exportTemplatePpt(fileName) {
  try {
    currentQueryTablesKey = await getOrCreateTemplateQueryTablesKey(fileName);

    const panel = document.getElementById("template-preview-panel");
    if (panel) {
      panel.innerHTML = `
        <div class="template-preview-title">PPT 보고서 생성 중...</div>
        <div class="template-preview-desc">선택한 파일 기반 발표 자료를 생성하고 있습니다.</div>
      `;
    }

    const { res, json } = await authFetch("/api/automation/export-pptx", {
      method: "POST",
      body: JSON.stringify({
        queryTablesKey: currentQueryTablesKey,
        message: "PPT 보고서 생성",
        template: "default",
      }),
    });

    if (!res.ok || !json.ok) {
      alert(json.error || json.message || "PPT 생성에 실패했습니다.");
      renderTemplateFileInfo();
      return;
    }

    renderTemplateGeneratedResult({
      title: "PPT 보고서 생성 완료",
      desc: "PPT 파일이 생성되었습니다.",
      json,
    });
  } catch (error) {
    alert(error.message || "PPT 생성에 실패했습니다.");
    renderTemplateFileInfo();
  }
}

// ==========================================
// 파일 관리 API 호출 함수
// ==========================================

async function loadUserFiles() {
  const token = getAuthToken();
  if (!token) {
    uploadedFiles = [];
    renderTemplateFileInfo();
    return;
  }
  try {
    const response = await fetch(`${API_BASE_URL}/api/files`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) {
      if (response.status === 401) {
        handleUnauthorized();
        window.dispatchEvent(
          new CustomEvent("auth:changed", { detail: { isLoggedIn: false } }),
        );
        updateLoginState();
      }
      throw new Error("파일 목록 로딩 실패");
    }
    uploadedFiles = await response.json();
    renderTemplateFileInfo();
  } catch (error) {
    console.error(error.message);
    uploadedFiles = [];
    renderTemplateFileInfo();
  }
}

async function handleFileUpload(file) {
  const token = getAuthToken();
  if (!token) return alert("로그인이 필요합니다.");

  if (uploadedFiles.length >= 4) {
    alert(
      "파일은 최대 4개까지만 업로드할 수 있습니다.\n기존 파일을 삭제한 후 다시 시도해주세요.",
    );
    return;
  }

  const formData = new FormData();
  formData.append("file", file);

  try {
    const response = await fetch(`${API_BASE_URL}/api/files/upload`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });

    let data = null;
    try {
      data = await response.json();
    } catch (_) {
      data = null;
    }

    if (!response.ok) {
      // 1) 사용량 초과(429) 메시지
      if (
        response.status === 429 &&
        (data?.code === "LIMIT_EXCEEDED" || data?.code === "LIMIT_EXCEEDED")
      ) {
        const field = data?.field ?? data?.meta?.field;
        const used = data?.used ?? data?.meta?.used;
        const limit = data?.limit ?? data?.meta?.limit;

        const label =
          field === "fileUploads"
            ? "파일 업로드"
            : field === "formulaConversions"
              ? "AI 변환"
              : "사용량";

        alert(
          `${label} 한도를 초과했습니다. (${used}/${limit})\n구독 후 무제한으로 이용할 수 있어요.`,
        );
        return;
      }

      // 2) 일반 오류
      const msg =
        data?.message || data?.error || "업로드 중 오류가 발생했습니다.";
      alert(msg);
      return;
    }

    // ✅ 성공 처리
    uploadedFiles = data; // data가 updatedFiles 역할
    lastSelectedFile = file.name;
    renderTemplateFileInfo();
    currentTemplateFileName = lastSelectedFile;
    await updateSubscriptionBadge();
  } catch (error) {
    alert(error.message);
  }
}

async function handleFileDownload(originalName) {
  const token = getAuthToken();
  if (!token) return alert("로그인이 필요합니다.");
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/files/download/${encodeURIComponent(originalName)}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );
    if (!response.ok) throw new Error("다운로드 실패");
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = originalName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  } catch (error) {
    alert(error.message);
  }
}

async function handleFileDelete(originalName) {
  const token = getAuthToken();
  if (!token) return alert("로그인이 필요합니다.");
  if (!confirm(`'${originalName}' 파일을 정말 삭제하시겠습니까?`)) return;
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/files/${encodeURIComponent(originalName)}`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      },
    );
    const updatedFiles = await response.json();
    if (!response.ok) throw new Error(updatedFiles.message);
    uploadedFiles = updatedFiles;
    if (lastSelectedFile === originalName) {
      lastSelectedFile = null;
      currentTemplateFileName = "";
    }
    renderTemplateFileInfo();
  } catch (error) {
    alert(error.message);
  }
}

// ==========================================
// UI 렌더링 및 동적 처리 함수
// ==========================================
function escapeHtml(text = "") {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// openLoginModal 함수 정의 (updateLoginState에서 사용)
const openLoginModal = (event) => {
  event.preventDefault();
  document.getElementById("login-modal-overlay")?.classList.add("active");
};

function applyBetaLocks(betaMode) {
  document.querySelectorAll("[data-beta-lock]").forEach((el) => {
    el.classList.toggle("beta-disabled", betaMode);
  });
} // false로 변경 시 제거

async function applyBetaLocksFromPlans() {
  try {
    const r = await fetch(`${API_BASE_URL}/api/payments/plans`);
    const data = await r.json().catch(() => ({}));
    const betaMode = Boolean(data?.betaMode);
    applyBetaLocks(betaMode);
  } catch (e) {
    // 네트워크 오류 시 잠금 처리 스킵 (원하면 기본 잠금으로 바꿔도 됨)
  }
} // false로 변경 시 제거

async function updateSubscriptionBadge() {
  const subBadge = document.getElementById("subscription-badge");
  const usageBadge = document.getElementById("usage-badge");
  if (!subBadge) return;

  const token = getAuthToken();
  if (!token) {
    subBadge.style.display = "none";
    if (usageBadge) usageBadge.style.display = "none";
    return;
  }

  try {
    const res = await fetch(`${API_BASE_URL}/api/payments/usage`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const data = await res.json();

    // 기본 숨김 처리
    subBadge.style.display = "none";
    if (usageBadge) usageBadge.style.display = "none";

    if (!res.ok) return;

    // PRO: Active 배지 표시
    if (data.plan === "PRO") {
      subBadge.style.display = "inline-flex";
      return;
    }

    // FREE(비구독): 사용량 표시
    // 서버 응답 필드명에 맞춰 안전하게 처리 (둘 중 하나로 올 수 있어서 방어)
    const formulaUsed =
      data.usage?.formulaConversions ?? data.formulaConversions ?? 0;
    const fileUsed = data.usage?.fileUploads ?? data.fileUploads ?? 0;

    // 비구독 한도: 수식 10회, 업로드 1회
    const formulaLimit = 10;
    const fileLimit = 1;

    if (usageBadge) {
      usageBadge.innerHTML = `
        <div class="usage-line">AI 변환 ${formulaUsed}/${formulaLimit}회</div>
        <div class="usage-line">파일 업로드 ${fileUsed}/${fileLimit}회</div>
      `;
      usageBadge.style.display = "inline-block";
    }
  } catch (e) {
    subBadge.style.display = "none";
    if (usageBadge) usageBadge.style.display = "none";
  }
}

window.addEventListener("auth:changed", updateSubscriptionBadge);
window.addEventListener("auth:changed", applyBetaLocksFromPlans); // false로 변경 시 제거
document.addEventListener("DOMContentLoaded", applyBetaLocksFromPlans); // false로 변경 시 제거

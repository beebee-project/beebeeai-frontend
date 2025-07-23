// ==========================
// 1. 공통 유틸리티 함수
// ==========================

// 모든 데모 그룹과 중앙 텍스트를 숨깁니다.
function hideAll() {
  document.querySelector(".center-text-group").style.display = "none";
  document.querySelector(".excel-demo-group").style.display = "none";
  document.querySelector(".sql-demo-group").style.display = "none";
  document.querySelector(".notion-demo-group").style.display = "none";
}

// 엑셀 데모 그룹을 표시하고, 활성 링크를 업데이트합니다.
function showExcelDemo() {
  hideAll();
  document.querySelector(".excel-demo-group").style.display = "flex";
  updateActiveNavLink("엑셀/구글시트");
}

// SQL 데모 그룹을 표시하고, 활성 링크를 업데이트합니다.
function showSqlDemo() {
  hideAll();
  document.querySelector(".sql-demo-group").style.display = "flex";
  updateActiveNavLink("SQL쿼리");
}

// 노션 데모 그룹을 표시하고, 활성 링크를 업데이트합니다.
function showNotionDemo() {
  hideAll();
  document.querySelector(".notion-demo-group").style.display = "flex";
  updateActiveNavLink("Notion함수");
}

// 텍스트 영역의 내용을 기반으로 높이를 자동 조절합니다.
function autoResizeTextarea(textarea) {
  textarea.style.height = "auto";
  textarea.style.height = textarea.scrollHeight + "px";
}

// 상단 내비게이션 링크의 활성 상태를 업데이트합니다.
function updateActiveNavLink(currentText) {
  const navLinks = document.querySelectorAll(".header-nav a");
  navLinks.forEach((link) => {
    if (link.textContent === currentText) {
      link.classList.add("active");
    } else {
      link.classList.remove("active");
    }
  });
}

// ==========================
// 2. API 호출 함수
// ==========================

// 백엔드 API에 요청을 보냅니다.
async function requestFormula(prompt, type) {
  // type 인자를 필수로 받도록 변경
  try {
    const response = await fetch("https://backend.beebeeai.kr/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, type }),
    });

    // HTTP 상태 코드가 2xx 범위가 아니면 에러로 처리
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        `API 요청 실패: ${response.status} ${response.statusText} - ${
          errorData.error || "알 수 없는 오류"
        }`
      );
    }

    const data = await response.json();
    return data.result;
  } catch (error) {
    console.error("API 호출 중 오류 발생:", error);
    alert(`오류: ${error.message}`); // 사용자에게 오류 메시지 알림
    return "API 호출 실패";
  }
}

// ==========================
// 3. DOMContentLoaded 이벤트 리스너
// 모든 DOM 요소들이 로드된 후에 스크립트가 실행되도록 합니다.
// ==========================
document.addEventListener("DOMContentLoaded", () => {
  // 초기 로딩 시 엑셀 데모 표시 (CSS 기본값이 display:none이므로 필요)
  showExcelDemo();

  // 텍스트 영역 자동 크기 조절 기능 연결
  const excelTextarea = document.querySelector(".excel-input-field");
  const sqlTextarea = document.querySelector(".sql-input-field");
  const notionTextarea = document.querySelector(".notion-input-field");

  excelTextarea?.addEventListener("input", () =>
    autoResizeTextarea(excelTextarea)
  );
  sqlTextarea?.addEventListener("input", () => autoResizeTextarea(sqlTextarea));
  notionTextarea?.addEventListener("input", () =>
    autoResizeTextarea(notionTextarea)
  );

  // 모바일 메뉴 (팝업) 기능 연결
  const menuIcon = document.querySelector(".menu-icon");
  const popupOverlay = document.getElementById("popup-overlay");
  const popupClose = document.getElementById("popup-close");

  menuIcon?.addEventListener("click", () => {
    popupOverlay.style.display = "flex";
  });

  popupClose?.addEventListener("click", () => {
    popupOverlay.style.display = "none";
  });

  popupOverlay?.addEventListener("click", (e) => {
    if (e.target === popupOverlay) {
      popupOverlay.style.display = "none";
    }
  });

  // ==========================
  // 4. Excel 데모 그룹 버튼 기능 연결
  // ==========================
  const excelInputField = document.querySelector(".excel-input-field");
  const excelOutputField = document.getElementById("excel-formula-output");
  const excelEditButton = document.querySelector(".excel-edit-button");
  const excelGenerateButton = document.querySelector(".excel-preview-button");
  const excelCopyButton = document.querySelector(".excel-copy-button");

  // Excel 수정 버튼
  excelEditButton?.addEventListener("click", async () => {
    const userInput = excelInputField.value.trim();
    if (!userInput) return;
    try {
      // requestFormula 호출에 try-catch 추가
      const responseData = await requestFormula(userInput, "edit");
      // 응답 데이터에서 실제 텍스트가 있는 필드를 명시적으로 지정
      const refinedText =
        responseData && responseData.formula ? responseData.formula : ""; // undefined 방지
      excelInputField.value = refinedText; // .value 사용
      autoResizeTextarea(excelInputField);
    } catch (error) {
      console.error("수정 중 오류:", error);
      excelInputField.value = "오류 발생: " + error.message;
    }
  });

  // Excel 생성 버튼
  excelGenerateButton?.addEventListener("click", async () => {
    const userInput = excelInputField.value.trim();
    if (!userInput) {
      excelOutputField.value = "수식을 입력해 주세요."; // .value 사용
      return;
    }
    try {
      // requestFormula 호출에 try-catch 추가
      const responseData = await requestFormula(userInput, "generate_excel");
      // 응답 데이터에서 실제 수식이 있는 필드를 명시적으로 지정
      const formula =
        responseData && responseData.formula
          ? responseData.formula
          : "오류 또는 수식 없음"; // undefined 방지
      excelOutputField.value = formula; // .value 사용
    } catch (error) {
      console.error("수식 생성 중 오류:", error);
      excelOutputField.value = "오류 발생: " + error.message; // .value 사용
    }
  });

  // Excel 복사 버튼
  excelCopyButton?.addEventListener("click", () => {
    const formulaText = excelOutputField.textContent;
    if (!formulaText || formulaText === "수식을 입력해 주세요.") return;
    navigator.clipboard
      .writeText(formulaText)
      .then(() => alert("수식이 복사되었습니다!"))
      .catch((err) => console.error("복사 실패:", err));
  });

  // ==========================
  // 5. SQL 데모 그룹 버튼 기능 연결
  // ==========================
  const sqlInputField = document.querySelector(".sql-input-field");
  const sqlOutputField = document.getElementById("sql-formula-output");
  const sqlEditButton = document.querySelector(".sql-edit-button");
  const sqlGenerateButton = document.querySelector(".sql-preview-button");
  const sqlCopyButton = document.querySelector(".sql-copy-button");

  // SQL 수정 버튼
  sqlEditButton?.addEventListener("click", async () => {
    const userInput = sqlInputField.value.trim();
    if (!userInput) return;
    const refinedText = await requestFormula(userInput, "edit"); // 'edit' 타입으로 텍스트 정제 요청
    sqlInputField.value = refinedText;
    autoResizeTextarea(sqlInputField);
  });

  // SQL 생성 버튼
  sqlGenerateButton?.addEventListener("click", async () => {
    const userInput = sqlInputField.value.trim();
    if (!userInput) {
      sqlOutputField.textContent = "쿼리를 입력해 주세요.";
      return;
    }
    const query = await requestFormula(userInput, "generate_sql"); // 'generate_sql' 타입으로 쿼리 생성 요청
    sqlOutputField.textContent = query;
  });

  // SQL 복사 버튼
  sqlCopyButton?.addEventListener("click", () => {
    const queryText = sqlOutputField.textContent;
    if (!queryText || queryText === "쿼리를 입력해 주세요.") return;
    navigator.clipboard
      .writeText(queryText)
      .then(() => alert("쿼리가 복사되었습니다!"))
      .catch((err) => console.error("복사 실패:", err));
  });

  // ==========================
  // 6. Notion 데모 그룹 버튼 기능 연결
  // ==========================
  const notionInputField = document.querySelector(".notion-input-field");
  const notionOutputField = document.getElementById("notion-formula-output");
  const notionEditButton = document.querySelector(".notion-edit-button");
  const notionGenerateButton = document.querySelector(".notion-preview-button");
  const notionCopyButton = document.querySelector(".notion-copy-button");

  // Notion 수정 버튼
  notionEditButton?.addEventListener("click", async () => {
    const userInput = notionInputField.value.trim();
    if (!userInput) return;
    const refinedText = await requestFormula(userInput, "edit"); // 'edit' 타입으로 텍스트 정제 요청
    notionInputField.value = refinedText;
    autoResizeTextarea(notionInputField);
  });

  // Notion 생성 버튼
  notionGenerateButton?.addEventListener("click", async () => {
    const userInput = notionInputField.value.trim();
    if (!userInput) {
      notionOutputField.textContent = "함수를 입력해 주세요.";
      return;
    }
    const func = await requestFormula(userInput, "generate_notion"); // 'generate_notion' 타입으로 함수 생성 요청
    notionOutputField.textContent = func;
  });

  // Notion 복사 버튼
  notionCopyButton?.addEventListener("click", () => {
    const funcText = notionOutputField.textContent;
    if (!funcText || funcText === "함수를 입력해 주세요.") return;
    navigator.clipboard
      .writeText(funcText)
      .then(() => alert("함수가 복사되었습니다!"))
      .catch((err) => console.error("복사 실패:", err));
  });
});

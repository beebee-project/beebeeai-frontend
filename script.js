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
    // !!! 이 부분을 수정합니다: 백엔드가 'formula'를 반환하므로 'data.formula'를 반환합니다. !!!
    // 또한, 백엔드가 응답하는 필드명에 따라 'result'가 될 수도 있으니,
    // 백엔드의 실제 응답 필드명을 확인하여 여기에 입력해야 합니다.
    // 현재 백엔드는 `{"formula": "..."}` 를 보내므로, `data.formula`를 사용합니다.
    return data.formula; // 수정된 부분
  } catch (error) {
    console.error("API 호출 중 오류 발생:", error);
    alert(`오류: ${error.message}`); // 사용자에게 오류 메시지 알림
    return "API 호출 실패"; // 오류 발생 시 undefined 대신 오류 메시지 반환
  }
}

// ... (다른 유틸리티 함수들) ...

document.addEventListener("DOMContentLoaded", () => {
  // ... (다른 DOMContentLoaded 내부 코드) ...

  // ==========================
  // 4. Excel 데모 그룹 버튼 기능 연결
  // ==========================
  const excelInputField = document.querySelector(".excel-input-field");
  // excelOutputField가 <textarea>나 <input>이라면 .value를 사용해야 합니다.
  // HTML에서 해당 요소의 태그를 확인하세요.
  const excelOutputField = document.getElementById("excel-formula-output");
  const excelEditButton = document.querySelector(".excel-edit-button");
  const excelGenerateButton = document.querySelector(".excel-preview-button");
  const excelCopyButton = document.querySelector(".excel-copy-button");

  // Excel 수정 버튼
  excelEditButton?.addEventListener("click", async () => {
    const userInput = excelInputField.value.trim();
    if (!userInput) return;
    try {
      const responseText = await requestFormula(userInput, "edit"); // requestFormula에서 'formula'를 반환할 것이므로, 이를 텍스트로 사용
      excelInputField.value = responseText; // .value 사용
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
      excelOutputField.value = "수식을 입력해 주세요."; // .value 사용 (수정)
      return;
    }
    try {
      const formulaText = await requestFormula(userInput, "generate_excel"); // requestFormula에서 'formula'를 반환할 것임
      excelOutputField.value = formulaText; // .value 사용 (수정)
    } catch (error) {
      console.error("수식 생성 중 오류:", error);
      excelOutputField.value = "오류 발생: " + error.message; // .value 사용
    }
  });

  // ... (SQL 및 Notion 부분도 동일하게 .textContent 대신 .value로 변경하세요) ...
  // SQL 생성 버튼
  sqlGenerateButton?.addEventListener("click", async () => {
    const userInput = sqlInputField.value.trim();
    if (!userInput) {
      sqlOutputField.value = "쿼리를 입력해 주세요."; // .value 사용 (수정)
      return;
    }
    try {
      const queryText = await requestFormula(userInput, "generate_sql");
      sqlOutputField.value = queryText; // .value 사용 (수정)
    } catch (error) {
      console.error("쿼리 생성 중 오류:", error);
      sqlOutputField.value = "오류 발생: " + error.message;
    }
  });

  // Notion 생성 버튼
  notionGenerateButton?.addEventListener("click", async () => {
    const userInput = notionInputField.value.trim();
    if (!userInput) {
      notionOutputField.value = "함수를 입력해 주세요."; // .value 사용 (수정)
      return;
    }
    try {
      const funcText = await requestFormula(userInput, "generate_notion");
      notionOutputField.value = funcText; // .value 사용 (수정)
    } catch (error) {
      console.error("함수 생성 중 오류:", error);
      notionOutputField.value = "오류 발생: " + error.message;
    }
  });

  // ... (Excel 복사, SQL 복사, Notion 복사 버튼도 .textContent 대신 .value를 사용해야 합니다.)
  // Excel 복사 버튼
  excelCopyButton?.addEventListener("click", () => {
    const formulaText = excelOutputField.value; // .value 사용 (수정)
    if (
      !formulaText ||
      formulaText === "수식을 입력해 주세요." ||
      formulaText === "오류 발생: API 호출 실패"
    )
      return; // 오류 메시지도 복사 안 되게
    navigator.clipboard
      .writeText(formulaText)
      .then(() => alert("수식이 복사되었습니다!"))
      .catch((err) => console.error("복사 실패:", err));
  });

  // SQL 복사 버튼
  sqlCopyButton?.addEventListener("click", () => {
    const queryText = sqlOutputField.value; // .value 사용 (수정)
    if (
      !queryText ||
      queryText === "쿼리를 입력해 주세요." ||
      queryText === "오류 발생: API 호출 실패"
    )
      return;
    navigator.clipboard
      .writeText(queryText)
      .then(() => alert("쿼리가 복사되었습니다!"))
      .catch((err) => console.error("복사 실패:", err));
  });

  // Notion 복사 버튼
  notionCopyButton?.addEventListener("click", () => {
    const funcText = notionOutputField.value; // .value 사용 (수정)
    if (
      !funcText ||
      funcText === "함수를 입력해 주세요." ||
      funcText === "오류 발생: API 호출 실패"
    )
      return;
    navigator.clipboard
      .writeText(funcText)
      .then(() => alert("함수가 복사되었습니다!"))
      .catch((err) => console.error("복사 실패:", err));
  });
});

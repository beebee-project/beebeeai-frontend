export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // 프록시: 프론트는 항상 /api/* 로만 호출
    if (url.pathname.startsWith("/api/")) {
      url.hostname = env.API_HOST || "api.beebeeai.kr"; // Pages > Variables 에 설정
      return fetch(new Request(url.toString(), request));
    }

    // 정적 자산 서빙
    return env.ASSETS.fetch(request);
  },
};

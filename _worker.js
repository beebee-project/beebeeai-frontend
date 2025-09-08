export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname.startsWith("/api/")) {
      const backendURL =
        "https://gtfe4k03o0.execute-api.ap-northeast-2.amazonaws.com/prod";
      const apiPath = url.pathname.replace("/api", "");

      return fetch(backendURL + apiPath, {
        method: request.method,
        headers: request.headers,
        body: request.body,
      });
    }

    return env.ASSETS.fetch(request);
  },
};

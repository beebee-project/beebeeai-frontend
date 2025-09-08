export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname.startsWith("/api/")) {
      url.hostname = "gtfe4k03o0.execute-api.ap-northeast-2.amazonaws.com";
      url.pathname = "/prod" + url.pathname;
      return fetch(url.toString(), {
        method: request.method,
        headers: request.headers,
        body: request.body,
      });
    }

    return env.ASSETS.fetch(request);
  },
};

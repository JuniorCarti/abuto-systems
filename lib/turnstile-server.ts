export async function verifyTurnstile(token: unknown, request: Request, secret: string | undefined, fetcher: typeof fetch = fetch) {
  if (typeof token !== "string" || !token || !secret) return false;
  const form = new URLSearchParams({ secret, response: token });
  const ip = request.headers.get("CF-Connecting-IP");
  if (ip) form.set("remoteip", ip);
  try {
    const response = await fetcher("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body: form,
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) return false;
    const result = await response.json() as { success?: boolean; hostname?: string };
    const expectedHostname = new URL(request.url).hostname.toLowerCase();
    const verifiedHostname = result.hostname?.toLowerCase();
    const localHostnames = new Set(["localhost", "127.0.0.1", "::1"]);
    const hostMatches = verifiedHostname === expectedHostname || (localHostnames.has(verifiedHostname ?? "") && localHostnames.has(expectedHostname));
    return result.success === true && hostMatches;
  } catch {
    return false;
  }
}

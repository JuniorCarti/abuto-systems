import { randomBytes, createHash } from "node:crypto";
import { createServer } from "node:http";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const closeServer = server => new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
const workerName = "abuto-systems-website";
const scopes = [
  "https://www.googleapis.com/auth/calendar.events.freebusy",
  "https://www.googleapis.com/auth/calendar.events.owned",
];

function base64url(value) {
  return Buffer.from(value).toString("base64url");
}

function readHidden(prompt) {
  if (!process.stdin.isTTY || typeof process.stdin.setRawMode !== "function") {
    throw new Error("Run this helper in an interactive terminal so OAuth credentials can be entered without echo.");
  }
  process.stdout.write(prompt);
  process.stdin.setRawMode(true);
  process.stdin.resume();
  return new Promise((resolve, reject) => {
    let value = "";
    const finish = (error) => {
      process.stdin.off("data", onData);
      process.stdin.setRawMode(false);
      process.stdin.pause();
      process.stdout.write("\n");
      if (error) reject(error);
      else resolve(value.trim());
    };
    const onData = chunk => {
      for (const character of chunk.toString("utf8")) {
        if (character === "\u0003") return finish(new Error("Authorization cancelled."));
        if (character === "\r" || character === "\n") return finish();
        if (character === "\u007f" || character === "\b") value = value.slice(0, -1);
        else if (character >= " ") value += character;
      }
    };
    process.stdin.on("data", onData);
  });
}

async function receiveAuthorization(server, expectedState) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("Authorization timed out.")), 10 * 60_000);
    server.on("request", (request, response) => {
      const url = new URL(request.url ?? "/", "http://127.0.0.1");
      if (request.method !== "GET" || url.pathname !== "/") {
        response.writeHead(404).end("Not found");
        return;
      }
      clearTimeout(timeout);
      const returnedState = url.searchParams.get("state");
      const code = url.searchParams.get("code");
      const error = url.searchParams.get("error");
      if (returnedState !== expectedState) {
        response.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" }).end("Authorization state did not match. Return to the terminal.");
        reject(new Error("Authorization state validation failed."));
        return;
      }
      if (error || !code) {
        response.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" }).end("Authorization was not completed. Return to the terminal.");
        reject(new Error("Google authorization was not completed."));
        return;
      }
      response.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" });
      response.end("<!doctype html><title>Authorization received</title><p>Authorization received. Return to the terminal and close this browser tab.</p>");
      resolve({ code, url });
    });
  });
}

async function main() {
  process.stdout.write("Abuto Systems Calendar authorization\nOnly continue if you are authorizing abutosystems@gmail.com for the approved Calendar scopes.\n");
  const clientId = await readHidden("Google Desktop OAuth client ID (hidden): ");
  const clientSecret = await readHidden("Google Desktop OAuth client secret (hidden): ");
  if (!clientId || !clientSecret) throw new Error("Both OAuth client values are required.");

  const server = createServer();
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Could not start the loopback authorization listener.");

  const redirectUri = `http://127.0.0.1:${address.port}`;
  const state = base64url(randomBytes(32));
  const verifier = base64url(randomBytes(32));
  const challenge = base64url(createHash("sha256").update(verifier).digest());
  const authorization = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authorization.search = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: scopes.join(" "),
    access_type: "offline",
    prompt: "consent",
    state,
    code_challenge: challenge,
    code_challenge_method: "S256",
  }).toString();

  process.stdout.write("\nOpen this URL, verify the app and account, then grant only the two displayed Calendar scopes:\n");
  process.stdout.write(`${authorization.toString()}\n\n`);
  let authorizationResult;
  try {
    authorizationResult = await receiveAuthorization(server, state);
  } finally {
    await closeServer(server);
  }

  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code: authorizationResult.code,
      client_id: clientId,
      client_secret: clientSecret,
      code_verifier: verifier,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
    }),
    signal: AbortSignal.timeout(15_000),
  });
  let tokens;
  try { tokens = await tokenResponse.json(); } catch { throw new Error("Google token exchange returned an invalid response."); }
  if (!tokenResponse.ok || typeof tokens.refresh_token !== "string" || !tokens.refresh_token) {
    throw new Error("Google did not return an offline refresh token. No credentials were installed; rerun authorization after checking the OAuth client and consent configuration.");
  }
  if (typeof tokens.scope !== "string" || tokens.scope.split(" ").length !== scopes.length || scopes.some(scope => !tokens.scope.split(" ").includes(scope))) {
    throw new Error("Google did not grant exactly the required Calendar scopes. No credentials were installed.");
  }

  const credentials = {
    GOOGLE_CALENDAR_CLIENT_ID: clientId,
    GOOGLE_CALENDAR_CLIENT_SECRET: clientSecret,
    GOOGLE_CALENDAR_REFRESH_TOKEN: tokens.refresh_token,
  };
  const wranglerPath = fileURLToPath(new URL("../node_modules/wrangler/bin/wrangler.js", import.meta.url));
  const installed = spawnSync(process.execPath, [wranglerPath, "secret", "bulk", "--name", workerName], {
    cwd: process.cwd(),
    input: JSON.stringify(credentials),
    encoding: "utf8",
    stdio: ["pipe", "ignore", "ignore"],
    timeout: 60_000,
    windowsHide: true,
  });
  credentials.GOOGLE_CALENDAR_CLIENT_ID = "";
  credentials.GOOGLE_CALENDAR_CLIENT_SECRET = "";
  credentials.GOOGLE_CALENDAR_REFRESH_TOKEN = "";
  tokens.refresh_token = "";
  if (installed.error || installed.status !== 0) throw new Error("Wrangler could not install the Google secrets. Check Cloudflare authentication and run the helper again; no credential values were displayed.");
  process.stdout.write("Google Calendar secret names were installed on the existing Worker. No credential values were displayed.\n");
}

main().catch(() => {
  process.stderr.write("Authorization did not complete. No credential values were displayed. Check the Google Desktop client, account, network, and Wrangler authentication, then retry.\n");
  process.exitCode = 1;
});

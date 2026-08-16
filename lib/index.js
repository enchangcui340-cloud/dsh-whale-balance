// Host half of dsh-whale-balance (runs in the DSH Node.js process).
// Registers two HTTP routes under the webServer service:
//   /dsh-whale/whale.png  — the widget image (custom PNG, or built-in default SVG)
//   /dsh-whale/balance    — the DeepSeek account balance as JSON
// The client half fetches /dsh-whale/balance with browser fetch, so no typed
// remote is required.
const name = "dsh-whale-balance";
const inject = ["webServer"];

// Built-in default: a whale holding a white elliptical bubble, drawn so the
// bubble center (455,237), major axis 710, minor axis 430 match the client's
// text overlay geometry exactly.
const DEFAULT_IMAGE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="1026" height="1026" viewBox="0 0 1026 1026">
  <ellipse cx="455" cy="237" rx="355" ry="215" fill="#ffffff" stroke="#dce5ff" stroke-width="5"/>
  <g transform="translate(41, 440) scale(6.67)">
    <path d="M28 42 Q14 30 6 26 Q14 38 24 44 Q12 46 4 56 Q16 50 28 48 Z" fill="#4d6bfe"/>
    <ellipse cx="66" cy="42" rx="38" ry="21" fill="#4d6bfe"/>
    <circle cx="102" cy="40" r="15" fill="#4d6bfe"/>
    <path d="M58 24 Q56 12 68 10 Q70 20 66 26 Z" fill="#4d6bfe"/>
    <ellipse cx="62" cy="47" rx="27" ry="9" fill="#e4eaff"/>
    <circle cx="103" cy="35" r="3.2" fill="#101635"/>
    <circle cx="104.3" cy="33.8" r="1.1" fill="#ffffff"/>
    <path d="M106 43 Q112 47 115 42.5" stroke="#101635" stroke-width="2" fill="none" stroke-linecap="round"/>
    <circle cx="97" cy="42" r="3.4" fill="#c7d2ff" opacity="0.8"/>
    <g stroke="#9db4ff" stroke-width="2.6" fill="none" stroke-linecap="round">
      <path d="M106 24 Q110 17 114 10"/>
      <path d="M112 24 Q116 18 122 13"/>
      <path d="M100 24 Q102 19 104 13"/>
    </g>
  </g>
</svg>`;

// Query DeepSeek account balance via curl (free endpoint, no model tokens).
async function fetchBalance(ctx) {
  const credentials = ctx.get("credentials");
  if (credentials === undefined) {
    return { ok: false, error: "credentials service unavailable" };
  }
  const resolved = await credentials.resolve("DEEPSEEK_API_KEY");
  if (resolved === undefined || !resolved.value) {
    return { ok: false, error: "DEEPSEEK_API_KEY not configured" };
  }

  const subprocess = ctx.get("subprocess");
  if (subprocess === undefined) {
    return { ok: false, error: "subprocess service unavailable" };
  }

  let curl = "curl";
  try {
    const found = await subprocess.resolveExecutable("curl");
    if (typeof found === "string" && found.length > 0) curl = found;
  } catch (e) {
    /* fall through to "curl" on PATH */
  }

  const policy = ctx.get("sandboxPolicy");
  const cwd = policy !== undefined && policy.workspaceRoot ? policy.workspaceRoot : "C:\\";

  let handle;
  try {
    handle = subprocess.spawn({
      argv: [
        curl, "-sS", "-L", "--connect-timeout", "8", "--max-time", "15",
        "-H", "Authorization: Bearer " + resolved.value,
        "https://api.deepseek.com/user/balance",
      ],
      cwd,
      stdio: {
        stdin: "ignore",
        stdout: { maxBytes: 65536 },
        stderr: { maxBytes: 8192 },
      },
      graceMs: 5000,
    });
  } catch (e) {
    return { ok: false, error: "spawn failed: " + String(e && e.message ? e.message : e) };
  }

  let outcome;
  try {
    outcome = await handle.done;
  } catch (e) {
    return { ok: false, error: "curl failed: " + String(e && e.message ? e.message : e) };
  }
  const out = handle.collected && handle.collected.stdout ? handle.collected.stdout.readFrom(0).text : "";
  if (outcome.exitCode !== 0) {
    return { ok: false, error: "curl exited " + String(outcome.exitCode), detail: out.slice(0, 300) };
  }
  let parsed;
  try {
    parsed = JSON.parse(out);
  } catch (e) {
    return { ok: false, error: "unexpected response", detail: out.slice(0, 300) };
  }
  const infos = Array.isArray(parsed.balance_infos) ? parsed.balance_infos : [];
  const first = infos[0];
  if (first === undefined || typeof first.total_balance !== "string") {
    const apiError = parsed && parsed.error;
    const msg = apiError && (apiError.message || apiError.msg);
    return { ok: false, error: msg ? String(msg) : "no balance info" };
  }
  return {
    ok: true,
    balance: first.total_balance,
    currency: typeof first.currency === "string" && first.currency.length > 0 ? first.currency : "CNY",
    isAvailable: parsed.is_available !== false,
  };
}

function apply(ctx, config) {
  const imagePath = config !== undefined && typeof config.imagePath === "string" ? config.imagePath : "";

  // Image route: custom PNG when imagePath is set and readable, else built-in SVG.
  ctx.effect(() => ctx.webServer.register({
    kind: "exact",
    path: "/dsh-whale/whale.png",
    handler: async (req, res) => {
      const fs = ctx.get("fs");
      if (imagePath !== "" && fs !== undefined) {
        try {
          const target = await fs.resolve(imagePath);
          const bytes = await fs.readBytes(target, undefined, 8 * 1024 * 1024);
          res.writeHead(200, {
            "Content-Type": "image/png",
            "Content-Length": bytes.length,
            "Cache-Control": "public, max-age=60",
          });
          res.end(bytes);
          return;
        } catch (e) {
          /* fall through to default SVG */
        }
      }
      res.writeHead(200, { "Content-Type": "image/svg+xml", "Cache-Control": "public, max-age=60" });
      res.end(DEFAULT_IMAGE_SVG);
    },
  }), "whale-balance: image route");

  // Balance route: JSON the client polls.
  ctx.effect(() => ctx.webServer.register({
    kind: "exact",
    path: "/dsh-whale/balance",
    handler: async (req, res) => {
      let result;
      try {
        result = await fetchBalance(ctx);
      } catch (e) {
        result = { ok: false, error: String(e && e.message ? e.message : e) };
      }
      res.writeHead(200, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
      res.end(JSON.stringify(result));
    },
  }), "whale-balance: balance route");
}

export { name, inject, apply };

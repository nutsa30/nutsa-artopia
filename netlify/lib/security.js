// Executable inline code is limited to the exact trusted analytics bootstrap.
// Hashes avoid unsafe-inline, unsafe-eval and per-visitor HTML/cache nonces.
export async function securityPolicy(html) {
  // The HTML parser normalizes Windows CRLF before checking an inline hash.
  const init = html.match(/<script\s+id="artopia-analytics-init"[^>]*>([\s\S]*?)<\/script>/i)?.[1]?.replace(/\r\n?/g,"\n");
  const hash = init ? btoa(String.fromCharCode(...new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(init))))) : null;
  return [
    "default-src 'self'",
    `script-src 'self'${hash ? " 'sha256-" + hash + "'" : ""} https://www.googletagmanager.com https://translate.google.com https://translate.googleapis.com`,
    "script-src-attr 'none'",
    // Translate injects dynamic style elements; permitting CSS does not permit inline JS.
    "style-src 'self' 'unsafe-inline' https://translate.googleapis.com https://fonts.googleapis.com https://www.gstatic.com",
    // Existing React layout/Quill color controls use style attributes, not executable scripts.
    "style-src-attr 'unsafe-inline'",
    "img-src 'self' data: blob: https://res.cloudinary.com https://www.google.com https://www.gstatic.com https://fonts.gstatic.com https://*.googleusercontent.com https://translate.googleapis.com https://www.google-analytics.com",
    "font-src 'self' data: https://fonts.gstatic.com",
    "connect-src 'self' https://artopia-backend-2024-54872c79acdd.herokuapp.com https://res.cloudinary.com https://www.googletagmanager.com https://www.google-analytics.com https://region1.google-analytics.com https://analytics.google.com https://region1.analytics.google.com https://www.google.com/g/collect https://stats.g.doubleclick.net https://translate.google.com https://translate.googleapis.com https://translate-pa.googleapis.com",
    "frame-src https://www.google.com https://maps.google.com https://translate.google.com",
    "form-action 'self' https://*.bog.ge https://ipay.ge",
    "frame-ancestors 'self' https://kemsilab.com https://www.kemsilab.com",
    "object-src 'none'", "base-uri 'self'", "worker-src 'self' blob:", "upgrade-insecure-requests",
  ].join("; ");
}

export async function secureResponse(response) {
  if (!(response.headers.get("content-type") || "").includes("text/html")) return response;
  const html = await response.text(), headers = new Headers(response.headers);
  headers.set("Content-Security-Policy", await securityPolicy(html));
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  headers.set("Strict-Transport-Security", "max-age=31536000");
  for (const name of ["content-length", "content-encoding", "etag"]) headers.delete(name);
  return new Response(html, { status: response.status, statusText: response.statusText, headers });
}

const API_FEED = "https://artopia-backend-2024-54872c79acdd.herokuapp.com/merchant-feed.xml";

export async function handler() {
  try {
    const response = await fetch(API_FEED);
    const body = await response.text();
    return {
      statusCode: response.status,
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, max-age=900, s-maxage=900",
        "X-Robots-Tag": "noindex",
      },
      body,
    };
  } catch {
    return {
      statusCode: 503,
      headers: { "Content-Type": "text/plain; charset=utf-8", "Retry-After": "300" },
      body: "Merchant feed is temporarily unavailable",
    };
  }
}

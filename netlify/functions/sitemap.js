export async function handler() {
  const res = await fetch("https://artopia-backend-2024-54872c79acdd.herokuapp.com/sitemap.xml");
  const text = await res.text();

  return {
    statusCode: 200,
    headers: {
      "Content-Type": "application/xml",
    },
    body: text,
  };
}
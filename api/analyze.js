// Serverless function: keeps your API key on the server, never in the browser.
module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).end();
  if (req.headers["x-passcode"] !== process.env.APP_PASSCODE) return res.status(401).end();
  try {
    const prompt = String((req.body && req.body.prompt) || "").slice(0, 4000);
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-sonnet-5-5",
        max_tokens: 700,
        messages: [{ role: "user", content: prompt }]
      })
    });
    if (!r.ok) return res.status(502).json({ text: "AI service error (" + r.status + ")." });
    const d = await r.json();
    res.status(200).json({ text: (d.content && d.content[0] && d.content[0].text) || "" });
  } catch (e) {
    res.status(500).json({ text: "Server error." });
  }
};

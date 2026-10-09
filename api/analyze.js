// Serverless function. Keeps your API key on the server, never in the browser.
// Uses Google Gemini (free tier) if GEMINI_API_KEY is set, otherwise Anthropic.
module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).end();
  if (req.headers["x-passcode"] !== process.env.APP_PASSCODE) return res.status(401).end();
  try {
    const prompt = String((req.body && req.body.prompt) || "").slice(0, 4000);
    let r, text = "";
    if (process.env.GEMINI_API_KEY) {
      const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
      r = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/models/" + model + ":generateContent",
        {
          method: "POST",
          headers: { "content-type": "application/json", "x-goog-api-key": process.env.GEMINI_API_KEY },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { maxOutputTokens: 1200 }
          })
        }
      );
      if (!r.ok) return res.status(502).json({ text: "AI service error (" + r.status + "). Check your key, model name and quota." });
      const d = await r.json();
      text = (d.candidates && d.candidates[0] && d.candidates[0].content && d.candidates[0].content.parts || [])
        .map(p => p.text || "").join("");
    } else {
      r = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": process.env.ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01"
        },
        body: JSON.stringify({ model: "claude-sonnet-5-5", max_tokens: 700, messages: [{ role: "user", content: prompt }] })
      });
      if (!r.ok) return res.status(502).json({ text: "AI service error (" + r.status + ")." });
      const d = await r.json();
      text = (d.content && d.content[0] && d.content[0].text) || "";
    }
    res.status(200).json({ text });
  } catch (e) {
    res.status(500).json({ text: "Server error." });
  }
};

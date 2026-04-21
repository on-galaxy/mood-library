export const config = {
  api: {
    bodyParser: {
      sizeLimit: "20mb",
    },
  },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { imageData, mediaType, existingTags } = req.body;

  if (!imageData) {
    return res.status(400).json({ error: "No image data provided" });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "API key not configured" });
  }

  const existingHint =
    existingTags && existingTags.length > 0
      ? `Existing tags in library: ${existingTags.join(", ")}. Reuse if fitting, invent new ones if needed.`
      : "";

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5",
        max_tokens: 150,
        system: `You are a mood curator for an AI image archive called "mood library".
Look at the image and return 2-5 single-word mood tags that capture its emotional atmosphere and aesthetic feeling.
Tags must be evocative and poetic like: dreamy, liminal, tender, raw, cinematic, glitchy, ethereal, nostalgic, surreal, hypnotic, serene, vivid, dark, minimal, hollow, lush, fever, haze, gossamer, bruised.
Never use generic words like beautiful, colorful, artistic, nice.
${existingHint}
Reply ONLY with a JSON array of lowercase strings. Example: ["dreamy","liminal","tender"]`,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: mediaType || "image/jpeg",
                  data: imageData,
                },
              },
              {
                type: "text",
                text: "Mood tags for this image?",
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Anthropic API error:", errText);
      return res.status(500).json({ error: "Anthropic API failed", detail: errText });
    }

    const data = await response.json();
    const text = data.content?.[0]?.text || "[]";
    const tags = JSON.parse(text.replace(/```json|```/g, "").trim());
    return res.status(200).json({ tags });
  } catch (error) {
    console.error("Handler error:", error);
    return res.status(500).json({ error: "Failed to analyze image", detail: error.message });
  }
}

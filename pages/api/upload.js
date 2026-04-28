export const config = {
  api: { bodyParser: { sizeLimit: "20mb" } },
};

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { imageData, mediaType } = req.body;
  if (!imageData) return res.status(400).json({ error: "No image data" });

  try {
    const cloudinaryRes = await fetch(
      `https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          file: `data:${mediaType};base64,${imageData}`,
          upload_preset: "mood_library",
        }),
      }
    );
    const data = await cloudinaryRes.json();
    if (!cloudinaryRes.ok) return res.status(500).json({ error: "Cloudinary upload failed", detail: data });
    return res.status(200).json({ url: data.secure_url });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

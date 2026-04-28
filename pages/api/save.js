import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { title, tags, image_url } = req.body;
  if (!image_url) return res.status(400).json({ error: "No image URL" });

  const { data, error } = await supabase
    .from("images")
    .insert([{ title: title || "untitled", tags: tags.join(","), image_url }])
    .select();

  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json({ image: data[0] });
}

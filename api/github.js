export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();

  const owner = "yosintv";
  const repo = "ytv-api";
  const branch = "main";
  const token = process.env.GITHUB_TOKEN;

  try {
    if (req.method === "GET") {
      const path = req.query.path;

      const r = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github+json",
          "User-Agent": "YoSinTV-Admin"
        }
      });

      const data = await r.json();
      if (!r.ok) return res.status(r.status).json(data);

      const content = JSON.parse(Buffer.from(data.content, "base64").toString("utf8"));

      return res.status(200).json({ content, sha: data.sha });
    }

    if (req.method === "POST") {
      const { path, content } = req.body;

      const current = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github+json",
          "User-Agent": "YoSinTV-Admin"
        }
      });

      const currentData = await current.json();

      const update = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github+json",
          "Content-Type": "application/json",
          "User-Agent": "YoSinTV-Admin"
        },
        body: JSON.stringify({
          message: `Update ${path} from YoSinTV Admin`,
          content: Buffer.from(JSON.stringify(content, null, 2)).toString("base64"),
          sha: currentData.sha,
          branch
        })
      });

      const result = await update.json();
      return res.status(update.status).json(result);
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}

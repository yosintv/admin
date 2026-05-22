export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    const cors = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: cors });
    }

    try {
      if (url.pathname === "/get") {
        const path = url.searchParams.get("path");
        return await getFile(env, path, cors);
      }

      if (url.pathname === "/save") {
        const body = await request.json();

        if (body.password !== env.ADMIN_PASSWORD) {
          return json({ error: "Wrong password" }, 401, cors);
        }

        return await saveFile(env, body.path, body.content, cors);
      }

      return json({ error: "Not found" }, 404, cors);
    } catch (e) {
      return json({ error: e.message }, 500, cors);
    }
  }
};

function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...headers,
      "Content-Type": "application/json"
    }
  });
}

async function github(env, path, options = {}) {
  return fetch(`https://api.github.com/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}/contents/${path}`, {
    ...options,
    headers: {
      "Authorization": `Bearer ${env.GITHUB_TOKEN}`,
      "Accept": "application/vnd.github+json",
      "User-Agent": "YoSinTV-Admin",
      ...(options.headers || {})
    }
  });
}

async function getFile(env, path, cors) {
  const res = await github(env, path);
  const data = await res.json();

  if (!res.ok) {
    return json({ error: data.message || "GitHub fetch failed" }, res.status, cors);
  }

  const decoded = JSON.parse(atob(data.content.replace(/\n/g, "")));

  return json({
    path,
    sha: data.sha,
    content: decoded
  }, 200, cors);
}

async function saveFile(env, path, content, cors) {
  const current = await github(env, path);
  const currentData = await current.json();

  if (!current.ok) {
    return json({ error: currentData.message || "Could not get SHA" }, current.status, cors);
  }

  const newContent = btoa(unescape(encodeURIComponent(JSON.stringify(content, null, 2))));

  const res = await github(env, path, {
    method: "PUT",
    body: JSON.stringify({
      message: `Update ${path} from YoSinTV Admin`,
      content: newContent,
      sha: currentData.sha,
      branch: env.GITHUB_BRANCH || "main"
    })
  });

  const data = await res.json();

  if (!res.ok) {
    return json({ error: data.message || "GitHub save failed" }, res.status, cors);
  }

  return json({ success: true, commit: data.commit?.html_url }, 200, cors);
}

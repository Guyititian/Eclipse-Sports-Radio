// Eclipse Sports Radio Addon
// Deploy to Vercel: https://vercel.com/new → import this project → deploy
// Then add your deployed URL + /manifest.json to Eclipse

export default async function handler(req, res) {
// CORS — Eclipse needs this
res.setHeader(“Access-Control-Allow-Origin”, “*”);
res.setHeader(“Access-Control-Allow-Methods”, “GET, OPTIONS”);
res.setHeader(“Access-Control-Allow-Headers”, “Content-Type”);
if (req.method === “OPTIONS”) return res.status(200).end();

const path = req.url.split(”?”)[0].replace(/^/api/, “”);
const { q, id } = req.query;

// ── /manifest.json ──────────────────────────────────────────────────────────
if (path === “/manifest.json” || path === “/”) {
return res.status(200).json({
id: “com.community.sportsradio”,
name: “Sports Radio”,
version: “1.0.0”,
description:
“Search live sports radio stations by team or league. Powered by TuneIn.”,
resources: [“search”, “stream”],
types: [“track”],
icon: “https://upload.wikimedia.org/wikipedia/commons/thumb/a/a6/Anonymous_emblem.svg/120px-Anonymous_emblem.svg.png”,
});
}

// ── /search?q=<query> ────────────────────────────────────────────────────────
if (path === “/search”) {
if (!q) return res.status(400).json({ error: “Missing query param: q” });

```
try {
  // TuneIn OPML API — no key required, returns JSON with &render=json
  const tuneInUrl = `https://opml.radiotime.com/Search.ashx?query=${encodeURIComponent(
    q
  )}&types=station&render=json`;

  const tuneInRes = await fetch(tuneInUrl);
  const data = await tuneInRes.json();

  // TuneIn wraps results in data.body — filter to actual stations/streams
  const items = (data?.body || []).filter(
    (item) =>
      item.type === "audio" &&
      item.url &&
      (item.item === "station" || item.item === "topic")
  );

  // Map to Eclipse track format (mirroring the podcasts addon structure)
  const tracks = items.slice(0, 20).map((item) => ({
    id: item.guide_id || item.preset_id || encodeURIComponent(item.url),
    title: item.text || item.name || "Unknown Station",
    artist: item.subtext || item.formats || "Live Radio",
    album: "Sports Radio",
    artwork: item.image || item.logo || null,
    // We pass the TuneIn resolve URL as the stream hint;
    // the /stream endpoint will resolve the actual audio URL
    url: item.url,
    duration: 0,
    isLive: true,
  }));

  return res.status(200).json({ results: tracks });
} catch (err) {
  console.error("Search error:", err);
  return res.status(500).json({ error: "Search failed", details: err.message });
}
```

}

// ── /stream?id=<id>&url=<tuneInUrl> ─────────────────────────────────────────
// Eclipse calls this to get the actual playable stream URL for a track
if (path === “/stream”) {
// Eclipse may pass either the track id or a url param
const streamUrl = req.query.url || id;
if (!streamUrl) return res.status(400).json({ error: “Missing param: id or url” });

```
try {
  // TuneIn station URLs are themselves OPML/PLS redirects — resolve them
  // to a direct audio stream URL that Eclipse can play
  const resolved = await resolveTuneInStream(decodeURIComponent(streamUrl));
  if (!resolved) throw new Error("Could not resolve stream URL");

  return res.status(200).json({ url: resolved });
} catch (err) {
  console.error("Stream error:", err);
  return res.status(500).json({ error: "Stream resolution failed", details: err.message });
}
```

}

return res.status(404).json({ error: “Not found” });
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/**

- TuneIn station URLs look like:
- https://opml.radiotime.com/Tune.ashx?id=s12345
- Fetching that returns an M3U/PLS playlist with the real stream URL inside.
- This function follows it and returns the raw audio stream URL.
  */
  async function resolveTuneInStream(url) {
  // If it’s already a direct audio stream, return as-is
  if (url.match(/.(mp3|aac|ogg|opus|m3u8|pls|m3u)(?|$)/i) === null &&
  !url.includes(“radiotime.com”) &&
  !url.includes(“tunein.com”)) {
  return url;
  }

const resp = await fetch(url, { redirect: “follow” });
const text = await resp.text();

// Try to extract from M3U
const m3uMatch = text.match(/^(https?://[^\s#]+)/m);
if (m3uMatch) return m3uMatch[1].trim();

// Try to extract from PLS
const plsMatch = text.match(/File\d+=(https?://[^\s]+)/);
if (plsMatch) return plsMatch[1].trim();

// Try JSON (TuneIn sometimes returns JSON with a stream URL)
try {
const json = JSON.parse(text);
const bodyItems = json?.body || [];
for (const item of bodyItems) {
if (item?.url?.startsWith(“http”)) return item.url;
}
} catch (_) {}

// If we got an actual audio content-type back, the URL itself is the stream
const ct = resp.headers.get(“content-type”) || “”;
if (ct.includes(“audio”) || ct.includes(“mpegurl”) || ct.includes(“ogg”)) {
return url;
}

return null;
}

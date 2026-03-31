export const config = {
runtime: “edge”,
};

export default async function handler(req) {
const url = new URL(req.url);
const path = url.pathname;
const q = url.searchParams.get(“q”);
const streamUrl = url.searchParams.get(“url”) || url.searchParams.get(“id”);

const cors = {
“Access-Control-Allow-Origin”: “*”,
“Access-Control-Allow-Methods”: “GET, OPTIONS”,
“Content-Type”: “application/json”,
};

if (req.method === “OPTIONS”) {
return new Response(null, { status: 200, headers: cors });
}

// /manifest.json
if (path === “/manifest.json” || path === “/” || path === “”) {
return new Response(
JSON.stringify({
id: “com.community.sportsradio”,
name: “Sports Radio”,
version: “1.0.0”,
description: “Search live sports radio stations by team or league. Powered by TuneIn.”,
resources: [“search”, “stream”],
types: [“track”],
icon: “https://upload.wikimedia.org/wikipedia/commons/thumb/a/a6/Anonymous_emblem.svg/120px-Anonymous_emblem.svg.png”,
}),
{ status: 200, headers: cors }
);
}

// /search?q=…
if (path === “/search”) {
if (!q) {
return new Response(JSON.stringify({ error: “Missing param: q” }), {
status: 400,
headers: cors,
});
}
try {
const tuneInRes = await fetch(
`https://opml.radiotime.com/Search.ashx?query=${encodeURIComponent(q)}&types=station&render=json`
);
const data = await tuneInRes.json();
const items = (data?.body || []).filter(
(item) => item.type === “audio” && item.url
);
const tracks = items.slice(0, 20).map((item) => ({
id: item.guide_id || encodeURIComponent(item.url),
title: item.text || “Unknown Station”,
artist: item.subtext || “Live Radio”,
album: “Sports Radio”,
artwork: item.image || null,
url: item.url,
duration: 0,
isLive: true,
}));
return new Response(JSON.stringify({ results: tracks }), {
status: 200,
headers: cors,
});
} catch (err) {
return new Response(JSON.stringify({ error: err.message }), {
status: 500,
headers: cors,
});
}
}

// /stream?url=…
if (path === “/stream”) {
if (!streamUrl) {
return new Response(JSON.stringify({ error: “Missing param: url” }), {
status: 400,
headers: cors,
});
}
try {
const resolved = await resolveStream(decodeURIComponent(streamUrl));
if (!resolved) throw new Error(“Could not resolve stream”);
return new Response(JSON.stringify({ url: resolved }), {
status: 200,
headers: cors,
});
} catch (err) {
return new Response(JSON.stringify({ error: err.message }), {
status: 500,
headers: cors,
});
}
}

return new Response(JSON.stringify({ error: “Not found” }), {
status: 404,
headers: cors,
});
}

async function resolveStream(url) {
const resp = await fetch(url, { redirect: “follow” });
const text = await resp.text();
const m3u = text.match(/^(https?://[^\s#]+)/m);
if (m3u) return m3u[1].trim();
const pls = text.match(/File\d+=(https?://[^\s]+)/);
if (pls) return pls[1].trim();
try {
const json = JSON.parse(text);
for (const item of json?.body || []) {
if (item?.url?.startsWith(“http”)) return item.url;
}
} catch (_) {}
return url;
}

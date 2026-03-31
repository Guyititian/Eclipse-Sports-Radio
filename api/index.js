module.exports = function(req, res) {
res.setHeader(“Access-Control-Allow-Origin”, “*”);
res.setHeader(“Content-Type”, “application/json”);

var path = req.url.split(”?”)[0];
var q = req.query.q;
var streamUrl = req.query.url || req.query.id;

if (path === “/manifest.json” || path === “/api/index”) {
return res.status(200).json({
id: “com.community.sportsradio”,
name: “Sports Radio”,
version: “1.0.0”,
description: “Search live sports radio stations by team or league.”,
resources: [“search”, “stream”],
types: [“track”],
icon: “https://upload.wikimedia.org/wikipedia/commons/thumb/a/a6/Anonymous_emblem.svg/120px-Anonymous_emblem.svg.png”
});
}

if (path === “/search”) {
if (!q) return res.status(400).json({ error: “Missing param: q” });
return fetch(“https://opml.radiotime.com/Search.ashx?query=” + encodeURIComponent(q) + “&types=station&render=json”)
.then(function(r) { return r.json(); })
.then(function(data) {
var items = (data.body || []).filter(function(item) {
return item.type === “audio” && item.url;
});
var tracks = items.slice(0, 20).map(function(item) {
return {
id: item.guide_id || encodeURIComponent(item.url),
title: item.text || “Unknown Station”,
artist: item.subtext || “Live Radio”,
album: “Sports Radio”,
artwork: item.image || null,
url: item.url,
duration: 0,
isLive: true
};
});
return res.status(200).json({ results: tracks });
})
.catch(function(err) {
return res.status(500).json({ error: err.message });
});
}

if (path === “/stream”) {
if (!streamUrl) return res.status(400).json({ error: “Missing param: url” });
var decoded = decodeURIComponent(streamUrl);
return fetch(decoded, { redirect: “follow” })
.then(function(r) { return r.text(); })
.then(function(text) {
var m3u = text.match(/^(https?://[^\s#]+)/m);
if (m3u) return res.status(200).json({ url: m3u[1].trim() });
var pls = text.match(/File\d+=(https?://[^\s]+)/);
if (pls) return res.status(200).json({ url: pls[1].trim() });
return res.status(200).json({ url: decoded });
})
.catch(function(err) {
return res.status(500).json({ error: err.message });
});
}

return res.status(404).json({ error: “Not found” });
};

module.exports = function(req, res) {
res.setHeader("Access-Control-Allow-Origin", "*");
res.setHeader("Content-Type", "application/json");
var path = req.url.split("?")[0];
var q = req.query.q;
var su = req.query.url || req.query.id;
if (path === "/manifest.json" || path === "/api/index") {
return res.status(200).json({id:"com.community.sportsradio",name:"Sports Radio",version:"1.0.0",description:"Search live sports radio by team or league.",resources:["search","stream"],types:["track"]});
}
if (path === "/search") {
if (!q) return res.status(400).json({error:"missing q"});
return fetch("https://opml.radiotime.com/Search.ashx?query="+encodeURIComponent(q)+"&types=station&render=json&partnerId=RadioTime"
).then(function(r){return r.json();}).then(function(d){var t=(d.body||[]).filter(function(i){return i.type==="audio"&&i.url;}).slice(0,20).map(function(i){return{id:i.guide_id||i.url,title:i.text||"Station",artist:i.subtext||"Live Radio",album:"Sports Radio",artwork:i.image||null,url:i.url,duration:0};});return res.status(200).json({results:t});}).catch(function(e){return res.status(500).json({error:e.message});});
}
if (path === "/stream") {
if (!su) return res.status(400).json({error:"missing url"});
var decoded = decodeURIComponent(su);
return fetch(decoded,{redirect:"follow"}).then(function(r){return r.text();}).then(function(text){var m=text.match(/^(https?:\/\/[^\s#]+)/m);if(m)return res.status(200).json({url:m[1].trim()});var p=text.match(/File\d+=(https?:\/\/[^\s]+)/);if(p)return res.status(200).json({url:p[1].trim()});return res.status(200).json({url:decoded});}).catch(function(e){return res.status(500).json({error:e.message});});
}
return res.status(404).json({error:"not found"});
};

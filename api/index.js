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
return fetch("https://de1.api.radio-browser.info/json/stations/search?name="+encodeURIComponent(q)+"&limit=20&countrycode=US&hidebroken=true",{headers:{"User-Agent":"EclipseSportsRadio/1.0"}}).then(function(r){return r.json();}).then(function(d){var t=(d||[]).map(function(i){return{id:i.stationuuid,title:i.name,artist:i.tags||"Live Radio",album:"Sports Radio",artwork:i.favicon||null,url:i.url_resolved||i.url,duration:0};});return res.status(200).json({results:t});}).catch(function(e){return res.status(500).json({error:e.message});});
}
if (path === "/stream") {
if (!su) return res.status(400).json({error:"missing url"});
return res.status(200).json({url:decodeURIComponent(su)});
}
return res.status(404).json({error:"not found"});
};

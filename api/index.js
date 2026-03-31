module.exports = function(req, res) {
res.setHeader("Access-Control-Allow-Origin", "*");
res.setHeader("Content-Type", "application/json");
var path = req.url.split("?")[0];
var q = req.query.q;
if (path === "/manifest.json") {
return res.status(200).json({id:"com.community.sportsradio",name:"Sports Radio",version:"1.0.0",description:"Search live sports radio by team or league.",resources:["search","stream"],types:["track"]});
}
if (path === "/search") {
if (!q) return res.status(400).json({error:"missing q"});
return fetch("https://de1.api.radio-browser.info/json/stations/search?name="+encodeURIComponent(q)+"&limit=20&countrycode=US&hidebroken=true",{headers:{"User-Agent":"EclipseSportsRadio/1.0"}}).then(function(r){return r.json();}).then(function(d){var t=(d||[]).map(function(i){return{id:i.stationuuid,title:i.name,artist:i.tags||"Live Radio",album:"Sports Radio",artworkURL:i.favicon||null,streamURL:i.url_resolved||i.url,duration:0,format:"mp3"};});return res.status(200).json({tracks:t});}).catch(function(e){return res.status(500).json({error:e.message});});
}
if (path.startsWith("/stream/")) {
var id = path.replace("/stream/","");
return fetch("https://de1.api.radio-browser.info/json/stations/byuuid/"+id,{headers:{"User-Agent":"EclipseSportsRadio/1.0"}}).then(function(r){return r.json();}).then(function(d){var s=d[0];if(!s)return res.status(404).json({error:"not found"});return res.status(200).json({url:s.url_resolved||s.url,format:"mp3"});}).catch(function(e){return res.status(500).json({error:e.message});});
}
return res.status(404).json({error:"not found"});
};

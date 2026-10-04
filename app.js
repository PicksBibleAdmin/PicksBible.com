(function(){
/* ======================================================================
   LIVE DATA: one public document in Firestore (public/live), written by the admin
   panel on every save. The site shows ONLY what is in it (= items switched to Live).
   One read per page view keeps the free quota safe.
   ====================================================================== */
var LIVE_URL="https://firestore.googleapis.com/v1/projects/picksbible-7fa7f/databases/(default)/documents/public/live?key=AIzaSyBBnSFHx_z1YWwOXz6sdKOSzelTIuvusa8";
function fsVal(v){
  if(!v)return null;
  if("stringValue" in v)return v.stringValue;
  if("integerValue" in v)return Number(v.integerValue);
  if("doubleValue" in v)return v.doubleValue;
  if("booleanValue" in v)return v.booleanValue;
  if("timestampValue" in v)return v.timestampValue;
  if("mapValue" in v)return fsMap(v.mapValue.fields||{});
  if("arrayValue" in v)return (v.arrayValue.values||[]).map(fsVal);
  return null;
}
function fsMap(f){var o={};Object.keys(f).forEach(function(k){o[k]=fsVal(f[k])});return o}
function wat(dOffset){ /* yyyy-mm-dd in Nigerian time, shifted by dOffset days */
  var p=new Intl.DateTimeFormat("en-CA",{timeZone:"Africa/Lagos",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
  var t=new Date(p+"T12:00:00Z");t.setUTCDate(t.getUTCDate()+(dOffset||0));return t.toISOString().slice(0,10);
}
function flagOf(country){
  var c=(window.PB.countryFlags||{})[country];
  if(!c||c.length!==2)return "";
  return c.toUpperCase().split("").map(function(x){return String.fromCodePoint(127397+x.charCodeAt(0))}).join("");
}
function lgKey(P,sport,comp,country){
  var n=String(comp||"").toLowerCase();
  for(var k in P.leagues){var l=P.leagues[k];if(l.sport===sport&&String(l.name).toLowerCase()===n)return k}
  var key="db_"+sport+"_"+n.replace(/[^a-z0-9]+/g,"-");
  P.leagues[key]={name:comp||"Other",sport:sport,flag:flagOf(country),country:country||"Other"};
  return key;
}
function applyLive(P,live){
  var days={}; days[wat(-1)]="yesterday"; days[wat(0)]="today"; days[wat(1)]="tomorrow";
  P.football={yesterday:[],today:[],tomorrow:[]};
  P.basketball={yesterday:[],today:[],tomorrow:[]};
  P.playerProps=[];
  var d=new Date(wat(0)+"T12:00:00Z");
  P.site.today=d.getUTCDate()+" "+["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][d.getUTCMonth()]+" "+d.getUTCFullYear();
  var fixtures=(live&&live.fixtures)||[], props=(live&&live.props)||[];
  fixtures.sort(function(a,b){return String(a.kickoff).localeCompare(String(b.kickoff))});
  P.byDate={football:{},basketball:{}};
  P.home={et:{football:{},basketball:{}},bo:{football:{},basketball:{}},vip:{}};
  (live&&live.vip||[]).forEach(function(x){if(x&&x.ymd)P.home.vip[x.ymd]={odds:x.odds||"",st:x.st||""}});
  fixtures.forEach(function(f){
    var hd=String(f.kickoff||"").slice(0,10), sp=f.sport==="basketball"?"basketball":"football";
    var cname=(f.country&&String(f.competition||"").toLowerCase().indexOf(String(f.country).toLowerCase())!==0?f.country+" ":"")+(f.competition||"");
    if(f.et&&f.et.on&&hd)P.home.et[sp][hd]={h:f.home,a:f.away,lg:f.competition||"",t:String(f.kickoff).slice(11,16),by:f.et.by||"PB Analyst",reasoning:f.et.reasoning||"",hl:f.et.hl||"",al:f.et.al||"",sp:sp};
    if(f.bo&&f.bo.on&&hd){var bl=P.home.bo[sp][hd]=P.home.bo[sp][hd]||[];bl.push({lg:cname,t:(f.bo.st==="won"||f.bo.st==="lost")?"FT":String(f.kickoff).slice(11,16),h:f.home,a:f.away,pick:f.bo.pick||"",st:f.bo.st||"pending",sc:f.bo.score||""})}
    if(!((f.fb&&f.fb.live)||(f.bb&&f.bb.live)))return;
    if(f.sport==="basketball"){
      var bd=String(f.kickoff||"").slice(0,10), bday=days[bd]; if(!bd)return;
      var b=f.bb||{};
      var bm={lg:lgKey(P,"basketball",f.competition,f.country),t:String(f.kickoff).slice(11,16),h:f.home,a:f.away,
        o:[b.o1||"",b.o2||""],pk:b.tip||"",tip:b.tip||"-",conf:b.conf||"",spread:b.spread||"",ts:b.totalSide||"",tl:b.totalLine||"",ps:b.ps||"",st:"pending",score:""};
      (P.byDate.basketball[bd]=P.byDate.basketball[bd]||[]).push(bm);
      if(bday){var bl=P.basketball[bday];bm.featured=bl.length<6;bl.push(bm)}
      return;
    }
    if(f.sport!=="football")return;
    var date=String(f.kickoff||"").slice(0,10), day=days[date]; if(!date)return;
    var v=f.fb||{};
    var m={lg:lgKey(P,"football",f.competition,f.country),t:String(f.kickoff).slice(11,16),h:f.home,a:f.away,
      o:[v.o1||"",v.oX||"",v.o2||""],pk:v.tip||"",tip:v.tip||"-",gg:v.btts||"",ggo:v.bttsOdds||"",ou:v.ou||"",ouo:v.ouOdds||"",conf:v.conf||"",dc:v.dc||"",dco:v.dcOdds||"",cs:v.cs||"",
      st:"pending",score:""};
    (P.byDate.football[date]=P.byDate.football[date]||[]).push(m);   /* any date: used by the calendar picker */
    if(day){var list=P.football[day];m.featured=list.length<6;list.push(m)}
  });
  props.sort(function(a,b){return String(a.kickoff).localeCompare(String(b.kickoff))});
  props.forEach(function(p){
    var k=String(p.kickoff||"").slice(0,10); if(k!==wat(0)&&k!==wat(1))return;
    var team=p.team||"", other=team===p.home?p.away:p.home;
    P.playerProps.push({k:p.market,player:p.player||"",team:team,opp:team?("vs "+other):(p.home+" v "+p.away),line:p.line||"",pick:p.side||"",odds:p.odds||"",st:p.st||"pending"});
  });
}
function loadLive(done){
  var finished=false;
  function fin(live){ if(finished)return; finished=true; try{applyLive(window.PB,live)}catch(e){try{console.error(e)}catch(_){}} done(); }
  var timer=setTimeout(function(){fin(null)},6000);
  try{
    fetch(LIVE_URL).then(function(r){return r.ok?r.json():{}}).then(function(j){clearTimeout(timer);fin(j&&j.fields?fsMap(j.fields):null)}).catch(function(){clearTimeout(timer);fin(null)});
  }catch(e){clearTimeout(timer);fin(null)}
}

function main(){
"use strict";
var D = window.PB, S = D.site;
var $ = function(s,r){return (r||document).querySelector(s)};
var $$ = function(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s))};
function esc(s){return String(s==null?"":s).replace(/[&<>"]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]})}
function store(k,v){try{if(v===undefined)return localStorage.getItem(k);localStorage.setItem(k,v)}catch(e){return null}}
var DAYS=["yesterday","today","tomorrow"];
/* ---------- team / nation images ----------
   Nations: flag picture picked automatically from the team name (flagcdn.com). Clubs: a logo link typed in the admin (https only).
   No picture available: neutral ball icon. Never letters / initials. */
var NATIONS={"afghanistan":"af","albania":"al","algeria":"dz","andorra":"ad","angola":"ao","argentina":"ar","armenia":"am","australia":"au","austria":"at","azerbaijan":"az","bahrain":"bh","bangladesh":"bd","belarus":"by","belgium":"be","belize":"bz","benin":"bj","bolivia":"bo","bosnia and herzegovina":"ba","bosnia & herzegovina":"ba","botswana":"bw","brazil":"br","bulgaria":"bg","burkina faso":"bf","burundi":"bi","cambodia":"kh","cameroon":"cm","canada":"ca","cape verde":"cv","cabo verde":"cv","central african republic":"cf","chad":"td","chile":"cl","china":"cn","china pr":"cn","colombia":"co","comoros":"km","congo":"cg","dr congo":"cd","congo dr":"cd","costa rica":"cr","croatia":"hr","cuba":"cu","cyprus":"cy","czech republic":"cz","czechia":"cz","denmark":"dk","dominican republic":"do","ecuador":"ec","egypt":"eg","el salvador":"sv","england":"gb-eng","equatorial guinea":"gq","eritrea":"er","estonia":"ee","eswatini":"sz","ethiopia":"et","faroe islands":"fo","fiji":"fj","finland":"fi","france":"fr","gabon":"ga","gambia":"gm","georgia":"ge","germany":"de","ghana":"gh","gibraltar":"gi","greece":"gr","grenada":"gd","guatemala":"gt","guinea":"gn","guinea-bissau":"gw","guyana":"gy","haiti":"ht","honduras":"hn","hong kong":"hk","hungary":"hu","iceland":"is","india":"in","indonesia":"id","iran":"ir","iraq":"iq","ireland":"ie","republic of ireland":"ie","israel":"il","italy":"it","ivory coast":"ci","cote d'ivoire":"ci","côte d'ivoire":"ci","jamaica":"jm","japan":"jp","jordan":"jo","kazakhstan":"kz","kenya":"ke","kosovo":"xk","kuwait":"kw","kyrgyzstan":"kg","laos":"la","latvia":"lv","lebanon":"lb","lesotho":"ls","liberia":"lr","libya":"ly","liechtenstein":"li","lithuania":"lt","luxembourg":"lu","madagascar":"mg","malawi":"mw","malaysia":"my","maldives":"mv","mali":"ml","malta":"mt","mauritania":"mr","mauritius":"mu","mexico":"mx","moldova":"md","mongolia":"mn","montenegro":"me","morocco":"ma","mozambique":"mz","myanmar":"mm","namibia":"na","nepal":"np","netherlands":"nl","new zealand":"nz","nicaragua":"ni","niger":"ne","nigeria":"ng","north macedonia":"mk","northern ireland":"gb-nir","norway":"no","oman":"om","pakistan":"pk","palestine":"ps","panama":"pa","papua new guinea":"pg","paraguay":"py","peru":"pe","philippines":"ph","poland":"pl","portugal":"pt","puerto rico":"pr","qatar":"qa","romania":"ro","russia":"ru","rwanda":"rw","san marino":"sm","saudi arabia":"sa","scotland":"gb-sct","senegal":"sn","serbia":"rs","sierra leone":"sl","singapore":"sg","slovakia":"sk","slovenia":"si","somalia":"so","south africa":"za","south korea":"kr","korea republic":"kr","south sudan":"ss","spain":"es","sri lanka":"lk","sudan":"sd","suriname":"sr","sweden":"se","switzerland":"ch","syria":"sy","tajikistan":"tj","tanzania":"tz","thailand":"th","togo":"tg","trinidad and tobago":"tt","tunisia":"tn","turkey":"tr","türkiye":"tr","turkmenistan":"tm","uganda":"ug","ukraine":"ua","united arab emirates":"ae","uae":"ae","uruguay":"uy","usa":"us","united states":"us","uzbekistan":"uz","venezuela":"ve","vietnam":"vn","wales":"gb-wls","yemen":"ye","zambia":"zm","zimbabwe":"zw"};
function natCode(name){var k=String(name||"").toLowerCase().replace(/\s+(w|women|u-?\d\d)$/i,"").trim();return NATIONS[k]||""}
function teamCrest(name,logo,sp){
  var ball=sp==="basketball"?"&#127936;":"&#9917;", code=natCode(name), src="", cls="crest img";
  if(logo&&/^https:\/\//i.test(logo)){src=logo;cls+=" logo"}
  else if(code){src="https://flagcdn.com/w160/"+code+".png"}
  if(!src)return '<div class="crest ball" aria-hidden="true">'+ball+'</div>';
  return '<div class="'+cls+'" style="overflow:hidden"><img style="width:100%;height:100%;object-fit:'+(logo&&/^https:\/\//i.test(logo)?'contain':'cover')+';display:block" src="'+esc(src)+'" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.parentNode.className=\'crest ball\';this.parentNode.innerHTML=\''+ball+'\'"></div>';
}

var DAYLABEL={yesterday:"Yesterday",today:"Today",tomorrow:"Tomorrow"};

/* ---------- header menus ---------- */
var drawer=$("#drawer"), more=$("#more");
$$("[data-open=drawer]").forEach(function(b){b.addEventListener("click",function(){drawer.hidden=false;$(".close",drawer).focus()})});
if(drawer){drawer.addEventListener("click",function(e){if(e.target===drawer||e.target.closest(".close"))drawer.hidden=true})}
$$("[data-open=more]").forEach(function(b){b.addEventListener("click",function(e){e.stopPropagation();more.hidden=!more.hidden;b.setAttribute("aria-expanded",String(!more.hidden))})});
document.addEventListener("click",function(e){if(more&&!more.hidden&&!more.contains(e.target))more.hidden=true});
document.addEventListener("keydown",function(e){if(e.key==="Escape"){if(drawer)drawer.hidden=true;if(more)more.hidden=true}});
if(!S.previewNotice){$$(".preview").forEach(function(p){p.remove()})}

/* ---------- collapsible "Today's Predictions" SEO league strip ---------- */
(function(){
  var toggle=$("#leaguesToggle"), nav=$("#leaguesNav");
  if(!toggle||!nav)return;
  toggle.addEventListener("click",function(){
    var open=toggle.getAttribute("aria-expanded")==="true";
    toggle.setAttribute("aria-expanded",String(!open));
    nav.hidden=open;
  });
})();

/* ---------- select-a-league data + accordion renderer: shared by the homepage
   directory AND every local "All Leagues" filter, so both work identically ---------- */
function isoFlag(code){
  if(!code||code.length!==2)return "🏳️";
  return code.toUpperCase().split("").map(function(c){return String.fromCodePoint(127397+c.charCodeAt(0))}).join("");
}
function slug(s){return s.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/(^-|-$)/g,"")}

var LG_COUNTRIES=(function(){
  var countries={};
  Object.keys(D.leagues).forEach(function(code){
    var l=D.leagues[code], c=l.country||"Other";
    (countries[c]=countries[c]||[]).push({code:code,name:l.name,sport:l.sport,flag:l.flag});
  });
  var extra=D.countryFlags||{};
  Object.keys(extra).forEach(function(name){
    if(countries[name])return;
    var iso=extra[name], flag=isoFlag(iso), base=slug(name);
    countries[name]=[
      {code:base+"-d1", name:name+" Premier Division", sport:"football", flag:flag},
      {code:base+"-cup", name:name+" Cup", sport:"football", flag:flag}
    ];
  });
  return countries;
})();
var LG_COUNTRY_NAMES=Object.keys(LG_COUNTRIES).sort(function(a,b){return a.localeCompare(b)});
function lgCountryFlag(c){var l=LG_COUNTRIES[c][0];return l?l.flag:"🏳️"}
var LG_TOP=["ucl","epl","laliga","bund","seriea","ligue1","nba"].filter(function(k){return D.leagues[k]});

function lgGroupHtml(key,label,flagHtml,leagues,isTop){
  var rows=leagues.map(function(l){
    return '<button type="button" class="lgleague" data-code="'+l.code+'" data-sport="'+l.sport+'"><span>'+esc(l.name)+'</span><span class="ct">'+(l.sport==="football"?"⚽":"🏀")+'</span></button>';
  }).join("");
  return '<div class="lggroup'+(isTop?" lgtop":"")+'">'+
    '<button type="button" class="lgitem lgcountry" data-key="'+esc(key)+'" aria-expanded="false">'+
      '<span class="flag">'+flagHtml+'</span><span class="lgname">'+esc(label)+'</span><span class="toggle">+</span>'+
    '</button>'+
    '<div class="lgsub" hidden>'+rows+'</div>'+
  '</div>';
}

/* renders the full accordion into `body`; opts.sport narrows it to one sport (used by the
   local per-table filter); opts.onPick(code,sport) fires instead of navigating when set;
   opts.extra prepends a leading row (e.g. "All Leagues") */
function renderLeagueAccordion(body,opts){
  opts=opts||{};
  var sportFilter=opts.sport;
  var top=LG_TOP.filter(function(k){return !sportFilter||D.leagues[k].sport===sportFilter});
  var html=opts.extra||"";
  if(top.length)html+=lgGroupHtml("__top__","Top League","⭐",top.map(function(k){return {code:k,name:D.leagues[k].name,sport:D.leagues[k].sport}}),true);
  LG_COUNTRY_NAMES.forEach(function(c){
    var list=LG_COUNTRIES[c];
    if(sportFilter)list=list.filter(function(l){return l.sport===sportFilter});
    if(!list.length)return;
    html+=lgGroupHtml(c,c,lgCountryFlag(c),list,false);
  });
  body.innerHTML=html;
  $$(".lgcountry",body).forEach(function(b){
    b.addEventListener("click",function(){
      var sub=b.nextElementSibling, open=b.getAttribute("aria-expanded")==="true";
      b.setAttribute("aria-expanded",String(!open));
      b.querySelector(".toggle").textContent=open?"+":"−";
      sub.hidden=open;
    });
  });
  $$(".lgleague",body).forEach(function(b){b.addEventListener("click",function(){
    if(opts.onPick){opts.onPick(b.dataset.code,b.dataset.sport);return}
    location.href=(b.dataset.sport==="football"?"football-predictions.html#":"basketball-predictions.html#")+b.dataset.code;
  })});
  if(opts.onPickAll){var allBtn=$("[data-all]",body);if(allBtn)allBtn.addEventListener("click",function(){opts.onPickAll()})}
}

/* ---------- select a league: full A-Z country directory, on every page's top strip.
   Two buttons share this wiring: the main one (all sports) and a basketball-only one,
   so basketball isn't buried under football in the combined directory. ---------- */
function wireHeaderLeaguePanel(btnId,panelId,bodyId,sportFilter){
  var openBtn=$("#"+btnId), panel=$("#"+panelId), body=$("#"+bodyId);
  if(!openBtn||!panel)return;
  var built=false;
  function openPanel(){panel.hidden=false;openBtn.setAttribute("aria-expanded","true");if(!built){renderLeagueAccordion(body,{sport:sportFilter});built=true}}
  function closePanel(){panel.hidden=true;openBtn.setAttribute("aria-expanded","false")}
  function togglePanel(){if(panel.hidden)openPanel();else closePanel()}
  openBtn.addEventListener("click",function(e){e.stopPropagation();togglePanel()});
  document.addEventListener("click",function(e){if(!panel.hidden&&!panel.contains(e.target)&&e.target!==openBtn)closePanel()});
  document.addEventListener("keydown",function(e){if(e.key==="Escape"&&!panel.hidden)closePanel()});
}
wireHeaderLeaguePanel("lgOpenBtn","lgPanel","lgModalBody");
wireHeaderLeaguePanel("lgOpenBtnBB","lgPanelBB","lgModalBodyBB","basketball");

/* ---------- helpers ---------- */
function lgName(id){return (D.leagues[id]||{name:id}).name}
function lgFlag(id){return (D.leagues[id]||{}).flag||""}
function tipBadge(m){return '<span class="tip '+(m.st==="won"?"won":m.st==="lost"?"lost":"")+'" title="'+esc(m.st)+'">'+esc(m.tip)+'</span>'}
function ring(p){return '<span class="ring" style="--p:'+(+p)+'"><b>'+(+p).toFixed(1)+'%</b></span>'}
function groupRows(list,cols,rowFn){
  var out="",last=null;
  list.forEach(function(m){
    if(m.lg!==last){out+='<tr class="lg"><td class="lgc" colspan="'+cols+'"><span class="flag">'+lgFlag(m.lg)+'</span>'+esc(lgName(m.lg))+'</td></tr>';last=m.lg}
    out+=rowFn(m);
  });
  return out;
}
/* A-Z by league name as shown in the table (Bundesliga before La Liga), then kick-off time within a league.
   No cap on rows: every match in the list is rendered. */
function sortByLeague(list){
  return list.slice().sort(function(a,b){
    var c=lgName(a.lg).localeCompare(lgName(b.lg),undefined,{sensitivity:"base"});
    if(c)return c;
    if(a.lg!==b.lg)return a.lg<b.lg?-1:1;
    return String(a.t).localeCompare(String(b.t));
  });
}
function firstIdx(list,lg){for(var i=0;i<list.length;i++)if(list[i].lg===lg)return i;return 0}
function scoreLine(m){return m.score?'<span class="sc">'+esc(m.score)+'</span>':'<span class="sc" style="color:var(--muted)">-:-</span>'}

/* ---------- full prediction tables ---------- */
function oddCell(m,i,k){var v=m.o&&m.o[i]?m.o[i]:"-";return '<td class="od" data-l="'+k+'"><span class="odd'+(m.pk===k?" pk":"")+'">'+esc(v)+'</span></td>'}
function pkBadge(m){return '<span class="tip '+(m.st==="won"?"won":m.st==="lost"?"lost":"")+'" title="'+esc(m.st)+'">'+esc(m.pk||m.tip||"-")+'</span>'}
function dcCell(m){return m.dc?'<td class="kv" data-l="Double Chance"><span class="xp"><b>'+esc(m.dc)+'</b>'+(m.dco?'<i>('+esc(m.dco)+')</i>':'')+'</span></td>':'<td class="kv na" data-l="Double Chance">-</td>'}
function confCell(m){var n=parseFloat(String(m.conf).replace("%","")),lv=isNaN(n)?"":n<45?" lo":n<=55?" mid":" hi";return m.conf?'<td class="kv" data-l="Confidence"><span class="conf'+lv+'">'+esc(String(m.conf).replace("%",""))+'%</span></td>':'<td class="kv na" data-l="Confidence">-</td>'}
function extraPick(label,odds,name){return '<td class="kv'+(label?'':' na')+'" data-l="'+esc(name||"")+'">'+(label?'<span class="xp"><b>'+esc(label)+'</b>'+(odds?'<i>('+esc(odds)+')</i>':'')+'</span>':'-')+'</td>'}
function footballTable(list){
  if(!list.length)return '<div class="empty">No football ⚽ predictions for this day yet.</div>';
  var played=list.some(function(m){return m.score});
  return '<div class="tscroll bwwrap"><table class="pt bw"><thead><tr><th>Time</th><th class="l">Competition</th><th class="l">Home</th><th class="l">Away</th><th>Home Win (1)</th><th>Draw (X)</th><th>Away Win (2)</th><th>Tip</th><th>Confidence</th><th>Over/Under 2.5</th><th>BTTS</th><th>Double Chance</th><th>CS Tip</th>'+(played?'<th>Result</th>':'')+'</tr></thead><tbody>'+
    sortByLeague(list).map(function(m){
      return '<tr><td class="tm">'+esc(m.t)+'</td><td class="l lgn">'+esc(lgName(m.lg))+'</td><td class="l team"><b>'+esc(m.h)+'</b></td><td class="l team"><b>'+esc(m.a)+'</b></td>'+
        oddCell(m,0,"1")+oddCell(m,1,"X")+oddCell(m,2,"2")+'<td class="kv" data-l="Tip">'+pkBadge(m)+'</td>'+confCell(m)+
        extraPick(m.ou?(m.ou==="Over"?"Over 2.5":"Under 2.5"):"",m.ouo,"Over/Under 2.5")+extraPick(m.gg,m.ggo,"BTTS")+dcCell(m)+
        '<td class="cs kv'+(m.cs?'':' na')+'" data-l="CS Tip">'+esc(m.cs||"-")+'</td>'+(played?'<td class="res kv" data-l="Result">'+(m.score?esc(m.score):'-:-')+'</td>':'')+'</tr>';
    }).join("")+
    '</tbody></table></div>';
}
function bbOdd(m,i,k){var v=m.o&&m.o[i]?m.o[i]:"-";return '<td class="od"><span class="odd'+(m.pk===k?" pk":"")+'">'+esc(v)+'</span></td>'}
function basketballTable(list){
  if(!list.length)return '<div class="empty">No basketball 🏀 predictions for this day yet.</div>';
  var played=list.some(function(m){return m.score});
  return '<div class="tscroll bwwrap"><table class="pt bw bk"><thead><tr><th>Time</th><th class="l">Competition</th><th class="l">Home</th><th class="l">Away</th><th>Home Win (1)</th><th>Away Win (2)</th><th>Tip</th><th>Confidence</th><th>Projected Spread</th><th>Point Total Tip</th><th>Projected Score</th>'+(played?'<th>Result</th>':'')+'</tr></thead><tbody>'+
    sortByLeague(list).map(function(m){
      var tot=m.ts?'<span class="xp"><b>'+esc(m.ts)+(m.tl?' '+esc(m.tl):'')+'</b></span>':'-';
      return '<tr><td class="tm">'+esc(m.t)+'</td><td class="l lgn">'+esc(lgName(m.lg))+'</td><td class="l team"><b>'+esc(m.h)+'</b></td><td class="l team"><b>'+esc(m.a)+'</b></td>'+
        bbOdd(m,0,"1")+bbOdd(m,1,"2")+'<td>'+pkBadge(m)+'</td>'+confCell(m)+'<td class="cs">'+esc(m.spread||"-")+'</td><td>'+tot+'</td><td class="cs">'+esc(m.ps||"-")+'</td>'+(played?'<td class="res">'+(m.score?esc(m.score):'-:-')+'</td>':'')+'</tr>';
    }).join("")+
    '</tbody></table></div>';
}
function compactTable(list,sport){
  if(!list.length)return '<div class="empty">Picks for this day are coming soon.</div>';
  return '<div class="tscroll"><table class="pt compact"><thead><tr><th>Time</th><th>Match</th><th>Tips</th></tr></thead><tbody>'+
    groupRows(sortByLeague(list),3,function(m){return '<tr><td>'+esc(m.t)+'</td><td class="m"><b>'+esc(m.h)+'</b>'+scoreLine(m)+'<b>'+esc(m.a)+'</b></td><td>'+tipBadge(m)+'</td></tr>'})+
    '</tbody></table></div>';
}

/* featured: football left, basketball right, one shared day switch */
$$("[data-featured]").forEach(function(el){
  var day="today";
  function draw(){
    $$(".tabs button",el).forEach(function(b){b.setAttribute("aria-pressed",String(b.dataset.day===day))});
    $("[data-slot=fb]",el).innerHTML=compactTable(D.football[day].filter(function(m){return m.featured}),"football");
    $("[data-slot=bb]",el).innerHTML=compactTable(D.basketball[day].filter(function(m){return m.featured}),"basketball");
  }
  $$(".tabs button",el).forEach(function(b){b.addEventListener("click",function(){day=b.dataset.day;draw()})});
  draw();
});

/* big table with sport toggle, day switch, calendar date picker and league accordion filter */
$$("[data-bigtable]").forEach(function(el){
  var fixed=el.dataset.sport||"";
  var sport=fixed||store("pb.sport")||"football";
  var day=el.dataset.day||"today";
  var hash=(location.hash||"").slice(1);
  var league=D.leagues[hash]?hash:"";
  if(league&&!fixed)sport=D.leagues[league].sport;
  var title=$("[data-slot=title]",el);
  var customDate=null; /* a Date the calendar picked that isn't yesterday/today/tomorrow */
  var propsWrap=el.nextElementSibling;
  if(!propsWrap||!propsWrap.hasAttribute("data-props-wrap"))propsWrap=null;

  function draw(){
    $$(".toggle button[data-sport]",el).forEach(function(b){b.setAttribute("aria-pressed",String(b.dataset.sport===sport))});
    $$(".tabs button",el).forEach(function(b){b.setAttribute("aria-pressed",String(!customDate&&b.dataset.day===day))});
    var lgBtn=$("[data-lgopen]",el);
    if(lgBtn)lgBtn.innerHTML="🌍 "+(league?esc(D.leagues[league].name):"All Leagues")+" ▾";
    if(propsWrap)propsWrap.hidden=(sport!=="basketball");
    if(title)title.textContent=(sport==="football"?"⚽ All Football":"🏀 All Basketball")+" Predictions & Tips";
    /* the shared date picker (same control as VIP Results): only holds a value while a custom date is chosen */
    var bc=$("[data-bcal]",el);
    if(bc)bc.value=customDate?(customDate.getFullYear()+"-"+("0"+(customDate.getMonth()+1)).slice(-2)+"-"+("0"+customDate.getDate()).slice(-2)):"";
    if(customDate){
      var ymd=customDate.getFullYear()+"-"+("0"+(customDate.getMonth()+1)).slice(-2)+"-"+("0"+customDate.getDate()).slice(-2);
      var cl=((D.byDate&&D.byDate[sport]&&D.byDate[sport][ymd])||[]).filter(function(m){return !league||m.lg===league});
      if(cl.length){$("[data-slot=table]",el).innerHTML=sport==="football"?footballTable(cl):basketballTable(cl);return}
      $("[data-slot=table]",el).innerHTML='<p class="note center" style="padding:28px 10px">No published predictions for this date yet. Try Yesterday, Today or Tomorrow above, or pick another date.</p>';
      return;
    }
    var list=D[sport][day].filter(function(m){return !league||m.lg===league});
    $("[data-slot=table]",el).innerHTML=sport==="football"?footballTable(list):basketballTable(list);
  }

  $$("[data-goto]",el).forEach(function(b){b.addEventListener("click",function(){store("pb.sport",b.dataset.goto.indexOf("basketball")===0?"basketball":"football");location.href=b.dataset.goto})});
  $$(".toggle button[data-sport]",el).forEach(function(b){b.addEventListener("click",function(){sport=b.dataset.sport;league="";lgBuilt=false;store("pb.sport",sport);draw()})});
  $$(".tabs button",el).forEach(function(b){b.addEventListener("click",function(){day=b.dataset.day;customDate=null;draw()})});

  /* league accordion (same seamless country > league picker as the homepage,
     but picking a league filters this table instead of navigating away) */
  var lgOpenBtn=$("[data-lgopen]",el), lgPanel=$("[data-lgpanel]",el), lgBody=$("[data-lgpanelbody]",el), lgBuilt=false;
  if(lgOpenBtn&&lgPanel){
    function lgOpen(){
      lgPanel.hidden=false;lgOpenBtn.setAttribute("aria-expanded","true");
      if(!lgBuilt){
        renderLeagueAccordion(lgBody,{
          sport:fixed||sport,
          extra:'<div class="lggroup"><button type="button" class="lgitem" data-all><span class="flag">🌍</span><span class="lgname">All Leagues</span></button></div>',
          onPick:function(code,sp){league=code;if(!fixed){sport=sp;store("pb.sport",sport)}lgClose();draw()},
          onPickAll:function(){league="";lgClose();draw()}
        });
        lgBuilt=true;
      }
    }
    function lgClose(){lgPanel.hidden=true;lgOpenBtn.setAttribute("aria-expanded","false")}
    lgOpenBtn.addEventListener("click",function(e){e.stopPropagation();lgPanel.hidden?lgOpen():lgClose()});
    document.addEventListener("click",function(e){if(!lgPanel.hidden&&!lgPanel.contains(e.target)&&e.target!==lgOpenBtn)lgClose()});
    document.addEventListener("keydown",function(e){if(e.key==="Escape"&&!lgPanel.hidden)lgClose()});
  }

  /* date picker: the same control as VIP Results on the home page. Pick any date, not just yesterday/today/tomorrow */
  var bcal=$("[data-bcal]",el);
  if(bcal)bcal.addEventListener("change",function(){
    if(!bcal.value){customDate=null;draw();return}
    var v=bcal.value, p=v.split("-");
    if(v===wat(-1)){day="yesterday";customDate=null}
    else if(v===wat(0)){day="today";customDate=null}
    else if(v===wat(1)){day="tomorrow";customDate=null}
    else customDate=new Date(+p[0],+p[1]-1,+p[2]);
    draw();
  });

  draw();
});


/* ---------- HOME PAGE: hero filters, Expert Tip, Bets of the Day, VIP, Sure Predictions (10 max) ----------
   Expert Tip, Bets of the Day and VIP Results come from the admin page ("5. Home boxes" tab) through the public snapshot. */
function ymdOf(d){return d.getFullYear()+"-"+("0"+(d.getMonth()+1)).slice(-2)+"-"+("0"+d.getDate()).slice(-2)}
function getET(sport,ymd){
  var H=D.home||{}, v=H.et&&H.et[sport]&&H.et[sport][ymd]; if(!v)return null;
  return v;
}
function getBO(sport,ymd){
  var H=D.home||{}, l=H.bo&&H.bo[sport]&&H.bo[sport][ymd]; return l||[];
}
function getVIP(year,month){ /* month is 0-11; one entry per calendar day */
  var n=new Date(year,month+1,0).getDate(), today=wat(0), out=[], V=(D.home&&D.home.vip)||{};
  for(var d=1;d<=n;d++){
    var ymd=year+"-"+("0"+(month+1)).slice(-2)+"-"+("0"+d).slice(-2), x=V[ymd];
    if(x&&(x.st==="won"||x.st==="lost")){out.push({ymd:ymd,d:d,odds:x.odds||"",st:x.st});continue}
    out.push({ymd:ymd,d:d,odds:(x&&x.odds)||"",st:ymd>today?"soon":"none"});
  }
  return out;
}

$$("[data-home]").forEach(function(hero){
  var sport="football", day="today", customDate=null;
  var sure=$("[data-sure]"), botd=$("[data-botd]"), propsWrap=$("[data-props-wrap]"), et=$("[data-experttip]"), vipbox=$("[data-vipbox]");
  var MON=["January","February","March","April","May","June","July","August","September","October","November","December"];
  function selYmd(){return customDate?ymdOf(customDate):wat({yesterday:-1,today:0,tomorrow:1}[day])}
  function setSport(sp){sport=sp;store("pb.sport",sp);if(etMode!=="both")etMode=sp;drawAll()}

  function etHalf(sp){
    var v=getET(sp,selYmd());
    var head='<div class="ethalf"><h3>'+(sp==="football"?"&#9917; Football":"&#127936; Basketball")+'</h3>';
    if(!v)return head+'<div class="empty">No matches available.</div></div>';
    return head+
      '<div class="vb-main"><div>'+teamCrest(v.h,v.hl,v.sp)+'<div class="vb-team">'+esc(v.h)+'</div></div><div class="vb-mid"><strong>'+esc(v.t)+'</strong>vs<br>'+esc(v.lg)+'</div><div>'+teamCrest(v.a,v.al,v.sp)+'<div class="vb-team">'+esc(v.a)+'</div></div></div>'+
      '<a class="etlock" href="expert-tips.html?s='+sp+'&d='+selYmd()+'" aria-label="Open the reasoning for this expert tip"><span class="lockico" aria-hidden="true">&#128274;</span><span class="locktxt">View expert tip</span></a>'+
      '<div class="vb-by"><span>EXPERT TIP BY: <b>'+esc(v.by)+'</b></span><span>'+(sp==="football"?"&#9917; Football":"&#127936; Basketball")+'</span></div>'+
      '</div>';
  }
  var etMode="both";
  function drawET(){
    var phone=window.matchMedia("(max-width:700px)").matches;
    var m=etMode; if(phone&&m==="both")m=sport;
    $$("[data-et]",et).forEach(function(b){b.setAttribute("aria-pressed",String(b.dataset.et===m))});
    var body=$("[data-etbody]",et);
    body.className="etbody "+(m==="both"?"split":"full");
    body.innerHTML=m==="both"?etHalf("football")+etHalf("basketball"):etHalf(m);
  }
  $$("[data-et]",et).forEach(function(b){b.addEventListener("click",function(){etMode=b.dataset.et;if(etMode!=="both"){sport=etMode;store("pb.sport",sport)}drawAll()})});
  window.addEventListener("resize",drawET);

  function drawBO(){
    $$("[data-bsport]",botd).forEach(function(b){b.setAttribute("aria-pressed",String(b.dataset.bsport===sport))});
    var rows=getBO(sport,selYmd()).slice(0,5);
    $("[data-botdlist]",botd).innerHTML=rows.length?rows.map(function(r){
      return '<div class="bdrow"><div class="bdlg">'+esc(r.lg)+'</div><div class="bdmain"><span class="bdt">'+esc(r.t)+'</span><span class="bdm"><b>'+esc(r.h)+'</b>'+(r.sc?'<i>'+esc(r.sc)+'</i>':'<i>vs</i>')+'<b>'+esc(r.a)+'</b></span><span class="bdpick '+(r.st==="won"?"won":r.st==="lost"?"lost":"")+'">'+esc(r.pick)+'</span></div></div>';
    }).join(""):'<div class="empty">No matches available.</div>';
  }
  $$("[data-bsport]",botd).forEach(function(b){b.addEventListener("click",function(){setSport(b.dataset.bsport)})});

  /* ---- VIP results: one column per day of the month, scrollable ---- */
  var vipY,vipM;
  (function(){var t=wat(0).split("-");vipY=+t[0];vipM=+t[1]-1})();
  function drawVIP(){
    var sel=selYmd(), today=wat(0), data=getVIP(vipY,vipM), won=0,lost=0;
    var wrap=$("[data-vipdays]",vipbox);
    wrap.innerHTML=data.map(function(x){
      if(x.st==="won")won++; if(x.st==="lost")lost++;
      var mark=x.st==="won"?'<span class="vmark won" aria-label="Won">&#10003;</span>':x.st==="lost"?'<span class="vmark lost" aria-label="Lost">&#10005;</span>':'<span class="vmark none" aria-label="No result yet">&ndash;</span>';
      var dow=new Date(vipY,vipM,x.d).toLocaleDateString("en-GB",{weekday:"short"});
      return '<div class="vcol'+(x.ymd===sel?" sel":"")+(x.ymd===today?" today":"")+'" data-ymd="'+x.ymd+'"><span class="vdow">'+dow+'</span><b class="vday">'+x.d+'</b><span class="vodds">'+(x.odds?esc(x.odds):'&ndash;')+'</span><span class="voddsl">odds</span>'+mark+'</div>';
    }).join("");
    $("[data-vipmonth]",vipbox).textContent=MON[vipM]+" "+vipY;
    $("[data-vipstat]",vipbox).innerHTML=(won+lost)?'<b>'+won+'</b> won &middot; <b>'+lost+'</b> lost':'No results yet';
    var target=$(".vcol.sel",wrap)||$(".vcol.today",wrap);
    if(target)wrap.scrollLeft=Math.max(0,target.offsetLeft-wrap.clientWidth/2+target.offsetWidth/2);
  }
  function vipTo(d){vipY=d.getFullYear();vipM=d.getMonth()}
  var vcal=$("[data-vipcal]",vipbox);
  if(vcal)vcal.addEventListener("change",function(){if(!vcal.value)return;var p=vcal.value.split("-");customDate=new Date(+p[0],+p[1]-1,+p[2]);var c=$("[data-hcal]",hero);if(c)c.value=vcal.value;vipTo(customDate);drawAll()});

  function drawSure(){
    var list,title,ymd=selYmd();
    if(customDate||day==="tomorrow"||day==="yesterday"||true){
      if(customDate){
        list=(D.byDate&&D.byDate[sport]&&D.byDate[sport][ymd])||[];
        title=customDate.toLocaleDateString(undefined,{weekday:"long",month:"short",day:"numeric"});
        if(!list.length&&D[sport]){var rel=wat(-1)===ymd?"yesterday":wat(0)===ymd?"today":wat(1)===ymd?"tomorrow":null;if(rel)list=D[sport][rel]}
      }else{list=D[sport][day]||[];title=DAYLABEL[day]}
    }
    var t=$("[data-slot=title]",sure);
    t.textContent="Sure "+(sport==="football"?"⚽ Football":"🏀 Basketball")+" Predictions for "+title;
    var all=$("[data-sureall]",sure.parentNode)||$("[data-sureall]");if(all)all.href=sport==="football"?"football-predictions.html":"basketball-predictions.html";
    var short=list.slice(0,10);
    $("[data-slot=table]",sure).innerHTML=short.length?(sport==="football"?footballTable(short):basketballTable(short)):'<p class="note center" style="padding:28px 10px">No matches available.</p>';
    /* Best Player Props are basketball-only: show them on the home page only while Basketball is selected */
    if(propsWrap)propsWrap.hidden=(sport!=="basketball");
  }
  function syncHero(){
    $$("[data-ssport]",sure).forEach(function(b){b.setAttribute("aria-pressed",String(b.dataset.ssport===sport))});
    $$("[data-hday]",hero).forEach(function(b){b.setAttribute("aria-pressed",String(!customDate&&b.dataset.hday===day))});
  }
  function drawAll(){syncHero();drawET();drawBO();drawVIP();drawSure();window.__pbSport=sport;document.dispatchEvent(new CustomEvent("pb:sport",{detail:sport}))}
  $$("[data-ssport]",sure).forEach(function(b){b.addEventListener("click",function(){setSport(b.dataset.ssport)})});
  $$("[data-hday]",hero).forEach(function(b){b.addEventListener("click",function(){
    day=b.dataset.hday;customDate=null;var c=$("[data-hcal]",hero);if(c)c.value="";if(vcal)vcal.value="";
    var t=selYmd().split("-");vipY=+t[0];vipM=+t[1]-1;drawAll()})});
  var cal=$("[data-hcal]",hero);
  if(cal)cal.addEventListener("change",function(){
    if(!cal.value){customDate=null}else{var p=cal.value.split("-");customDate=new Date(+p[0],+p[1]-1,+p[2]);vipTo(customDate);if(vcal)vcal.value=cal.value}
    drawAll()});
  drawAll();
});


/* ---------- MATCH ANALYSIS page (the reasoning behind an Expert Tip, written in the admin page) ---------- */
$$("[data-analysis]").forEach(function(el){
  if(!new URLSearchParams(location.search).get("s"))return;
  $$("[data-tipslist]").forEach(function(x){x.hidden=true});
  var q=new URLSearchParams(location.search), sp=q.get("s")==="basketball"?"basketball":"football", ymd=q.get("d")||wat(0);
  var v=getET(sp,ymd);
  if(!v){el.innerHTML='<div class="panel"><h2>Reasoning not available</h2><p>There is no published expert tip for this date yet.</p><a class="btn" href="index.html">Back to home</a></div>';return}
  var paras=String(v.reasoning||"").split(/\n+/).map(function(t){return t.trim()}).filter(Boolean);
  el.innerHTML=
   '<div class="panel anhead"><div class="crumbs"><a href="index.html">Home</a> &rsaquo; <a href="expert-tips.html">Expert Tips</a> &rsaquo; Reasoning</div>'+
   '<div class="vb-main anmatch"><div>'+teamCrest(v.h,v.hl,v.sp)+'<div class="vb-team">'+esc(v.h)+'</div></div><div class="vb-mid"><strong>'+esc(v.t)+'</strong>vs<br>'+esc(v.lg)+'<br>'+esc(ymd)+'</div><div>'+teamCrest(v.a,v.al,v.sp)+'<div class="vb-team">'+esc(v.a)+'</div></div></div>'+
   '<div class="etlock anlock" role="img" aria-label="Expert tip, locked"><span class="lockico" aria-hidden="true">&#128274;</span><span class="locktxt">Expert tip</span></div></div>'+
   '<div class="panel"><h2>Expert reasoning</h2>'+(paras.length?paras.map(function(t){return '<p>'+esc(t)+'</p>'}).join(""):'<p>The reasoning for this tip has not been written yet.</p>')+'<p class="note">Expert analysis by '+esc(v.by)+'.</p></div>'+
   '<p class="note center" style="margin-top:14px">'+(sp==="football"?"Football":"Basketball")+' predictions are based on statistical analysis and are not guaranteed. Please bet responsibly.</p>';
});

/* ---------- best player props of the day (basketball) with prop-type dropdown ---------- */
$$("[data-props]").forEach(function(el){
  var sec=el.closest(".props-section"), sel=sec&&$("[data-propsel]",sec);
  var markets=D.propMarkets||[];
  function mk(k){for(var i=0;i<markets.length;i++)if(markets[i].k===k)return markets[i];return {k:k,name:k,kind:"player"}}
  function card(p){
    var m=mk(p.k), team=m.kind==="team";
    return '<div class="propcard'+(p.st==="won"?" won":p.st==="lost"?" lost":"")+'">'+
      '<div class="propav">🏀</div>'+
      '<div class="propinfo"><b>'+esc(team?p.team:p.player)+'</b><span>'+esc(team?"":p.team+" ")+esc(p.opp||"")+'</span></div>'+
      '<div class="propmkt">'+esc(m.name)+'</div>'+
      '<div class="proppick"><span class="pick">'+esc(team?(m.short||"Pick"):p.pick+" "+p.line)+'</span><span class="o">@ '+esc(p.odds)+'</span></div>'+(p.st==="won"?'<span class="bigmark won" aria-label="Won">&#10003;</span>':p.st==="lost"?'<span class="bigmark lost" aria-label="Did not land"></span>':'')+
    '</div>';
  }
  function draw(k){
    var list=D.playerProps.filter(function(p){return p.k===k});
    el.innerHTML=list.length?list.map(card).join(""):'<div class="empty">No '+esc(mk(k).name)+' props posted yet.</div>';
  }
  function cnt(k){return D.playerProps.filter(function(p){return p.k===k}).length}
  var cur=store("pb.propmkt"); if(!markets.some(function(m){return m.k===cur}))cur=markets[0]&&markets[0].k;
  if(!cnt(cur)){for(var i=0;i<markets.length;i++)if(cnt(markets[i].k)){cur=markets[i].k;break}}   /* open on a prop type that actually has props */
  if(sel){
    sel.innerHTML=markets.map(function(m){return '<option value="'+esc(m.k)+'"'+(m.k===cur?" selected":"")+'>'+esc(m.name)+'</option>'}).join("");
    sel.addEventListener("change",function(){cur=sel.value;store("pb.propmkt",cur);draw(cur)});
  }
  draw(cur);
});

/* ---------- VIP results strip ---------- */
$$("[data-vip]").forEach(function(el){
  el.innerHTML=D.vip.map(function(r){return '<div><b>'+esc(r.d)+'</b>'+esc(r.m)+'<span class="o">'+esc(r.odds)+'</span>odds<span class="dot'+(r.won?"":" l")+'" aria-label="'+(r.won?"Won":"Lost")+'">'+(r.won?"✓":"✕")+'</span></div>'}).join("");
});

/* ---------- stats ---------- */
$$("[data-stats]").forEach(function(el){
  el.innerHTML=D.stats.map(function(s){return '<div><b>'+esc(s.v)+'</b><span style="color:'+esc(s.c)+'">'+esc(s.l)+'</span></div>'}).join("");
});

/* ---------- tips meaning toggle ---------- */
$$("[data-meaning]").forEach(function(el){
  /* follows the sport the visitor picked on the page (football / basketball); the pills inside the box still work by hand */
  var sport=window.__pbSport||"football";
  function draw(){
    $$(".toggle button",el).forEach(function(b){b.setAttribute("aria-pressed",String(b.dataset.sport===sport))});
    $$("[data-pane]",el).forEach(function(p){p.hidden=p.dataset.pane!==sport});
  }
  $$(".toggle button",el).forEach(function(b){b.addEventListener("click",function(){sport=b.dataset.sport;draw()})});
  document.addEventListener("pb:sport",function(e){sport=e.detail==="basketball"?"basketball":"football";draw()});
  draw();
});

/* ---------- blog cards ---------- */
function art(c){return '<div class="art" style="background:radial-gradient(circle at 80% 20%,'+c[0]+'88,transparent 55%),radial-gradient(circle at 10% 90%,'+c[1]+'aa,transparent 60%),repeating-linear-gradient(135deg,#ffffff07 0 2px,transparent 2px 14px),#0f0b2a"></div>'}
function catLabel(cat){return esc(cat)+(cat==="Football"?" ⚽":cat==="Basketball"?" 🏀":"")}
$$("[data-news]").forEach(function(el){
  var n=+el.dataset.news||3;
  el.innerHTML=D.posts.slice(0,n).map(function(p){return '<a class="card" href="blog.html#'+esc(p.id)+'">'+art(p.art)+'<div class="txt"><span class="cat">'+catLabel(p.cat)+'</span><h3>'+esc(p.title)+'</h3><p>'+esc(p.excerpt)+'</p><span class="rm">Read more →</span></div></a>'}).join("");
});
$$("[data-posts]").forEach(function(el){
  el.innerHTML=D.posts.map(function(p){return '<article class="post panel" id="'+esc(p.id)+'"><span class="cat">'+catLabel(p.cat)+'</span><h2>'+esc(p.title)+'</h2><div class="post-meta">'+esc(p.date)+' · PicksBible Desk</div><p style="margin-top:12px"><strong>'+esc(p.excerpt)+'</strong></p>'+p.body.map(function(b){return '<p>'+esc(b)+'</p>'}).join("")+'</article>'}).join("");
});

/* ---------- top picks of the day: three cards, all styled exactly like the
   first (team crest, vs, odds row, pick, tipster) ----------
   each has a "View Reasoning" button that opens the tipster's write-up in
   place on the page, instead of sending you anywhere else. ---------- */
$$("[data-toppicks]").forEach(function(el){
  function initials(n){return esc(n.split(" ").map(function(w){return w[0]}).join("").slice(0,3))}
  function crestDiv(name,color){return '<div class="crest" style="background:'+esc(color)+'">'+initials(name)+'</div>'}
  /* three copies of the exact same card markup — only the words differ */
  el.innerHTML=D.topPicks.map(function(x,i){
    return '<div class="vb standalone">'+
      '<div class="vb-main"><div>'+crestDiv(x.left.name,x.left.color)+'<div class="vb-team">'+esc(x.left.name)+'</div></div>'+
        '<div class="vb-mid"><strong>'+esc(x.t)+'</strong>vs<br>'+esc(x.sub)+'</div>'+
        '<div>'+crestDiv(x.right.name,x.right.color)+'<div class="vb-team">'+esc(x.right.name)+'</div></div></div>'+
      '<div class="odds">'+x.odds.map(function(o){return '<span>'+esc(o[0])+' &nbsp;'+esc(o[1])+'</span>'}).join("")+'<span class="pick">'+esc(x.pick)+' @ '+esc(x.pickOdds)+'</span></div>'+
      '<div class="vb-by"><span>EXPERT TIPS BY: <b>'+esc(x.tipster)+'</b></span><span>'+esc(x.tag)+'</span></div>'+
      '<div class="vb-foot"><button type="button" class="btn ghost" data-reasontoggle="'+i+'" aria-expanded="false">View Reasoning</button>'+
      '<p class="pc-reason" data-reason="'+i+'" hidden style="margin-top:10px;text-align:left">'+esc(x.reason)+'</p></div>'+
    '</div>';
  }).join("");
  $$("[data-reasontoggle]",el).forEach(function(b){
    b.addEventListener("click",function(){
      var p=$('[data-reason="'+b.dataset.reasontoggle+'"]',el);
      var open=b.getAttribute("aria-expanded")==="true";
      b.setAttribute("aria-expanded",String(!open));
      b.textContent=open?"View Reasoning":"Hide Reasoning";
      p.hidden=open;
    });
  });
});

/* ---------- results page ---------- */
$$("[data-results]").forEach(function(el){
  var sport=el.dataset.results;
  var list=D[sport].yesterday;
  var won=list.filter(function(m){return m.st==="won"}).length;
  $("[data-slot=sum]",el).textContent=won+" of "+list.length+" "+sport+" tips won yesterday";
  $("[data-slot=table]",el).innerHTML=sport==="football"?footballTable(list):basketballTable(list);
});

/* ---------- plans ---------- */
var TIER_ICON={silver:"🥈",gold:"🥇",platinum:"💎"};
$$("[data-plans]").forEach(function(el){
  el.innerHTML=D.plans.map(function(p,i){return '<div class="panel plan tier-'+esc(p.tier||"silver")+(p.best?" best":"")+'">'+(p.best?'<span class="flag-best">Most popular</span>':'')+
    '<div class="tier-badge">'+(TIER_ICON[p.tier]||"🥈")+'</div><h3>'+esc(p.name).toUpperCase()+'</h3>'+
    '<div class="price">FEE - <b>'+esc(p.price)+'</b></div><div class="per">'+esc(p.per)+'</div><ul>'+p.perks.map(function(k){return '<li>✅ '+esc(k)+'</li>'}).join("")+'</ul>'+
    (p.payLink?'<a class="btn" href="'+esc(p.payLink)+'" rel="noopener">Join Now</a>':'<button class="btn" type="button" data-pay="'+i+'">Join Now</button>')+'<p class="note" data-paynote="'+i+'" hidden>Online checkout opens once the payment link is added. For now, message us on WhatsApp '+esc(S.whatsapp)+' to subscribe.</p></div>'}).join("");
  $$("[data-pay]",el).forEach(function(b){b.addEventListener("click",function(){$('[data-paynote="'+b.dataset.pay+'"]',el).hidden=false})});
});

/* ---------- premium: choose your country -> continue reveals plans ---------- */
(function(){
  var sel=$("#premCountry"), btn=$("#premContinue"), grid=$("[data-plans]");
  if(!sel||!btn||!grid)return;
  var names={};
  Object.keys(D.leagues).forEach(function(c){var l=D.leagues[c];if(l.country)names[l.country]=1});
  Object.keys(D.countryFlags||{}).forEach(function(n){names[n]=1});
  var list=Object.keys(names).sort(function(a,b){return a.localeCompare(b)});
  sel.insertAdjacentHTML("beforeend",list.map(function(n){return '<option value="'+esc(n)+'">'+esc(n)+'</option>'}).join(""));
  var stored=store("premCountry");
  if(stored&&names[stored])sel.value=stored;
  btn.addEventListener("click",function(){
    if(!sel.value){sel.focus();return}
    store("premCountry",sel.value);
    grid.hidden=false;
    grid.scrollIntoView({behavior:"smooth",block:"start"});
  });
})();

/* ---------- contact details ---------- */
$$("[data-copy]").forEach(function(b){b.addEventListener("click",function(){
  var code=b.parentNode.querySelector("code"),t=code.textContent;
  function done(){b.textContent="Copied"}
  if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(t).then(done,function(){sel(code)})}else sel(code);
  function sel(n){var r=document.createRange();r.selectNodeContents(n);var s=getSelection();s.removeAllRanges();s.addRange(r);b.textContent="Selected, press copy"}
})});

/* ---------- forms (contact) ---------- */
var PREVIEW=!!window.PB_PREVIEW;
$$("form[data-local]").forEach(function(f){
  f.addEventListener("submit",function(e){
    var bad=null;
    $$("[required]",f).forEach(function(i){var er=i.parentNode.querySelector(".err");if(er)er.remove();if(!i.value.trim()){bad=bad||i;var m=document.createElement("span");m.className="err";m.textContent="Fill in this field.";i.parentNode.appendChild(m)}else if(i.type==="email"&&!/^\S+@\S+\.\S+$/.test(i.value)){bad=bad||i;var m2=document.createElement("span");m2.className="err";m2.textContent="Enter a valid email address.";i.parentNode.appendChild(m2)}});
    if(bad){e.preventDefault();bad.focus();return}
    if(PREVIEW){e.preventDefault();var ok=$(".ok",f.parentNode);ok.hidden=false;ok.textContent="Message ready. On the live site this form delivers to your inbox through Netlify Forms.";f.reset()}
  });
  $$("input,textarea",f).forEach(function(i){i.addEventListener("input",function(){var er=i.parentNode.querySelector(".err");if(er)er.remove()})});
});
}
loadLive(main);
})();

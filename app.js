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
  fixtures.forEach(function(f){
    var day=days[String(f.kickoff||"").slice(0,10)]; if(!day||f.sport!=="football")return;
    var v=f.fb||{}, list=P.football[day];
    list.push({lg:lgKey(P,"football",f.competition,f.country),t:String(f.kickoff).slice(11,16),h:f.home,a:f.away,
      o:[v.o1||"",v.oX||"",v.o2||""],pk:v.tip||"",tip:v.tip||"-",gg:v.btts||"",ggo:v.bttsOdds||"",ou:v.ou||"",ouo:v.ouOdds||"",cs:v.cs||"",
      st:"pending",score:"",featured:list.length<6});
  });
  props.sort(function(a,b){return String(a.kickoff).localeCompare(String(b.kickoff))});
  props.forEach(function(p){
    var k=String(p.kickoff||"").slice(0,10); if(k!==wat(0)&&k!==wat(1))return;
    var team=p.team||"", other=team===p.home?p.away:p.home;
    P.playerProps.push({k:p.market,player:p.player||"",team:team,opp:team?("vs "+other):(p.home+" v "+p.away),line:p.line||"",pick:p.side||"",odds:p.odds||""});
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
function sortByLeague(list){return list.slice().sort(function(a,b){return a.lg===b.lg?a.t.localeCompare(b.t):list.indexOf(a)-list.indexOf(b)}).sort(function(a,b){var ia=firstIdx(list,a.lg),ib=firstIdx(list,b.lg);return ia-ib})}
function firstIdx(list,lg){for(var i=0;i<list.length;i++)if(list[i].lg===lg)return i;return 0}
function scoreLine(m){return m.score?'<span class="sc">'+esc(m.score)+'</span>':'<span class="sc" style="color:var(--muted)">-:-</span>'}

/* ---------- full prediction tables ---------- */
function oddCell(m,i,k){var v=m.o&&m.o[i]?m.o[i]:"-";return '<td><span class="odd'+(m.pk===k?" pk":"")+'">'+esc(v)+'</span></td>'}
function extraPick(label,odds){return '<td>'+(label?'<span class="xp"><b>'+esc(label)+'</b><i>'+esc(odds||"")+'</i></span>':'-')+'</td>'}
function pkBadge(m){return '<span class="tip '+(m.st==="won"?"won":m.st==="lost"?"lost":"")+'" title="'+esc(m.st)+'">'+esc(m.pk||m.tip||"-")+'</span>'}
function footballTable(list){
  if(!list.length)return '<div class="empty">No football ⚽ predictions for this day yet.</div>';
  var played=list.some(function(m){return m.score});
  return '<div class="tscroll bwwrap"><table class="pt bw"><thead><tr><th>Time</th><th class="l">Competition</th><th class="l">Home</th><th class="l">Away</th><th>1</th><th>X</th><th>2</th><th>Tips</th><th>GG/NG</th><th>Over/Under 2.5</th><th>CS Tips</th>'+(played?'<th>Result</th>':'')+'</tr></thead><tbody>'+
    sortByLeague(list).map(function(m){
      return '<tr><td class="tm">'+esc(m.t)+'</td><td class="l lgn">'+esc(lgName(m.lg))+'</td><td class="l team"><b>'+esc(m.h)+'</b></td><td class="l team"><b>'+esc(m.a)+'</b></td>'+
        oddCell(m,0,"1")+oddCell(m,1,"X")+oddCell(m,2,"2")+'<td>'+pkBadge(m)+'</td>'+extraPick(m.gg,m.ggo)+extraPick(m.ou?(m.ou==="Over"?"Over 2.5":"Under 2.5"):"",m.ouo)+'<td class="cs">'+esc(m.cs)+'</td>'+(played?'<td class="res">'+(m.score?esc(m.score):'-:-')+'</td>':'')+'</tr>';
    }).join("")+
    '</tbody></table></div>';
}
function basketballTable(list){
  if(!list.length)return '<div class="empty">No basketball 🏀 predictions for this day yet.</div>';
  return '<div class="tscroll"><table class="pt"><thead><tr><th>Time</th><th>Match</th><th>1</th><th>2</th><th>Tips</th><th>Spread</th><th>Total</th><th>Pred. score</th></tr></thead><tbody>'+
    groupRows(sortByLeague(list),8,function(m){return '<tr><td>'+esc(m.t)+'</td><td class="m"><b>'+esc(m.h)+'</b>'+scoreLine(m)+'<b>'+esc(m.a)+'</b></td><td>'+ring(m.p[0])+'</td><td>'+ring(m.p[1])+'</td><td>'+tipBadge(m)+'</td><td>'+esc(m.spread)+'</td><td>'+esc(m.total)+'</td><td>'+esc(m.ps)+'</td></tr>'})+
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
  var sport=fixed||store("pb.sport")||"basketball";
  var day=el.dataset.day||"today";
  var hash=(location.hash||"").slice(1);
  var league=D.leagues[hash]?hash:"";
  if(league&&!fixed)sport=D.leagues[league].sport;
  var title=$("[data-slot=title]",el);
  var customDate=null; /* a Date the calendar picked that isn't yesterday/today/tomorrow */
  var propsWrap=el.nextElementSibling;
  if(!propsWrap||!propsWrap.hasAttribute("data-props-wrap"))propsWrap=null;

  function draw(){
    $$(".toggle button",el).forEach(function(b){b.setAttribute("aria-pressed",String(b.dataset.sport===sport))});
    $$(".tabs button",el).forEach(function(b){b.setAttribute("aria-pressed",String(!customDate&&b.dataset.day===day))});
    var lgBtn=$("[data-lgopen]",el);
    if(lgBtn)lgBtn.innerHTML="🌍 "+(league?esc(D.leagues[league].name):"All Leagues")+" ▾";
    if(propsWrap)propsWrap.hidden=(sport!=="basketball");
    if(customDate){
      if(title)title.textContent=(sport==="football"?"Football ⚽":"Basketball 🏀")+" prediction & tips for "+customDate.toLocaleDateString(undefined,{weekday:"long",month:"short",day:"numeric"});
      $("[data-slot=table]",el).innerHTML='<p class="note center" style="padding:28px 10px">No published predictions for this date yet. Try Yesterday, Today or Tomorrow above, or pick another date.</p>';
      return;
    }
    var list=D[sport][day].filter(function(m){return !league||m.lg===league});
    if(title)title.textContent=(sport==="football"?"Football ⚽":"Basketball 🏀")+" prediction & tips for "+DAYLABEL[day].toLowerCase();
    $("[data-slot=table]",el).innerHTML=sport==="football"?footballTable(list):basketballTable(list);
  }

  $$(".toggle button",el).forEach(function(b){b.addEventListener("click",function(){sport=b.dataset.sport;league="";lgBuilt=false;store("pb.sport",sport);draw()})});
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

  /* tiny calendar button in the bar: pick any date, not just yesterday/today/tomorrow */
  var calBtn=$("[data-calopen]",el), calPanel=$("[data-calpanel]",el);
  if(calBtn&&calPanel){
    var calGrid=$("[data-calgrid]",el), calMonth=$("[data-calmonth]",el);
    var today0=new Date();today0.setHours(0,0,0,0);
    var offsets={yesterday:-1,today:0,tomorrow:1};
    var viewMonth=new Date(today0.getFullYear(),today0.getMonth(),1);
    function sameDay(a,b){return a.getFullYear()===b.getFullYear()&&a.getMonth()===b.getMonth()&&a.getDate()===b.getDate()}
    function calOpen(){calPanel.hidden=false;renderCal()}
    function calClose(){calPanel.hidden=true}
    calBtn.addEventListener("click",function(e){e.stopPropagation();calPanel.hidden?calOpen():calClose()});
    document.addEventListener("click",function(e){if(!calPanel.hidden&&!calPanel.contains(e.target)&&e.target!==calBtn)calClose()});
    document.addEventListener("keydown",function(e){if(e.key==="Escape"&&!calPanel.hidden)calClose()});
    $("[data-calprev]",el).addEventListener("click",function(){viewMonth.setMonth(viewMonth.getMonth()-1);renderCal()});
    $("[data-calnext]",el).addEventListener("click",function(){viewMonth.setMonth(viewMonth.getMonth()+1);renderCal()});
    function renderCal(){
      calMonth.textContent=viewMonth.toLocaleDateString(undefined,{month:"long",year:"numeric"});
      var startDow=viewMonth.getDay(), daysInMonth=new Date(viewMonth.getFullYear(),viewMonth.getMonth()+1,0).getDate();
      var dow=["S","M","T","W","T","F","S"], html=dow.map(function(x){return '<span class="dow">'+x+'</span>'}).join("");
      for(var i=0;i<startDow;i++)html+="<span></span>";
      for(var d=1;d<=daysInMonth;d++){
        var dt=new Date(viewMonth.getFullYear(),viewMonth.getMonth(),d);
        var diff=Math.round((dt-today0)/86400000);
        var active=customDate?sameDay(dt,customDate):(diff===offsets[day]);
        html+='<button type="button" data-date="'+dt.getTime()+'" aria-pressed="'+active+'">'+d+'</button>';
      }
      calGrid.innerHTML=html;
      $$("button[data-date]",calGrid).forEach(function(b){b.addEventListener("click",function(){
        var dt=new Date(+b.dataset.date), diff=Math.round((dt-today0)/86400000);
        calClose();
        if(diff===-1){day="yesterday";customDate=null}
        else if(diff===0){day="today";customDate=null}
        else if(diff===1){day="tomorrow";customDate=null}
        else{customDate=dt}
        draw();
      })});
    }
  }

  draw();
});

/* ---------- value bet ---------- */
$$("[data-valuebet]").forEach(function(el){
  var v=D.valueBet;
  function crest(n,c){return '<div class="crest" style="background:'+esc(c)+'">'+esc(n.split(" ").map(function(w){return w[0]}).join("").slice(0,3))+'</div>'}
  el.innerHTML='<div class="vb-main"><div>'+crest(v.h,v.hc)+'<div class="vb-team">'+esc(v.h)+'</div></div>'+
    '<div class="vb-mid"><strong>'+esc(v.t)+'</strong>vs<br>'+esc(lgName(v.lg))+'</div>'+
    '<div>'+crest(v.a,v.ac)+'<div class="vb-team">'+esc(v.a)+'</div></div></div>'+
    '<div class="odds"><span>1 &nbsp;'+esc(v.odds.h)+'</span><span>X &nbsp;'+esc(v.odds.x)+'</span><span>2 &nbsp;'+esc(v.odds.a)+'</span><span class="pick">'+esc(v.pick)+' @ '+esc(v.pickOdds)+'</span></div>'+
    '<div class="vb-by"><span>EXPERT TIPS BY: <b>'+esc(v.tipster)+'</b></span><span>'+esc(v.sport==="football"?"Football ⚽":"Basketball 🏀")+' value pick</span></div>'+
    '<div class="vb-foot"><a class="btn ghost" href="expert-tips.html">View tips</a></div>';
});

/* ---------- best player props of the day (basketball) with prop-type dropdown ---------- */
$$("[data-props]").forEach(function(el){
  var sec=el.closest(".props-section"), sel=sec&&$("[data-propsel]",sec);
  var markets=D.propMarkets||[];
  function mk(k){for(var i=0;i<markets.length;i++)if(markets[i].k===k)return markets[i];return {k:k,name:k,kind:"player"}}
  function card(p){
    var m=mk(p.k), team=m.kind==="team";
    return '<div class="propcard">'+
      '<div class="propav">🏀</div>'+
      '<div class="propinfo"><b>'+esc(team?p.team:p.player)+'</b><span>'+esc(team?"":p.team+" ")+esc(p.opp||"")+'</span></div>'+
      '<div class="propmkt">'+esc(m.name)+'</div>'+
      '<div class="proppick"><span class="pick">'+esc(team?(m.short||"Pick"):p.pick+" "+p.line)+'</span><span class="o">@ '+esc(p.odds)+'</span></div>'+
    '</div>';
  }
  function draw(k){
    var list=D.playerProps.filter(function(p){return p.k===k});
    el.innerHTML=list.length?list.map(card).join(""):'<div class="empty">No '+esc(mk(k).name)+' props posted yet.</div>';
  }
  var cur=store("pb.propmkt"); if(!markets.some(function(m){return m.k===cur}))cur=markets[0]&&markets[0].k;
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
  var sport=store("pb.meaning")||"basketball";
  function draw(){
    $$(".toggle button",el).forEach(function(b){b.setAttribute("aria-pressed",String(b.dataset.sport===sport))});
    $$("[data-pane]",el).forEach(function(p){p.hidden=p.dataset.pane!==sport});
  }
  $$(".toggle button",el).forEach(function(b){b.addEventListener("click",function(){sport=b.dataset.sport;store("pb.meaning",sport);draw()})});
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

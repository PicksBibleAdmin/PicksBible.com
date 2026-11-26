/* PicksBible ads. One config, no dependencies.
   To sell a slot: set `img` (and `phoneImg` for the catfish) and `href`. An empty creative shows a house "Advertise here" ad.
   Turn any ad off with enabled:false. */
(function(){
  var CFG={
    catfish:{enabled:true,img:"",phoneImg:"",href:"contact.html",alt:"Advertisement"},   // 728x90 and 320x50
    popup:{enabled:true,img:"",href:"contact.html",alt:"Advertisement",delayMs:5000,minVisit:2}, // 600x560
    inline1:{enabled:true,img:"",href:"contact.html",alt:"Advertisement"},   // 300x250, phone, between Banker bet and Bets of the day
    inline2:{enabled:true,img:"",href:"contact.html",alt:"Advertisement"},   // 300x250, phone, under the football table
    railC:{enabled:true,img:"",href:"contact.html",alt:"Advertisement"},     // 300x250, desktop right rail (1100px+)
    railD:{enabled:true,img:"",href:"contact.html",alt:"Advertisement"}      // 300x600, desktop right rail, sticky
  };
  var d=document,ls,ss;
  try{ls=window.localStorage;ss=window.sessionStorage}catch(e){ls=ss=null}
  function get(s,k){try{return s&&s.getItem(k)}catch(e){return null}}
  function set(s,k,v){try{s&&s.setItem(k,v)}catch(e){}}
  function house(label,size){return '<div class="pbad-house"><b>'+label+'</b><span>'+size+'</span></div>'}
  function creative(c,houseLabel,size,img){
    var src=img||c.img;
    var inner=src?'<img src="'+src+'" alt="'+(c.alt||"Advertisement")+'" loading="lazy">':house(houseLabel,size);
    return '<a class="pbad-link" style="height:100%" href="'+(c.href||"contact.html")+'" target="_blank" rel="sponsored noopener">'+inner+'</a>';
  }

  /* 1. Catfish: fixed to the bottom of the screen on every device */
  function catfish(){
    var c=CFG.catfish;if(!c.enabled)return;
    var el=d.createElement("div");el.className="pbad-catfish";el.setAttribute("role","complementary");el.setAttribute("aria-label","Advertisement");
    el.innerHTML='<div class="pbad-frame">'+creative(c,"Advertise Here!","728 × 90")+'</div><div class="pbad-frame phone">'+creative(c,"Advertise Here!","320 × 50",c.phoneImg)+'</div>';
    d.body.appendChild(el);d.body.classList.add("pbad-has-catfish");
    function fit(){d.documentElement.style.setProperty("--pb-catfish-h",el.offsetHeight+"px")}
    fit();window.addEventListener("resize",fit);window.addEventListener("load",fit);
    if(window.ResizeObserver)new ResizeObserver(fit).observe(el);
  }

  /* 2. Popup: only from a visitor's 2nd visit onward, 5s after load, once per session */
  function popup(){
    var c=CFG.popup;if(!c.enabled)return;
    var visits=parseInt(get(ls,"pb_ad_visits")||"0",10);
    if(!get(ss,"pb_ad_counted")){visits++;set(ls,"pb_ad_visits",String(visits));set(ss,"pb_ad_counted","1")}
    if(visits<c.minVisit||get(ss,"pb_ad_popup_shown"))return;
    setTimeout(function(){
      if(get(ss,"pb_ad_popup_shown"))return;
      var p=d.createElement("div");p.className="pbad-pop";p.setAttribute("role","dialog");p.setAttribute("aria-modal","true");p.setAttribute("aria-label","Advertisement");
      p.innerHTML='<div class="pbad-card"><button type="button" class="pbad-x" aria-label="Close advertisement">&times;</button>'+creative(c,"Advertise Here!","600 × 560")+'</div>';
      function close(){p.remove();d.removeEventListener("keydown",key)}
      function key(e){if(e.key==="Escape")close()}
      p.querySelector(".pbad-x").addEventListener("click",close);
      p.addEventListener("click",function(e){if(e.target===p)close()});
      d.addEventListener("keydown",key);
      d.body.appendChild(p);set(ss,"pb_ad_popup_shown","1");
    },c.delayMs);
  }

  /* 3. Phone inline 300x250 slots */
  function slot(cfg,name,after,before){
    if(!cfg.enabled)return;
    var s=d.createElement("section");s.className="pbad-inline";s.setAttribute("aria-label","Advertisement");s.dataset.pbad=name;
    s.innerHTML='<div class="pbad-frame">'+creative(cfg,"Advertise Here!","300 × 250")+'</div>';
    if(before&&before.parentNode)before.parentNode.insertBefore(s,before);
    else if(after&&after.parentNode)after.parentNode.insertBefore(s,after.nextSibling);
  }
  function inline(){
    var banker=d.querySelector("[data-experttip]"),botd=d.querySelector("[data-botd]"),sure=d.querySelector("[data-sure]");
    if(botd){
      var old=d.querySelector('main>.wrap>section[aria-label="Advertising"]');
      if(old)old.classList.add("pbad-hide-phone");
      slot(CFG.inline1,"inline1",null,botd);
    }
    if(sure)slot(CFG.inline2,"inline2",sure,null);
  }


  /* 4. Desktop layout: right ad rail (1100px+), left panel (1500px+), banker bet strip beside the date picker (1500px+) */
  function desktop(){
    var wrap=d.querySelector("main>.wrap");if(!wrap)return;
    var vip=d.querySelector("[data-vipbox]"),vipSec=vip&&vip.closest(".sec"),trk=d.querySelector("[data-viptrack]");
    wrap.classList.add("pb-grid");
    if(vipSec){var left=d.createElement("aside");left.className="pb-left";left.setAttribute("aria-label","VIP results");wrap.insertBefore(left,wrap.firstChild);left.appendChild(vipSec);if(trk)left.appendChild(trk)}
    var rail=d.createElement("aside");rail.className="pb-rail";rail.setAttribute("aria-label","Advertisements");
    rail.innerHTML='<div class="pbad-inline"><div class="pbad-frame">'+creative(CFG.railC,"Advertise Here!","300 × 250")+'</div></div><div class="pbad-sticky"><div class="pbad-frame">'+creative(CFG.railD,"Advertise Here!","300 × 600")+'</div></div>';
    if(!CFG.railC.enabled)rail.firstChild.style.display="none";
    if(!CFG.railD.enabled)rail.lastChild.style.display="none";
    wrap.appendChild(rail);
    /* banker bet: strip beside the date picker on wide screens, original place otherwise */
    var banker=d.querySelector("[data-experttip]"),dates=d.querySelector(".hero .hdates");
    if(banker&&dates&&window.matchMedia){
      var home=d.createComment("banker-home");banker.parentNode.insertBefore(home,banker);
      var row=d.createElement("div");row.className="pb-herorow";
      var mq=window.matchMedia("(min-width:1500px)");
      function place(){
        if(mq.matches){if(!row.parentNode){dates.parentNode.insertBefore(row,dates);row.appendChild(dates)}row.appendChild(banker)}
        else{if(row.parentNode){row.parentNode.insertBefore(dates,row);row.remove()}home.parentNode.insertBefore(banker,home.nextSibling)}
      }
      place();(mq.addEventListener?mq.addEventListener("change",place):mq.addListener(place));
    }
  }

  function init(){desktop();catfish();inline();popup()}
  if(d.readyState==="loading")d.addEventListener("DOMContentLoaded",init);else init();
})();

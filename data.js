/* =====================================================================
   PICKS BIBLE — DAILY DATA FILE
   This is the ONLY file you edit to update the website every day.
   Everything below is SAMPLE data. Replace it with your real picks.

   Status codes for every match:  "won"  "lost"  "pending"
   Times are shown exactly as you type them (we use WAT / Nigeria time).
   ===================================================================== */
window.PB = {

  /* ---------- SITE SETTINGS ---------- */
  site: {
    name: "PicksBible",
    domain: "picksbible.com",
    email: "picksbiblesupport@gmail.com",
    whatsapp: "+234 919 823 3308",
    /* paste your Formspree form link here (https://formspree.io/f/xxxxxxxx) so Contact Us messages arrive in your inbox; while empty, the form opens the visitor's email app instead */
    formEndpoint: "",
    telegram: "https://t.me/picksbibleforum",
    socials: {
      telegram: "https://t.me/picksbibleforum",
      youtube: "https://youtube.com/",
      instagram: "https://instagram.com/",
      x: "https://x.com/",
      facebook: "https://facebook.com/"
    },
    timezone: "WAT",
    today: "30 Sep 2026",
    /* Set to false once you have replaced ALL sample data below */
    previewNotice: false
  },

  /* ---------- LEAGUES (used for filters + SEO links + country selector) ----------
     country = the country group shown in the "Select A League" flow          */
  leagues: {
    /* England */
    epl:    { name: "Premier League",      sport: "football", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", country: "England" },
    champ:  { name: "Championship",        sport: "football", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", country: "England" },
    leg1:   { name: "League One",          sport: "football", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", country: "England" },
    leg2:   { name: "League Two",          sport: "football", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", country: "England" },
    /* Spain */
    laliga: { name: "La Liga",             sport: "football", flag: "🇪🇸", country: "Spain" },
    laliga2:{ name: "La Liga 2",           sport: "football", flag: "🇪🇸", country: "Spain" },
    acb:    { name: "Liga ACB (Basketball)", sport: "basketball", flag: "🇪🇸", country: "Spain" },
    /* Germany */
    bund:   { name: "Bundesliga",          sport: "football", flag: "🇩🇪", country: "Germany" },
    bund2:  { name: "2. Bundesliga",       sport: "football", flag: "🇩🇪", country: "Germany" },
    /* Italy */
    seriea: { name: "Serie A",             sport: "football", flag: "🇮🇹", country: "Italy" },
    serieb: { name: "Serie B",             sport: "football", flag: "🇮🇹", country: "Italy" },
    /* France */
    ligue1: { name: "Ligue 1",             sport: "football", flag: "🇫🇷", country: "France" },
    ligue2: { name: "Ligue 2",             sport: "football", flag: "🇫🇷", country: "France" },
    /* Argentina */
    argliga:{ name: "Liga Profesional",    sport: "football", flag: "🇦🇷", country: "Argentina" },
    argnac: { name: "Primera Nacional",    sport: "football", flag: "🇦🇷", country: "Argentina" },
    argcopa:{ name: "Copa Argentina",      sport: "football", flag: "🇦🇷", country: "Argentina" },
    /* Brazil */
    brasa:  { name: "Brasileirão Série A", sport: "football", flag: "🇧🇷", country: "Brazil" },
    brasb:  { name: "Brasileirão Série B", sport: "football", flag: "🇧🇷", country: "Brazil" },
    /* Portugal */
    primeira:{ name: "Primeira Liga",      sport: "football", flag: "🇵🇹", country: "Portugal" },
    /* Netherlands */
    eredivisie:{ name: "Eredivisie",       sport: "football", flag: "🇳🇱", country: "Netherlands" },
    /* Belgium */
    jupiler:{ name: "Jupiler Pro League",  sport: "football", flag: "🇧🇪", country: "Belgium" },
    /* Scotland */
    spfl:   { name: "Scottish Premiership",sport: "football", flag: "🏴󠁧󠁢󠁳󠁣󠁴󠁿", country: "Scotland" },
    /* Turkey */
    superlig:{ name: "Süper Lig",          sport: "football", flag: "🇹🇷", country: "Turkey" },
    /* Saudi Arabia */
    rosn:   { name: "Saudi Pro League",    sport: "football", flag: "🇸🇦", country: "Saudi Arabia" },
    /* Mexico */
    ligamx: { name: "Liga MX",             sport: "football", flag: "🇲🇽", country: "Mexico" },
    /* Nigeria */
    npfl:   { name: "Nigeria Professional Football League", sport: "football", flag: "🇳🇬", country: "Nigeria" },
    nnl:    { name: "Nigeria National League", sport: "football", flag: "🇳🇬", country: "Nigeria" },
    /* USA */
    mls:    { name: "MLS",                 sport: "football",   flag: "🇺🇸", country: "USA" },
    nba:    { name: "NBA",                 sport: "basketball", flag: "🇺🇸", country: "USA" },
    wnba:   { name: "WNBA",                sport: "basketball", flag: "🇺🇸", country: "USA" },
    ncaa:   { name: "NCAA Basketball",     sport: "basketball", flag: "🇺🇸", country: "USA" },
    /* Australia */
    nbl:    { name: "NBL (Basketball)",    sport: "basketball", flag: "🇦🇺", country: "Australia" },
    aleague:{ name: "A-League",            sport: "football",   flag: "🇦🇺", country: "Australia" },
    /* International / Europe */
    ucl:    { name: "UEFA Champions League", sport: "football",   flag: "🇪🇺", country: "International" },
    uel:    { name: "UEFA Europa League",  sport: "football",   flag: "🇪🇺", country: "International" },
    euro:   { name: "EuroLeague (Basketball)", sport: "basketball", flag: "🇪🇺", country: "International" }
  },

  /* ---------- EXTRA COUNTRIES (Select A League directory) ----------
     Full A-Z country list like Betwizad's picker. Countries already covered
     above (with real league names) are skipped here. Everything else gets
     two generic mock leagues (Premier Division + Cup) built from this ISO
     code at runtime, purely so the directory is complete like the real site. */
  countryFlags: {
    "Albania":"AL","Algeria":"DZ","Andorra":"AD","Angola":"AO","Antigua And Barbuda":"AG",
    "Armenia":"AM","Austria":"AT","Azerbaijan":"AZ","Bahrain":"BH","Bangladesh":"BD",
    "Belarus":"BY","Belize":"BZ","Benin":"BJ","Bhutan":"BT","Bolivia":"BO",
    "Bosnia And Herzegovina":"BA","Botswana":"BW","Brunei":"BN","Bulgaria":"BG","Burkina Faso":"BF",
    "Burundi":"BI","Cambodia":"KH","Cameroon":"CM","Canada":"CA","Cape Verde":"CV",
    "Chad":"TD","Chile":"CL","China":"CN","Colombia":"CO","Costa Rica":"CR",
    "Croatia":"HR","Cuba":"CU","Cyprus":"CY","Czech Republic":"CZ","Denmark":"DK",
    "Ecuador":"EC","Egypt":"EG","El Salvador":"SV","Estonia":"EE","Ethiopia":"ET",
    "Finland":"FI","Gabon":"GA","Georgia":"GE","Ghana":"GH","Greece":"GR",
    "Guatemala":"GT","Guinea":"GN","Honduras":"HN","Hungary":"HU","Iceland":"IS",
    "India":"IN","Indonesia":"ID","Iran":"IR","Iraq":"IQ","Ireland":"IE",
    "Israel":"IL","Jamaica":"JM","Japan":"JP","Jordan":"JO","Kazakhstan":"KZ",
    "Kenya":"KE","Kuwait":"KW","Latvia":"LV","Lebanon":"LB","Liberia":"LR",
    "Libya":"LY","Lithuania":"LT","Luxembourg":"LU","Malaysia":"MY","Mali":"ML",
    "Malta":"MT","Mauritius":"MU","Moldova":"MD","Monaco":"MC","Mongolia":"MN",
    "Montenegro":"ME","Morocco":"MA","Mozambique":"MZ","Namibia":"NA","Nepal":"NP",
    "New Zealand":"NZ","Nicaragua":"NI","Niger":"NE","North Macedonia":"MK","Norway":"NO",
    "Oman":"OM","Pakistan":"PK","Panama":"PA","Paraguay":"PY","Peru":"PE",
    "Philippines":"PH","Poland":"PL","Qatar":"QA","Romania":"RO","Russia":"RU",
    "Rwanda":"RW","Senegal":"SN","Serbia":"RS","Singapore":"SG","Slovakia":"SK",
    "Slovenia":"SI","South Africa":"ZA","South Korea":"KR","Sudan":"SD","Sweden":"SE",
    "Switzerland":"CH","Syria":"SY","Tanzania":"TZ","Thailand":"TH","Togo":"TG",
    "Tunisia":"TN","Uganda":"UG","Ukraine":"UA","United Arab Emirates":"AE","Uruguay":"UY",
    "Uzbekistan":"UZ","Venezuela":"VE","Vietnam":"VN","Wales":"GB","Zambia":"ZM",
    "Zimbabwe":"ZW"
  },

  /* ---------- FOOTBALL PREDICTIONS ----------
     p = [home win %, draw %, away win %]
     o   = odds for [1, X, 2]  (shown in the full football table)
     pk  = our pick for the full football table: "1", "X" or "2"
     gg/ggo = GG or NG pick and its odds;  ou/ouo = Over or Under 2.5 and its odds
     tip = pick shown in the compact homepage panel (1, X, 2, 1X, X2, GG, NG, +2.5 ...)
     score = final score once played, e.g. "2:1" (leave "" before kickoff)
     featured: true = shows on the homepage featured panel            */
  football: {
    yesterday: [
      { t:"20:00", lg:"ucl",   h:"Liverpool",       a:"Atalanta",        p:[61,22,17], o:["1.52","4.23","5.47"], pk:"1", gg:"GG", ggo:"1.72", ou:"Under", ouo:"1.95", tip:"1",   htft:"1/1", cs:"2-0", score:"3:1", st:"won",  featured:true },
      { t:"20:00", lg:"ucl",   h:"Bayern Munich",   a:"Sporting CP",     p:[72,16,12], o:["1.29","5.81","7.75"], pk:"1", gg:"NG", ggo:"1.95", ou:"Over", ouo:"2.05", tip:"+2.5",htft:"1/1", cs:"3-1", score:"4:1", st:"won",  featured:true },
      { t:"17:45", lg:"ucl",   h:"Olympiacos",      a:"Atletico Madrid", p:[24,28,48], o:["3.88","3.32","1.94"], pk:"2", gg:"GG", ggo:"1.65", ou:"Over", ouo:"1.90", tip:"X2",  htft:"X/2", cs:"0-1", score:"1:1", st:"won",  featured:true },
      { t:"20:45", lg:"champ", h:"Stoke City",      a:"Watford",         p:[38,30,32], o:["2.45","3.10","2.91"], pk:"1", gg:"NG", ggo:"2.05", ou:"Over", ouo:"1.75", tip:"1",   htft:"X/1", cs:"1-0", score:"0:2", st:"lost" },
      { t:"16:00", lg:"npfl",  h:"Kano Pillars",    a:"Shooting Stars",  p:[51,31,18], o:["1.82","3.00","5.17"], pk:"1", gg:"GG", ggo:"1.80", ou:"Under", ouo:"1.85", tip:"1X",  htft:"X/1", cs:"1-0", score:"1:0", st:"won" }
    ],
    today: [
      { t:"17:45", lg:"ucl",   h:"Galatasaray",     a:"Borussia Dortmund", p:[33,26,41], o:["2.82","3.58","2.27"], pk:"2", gg:"GG", ggo:"1.72", ou:"Under", ouo:"1.95", tip:"GG",  htft:"X/2", cs:"1-2", score:"", st:"pending", featured:true },
      { t:"17:45", lg:"ucl",   h:"Inter",           a:"Club Brugge",     p:[58,24,18], o:["1.60","3.88","5.17"], pk:"1", gg:"NG", ggo:"1.95", ou:"Over", ouo:"2.05", tip:"1X",  htft:"1/1", cs:"2-0", score:"", st:"pending" },
      { t:"20:00", lg:"ucl",   h:"Real Madrid",     a:"Benfica",         p:[64,20,16], o:["1.45","4.65","5.81"], pk:"1", gg:"GG", ggo:"1.65", ou:"Over", ouo:"1.90", tip:"1",   htft:"1/1", cs:"2-0", score:"", st:"pending", featured:true },
      { t:"20:00", lg:"ucl",   h:"Arsenal",         a:"PSV Eindhoven",   p:[68,19,13], o:["1.37","4.89","7.15"], pk:"1", gg:"NG", ggo:"2.05", ou:"Over", ouo:"1.75", tip:"+2.5",htft:"1/1", cs:"3-1", score:"", st:"pending", featured:true },
      { t:"20:45", lg:"champ", h:"Sheffield Wednesday", a:"Middlesbrough", p:[28,27,45], o:["3.32","3.44","2.07"], pk:"2", gg:"GG", ggo:"1.80", ou:"Under", ouo:"1.85", tip:"X2", htft:"X/2", cs:"1-2", score:"", st:"pending" },
      { t:"20:45", lg:"champ", h:"Norwich City",    a:"Coventry City",   p:[40,28,32], o:["2.33","3.32","2.91"], pk:"1", gg:"GG", ggo:"1.72", ou:"Under", ouo:"1.95", tip:"+1.5",htft:"1/1", cs:"2-1", score:"", st:"pending" },
      { t:"16:00", lg:"npfl",  h:"Enyimba",         a:"Rangers International", p:[48,32,20], o:["1.94","2.91","4.65"], pk:"1", gg:"NG", ggo:"1.95", ou:"Over", ouo:"2.05", tip:"1X", htft:"X/1", cs:"1-0", score:"", st:"pending" }
    ],
    tomorrow: [
      { t:"17:45", lg:"ucl",   h:"Napoli",          a:"Monaco",          p:[52,26,22], o:["1.79","3.58","4.23"], pk:"1", gg:"GG", ggo:"1.65", ou:"Over", ouo:"1.90", tip:"1",   htft:"X/1", cs:"2-1", score:"", st:"pending", featured:true },
      { t:"20:00", lg:"ucl",   h:"Manchester City", a:"Feyenoord",       p:[78,13,9], o:["1.19","7.15","10.33"], pk:"1", gg:"NG", ggo:"2.05", ou:"Over", ouo:"1.75",  tip:"1",   htft:"1/1", cs:"3-0", score:"", st:"pending", featured:true },
      { t:"20:00", lg:"ucl",   h:"Juventus",        a:"Barcelona",       p:[30,27,43], o:["3.10","3.44","2.16"], pk:"2", gg:"GG", ggo:"1.80", ou:"Under", ouo:"1.85", tip:"GG",  htft:"X/2", cs:"1-2", score:"", st:"pending", featured:true },
      { t:"16:00", lg:"npfl",  h:"Remo Stars",      a:"Plateau United",  p:[46,33,21], o:["2.02","2.82","4.43"], pk:"1", gg:"GG", ggo:"1.72", ou:"Under", ouo:"1.95", tip:"-2.5",htft:"X/1", cs:"1-0", score:"", st:"pending" }
    ]
  },

  /* ---------- BASKETBALL PREDICTIONS ----------
     p = [home win %, away win %]
     tip = your pick (1, 2, 1 -4.5, 2 +6.5, O 160.5, U 158.5 ...)
     spread / total = the line you are using
     ps = predicted score                                            */
  basketball: {
    yesterday: [
      { t:"19:00", lg:"euro", h:"Anadolu Efes",     a:"Maccabi Tel Aviv", p:[63,37], tip:"1",       spread:"-4.5", total:"166.5", ps:"86-80", score:"88:79", st:"won",  featured:true },
      { t:"20:30", lg:"euro", h:"Partizan",         a:"Zalgiris",         p:[58,42], tip:"O 158.5", spread:"-2.5", total:"158.5", ps:"84-78", score:"81:72", st:"lost", featured:true },
      { t:"10:30", lg:"nbl",  h:"Sydney Kings",     a:"Adelaide 36ers",   p:[66,34], tip:"1 -5.5",  spread:"-5.5", total:"178.5", ps:"94-85", score:"97:86", st:"won",  featured:true },
      { t:"19:30", lg:"acb",  h:"Unicaja",          a:"Joventut",         p:[71,29], tip:"1",       spread:"-8.5", total:"163.5", ps:"88-77", score:"91:80", st:"won" }
    ],
    today: [
      { t:"19:00", lg:"euro", h:"Fenerbahce",       a:"Panathinaikos",    p:[55,45], tip:"U 162.5", spread:"-2.5", total:"162.5", ps:"80-77", score:"", st:"pending", featured:true },
      { t:"20:45", lg:"euro", h:"Real Madrid",      a:"Olympiacos",       p:[57,43], tip:"1 -3.5",  spread:"-3.5", total:"160.5", ps:"84-78", score:"", st:"pending", featured:true },
      { t:"20:30", lg:"euro", h:"Barcelona",        a:"AS Monaco",        p:[52,48], tip:"O 165.5", spread:"-1.5", total:"165.5", ps:"86-83", score:"", st:"pending", featured:true },
      { t:"10:30", lg:"nbl",  h:"Perth Wildcats",   a:"Tasmania JackJumpers", p:[61,39], tip:"1", spread:"-4.5", total:"176.5", ps:"92-86", score:"", st:"pending" },
      { t:"19:30", lg:"acb",  h:"Valencia Basket",  a:"Baskonia",         p:[64,36], tip:"1 -5.5",  spread:"-5.5", total:"168.5", ps:"90-81", score:"", st:"pending" }
    ],
    tomorrow: [
      { t:"19:00", lg:"euro", h:"Virtus Bologna",   a:"Crvena Zvezda",    p:[46,54], tip:"2",       spread:"+1.5", total:"159.5", ps:"78-81", score:"", st:"pending", featured:true },
      { t:"20:00", lg:"euro", h:"ALBA Berlin",      a:"Bayern Munich",    p:[31,69], tip:"2 -6.5",  spread:"+6.5", total:"161.5", ps:"76-86", score:"", st:"pending", featured:true },
      { t:"10:00", lg:"nbl",  h:"Melbourne United", a:"Brisbane Bullets", p:[68,32], tip:"O 177.5", spread:"-6.5", total:"177.5", ps:"95-86", score:"", st:"pending", featured:true }
    ]
  },

  /* ---------- BEST BASKETBALL PLAYER PROPS OF THE DAY ----------
     shown as a card under the basketball predictions table
     market = Points / Rebounds / Assists / 3-Pointers Made / PRA
     pick   = Over/Under + the line we're taking                    */
  /* ---------- BASKETBALL PROP MARKETS (dropdown order) ----------
     kind "player" = player + line + Over/Under; kind "team" = a team pick (no line) */
  propMarkets: [
    { k:"pts",  name:"Player Points (Over/Under)",                         kind:"player" },
    { k:"reb",  name:"Player Rebounds (Over/Under)",                       kind:"player" },
    { k:"ast",  name:"Player Assists (Over/Under)",                        kind:"player" },
    { k:"pra",  name:"Player Points + Rebounds + Assists (PRA) (Over/Under)", kind:"player" },
    { k:"3ps",  name:"Player 3PT Shots Scored",                            kind:"player" },
    { k:"3pa",  name:"Player 3PT Shots Attempted",                         kind:"player" },
    { k:"blk",  name:"Player Blocks",                                      kind:"player" },
    { k:"stl",  name:"Player Steals",                                      kind:"player" },
    { k:"tov",  name:"Player Turnovers",                                   kind:"player" },
    { k:"t3pt", name:"Team With Most 3PTs Scored",                         kind:"team", short:"Most 3PT" },
    { k:"treb", name:"Team With Most Rebounds",                            kind:"team", short:"Most REB" },
    { k:"tast", name:"Team With Most Assists",                             kind:"team", short:"Most AST" },
    { k:"t2fg", name:"Team With Most 2PT Field Goals Scored",              kind:"team", short:"Most 2PT FG" }
  ],

  /* Best player props: k = market key from propMarkets. Player rows: player, line, pick (Over/Under).
     Team rows: team only.  SAMPLE DATA. */
  playerProps: [
    { k:"pts", player:"Luka Doncic", team:"Real Madrid", opp:"vs Olympiacos", line:"28.5", pick:"Over", odds:"1.85" },
    { k:"pts", player:"Mike James", team:"AS Monaco", opp:"vs Barcelona", line:"19.5", pick:"Over", odds:"1.90" },
    { k:"pts", player:"Shane Larkin", team:"Anadolu Efes", opp:"vs Panathinaikos", line:"17.5", pick:"Over", odds:"1.88" },
    { k:"pts", player:"Kostas Sloukas", team:"Fenerbahce", opp:"vs Panathinaikos", line:"14.5", pick:"Under", odds:"1.92" },
    { k:"reb", player:"Nikola Mirotic", team:"Barcelona", opp:"vs AS Monaco", line:"7.5", pick:"Over", odds:"1.80" },
    { k:"reb", player:"Edy Tavares", team:"Real Madrid", opp:"vs Olympiacos", line:"8.5", pick:"Over", odds:"1.85" },
    { k:"reb", player:"Chima Moneke", team:"Valencia Basket", opp:"vs Baskonia", line:"6.5", pick:"Under", odds:"1.95" },
    { k:"ast", player:"Shane Larkin", team:"Anadolu Efes", opp:"vs Panathinaikos", line:"6.5", pick:"Over", odds:"1.90" },
    { k:"ast", player:"Facundo Campazzo", team:"Real Madrid", opp:"vs Olympiacos", line:"6.5", pick:"Over", odds:"1.83" },
    { k:"ast", player:"Mike James", team:"AS Monaco", opp:"vs Barcelona", line:"5.5", pick:"Under", odds:"2.00" },
    { k:"pra", player:"Luka Doncic", team:"Real Madrid", opp:"vs Olympiacos", line:"45.5", pick:"Over", odds:"1.95" },
    { k:"pra", player:"Mike James", team:"AS Monaco", opp:"vs Barcelona", line:"32.5", pick:"Over", odds:"1.90" },
    { k:"pra", player:"Nikola Mirotic", team:"Barcelona", opp:"vs AS Monaco", line:"24.5", pick:"Under", odds:"1.87" },
    { k:"3ps", player:"Vasilije Micic", team:"Real Madrid", opp:"vs Olympiacos", line:"2.5", pick:"Over", odds:"2.05" },
    { k:"3ps", player:"Mike James", team:"AS Monaco", opp:"vs Barcelona", line:"2.5", pick:"Over", odds:"1.95" },
    { k:"3ps", player:"Shane Larkin", team:"Anadolu Efes", opp:"vs Panathinaikos", line:"2.5", pick:"Under", odds:"1.85" },
    { k:"3pa", player:"Mike James", team:"AS Monaco", opp:"vs Barcelona", line:"6.5", pick:"Over", odds:"1.85" },
    { k:"3pa", player:"Vasilije Micic", team:"Real Madrid", opp:"vs Olympiacos", line:"5.5", pick:"Over", odds:"1.90" },
    { k:"3pa", player:"Luka Doncic", team:"Real Madrid", opp:"vs Olympiacos", line:"9.5", pick:"Over", odds:"1.80" },
    { k:"blk", player:"Edy Tavares", team:"Real Madrid", opp:"vs Olympiacos", line:"1.5", pick:"Over", odds:"1.75" },
    { k:"blk", player:"Nikola Mirotic", team:"Barcelona", opp:"vs AS Monaco", line:"0.5", pick:"Over", odds:"1.70" },
    { k:"blk", player:"Chima Moneke", team:"Valencia Basket", opp:"vs Baskonia", line:"0.5", pick:"Over", odds:"1.85" },
    { k:"stl", player:"Shane Larkin", team:"Anadolu Efes", opp:"vs Panathinaikos", line:"1.5", pick:"Over", odds:"2.00" },
    { k:"stl", player:"Facundo Campazzo", team:"Real Madrid", opp:"vs Olympiacos", line:"1.5", pick:"Over", odds:"1.95" },
    { k:"stl", player:"Mike James", team:"AS Monaco", opp:"vs Barcelona", line:"1.5", pick:"Under", odds:"1.80" },
    { k:"tov", player:"Luka Doncic", team:"Real Madrid", opp:"vs Olympiacos", line:"3.5", pick:"Under", odds:"1.90" },
    { k:"tov", player:"Mike James", team:"AS Monaco", opp:"vs Barcelona", line:"2.5", pick:"Over", odds:"1.85" },
    { k:"tov", player:"Shane Larkin", team:"Anadolu Efes", opp:"vs Panathinaikos", line:"2.5", pick:"Under", odds:"1.95" },
    { k:"t3pt", team:"Real Madrid", opp:"vs Olympiacos", odds:"1.80" },
    { k:"t3pt", team:"Barcelona", opp:"vs AS Monaco", odds:"1.95" },
    { k:"t3pt", team:"Fenerbahce", opp:"vs Panathinaikos", odds:"2.10" },
    { k:"treb", team:"Barcelona", opp:"vs AS Monaco", odds:"1.85" },
    { k:"treb", team:"Real Madrid", opp:"vs Olympiacos", odds:"1.70" },
    { k:"treb", team:"Valencia Basket", opp:"vs Baskonia", odds:"1.90" },
    { k:"tast", team:"Anadolu Efes", opp:"vs Panathinaikos", odds:"1.90" },
    { k:"tast", team:"Real Madrid", opp:"vs Olympiacos", odds:"1.80" },
    { k:"tast", team:"AS Monaco", opp:"vs Barcelona", odds:"2.00" },
    { k:"t2fg", team:"AS Monaco", opp:"vs Barcelona", odds:"2.05" },
    { k:"t2fg", team:"Real Madrid", opp:"vs Olympiacos", odds:"1.75" },
    { k:"t2fg", team:"Fenerbahce", opp:"vs Panathinaikos", odds:"1.95" }
  ],



  /* ---------- TOP PICKS OF THE DAY (Expert Tips page) ----------
     two more cards, same template as the Expert Tip cards
     (crest, "vs", crest, the same 3-box odds row + pick badge, the same
     tipster line and "View Reasoning" button) so all three boxes on the
     page look identical — only the words in these fields differ. */
  topPicks: [
    { sport:"basketball", t:"20:45", sub:"EuroLeague · Points prop",
      left:{ name:"Luka Doncic", color:"#8b5cf6" }, right:{ name:"Olympiacos", color:"#f59e0b" },
      odds:[["Line","29.5"],["O","1.85"],["U","1.95"]], pick:"Over 29.5", pickOdds:"1.85", tipster:"Femi O.", tag:"Basketball 🏀 prop pick",
      reason:"Doncic has gone over this number in 8 of his last 10 EuroLeague outings and Olympiacos start a small backcourt that struggles to contain isolation scorers on switches." },
    { sport:"basketball", t:"19:30", sub:"NBA",
      left:{ name:"New York Knicks", color:"#006bb6" }, right:{ name:"Philadelphia 76ers", color:"#ed174c" },
      odds:[["1","1.65"],["X","—"],["2","2.20"]], pick:"1", pickOdds:"1.65", tipster:"Ada N.", tag:"Basketball 🏀 value pick",
      reason:"New York are at home off two days' rest while Philadelphia play the second night of a back-to-back. New York's home net rating this season makes them clear moneyline value at this price." }
  ],

  /* ---------- EXPERT TIPS (Expert Tips page) ---------- */
  expertTips: {
    yesterday: [
      { sport:"football", lg:"ucl", t:"20:00", h:"Liverpool", a:"Atalanta", pick:"Home win", odds:"1.52", conf:5,
        why:"Liverpool's home record in Europe is strong. Atalanta struggled in defensive phases against similar possession teams." },
      { sport:"basketball", lg:"nba", t:"22:30", h:"Lakers", a:"Suns", pick:"Lakers +6.5", odds:"1.91", conf:4,
        why:"LA has covered the last two against Phoenix. Depth advantage when Suns rely on big three." }
    ],
    today: [
      { sport:"football", lg:"ucl", t:"20:00", h:"Real Madrid", a:"Benfica", pick:"Home win", odds:"1.55", conf:4,
        why:"Madrid have won their last six home European group-stage games. Benfica concede early when they press high, and Madrid punish that in transition." },
      { sport:"football", lg:"ucl", t:"17:45", h:"Galatasaray", a:"Borussia Dortmund", pick:"Both teams to score", odds:"1.62", conf:4,
        why:"Both sides scored in 8 of their last 10 matches. Istanbul crowds push Galatasaray forward, and Dortmund rarely keep a clean sheet away from home." },
      { sport:"basketball", lg:"euro", t:"20:45", h:"Real Madrid", a:"Olympiacos", pick:"Real Madrid -3.5", odds:"1.88", conf:3,
        why:"Madrid's home net rating is far ahead of their road form, and Olympiacos played a double-overtime game two nights ago." },
      { sport:"basketball", lg:"euro", t:"19:00", h:"Fenerbahce", a:"Panathinaikos", pick:"Under 162.5 points", odds:"1.85", conf:3,
        why:"Two of the slowest-paced teams in the competition. Their last four meetings all finished under 160 total points." }
    ],
    tomorrow: [
      { sport:"football", lg:"epl", t:"15:00", h:"Arsenal", a:"Manchester City", pick:"Over 2.5 goals", odds:"1.68", conf:4,
        why:"Both teams average 2.2+ goals per game in competitive matches. Their last three meetings all exceeded 2.5 goals." },
      { sport:"basketball", lg:"nba", t:"19:00", h:"Celtics", a:"Nets", pick:"Celtics -9.5", odds:"1.85", conf:4,
        why:"Boston's defence ranks top-5. Brooklyn's new lineup hasn't gelled. Road spread advantage Celtics." }
    ]
  },

  /* ---------- PREMIUM / VIP RESULTS (last 15 days) ---------- */
  vip: [
    { d:"29", m:"Sep", odds:"2.20", won:true }, { d:"28", m:"Sep", odds:"8.79", won:true },
    { d:"27", m:"Sep", odds:"5.96", won:true }, { d:"26", m:"Sep", odds:"2.43", won:true },
    { d:"25", m:"Sep", odds:"2.33", won:false },{ d:"24", m:"Sep", odds:"2.56", won:true },
    { d:"23", m:"Sep", odds:"2.51", won:true }, { d:"22", m:"Sep", odds:"2.28", won:true },
    { d:"21", m:"Sep", odds:"5.68", won:true }, { d:"20", m:"Sep", odds:"2.30", won:false },
    { d:"19", m:"Sep", odds:"8.40", won:true }, { d:"18", m:"Sep", odds:"2.31", won:true },
    { d:"17", m:"Sep", odds:"13.58",won:true }, { d:"16", m:"Sep", odds:"2.40", won:true },
    { d:"15", m:"Sep", odds:"2.13", won:true }
  ],

  /* ---------- SOCIAL PROOF BANNER ---------- */
  stats: [
    { v:"12.4K", l:"Registered users", c:"#22d3ee" },
    { v:"1.8K",  l:"Subscribed users", c:"#f5b301" },
    { v:"40+",   l:"Daily games",      c:"#a3a8d6" },
    { v:"60+",   l:"Leagues covered",  c:"#ef4444" },
    { v:"100%",  l:"Results published",c:"#22c55e" }
  ],

  /* ---------- PREMIUM PLANS ----------
     payLink = your Paystack / Flutterwave payment page link (Phase 3) */
  plans: [
    { tier:"free", name:"Free", price:"$0", ngn:"₦0", per:"Forever", perks:["Daily free predictions","Match previews and analysis","!Premium 2-3 odds tips","!4-10 odds selections","!Priority support"], payLink:"" },
    { tier:"gold", name:"Gold", price:"$40", ngn:"₦40,000", per:"1 Month", perks:["Everything in Free","2-3 odds premium tips","Detailed match analysis","VIP room access","24/7 support"], payLink:"" },
    { tier:"titanium", name:"Titanium", price:"$90", ngn:"₦90,000", per:"1 Month", perks:["Everything in Gold","2-3 odds premium tips","4-10 odds selections","Advanced stats and insights","Express support"], payLink:"" }
  ],

  /* ---------- BLOG POSTS ---------- */
  posts: [
    { id:"spreads", cat:"Basketball", date:"29 Sep 2026", title:"How to Read a Basketball Point Spread",
      art:["#22d3ee","#6d28d9"],
      excerpt:"A -4.5 line means the favourite must win by 5 or more. Here is how spreads work and when they beat the moneyline.",
      body:["A point spread evens out a mismatch. If Real Madrid are -4.5 against Olympiacos, a bet on Madrid wins only if they win by 5 points or more. A bet on Olympiacos +4.5 wins if they win the game outright or lose by 4 or fewer.",
            "The half point exists to remove a push. With a whole-number spread such as -4, a 4-point win returns your stake.",
            "Spreads are usually priced near 1.90 on both sides, while a heavy favourite on the moneyline might pay only 1.20. When you rate a team as clearly stronger than the market does, the spread often gives better value than the moneyline."] },
    { id:"btts", cat:"Football", date:"28 Sep 2026", title:"BTTS Explained: When Both Teams To Score Pays",
      art:["#6d28d9","#ef4444"],
      excerpt:"GG and NG are two of the most popular football markets. Here is what drives them and what to check before you bet.",
      body:["Both Teams To Score (GG) wins when each side scores at least one goal. The result of the match does not matter: 1-1, 3-2 and 1-4 all settle as winners.",
            "Look at three numbers before you back GG: each team's scoring rate in the last ten matches, how many clean sheets they keep, and whether either side is missing its main striker or goalkeeper.",
            "NG (No Goal) is the opposite. It suits matches where one team is far weaker in attack, or where both sides play for a draw."] },
    { id:"bankroll", cat:"Guide", date:"27 Sep 2026", title:"Bankroll Basics for Football and Basketball Bettors",
      art:["#0e7490","#22c55e"],
      excerpt:"Stake size matters more than any single pick. A simple unit system keeps losing runs survivable.",
      body:["Decide on a betting bankroll you can afford to lose, then divide it into 100 units. A normal bet is 1 to 2 units. Never chase a loss by doubling your stake.",
            "Record every bet: the date, the market, the odds and the result. After a month you will see which markets make you money and which do not.",
            "Betting should stay entertainment. If it stops being fun, use the responsible gambling links at the bottom of every page."] },
    { id:"totals", cat:"Basketball", date:"26 Sep 2026", title:"Over/Under Points: Reading Pace in EuroLeague and NBA",
      art:["#f5b301","#6d28d9"],
      excerpt:"Pace, rest days and three-point volume decide most basketball totals. Here is the checklist we use.",
      body:["A total is the combined points the bookmaker expects. EuroLeague games usually land between 150 and 170 points, NBA games between 210 and 240.",
            "Pace is the number of possessions per game. Two fast teams push totals up; two slow, defensive teams push them down.",
            "Check rest days. Teams on the second night of a back-to-back usually shoot worse late in games, which favours the under."] },
    { id:"htft", cat:"Football", date:"25 Sep 2026", title:"HT/FT Betting: Big Odds, Careful Picks",
      art:["#ef4444","#22d3ee"],
      excerpt:"Halftime/Fulltime pays well because you must call two results. These are the match types where it makes sense.",
      body:["An HT/FT bet such as 1/1 needs the home team to lead at halftime and win at full time. Because two outcomes must land, odds are much higher than a straight win.",
            "It suits strong home favourites who start fast. It rarely suits cagey derbies, where the first half often ends level.",
            "X/1 and X/2 are the most common results after 1/1 and 2/2. They pay well when a stronger side tends to score late."] }

  ]
};

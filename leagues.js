/* ============================================================
   PICKSBIBLE MASTER LEAGUE LIST
   One place to add / rename / remove leagues. The admin panel reads this.
   Format:  { c: "Country or region", code: "2-letter badge", l: ["League", "Cup", ...] }
   ============================================================ */
window.PB_LEAGUES = {

  /* Shown first in the picker under the star. [country, league] */
  top: {
    football:   [["International","UEFA Champions League"],["England","Premier League"],["Spain","LaLiga"],["Germany","Bundesliga"],["Italy","Serie A"],["France","Ligue 1"]],
    basketball: [["USA","NBA"],["USA","WNBA"],["USA","March Madness"],["USA","Final Four"],["International","EuroBasket"]]
  },

  football: [
    /* ---------- EUROPE ---------- */
    { c:"Europe (UEFA)", code:"EU", l:["Champions League","Europa League","Conference League","UEFA Nations League","UEFA Super Cup","Women's Champions League"] },
    { c:"England", code:"EN", l:["Premier League","Championship","League One","League Two","FA Cup","EFL Cup","EFL Trophy","Community Shield","National League","National League North","National League South","NPL Premier Division","Southern League Premier Central","Southern League Premier South","Isthmian League Premier Division","Premier League 2","Professional Development League"] },
    { c:"Spain", code:"ES", l:["LaLiga","LaLiga 2","Copa del Rey","Supercopa de España","Primera Federación","Segunda Federación","Liga F"] },
    { c:"Italy", code:"IT", l:["Serie A","Serie B","Serie C - Group A","Serie C - Group B","Serie C - Group C","Coppa Italia","Supercoppa Italiana","Primavera 1","Coppa Italia Primavera","Serie A Women"] },
    { c:"Germany", code:"DE", l:["Bundesliga","2. Bundesliga","3. Liga","DFB-Pokal","DFL-Supercup","Regionalliga Nord","Regionalliga Nordost","Regionalliga West","Regionalliga Südwest","Regionalliga Bayern","Frauen-Bundesliga"] },
    { c:"France", code:"FR", l:["Ligue 1","Ligue 2","National 1","Coupe de France","Trophée des Champions","Premiere Ligue Women"] },
    { c:"Netherlands", code:"NL", l:["Eredivisie","Eerste Divisie","KNVB Beker","Johan Cruijff Shield"] },
    { c:"Portugal", code:"PT", l:["Liga Portugal","Liga Portugal 2","Taça de Portugal","Taça da Liga","Supertaça Cândido de Oliveira"] },
    { c:"Turkey", code:"TR", l:["Süper Lig","1. Lig","2. Lig","Ziraat Türkiye Kupası","Süper Kupa"] },
    { c:"Austria", code:"AT", l:["Bundesliga","2. Liga","Regionalliga","ÖFB Cup"] },
    { c:"Belgium", code:"BE", l:["Jupiler Pro League","Challenger Pro League","Belgian Cup (Croky Cup)"] },
    { c:"Croatia", code:"HR", l:["HNL","Prva NL","Druga NL","Croatian Football Cup"] },
    { c:"Czech Republic", code:"CZ", l:["Chance Liga","FN Liga","3. CFL / MSFL","MOL Cup"] },
    { c:"Denmark", code:"DK", l:["Superliga","1st Division","2nd Division","3rd Division","Danish Cup"] },
    { c:"Scotland", code:"SC", l:["Premiership","Championship","League One","League Two","Scottish Cup","Scottish League Cup"] },
    { c:"Switzerland", code:"CH", l:["Super League","Challenge League","Swiss Cup"] },
    { c:"Greece", code:"GR", l:["Super League 1","Super League 2","Greek Football Cup"] },
    { c:"Hungary", code:"HU", l:["NB I","NB II","Magyar Kupa"] },
    { c:"Poland", code:"PL", l:["Ekstraklasa","I Liga","II Liga","Polish Cup","Polish Super Cup"] },
    { c:"Romania", code:"RO", l:["Liga I","Liga II","Cupa României"] },
    { c:"Serbia", code:"RS", l:["Serbian SuperLiga","Serbian First League","Serbian Cup"] },
    { c:"Sweden", code:"SE", l:["Allsvenskan","Superettan","Ettan","Svenska Cupen"] },
    { c:"Norway", code:"NO", l:["Eliteserien","OBOS-ligaen","PostNord-ligaen","Norwegian Football Cup"] },
    { c:"Finland", code:"FI", l:["Veikkausliiga","Ykkösliiga","Ykkönen","Kakkonen","Finnish Cup"] },
    { c:"Albania", code:"AL", l:["Abissnet Superiore","Kategoria e Parë","Albanian Cup"] },
    { c:"Armenia", code:"AM", l:["Premier League","First League","Armenian Cup"] },
    { c:"Azerbaijan", code:"AZ", l:["Premier League","First Division","Azerbaijan Cup"] },
    { c:"Belarus", code:"BY", l:["Vysshaya Liga","Pershaya Liga","Belarusian Cup"] },
    { c:"Bosnia and Herzegovina", code:"BA", l:["WWIN Liga BiH","Prva Liga FBiH","Prva Liga RS","Bosnia and Herzegovina Football Cup"] },
    { c:"Bulgaria", code:"BG", l:["efbet League","Vtora Liga","Bulgarian Cup"] },
    { c:"Cyprus", code:"CY", l:["First Division","Cypriot Cup"] },
    { c:"Estonia", code:"EE", l:["Meistriliiga","Esiliiga","Estonian Cup"] },
    { c:"Faroe Islands", code:"FO", l:["Premier League (Betri deildin)","1. Deild","Faroe Islands Cup"] },
    { c:"Georgia", code:"GE", l:["Erovnuli Liga","Erovnuli Liga 2","Georgian Cup"] },
    { c:"Iceland", code:"IS", l:["Besta deild karla","1. deild karla","Icelandic Cup"] },
    { c:"Ireland", code:"IE", l:["Premier Division","First Division","FAI Cup"] },
    { c:"Israel", code:"IL", l:["Ligat Ha'al","Liga Leumit","Israel State Cup","Toto Cup"] },
    { c:"Kosovo", code:"XK", l:["Football Superleague of Kosovo","Kosovar Cup"] },
    { c:"Latvia", code:"LV", l:["Virsliga","1. Liga","Latvian Football Cup"] },
    { c:"Lithuania", code:"LT", l:["A Lyga","I Lyga","Lithuanian Football Cup"] },
    { c:"Luxembourg", code:"LU", l:["BGL Ligue","Luxembourg Cup"] },
    { c:"Malta", code:"MT", l:["Premier League","Challenge League","Maltese FA Trophy"] },
    { c:"Moldova", code:"MD", l:["Super Liga","Moldovan Cup"] },
    { c:"Montenegro", code:"ME", l:["First League","Montenegrin Cup"] },
    { c:"North Macedonia", code:"MK", l:["First Football League","Macedonian Football Cup"] },
    { c:"Northern Ireland", code:"NI", l:["NIFL Premiership","NIFL Championship","Irish Cup"] },
    { c:"San Marino", code:"SM", l:["Campionato Sammarinese","Coppa Titano"] },
    { c:"Slovakia", code:"SK", l:["Niké Liga","2. Liga","Slovak Cup"] },
    { c:"Slovenia", code:"SI", l:["PrvaLiga","2. SNL","Slovenian Football Cup"] },
    { c:"Wales", code:"WA", l:["Cymru Premier","Cymru North","Cymru South","Welsh Cup"] },

    /* ---------- SOUTH AMERICA ---------- */
    { c:"South America (CONMEBOL)", code:"SA", l:["Copa Libertadores","Copa Sudamericana","Recopa Sudamericana"] },
    { c:"Argentina", code:"AR", l:["Liga Profesional","Primera Nacional","Torneo Federal A","Primera B","Primera C","Copa Argentina","Supercopa Argentina","Trofeo de Campeones"] },
    { c:"Brazil", code:"BR", l:["Série A","Série B","Série C","Série D","Copa do Brasil","Supercopa do Brasil","Campeonato Paulista","Campeonato Carioca","Campeonato Mineiro","Campeonato Gaúcho"] },
    { c:"Bolivia", code:"BO", l:["División Profesional","Copa Pacena","Copa Simón Bolívar"] },
    { c:"Chile", code:"CL", l:["Primera División","Primera B","Segunda División","Copa Chile"] },
    { c:"Colombia", code:"CO", l:["Categoria Primera A","Categoria Primera B","Copa Colombia"] },
    { c:"Ecuador", code:"EC", l:["LigaPro (Serie A)","Serie B","Copa Ecuador"] },
    { c:"Paraguay", code:"PY", l:["Primera División","Copa Paraguay"] },
    { c:"Peru", code:"PE", l:["Liga 1","Liga 2","Copa Bicentenario"] },
    { c:"Uruguay", code:"UY", l:["Primera División","Segunda División","Copa Uruguay"] },
    { c:"Venezuela", code:"VE", l:["Liga FUTVE","Copa Venezuela"] },

    /* ---------- NORTH & CENTRAL AMERICA / CARIBBEAN ---------- */
    { c:"North & Central America (CONCACAF)", code:"CC", l:["CONCACAF Champions Cup","CONCACAF Nations League","Leagues Cup","Central American Cup","Caribbean Cup"] },
    { c:"USA", code:"US", l:["MLS","USL Championship","USL League One","MLS NEXT Pro","NWSL","US Open Cup"] },
    { c:"Canada", code:"CA", l:["Canadian Premier League","Canadian Championship"] },
    { c:"Mexico", code:"MX", l:["Liga MX","Liga de Expansión MX","Copa MX","Campeón de Campeones","Liga MX Femenil"] },
    { c:"Costa Rica", code:"CR", l:["Liga FPD","Liga de Ascenso","Torneo de Copa"] },
    { c:"Dominican Republic", code:"DO", l:["LDF (Liga Dominicana de Fútbol)"] },
    { c:"El Salvador", code:"SV", l:["Primera División","Copa El Salvador"] },
    { c:"Guatemala", code:"GT", l:["Liga Nacional","Primera División"] },
    { c:"Honduras", code:"HN", l:["Liga Nacional","Copa de Honduras"] },
    { c:"Jamaica", code:"JM", l:["Jamaica Premier League"] },
    { c:"Panama", code:"PA", l:["LPF (Liga Panameña de Fútbol)"] },

    /* ---------- ASIA ---------- */
    { c:"Asia (AFC)", code:"AS", l:["AFC Champions League Elite","AFC Champions League Two","AFC Challenge League","ASEAN Championship"] },
    { c:"China", code:"CN", l:["Chinese Super League","China League One","China League Two","Chinese FA Cup","Chinese FA Super Cup"] },
    { c:"Japan", code:"JP", l:["J1 League","J2 League","J3 League","Emperor's Cup","J.League Cup","WE League"] },
    { c:"South Korea", code:"KR", l:["K League 1","K League 2","Korea Cup"] },
    { c:"Saudi Arabia", code:"SA", l:["Saudi Pro League","First Division League","King Cup","Saudi Super Cup"] },
    { c:"Australia", code:"AU", l:["A-League Men","Australia Cup","NPL ACT","NPL NSW","NPL Victoria","NPL Queensland","NPL South Australia","NPL Western Australia","NPL Tasmania","NPL Northern NSW"] },
    { c:"India", code:"IN", l:["Indian Super League","I-League","Super Cup","Durand Cup","Calcutta Premier Division"] },
    { c:"Indonesia", code:"ID", l:["Liga 1","Liga 2"] },
    { c:"Iraq", code:"IQ", l:["Iraq Stars League","Iraq FA Cup"] },
    { c:"Jordan", code:"JO", l:["Pro League","Jordan FA Cup","Jordan Super Cup"] },
    { c:"Malaysia", code:"MY", l:["Malaysia Super League","Malaysia Cup","Malaysia FA Cup"] },
    { c:"Qatar", code:"QA", l:["Qatar Stars League","QFA Cup","Emir of Qatar Cup"] },
    { c:"Singapore", code:"SG", l:["Singapore Premier League","Singapore Cup"] },
    { c:"Thailand", code:"TH", l:["Thai League 1","Thai League 2","Thai FA Cup","Thai League Cup"] },
    { c:"United Arab Emirates", code:"AE", l:["UAE Pro League","UAE President's Cup","UAE League Cup"] },
    { c:"Vietnam", code:"VN", l:["V.League 1","V.League 2","Vietnamese Cup"] },

    /* ---------- AFRICA ---------- */
    { c:"Africa (CAF)", code:"AF", l:["CAF Champions League","CAF Confederation Cup","CAF Super Cup","Africa Cup of Nations (AFCON)","African Nations Championship (CHAN)"] },
    { c:"Egypt", code:"EG", l:["Egyptian Premier League","Egypt Cup","Egyptian League Cup","Egyptian Super Cup"] },
    { c:"Angola", code:"AO", l:["Girabola","Taça de Angola"] },
    { c:"Algeria", code:"DZ", l:["Ligue 1","Algerian Cup"] },
    { c:"Cameroon", code:"CM", l:["Elite One","Cameroonian Cup"] },
    { c:"Ghana", code:"GH", l:["Ghana Premier League","Ghanaian FA Cup"] },
    { c:"Ivory Coast", code:"CI", l:["Ligue 1","Coupe de Côte d'Ivoire"] },
    { c:"Kenya", code:"KE", l:["Kenyan Premier League","FKF President's Cup"] },
    { c:"Malawi", code:"MW", l:["Super League","FAM Cup"] },
    { c:"Morocco", code:"MA", l:["Botola Pro","Coupe du Trône"] },
    { c:"Nigeria", code:"NG", l:["Nigeria Premier Football League (NPFL)","FA Cup (Federation Cup)"] },
    { c:"South Africa", code:"ZA", l:["Premier Soccer League (DStv Premiership)","Motsepe Foundation Championship","Nedbank Cup","Carling Knockout"] },
    { c:"Tunisia", code:"TN", l:["Ligue Professionnelle 1","Tunisian Cup"] },
    { c:"Zambia", code:"ZM", l:["Zambia Super League","ABSA Cup"] },

    /* ---------- OCEANIA ---------- */
    { c:"Oceania (OFC)", code:"OC", l:["OFC Champions League"] },
    { c:"New Zealand", code:"NZ", l:["National League","Chatham Cup"] }
  ],

  /* Basketball: only the competitions PicksBible supports. Add a line to add a league. */
  basketball: [
    { c:"USA", code:"US", l:["NBA","WNBA","March Madness","Final Four"] },
    { c:"International", code:"EU", l:["EuroBasket"] }
  ]
};

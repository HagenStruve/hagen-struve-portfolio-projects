const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const cheerio = require("cheerio");

const app = express();
const PORT = process.env.PORT || 8787;
const DATA_DIR = path.join(__dirname, "..", "data");
const LEADS_FILE = path.join(DATA_DIR, "raw-leads.json");
const DEBUG_FILE = path.join(DATA_DIR, "debug.json");

app.use(cors());
app.use(express.json({ limit: "8mb" }));
app.use(express.static(path.join(__dirname, "..", "frontend")));

const REGIONS = {
  "Schleswig-Holstein": [
    "Steinburg","Dithmarschen","Pinneberg","Segeberg","Rendsburg-Eckernförde",
    "Nordfriesland","Schleswig-Flensburg","Plön","Ostholstein","Herzogtum Lauenburg",
    "Stormarn","Lübeck","Kiel","Neumünster","Flensburg"
  ],
  "Niedersachsen": [
    "Cuxhaven","Stade","Rotenburg (Wümme)","Harburg","Lüneburg","Uelzen","Celle",
    "Heidekreis","Verden","Diepholz","Nienburg/Weser","Oldenburg","Cloppenburg",
    "Vechta","Emsland","Grafschaft Bentheim","Osnabrück","Hannover"
  ]
};

const DEFAULT_TERMS = [
  "Landtechnik", "Landmaschinen", "Landmaschinen Händler",
  "Landmaschinen Werkstatt", "Agrartechnik", "Traktor Händler",
  "Landtechnik Service", "Landmaschinen Reparatur"
];

const BLOCK_DOMAINS = [
  "google.com","bing.com","duckduckgo.com","facebook.com","instagram.com","youtube.com",
  "linkedin.com","xing.com","wikipedia.org","kleinanzeigen.de","ebay.de",
  "technikboerse.com","traktorpool.de","agriaffaires.de","agrifinder.com",
  "gelbeseiten.de","11880.com","dasoertliche.de","meinestadt.de","cylex.de",
  "autohaus.de","autobild.de","citroen.de","peugeot.de","mazda.de","mediamarkt.de"
];

const SOFT_BAD = ["gebraucht kaufen","marktplatz","börse","newsletter","fachmedium","magazin","autohaus","automobil","privatleasing","marketing"];
const AGRI = ["landtechnik","landmaschinen","landmaschine","agrartechnik","agrar","traktor","traktoren","schlepper","claas","fendt","john deere","new holland","deutz","krone","amazone","lemken","horsch","pöttinger","grimme","kubota","mähdrescher","häcksler","gülle","saattechnik","hoftechnik","melktechnik","landmaschinenwerkstatt"];

function ensure() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(LEADS_FILE)) fs.writeFileSync(LEADS_FILE, "[]", "utf8");
  if (!fs.existsSync(DEBUG_FILE)) fs.writeFileSync(DEBUG_FILE, "{}", "utf8");
}
function clean(v){ return String(v||"").replace(/\s+/g," ").trim(); }
function readLeads(){ ensure(); try{return JSON.parse(fs.readFileSync(LEADS_FILE,"utf8"))}catch{return[]} }
function writeLeads(x){ ensure(); fs.writeFileSync(LEADS_FILE, JSON.stringify(x,null,2), "utf8"); }
function writeDebug(x){ ensure(); fs.writeFileSync(DEBUG_FILE, JSON.stringify(x,null,2), "utf8"); }
function readDebug(){ ensure(); try{return JSON.parse(fs.readFileSync(DEBUG_FILE,"utf8"))}catch{return{}} }
function makeId(){ return "raw_"+Date.now().toString(36)+"_"+Math.random().toString(36).slice(2,8); }
function hasAny(text, arr){ const t=String(text||"").toLowerCase(); return arr.some(x=>t.includes(x.toLowerCase())); }
function normUrl(url){ try{ if(!/^https?:\/\//i.test(url)) url="https://"+url; const u=new URL(url); u.hash=""; return u.toString(); }catch{return""} }
function rootUrl(url){ try{ const u=new URL(normUrl(url)); return `${u.protocol}//${u.hostname}/`; }catch{return normUrl(url)} }
function domain(url){ try{return new URL(normUrl(url)).hostname.replace(/^www\./,"").toLowerCase()}catch{return""} }
function blocked(d){ d=String(d||"").replace(/^www\./,"").toLowerCase(); return BLOCK_DOMAINS.some(x=>d===x||d.endsWith("."+x)); }
function csv(v){ const s=String(v??""); return `"${s.replace(/"/g,'""')}"`; }
function emails(text){ return [...new Set((String(text).match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi)||[]).map(e=>e.toLowerCase()).filter(e=>!/\.(png|jpg|jpeg|gif|svg|webp|css|js)$/i.test(e)&&!/example|beispiel|domain|datenschutz/.test(e)))].slice(0,3); }
function phones(text){ return [...new Set((String(text).match(/(?:\+49|0049|0)[\d\s().\/-]{7,}/g)||[]).map(clean).filter(p=>{const d=p.replace(/\D/g,""); return d.length>=8&&d.length<=16&&!/20(2[0-9]|3[0-9])/.test(p)}))].slice(0,3); }
function city(text){ const m=[...String(text||"").matchAll(/\b(?:D-)?([0-9]{5})\s+([A-ZÄÖÜ][a-zäöüßA-ZÄÖÜ\-. ]{2,35})\b/g)]; for(const x of m){const c=clean(x[2]).replace(/(Telefon|Tel|Fax|E-Mail|Email|Deutschland|Geschäftsführer|Adresse).*$/i,"").trim(); if(c.length>=3&&c.length<=35) return `${x[1]} ${c}`;} return ""; }
function company(text,title,d){
  const short=String(text||"").slice(0,12000);
  const pats=[
    /([A-ZÄÖÜ][A-Za-zÄÖÜäöüß0-9&.\- ]{2,90}\s+(?:GmbH\s*&\s*Co\.?\s*KG|GmbH|UG|AG|KG|OHG|e\.K\.|GbR))/i,
    /([A-ZÄÖÜ][A-Za-zÄÖÜäöüß0-9&.\- ]{2,80}\s+(?:Landtechnik|Landmaschinen|Agrartechnik)[A-Za-zÄÖÜäöüß0-9&.\- ]{0,50})/i
  ];
  for(const p of pats){const m=short.match(p); if(m&&m[1]) return cleanName(m[1]);}
  const t=cleanName(title); if(t&&t.length>2&&t.length<85&&!hasAny(t,SOFT_BAD)) return t;
  return d ? d.split(".")[0].replace(/[-_]/g," ") : "Unbekannt";
}
function cleanName(n){ return clean(n).replace(/^(Willkommen bei|Startseite|Home|Impressum|Kontakt|Über uns)\s+/i,"").replace(/\s*[-|–]\s*(Startseite|Home|Kontakt|Impressum|Willkommen).*$/i,"").replace(/\s*\|\s*.*$/,"").replace(/\s*-\s*.*$/,"").slice(0,90).trim(); }
function score(l){
  const t=`${l.company} ${l.website} ${l.email} ${l.phone} ${l.snippet} ${l.notes}`.toLowerCase();
  let s=0; if(l.website)s+=15; if(l.email)s+=25; if(l.phone)s+=15; if(l.city)s+=10; if(hasAny(t,AGRI))s+=30; if(hasAny(t,SOFT_BAD))s-=15; if(blocked(domain(l.website)))s-=100; return Math.max(0,Math.min(100,s));
}
function queries(body){
  const state=body.state||"Schleswig-Holstein";
  const ds=Array.isArray(body.districts)&&body.districts.length ? body.districts : [state];
  const terms=clean(body.customTerms) ? clean(body.customTerms).split(",").map(clean).filter(Boolean) : DEFAULT_TERMS;
  const out=[];
  for(const r of ds){
    for(const term of terms){
      out.push({engine:"duck",query:`"${term}" "${r}"`,region:r,term,state});
      out.push({engine:"bing",query:`${term} ${r} Kontakt`,region:r,term,state});
      out.push({engine:"bing",query:`${term} ${r} Impressum`,region:r,term,state});
    }
  }
  return out;
}
async function fetchHtml(url, timeout=12000){
  const c=new AbortController(); const timer=setTimeout(()=>c.abort(),timeout);
  try{
    const res=await fetch(url,{signal:c.signal,headers:{"User-Agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 LeadPilot/1.5","Accept":"text/html,application/xhtml+xml"}});
    const ct=res.headers.get("content-type")||"";
    if(!res.ok || !ct.includes("text/html")) return "";
    return await res.text();
  }catch{return""} finally{clearTimeout(timer)}
}
function sleep(ms){ return new Promise(r=>setTimeout(r,ms)); }

async function searchDuck(q){
  const html=await fetchHtml("https://duckduckgo.com/html/?q="+encodeURIComponent(q),14000);
  if(!html) return [];
  const $=cheerio.load(html); const out=[];
  $(".result").each((_,el)=>{
    const a=$(el).find(".result__a").first(); let href=a.attr("href")||""; const title=clean(a.text()); const snippet=clean($(el).find(".result__snippet").text());
    if(href.includes("uddg=")){ try{const u=new URL(href,"https://duckduckgo.com"); href=decodeURIComponent(u.searchParams.get("uddg")||href)}catch{}}
    pushResult(out,title,href,snippet,"duck");
  });
  return out.slice(0,12);
}
async function searchBing(q){
  const html=await fetchHtml("https://www.bing.com/search?q="+encodeURIComponent(q),14000);
  if(!html) return [];
  const $=cheerio.load(html); const out=[];
  $("li.b_algo").each((_,el)=>{
    const a=$(el).find("h2 a").first(); const title=clean(a.text()); const href=a.attr("href")||""; const snippet=clean($(el).find(".b_caption p").first().text());
    pushResult(out,title,href,snippet,"bing");
  });
  return out.slice(0,12);
}
function pushResult(out,title,href,snippet,engine){
  const url=rootUrl(href); const d=domain(url);
  if(!url||!d||blocked(d)) return;
  if(hasAny(`${title} ${snippet} ${url}`,SOFT_BAD)) return;
  out.push({title,url,domain:d,snippet,engine});
}
function contactLinks($,base){
  const links=[]; $("a[href]").each((_,el)=>{ const href=$(el).attr("href")||""; const label=clean($(el).text()).toLowerCase(); const h=href.toLowerCase(); if(h.includes("kontakt")||h.includes("impressum")||label.includes("kontakt")||label.includes("impressum")){try{links.push(new URL(href,base).toString())}catch{}}});
  return [...new Set(links)].slice(0,3);
}
async function enrich(hit,meta,mode){
  let html=await fetchHtml(hit.url,12000); let title=hit.title; let text=hit.snippet; let desc="";
  if(html){
    const $=cheerio.load(html); $("script,style,noscript,svg").remove();
    title=clean($("title").first().text()||hit.title); desc=clean($('meta[name="description"]').attr("content")||"");
    text += " " + desc + " " + clean($("body").text()).slice(0,12000);
    for(const link of contactLinks($,hit.url)){ await sleep(300); const sub=await fetchHtml(link,8000); if(sub){const s=cheerio.load(sub); s("script,style,noscript,svg").remove(); text += " " + clean(s("body").text()).slice(0,7000);}}
  }
  const agri=hasAny(`${title} ${desc} ${text}`,AGRI);
  // raw mode stores even uncertain results as long as not blocked
  if(mode==="balanced" && !agri) return null;
  const l={id:makeId(),state:meta.state||"",district:meta.region||"",searchTerm:meta.term||"",query:meta.query||"",engine:hit.engine,company:company(text,title,hit.domain),website:hit.url,domain:hit.domain,email:emails(text)[0]||"",phone:phones(text)[0]||"",city:city(text),snippet:clean(desc||hit.snippet||"").slice(0,350),notes:agri?"Agrar-/Landtechnik-Bezug erkannt":"Unsicherer Rohdaten-Treffer",status:"Rohdaten",createdAt:new Date().toISOString()};
  l.score=score(l);
  // v5: raw mode keeps results with website even without contact, because ChatGPT can sort
  if(mode==="balanced" && l.score < 30) return null;
  return l;
}
function upsert(items){
  const leads=readLeads(); let added=0,updated=0,skipped=0;
  for(const item of items){
    if(!item||!item.website){skipped++;continue}
    const d=domain(item.website); if(!d||blocked(d)){skipped++;continue}
    const i=leads.findIndex(l=>domain(l.website)===d || (item.email&&l.email&&item.email===l.email));
    if(i>=0){leads[i]={...leads[i],...item,id:leads[i].id,updatedAt:new Date().toISOString()};updated++} else {leads.push(item);added++}
  }
  leads.sort((a,b)=>(b.score||0)-(a.score||0)); writeLeads(leads); return {added,updated,skipped,total:leads.length,leads};
}
function toCsv(leads){ const h=["Score","Bundesland","Kreis","Suchbegriff","Firma","Website","E-Mail","Telefon","Ort","Engine","Status","Notizen","Snippet","Query"]; const rows=leads.map(l=>[l.score,l.state,l.district,l.searchTerm,l.company,l.website,l.email,l.phone,l.city,l.engine,l.status,l.notes,l.snippet,l.query].map(csv).join(",")); return [h.map(csv).join(","),...rows].join("\n"); }

app.get("/api/health",(_,res)=>res.json({ok:true,name:"LeadPilot Scraper v5"}));
app.get("/api/regions",(_,res)=>res.json({regions:REGIONS}));
app.get("/api/leads",(_,res)=>res.json({leads:readLeads()}));
app.get("/api/debug",(_,res)=>res.json(readDebug()));
app.post("/api/clear",(_,res)=>{writeLeads([]);writeDebug({});res.json({ok:true})});
app.post("/api/generate-queries",(req,res)=>res.json({queries:queries(req.body||{}).slice(0,400)}));

app.post("/api/scrape",async(req,res)=>{
  const body=req.body||{}; const mode=body.mode||"raw"; const maxPerDistrict=Math.min(Number(body.maxPerDistrict)||25,100);
  const qs=queries(body); const seen=new Set(); const results=[]; const counts={}; const dbg={startedAt:new Date().toISOString(),queries:[],hits:0,enriched:0,saved:null};
  try{
    for(const q of qs){
      counts[q.region]=counts[q.region]||0; if(counts[q.region]>=maxPerDistrict) continue;
      let hits = q.engine==="bing" ? await searchBing(q.query) : await searchDuck(q.query);
      dbg.queries.push({engine:q.engine,query:q.query,hits:hits.length});
      for(const hit of hits){
        const d=domain(hit.url); if(seen.has(d)) continue; seen.add(d);
        if(counts[q.region]>=maxPerDistrict) break;
        const lead=await enrich(hit,q,mode);
        if(lead){results.push(lead); counts[q.region]++; dbg.enriched++}
        await sleep(250);
      }
      dbg.hits += hits.length;
      await sleep(450);
    }
    const saved=upsert(results); dbg.saved={...saved,leads:undefined}; dbg.finishedAt=new Date().toISOString(); writeDebug(dbg);
    res.json({ok:true,searchedQueries:qs.length,collected:results.length,saved,debug:dbg});
  }catch(e){ dbg.error=e.message; writeDebug(dbg); res.status(500).json({error:"Scraping fehlgeschlagen: "+e.message, debug:dbg});}
});
app.get("/api/export.csv",(_,res)=>{res.setHeader("Content-Type","text/csv; charset=utf-8");res.setHeader("Content-Disposition","attachment; filename=leadpilot-rohdaten.csv");res.send("\ufeff"+toCsv(readLeads()))});
app.post("/api/chatgpt-prompt",(req,res)=>{
  const leads=readLeads(); const goal=clean((req.body||{}).goal)||"Bereinige diese Rohdaten und erstelle eine gute Leadliste.";
  const lines=leads.map((l,i)=>`${i+1}. Score ${l.score} | ${l.state} | ${l.district} | ${l.searchTerm} | ${l.company} | ${l.website} | E-Mail: ${l.email||"-"} | Telefon: ${l.phone||"-"} | Ort: ${l.city||"-"} | Engine: ${l.engine||"-"} | Notiz: ${l.notes||"-"} | Snippet: ${l.snippet||"-"}`).join("\n");
  res.json({prompt:`Du bist mein Lead-Analyse-Assistent.

Ziel:
${goal}

Aufgabe:
1. Entferne Portale, Herstellerseiten, Medienseiten, Autohaus-/PKW-Treffer und irrelevante Treffer.
2. Erkenne echte Landtechnik-Händler, Landmaschinen-Werkstätten, Agrartechnik-Anbieter und Lohnunternehmer.
3. Sortiere nach Priorität für MaschinenLog.
4. Erstelle eine saubere Tabelle mit: Priorität, Firma, Kategorie, Region/Kreis, Website, E-Mail, Telefon, Begründung.
5. Gib zusätzlich konkrete nächste Kontakt-Empfehlungen aus.
6. Formuliere danach einen kurzen seriösen Erstkontakt-Text für die Top-Leads.

Rohdaten:
${lines}`});
});
app.get("*",(_,res)=>res.sendFile(path.join(__dirname,"..","frontend","index.html")));
app.listen(PORT,()=>console.log(`LeadPilot Scraper v5 läuft auf http://localhost:${PORT}`));

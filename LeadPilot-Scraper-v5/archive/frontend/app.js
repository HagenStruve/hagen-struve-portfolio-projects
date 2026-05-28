const $ = id => document.getElementById(id);
let regions = {};

async function api(path, options={}) {
  const res = await fetch(path, { headers: {"Content-Type":"application/json"}, ...options });
  const data = await res.json().catch(()=>({}));
  if (!res.ok) throw new Error(data.error || "Fehler");
  return data;
}
function selectedDistricts(){
  return [...document.querySelectorAll(".districtInput:checked")].map(x=>x.value);
}
function payload(){
  return {
    state: $("state").value,
    districts: selectedDistricts(),
    customTerms: $("customTerms").value,
    maxPerDistrict: Number($("maxPerDistrict").value),
    mode: $("mode").value,
    goal: $("goal").value
  };
}
async function init(){
  try{
    await api("/api/health");
    $("dot").className="ok"; $("status").innerHTML="Backend läuft<small>http://localhost:8787</small>";
  }catch{ $("dot").className="bad"; $("status").innerHTML="Backend fehlt<small>http://localhost:8787</small>"; }

  const data = await api("/api/regions");
  regions = data.regions;
  $("state").innerHTML = Object.keys(regions).map(s=>`<option>${s}</option>`).join("");
  renderDistricts();
  await loadLeads();
}
function renderDistricts(){
  const state = $("state").value;
  $("districts").innerHTML = (regions[state]||[]).map(k=>`
    <label class="check"><input class="districtInput" type="checkbox" value="${escapeAttr(k)}" checked/> ${escapeHtml(k)}</label>
  `).join("");
}
async function generateQueries(){
  const data = await api("/api/generate-queries",{method:"POST",body:JSON.stringify(payload())});
  $("queries").innerHTML = data.queries.map(q=>{
    const url="https://www.google.com/search?q="+encodeURIComponent(q.query);
    return `<div class="query"><span>${escapeHtml(q.query)}</span><a target="_blank" rel="noreferrer" href="${url}">prüfen</a></div>`;
  }).join("");
}
async function scrape(){
  $("msg").textContent="Sammle Rohdaten… Das kann einige Minuten dauern, je nach Anzahl Kreise.";
  try{
    const data = await api("/api/scrape",{method:"POST",body:JSON.stringify(payload())});
    $("msg").textContent=`Fertig: ${data.saved.added} neu, ${data.saved.updated} aktualisiert, Gesamt: ${data.saved.total}`;
    await loadLeads();
  }catch(e){ $("msg").textContent=e.message; $("msg").style.color="#fecdd3"; }
}
async function loadLeads(){
  const data=await api("/api/leads");
  $("rows").innerHTML = data.leads.length ? data.leads.map(l=>`
    <tr>
      <td><span class="score">${l.score||0}</span></td>
      <td>${escapeHtml(l.state||"")}<br><small>${escapeHtml(l.district||"")}</small></td>
      <td><b>${escapeHtml(l.company||"")}</b><br><a href="${safe(l.website)}" target="_blank">${escapeHtml(l.domain||l.website||"")}</a></td>
      <td>${l.email ? `<a href="mailto:${escapeAttr(l.email)}">${escapeHtml(l.email)}</a><br>`:""}${l.phone?escapeHtml(l.phone):""}<br><small>${escapeHtml(l.city||"")}</small></td>
      <td>${escapeHtml(l.searchTerm||"")}</td>
      <td>${escapeHtml(l.notes||"")}<br><small>${escapeHtml(l.snippet||"")}</small></td>
    </tr>
  `).join("") : `<tr><td colspan="6">Noch keine Rohdaten.</td></tr>`;
}
async function makePrompt(){
  const data=await api("/api/chatgpt-prompt",{method:"POST",body:JSON.stringify({goal:$("goal").value})});
  $("prompt").value=data.prompt;
}
async function copyPrompt(){
  if(!$("prompt").value) await makePrompt();
  await navigator.clipboard.writeText($("prompt").value);
  alert("Prompt kopiert.");
}
async function clearList(){
  if(!confirm("Alle Rohdaten löschen?")) return;
  await api("/api/clear",{method:"POST"});
  await loadLeads();
}
function escapeHtml(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));}
function escapeAttr(s){return escapeHtml(s);}
function safe(url){ const u=String(url||""); return /^https?:\/\//i.test(u)?escapeAttr(u):"https://"+escapeAttr(u); }

$("state").addEventListener("change", renderDistricts);
$("allBtn").addEventListener("click", ()=>document.querySelectorAll(".districtInput").forEach(x=>x.checked=true));
$("noneBtn").addEventListener("click", ()=>document.querySelectorAll(".districtInput").forEach(x=>x.checked=false));
$("generateBtn").addEventListener("click", generateQueries);
$("scrapeBtn").addEventListener("click", scrape);
$("promptBtn").addEventListener("click", makePrompt);
$("copyBtn").addEventListener("click", copyPrompt);

async function showDebug(){
  const data = await api("/api/debug");
  $("debugBox").style.display = "block";
  $("debugBox").textContent = JSON.stringify(data, null, 2);
}
$("debugBtn").addEventListener("click", showDebug);
$("clearBtn").addEventListener("click", clearList);
init();

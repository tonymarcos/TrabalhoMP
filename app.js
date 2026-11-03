"use strict";
const $ = (s, r = document) => r.querySelector(s);
const norm = s => (s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
const pt = x => x.toFixed(1).replace(".", ",");
const p2 = x => x.toFixed(2).replace(".", ",");
const fmt = (n, t) => t ? `${n} (${pt(100 * n / t)}%)` : `${n}`;
const V = "#8C1D40", N = "#5B5F63";
const RM = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
const QM = Object.fromEntries(Q.map(q => [q.id, q]));
let TODOS = [], S = { f: {}, modo: "pct", x: "q1", y: "ia", vis: "g" }, G = [], charts = {}, ULTIMA = "";

// ---------- dados ----------
function parseCSV(txt) {
  const rows = []; let r = [], c = "", q = false;
  for (let i = 0; i < txt.length; i++) {
    const ch = txt[i];
    if (q) { if (ch === '"') { if (txt[i + 1] === '"') { c += '"'; i++; } else q = false; } else c += ch; }
    else if (ch === '"') q = true;
    else if (ch === ",") { r.push(c); c = ""; }
    else if (ch === "\n" || ch === "\r") { if (ch === "\r" && txt[i + 1] === "\n") i++; r.push(c); c = ""; rows.push(r); r = []; }
    else c += ch;
  }
  if (c || r.length) { r.push(c); rows.push(r); }
  return rows.filter(x => x.some(v => v.trim()));
}
function canon(q, v) {
  v = (v || "").trim(); if (!v) return null;
  if (q.order) return q.order.find(o => norm(o) === norm(v)) || "Outro";
  return v.charAt(0).toUpperCase() + v.slice(1).toLowerCase();
}
let faltando = [], inval = 0;
function montar(tab) {
  const H = tab[0].map(norm), ct = H.findIndex(x => x.includes("carimbo")); inval = 0;
  const col = m => H.findIndex(x => x.includes(norm(m)));
  const idx = Object.fromEntries(Q.map(q => [q.id, col(q.match)]));
  const li = LIK.map(l => col(l.match));
  faltando = [...Q.filter(q => idx[q.id] < 0).map(q => q.s), ...LIK.filter((l, i) => li[i] < 0).map(l => l.label)];
  return tab.slice(1).map(l => {
    const r = { t: l[ct < 0 ? 0 : ct] };
    Q.forEach(q => {
      const v = idx[q.id] < 0 ? "" : (l[idx[q.id]] || "");
      r[q.id] = q.multi
        ? [...new Set(v.split(/,\s*/).map(s => s.trim()).filter(Boolean).map(s => q.order.find(o => norm(o) === norm(s)) || "Outra"))]
        : canon(q, v);
      if (q.order && !q.multi && r[q.id] === "Outro" && !q.order.includes("Outro")) inval++;
    });
    r.lik = li.map(i => i < 0 ? null : canon({ order: CONC }, l[i] || ""));
    return r;
  });
}
function dt(s) {
  let m = /(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(s || ""); if (m) return new Date(+m[3], m[2] - 1, +m[1]);
  m = /(\d{4})[\/-](\d{1,2})[\/-](\d{1,2})/.exec(s || ""); return m ? new Date(+m[1], m[2] - 1, +m[3]) : null;
}

// ---------- cálculo ----------
function dist(q, rows) {
  const cont = {}; let total = 0;
  rows.forEach(r => {
    const v = q.multi ? r[q.id] : [r[q.id]].filter(Boolean);
    if (v.length) { total++; v.forEach(x => cont[x] = (cont[x] || 0) + 1); }
  });
  let ks = q.order ? [...q.order] : Object.keys(cont).sort((a, b) => cont[b] - cont[a]);
  if (q.order && cont.Outro && !ks.includes("Outro")) ks.push("Outro");
  if (q.poda) ks = ks.filter(k => cont[k]).sort((a, b) => cont[b] - cont[a]);
  if (q.open && ks.length > 8) {
    cont.Demais = ks.slice(8).reduce((s, k) => s + cont[k], 0);
    ks = [...ks.slice(0, 8), "Demais"];
  }
  return { ks, cont, total };
}
const pick = (q, r, ks) => { const v = r[q.id]; if (!v) return -1; const i = ks.indexOf(v); return i < 0 ? ks.indexOf("Demais") : i; };
const visiveis = () => TODOS.filter(r => Object.entries(S.f).every(([k, v]) => !v || r[k] === v));

// ---------- gráficos ----------
function hx(h) { return [1, 3, 5].map(i => parseInt(h.substr(i, 2), 16)); }
function rampa(n) {
  const P = ["#E38BA7", V, "#2A0813"].map(hx);
  return Array.from({ length: n }, (_, i) => {
    const t = n > 1 ? i / (n - 1) * 2 : 1, s = Math.min(Math.floor(t), 1), f = t - s;
    return "#" + P[s].map((v, j) => Math.round(v + (P[s + 1][j] - v) * f).toString(16).padStart(2, "0")).join("");
  });
}
const LIKCOR = ["#3A3838", "#8E9296", "#D5D8DB", "#D9708F", V];
const PAL = [V, "#3A3838", "#E38BA7", "#8E9296", "#5C0F28", "#C9CDD1", "#B8456B", "#6B7075"], NOM = ["ia", "q1", "q3", "q6", "q12", "q13"];
const rotulos = {
  id: "rotulos",
  beforeDraw(c) { const x = c.ctx; x.save(); x.globalCompositeOperation = "destination-over"; x.fillStyle = "#fff"; x.fillRect(0, 0, c.width, c.height); x.restore(); },
  afterDatasetsDraw(c) {
    const h = c.options.indexAxis === "y";
    if (c.options.scales[h ? "x" : "y"].stacked) return;
    const x = c.ctx; x.save(); x.font = "700 13px 'Public Sans',sans-serif"; x.fillStyle = "#3A3838"; x.textBaseline = "middle";
    c.data.datasets.forEach((d, i) => {
      if (c.getDatasetMeta(i).hidden) return;
      c.getDatasetMeta(i).data.forEach((b, j) => {
        if (!d.raw[j]) return;
        const t = S.modo === "pct" ? pt(d.data[j]) + "%" : String(d.raw[j]);
        if (h) { x.textAlign = "left"; x.fillText(t, b.x + 5, b.y); } else { x.textAlign = "center"; x.fillText(t, b.x, b.y - 9); }
      });
    });
    x.restore();
  },
};
function quebra(s, n = 24) {
  const out = []; let l = "";
  s.split(" ").forEach(w => { if ((l + " " + w).trim().length > n) { out.push(l); l = w; } else l = (l + " " + w).trim(); });
  out.push(l); return out;
}
function opcoes({ h, emp, pct, leg, max, click }) {
  const val = h ? "x" : "y", cat = h ? "y" : "x";
  return {
    indexAxis: h ? "y" : "x", responsive: true, maintainAspectRatio: false, animation: { duration: RM ? 0 : 700, easing: "easeOutQuart" },
    onHover: (e, els) => { e.native.target.style.cursor = click && els.length ? "pointer" : "default"; },
    onClick: (e, els) => { if (click && els.length) click(els[0].index); },
    scales: {
      [val]: { stacked: emp, beginAtZero: true, max, grace: emp ? 0 : "14%", ticks: { precision: 0, callback: v => pct ? v + "%" : v }, grid: { color: "#CFC8CB" } },
      [cat]: { stacked: emp, grid: { display: false } },
    },
    plugins: {
      legend: { display: leg, position: "bottom", labels: { boxWidth: 14, boxHeight: 14, font: { size: 14 }, padding: 14 } },
      tooltip: { callbacks: { label: c => { const d = c.dataset; return `${d.label}: ${fmt(d.raw[c.dataIndex], d.tot[c.dataIndex])}`; } } },
    },
  };
}
function desenhar(id, cfg) { if (charts[id]) charts[id].destroy(); charts[id] = new Chart($("#" + id), { ...cfg, plugins: [rotulos] }); }
const cap = (id, txt) => { $("#cap-" + id).innerHTML = txt; };
const topo = (d) => { const k = d.ks.slice().sort((a, b) => (d.cont[b] || 0) - (d.cont[a] || 0))[0]; return d.total && k ? `Mais frequente: ${k}, ${fmt(d.cont[k], d.total)}.` : ""; };
const base = (rows, d) => d.total ? `n = ${d.total} respostas válidas de ${rows.length} no filtro atual.` : "Sem respostas neste filtro.";

function barra(id, q, rows, h) {
  const d = dist(q, rows), pct = S.modo === "pct", fc = ["q1", "q2", "q3", "q4", "ia"].includes(q.id);
  const raw = d.ks.map(k => d.cont[k] || 0), tot = d.ks.map(() => d.total);
  desenhar(id, { type: "bar", data: { labels: d.ks.map(k => quebra(k)), datasets: [{ label: "Respostas", raw, tot, data: pct ? raw.map(v => d.total ? 100 * v / d.total : 0) : raw, backgroundColor: d.ks.map(k => S.f[q.id] && S.f[q.id] !== k ? "#D4849F" : V), hoverBackgroundColor: "#6E1632" }] }, options: opcoes({ h, pct, leg: false, click: fc ? i => filtrar(q.id, d.ks[i]) : null }) });
  cap(id, `${base(rows, d)} ${topo(d)}${fc ? " Clique em uma barra para filtrar." : ""}${q.multi ? " Várias opções por pessoa: os percentuais são sobre respondentes e somam mais de 100%." : ""}`);
}
function duplo(id, qa, qb, rows) {
  const a = dist(qa, rows), b = dist(qb, rows), pct = S.modo === "pct";
  const ds = (d, q, cor) => { const raw = d.ks.map(k => d.cont[k] || 0); return { label: q.s, raw, tot: d.ks.map(() => d.total), data: pct ? raw.map(v => d.total ? 100 * v / d.total : 0) : raw, backgroundColor: cor }; };
  desenhar(id, { type: "bar", data: { labels: a.ks, datasets: [ds(a, qa, V), ds(b, qb, N)] }, options: opcoes({ pct, leg: true }) });
  cap(id, `${qa.s}: n = ${a.total}. ${qb.s}: n = ${b.total}. Clique na legenda para ocultar uma das séries.`);
}
function cruz(id, qa, qb, rows, h) {
  const A = dist(qa, rows), B = dist(qb, rows), pct = S.modo === "pct";
  A.ks = A.ks.filter(k => A.cont[k]); B.ks = B.ks.filter(k => B.cont[k]);
  const m = A.ks.map(() => B.ks.map(() => 0)); let n = 0;
  rows.forEach(r => { const i = pick(qa, r, A.ks), j = pick(qb, r, B.ks); if (i >= 0 && j >= 0) { m[i][j]++; n++; } });
  const rt = m.map(l => l.reduce((s, v) => s + v, 0)), cor = NOM.includes(qb.id) ? B.ks.map((_, i) => PAL[i % PAL.length]) : rampa(B.ks.length);
  const datasets = B.ks.map((k, j) => { const raw = m.map(l => l[j]); return { label: k, raw, tot: rt, data: pct ? raw.map((v, i) => rt[i] ? 100 * v / rt[i] : 0) : raw, backgroundColor: cor[j], borderColor: "#fff", borderWidth: 2 }; });
  desenhar(id, { type: "bar", data: { labels: A.ks.map((k, i) => quebra(`${k} (n=${rt[i]})`)), datasets }, options: opcoes({ h, emp: true, pct, leg: true, max: pct ? 100 : undefined }) });
  cap(id, `Cada barra é um grupo de "${qa.s}"; as cores são as respostas de "${qb.s}". ${n ? `n = ${n} pessoas responderam às duas perguntas.` : "Sem respostas neste filtro."} Em percentual, cada barra soma 100% do seu grupo; grupos pequenos oscilam muito.`);
}
function mapa(did, qa, qb, rows, ci = did) {
  const A = dist(qa, rows), B = dist(qb, rows), pct = S.modo === "pct";
  A.ks = A.ks.filter(k => A.cont[k]); B.ks = B.ks.filter(k => B.cont[k]);
  const m = A.ks.map(() => B.ks.map(() => 0)); let n = 0;
  rows.forEach(r => { const i = pick(qa, r, A.ks), j = pick(qb, r, B.ks); if (i >= 0 && j >= 0) { m[i][j]++; n++; } });
  const rt = m.map(l => l.reduce((s, v) => s + v, 0));
  const cel = (v, t) => { const p = t ? v / t : 0; return `<td style="background:rgba(140,29,64,${(v ? .14 + p * .86 : 0).toFixed(2)});color:${p > .4 ? "#fff" : "#3A3838"}" title="${fmt(v, t)}">${v ? (pct ? pt(100 * p) + "%" : v) : ""}</td>`; };
  $("#" + did).innerHTML = `<table><thead><tr><th>${qa.s}</th>${B.ks.map(k => `<th>${k}</th>`).join("")}<th>n</th></tr></thead><tbody>${A.ks.map((k, i) => rt[i] ? `<tr><th>${k}</th>${m[i].map(v => cel(v, rt[i])).join("")}<td class="nn">${rt[i]}</td></tr>` : "").join("")}</tbody></table>`;
  cap(ci, `${n ? `n = ${n} pessoas responderam às duas perguntas.` : "Sem respostas neste filtro."} Cada linha soma 100% do seu grupo; quanto mais escura a célula, maior a fatia. Passe o mouse para ver a contagem exata.`);
}
function likert(id, rows) {
  const pct = S.modo === "pct";
  const cont = LIK.map((_, i) => CONC.map(c => rows.filter(r => r.lik[i] === c).length));
  const tot = cont.map(l => l.reduce((s, v) => s + v, 0));
  const datasets = CONC.map((c, j) => { const raw = cont.map(l => l[j]); return { label: c, raw, tot, data: pct ? raw.map((v, i) => tot[i] ? 100 * v / tot[i] : 0) : raw, backgroundColor: LIKCOR[j], borderColor: "#fff", borderWidth: 2 }; });
  desenhar(id, { type: "bar", data: { labels: LIK.map(l => quebra(l.label, 30)), datasets }, options: opcoes({ h: true, emp: true, pct, leg: true, max: pct ? 100 : undefined }) });
  cap(id, `n por afirmação: ${tot.join(", ")}. Cinza = discordância, vinho = concordância.`);
}
function explorador(id, rows) {
  const t = S.vis === "t";
  $("#" + id).parentNode.hidden = t; $("#m-" + id).hidden = !t;
  if (t) mapa("m-" + id, QM[S.x], QM[S.y], rows, id); else cruz(id, QM[S.x], QM[S.y], rows, false);
}

// ---------- página ----------
const SEC = [
  { t: "Quem respondeu", p: "Perfil dos participantes e intensidade de uso. Clique em uma barra para filtrar a página inteira.", g: [
    { k: "barra", q: "q1", h: 1 }, { k: "barra", q: "q2" }, { k: "barra", q: "q4", h: 1 }, { k: "barra", q: "q5" } ] },
  { t: "Quem usa o quê", p: "Cada curso tem suas ferramentas preferidas? Quem usa mais costuma usar qual IA? Os grupos são pequenos, então leia como tendência e confira sempre o n.", g: [
    { k: "barra", q: "ia", h: 1 }, { k: "cruz", a: "ia", b: "q5", tit: "Horas por semana, segundo a IA preferida" },
    { k: "mapa", a: "q1", b: "ia", larg: 1, tit: "Curso × IA preferida: onde cada ferramenta pesa mais" },
    { k: "cruz", a: "q1", b: "q4", larg: 1, tit: "Frequência de uso em cada curso" } ] },
  { t: "Para que serve", p: "Atividades em que a IA entra e a mesma escala de frequência aplicada a três hábitos: aprender, resolver exercícios e conferir o que a IA responde.", g: [
    { k: "barra", q: "q6", h: 1, larg: 1, alto: 1 }, { k: "duplo", a: "q7", b: "q8", tit: "Aprender o que não entendeu × resolver exercícios" }, { k: "barra", q: "q9" },
    { k: "cruz", a: "q8", b: "q9", larg: 1, tit: "Quem resolve exercícios com IA também confere o que recebe?" } ] },
  { t: "Percepção dos estudantes", p: "Concordância com cinco afirmações sobre efeitos da IA, avaliação da própria rotina e do uso em geral.", g: [
    { k: "likert", larg: 1 }, { k: "barra", q: "q11", h: 1 }, { k: "barra", q: "q14", h: 1 },
    { k: "cruz", a: "q4", b: "q14", larg: 1, tit: "Quem usa mais também avalia melhor?" } ] },
  { t: "Benefícios e riscos", p: "O benefício e o risco que cada pessoa considerou principal, e como se combinam.", g: [
    { k: "barra", q: "q12", h: 1 }, { k: "barra", q: "q13", h: 1 }, { k: "cruz", a: "q12", b: "q13", h: 1, larg: 1, alto: 1, tit: "Benefício principal × risco principal" } ] },
  { t: "Cruze duas perguntas", p: "Escolha qualquer par de perguntas de resposta única. A primeira define os grupos (barras ou linhas), a segunda define as cores ou colunas. Alterne entre gráfico e tabela.", g: [ { k: "explorador", larg: 1 } ] },
];
let cid = 0;
function construir() {
  G = []; cid = 0;
  const html = SEC.map((s, n) => `<section id="s${n}"><h2>${s.t}</h2><p class="intro">${s.p}</p><div class="grade">${s.g.map(g => {
    const id = "c" + cid++; G.push({ id, g });
    const tit = g.k === "barra" ? QM[g.q].t : g.k === "duplo" ? `${QM[g.a].s} × ${QM[g.b].s}` : g.k === "cruz" ? `${QM[g.a].s} por ${QM[g.b].s}` : g.k === "likert" ? "Quanto você concorda que a IA..." : "";
    const sel = g.k === "explorador" ? `<div class="sel2">${["x", "y"].map(e => `<label>${e === "x" ? "Barras (grupos)" : "Cores (respostas)"}<select data-e="${e}">${Q.filter(q => !q.multi).map(q => `<option value="${q.id}"${S[e] === q.id ? " selected" : ""}>${q.s}</option>`).join("")}</select></label>`).join("")}<label>Exibir<select data-e="vis"><option value="g"${S.vis === "g" ? " selected" : ""}>Gráfico</option><option value="t"${S.vis === "t" ? " selected" : ""}>Tabela</option></select></label></div>` : "";
    return `<figure class="${g.larg ? "larg" : ""} ${g.alto ? "alto" : ""}"><h3>${g.tit || tit}</h3>${sel}${g.k === "mapa" ? `<div class="mapa" id="${id}"></div>` : `<div class="cv"><canvas id="${id}"></canvas></div>`}${g.k === "explorador" ? `<div class="mapa" id="m-${id}" hidden></div>` : ""}<figcaption id="cap-${id}"></figcaption>${g.k === "mapa" ? "" : `<button class="png" data-id="${id}" type="button">Salvar imagem</button>`}</figure>`;
  }).join("")}</div></section>`).join("");
  $("#conteudo").innerHTML = `<section><h2>Visão geral</h2><dl class="ind" id="ind"></dl><p class="conf" id="conf"></p><div class="destaques"><h3>O que chama atenção<small>Gerado automaticamente a partir das respostas e dos filtros</small></h3><ul id="leit"></ul></div><p class="intro">Cada indicador mostra seu próprio denominador (n), porque nem todas as pessoas responderam a todas as perguntas. Em "rotina melhorou" ficam de fora quem não usava IA antes; em "avaliação positiva", quem não usa IA ou não tem opinião.</p></section><section id="perguntas"><h2>Perguntas que a pesquisa responde</h2><p class="intro">Respostas diretas às perguntas que guiaram a análise. Acompanham os filtros; confira o n em cada gráfico.</p><ol class="perg" id="perg"></ol></section>${html}
  <section id="analise"><h2>Estatísticas descritivas</h2><p class="intro">As respostas em escala viram pontos de 1 a 5 (da menor para a maior intensidade ou concordância). Se média e mediana estão próximas, as respostas se distribuem de forma equilibrada; o desvio-padrão mostra o quanto as pessoas divergem.</p><div class="tabela" id="desc"></div></section>
  <section id="grupos"><h2>Comparação de grupos</h2><p class="intro">Como na análise de uso acadêmico × entretenimento da aula, separamos os participantes em dois grupos e comparamos as médias.</p><div class="tabela" id="grp"></div><p class="obs" id="obs"></p></section>
  <section id="conclusoes"><h2>Conclusões</h2><div class="concl"><div class="cc a"><h3>Conclusões da pesquisa</h3><ul id="conc">${CONCLUSOES.length ? CONCLUSOES.map(c => `<li>${c}</li>`).join("") : "<li>Ainda não escritas. Depois de analisar os dados, adicione as frases em <code>CONCLUSOES</code>, no <code>config.js</code>.</li>"}</ul></div><div class="cc"><h3>Limitações</h3><ul>${LIMITACOES.map(c => `<li>${c}</li>`).join("")}</ul></div></div></section>`;
  $("#conteudo").querySelectorAll("[data-e]").forEach(s => s.onchange = () => { S[s.dataset.e] = s.value; render(); });
  $("#indice").innerHTML = [["perguntas", "Perguntas respondidas"], ...SEC.map((s, n) => ["s" + n, s.t]), ["analise", "Estatísticas"], ["grupos", "Grupos"], ["conclusoes", "Conclusões"]].map(([i, t]) => `<a href="#${i}">${t}</a>`).join("");
  $("#conteudo").querySelectorAll(".png").forEach(b => b.onclick = () => {
    const a = document.createElement("a"); a.href = charts[b.dataset.id].toBase64Image("image/png", 1); a.download = "grafico-" + b.dataset.id + ".png"; a.click();
  });
  const io = "IntersectionObserver" in window && !RM ? new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }), { threshold: .08 }) : null;
  if (io) document.querySelectorAll("figure, section > h2, .perg li").forEach(el => { el.classList.add("rev"); io.observe(el); });
}
function indicadores(rows) {
  const p = (q, ok, ex = []) => {
    const calc = R => { const v = R.filter(r => r[q] && !ex.includes(r[q])); const k = v.filter(r => ok === "melhorou" ? r[q].startsWith("Melhorou") : ok.includes(r[q])).length; return { n: v.length, x: v.length ? 100 * k / v.length : 0 }; };
    const a = calc(rows), g = calc(TODOS);
    return a.n ? [pt(a.x) + "%", `n = ${a.n}` + (rows.length < TODOS.length ? `; geral ${pt(g.x)}%` : "")] : ["–", "sem dados"];
  };
  const L = [
    ["Respostas no filtro", [rows.length, `de ${TODOS.length} no total`]],
    ["Usam IA para estudar", p("q3", ["Sim"])],
    ["Conferem com frequência o que a IA responde", p("q9", ["Frequentemente", "Sempre"])],
    ["Dizem que a rotina melhorou", p("q11", "melhorou", ["Não utilizava Inteligência Artificial anteriormente"])],
    ["Avaliam o uso de IA como positivo", p("q14", ["Positivo", "Muito positivo"], ["Não utilizo Inteligência Artificial para estudar", "Não tenho opinião formada"])],
  ];
  $("#ind").innerHTML = L.map(([a, [b, c]]) => `<div><dt>${a}</dt><dd>${b}</dd><small>${c}</small></div>`).join("");
}
function leituras(rows) {
  const L = [], pc = (k, t) => pt(100 * k / t) + "%";
  const topo1 = q => { const d = dist(q, rows), k = d.ks.slice().sort((a, b) => (d.cont[b] || 0) - (d.cont[a] || 0))[0]; return d.total && k ? { k, n: d.cont[k], t: d.total } : null; };
  const ia = topo1(QM.ia); if (ia) L.push(`IA mais usada: ${ia.k}, citada por ${fmt(ia.n, ia.t)} de quem respondeu.`);
  const us = rows.filter(r => r.q4), dia = us.filter(r => r.q4 === "Todos os dias").length;
  if (us.length) L.push(`${fmt(dia, us.length)} das pessoas que usam IA a usam todos os dias para estudar.`);
  const cs = {}; rows.forEach(r => { if (r.q1 && r.q4) (cs[r.q1] = cs[r.q1] || []).push(r.q4); });
  const rk = Object.entries(cs).filter(([, v]) => v.length >= 5).map(([c, v]) => [c, v.filter(x => x === "Todos os dias").length, v.length]).sort((a, b) => b[1] / b[2] - a[1] / a[2]);
  if (rk.length > 1) { const u = rk[rk.length - 1]; L.push(`Entre os cursos com pelo menos 5 usuários, o maior uso diário está em ${rk[0][0]} (${fmt(rk[0][1], rk[0][2])}) e o menor em ${u[0]} (${fmt(u[1], u[2])}).`); }
  const fr = q => { const v = rows.filter(r => r[q]); return [v.filter(r => ["Frequentemente", "Sempre"].includes(r[q])).length, v.length]; };
  const [a7, n7] = fr("q7"), [a8, n8] = fr("q8");
  if (n7 && n8) L.push(`Usam IA com frequência (frequentemente ou sempre) para aprender o que não entenderam: ${fmt(a7, n7)}; para resolver exercícios: ${fmt(a8, n8)}.`);
  const dep = rows.filter(r => r.q13 === "Tornar-se dependente da ferramenta" && r.q14);
  if (dep.length >= 5) L.push(`Entre quem aponta a dependência como principal risco (n = ${dep.length}), ${pc(dep.filter(r => ["Positivo", "Muito positivo"].includes(r.q14)).length, dep.length)} ainda avalia o uso de IA como positivo.`);
  const al = rows.filter(x => ["Frequentemente", "Sempre"].includes(x.q8) && x.q9);
  if (al.length >= 5) L.push(`Entre quem usa IA com frequência para resolver exercícios (n = ${al.length}), ${pc(al.filter(x => ["Nunca", "Raramente"].includes(x.q9)).length, al.length)} raramente ou nunca confere as respostas.`);
  if (rows.length < 50) L.push(`Amostra pequena (${rows.length} respostas no filtro): leia os percentuais como tendências, não como regra.`);
  $("#leit").innerHTML = L.map(x => `<li>${x}</li>`).join("");
  if (!CONCLUSOES.length) $("#conc").innerHTML = L.slice(0, 3).map(x => `<li>${x}</li>`).join("") + '<li class="nota">Síntese automática. Escreva as suas em CONCLUSOES, no config.js.</li>';
}
const cres = (v, o) => { const i = o.indexOf(v); return v && i >= 0 ? i + 1 : null; };
const ord = (v, o) => { const i = o.indexOf(v); return v && i >= 0 && i <= 4 ? 5 - i : null; };
const VARS = [
  { n: "Frequência de uso de IA para estudar", f: r => ord(r.q4, QM.q4.order) },
  { n: "Uso para aprender o que não entendeu", f: r => cres(r.q7, FREQ) },
  { n: "Uso para resolver exercícios", f: r => cres(r.q8, FREQ) },
  { n: "Conferência das respostas da IA", f: r => cres(r.q9, FREQ) },
  ...LIK.map((l, i) => ({ n: l.label, f: r => cres(r.lik[i], CONC) })),
  { n: "Rotina de estudos (piorou a melhorou)", f: r => ord(r.q11, QM.q11.order) },
  { n: "Avaliação geral do uso", f: r => ord(r.q14, QM.q14.order) },
];
function estat(v) {
  const n = v.length; if (!n) return null;
  const m = v.reduce((s, x) => s + x, 0) / n, md = n % 2 ? v[(n - 1) / 2] : (v[n / 2 - 1] + v[n / 2]) / 2;
  return { n, m, md, min: v[0], max: v[n - 1], dp: n > 1 ? Math.sqrt(v.reduce((s, x) => s + (x - m) ** 2, 0) / (n - 1)) : 0 };
}
function pearson(p) {
  const n = p.length; if (n < 5) return null;
  const mx = p.reduce((s, v) => s + v[0], 0) / n, my = p.reduce((s, v) => s + v[1], 0) / n;
  let sxy = 0, sxx = 0, syy = 0; p.forEach(([x, y]) => { sxy += (x - mx) * (y - my); sxx += (x - mx) ** 2; syy += (y - my) ** 2; });
  return sxx && syy ? sxy / Math.sqrt(sxx * syy) : null;
}
function jsonParaTab(j) {
  if (!Array.isArray(j)) { const v = Object.values(j || {}).find(Array.isArray); return v ? jsonParaTab(v) : []; }
  if (!j.length || Array.isArray(j[0])) return j.map(l => l.map(x => x == null ? "" : String(x)));
  const h = [...new Set(j.flatMap(o => Object.keys(o)))];
  return [h, ...j.map(o => h.map(k => o[k] == null ? "" : Array.isArray(o[k]) ? o[k].join(", ") : String(o[k])))];
}
async function buscar() {
  const r = await fetch(API_URL, { cache: "no-store" }); if (!r.ok) throw 0;
  const txt = await r.text();
  try { return jsonParaTab(JSON.parse(txt)); } catch { return parseCSV(txt); }
}
function anima() {
  document.querySelectorAll("#ind dd").forEach(el => {
    const fim = el.textContent, alvo = parseFloat(fim.replace(",", ".")); if (isNaN(alvo) || RM) return;
    const suf = fim.replace(/[\d,.]/g, ""), dec = fim.includes(",") ? 1 : 0, t0 = performance.now();
    const passo = t => { const k = Math.min(1, (t - t0) / 700), e = 1 - Math.pow(1 - k, 3); el.textContent = (alvo * e).toFixed(dec).replace(".", ",") + suf; if (k < 1) requestAnimationFrame(passo); };
    requestAnimationFrame(passo);
  });
}
function conferencia() {
  const vistos = new Set(); let dup = 0;
  TODOS.forEach(r => { const k = JSON.stringify([r.q1, r.q2, r.q3, r.ia, r.q4, r.q5, r.q6, r.q7, r.q8, r.q9, r.lik, r.q11, r.q12, r.q13, r.q14]); vistos.has(k) ? dup++ : vistos.add(k); });
  const inc = TODOS.filter(r => !r.q1 || !r.q2 || !r.q3).length, nao = TODOS.filter(r => r.q3 === "Não").length;
  $("#conf").innerHTML = `<b>Conferência dos dados.</b> ${TODOS.length} respostas recebidas; ${dup} idênticas a outra (possíveis duplicatas); ${inc} incompletas nas questões essenciais (curso, período, uso de IA); ${inval} fora da escala; ${nao} não usam IA e por isso não têm respostas sobre uso.`;
}
function descritivas(rows) {
  const L = VARS.map(v => { const e = estat(rows.map(v.f).filter(x => x != null).sort((a, c) => a - c)); return e ? `<tr><th>${v.n}</th><td>${e.n}</td><td>${p2(e.m)}</td><td>${p2(e.md)}</td><td>${e.min}</td><td>${e.max}</td><td>${p2(e.dp)}</td></tr>` : ""; });
  $("#desc").innerHTML = `<table class="tab"><thead><tr><th>Variável (1 a 5)</th><th>n</th><th>Média</th><th>Mediana</th><th>Mín.</th><th>Máx.</th><th>Desvio-padrão</th></tr></thead><tbody>${L.join("")}</tbody></table>`;
}
function grupos(rows) {
  const A = rows.filter(r => ["Todos os dias", "Várias vezes por semana"].includes(r.q4)), B = rows.filter(r => r.q4 && !A.includes(r));
  const av = R => estat(R.map(r => ord(r.q14, QM.q14.order)).filter(x => x != null).sort((a, c) => a - c));
  const cf = R => { const c = R.filter(r => r.q9); return c.length ? pt(100 * c.filter(r => ["Frequentemente", "Sempre"].includes(r.q9)).length / c.length) + "%" : "–"; };
  const lin = (nome, R) => { const e = av(R); return `<tr><th>${nome}</th><td>${R.length}</td><td>${e ? p2(e.m) : "–"}</td><td>${cf(R)}</td></tr>`; };
  $("#grp").innerHTML = `<table class="tab"><thead><tr><th>Grupo</th><th>Nº de estudantes</th><th>Avaliação média (1 a 5)</th><th>Conferem com frequência</th></tr></thead><tbody>${lin("A: uso frequente (todos os dias ou várias vezes por semana)", A)}${lin("B: uso ocasional (uma vez por semana ou menos)", B)}</tbody></table>`;
  const a = av(A), c = av(B);
  $("#obs").innerHTML = a && c && a.n >= 3 && c.n >= 3
    ? `<b>Observar:</b> os participantes com uso mais frequente (Grupo A) apresentaram, nesta amostra, avaliação média ${Math.abs(a.m - c.m) < .1 ? "semelhante à" : a.m > c.m ? "superior à" : "inferior à"} dos participantes com uso ocasional (Grupo B): ${p2(a.m)} contra ${p2(c.m)}.<br><b>Mas não escrever:</b> "usar IA com mais frequência causa uma avaliação melhor (ou pior)". A primeira frase descreve uma associação observada; a segunda afirmaria uma causalidade que o estudo não demonstrou.`
    : "Grupos pequenos demais para comparar (são necessárias ao menos 3 pessoas com avaliação em cada grupo).";
}
function listaPerguntas(rows) {
  const P = [], b = x => `<strong>${x}</strong>`, sc = f => rows.map(f).filter(x => x != null).sort((x, y) => x - y);
  const top = d => d.ks.slice().sort((x, y) => (d.cont[y] || 0) - (d.cont[x] || 0))[0];
  const d3 = dist(QM.q3, rows), da = dist(QM.ia, rows), d4 = dist(QM.q4, rows), d6 = dist(QM.q6, rows);
  if (d3.total) P.push(["Quantos estudantes usam IA para estudar?", `${b(fmt(d3.cont.Sim || 0, d3.total))} dos respondentes disseram que usam.`]);
  if (da.total) P.push(["Qual é a IA mais usada?", `${b(top(da))}, citada por ${fmt(da.cont[top(da)], da.total)} de quem usa IA.`]);
  if (d4.total) P.push(["Com que frequência a IA é usada para estudar?", `Resposta mais comum: ${b(top(d4))}. No total, ${b(fmt((d4.cont["Todos os dias"] || 0) + (d4.cont["Várias vezes por semana"] || 0), d4.total))} usam todos os dias ou várias vezes por semana.`]);
  if (d6.total) P.push(["Para que a IA é mais usada?", `${b(top(d6))}, marcada por ${fmt(d6.cont[top(d6)], d6.total)} dos respondentes (cada pessoa podia marcar várias).`]);
  const e7 = estat(sc(VARS[1].f)), e8 = estat(sc(VARS[2].f)), e9 = estat(sc(VARS[3].f));
  if (e7 && e8) P.push(["A IA é mais usada para aprender ou para resolver exercícios?", `Para aprender o que não entendeu: média ${b(p2(e7.m))}. Para resolver exercícios: média ${b(p2(e8.m))} (escala de 1 a 5).`]);
  if (e9) P.push(["As pessoas conferem o que a IA responde?", `Média ${b(p2(e9.m))} e mediana ${b(p2(e9.md))} (escala de 1 a 5): ${Math.abs(e9.m - e9.md) < .3 ? "média e mediana próximas, respostas equilibradas" : "média e mediana distantes, alguns valores puxam a média"}.`]);
  const med = LIK.map((l, i) => ({ n: l.label, e: estat(sc(VARS[4 + i].f)) })).filter(x => x.e).sort((x, y) => y.e.m - x.e.m);
  if (med.length > 1) { const u = med[med.length - 1]; P.push(["Qual efeito da IA recebe mais e menos concordância?", `Mais: ${b(med[0].n)} (média ${p2(med[0].e.m)}). Menos: ${b(u.n)} (média ${p2(u.e.m)}).`]); }
  const pr = rows.map(r => [ord(r.q4, QM.q4.order), ord(r.q14, QM.q14.order)]).filter(p => p[0] != null && p[1] != null), rr = pearson(pr);
  if (rr != null) P.push(["Quem usa mais IA também avalia melhor o seu uso?", `Associação ${Math.abs(rr) < .2 ? "fraca" : Math.abs(rr) < .5 ? "moderada" : "forte"} ${rr >= 0 ? "positiva" : "negativa"} (r = ${p2(rr)}, n = ${pr.length}). É uma associação observada, não uma relação de causa e efeito.`]);
  $("#perg").innerHTML = P.length ? P.map(([q, t]) => `<li><h3>${q}</h3><p>${t}</p></li>`).join("") : "<li><h3>Sem respostas neste filtro</h3></li>";
}
function sync() {
  $("#filtros").querySelectorAll("[data-f]").forEach(s => s.value = S.f[s.dataset.f] || "");
  $("#chips").innerHTML = Object.entries(S.f).filter(([, v]) => v).map(([k, v]) => `<button class="chip" data-k="${k}" type="button" aria-label="Remover filtro ${QM[k].s}">${QM[k].s}: ${v} ×</button>`).join("");
  $("#chips").querySelectorAll(".chip").forEach(b => b.onclick = () => { S.f[b.dataset.k] = ""; sync(); render(); });
}
function filtrar(id, k) {
  if (!k || k === "Demais" || k === "Outro") return;
  S.f[id] = S.f[id] === k ? "" : k; sync(); render();
}
function render() {
  const rows = visiveis();
  $("#cont").textContent = `${rows.length} de ${TODOS.length} respostas`;
  indicadores(rows); anima(); conferencia(); leituras(rows); descritivas(rows); grupos(rows); listaPerguntas(rows);
  G.forEach(({ id, g }) => {
    if (g.k === "barra") barra(id, QM[g.q], rows, g.h);
    else if (g.k === "duplo") duplo(id, QM[g.a], QM[g.b], rows);
    else if (g.k === "cruz") cruz(id, QM[g.a], QM[g.b], rows, g.h);
    else if (g.k === "likert") likert(id, rows);
    else if (g.k === "mapa") mapa(id, QM[g.a], QM[g.b], rows);
    else explorador(id, rows);
  });
}
function filtros() {
  const campos = ["q1", "q2", "q3", "q4", "ia"];
  const opt = id => { const d = dist(QM[id], TODOS); return d.ks.filter(k => d.cont[k]).map(k => `<option>${k}</option>`).join(""); };
  $("#filtros").innerHTML = `<div class="fi">${campos.map(id => `<label>${QM[id].s}<select data-f="${id}"><option value="">Todos</option>${opt(id)}</select></label>`).join("")}<label>Valores<select id="modo"><option value="pct">Percentuais</option><option value="n">Absolutos</option></select></label><button id="reset" type="button">Restaurar filtros</button><div id="chips"></div><output id="cont" aria-live="polite"></output></div>`;
  $("#filtros").querySelectorAll("[data-f]").forEach(s => s.onchange = () => { S.f[s.dataset.f] = s.value; sync(); render(); });
  $("#modo").onchange = e => { S.modo = e.target.value; render(); };
  $("#reset").onclick = () => { S.f = {}; S.modo = "pct"; $("#modo").value = "pct"; sync(); render(); };
}
function iniciar(tab, erro, manter) {
  Object.values(charts).forEach(c => c.destroy()); charts = {}; if (!manter) S.f = {};
  TODOS = tab && tab.length > 1 ? montar(tab) : [];
  if (!TODOS.length) {
    $("#filtros").innerHTML = ""; $("#coleta").textContent = "Sem dados carregados.";
    $("#conteudo").innerHTML = `<section><h2>Aguardando dados</h2><div class="vazio"><p>${erro || "Nenhuma planilha conectada."} Para exibir os resultados:</p><ul><li>Vincule o Google Forms a uma planilha.</li><li>Publique a aba de respostas na web, em formato CSV.</li><li>Cole o link em <code>SHEET_CSV_URL</code>, no <code>config.js</code>. Ou escolha um CSV exportado no campo ao fim da página.</li></ul></div></section>`;
    return;
  }
  const ds = TODOS.map(r => dt(r.t)).filter(Boolean).sort((a, b) => a - b), f = d => d.toLocaleDateString("pt-BR");
  $("#coleta").textContent = `${TODOS.length} respostas${ds.length ? `, coletadas de ${f(ds[0])} a ${f(ds[ds.length - 1])}` : ""}.${faltando.length ? ` Colunas não encontradas na planilha: ${faltando.join("; ")}.` : ""}`;
  filtros(); sync(); construir(); render();
  if (API_URL) $("#coleta").textContent += ` Atualizado às ${new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}.`;
}
async function boot() {
  $("#titulo").textContent = PESQUISA.titulo; $("#descricao").textContent = PESQUISA.descricao;
  $("#proj").innerHTML = [["Pergunta de pesquisa", PESQUISA.pergunta], ["Objetivo", PESQUISA.objetivo], ["Método", PESQUISA.metodo]].map(([t, d]) => `<div><dt>${t}</dt><dd>${d}</dd></div>`).join("");
  Chart.defaults.font.family = "'Public Sans', system-ui, sans-serif"; Chart.defaults.font.size = window.innerWidth < 720 ? 12 : 14; Chart.defaults.color = "#2B2929";
  Chart.defaults.elements.bar.borderRadius = 2;
  Object.assign(Chart.defaults.plugins.tooltip, { backgroundColor: "#3A3838", padding: 10, cornerRadius: 4, boxPadding: 4, titleFont: { size: 14, weight: "600" }, bodyFont: { size: 14 } });
  Object.assign(Chart.defaults.plugins.legend.labels, { usePointStyle: true, pointStyle: "rectRounded" });
  $("#arq").onchange = async e => { const f = e.target.files[0]; if (f) { ULTIMA = null; iniciar(parseCSV(await f.text())); } };
  if (!API_URL) return iniciar(null);
  const carregar = async manter => {
    if (ULTIMA === null) return;
    try { const tab = await buscar(), sig = JSON.stringify(tab); if (sig !== ULTIMA) { ULTIMA = sig; iniciar(tab, null, manter); } }
    catch { if (!manter) iniciar(null, "Não foi possível ler os dados. Confira a URL e se a implantação do Apps Script permite acesso a qualquer pessoa."); }
  };
  await carregar(false);
  if (ATUALIZAR_A_CADA > 0) setInterval(() => carregar(true), ATUALIZAR_A_CADA * 1000);
}
boot();

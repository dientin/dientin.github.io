const VERSION = document.querySelector("meta[name=app-version]").content;
const { firebaseConfig, cloudinary, agenda } = await import(`./config.js?v=${VERSION}`);

const { start: START, end: END, step: STEP } = agenda;
const TRATS = ["Consulta", "Limpieza", "Arreglo / caries", "Endodoncia", "Extracción", "Ortodoncia", "Blanqueamiento", "Implante", "Urgencia", "Otro"];
const cap = { pendiente: "Pendiente", confirmado: "Confirmado", atendido: "Atendido", cancelado: "Cancelado" };

const ADMIN = "dientinturnero@gmail.com";
let turnos = [], pacientes = [], usuarios = [], store = null, me = "", logout = () => {};
let current = iso(new Date()), editId = null, editP = null, filtro = "todos", view = "agenda";
let calMes = monthOf(current), calSel = null;

const $ = id => document.getElementById(id);
function iso(d) { const p = n => String(n).padStart(2, "0"); return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate()); }
function monthOf(s) { const d = new Date(s + "T12:00"); return new Date(d.getFullYear(), d.getMonth(), 1); }
const mins = h => { const [a, b] = h.split(":").map(Number); return a * 60 + b; };
const hhmm = m => String(Math.floor(m / 60)).padStart(2, "0") + ":" + String(m % 60).padStart(2, "0");
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const fd = d => d.split("-").reverse().join("/");
const fh = s => new Date(s).toLocaleString("es-AR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
const largo = s => new Date(s + "T12:00").toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" });
const hoyISO = () => iso(new Date());
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

/* ---------- UI base: toasts, ripple, diálogos, confirmación ---------- */
function toast(msg, bad) {
  const t = document.createElement("div");
  t.className = "toast" + (bad ? " bad" : ""); t.innerHTML = `<svg class="i" aria-hidden="true"><use href="#i-${bad ? "alert" : "check"}"/></svg>`; t.append(msg); $("toasts").append(t);
  setTimeout(() => { t.classList.add("out"); setTimeout(() => t.remove(), 300); }, 2600);
}
document.addEventListener("pointerdown", e => {
  const b = e.target.closest(".btn"); if (!b) return;
  const r = b.getBoundingClientRect(), s = Math.max(r.width, r.height) * 2, span = document.createElement("span");
  span.className = "ripple"; span.style.cssText = `width:${s}px;height:${s}px;left:${e.clientX - r.left - s / 2}px;top:${e.clientY - r.top - s / 2}px`;
  b.append(span); setTimeout(() => span.remove(), 600);
});
function closeDlg(d) { d.classList.add("closing"); setTimeout(() => { d.close(); d.classList.remove("closing"); }, 180); }
document.querySelectorAll("[data-close]").forEach(b => b.onclick = () => closeDlg(b.closest("dialog")));
function ask(msg, yes = "Eliminar") {
  $("askMsg").textContent = msg; $("askYes").textContent = yes; $("dask").showModal();
  return new Promise(ok => { $("askYes").onclick = () => { closeDlg($("dask")); ok(true); }; $("askNo").onclick = () => { closeDlg($("dask")); ok(false); }; });
}

/* ---------- Selectores segmentados (todos los chips) ---------- */
const val = el => el.dataset.value ?? "";
function setSeg(el, v) { el.dataset.value = v; el.querySelectorAll("button[data-v]").forEach(b => b.setAttribute("aria-pressed", b.dataset.v === String(v))); }
function seg(el, onChange) {
  setSeg(el, el.querySelector("[aria-pressed=true]")?.dataset.v ?? "");
  el.addEventListener("click", e => { const b = e.target.closest("button[data-v]"); if (b && !b.disabled) { setSeg(el, b.dataset.v); onChange?.(b.dataset.v); } });
}

/* ---------- Selector de fecha (uno para toda la app) ---------- */
const pk = { anchor: null, value: "", cb: null, y: 0, m: 0, years: false };
function openPicker(anchor, value, cb) {
  const d = value ? new Date(value + "T12:00") : new Date();
  Object.assign(pk, { anchor, value, cb, y: d.getFullYear(), m: d.getMonth(), years: false });
  const p = $("picker");
  (anchor.closest("dialog") || document.body).append(p); // dentro del diálogo modal, si no queda inerte
  p.classList.remove("hide"); drawPicker();
  const r = anchor.getBoundingClientRect(), h = p.offsetHeight;
  p.style.left = Math.min(Math.max(8, r.left), innerWidth - 308) + "px";
  p.style.top = (r.bottom + h + 8 > innerHeight ? Math.max(8, r.top - h - 6) : r.bottom + 6) + "px";
}
const closePicker = () => $("picker").classList.add("hide");
function drawPicker() {
  const g = $("pkGrid");
  g.classList.toggle("years", pk.years);
  if (pk.years) {
    const y0 = pk.y - (pk.y % 12);
    $("pkTitle").textContent = `${y0} – ${y0 + 11}`;
    g.innerHTML = Array.from({ length: 12 }, (_, i) => `<button data-y="${y0 + i}" aria-pressed="${pk.value.startsWith(y0 + i)}">${y0 + i}</button>`).join("");
    return;
  }
  $("pkTitle").textContent = new Date(pk.y, pk.m, 1).toLocaleDateString("es-AR", { month: "long", year: "numeric" });
  const first = (new Date(pk.y, pk.m, 1).getDay() + 6) % 7, n = new Date(pk.y, pk.m + 1, 0).getDate();
  let h = ["L", "M", "M", "J", "V", "S", "D"].map(d => `<div class="dow">${d}</div>`).join("") + "<div></div>".repeat(first);
  for (let d = 1; d <= n; d++) {
    const k = iso(new Date(pk.y, pk.m, d));
    h += `<button data-d="${k}" class="${k === hoyISO() ? "today" : ""}" aria-pressed="${k === pk.value}">${d}</button>`;
  }
  g.innerHTML = h;
}
$("picker").addEventListener("click", e => {
  const b = e.target.closest("button"); if (!b) return;
  if (b.dataset.pk) { if (pk.years) pk.y += 12 * b.dataset.pk; else { const d = new Date(pk.y, pk.m + +b.dataset.pk, 1); pk.y = d.getFullYear(); pk.m = d.getMonth(); } }
  else if (b.id === "pkTitle") pk.years = !pk.years;
  else if (b.dataset.y) { pk.y = +b.dataset.y; pk.years = false; }
  else if (b.dataset.d) { closePicker(); pk.cb(b.dataset.d); return; }
  drawPicker();
});
["scroll", "resize"].forEach(ev => addEventListener(ev, e => { if (!e.target.closest?.("#picker")) closePicker(); }, true));
document.addEventListener("pointerdown", e => {
  if (!$("picker").classList.contains("hide") && !e.target.closest("#picker") && e.target !== pk.anchor) closePicker();
});
// Botones de fecha dentro de formularios: guardan el valor en data-value
function setDate(btn, v) { btn.dataset.value = v || ""; btn.textContent = v ? largo(v) + " " + v.slice(0, 4) : (btn.dataset.empty || "Elegir fecha"); }
document.querySelectorAll("[data-date]").forEach(b => b.onclick = () => openPicker(b, b.dataset.value, v => { setDate(b, v); b.dispatchEvent(new Event("change")); }));

/* ---------- Datos ---------- */
function localStore() {
  // modo demo: sin Firebase configurado, todo queda en este navegador
  const K = "dientin-demo", subs = {};
  const data = (() => { try { return JSON.parse(localStorage.getItem(K)) || {}; } catch { return {}; } })();
  const save = c => { try { localStorage.setItem(K, JSON.stringify(data)); } catch {} subs[c]?.(Object.values(data[c] || {})); };
  return {
    put: async (c, o) => { (data[c] ||= {})[o.id] = o; save(c); },
    drop: async (c, id) => { delete data[c]?.[id]; save(c); },
    watch: (c, cb) => { subs[c] = cb; cb(Object.values(data[c] || {})); },
  };
}
async function put(c, o) { try { await store.put(c, o); } catch (e) { toast("No se pudo guardar. Revisá tu conexión.", true); throw e; } }
async function drop(c, id) { try { await store.drop(c, id); } catch (e) { toast("No se pudo eliminar.", true); throw e; } }
const stamp = prev => { const now = new Date().toISOString(); return { cre: prev.cre || me, creAt: prev.creAt || now, mod: me, modAt: now }; };
function audit(t) {
  if (!t.cre) return "";
  return `Cargó <b>${esc(t.cre)}</b> (${fh(t.creAt)})` + (t.modAt !== t.creAt ? ` · Modificó <b>${esc(t.mod)}</b> (${fh(t.modAt)})` : "");
}
const activo = t => t.est !== "cancelado";
const choca = (t, x) => x.id !== t.id && x.dia === t.dia && activo(x) && mins(x.hora) < mins(t.hora) + t.dur && mins(x.hora) + x.dur > mins(t.hora);
const turnoFuturo = p => turnos.filter(t => t.pid === p.id && (t.est === "pendiente" || t.est === "confirmado") && t.dia >= hoyISO()).sort((a, b) => (a.dia + a.hora).localeCompare(b.dia + b.hora))[0];
const ultimo = p => turnos.filter(t => t.pid === p.id && t.est === "atendido").sort((a, b) => (b.dia + b.hora).localeCompare(a.dia + a.hora))[0];
const cobTxt = p => !p.cob ? "Cobertura sin cargar" : p.cob === "particular" ? "Particular" : (p.cob === "prepaga" ? "Prepaga" : "Obra social") + (p.ent ? " " + esc(p.ent) : "") + (p.afil ? " · afiliado " + esc(p.afil) : "");
function cobCorta(t) { const p = pacientes.find(x => x.id === t.pid); return p?.cob ? " · " + (p.cob === "particular" ? "Particular" : esc(p.ent || (p.cob === "prepaga" ? "Prepaga" : "Obra social"))) : ""; }

/* ---------- Render ---------- */
const stat = (n, txt, c = "") => `<div class="stat ${c}"><b>${n}</b><span>${txt}</span></div>`;
function card(t, showDate, i = 0) {
  return `<button class="appt s-${t.est}" data-id="${t.id}" style="--i:${Math.min(i, 12)}"><div class="top-row"><span class="name">${esc(t.nombre)}</span><span class="tag">${cap[t.est]}</span></div>
  <div class="sub">${showDate ? fd(t.dia) + " · " : ""}${t.hora} · ${esc(t.trat)} · ${t.dur} min${t.tel ? " · " + esc(t.tel) : ""}${cobCorta(t)}</div>
  ${t.notas ? `<div class="sub">${esc(t.notas)}</div>` : ""}</button>`;
}
function render() {
  ({ agenda: renderA, calendario: renderC, pacientes: renderP, equipo: renderU })[view]();
  $("plst").innerHTML = pacientes.map(p => `<option value="${esc(p.nombre)}">`).join("");
}
function renderA() {
  $("fechaBtn").textContent = largo(current) + (current === hoyISO() ? " · hoy" : "");
  const q = $("buscar").value.trim().toLowerCase(), v = $("vista");
  if (q) {
    const r = turnos.filter(t => (t.nombre + " " + (t.tel || "")).toLowerCase().includes(q)).sort((a, b) => (b.dia + b.hora).localeCompare(a.dia + a.hora));
    $("stats").innerHTML = "";
    v.innerHTML = r.length ? r.map((t, i) => card(t, true, i)).join("") : `<p class="empty">No hay turnos para esa búsqueda.</p>`;
    return;
  }
  const del = turnos.filter(t => t.dia === current).sort((a, b) => a.hora.localeCompare(b.hora)), act = del.filter(activo);
  $("stats").innerHTML = stat(act.length, "turnos") + stat(del.filter(t => t.est === "confirmado").length, "confirmados", "c-conf") + stat(del.filter(t => t.est === "pendiente").length, "sin confirmar", "c-pend") + stat(del.filter(t => t.est === "atendido").length, "atendidos", "c-done");
  let html = "", i = 0;
  for (let m = START; m < END; m += STEP) {
    if (act.some(x => mins(x.hora) < m && mins(x.hora) + x.dur > m)) continue;
    const here = del.filter(x => mins(x.hora) >= m && mins(x.hora) < m + STEP);
    const libre = !here.some(activo);
    html += `<div class="slot" style="--i:${Math.min(i++, 12)}"><div class="time">${hhmm(m)}</div><div>${here.map(t => card(t)).join("")}${libre ? `<button class="free" data-new="${hhmm(m)}">Libre · tocá para agendar</button>` : ""}</div></div>`;
  }
  const fuera = del.filter(t => mins(t.hora) < START || mins(t.hora) >= END);
  if (fuera.length) html += `<p class="section-t">Fuera del horario habitual</p>` + fuera.map(t => card(t)).join("");
  v.innerHTML = html;
}
function renderC() {
  const y = calMes.getFullYear(), m = calMes.getMonth(), fil = val($("cfil"));
  $("cmes").textContent = calMes.toLocaleDateString("es-AR", { month: "long", year: "numeric" });
  const pre = y + "-" + String(m + 1).padStart(2, "0"), mes = turnos.filter(t => t.dia.startsWith(pre)), c = e => mes.filter(t => t.est === e).length;
  $("cstats").innerHTML = stat(mes.length - c("cancelado"), "turnos en el mes") + stat(c("confirmado"), "confirmados", "c-conf") + stat(c("pendiente"), "sin confirmar", "c-pend") + stat(c("atendido"), "atendidos", "c-done") + stat(c("cancelado"), "cancelados", "c-canc");
  const ok = t => fil === "todos" ? activo(t) : t.est === fil;
  const first = (new Date(y, m, 1).getDay() + 6) % 7, dias = new Date(y, m + 1, 0).getDate();
  let h = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map(d => `<div class="dow">${d}</div>`).join("") + "<div></div>".repeat(first);
  for (let d = 1; d <= dias; d++) {
    const k = pre + "-" + String(d).padStart(2, "0"), ts = mes.filter(t => t.dia === k && ok(t));
    const pend = fil === "todos" ? ts.filter(t => t.est === "pendiente").length : 0;
    const pills = (ts.length ? `<span class="pill${fil === "todos" ? "" : " x s-" + fil}">${ts.length}</span>` : "") + (pend ? `<span class="pill p">${pend}</span>` : "");
    h += `<button class="cell${k === hoyISO() ? " today" : ""}${k === calSel ? " sel" : ""}" data-d="${k}" aria-label="${d}: ${ts.length} turnos${pend ? ", " + pend + " sin confirmar" : ""}"><b>${d}</b><span class="pills">${pills}</span></button>`;
  }
  $("cgrid").innerHTML = h;
  if (!calSel) { $("cdet").innerHTML = `<p class="empty">Tocá un día para ver sus turnos. Verde: turnos · naranja: sin confirmar.</p>`; return; }
  const ds = turnos.filter(t => t.dia === calSel && ok(t)).sort((a, b) => a.hora.localeCompare(b.hora));
  $("cdet").innerHTML = `<div class="det-head"><b>${largo(calSel)}</b><span class="acts"><button class="btn soft" data-go>Ver agenda del día</button><button class="btn primary" data-add>Agendar turno</button></span></div>`
    + `<div class="list">${ds.length ? ds.map((t, i) => card(t, false, i)).join("") : `<p class="empty">No hay turnos para este día con el filtro elegido.</p>`}</div>`;
}
function renderP() {
  const con = pacientes.filter(turnoFuturo), sin = pacientes.filter(p => !turnoFuturo(p));
  $("pfil").querySelectorAll("[data-n]").forEach(s => s.textContent = { todos: pacientes, con, sin }[s.dataset.n].length);
  const q = $("bp").value.trim().toLowerCase(), cob = val($("bcob"));
  const l = (filtro === "con" ? con : filtro === "sin" ? sin : pacientes)
    .filter(p => [p.nombre, p.tel, p.dni, p.ent, p.afil].join(" ").toLowerCase().includes(q))
    .filter(p => !cob || (cob === "-" ? !p.cob : p.cob === cob))
    .sort((a, b) => a.nombre.localeCompare(b.nombre));
  $("plist").innerHTML = l.length ? l.map((p, i) => {
    const t = turnoFuturo(p), u = ultimo(p);
    return `<button class="appt pac ${t ? "con" : "sin"}" data-pid="${p.id}" style="--i:${Math.min(i, 12)}"><div class="top-row"><span>${esc(p.nombre)}</span><span class="tag">${t ? "Con turno" : "Sin turno"}</span></div>
    <div class="sub">${t ? "Próximo: " + fd(t.dia) + " " + t.hora + " · " + esc(t.trat) : "Todavía no tiene turno"}${u ? " · Última visita: " + fd(u.dia) : ""}</div>
    <div class="sub">${cobTxt(p)} · ${esc(p.tel || "Sin teléfono")}${p.media?.length ? " · " + p.media.length + " archivos" : ""}${p.motivo ? " · " + esc(p.motivo) : ""}</div></button>`;
  }).join("") : `<p class="empty">No hay pacientes en esta lista. Agregá uno con “Nuevo paciente”.</p>`;
}

/* ---------- Navegación ---------- */
function tab(v) {
  view = v; setSeg($("tabs"), v);
  ["agenda", "calendario", "pacientes", "equipo"].forEach(n => $("v-" + n).classList.toggle("hide", n !== v));
  $("nuevoTxt").textContent = v === "pacientes" ? "Nuevo paciente" : "Nuevo turno";
  if (v === "calendario") { calMes = monthOf(current); calSel = current; }
  render();
}
seg($("tabs"), tab);
$("nuevo").onclick = () => view === "pacientes" ? openP(null) : open(null);
const shift = n => { const d = new Date(current + "T12:00"); d.setDate(d.getDate() + n); current = iso(d); render(); };
$("prev").onclick = () => shift(-1); $("next").onclick = () => shift(1);
$("hoy").onclick = () => { current = hoyISO(); $("buscar").value = ""; render(); };
$("fechaBtn").onclick = () => openPicker($("fechaBtn"), current, v => { current = v; render(); });
$("buscar").oninput = render;
$("vista").onclick = e => { const a = e.target.closest(".appt"), n = e.target.closest("[data-new]"); if (a) open(turnos.find(x => x.id === a.dataset.id)); else if (n) open(null, n.dataset.new); };
const moveMes = n => { calMes = new Date(calMes.getFullYear(), calMes.getMonth() + n, 1); renderC(); };
$("cprev").onclick = () => moveMes(-1); $("cnext").onclick = () => moveMes(1);
$("choy").onclick = () => { current = calSel = hoyISO(); calMes = monthOf(current); renderC(); };
seg($("cfil"), renderC);
$("cgrid").onclick = e => { const b = e.target.closest("[data-d]"); if (b) { calSel = current = b.dataset.d; renderC(); } };
$("cdet").onclick = e => {
  const a = e.target.closest(".appt");
  if (a) open(turnos.find(x => x.id === a.dataset.id));
  else if (e.target.closest("[data-go]")) tab("agenda");
  else if (e.target.closest("[data-add]")) open(null);
};
$("pfil").innerHTML = [["todos", "Todos"], ["con", "Con turno"], ["sin", "Sin turno"]].map(([k, t]) => `<button data-v="${k}" aria-pressed="${k === filtro}">${t} · <span data-n="${k}">0</span></button>`).join("");
seg($("pfil"), v => { filtro = v; renderP(); });
seg($("bcob"), renderP);
$("bp").oninput = renderP;
$("plist").onclick = e => { const b = e.target.closest("[data-pid]"); if (b) openP(pacientes.find(x => x.id === b.dataset.pid)); };

/* ---------- Turno ---------- */
$("trat").innerHTML = TRATS.map((t, i) => `<button type="button" data-v="${t}" aria-pressed="${!i}">${t}</button>`).join("");
["trat", "est"].forEach(id => seg($(id)));
seg($("dur"), renderSlots);
seg($("tcob"), () => $("tcobrow").classList.toggle("hide", !["obra social", "prepaga"].includes(val($("tcob")))));
$("dia").addEventListener("change", renderSlots);
$("hora").onclick = e => { const b = e.target.closest("button"); if (b && !b.disabled) { setSeg($("hora"), b.dataset.v); $("err").textContent = ""; } };
function renderSlots() {
  const dia = $("dia").dataset.value, dur = +val($("dur")), sel = val($("hora"));
  const hs = []; for (let m = START; m + dur <= END; m += STEP) hs.push(hhmm(m));
  if (sel && !hs.includes(sel)) hs.push(sel), hs.sort();
  $("hora").innerHTML = hs.map(h => {
    const busy = turnos.some(x => choca({ id: editId, dia, hora: h, dur }, x));
    return `<button type="button" data-v="${h}" ${busy ? "disabled" : ""} aria-pressed="${h === sel}">${h}</button>`;
  }).join("");
  if ($("hora").querySelector("[aria-pressed=true][disabled]")) setSeg($("hora"), "");
  else $("hora").dataset.value = sel;
}
function setCobT(p) {
  $("tdni").value = p?.dni || ""; $("tent").value = p?.ent || ""; $("taf").value = p?.afil || "";
  setSeg($("tcob"), p?.cob || ""); $("tcobrow").classList.toggle("hide", !["obra social", "prepaga"].includes(p?.cob));
}
function cobDatos() { const c = val($("tcob")), x = c === "obra social" || c === "prepaga"; return { dni: $("tdni").value.trim(), cob: c, ent: x ? $("tent").value.trim() : "", afil: x ? $("taf").value.trim() : "" }; }
function fillFromPatient() { const n = $("nombre").value.trim().toLowerCase(), p = n && pacientes.find(x => x.nombre.toLowerCase() === n); if (p) { $("tel").value = p.tel || ""; setCobT(p); } }
$("nombre").addEventListener("input", fillFromPatient);
function open(t, hora) {
  editId = t?.id || null;
  $("dt").textContent = t ? "Editar turno" : "Nuevo turno";
  $("nombre").value = t?.nombre || ""; $("tel").value = t?.tel || ""; $("notas").value = t?.notas || "";
  setDate($("dia"), t?.dia || current);
  setSeg($("dur"), String(t?.dur || 30)); setSeg($("trat"), t?.trat || "Consulta"); setSeg($("est"), t?.est || "pendiente");
  $("hora").dataset.value = t?.hora || hora || ""; renderSlots();
  setCobT(t ? pacientes.find(x => x.id === t.pid) : null);
  $("err").textContent = ""; $("aud").innerHTML = t ? audit(t) : ""; $("del").hidden = $("wa").hidden = !t;
  $("dlg").showModal(); if (!t) $("nombre").focus();
}
$("f").addEventListener("submit", async e => {
  e.preventDefault();
  const nombre = $("nombre").value.trim(), prev = turnos.find(x => x.id === editId) || {};
  const t = { ...prev, id: editId || uid(), nombre, tel: $("tel").value.trim(), dia: $("dia").dataset.value, hora: val($("hora")), trat: val($("trat")), dur: +val($("dur")), est: val($("est")), notas: $("notas").value.trim(), ...stamp(prev) };
  if (!t.hora) { $("err").textContent = "Elegí un horario."; return; }
  const c = activo(t) && turnos.find(x => choca(t, x));
  if (c) { $("err").textContent = `Se superpone con el turno de ${c.nombre} (${c.hora}).`; return; }
  try {
    let p = pacientes.find(x => x.id === prev.pid) || pacientes.find(x => x.nombre.toLowerCase() === nombre.toLowerCase());
    const d = { tel: t.tel || p?.tel || "", ...cobDatos() };
    if (!p) { p = { id: "p" + uid(), nombre, motivo: "", media: [], ...d, ...stamp({}) }; await put("pacientes", p); }
    else if (Object.keys(d).some(k => (d[k] || "") !== (p[k] || ""))) await put("pacientes", { ...p, ...d, ...stamp(p) });
    t.pid = p.id; await put("turnos", t);
  } catch { return; }
  current = t.dia; closeDlg($("dlg")); toast(editId ? "Turno actualizado" : "Turno agendado"); render();
});
$("del").onclick = async () => { if (await ask("¿Eliminar este turno?")) { try { await drop("turnos", editId); } catch { return; } closeDlg($("dlg")); toast("Turno eliminado"); render(); } };
$("wa").onclick = () => {
  const t = turnos.find(x => x.id === editId); if (!t) return;
  let n = (t.tel || "").replace(/\D/g, ""); if (!n) { $("err").textContent = "Cargá un teléfono para enviar el aviso."; return; }
  if (!n.startsWith("54")) n = "549" + n.replace(/^0/, "").replace(/^(\d{2,4})15/, "$1");
  const msg = `Hola ${t.nombre}, te recordamos tu turno en el consultorio el ${largo(t.dia)} a las ${t.hora}. ¿Podés confirmarlo? ¡Gracias!`;
  window.open("https://wa.me/" + n + "?text=" + encodeURIComponent(msg), "_blank", "noopener");
};

/* ---------- Paciente ---------- */
seg($("pcob"), v => $("pcobrow").classList.toggle("hide", !["obra social", "prepaga"].includes(v)));
function openP(p) {
  editP = p?.id || null; $("dpt").textContent = p ? "Editar paciente" : "Nuevo paciente";
  $("pn").value = p?.nombre || ""; $("pt").value = p?.tel || ""; $("pm").value = p?.motivo || "";
  $("pdni").value = p?.dni || ""; $("pem").value = p?.email || ""; setDate($("pfn"), p?.fnac);
  setSeg($("pcob"), p?.cob || ""); $("pent").value = p?.ent || ""; $("paf").value = p?.afil || "";
  $("pcobrow").classList.toggle("hide", !["obra social", "prepaga"].includes(p?.cob));
  $("paud").innerHTML = p ? audit(p) : ""; $("pdel").hidden = $("pturno").hidden = !p;
  drawMedia(); $("dp").showModal(); if (!p) $("pn").focus();
}
$("fp").addEventListener("submit", async e => {
  e.preventDefault();
  const prev = pacientes.find(x => x.id === editP) || {}, cob = val($("pcob")), x = cob === "obra social" || cob === "prepaga";
  const p = { media: [], ...prev, id: editP || "p" + uid(), nombre: $("pn").value.trim(), tel: $("pt").value.trim(), motivo: $("pm").value.trim(), dni: $("pdni").value.trim(), fnac: $("pfn").dataset.value, email: $("pem").value.trim(), cob, ent: x ? $("pent").value.trim() : "", afil: x ? $("paf").value.trim() : "", ...stamp(prev) };
  try { await put("pacientes", p); } catch { return; }
  closeDlg($("dp")); toast(editP ? "Paciente actualizado" : "Paciente guardado"); render();
});
$("pdel").onclick = async () => { if (await ask("¿Eliminar este paciente? Sus turnos no se borran.")) { try { await drop("pacientes", editP); } catch { return; } closeDlg($("dp")); toast("Paciente eliminado"); render(); } };
$("pturno").onclick = () => { const p = pacientes.find(x => x.id === editP); closeDlg($("dp")); tab("agenda"); setTimeout(() => { open(null); $("nombre").value = p.nombre; fillFromPatient(); }, 200); };

/* ---------- Fotos y videos (Cloudinary) ---------- */
const thumbUrl = m => m.type === "image" ? m.url.replace("/upload/", "/upload/c_fill,w_240,h_240,q_auto,f_auto/") : m.url;
function drawMedia() {
  const p = pacientes.find(x => x.id === editP), list = p?.media || [];
  const ready = cloudinary.cloudName && cloudinary.uploadPreset;
  $("mediaBox").classList.toggle("hide", !p || !ready); // se sube sobre un paciente ya guardado
  $("media").innerHTML = list.map((m, i) => `<div class="thumb"><a href="${esc(m.url)}" target="_blank" rel="noopener">${m.type === "video" ? `<video src="${esc(m.url)}" preload="metadata" muted></video>` : `<img src="${esc(thumbUrl(m))}" alt="Foto ${i + 1}" loading="lazy">`}</a><button type="button" data-rm="${i}" aria-label="Quitar"><svg class="i" aria-hidden="true"><use href="#i-x"/></svg></button></div>`).join("");
}
function upload(file, onp) {
  return new Promise((ok, ko) => {
    const x = new XMLHttpRequest(), f = new FormData();
    x.open("POST", `https://api.cloudinary.com/v1_1/${cloudinary.cloudName}/auto/upload`);
    x.upload.onprogress = e => onp(e.loaded / e.total);
    x.onload = () => x.status < 300 ? ok(JSON.parse(x.responseText)) : ko(new Error(x.responseText));
    x.onerror = () => ko(new Error("red"));
    f.append("file", file); f.append("upload_preset", cloudinary.uploadPreset); f.append("folder", "dientin");
    x.send(f);
  });
}
$("mfile").onchange = async e => {
  const files = [...e.target.files]; e.target.value = ""; if (!files.length) return;
  const bar = $("mprog"); bar.classList.remove("hide");
  const nuevos = [];
  for (const [i, file] of files.entries()) {
    try {
      const r = await upload(file, f => bar.firstChild.style.width = ((i + f) / files.length * 100) + "%");
      nuevos.push({ url: r.secure_url, type: r.resource_type, at: new Date().toISOString() });
    } catch { toast(`No se pudo subir ${file.name}`, true); }
  }
  bar.classList.add("hide"); bar.firstChild.style.width = "0";
  const p = pacientes.find(x => x.id === editP); if (!p || !nuevos.length) return;
  try { await put("pacientes", { ...p, media: [...(p.media || []), ...nuevos], ...stamp(p) }); } catch { return; }
  toast(nuevos.length + " archivo(s) subido(s)"); drawMedia();
};
$("media").onclick = async e => {
  const b = e.target.closest("[data-rm]"); if (!b) return;
  // shortcut: solo quita la referencia; el archivo queda en Cloudinary (borrar exige firma con API secret, o sea un backend)
  if (!await ask("¿Quitar este archivo de la ficha?", "Quitar")) return;
  const p = pacientes.find(x => x.id === editP);
  try { await put("pacientes", { ...p, media: p.media.filter((_, i) => i !== +b.dataset.rm), ...stamp(p) }); } catch { return; }
  drawMedia();
};

/* ---------- Cuenta ---------- */
$("meBtn").onclick = () => $("meMenu").classList.toggle("hide");
document.addEventListener("pointerdown", e => { if (!e.target.closest("#meMenu,#meBtn")) $("meMenu").classList.add("hide"); });
$("salir").onclick = () => logout();
function applyTheme(t) {
  if (t === "auto") delete document.documentElement.dataset.theme; else document.documentElement.dataset.theme = t;
  document.querySelector("meta[name=theme-color]").content = getComputedStyle(document.body).backgroundColor;
  try { localStorage.setItem("dientin-theme", t); } catch {}
}
setSeg($("theme"), document.documentElement.dataset.theme || "auto");
seg($("theme"), applyTheme);

/* ---------- Equipo (solo admin) ---------- */
function renderU() {
  const l = [...usuarios].sort((a, b) => (a.aprobado - b.aprobado) || (a.nombre || "").localeCompare(b.nombre || ""));
  $("ulist").innerHTML = l.length ? l.map((u, i) => `<div class="urow" style="--i:${Math.min(i, 12)}"><div class="grow"><b>${esc(u.nombre || u.email)}</b><div class="sub">${esc(u.email)} · ${u.aprobado ? "Con acceso" : "Esperando aprobación"}</div></div>
    ${u.aprobado ? `<button class="btn danger" data-uid="${u.id}" data-ok="0">Quitar acceso</button>` : `<button class="btn primary" data-uid="${u.id}" data-ok="1">Aprobar</button>`}</div>`).join("")
    : `<p class="empty">Todavía nadie se registró.</p>`;
}
$("ulist").onclick = async e => {
  const b = e.target.closest("[data-uid]"); if (!b) return;
  const u = usuarios.find(x => x.id === b.dataset.uid), ok = b.dataset.ok === "1";
  if (!ok && !await ask(`¿Quitarle el acceso a ${u.nombre || u.email}?`, "Quitar")) return;
  try { await put("usuarios", { ...u, aprobado: ok }); } catch { return; }
  toast(ok ? "Acceso aprobado" : "Acceso quitado");
};

function startApp(name, photo, admin) {
  me = name;
  $("tabEquipo").classList.toggle("hide", !admin);
  if (admin) store.watch("usuarios", l => { usuarios = l; if (view === "equipo") renderU(); }, () => {});
  $("meName").textContent = name;
  $("meBtn").textContent = photo ? "" : name[0]?.toUpperCase() || "?";
  $("meBtn").style.backgroundImage = photo ? `url("${photo}")` : "";
  $("login").classList.add("hide"); $("app").classList.remove("hide"); $("meMenu").classList.add("hide");
  const onErr = e => { toast("Sin acceso a los datos (" + (e.code || "error") + ")", true); if (e.code === "permission-denied") logout("Esta cuenta no está autorizada en el consultorio."); };
  store.watch("turnos", l => { turnos = l; render(); if ($("dlg").open) renderSlots(); }, onErr);
  store.watch("pacientes", l => { pacientes = l; render(); if ($("dp").open) drawMedia(); }, onErr);
  tab("agenda");
}
function showLogin(msg = "", pending = false) {
  $("app").classList.add("hide"); $("login").classList.remove("hide"); $("loginErr").textContent = msg;
  $("authCard").classList.toggle("hide", pending); $("pending").classList.toggle("hide", !pending);
}
seg($("authMode"), m => {
  $("nameFld").classList.toggle("hide", m === "in"); $("aName").required = m === "up";
  $("aGo").textContent = m === "in" ? "Ingresar" : "Crear cuenta";
  $("aPass").autocomplete = m === "in" ? "current-password" : "new-password"; $("loginErr").textContent = "";
});
const authErr = c => ({
  "auth/invalid-credential": "Email o contraseña incorrectos.", "auth/wrong-password": "Email o contraseña incorrectos.", "auth/user-not-found": "Email o contraseña incorrectos.",
  "auth/email-already-in-use": "Ya existe una cuenta con ese email. Ingresá o recuperá la contraseña.", "auth/weak-password": "La contraseña tiene que tener al menos 6 caracteres.",
  "auth/invalid-email": "El email no es válido.", "auth/too-many-requests": "Demasiados intentos. Probá en unos minutos.",
  "auth/operation-not-allowed": "Este método de ingreso no está activado en Firebase.",
}[c] || "No se pudo ingresar (" + c + ").");

/* ---------- Versiones: avisa si hay una publicada más nueva ---------- */
async function checkVersion() {
  try {
    const r = await fetch("version.json?t=" + Date.now(), { cache: "no-store" });
    if ((await r.json()).v !== VERSION) $("update").classList.remove("hide");
  } catch {}
}
$("updBtn").onclick = async () => {
  try { await fetch("./", { cache: "reload" }); } catch {} // refresca el index.html cacheado por GitHub Pages
  location.reload();
};
if (VERSION !== "0") { checkVersion(); setInterval(checkVersion, 5 * 60e3); }
document.addEventListener("visibilitychange", () => { if (!document.hidden && VERSION !== "0") checkVersion(); });

/* ---------- Arranque ---------- */
if (!firebaseConfig.apiKey || location.search === "?demo") { // ?demo: prueba local sin tocar Firebase
  store = localStore();
  $("banner").hidden = false; $("banner").textContent = "Modo demo: los datos quedan solo en este navegador.";
  startApp("Demo", "", true);
} else {
  const FB = "https://www.gstatic.com/firebasejs/10.12.2/";
  const [{ initializeApp }, A, F] = await Promise.all([import(FB + "firebase-app.js"), import(FB + "firebase-auth.js"), import(FB + "firebase-firestore.js")]);
  const app = initializeApp(firebaseConfig), auth = A.getAuth(app), db = F.getFirestore(app);
  let unsubs = [];
  store = {
    put: (c, o) => F.setDoc(F.doc(db, c, o.id), o),
    drop: (c, id) => F.deleteDoc(F.doc(db, c, id)),
    // shortcut: escucha colecciones completas; si pasan de unos miles de docs, filtrar por rango de fechas
    watch: (c, cb, err) => unsubs.push(F.onSnapshot(F.collection(db, c), s => cb(s.docs.map(d => ({ ...d.data(), id: d.id }))), err)),
  };
  logout = msg => { unsubs.forEach(u => u()); unsubs = []; turnos = pacientes = usuarios = []; A.signOut(auth); showLogin(msg); };
  $("pendOut").onclick = () => logout();
  let regName = "";
  const busy = on => { $("aGo").disabled = $("gLogin").disabled = on; };
  $("authF").addEventListener("submit", async e => {
    e.preventDefault(); $("loginErr").textContent = ""; busy(true);
    const mail = $("aMail").value.trim(), pass = $("aPass").value;
    try {
      if (val($("authMode")) === "up") {
        regName = $("aName").value.trim();
        const c = await A.createUserWithEmailAndPassword(auth, mail, pass);
        await A.updateProfile(c.user, { displayName: regName });
      } else await A.signInWithEmailAndPassword(auth, mail, pass);
    } catch (x) { $("loginErr").textContent = authErr(x.code); }
    busy(false);
  });
  $("gLogin").onclick = () => A.signInWithPopup(auth, new A.GoogleAuthProvider()).catch(e => { if (e.code !== "auth/popup-closed-by-user") $("loginErr").textContent = authErr(e.code); });
  $("aReset").onclick = async () => {
    const mail = $("aMail").value.trim();
    if (!mail) { $("loginErr").textContent = "Escribí tu email arriba y volvé a tocar acá."; return; }
    try { await A.sendPasswordResetEmail(auth, mail); toast("Te mandamos un mail para cambiar la contraseña"); } catch (x) { $("loginErr").textContent = authErr(x.code); }
  };
  A.onAuthStateChanged(auth, async u => {
    if (!u) return showLogin($("loginErr").textContent);
    const name = u.displayName || regName || u.email;
    if (u.email === ADMIN && u.emailVerified) return startApp(name, u.photoURL, true);
    // el resto necesita un perfil en usuarios/{uid} aprobado por el admin
    const ref = F.doc(db, "usuarios", u.uid);
    try {
      const s = await F.getDoc(ref);
      if (!s.exists()) await F.setDoc(ref, { nombre: name, email: u.email, aprobado: false, creAt: new Date().toISOString() });
      if (s.data()?.aprobado) startApp(name, u.photoURL, false); else showLogin("", true);
    } catch (x) { showLogin("No se pudo verificar tu cuenta (" + x.code + ")."); }
  });
}

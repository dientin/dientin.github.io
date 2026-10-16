# Sistema de turnos para consultorio odontológico

Documento de traspaso: describe lo construido hasta ahora para poder continuarlo en otra conversación con Claude o reutilizarlo como HTML. Al final está el código fuente completo.

## 1. Resumen

App web de un solo archivo HTML (JavaScript puro, sin librerías) para gestionar turnos y pacientes de un consultorio odontológico. Pensada para que varias personas (secretaría, odontólogos) trabajen sobre los mismos datos. Idioma de la interfaz: español rioplatense.

Fue publicada como Artifact de claude.ai con las capacidades `db` (base compartida en tiempo real) y `user` (identificar quién hace cada cambio).

## 2. Funcionalidades actuales

### Agenda (vista por día y horario)
- Grilla de 9:00 a 20:00 en bloques de 30 minutos.
- Navegación día anterior / siguiente / Hoy.
- Tocar un horario libre abre el formulario con esa hora cargada.
- Resumen del día: turnos, confirmados, sin confirmar.
- Buscador de turnos por nombre o teléfono.
- Los turnos largos ocupan varios bloques; los cancelados no ocupan lugar.
- Aviso si un turno se superpone con otro.

### Calendario (vista mensual)
- Cuadrícula del mes con, por día, un número verde (turnos) y uno naranja (sin confirmar).
- Resumen del mes: turnos, confirmados, sin confirmar, atendidos, cancelados.
- Filtro por estado (activos, solo sin confirmar, confirmados, atendidos, cancelados).
- Al tocar un día se ve el detalle debajo, con botones "Ver agenda del día" y "Agendar turno".

### Pacientes
- Lista con filtros **Todos / Con turno / Sin turno** (con contadores).
- Con turno: tiene un turno pendiente o confirmado de hoy en adelante. Sin turno: nunca tuvo uno, o los que tuvo fueron atendidos o cancelados.
- Filtro adicional por cobertura (Todas, Particular, Obra social, Prepaga, Sin cargar).
- Buscador por nombre, teléfono, DNI, obra social o número de afiliado.
- Ficha: nombre, teléfono, DNI, fecha de nacimiento, email, cobertura (particular / obra social / prepaga), nombre y plan, número de afiliado, motivo o notas.
- Botón "Dar turno" desde la ficha.
- Se pueden anotar pacientes sin turno (funciona como lista de espera).

### Turnos
- Campos: paciente, teléfono, DNI, cobertura (con nombre/plan y afiliado si es obra social o prepaga), fecha, hora, tratamiento, duración (30 min a 2 h), estado, notas.
- Estados: pendiente, confirmado, atendido, cancelado (cada uno con su color).
- Al escribir el nombre de un paciente existente se completan teléfono, DNI y cobertura. Si se cambian al agendar, la ficha del paciente se actualiza.
- Si el paciente no existe, se crea automáticamente.
- Botón "Avisar por WhatsApp" que arma un mensaje de recordatorio (formato Argentina, `wa.me`).
- La cobertura se muestra en cada turno de la agenda y el calendario.

### Auditoría
- Turnos y pacientes guardan quién los creó, quién los modificó por última vez y cuándo.
- Se muestra como "Cargó: Ana (12/10 14:30) · Última modificación: Luis (15/10 09:12)".
- Se guardan solo ids de usuario; los nombres se resuelven al mostrar.
- Registros anteriores a esta función no tienen autor.

## 3. Modelo de datos

Colecciones en la base compartida (`db`), un documento por registro.

**`turnos/{id}`**
| Campo | Descripción |
|---|---|
| id | identificador generado en el cliente |
| pid | id del paciente |
| nombre, tel | copia de los datos del paciente al momento del turno |
| dia | `YYYY-MM-DD` |
| hora | `HH:MM` |
| trat | tratamiento |
| dur | duración en minutos (30, 60, 90, 120) |
| est | `pendiente`, `confirmado`, `atendido`, `cancelado` |
| notas | texto libre |
| cre, creAt | id de usuario y fecha ISO de creación |
| mod, modAt | id de usuario y fecha ISO de última modificación |

**`pacientes/{id}`**
| Campo | Descripción |
|---|---|
| id | `p` + identificador generado |
| nombre, tel, email, dni, fnac | datos personales (`fnac` = `YYYY-MM-DD`) |
| cob | `""` (sin cargar), `particular`, `obra social`, `prepaga` |
| ent, afil | nombre/plan y número de afiliado (vacíos si es particular) |
| motivo | motivo o notas |
| cre, creAt, mod, modAt | auditoría, igual que en turnos |

## 4. Reglas de negocio
- Un turno no puede superponerse con otro no cancelado el mismo día.
- Un paciente "tiene turno" si existe un turno con estado pendiente o confirmado y fecha mayor o igual a hoy.
- Cobertura "Sin cargar" es el valor por defecto; no se asume "Particular".
- Eliminar un paciente no elimina sus turnos.

## 5. Arquitectura técnica
- Un único archivo HTML con CSS y JS inline. Fuente Figtree desde Google Fonts, con respaldo del sistema.
- Tema claro y oscuro automáticos con variables CSS.
- Sin `<form>` de envío real: formularios en `<dialog>` con manejo de eventos.
- Capa de almacenamiento con dos modos:
  - **Compartido:** `await claude.use("db")` y suscripciones `onSnapshot` a `turnos` y `pacientes` (una sola suscripción por colección).
  - **Local de respaldo:** si `db` no está disponible, usa `localStorage` (claves `turnos-consultorio-v1` y `turnos-consultorio-v1-p`) y muestra un aviso de que los datos no se comparten.
- Usuario: `await claude.use("user")`, `user.id()` y `user.profiles(ids)` para resolver nombres.
- Capacidades declaradas al publicar: `{"db": {}, "user": {"scopes": ["profile"]}}`.

### Publicación y accesos
- Publicado como Artifact de claude.ai. Para que varias personas escriban, hay que invitarlas por mail con nivel **Contributor**. Con nivel Viewer solo pueden mirar.
- Fuera de claude.ai, `db` y `user` no existen: la app funciona en modo local de un solo dispositivo. Para un uso multiusuario fuera de claude.ai habría que reemplazar la capa `put`, `drop` y las suscripciones por un backend propio (por ejemplo Firebase o Supabase).

## 6. Limitaciones conocidas
- No hay roles diferenciados (por ejemplo, secretaría vs. odontólogo con distinto acceso a datos).
- Solo se guarda la última modificación, no un historial completo de cambios.
- Un solo consultorio y una sola agenda (no hay múltiples profesionales ni sillones).
- Horario fijo 9:00 a 20:00 para todos los días.
- Los datos cargados en la primera versión (solo en el navegador) no se migraron a la base compartida.
- No es un sistema de historia clínica ni está validado para datos sensibles de salud. Antes de usarlo con pacientes reales conviene revisar la normativa de protección de datos personales aplicable (en Argentina, Ley 25.326).

## 7. Ideas pendientes
- Varios profesionales o sillones, con agenda por cada uno.
- Horarios distintos por día y bloqueos (feriados, vacaciones).
- Historial completo de cambios por turno.
- Campo de autorización u orden por turno (obras sociales).
- Resumen mensual de turnos por obra social.
- Vista de agenda imprimible.
- Recordatorios automáticos.
- Roles y permisos por tipo de usuario.

## 8. Prompt sugerido para continuar en otra conversación

> Te paso el código de una app de turnos para un consultorio odontológico (un solo archivo HTML) y su documentación. Quiero que la continúes sin reescribirla desde cero: mantené el estilo, la estructura de datos y los nombres de funciones existentes. Si la vas a publicar como Artifact de claude.ai, conservá las capacidades `db` y `user` y el modo local de respaldo. Primero leé el código y confirmame qué entendiste; después hacé este cambio: [DESCRIBIR CAMBIO].

## 9. Código fuente completo

Guardar como `turnos-consultorio.html` y abrir en el navegador.

~~~~html
<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Turnos del consultorio</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Figtree:wght@400;500;700&display=swap">
<style>
:root{--bg:#f2f7f6;--surface:#fff;--ink:#12302f;--muted:#5d7776;--line:#d5e3e1;--brand:#0f5257;--brand-ink:#fff;--free:#e8f1ef;
--pend:#b7791f;--conf:#0f7b55;--done:#4a5fa8;--canc:#b4412f;
box-sizing:border-box;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){--bg:#0e1b1b;--surface:#162726;--ink:#e6f1ef;--muted:#92aeab;--line:#2a4140;--brand:#5cc2c0;--brand-ink:#08201f;--free:#1b2f2e;--pend:#e0a94a;--conf:#4fcf9f;--done:#8da0e6;--canc:#ef8a78}}
:root[data-theme="dark"]{--bg:#0e1b1b;--surface:#162726;--ink:#e6f1ef;--muted:#92aeab;--line:#2a4140;--brand:#5cc2c0;--brand-ink:#08201f;--free:#1b2f2e;--pend:#e0a94a;--conf:#4fcf9f;--done:#8da0e6;--canc:#ef8a78}
*{box-sizing:border-box}html{scroll-padding-top:env(safe-area-inset-top,0px)}
body{margin:0;background:var(--bg);color:var(--ink);font-family:Figtree,system-ui,sans-serif;line-height:1.45}
main{max-width:760px;margin:0 auto;padding:16px}
h1{font-size:1.4rem;margin:0}
header{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:14px}
button,input,select,textarea{font:inherit;color:inherit}
button{cursor:pointer}
:focus-visible{outline:3px solid var(--brand);outline-offset:2px}
.btn{background:var(--brand);color:var(--brand-ink);border:0;border-radius:10px;padding:10px 16px;font-weight:700}
.btn.ghost{background:transparent;color:var(--ink);border:1px solid var(--line)}
.btn.danger{background:transparent;color:var(--canc);border:1px solid var(--canc)}
.nav{display:flex;align-items:center;gap:8px;margin-bottom:10px}
.nav .date{flex:1;text-align:center;font-weight:700;font-size:1.1rem;text-transform:capitalize}
.nav button{min-width:44px}
.stats{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px;color:var(--muted);font-size:.9rem}
.stats b{color:var(--ink)}
input[type=search]{width:100%;padding:10px 12px;border:1px solid var(--line);border-radius:10px;background:var(--surface);margin-bottom:12px}
.slot{display:grid;grid-template-columns:56px 1fr;gap:10px;margin-bottom:6px}
.time{color:var(--muted);font-weight:500;padding-top:12px;font-variant-numeric:tabular-nums}
.free{border:1px dashed var(--line);background:var(--free);border-radius:10px;padding:12px;text-align:left;color:var(--muted);width:100%}
.free:hover{border-color:var(--brand);color:var(--ink)}
.appt{background:var(--surface);border:1px solid var(--line);border-left:6px solid var(--c);border-radius:10px;padding:10px 12px;text-align:left;width:100%;display:block}
.appt .top{display:flex;justify-content:space-between;gap:8px;font-weight:700}
.appt .sub{color:var(--muted);font-size:.9rem}
.tag{color:var(--c);font-size:.8rem;font-weight:700;white-space:nowrap}
.s-pendiente{--c:var(--pend)}.s-confirmado{--c:var(--conf)}.s-atendido{--c:var(--done)}.s-cancelado{--c:var(--canc)}
.s-cancelado .top span:first-child{text-decoration:line-through;opacity:.7}
.results .appt{margin-bottom:8px}
dialog{border:1px solid var(--line);border-radius:14px;background:var(--surface);color:var(--ink);padding:0;width:min(440px,94vw)}
dialog::backdrop{background:rgba(0,0,0,.45)}
form{padding:18px;display:grid;gap:12px}
label{display:grid;gap:4px;font-size:.9rem;font-weight:500}
input,select,textarea{padding:9px 10px;border:1px solid var(--line);border-radius:8px;background:var(--bg)}
.row{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.actions{display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap}
.err{color:var(--canc);font-size:.9rem;min-height:1.2em;margin:0}

.tabs{display:flex;gap:6px;margin-bottom:12px}
.tabs button,.chips button{border:1px solid var(--line);background:transparent;border-radius:999px;padding:7px 14px;font-weight:500}
.tabs button[aria-pressed=true],.chips button[aria-pressed=true]{background:var(--brand);color:var(--brand-ink);border-color:var(--brand)}
.chips{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px}
.banner{font-size:.85rem;color:var(--muted);margin:-6px 0 12px}
.pac{--c:var(--muted)}.pac.con{--c:var(--conf)}.pac.sin{--c:var(--pend)}
.hide{display:none!important}
.cal{display:grid;grid-template-columns:repeat(7,1fr);gap:4px}
.dow{text-align:center;font-size:.8rem;color:var(--muted);padding:4px 0}
.cell{min-height:62px;border:1px solid var(--line);background:var(--surface);border-radius:8px;padding:4px;text-align:left;display:flex;flex-direction:column;gap:3px;min-width:0}
.cell:hover{border-color:var(--brand)}.cell.today{border:2px solid var(--brand)}.cell.sel{background:var(--free)}
.cell b{font-size:.9rem}
.pills{display:flex;gap:3px;flex-wrap:wrap}
.pill{border-radius:999px;padding:0 6px;font-size:.75rem;font-weight:700;color:var(--brand-ink);background:var(--conf)}
.pill.p{background:var(--pend)}.pill.x{background:var(--c)}
#cfil{margin-top:2px}
</style>
</head>
<body>
<main>
  <header>
    <h1>Turnos del consultorio</h1>
    <button class="btn" id="nuevo">Nuevo turno</button>
  </header>
  <div class="banner" id="banner"></div>
  <div class="tabs"><button id="tA" aria-pressed="true">Agenda</button><button id="tC" aria-pressed="false">Calendario</button><button id="tP" aria-pressed="false">Pacientes</button></div>
  <div id="agenda"><div class="nav">
    <button class="btn ghost" id="prev" aria-label="Día anterior">‹</button>
    <div class="date" id="fecha"></div>
    <button class="btn ghost" id="next" aria-label="Día siguiente">›</button>
    <button class="btn ghost" id="hoy">Hoy</button>
  </div>
  <div class="stats" id="stats"></div>
  <input type="search" id="buscar" placeholder="Buscar paciente por nombre o teléfono">
  <div id="vista"></div></div>
  <div id="calendario" class="hide">
    <div class="nav">
      <button class="btn ghost" id="cprev" aria-label="Mes anterior">‹</button>
      <div class="date" id="cmes"></div>
      <button class="btn ghost" id="cnext" aria-label="Mes siguiente">›</button>
      <button class="btn ghost" id="choy">Hoy</button>
    </div>
    <label style="margin-bottom:10px">Mostrar en el calendario<select id="cfil"><option value="todos">Turnos activos</option><option value="pendiente">Solo sin confirmar</option><option value="confirmado">Solo confirmados</option><option value="atendido">Solo atendidos</option><option value="cancelado">Solo cancelados</option></select></label>
    <div class="stats" id="cstats"></div>
    <div class="cal" id="cgrid"></div>
    <p class="banner" style="margin:8px 0 14px">En cada día: el número verde es la cantidad de turnos y el naranja los que están sin confirmar. Tocá un día para ver el detalle.</p>
    <div id="cdet"></div>
  </div>
  <div id="pacientes" class="hide">
    <div class="chips" id="chips"></div>
    <input type="search" id="bp" placeholder="Buscar por nombre, teléfono, DNI u obra social">
    <label style="margin-bottom:12px">Cobertura<select id="bcob"><option value="">Todas</option><option value="particular">Particular</option><option value="obra social">Obra social</option><option value="prepaga">Prepaga</option><option value="-">Sin cargar</option></select></label>
    <div id="plist"></div>
  </div>
</main>

<dialog id="dp">
  <form id="fp" method="dialog">
    <h2 id="dpt" style="margin:0;font-size:1.15rem">Nuevo paciente</h2>
    <label>Nombre y apellido<input id="pn" required autocomplete="off"></label>
    <label>Teléfono<input id="pt" inputmode="tel"></label>
    <div class="row"><label>DNI<input id="pdni" inputmode="numeric"></label><label>Fecha de nacimiento<input type="date" id="pfn"></label></div>
    <label>Email<input type="email" id="pem"></label>
    <label>Cobertura<select id="pcob"><option value="particular">Particular</option><option value="obra social">Obra social</option><option value="prepaga">Prepaga</option></select></label>
    <div class="row hide" id="pcobrow"><label>Nombre y plan<input id="pent" placeholder="Ej: OSDE 210, PAMI"></label><label>N.º de afiliado<input id="paf" inputmode="numeric"></label></div>
    <label>Motivo o notas<textarea id="pm" rows="2" placeholder="Ej: dolor de muela, control anual"></textarea></label>
    <div id="paud"></div>
    <div class="actions">
      <button type="button" class="btn danger" id="pdel" hidden>Eliminar</button>
      <button type="button" class="btn ghost" id="pturno" hidden>Dar turno</button>
      <button type="button" class="btn ghost" id="pcerrar">Cancelar</button>
      <button type="submit" class="btn">Guardar paciente</button>
    </div>
  </form>
</dialog>

<dialog id="dlg">
  <form id="f" method="dialog">
    <h2 id="dt" style="margin:0;font-size:1.15rem">Nuevo turno</h2>
    <label>Paciente<input id="nombre" required autocomplete="off" list="plst"></label><datalist id="plst"></datalist>
    <label>Teléfono (con código de área)<input id="tel" inputmode="tel" placeholder="11 5555 1234"></label>
    <div class="row"><label>DNI<input id="tdni" inputmode="numeric"></label><label>Cobertura<select id="tcob"><option value="">Sin cargar</option><option value="particular">Particular</option><option value="obra social">Obra social</option><option value="prepaga">Prepaga</option></select></label></div>
    <div class="row hide" id="tcobrow"><label>Nombre y plan<input id="tent" placeholder="Ej: OSDE 210, PAMI"></label><label>N.º de afiliado<input id="taf" inputmode="numeric"></label></div>
    <div class="row">
      <label>Fecha<input type="date" id="dia" required></label>
      <label>Hora<input type="time" id="hora" step="900" required></label>
    </div>
    <div class="row">
      <label>Tratamiento
        <select id="trat"><option>Consulta</option><option>Limpieza</option><option>Arreglo / caries</option><option>Endodoncia</option><option>Extracción</option><option>Ortodoncia</option><option>Blanqueamiento</option><option>Urgencia</option><option>Otro</option></select>
      </label>
      <label>Duración
        <select id="dur"><option value="30">30 min</option><option value="60">1 hora</option><option value="90">1 h 30</option><option value="120">2 horas</option></select>
      </label>
    </div>
    <label>Estado
      <select id="est"><option value="pendiente">Pendiente</option><option value="confirmado">Confirmado</option><option value="atendido">Atendido</option><option value="cancelado">Cancelado</option></select>
    </label>
    <label>Notas<textarea id="notas" rows="2"></textarea></label>
    <div id="aud"></div>
    <p class="err" id="err" role="alert"></p>
    <div class="actions">
      <button type="button" class="btn danger" id="del" hidden>Eliminar</button>
      <button type="button" class="btn ghost" id="wa" hidden>Avisar por WhatsApp</button>
      <button type="button" class="btn ghost" id="cerrar">Cancelar</button>
      <button type="submit" class="btn">Guardar turno</button>
    </div>
  </form>
</dialog>

<script>
const START=9*60, END=20*60, STEP=30, KEY="turnos-consultorio-v1";
let turnos=[], pacientes=[], db=null, current=iso(new Date()), editId=null, editP=null, filtro="todos", user=null, meId=null, names={};
try{turnos=JSON.parse(localStorage.getItem(KEY)||"[]");pacientes=JSON.parse(localStorage.getItem(KEY+"-p")||"[]")}catch(e){}
const $=id=>document.getElementById(id);
function persist(){try{localStorage.setItem(KEY,JSON.stringify(turnos));localStorage.setItem(KEY+"-p",JSON.stringify(pacientes))}catch(e){}}
async function put(c,o){
  if(db){try{await db.doc(c+"/"+o.id).set(o)}catch(e){alert("No se pudo guardar. Puede que tu acceso sea de solo lectura.");throw e}return}
  const a=c==="turnos"?turnos:pacientes,i=a.findIndex(x=>x.id===o.id);i<0?a.push(o):a[i]=o;persist();
}
async function drop(c,id){
  if(db){try{await db.doc(c+"/"+id).delete()}catch(e){alert("No se pudo eliminar.");throw e}return}
  if(c==="turnos")turnos=turnos.filter(x=>x.id!==id);else pacientes=pacientes.filter(x=>x.id!==id);persist();
}
const hoyISO=()=>iso(new Date());
function turnoFuturo(p){return turnos.filter(t=>t.pid===p.id&&t.est!=="cancelado"&&t.est!=="atendido"&&t.dia>=hoyISO()).sort((a,b)=>(a.dia+a.hora).localeCompare(b.dia+b.hora))[0]}
function ultimo(p){return turnos.filter(t=>t.pid===p.id&&t.est==="atendido").sort((a,b)=>(b.dia+b.hora).localeCompare(a.dia+a.hora))[0]}
const fd=d=>d.split("-").reverse().join("/");
const fh=s=>new Date(s).toLocaleString("es-AR",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"});
const nm=id=>names[id]||(id&&id===meId?"vos":"otro usuario");
function audit(t){
  if(!t.cre&&!t.mod)return "";
  const a=`Cargó: <b>${esc(nm(t.cre))}</b>${t.creAt?" ("+fh(t.creAt)+")":""}`;
  const m=t.modAt&&t.modAt!==t.creAt?` · Última modificación: <b>${esc(nm(t.mod))}</b> (${fh(t.modAt)})`:"";
  return `<div class="sub">${a}${m}</div>`;
}
async function resolveNames(){
  if(!user)return;
  const ids=[...new Set([...turnos,...pacientes].flatMap(t=>[t.cre,t.mod]).filter(Boolean))].filter(i=>!(i in names));
  if(!ids.length)return;
  ids.forEach(i=>names[i]="");
  try{const ps=await user.profiles(ids);ids.forEach(i=>names[i]=(ps[i]&&ps[i].name)||"");render()}catch(e){}
}
function iso(d){const p=n=>String(n).padStart(2,"0");return d.getFullYear()+"-"+p(d.getMonth()+1)+"-"+p(d.getDate())}
function mins(h){const[a,b]=h.split(":").map(Number);return a*60+b}
function hhmm(m){return String(Math.floor(m/60)).padStart(2,"0")+":"+String(m%60).padStart(2,"0")}
function esc(s){return String(s||"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]))}
function shift(n){const d=new Date(current+"T12:00");d.setDate(d.getDate()+n);current=iso(d);render()}
const cap={pendiente:"Pendiente",confirmado:"Confirmado",atendido:"Atendido",cancelado:"Cancelado"};

function card(t,showDate){
  return `<button class="appt s-${t.est}" data-id="${t.id}"><div class="top"><span>${esc(t.nombre)}</span><span class="tag">${cap[t.est]}</span></div>
  <div class="sub">${showDate?t.dia.split("-").reverse().join("/")+" · ":""}${t.hora} · ${esc(t.trat)} · ${t.dur} min${t.tel?" · "+esc(t.tel):""}${cobCorta(t)}</div>
  ${t.notas?`<div class="sub">${esc(t.notas)}</div>`:""}${audit(t)}</button>`;
}
function render(){
  renderP();renderC();resolveNames();
  const d=new Date(current+"T12:00");
  $("fecha").textContent=d.toLocaleDateString("es-AR",{weekday:"long",day:"numeric",month:"long"});
  const q=$("buscar").value.trim().toLowerCase();
  const v=$("vista");
  if(q){
    const r=turnos.filter(t=>(t.nombre+" "+(t.tel||"")).toLowerCase().includes(q)).sort((a,b)=>(b.dia+b.hora).localeCompare(a.dia+a.hora));
    $("stats").innerHTML="";
    v.className="results";
    v.innerHTML=r.length?r.map(t=>card(t,true)).join(""):`<p class="sub">No hay turnos para esa búsqueda.</p>`;
    return;
  }
  v.className="";
  const del=turnos.filter(t=>t.dia===current).sort((a,b)=>a.hora.localeCompare(b.hora));
  const act=del.filter(t=>t.est!=="cancelado");
  $("stats").innerHTML=`<span><b>${act.length}</b> turnos</span><span><b>${del.filter(t=>t.est==="confirmado").length}</b> confirmados</span><span><b>${del.filter(t=>t.est==="pendiente").length}</b> sin confirmar</span>`;
  let html="";
  for(let m=START;m<END;m+=STEP){
    const t=act.find(x=>mins(x.hora)===m);
    const cancelado=del.find(x=>x.est==="cancelado"&&mins(x.hora)===m);
    const busy=act.find(x=>mins(x.hora)<m&&mins(x.hora)+x.dur>m);
    if(busy)continue;
    let body;
    if(t)body=card(t);
    else body=(cancelado?card(cancelado):"")+`<button class="free" data-new="${hhmm(m)}">Libre · tocá para agendar</button>`;
    html+=`<div class="slot"><div class="time">${hhmm(m)}</div><div>${body}</div></div>`;
  }
  const fuera=del.filter(t=>mins(t.hora)<START||mins(t.hora)>=END);
  if(fuera.length)html+=`<p class="sub">Fuera de horario habitual:</p>`+fuera.map(t=>card(t)).join("");
  v.innerHTML=html;
}
function open(t,hora){
  editId=t?t.id:null;
  $("dt").textContent=t?"Editar turno":"Nuevo turno";
  $("nombre").value=t?t.nombre:"";$("tel").value=t?t.tel||"":"";
  $("dia").value=t?t.dia:current;$("hora").value=t?t.hora:(hora||"09:00");
  $("trat").value=t?t.trat:"Consulta";$("dur").value=t?t.dur:"30";
  $("est").value=t?t.est:"pendiente";$("notas").value=t?t.notas||"":"";
  setCobT(t?pacientes.find(x=>x.id===t.pid):null);$("err").textContent="";$("aud").innerHTML=t?audit(t):"";$("del").hidden=!t;$("wa").hidden=!t;
  $("dlg").showModal();$("nombre").focus();
}
$("f").addEventListener("submit",async e=>{
  e.preventDefault();
  const nombre=$("nombre").value.trim();
  const prev=turnos.find(x=>x.id===editId)||{},now=new Date().toISOString();
  const t={id:editId||Date.now().toString(36),nombre,tel:$("tel").value.trim(),dia:$("dia").value,hora:$("hora").value,
    trat:$("trat").value,dur:+$("dur").value,est:$("est").value,notas:$("notas").value.trim(),cre:prev.cre||meId||null,creAt:prev.creAt||now,mod:meId||null,modAt:now};
  if(t.est!=="cancelado"){
    const a=mins(t.hora),b=a+t.dur;
    const c=turnos.find(x=>x.id!==t.id&&x.dia===t.dia&&x.est!=="cancelado"&&mins(x.hora)<b&&mins(x.hora)+x.dur>a);
    if(c){$("err").textContent=`Se superpone con el turno de ${c.nombre} (${c.hora}). Elegí otro horario.`;return}
  }
  try{
    let p=pacientes.find(x=>x.nombre.toLowerCase()===nombre.toLowerCase());
    if(!p){p={id:"p"+Date.now().toString(36),nombre,tel:t.tel,motivo:"",...cobDatos(),cre:meId||null,creAt:now,mod:meId||null,modAt:now};await put("pacientes",p)}
    else{const d={tel:t.tel||p.tel||"",...cobDatos()};if(Object.keys(d).some(k=>(d[k]||"")!==(p[k]||""))){p={...p,...d,mod:meId||null,modAt:now};await put("pacientes",p)}}
    t.pid=p.id;await put("turnos",t);
  }catch(x){return}
  current=t.dia;$("dlg").close();render();
});
$("del").onclick=async()=>{if(confirm("¿Eliminar este turno?")){try{await drop("turnos",editId)}catch(e){return}$("dlg").close();render()}};
$("wa").onclick=()=>{
  const t=turnos.find(x=>x.id===editId);if(!t)return;
  let n=(t.tel||"").replace(/\D/g,"");if(!n){$("err").textContent="Cargá un teléfono para enviar el aviso.";return}
  if(!n.startsWith("54"))n="549"+n.replace(/^0/,"").replace(/^(\d{2,4})15/,"$1");
  const f=new Date(t.dia+"T12:00").toLocaleDateString("es-AR",{weekday:"long",day:"numeric",month:"long"});
  const msg=`Hola ${t.nombre}, te recordamos tu turno en el consultorio el ${f} a las ${t.hora}. ¿Podés confirmarlo? ¡Gracias!`;
  window.open("https://wa.me/"+n+"?text="+encodeURIComponent(msg),"_blank");
};
$("cerrar").onclick=()=>$("dlg").close();
$("prev").onclick=()=>shift(-1);$("next").onclick=()=>shift(1);
$("hoy").onclick=()=>{current=iso(new Date());$("buscar").value="";render()};
$("buscar").oninput=render;
$("vista").addEventListener("click",e=>{
  const a=e.target.closest(".appt"),n=e.target.closest("[data-new]");
  if(a)open(turnos.find(x=>x.id===a.dataset.id));
  else if(n)open(null,n.dataset.new);
});

const cobTxt=p=>!p.cob?"Cobertura sin cargar":p.cob==="particular"?"Particular":((p.cob==="prepaga"?"Prepaga":"Obra social")+(p.ent?" "+esc(p.ent):"")+(p.afil?" · afiliado "+esc(p.afil):""));
function cobCorta(t){const p=pacientes.find(x=>x.id===t.pid);return p&&p.cob?" · "+(p.cob==="particular"?"Particular":esc(p.ent||(p.cob==="prepaga"?"Prepaga":"Obra social"))):""}
$("pcob").onchange=()=>$("pcobrow").classList.toggle("hide",$("pcob").value==="particular");
$("bcob").onchange=renderP;
function renderP(){
  $("plst").innerHTML=pacientes.map(p=>`<option value="${esc(p.nombre)}">`).join("");
  const con=pacientes.filter(p=>turnoFuturo(p)),sin=pacientes.filter(p=>!turnoFuturo(p));
  const opts=[["todos","Todos",pacientes.length],["con","Con turno",con.length],["sin","Sin turno",sin.length]];
  $("chips").innerHTML=opts.map(o=>`<button data-f="${o[0]}" aria-pressed="${filtro===o[0]}">${o[1]} (${o[2]})</button>`).join("");
  const q=$("bp").value.trim().toLowerCase();
  let l=filtro==="con"?con:filtro==="sin"?sin:pacientes;
  l=l.filter(p=>(p.nombre+" "+(p.tel||"")+" "+(p.dni||"")+" "+(p.ent||"")+" "+(p.afil||"")).toLowerCase().includes(q)).filter(p=>!$("bcob").value||($("bcob").value==="-"?!p.cob:p.cob===$("bcob").value)).sort((a,b)=>a.nombre.localeCompare(b.nombre));
  $("plist").innerHTML=l.length?l.map(p=>{
    const t=turnoFuturo(p),u=ultimo(p);
    return `<button class="appt pac ${t?"con":"sin"}" data-pid="${p.id}"><div class="top"><span>${esc(p.nombre)}</span><span class="tag">${t?"Con turno":"Sin turno"}</span></div>
    <div class="sub">${t?"Próximo: "+fd(t.dia)+" "+t.hora+" · "+esc(t.trat):"Todavía no tiene turno"}${u?" · Última visita: "+fd(u.dia):""}</div>
    <div class="sub">${cobTxt(p)} · ${esc(p.tel||"Sin teléfono")}${p.motivo?" · "+esc(p.motivo):""}</div>${audit(p)}</button>`}).join("")
    :`<p class="sub">No hay pacientes en esta lista. Agregá uno con "Nuevo paciente".</p>`;
}
function openP(p){
  editP=p?p.id:null;$("dpt").textContent=p?"Editar paciente":"Nuevo paciente";
  $("pn").value=p?p.nombre:"";$("pt").value=p?p.tel||"":"";$("pm").value=p?p.motivo||"":"";
  $("pdni").value=p?p.dni||"":"";$("pfn").value=p?p.fnac||"":"";$("pem").value=p?p.email||"":"";
  $("pcob").value=p?p.cob||"particular":"particular";$("pent").value=p?p.ent||"":"";$("paf").value=p?p.afil||"":"";
  $("pcobrow").classList.toggle("hide",$("pcob").value==="particular");
  $("paud").innerHTML=p?audit(p):"";$("pdel").hidden=!p;$("pturno").hidden=!p;$("dp").showModal();$("pn").focus();
}
function tab(v){
  ["agenda","calendario","pacientes"].forEach(n=>$(n).classList.toggle("hide",n!==v));
  [["tA","agenda"],["tC","calendario"],["tP","pacientes"]].forEach(a=>$(a[0]).setAttribute("aria-pressed",v===a[1]));
  pest=v;$("nuevo").textContent=v==="pacientes"?"Nuevo paciente":"Nuevo turno";
  if(v==="calendario"){const d=new Date(current+"T12:00");calMes=new Date(d.getFullYear(),d.getMonth(),1);calSel=current}
  render();
}
$("tA").onclick=()=>tab("agenda");$("tC").onclick=()=>tab("calendario");$("tP").onclick=()=>tab("pacientes");
$("nuevo").onclick=()=>pest==="pacientes"?openP(null):open(null);
$("bp").oninput=renderP;
$("chips").onclick=e=>{const b=e.target.closest("[data-f]");if(b){filtro=b.dataset.f;renderP()}};
$("plist").onclick=e=>{const b=e.target.closest("[data-pid]");if(b)openP(pacientes.find(x=>x.id===b.dataset.pid))};
$("pcerrar").onclick=()=>$("dp").close();
$("fp").addEventListener("submit",async e=>{
  e.preventDefault();
  const prevP=pacientes.find(x=>x.id===editP)||{},now=new Date().toISOString();
  const p={...prevP,id:editP||"p"+Date.now().toString(36),nombre:$("pn").value.trim(),tel:$("pt").value.trim(),motivo:$("pm").value.trim(),dni:$("pdni").value.trim(),fnac:$("pfn").value,email:$("pem").value.trim(),cob:$("pcob").value,ent:$("pcob").value==="particular"?"":$("pent").value.trim(),afil:$("pcob").value==="particular"?"":$("paf").value.trim(),cre:prevP.cre||meId||null,creAt:prevP.creAt||now,mod:meId||null,modAt:now};
  try{await put("pacientes",p)}catch(x){return}
  $("dp").close();render();
});
$("pdel").onclick=async()=>{if(confirm("¿Eliminar este paciente? Sus turnos no se borran.")){try{await drop("pacientes",editP)}catch(e){return}$("dp").close();render()}};
$("pturno").onclick=()=>{const p=pacientes.find(x=>x.id===editP);$("dp").close();tab("agenda");open(null);$("nombre").value=p.nombre;fillFromPatient();$("hora").focus()};

let calMes=new Date(new Date().getFullYear(),new Date().getMonth(),1),calSel=null,pest="agenda";
function renderC(){
  const y=calMes.getFullYear(),m=calMes.getMonth(),fil=$("cfil").value;
  $("cmes").textContent=calMes.toLocaleDateString("es-AR",{month:"long",year:"numeric"});
  const pre=y+"-"+String(m+1).padStart(2,"0");
  const mes=turnos.filter(t=>t.dia.startsWith(pre));
  const c=e=>mes.filter(t=>t.est===e).length;
  $("cstats").innerHTML=`<span><b>${mes.length-c("cancelado")}</b> turnos en el mes</span><span><b>${c("confirmado")}</b> confirmados</span><span><b>${c("pendiente")}</b> sin confirmar</span><span><b>${c("atendido")}</b> atendidos</span><span><b>${c("cancelado")}</b> cancelados</span>`;
  const ok=t=>fil==="todos"?t.est!=="cancelado":t.est===fil;
  const first=(new Date(y,m,1).getDay()+6)%7,dias=new Date(y,m+1,0).getDate();
  let h=["Lun","Mar","Mié","Jue","Vie","Sáb","Dom"].map(d=>`<div class="dow">${d}</div>`).join("");
  for(let i=0;i<first;i++)h+="<div></div>";
  for(let d=1;d<=dias;d++){
    const k=pre+"-"+String(d).padStart(2,"0");
    const ts=turnos.filter(t=>t.dia===k&&ok(t));
    const pend=fil==="todos"?ts.filter(t=>t.est==="pendiente").length:0;
    const pills=(ts.length?`<span class="pill${fil==="todos"?"":" x s-"+fil}">${ts.length}</span>`:"")+(pend?`<span class="pill p">${pend}</span>`:"");
    h+=`<button class="cell${k===hoyISO()?" today":""}${k===calSel?" sel":""}" data-d="${k}" aria-label="${d}: ${ts.length} turnos${pend?", "+pend+" sin confirmar":""}"><b>${d}</b><span class="pills">${pills}</span></button>`;
  }
  $("cgrid").innerHTML=h;
  if(!calSel){$("cdet").innerHTML=`<p class="sub">Elegí un día para ver sus turnos.</p>`;return}
  const ds=turnos.filter(t=>t.dia===calSel&&ok(t)).sort((a,b)=>a.hora.localeCompare(b.hora));
  const f=new Date(calSel+"T12:00").toLocaleDateString("es-AR",{weekday:"long",day:"numeric",month:"long"});
  $("cdet").innerHTML=`<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:8px"><b style="text-transform:capitalize">${f}</b><span class="actions"><button class="btn ghost" data-go>Ver agenda del día</button><button class="btn" data-add>Agendar turno</button></span></div>`+(ds.length?`<div class="results">${ds.map(t=>card(t)).join("")}</div>`:`<p class="sub">No hay turnos para este día con el filtro elegido.</p>`);
}
$("cprev").onclick=()=>{calMes=new Date(calMes.getFullYear(),calMes.getMonth()-1,1);renderC()};
$("cnext").onclick=()=>{calMes=new Date(calMes.getFullYear(),calMes.getMonth()+1,1);renderC()};
$("choy").onclick=()=>{current=hoyISO();calSel=current;calMes=new Date(new Date().getFullYear(),new Date().getMonth(),1);renderC()};
$("cfil").onchange=renderC;
$("cgrid").onclick=e=>{const b=e.target.closest("[data-d]");if(b){calSel=b.dataset.d;current=calSel;renderC()}};
$("cdet").onclick=e=>{
  const a=e.target.closest(".appt");
  if(a){open(turnos.find(x=>x.id===a.dataset.id));return}
  if(e.target.closest("[data-go]"))tab("agenda");
  else if(e.target.closest("[data-add]"))open(null);
};
function setCobT(p){
  $("tdni").value=p?p.dni||"":"";$("tcob").value=(p&&p.cob)||"";$("tent").value=p?p.ent||"":"";$("taf").value=p?p.afil||"":"";
  togCobT();
}
function togCobT(){$("tcobrow").classList.toggle("hide",!["obra social","prepaga"].includes($("tcob").value))}
function cobDatos(){const c=$("tcob").value,x=c==="obra social"||c==="prepaga";return{dni:$("tdni").value.trim(),cob:c,ent:x?$("tent").value.trim():"",afil:x?$("taf").value.trim():""}}
function fillFromPatient(){
  const n=$("nombre").value.trim().toLowerCase(),p=n&&pacientes.find(x=>x.nombre.toLowerCase()===n);
  if(p){$("tel").value=p.tel||"";setCobT(p)}
}
$("tcob").onchange=togCobT;
$("nombre").addEventListener("input",fillFromPatient);
$("banner").textContent="Conectando…";
render();
(async()=>{
  try{db=window.claude&&claude.use?await claude.use("db"):null}catch(e){db=null}
  try{user=window.claude&&claude.use?await claude.use("user"):null;meId=user?await user.id():null}catch(e){user=null}
  if(!db){$("banner").textContent="Modo local: los datos quedan solo en este dispositivo. Abrí el link publicado para trabajar en equipo.";return}
  $("banner").textContent="Datos compartidos con todo el equipo";
  const bad=e=>{$("banner").textContent="No se pudo leer la base compartida ("+(e&&e.code||"error")+")"};
  db.collection("turnos").onSnapshot(s=>{turnos=s.docs.map(d=>({...d.data(),id:d.id}));render()},bad);
  db.collection("pacientes").onSnapshot(s=>{pacientes=s.docs.map(d=>({...d.data(),id:d.id}));render()},bad);
})();
</script>
</body>
</html>

~~~~

import { kv } from "./storage.js"

const $ = (s)=> document.querySelector(s)

const elTime = $("#time")
const elDate = $("#date")
const elStatus = $("#status")

const elSearch = $("#searchInput")
const elEngine = $("#searchEngine")

const elWeatherPlace = $("#weatherPlace")
const elWeatherNow = $("#weatherNow")
const elWeatherIcon = $("#weatherIcon")
const elWeatherMeta = $("#weatherMeta")
const elWeatherForecast = $("#weatherForecast")
const btnWeatherRefresh = $("#btnWeatherRefresh")

const elAgendaList = $("#agendaList")
const elIcsFile = $("#icsFile")
const btnAgendaClear = $("#btnAgendaClear")

const elTaskInput = $("#taskInput")
const elTaskList = $("#taskList")

const elNotesInput = $("#notesInput")
const elNotesPreview = $("#notesPreview")
const btnNotesMode = $("#btnNotesMode")
const btnNotesClear = $("#btnNotesClear")

const elLinksList = $("#linksList")
const btnLinkAdd = $("#btnLinkAdd")
const btnLinksExport = $("#btnLinksExport")
const elLinksImport = $("#linksImport")

const elFocusLabel = $("#focusLabel")
const elFocusTime = $("#focusTime")
const btnFocusStart = $("#btnFocusStart")
const btnFocusPause = $("#btnFocusPause")
const btnFocusSkip = $("#btnFocusSkip")
const btnFocusReset = $("#btnFocusReset")

const dlgSettings = $("#dlgSettings")
const btnSettings = $("#btnSettings")
const setTheme = $("#setTheme")
const setAccent = $("#setAccent")
const setClock = $("#setClock")
const setTempUnit = $("#setTempUnit")
const setPlaceQuery = $("#setPlaceQuery")
const btnPlaceFind = $("#btnPlaceFind")
const btnPlaceGeo = $("#btnPlaceGeo")
const placeResult = $("#placeResult")
const btnDataExport = $("#btnDataExport")
const dataImport = $("#dataImport")
const btnDataReset = $("#btnDataReset")

const dlgPalette = $("#dlgPalette")
const btnPalette = $("#btnPalette")
const palInput = $("#palInput")
const palList = $("#palList")

const dlgLink = $("#dlgLink")
const linkTitle = $("#linkTitle")
const linkName = $("#linkName")
const linkUrl = $("#linkUrl")
const linkGroup = $("#linkGroup")
const btnLinkSave = $("#btnLinkSave")
const btnLinkDelete = $("#btnLinkDelete")

const taskFilterButtons = [...document.querySelectorAll('.segmented .seg')]

const DEFAULTS = {
  settings: {
    theme: "auto",
    accent: "#7c5cff",
    clock: "auto",
    tempUnit: "c",
    engine: "ddg",
    place: null
  },
  tasks: [],
  links: [
    {id: crypto.randomUUID(), name:"GitHub", url:"https://github.com", group:"Dev"},
    {id: crypto.randomUUID(), name:"Docs", url:"https://developer.mozilla.org", group:"Dev"},
    {id: crypto.randomUUID(), name:"Mail", url:"https://mail.google.com", group:"Personal"}
  ],
  notes: "",
  agenda: [],
  focus: {mode:"work", endsAt: null, pausedLeft: null}
}

let state = structuredClone(DEFAULTS)
let taskFilter = "today"
let notesPreviewMode = false
let linkEditingId = null
let focusTick = null

function clamp(n,a,b){ return Math.max(a, Math.min(b, n)) }
function pad2(n){ return String(n).padStart(2,"0") }
function todayYmd(d=new Date()){ return d.toISOString().slice(0,10) }

function setStatus(msg){ elStatus.textContent = msg || "" }

function applyTheme(){
  const s = state.settings
  document.body.dataset.theme = s.theme === "auto" ? "" : s.theme
  document.documentElement.style.setProperty("--accent", s.accent || "#7c5cff")
}

function prefers24h(){
  if(state.settings.clock === "24") return true
  if(state.settings.clock === "12") return false
  const test = new Intl.DateTimeFormat(undefined,{hour:"numeric"}).format(new Date())
  return !/[AP]M/i.test(test)
}

function renderTime(){
  const now = new Date()
  const h24 = prefers24h()
  const hrs = now.getHours()
  const h = h24 ? hrs : ((hrs % 12) || 12)
  const m = now.getMinutes()
  const ampm = h24 ? "" : (hrs < 12 ? " AM" : " PM")
  elTime.textContent = `${pad2(h)}:${pad2(m)}${ampm}`
  const df = new Intl.DateTimeFormat(undefined,{weekday:"long", year:"numeric", month:"short", day:"numeric"})
  elDate.textContent = df.format(now)
}

function parseSearchInput(raw){
  const t = raw.trim()
  if(!t) return null
  const parts = t.split(/\s+/)
  const bang = parts[0].toLowerCase()
  const map = {g:"g", ddg:"ddg", yt:"yt", gh:"gh", mdn:"mdn", so:"so"}
  if(map[bang] && parts.length>1) return {engine: map[bang], q: parts.slice(1).join(" ")}
  return {engine: state.settings.engine || "ddg", q: t}
}

function engineUrl(engine,q){
  const e = encodeURIComponent(q)
  if(engine==="g") return `https://www.google.com/search?q=${e}`
  if(engine==="yt") return `https://www.youtube.com/results?search_query=${e}`
  if(engine==="gh") return `https://github.com/search?q=${e}`
  if(engine==="mdn") return `https://developer.mozilla.org/en-US/search?q=${e}`
  if(engine==="so") return `https://stackoverflow.com/search?q=${e}`
  return `https://duckduckgo.com/?q=${e}`
}

function escapeHtml(s){
  return s.replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#39;")
}

function mdToHtml(src){
  const lines = src.replace(/\r\n/g,"\n").split("\n")
  let out = []
  let inCode = false
  let codeBuf = []
  for(const line of lines){
    if(line.trim().startsWith("```")){
      if(!inCode){
        inCode = true
        codeBuf = []
      }else{
        inCode = false
        out.push(`<pre><code>${escapeHtml(codeBuf.join("\n"))}</code></pre>`)
      }
      continue
    }
    if(inCode){ codeBuf.push(line); continue }

    const h1 = line.match(/^# (.+)$/)
    if(h1){ out.push(`<h1>${escapeInline(h1[1])}</h1>`); continue }
    const h2 = line.match(/^## (.+)$/)
    if(h2){ out.push(`<h2>${escapeInline(h2[1])}</h2>`); continue }

    const bq = line.match(/^> (.+)$/)
    if(bq){ out.push(`<blockquote>${escapeInline(bq[1])}</blockquote>`); continue }

    const li = line.match(/^\- (.+)$/)
    if(li){
      const items = [li[1]]
      let i = out.length-1
      if(i>=0 && out[i].startsWith("<ul>") && out[i].endsWith("</ul>")){
        const inner = out[i].slice(4,-5)
        out[i] = `<ul>${inner}<li>${escapeInline(items[0])}</li></ul>`
      }else{
        out.push(`<ul><li>${escapeInline(items[0])}</li></ul>`)
      }
      continue
    }

    if(line.trim()===""){ out.push(""); continue }
    out.push(`<p>${escapeInline(line)}</p>`)
  }
  return out.filter(x=>x!==null).join("\n")
}

function escapeInline(s){
  let x = escapeHtml(s)
  x = x.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_,t,u)=> `<a href="${u}" target="_blank" rel="noopener noreferrer">${t}</a>`)
  x = x.replace(/`([^`]+)`/g, (_,c)=> `<code>${c}</code>`)
  x = x.replace(/\*\*([^*]+)\*\*/g, (_,b)=> `<strong>${b}</strong>`)
  x = x.replace(/\*([^*]+)\*/g, (_,i)=> `<em>${i}</em>`)
  return x
}

function normalizeUrl(u){
  const t = u.trim()
  if(!t) return ""
  if(/^https?:\/\//i.test(t)) return t
  return "https://" + t
}

function safeHost(u){
  try{ return new URL(u).host.replace(/^www\./,"") }catch{ return u }
}

function byGroup(links){
  const map = new Map()
  for(const l of links){
    const g = (l.group || "General").trim() || "General"
    if(!map.has(g)) map.set(g, [])
    map.get(g).push(l)
  }
  const groups = [...map.entries()].sort((a,b)=> a[0].localeCompare(b[0]))
  for(const [g,arr] of groups) arr.sort((a,b)=> a.name.localeCompare(b.name))
  return groups
}

function renderLinks(){
  elLinksList.innerHTML = ""
  const groups = byGroup(state.links)
  for(const [g,arr] of groups){
    const wrap = document.createElement("div")
    wrap.className = "group"
    const head = document.createElement("div")
    head.className = "group-head"
    head.innerHTML = `<div class="group-name">${escapeHtml(g)}</div><div class="muted">${arr.length}</div>`
    const grid = document.createElement("div")
    grid.className = "link-grid"
    for(const l of arr){
      const a = document.createElement("a")
      a.className = "a"
      a.href = l.url
      a.target = "_blank"
      a.rel = "noopener noreferrer"
      a.innerHTML = `<div><div class="title">${escapeHtml(l.name)}</div><div class="u">${escapeHtml(safeHost(l.url))}</div></div><button class="btn ghost" type="button" data-edit="${l.id}">Edit</button>`
      a.addEventListener("click",(e)=>{
        if(e.target && e.target.dataset && e.target.dataset.edit){
          e.preventDefault()
          openLinkDialog(l.id)
        }
      })
      grid.appendChild(a)
    }
    wrap.appendChild(head)
    wrap.appendChild(grid)
    elLinksList.appendChild(wrap)
  }
}

function openLinkDialog(id=null){
  linkEditingId = id
  if(!id){
    linkTitle.textContent = "Add link"
    linkName.value = ""
    linkUrl.value = ""
    linkGroup.value = ""
    btnLinkDelete.hidden = true
  }else{
    const l = state.links.find(x=>x.id===id)
    if(!l) return
    linkTitle.textContent = "Edit link"
    linkName.value = l.name
    linkUrl.value = l.url
    linkGroup.value = l.group || ""
    btnLinkDelete.hidden = false
  }
  dlgLink.showModal()
  linkName.focus()
}

function exportJson(filename, obj){
  const blob = new Blob([JSON.stringify(obj,null,2)], {type:"application/json"})
  const a = document.createElement("a")
  a.href = URL.createObjectURL(blob)
  a.download = filename
  a.click()
  setTimeout(()=> URL.revokeObjectURL(a.href), 1000)
}

function parseTaskLine(raw){
  const s = raw.trim()
  if(!s) return null
  const dueMatch = s.match(/@(\d{4}\-\d{2}\-\d{2})/)
  const tagMatch = [...s.matchAll(/#([a-zA-Z0-9_\-]+)/g)].map(m=>m[1])
  const clean = s.replace(/@\d{4}\-\d{2}\-\d{2}/g,"").replace(/#[a-zA-Z0-9_\-]+/g,"").trim()
  return {
    id: crypto.randomUUID(),
    title: clean || s,
    due: dueMatch ? dueMatch[1] : null,
    tags: tagMatch,
    done: false,
    createdAt: Date.now()
  }
}

function taskIsToday(t){
  const y = todayYmd()
  return t.due === y
}

function taskIsUpcoming(t){
  if(!t.due) return false
  const now = todayYmd()
  return t.due >= now
}

function renderTasks(){
  elTaskList.innerHTML = ""
  const now = todayYmd()
  const list = state.tasks
    .filter(t=> !t.done)
    .filter(t=>{
      if(taskFilter==="all") return true
      if(taskFilter==="today") return t.due === now || (!t.due && true)
      if(taskFilter==="upcoming") return !t.due || t.due >= now
      return true
    })
    .sort((a,b)=>{
      const ad = a.due || "9999-12-31"
      const bd = b.due || "9999-12-31"
      if(ad!==bd) return ad.localeCompare(bd)
      return a.createdAt - b.createdAt
    })

  if(list.length===0){
    const d = document.createElement("div")
    d.className = "muted"
    d.textContent = "No tasks."
    elTaskList.appendChild(d)
    return
  }

  for(const t of list){
    const row = document.createElement("div")
    row.className = "item"
    const tags = (t.tags||[]).slice(0,3).map(x=>`<span class="tag">#${escapeHtml(x)}</span>`).join("")
    const due = t.due ? `<div class="meta">${escapeHtml(t.due)}</div>` : `<div class="meta">No due date</div>`
    row.innerHTML = `<div><div class="title">${escapeHtml(t.title)}</div>${due}<div class="row" style="margin-top:6px;gap:6px">${tags}</div></div><div class="right"><button class="btn ghost" type="button" data-done="${t.id}">Done</button><button class="btn ghost" type="button" data-del="${t.id}">Delete</button></div>`
    elTaskList.appendChild(row)
  }
}

function toggleTaskDone(id){
  const t = state.tasks.find(x=>x.id===id)
  if(!t) return
  t.done = true
}

function deleteTask(id){
  state.tasks = state.tasks.filter(x=>x.id!==id)
}

function setTaskFilter(f){
  taskFilter = f
  for(const b of taskFilterButtons){
    const on = b.dataset.filter === f
    b.setAttribute("aria-pressed", on ? "true" : "false")
  }
  renderTasks()
}

function renderNotes(){
  if(notesPreviewMode){
    elNotesPreview.hidden = false
    elNotesInput.hidden = true
    elNotesPreview.innerHTML = mdToHtml(state.notes || "")
    btnNotesMode.textContent = "Edit"
  }else{
    elNotesPreview.hidden = true
    elNotesInput.hidden = false
    btnNotesMode.textContent = "Preview"
  }
}

function ymdFromDate(d){
  return d.toISOString().slice(0,10)
}

function parseIcsText(text){
  const rawLines = text.replace(/\r\n/g,"\n").split("\n")
  const lines = []
  for(const l of rawLines){
    if(l.startsWith(" ") || l.startsWith("\t")){
      if(lines.length) lines[lines.length-1] += l.slice(1)
    }else{
      lines.push(l)
    }
  }

  const events = []
  let cur = null

  for(const line of lines){
    if(line==="BEGIN:VEVENT"){ cur = {}; continue }
    if(line==="END:VEVENT"){
      if(cur && cur.dtstart && cur.summary){
        const ev = normalizeEvent(cur)
        if(ev) events.push(ev)
      }
      cur = null
      continue
    }
    if(!cur) continue

    const idx = line.indexOf(":")
    if(idx<0) continue
    const keyPart = line.slice(0,idx)
    const val = line.slice(idx+1).trim()
    const key = keyPart.split(";")[0].toUpperCase()

    if(key==="DTSTART") cur.dtstart = val
    if(key==="DTEND") cur.dtend = val
    if(key==="SUMMARY") cur.summary = val
    if(key==="LOCATION") cur.location = val
  }

  const dedup = new Map()
  for(const e of events){
    const k = `${e.start}|${e.end}|${e.summary}|${e.location||""}`
    if(!dedup.has(k)) dedup.set(k,e)
  }
  return [...dedup.values()].sort((a,b)=> a.start - b.start)
}

function parseIcsDate(v){
  if(!v) return null
  if(/^\d{8}$/.test(v)){
    const y = Number(v.slice(0,4))
    const m = Number(v.slice(4,6))-1
    const d = Number(v.slice(6,8))
    return new Date(y,m,d,0,0,0,0)
  }
  const m = v.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z?$/)
  if(m){
    const y = Number(m[1]), mo = Number(m[2])-1, d = Number(m[3])
    const hh = Number(m[4]), mm = Number(m[5]), ss = Number(m[6])
    if(v.endsWith("Z")) return new Date(Date.UTC(y,mo,d,hh,mm,ss))
    return new Date(y,mo,d,hh,mm,ss)
  }
  return null
}

function normalizeEvent(cur){
  const start = parseIcsDate(cur.dtstart)
  const end = parseIcsDate(cur.dtend) || start
  if(!start) return null
  return {
    id: crypto.randomUUID(),
    start: start.getTime(),
    end: end.getTime(),
    summary: cur.summary,
    location: cur.location || ""
  }
}

function renderAgenda(){
  elAgendaList.innerHTML = ""
  const now = Date.now()
  const horizon = now + 7*24*60*60*1000
  const upcoming = state.agenda.filter(e=> e.end >= now - 12*60*60*1000 && e.start <= horizon).sort((a,b)=> a.start-b.start)

  if(upcoming.length===0){
    const d = document.createElement("div")
    d.className = "muted"
    d.textContent = "No events in the next 7 days."
    elAgendaList.appendChild(d)
    return
  }

  const tf = new Intl.DateTimeFormat(undefined,{weekday:"short", month:"short", day:"numeric"})
  const ttf = new Intl.DateTimeFormat(undefined,{hour:"2-digit", minute:"2-digit"})
  for(const e of upcoming.slice(0,30)){
    const row = document.createElement("div")
    row.className = "item"
    const sd = new Date(e.start)
    const ed = new Date(e.end)
    const day = tf.format(sd)
    const time = `${ttf.format(sd)}–${ttf.format(ed)}`
    const loc = e.location ? `<div class="meta">${escapeHtml(e.location)}</div>` : ""
    row.innerHTML = `<div><div class="title">${escapeHtml(e.summary)}</div><div class="meta">${escapeHtml(day)} · ${escapeHtml(time)}</div>${loc}</div><div class="right"><button class="btn ghost" type="button" data-evdel="${e.id}">Delete</button></div>`
    elAgendaList.appendChild(row)
  }
}

function deleteAgenda(id){
  state.agenda = state.agenda.filter(e=> e.id!==id)
}

function wmoLabel(code){
  const c = Number(code)
  if([0].includes(c)) return "Clear"
  if([1,2].includes(c)) return "Mostly clear"
  if([3].includes(c)) return "Overcast"
  if([45,48].includes(c)) return "Fog"
  if([51,53,55].includes(c)) return "Drizzle"
  if([61,63,65].includes(c)) return "Rain"
  if([66,67].includes(c)) return "Freezing rain"
  if([71,73,75].includes(c)) return "Snow"
  if([77].includes(c)) return "Snow grains"
  if([80,81,82].includes(c)) return "Showers"
  if([85,86].includes(c)) return "Snow showers"
  if([95].includes(c)) return "Thunderstorm"
  if([96,99].includes(c)) return "Thunderstorm hail"
  return "Weather"
}

function wmoGlyph(code){
  const c = Number(code)
  if(c===0) return "☀"
  if([1,2].includes(c)) return "⛅"
  if(c===3) return "☁"
  if([45,48].includes(c)) return "🌫"
  if([51,53,55].includes(c)) return "🌦"
  if([61,63,65].includes(c)) return "🌧"
  if([66,67].includes(c)) return "🌧"
  if([71,73,75,77].includes(c)) return "🌨"
  if([80,81,82].includes(c)) return "🌦"
  if([85,86].includes(c)) return "🌨"
  if([95,96,99].includes(c)) return "⛈"
  return "⛅"
}

async function fetchWeather(){
  const place = state.settings.place
  if(!place){
    elWeatherPlace.textContent = "Set location in Settings"
    elWeatherNow.textContent = "—"
    elWeatherMeta.textContent = ""
    elWeatherForecast.innerHTML = ""
    elWeatherIcon.textContent = ""
    return
  }

  const unit = state.settings.tempUnit === "f" ? "fahrenheit" : "celsius"
  const windUnit = state.settings.tempUnit === "f" ? "mph" : "kmh"
  const url = new URL("https://api.open-meteo.com/v1/forecast")
  url.searchParams.set("latitude", String(place.lat))
  url.searchParams.set("longitude", String(place.lon))
  url.searchParams.set("current", "temperature_2m,apparent_temperature,is_day,weather_code,wind_speed_10m")
  url.searchParams.set("daily", "temperature_2m_max,temperature_2m_min,weather_code,sunrise,sunset")
  url.searchParams.set("temperature_unit", unit)
  url.searchParams.set("wind_speed_unit", windUnit)
  url.searchParams.set("timezone", "auto")

  setStatus("Weather: updating")
  const res = await fetch(url.toString(), {cache:"no-store"})
  const data = await res.json()

  const cur = data.current
  const d0 = 0
  const max0 = data.daily.temperature_2m_max[d0]
  const min0 = data.daily.temperature_2m_min[d0]
  const code = cur.weather_code

  elWeatherPlace.textContent = place.name
  elWeatherNow.textContent = `${Math.round(cur.temperature_2m)}°`
  elWeatherIcon.textContent = wmoGlyph(code)

  const feel = `Feels ${Math.round(cur.apparent_temperature)}°`
  const wind = `Wind ${Math.round(cur.wind_speed_10m)} ${windUnit.toUpperCase()}`
  const range = `Today ${Math.round(min0)}–${Math.round(max0)}°`
  elWeatherMeta.textContent = `${wmoLabel(code)} · ${feel} · ${wind} · ${range}`

  elWeatherForecast.innerHTML = ""
  const df = new Intl.DateTimeFormat(undefined,{weekday:"short"})
  for(let i=1;i<=3;i++){
    const day = df.format(new Date(data.daily.time[i]))
    const mx = Math.round(data.daily.temperature_2m_max[i])
    const mn = Math.round(data.daily.temperature_2m_min[i])
    const cd = data.daily.weather_code[i]
    const div = document.createElement("div")
    div.className = "fore"
    div.innerHTML = `<div class="d">${escapeHtml(day)} · ${escapeHtml(wmoGlyph(cd))}</div><div class="t">${mn}–${mx}°</div>`
    elWeatherForecast.appendChild(div)
  }

  setStatus("")
}

async function geolocate(){
  return await new Promise((resolve,reject)=>{
    navigator.geolocation.getCurrentPosition(
      (pos)=> resolve({lat: pos.coords.latitude, lon: pos.coords.longitude}),
      (err)=> reject(err),
      {enableHighAccuracy:false, timeout: 8000, maximumAge: 300000}
    )
  })
}

async function reversePlace(lat,lon){
  const url = new URL("https://nominatim.openstreetmap.org/reverse")
  url.searchParams.set("format","jsonv2")
  url.searchParams.set("lat", String(lat))
  url.searchParams.set("lon", String(lon))
  const res = await fetch(url.toString(), {cache:"no-store"})
  const j = await res.json()
  const name = j && (j.name || (j.display_name || "").split(",").slice(0,3).join(", ").trim()) || "Location"
  return {name, lat, lon}
}

async function forwardPlace(q){
  const url = new URL("https://nominatim.openstreetmap.org/search")
  url.searchParams.set("format","jsonv2")
  url.searchParams.set("limit","1")
  url.searchParams.set("q", q)
  const res = await fetch(url.toString(), {cache:"no-store"})
  const j = await res.json()
  if(!Array.isArray(j) || j.length===0) return null
  const r = j[0]
  const name = (r.display_name || "").split(",").slice(0,3).join(", ").trim() || q
  return {name, lat: Number(r.lat), lon: Number(r.lon)}
}

function focusState(){
  const f = state.focus
  if(f.endsAt){
    const left = Math.max(0, f.endsAt - Date.now())
    return {running:true, leftMs:left, mode:f.mode}
  }
  if(f.pausedLeft!=null){
    return {running:false, leftMs:f.pausedLeft, mode:f.mode}
  }
  return {running:false, leftMs: f.mode==="work" ? 25*60*1000 : 5*60*1000, mode:f.mode}
}

function setFocusDisplay(){
  const f = focusState()
  const mm = Math.floor(f.leftMs/60000)
  const ss = Math.floor((f.leftMs%60000)/1000)
  elFocusTime.textContent = `${pad2(mm)}:${pad2(ss)}`
  elFocusLabel.textContent = f.mode === "work" ? "Pomodoro" : "Break"
  btnFocusStart.disabled = f.running
}

function stopFocusTick(){
  if(focusTick){ clearInterval(focusTick); focusTick = null }
}

function startFocusTick(){
  stopFocusTick()
  focusTick = setInterval(()=>{
    const f = focusState()
    if(f.running){
      if(f.leftMs<=0){
        finishFocus()
      }else{
        setFocusDisplay()
      }
    }
  }, 250)
}

async function notify(title, body){
  if(!("Notification" in window)) return
  if(Notification.permission === "granted"){
    new Notification(title, {body})
    return
  }
  if(Notification.permission === "default"){
    const p = await Notification.requestPermission()
    if(p==="granted") new Notification(title, {body})
  }
}

function beep(){
  try{
    const ctx = new AudioContext()
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    o.type = "sine"
    o.frequency.value = 880
    g.gain.value = 0.05
    o.connect(g)
    g.connect(ctx.destination)
    o.start()
    setTimeout(()=>{ o.stop(); ctx.close() }, 180)
  }catch{}
}

async function finishFocus(){
  const was = state.focus.mode
  state.focus.endsAt = null
  state.focus.pausedLeft = null
  state.focus.mode = was === "work" ? "break" : "work"
  await kv.set("focus", state.focus)
  setFocusDisplay()
  stopFocusTick()
  startFocusTick()
  beep()
  await notify("Timer", was === "work" ? "Break started." : "Work started.")
}

async function startFocus(){
  const f = focusState()
  const left = f.leftMs
  state.focus.pausedLeft = null
  state.focus.endsAt = Date.now() + left
  await kv.set("focus", state.focus)
  setFocusDisplay()
  startFocusTick()
}

async function pauseFocus(){
  const f = focusState()
  if(!f.running) return
  state.focus.pausedLeft = f.leftMs
  state.focus.endsAt = null
  await kv.set("focus", state.focus)
  setFocusDisplay()
}

async function skipFocus(){
  await finishFocus()
}

async function resetFocus(){
  state.focus.endsAt = null
  state.focus.pausedLeft = null
  state.focus.mode = "work"
  await kv.set("focus", state.focus)
  setFocusDisplay()
  stopFocusTick()
}

function buildPalette(){
  const actions = [
    {k:"open settings", run:()=> dlgSettings.showModal()},
    {k:"focus search", run:()=> { elSearch.focus(); dlgPalette.close() }},
    {k:"add task", run:()=> { elTaskInput.focus(); dlgPalette.close() }},
    {k:"add link", run:()=> { openLinkDialog(null); dlgPalette.close() }},
    {k:"import calendar", run:()=> { elIcsFile.click(); dlgPalette.close() }},
    {k:"toggle notes preview", run:()=> { notesPreviewMode = !notesPreviewMode; renderNotes(); dlgPalette.close() }},
    {k:"start focus", run:()=> { startFocus(); dlgPalette.close() }},
    {k:"pause focus", run:()=> { pauseFocus(); dlgPalette.close() }},
    {k:"skip focus", run:()=> { skipFocus(); dlgPalette.close() }},
    {k:"refresh weather", run:()=> { fetchWeather(); dlgPalette.close() }},
    {k:"theme auto", run:()=> { state.settings.theme="auto"; applyTheme(); persistSettings(); dlgPalette.close() }},
    {k:"theme dark", run:()=> { state.settings.theme="dark"; applyTheme(); persistSettings(); dlgPalette.close() }},
    {k:"theme light", run:()=> { state.settings.theme="light"; applyTheme(); persistSettings(); dlgPalette.close() }}
  ]
  return actions
}

function renderPalette(q){
  const t = (q||"").trim().toLowerCase()
  palList.innerHTML = ""
  const actions = buildPalette().filter(a=> !t || a.k.includes(t)).slice(0,12)
  if(actions.length===0){
    const d = document.createElement("div")
    d.className = "muted"
    d.textContent = "No matches."
    palList.appendChild(d)
    return
  }
  for(const a of actions){
    const row = document.createElement("div")
    row.className = "item"
    row.innerHTML = `<div><div class="title">${escapeHtml(a.k)}</div><div class="meta">Enter to run</div></div><div class="right"><span class="pill">↵</span></div>`
    row.addEventListener("click", ()=> a.run())
    palList.appendChild(row)
  }
}

async function persistAll(){
  await kv.set("settings", state.settings)
  await kv.set("tasks", state.tasks)
  await kv.set("links", state.links)
  await kv.set("notes", state.notes)
  await kv.set("agenda", state.agenda)
  await kv.set("focus", state.focus)
}

async function persistSettings(){
  await kv.set("settings", state.settings)
}

async function loadState(){
  const s = await kv.get("settings")
  const tasks = await kv.get("tasks")
  const links = await kv.get("links")
  const notes = await kv.get("notes")
  const agenda = await kv.get("agenda")
  const focus = await kv.get("focus")

  state.settings = {...DEFAULTS.settings, ...(s||{})}
  state.tasks = Array.isArray(tasks) ? tasks : structuredClone(DEFAULTS.tasks)
  state.links = Array.isArray(links) ? links : structuredClone(DEFAULTS.links)
  state.notes = typeof notes === "string" ? notes : ""
  state.agenda = Array.isArray(agenda) ? agenda : []
  state.focus = focus && typeof focus === "object" ? {...DEFAULTS.focus, ...focus} : structuredClone(DEFAULTS.focus)

  elEngine.value = state.settings.engine || "ddg"
  elNotesInput.value = state.notes || ""
}

function wireUi(){
  elSearch.addEventListener("keydown",(e)=>{
    if(e.key==="Enter"){
      const p = parseSearchInput(elSearch.value)
      if(!p) return
      window.open(engineUrl(p.engine, p.q), "_blank", "noopener,noreferrer")
      elSearch.select()
    }
  })

  elEngine.addEventListener("change", async ()=>{
    state.settings.engine = elEngine.value
    await persistSettings()
  })

  btnSettings.addEventListener("click", ()=>{
    setTheme.value = state.settings.theme
    setAccent.value = state.settings.accent
    setClock.value = state.settings.clock
    setTempUnit.value = state.settings.tempUnit
    placeResult.textContent = state.settings.place ? `Current: ${state.settings.place.name}` : "Not set"
    setPlaceQuery.value = ""
    dlgSettings.showModal()
  })

  btnPalette.addEventListener("click", ()=>{
    dlgPalette.showModal()
    palInput.value = ""
    renderPalette("")
    palInput.focus()
  })

  palInput.addEventListener("input", ()=> renderPalette(palInput.value))
  palInput.addEventListener("keydown",(e)=>{
    if(e.key==="Enter"){
      e.preventDefault()
      const q = palInput.value.trim().toLowerCase()
      const a = buildPalette().find(x=> x.k.includes(q)) || buildPalette().find(x=> x.k.startsWith(q))
      if(a) a.run()
    }
  })

  document.addEventListener("keydown",(e)=>{
    const tag = (document.activeElement && document.activeElement.tagName || "").toLowerCase()
    const inInput = ["input","textarea","select"].includes(tag)
    if(e.key==="/" && !inInput){
      e.preventDefault()
      elSearch.focus()
      return
    }
    if((e.ctrlKey || e.metaKey) && e.key.toLowerCase()==="k"){
      e.preventDefault()
      dlgPalette.showModal()
      palInput.value = ""
      renderPalette("")
      palInput.focus()
      return
    }
  })

  btnWeatherRefresh.addEventListener("click", ()=> fetchWeather())

  elIcsFile.addEventListener("change", async ()=>{
    const f = elIcsFile.files && elIcsFile.files[0]
    if(!f) return
    const text = await f.text()
    const events = parseIcsText(text)
    state.agenda = events
    await kv.set("agenda", state.agenda)
    renderAgenda()
    setStatus("Agenda imported")
    setTimeout(()=> setStatus(""), 1200)
    elIcsFile.value = ""
  })

  btnAgendaClear.addEventListener("click", async ()=>{
    state.agenda = []
    await kv.set("agenda", state.agenda)
    renderAgenda()
  })

  elAgendaList.addEventListener("click", async (e)=>{
    const id = e.target && e.target.dataset && e.target.dataset.evdel
    if(!id) return
    deleteAgenda(id)
    await kv.set("agenda", state.agenda)
    renderAgenda()
  })

  elTaskInput.addEventListener("keydown", async (e)=>{
    if(e.key!=="Enter") return
    const t = parseTaskLine(elTaskInput.value)
    if(!t) return
    state.tasks.push(t)
    elTaskInput.value = ""
    await kv.set("tasks", state.tasks)
    renderTasks()
  })

  elTaskList.addEventListener("click", async (e)=>{
    const doneId = e.target && e.target.dataset && e.target.dataset.done
    const delId = e.target && e.target.dataset && e.target.dataset.del
    if(doneId){
      toggleTaskDone(doneId)
      await kv.set("tasks", state.tasks)
      renderTasks()
    }
    if(delId){
      deleteTask(delId)
      await kv.set("tasks", state.tasks)
      renderTasks()
    }
  })

  for(const b of taskFilterButtons){
    b.addEventListener("click", ()=> setTaskFilter(b.dataset.filter))
  }

  btnNotesMode.addEventListener("click", ()=>{
    notesPreviewMode = !notesPreviewMode
    renderNotes()
  })

  elNotesInput.addEventListener("input", async ()=>{
    state.notes = elNotesInput.value
    await kv.set("notes", state.notes)
    if(notesPreviewMode) renderNotes()
  })

  btnNotesClear.addEventListener("click", async ()=>{
    state.notes = ""
    elNotesInput.value = ""
    await kv.set("notes", state.notes)
    renderNotes()
  })

  btnLinkAdd.addEventListener("click", ()=> openLinkDialog(null))

  btnLinksExport.addEventListener("click", ()=>{
    exportJson("links.json", state.links)
  })

  elLinksImport.addEventListener("change", async ()=>{
    const f = elLinksImport.files && elLinksImport.files[0]
    if(!f) return
    const text = await f.text()
    let j = null
    try{ j = JSON.parse(text) }catch{}
    if(Array.isArray(j)){
      const cleaned = j
        .filter(x=> x && typeof x.name==="string" && typeof x.url==="string")
        .map(x=> ({id: x.id || crypto.randomUUID(), name: x.name, url: normalizeUrl(x.url), group: x.group || "General"}))
      state.links = cleaned
      await kv.set("links", state.links)
      renderLinks()
    }
    elLinksImport.value = ""
  })

  dlgLink.addEventListener("close", async ()=>{
    linkEditingId = null
  })

  dlgLink.querySelector("form").addEventListener("submit", async (e)=>{
    const name = linkName.value.trim()
    const url = normalizeUrl(linkUrl.value)
    const group = (linkGroup.value || "General").trim() || "General"
    const del = btnLinkDelete.matches(":focus") || e.submitter === btnLinkDelete

    if(linkEditingId && del){
      state.links = state.links.filter(x=> x.id !== linkEditingId)
      await kv.set("links", state.links)
      renderLinks()
      return
    }

    if(!name || !url) return

    if(!linkEditingId){
      state.links.push({id: crypto.randomUUID(), name, url, group})
    }else{
      const l = state.links.find(x=> x.id===linkEditingId)
      if(l){
        l.name = name
        l.url = url
        l.group = group
      }
    }
    await kv.set("links", state.links)
    renderLinks()
  })

  btnLinkDelete.addEventListener("click", ()=>{
    btnLinkDelete.dataset.delete = "1"
  })

  setTheme.addEventListener("change", async ()=>{
    state.settings.theme = setTheme.value
    applyTheme()
    await persistSettings()
  })
  setAccent.addEventListener("change", async ()=>{
    state.settings.accent = setAccent.value.trim() || "#7c5cff"
    applyTheme()
    await persistSettings()
  })
  setClock.addEventListener("change", async ()=>{
    state.settings.clock = setClock.value
    await persistSettings()
    renderTime()
  })
  setTempUnit.addEventListener("change", async ()=>{
    state.settings.tempUnit = setTempUnit.value
    await persistSettings()
    fetchWeather()
  })

  btnPlaceFind.addEventListener("click", async ()=>{
    const q = setPlaceQuery.value.trim()
    if(!q) return
    placeResult.textContent = "Searching..."
    try{
      const p = await forwardPlace(q)
      if(!p){
        placeResult.textContent = "No match."
        return
      }
      state.settings.place = p
      await persistSettings()
      placeResult.textContent = `Set: ${p.name}`
      fetchWeather()
    }catch{
      placeResult.textContent = "Failed."
    }
  })

  btnPlaceGeo.addEventListener("click", async ()=>{
    placeResult.textContent = "Locating..."
    try{
      const g = await geolocate()
      const p = await reversePlace(g.lat, g.lon)
      state.settings.place = p
      await persistSettings()
      placeResult.textContent = `Set: ${p.name}`
      fetchWeather()
    }catch{
      placeResult.textContent = "Blocked or failed."
    }
  })

  btnDataExport.addEventListener("click", ()=>{
    exportJson("startpage-data.json", state)
  })

  dataImport.addEventListener("change", async ()=>{
    const f = dataImport.files && dataImport.files[0]
    if(!f) return
    const text = await f.text()
    let j = null
    try{ j = JSON.parse(text) }catch{}
    if(j && typeof j==="object"){
      state.settings = {...DEFAULTS.settings, ...(j.settings||{})}
      state.tasks = Array.isArray(j.tasks) ? j.tasks : []
      state.links = Array.isArray(j.links) ? j.links : []
      state.notes = typeof j.notes==="string" ? j.notes : ""
      state.agenda = Array.isArray(j.agenda) ? j.agenda : []
      state.focus = j.focus && typeof j.focus==="object" ? {...DEFAULTS.focus, ...j.focus} : structuredClone(DEFAULTS.focus)
      await persistAll()
      applyTheme()
      elEngine.value = state.settings.engine || "ddg"
      elNotesInput.value = state.notes || ""
      renderNotes()
      renderTasks()
      renderLinks()
      renderAgenda()
      setFocusDisplay()
      fetchWeather()
      setStatus("Imported")
      setTimeout(()=> setStatus(""), 1200)
    }
    dataImport.value = ""
  })

  btnDataReset.addEventListener("click", async ()=>{
    state = structuredClone(DEFAULTS)
    await persistAll()
    applyTheme()
    elEngine.value = state.settings.engine
    elNotesInput.value = state.notes
    notesPreviewMode = false
    renderNotes()
    setTaskFilter("today")
    renderLinks()
    renderAgenda()
    await resetFocus()
    fetchWeather()
    setStatus("Reset")
    setTimeout(()=> setStatus(""), 1200)
  })

  btnFocusStart.addEventListener("click", ()=> startFocus())
  btnFocusPause.addEventListener("click", ()=> pauseFocus())
  btnFocusSkip.addEventListener("click", ()=> skipFocus())
  btnFocusReset.addEventListener("click", ()=> resetFocus())
}

async function boot(){
  await loadState()
  applyTheme()
  renderTime()
  setInterval(renderTime, 1000)
  renderNotes()
  renderLinks()
  setTaskFilter("today")
  renderAgenda()
  setFocusDisplay()
  startFocusTick()
  wireUi()
  fetchWeather()
  registerSw()
}

async function registerSw(){
  if(!("serviceWorker" in navigator)) return
  try{
    await navigator.serviceWorker.register("./service-worker.js", {scope:"./"})
  }catch{}
}

boot()

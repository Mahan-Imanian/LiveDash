(function(global){
  const VERSION = 12;
  const STORAGE_KEY = "livedash:v12:state";
  const LEGACY_KEYS = ["livedash:v11:state", "livedash:v10:state", "livedash:v9:state", "livedash:v8:state", "livedash:v7:state", "livedash:v6:state", "livedash:v5:state", "livedash:v4:state", "livedash:state", "liveDashState"];
  const now = () => new Date().toISOString();
  const uid = (prefix) => `${prefix}-${Math.random().toString(36).slice(2,8)}-${Date.now().toString(36)}`;
  const clone = (value) => JSON.parse(JSON.stringify(value));
  const todayISO = () => new Date().toISOString().slice(0,10);
  const plusDays = (days) => {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.toISOString().slice(0,10);
  };

  const moduleCatalog = [
    { id:"work-queue", name:"Work Queue", category:"Tasks", description:"Prioritized tasks with status, due date, source, and direct completion.", span:8, sizes:[6,8,12], dataSource:"Local tasks", freshness:"Instant local updates", roles:["Today","Work"], permissions:"None", states:"Empty, stale, offline, conflict", preview:"Top tasks, blockers, next action" },
    { id:"context-rail", name:"Browser Context", category:"Operations", description:"Capture the active tab, selected text, recent pages, and browser-sourced work.", span:4, sizes:[3,4,6], dataSource:"Current tab and local captures", freshness:"On demand", roles:["Today","Capture"], permissions:"activeTab", states:"No active tab, permission denied", preview:"Save page, task from URL, source note" },
    { id:"capture-inbox", name:"Capture Inbox", category:"Notes", description:"Unprocessed notes, URLs, and decisions collected from popup, side panel, or command palette.", span:6, sizes:[4,6,8], dataSource:"Local captures", freshness:"Instant local updates", roles:["Today","Capture"], permissions:"None", states:"Empty inbox, conflict", preview:"Captured page, quick note, action required" },
    { id:"alerts-list", name:"Alerts", category:"Alerts", description:"Actionable local reminders, blocked work, stale reports, and system warnings.", span:4, sizes:[3,4,6], dataSource:"Local alerts", freshness:"Source-level timestamps", roles:["Today","Alerts"], permissions:"None", states:"Empty, acknowledged, stale", preview:"Severity, source, action" },
    { id:"agenda", name:"Agenda", category:"Operations", description:"Next commitments and focus blocks in user-local time.", span:4, sizes:[3,4,6], dataSource:"Local schedule", freshness:"Local calendar seed", roles:["Today","Work"], permissions:"None", states:"No events", preview:"Next event, prep note" },
    { id:"activity", name:"Activity", category:"Team Activity", description:"Timeline of local changes, imports, exports, completions, and module edits.", span:6, sizes:[4,6,8,12], dataSource:"Local audit trail", freshness:"Instant local updates", roles:["Today","Activity"], permissions:"None", states:"Empty, filtered", preview:"Changed item, time, source" },
    { id:"reports", name:"Reports", category:"Reports", description:"Saved local review cards with export status and freshness.", span:6, sizes:[4,6,8], dataSource:"Local reports", freshness:"Last generated timestamp", roles:["Reports","Weekly Review"], permissions:"None", states:"Stale, generated, failed", preview:"Weekly review, export status" },
    { id:"metric-drilldown", name:"Work State Metrics", category:"Metrics", description:"Actionable metrics tied to tasks, captures, reports, and stale sources.", span:6, sizes:[4,6,8,12], dataSource:"Local records", freshness:"Derived live from local state", roles:["Today","Reports"], permissions:"None", states:"No data, stale source", preview:"Due today, blocked, stale reports" },
    { id:"notes-log", name:"Decision Log", category:"Notes", description:"Searchable notes with tags, timestamps, source links, and edit history.", span:6, sizes:[4,6,8], dataSource:"Local notes", freshness:"Instant local updates", roles:["Work","Activity"], permissions:"None", states:"Empty, filtered", preview:"Decision, tag, source URL" },
    { id:"module-library", name:"Module Library", category:"Personal Productivity", description:"Add approved modules with preview, source requirement, and grid span options.", span:12, sizes:[8,12], dataSource:"Local module registry", freshness:"Static registry", roles:["Edit"], permissions:"None", states:"No matches", preview:"Category, preview, recommended size" }
  ];

  const templates = [
    { id:"today", name:"Today", description:"Fast new-tab workflow: command, urgent work, schedule, captures, and changes.", modules:["work-queue","context-rail","alerts-list","agenda","capture-inbox","activity","metric-drilldown"] },
    { id:"work", name:"Work Queue", description:"Task-heavy view for execution and follow-up.", modules:["work-queue","capture-inbox","agenda","alerts-list","notes-log","activity"] },
    { id:"review", name:"Weekly Review", description:"Reports, metrics, activity, and unresolved work.", modules:["reports","metric-drilldown","activity","alerts-list","work-queue","notes-log"] },
    { id:"reports", name:"Reports", description:"Export-ready reports and source freshness.", modules:["reports","metric-drilldown","activity","alerts-list"] },
    { id:"minimal", name:"Minimal", description:"Command, top work, next event, and capture inbox.", modules:["work-queue","context-rail","agenda","capture-inbox"] }
  ];

  function layoutFromTemplate(templateId){
    const template = templates.find((item) => item.id === templateId) || templates[0];
    return template.modules.map((type, index) => {
      const meta = moduleCatalog.find((item) => item.id === type) || moduleCatalog[0];
      return { id: uid("module"), type, span: meta.span, order: index, settings:{ density:"compact", refresh:"manual" } };
    });
  }

  function createDefaultState(){
    const createdAt = now();
    return {
      schemaVersion: VERSION,
      createdAt,
      updatedAt: createdAt,
      selectedView:"today",
      selectedSection:"today",
      editMode:false,
      dirty:false,
      commandHistory:["Add task", "Capture current page", "Open reports"],
      settings:{
        theme:"dark",
        density:"compact",
        timeFormat:"auto",
        defaultView:"today",
        displayName:"Alex",
        reducedMotion:false,
        showLocalStatus:true,
        defaultModuleSpan:6,
        captureMode:"inbox"
      },
      templates,
      moduleCatalog,
      layouts:{
        today: layoutFromTemplate("today"),
        work: layoutFromTemplate("work"),
        review: layoutFromTemplate("review"),
        reports: layoutFromTemplate("reports"),
        minimal: layoutFromTemplate("minimal")
      },
      tasks:[
        { id:uid("task"), title:"Review blocked work before 4 PM", priority:"high", status:"open", due:todayISO(), source:"Weekly review", owner:"You", notes:"Resolve or reschedule blockers before end of day.", createdAt },
        { id:uid("task"), title:"Prepare Monday dashboard export", priority:"medium", status:"open", due:plusDays(1), source:"Reports", owner:"You", notes:"Export backup and review stale sources.", createdAt },
        { id:uid("task"), title:"Tag unprocessed capture notes", priority:"medium", status:"blocked", due:todayISO(), source:"Capture inbox", owner:"You", notes:"Five captures need a destination.", createdAt },
        { id:uid("task"), title:"Archive completed focus notes", priority:"low", status:"done", due:plusDays(-1), source:"Notes", owner:"You", notes:"Completed during last focus block.", createdAt }
      ],
      captures:[
        { id:uid("capture"), type:"page", title:"Chrome extension QA checklist", url:"https://developer.chrome.com/docs/extensions/", note:"Use for MV3 validation and side panel behavior.", status:"inbox", createdAt },
        { id:uid("capture"), type:"note", title:"Design pass", url:"", note:"Keep first viewport focused on command, urgent work, agenda, and changes.", status:"inbox", createdAt }
      ],
      notes:[
        { id:uid("note"), title:"Operating principle", body:"New tab must answer what changed, what matters, and what to do next.", tags:["product","review"], sourceUrl:"", createdAt, updatedAt:createdAt },
        { id:uid("note"), title:"Visual system", body:"Use neutral dark surfaces, restrained blue primary action, and semantic state colors only.", tags:["design"], sourceUrl:"", createdAt, updatedAt:createdAt }
      ],
      alerts:[
        { id:uid("alert"), title:"Capture inbox needs triage", body:"Two captured items are still unprocessed.", severity:"warning", status:"open", source:"Capture inbox", createdAt, action:"Open inbox" },
        { id:uid("alert"), title:"Blocked task due today", body:"One task is blocked and due today.", severity:"critical", status:"open", source:"Tasks", createdAt, action:"Review blockers" }
      ],
      reports:[
        { id:uid("report"), title:"Weekly operating review", status:"ready", timeRange:"7 days", lastGenerated:createdAt, format:"JSON backup" },
        { id:uid("report"), title:"Task completion summary", status:"stale", timeRange:"30 days", lastGenerated:plusDays(-3), format:"Local report" }
      ],
      schedule:[
        { id:uid("event"), title:"Operating review", time:"4:30 PM", type:"Review", status:"confirmed", prep:"Open blocked tasks and stale reports." },
        { id:uid("event"), title:"Focus block", time:"Tomorrow 9:00 AM", type:"Focus", status:"planned", prep:"Process capture inbox." }
      ],
      sources:[
        { id:"tasks", label:"Tasks", state:"fresh", updatedAt:createdAt },
        { id:"captures", label:"Captures", state:"fresh", updatedAt:createdAt },
        { id:"reports", label:"Reports", state:"stale", updatedAt:plusDays(-3) },
        { id:"storage", label:"Local backup", state:"fresh", updatedAt:createdAt }
      ],
      activity:[
        { id:uid("activity"), type:"system", title:"Today view prepared", detail:"Local work, capture, and source data are ready.", createdAt },
        { id:uid("activity"), type:"task", title:"Task captured", detail:"Review blocked work before 4 PM", createdAt }
      ],
      notifications:[
        { id:uid("notice"), title:"Blocked task due today", body:"One high-priority task needs a decision.", severity:"warning", read:false, createdAt },
        { id:uid("notice"), title:"Capture inbox ready", body:"Two local captures are waiting for triage.", severity:"info", read:false, createdAt }
      ],
      offlineQueue:[],
      lastBackup:null
    };
  }

  function mergeArray(defaults, source){
    return Array.isArray(source) ? source : clone(defaults);
  }

  function mergeState(source){
    const base = createDefaultState();
    if(!source || typeof source !== "object") return base;
    const next = { ...base, ...source };
    next.schemaVersion = VERSION;
    next.settings = { ...base.settings, ...(source.settings || {}) };
    next.templates = mergeArray(base.templates, source.templates);
    next.moduleCatalog = mergeArray(base.moduleCatalog, source.moduleCatalog).map((item) => ({ ...item, sizes: Array.isArray(item.sizes) ? item.sizes : [3,4,6,8,12], roles: Array.isArray(item.roles) ? item.roles : ["Today"] }));
    next.layouts = { ...base.layouts, ...(source.layouts || {}) };
    ["tasks","captures","notes","alerts","reports","schedule","sources","activity","notifications","offlineQueue"].forEach((key) => { next[key] = mergeArray(base[key], source[key]); });
    next.selectedView = next.layouts[next.selectedView] ? next.selectedView : "today";
    next.selectedSection = next.selectedSection || "today";
    next.editMode = Boolean(source.editMode);
    next.dirty = Boolean(next.dirty);
    return next;
  }

  global.LiveDashDefaults = { VERSION, STORAGE_KEY, LEGACY_KEYS, uid, clone, createDefaultState, mergeState, moduleCatalog, templates, layoutFromTemplate };
})(globalThis);

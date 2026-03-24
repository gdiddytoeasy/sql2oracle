// ═══════════════════════════════════════════════════════════════
// BLOCK GRID — Buffer Cache visualization
// ═══════════════════════════════════════════════════════════════
const grid = document.getElementById('block-grid');
const NCELLS = 48;
for (let i = 0; i < NCELLS; i++) {
  const c = document.createElement('div');
  c.className = 'block-cell';
  c.id = 'bc' + i;
  grid.appendChild(c);
}

let dirtyCount = 4;
function updateDirtyBlocks() {
  // Randomly mark some blocks as dirty
  const cells = document.querySelectorAll('.block-cell');
  cells.forEach(c => c.classList.remove('dirty'));
  const n = Math.floor(Math.random() * 10) + 2;
  dirtyCount = n;
  const used = new Set();
  for (let i = 0; i < n; i++) {
    let idx;
    do { idx = Math.floor(Math.random() * NCELLS); } while (used.has(idx));
    used.add(idx);
    cells[idx].classList.add('dirty');
  }
  document.getElementById('dirty-val').textContent = Math.round((n/NCELLS)*100) + '%';
}
setInterval(updateDirtyBlocks, 3000);
updateDirtyBlocks();

// ═══════════════════════════════════════════════════════════════
// SCN TICKER
// ═══════════════════════════════════════════════════════════════
let scn = 9842118;
let ckptScn = 9842100;
let logSeq = 482;

setInterval(() => {
  scn += Math.floor(Math.random() * 8) + 1;
  document.getElementById('scn-val').textContent = scn.toLocaleString();
  if (Math.random() < 0.15) {
    ckptScn = scn - Math.floor(Math.random() * 50);
    document.getElementById('ckpt-val').textContent = ckptScn.toLocaleString();
  }
  if (Math.random() < 0.005) {
    logSeq++;
    document.getElementById('logseq-val').textContent = logSeq;
    // Flash log active dot
    const dots = document.querySelectorAll('.log-dot.active');
    dots.forEach(d => { d.style.background = '#fff'; setTimeout(() => { d.style.background = ''; }, 300); });
  }
}, 800);

// ═══════════════════════════════════════════════════════════════
// ANIMATED PARTICLES along SVG paths
// ═══════════════════════════════════════════════════════════════
const svg = document.getElementById('flows-svg');

function createParticle(color, cls, targetSvg) {
  const c = document.createElementNS('http://www.w3.org/2000/svg','circle');
  c.setAttribute('r','6');
  c.setAttribute('fill', color);
  c.style.filter = `drop-shadow(0 0 10px ${color}) drop-shadow(0 0 4px ${color})`;
  c.setAttribute('opacity','0');
  (targetSvg || svg).appendChild(c);
  return c;
}

// Flow configs: [pathSelector, color, direction (1=forward, -1=reverse), interval_ms, duration_ms]
const flows = [
  { sel:'path.path-lgwr:nth-of-type(1)', color:'var(--lgwr)', dur:3500, interval:4500 },
  { sel:'path.path-lgwr:nth-of-type(2)', color:'var(--lgwr)', dur:3000, interval:5000 },
  { sel:'path.path-dbwn:nth-of-type(1)', color:'var(--dbwn)', dur:4000, interval:6000 },
  { sel:'path.path-dbwn:nth-of-type(2)', color:'var(--dbwn)', dur:3500, interval:6500 },
  { sel:'path.path-ckpt:nth-of-type(1)', color:'var(--ckpt)', dur:4500, interval:8000 },
  { sel:'path.path-ckpt:nth-of-type(2)', color:'var(--ckpt)', dur:4000, interval:9000 },
  { sel:'path.path-arcn:nth-of-type(1)', color:'var(--arcn)', dur:5000, interval:10000 },
  { sel:'path.path-arcn:nth-of-type(2)', color:'var(--arcn)', dur:4500, interval:10500 },
  { sel:'path.path-smon:nth-of-type(1)', color:'var(--smon)', dur:6000, interval:12000 },
  { sel:'path.path-mmon:nth-of-type(1)', color:'var(--mmon)', dur:5000, interval:9000 },
  { sel:'path.path-mmon:nth-of-type(2)', color:'var(--mmon)', dur:4500, interval:9500 },
  { sel:'path.path-mman:nth-of-type(1)', color:'var(--mman)', dur:4000, interval:8000 },
];

function animateAlongPath(pathEl, color, dur, targetSvg) {
  if (!pathEl) return;
  const len = pathEl.getTotalLength();
  const svgEl = targetSvg || svg;
  const dot = createParticle(color, null, svgEl);
  // Create a trailing particle for more visible movement
  const trail = document.createElementNS('http://www.w3.org/2000/svg','circle');
  trail.setAttribute('r','4');
  trail.setAttribute('fill', color);
  trail.style.filter = `drop-shadow(0 0 6px ${color})`;
  trail.setAttribute('opacity','0');
  svgEl.appendChild(trail);

  let start = null;
  function step(ts) {
    if (!start) start = ts;
    const t = Math.min((ts - start) / dur, 1);
    const pt = pathEl.getPointAtLength(t * len);
    dot.setAttribute('cx', pt.x);
    dot.setAttribute('cy', pt.y);
    const alpha = t < 0.08 ? t*12 : t > 0.92 ? (1-t)*12 : 1;
    dot.setAttribute('opacity', alpha);
    // Trail follows slightly behind
    const tTrail = Math.max(0, t - 0.06);
    const ptTrail = pathEl.getPointAtLength(tTrail * len);
    trail.setAttribute('cx', ptTrail.x);
    trail.setAttribute('cy', ptTrail.y);
    trail.setAttribute('opacity', alpha * 0.4);
    if (t < 1) {
      requestAnimationFrame(step);
    } else {
      dot.parentNode && dot.parentNode.removeChild(dot);
      trail.parentNode && trail.parentNode.removeChild(trail);
    }
  }
  requestAnimationFrame(step);
}

let currentView = 'standard';

function startFlows() {
  flows.forEach((f, i) => {
    setTimeout(() => {
      function fire() {
        if (currentView === 'standard' && !detailViewOpen) {
          const paths = document.querySelectorAll(f.sel);
          paths.forEach(p => animateAlongPath(p, f.color, f.dur));
        }
        setTimeout(fire, f.interval + Math.random() * 1500);
      }
      fire();
    }, i * 600);
  });
}
startFlows();

// ═══════════════════════════════════════════════════════════════
// MULTITENANT VIEW ANIMATIONS
// ═══════════════════════════════════════════════════════════════
function startMtFlows() {
  const mtSvg = document.getElementById('mt-flows-svg');
  if (!mtSvg) return;
  const mtFlows = mtSvg.querySelectorAll('.mt-flow');
  function fireMt() {
    if (currentView !== 'multitenant') { setTimeout(fireMt, 3000); return; }
    mtFlows.forEach((p, i) => {
      setTimeout(() => animateAlongPath(p, ['#C74634','#2ECC71','#3B82F6','var(--lgwr)'][i] || '#2ECC71', 4000, mtSvg), i * 800);
    });
    setTimeout(fireMt, 6000 + Math.random() * 2000);
  }
  fireMt();
}
startMtFlows();

// ═══════════════════════════════════════════════════════════════
// DATA GUARD VIEW ANIMATIONS
// ═══════════════════════════════════════════════════════════════
function startDgFlows() {
  const dgSvg = document.getElementById('dg-flows-svg');
  if (!dgSvg) return;
  const dgFlows = dgSvg.querySelectorAll('.dg-flow');
  function fireDg() {
    if (currentView !== 'dataguard') { setTimeout(fireDg, 3000); return; }
    dgFlows.forEach((p, i) => {
      setTimeout(() => animateAlongPath(p, ['#00D4FF','#00D4FF','#FF6B9D'][i] || '#00D4FF', 5000, dgSvg), i * 1200);
    });
    setTimeout(fireDg, 5000 + Math.random() * 2000);
  }
  fireDg();
}
startDgFlows();

// ═══════════════════════════════════════════════════════════════
// RAC VIEW ANIMATIONS
// ═══════════════════════════════════════════════════════════════
function startRacFlows() {
  const racSvg = document.getElementById('rac-flows-svg');
  if (!racSvg) return;
  const racFlows = racSvg.querySelectorAll('.rac-flow');
  function fireRac() {
    if (currentView !== 'rac') { setTimeout(fireRac, 3000); return; }
    racFlows.forEach((p, i) => {
      setTimeout(() => animateAlongPath(p, ['#A855F7','#A855F7','#3B82F6','#2ECC71'][i] || '#A855F7', 4500, racSvg), i * 1000);
    });
    setTimeout(fireRac, 5500 + Math.random() * 2000);
  }
  fireRac();
}
startRacFlows();

// Extra: client → listener particle
function clientParticle() {
  if (currentView !== 'standard' || detailViewOpen) { setTimeout(clientParticle, 3000); return; }
  const path = svg.querySelector('path[d*="192,48"]');
  if (path) animateAlongPath(path, 'rgba(41,128,185,0.9)', 1800);
  setTimeout(clientParticle, 4000 + Math.random()*2000);
}
setTimeout(clientParticle, 500);

// Extra: listener → PGA particle
function listenerParticle() {
  if (currentView !== 'standard') { setTimeout(listenerParticle, 3000); return; }
  const path = svg.querySelector('path[d*="330,78"]');
  if (path) animateAlongPath(path, 'rgba(46,204,113,0.9)', 2500);
  setTimeout(listenerParticle, 5000 + Math.random()*2000);
}
setTimeout(listenerParticle, 1200);

// Extra: server proc → redo buffer
function spRedoParticle() {
  if (currentView !== 'standard') { setTimeout(spRedoParticle, 3000); return; }
  const path = svg.querySelector('path[d*="110,290"]');
  if (path) animateAlongPath(path, 'rgba(255,71,87,0.8)', 2200);
  setTimeout(spRedoParticle, 3500 + Math.random()*1500);
}
setTimeout(spRedoParticle, 700);

// ═══════════════════════════════════════════════════════════════
// PROCESS GLOW CYCLING
// ═══════════════════════════════════════════════════════════════
const procIds = ['proc-lgwr','proc-dbwn','proc-ckpt','proc-arcn','proc-smon','proc-pmon','proc-mmon','proc-mman'];
let glowIdx = 0;
function cycleGlow() {
  procIds.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.remove('active-glow');
  });
  const el = document.getElementById(procIds[glowIdx]);
  if (el) el.classList.add('active-glow');
  glowIdx = (glowIdx + 1) % procIds.length;
}
setInterval(cycleGlow, 2500);
cycleGlow();

// ═══════════════════════════════════════════════════════════════
// INFO PANEL DATA
// ═══════════════════════════════════════════════════════════════
const INFO = {
  client: {
    title:'CLIENT APPLICATION', subtitle:'NETWORK ENTRY POINT',
    color:'#2980B9',
    desc:'The entry point for all database interactions. Applications connect to Oracle via Oracle Net Services (SQL*Net) using JDBC/ODBC/OCI adapters. The SQL statement is formulated and sent over TCP/IP to the Oracle Listener on port 1521. Bind variables are set here to ensure soft parses in the Shared Pool.',
    flows:[
      {c:'#2980B9', t:'→ Listener:1521 via Oracle Net / SQL*Net'},
      {c:'#2980B9', t:'→ Sends SQL text + bind variable values'},
      {c:'#2980B9', t:'← Receives result set rows via cursor fetch'},
    ],
    trigger:'SQL*Plus: sqlplus user/pass@//host/service\nJDBC: jdbc:oracle:thin:@//host:1521/ORCL\nOCI: OCILogon2() → connection established'
  },
  listener: {
    title:'ORACLE LISTENER', subtitle:'CONNECTION BROKER — PORT 1521',
    color:'#2ECC71',
    desc:'The Listener is an independent OS process that accepts incoming connections on port 1521. It matches the SERVICE_NAME or SID in the connection string to a registered database service, then either spawns a new dedicated server process (Dedicated Server mode) or routes to an existing Dispatcher (Shared Server / MTS mode). After handoff, the Listener is no longer in the communication path.',
    flows:[
      {c:'#2980B9', t:'← Receives connection request from client'},
      {c:'#2ECC71', t:'→ Spawns dedicated server process (fork/exec)'},
      {c:'#2ECC71', t:'→ Redirects client to server process port'},
      {c:'#2ECC71', t:'← PMON registers services with Listener'},
    ],
    trigger:'lsnrctl start → reads listener.ora\nlsnrctl status → shows registered services\nDynamic registration: PMON auto-registers\nTNS alias resolved via tnsnames.ora or LDAP'
  },
  pga: {
    title:'SERVER PROCESS + PGA', subtitle:'PROGRAM GLOBAL AREA — PRIVATE PER SESSION',
    color:'#A855F7',
    desc:'One dedicated OS server process is spawned per session (Dedicated Server mode). It gets its own private PGA memory — no sharing with other sessions. The PGA holds the Sort Area (for in-memory sorts), Hash Area (for hash joins), Cursor State (current SQL execution position), Session Stack (PL/SQL call stack), and Bind Variable values. When PGA Sort Area is exhausted, Oracle spills to the TEMP tablespace.',
    flows:[
      {c:'#2ECC71', t:'← Reads data blocks from Buffer Cache'},
      {c:'#F1C40F', t:'↔ Accesses Library Cache for SQL plans'},
      {c:'#FF4757', t:'→ Writes change vectors to Redo Log Buffer'},
      {c:'#A855F7', t:'→ Spills sort/hash to TEMP tablespace on disk'},
      {c:'#FB923C', t:'← PMON cleans up this PGA if session dies'},
    ],
    trigger:'PGA_AGGREGATE_TARGET: auto-manage total PGA\nPGA_AGGREGATE_LIMIT: hard cap (12c+)\nSort spill: SORT_AREA_SIZE threshold\nHash join: HASH_AREA_SIZE threshold'
  },
  buffercache: {
    title:'DATABASE BUFFER CACHE', subtitle:'SGA — PRIMARY DATA CACHE',
    color:'#2ECC71',
    desc:'The Buffer Cache is the most performance-critical SGA component. Every block Oracle reads from disk is cached here in 8KB units. Subsequent accesses (Logical Reads) are served from RAM — orders of magnitude faster than disk. Oracle uses a variant of the LRU (Least Recently Used) algorithm with touch-count enhancement. Modified blocks (Dirty Buffers) accumulate here until DBWn writes them to disk asynchronously.',
    flows:[
      {c:'#2ECC71', t:'→ Server process reads blocks INTO cache (miss→disk)'},
      {c:'#2ECC71', t:'→ Server process modifies blocks in cache (DML)'},
      {c:'#2ECC71', t:'← DBWn writes dirty blocks FROM cache to Data Files'},
      {c:'#34D399', t:'← MMAN grows/shrinks this pool dynamically (ASMM)'},
      {c:'#38BDF8', t:'← MMON samples this cache for AWR metrics'},
    ],
    trigger:'DB_CACHE_SIZE: fixed size\nSGA_TARGET + ASMM: auto-managed\nKEEP pool: pin hot objects\nRECYCLE pool: large table scans\nDEFAULT pool: everything else'
  },
  sharedpool: {
    title:'SHARED POOL', subtitle:'SGA — SQL CACHE + METADATA CACHE',
    color:'#F1C40F',
    desc:'The Shared Pool contains the Library Cache (stores parsed SQL and execution plans — enables soft parse reuse) and the Data Dictionary Cache (caches metadata from SYSTEM tablespace — table/column definitions, privilege info, object IDs). Hard parse = expensive (full parse + optimize + plan). Soft parse = cheap (find cached cursor and reuse plan). Bind variables enable soft parses across thousands of executions.',
    flows:[
      {c:'#F1C40F', t:'← Server process: hard parse stores plan here'},
      {c:'#F1C40F', t:'← Server process: soft parse reuses plan here'},
      {c:'#F1C40F', t:'← Data Dict Cache: reads metadata from SYSTEM.DBF'},
      {c:'#34D399', t:'← MMAN auto-tunes size within SGA_TARGET'},
    ],
    trigger:'SHARED_POOL_SIZE: manual sizing\nSGA_TARGET: let ASMM manage\nALTER SYSTEM FLUSH SHARED_POOL; (flush plans)\nV$SQL: all cached cursors with stats\nV$LIBRARY_CACHE: hit ratio per namespace'
  },
  redobuffer: {
    title:'REDO LOG BUFFER', subtitle:'SGA — WRITE-AHEAD LOG (WAL) BUFFER',
    color:'#FF4757',
    desc:'A fixed-size circular buffer in the SGA. Every change made to any block (data block or undo block) generates a Redo Record describing the change in detail (before/after values, SCN, block address). Server processes write Redo Records here immediately as they make changes. LGWR drains this buffer to the Online Redo Log Files on disk. The Redo Log Buffer is the core of Oracle\'s WAL guarantee.',
    flows:[
      {c:'#FF4757', t:'← Server processes write redo records (changes)'},
      {c:'#FF4757', t:'→ LGWR drains to Online Redo Log Files (disk)'},
      {c:'#FF4757', t:'LGWR triggers: COMMIT / 1/3 full / every 3sec / pre-DBWn'},
    ],
    trigger:'LOG_BUFFER: default 32MB (AMM), min 512KB\nV$LOG_BUFFER: current fill level\nAwait event "log file sync" = waiting for LGWR\n"redo buffer allocation retries" = buffer too small'
  },
  lgwr: {
    title:'LGWR — LOG WRITER', subtitle:'BACKGROUND PROCESS — REDO BUFFER → REDO LOG FILES',
    color:'#FF4757',
    desc:'LGWR is the most performance-critical background process. Its entire job is to flush redo records from the in-memory Redo Log Buffer to the Online Redo Log Files on disk. Oracle guarantees durability (the D in ACID) by ensuring LGWR completes its disk write BEFORE acknowledging a COMMIT to the client. LGWR writes SEQUENTIALLY — this is why redo logs should be on the fastest storage available (dedicated NVMe SSD). In Oracle 12.2+, LGWR can spawn parallel worker slaves for ultra-high-volume environments.',
    flows:[
      {c:'#FF4757', t:'← Reads from: Redo Log Buffer (SGA)'},
      {c:'#FF4757', t:'→ Writes to: Online Redo Log Files (sequential I/O)'},
      {c:'#FF4757', t:'→ On log switch: signals ARCn to archive current log'},
      {c:'#FF4757', t:'→ In Data Guard SYNC: also writes to Standby Redo Log'},
    ],
    trigger:'Triggered by: COMMIT (primary), 1/3-full buffer,\nevery 3 seconds (timeout), pre-DBWn checkpoint.\nV$SESSION_WAIT: "log file sync" = user waiting for LGWR\nV$LOG: current log group and sequence number\nalert_ORCL.log: every log switch is recorded'
  },
  dbwn: {
    title:'DBWn — DATABASE WRITER', subtitle:'BACKGROUND PROCESS — DIRTY BUFFERS → DATA FILES',
    color:'#2ECC71',
    desc:'DBWn is the process responsible for writing modified (dirty) data blocks from the Buffer Cache back to the Data Files on disk. Crucially, DBWn does NOT write on every COMMIT — it writes in large batches (Scattered/Random I/O) triggered by specific events. This separation allows user sessions to COMMIT very fast (just LGWR sequential write) while DBWn handles the slower random I/O in the background, completely invisible to users. You can run up to 20 DBWn processes (DB_WRITER_PROCESSES) on high-write systems.',
    flows:[
      {c:'#2ECC71', t:'← Reads: dirty blocks from Buffer Cache (RAM)'},
      {c:'#2ECC71', t:'→ Writes: dirty blocks to Data Files (scattered I/O)'},
      {c:'#2ECC71', t:'→ Writes: dirty undo blocks to UNDO tablespace'},
      {c:'#F1C40F', t:'← Triggered by: CKPT signal (checkpoint event)'},
    ],
    trigger:'Triggered by: CKPT checkpoint, Buffer Cache < 1% free,\nevery 3 seconds, tablespace offline/readonly.\nDB_WRITER_PROCESSES = 1 to 20\nV$BH: buffer headers (dirty/clean count)\n"free buffer waits" = DBWn can\'t keep up'
  },
  ckpt: {
    title:'CKPT — CHECKPOINT PROCESS', subtitle:'BACKGROUND PROCESS — COORDINATOR',
    color:'#F1C40F',
    desc:'CKPT does not write any data itself — it is a pure coordinator. When a checkpoint occurs, CKPT: (1) signals DBWn to write dirty blocks to disk, (2) updates the Control File with the current Checkpoint SCN, and (3) updates every Data File header with the checkpoint SCN. The Checkpoint SCN is Oracle\'s "safe point" — any crash recovery only needs to apply redo from this SCN forward. A higher checkpoint frequency = faster crash recovery but higher I/O load. FAST_START_MTTR_TARGET controls this automatically.',
    flows:[
      {c:'#F1C40F', t:'→ Signals: DBWn to flush dirty blocks'},
      {c:'#F1C40F', t:'→ Writes: Checkpoint SCN to Control File'},
      {c:'#F1C40F', t:'→ Writes: Checkpoint SCN to all Data File headers'},
      {c:'#F1C40F', t:'LOG: every checkpoint logged to alert_ORCL.log'},
    ],
    trigger:'FAST_START_MTTR_TARGET: set recovery target (seconds)\nLOG_CHECKPOINT_INTERVAL: force checkpoint every N blocks\nLOG_CHECKPOINT_TIMEOUT: checkpoint every N seconds\n"checkpoint not complete" in alert log = DBWn too slow\nV$INSTANCE_RECOVERY: current estimated recovery time'
  },
  arcn: {
    title:'ARCn — ARCHIVER PROCESS', subtitle:'BACKGROUND PROCESS — REDO LOG → ARCHIVE DEST',
    color:'#00D4FF',
    desc:'ARCn copies Online Redo Log files to one or more archive destinations AFTER a log switch occurs (when LGWR fills the current log group and moves to the next). In ARCHIVELOG mode, Oracle CANNOT overwrite a redo log group until ARCn has successfully archived it. This archived log trail, combined with a database backup, enables complete Point-In-Time Recovery (PITR) to any SCN or timestamp. Multiple ARCn processes (ARC0 through ARC9) can run in parallel to handle high-volume environments.',
    flows:[
      {c:'#00D4FF', t:'← Triggered: by LGWR after log switch event'},
      {c:'#00D4FF', t:'← Reads: from Online Redo Log File (full group)'},
      {c:'#00D4FF', t:'→ Writes: to Archive Destination 1 (local FRA)'},
      {c:'#00D4FF', t:'→ Writes: to Archive Destination 2 (Data Guard standby)'},
    ],
    trigger:'LOG_ARCHIVE_MODE: must be ARCHIVELOG for production\nLOG_ARCHIVE_DEST_1: local destination (mandatory)\nLOG_ARCHIVE_DEST_2: remote (Data Guard standby)\nLOG_ARCHIVE_MAX_PROCESSES: 1 to 30 ARCn processes\nV$ARCHIVE_PROCESSES: current ARCn process status\n"archiver stuck" = archive dest full = EMERGENCY'
  },
  smon: {
    title:'SMON — SYSTEM MONITOR', subtitle:'BACKGROUND PROCESS — RECOVERY + MAINTENANCE',
    color:'#A855F7',
    desc:'SMON is Oracle\'s recovery and housekeeping process. At instance startup, SMON performs automatic crash recovery: it reads the Redo Logs (applying committed changes to Data Files = roll forward) then uses Undo Segments to roll back any uncommitted transactions (roll back). During normal operation, SMON cleans up temporary segments from failed operations, coalesces free space in tablespaces, and performs transaction recovery for dead distributed transactions.',
    flows:[
      {c:'#A855F7', t:'← Startup: reads Redo Logs for roll-forward'},
      {c:'#A855F7', t:'← Startup: reads Undo segments for roll-back'},
      {c:'#A855F7', t:'→ Writes recovered blocks to Data Files'},
      {c:'#A855F7', t:'→ Cleans up TEMP tablespace segments'},
      {c:'#A855F7', t:'→ Coalesces free space in Data Files'},
    ],
    trigger:'Crash recovery: automatic at instance startup\nTEMP cleanup: failed sorts/hash joins leave orphan segs\nTransaction recovery: dead distributed TXs (2PC)\nFree space coalesce: dictionary-managed tablespaces\nV$FAST_START_TRANSACTIONS: recovery progress'
  },
  pmon: {
    title:'PMON — PROCESS MONITOR', subtitle:'BACKGROUND PROCESS — SESSION CLEANUP',
    color:'#FB923C',
    desc:'PMON watches over all Oracle server processes. When a client disconnects abnormally (crash, network cut, OOM kill), PMON detects the orphaned server process within seconds and cleans up: (1) rolls back the incomplete transaction using Undo data, (2) releases all locks held by the dead session, (3) frees the PGA memory, (4) removes the session from V$SESSION. PMON also registers database services with the Listener so new connections can find the database.',
    flows:[
      {c:'#FB923C', t:'← Monitors: all server process heartbeats'},
      {c:'#FB923C', t:'→ On dead process: rolls back TX via Undo data'},
      {c:'#FB923C', t:'→ Releases: all TX locks, DML locks, DDL locks'},
      {c:'#FB923C', t:'→ Frees: PGA memory of dead session'},
      {c:'#2ECC71', t:'→ Registers: services with Oracle Listener (auto)'},
    ],
    trigger:'No manual trigger needed — PMON always running\nDetects death via: process heartbeat / OS signals\nRollback uses: UNDO tablespace before-images\nLock release: automatic, instantaneous\nV$SESSION: session removed immediately after cleanup'
  },
  mmon: {
    title:'MMON — MANAGEABILITY MONITOR', subtitle:'BACKGROUND PROCESS — AWR SNAPSHOTS + ASH',
    color:'#38BDF8',
    desc:'MMON and its slave processes (Mnnn) capture performance data for the Automatic Workload Repository (AWR). Every 60 minutes (configurable), MMON takes a snapshot: it reads performance statistics from V$ views (V$SYSSTAT, V$SESSTAT, V$SQL), session wait event data (Active Session History / ASH), and SQL execution metrics, then writes them to the SYSAUX tablespace (WRH$_ tables). AWR data enables ADDM (Automatic Database Diagnostic Monitor) to automatically identify performance issues.',
    flows:[
      {c:'#38BDF8', t:'← Reads: V$SYSSTAT, V$SQL, V$SESSION_WAIT'},
      {c:'#38BDF8', t:'← Samples: Active Session History every 1 second'},
      {c:'#38BDF8', t:'→ Writes: AWR snapshots to SYSAUX (WRH$_ tables)'},
      {c:'#38BDF8', t:'→ Checks: threshold alerts (CPU, I/O, wait events)'},
    ],
    trigger:'AWR snapshot interval: default 60 minutes\nAWR retention: default 8 days\nDBMS_WORKLOAD_REPOSITORY.CREATE_SNAPSHOT(): manual\nADDM triggered automatically after each snapshot\nRequires: Oracle Diagnostic Pack license (EE)\nV$AWR_CONTROL: current settings'
  },
  mman: {
    title:'MMAN — MEMORY MANAGER', subtitle:'BACKGROUND PROCESS — AUTOMATIC SGA/PGA TUNING',
    color:'#34D399',
    desc:'MMAN is the engine behind Automatic Shared Memory Management (ASMM) and Automatic Memory Management (AMM). Under ASMM (SGA_TARGET set), MMAN continuously monitors the pressure on each SGA component (Buffer Cache, Shared Pool, Large Pool, Streams Pool) and reallocates memory between them dynamically — shrinking underutilized pools and growing pressure-filled ones. Under AMM (MEMORY_TARGET set), MMAN also manages the PGA aggregate.',
    flows:[
      {c:'#34D399', t:'← Monitors: Buffer Cache pressure (free buffer waits)'},
      {c:'#34D399', t:'← Monitors: Shared Pool pressure (hard parse rate)'},
      {c:'#34D399', t:'→ Grows/shrinks: Buffer Cache within SGA_TARGET'},
      {c:'#34D399', t:'→ Grows/shrinks: Shared Pool within SGA_TARGET'},
      {c:'#34D399', t:'→ Under AMM: also tunes PGA_AGGREGATE_TARGET'},
    ],
    trigger:'ASMM: set SGA_TARGET, set individual pools to 0\nAMM: set MEMORY_TARGET (> SGA_TARGET + PGA)\nV$SGA_DYNAMIC_COMPONENTS: current sizes + history\nV$MEMORY_DYNAMIC_COMPONENTS: AMM breakdown\n"ORA-04031: unable to extend shared pool" = pool too small'
  },
  datafiles: {
    title:'DATA FILES (.DBF)', subtitle:'PHYSICAL STORAGE — TABLESPACE CONTAINERS',
    color:'#2ECC71',
    desc:'Data Files are the physical manifestation of Oracle tablespaces on disk. Every table row, index entry, LOB value, and object in the database ultimately lives in a data file as 8KB blocks. The file is organized as: File Header (contains file# and block# 1) → Segment Header blocks → Extent Map → Data Blocks. DBWn writes dirty blocks to data files (scattered I/O pattern). The server process reads blocks from data files on a Buffer Cache miss (physical read). CKPT updates data file headers with the checkpoint SCN.',
    flows:[
      {c:'#2ECC71', t:'← DBWn writes dirty 8KB blocks (scattered I/O)'},
      {c:'#2ECC71', t:'← Server process reads blocks on cache miss (physical read)'},
      {c:'#F1C40F', t:'← CKPT updates file header with checkpoint SCN'},
      {c:'#A855F7', t:'← SMON applies redo during crash recovery'},
    ],
    trigger:'Add a file: ALTER TABLESPACE users ADD DATAFILE ...\nAutoextend: AUTOEXTEND ON NEXT 100M MAXSIZE 32G\nV$DATAFILE: all data files and their status\nDBA_DATA_FILES: logical view of tablespace → files\nBlock check: DB_BLOCK_CHECKSUM=FULL for corruption detect'
  },
  redologs: {
    title:'ONLINE REDO LOG FILES', subtitle:'PHYSICAL STORAGE — WAL JOURNAL (CIRCULAR)',
    color:'#FF4757',
    desc:'The Online Redo Log Files are Oracle\'s Write-Ahead Log (WAL) journal — the durability guarantee. LGWR writes ALL database changes here BEFORE acknowledging commits. They operate in a circular pattern: Group 1 → Group 2 → Group 3 → Group 1. When LGWR fills the current group, a LOG SWITCH occurs: CKPT fires, ARCn copies the full group to the archive destination, and LGWR starts writing to the next group. Each group should have 2+ members (multiplexed copies) on different disks for protection against log file corruption.',
    flows:[
      {c:'#FF4757', t:'← LGWR writes redo records (sequential, fast)'},
      {c:'#00D4FF', t:'→ ARCn copies full group to Archive Dest after switch'},
      {c:'#FF4757', t:'← SMON reads during crash recovery (roll forward)'},
    ],
    trigger:'Add a redo log group: ALTER DATABASE ADD LOGFILE GROUP 4 ...\nLog file size: optimal 500MB–4GB (sweet spot: 20-30 min switch)\n"checkpoint not complete": redo log too small → add more groups\nV$LOG: group status (CURRENT, ACTIVE, INACTIVE)\nV$LOGFILE: member file locations\nalert log: every log switch recorded with SCN+timestamp'
  },
  controlfile: {
    title:'CONTROL FILE', subtitle:'PHYSICAL STORAGE — DATABASE MASTER REGISTRY',
    color:'#F1C40F',
    desc:'The Control File is the master registry for the entire Oracle database. Oracle reads it at MOUNT stage (after NOMOUNT) to find the data files and redo log files. It contains: database name, DBID, creation SCN, all data file names and paths, all redo log group names, the current log sequence number, the checkpoint SCN, and the RMAN backup catalog. CKPT updates the control file on every checkpoint. Losing the control file without a backup = database cannot be opened. Always multiplex (3+ copies on different disks).',
    flows:[
      {c:'#F1C40F', t:'← CKPT writes checkpoint SCN on every checkpoint'},
      {c:'#F1C40F', t:'← LGWR updates log sequence# on every log switch'},
      {c:'#F1C40F', t:'← RMAN writes backup metadata here'},
      {c:'#F1C40F', t:'→ Read at STARTUP MOUNT to find all database files'},
    ],
    trigger:'CONTROL_FILES = /oradata/control01.ctl, /oradata/control02.ctl\nBackup: RMAN> BACKUP CURRENT CONTROLFILE;\nRestore: RMAN> RESTORE CONTROLFILE FROM AUTOBACKUP;\nV$CONTROLFILE: current control file locations\nV$DATABASE: info read from control file\nLost control file: requires full restore from backup'
  },
  archivelogs: {
    title:'ARCHIVED REDO LOGS', subtitle:'PHYSICAL STORAGE — POINT-IN-TIME RECOVERY',
    color:'#00D4FF',
    desc:'Archived redo logs are copies of filled Online Redo Log groups made by ARCn. Together with a database backup, they enable complete Point-In-Time Recovery (PITR) to any SCN or timestamp. They are the foundation of Oracle Data Guard (shipped to Standby) and Oracle Replication (LogMiner reads them). Without archived logs (NOARCHIVELOG mode), recovery is only possible to the last cold backup — unacceptable for production.',
    flows:[
      {c:'#00D4FF', t:'← ARCn copies from Online Redo Logs after switch'},
      {c:'#A855F7', t:'→ SMON reads during media recovery (RMAN RECOVER)'},
      {c:'#00D4FF', t:'→ Data Guard: shipped to Standby RFS process'},
      {c:'#00D4FF', t:'→ LogMiner / GoldenGate: read for CDC/replication'},
    ],
    trigger:'Verify archivelog mode: ARCHIVE LOG LIST;\nManual archive: ALTER SYSTEM ARCHIVE LOG CURRENT;\nCleanup: RMAN> DELETE ARCHIVELOG ALL COMPLETED BEFORE "SYSDATE-7";\nV$ARCHIVED_LOG: all archived log history\nDB_RECOVERY_FILE_DEST: FRA auto-manages archive dest'
  },
  undo: {
    title:'UNDO TABLESPACE', subtitle:'PHYSICAL STORAGE — BEFORE-IMAGES + MVCC',
    color:'#A855F7',
    desc:'The UNDO tablespace serves a dual, critical purpose in Oracle. Purpose 1 (Rollback): It stores before-images of every changed row. If a user ROLLBACKs, Oracle reads these before-images and restores the original data. Purpose 2 (Read Consistency / MVCC): Oracle\'s Multi-Version Concurrency Control means every read sees a consistent snapshot as of the query start SCN. If a block has been modified after your query started, Oracle reconstructs the old version from Undo data — on the fly. This is why Oracle readers NEVER block writers and writers NEVER block readers.',
    flows:[
      {c:'#FF4757', t:'← Server process: writes before-images here before DML'},
      {c:'#A855F7', t:'→ ROLLBACK: reads before-images to undo changes'},
      {c:'#A855F7', t:'→ Read consistency: reconstructs old block versions'},
      {c:'#FB923C', t:'← PMON: uses undo to roll back dead session TX'},
      {c:'#A855F7', t:'ORA-01555: "snapshot too old" if undo overwritten'},
    ],
    trigger:'UNDO_MANAGEMENT = AUTO (Automatic Undo Management)\nUNDO_TABLESPACE = UNDOTBS1\nUNDO_RETENTION = 900 (seconds to retain undo)\nV$UNDOSTAT: undo space usage statistics\nV$TRANSACTION: all active transactions + undo usage\nSGALOCK: undo header latch waits'
  },
  temp: {
    title:'TEMP TABLESPACE', subtitle:'PHYSICAL STORAGE — SORT/HASH SPILL TARGET',
    color:'#38BDF8',
    desc:'The TEMP tablespace is where Oracle spills Sort and Hash join operations when the PGA Sort/Hash area is insufficient to hold the data in RAM. It uses a special temporary file type (.tmp) that is never archived, never backed up, and is rebuilt from scratch at instance startup. Sort spill occurs when ORDER BY, GROUP BY, DISTINCT, or analytic function results exceed the PGA sort area. Direct reads/writes by the server process — not mediated by DBWn or the Buffer Cache.',
    flows:[
      {c:'#A855F7', t:'← Server process writes sort runs on spill'},
      {c:'#A855F7', t:'→ Server process reads merged sort back for results'},
      {c:'#A855F7', t:'← SMON cleans up orphaned temp segments'},
      {c:'#38BDF8', t:'NOT backed up · NOT archived · rebuilt at startup'},
    ],
    trigger:'TEMP tablespace type: TEMPORARY (not PERMANENT)\nDB_BLOCK_SIZE vs temp = same block size\nV$SORT_USAGE: current sort operations using TEMP\nV$TEMPSEG_USAGE: temp segment breakdown\n"unable to extend temp segment" = TEMP full → add tempfile\nDBA_TEMP_FREE_SPACE: available TEMP space'
  },
  awr: {
    title:'SYSAUX — AWR REPOSITORY', subtitle:'PHYSICAL STORAGE — PERFORMANCE HISTORY',
    color:'#38BDF8',
    desc:'The SYSAUX tablespace is Oracle\'s auxiliary system tablespace (10g+) that houses performance and tool data. The Automatic Workload Repository (AWR) stores snapshots of performance statistics here in WRH$_ tables. The Active Session History (ASH) data (V$ACTIVE_SESSION_HISTORY) is stored in WRH$_ACTIVE_SESSION_HISTORY. ADDM (Automatic Database Diagnostic Monitor) reads these tables to automatically identify bottlenecks and generate recommendations. Also houses Enterprise Manager repository, Oracle Text, Spatial, and other optional components.',
    flows:[
      {c:'#38BDF8', t:'← MMON writes AWR snapshots every 60 minutes'},
      {c:'#38BDF8', t:'← MMON writes ASH samples every 1 second'},
      {c:'#38BDF8', t:'→ ADDM reads WRH$_ tables for analysis'},
      {c:'#38BDF8', t:'→ AWR report reads: DBMS_WORKLOAD_REPOSITORY'},
    ],
    trigger:'AWR snapshot: DBMS_WORKLOAD_REPOSITORY.CREATE_SNAPSHOT()\nAWR report: @?/rdbms/admin/awrrpt.sql\nASH report: @?/rdbms/admin/ashrpt.sql\nRetention: DBA_HIST_WR_CONTROL\nRequires Oracle Diagnostic Pack license (EE)\nV$ACTIVE_SESSION_HISTORY: in-memory ASH (1hr)'
  },
  spfile: {
    title:'SPFILE / PFILE', subtitle:'PHYSICAL STORAGE — INSTANCE INITIALIZATION',
    color:'rgba(231,76,60,0.8)',
    desc:'The Server Parameter File (SPFILE) is the binary parameter file Oracle reads at startup (NOMOUNT stage) to initialize the instance. It contains all initialization parameters: memory settings (SGA_TARGET, PGA_AGGREGATE_TARGET), process settings (PROCESSES, SESSIONS), file locations (CONTROL_FILES, DB_RECOVERY_FILE_DEST), and hundreds of other configuration parameters. ALTER SYSTEM ... SCOPE=SPFILE modifies the SPFILE for next restart. SCOPE=MEMORY changes take effect immediately but do not persist. SCOPE=BOTH does both.',
    flows:[
      {c:'rgba(231,76,60,0.8)', t:'→ Read at STARTUP NOMOUNT to create instance'},
      {c:'rgba(231,76,60,0.8)', t:'← ALTER SYSTEM...SCOPE=SPFILE writes changes'},
      {c:'rgba(231,76,60,0.8)', t:'← RMAN can back up SPFILE'},
    ],
    trigger:'Location: $ORACLE_HOME/dbs/spfileORCL.ora\nCreate SPFILE: CREATE SPFILE FROM PFILE;\nCreate PFILE: CREATE PFILE FROM SPFILE; (readable text)\nKey params: DB_NAME, DB_BLOCK_SIZE (cannot change!),\nSGA_TARGET, PGA_AGGREGATE_TARGET, PROCESSES,\nCONTROL_FILES, LOG_ARCHIVE_DEST_1, UNDO_TABLESPACE'
  },
  alertlog: {
    title:'ALERT LOG + TRACE FILES', subtitle:'PHYSICAL STORAGE — DIAGNOSTIC OUTPUT',
    color:'#FB923C',
    desc:'The Alert Log (alert_ORCL.log) is Oracle\'s continuous operational journal. Every significant event is written here: instance startup/shutdown with full parameter list, all ORA- errors with context, every log switch (with SCN and timestamp), every checkpoint event, tablespace/datafile additions, and Data Guard events. Trace files are generated by background processes on errors (lgwr_ORCL.trc, dbw0_ORCL.trc, etc.) and by sessions when SQL trace (ALTER SESSION SET SQL_TRACE=TRUE) is enabled.',
    flows:[
      {c:'#FB923C', t:'← All background processes write errors here'},
      {c:'#FB923C', t:'← CKPT: logs every checkpoint event'},
      {c:'#FF4757', t:'← LGWR: logs every log switch with SCN'},
      {c:'#A855F7', t:'← SMON: logs crash recovery completion'},
    ],
    trigger:'ADR (Automatic Diagnostic Repository):\n$ORACLE_BASE/diag/rdbms/ORCL/ORCL/trace/alert_ORCL.log\nView: SELECT * FROM V$DIAG_INFO;\nRecent ORA- errors: SELECT * FROM V$ALERT_LOG;\nSQL Trace: ALTER SESSION SET SQL_TRACE=TRUE;\ntkprof utility: parses trace file into readable report'
  },
  largepool: {
    title:'LARGE POOL', subtitle:'SGA — OPTIONAL LARGE ALLOCATION POOL',
    color:'#38BDF8',
    desc:'The Large Pool is an optional SGA component that prevents large memory allocations from fragmenting the Shared Pool. Without the Large Pool, RMAN backup I/O buffers and Parallel Query execution message buffers would steal from the Shared Pool, causing fragmentation and hard parse pressure. The Large Pool does not use LRU — allocations are explicitly freed, not evicted. Essential for: RMAN (backup/restore I/O buffers), Parallel Query, and Oracle Shared Server (MTS) UGA storage.',
    flows:[
      {c:'#38BDF8', t:'← RMAN: large I/O buffer allocations for backup'},
      {c:'#38BDF8', t:'← Parallel Query: coordination message buffers'},
      {c:'#38BDF8', t:'← Shared Server: UGA (User Global Area) storage'},
      {c:'#34D399', t:'← MMAN: auto-managed under SGA_TARGET (ASMM)'},
    ],
    trigger:'LARGE_POOL_SIZE: manual sizing (e.g., 256MB)\nWith SGA_TARGET: set to 0 (auto-managed)\nV$SGASTAT: current large pool usage\nRMAN: BACKUP BUFFERS = uses Large Pool first\n"ORA-04031 large pool" = increase LARGE_POOL_SIZE'
  },
  reco: {
    title:'RECO — RECOVERY PROCESS', subtitle:'BACKGROUND PROCESS — DISTRIBUTED TX RECOVERY',
    color:'rgba(251,113,133,0.8)',
    desc:'RECO handles the resolution of in-doubt distributed transactions (those involving database links and 2-Phase Commit / 2PC). When a distributed transaction is in-doubt (the coordinator died mid-commit), RECO periodically contacts the remote database to determine the transaction\'s final outcome and either commits or rolls it back. RECO runs silently in the background — it only becomes visible when distributed transactions get stuck.',
    flows:[
      {c:'rgba(251,113,133,0.8)', t:'← Reads DBA_2PC_PENDING for in-doubt TX'},
      {c:'rgba(251,113,133,0.8)', t:'→ Contacts remote DB via database link'},
      {c:'rgba(251,113,133,0.8)', t:'→ Commits or rolls back in-doubt TX'},
    ],
    trigger:'DISTRIBUTED_TRANSACTIONS = 0 (disables 2PC/dblinks)\nDBA_2PC_PENDING: shows stuck distributed TX\nManual: DBMS_TRANSACTION.PURGE_LOST_DB_ENTRY()\nWait event: "db link" waits indicate RECO working\nForce commit: COMMIT FORCE \'local_tx_id\';'
  },
  cjq: {
    title:'CJQ0 — JOB QUEUE', subtitle:'BACKGROUND PROCESS — DBMS_SCHEDULER JOBS',
    color:'rgba(163,230,53,0.8)',
    desc:'CJQ0 (Coordinator Job Queue process) manages Oracle DBMS_SCHEDULER jobs. It wakes up periodically, checks the job queue in the data dictionary for jobs scheduled to run, and spawns Jnnn worker processes to execute them. Oracle DBMS_SCHEDULER is the enterprise job scheduler that replaces the older DBMS_JOB package. Jobs can be time-based, event-based, or chain-linked.',
    flows:[
      {c:'rgba(163,230,53,0.8)', t:'← Reads DBA_SCHEDULER_JOBS for due jobs'},
      {c:'rgba(163,230,53,0.8)', t:'→ Spawns Jnnn worker processes to run jobs'},
      {c:'rgba(163,230,53,0.8)', t:'→ Updates job history (DBA_SCHEDULER_JOB_LOG)'},
    ],
    trigger:'JOB_QUEUE_PROCESSES: max simultaneous jobs (default 1000)\nCreate job: DBMS_SCHEDULER.CREATE_JOB(...)\nV$SCHEDULER_RUNNING_JOBS: currently executing\nDBA_SCHEDULER_JOB_LOG: execution history\nDisable: DBMS_SCHEDULER.DISABLE(\'job_name\')'
  },
  pwdfile: {
    title:'PASSWORD FILE', subtitle:'PHYSICAL STORAGE — SYSDBA/SYSOPER AUTH',
    color:'rgba(148,163,184,0.8)',
    desc:'The Password File (orapwORCL) stores the hashed passwords for users granted SYSDBA or SYSOPER system privileges. It is separate from the database itself so that SYS can authenticate and connect AS SYSDBA even when the database is in MOUNT or NOMOUNT state (before data dictionary is accessible). Created with the orapwd utility. Remote DBA connections (sqlplus sys/pass@host AS SYSDBA) require this file. REMOTE_LOGIN_PASSWORDFILE=EXCLUSIVE is the standard setting.',
    flows:[
      {c:'rgba(148,163,184,0.8)', t:'→ Read by: Oracle at SYSDBA/SYSOPER connection'},
      {c:'rgba(148,163,184,0.8)', t:'NOT part of the database backup (separate file)'},
    ],
    trigger:'Create: orapwd file=orapwORCL password=sys_pass entries=30\nLocation: $ORACLE_HOME/dbs/orapwORCL (Linux)\n         %ORACLE_HOME%\\database\\PWDorcl.ora (Windows)\nREMOTE_LOGIN_PASSWORDFILE = EXCLUSIVE (single DB uses it)\nV$PWFILE_USERS: users with SYSDBA/SYSOPER grants\nGRANT SYSDBA TO hr; — adds user to password file'
  },
  streamspool: {
    title:'STREAMS POOL', subtitle:'SGA — REPLICATION + CHANGE CAPTURE BUFFER',
    color:'#67E8F9',
    desc:'The Streams Pool holds capture and apply process state for Oracle Streams, GoldenGate Integrated Capture, Advanced Queuing (AQ), and XStream. If not explicitly configured, Oracle automatically sizes it from the shared pool when needed. For active GoldenGate environments, explicit sizing is recommended to prevent stealing from the Shared Pool.',
    flows:[
      {c:'#67E8F9', t:'← GoldenGate Integrated Capture reads redo here'},
      {c:'#67E8F9', t:'← Advanced Queuing (AQ) message buffers'},
      {c:'#67E8F9', t:'← XStream Out/In staging area'},
    ],
    trigger:'STREAMS_POOL_SIZE: explicit sizing\nWith SGA_TARGET: auto-managed\nV$STREAMS_POOL_STATISTICS: usage\nGoldenGate: requires AQ and Streams Pool\nLogMiner: also benefits from Streams Pool'
  },
  javapool: {
    title:'JAVA POOL', subtitle:'SGA — JVM + JAVA STORED PROCEDURE MEMORY',
    color:'#60A5FA',
    desc:'Required if you run Java stored procedures inside Oracle (loadjava, CREATE JAVA CLASS). Stores the shared memory for Java class definitions and JVM session state. Individual Java session state also comes from the Java Pool (or PGA in Dedicated Server). If JAVA_POOL_SIZE is too small with active Java use, ORA-04031 errors on the Java Pool result.',
    flows:[
      {c:'#60A5FA', t:'← Java stored procedure class loading'},
      {c:'#60A5FA', t:'← JVM shared state (class definitions)'},
    ],
    trigger:'JAVA_POOL_SIZE: default 24MB, increase for Java workloads\nWith SGA_TARGET: auto-managed\nV$SGASTAT: "java pool" component\nOracle JVM: optional database feature\nloadjava -user hr/pass@ORCL MyClass.java'
  },
  fixedsga: {
    title:'FIXED SGA', subtitle:'SGA — INTERNAL ORACLE STRUCTURES',
    color:'#818CF8',
    desc:'The Fixed SGA is the smallest and most internal SGA component. It is fixed at compile time (part of the Oracle binary) and contains Oracle\'s internal C data structures: latch definitions, lock/enqueue structures, instance state information, and the base X$ tables that underlie all V$ performance views. The size is determined by Oracle and cannot be changed. It is the "control panel" of the Oracle instance.',
    flows:[
      {c:'#818CF8', t:'→ V$ views: all V$ views read X$ structures here'},
      {c:'#818CF8', t:'← Automatically allocated at instance startup'},
      {c:'#818CF8', t:'Size determined by Oracle binary, not DBA'},
    ],
    trigger:'V$SGA: shows Fixed SGA size (typically 2-5MB)\nX$KSMSP: fixed SGA memory chunks\nCannot be tuned — Oracle-internal only\nIncreases slightly with each Oracle version\nSELECT * FROM V$SGA WHERE NAME=\'Fixed Size\';'
  },
};

function showInfo(key) {
  const d = INFO[key];
  if (!d) return;
  const panel = document.getElementById('info-panel');
  document.getElementById('info-color-bar').style.background = d.color;
  document.getElementById('info-title').style.color = d.color;
  document.getElementById('info-title').textContent = d.title;
  document.getElementById('info-subtitle').textContent = d.subtitle;
  document.getElementById('info-desc').textContent = d.desc;

  const flowsEl = document.getElementById('info-flows');
  flowsEl.innerHTML = (d.flows||[]).map(f =>
    `<div class="info-flow-item">
      <div class="iflow-dot" style="background:${f.c}"></div>
      <div class="iflow-txt">${f.t}</div>
    </div>`
  ).join('');

  const trigEl = document.getElementById('info-trigger');
  trigEl.innerHTML = (d.trigger||'').split('\n').map(line =>
    line.startsWith('V$') || line.startsWith('DBA_') || line.startsWith('ALTER') || line.startsWith('SELECT') || line.startsWith('CREATE') || line.startsWith('GRANT') || line.startsWith('RMAN') || line.startsWith('AWR') || line.startsWith('ARCH') || line.startsWith('DB') || line.startsWith('LOG') || line.startsWith('UNDO') || line.startsWith('orapwd') || line.startsWith('DBMS') || line.startsWith('JAVA')
      ? `<strong style="color:${d.color}">${line}</strong>`
      : line
  ).join('<br>');

  panel.classList.add('visible');
  document.getElementById('status-tip').textContent =
    `SELECTED: ${d.title} — ${d.subtitle}`;
}

function closeInfo() {
  document.getElementById('info-panel').classList.remove('visible');
  document.getElementById('status-tip').textContent = '← CLICK ANY COMPONENT FOR DETAILS';
}

// ═══════════════════════════════════════════════════════════════
// ZOOM
// ═══════════════════════════════════════════════════════════════
let scale = 1;
const diag = document.getElementById('diagram');

function zoom(factor) {
  scale = Math.max(0.4, Math.min(2.0, scale * factor));
  diag.style.transform = `scale(${scale})`;
  diag.style.transformOrigin = 'top center';
}
function resetZoom() {
  const canvas = document.getElementById('canvas');
  const sw = canvas.clientWidth;
  const fw = 1520 + 40;
  scale = Math.min(1, (sw - 40) / fw);
  diag.style.transform = `scale(${scale})`;
  diag.style.transformOrigin = 'top left';
  diag.style.marginLeft = '10px';
}

window.addEventListener('resize', resetZoom);
resetZoom();

// ═══════════════════════════════════════════════════════════════
// TAB SWITCHING — FULL VIEW SWAP
// ═══════════════════════════════════════════════════════════════
function switchView(v) {
  document.querySelectorAll('.h-tab').forEach(t => t.classList.remove('active'));
  event.target.classList.add('active');
  currentView = v;

  // Hide all views
  const views = ['standard','multitenant','dataguard','rac'];
  views.forEach(id => {
    const el = document.getElementById('view-' + id);
    if (el) el.style.display = 'none';
  });

  // Show selected view
  const activeView = document.getElementById('view-' + v);
  if (activeView) activeView.style.display = 'block';

  // Update status bar
  document.getElementById('status-tip').textContent =
    v === 'standard'    ? 'STANDARD 1:1 — INSTANCE:DATABASE TOPOLOGY' :
    v === 'multitenant' ? 'MULTITENANT — ONE CDB INSTANCE, MULTIPLE PDB DATABASES' :
    v === 'dataguard'   ? 'DATA GUARD — PRIMARY + PHYSICAL STANDBY WITH REDO SHIPPING' :
                          'RAC — MULTIPLE INSTANCES, ONE SHARED DATABASE (CACHE FUSION)';

  // Update legend visibility and content per view
  const legend = document.getElementById('legend');
  if (v === 'standard') {
    legend.innerHTML = originalLegendHTML;
    legend.style.display = 'grid';
  } else if (v === 'multitenant') {
    legend.innerHTML = `
      <div class="leg-item"><div class="leg-dot" style="background:#C74634"></div>CDB$ROOT</div>
      <div class="leg-item"><div class="leg-dot" style="background:rgba(148,163,184,0.6)"></div>PDB$SEED</div>
      <div class="leg-item"><div class="leg-dot" style="background:#2ECC71"></div>PDB1 — User DB</div>
      <div class="leg-item"><div class="leg-dot" style="background:#3B82F6"></div>PDB2 — User DB</div>
      <div class="leg-item"><div class="leg-dot" style="background:#3B82F6"></div>Shared SGA</div>
      <div class="leg-item"><div class="leg-dot" style="background:#22C55E"></div>Shared Bg Procs</div>`;
    legend.style.display = 'grid';
  } else if (v === 'dataguard') {
    legend.innerHTML = `
      <div class="leg-item"><div class="leg-dot" style="background:#2ECC71"></div>Primary Database</div>
      <div class="leg-item"><div class="leg-dot" style="background:#00D4FF"></div>Physical Standby</div>
      <div class="leg-item"><div class="leg-dot" style="background:#FF6B9D"></div>MRP — Redo Apply</div>
      <div class="leg-item"><div class="leg-dot" style="background:#00D4FF"></div>RFS — Redo Receive</div>
      <div class="leg-item"><div class="leg-dot" style="background:#F1C40F"></div>Observer (FSFO)</div>
      <div class="leg-item"><div class="leg-dot" style="background:#00D4FF"></div>DG Broker</div>`;
    legend.style.display = 'grid';
  } else if (v === 'rac') {
    legend.innerHTML = `
      <div class="leg-item"><div class="leg-dot" style="background:#3B82F6"></div>Instance 1</div>
      <div class="leg-item"><div class="leg-dot" style="background:#2ECC71"></div>Instance 2</div>
      <div class="leg-item"><div class="leg-dot" style="background:#A855F7"></div>Cache Fusion</div>
      <div class="leg-item"><div class="leg-dot" style="background:#A855F7"></div>GCS / LMS</div>
      <div class="leg-item"><div class="leg-dot" style="background:#C74634"></div>Shared ASM</div>
      <div class="leg-item"><div class="leg-dot" style="background:#F1C40F"></div>SCAN Listener</div>`;
    legend.style.display = 'grid';
  }

  // Close info panel on view switch
  closeInfo();
}

// Store original legend HTML for restoring
const originalLegendHTML = document.getElementById('legend').innerHTML;

// ═══════════════════════════════════════════════════════════════
// INFO DATA FOR NEW VIEWS
// ═══════════════════════════════════════════════════════════════
INFO.mt_cdbroot = {
  title:'CDB$ROOT', subtitle:'ROOT CONTAINER — CON_ID=1',
  color:'#C74634',
  desc:'The root container (CDB$ROOT) is the master container in Oracle Multitenant. It houses the data dictionary metadata shared by all PDBs, the UNDO tablespace (shared in 12.1, per-PDB optional in 12.2+), Online Redo Logs (always shared), and Control Files. Common users (prefixed C##) created here are visible in all PDBs. SYS and SYSTEM are common users. The root container is always open when the CDB instance is running.',
  flows:[
    {c:'#C74634', t:'Houses the master data dictionary (SYSTEM tablespace)'},
    {c:'#C74634', t:'Shared UNDO tablespace for all PDBs (12.1)'},
    {c:'#C74634', t:'Common users/roles visible across all PDBs'},
    {c:'#C74634', t:'Online Redo Logs shared by all containers'},
  ],
  trigger:'ALTER SESSION SET CONTAINER = CDB$ROOT;\nSELECT CON_ID, NAME, OPEN_MODE FROM V$PDBS;\nCDB_DATA_FILES: data files across all containers\nDBA_PDBS: all PDBs in this CDB\nCommon user prefix: C## (configurable)'
};
INFO.mt_pdbseed = {
  title:'PDB$SEED', subtitle:'SEED TEMPLATE — CON_ID=2',
  color:'rgba(148,163,184,0.8)',
  desc:'PDB$SEED is the read-only template PDB used to create new PDBs. When you execute CREATE PLUGGABLE DATABASE, Oracle copies PDB$SEED\'s data files (SYSTEM and SYSAUX tablespaces) to create the new PDB\'s initial file set. PDB$SEED cannot be modified, dropped, or opened in read-write mode. It is always present in every CDB.',
  flows:[
    {c:'rgba(148,163,184,0.8)', t:'Template for CREATE PLUGGABLE DATABASE'},
    {c:'rgba(148,163,184,0.8)', t:'Read-only — cannot be modified'},
    {c:'rgba(148,163,184,0.8)', t:'Oracle copies its files for new PDB creation'},
  ],
  trigger:'CREATE PLUGGABLE DATABASE pdb3\n  ADMIN USER pdb3admin IDENTIFIED BY pass;\n\nOracle copies PDB$SEED → new PDB data files\nFile copy or snapshot (ASM)\nV$PDBS: CON_ID=2 always = PDB$SEED'
};
INFO.mt_pdb1 = {
  title:'PDB1 — HR APPLICATION', subtitle:'PLUGGABLE DATABASE — CON_ID=3',
  color:'#2ECC71',
  desc:'A fully isolated pluggable database within the CDB. PDB1 has its own SYSTEM tablespace (local data dictionary), SYSAUX tablespace, and application data files. Local users (HR, APP_USER) exist only in this PDB. Applications connect directly to PDB1 using its unique service name. Each PDB can be opened, closed, unplugged, and plugged independently.',
  flows:[
    {c:'#2ECC71', t:'Own SYSTEM + SYSAUX tablespaces'},
    {c:'#2ECC71', t:'Own local users, schemas, tables, indexes'},
    {c:'#2ECC71', t:'Shares CDB SGA and background processes'},
    {c:'#2ECC71', t:'Can be unplugged → plugged into another CDB'},
  ],
  trigger:'ALTER PLUGGABLE DATABASE pdb1 OPEN;\nALTER PLUGGABLE DATABASE pdb1 CLOSE IMMEDIATE;\nALTER PLUGGABLE DATABASE pdb1 UNPLUG INTO \'/tmp/pdb1.xml\';\nConnect: sqlplus hr/pass@//host:1521/pdb1\nV$PDBS: status and open mode per PDB'
};
INFO.mt_pdb2 = {
  title:'PDB2 — SALES APPLICATION', subtitle:'PLUGGABLE DATABASE — CON_ID=4',
  color:'#3B82F6',
  desc:'Another fully isolated pluggable database. PDB2 is completely separate from PDB1 — users in PDB1 cannot see PDB2 data and vice versa. Oracle 12.2+ adds resource management per PDB: you can limit CPU, SGA, PGA, and I/O per PDB using PDB resource plans. Oracle 21c+ supports per-PDB AWR snapshots.',
  flows:[
    {c:'#3B82F6', t:'Complete isolation from PDB1'},
    {c:'#3B82F6', t:'Resource limits: MAX_CPU, MAX_SGA_SIZE'},
    {c:'#3B82F6', t:'Per-PDB AWR snapshots (21c+)'},
    {c:'#3B82F6', t:'Separate service name for connections'},
  ],
  trigger:'ALTER PLUGGABLE DATABASE pdb2 SET MAX_CPU = 2;\nALTER PLUGGABLE DATABASE pdb2 SET MAX_SGA_SIZE = 4G;\nDBMS_RESOURCE_MANAGER: PDB resource plans\nV$RSRC_CONSUMER_GROUP: resource usage per PDB'
};
INFO.dg_observer = {
  title:'DATA GUARD OBSERVER', subtitle:'FAST-START FAILOVER MONITOR',
  color:'#F1C40F',
  desc:'The Observer is a lightweight process (typically running on a third server) that continuously monitors both the primary and standby databases. When configured for Fast-Start Failover (FSFO), the Observer can automatically initiate a failover to the standby if the primary becomes unreachable — without DBA intervention. The Observer ensures the standby is synchronized before allowing automatic failover.',
  flows:[
    {c:'#F1C40F', t:'Monitors primary and standby health'},
    {c:'#F1C40F', t:'Auto-failover if primary unreachable (FSFO)'},
    {c:'#F1C40F', t:'Runs on separate host from primary/standby'},
  ],
  trigger:'DGMGRL> START OBSERVER;\nDGMGRL> ENABLE FAST_START FAILOVER;\nDGMGRL> SHOW FAST_START FAILOVER;\nRequires: MAX AVAILABILITY or MAX PERFORMANCE mode\nFastStartFailoverThreshold: seconds before failover'
};

// ── MULTITENANT INFO ENTRIES ──────────────────────────────────
INFO.mt_cdb = {
  title:'ORACLE MULTITENANT (CDB)', subtitle:'CONTAINER DATABASE ARCHITECTURE',
  color:'#C74634',
  desc:'Oracle Multitenant (12c+) allows a single Container Database (CDB) instance to host multiple Pluggable Databases (PDBs). The CDB provides a shared instance (SGA + background processes) while each PDB maintains its own data dictionary, schemas, and application data in complete isolation. This architecture dramatically reduces resource consumption — one set of background processes, one SGA, one set of redo logs serves all PDBs. PDBs can be unplugged from one CDB and plugged into another for easy migration.',
  flows:[
    {c:'#C74634', t:'Single CDB instance hosts multiple PDBs'},
    {c:'#3B82F6', t:'Shared SGA (Buffer Cache, Shared Pool, Redo Buffer)'},
    {c:'#22C55E', t:'Shared background processes (LGWR, DBWn, etc.)'},
    {c:'#2ECC71', t:'Per-PDB resource limits (CPU, memory, I/O)'},
  ],
  trigger:'SELECT CDB FROM V$DATABASE; — YES if CDB\nSELECT CON_ID, NAME, OPEN_MODE FROM V$PDBS;\nMAX_PDBS parameter: max PDBs per CDB (default 252)\nOracle 21c: CDB-only architecture (non-CDB deprecated)\nALTER PLUGGABLE DATABASE ALL OPEN;'
};
INFO.mt_buffercache = {
  title:'SHARED BUFFER CACHE', subtitle:'CDB SGA — SHARED ACROSS ALL PDBs',
  color:'#2ECC71',
  desc:'In Multitenant, the Buffer Cache is shared by all PDBs within the CDB. Data blocks from any PDB are cached together using the same LRU mechanism. Oracle tracks which blocks belong to which container (CON_ID). In 12.2+, you can set DB_CACHE_SIZE at the PDB level to guarantee a minimum buffer cache allocation per PDB, preventing one busy PDB from starving others. The SGA_MIN_SIZE PDB parameter sets the guaranteed minimum SGA share.',
  flows:[
    {c:'#2ECC71', t:'All PDBs share the same buffer cache pool'},
    {c:'#2ECC71', t:'Blocks tagged with CON_ID for container tracking'},
    {c:'#2ECC71', t:'Per-PDB minimum: ALTER SYSTEM SET DB_CACHE_SIZE in PDB'},
    {c:'#2ECC71', t:'SGA_MIN_SIZE: guaranteed PDB SGA share (19c+)'},
  ],
  trigger:'V$BH: buffer headers — includes CON_ID column\nALTER SYSTEM SET DB_CACHE_SIZE=2G (in PDB session)\nSGA_MIN_SIZE: per-PDB minimum SGA guarantee\nV$SGA_TARGET_ADVICE: auto-tuning across PDBs'
};
INFO.mt_sharedpool = {
  title:'SHARED POOL (CDB)', subtitle:'CDB SGA — SQL CACHE + DICTIONARY',
  color:'#F1C40F',
  desc:'The Shared Pool in a CDB is shared across all PDBs. SQL cursors, execution plans, and data dictionary cache entries from all containers coexist in the same pool. Oracle uses the CON_ID to distinguish cursors from different PDBs — identical SQL text in different PDBs produces separate cursor entries because they reference different objects. The Data Dictionary Cache stores metadata for CDB$ROOT and all PDBs. Hard parse pressure from many PDBs may require a larger shared pool.',
  flows:[
    {c:'#F1C40F', t:'SQL cursors tagged with CON_ID per PDB'},
    {c:'#F1C40F', t:'Same SQL text in different PDBs = separate cursors'},
    {c:'#F1C40F', t:'Data Dictionary Cache covers all containers'},
    {c:'#F1C40F', t:'SHARED_POOL_SIZE can be set per-PDB (12.2+)'},
  ],
  trigger:'V$SQL: includes CON_ID column for per-PDB SQL\nV$LIBRARY_CACHE: hit ratio covers all containers\nMore PDBs = more dictionary entries = larger pool needed\nSHARED_POOL_SIZE at PDB level sets minimum guarantee'
};
INFO.mt_redobuffer = {
  title:'SHARED REDO LOG BUFFER', subtitle:'CDB SGA — SINGLE REDO STREAM',
  color:'#FF4757',
  desc:'The Redo Log Buffer is always shared across all PDBs — there is only ONE redo stream for the entire CDB. All changes from all PDBs are interleaved in the same redo log buffer and written by the single LGWR to the shared Online Redo Logs. Each redo record contains the CON_ID identifying which PDB generated the change. This is important for Data Guard and recovery: Oracle can filter redo by CON_ID to recover individual PDBs.',
  flows:[
    {c:'#FF4757', t:'Single redo stream for ALL PDBs'},
    {c:'#FF4757', t:'Redo records include CON_ID tag'},
    {c:'#FF4757', t:'LGWR writes for all containers simultaneously'},
    {c:'#FF4757', t:'PDB-level recovery possible via CON_ID filtering'},
  ],
  trigger:'Online Redo Logs are always at CDB level\nCannot have per-PDB redo logs\nV$LOG: applies to entire CDB\nRMAN: RECOVER PLUGGABLE DATABASE pdb1 (CON_ID filter)\nData Guard ships all redo (all PDBs)'
};
INFO.mt_largepool = {
  title:'SHARED LARGE POOL', subtitle:'CDB SGA — RMAN / PARALLEL QUERY BUFFERS',
  color:'#38BDF8',
  desc:'The Large Pool in a CDB is shared across all PDBs. RMAN backup operations, Parallel Query coordination buffers, and Shared Server UGA allocations from any PDB draw from this single pool. In high-consolidation environments with many PDBs running concurrent RMAN jobs, the Large Pool may need to be sized larger than in a non-CDB deployment.',
  flows:[
    {c:'#38BDF8', t:'Shared by all PDBs for RMAN I/O buffers'},
    {c:'#38BDF8', t:'Parallel Query message buffers from any PDB'},
    {c:'#38BDF8', t:'Shared Server UGA if MTS is used'},
    {c:'#34D399', t:'Auto-managed under SGA_TARGET (ASMM)'},
  ],
  trigger:'LARGE_POOL_SIZE: CDB-level parameter\nV$SGASTAT: large pool usage (includes CON_ID 0=shared)\nMultiple PDB RMAN jobs = increase Large Pool\nSGA_TARGET auto-manages across all components'
};
INFO.mt_pga = {
  title:'PGA (PER SERVER PROCESS)', subtitle:'PRIVATE MEMORY — SORT/HASH/SESSION STATE',
  color:'#A855F7',
  desc:'In Multitenant, each server process (one per session) gets its own PGA regardless of which PDB the session connects to. The PGA_AGGREGATE_TARGET and PGA_AGGREGATE_LIMIT are set at the CDB level to control total PGA across all PDB sessions. In 12.2+, PGA_AGGREGATE_LIMIT can also be set at the PDB level to cap PGA consumption per PDB, preventing a runaway query in one PDB from consuming all available PGA memory.',
  flows:[
    {c:'#A855F7', t:'Each server process gets private PGA'},
    {c:'#A855F7', t:'PGA_AGGREGATE_TARGET: CDB-level total'},
    {c:'#A855F7', t:'PGA_AGGREGATE_LIMIT: per-PDB cap (12.2+)'},
    {c:'#A855F7', t:'Sort/Hash spill to TEMP tablespace (per-PDB temp)'},
  ],
  trigger:'PGA_AGGREGATE_TARGET: CDB-wide setting\nPGA_AGGREGATE_LIMIT at PDB: caps per-PDB PGA\nV$PGASTAT: total PGA statistics\nV$PROCESS: per-process PGA usage (includes CON_ID)\nEach PDB has its own TEMP tablespace for spills'
};
INFO.mt_bgprocs = {
  title:'SHARED BACKGROUND PROCESSES', subtitle:'CDB — SINGLE SET SERVES ALL PDBs',
  color:'#22C55E',
  desc:'In Multitenant, there is only ONE set of background processes (LGWR, DBWn, CKPT, SMON, PMON, ARCn, MMON, MMAN) for the entire CDB. These processes handle all I/O, checkpointing, recovery, and monitoring for every PDB simultaneously. This is a key benefit of Multitenant — instead of N databases each running 20+ background processes, a single CDB with N PDBs runs just one set. The processes are unaware of PDB boundaries for most operations.',
  flows:[
    {c:'#22C55E', t:'LGWR: writes redo for all PDBs'},
    {c:'#22C55E', t:'DBWn: writes dirty blocks for all PDBs'},
    {c:'#22C55E', t:'SMON: crash recovery covers all containers'},
    {c:'#22C55E', t:'PMON: cleans up dead sessions from any PDB'},
    {c:'#22C55E', t:'ARCn: archives redo containing all PDB changes'},
  ],
  trigger:'V$BGPROCESS: all background processes (CDB-level)\nNo per-PDB background processes exist\nResource savings: 1 set vs N sets of processes\nSMON recovery: recovers all PDBs at CDB startup\nPMON: registers all PDB services with Listener'
};

// ── DATA GUARD INFO ENTRIES ────────────────────────────────────
INFO.dg_overview = {
  title:'ORACLE DATA GUARD', subtitle:'DISASTER RECOVERY + HIGH AVAILABILITY',
  color:'#00D4FF',
  desc:'Oracle Data Guard maintains one or more synchronized standby databases as copies of the primary production database. Redo data generated on the primary is shipped (via LGWR ASYNC or SYNC) to the standby where it is applied by the MRP (Managed Recovery Process) to keep the standby in sync. Data Guard provides disaster recovery (DR), data protection (zero data loss in SYNC mode), and read offloading (Active Data Guard allows read-only queries on the standby). Switchover (planned) and Failover (unplanned) role transitions are supported.',
  flows:[
    {c:'#00D4FF', t:'Redo shipping: Primary LGWR → Standby RFS'},
    {c:'#FF6B9D', t:'Redo apply: MRP applies redo on standby'},
    {c:'#F1C40F', t:'Observer: automated failover with FSFO'},
    {c:'#00D4FF', t:'DG Broker: centralized configuration management'},
  ],
  trigger:'Data Guard configuration requires:\n1. Primary database in ARCHIVELOG mode\n2. Standby database created from RMAN backup\n3. LOG_ARCHIVE_DEST_2 → standby\n4. FAL_SERVER, FAL_CLIENT for gap resolution\nDGMGRL> SHOW CONFIGURATION;\nV$DATAGUARD_STATUS: transport status'
};
INFO.dg_primary = {
  title:'PRIMARY DATABASE', subtitle:'DATA GUARD — PRODUCTION (READ-WRITE)',
  color:'#2ECC71',
  desc:'The Primary database is the production database that accepts all read-write operations. It generates redo data for every transaction, which is simultaneously shipped to one or more standby databases via Oracle Net. The primary runs in either Maximum Performance (async, no impact), Maximum Availability (sync with fallback), or Maximum Protection (sync, blocks commits if standby unreachable) mode. The primary can be switched to standby role via SWITCHOVER.',
  flows:[
    {c:'#2ECC71', t:'Accepts all DML/DDL (read-write operations)'},
    {c:'#FF4757', t:'LGWR generates redo for all changes'},
    {c:'#00D4FF', t:'Redo shipped to standby via LGWR ASYNC/SYNC'},
    {c:'#00D4FF', t:'ARCn ships archived redo logs as backup'},
  ],
  trigger:'ALTER DATABASE SET STANDBY DATABASE TO MAXIMIZE PERFORMANCE;\nSELECT DATABASE_ROLE FROM V$DATABASE; — PRIMARY\nV$ARCHIVED_LOG: shows shipped/applied status\nSWITCHOVER: ALTER DATABASE SWITCHOVER TO target;\nDGMGRL> SWITCHOVER TO orcl_stby;'
};
INFO.dg_primary_sga = {
  title:'PRIMARY SGA', subtitle:'DATA GUARD — PRIMARY MEMORY STRUCTURES',
  color:'#3B82F6',
  desc:'The primary database SGA operates identically to a standalone Oracle database. The Buffer Cache, Shared Pool, Redo Log Buffer, and other SGA components function normally. The key Data Guard addition is that LGWR (or the NSS network server process in ASYNC mode) reads from the Redo Log Buffer to ship redo to the standby. The LOG_ARCHIVE_DEST_2 parameter configures the standby destination. In SYNC mode, LGWR waits for standby acknowledgment before completing the COMMIT.',
  flows:[
    {c:'#3B82F6', t:'Buffer Cache: standard read/write operations'},
    {c:'#F1C40F', t:'Shared Pool: SQL caching (same as standalone)'},
    {c:'#FF4757', t:'Redo Buffer: redo entries shipped to standby'},
    {c:'#FF4757', t:'LGWR SYNC: waits for standby ACK before commit'},
  ],
  trigger:'SGA_TARGET: same tuning as standalone\nLOG_BUFFER: may need increase for high redo volume\nV$SGA: standard SGA breakdown\nRedo generation rate: V$SYSSTAT "redo size"'
};
INFO.dg_primary_procs = {
  title:'PRIMARY PROCESSES', subtitle:'DATA GUARD — REDO GENERATION + SHIPPING',
  color:'#22C55E',
  desc:'The primary runs all standard background processes plus Data Guard-specific processes. LGWR writes redo and (in SYNC mode) ships it directly to the standby. In ASYNC mode, NSS (Network Server Sync) processes handle the shipping. ARCn archives filled redo logs and also ships them to the standby as a secondary transport mechanism. The FAL (Fetch Archive Log) mechanism automatically resolves gaps if a standby misses archived logs.',
  flows:[
    {c:'#FF4757', t:'LGWR: writes redo + ships in SYNC mode'},
    {c:'#00D4FF', t:'NSS: async network redo shipping process'},
    {c:'#00D4FF', t:'ARCn: archives + ships archived redo logs'},
    {c:'#22C55E', t:'Standard processes: DBWn, CKPT, SMON, PMON'},
  ],
  trigger:'LOG_ARCHIVE_DEST_2: standby destination\nLOG_ARCHIVE_DEST_STATE_2: ENABLE/DEFER\nV$ARCHIVE_DEST: destination status per dest\nV$MANAGED_STANDBY: current DG process activity\nFAL_SERVER / FAL_CLIENT: gap resolution config'
};
INFO.dg_primary_storage = {
  title:'PRIMARY STORAGE', subtitle:'DATA GUARD — DATA FILES + REDO LOGS',
  color:'#C74634',
  desc:'The primary database storage includes all Data Files, Online Redo Log groups (which are the source of redo shipped to the standby), Archived Redo Logs (copied to standby by ARCn), and Control Files (contain DG configuration). The Standby Redo Logs (SRLs) on the primary are used during switchback — when the former standby becomes the new primary, these SRLs receive redo from the new standby.',
  flows:[
    {c:'#2ECC71', t:'Data Files: production data (all tablespaces)'},
    {c:'#FF4757', t:'Online Redo Logs: source of redo for shipping'},
    {c:'#00D4FF', t:'Archived Logs: shipped to standby by ARCn'},
    {c:'#F1C40F', t:'Control File: DG config + standby info'},
  ],
  trigger:'V$DATAFILE: all data files\nV$LOG / V$LOGFILE: online redo log groups\nV$ARCHIVED_LOG: archive log history + ship status\nStandby Redo Logs on primary: for future switchback\nALTER DATABASE ADD STANDBY LOGFILE GROUP 4 SIZE 1G;'
};
INFO.dg_transport = {
  title:'REDO TRANSPORT', subtitle:'DATA GUARD — NETWORK SHIPPING LAYER',
  color:'#00D4FF',
  desc:'Redo Transport is the mechanism that ships redo data from the primary to the standby. In ASYNC mode (Maximum Performance), redo is shipped by background NSS processes after LGWR writes it locally — commits are not delayed. In SYNC mode (Maximum Availability/Protection), LGWR ships redo simultaneously and waits for standby acknowledgment (RFS ACK) before completing the commit — guaranteeing zero data loss. The transport uses Oracle Net over TCP/IP. Compression (COMPRESSION=ENABLE) can reduce bandwidth for WAN deployments.',
  flows:[
    {c:'#00D4FF', t:'LGWR ASYNC → NSS → Network → Standby RFS'},
    {c:'#00D4FF', t:'LGWR SYNC → Network → RFS ACK → Commit'},
    {c:'#00D4FF', t:'ARCn → Archive → Network → Standby archive dest'},
    {c:'#00D4FF', t:'LOG_ARCHIVE_DEST_2 controls transport config'},
  ],
  trigger:'LOG_ARCHIVE_DEST_2=\'SERVICE=orcl_stby ASYNC VALID_FOR=(ONLINE_LOGFILES,PRIMARY_ROLE) DB_UNIQUE_NAME=orcl_stby\'\nSYNC: zero data loss but latency on commit\nASYNC: no commit latency but potential data loss\nCOMPRESSION=ENABLE: for WAN links\nV$DATAGUARD_STATS: transport lag / apply lag'
};
INFO.dg_broker = {
  title:'DATA GUARD BROKER', subtitle:'CENTRALIZED DG MANAGEMENT FRAMEWORK',
  color:'#00D4FF',
  desc:'The Data Guard Broker (DMON background process) provides a centralized framework for managing the entire Data Guard configuration. Instead of manually setting dozens of parameters on primary and standby, the Broker maintains a configuration file and synchronizes settings across all databases. DGMGRL (Data Guard Manager CLI) is the primary interface. The Broker enables one-command switchover, failover, and Fast-Start Failover (FSFO) with the Observer.',
  flows:[
    {c:'#00D4FF', t:'DMON process runs on primary and standby'},
    {c:'#00D4FF', t:'Configuration stored in DG Broker config files'},
    {c:'#F1C40F', t:'DGMGRL: CLI for switchover/failover commands'},
    {c:'#F1C40F', t:'Integrates with Observer for FSFO'},
  ],
  trigger:'DGMGRL> CREATE CONFIGURATION dg_config AS ...\nDGMGRL> ADD DATABASE orcl_stby AS CONNECT IDENTIFIER IS ...\nDGMGRL> ENABLE CONFIGURATION;\nDGMGRL> SHOW CONFIGURATION;\nDGMGRL> SWITCHOVER TO orcl_stby;\nDG_BROKER_START=TRUE on both primary and standby'
};
INFO.dg_standby = {
  title:'PHYSICAL STANDBY DATABASE', subtitle:'DATA GUARD — RECOVERY MODE (MOUNT/READ-ONLY)',
  color:'#00D4FF',
  desc:'The Physical Standby is a block-for-block copy of the primary database. It receives redo from the primary and applies it via MRP (Managed Recovery Process) to stay synchronized. In standard mode, the standby is in MOUNT state (not open to users). With Active Data Guard (licensed feature), the standby can be opened READ ONLY while MRP continues applying redo — enabling read offloading, reporting, and backups from the standby. Flashback Database on the standby enables easy reinstatement after failover.',
  flows:[
    {c:'#00D4FF', t:'RFS: receives redo from primary'},
    {c:'#FF6B9D', t:'MRP: applies redo to data files continuously'},
    {c:'#00D4FF', t:'Active DG: open READ ONLY while applying'},
    {c:'#00D4FF', t:'Can offload RMAN backups to standby'},
  ],
  trigger:'ALTER DATABASE RECOVER MANAGED STANDBY DATABASE DISCONNECT;\nALTER DATABASE OPEN READ ONLY; (Active Data Guard)\nSELECT DATABASE_ROLE FROM V$DATABASE; — PHYSICAL STANDBY\nV$MANAGED_STANDBY: MRP and RFS process status\nV$DATAGUARD_STATS: transport lag / apply lag'
};
INFO.dg_standby_sga = {
  title:'STANDBY SGA', subtitle:'DATA GUARD — STANDBY MEMORY STRUCTURES',
  color:'#3B82F6',
  desc:'The standby SGA contains the same components as the primary but is typically sized smaller (unless Active Data Guard is used for read queries). The key process is MRP (Managed Recovery Process) which reads redo from Standby Redo Logs and applies the changes to the Buffer Cache / Data Files. RFS (Remote File Server) receives incoming redo from the primary and writes it to the Standby Redo Logs. With Active DG, the Buffer Cache also serves read-only queries.',
  flows:[
    {c:'#3B82F6', t:'Buffer Cache: MRP applies redo changes here'},
    {c:'#FF6B9D', t:'MRP reads SRLs and applies to buffer cache'},
    {c:'#00D4FF', t:'RFS writes incoming redo to SRLs'},
    {c:'#3B82F6', t:'Active DG: serves read-only queries from cache'},
  ],
  trigger:'SGA_TARGET on standby: can be smaller if no Active DG\nWith Active DG queries: size similar to primary\nV$SGA: standby SGA breakdown\nDB_CACHE_SIZE: important for Active DG read performance'
};
INFO.dg_standby_procs = {
  title:'STANDBY PROCESSES', subtitle:'DATA GUARD — REDO RECEIVE + APPLY',
  color:'#22C55E',
  desc:'The standby runs specialized Data Guard processes alongside standard background processes. RFS (Remote File Server) receives redo from the primary and writes it to Standby Redo Logs (SRLs). MRP (Managed Recovery Process) reads from the SRLs and applies the redo changes to the data files — this is the "redo apply" operation. ARCn on the standby archives the standby redo logs after apply. SMON handles crash recovery if the standby instance restarts.',
  flows:[
    {c:'#00D4FF', t:'RFS: receives redo over network from primary'},
    {c:'#FF6B9D', t:'MRP: applies redo to standby data files'},
    {c:'#00D4FF', t:'ARCn: archives standby redo logs after apply'},
    {c:'#22C55E', t:'Standard: DBWn, CKPT, SMON, PMON also run'},
  ],
  trigger:'V$MANAGED_STANDBY: shows RFS and MRP status\nMRP0: main recovery process\nRFS: one per redo shipping connection\nPR0n: parallel recovery slave processes\nALTER DATABASE RECOVER MANAGED STANDBY DATABASE CANCEL; — stop apply'
};
INFO.dg_standby_storage = {
  title:'STANDBY STORAGE', subtitle:'DATA GUARD — STANDBY DATA FILES + SRL',
  color:'#C74634',
  desc:'The standby storage is a copy of the primary storage structure. Data Files are identical (block-for-block via MRP apply). Standby Redo Logs (SRLs) are unique to the standby — they receive incoming redo from the primary before MRP applies it. SRLs should be the same size as primary online redo logs, with one extra group per thread. Archived redo logs accumulate on the standby as SRLs are archived after apply. The standby control file is a standby-specific copy.',
  flows:[
    {c:'#2ECC71', t:'Data Files: mirror of primary (via MRP apply)'},
    {c:'#00D4FF', t:'Standby Redo Logs: receive incoming redo from RFS'},
    {c:'#FF6B9D', t:'MRP reads SRLs → applies to data files'},
    {c:'#00D4FF', t:'Archived logs: standby SRLs archived after apply'},
  ],
  trigger:'Standby Redo Logs: must exist for real-time apply\nALTER DATABASE ADD STANDBY LOGFILE GROUP n SIZE 1G;\nSRL groups = primary groups + 1 per thread\nV$STANDBY_LOG: standby redo log status\nV$DATAFILE: standby data file paths'
};
INFO.dg_protection = {
  title:'PROTECTION MODES', subtitle:'DATA GUARD — DATA LOSS GUARANTEES',
  color:'#F1C40F',
  desc:'Oracle Data Guard offers three protection modes that trade off between data protection and performance. Maximum Protection (SYNC, no data loss, blocks primary if standby unreachable — primary shuts down). Maximum Availability (SYNC, no data loss, falls back to ASYNC if standby unreachable — primary continues). Maximum Performance (ASYNC, minimal data loss possible, zero commit latency impact — default mode).',
  flows:[
    {c:'#FF4757', t:'MAX PROTECTION: zero data loss, primary may halt'},
    {c:'#F1C40F', t:'MAX AVAILABILITY: zero data loss, graceful fallback'},
    {c:'#2ECC71', t:'MAX PERFORMANCE: async, best performance (default)'},
  ],
  trigger:'ALTER DATABASE SET STANDBY DATABASE TO MAXIMIZE PROTECTION;\nALTER DATABASE SET STANDBY DATABASE TO MAXIMIZE AVAILABILITY;\nALTER DATABASE SET STANDBY DATABASE TO MAXIMIZE PERFORMANCE;\nSELECT PROTECTION_MODE FROM V$DATABASE;\nSELECT PROTECTION_LEVEL FROM V$DATABASE;'
};

// ── RAC INFO ENTRIES ──────────────────────────────────────────
INFO.rac_overview = {
  title:'ORACLE RAC (REAL APPLICATION CLUSTERS)', subtitle:'MULTIPLE INSTANCES · ONE DATABASE',
  color:'#A855F7',
  desc:'Oracle RAC allows multiple instances running on separate servers (nodes) to simultaneously access a single shared database stored on shared storage (typically ASM on SAN/NAS). Each instance has its own SGA and background processes, but all instances read and write the same set of data files, control files, and redo logs. Cache Fusion is the core technology — it uses a high-speed private interconnect to ship data blocks between instances on demand, so any node can access any data block without going to disk. RAC provides both high availability (if one node fails, others continue) and scalability (add nodes for more processing power).',
  flows:[
    {c:'#3B82F6', t:'Instance 1: own SGA + processes on Node 1'},
    {c:'#2ECC71', t:'Instance 2: own SGA + processes on Node 2'},
    {c:'#A855F7', t:'Cache Fusion: blocks shipped via private interconnect'},
    {c:'#C74634', t:'Shared storage: ASM manages data files for all'},
  ],
  trigger:'srvctl start database -d ORCL — starts all instances\nsrvctl status database -d ORCL — shows instance status\nGV$ views: global across all instances\nV$INSTANCE: which instance you are connected to\nINSTANCE_NUMBER / THREAD# per node\ncrsctl stat res -t — CRS resource status'
};
INFO.rac_scan = {
  title:'SCAN LISTENER', subtitle:'RAC — SINGLE CLIENT ACCESS NAME',
  color:'#F1C40F',
  desc:'The SCAN (Single Client Access Name) Listener provides a single, stable network entry point for RAC clients. Instead of clients needing to know individual node addresses, they connect to the SCAN name (resolved via DNS to 3 SCAN VIPs). The SCAN Listener load-balances connections across available instances using server-side load balancing. If a node goes down, the SCAN Listener automatically redirects new connections to surviving nodes. Each node also has a local VIP Listener for direct connections.',
  flows:[
    {c:'#F1C40F', t:'DNS resolves SCAN name to 3 SCAN VIP addresses'},
    {c:'#F1C40F', t:'Client connects to SCAN VIP (round-robin DNS)'},
    {c:'#F1C40F', t:'SCAN Listener redirects to least-loaded instance'},
    {c:'#F1C40F', t:'Node VIP Listeners handle direct connections'},
  ],
  trigger:'SCAN name: configured in DNS (3 A records)\nsrvctl add scan -scanname scan-cluster\nsrvctl start scan_listener\nConnect: sqlplus user/pass@//scan-cluster:1521/ORCL\nLOAD_BALANCE=ON in tnsnames.ora\nsrvctl status scan_listener — shows SCAN VIP status'
};
INFO.rac_inst1 = {
  title:'INSTANCE 1 (ORCL1)', subtitle:'RAC — NODE 1 INSTANCE',
  color:'#3B82F6',
  desc:'Instance 1 is a complete Oracle instance running on Node 1 (rac-node1). It has its own private SGA, its own set of background processes (LGWR, DBWn, SMON, PMON, etc.), and its own dedicated redo thread (Thread 1) and UNDO tablespace (UNDOTBS1). The GCS processes (LMS) on this instance ship blocks to Instance 2 via Cache Fusion when requested. Each instance maintains its own alert log and trace files.',
  flows:[
    {c:'#3B82F6', t:'Own SGA: Buffer Cache, Shared Pool, Redo Buffer'},
    {c:'#3B82F6', t:'Own background processes: LGWR, DBWn, SMON...'},
    {c:'#FF4757', t:'Thread 1 redo: own LGWR writes to redo thread 1'},
    {c:'#A855F7', t:'LMS processes: ship blocks via Cache Fusion'},
  ],
  trigger:'INSTANCE_NAME=ORCL1\nINSTANCE_NUMBER=1\nTHREAD=1\nUNDO_TABLESPACE=UNDOTBS1\nV$INSTANCE: instance-specific info\nsrvctl start instance -d ORCL -i ORCL1'
};
INFO.rac_inst2 = {
  title:'INSTANCE 2 (ORCL2)', subtitle:'RAC — NODE 2 INSTANCE',
  color:'#2ECC71',
  desc:'Instance 2 is a complete Oracle instance running on Node 2 (rac-node2). It has its own private SGA, background processes, redo thread (Thread 2), and UNDO tablespace (UNDOTBS2). Instance 2 can serve any query — if the required data block is in Instance 1\'s cache, the GCS (LMS) on Instance 1 ships a CR (Consistent Read) or Current copy to Instance 2 via Cache Fusion, avoiding the slower disk I/O.',
  flows:[
    {c:'#2ECC71', t:'Own SGA: Buffer Cache, Shared Pool, Redo Buffer'},
    {c:'#2ECC71', t:'Own background processes: LGWR, DBWn, SMON...'},
    {c:'#FF4757', t:'Thread 2 redo: own LGWR writes to redo thread 2'},
    {c:'#A855F7', t:'Receives Cache Fusion blocks from Instance 1'},
  ],
  trigger:'INSTANCE_NAME=ORCL2\nINSTANCE_NUMBER=2\nTHREAD=2\nUNDO_TABLESPACE=UNDOTBS2\nV$INSTANCE: instance-specific info\nsrvctl start instance -d ORCL -i ORCL2'
};
INFO.rac_sga = {
  title:'RAC INSTANCE SGA', subtitle:'RAC — PRIVATE MEMORY PER INSTANCE',
  color:'#3B82F6',
  desc:'Each RAC instance has its own private SGA — the Buffer Cache, Shared Pool, and Redo Log Buffer are NOT shared between instances. When Instance 1 needs a block that is in Instance 2\'s Buffer Cache, it does NOT access Instance 2\'s SGA directly. Instead, the GCS (Global Cache Service / LMS process) on Instance 2 ships a copy of the block over the private interconnect. This is Cache Fusion — the block arrives in Instance 1\'s Buffer Cache as a "GCS copy" with a CR (Consistent Read) or Current mode flag.',
  flows:[
    {c:'#2ECC71', t:'Buffer Cache: local blocks + GCS copies from other nodes'},
    {c:'#F1C40F', t:'Shared Pool: local SQL plans + GES lock metadata'},
    {c:'#FF4757', t:'Redo Buffer: per-instance redo thread'},
    {c:'#A855F7', t:'Cache Fusion: blocks arrive from remote instances'},
  ],
  trigger:'SGA_TARGET: configured per instance\nDB_CACHE_SIZE: per-instance buffer cache\nV$BH: includes STATUS (scur, xcur for GCS modes)\ngc cr request: waiting for Cache Fusion CR block\ngc current request: waiting for Cache Fusion current block\nGV$SGA: SGA info across all instances'
};
INFO.rac_gcs = {
  title:'RAC BACKGROUND PROCESSES', subtitle:'RAC — GCS/GES/LMON + STANDARD',
  color:'#A855F7',
  desc:'Each RAC instance runs standard Oracle background processes (LGWR, DBWn, CKPT, SMON, PMON, ARCn) plus RAC-specific processes. LMS (Global Cache Service / GCS) is the workhorse — it ships data blocks between instances via Cache Fusion. LMD (Global Enqueue Service / GES) manages global locks and enqueues across instances. LMON (Global Monitor) monitors cluster membership, detects node failures, and handles instance reconfiguration (including node eviction for split-brain prevention).',
  flows:[
    {c:'#A855F7', t:'LMS (GCS): ships blocks between instances via interconnect'},
    {c:'#A855F7', t:'LMD (GES): global enqueue / lock coordination'},
    {c:'#A855F7', t:'LMON: cluster membership + node eviction'},
    {c:'#FF4757', t:'LGWR: writes to per-instance redo thread'},
    {c:'#2ECC71', t:'DBWn: writes dirty blocks to shared storage'},
  ],
  trigger:'GCS_SERVER_PROCESSES: number of LMS processes (default auto)\nLMS wait events: gc cr request, gc current request\nLMD wait events: gc current block busy, enq: TX\nLMON: "reconfiguration" in alert log = node join/leave\nV$GES_ENQUEUE: global enqueue statistics\nV$CR_BLOCK_SERVER: Cache Fusion server stats'
};
INFO.rac_thread = {
  title:'PER-INSTANCE REDO THREAD + UNDO', subtitle:'RAC — THREAD 1 / UNDOTBS1',
  color:'#C74634',
  desc:'Each RAC instance has its own dedicated redo thread and UNDO tablespace. Thread 1 is used by Instance 1, Thread 2 by Instance 2. This separation ensures that each instance can write redo independently without contention on redo log files. Similarly, each instance has its own UNDO tablespace (UNDOTBS1, UNDOTBS2) to avoid undo segment contention between instances. During crash recovery, SMON on a surviving instance reads the failed instance\'s redo thread to perform instance recovery.',
  flows:[
    {c:'#FF4757', t:'Redo Thread 1: LGWR on Instance 1 writes here'},
    {c:'#A855F7', t:'UNDO TBS 1: rollback + read consistency for Inst 1'},
    {c:'#A855F7', t:'SMON: can recover using any instance\'s redo thread'},
    {c:'#C74634', t:'Stored on shared ASM: accessible by all instances'},
  ],
  trigger:'THREAD=1 in ORCL1 init.ora\nUNDO_TABLESPACE=UNDOTBS1 for Instance 1\nALTER DATABASE ADD LOGFILE THREAD 1 GROUP 1 ...\nV$LOG: shows THREAD# column for redo groups\nInstance recovery: surviving SMON reads failed thread'
};
INFO.rac_thread2 = {
  title:'PER-INSTANCE REDO THREAD + UNDO', subtitle:'RAC — THREAD 2 / UNDOTBS2',
  color:'#C74634',
  desc:'Instance 2 uses its own dedicated Redo Thread 2 and UNDO tablespace (UNDOTBS2). This complete separation of redo streams means Instance 1 and Instance 2 never contend for redo log file access. Each LGWR writes only to its own thread. The UNDO tablespace separation similarly prevents undo segment contention. If Instance 2 crashes, SMON on Instance 1 performs instance recovery by reading Thread 2\'s redo logs and rolling back uncommitted transactions using UNDOTBS2.',
  flows:[
    {c:'#FF4757', t:'Redo Thread 2: LGWR on Instance 2 writes here'},
    {c:'#A855F7', t:'UNDO TBS 2: rollback + read consistency for Inst 2'},
    {c:'#A855F7', t:'Instance 1 SMON: recovers Thread 2 if Inst 2 crashes'},
    {c:'#C74634', t:'Stored on shared ASM: accessible by all instances'},
  ],
  trigger:'THREAD=2 in ORCL2 init.ora\nUNDO_TABLESPACE=UNDOTBS2 for Instance 2\nALTER DATABASE ADD LOGFILE THREAD 2 GROUP 3 ...\nV$LOG: WHERE THREAD#=2 — Thread 2 redo groups\nInstance recovery is automatic and transparent'
};
INFO.rac_interconnect = {
  title:'CACHE FUSION — PRIVATE INTERCONNECT', subtitle:'RAC — HIGH-SPEED BLOCK SHIPPING NETWORK',
  color:'#A855F7',
  desc:'The private interconnect is a dedicated high-speed network (typically InfiniBand or 10GbE+) used exclusively for inter-instance communication. Cache Fusion uses this network to ship data blocks between instances on demand. When Instance 1 needs a block held by Instance 2, the GCS (LMS) on Instance 2 ships it over the interconnect — this is faster than reading from disk. The interconnect also carries GES (lock management) messages and LMON (cluster membership) heartbeats. Interconnect latency and bandwidth are critical RAC performance factors.',
  flows:[
    {c:'#A855F7', t:'GCS (LMS): ships data blocks between instance caches'},
    {c:'#A855F7', t:'GES (LMD): global lock/enqueue coordination messages'},
    {c:'#A855F7', t:'LMON: cluster heartbeats + membership messages'},
    {c:'#A855F7', t:'Typically InfiniBand (56Gbps+) or 10GbE+'},
  ],
  trigger:'CLUSTER_INTERCONNECTS: override auto-detected NIC\nV$CLUSTER_INTERCONNECTS: current interconnect NICs\noifcfg getif: shows interface classification\nKey wait events on slow interconnect:\n  gc cr request > 1ms = interconnect latency issue\n  gc current request > 1ms = same\nAWR: Interconnect bytes transferred/sec'
};
INFO.rac_asm = {
  title:'ORACLE ASM (AUTOMATIC STORAGE MANAGEMENT)', subtitle:'RAC — SHARED VOLUME MANAGER + FILE SYSTEM',
  color:'#C74634',
  desc:'Oracle ASM provides a volume manager and file system specifically designed for Oracle database files. In RAC, ASM is essential — it provides the shared storage layer that allows all instances to access the same data files, redo logs, and control files simultaneously. ASM runs as a separate instance (+ASM1, +ASM2) on each node, managed by Grid Infrastructure (GI). ASM manages disk groups (+DATA, +FRA), performs automatic striping and mirroring across failure groups, and handles online rebalancing when disks are added or removed.',
  flows:[
    {c:'#C74634', t:'Shared by all RAC instances (all nodes)'},
    {c:'#C74634', t:'ASM instances (+ASM1, +ASM2) per node'},
    {c:'#C74634', t:'Automatic striping + mirroring across failure groups'},
    {c:'#C74634', t:'Online rebalancing when disks added/removed'},
  ],
  trigger:'asmcmd: ASM command-line utility\nASMCMD> lsdg — list disk groups\nASMCMD> ls +DATA/ORCL/ — list files\nALTER DISKGROUP +DATA ADD DISK ...\nV$ASM_DISKGROUP: disk group info\nV$ASM_DISK: individual disk info\nASM instance: +ASM1 on node1, +ASM2 on node2'
};
INFO.rac_data_dg = {
  title:'+DATA DISK GROUP', subtitle:'RAC ASM — PRIMARY DATA STORAGE',
  color:'#2ECC71',
  desc:'The +DATA disk group stores the primary database files: data files (all tablespaces), control files, UNDO tablespaces (one per instance), TEMP tablespace, and SPFILEs. With NORMAL REDUNDANCY, ASM mirrors data across two failure groups — if one set of disks fails, the other failure group has a complete copy. HIGH REDUNDANCY uses three-way mirroring. All RAC instances read and write to +DATA simultaneously. ASM handles I/O load balancing across all disks in the disk group.',
  flows:[
    {c:'#2ECC71', t:'Data Files: all tablespace data files'},
    {c:'#F1C40F', t:'Control Files: multiplexed across disk groups'},
    {c:'#A855F7', t:'UNDO tablespaces: UNDOTBS1, UNDOTBS2'},
    {c:'#38BDF8', t:'TEMP tablespace: shared by all instances'},
  ],
  trigger:'CREATE DISKGROUP DATA NORMAL REDUNDANCY\n  FAILGROUP fg1 DISK \'/dev/sdb\', \'/dev/sdc\'\n  FAILGROUP fg2 DISK \'/dev/sdd\', \'/dev/sde\';\nNORMAL REDUNDANCY: 2-way mirror\nHIGH REDUNDANCY: 3-way mirror\nEXTERNAL REDUNDANCY: no ASM mirroring (SAN handles it)\nV$ASM_DISKGROUP: space used/free per group'
};
INFO.rac_fra_dg = {
  title:'+FRA DISK GROUP', subtitle:'RAC ASM — FLASH RECOVERY AREA',
  color:'#00D4FF',
  desc:'The +FRA (Flash Recovery Area) disk group stores recovery-related files: Online Redo Log files (per-instance threads), Archived Redo Logs (from all instances), RMAN backups, and Flashback Logs. Separating +FRA from +DATA on different physical disks ensures that recovery I/O does not compete with production data I/O. Oracle automatically manages space in the FRA — oldest archived logs and expired backups are deleted when space is needed.',
  flows:[
    {c:'#FF4757', t:'Online Redo Logs: per-instance redo threads'},
    {c:'#00D4FF', t:'Archived Redo Logs: from all instances'},
    {c:'#FB923C', t:'RMAN Backups: database and archive log backups'},
    {c:'#A855F7', t:'Flashback Logs: for Flashback Database'},
  ],
  trigger:'DB_RECOVERY_FILE_DEST=\'+FRA\'\nDB_RECOVERY_FILE_DEST_SIZE=500G\nV$RECOVERY_FILE_DEST: FRA space usage\nV$FLASH_RECOVERY_AREA_USAGE: breakdown by file type\nRMAN> BACKUP DATABASE; — backups go to FRA\nAutomatic cleanup: oldest files deleted when needed'
};
INFO.rac_cluster = {
  title:'CLUSTER COMPONENTS', subtitle:'RAC — GRID INFRASTRUCTURE SERVICES',
  color:'#F1C40F',
  desc:'RAC cluster components are managed by Oracle Grid Infrastructure (GI). The Voting Disk stores cluster membership info and is used for split-brain resolution — nodes that cannot access the voting disk are evicted. OCR (Oracle Cluster Registry) stores cluster configuration (database names, VIPs, services). CRS (Cluster Ready Services) manages all cluster resources (instances, listeners, VIPs, ASM) — automatically starting, stopping, and relocating them. The ASM instance (+ASM) runs on each node to provide shared storage access.',
  flows:[
    {c:'#F1C40F', t:'Voting Disk: cluster membership + split-brain'},
    {c:'#FB923C', t:'OCR: cluster configuration registry'},
    {c:'#2ECC71', t:'CRS/GI: resource management (start/stop/relocate)'},
    {c:'#3B82F6', t:'ASM Instance: +ASM1, +ASM2 per node'},
  ],
  trigger:'crsctl stat res -t — all CRS resources\ncrsctl check crs — CRS stack status\nocrcheck — verify OCR integrity\ncrsctl query css votedisk — voting disk info\nsrvctl: manage databases, instances, listeners\nCRS manages: database, instance, ASM, listener, VIP, SCAN'
};

// ═══════════════════════════════════════════════════════════════
// DETAIL VIEW — ZOOM-IN OVERLAY SYSTEM
// ═══════════════════════════════════════════════════════════════
let detailViewOpen = false;
let detailTimers = [];
let detailRAFs = [];

function openDetailView(key, ev) {
  if (detailViewOpen) return;
  if (currentView !== 'standard') { showInfo(key); return; }
  detailViewOpen = true;

  const overlay = document.getElementById('detail-overlay');
  const backBtn = document.getElementById('detail-back');
  const escHint = document.querySelector('.esc-hint');

  const builder = detailBuilders[key];
  if (!builder) { showInfo(key); detailViewOpen = false; return; }

  overlay.innerHTML = builder();
  overlay.style.display = 'block';
  backBtn.style.display = 'block';
  if (escHint) escHint.style.display = 'block';

  requestAnimationFrame(() => { overlay.classList.add('visible'); });

  document.getElementById('legend').style.display = 'none';
  document.getElementById('zoom-ctrl').style.display = 'none';
  closeInfo();

  const starter = detailAnimStarters[key];
  if (starter) setTimeout(starter, 120);

  document.getElementById('status-tip').textContent =
    'DETAIL VIEW: ' + key.toUpperCase() + ' \u2014 PRESS ESC OR \u2190 BACK TO RETURN';
}

function closeDetailView() {
  if (!detailViewOpen) return;
  detailViewOpen = false;

  detailTimers.forEach(id => clearInterval(id));
  detailTimers = [];
  detailRAFs.forEach(id => cancelAnimationFrame(id));
  detailRAFs = [];

  const overlay = document.getElementById('detail-overlay');
  overlay.classList.remove('visible');
  setTimeout(() => { overlay.style.display = 'none'; overlay.innerHTML = ''; }, 350);

  document.getElementById('detail-back').style.display = 'none';
  const escHint = document.querySelector('.esc-hint');
  if (escHint) escHint.style.display = 'none';

  document.getElementById('legend').style.display = 'grid';
  document.getElementById('zoom-ctrl').style.display = 'flex';
  document.getElementById('status-tip').textContent = '\u2190 CLICK ANY COMPONENT FOR DETAILS';
}

document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape' && detailViewOpen) closeDetailView();
});

// ── DETAIL VIEW BUILDERS ─────────────────────────────────────
const detailBuilders = {};
const detailAnimStarters = {};

// ═══════════════════════════════════════════════════════════════
// BUFFER CACHE DETAIL VIEW
// ═══════════════════════════════════════════════════════════════
detailBuilders.buffercache = function() {
  return '<div class="detail-title-bar">' +
    '<div style="width:40px;height:40px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:20px;background:rgba(46,204,113,0.15);border:2px solid #2ECC71;color:#2ECC71">\u2593</div>' +
    '<div><h2 style="color:#2ECC71">DATABASE BUFFER CACHE</h2>' +
    '<div class="dt-sub">SGA \u2014 HASH BUCKETS \u00B7 LRU CHAIN \u00B7 PHYSICAL/LOGICAL READS \u00B7 DBWn FLUSH</div></div></div>' +
    '<div class="detail-content" style="grid-template-columns:1fr 1fr;grid-template-rows:auto auto;">' +

    '<div class="detail-panel" style="border-color:rgba(46,204,113,0.3);background:rgba(14,30,18,0.6);grid-row:span 2;">' +
    '<div class="dp-title" style="color:#2ECC71">HASH BUCKETS (DBA HASH)</div>' +
    '<div class="dp-desc">Blocks indexed by hash(file# + block#). Each bucket holds a chain of cached buffers.</div>' +
    '<div id="dv-bc-buckets" style="margin-top:10px;max-height:420px;overflow-y:auto;"></div>' +
    '<div style="margin-top:8px;display:flex;gap:8px;font-family:\'Share Tech Mono\',monospace;font-size:8px;">' +
    '<span style="color:#2ECC71">\u25A0 CLEAN</span><span style="color:#FF4757">\u25A0 DIRTY</span>' +
    '<span style="color:#60A5FA">\u25A0 READING</span><span style="color:#34D399">\u25A0 FLUSHING</span></div></div>' +

    '<div class="detail-panel" style="border-color:rgba(46,204,113,0.2);background:rgba(10,24,14,0.5);">' +
    '<div class="dp-title" style="color:#6EE7A0">LIVE I/O ACTIVITY</div>' +
    '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px;">' +
    '<div class="dv-stat" style="background:rgba(59,130,246,0.15);border:1px solid rgba(59,130,246,0.3);color:#60A5FA">PHYSICAL READS: <span id="dv-bc-preads">0</span></div>' +
    '<div class="dv-stat" style="background:rgba(46,204,113,0.15);border:1px solid rgba(46,204,113,0.3);color:#2ECC71">LOGICAL READS: <span id="dv-bc-lreads">0</span></div>' +
    '<div class="dv-stat" style="background:rgba(255,71,87,0.15);border:1px solid rgba(255,71,87,0.3);color:#FF4757">DIRTY: <span id="dv-bc-dirty">0</span></div>' +
    '<div class="dv-stat" style="background:rgba(46,204,113,0.1);border:1px solid rgba(46,204,113,0.2);color:#34D399">DBWn WRITES: <span id="dv-bc-writes">0</span></div></div>' +
    '<div id="dv-bc-log" style="font-family:\'Share Tech Mono\',monospace;font-size:8px;color:var(--txt-dim);max-height:140px;overflow-y:auto;line-height:1.7;"></div></div>' +

    '<div class="detail-panel" style="border-color:rgba(46,204,113,0.2);background:rgba(10,24,14,0.5);position:relative;">' +
    '<div class="dp-title" style="color:#34D399">LRU CHAIN \u2014 TOUCH COUNT ORDER</div>' +
    '<div class="dp-desc" style="margin-bottom:8px">Blocks ordered by access frequency. Cold end evicted first. Dirty blocks flushed by DBWn before eviction.</div>' +
    '<div id="dv-bc-lru" style="display:flex;flex-wrap:wrap;gap:3px;"></div></div>' +

    '<div class="dv-explain" style="border-color:rgba(46,204,113,0.15);">' +
    '<div class="dve-heading" style="color:#2ECC71"><div class="dve-icon" style="background:rgba(46,204,113,0.12);border:1px solid rgba(46,204,113,0.3);color:#2ECC71">\u2593</div> HOW THE DATABASE BUFFER CACHE WORKS</div>' +
    '<div class="dve-body">' +
    '<p>The Buffer Cache is the <span style="color:#2ECC71;font-weight:700">most performance-critical SGA component</span>. Every block Oracle reads from disk is cached here in 8KB units. Subsequent accesses (<span style="color:#2ECC71">Logical Reads</span>) are served from RAM \u2014 orders of magnitude faster than disk I/O. This is why Oracle databases can handle millions of reads per second.</p>' +
    '<p>Oracle uses a variant of the <span style="color:#2ECC71">LRU (Least Recently Used)</span> algorithm with <span style="color:#2ECC71">touch-count enhancement</span>. Each time a block is accessed, its touch count increments. Blocks with higher touch counts survive longer before eviction. Modified blocks (<span style="color:#FF4757">Dirty Buffers</span>) accumulate here until DBWn writes them to disk asynchronously.</p>' +
    '<p><span class="dve-label" style="color:#2ECC71">KEY CONCEPTS:</span></p>' +
    '<div class="dve-flows">' +
    '<div class="dve-flow-item"><div class="dve-flow-dot" style="background:#60A5FA"></div><span style="color:#60A5FA">Physical Read</span> \u2014 Block not in cache. Server process reads 8KB block from Data File into an empty buffer slot (cache miss).</div>' +
    '<div class="dve-flow-item"><div class="dve-flow-dot" style="background:#2ECC71"></div><span style="color:#2ECC71">Logical Read</span> \u2014 Block found in cache. No disk I/O needed. Touch count incremented. This is the performance goal (cache hit).</div>' +
    '<div class="dve-flow-item"><div class="dve-flow-dot" style="background:#FF4757"></div><span style="color:#FF4757">Dirty Buffer</span> \u2014 Block modified by DML (INSERT/UPDATE/DELETE). Contains changes not yet written to disk. DBWn handles the write.</div>' +
    '<div class="dve-flow-item"><div class="dve-flow-dot" style="background:#34D399"></div><span style="color:#34D399">DBWn Flush</span> \u2014 Database Writer writes dirty blocks to data files in batches. Triggered by checkpoint, low free buffers, or every 3 seconds.</div>' +
    '<div class="dve-flow-item"><div class="dve-flow-dot" style="background:rgba(255,255,255,0.3)"></div><span style="color:rgba(255,255,255,0.5)">Hash Bucket</span> \u2014 Blocks indexed by hash(file# + block#). Hash lookup provides O(1) access to find any cached block.</div>' +
    '</div>' +
    '<p><span class="dve-label" style="color:#2ECC71">BUFFER POOLS:</span></p>' +
    '<p><span style="color:#2ECC71">DEFAULT</span> \u2014 Standard LRU-managed pool for all objects. <span style="color:#F1C40F">KEEP</span> \u2014 Pin hot, frequently accessed objects (small lookup tables). <span style="color:#38BDF8">RECYCLE</span> \u2014 Prevent large table scans from flushing hot blocks.</p>' +
    '<div class="dve-trigger">' +
    '<strong style="color:#2ECC71">DB_CACHE_SIZE</strong>: fixed size for DEFAULT pool<br>' +
    '<strong style="color:#2ECC71">SGA_TARGET + ASMM</strong>: auto-managed by MMAN<br>' +
    '<strong style="color:#2ECC71">DB_KEEP_CACHE_SIZE</strong>: size of KEEP pool<br>' +
    '<strong style="color:#2ECC71">DB_RECYCLE_CACHE_SIZE</strong>: size of RECYCLE pool<br>' +
    '<strong style="color:#2ECC71">V$BH</strong>: buffer headers (dirty/clean count per block)<br>' +
    '<strong style="color:#2ECC71">V$BUFFER_POOL_STATISTICS</strong>: hit ratio per pool<br>' +
    '"free buffer waits" = DBWn can\'t keep up, cache too small</div>' +
    '</div></div>' +

    '</div>';
};

detailAnimStarters.buffercache = function() {
  var bucketsEl = document.getElementById('dv-bc-buckets');
  var lruEl = document.getElementById('dv-bc-lru');
  var logEl = document.getElementById('dv-bc-log');
  if (!bucketsEl) return;

  var NBUCKETS = 12;
  var buckets = [];
  var blockNames = ['EMP:1','EMP:2','EMP:3','DEPT:1','DEPT:2','IDX:1','IDX:2','IDX:3','SAL:1','SAL:2',
    'ORD:1','ORD:2','ORD:3','INV:1','INV:2','CUST:1','CUST:2','CUST:3','PROD:1','PROD:2',
    'TAB:1','TAB:2','SYS:1','SYS:2','HR:1','HR:2','FIN:1','FIN:2'];
  var usedBlocks = {};

  for (var i = 0; i < NBUCKETS; i++) {
    var nBlks = Math.floor(Math.random()*3) + 1;
    var chain = [];
    for (var j = 0; j < nBlks; j++) {
      var bn;
      do { bn = blockNames[Math.floor(Math.random()*blockNames.length)]; } while (usedBlocks[bn]);
      usedBlocks[bn] = true;
      chain.push({ name: bn, dirty: Math.random() < 0.3, touch: Math.floor(Math.random()*5)+1 });
    }
    buckets.push(chain);
  }

  var physReads = 0, logReads = 0, dirtyCount = 0, dbwnWrites = 0;

  function renderBuckets() {
    var h = ''; dirtyCount = 0;
    buckets.forEach(function(chain, i) {
      h += '<div class="dv-hash-row"><span style="min-width:30px;color:rgba(46,204,113,0.4)">B'+i+':</span>';
      chain.forEach(function(blk) {
        var cls = blk.dirty ? 'dirty' : 'clean';
        if (blk.dirty) dirtyCount++;
        h += '<span class="dv-chain-blk ' + cls + '" title="Touch:'+blk.touch+'">' + blk.name + '</span>';
        h += '<span style="color:rgba(255,255,255,0.15);font-size:6px">\u2192</span>';
      });
      if (chain.length === 0) h += '<span style="color:rgba(255,255,255,0.1);font-size:7px">empty</span>';
      h += '</div>';
    });
    bucketsEl.innerHTML = h;
    var dEl = document.getElementById('dv-bc-dirty');
    if (dEl) dEl.textContent = dirtyCount;
  }

  function renderLRU() {
    var allBlocks = [];
    buckets.forEach(function(chain) { chain.forEach(function(b) { allBlocks.push(b); }); });
    allBlocks.sort(function(a,b) { return a.touch - b.touch; });
    var h = '<div style="font-size:7px;color:rgba(255,255,255,0.2);margin-bottom:4px">COLD \u2190 \u2192 HOT</div>';
    allBlocks.forEach(function(b, i) {
      var opacity = 0.3 + (i/allBlocks.length)*0.7;
      var bg = b.dirty ? 'rgba(255,71,87,0.2)' : 'rgba(46,204,113,0.15)';
      var bc = b.dirty ? 'rgba(255,71,87,0.4)' : 'rgba(46,204,113,0.25)';
      var clr = b.dirty ? '#FF4757' : '#2ECC71';
      h += '<div style="padding:2px 5px;border-radius:3px;background:'+bg+';border:1px solid '+bc+
        ';font-family:monospace;font-size:7px;color:'+clr+';opacity:'+opacity+'">'+b.name+
        '<span style="font-size:5px;opacity:0.5"> t'+b.touch+'</span></div>';
    });
    lruEl.innerHTML = h;
  }

  function addLog(msg, color) {
    var t = new Date().toLocaleTimeString();
    logEl.innerHTML = '<div style="color:'+color+'">'+t+' '+msg+'</div>' + logEl.innerHTML;
    if (logEl.children.length > 20) logEl.removeChild(logEl.lastChild);
  }

  renderBuckets(); renderLRU();

  detailTimers.push(setInterval(function() {
    if (!detailViewOpen) return;
    var bi = Math.floor(Math.random()*NBUCKETS);
    var bn;
    do { bn = blockNames[Math.floor(Math.random()*blockNames.length)]; } while (usedBlocks[bn]);
    if (buckets[bi].length >= 5) {
      var ev = buckets[bi].shift();
      delete usedBlocks[ev.name];
      addLog('EVICT ' + ev.name + ' from B'+bi, 'rgba(255,255,255,0.3)');
    }
    usedBlocks[bn] = true;
    buckets[bi].push({ name: bn, dirty: false, touch: 1 });
    physReads++;
    var prEl = document.getElementById('dv-bc-preads');
    if (prEl) prEl.textContent = physReads;
    addLog('PHYSICAL READ ' + bn + ' \u2192 B'+bi, '#60A5FA');
    renderBuckets(); renderLRU();
  }, 2500));

  detailTimers.push(setInterval(function() {
    if (!detailViewOpen) return;
    var all = [];
    buckets.forEach(function(chain, bi) { chain.forEach(function(b, ci) { all.push(b); }); });
    if (all.length === 0) return;
    var pick = all[Math.floor(Math.random()*all.length)];
    pick.touch++;
    logReads++;
    var lrEl = document.getElementById('dv-bc-lreads');
    if (lrEl) lrEl.textContent = logReads;
    addLog('LOGICAL READ ' + pick.name + ' (touch\u2192'+pick.touch+')', '#2ECC71');
    renderBuckets(); renderLRU();
  }, 1200));

  detailTimers.push(setInterval(function() {
    if (!detailViewOpen) return;
    var clean = [];
    buckets.forEach(function(chain) { chain.forEach(function(b) { if (!b.dirty) clean.push(b); }); });
    if (clean.length === 0) return;
    var pick = clean[Math.floor(Math.random()*clean.length)];
    pick.dirty = true;
    addLog('DML \u2192 ' + pick.name + ' DIRTY', '#FF4757');
    renderBuckets(); renderLRU();
  }, 3500));

  detailTimers.push(setInterval(function() {
    if (!detailViewOpen) return;
    var dirtyBlocks = [];
    buckets.forEach(function(chain) { chain.forEach(function(b) { if (b.dirty) dirtyBlocks.push(b); }); });
    if (dirtyBlocks.length < 3) return;
    var nFlush = Math.min(3, dirtyBlocks.length);
    for (var i = 0; i < nFlush; i++) { dirtyBlocks[i].dirty = false; dbwnWrites++; }
    var wEl = document.getElementById('dv-bc-writes');
    if (wEl) wEl.textContent = dbwnWrites;
    addLog('DBWn FLUSH ' + nFlush + ' dirty blocks \u2192 disk', '#34D399');
    renderBuckets(); renderLRU();
  }, 5000));
};

// ═══════════════════════════════════════════════════════════════
// SHARED POOL DETAIL VIEW
// ═══════════════════════════════════════════════════════════════
detailBuilders.sharedpool = function() {
  return '<div class="detail-title-bar">' +
    '<div style="width:40px;height:40px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:20px;background:rgba(241,196,15,0.15);border:2px solid #F1C40F;color:#F1C40F">\u2699</div>' +
    '<div><h2 style="color:#F1C40F">SHARED POOL</h2>' +
    '<div class="dt-sub">SGA \u2014 LIBRARY CACHE \u00B7 HARD PARSE vs SOFT PARSE \u00B7 DATA DICTIONARY CACHE</div></div></div>' +
    '<div class="detail-content" style="grid-template-columns:1.3fr 1fr;grid-template-rows:auto auto;">' +

    '<div class="detail-panel" style="border-color:rgba(241,196,15,0.3);background:rgba(22,20,6,0.6);grid-row:span 2;">' +
    '<div class="dp-title" style="color:#F1C40F">LIBRARY CACHE \u2014 SQL CURSORS</div>' +
    '<div class="dp-desc" style="margin-bottom:6px">Cached SQL statements with execution plans. Hash lookup by SQL_ID.</div>' +
    '<div id="dv-sp-cursors" style="max-height:400px;overflow-y:auto;"></div></div>' +

    '<div class="detail-panel" style="border-color:rgba(241,196,15,0.2);background:rgba(20,18,4,0.5);">' +
    '<div class="dp-title" style="color:#D4AC0D">SQL PARSE FLOW</div>' +
    '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px;">' +
    '<div class="dv-stat" style="background:rgba(255,71,87,0.15);border:1px solid rgba(255,71,87,0.3);color:#FF4757">HARD PARSES: <span id="dv-sp-hard">0</span></div>' +
    '<div class="dv-stat" style="background:rgba(46,204,113,0.15);border:1px solid rgba(46,204,113,0.3);color:#2ECC71">SOFT PARSES: <span id="dv-sp-soft">0</span></div>' +
    '<div class="dv-stat" style="background:rgba(241,196,15,0.1);border:1px solid rgba(241,196,15,0.2);color:#F1C40F">TOTAL: <span id="dv-sp-total">0</span></div></div>' +
    '<div id="dv-sp-log" style="font-family:\'Share Tech Mono\',monospace;font-size:8px;color:var(--txt-dim);max-height:130px;overflow-y:auto;line-height:1.7;"></div></div>' +

    '<div class="detail-panel" style="border-color:rgba(241,196,15,0.15);background:rgba(18,16,4,0.5);">' +
    '<div class="dp-title" style="color:#A0801A">DATA DICTIONARY CACHE (ROW CACHE)</div>' +
    '<div id="dv-sp-dict" style="display:flex;flex-wrap:wrap;gap:4px;"></div></div>' +

    '<div class="dv-explain" style="border-color:rgba(241,196,15,0.15);">' +
    '<div class="dve-heading" style="color:#F1C40F"><div class="dve-icon" style="background:rgba(241,196,15,0.12);border:1px solid rgba(241,196,15,0.3);color:#F1C40F">\u2699</div> HOW THE SHARED POOL WORKS</div>' +
    '<div class="dve-body">' +
    '<p>The Shared Pool contains two major caches that are critical to Oracle performance: the <span style="color:#F1C40F;font-weight:700">Library Cache</span> and the <span style="color:#A0801A;font-weight:700">Data Dictionary Cache</span>. Together, they eliminate repeated work by caching parsed SQL and metadata in shared memory accessible by all sessions.</p>' +
    '<p>When a SQL statement arrives, Oracle computes a hash of the SQL text and looks it up in the Library Cache. If found (<span style="color:#2ECC71">Soft Parse</span>), Oracle reuses the existing execution plan \u2014 this is extremely fast. If not found (<span style="color:#FF4757">Hard Parse</span>), Oracle must perform a full parse: syntax check, semantic check (object resolution from Data Dictionary), optimizer cost calculation, and execution plan generation. Hard parses are CPU-intensive and serialized by latches \u2014 they are the #1 enemy of scalability.</p>' +
    '<p><span class="dve-label" style="color:#F1C40F">KEY CONCEPTS:</span></p>' +
    '<div class="dve-flows">' +
    '<div class="dve-flow-item"><div class="dve-flow-dot" style="background:#FF4757"></div><span style="color:#FF4757">Hard Parse</span> \u2014 Full parse + optimize + plan generation. Expensive. Caused by literal SQL without bind variables (e.g., WHERE id = 42 vs WHERE id = :1).</div>' +
    '<div class="dve-flow-item"><div class="dve-flow-dot" style="background:#2ECC71"></div><span style="color:#2ECC71">Soft Parse</span> \u2014 Hash lookup finds cached cursor. Reuse existing plan. Fast. Bind variables enable soft parse reuse across all sessions.</div>' +
    '<div class="dve-flow-item"><div class="dve-flow-dot" style="background:#F1C40F"></div><span style="color:#F1C40F">Library Cache</span> \u2014 Stores parsed SQL cursors with execution plans (V$SQL). Each cursor has SQL_ID, plan hash, execution stats, and bind metadata.</div>' +
    '<div class="dve-flow-item"><div class="dve-flow-dot" style="background:#A0801A"></div><span style="color:#A0801A">Data Dictionary Cache</span> \u2014 Caches metadata rows from SYSTEM tablespace: table definitions, column info, privilege checks, constraint data, sequence values.</div>' +
    '<div class="dve-flow-item"><div class="dve-flow-dot" style="background:#A855F7"></div><span style="color:#A855F7">Mutex / Latch</span> \u2014 Concurrency controls protecting shared pool structures. "library cache: mutex X" waits indicate hard parse contention.</div>' +
    '</div>' +
    '<p><span class="dve-label" style="color:#F1C40F">WHY BIND VARIABLES MATTER:</span></p>' +
    '<p>Without binds: <span style="color:#FF4757">SELECT * FROM emp WHERE id = 42</span> and <span style="color:#FF4757">SELECT * FROM emp WHERE id = 43</span> are TWO different cursors (two hard parses). With binds: <span style="color:#2ECC71">SELECT * FROM emp WHERE id = :1</span> is ONE cursor reused thousands of times (one hard parse, then all soft parses). This is the single most important Oracle performance rule.</p>' +
    '<div class="dve-trigger">' +
    '<strong style="color:#F1C40F">SHARED_POOL_SIZE</strong>: manual sizing (or set to 0 with SGA_TARGET)<br>' +
    '<strong style="color:#F1C40F">CURSOR_SHARING = FORCE</strong>: auto-replace literals with binds (emergency fix)<br>' +
    '<strong style="color:#F1C40F">V$SQL</strong>: all cached cursors with EXECUTIONS, PARSE_CALLS, ELAPSED_TIME<br>' +
    '<strong style="color:#F1C40F">V$SQLAREA</strong>: aggregated SQL stats (one row per SQL_ID)<br>' +
    '<strong style="color:#F1C40F">V$LIBRARY_CACHE</strong>: hit ratio per namespace (SQL AREA, TABLE/PROCEDURE)<br>' +
    '<strong style="color:#F1C40F">ALTER SYSTEM FLUSH SHARED_POOL;</strong> \u2014 flushes all cached plans (emergency only)</div>' +
    '</div></div>' +

    '</div>';
};

detailAnimStarters.sharedpool = function() {
  var cursorsEl = document.getElementById('dv-sp-cursors');
  var logEl = document.getElementById('dv-sp-log');
  var dictEl = document.getElementById('dv-sp-dict');
  if (!cursorsEl) return;

  var sqlStatements = [
    {sql:'SELECT * FROM employees WHERE dept_id = :1', id:'a1b2c3', execs:142, plan:'INDEX RANGE SCAN'},
    {sql:'UPDATE orders SET status = :1 WHERE order_id = :2', id:'d4e5f6', execs:89, plan:'TABLE ACCESS BY ROWID'},
    {sql:'SELECT COUNT(*) FROM inventory', id:'g7h8i9', execs:312, plan:'FULL TABLE SCAN'},
    {sql:'INSERT INTO audit_log VALUES(:1,:2,:3,:4)', id:'j0k1l2', execs:1047, plan:'INSERT + INDEX'},
    {sql:'DELETE FROM temp_data WHERE ts < :1', id:'m3n4o5', execs:23, plan:'INDEX RANGE SCAN'},
    {sql:'SELECT e.name, d.dept_name FROM emp e JOIN dept d ON e.dept_id=d.id', id:'p6q7r8', execs:67, plan:'HASH JOIN'}
  ];

  var incomingSqls = [
    'SELECT * FROM employees WHERE dept_id = :1',
    'SELECT name FROM products WHERE price > :1',
    'UPDATE orders SET status = :1 WHERE order_id = :2',
    'SELECT SUM(amount) FROM transactions GROUP BY acct_id',
    'INSERT INTO audit_log VALUES(:1,:2,:3,:4)',
    'SELECT * FROM employees WHERE dept_id = :1',
    'DELETE FROM session_cache WHERE expires < SYSDATE',
    'SELECT COUNT(*) FROM inventory'
  ];

  var hardParses = 0, softParses = 0, totalParses = 0;

  var dictEntries = [
    {name:'EMPLOYEES', type:'TABLE', hits:234}, {name:'ORDERS', type:'TABLE', hits:189},
    {name:'DEPT_ID_IDX', type:'INDEX', hits:156}, {name:'SYS_C001234', type:'CONSTRAINT', hits:45},
    {name:'HR.EMPLOYEES', type:'SYNONYM', hits:89}, {name:'APP_USER', type:'USER', hits:67},
    {name:'DBA_ROLE', type:'ROLE', hits:23}, {name:'INVENTORY', type:'TABLE', hits:112},
    {name:'PK_ORDERS', type:'INDEX', hits:98}, {name:'PRODUCTS', type:'TABLE', hits:78}
  ];

  function renderCursors() {
    var h = '';
    sqlStatements.forEach(function(s) {
      h += '<div class="dv-sql-row" id="dv-sql-'+s.id+'" style="background:rgba(241,196,15,0.08);border:1px solid rgba(241,196,15,0.15);color:#D4AC0D;">' +
        '<div style="display:flex;justify-content:space-between;align-items:center">' +
        '<span style="color:#F1C40F;font-size:7px">SQL_ID: '+s.id+'</span>' +
        '<span style="color:rgba(241,196,15,0.4);font-size:7px">EXECS: '+s.execs+'</span></div>' +
        '<div style="color:rgba(241,196,15,0.7);margin-top:2px">'+s.sql+'</div>' +
        '<div style="color:rgba(241,196,15,0.3);font-size:7px;margin-top:2px">PLAN: '+s.plan+'</div></div>';
    });
    cursorsEl.innerHTML = h;
  }

  function renderDict() {
    var h = '';
    dictEntries.forEach(function(d) {
      var clr = d.type === 'TABLE' ? '#2ECC71' : d.type === 'INDEX' ? '#60A5FA' : '#A855F7';
      h += '<div style="padding:3px 8px;border-radius:3px;background:rgba(241,196,15,0.05);border:1px solid rgba(241,196,15,0.1);font-family:\'Share Tech Mono\',monospace;font-size:7px;color:'+clr+'">' +
        d.name + ' <span style="color:rgba(255,255,255,0.2);font-size:6px">'+d.type+' hits:'+d.hits+'</span></div>';
    });
    dictEl.innerHTML = h;
  }

  function addLog(msg, color) {
    var t = new Date().toLocaleTimeString();
    logEl.innerHTML = '<div style="color:'+color+'">'+t+' '+msg+'</div>' + logEl.innerHTML;
    if (logEl.children.length > 15) logEl.removeChild(logEl.lastChild);
  }

  renderCursors(); renderDict();

  var sqlIdx = 0;
  detailTimers.push(setInterval(function() {
    if (!detailViewOpen) return;
    var incoming = incomingSqls[sqlIdx % incomingSqls.length];
    sqlIdx++; totalParses++;
    var cached = null;
    for (var k = 0; k < sqlStatements.length; k++) {
      if (sqlStatements[k].sql === incoming) { cached = sqlStatements[k]; break; }
    }
    if (cached) {
      softParses++; cached.execs++;
      addLog('SOFT PARSE: ' + incoming.substring(0,40) + '...', '#2ECC71');
      renderCursors();
      var el = document.getElementById('dv-sql-' + cached.id);
      if (el) { el.classList.add('soft-parse'); setTimeout(function() { if(el) el.classList.remove('soft-parse'); }, 600); }
    } else {
      hardParses++;
      var newId = Math.random().toString(36).substring(2,8);
      var plans = ['FULL TABLE SCAN','INDEX RANGE SCAN','HASH JOIN','NESTED LOOPS','SORT MERGE JOIN'];
      sqlStatements.push({ sql: incoming, id: newId, execs: 1, plan: plans[Math.floor(Math.random()*plans.length)] });
      addLog('HARD PARSE: ' + incoming.substring(0,40) + '... (expensive!)', '#FF4757');
      renderCursors();
      setTimeout(function() {
        var el2 = document.getElementById('dv-sql-' + newId);
        if (el2) { el2.classList.add('hard-parse'); setTimeout(function() { if(el2) el2.classList.remove('hard-parse'); }, 1200); }
      }, 50);
    }
    var hEl = document.getElementById('dv-sp-hard'); if(hEl) hEl.textContent = hardParses;
    var sEl = document.getElementById('dv-sp-soft'); if(sEl) sEl.textContent = softParses;
    var tEl = document.getElementById('dv-sp-total'); if(tEl) tEl.textContent = totalParses;
  }, 2000));

  detailTimers.push(setInterval(function() {
    if (!detailViewOpen) return;
    var d = dictEntries[Math.floor(Math.random()*dictEntries.length)];
    d.hits++; renderDict();
  }, 1500));
};

// ═══════════════════════════════════════════════════════════════
// REDO LOG BUFFER DETAIL VIEW
// ═══════════════════════════════════════════════════════════════
detailBuilders.redobuffer = function() {
  return '<div class="detail-title-bar">' +
    '<div style="width:40px;height:40px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:20px;background:rgba(255,71,87,0.15);border:2px solid #FF4757;color:#FF4757">\u25CE</div>' +
    '<div><h2 style="color:#FF4757">REDO LOG BUFFER</h2>' +
    '<div class="dt-sub">SGA \u2014 CIRCULAR BUFFER \u00B7 LGWR FLUSH \u00B7 COMMIT SEQUENCE \u00B7 WAL WRITE</div></div></div>' +
    '<div class="detail-content" style="grid-template-columns:1fr 1fr;">' +

    '<div class="detail-panel" style="border-color:rgba(255,71,87,0.3);background:rgba(26,8,8,0.6);">' +
    '<div class="dp-title" style="color:#FF4757">CIRCULAR BUFFER \u2014 FILL / DRAIN</div>' +
    '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px;">' +
    '<div class="dv-stat" style="background:rgba(255,71,87,0.15);border:1px solid rgba(255,71,87,0.3);color:#FF4757">FILL: <span id="dv-rb-fill">0</span>%</div>' +
    '<div class="dv-stat" style="background:rgba(46,204,113,0.15);border:1px solid rgba(46,204,113,0.3);color:#2ECC71">COMMITS: <span id="dv-rb-commits">0</span></div>' +
    '<div class="dv-stat" style="background:rgba(255,71,87,0.1);border:1px solid rgba(255,71,87,0.2);color:rgba(255,71,87,0.7)">LGWR FLUSHES: <span id="dv-rb-flushes">0</span></div></div>' +
    '<div style="position:relative;width:100%;padding-top:100%;max-width:300px;margin:0 auto;">' +
    '<svg id="dv-rb-ring" viewBox="0 0 200 200" style="position:absolute;top:0;left:0;width:100%;height:100%;">' +
    '<circle cx="100" cy="100" r="80" fill="none" stroke="rgba(255,71,87,0.1)" stroke-width="24"/>' +
    '<circle cx="100" cy="100" r="80" fill="none" stroke="#FF4757" stroke-width="24" id="dv-rb-arc" stroke-dasharray="0 502" stroke-dashoffset="0" transform="rotate(-90 100 100)" style="transition:stroke-dasharray 0.3s;filter:drop-shadow(0 0 6px rgba(255,71,87,0.5))"/>' +
    '<circle id="dv-rb-head" cx="100" cy="20" r="6" fill="#FF4757" style="filter:drop-shadow(0 0 8px #FF4757);transition:all 0.3s"/>' +
    '<circle id="dv-rb-drain" cx="100" cy="20" r="5" fill="#2ECC71" style="filter:drop-shadow(0 0 6px #2ECC71);transition:all 0.3s"/>' +
    '<text x="100" y="95" text-anchor="middle" fill="#FF4757" font-family="Orbitron" font-size="11" font-weight="700">REDO</text>' +
    '<text x="100" y="112" text-anchor="middle" fill="rgba(255,71,87,0.5)" font-family="Share Tech Mono" font-size="8">BUFFER</text>' +
    '</svg></div></div>' +

    '<div class="detail-panel" style="border-color:rgba(255,71,87,0.2);background:rgba(20,6,6,0.5);">' +
    '<div class="dp-title" style="color:rgba(255,71,87,0.8)">REDO EVENT LOG</div>' +
    '<div class="dp-desc" style="margin-bottom:8px">Server processes write redo entries. LGWR flushes on: COMMIT, 1/3 full, every 3 seconds.</div>' +
    '<div id="dv-rb-log" style="font-family:\'Share Tech Mono\',monospace;font-size:8px;color:var(--txt-dim);max-height:350px;overflow-y:auto;line-height:1.8;"></div></div>' +

    '<div class="detail-panel" style="border-color:rgba(255,71,87,0.15);background:rgba(18,4,4,0.5);grid-column:span 2;">' +
    '<div class="dp-title" style="color:rgba(255,71,87,0.7)">COMMIT SEQUENCE \u2014 WAL GUARANTEE</div>' +
    '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;font-family:\'Share Tech Mono\',monospace;font-size:9px;">' +
    '<span style="padding:6px 12px;border-radius:4px;border:1px solid rgba(168,85,247,0.3);background:rgba(168,85,247,0.08);color:#A855F7">1. DML Change</span>' +
    '<span style="color:var(--txt-dim)">\u2192</span>' +
    '<span style="padding:6px 12px;border-radius:4px;border:1px solid rgba(255,71,87,0.3);background:rgba(255,71,87,0.08);color:#FF4757">2. Write Redo Vector</span>' +
    '<span style="color:var(--txt-dim)">\u2192</span>' +
    '<span style="padding:6px 12px;border-radius:4px;border:1px solid rgba(241,196,15,0.3);background:rgba(241,196,15,0.08);color:#F1C40F">3. COMMIT issued</span>' +
    '<span style="color:var(--txt-dim)">\u2192</span>' +
    '<span id="dv-rb-step4" style="padding:6px 12px;border-radius:4px;border:1px solid rgba(255,71,87,0.3);background:rgba(255,71,87,0.08);color:#FF4757">4. LGWR flush to disk</span>' +
    '<span style="color:var(--txt-dim)">\u2192</span>' +
    '<span style="padding:6px 12px;border-radius:4px;border:1px solid rgba(46,204,113,0.3);background:rgba(46,204,113,0.08);color:#2ECC71">5. ACK to client</span></div>' +
    '<div style="font-family:\'Share Tech Mono\',monospace;font-size:7.5px;color:var(--txt-dim);margin-top:8px">WAL (Write-Ahead Log): Redo MUST be on disk BEFORE commit is acknowledged. This guarantees ACID Durability.</div></div>' +

    '<div class="dv-explain" style="border-color:rgba(255,71,87,0.15);">' +
    '<div class="dve-heading" style="color:#FF4757"><div class="dve-icon" style="background:rgba(255,71,87,0.12);border:1px solid rgba(255,71,87,0.3);color:#FF4757">\u25CE</div> HOW THE REDO LOG BUFFER WORKS</div>' +
    '<div class="dve-body">' +
    '<p>The Redo Log Buffer is a <span style="color:#FF4757;font-weight:700">fixed-size circular buffer</span> in the SGA. Every change made to any block \u2014 whether a data block or undo block \u2014 generates a <span style="color:#FF4757">Redo Record</span> (also called a "change vector"). These records describe exactly what changed: the block address (DBA), the SCN, and the before/after byte values. This is the foundation of Oracle\'s crash recovery and Data Guard replication.</p>' +
    '<p>Server processes write redo records into this buffer immediately as they make changes \u2014 even before COMMIT. The <span style="color:#FF4757">LGWR (Log Writer)</span> background process asynchronously drains this buffer to the Online Redo Log Files on disk. The key insight: <span style="color:#FF4757;font-weight:700">redo is sequential I/O</span> (fast), while data file writes are random I/O (slow). This separation is why COMMIT is fast.</p>' +
    '<p><span class="dve-label" style="color:#FF4757">LGWR FLUSH TRIGGERS:</span></p>' +
    '<div class="dve-flows">' +
    '<div class="dve-flow-item"><div class="dve-flow-dot" style="background:#F1C40F"></div><span style="color:#F1C40F">COMMIT</span> \u2014 Most important trigger. LGWR must flush ALL redo up to this COMMIT\'s SCN to disk BEFORE returning success to the client. This is the WAL guarantee.</div>' +
    '<div class="dve-flow-item"><div class="dve-flow-dot" style="background:#FF4757"></div><span style="color:#FF4757">1/3 Full</span> \u2014 When the buffer reaches one-third capacity, LGWR proactively flushes to prevent the buffer from filling up and blocking server processes.</div>' +
    '<div class="dve-flow-item"><div class="dve-flow-dot" style="background:#A855F7"></div><span style="color:#A855F7">Every 3 Seconds</span> \u2014 Periodic timeout ensures redo doesn\'t sit in the buffer too long, even if no commits are happening.</div>' +
    '<div class="dve-flow-item"><div class="dve-flow-dot" style="background:#2ECC71"></div><span style="color:#2ECC71">Before DBWn</span> \u2014 DBWn cannot write a dirty block to disk until the redo for that block\'s changes has been flushed. This ensures recoverability.</div>' +
    '</div>' +
    '<p><span class="dve-label" style="color:#FF4757">WAL (WRITE-AHEAD LOGGING) GUARANTEE:</span></p>' +
    '<p>This is the core of Oracle\'s ACID Durability. The rule is absolute: <span style="color:#FF4757;font-weight:700">redo records MUST be written to disk BEFORE the corresponding commit is acknowledged</span>. If the instance crashes after COMMIT is acknowledged, Oracle can replay the redo log to reconstruct all committed changes during crash recovery (SMON roll-forward). If the instance crashes before redo is flushed, the COMMIT was never acknowledged, so no data inconsistency.</p>' +
    '<p><span class="dve-label" style="color:#FF4757">PERFORMANCE IMPLICATIONS:</span></p>' +
    '<p>The "log file sync" wait event measures the time a committing session waits for LGWR to complete the flush. If this wait is high, the redo log storage is too slow \u2014 redo logs should be on the <span style="color:#FF4757">fastest storage available</span> (dedicated NVMe SSD, separate from data files). In Oracle 12.2+, LGWR can spawn worker slaves for parallel redo writing in ultra-high-volume environments.</p>' +
    '<div class="dve-trigger">' +
    '<strong style="color:#FF4757">LOG_BUFFER</strong>: size of redo log buffer (default ~32MB with AMM, min 512KB)<br>' +
    '<strong style="color:#FF4757">V$LOG_BUFFER</strong>: current fill level and allocation statistics<br>' +
    '<strong style="color:#FF4757">V$SYSSTAT</strong>: "redo size", "redo writes", "redo log space requests"<br>' +
    '<strong style="color:#FF4757">"log file sync"</strong>: wait event = session waiting for LGWR to flush<br>' +
    '<strong style="color:#FF4757">"log buffer space"</strong>: wait event = buffer full, server process blocked<br>' +
    '<strong style="color:#FF4757">"redo buffer allocation retries"</strong>: non-zero = buffer may be too small</div>' +
    '</div></div>' +

    '</div>';
};

detailAnimStarters.redobuffer = function() {
  var logEl = document.getElementById('dv-rb-log');
  var arc = document.getElementById('dv-rb-arc');
  var head = document.getElementById('dv-rb-head');
  var drain = document.getElementById('dv-rb-drain');
  if (!arc) return;

  var fillPct = 0, writeAngle = 0, drainAngle = 0, commits = 0, flushes = 0;
  var circumference = 2 * Math.PI * 80;

  function updateRing() {
    var fillLen = (fillPct / 100) * circumference;
    arc.setAttribute('stroke-dasharray', fillLen + ' ' + circumference);
    var wRad = (writeAngle - 90) * Math.PI / 180;
    head.setAttribute('cx', 100 + 80 * Math.cos(wRad));
    head.setAttribute('cy', 100 + 80 * Math.sin(wRad));
    var dRad = (drainAngle - 90) * Math.PI / 180;
    drain.setAttribute('cx', 100 + 80 * Math.cos(dRad));
    drain.setAttribute('cy', 100 + 80 * Math.sin(dRad));
    var fEl = document.getElementById('dv-rb-fill');
    if (fEl) fEl.textContent = Math.round(fillPct);
  }

  function addLog(msg, color) {
    var t = new Date().toLocaleTimeString();
    logEl.innerHTML = '<div style="color:'+color+'">'+t+' '+msg+'</div>' + logEl.innerHTML;
    if (logEl.children.length > 25) logEl.removeChild(logEl.lastChild);
  }

  function triggerFlush(reason) {
    var flushed = fillPct;
    drainAngle = writeAngle;
    fillPct = 0; flushes++;
    var flEl = document.getElementById('dv-rb-flushes');
    if (flEl) flEl.textContent = flushes;
    addLog('LGWR FLUSH: ' + Math.round(flushed) + '% \u2192 Redo Log Files (' + reason + ')', '#2ECC71');
    updateRing();
  }

  detailTimers.push(setInterval(function() {
    if (!detailViewOpen) return;
    var size = Math.floor(Math.random()*5) + 1;
    fillPct = Math.min(100, fillPct + size);
    writeAngle = (writeAngle + size * 3.6) % 360;
    var ops = ['INSERT','UPDATE','DELETE','MERGE'];
    addLog('REDO WRITE: ' + ops[Math.floor(Math.random()*ops.length)] + ' (+' + size + '%)', 'rgba(255,71,87,0.7)');
    updateRing();
    if (fillPct >= 33 && Math.random() < 0.3) triggerFlush('1/3 FULL TRIGGER');
  }, 800));

  detailTimers.push(setInterval(function() {
    if (!detailViewOpen) return;
    commits++;
    var cEl = document.getElementById('dv-rb-commits');
    if (cEl) cEl.textContent = commits;
    addLog('COMMIT \u2192 LGWR flush required', '#F1C40F');
    var step4 = document.getElementById('dv-rb-step4');
    if (step4) { step4.style.boxShadow = '0 0 12px rgba(255,71,87,0.8)'; setTimeout(function() { if(step4) step4.style.boxShadow = ''; }, 600); }
    triggerFlush('COMMIT');
  }, 3500));

  detailTimers.push(setInterval(function() {
    if (!detailViewOpen) return;
    if (fillPct > 5) triggerFlush('3-SEC TIMEOUT');
  }, 6000));

  updateRing();
};

// ═══════════════════════════════════════════════════════════════
// LARGE POOL DETAIL VIEW
// ═══════════════════════════════════════════════════════════════
detailBuilders.largepool = function() {
  return '<div class="detail-title-bar">' +
    '<div style="width:40px;height:40px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:20px;background:rgba(56,189,248,0.15);border:2px solid #38BDF8;color:#38BDF8">\u2630</div>' +
    '<div><h2 style="color:#38BDF8">LARGE POOL</h2>' +
    '<div class="dt-sub">SGA \u2014 RMAN BUFFERS \u00B7 PARALLEL QUERY MESSAGES \u00B7 SHARED SERVER UGA</div></div></div>' +
    '<div class="detail-content" style="grid-template-columns:1fr 1fr;">' +

    '<div class="detail-panel" style="border-color:rgba(56,189,248,0.3);background:rgba(6,18,26,0.6);">' +
    '<div class="dp-title" style="color:#38BDF8">RMAN I/O BUFFER PIPELINE</div>' +
    '<div class="dp-desc" style="margin-bottom:8px">RMAN allocates large I/O buffers here for backup/restore. Each channel gets its own buffer slot.</div>' +
    '<div id="dv-lp-rman" style="display:flex;flex-direction:column;gap:6px;"></div>' +
    '<div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap;">' +
    '<div class="dv-stat" style="background:rgba(56,189,248,0.1);border:1px solid rgba(56,189,248,0.2);color:#38BDF8">CHANNELS ACTIVE: <span id="dv-lp-channels">3</span></div>' +
    '<div class="dv-stat" style="background:rgba(46,204,113,0.1);border:1px solid rgba(46,204,113,0.2);color:#2ECC71">DATA TRANSFERRED: <span id="dv-lp-xfer">0</span> MB</div></div></div>' +

    '<div class="detail-panel" style="border-color:rgba(56,189,248,0.2);background:rgba(4,14,22,0.5);">' +
    '<div class="dp-title" style="color:#0EA5E9">PARALLEL QUERY MESSAGE FLOW</div>' +
    '<div class="dp-desc" style="margin-bottom:8px">PX coordinator distributes work to PX slaves. Messages buffered in Large Pool.</div>' +
    '<div id="dv-lp-pq" style="position:relative;height:260px;overflow:hidden;">' +
    '<div style="position:absolute;top:10px;left:50%;transform:translateX(-50%);padding:6px 16px;border-radius:6px;border:2px solid rgba(241,196,15,0.5);background:rgba(241,196,15,0.08);color:#F1C40F;font-family:\'Orbitron\',sans-serif;font-size:9px;font-weight:700;z-index:2">QC (COORDINATOR)</div>' +
    '<div id="dv-lp-slaves" style="position:absolute;bottom:10px;left:0;right:0;display:flex;justify-content:space-around;"></div></div></div>' +

    '<div class="detail-panel" style="border-color:rgba(56,189,248,0.15);background:rgba(4,12,20,0.5);grid-column:span 2;">' +
    '<div class="dp-title" style="color:rgba(56,189,248,0.7)">LARGE POOL ALLOCATION LOG</div>' +
    '<div id="dv-lp-log" style="font-family:\'Share Tech Mono\',monospace;font-size:8px;color:var(--txt-dim);max-height:120px;overflow-y:auto;line-height:1.7;"></div></div>' +

    '<div class="dv-explain" style="border-color:rgba(56,189,248,0.15);">' +
    '<div class="dve-heading" style="color:#38BDF8"><div class="dve-icon" style="background:rgba(56,189,248,0.12);border:1px solid rgba(56,189,248,0.3);color:#38BDF8">\u2630</div> HOW THE LARGE POOL WORKS</div>' +
    '<div class="dve-body">' +
    '<p>The Large Pool is an <span style="color:#38BDF8;font-weight:700">optional SGA component</span> that prevents large memory allocations from fragmenting the Shared Pool. Without the Large Pool, operations like RMAN backup and Parallel Query would steal memory from the Shared Pool, causing fragmentation and increased hard parse pressure \u2014 degrading overall database performance.</p>' +
    '<p>Unlike the Shared Pool and Buffer Cache, the Large Pool <span style="color:#38BDF8;font-weight:700">does not use LRU</span>. Allocations are explicitly allocated and freed \u2014 not evicted. This makes it ideal for large, predictable allocations that need guaranteed memory for the duration of an operation.</p>' +
    '<p><span class="dve-label" style="color:#38BDF8">PRIMARY CONSUMERS:</span></p>' +
    '<div class="dve-flows">' +
    '<div class="dve-flow-item"><div class="dve-flow-dot" style="background:#38BDF8"></div><span style="color:#38BDF8">RMAN Backup/Restore</span> \u2014 RMAN allocates large I/O buffers (typically 1MB+) per channel for reading data files and writing backup pieces. Each active channel needs its own buffer slot.</div>' +
    '<div class="dve-flow-item"><div class="dve-flow-dot" style="background:#A855F7"></div><span style="color:#A855F7">Parallel Query (PX)</span> \u2014 The PX Coordinator distributes scan ranges (granules) to PX slave processes. Inter-process message buffers for coordination are allocated from the Large Pool.</div>' +
    '<div class="dve-flow-item"><div class="dve-flow-dot" style="background:#2ECC71"></div><span style="color:#2ECC71">Shared Server (MTS)</span> \u2014 In Shared Server mode, the UGA (User Global Area) moves from PGA to the Large Pool, since the session may be served by different shared server processes across calls.</div>' +
    '<div class="dve-flow-item"><div class="dve-flow-dot" style="background:#F1C40F"></div><span style="color:#F1C40F">Oracle Streams / XStream</span> \u2014 Capture and apply processes for data replication use Large Pool for staging change records.</div>' +
    '</div>' +
    '<p><span class="dve-label" style="color:#38BDF8">RMAN CHANNEL PIPELINE:</span></p>' +
    '<p>When RMAN runs a backup, each <span style="color:#38BDF8">channel</span> (e.g., ALLOCATE CHANNEL c1 TYPE DISK) gets a dedicated I/O buffer in the Large Pool. The channel reads data file blocks, compresses and encrypts (if configured), then writes to backup pieces. Multiple channels work in parallel on different data files for faster backups. The progress bars above show this pipeline in action.</p>' +
    '<p><span class="dve-label" style="color:#38BDF8">PARALLEL QUERY FLOW:</span></p>' +
    '<p>When Oracle decides to parallelize a query (e.g., full table scan on a large table), it spawns <span style="color:#A855F7">PX slave processes</span> (P000, P001, etc.). The <span style="color:#F1C40F">QC (Query Coordinator)</span> divides the work into granules and distributes them via messages through the Large Pool. Slaves send result rows back to the QC for final aggregation.</p>' +
    '<div class="dve-trigger">' +
    '<strong style="color:#38BDF8">LARGE_POOL_SIZE</strong>: manual sizing (e.g., 256MB)<br>' +
    '<strong style="color:#38BDF8">SGA_TARGET</strong>: set LARGE_POOL_SIZE to 0 for auto-management by MMAN<br>' +
    '<strong style="color:#38BDF8">V$SGASTAT</strong>: current large pool usage (WHERE pool = \'large pool\')<br>' +
    '<strong style="color:#38BDF8">PARALLEL_MAX_SERVERS</strong>: max PX slave processes system-wide<br>' +
    '<strong style="color:#38BDF8">RMAN CONFIGURE DEVICE TYPE DISK PARALLELISM N;</strong> \u2014 sets channel count<br>' +
    '<strong style="color:#38BDF8">"ORA-04031 large pool"</strong>: increase LARGE_POOL_SIZE</div>' +
    '</div></div>' +

    '</div>';
};

detailAnimStarters.largepool = function() {
  var rmanEl = document.getElementById('dv-lp-rman');
  var slavesEl = document.getElementById('dv-lp-slaves');
  var logEl = document.getElementById('dv-lp-log');
  if (!rmanEl) return;

  var channels = [
    { name:'CH1', file:'USERS01.DBF', pct:0 },
    { name:'CH2', file:'APP_DATA01.DBF', pct:0 },
    { name:'CH3', file:'SYSAUX.DBF', pct:0 }
  ];
  var totalXfer = 0;

  function renderRMAN() {
    var h = '';
    channels.forEach(function(ch) {
      h += '<div style="padding:6px 10px;border-radius:4px;border:1px solid rgba(56,189,248,0.2);background:rgba(56,189,248,0.04);">' +
        '<div style="display:flex;justify-content:space-between;font-family:\'Share Tech Mono\',monospace;font-size:8px;margin-bottom:4px">' +
        '<span style="color:#38BDF8;font-weight:700">'+ch.name+'</span>' +
        '<span style="color:rgba(56,189,248,0.5)">'+ch.file+' \u2014 '+ch.pct+'%</span></div>' +
        '<div style="width:100%;height:10px;border-radius:3px;background:rgba(56,189,248,0.1);overflow:hidden">' +
        '<div style="width:'+ch.pct+'%;height:100%;border-radius:3px;background:linear-gradient(90deg,#0EA5E9,#38BDF8);transition:width 0.4s;box-shadow:0 0 8px rgba(56,189,248,0.4)"></div></div></div>';
    });
    rmanEl.innerHTML = h;
  }

  var nSlaves = 4;
  var slavesHTML = '';
  for (var i = 0; i < nSlaves; i++) {
    slavesHTML += '<div id="dv-lp-slave'+i+'" style="padding:4px 10px;border-radius:4px;border:1.5px solid rgba(168,85,247,0.4);background:rgba(168,85,247,0.06);color:#A855F7;font-family:\'Share Tech Mono\',monospace;font-size:8px;font-weight:700;transition:all 0.3s">P00'+i+'</div>';
  }
  slavesEl.innerHTML = slavesHTML;

  function addLog(msg, color) {
    var t = new Date().toLocaleTimeString();
    logEl.innerHTML = '<div style="color:'+color+'">'+t+' '+msg+'</div>' + logEl.innerHTML;
    if (logEl.children.length > 15) logEl.removeChild(logEl.lastChild);
  }

  renderRMAN();

  detailTimers.push(setInterval(function() {
    if (!detailViewOpen) return;
    channels.forEach(function(ch) {
      if (ch.pct >= 100) {
        var files = ['SYSTEM.DBF','USERS02.DBF','IDX_DATA.DBF','TEMP01.DBF','UNDO01.DBF'];
        ch.file = files[Math.floor(Math.random()*files.length)];
        ch.pct = 0;
        addLog(ch.name + ' \u2192 backup piece complete, starting ' + ch.file, '#2ECC71');
      }
      var inc = Math.floor(Math.random()*8) + 2;
      ch.pct = Math.min(100, ch.pct + inc);
      totalXfer += inc * 4;
    });
    var xEl = document.getElementById('dv-lp-xfer');
    if (xEl) xEl.textContent = Math.round(totalXfer);
    renderRMAN();
  }, 1200));

  detailTimers.push(setInterval(function() {
    if (!detailViewOpen) return;
    var si = Math.floor(Math.random()*nSlaves);
    var slave = document.getElementById('dv-lp-slave'+si);
    if (slave) {
      slave.style.boxShadow = '0 0 12px rgba(168,85,247,0.8)';
      slave.style.background = 'rgba(168,85,247,0.2)';
      setTimeout(function() { if(slave) { slave.style.boxShadow = ''; slave.style.background = 'rgba(168,85,247,0.06)'; } }, 500);
    }
    addLog('PQ MSG: QC \u2192 P00' + si + ' (table range scan granule)', '#A855F7');
  }, 2000));
};

// ═══════════════════════════════════════════════════════════════
// PGA DETAIL VIEW
// ═══════════════════════════════════════════════════════════════
detailBuilders.pga = function() {
  return '<div class="detail-title-bar">' +
    '<div style="width:40px;height:40px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:20px;background:rgba(168,85,247,0.15);border:2px solid #A855F7;color:#A855F7">\u2699</div>' +
    '<div><h2 style="color:#A855F7">SERVER PROCESS + PGA</h2>' +
    '<div class="dt-sub">PRIVATE MEMORY \u2014 SORT AREA \u00B7 HASH JOIN \u00B7 CURSOR STATE \u00B7 SESSION STACK</div></div></div>' +
    '<div class="detail-content" style="grid-template-columns:1fr 1fr;">' +

    '<div class="detail-panel" style="border-color:rgba(168,85,247,0.3);background:rgba(16,8,24,0.6);">' +
    '<div class="dp-title" style="color:#A855F7">SORT AREA \u2014 IN-MEMORY SORT</div>' +
    '<div class="dp-desc" style="margin-bottom:8px">ORDER BY / GROUP BY runs in PGA sort area. Spills to TEMP if exceeds SORT_AREA_SIZE.</div>' +
    '<div id="dv-pga-sort" style="display:flex;align-items:flex-end;gap:2px;height:120px;padding:4px;border:1px solid rgba(168,85,247,0.15);border-radius:4px;background:rgba(168,85,247,0.03);"></div>' +
    '<div style="margin-top:6px;display:flex;gap:8px;">' +
    '<div class="dv-stat" style="background:rgba(168,85,247,0.1);border:1px solid rgba(168,85,247,0.2);color:#A855F7">STATUS: <span id="dv-pga-sort-status">IDLE</span></div>' +
    '<div class="dv-stat" style="background:rgba(56,189,248,0.1);border:1px solid rgba(56,189,248,0.2);color:#38BDF8">SPILLS: <span id="dv-pga-spills">0</span></div></div></div>' +

    '<div class="detail-panel" style="border-color:rgba(168,85,247,0.2);background:rgba(14,6,20,0.5);">' +
    '<div class="dp-title" style="color:#C084FC">HASH JOIN VISUALIZATION</div>' +
    '<div class="dp-desc" style="margin-bottom:8px">Build hash table from smaller input, probe with larger. Spills if hash area exceeded.</div>' +
    '<div style="display:flex;gap:12px;">' +
    '<div style="flex:1;"><div style="font-family:\'Share Tech Mono\',monospace;font-size:8px;color:#F1C40F;margin-bottom:4px">BUILD (small table)</div>' +
    '<div id="dv-pga-build" style="display:grid;grid-template-columns:repeat(4,1fr);gap:2px;"></div></div>' +
    '<div style="flex:1;"><div style="font-family:\'Share Tech Mono\',monospace;font-size:8px;color:#2ECC71;margin-bottom:4px">PROBE (large table)</div>' +
    '<div id="dv-pga-probe" style="display:grid;grid-template-columns:repeat(4,1fr);gap:2px;"></div></div></div>' +
    '<div id="dv-pga-hj-status" style="font-family:\'Share Tech Mono\',monospace;font-size:8px;color:rgba(168,85,247,0.5);margin-top:8px;text-align:center"></div></div>' +

    '<div class="detail-panel" style="border-color:rgba(168,85,247,0.15);background:rgba(12,4,18,0.5);">' +
    '<div class="dp-title" style="color:rgba(168,85,247,0.7)">CURSOR STATE</div>' +
    '<div id="dv-pga-cursor" style="font-family:\'Share Tech Mono\',monospace;font-size:8px;line-height:1.8;color:rgba(168,85,247,0.6);"></div></div>' +

    '<div class="detail-panel" style="border-color:rgba(168,85,247,0.15);background:rgba(12,4,18,0.5);">' +
    '<div class="dp-title" style="color:rgba(168,85,247,0.7)">SESSION STACK + BIND VARIABLES</div>' +
    '<div id="dv-pga-stack" style="font-family:\'Share Tech Mono\',monospace;font-size:8px;line-height:1.8;color:rgba(168,85,247,0.6);"></div></div>' +

    '<div class="dv-explain" style="border-color:rgba(168,85,247,0.15);">' +
    '<div class="dve-heading" style="color:#A855F7"><div class="dve-icon" style="background:rgba(168,85,247,0.12);border:1px solid rgba(168,85,247,0.3);color:#A855F7">\u2699</div> HOW THE PGA (PROGRAM GLOBAL AREA) WORKS</div>' +
    '<div class="dve-body">' +
    '<p>The PGA is <span style="color:#A855F7;font-weight:700">private memory allocated per server process</span> \u2014 completely isolated from other sessions. In Dedicated Server mode, each client connection gets its own OS server process with its own PGA. Unlike the SGA, the PGA is never shared between sessions. This is where all per-session work happens: sorting, hashing, cursor management, and PL/SQL execution.</p>' +
    '<p>When a SQL operation requires sorting (ORDER BY, GROUP BY, DISTINCT, UNION, analytic functions) or hashing (hash joins, hash aggregation), Oracle first attempts to perform the operation <span style="color:#A855F7">entirely in the PGA Sort Area</span>. If the data exceeds the available PGA memory, Oracle <span style="color:#38BDF8">spills to the TEMP tablespace</span> on disk \u2014 which is dramatically slower. This is why PGA sizing is critical for query performance.</p>' +
    '<p><span class="dve-label" style="color:#A855F7">PGA COMPONENTS:</span></p>' +
    '<div class="dve-flows">' +
    '<div class="dve-flow-item"><div class="dve-flow-dot" style="background:#A855F7"></div><span style="color:#A855F7">Sort Area</span> \u2014 In-memory workspace for ORDER BY, GROUP BY, DISTINCT, window functions. Controlled by SORT_AREA_SIZE (manual) or auto-managed by PGA_AGGREGATE_TARGET.</div>' +
    '<div class="dve-flow-item"><div class="dve-flow-dot" style="background:#C084FC"></div><span style="color:#C084FC">Hash Area</span> \u2014 Workspace for hash joins. Build phase creates a hash table from the smaller input, probe phase looks up rows from the larger input. Spills to TEMP if hash table exceeds available memory.</div>' +
    '<div class="dve-flow-item"><div class="dve-flow-dot" style="background:#F1C40F"></div><span style="color:#F1C40F">Cursor State</span> \u2014 Runtime state for each open cursor: current row position, fetch buffer, execution context. Each session can have multiple cursors open simultaneously (OPEN_CURSORS parameter).</div>' +
    '<div class="dve-flow-item"><div class="dve-flow-dot" style="background:#2ECC71"></div><span style="color:#2ECC71">Session Stack</span> \u2014 PL/SQL call stack frames, local variables, bind variable values, session-level settings (NLS, optimizer parameters). This is the session\'s "working memory".</div>' +
    '<div class="dve-flow-item"><div class="dve-flow-dot" style="background:#38BDF8"></div><span style="color:#38BDF8">TEMP Spill</span> \u2014 When sort or hash data exceeds PGA allocation, Oracle writes intermediate results to TEMP tablespace. Multi-pass sorts (spilling multiple times) are extremely slow.</div>' +
    '</div>' +
    '<p><span class="dve-label" style="color:#A855F7">HASH JOIN DEEP DIVE:</span></p>' +
    '<p><span style="color:#F1C40F">Build Phase:</span> Oracle reads the smaller (build) table and constructs a hash table in PGA memory. Each row is hashed by the join key and stored in a hash bucket. <span style="color:#2ECC71">Probe Phase:</span> Oracle reads the larger (probe) table row-by-row, hashes each join key, and looks up matches in the hash table. Matches are returned immediately. This is O(n+m) \u2014 much faster than nested loops for large tables.</p>' +
    '<p><span class="dve-label" style="color:#A855F7">AUTOMATIC PGA MANAGEMENT:</span></p>' +
    '<p>With <span style="color:#A855F7">PGA_AGGREGATE_TARGET</span> set, Oracle automatically distributes PGA memory across all active sessions. Sessions performing sorts or hash joins request work area memory from a shared budget. Oracle classifies operations as <span style="color:#2ECC71">OPTIMAL</span> (all in memory), <span style="color:#F1C40F">ONEPASS</span> (one spill to TEMP), or <span style="color:#FF4757">MULTIPASS</span> (multiple spills \u2014 very slow). The goal is 100% optimal.</p>' +
    '<div class="dve-trigger">' +
    '<strong style="color:#A855F7">PGA_AGGREGATE_TARGET</strong>: auto-manage total PGA across all sessions<br>' +
    '<strong style="color:#A855F7">PGA_AGGREGATE_LIMIT</strong>: hard cap on total PGA (12c+), prevents runaway<br>' +
    '<strong style="color:#A855F7">V$SQL_WORKAREA_ACTIVE</strong>: current sort/hash operations with sizes<br>' +
    '<strong style="color:#A855F7">V$PROCESS</strong>: PGA_USED_MEM, PGA_ALLOC_MEM per process<br>' +
    '<strong style="color:#A855F7">V$PGA_TARGET_ADVICE</strong>: Oracle\'s advice on optimal PGA_AGGREGATE_TARGET<br>' +
    '<strong style="color:#A855F7">V$PGASTAT</strong>: "cache hit percentage" should be > 90%<br>' +
    '"direct path read/write temp" wait events = TEMP spill occurring</div>' +
    '</div></div>' +

    '</div>';
};

detailAnimStarters.pga = function() {
  var sortEl = document.getElementById('dv-pga-sort');
  var buildEl = document.getElementById('dv-pga-build');
  var probeEl = document.getElementById('dv-pga-probe');
  var cursorEl = document.getElementById('dv-pga-cursor');
  var stackEl = document.getElementById('dv-pga-stack');
  if (!sortEl) return;

  var sortData = [];
  var spills = 0;
  var N_BARS = 20;

  function genSortData() {
    sortData = [];
    for (var i = 0; i < N_BARS; i++) sortData.push(Math.floor(Math.random()*100) + 10);
  }

  function renderSort() {
    var max = Math.max.apply(null, sortData);
    var h = '';
    sortData.forEach(function(v) {
      var hpct = (v / max) * 100;
      var hue = (v / max) * 120;
      h += '<div style="width:100%;height:'+hpct+'%;background:hsla('+hue+',70%,50%,0.6);border-radius:2px 2px 0 0;transition:height 0.3s,background 0.3s;border:1px solid hsla('+hue+',70%,50%,0.3);"></div>';
    });
    sortEl.innerHTML = h;
  }

  genSortData(); renderSort();

  var sortPhase = 0;
  function startSort() {
    if (sortPhase !== 0) return;
    sortPhase = 1;
    var stEl = document.getElementById('dv-pga-sort-status');
    if (stEl) { stEl.textContent = 'SORTING...'; stEl.style.color = '#FF4757'; }
    genSortData(); renderSort();

    var data = sortData.slice();
    var passes = [];
    for (var i = 0; i < data.length - 1; i++) {
      for (var j = 0; j < data.length - i - 1; j++) {
        if (data[j] > data[j+1]) {
          var tmp = data[j]; data[j] = data[j+1]; data[j+1] = tmp;
          passes.push(data.slice());
        }
      }
    }

    var sortIdx = 0;
    var sortTimer = setInterval(function() {
      if (!detailViewOpen || sortIdx >= passes.length) {
        clearInterval(sortTimer);
        sortData = data; renderSort();
        sortPhase = 2;
        var stEl2 = document.getElementById('dv-pga-sort-status');
        if (stEl2) { stEl2.textContent = 'SORTED'; stEl2.style.color = '#2ECC71'; }
        if (Math.random() < 0.3) {
          spills++;
          var spEl = document.getElementById('dv-pga-spills');
          if (spEl) spEl.textContent = spills;
          if (stEl2) { stEl2.textContent = 'SPILL TO TEMP!'; stEl2.style.color = '#38BDF8'; }
        }
        setTimeout(function() {
          sortPhase = 0;
          var stEl3 = document.getElementById('dv-pga-sort-status');
          if (stEl3) { stEl3.textContent = 'IDLE'; stEl3.style.color = '#A855F7'; }
        }, 2000);
        return;
      }
      sortData = passes[sortIdx]; renderSort(); sortIdx++;
    }, 80);
    detailTimers.push(sortTimer);
  }

  detailTimers.push(setInterval(function() {
    if (!detailViewOpen || sortPhase !== 0) return;
    startSort();
  }, 6000));
  setTimeout(function() { if (detailViewOpen) startSort(); }, 500);

  // Hash Join
  var buildSlots = [], probeSlots = [];
  var keys = ['A01','B02','C03','D04','E05','F06','G07','H08','I09','J10','K11','L12'];

  function initHJ() {
    buildSlots = []; probeSlots = [];
    for (var i = 0; i < 12; i++) {
      buildSlots.push({ filled: false, key: '' });
      probeSlots.push({ matched: false, key: '' });
    }
  }

  function renderHJ() {
    var bh = '', ph = '';
    buildSlots.forEach(function(s) {
      var bg = s.filled ? 'rgba(241,196,15,0.25)' : 'rgba(241,196,15,0.05)';
      var bc = s.filled ? 'rgba(241,196,15,0.4)' : 'rgba(241,196,15,0.1)';
      bh += '<div style="height:20px;border-radius:2px;background:'+bg+';border:1px solid '+bc+';font-family:monospace;font-size:6px;color:#F1C40F;text-align:center;line-height:20px;transition:all 0.3s">'+s.key+'</div>';
    });
    probeSlots.forEach(function(s) {
      var bg = s.matched ? 'rgba(46,204,113,0.25)' : 'rgba(46,204,113,0.05)';
      var bc = s.matched ? 'rgba(46,204,113,0.4)' : 'rgba(46,204,113,0.1)';
      ph += '<div style="height:20px;border-radius:2px;background:'+bg+';border:1px solid '+bc+';font-family:monospace;font-size:6px;color:#2ECC71;text-align:center;line-height:20px;transition:all 0.3s">'+s.key+'</div>';
    });
    buildEl.innerHTML = bh; probeEl.innerHTML = ph;
  }

  initHJ(); renderHJ();
  var hjPhase = 0, hjIdx = 0;

  detailTimers.push(setInterval(function() {
    if (!detailViewOpen) return;
    var statusEl = document.getElementById('dv-pga-hj-status');
    if (hjPhase === 0) {
      if (hjIdx < 12) {
        buildSlots[hjIdx].filled = true;
        buildSlots[hjIdx].key = keys[hjIdx];
        if (statusEl) statusEl.textContent = 'BUILD PHASE: hashing row ' + keys[hjIdx];
        renderHJ(); hjIdx++;
      } else { hjPhase = 1; hjIdx = 0; }
    } else if (hjPhase === 1) {
      if (hjIdx < 12) {
        var mi = Math.floor(Math.random() * 12);
        probeSlots[hjIdx].key = keys[mi];
        probeSlots[hjIdx].matched = buildSlots[mi].filled;
        if (statusEl) statusEl.textContent = 'PROBE PHASE: lookup ' + keys[mi] + (probeSlots[hjIdx].matched ? ' MATCH' : ' MISS');
        renderHJ(); hjIdx++;
      } else {
        hjPhase = 0; hjIdx = 0; initHJ(); renderHJ();
        if (statusEl) statusEl.textContent = 'HASH JOIN COMPLETE \u2014 restarting...';
      }
    }
  }, 400));

  // Cursor state
  var cursors = [
    { sql: 'SELECT * FROM employees WHERE dept_id = :1', state: 'OPEN', rows: 0 },
    { sql: 'UPDATE orders SET status = :1 WHERE id = :2', state: 'CLOSED', rows: 47 }
  ];

  function renderCursor() {
    var h = '';
    cursors.forEach(function(c, i) {
      var clr = c.state === 'OPEN' ? '#2ECC71' : 'rgba(168,85,247,0.4)';
      h += '<div style="padding:4px 8px;border:1px solid rgba(168,85,247,0.15);border-radius:3px;margin-bottom:4px">' +
        '<span style="color:'+clr+';font-weight:700">CURSOR '+i+': '+c.state+'</span><br>' +
        '<span style="color:rgba(168,85,247,0.5)">'+c.sql+'</span><br>' +
        '<span style="color:rgba(168,85,247,0.3)">ROWS FETCHED: '+c.rows+'</span></div>';
    });
    cursorEl.innerHTML = h;
  }
  renderCursor();

  detailTimers.push(setInterval(function() {
    if (!detailViewOpen) return;
    if (cursors[0].state === 'OPEN') {
      cursors[0].rows += Math.floor(Math.random()*10) + 1;
      if (cursors[0].rows > 200) { cursors[0].state = 'CLOSED'; }
    } else {
      cursors[0].state = 'OPEN'; cursors[0].rows = 0;
      var sqls = ['SELECT * FROM employees WHERE dept_id = :1','SELECT name, salary FROM emp WHERE mgr = :1','SELECT COUNT(*) FROM orders WHERE status = :1'];
      cursors[0].sql = sqls[Math.floor(Math.random()*3)];
    }
    renderCursor();
  }, 2500));

  // Stack
  function renderStack() {
    var frames = [
      { fn: 'opiexe (Execute)', depth: 0 },
      { fn: 'qerpx_fetch (PX Fetch)', depth: 1 },
      { fn: 'kdstf (Table Fetch)', depth: 2 },
      { fn: 'kcbgtcr (Get CR Block)', depth: 3 }
    ];
    var binds = [
      { name: ':1', type: 'NUMBER', val: '10' },
      { name: ':2', type: 'VARCHAR2', val: "'ACTIVE'" },
      { name: ':3', type: 'DATE', val: 'SYSDATE' }
    ];
    var h = '<div style="color:rgba(168,85,247,0.5);margin-bottom:6px;font-size:7px;letter-spacing:1px">CALL STACK:</div>';
    frames.forEach(function(f) {
      var arrow = '';
      for (var a = 0; a <= f.depth; a++) arrow += '\u25B8';
      h += '<div style="padding-left:'+f.depth*12+'px;color:rgba(168,85,247,'+(0.8 - f.depth*0.15)+')">'+arrow+' '+f.fn+'</div>';
    });
    h += '<div style="color:rgba(168,85,247,0.5);margin-top:10px;margin-bottom:4px;font-size:7px;letter-spacing:1px">BIND VARIABLES:</div>';
    binds.forEach(function(b) {
      h += '<div style="color:rgba(168,85,247,0.6)">  '+b.name+' <span style="color:rgba(168,85,247,0.3)">('+b.type+')</span> = <span style="color:#C084FC">'+b.val+'</span></div>';
    });
    h += '<div style="color:rgba(168,85,247,0.5);margin-top:10px;margin-bottom:4px;font-size:7px;letter-spacing:1px">SESSION INFO:</div>';
    h += '<div style="color:rgba(168,85,247,0.5)">  SID: 142  SERIAL#: 8901</div>';
    h += '<div style="color:rgba(168,85,247,0.5)">  PGA USED: 4.2 MB</div>';
    h += '<div style="color:rgba(168,85,247,0.5)">  PGA ALLOC: 6.8 MB</div>';
    stackEl.innerHTML = h;
  }
  renderStack();
};


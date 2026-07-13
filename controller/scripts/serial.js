function showWebserialWarning() {
  document.getElementById('webserialModal').classList.add('open');
}
function closeWebserialWarning() {
  document.getElementById('webserialModal').classList.remove('open');
}

async function toggleConnection() {
  if (!('serial' in navigator)) { showWebserialWarning(); return; }
  if (port) { location.reload(); } else { await connect(); }
}
async function connect() {
  try {
    port = await navigator.serial.requestPort();
    await port.open({ baudRate: 115200 });
    const te = new TextEncoderStream();
    te.readable.pipeTo(port.writable);
    writer = te.writable.getWriter();
    try {
      const info = port.getInfo();
      const name = info.usbProductName || (info.usbVendorId ? `VID:${info.usbVendorId.toString(16).padStart(4,'0')}` : null);
      if (name) { const d = document.getElementById('deviceName'); d.textContent = name; d.style.display = 'block'; }
    } catch(e) {}
    document.getElementById('statusBadge').textContent = 'Connected';
    document.getElementById('statusBadge').className = 'badge connected';
    const btn = document.getElementById('connectBtn');
    btn.textContent = 'Disconnect'; btn.className = 'disconnect';
    appendLog('Serial connection established.', 'sys');
    refreshConnectedViews();
    listenToStream();
  } catch(e) { appendLog('Connection failed: ' + e, 'err'); }
}
async function listenToStream() {
  const dec = new TextDecoder(); let buf = '';
  const reader = port.readable.getReader();
  appendLog('Receiver loop active.', 'sys');
  while (port && port.readable) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let lines = buf.split(/\r?\n/); buf = lines.pop();
    for (let l of lines) {
      l = l.trim(); if (!l) continue;
      let t = 'info';
      if (l.includes('[ERR]')) t = 'err'; else if (l.includes('[HW]')) t = 'out';
      appendLog(l, t);
    }
  }
}

function toggleLogBar() {
  logBarOpen = !logBarOpen;
  document.getElementById('logBarBody').classList.toggle('open', logBarOpen);
  document.getElementById('logChevron').style.transform = logBarOpen ? 'rotate(180deg)' : '';
  if (logBarOpen) {
    logUnread = 0;
    const badge = document.getElementById('logBadge');
    badge.textContent = ''; badge.classList.remove('visible');
    setTimeout(() => { const t=document.getElementById('terminal'); t.scrollTop=t.scrollHeight; }, 10);
  }
}
function clearConsole(e) {
  if (e) e.stopPropagation();
  document.getElementById('terminal').innerHTML = '';
  logUnread = 0;
  const badge = document.getElementById('logBadge');
  badge.textContent = ''; badge.classList.remove('visible');
}
function appendLog(msg, type='info') {
  const term = document.getElementById('terminal');
  const ts = new Date().toLocaleTimeString([], { hour12: false });
  const div = document.createElement('div');
  div.className = 'term-' + type;
  div.textContent = `[${ts}] ${msg}`;
  term.appendChild(div);
  term.scrollTop = term.scrollHeight;
  if (!logBarOpen) {
    logUnread++;
    const badge = document.getElementById('logBadge');
    badge.textContent = logUnread + ' new';
    badge.classList.add('visible');
  }
}

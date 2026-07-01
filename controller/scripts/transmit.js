let _saveSelectedRemoteId = null;
let _saveSelectedFolderId = null;

function onHexInput(input) {
  let v = input.value.replace(/[^0-9a-fA-F\s]/g, '').replace(/\s+/g, ' ');
  let raw = v.replace(/\s/g, '');
  if (raw.length > 8) raw = raw.slice(0, 8);
  const formatted = raw.match(/.{1,2}/g)?.join(' ') || '';
  const atEnd = input.selectionStart === input.value.length;
  if (atEnd) input.value = formatted; else input.value = v.slice(0, 11);
  validateInputs();
}
function onHexInputRaw(input) {
  let v = input.value.replace(/[^0-9a-fA-F\s]/g, '');
  let raw = v.replace(/\s/g, '');
  if (raw.length > 8) raw = raw.slice(0, 8);
  const formatted = raw.match(/.{1,2}/g)?.join(' ') || '';
  const atEnd = input.selectionStart === input.value.length;
  if (atEnd) input.value = formatted; else input.value = v.slice(0, 11);
}
function validateHex(val) { return /^[0-9a-fA-F]{2}(\s[0-9a-fA-F]{2}){3}$/.test((val||'').trim()); }
function validateInputs() {
  const addr = document.getElementById('addressInput').value;
  const cmd  = document.getElementById('commandInput').value;
  const va = validateHex(addr), vc = validateHex(cmd);
  document.getElementById('addrErr').textContent = (!va && addr.length > 0) ? 'Must be 4 hex bytes e.g. 20 00 00 00' : '';
  document.getElementById('cmdErr').textContent  = (!vc && cmd.length  > 0) ? 'Must be 4 hex bytes e.g. 09 00 00 00' : '';
  document.getElementById('addressInput').classList.toggle('err', !va && addr.length > 0);
  document.getElementById('commandInput').classList.toggle('err', !vc && cmd.length  > 0);
  document.getElementById('transmitBtn').disabled = !(va && vc && writer);
}

function flipByte(b) { let r=0; for(let i=0;i<8;i++) if((b>>i)&1) r|=(1<<(7-i)); return r; }
function compileNEC(addr, cmd) {
  let a=parseInt(addr.split(' ')[0],16), c=parseInt(cmd.split(' ')[0],16);
  let af=flipByte(a), cf=flipByte(c);
  return [af,af^0xFF,cf,cf^0xFF].join(',');
}
async function transmitPayload(addrOvr, cmdOvr, labelOvr) {
  if (!writer) return;
  const addr = addrOvr || document.getElementById('addressInput').value;
  const cmd  = cmdOvr  || document.getElementById('commandInput').value;
  if (!validateHex(addr)||!validateHex(cmd)) { appendLog('Invalid hex — aborting.','err'); return; }
  const p = compileNEC(addr, cmd);
  appendLog(`TX [${p}]`, 'out');
  await writer.write(p + '\n');
  const label = labelOvr || 'Manual';
  addHistory({ label, addr, cmd });
}
function addHistory(entry) {
  const item = { id: Date.now() + Math.random(), ts: new Date().toLocaleTimeString([], {hour12:false}), ...entry };
  txHistory.unshift(item);
  if (txHistory.length > 100) txHistory.pop();
  saveHistory();
  renderHistory();
}
function removeHistory(id) {
  txHistory = txHistory.filter(h => h.id !== id);
  saveHistory();
  renderHistory();
}
function clearHistory() {
  txHistory = []; saveHistory(); renderHistory();
}
function renderHistory() {
  const el = document.getElementById('txHistory');
  if (!el) return;
  if (!txHistory.length) {
    el.innerHTML = `<div class="empty-state" style="padding:30px 0;"><i class="ti ti-history" style="font-size:22px;"></i><p>No signals sent yet.</p></div>`;
    return;
  }
  el.innerHTML = '';
  txHistory.forEach(h => {
    const row = document.createElement('div');
    row.className = 'hist-row';
    row.innerHTML = `
      <div class="hist-meta">
        <span class="hist-ts">${h.ts}</span>
        <span class="hist-label">${escHtml(h.label)}</span>
      </div>
      <div class="signal-meta" style="margin:4px 0 6px;">
        <span class="signal-chip addr"><i class="ti ti-map-pin" style="font-size:9px;"></i> ${escHtml(h.addr)}</span>
        <span class="signal-chip cmd"><i class="ti ti-terminal" style="font-size:9px;"></i> ${escHtml(h.cmd)}</span>
      </div>
      <div style="display:flex;gap:6px;">
        <button class="btn btn-green btn-sm" onclick="transmitPayload('${escAttr(h.addr)}','${escAttr(h.cmd)}','${escAttr(h.label)}')" ${writer?'':'disabled'}><i class="ti ti-send"></i> Resend</button>
        <button class="btn btn-sm btn-ghost" onclick="removeHistory(${h.id})" title="Remove from history"><i class="ti ti-x"></i></button>
      </div>`;
    el.appendChild(row);
  });
}

function toggleSaveForm() {
  const f = document.getElementById('saveForm');
  f.classList.toggle('open');
  if (f.classList.contains('open')) {
    _saveSelectedRemoteId = null;
    _saveSelectedFolderId = null;
    renderSaveTree();
    document.getElementById('saveNewRemoteNameWrap').classList.add('pane-hidden');
    setTimeout(() => document.getElementById('saveNameInput').focus(), 50);
  }
}

function renderSaveTree() {
  const container = document.getElementById('saveDestTree');
  if (!container) return;
  container.innerHTML = '';

  const rootRow = document.createElement('div');
  const rootSelected = _saveSelectedFolderId == null && _saveSelectedRemoteId == null;
  rootRow.className = 'folder-picker-row' + (rootSelected ? ' selected' : '');
  rootRow.innerHTML = '<i class="ti ti-home"></i><span class="folder-picker-label">/ Root</span><span style="color:var(--text3);font-size:10px;margin-left:auto;">new remote</span>';
  rootRow.onclick = function() {
    _saveSelectedFolderId = null;
    _saveSelectedRemoteId = null;
    renderSaveTree();
    document.getElementById('saveNewRemoteNameWrap').classList.remove('pane-hidden');
  };
  container.appendChild(rootRow);

  var folders = library.filter(function(x) { return x.type === 'folder'; });
  var folderMap = {};
  folders.forEach(function(f) { folderMap[f.id] = f; });

  var getChildren = function(parentId) {
    return folders.filter(function(f) { return f.parentId === parentId; }).sort(function(a, b) { return a.name.localeCompare(b.name); });
  };
  var getRemotes = function(folderId) {
    return library.filter(function(x) { return x.type === 'remote' && x.folderId === folderId; }).sort(function(a, b) { return a.name.localeCompare(b.name); });
  };

  function renderLevel(parentId, depth) {
    getChildren(parentId).forEach(function(folder) {
      var row = document.createElement('div');
      var isSelected = _saveSelectedFolderId === folder.id;
      row.className = 'folder-picker-row' + (isSelected ? ' selected' : '');
      row.style.paddingLeft = (8 + depth * 14) + 'px';
      row.innerHTML = '<i class="ti ti-point" style="font-size:10px;width:12px;visibility:hidden;"></i><i class="ti ti-folder"></i><span class="folder-picker-label">' + escHtml(folder.name) + '</span><span style="color:var(--text3);font-size:10px;margin-left:auto;">new remote</span>';
      row.onclick = function() {
        _saveSelectedFolderId = folder.id;
        _saveSelectedRemoteId = null;
        renderSaveTree();
        document.getElementById('saveNewRemoteNameWrap').classList.remove('pane-hidden');
      };
      container.appendChild(row);

      getRemotes(folder.id).forEach(function(remote) {
        var rRow = document.createElement('div');
        var rSelected = _saveSelectedRemoteId === remote.id;
        rRow.className = 'folder-picker-row' + (rSelected ? ' selected' : '');
        rRow.style.paddingLeft = (8 + (depth + 1) * 14) + 'px';
        rRow.innerHTML = '<i class="ti ti-device-remote" style="font-size:12px;"></i><span class="folder-picker-label">' + escHtml(remote.name) + '</span><span style="color:var(--accent);font-size:10px;margin-left:auto;">' + remote.buttons.length + ' btn' + (remote.buttons.length !== 1 ? 's' : '') + '</span>';
        rRow.onclick = function() {
          _saveSelectedRemoteId = remote.id;
          _saveSelectedFolderId = null;
          renderSaveTree();
          document.getElementById('saveNewRemoteNameWrap').classList.add('pane-hidden');
        };
        container.appendChild(rRow);
      });

      renderLevel(folder.id, depth + 1);
    });
  }

  renderLevel(null, 1);

  getRemotes(null).forEach(function(remote) {
    var rRow = document.createElement('div');
    var rSelected = _saveSelectedRemoteId === remote.id;
    rRow.className = 'folder-picker-row' + (rSelected ? ' selected' : '');
    rRow.style.paddingLeft = (8 + 1 * 14) + 'px';
    rRow.innerHTML = '<i class="ti ti-device-remote" style="font-size:12px;"></i><span class="folder-picker-label">' + escHtml(remote.name) + '</span><span style="color:var(--accent);font-size:10px;margin-left:auto;">' + remote.buttons.length + ' btn' + (remote.buttons.length !== 1 ? 's' : '') + '</span>';
    rRow.onclick = function() {
      _saveSelectedRemoteId = remote.id;
      _saveSelectedFolderId = null;
      renderSaveTree();
      document.getElementById('saveNewRemoteNameWrap').classList.add('pane-hidden');
    };
    container.appendChild(rRow);
  });
}

function validateSaveFormName() {
  const v = document.getElementById('saveNameInput').value.trim();
  document.getElementById('saveNameErr').textContent = v ? '' : 'Name is required';
  return !!v;
}
function validateSaveRemoteName() {
  const v = document.getElementById('saveNewRemoteName').value.trim();
  document.getElementById('saveNewRemoteNameErr').textContent = v ? '' : 'Remote name required';
  return !!v;
}
function saveManualSignal() {
  if (!validateSaveFormName()) return;
  const addr = document.getElementById('addressInput').value.trim();
  const cmd  = document.getElementById('commandInput').value.trim();
  if (!validateHex(addr)||!validateHex(cmd)) { appendLog('Fix hex inputs first.','err'); return; }
  const name = limitName(document.getElementById('saveNameInput').value, 'button');
  const desc = document.getElementById('saveDescInput').value.trim();
  let remote;
  if (_saveSelectedRemoteId != null) {
    remote = library.find(r => r.id===_saveSelectedRemoteId);
    if (!remote) { appendLog('Selected remote not found.','err'); return; }
  } else {
    if (!validateSaveRemoteName()) return;
    const rname = limitName(document.getElementById('saveNewRemoteName').value, 'remote');
    remote = { type:'remote', id:genId(), name:rname, folderId: _saveSelectedFolderId, buttons:[], favorite:false, desc:'' };
    library.push(remote);
  }
  remote.buttons.push({ id:genId(), name, addr, cmd, desc, proto:'NEC', favorite:false });
  saveLib(); renderSidebarTree();
  document.getElementById('saveNameInput').value = '';
  document.getElementById('saveDescInput').value = '';
  document.getElementById('saveNewRemoteName').value = '';
  document.getElementById('saveForm').classList.remove('open');
  appendLog(`Saved "${name}" to remote "${remote.name}".`, 'sys');
}

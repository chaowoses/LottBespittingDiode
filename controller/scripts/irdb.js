const irdbFileCache = {};
let irdbData=null, irdbExpanded={}, irdbSelectedPath=null, _irdbFolderPath='';
let _irdbFolderDestFolderId = null;
let _irdbRemoteImportPath = '', _irdbRemoteImportName = '', _irdbRemoteImportBtn = null, _irdbRemoteDestFolderId = null;
let _irdbImportExpanded = {};

async function fetchWithCache(url) {
  if (irdbFileCache[url]) return irdbFileCache[url];
  const resp = await fetch(url);
  if (!resp.ok) throw new Error('HTTP '+resp.status + (resp.status===403 ? ' — GitHub rate limit. Wait a minute and try again.' : ''));
  const text = await resp.text();
  irdbFileCache[url] = text;
  return text;
}

async function initIRDB() {
  if (irdbData) { renderIRDBTree(); return; }
  document.getElementById('irdbTree').innerHTML=`<div style="display:flex;align-items:center;gap:8px;padding:12px;color:var(--text3);font-family:var(--mono);font-size:11px;"><span class="spinner"></span> Loading IRDB tree...</div>`;
  try {
    const cached = sessionStorage.getItem('irdb_tree');
    if (cached) {
      irdbData = JSON.parse(cached);
      renderIRDBTree();
      return;
    }
    const r = await fetch('https://api.github.com/repos/Lucaslhm/Flipper-IRDB/git/trees/main?recursive=1');
    if (!r.ok) {
      if (r.status === 403) throw new Error('GitHub API rate limit hit. Try again in a minute, or wait up to an hour for unauthenticated limits to reset.');
      throw new Error('HTTP '+r.status);
    }
    const data = await r.json();
    irdbData = data.tree.filter(n=>n.type==='blob'&&n.path.endsWith('.ir'));
    try { sessionStorage.setItem('irdb_tree', JSON.stringify(irdbData)); } catch(e) {}
    renderIRDBTree();
  } catch(e) {
    document.getElementById('irdbTree').innerHTML=`<div style="padding:12px;color:var(--red);font-family:var(--mono);font-size:11px;line-height:1.6;"><i class="ti ti-alert-circle"></i> ${escHtml(String(e))}<br><br><button class="btn btn-sm" onclick="irdbData=null;initIRDB()"><i class="ti ti-refresh"></i> Retry</button></div>`;
  }
}
function buildIRDBTree() {
  const root={};
  (irdbData||[]).forEach(node=>{
    const parts=node.path.split('/'); let cur=root;
    for(let i=0;i<parts.length-1;i++){if(!cur[parts[i]])cur[parts[i]]={_files:[]};cur=cur[parts[i]];}
    if(!cur._files)cur._files=[];
    cur._files.push({name:parts[parts.length-1],path:node.path});
  });
  return root;
}
function renderIRDBTree() {
  const el=document.getElementById('irdbTree');
  const tree=buildIRDBTree();
  const search=document.getElementById('irdbSearch').value.trim().toLowerCase();
  el.innerHTML='';
  renderIRDBLevel(el,tree,'',0,search);
}
function renderIRDBLevel(container, node, path, depth, search) {
  const keys=Object.keys(node).filter(k=>k!=='_files').sort();
  const files=(node._files||[]).filter(f=>!search||f.name.toLowerCase().includes(search)||path.toLowerCase().includes(search));
  keys.forEach(key=>{
    const cp=path?path+'/'+key:key;
    if(search&&!irdbNodeMatches(node[key],key,search)) return;
    const isOpen=irdbExpanded[cp]||!!search;
    const row=document.createElement('div');
    row.style.cssText=`padding:5px 8px 5px ${8+depth*12}px;display:flex;align-items:center;gap:5px;cursor:pointer;color:var(--text2);font-family:var(--mono);font-size:11px;transition:background 0.1s;position:relative;`;
    row.innerHTML=`
      <i class="ti ${isOpen?'ti-chevron-down':'ti-chevron-right'}" style="font-size:10px;color:var(--text3);width:12px;flex-shrink:0;"></i>
      <i class="ti ${isOpen?'ti-folder-open':'ti-folder'}" style="font-size:13px;flex-shrink:0;"></i>
      <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escHtml(key)}</span>
      <button class="tree-act irdb-folder-btn" title="Import entire folder" onclick="openIRDBFolderModal(event,'${escAttr(cp)}')" style="opacity:0;flex-shrink:0;"><i class="ti ti-folder-down"></i></button>`;
    row.onmouseenter=()=>{ row.style.background='var(--bg3)'; row.querySelector('.irdb-folder-btn').style.opacity='1'; };
    row.onmouseleave=()=>{ row.style.background=''; row.querySelector('.irdb-folder-btn').style.opacity='0'; };
    row.addEventListener('click', e=>{ if(e.target.closest('.irdb-folder-btn')) return; irdbExpanded[cp]=!irdbExpanded[cp]; renderIRDBTree(); });
    container.appendChild(row);
    if(isOpen) renderIRDBLevel(container,node[key],cp,depth+1,search);
  });
  files.forEach(f=>{
    const isSel=irdbSelectedPath===f.path;
    const row=document.createElement('div');
    row.style.cssText=`padding:5px 8px 5px ${8+depth*12+12}px;display:flex;align-items:center;gap:5px;cursor:pointer;font-family:var(--mono);font-size:11px;transition:background 0.1s;${isSel?'background:var(--accent-dim);color:var(--text);':'color:var(--text2);'}`;
    const remoteName = f.name.replace('.ir','');
    row.innerHTML=`
      <i class="ti ti-device-remote" style="font-size:12px;flex-shrink:0;"></i>
      <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escHtml(remoteName)}</span>
      <button class="tree-act irdb-file-btn" title="Import remote" onclick="event.stopPropagation();openIRDBRemoteModal('${escAttr(f.path)}','${escAttr(remoteName)}',this,event)" style="opacity:0;flex-shrink:0;"><i class="ti ti-download"></i></button>`;
    row.onmouseenter=()=>{ if(!isSel) row.style.background='var(--bg3)'; row.querySelector('.irdb-file-btn').style.opacity='1'; };
    row.onmouseleave=()=>{ if(!isSel) row.style.background=''; row.querySelector('.irdb-file-btn').style.opacity='0'; };
    row.onclick=()=>{ irdbSelectedPath=f.path; renderIRDBTree(); loadIRDBFile(f); };
    container.appendChild(row);
  });
}
function irdbNodeMatches(node,key,s) {
  if(key.toLowerCase().includes(s)) return true;
  if((node._files||[]).some(f=>f.name.toLowerCase().includes(s))) return true;
  return Object.keys(node).filter(k=>k!=='_files').some(c=>irdbNodeMatches(node[c],c,s));
}
function filterIRDB() { renderIRDBTree(); }

async function loadIRDBFile(file) {
  const el=document.getElementById('irdbRemoteView');
  el.innerHTML=`<div style="display:flex;align-items:center;gap:8px;padding:20px;color:var(--text3);font-family:var(--mono);font-size:11px;"><span class="spinner"></span> Loading...</div>`;
  try {
    const text=await fetchWithCache(`https://raw.githubusercontent.com/Lucaslhm/Flipper-IRDB/main/${file.path}`);
    const buttons=parseIRFile(text);
    renderIRDBRemote(el, file, buttons);
  } catch(e) {
    el.innerHTML=`<div style="padding:20px;color:var(--red);font-family:var(--mono);font-size:11px;line-height:1.6;"><i class="ti ti-alert-circle"></i> ${escHtml(String(e))}</div>`;
  }
}
function renderIRDBRemote(el, file, buttons) {
  const name=file.name.replace('.ir','');
  el.innerHTML='';
  const hdr=document.createElement('div');
  hdr.style.cssText='display:flex;align-items:center;gap:10px;margin-bottom:12px;padding:12px 14px;background:var(--bg3);border:1px solid var(--border);border-radius:var(--r2);';
  hdr.innerHTML=`
    <i class="ti ti-device-remote" style="color:var(--accent);font-size:18px;flex-shrink:0;"></i>
    <div style="flex:1;min-width:0;">
      <div title="${escAttr(name)}" style="font-family:var(--mono);font-size:13px;font-weight:600;color:var(--text);margin-bottom:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escHtml(name)}</div>
      <div style="font-family:var(--mono);font-size:10px;color:var(--text3);">${escHtml(file.path)} &middot; ${buttons.length} button${buttons.length!==1?'s':''}</div>
    </div>
    <button class="btn btn-sm" onclick="openIRDBRemoteModal('${escAttr(file.path)}','${escAttr(name)}',this,event)"><i class="ti ti-download"></i> Import</button>`;
  el.appendChild(hdr);
  if(!buttons.length){
    const emp=document.createElement('div');
    emp.className='empty-state';
    emp.innerHTML=`<i class="ti ti-file-x"></i><p>No compatible NEC buttons in this file.</p>`;
    el.appendChild(emp); return;
  }
  buttons.forEach(btn=>{
    const box=document.createElement('div');
    box.className='irdb-detail-btn-box';
    box.innerHTML=`
      <div class="irdb-detail-btn-name" title="${escAttr(btn.name)}">${escHtml(btn.name)}</div>
      <div class="signal-meta" style="margin-bottom:8px;">
        <span class="signal-chip addr"><i class="ti ti-map-pin" style="font-size:9px;"></i> ${escHtml(btn.addr||'—')}</span>
        <span class="signal-chip cmd"><i class="ti ti-terminal" style="font-size:9px;"></i> ${escHtml(btn.cmd||'—')}</span>
        ${btn.proto?`<span class="signal-chip proto">${escHtml(btn.proto)}</span>`:''}
      </div>
      <button class="btn btn-green btn-sm" onclick="sendButtonSignal('${escAttr(btn.addr)}','${escAttr(btn.cmd)}','${escAttr(name+' / '+btn.name)}')" ${writer?'':'disabled'}><i class="ti ti-send"></i> Send</button>`;
    el.appendChild(box);
  });
}
async function importIRDBRemote(path, name, btnEl, destFolderId=null) {
  const origHtml = btnEl ? btnEl.innerHTML : '';
  if (btnEl) { btnEl.disabled=true; btnEl.innerHTML='<span class="spinner"></span>'; }
  try {
    const text=await fetchWithCache(`https://raw.githubusercontent.com/Lucaslhm/Flipper-IRDB/main/${path}`);
    const buttons=parseIRFile(text);
    if(!buttons.length){ if(btnEl){btnEl.innerHTML=origHtml;btnEl.disabled=false;} appendLog(`"${name}" — no compatible buttons.`,'sys'); return false; }
    const parentId = (destFolderId == null || destFolderId === '') ? null : parseInt(destFolderId);
    library.push({type:'remote',id:genId(),name,folderId:parentId,buttons,favorite:false,desc:''});
    saveLib(); renderSidebarTree();
    appendLog(`Imported "${name}" (${buttons.length} btns) into "${parentId == null ? '/ Root' : getFolderPath(parentId)}".`,'sys');
    if(btnEl){ btnEl.innerHTML='<i class="ti ti-check"></i> Done'; setTimeout(()=>{btnEl.innerHTML=origHtml;btnEl.disabled=false;},2000); }
    return true;
  } catch(e) {
    appendLog('IRDB import error: '+e,'err');
    if(btnEl){ btnEl.innerHTML=origHtml; btnEl.disabled=false; }
    return false;
  }
}

function renderImportDestinationTree(containerId, selectedId, setSelected) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '';

  const rootRow = document.createElement('div');
  rootRow.className = 'folder-picker-row' + (selectedId == null ? ' selected' : '');
  rootRow.innerHTML = `<i class="ti ti-home"></i><span class="folder-picker-label">/ Root</span>`;
  rootRow.onclick = () => {
    setSelected(null);
    renderImportDestinationTree(containerId, null, setSelected);
  };
  container.appendChild(rootRow);

  const hasChildren = (folderId) => library.some(x => x.type==='folder' && x.parentId===folderId);
  const getFolders = (parentId) => library
    .filter(x => x.type==='folder' && x.parentId===parentId)
    .sort((a,b) => a.name.localeCompare(b.name));

  const renderLevel = (parentId, depth) => {
    getFolders(parentId).forEach(folder => {
      const key = String(folder.id);
      const kids = hasChildren(folder.id);
      const isOpen = Object.prototype.hasOwnProperty.call(_irdbImportExpanded, key) ? !!_irdbImportExpanded[key] : true;
      const row = document.createElement('div');
      row.className = 'folder-picker-row' + (selectedId===folder.id ? ' selected' : '');
      row.style.paddingLeft = (8 + depth * 14) + 'px';
      row.innerHTML = `
        <i class="ti ${kids ? (isOpen ? 'ti-chevron-down' : 'ti-chevron-right') : 'ti-point'}"></i>
        <i class="ti ti-folder"></i>
        <span class="folder-picker-label">${escHtml(folder.name)}</span>`;
      row.onclick = () => {
        setSelected(folder.id);
        renderImportDestinationTree(containerId, folder.id, setSelected);
      };
      const chevron = row.querySelector('i');
      if (kids) {
        chevron.onclick = (e) => {
          e.stopPropagation();
          _irdbImportExpanded[key] = !isOpen;
          renderImportDestinationTree(containerId, selectedId, setSelected);
        };
      } else {
        chevron.style.visibility = 'hidden';
      }
      container.appendChild(row);
      if (kids && isOpen) renderLevel(folder.id, depth + 1);
    });
  };

  renderLevel(null, 1);
}

function openIRDBRemoteModal(path, name, btnEl, e=null) {
  if (e) e.stopPropagation();
  _irdbRemoteImportPath = path;
  _irdbRemoteImportName = name;
  _irdbRemoteImportBtn = btnEl || null;
  _irdbRemoteDestFolderId = null;
  _irdbImportExpanded = {};
  document.getElementById('irdbRemoteModalDesc').textContent = `Import "${name}" into your library.`;
  renderImportDestinationTree('irdbRemoteDestTree', _irdbRemoteDestFolderId, (id) => { _irdbRemoteDestFolderId = id; });
  document.getElementById('irdbRemoteModal').classList.add('open');
}
function closeIrdbRemoteModal() { document.getElementById('irdbRemoteModal').classList.remove('open'); }
async function confirmIRDBRemoteImport() {
  const btn = document.getElementById('irdbRemoteImportBtn');
  const origHtml = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Importing...';
  const ok = await importIRDBRemote(_irdbRemoteImportPath, _irdbRemoteImportName, _irdbRemoteImportBtn, _irdbRemoteDestFolderId);
  btn.disabled = false;
  btn.innerHTML = origHtml;
  if (ok) closeIrdbRemoteModal();
}

function openIRDBFolderModal(e, folderPath) {
  e.stopPropagation();
  _irdbFolderPath = folderPath;
  const count = (irdbData||[]).filter(n=>n.path.startsWith(folderPath+'/')).length;
  document.getElementById('irdbFolderModalDesc').textContent = `Import all ${count} remote${count!==1?'s':''} from "${folderPath.split('/').pop()}" into your library.`;
  _irdbFolderDestFolderId = null;
  _irdbImportExpanded = {};
  renderImportDestinationTree('irdbFolderDestTree', _irdbFolderDestFolderId, (id) => { _irdbFolderDestFolderId = id; });
  document.getElementById('irdbFolderModal').classList.add('open');
}
function closeIrdbFolderModal() { document.getElementById('irdbFolderModal').classList.remove('open'); }
async function confirmIRDBFolderImport() {
  const destFolderId = _irdbFolderDestFolderId;
  const folderFiles = (irdbData||[]).filter(n=>n.path.startsWith(_irdbFolderPath+'/'));
  const btn = document.getElementById('irdbFolderImportBtn');
  btn.disabled=true; btn.innerHTML='<span class="spinner"></span> Importing...';
  const rootParentId = (destFolderId == null || destFolderId === '') ? null : parseInt(destFolderId);
  const importRootName = _irdbFolderPath.split('/').pop() || 'IRDB Import';
  const importRoot = createImportFolder(importRootName, rootParentId);
  const createdFolderIds = new Set([importRoot.id]);
  let imported=0, skipped=0;
  for (const f of folderFiles) {
    try {
      const text=await fetchWithCache(`https://raw.githubusercontent.com/Lucaslhm/Flipper-IRDB/main/${f.path}`);
      const buttons=parseIRFile(text);
      if(!buttons.length){skipped++;continue;}
      const parts=f.path.split('/');
      const remoteName=parts[parts.length-1].replace('.ir','');
      const subParts=parts.slice(_irdbFolderPath.split('/').length,-1);
      let parentId=importRoot.id;
      for(const sp of subParts){
        let folder=library.find(fl=>fl.type==='folder'&&fl.name===sp&&fl.parentId===parentId);
        if(!folder){
          const newFolder = createFolderEntry(sp, parentId, false);
          createdFolderIds.add(newFolder.id);
          parentId=newFolder.id;
        }
        else parentId=folder.id;
      }
      library.push({type:'remote',id:genId(),name:limitName(remoteName, 'remote'),folderId:parentId,buttons,favorite:false,desc:''});
      imported++;
    } catch(e){ skipped++; }
  }
  if (!imported) library = library.filter(x => !(x.type === 'folder' && createdFolderIds.has(x.id)));
  saveLib(); renderSidebarTree();
  closeIrdbFolderModal();
  btn.disabled=false; btn.innerHTML='<i class="ti ti-download"></i> Import All';
  appendLog(`IRDB folder import into "${importRoot.name}": ${imported} imported, ${skipped} skipped.`,'sys');
  if(currentTab==='library') renderLibraryPane();
}

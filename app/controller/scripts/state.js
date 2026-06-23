let port = null, writer = null;
let currentTab = 'library';
let currentLibraryView = (localStorage.getItem('lbd_library_view') === 'favorites') ? 'favorites' : 'overview';
let selectedRemoteId = null;
let logBarOpen = false;
let logUnread = 0;
let txHistory = JSON.parse(localStorage.getItem('lbd_history') || '[]');
let remoteCardExpanded = {};
let library = JSON.parse(localStorage.getItem('lbd_library') || '[]');
let nextId = parseInt(localStorage.getItem('lbd_nextid') || '1');
let sidebarFolderOpen = JSON.parse(localStorage.getItem('lbd_sidebar_open') || '{}');
let libraryFolderOpen = JSON.parse(localStorage.getItem('lbd_library_open') || '{}');
let sidebarSearchQuery = '';
let _openedFromFavorites = false;
let librarySearchQuery = '';
let favoritesSearchQuery = '';
let libraryCurrentFolderId = null;
let libraryBackStack = [];
if (!sidebarFolderOpen || typeof sidebarFolderOpen !== 'object' || Array.isArray(sidebarFolderOpen)) sidebarFolderOpen = {};
if (!libraryFolderOpen || typeof libraryFolderOpen !== 'object' || Array.isArray(libraryFolderOpen)) libraryFolderOpen = {};

const NAME_LIMITS = { folder: 32, remote: 32, button: 24 };

function clampName(value, limit) {
  const text = String(value ?? '').trim();
  if (!text) return '';
  return text.length > limit ? text.slice(0, limit).trimEnd() : text;
}

function limitName(value, type) {
  return clampName(value, NAME_LIMITS[type] || NAME_LIMITS.remote);
}

function normalizeLibraryNameLimits() {
  let changed = false;
  library.forEach(item => {
    if (item.type === 'folder') {
      const nextName = limitName(item.name, 'folder');
      if (nextName !== item.name) {
        item.name = nextName;
        changed = true;
      }
    } else if (item.type === 'remote') {
      const nextName = limitName(item.name, 'remote');
      if (nextName !== item.name) {
        item.name = nextName;
        changed = true;
      }
      (item.buttons || []).forEach(button => {
        const nextButtonName = limitName(button.name, 'button');
        if (nextButtonName !== button.name) {
          button.name = nextButtonName;
          changed = true;
        }
      });
    }
  });
  if (changed) saveLib();
}

function saveFolderOpenState() {
  localStorage.setItem('lbd_sidebar_open', JSON.stringify(sidebarFolderOpen));
  localStorage.setItem('lbd_library_open', JSON.stringify(libraryFolderOpen));
}
function folderOpenByMap(map, folder) {
  const key = String(folder.id);
  return Object.prototype.hasOwnProperty.call(map, key) ? !!map[key] : (folder.open !== false);
}
function setFolderOpenByMap(map, folderId, isOpen) {
  map[String(folderId)] = !!isOpen;
  saveFolderOpenState();
}
function pruneFolderOpenState() {
  const ids = new Set(library.filter(x => x.type === 'folder').map(x => String(x.id)));
  Object.keys(sidebarFolderOpen).forEach(k => { if (!ids.has(k)) delete sidebarFolderOpen[k]; });
  Object.keys(libraryFolderOpen).forEach(k => { if (!ids.has(k)) delete libraryFolderOpen[k]; });
}
function collapseAllFolders() {
  library.forEach(item => {
    if (item.type !== 'folder') return;
    item.open = false;
    sidebarFolderOpen[String(item.id)] = false;
    libraryFolderOpen[String(item.id)] = false;
  });
  saveLib();
  renderSidebarTree();
  if (currentTab === 'library') renderLibraryPane();
}
function collapseLibraryPaneFolders() {
  library.forEach(item => {
    if (item.type !== 'folder') return;
    item.open = false;
    libraryFolderOpen[String(item.id)] = false;
  });
  libraryCurrentFolderId = null;
  libraryBackStack = [];
  saveLib();
  if (currentTab === 'library' && selectedRemoteId == null) renderLibraryPane();
}
function saveLib() {
  pruneFolderOpenState();
  localStorage.setItem('lbd_library', JSON.stringify(library));
  localStorage.setItem('lbd_nextid', String(nextId));
  saveFolderOpenState();
}
function saveHistory() { localStorage.setItem('lbd_history', JSON.stringify(txHistory)); }
function genId() { return nextId++; }
function setLibraryView(view) {
  currentLibraryView = (view === 'favorites') ? 'favorites' : 'overview';
  localStorage.setItem('lbd_library_view', currentLibraryView);
  if (currentLibraryView === 'favorites') selectedRemoteId = null;
  syncLibraryViewTabs();
  if (currentTab === 'library') renderLibraryPane();
}
function normalizeFolderId(folderId) {
  if (folderId == null || folderId === '') return null;
  const parsed = parseInt(folderId, 10);
  return Number.isNaN(parsed) ? null : parsed;
}
function getFolderById(folderId) {
  const id = normalizeFolderId(folderId);
  if (id == null) return null;
  return library.find(x => x.type === 'folder' && x.id === id) || null;
}
function sanitizeLibraryNavigator() {
  if (libraryCurrentFolderId != null && !getFolderById(libraryCurrentFolderId)) libraryCurrentFolderId = null;
  libraryBackStack = libraryBackStack.filter(id => id == null || !!getFolderById(id));
}
function setSidebarSearch(query) {
  sidebarSearchQuery = String(query || '');
  renderSidebarTree();
}
function setLibrarySearch(query) {
  librarySearchQuery = String(query || '');
  if (currentTab === 'library' && currentLibraryView === 'overview' && selectedRemoteId == null) renderLibraryPane();
}
function getFolderTrail(folderId) {
  const out = [];
  let cur = getFolderById(folderId);
  while (cur) {
    out.unshift(cur);
    cur = cur.parentId == null ? null : getFolderById(cur.parentId);
  }
  return out;
}
function openLibraryFolder(folderId, pushHistory=true) {
  const targetId = normalizeFolderId(folderId);
  if (targetId != null && !getFolderById(targetId)) return;
  currentLibraryView = 'overview';
  localStorage.setItem('lbd_library_view', currentLibraryView);
  if (pushHistory && targetId !== libraryCurrentFolderId) libraryBackStack.push(libraryCurrentFolderId);
  libraryCurrentFolderId = targetId;
  selectedRemoteId = null;
  if (currentTab === 'library') renderLibraryPane();
  else switchTab('library');
}
function jumpToLibraryFolder(folderId) {
  openLibraryFolder(folderId, true);
}
function goBackLibraryFolder() {
  sanitizeLibraryNavigator();
  currentLibraryView = 'overview';
  localStorage.setItem('lbd_library_view', currentLibraryView);
  if (libraryBackStack.length) {
    libraryCurrentFolderId = libraryBackStack.pop();
  } else {
    const cur = getFolderById(libraryCurrentFolderId);
    libraryCurrentFolderId = cur ? cur.parentId : null;
  }
  selectedRemoteId = null;
  if (currentTab === 'library') renderLibraryPane();
}
function openRemoteInLibrary(remoteId) {
  const remote = library.find(r => r.type === 'remote' && r.id === remoteId);
  if (!remote) return;
  currentLibraryView = 'overview';
  localStorage.setItem('lbd_library_view', currentLibraryView);
  libraryCurrentFolderId = remote.folderId == null ? null : remote.folderId;
  selectedRemoteId = remote.id;
  renderSidebarTree();
  if (currentTab === 'library') renderLibraryPane();
  else switchTab('library');
}
function closeRemoteView(e) {
  if (e) e.stopPropagation();
  const wasFav = _openedFromFavorites;
  const remoteId = selectedRemoteId;
  _openedFromFavorites = false;
  selectedRemoteId = null;
  if (wasFav) {
    currentLibraryView = 'favorites';
    localStorage.setItem('lbd_library_view', 'favorites');
    if (currentTab === 'library') renderLibraryPane();
    else switchTab('library');
  } else {
    const remote = library.find(r => r.id === remoteId);
    currentLibraryView = 'overview';
    localStorage.setItem('lbd_library_view', 'overview');
    openLibraryFolder(remote && remote.folderId != null ? remote.folderId : null, false);
  }
}
function syncLibraryViewTabs() {
  const overview = document.getElementById('libraryView-overview');
  const favorites = document.getElementById('libraryView-favorites');
  if (!overview || !favorites) return;
  overview.classList.toggle('active', currentLibraryView === 'overview');
  favorites.classList.toggle('active', currentLibraryView === 'favorites');
}
function getUniqueFolderName(baseName, parentId=null) {
  const base = String(baseName || 'Imported').trim() || 'Imported';
  let name = base;
  let n = 2;
  while (library.some(x => x.type === 'folder' && x.parentId === parentId && x.name === name)) {
    name = `${base} (${n})`;
    n++;
  }
  return name;
}
function createFolderEntry(name, parentId=null, open=false) {
  const folder = { type:'folder', id:genId(), name: limitName(name, 'folder'), parentId, open };
  library.push(folder);
  return folder;
}
function createImportFolder(baseName, parentId=null) {
  return createFolderEntry(getUniqueFolderName(baseName, parentId), parentId, false);
}
function expandFolderInViews(folderId) {
  let cur = library.find(x => x.type === 'folder' && x.id === folderId);
  while (cur) {
    sidebarFolderOpen[String(cur.id)] = true;
    libraryFolderOpen[String(cur.id)] = true;
    if (cur.parentId == null) break;
    cur = library.find(x => x.type === 'folder' && x.id === cur.parentId);
  }
}
function importStamp() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd} ${hh}-${mi}-${ss}`;
}
function getFolderPath(id) {
  const parts=[]; let cur=library.find(x=>x.id===id);
  while(cur) { parts.unshift(cur.name); cur=cur.parentId?library.find(x=>x.id===cur.parentId):null; }
  return '/ '+parts.join(' / ');
}

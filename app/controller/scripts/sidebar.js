function toggleSidebar(force) {
  const sidebar = document.querySelector('.sidebar');
  const backdrop = document.getElementById('sidebarBackdrop');
  const isMobile = window.innerWidth <= 900;
  if (isMobile) {
    const isOpen = sidebar.classList.toggle('open', force !== undefined ? force : undefined);
    backdrop.classList.toggle('visible', isOpen);
    document.body.classList.toggle('sidebar-open', isOpen);
  } else {
    sidebar.classList.toggle('collapsed', force !== undefined ? !force : undefined);
  }
}

(function() {
  const sidebar = document.querySelector('.sidebar');
  const handle = document.querySelector('.sidebar-resize-handle');
  if (!sidebar || !handle) return;
  const saved = localStorage.getItem('lbd_sidebar_width');
  if (saved) sidebar.style.setProperty('--sidebar-width', saved + 'px');
  let startX, startW;
  function onDown(e) {
    if (sidebar.classList.contains('collapsed')) return;
    startX = e.clientX;
    startW = sidebar.offsetWidth;
    sidebar.style.transition = 'none';
    handle.classList.add('active');
    document.body.classList.add('sidebar-resizing');
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }
  function onMove(e) {
    const w = Math.min(600, Math.max(160, startW + e.clientX - startX));
    sidebar.style.setProperty('--sidebar-width', w + 'px');
  }
  function onUp() {
    sidebar.style.transition = '';
    handle.classList.remove('active');
    document.body.classList.remove('sidebar-resizing');
    localStorage.setItem('lbd_sidebar_width', sidebar.offsetWidth);
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onUp);
  }
  handle.addEventListener('mousedown', onDown);
})();

function renderSidebarTree() {
  const el = document.getElementById('sidebarTree');
  if (!el) return;
  const searchEl = document.getElementById('sidebarSearch');
  if (searchEl && searchEl.value !== sidebarSearchQuery) searchEl.value = sidebarSearchQuery;
  const query = sidebarSearchQuery.trim().toLowerCase();
  el.innerHTML = '';
  renderTreeLevel(el, null, 0, query);
}
function sidebarRemoteMatchesQuery(remote, query) {
  if (!query) return true;
  if (String(remote.name || '').toLowerCase().includes(query)) return true;
  return String(remote.desc || '').toLowerCase().includes(query);
}
function sidebarFolderMatchesQuery(folder, query) {
  if (!query) return true;
  if (String(folder.name || '').toLowerCase().includes(query)) return true;
  if (library.some(x => x.type === 'remote' && x.folderId === folder.id && sidebarRemoteMatchesQuery(x, query))) return true;
  return library
    .filter(x => x.type === 'folder' && x.parentId === folder.id)
    .some(child => sidebarFolderMatchesQuery(child, query));
}
function renderTreeLevel(container, parentId, depth, query='') {
  const folders = library
    .filter(x => x.type==='folder' && x.parentId===parentId)
    .sort((a, b) => a.name.localeCompare(b.name));
  const remotes = library
    .filter(x => x.type==='remote' && x.folderId===parentId)
    .sort((a, b) => a.name.localeCompare(b.name));
  folders.forEach(folder => {
    if (query && !sidebarFolderMatchesQuery(folder, query)) return;
    const row = document.createElement('div');
    row.className = 'tree-item';
    row.style.paddingLeft = (8 + depth*14) + 'px';
    row.dataset.dropid = folder.id;
    row.dataset.dragid = folder.id;
    const isSearchMode = !!query;
    const isOpen = isSearchMode ? true : folderOpenByMap(sidebarFolderOpen, folder);
    row.innerHTML = `
      <i class="ti ti-grip-vertical drag-handle" title="Drag to move" onmousedown="startDrag(event,'folder',${folder.id})"></i>
      <i class="ti ti-chevron-right ${isOpen?'open':''}"></i>
      <i class="ti ${isOpen?'ti-folder-open':'ti-folder'}"></i>
      <span class="tree-label" title="${escAttr(folder.name)}">${escHtml(folder.name)}</span>
      <span class="tree-actions">
        <button class="tree-act" title="Rename" onclick="openRenameModal(event,'folder',${folder.id})"><i class="ti ti-pencil"></i></button>
        <button class="tree-act" title="New subfolder" onclick="openNewFolderModal(${folder.id},event)"><i class="ti ti-folder-plus"></i></button>
        <button class="tree-act del" title="Delete" onclick="openDeleteModal(event,'folder',${folder.id})"><i class="ti ti-trash"></i></button>
      </span>`;
    row.addEventListener('click', e => {
      if (e.target.closest('.tree-actions') || e.target.closest('.drag-handle')) return;
      if (isSearchMode) {
        openLibraryFolder(folder.id, true);
        return;
      }
      setFolderOpenByMap(sidebarFolderOpen, folder.id, !isOpen);
      renderSidebarTree();
    });
    container.appendChild(row);
    if (isOpen) renderTreeLevel(container, folder.id, depth+1, query);
  });
  remotes.filter(remote => sidebarRemoteMatchesQuery(remote, query)).forEach(remote => {
    const row = document.createElement('div');
    row.className = 'tree-item' + (selectedRemoteId===remote.id ? ' active' : '');
    row.style.paddingLeft = (8 + depth*14 + 14) + 'px';
    row.dataset.dragid = remote.id;
    row.innerHTML = `
      <i class="ti ti-grip-vertical drag-handle" title="Drag to move" onmousedown="startDrag(event,'remote',${remote.id})"></i>
      <i class="ti ti-device-remote"></i>
      <span class="tree-label" title="${escAttr(remote.name)}">${escHtml(remote.name)}</span>
      <span class="tree-actions">
        <button class="tree-act" title="Rename" onclick="openRenameModal(event,'remote',${remote.id})"><i class="ti ti-pencil"></i></button>
        <button class="tree-act del" title="Delete" onclick="openDeleteModal(event,'remote',${remote.id})"><i class="ti ti-trash"></i></button>
      </span>`;
    row.addEventListener('click', e => {
      if (e.target.closest('.tree-actions') || e.target.closest('.drag-handle')) return;
      openRemoteInLibrary(remote.id);
    });
    container.appendChild(row);
  });
}

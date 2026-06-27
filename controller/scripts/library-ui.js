function renderLibraryPane() {
  sanitizeLibraryNavigator();
  const el = document.getElementById('libraryContent');
  const libSearchWrap = document.getElementById('librarySearchWrap');
  const libSearchInput = document.getElementById('librarySearch');
  const favSearchWrap = document.getElementById('favoritesSearchWrap');
  const favSearchInput = document.getElementById('favoritesSearch');
  if (libSearchInput && libSearchInput.value !== librarySearchQuery) libSearchInput.value = librarySearchQuery;
  if (favSearchInput && favSearchInput.value !== favoritesSearchQuery) favSearchInput.value = favoritesSearchQuery;
  syncLibraryViewTabs();
  if (selectedRemoteId != null) {
    if (libSearchWrap) libSearchWrap.style.display = 'none';
    if (favSearchWrap) favSearchWrap.style.display = 'none';
    const remote = library.find(r => r.id===selectedRemoteId);
    if (remote) { renderRemoteView(el, remote); return; }
    selectedRemoteId = null;
  }
  if (currentLibraryView === 'favorites') {
    if (libSearchWrap) libSearchWrap.style.display = 'none';
    if (favSearchWrap) favSearchWrap.style.display = '';
    renderFavoritesView(el);
    return;
  }
  if (libSearchWrap) libSearchWrap.style.display = '';
  if (favSearchWrap) favSearchWrap.style.display = 'none';
  renderLibraryOverview(el);
}
function getFavoriteButtons() {
  const out = [];
  library.filter(x => x.type === 'remote').forEach(remote => {
    (remote.buttons || []).forEach(btn => {
      if (btn && btn.favorite) out.push({ remote, btn });
    });
  });
  return out;
}
function getFavoriteRemotes() {
  return library.filter(x => x.type === 'remote' && !!x.favorite);
}
function clearAllFavorites() {
  library.filter(x => x.type === 'remote').forEach(remote => {
    remote.favorite = false;
    (remote.buttons || []).forEach(btn => { btn.favorite = false; });
  });
  saveLib();
  if (currentTab === 'library') renderLibraryPane();
  appendLog('All favorites cleared.', 'sys');
}
function openClearFavoritesModal() {
  document.getElementById('clearFavoritesModal').classList.add('open');
}
function closeClearFavoritesModal() {
  document.getElementById('clearFavoritesModal').classList.remove('open');
}
function confirmClearFavorites() {
  clearAllFavorites();
  closeClearFavoritesModal();
}
function renderFavoritesView(el) {
  const favRemotes = getFavoriteRemotes();
  const favs = getFavoriteButtons();
  const query = favoritesSearchQuery.trim().toLowerCase();
  const filteredRemotes = query
    ? favRemotes.filter(r => remoteMatchesLibraryQuery(r, query))
    : favRemotes;
  const filteredSignals = query
    ? favs.filter(({ remote, btn }) => {
        const n = btn.name.toLowerCase();
        const rn = remote.name.toLowerCase();
        const rd = (remote.desc || '').toLowerCase();
        const d = (btn.desc || '').toLowerCase();
        return n.includes(query) || rn.includes(query) || d.includes(query) || rd.includes(query);
      })
    : favs;
  const totalFavs = favRemotes.length + favs.length;
  el.innerHTML = '';
  const hdr = document.createElement('div');
  hdr.className = 'section-hdr';
  hdr.innerHTML = `
    <span class="section-title"><i class="ti ti-star-filled" style="vertical-align:-2px;margin-right:6px;"></i>Favorites</span>
    <div style="display:flex;align-items:center;gap:8px;">
      <span class="favorites-meta">${favRemotes.length} remote${favRemotes.length!==1?'s':''} · ${favs.length} signal${favs.length!==1?'s':''}</span>
      <button class="btn btn-sm btn-ghost" onclick="openClearFavoritesModal()" ${totalFavs ? '' : 'disabled'}><i class="ti ti-eraser"></i> Clear Favorites</button>
    </div>`;
  el.appendChild(hdr);
  if (!totalFavs) {
    el.innerHTML += `<div class="empty-state"><i class="ti ti-star-off"></i><p>No favorites yet.<br>Open a remote and star remotes or buttons.</p></div>`;
    return;
  }
  const layout = document.createElement('div');
  layout.className = 'favorites-layout';
  const remotesCol = document.createElement('div');
  remotesCol.className = 'favorites-column';
  const rHdr = document.createElement('div');
  rHdr.className = 'section-hdr';
  rHdr.innerHTML = `<span class="section-title"><i class="ti ti-device-remote" style="vertical-align:-2px;margin-right:6px;"></i>Favorite Remotes</span>`;
  rHdr.style.marginBottom = '10px';
  remotesCol.appendChild(rHdr);
  if (filteredRemotes.length) {
    const rGrid = document.createElement('div');
    rGrid.className = 'fav-grid';
    filteredRemotes.forEach(remote => appendRemoteCard(rGrid, remote));
    remotesCol.appendChild(rGrid);
  } else if (query) {
    const emp = document.createElement('div');
    emp.className = 'empty-state';
    emp.style.padding = '20px';
    emp.innerHTML = `<p style="font-size:11px;">No matching remotes.</p>`;
    remotesCol.appendChild(emp);
  } else {
    const emp = document.createElement('div');
    emp.className = 'empty-state';
    emp.style.padding = '20px';
    emp.innerHTML = `<i class="ti ti-star-off" style="font-size:20px;"></i><p style="font-size:11px;">No favorited remotes.</p>`;
    remotesCol.appendChild(emp);
  }
  layout.appendChild(remotesCol);
  const sigCol = document.createElement('div');
  sigCol.className = 'favorites-column';
  const sHdr = document.createElement('div');
  sHdr.className = 'section-hdr';
  sHdr.innerHTML = `<span class="section-title"><i class="ti ti-stars" style="vertical-align:-2px;margin-right:6px;"></i>Favorite Signals</span>`;
  sHdr.style.marginBottom = '10px';
  sigCol.appendChild(sHdr);
  if (filteredSignals.length) {
    const sGrid = document.createElement('div');
    sGrid.className = 'fav-signal-grid';
    filteredSignals.forEach(({ remote, btn }) => {
      const item = document.createElement('div');
      item.className = 'fav-signal-item';
      item.innerHTML = `
        <div class="fav-signal-top">
          <span class="fav-signal-name">${escHtml(btn.name)}</span>
          <button class="btn btn-ghost btn-sm btn-icon" title="Remove from favorites" onclick="toggleFavoriteButton(${btn.id},${remote.id},event)" style="color:var(--accent);flex-shrink:0;"><i class="ti ti-star-filled"></i></button>
        </div>
        <div class="signal-meta">
          <span class="signal-chip proto"><i class="ti ti-device-remote" style="font-size:9px;"></i> ${escHtml(remote.name)}</span>
        </div>
        <div class="signal-meta" style="margin-top:4px;">
          <span class="signal-chip addr">${escHtml(btn.addr||'—')}</span>
          <span class="signal-chip cmd">${escHtml(btn.cmd||'—')}</span>
        </div>
        ${btn.desc ? `<div class="fav-signal-desc">${escHtml(btn.desc)}</div>` : ''}
        <div class="fav-signal-actions">
          <button class="btn btn-sm" onclick="openFavoriteRemote(${remote.id})"><i class="ti ti-arrow-right"></i> Open</button>
          <button class="btn btn-green btn-sm" onclick="sendButtonSignal('${escAttr(btn.addr)}','${escAttr(btn.cmd)}','${escAttr(remote.name+' / '+btn.name)}')" ${writer?'':'disabled'}><i class="ti ti-send"></i> Send</button>
        </div>`;
      sGrid.appendChild(item);
    });
    sigCol.appendChild(sGrid);
  } else if (query) {
    const emp = document.createElement('div');
    emp.className = 'empty-state';
    emp.style.padding = '20px';
    emp.innerHTML = `<p style="font-size:11px;">No matching signals.</p>`;
    sigCol.appendChild(emp);
  } else {
    const emp = document.createElement('div');
    emp.className = 'empty-state';
    emp.style.padding = '20px';
    emp.innerHTML = `<i class="ti ti-star-off" style="font-size:20px;"></i><p style="font-size:11px;">No favorited signals.</p>`;
    sigCol.appendChild(emp);
  }
  layout.appendChild(sigCol);
  el.appendChild(layout);
}
function openFavoriteRemote(remoteId) {
  _openedFromFavorites = true;
  openRemoteInLibrary(remoteId);
}
function renderLibraryOverview(el) {
  sanitizeLibraryNavigator();
  const currentFolder = getFolderById(libraryCurrentFolderId);
  if (libraryCurrentFolderId != null && !currentFolder) libraryCurrentFolderId = null;
  const activeFolderId = currentFolder ? currentFolder.id : null;
  const query = librarySearchQuery.trim().toLowerCase();
  const childFolders = library
    .filter(x => x.type === 'folder' && x.parentId === activeFolderId)
    .sort((a, b) => a.name.localeCompare(b.name));
  const childRemotes = library
    .filter(x => x.type === 'remote' && x.folderId === activeFolderId)
    .sort((a, b) => a.name.localeCompare(b.name));
  const visibleFolders = query ? childFolders.filter(f => String(f.name || '').toLowerCase().includes(query)) : childFolders;
  const visibleRemotes = query ? childRemotes.filter(r => remoteMatchesLibraryQuery(r, query)) : childRemotes;

  el.innerHTML = '';
  if (!library.some(x => x.type === 'folder' || x.type === 'remote')) {
    el.innerHTML = `<div class="empty-state"><i class="ti ti-satellite"></i><p>No remotes yet.<br>Import .ir files or save signals from the Transmit tab.</p></div>`;
    return;
  }
  const toolbar = document.createElement('div');
  toolbar.className = 'library-browser-toolbar';

  const left = document.createElement('div');
  left.className = 'library-browser-left';
  const canBack = libraryBackStack.length > 0 || (currentFolder && currentFolder.parentId != null);
  left.innerHTML = `<button class="btn btn-sm btn-ghost" onclick="goBackLibraryFolder()" ${canBack ? '' : 'disabled'}><i class="ti ti-arrow-left"></i> Back</button>`;
  const path = document.createElement('div');
  path.className = 'library-path';
  buildLibraryPath(path, activeFolderId);
  left.appendChild(path);
  toolbar.appendChild(left);

  const right = document.createElement('div');
  right.className = 'library-browser-right';
  right.innerHTML = `<button class="btn btn-sm btn-ghost" onclick="collapseLibraryPaneFolders()"><i class="ti ti-home"></i> Root</button>`;
  toolbar.appendChild(right);
  el.appendChild(toolbar);

  if (query) {
    const meta = document.createElement('div');
    meta.className = 'favorites-meta';
    meta.style.marginBottom = '10px';
    meta.textContent = `Filtered by "${librarySearchQuery}"`;
    el.appendChild(meta);
  }

  const grid = document.createElement('div');
  grid.className = 'library-grid';
  visibleFolders.forEach(folder => appendLibraryFolderCard(grid, folder));
  visibleRemotes.forEach(remote => appendLibraryRemoteCard(grid, remote));
  if (!visibleFolders.length && !visibleRemotes.length) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.style.gridColumn = '1 / -1';
    empty.innerHTML = query
      ? `<i class="ti ti-search-off"></i><p>No matches in this folder.</p>`
      : `<i class="ti ti-folder-off"></i><p>This folder is empty.</p>`;
    grid.appendChild(empty);
  }
  el.appendChild(grid);
}
function remoteMatchesLibraryQuery(remote, query) {
  if (!query) return true;
  if (String(remote.name || '').toLowerCase().includes(query)) return true;
  if (String(remote.desc || '').toLowerCase().includes(query)) return true;
  return (remote.buttons || []).some(btn => {
    const name = String(btn.name || '').toLowerCase();
    const desc = String(btn.desc || '').toLowerCase();
    return name.includes(query) || desc.includes(query);
  });
}
function buildLibraryPath(container, folderId) {
  const trail = getFolderTrail(folderId);
  if (!trail.length) {
    container.innerHTML = `<span class="cur">Library</span>`;
    return;
  }
  const root = document.createElement('a');
  root.textContent = 'Library';
  root.onclick = () => jumpToLibraryFolder(null);
  container.appendChild(root);
  trail.forEach((folder, idx) => {
    const sep = document.createElement('span');
    sep.className = 'sep';
    sep.textContent = '/';
    container.appendChild(sep);
    if (idx === trail.length - 1) {
      const cur = document.createElement('span');
      cur.className = 'cur';
      cur.textContent = folder.name;
      container.appendChild(cur);
    } else {
      const link = document.createElement('a');
      link.textContent = folder.name;
      link.onclick = () => jumpToLibraryFolder(folder.id);
      container.appendChild(link);
    }
  });
}
function countFolderItems(folderId) {
  const subFolders = library.filter(x => x.type === 'folder' && x.parentId === folderId).length;
  const remotes = library.filter(x => x.type === 'remote' && x.folderId === folderId).length;
  return subFolders + remotes;
}
function appendLibraryFolderCard(container, folder) {
  const childFolders = library
    .filter(x => x.type === 'folder' && x.parentId === folder.id)
    .sort((a, b) => a.name.localeCompare(b.name));
  const childRemotes = library
    .filter(x => x.type === 'remote' && x.folderId === folder.id)
    .sort((a, b) => a.name.localeCompare(b.name));
  const allItems = [
    ...childFolders.map(f => ({ type: 'folder', name: f.name })),
    ...childRemotes.map(r => ({ type: 'remote', name: r.name }))
  ].sort((a, b) => a.name.localeCompare(b.name));
  const previewLimit = 4;
  const preview = allItems.slice(0, previewLimit);
  const hiddenCount = allItems.length - preview.length;
  const totalItems = allItems.length;
  const card = document.createElement('div');
  card.className = 'remote-card remote-card-grid';
  card.innerHTML = `
    <div class="remote-card-head">
      <div class="remote-card-title">
        <i class="ti ti-folder remote-card-icon" style="color:var(--text2);"></i>
        <div class="remote-card-copy">
          <span class="remote-card-name" title="${escAttr(folder.name)}">${escHtml(folder.name)}</span>
          <span class="remote-card-meta">${totalItems} item${totalItems !== 1 ? 's' : ''}</span>
        </div>
      </div>
      <div class="remote-card-actions">
        <button class="btn btn-ghost btn-sm btn-icon" title="Rename folder" onclick="openRenameModal(event,'folder',${folder.id})"><i class="ti ti-pencil"></i></button>
        <button class="btn btn-ghost btn-sm btn-icon" title="Delete folder" onclick="openDeleteModal(event,'folder',${folder.id})"><i class="ti ti-trash"></i></button>
      </div>
    </div>
    <div class="remote-card-preview">
      <div class="folder-preview">
        ${preview.map(item => `<div class="folder-preview-item"><i class="ti ${item.type === 'folder' ? 'ti-folder' : 'ti-device-remote'}"></i><span title="${escAttr(item.name)}">${escHtml(item.name)}</span></div>`).join('')}
        ${hiddenCount > 0 ? `<div class="folder-preview-more">+${hiddenCount} more</div>` : ''}
        ${!totalItems ? `<div class="folder-preview-more">Empty</div>` : ''}
      </div>
    </div>`;
  card.onclick = () => openLibraryFolder(folder.id, true);
  container.appendChild(card);
}
function appendRemoteCard(container, remote, showMainActions=false) {
  const isFav = !!remote.favorite;
  const isExpanded = !!remoteCardExpanded[String(remote.id)];
  const previewLimit = 8;
  const allButtons = remote.buttons || [];
  const displayButtons = isExpanded ? allButtons : allButtons.slice(0, previewLimit);
  const hiddenCount = isExpanded ? 0 : Math.max(allButtons.length - previewLimit, 0);
  const hasDesc = !!remote.desc;
  const card = document.createElement('div');
  card.className = `remote-card${showMainActions ? ' remote-card-grid' : ''}${isExpanded ? ' expanded' : ''}`;
  const actionButtons = showMainActions
    ? `
      <button class="btn btn-ghost btn-sm btn-icon" title="${isFav ? 'Remove remote from favorites' : 'Add remote to favorites'}" onclick="toggleFavoriteRemote(${remote.id},event)" style="color:${isFav ? 'var(--accent)' : 'var(--text3)'}"><i class="ti ${isFav ? 'ti-star-filled' : 'ti-star'}"></i></button>
      <button class="btn btn-ghost btn-sm btn-icon" title="Rename remote" onclick="openRenameModal(event,'remote',${remote.id})"><i class="ti ti-pencil"></i></button>
      <button class="btn btn-ghost btn-sm btn-icon" title="Delete remote" onclick="openDeleteModal(event,'remote',${remote.id})"><i class="ti ti-trash"></i></button>`
    : `
      <button class="btn btn-ghost btn-sm btn-icon" title="${isFav ? 'Remove remote from favorites' : 'Add remote to favorites'}" onclick="toggleFavoriteRemote(${remote.id},event)" style="color:${isFav ? 'var(--accent)' : 'var(--text3)'}"><i class="ti ${isFav ? 'ti-star-filled' : 'ti-star'}"></i></button>`;
  card.innerHTML = `
    <div class="remote-card-head">
      <div class="remote-card-title">
        <i class="ti ti-device-remote remote-card-icon" aria-hidden="true"></i>
        <div class="remote-card-copy">
          <span class="remote-card-name" title="${escHtml(remote.name)}">${escHtml(remote.name)}</span>
          <span class="remote-card-meta">${allButtons.length} button${allButtons.length!==1?'s':''}</span>
        </div>
      </div>
      <div class="remote-card-actions">
        ${actionButtons}
      </div>
    </div>
    ${hasDesc ? `<div class="remote-card-desc" title="${escAttr(remote.desc)}">${escHtml(remote.desc)}</div>` : ''}
    <div class="remote-card-preview">
      <div class="chip-row${isExpanded ? ' expanded' : ''}">
        ${displayButtons.map(b=>`<span class="signal-chip">${escHtml(b.name)}</span>`).join('')}
        ${!allButtons.length ? `<span class="signal-chip remote-card-empty">No buttons</span>` : ''}
      </div>
      <div class="remote-card-preview-bottom">
        ${hiddenCount > 0 ? `<div class="folder-preview-more">+${hiddenCount} more</div>` : '<div></div>'}
        ${allButtons.length > previewLimit ? `<button class="btn btn-sm btn-ghost remote-card-more" onclick="toggleRemoteCardDetails(${remote.id},event)"><i class="ti ti-chevron-${isExpanded ? 'up' : 'down'}"></i> ${isExpanded ? 'Show less' : 'Show more'}</button>` : ''}
      </div>
    </div>`;
  card.onclick = () => {
    _openedFromFavorites = !showMainActions;
    openRemoteInLibrary(remote.id);
  };
  container.appendChild(card);
}
function appendLibraryRemoteCard(container, remote) {
  appendRemoteCard(container, remote, true);
}
function toggleRemoteCardDetails(remoteId, e) {
  if (e) e.stopPropagation();
  remoteCardExpanded[String(remoteId)] = !remoteCardExpanded[String(remoteId)];
  if (currentTab === 'library') renderLibraryPane();
}

function renderRemoteView(el, remote) {
  el.innerHTML = '';
  const trail = getFolderTrail(remote.folderId);
  const nav = document.createElement('div');
  nav.className = 'breadcrumb';
  nav.style.display = 'flex';
  nav.style.alignItems = 'center';
  nav.style.gap = '6px';
  const backBtn = document.createElement('button');
  backBtn.className = 'btn btn-sm btn-ghost';
  backBtn.innerHTML = '<i class="ti ti-arrow-left"></i> Back';
  backBtn.onclick = function(e) { closeRemoteView(e); };
  nav.appendChild(backBtn);
  const navSep = document.createElement('span');
  navSep.className = 'sep';
  navSep.textContent = '/';
  nav.appendChild(navSep);
  const rootLink = document.createElement('a');
  rootLink.textContent = 'Library';
  rootLink.onclick = () => {
    selectedRemoteId = null;
    jumpToLibraryFolder(null);
  };
  nav.appendChild(rootLink);
  trail.forEach(folder => {
    const sep = document.createElement('span');
    sep.className = 'sep';
    sep.textContent = '/';
    nav.appendChild(sep);
    const link = document.createElement('a');
    link.textContent = folder.name;
    link.onclick = () => {
      selectedRemoteId = null;
      jumpToLibraryFolder(folder.id);
    };
    nav.appendChild(link);
  });
  el.appendChild(nav);
  const hdr = document.createElement('div');
  hdr.className = 'section-hdr';
  hdr.style.marginTop = '14px';
  hdr.innerHTML = `
    <div class="remote-view-left">
      <span class="remote-view-title" title="${escAttr(remote.name)}"><i class="ti ti-device-remote" style="vertical-align:-2px;color:var(--accent);"></i><span class="remote-view-title-text">${escHtml(remote.name)}</span></span>
    </div>
    <div class="remote-view-actions">
      <button class="btn btn-sm ${remote.favorite ? 'btn-green' : ''}" title="${remote.favorite ? 'Unfavorite Remote' : 'Favorite Remote'}" onclick="toggleFavoriteRemote(${remote.id},event)"><i class="ti ${remote.favorite ? 'ti-star-filled' : 'ti-star'}"></i></button>
      <button class="btn btn-sm" onclick="openRenameModal(event,'remote',${remote.id})"><i class="ti ti-pencil"></i></button>
      <button class="btn btn-sm" onclick="showAddButtonBox(${remote.id})"><i class="ti ti-plus"></i> Add Button</button>
      <button class="btn btn-sm btn-danger" onclick="openDeleteModal(event,'remote',${remote.id})"><i class="ti ti-trash"></i></button>
    </div>`;
  el.appendChild(hdr);
  const descView = document.createElement('div');
  descView.id = 'rdesc-view-' + remote.id;
  descView.className = 'signal-desc-view';
  descView.onclick = function() { toggleRemoteDesc(remote.id); };
  descView.innerHTML = remote.desc
    ? escHtml(remote.desc)
    : '<span style="color:var(--text3);font-style:italic;">Add remote description...</span>';
  el.appendChild(descView);
  const descEdit = document.createElement('div');
  descEdit.id = 'rdesc-edit-' + remote.id;
  descEdit.style.display = 'none';
  descEdit.style.marginBottom = '6px';
  descEdit.innerHTML = `
    <textarea id="rdesc-inp-${remote.id}" placeholder="Describe this remote...">${escHtml(remote.desc || '')}</textarea>
    <div style="display:flex;gap:6px;margin-top:6px;">
      <button class="btn btn-green btn-sm" onclick="confirmRemoteDesc(${remote.id})"><i class="ti ti-check"></i> Save</button>
      <button class="btn btn-sm" onclick="toggleRemoteDesc(${remote.id})">Cancel</button>
    </div>`;
  el.appendChild(descEdit);
  const addPlaceholder = document.createElement('div');
  addPlaceholder.id = 'addBtnBoxWrap-' + remote.id;
  el.appendChild(addPlaceholder);
  const signalGrid = document.createElement('div');
  signalGrid.className = 'signal-grid';
  signalGrid.id = 'signalGrid-' + remote.id;
  remote.buttons.forEach(btn => signalGrid.appendChild(buildSignalBox(btn, remote.id)));
  if (remote.buttons.length) el.appendChild(signalGrid);
  if (!remote.buttons.length) {
    const emp = document.createElement('div');
    emp.className = 'empty-state'; emp.id = 'remote-empty-' + remote.id;
    emp.innerHTML = `<i class="ti ti-cursor-off"></i><p>No buttons. Click "Add Button" above.</p>`;
    el.appendChild(emp);
  }
}
function buildSignalBox(btn, remoteId) {
  const remoteObj = library.find(r => r.id===remoteId);
  const remName = remoteObj ? remoteObj.name : '';
  const isFav = !!btn.favorite;
  const box = document.createElement('div');
  box.className = 'signal-box';
  box.id = 'sigbox-' + btn.id;
  box.innerHTML = `
    <div class="signal-box-header">
      <span class="signal-box-name" id="sname-${btn.id}" title="${escAttr(btn.name)}">${escHtml(btn.name)}</span>
      <span class="signal-chip addr"><i class="ti ti-map-pin" style="font-size:9px;vertical-align:-1px;"></i> ${escHtml(btn.addr||'—')}</span>
      <span class="signal-chip cmd"><i class="ti ti-terminal" style="font-size:9px;vertical-align:-1px;"></i> ${escHtml(btn.cmd||'—')}</span>
      ${btn.proto ? `<span class="signal-chip proto">${escHtml(btn.proto)}</span>` : ''}
      <button class="btn btn-ghost btn-sm btn-icon" title="${isFav ? 'Remove from favorites' : 'Add to favorites'}" onclick="toggleFavoriteButton(${btn.id},${remoteId},event)" style="color:${isFav ? 'var(--accent)' : 'var(--text3)'};margin-left:auto;"><i class="ti ${isFav ? 'ti-star-filled' : 'ti-star'}"></i></button>
      <button class="btn btn-ghost btn-sm btn-icon" title="Rename" onclick="toggleEditName(${btn.id},${remoteId})"><i class="ti ti-pencil"></i></button>
      <button class="btn btn-ghost btn-sm btn-icon" title="Delete" onclick="deleteButton(${btn.id},${remoteId})" style="color:var(--text3);" onmouseenter="this.style.color='var(--red)'" onmouseleave="this.style.color='var(--text3)'"><i class="ti ti-trash"></i></button>
    </div>
    <div id="sname-edit-${btn.id}" style="display:none;margin-bottom:6px;">
      <div style="display:flex;gap:6px;align-items:center;">
        <input type="text" id="sname-inp-${btn.id}" maxlength="24" value="${escAttr(btn.name)}" style="width:200px;" oninput="validateSigName(${btn.id})" onkeydown="if(event.key==='Enter')confirmEditName(${btn.id},${remoteId})">
        <button class="btn btn-green btn-sm" onclick="confirmEditName(${btn.id},${remoteId})"><i class="ti ti-check"></i></button>
        <button class="btn btn-sm" onclick="toggleEditName(${btn.id},${remoteId})"><i class="ti ti-x"></i></button>
      </div>
      <div class="field-err" id="sname-err-${btn.id}"></div>
    </div>
    <div id="sdesc-view-${btn.id}" class="signal-desc-view" onclick="toggleEditDesc(${btn.id},${remoteId})" title="Click to edit description">
      ${btn.desc ? escHtml(btn.desc) : '<span style="color:var(--text3);font-style:italic;">Add description...</span>'}
    </div>
    <div id="sdesc-edit-${btn.id}" style="display:none;margin-bottom:6px;">
      <textarea id="sdesc-inp-${btn.id}" placeholder="Describe what this button does...">${escHtml(btn.desc||'')}</textarea>
      <div style="display:flex;gap:6px;margin-top:6px;">
        <button class="btn btn-green btn-sm" onclick="confirmEditDesc(${btn.id},${remoteId})"><i class="ti ti-check"></i> Save</button>
        <button class="btn btn-sm" onclick="toggleEditDesc(${btn.id},${remoteId})">Cancel</button>
      </div>
    </div>
    <div class="signal-actions">
      <button class="btn btn-green btn-sm" onclick="sendButtonSignal('${escAttr(btn.addr)}','${escAttr(btn.cmd)}','${escAttr(remName+' / '+btn.name)}')" ${writer?'':'disabled'}><i class="ti ti-send"></i> Send</button>
    </div>`;
  return box;
}

function showAddButtonBox(remoteId) {
  const wrap = document.getElementById('addBtnBoxWrap-' + remoteId);
  if (!wrap || wrap.querySelector('.add-btn-box')) return;
  const box = document.createElement('div');
  box.className = 'add-btn-box';
  box.innerHTML = `
    <div class="add-btn-box-title"><i class="ti ti-plus"></i> New Button</div>
    <div class="row2">
      <div class="field-group">
        <label class="field-label">Button Name</label>
        <input type="text" id="abn-name-${remoteId}" maxlength="24" placeholder="e.g. Power" oninput="validateAddBtn(${remoteId})">
        <div class="field-err" id="abn-name-err-${remoteId}"></div>
      </div>
      <div class="field-group">
        <label class="field-label">Description (optional)</label>
        <input type="text" id="abn-desc-${remoteId}" placeholder="What does this do?">
      </div>
    </div>
    <div class="row2">
      <div class="field-group">
        <label class="field-label">Address Hex</label>
        <input type="text" id="abn-addr-${remoteId}" class="hex-input" placeholder="20 00 00 00" oninput="onHexInputRaw(this);validateAddBtn(${remoteId})" maxlength="11" autocomplete="off" spellcheck="false">
        <div class="field-err" id="abn-addr-err-${remoteId}"></div>
      </div>
      <div class="field-group">
        <label class="field-label">Command Hex</label>
        <input type="text" id="abn-cmd-${remoteId}" class="hex-input" placeholder="09 00 00 00" oninput="onHexInputRaw(this);validateAddBtn(${remoteId})" maxlength="11" autocomplete="off" spellcheck="false">
        <div class="field-err" id="abn-cmd-err-${remoteId}"></div>
      </div>
    </div>
    <div style="display:flex;gap:8px;">
      <button class="btn btn-green" id="abn-create-${remoteId}" onclick="confirmAddButton(${remoteId})" disabled><i class="ti ti-check"></i> Create</button>
      <button class="btn" onclick="document.getElementById('addBtnBoxWrap-${remoteId}').innerHTML=''">Cancel</button>
    </div>`;
  wrap.appendChild(box);
  document.getElementById('abn-name-' + remoteId).focus();
}
function validateAddBtn(remoteId) {
  const name = document.getElementById('abn-name-'+remoteId).value.trim();
  const addr = document.getElementById('abn-addr-'+remoteId).value;
  const cmd  = document.getElementById('abn-cmd-'+remoteId).value;
  const vn=!!name, va=validateHex(addr), vc=validateHex(cmd);
  document.getElementById('abn-name-err-'+remoteId).textContent = (!vn&&name.length>0) ? 'Name required' : '';
  document.getElementById('abn-addr-err-'+remoteId).textContent = (!va&&addr.length>0) ? 'Must be 4 hex bytes e.g. 20 00 00 00' : '';
  document.getElementById('abn-cmd-err-'+remoteId).textContent  = (!vc&&cmd.length>0)  ? 'Must be 4 hex bytes e.g. 09 00 00 00' : '';
  document.getElementById('abn-create-'+remoteId).disabled = !(vn&&va&&vc);
}
function confirmAddButton(remoteId) {
  const name = limitName(document.getElementById('abn-name-'+remoteId).value, 'button');
  const addr = document.getElementById('abn-addr-'+remoteId).value.trim();
  const cmd  = document.getElementById('abn-cmd-'+remoteId).value.trim();
  const desc = document.getElementById('abn-desc-'+remoteId).value.trim();
  if (!name||!validateHex(addr)||!validateHex(cmd)) return;
  const remote = library.find(r => r.id===remoteId);
  const newBtn = { id:genId(), name, addr, cmd, desc, proto:'NEC', favorite:false };
  remote.buttons.push(newBtn);
  saveLib();
  document.getElementById('remote-empty-'+remoteId)?.remove();
  document.getElementById('addBtnBoxWrap-'+remoteId).innerHTML = '';
  const grid = document.getElementById('signalGrid-'+remoteId);
  if (grid) grid.appendChild(buildSignalBox(newBtn, remoteId));
  else document.getElementById('libraryContent').appendChild(buildSignalBox(newBtn, remoteId));
  appendLog(`Added "${name}" to "${remote.name}".`, 'sys');
}

function toggleFavoriteRemote(remoteId, e) {
  if (e) e.stopPropagation();
  const remote = library.find(r => r.id===remoteId && r.type==='remote');
  if (!remote) return;
  remote.favorite = !remote.favorite;
  saveLib();
  if (currentTab === 'library') renderLibraryPane();
}
function toggleFavoriteButton(btnId, remoteId, e) {
  if (e) e.stopPropagation();
  const remote = library.find(r => r.id===remoteId);
  if (!remote) return;
  const btn = (remote.buttons || []).find(b => b.id===btnId);
  if (!btn) return;
  btn.favorite = !btn.favorite;
  saveLib();
  if (currentTab === 'library') renderLibraryPane();
}
function toggleEditName(btnId, remoteId) {
  const edit = document.getElementById('sname-edit-'+btnId);
  edit.style.display = edit.style.display==='none' ? 'block' : 'none';
  if (edit.style.display!=='none') document.getElementById('sname-inp-'+btnId).focus();
}
function validateSigName(btnId) {
  const v = document.getElementById('sname-inp-'+btnId).value.trim();
  document.getElementById('sname-err-'+btnId).textContent = v ? '' : 'Name required';
  return !!v;
}
function confirmEditName(btnId, remoteId) {
  if (!validateSigName(btnId)) return;
  const v = limitName(document.getElementById('sname-inp-'+btnId).value, 'button');
  library.find(r=>r.id===remoteId).buttons.find(b=>b.id===btnId).name = v;
  saveLib();
  document.getElementById('sname-'+btnId).textContent = v;
  document.getElementById('sname-'+btnId).title = v;
  document.getElementById('sname-edit-'+btnId).style.display = 'none';
}
function toggleEditDesc(btnId, remoteId) {
  const view = document.getElementById('sdesc-view-'+btnId);
  const edit = document.getElementById('sdesc-edit-'+btnId);
  const open = edit.style.display!=='none';
  edit.style.display = open ? 'none' : 'block';
  view.style.display = open ? '' : 'none';
  if (!open) document.getElementById('sdesc-inp-'+btnId).focus();
}
function confirmEditDesc(btnId, remoteId) {
  const v = document.getElementById('sdesc-inp-'+btnId).value.trim();
  library.find(r=>r.id===remoteId).buttons.find(b=>b.id===btnId).desc = v;
  saveLib();
  document.getElementById('sdesc-view-'+btnId).innerHTML = v ? escHtml(v) : '<span style="color:var(--text3);font-style:italic;">Add description...</span>';
  document.getElementById('sdesc-edit-'+btnId).style.display = 'none';
  document.getElementById('sdesc-view-'+btnId).style.display = '';
}
function deleteButton(btnId, remoteId) {
  if (!confirm('Delete this button?')) return;
  library.find(r=>r.id===remoteId).buttons = library.find(r=>r.id===remoteId).buttons.filter(b=>b.id!==btnId);
  saveLib();
  if (currentTab === 'library') renderLibraryPane();
  else document.getElementById('sigbox-'+btnId)?.remove();
}
function sendButtonSignal(addr, cmd, label) {
  if (!writer) { appendLog('Not connected — cannot send.','err'); return; }
  transmitPayload(addr, cmd, label||'Button');
}
function toggleRemoteDesc(remoteId) {
  const view = document.getElementById('rdesc-view-' + remoteId);
  const edit = document.getElementById('rdesc-edit-' + remoteId);
  if (!view || !edit) return;
  const open = edit.style.display !== 'none';
  edit.style.display = open ? 'none' : 'block';
  view.style.display = open ? '' : 'none';
  if (!open) document.getElementById('rdesc-inp-' + remoteId).focus();
}
function confirmRemoteDesc(remoteId) {
  const v = document.getElementById('rdesc-inp-' + remoteId).value.trim();
  const remote = library.find(r => r.id === remoteId);
  if (!remote) return;
  remote.desc = v;
  saveLib();
  const view = document.getElementById('rdesc-view-' + remoteId);
  if (view) {
    view.innerHTML = v ? escHtml(v) : '<span style="color:var(--text3);font-style:italic;">Add remote description...</span>';
    view.style.display = '';
  }
  const edit = document.getElementById('rdesc-edit-' + remoteId);
  if (edit) edit.style.display = 'none';
  if (currentTab === 'library') renderLibraryPane();
}

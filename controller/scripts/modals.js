let _folderParentId = null;
function openNewFolderModal(parentId, e) {
  if(e) e.stopPropagation();
  _folderParentId = parentId;
  document.getElementById('folderModalTitle').textContent = 'New Folder';
  document.getElementById('folderNameInput').value = '';
  document.getElementById('folderNameErr').textContent = '';
  document.getElementById('folderModal').classList.add('open');
  setTimeout(()=>document.getElementById('folderNameInput').focus(),50);
}
function closeFolderModal() { document.getElementById('folderModal').classList.remove('open'); }
function validateFolderName() {
  const v = document.getElementById('folderNameInput').value.trim();
  document.getElementById('folderNameErr').textContent = v ? '' : 'Name required';
  return !!v;
}
function confirmFolder() {
  if (!validateFolderName()) return;
  library.push({ type:'folder', id:genId(), name:limitName(document.getElementById('folderNameInput').value, 'folder'), parentId:_folderParentId, open:false });
  saveLib(); closeFolderModal(); renderSidebarTree();
}

let _renameType, _renameId;
function openRenameModal(e, type, id) {
  if(e) e.stopPropagation();
  _renameType=type; _renameId=id;
  const item = library.find(x=>x.id===id);
  document.getElementById('renameInput').value = item.name;
  document.getElementById('renameErr').textContent = '';
  document.getElementById('renameConfirmBtn').disabled = false;
  document.getElementById('renameModal').classList.add('open');
  setTimeout(()=>document.getElementById('renameInput').focus(),50);
}
function closeRenameModal() { document.getElementById('renameModal').classList.remove('open'); }
function validateRenameInput() {
  const v = document.getElementById('renameInput').value.trim();
  document.getElementById('renameErr').textContent = v ? '' : 'Name required';
  document.getElementById('renameConfirmBtn').disabled = !v;
  return !!v;
}
function confirmRename() {
  if (!validateRenameInput()) return;
  library.find(x=>x.id===_renameId).name = limitName(document.getElementById('renameInput').value, _renameType === 'folder' ? 'folder' : 'remote');
  saveLib(); closeRenameModal(); renderSidebarTree();
  if (currentTab==='library') renderLibraryPane();
}

let _deleteType, _deleteId;
function openDeleteModal(e, type, id) {
  if(e) e.stopPropagation();
  _deleteType=type; _deleteId=id;
  const item = library.find(x=>x.id===id);
  document.getElementById('deleteModalTitle').textContent = `Delete "${item.name}"?`;
  document.getElementById('deleteModalMsg').textContent = type==='folder'
    ? 'This deletes the folder and everything inside it.'
    : 'This deletes the remote and all its buttons.';
  document.getElementById('deleteModal').classList.add('open');
}
function closeDeleteModal() { document.getElementById('deleteModal').classList.remove('open'); }
function confirmDelete() {
  if (_deleteType==='folder') deleteFolder(_deleteId); else deleteRemote(_deleteId);
  sanitizeLibraryNavigator();
  saveLib(); closeDeleteModal(); renderSidebarTree();
  if (currentTab==='library') { if (_deleteType==='remote'&&selectedRemoteId===_deleteId) selectedRemoteId=null; renderLibraryPane(); }
}
function deleteFolder(id) {
  library.filter(x=>x.type==='folder'&&x.parentId===id).forEach(s=>deleteFolder(s.id));
  library = library.filter(x=>!(x.type==='remote'&&x.folderId===id));
  library = library.filter(x=>x.id!==id);
}
function deleteRemote(id) { library = library.filter(x=>x.id!==id); }

function openClearLibraryModal() {
  document.getElementById('clearLibraryModal').classList.add('open');
}
function closeClearLibraryModal() { document.getElementById('clearLibraryModal').classList.remove('open'); }
function confirmClearLibrary() {
  library = []; nextId = 1; saveLib();
  selectedRemoteId = null;
  libraryCurrentFolderId = null;
  libraryBackStack = [];
  closeClearLibraryModal();
  renderSidebarTree();
  if (currentTab==='library') renderLibraryPane();
  appendLog('Library cleared.', 'sys');
}

['folderModal','renameModal','deleteModal','clearLibraryModal','clearFavoritesModal','irdbFolderModal','irdbRemoteModal','webserialModal'].forEach(id => {
  document.getElementById(id).addEventListener('click', function(e){ if(e.target===this) this.classList.remove('open'); });
});

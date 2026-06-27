function switchTab(tab) {
  ['transmit','library','irdb'].forEach(t => {
    document.getElementById('pane-'+t).classList.toggle('pane-hidden', t !== tab);
    document.getElementById('tab-'+t).classList.toggle('active', t === tab);
  });
  currentTab = tab;
  if (tab === 'library') { syncLibraryViewTabs(); renderLibraryPane(); }
  if (tab === 'irdb') initIRDB();
  if (tab === 'transmit') { renderHistory(); validateInputs(); }
}

function refreshConnectedViews() {
  validateInputs();
  renderHistory();
  if (currentTab === 'library') {
    renderLibraryPane();
    return;
  }
  if (currentTab === 'irdb') {
    if (irdbData) {
      renderIRDBTree();
      if (irdbSelectedPath) {
        const selectedFile = (irdbData || []).find(node => node.path === irdbSelectedPath);
        if (selectedFile) loadIRDBFile(selectedFile);
      }
    }
  }
}

normalizeLibraryNameLimits();
switchTab('library');
renderSidebarTree();
validateInputs();
renderHistory();

document.getElementById('connectBtn').addEventListener('click', toggleConnection);
document.getElementById('sidebarToggle').addEventListener('click', function() { toggleSidebar(); });
document.getElementById('sidebarBackdrop').addEventListener('click', function() { toggleSidebar(false); });
document.querySelector('.sidebar-tree').addEventListener('click', function(e) {
  if (window.innerWidth <= 900) toggleSidebar(false);
});
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape' && document.querySelector('.sidebar.open')) toggleSidebar(false);
});
document.getElementById('btnNewFolder').addEventListener('click', function(e) { openNewFolderModal(null, e); });
document.getElementById('inputImportFiles').addEventListener('change', function() { importIRFiles(this.files, null, this); });
document.getElementById('inputImportFolder').addEventListener('change', function() { importFolder(this.files, this); });
document.getElementById('btnCollapseAll').addEventListener('click', collapseAllFolders);
document.getElementById('btnClearLibrary').addEventListener('click', openClearLibraryModal);
document.getElementById('sidebarSearch').addEventListener('input', function() { setSidebarSearch(this.value); });
document.getElementById('tab-library').addEventListener('click', function() { switchTab('library'); });
document.getElementById('tab-irdb').addEventListener('click', function() { switchTab('irdb'); });
document.getElementById('tab-transmit').addEventListener('click', function() { switchTab('transmit'); });
document.getElementById('libraryView-overview').addEventListener('click', function() { setLibraryView('overview'); });
document.getElementById('libraryView-favorites').addEventListener('click', function() { setLibraryView('favorites'); });
document.getElementById('librarySearch').addEventListener('input', function() { setLibrarySearch(this.value); });
document.getElementById('favoritesSearch').addEventListener('input', function() { favoritesSearchQuery = this.value; if (currentTab === 'library') renderLibraryPane(); });
document.getElementById('irdbSearch').addEventListener('input', filterIRDB);
document.getElementById('btnClearHistory').addEventListener('click', clearHistory);
document.getElementById('addressInput').addEventListener('input', function() { onHexInput(this); });
document.getElementById('commandInput').addEventListener('input', function() { onHexInput(this); });
document.getElementById('transmitBtn').addEventListener('click', transmitPayload);
document.getElementById('btnToggleSave').addEventListener('click', toggleSaveForm);
document.getElementById('saveNameInput').addEventListener('input', validateSaveFormName);
document.getElementById('saveNewRemoteName').addEventListener('input', validateSaveRemoteName);
document.getElementById('btnSaveManual').addEventListener('click', saveManualSignal);
document.getElementById('btnCancelSave').addEventListener('click', toggleSaveForm);
document.getElementById('logBarHeader').addEventListener('click', toggleLogBar);
document.getElementById('btnClearConsole').addEventListener('click', function(e) { clearConsole(e); });
document.getElementById('folderNameInput').addEventListener('input', validateFolderName);
document.getElementById('folderNameInput').addEventListener('keydown', function(e) { if (e.key === 'Enter') confirmFolder(); });
document.getElementById('btnFolderCancel').addEventListener('click', closeFolderModal);
document.getElementById('btnFolderConfirm').addEventListener('click', confirmFolder);
document.getElementById('renameInput').addEventListener('input', validateRenameInput);
document.getElementById('renameInput').addEventListener('keydown', function(e) { if (e.key === 'Enter') confirmRename(); });
document.getElementById('btnRenameCancel').addEventListener('click', closeRenameModal);
document.getElementById('renameConfirmBtn').addEventListener('click', confirmRename);
document.getElementById('btnDeleteCancel').addEventListener('click', closeDeleteModal);
document.getElementById('btnDeleteConfirm').addEventListener('click', confirmDelete);
document.getElementById('btnClearLibCancel').addEventListener('click', closeClearLibraryModal);
document.getElementById('clearLibraryConfirmBtn').addEventListener('click', confirmClearLibrary);
document.getElementById('btnClearFavCancel').addEventListener('click', closeClearFavoritesModal);
document.getElementById('clearFavoritesConfirmBtn').addEventListener('click', confirmClearFavorites);
document.getElementById('btnIrdbFolderCancel').addEventListener('click', closeIrdbFolderModal);
document.getElementById('irdbFolderImportBtn').addEventListener('click', confirmIRDBFolderImport);
document.getElementById('btnIrdbRemoteCancel').addEventListener('click', closeIrdbRemoteModal);
document.getElementById('irdbRemoteImportBtn').addEventListener('click', confirmIRDBRemoteImport);
document.getElementById('btnWebserialOk').addEventListener('click', closeWebserialWarning);

function parseIRFile(text) {
  const buttons = [];
  const lines = text.split('\n');
  let cur = null;
  for (let raw of lines) {
    const l = raw.trim();
    if (l.startsWith('name:')) {
      if (cur && cur.addr && cur.cmd) buttons.push(cur);
      cur = { name: l.slice(5).trim(), addr:'', cmd:'', proto:'' };
    } else if (cur && l.startsWith('protocol:')) { cur.proto = l.slice(9).trim(); }
    else if (cur && l.startsWith('address:')) { cur.addr = l.slice(8).trim().split(/\s+/).slice(0,4).join(' '); }
    else if (cur && l.startsWith('command:')) { cur.cmd  = l.slice(8).trim().split(/\s+/).slice(0,4).join(' '); }
  }
  if (cur && cur.addr && cur.cmd) buttons.push(cur);
  return buttons.filter(b => validateHex(b.addr) && validateHex(b.cmd)).map(b => ({ ...b, name: limitName(b.name, 'button'), id:genId(), desc:'', favorite:false }));
}
function importIRFiles(files, folderId=null, inputEl=null) {
  const irFiles = Array.from(files).filter(f => f.name.toLowerCase().endsWith('.ir'));
  if (!irFiles.length) {
    appendLog('No .ir files found to import.', 'sys');
    if (inputEl) inputEl.value = '';
    return;
  }
  const parentId = folderId ? parseInt(folderId) : null;
  const singleName = irFiles[0].name.replace(/\.ir$/i, '').trim();
  const folderBaseName = irFiles.length === 1 ? `${singleName} import` : `Import ${importStamp()}`;
  const importRoot = createImportFolder(folderBaseName, parentId);
  let pending = irFiles.length;
  let imported = 0;
  let skipped = 0;

  const finalize = () => {
    pending--;
    if (pending > 0) return;
    if (!imported) {
      library = library.filter(x => x.id !== importRoot.id);
      appendLog(`Import complete — 0 imported, ${skipped} skipped.`, 'sys');
    } else {
      appendLog(`Imported ${imported} remote${imported !== 1 ? 's' : ''} into "${importRoot.name}"${skipped ? ` (${skipped} skipped)` : ''}.`, 'sys');
    }
    saveLib();
    renderSidebarTree();
    if (currentTab === 'library' && selectedRemoteId == null) renderLibraryPane();
  };

  irFiles.forEach(f => {
    const reader = new FileReader();
    reader.onload = ev => {
      const rname = f.name.replace('.ir','');
      const buttons = parseIRFile(ev.target.result);
      if (!buttons.length) {
        skipped++;
        appendLog(`"${rname}" skipped — no valid NEC buttons.`,'sys');
        finalize();
        return;
      }
      library.push({ type:'remote', id:genId(), name: limitName(rname, 'remote'), folderId: importRoot.id, buttons, favorite:false, desc:'' });
      imported++;
      finalize();
    };
    reader.onerror = () => { skipped++; appendLog(`"${f.name}" failed to read.`, 'err'); finalize(); };
    reader.readAsText(f);
  });
  if (inputEl) inputEl.value = '';
}
function importFolder(files, inputEl=null) {
  if (!files.length) return;
  const fileList = Array.from(files);
  const topFolderName = fileList[0]?.webkitRelativePath?.split('/')[0] || 'Imported Folder';
  const importRoot = createImportFolder(topFolderName, null);
  const createdFolderIds = new Set([importRoot.id]);
  const folderMap = { '': importRoot.id };
  const irFiles = fileList.filter(f => f.name.toLowerCase().endsWith('.ir'));
  if (!irFiles.length) {
    library = library.filter(x => x.id !== importRoot.id);
    appendLog(`"${topFolderName}" skipped — no .ir files found.`, 'sys');
    if (inputEl) inputEl.value = '';
    return;
  }
  fileList.forEach(f => {
    const fullParts = (f.webkitRelativePath || f.name).split('/').filter(Boolean);
    const relParts = fullParts.length > 1 ? fullParts.slice(1) : fullParts;
    let parentId = importRoot.id;
    let pathKey = '';
    for (let i = 0; i < relParts.length - 1; i++) {
      const seg = relParts[i];
      pathKey = pathKey ? `${pathKey}/${seg}` : seg;
      if (!folderMap[pathKey]) {
        const folder = createFolderEntry(seg, parentId, false);
        folderMap[pathKey] = folder.id;
        createdFolderIds.add(folder.id);
      }
      parentId = folderMap[pathKey];
    }
  });
  let pending = irFiles.length;
  let imported = 0;
  let skipped = 0;
  const finalize = () => {
    pending--;
    if (pending > 0) return;
    if (!imported) {
      library = library.filter(x => !(x.type === 'folder' && createdFolderIds.has(x.id)));
      appendLog(`"${topFolderName}" imported 0 remotes (${skipped} skipped).`, 'sys');
    } else {
      appendLog(`Imported "${topFolderName}" into folder "${importRoot.name}" (${imported} remote${imported !== 1 ? 's' : ''}${skipped ? `, ${skipped} skipped` : ''}).`,'sys');
    }
    saveLib();
    renderSidebarTree();
    if (currentTab==='library' && selectedRemoteId == null) renderLibraryPane();
  };
  irFiles.forEach(f => {
    const fullParts = (f.webkitRelativePath || f.name).split('/').filter(Boolean);
    const relParts = fullParts.length > 1 ? fullParts.slice(1) : fullParts;
    const folderPath = relParts.slice(0,-1).join('/');
    const folderId = folderPath ? (folderMap[folderPath] || importRoot.id) : importRoot.id;
    const reader = new FileReader();
    reader.onload = ev => {
      const rname = f.name.replace('.ir','');
      const buttons = parseIRFile(ev.target.result);
      if (!buttons.length) { skipped++; finalize(); return; }
      library.push({ type:'remote', id:genId(), name: limitName(rname, 'remote'), folderId, buttons, favorite:false, desc:'' });
      imported++;
      finalize();
    };
    reader.onerror = () => { skipped++; finalize(); };
    reader.readAsText(f);
  });
  appendLog(`Importing "${topFolderName}" into "${importRoot.name}" (${irFiles.length} .ir file${irFiles.length !== 1 ? 's' : ''})...`,'sys');
  if (inputEl) inputEl.value = '';
}

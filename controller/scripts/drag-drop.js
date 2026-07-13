let dragItem = null;
let dragOverId = null;

function startDrag(e, type, id, label=null) {
  if (e.button !== 0) return;
  e.stopPropagation();
  if (!label) {
    const item = library.find(x => x.type === type && x.id === id);
    label = item ? item.name : `${type} ${id}`;
  }
  dragItem = { type, id };
  const ghost = document.getElementById('dragGhost');
  ghost.textContent = label;
  ghost.style.display = 'block';
  moveDragGhost(e);
  document.getElementById('dragHint').classList.add('visible');
  document.querySelectorAll('.tree-item').forEach(el => {
    const did = el.dataset.dragid;
    if (did && parseInt(did) === id) el.classList.add('dragging');
  });
  document.addEventListener('mousemove', onDragMove);
  document.addEventListener('mouseup', onDragEnd);
  e.preventDefault();
}
function moveDragGhost(e) {
  const ghost = document.getElementById('dragGhost');
  ghost.style.left = (e.clientX + 14) + 'px';
  ghost.style.top  = (e.clientY - 10) + 'px';
}
function onDragMove(e) {
  moveDragGhost(e);
  const els = document.querySelectorAll('.tree-item[data-dropid]');
  let found = null;
  els.forEach(el => {
    el.classList.remove('drag-over');
    const rect = el.getBoundingClientRect();
    if (e.clientX >= rect.left && e.clientX <= rect.right &&
        e.clientY >= rect.top  && e.clientY <= rect.bottom) {
      found = el;
    }
  });
  if (found) {
    const tid = found.dataset.dropid;
    if (dragItem && dragItem.type === 'folder' && (parseInt(tid) === dragItem.id || isDescendant(parseInt(tid), dragItem.id))) {
      dragOverId = null;
    } else {
      found.classList.add('drag-over');
      dragOverId = tid;
    }
  } else {
    dragOverId = null;
  }
  const hint = document.getElementById('dragHint');
  const hr = hint.getBoundingClientRect();
  if (e.clientX >= hr.left && e.clientX <= hr.right && e.clientY >= hr.top && e.clientY <= hr.bottom) {
    hint.style.background = 'rgba(255,183,3,0.22)';
    dragOverId = '__root__';
  } else {
    hint.style.background = '';
  }
}
function onDragEnd(e) {
  document.removeEventListener('mousemove', onDragMove);
  document.removeEventListener('mouseup', onDragEnd);
  document.getElementById('dragGhost').style.display = 'none';
  document.getElementById('dragHint').classList.remove('visible');
  document.getElementById('dragHint').style.background = '';
  document.querySelectorAll('.tree-item').forEach(el => { el.classList.remove('drag-over'); el.classList.remove('dragging'); });
  if (dragItem && dragOverId !== null) performDrop(dragItem, dragOverId);
  dragItem = null; dragOverId = null;
}
function isDescendant(folderId, ancestorId) {
  let cur = library.find(x => x.id===folderId && x.type==='folder');
  while (cur && cur.parentId != null) {
    if (cur.parentId === ancestorId) return true;
    cur = library.find(x => x.id===cur.parentId && x.type==='folder');
  }
  return false;
}
function performDrop(drag, targetId) {
  let expandedTargetId = null;
  if (drag.type === 'folder') {
    const folder = library.find(x => x.type==='folder' && x.id===drag.id);
    if (!folder) return;
    if (targetId === '__root__') {
      if (folder.parentId === null) return;
      folder.parentId = null;
    } else {
      const tid = parseInt(targetId);
      if (tid === folder.id || isDescendant(tid, folder.id)) return;
      if (folder.parentId === tid) return;
      const target = library.find(x => x.type==='folder' && x.id===tid);
      if (!target) return;
      folder.parentId = tid;
      expandedTargetId = tid;
    }
  } else if (drag.type === 'remote') {
    const remote = library.find(x => x.type==='remote' && x.id===drag.id);
    if (!remote) return;
    if (targetId === '__root__') {
      if (remote.folderId === null) return;
      remote.folderId = null;
    } else {
      const tid = parseInt(targetId);
      if (remote.folderId === tid) return;
      const target = library.find(x => x.type==='folder' && x.id===tid);
      if (!target) return;
      remote.folderId = tid;
      expandedTargetId = tid;
    }
  }
  if (expandedTargetId !== null) expandFolderInViews(expandedTargetId);
  saveLib(); renderSidebarTree();
  if (currentTab === 'library') renderLibraryPane();
}

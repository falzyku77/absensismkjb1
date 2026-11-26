/* ---------- notifikasi ---------- */
let lastBelum = null;
async function pollNotif(show) {
  const r = await api('/api/portal/notif'); setBell(r.belum);
  if (lastBelum !== null && r.belum > lastBelum) { const n = r.list.find(x => !x.dibaca); if (n) toast('🔔 ' + n.judul, 'ok'); }
  lastBelum = r.belum; if (show || $('#p-notif').classList.contains('on')) $('#ntBox').innerHTML = notifHtml(r.list);
}
$('#ntBox').onclick = async e => { const it = e.target.closest('[data-nid]'); if (!it) return; try { await api('/api/portal/notif/baca', { method: 'POST', body: { id: it.dataset.nid } }); } catch { } const l = it.dataset.link; pollNotif(true); if (l && $('#p-' + l)) nav2(l); };
$('#ntAll').onclick = async () => { await api('/api/portal/notif/baca', { method: 'POST', body: {} }); pollNotif(true); };
$('#bell').onclick = () => nav2('notif'); setBell(0);
setInterval(() => pollNotif(false).catch(() => { }), 30000); setTimeout(() => pollNotif(false).catch(() => { }), 800);

/* ---------- notifikasi (guru pelapor) ---------- */
let lastBelum = null;
async function pollNotif(show) {
  if (!PK) return; const r = await api('/api/guru/notif'); setBell(r.belum);
  if (lastBelum !== null && r.belum > lastBelum) { const n = r.list.find(x => !x.dibaca); if (n) toast('🔔 ' + n.judul, 'ok'); }
  lastBelum = r.belum; if (show || $('#p-notif').classList.contains('on')) $('#ntBox').innerHTML = notifHtml(r.list);
}
$('#ntBox').onclick = async e => { const it = e.target.closest('[data-nid]'); if (!it) return; try { await api('/api/guru/notif/baca', { method: 'POST', body: { id: it.dataset.nid } }); } catch { } pollNotif(true); };
$('#ntAll').onclick = async () => { await api('/api/guru/notif/baca', { method: 'POST', body: {} }); pollNotif(true); };
setInterval(() => pollNotif(false).catch(() => { }), 30000); setTimeout(() => pollNotif(false).catch(() => { }), 1200);

feature('notif', { label: 'Notifikasi', icon: 'bell', badge: 1 }, () => pollNotif(true), () => { if (PK) { $('#bell').style.display = ''; setBell(0); $('#bell').onclick = () => goNav('notif'); } });

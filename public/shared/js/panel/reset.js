/* ---------- reset poin (admin) ---------- */
const rsSel = new Set(); let rsData = [];
const rsCount = () => $('#rsN').textContent = rsSel.size;
async function loadReset() {
  fillKelas($('#rsKl'), 'Semua kelas');
  rsData = await api('/api/guru/rekap?kelas=' + encodeURIComponent($('#rsKl').value)); rsRender();
  const L = await api('/api/admin/poin-reset');
  $('#rsLog').innerHTML = L.length ? table(['Waktu', 'Oleh', 'Cakupan', 'Siswa', 'Pelanggaran', 'SP', ''], L.map(x => `<tr><td>${esc(fmtDT(x.at))}</td><td>${esc(x.oleh)}</td><td>${esc(x.mode)}</td><td>${x.siswa}</td><td>${x.pelanggaran}</td><td>${x.sp}</td><td>${x.batal ? '<span class="badge b-DITOLAK">Dibatalkan</span>' : `<button class="btn alt sm" data-undo="${esc(x.id)}">Batalkan reset</button>`}</td></tr>`)) : '<div class="empty">Belum pernah reset.</div>';
}
function rsRender() {
  const q = $('#rsQ').value.trim().toLowerCase(), L = rsData.filter(s => !q || s.nama.toLowerCase().includes(q));
  $('#rsList').innerHTML = L.length ? table(['', 'Siswa', 'Kelas', 'Total poin'], L.map(s => `<tr><td><input type="checkbox" data-rs="${esc(s.id)}" ${rsSel.has(s.id) ? 'checked' : ''} style="width:auto;min-height:0"></td><td><b>${esc(s.nama)}</b></td><td>${esc(s.kelas)}</td><td><b>${s.poin.total}</b></td></tr>`)) : '<div class="empty">Tidak ada siswa yang memiliki poin.</div>'; rsCount();
}
$('#rsKl').onchange = () => loadReset().catch(e => toast(e.message, 'bad')); $('#rsQ').oninput = rsRender;
$('#rsList').onchange = e => { const id = e.target.dataset.rs; if (!id) return; e.target.checked ? rsSel.add(id) : rsSel.delete(id); rsCount(); };
$('#rsSel').onclick = () => { const q = $('#rsQ').value.trim().toLowerCase(); rsData.filter(s => !q || s.nama.toLowerCase().includes(q)).forEach(s => rsSel.add(s.id)); rsRender(); };
async function doReset(body, teks) {
  if (prompt(teks + '\n\nKetik RESET untuk melanjutkan:') !== 'RESET') return;
  try { const r = await api('/api/admin/poin-reset', { method: 'POST', body }); toast(`Reset selesai: ${r.siswa} siswa, ${r.pelanggaran} pelanggaran diarsipkan.`, 'ok'); rsSel.clear(); loadReset(); } catch (e) { toast(e.message, 'bad'); }
}
$('#rsAll').onclick = () => doReset({ semua: true }, 'Poin pelanggaran SEMUA siswa akan di-reset menjadi 0.');
$('#rsGo').onclick = () => { if (!rsSel.size) return toast('Pilih siswa dahulu.', 'bad'); doReset({ sids: [...rsSel] }, `Poin ${rsSel.size} siswa terpilih akan di-reset menjadi 0.`); };
$('#rsLog').onclick = async e => { const id = e.target.dataset.undo; if (!id || !confirm('Batalkan reset ini? Poin dan SP yang diarsipkan dipulihkan.')) return; try { await api('/api/admin/poin-reset/' + id + '/batal', { method: 'POST' }); toast('Reset dibatalkan, poin dipulihkan.', 'ok'); loadReset(); } catch (er) { toast(er.message, 'bad'); } };

feature('reset', { label: 'Reset Poin', icon: 'warn' }, loadReset);

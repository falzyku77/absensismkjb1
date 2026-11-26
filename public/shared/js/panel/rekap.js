/* ---------- rekap poin ---------- */
async function loadRekap() {
  const L = await api('/api/guru/rekap?kelas=' + encodeURIComponent($('#rkKl').value));
  $('#rkList').innerHTML = L.length ? table(['Siswa', 'Kelas', 'Ringan', 'Berat', 'Total poin', ''], L.map(s => `<tr><td><div style="display:flex;gap:9px;align-items:center">${avatar(s.id, s.nama, s.foto)}<b>${esc(s.nama)}</b></div></td><td>${esc(s.kelas)}</td><td>${s.poin.ringan}</td><td>${s.poin.berat}</td><td><b>${s.poin.total}</b></td><td><button class="btn alt sm" data-hist="${esc(s.id)}" data-n="${esc(s.nama)}">Riwayat</button></td></tr>`)) : '<div class="empty">Belum ada siswa yang memiliki poin pelanggaran.</div>';
}
$('#rkKl').onchange = () => loadRekap().catch(e => toast(e.message, 'bad'));
$('#rkList').onclick = async e => {
  const id = e.target.dataset.hist; if (!id) return; const L = await api('/api/guru/pelanggaran?sid=' + id);
  $('#dhT').textContent = 'Riwayat pelanggaran: ' + e.target.dataset.n; $('#dhB').innerHTML = L.length ? table(['Tanggal', 'Pelanggaran', 'Jenis', 'Poin', 'Oleh', ''], pelRows(L)) : '<div class="empty">Kosong.</div>'; $('#dh').showModal();
};

feature('rekap', { label: 'Rekap Poin', icon: 'chart' }, loadRekap, () => { fillKelas($('#rkKl'), 'Semua kelas saya'); if (KES) $('#rkKl').options[0].textContent = 'Semua kelas'; });

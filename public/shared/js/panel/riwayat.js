/* ---------- riwayat pelanggaran ---------- */
async function loadRiwayat() {
  const L = await api('/api/guru/pelanggaran?kelas=' + encodeURIComponent($('#rwKl').value));
  $('#rwList').innerHTML = L.length ? table(['Tanggal', 'Siswa', 'Pelanggaran', 'Jenis', 'Poin', 'Oleh', ''], pelRows(L, 'all')) : '<div class="empty">Belum ada data pelanggaran.</div>';
}
$('#rwKl').onchange = () => loadRiwayat().catch(e => toast(e.message, 'bad'));

feature('riwayat', { label: 'Riwayat Pelanggaran', icon: 'clock' }, loadRiwayat, () => { fillKelas($('#rwKl'), 'Semua kelas saya'); if (KES) $('#rwKl').options[0].textContent = 'Semua kelas'; });

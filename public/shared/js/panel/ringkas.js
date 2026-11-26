/* ---------- ringkasan ---------- */
async function loadRingkas() {
  await refreshCount(); const s = KES ? 'seluruh sekolah' : 'kelas ' + R.kelas.join(', ');
  $('#hiTitle').textContent = 'Halo, ' + R.nama; $('#hiText').textContent = `Anda masuk sebagai ${R.peran} (${s}).`;
  $('#rkStat').innerHTML = `<div class="stat warn"><small>Pengajuan izin menunggu</small><b>${R.izinMenunggu}</b></div><div class="stat warn"><small>Laporan siswa menunggu</small><b>${R.laporanMenunggu}</b></div><div class="stat bad"><small>Pelanggaran bulan ini</small><b>${R.pelanggaranBulanIni}</b></div>`;
  const p = await api('/api/guru/pengaturan'); $('#rkA').textContent = p.spAmbang.map((a, i) => 'SP-' + (i + 1) + ' = ' + a).join(', ');
}

feature('ringkas', { label: 'Ringkasan', icon: 'home' }, loadRingkas, () => { $('#rkR').textContent = R.poin.RINGAN; $('#rkB').textContent = R.poin.BERAT; });

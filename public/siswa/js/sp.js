/* ---------- surat peringatan ---------- */
async function loadSP() {
  const L = await api('/api/portal/sp');
  $('#spBox').innerHTML = L.length ? table(['Nomor', 'Tingkat', 'Total poin', 'Tanggal', ''], L.map(x => `<tr><td><small>${esc(x.nomor)}</small></td><td><span class="badge b-BERAT">SP-${x.level}</span></td><td><b>${x.total}</b></td><td>${esc(fmtTgl(x.diterbitkan || x.tanggal))}</td><td><a class="btn alt sm" target="_blank" href="/sp/?id=${esc(x.id)}">Lihat / Cetak</a></td></tr>`)) : '<div class="empty">Belum ada Surat Peringatan. Pertahankan kedisiplinan Anda!</div>';
}

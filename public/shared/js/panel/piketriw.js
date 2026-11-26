/* ---------- laporan saya (guru pelapor) ---------- */
async function loadPkRiw() {
  const L = await api('/api/guru/piket');
  $('#pkList').innerHTML = L.length ? L.map(x => `<div class="item"><div class="info"><h3>${esc(x.nama)} <span class="meta">· ${esc(x.kelas)}</span></h3><div class="meta">${esc(x.saran ? x.saran.judul + ' (' + x.saran.jenis.toLowerCase() + ')' : '')} · ${esc(fmtDT(x.dibuat))}</div><p>${esc(x.deskripsi)}</p>${bukti(x.bukti)}</div><div class="act">${badge(x.status)}${x.catatan ? `<div class="hint">${esc(x.catatan)}</div>` : ''}</div></div>`).join('') : '<div class="empty">Belum ada laporan.</div>';
}

feature('piketriw', { label: 'Laporan Saya', icon: 'clock' }, loadPkRiw);

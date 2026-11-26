/* ---------- riwayat absen ---------- */
async function loadAbs() {
  const r = await api('/api/portal/absen'), c = r.count;
  $('#absStat').innerHTML = [['ok', 'Hadir', c.HADIR], ['warn', 'Terlambat', c.TERLAMBAT || 0], ['', 'Izin', c.IZIN], ['', 'Sakit', c.SAKIT], ['bad', 'Alfa', c.ALFA]].map(x => `<div class="stat ${x[0]}"><small>${x[1]}</small><b>${x[2]}</b></div>`).join('');
  $('#absBox').innerHTML = r.list.length ? table(['Tanggal', 'Sesi', 'Status', 'Jam'], r.list.map(x => `<tr><td>${esc(fmtTgl(x.date))}</td><td>${esc(x.session)}</td><td>${badge(x.status)}${x.telat ? ' <span class="badge b-RINGAN">Terlambat</span>' : ''}</td><td>${esc(x.time)}</td></tr>`)) : '<div class="empty">Belum ada catatan absen.</div>';
}

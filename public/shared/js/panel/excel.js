/* ---------- rekap excel ---------- */
const xlUrl = () => `/api/guru/rekap-excel?bulan=${encodeURIComponent($('#xlBln').value)}&shift=${$('#xlSh').value}&kelas=${encodeURIComponent(KELAS.includes($('#xlKl').value.trim()) ? $('#xlKl').value.trim() : '')}`;
async function loadExcel() {
  if (!$('#xlBln').value) $('#xlBln').value = hariIni().slice(0, 7);
  $('#xlKlList').innerHTML = KELAS.map(k => `<option value="${esc(k)}">`).join('');
  const p = await api('/api/guru/pengaturan'), pg = KELAS.filter(k => p.kelasShift[k] !== 'siang'), sg = KELAS.filter(k => p.kelasShift[k] === 'siang');
  $('#xlSesi').innerHTML = `<div class="alert info" style="margin:0"><b>Masuk Pagi (${pg.length} kelas):</b> ${esc(pg.join(', ') || '-')}<br><b>Masuk Siang (${sg.length} kelas):</b> ${esc(sg.join(', ') || '-')}</div>`;
  const L = await api('/api/guru/rekap-excel/daftar');
  $('#xlList').innerHTML = L.length ? table(['Bulan', 'Ukuran', 'Dibuat', ''], L.map(x => `<tr><td><b>${esc(x.bulan)}</b></td><td>${Math.round(x.ukuran / 1024)} KB</td><td>${esc(fmtDT(x.dibuat))}</td><td><a class="btn alt sm" href="/api/guru/rekap-excel/file/${esc(x.bulan)}">Unduh</a></td></tr>`)) : '<div class="empty">Belum ada rekap otomatis (dibuat setelah bulan berjalan berganti).</div>';
}
$('#xlGo').onclick = e => { e.preventDefault(); location = xlUrl(); };

feature('excel', { label: 'Rekap Excel', icon: 'chart' }, loadExcel);

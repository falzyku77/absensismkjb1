/* ---------- poin & riwayat pelanggaran ---------- */
async function loadPel() {
  const r = await api('/api/portal/pelanggaran'), p = r.poin, tgt = p.next || p.spAmbang[p.spAmbang.length - 1], pct = Math.max(0, Math.min(100, Math.round(p.total / tgt * 100)));
  $('#poinBox').innerHTML = `<div class="grid"><div class="stat bad"><small>Total poin pelanggaran</small><b>${p.total}</b></div><div class="stat warn"><small>Pelanggaran ringan</small><b>${p.ringan}</b></div><div class="stat bad"><small>Pelanggaran berat</small><b>${p.berat}</b></div></div>
   <div class="bar" title="${pct}%"><i style="width:${pct}%;background:${pct < 50 ? 'var(--ok)' : pct < 80 ? 'var(--warn)' : 'var(--bad)'}"></i></div><p class="hint">${p.next ? `${p.total} dari ${p.next} poin menuju Surat Peringatan SP-${p.sp + 1}.` : `Anda sudah mencapai batas tertinggi (SP-${p.sp}).`} Semakin sedikit poin, semakin baik.</p>`;
  $('#pelBox').innerHTML = r.list.length ? table(['Tanggal', 'Pelanggaran', 'Jenis', 'Poin', 'Keterangan', 'Bukti', 'Dilaporkan oleh'], r.list.map(x => `<tr><td>${esc(fmtTgl(x.tanggal))}</td><td><b>${esc(x.judul)}</b></td><td>${badge(x.jenis)}</td><td><b>+${x.poin}</b></td><td>${esc(x.catatan)}</td><td>${bukti(x.bukti)}</td><td><small>${esc(x.dari)}</small></td></tr>`)) : '<div class="empty">Belum ada pelanggaran. Pertahankan!</div>';
}

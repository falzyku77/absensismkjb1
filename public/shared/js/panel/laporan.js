/* ---------- laporan ---------- */
async function loadLaporan() {
  const L = await api('/api/guru/laporan?status=' + $('#lpSt').value); refreshCount().catch(() => { });
  const need = L.filter(x => x.status === 'MENUNGGU' && !x.sid && x.kelas), cache = {};
  for (const k of [...new Set(need.map(x => x.kelas))]) cache[k] = await api('/api/guru/siswa?kelas=' + encodeURIComponent(k));
  $('#lpList').innerHTML = L.length ? L.map(x => `<div class="item" data-id="${esc(x.id)}">
    ${avatar(x.sid, x.nama, x.foto)}
    <div class="info"><h3>${esc(x.nama || '(nama belum diketahui)')} <span class="meta">· ${esc(x.kelas || 'kelas belum diketahui')}</span></h3>
      <div class="meta">Dilaporkan oleh <b>${esc(x.pelaporNama)}</b> (${esc(x.pelaporKelas)}) · ${esc(fmtDT(x.dibuat))}</div>
      <p>${esc(x.deskripsi)}</p>${bukti(x.bukti)}
      ${x.status !== 'MENUNGGU' ? `<div class="meta" style="margin-top:8px">${badge(x.status)} oleh ${esc(x.oleh)}${x.catatan ? ' — ' + esc(x.catatan) : ''}</div>` : ''}</div>
    ${x.status === 'MENUNGGU' ? `<div class="act">
      ${x.sid ? '' : `<div class="hint" style="margin:0">Identitas siswa belum pasti. Cek foto bukti, lalu pilih siswanya:</div><select class="kk"><option value="">Pilih kelas…</option>${KELAS.map(k => `<option${k === x.kelas ? ' selected' : ''}>${esc(k)}</option>`).join('')}</select><select class="pilih"><option value="">Pilih siswa yang dimaksud…</option>${(cache[x.kelas] || []).map(s => `<option value="${esc(s.id)}">${esc(s.nama)}</option>`).join('')}</select>`}
      <label class="hint" style="margin:0">Keterangan yang tampil di halaman siswa (pelapor tetap anonim):<textarea class="pub" maxlength="600" style="min-height:64px">${esc(x.deskripsi)}</textarea></label>
      <select class="jn"><option value="RINGAN"${x.saran && x.saran.jenis === 'RINGAN' ? ' selected' : ''}>Ringan (+${R.poin.RINGAN})</option><option value="BERAT"${x.saran && x.saran.jenis === 'BERAT' ? ' selected' : ''}>Berat (+${R.poin.BERAT})</option></select>
      <select class="jd">${judulOpts(x.saran ? x.saran.jenis : 'RINGAN', x.saran && x.saran.judul)}</select><input class="lain" placeholder="Tulis pelanggaran" maxlength="80" style="${x.saran && !(PRESET[x.saran.jenis] || []).includes(x.saran.judul) ? '' : 'display:none'}" value="${x.saran && !(PRESET[x.saran.jenis] || []).includes(x.saran.judul) ? esc(x.saran.judul) : ''}">
      <input class="cat" placeholder="Catatan (opsional)" maxlength="300">
      <button class="btn ok" data-a="terima">Terima &amp; beri poin</button><button class="btn ghost" data-a="tolak">Tolak laporan</button></div>` : ''}</div>`).join('') : '<div class="card empty">Tidak ada laporan.</div>';
}
$('#lpSt').onchange = () => loadLaporan().catch(e => toast(e.message, 'bad'));
$('#lpList').onchange = e => {
  const it = e.target.closest('.item'); if (!it) return;
  if (e.target.classList.contains('kk')) { const ps = $('.pilih', it); ps.innerHTML = '<option value="">Memuat…</option>'; api('/api/guru/siswa?kelas=' + encodeURIComponent(e.target.value)).then(L => { ps.innerHTML = '<option value="">Pilih siswa yang dimaksud…</option>' + L.map(s => `<option value="${esc(s.id)}">${esc(s.nama)}</option>`).join(''); }).catch(er => toast(er.message, 'bad')); return; }
  if (e.target.classList.contains('jn')) $('.jd', it).innerHTML = judulOpts(e.target.value);
  if (e.target.classList.contains('jd') || e.target.classList.contains('jn')) $('.lain', it).style.display = $('.jd', it).value === '__lain' ? '' : 'none';
};
$('#lpList').onclick = async e => {
  const a = e.target.dataset.a; if (!a) return; const it = e.target.closest('.item'); let judul = $('.jd', it) ? $('.jd', it).value : '';
  if (judul === '__lain') judul = $('.lain', it).value.trim();
  const body = { aksi: a, publik: $('.pub', it) ? $('.pub', it).value : '', catatan: $('.cat', it).value, jenis: $('.jn', it) && $('.jn', it).value, judul, sid: $('.pilih', it) ? $('.pilih', it).value : '' };
  if (a === 'terima' && !confirm('Terima laporan ini dan tambahkan poin pelanggaran ke siswa?')) return;
  e.target.disabled = true;
  try { await api('/api/guru/laporan/' + it.dataset.id, { method: 'PUT', body }); toast(a === 'terima' ? 'Laporan diterima, poin ditambahkan.' : 'Laporan ditolak.', 'ok'); loadLaporan(); }
  catch (er) { toast(er.message, 'bad'); e.target.disabled = false; }
};

feature('laporan', { label: 'Laporan Pelanggaran', icon: 'flag', badge: 1 }, loadLaporan);

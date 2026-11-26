/* ---------- pengajuan izin ---------- */
const izF = $('#izForm'); izF.tanggal.min = hariIni(); izF.tanggal.value = hariIni();
izF.bukti.onchange = async () => {
  picIz = null; $('#izPrev').style.display = 'none'; const f = izF.bukti.files[0]; if (!f) return;
  try { picIz = await readImg(f); $('#izPrev').src = picIz; $('#izPrev').style.display = 'block'; } catch (e) { toast(e.message, 'bad'); izF.bukti.value = ''; }
};
izF.onsubmit = async e => {
  e.preventDefault(); const m = $('#izMsg'); m.className = 'msg';
  if (!picIz) { m.classList.add('bad'); m.textContent = 'Foto surat / bukti izin wajib diunggah. Tanpa foto, izin tidak bisa diajukan.'; return; }
  if (izF.alasan.value.trim().length < 5) { m.classList.add('bad'); m.textContent = 'Alasan lengkap wajib diisi.'; return; }
  $('#izBtn').disabled = true;
  try { await api('/api/portal/izin', { method: 'POST', body: { tanggal: izF.tanggal.value, tipe: izF.tipe.value, alasan: izF.alasan.value, bukti: picIz } });
    m.classList.add('ok'); m.textContent = 'Pengajuan terkirim. Tunggu persetujuan wali kelas / kesiswaan.'; izF.alasan.value = ''; izF.bukti.value = ''; picIz = null; $('#izPrev').style.display = 'none'; loadIzin(); }
  catch (er) { m.classList.add('bad'); m.textContent = er.message; }
  $('#izBtn').disabled = false;
};
async function loadIzin() {
  const L = await api('/api/portal/izin');
  $('#izList').innerHTML = L.length ? table(['Tanggal', 'Tipe', 'Alasan', 'Bukti', 'Status', ''], L.map(x => `<tr><td>${esc(fmtTgl(x.tanggal))}</td><td>${badge(x.tipe)}</td><td style="min-width:160px">${esc(x.alasan)}</td><td>${bukti(x.bukti)}</td>
    <td>${badge(x.status)}${x.catatan ? `<div class="hint">${esc(x.catatan)}</div>` : ''}${x.oleh && x.status !== 'MENUNGGU' ? `<div class="hint">oleh ${esc(x.oleh)}</div>` : ''}</td>
    <td>${x.status === 'MENUNGGU' ? `<button class="btn ghost sm" data-batal="${esc(x.id)}">Batalkan</button>` : ''}</td></tr>`)) : '<div class="empty">Belum ada pengajuan.</div>';
}
$('#izList').onclick = async e => { const id = e.target.dataset.batal; if (!id || !confirm('Batalkan pengajuan ini?')) return; try { await api('/api/portal/izin/' + id, { method: 'DELETE' }); loadIzin(); } catch (er) { toast(er.message, 'bad'); } };

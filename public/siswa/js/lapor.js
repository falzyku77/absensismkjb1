/* ---------- lapor pelanggaran ---------- */
const lpF = $('#lpForm');
async function loadKelas() { const k = await api('/api/portal/kelas'); lpF.kelas.innerHTML = '<option value="">Pilih kelas…</option>' + k.map(x => `<option>${esc(x)}</option>`).join(''); }
lpF.kelas.onchange = async () => { lpF.nama.value = ''; $('#lpNama').innerHTML = ''; if (!lpF.kelas.value) return; try { const n = await api('/api/portal/nama?kelas=' + encodeURIComponent(lpF.kelas.value)); $('#lpNama').innerHTML = n.map(x => `<option value="${esc(x)}">`).join(''); } catch (e) { toast(e.message, 'bad'); } };
lpF.bukti.onchange = async () => {
  picLp = null; $('#lpPrev').style.display = 'none'; const f = lpF.bukti.files[0]; if (!f) return;
  try { picLp = await readImg(f); $('#lpPrev').src = picLp; $('#lpPrev').style.display = 'block'; } catch (e) { toast(e.message, 'bad'); lpF.bukti.value = ''; }
};
lpF.onsubmit = async e => {
  e.preventDefault(); const m = $('#lpMsg'); m.className = 'msg';
  if (!picLp) { m.classList.add('bad'); m.textContent = 'Foto bukti pelanggaran wajib diunggah.'; return; }
  $('#lpBtn').disabled = true;
  try { await api('/api/portal/lapor', { method: 'POST', body: { nama: lpF.nama.value, kelas: lpF.kelas.value, deskripsi: lpF.deskripsi.value, bukti: picLp } });
    m.classList.add('ok'); m.textContent = 'Laporan terkirim. Terima kasih, akan diperiksa kesiswaan / wali kelas.'; lpF.reset(); picLp = null; $('#lpPrev').style.display = 'none'; $('#lpNama').innerHTML = ''; loadLapor(); }
  catch (er) { m.classList.add('bad'); m.textContent = er.message; }
  $('#lpBtn').disabled = false;
};
async function loadLapor() {
  const L = await api('/api/portal/lapor');
  $('#lpList').innerHTML = L.length ? table(['Dilaporkan', 'Kelas', 'Isi laporan', 'Bukti', 'Status'], L.map(x => `<tr><td><b>${esc(x.nama || '(tidak diketahui)')}</b></td><td>${esc(x.kelas || '-')}</td><td style="min-width:160px">${esc(x.deskripsi)}<div class="hint">${esc(fmtDT(x.dibuat))}</div></td><td>${bukti(x.bukti)}</td><td>${badge(x.status)}${x.catatan ? `<div class="hint">${esc(x.catatan)}</div>` : ''}</td></tr>`)) : '<div class="empty">Belum ada laporan.</div>';
}

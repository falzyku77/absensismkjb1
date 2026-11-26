/* ---------- profil ---------- */
async function loadMe() {
  try { ME = await api('/api/portal/me'); } catch (e) { toast(e.message, 'bad'); return; }
  $('#who').innerHTML = avatar(ME.id, ME.nama, ME.foto) + `<div><b>${esc(ME.nama)}</b><small>${esc(ME.kelas)}</small></div>`;
  $('#pfAvatar').innerHTML = avatar(ME.id, ME.nama, ME.foto, 'lg');
  $('#pfInfo').innerHTML = `<dt>Nama</dt><dd>${esc(ME.nama)}</dd><dt>Kelas</dt><dd>${esc(ME.kelas)}</dd><dt>Jurusan</dt><dd>${esc(ME.jurusan)}</dd><dt>Kode kartu</dt><dd>${esc(ME.id)}</dd>`;
  $('#fotoDel').style.display = ME.foto ? '' : 'none';
  if (ME.defaultPw) { $$('#menu a').forEach(a => a.style.display = a.dataset.p === 'profil' ? '' : 'none'); $$('#p-profil .card, #pfStat').forEach(e => { if (!e.querySelector('#pwForm')) e.style.display = 'none'; }); if (location.hash !== '#profil') nav2('profil'); }
  $('#pwWarn').innerHTML = ME.defaultPw ? '<div class="alert warn"><b>Wajib ganti password.</b> Password Anda masih sama dengan kode kartu. Buat password baru di bawah ini untuk bisa memakai portal.</div>' : '';
  $('#pfStat').innerHTML = `<div class="stat bad"><small>Poin pelanggaran</small><b>${ME.poin.total}</b></div><div class="stat ${ME.poin.sp ? 'bad' : 'ok'}"><small>${ME.poin.next ? 'Batas SP berikutnya' : 'Tingkat SP'}</small><b>${ME.poin.next ? ME.poin.next + ' poin' : 'SP-' + ME.poin.sp}</b></div>`;
  $('#aRingan').textContent = ME.aturan.RINGAN; $('#aBerat').textContent = ME.aturan.BERAT;
  $('[name=nama]', $('#izForm')).value = ME.nama; $('[name=kelas]', $('#izForm')).value = ME.kelas;
}
$('#fotoBtn').onclick = () => $('#fotoIn').click();
$('#fotoIn').onchange = async e => {
  const f = e.target.files[0], m = $('#fotoMsg'); e.target.value = ''; if (!f) return; m.className = 'msg'; m.textContent = 'Mengunggah…';
  try { const img = await readImg(f, { max: 640, square: true, q: .85 }); await api('/api/portal/foto', { method: 'POST', body: { img } }); FV = Date.now(); m.className = 'msg ok'; m.textContent = 'Foto berhasil disimpan.'; loadMe(); }
  catch (er) { m.className = 'msg bad'; m.textContent = er.message; }
};
$('#fotoDel').onclick = async () => { if (!confirm('Hapus foto profil?')) return; try { await api('/api/portal/foto', { method: 'DELETE' }); FV = Date.now(); $('#fotoMsg').textContent = ''; loadMe(); } catch (e) { toast(e.message, 'bad'); } };
$('#pwForm').onsubmit = async e => {
  e.preventDefault(); const f = e.target, m = $('#pwMsg'); m.className = 'msg';
  if (f.baru.value !== f.ulang.value) { m.classList.add('bad'); m.textContent = 'Password baru dan pengulangan tidak sama.'; return; }
  try { await api('/api/portal/password', { method: 'PUT', body: { lama: f.lama.value, baru: f.baru.value } }); m.classList.add('ok'); m.textContent = 'Password berhasil diganti.'; f.reset(); setTimeout(() => location.reload(), 600); }
  catch (er) { m.classList.add('bad'); m.textContent = er.message; }
};

/* ---------- pengaturan poin & SP (admin) ---------- */
async function loadSet() {
  const p = await api('/api/guru/pengaturan'), f = $('#setForm');
  [f.sp1.value, f.sp2.value, f.sp3.value] = p.spAmbang; f.kodeSurat.value = p.kodeSurat || ''; f.kepsek.value = p.kepsek || ''; f.kesiswaan.value = p.kesiswaan || '';
}
$('#setForm').onsubmit = async e => {
  e.preventDefault(); const f = e.target, m = $('#setMsg'); m.className = 'msg';
  try { await api('/api/guru/pengaturan', { method: 'PUT', body: { spAmbang: [f.sp1.value, f.sp2.value, f.sp3.value], kodeSurat: f.kodeSurat.value, kepsek: f.kepsek.value, kesiswaan: f.kesiswaan.value } }); m.classList.add('ok'); m.textContent = 'Pengaturan disimpan.'; }
  catch (er) { m.classList.add('bad'); m.textContent = er.message; }
};

feature('set', { label: 'Pengaturan Poin & SP', icon: 'set' }, loadSet);

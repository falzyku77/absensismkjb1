/* ---------- sesi masuk & terlambat (kesiswaan / admin) ---------- */
async function loadSesi() {
  const p = await api('/api/guru/pengaturan'), jd = await api('/api/guru/jadwal');
  $('#jdList').innerHTML = jd.list.length ? table(['Sesi', 'Jam', 'Untuk kelas', 'Batas terlambat'], jd.list.map(x => `<tr><td><b>${esc(x.name)}</b>${jd.cur === x.name ? ' <span class="badge b-DISETUJUI">sedang berlangsung</span>' : ''}</td><td>${esc(x.start)}–${esc(x.end)}</td><td>${x.shift ? 'Masuk ' + esc(x.shift) : 'Semua kelas'}</td><td>${x.batas ? esc(x.batas) : '<span class="hint">tidak diatur</span>'}</td></tr>`)) : '<div class="empty">Jadwal belum diatur.</div>';
  $('#shiftList').innerHTML = KELAS.map(k => `<label class="f" style="padding:8px 10px;border:1px solid var(--line);border-radius:10px">${esc(k)}<select data-k="${esc(k)}"><option value="pagi"${p.kelasShift[k] === 'siang' ? '' : ' selected'}>Masuk Pagi</option><option value="siang"${p.kelasShift[k] === 'siang' ? ' selected' : ''}>Masuk Siang</option></select></label>`).join('');
  const n = jd.list.filter(x => x.batas).length;
  $('#setHint').textContent = n ? `Terlambat aktif di ${n} sesi. Kelas yang masuk pagi hanya bisa scan di sesi untuk kelas pagi (atau sesi untuk semua kelas), begitu juga kelas siang.` : 'Batas terlambat belum diisi di Jam Absen (Dashboard admin), jadi terlambat otomatis belum aktif.';
}
$('#shAllP').onclick = () => $$('#shiftList select').forEach(s => s.value = 'pagi'); $('#shAllS').onclick = () => $$('#shiftList select').forEach(s => s.value = 'siang');
$('#sesiForm').onsubmit = async e => {
  e.preventDefault(); const m = $('#sesiMsg'); m.className = 'msg'; const ks = {}; $$('#shiftList select').forEach(s => ks[s.dataset.k] = s.value);
  try { await api('/api/guru/sesi', { method: 'PUT', body: { kelasShift: ks } }); m.classList.add('ok'); m.textContent = 'Kelas pagi/siang disimpan.'; loadSesi(); }
  catch (er) { m.classList.add('bad'); m.textContent = er.message; }
};

feature('sesi', { label: 'Sesi Masuk & Terlambat', icon: 'clock' }, loadSesi);

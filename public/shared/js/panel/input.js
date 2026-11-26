let pickSid = null;
function fillJudul() { $('#pelForm').judul.innerHTML = judulOpts($('#pelForm').jenis.value); }
/* ---------- input pelanggaran ---------- */
let inT;
async function loadPick() {
  const L = await api(`/api/guru/siswa?kelas=${encodeURIComponent($('#inKl').value)}&q=${encodeURIComponent($('#inQ').value)}`);
  $('#inPick').innerHTML = L.length ? L.map(s => `<button type="button" data-sid="${esc(s.id)}" class="${s.id === pickSid ? 'on' : ''}">${avatar(s.id, s.nama, s.foto)}<span><b>${esc(s.nama)}</b><small>${esc(s.kelas)} · poin ${s.poin.total}</small></span></button>`).join('') : '<div class="empty" style="grid-column:1/-1">Siswa tidak ditemukan.</div>';
  $('#inPick').dataset.list = JSON.stringify(L.map(s => [s.id, s.nama, s.kelas]));
}
$('#inKl').onchange = () => loadPick().catch(e => toast(e.message, 'bad'));
$('#inQ').oninput = () => { clearTimeout(inT); inT = setTimeout(() => loadPick().catch(() => { }), 250); };
$('#inPick').onclick = e => {
  const b = e.target.closest('[data-sid]'); if (!b) return; pickSid = b.dataset.sid;
  const s = JSON.parse($('#inPick').dataset.list).find(x => x[0] === pickSid); $$('#inPick button').forEach(x => x.classList.toggle('on', x === b));
  $('#inForm').style.display = ''; $('#inWho').textContent = s ? `Pelanggaran: ${s[1]} (${s[2]})` : ''; $('#inMsg').textContent = ''; $('#inForm').scrollIntoView({ behavior: 'smooth', block: 'center' });
};
const pf = $('#pelForm');
pf.jenis.onchange = () => { fillJudul(); pf.judul.onchange(); };
pf.judul.onchange = () => { $('#inLainW').style.display = pf.judul.value === '__lain' ? '' : 'none'; };
pf.onsubmit = async e => {
  e.preventDefault(); const m = $('#inMsg'); m.className = 'msg'; const judul = pf.judul.value === '__lain' ? pf.lain.value.trim() : pf.judul.value;
  if (!pickSid) { m.classList.add('bad'); m.textContent = 'Pilih siswa dahulu.'; return; }
  try { const r = await api('/api/guru/pelanggaran', { method: 'POST', body: { sid: pickSid, jenis: pf.jenis.value, judul, tanggal: pf.tanggal.value, catatan: pf.catatan.value } });
    m.classList.add('ok'); m.textContent = `Tersimpan: ${r.nama} +${r.poin} poin.`; pf.catatan.value = ''; pf.lain.value = ''; loadPick(); }
  catch (er) { m.classList.add('bad'); m.textContent = er.message; }
};

feature('input', { label: 'Input Pelanggaran', icon: 'plus' }, loadPick, () => {
  fillKelas($('#inKl'), 'Semua kelas'); fillJudul(); $('#pelForm').tanggal.value = hariIni(); $('#pelForm').tanggal.max = hariIni();
});

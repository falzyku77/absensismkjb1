/* ---------- guru piket ---------- */
let pkSid = null, pkPic = null, pkT; const pkF = $('#pkF');
async function loadPkPick() {
  const L = await api(`/api/guru/siswa?kelas=${encodeURIComponent($('#pkKl').value)}&q=${encodeURIComponent($('#pkQ').value)}`);
  $('#pkPick').innerHTML = L.length ? L.map(s => `<button type="button" data-sid="${esc(s.id)}" data-n="${esc(s.nama)} (${esc(s.kelas)})" class="${s.id === pkSid ? 'on' : ''}">${avatar(s.id, s.nama, s.foto)}<span><b>${esc(s.nama)}</b><small>${esc(s.kelas)}</small></span></button>`).join('') : '<div class="empty" style="grid-column:1/-1">Siswa tidak ditemukan.</div>';
}
$('#pkKl').onchange = () => loadPkPick().catch(e => toast(e.message, 'bad'));
$('#pkQ').oninput = () => { clearTimeout(pkT); pkT = setTimeout(() => loadPkPick().catch(() => { }), 250); };
$('#pkPick').onclick = e => { const b = e.target.closest('[data-sid]'); if (!b) return; pkSid = b.dataset.sid; $$('#pkPick button').forEach(x => x.classList.toggle('on', x === b)); $('#pkForm').style.display = ''; $('#pkWho').textContent = 'Melaporkan: ' + b.dataset.n; $('#pkMsg').textContent = ''; $('#pkForm').scrollIntoView({ behavior: 'smooth', block: 'center' }); };
const pkJudul = () => { pkF.judul.innerHTML = judulOpts(pkF.jenis.value); $('#pkLainW').style.display = pkF.judul.value === '__lain' ? '' : 'none'; };
pkF.jenis.onchange = pkJudul; pkF.judul.onchange = () => { $('#pkLainW').style.display = pkF.judul.value === '__lain' ? '' : 'none'; };
pkF.bukti.onchange = async () => { pkPic = null; $('#pkPrev').style.display = 'none'; const f = pkF.bukti.files[0]; if (!f) return; try { pkPic = await readImg(f); $('#pkPrev').src = pkPic; $('#pkPrev').style.display = 'block'; } catch (e) { toast(e.message, 'bad'); pkF.bukti.value = ''; } };
pkF.onsubmit = async e => {
  e.preventDefault(); const m = $('#pkMsg'); m.className = 'msg'; const judul = pkF.judul.value === '__lain' ? pkF.lain.value.trim() : pkF.judul.value;
  if (!pkSid) { m.classList.add('bad'); m.textContent = 'Pilih siswa dahulu.'; return; }
  try { await api('/api/guru/piket', { method: 'POST', body: { sid: pkSid, jenis: pkF.jenis.value, judul, deskripsi: pkF.deskripsi.value, bukti: pkPic } });
    m.classList.add('ok'); m.textContent = 'Terkirim ke Kesiswaan.'; pkF.deskripsi.value = ''; pkF.lain.value = ''; pkF.bukti.value = ''; pkPic = null; $('#pkPrev').style.display = 'none'; }
  catch (er) { m.classList.add('bad'); m.textContent = er.message; }
};
function loadPiket() { if (!$('#pkPick').children.length) loadPkPick().catch(e => toast(e.message, 'bad')); pkJudul(); }

feature('piket', { label: 'Lapor Pelanggaran Siswa', icon: 'flag' }, loadPiket, () => fillKelas($('#pkKl'), 'Semua kelas'));

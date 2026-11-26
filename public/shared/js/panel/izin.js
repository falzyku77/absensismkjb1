/* ---------- izin ---------- */
async function loadIzin() {
  const L = await api(`/api/guru/izin?status=${$('#izSt').value}&kelas=${encodeURIComponent($('#izKl').value)}`); refreshCount().catch(() => { });
  $('#izList').innerHTML = L.length ? L.map(x => `<div class="item" data-id="${esc(x.id)}">
    ${avatar(x.sid, x.nama, x.foto)}
    <div class="info"><h3>${esc(x.nama)} <span class="meta">· ${esc(x.kelas)}</span></h3>
      <div class="meta">${badge(x.tipe)} untuk <b>${esc(fmtTgl(x.tanggal))}</b> · diajukan ${esc(fmtDT(x.dibuat))}</div>
      <p>${esc(x.alasan)}</p>${bukti(x.bukti)}
      ${x.status !== 'MENUNGGU' ? `<div class="meta" style="margin-top:8px">${badge(x.status)} oleh ${esc(x.oleh)}${x.catatan ? ' — ' + esc(x.catatan) : ''}</div>` : ''}</div>
    <div class="act">${x.status === 'MENUNGGU' ? `<input class="cat" placeholder="Catatan (wajib jika ditolak)" maxlength="300"><button class="btn ok" data-a="setuju">Setujui</button><button class="btn ghost" data-a="tolak">Tolak</button>`
      : `<button class="btn alt sm" data-a="batal">Batalkan keputusan</button>`}</div></div>`).join('') : '<div class="card empty">Tidak ada pengajuan.</div>';
}
$('#izSt').onchange = $('#izKl').onchange = () => loadIzin().catch(e => toast(e.message, 'bad'));
$('#izList').onclick = async e => {
  const a = e.target.dataset.a; if (!a) return; const it = e.target.closest('.item'), cat = $('.cat', it);
  if (a === 'batal' && !confirm('Kembalikan pengajuan ini ke status menunggu? Status absen siswa dikembalikan.')) return;
  e.target.disabled = true;
  try { await api('/api/guru/izin/' + it.dataset.id, { method: 'PUT', body: { aksi: a, catatan: cat ? cat.value : '' } }); toast(a === 'setuju' ? 'Izin disetujui.' : a === 'tolak' ? 'Izin ditolak.' : 'Keputusan dibatalkan.', 'ok'); loadIzin(); }
  catch (er) { toast(er.message, 'bad'); e.target.disabled = false; }
};

feature('izin', { label: 'Pengajuan Izin', icon: 'file', badge: 1 }, loadIzin, () => { fillKelas($('#izKl'), 'Semua kelas saya'); if (KES) $('#izKl').options[0].textContent = 'Semua kelas'; });

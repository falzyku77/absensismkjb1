/* ---------- surat peringatan ---------- */
const SPN = { 1: 'SP-1', 2: 'SP-2', 3: 'SP-3' };
async function loadSP() {
  $('#spCek').style.display = KES ? '' : 'none';
  const L = await api('/api/guru/sp?kelas=' + encodeURIComponent($('#spKl').value)); refreshCount().catch(() => { });
  $('#spList').innerHTML = L.length ? table(['Nomor', 'Siswa', 'Tingkat', 'Total poin', 'Tanggal', 'Status', ''], L.map(x => `<tr><td><small>${esc(x.nomor)}</small></td><td><div style="display:flex;gap:9px;align-items:center">${avatar(x.sid, x.nama, x.foto)}<span><b>${esc(x.nama)}</b><div class="hint" style="margin:0">${esc(x.kelas)}</div></span></div></td><td><span class="badge b-${x.level >= 3 ? 'BERAT' : 'RINGAN'}">${SPN[x.level] || 'SP-' + x.level}</span></td><td><b>${x.total}</b></td><td>${esc(fmtTgl(x.tanggal))}</td><td>${x.status === 'DITERBITKAN' ? '<span class="badge b-DISETUJUI">Diterbitkan</span>' : '<span class="badge b-MENUNGGU">Baru</span>'}</td>
    <td style="white-space:nowrap"><a class="btn alt sm" target="_blank" href="/sp/?id=${esc(x.id)}">${x.status === 'DITERBITKAN' ? 'Lihat / Cetak' : (KES ? 'Tinjau & Terbitkan' : 'Lihat')}</a>${KES ? ` <button class="btn ghost sm" data-spdel="${esc(x.id)}">Hapus</button>` : ''}</td></tr>`)) : '<div class="empty">Belum ada Surat Peringatan.</div>';
}
$('#spKl').onchange = () => loadSP().catch(e => toast(e.message, 'bad'));
$('#spCek').onclick = async () => { try { const r = await api('/api/guru/sp/cek', { method: 'POST' }); toast(r.dibuat ? r.dibuat + ' SP baru dibuat.' : 'Tidak ada SP baru.', 'ok'); loadSP(); } catch (e) { toast(e.message, 'bad'); } };
$('#spList').onclick = async e => { const id = e.target.dataset.spdel; if (!id || !confirm('Hapus SP ini?')) return; try { await api('/api/guru/sp/' + id, { method: 'DELETE' }); loadSP(); } catch (er) { toast(er.message, 'bad'); } };

feature('sp', { label: 'Surat Peringatan', icon: 'file', badge: 1 }, loadSP, () => fillKelas($('#spKl'), KES ? 'Semua kelas' : 'Semua kelas saya'));

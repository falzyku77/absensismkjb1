/* =====================================================================
   KERANGKA PANEL KEDISIPLINAN (dipakai dashboard Admin/Kedisiplinan, Kesiswaan, Wali Kelas, Guru/Piket)
   Setiap fitur = 1 file HTML (shared/partials/panel/<id>.html) + 1 file JS (shared/js/panel/<id>.js).
   Halaman dashboard hanya memilih fitur mana yang dipakai: startPanel({ brand, features:[...] }).
   ===================================================================== */
let goNav = null, KES = false, PK = false, ADM = false, R = null, PRESET = {}, KELAS = [];
const LOAD = {}, FEATURES = {};

/* daftar fitur: dipanggil di akhir tiap file fitur */
function feature(id, meta, loader, init) { FEATURES[id] = { meta, init }; if (loader) LOAD[id] = loader; }

/* ---------- helper bersama ---------- */
const table = (head, rows) => `<table><tr>${head.map(h => `<th>${h}</th>`).join('')}</tr>${Array.isArray(rows) ? rows.join('') : rows}</table>`;
const fillKelas = (sel, first) => { sel.innerHTML = `<option value="">${first}</option>` + KELAS.map(k => `<option>${esc(k)}</option>`).join(''); };
const judulOpts = (j, sel) => (PRESET[j] || []).map(x => `<option${x === sel ? ' selected' : ''}>${esc(x)}</option>`).join('') + `<option value="__lain"${sel && !(PRESET[j] || []).includes(sel) ? ' selected' : ''}>Lainnya…</option>`;
const delBtn = id => `<button class="btn ghost sm" data-del="${esc(id)}">Hapus</button>`;
const pelRows = (L, del) => L.map(p => `<tr><td>${esc(fmtTgl(p.tanggal))}</td>${del === 'all' ? `<td><b>${esc(p.nama)}</b><div class="hint" style="margin:0">${esc(p.kelas)}</div></td>` : ''}<td>${esc(p.judul)}${p.catatan ? `<div class="hint" style="margin:0">${esc(p.catatan)}</div>` : ''}</td><td>${badge(p.jenis)}</td><td><b>+${p.poin}</b></td><td><small>${esc(p.oleh)}</small></td><td>${delBtn(p.id)}</td></tr>`).join('');

/* hapus catatan pelanggaran (tombol Hapus di Rekap & Riwayat) */
document.addEventListener('click', async e => {
  const id = e.target.dataset && e.target.dataset.del; if (!id || !confirm('Hapus catatan pelanggaran ini? Poin siswa akan berkurang.')) return;
  try { await api('/api/guru/pelanggaran/' + id, { method: 'DELETE' }); toast('Dihapus.', 'ok'); if ($('#dh').open) $('#dh').close(); if (typeof loadRiwayat === 'function') loadRiwayat(); if (typeof loadRekap === 'function') loadRekap(); } catch (er) { toast(er.message, 'bad'); }
});

async function refreshCount() {
  R = { ...R, ...(await api('/api/guru/ringkas')) }; setBadge('izin', R.izinMenunggu); setBadge('laporan', R.laporanMenunggu); setBadge('sp', R.spBaru);
}

/* ---------- pemuat fitur ---------- */
const loadScript = src => new Promise((ok, no) => { const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = () => no(new Error('Gagal memuat ' + src)); document.body.appendChild(s); });
async function loadPartials(ids) {
  const parts = await Promise.all(ids.map(id => fetch('/shared/partials/panel/' + id + '.html').then(r => { if (!r.ok) throw new Error('Gagal memuat tampilan ' + id); return r.text(); })));
  $('#content').innerHTML = parts.join('\n');
}

/* ---------- mulai ---------- */
async function startPanel(opt) {
  await loadPartials(opt.features);
  for (const id of opt.features) await loadScript('/shared/js/panel/' + id + '.js');
  R = await api('/api/guru/ringkas'); PRESET = R.preset; KELAS = await api('/api/guru/kelas');
  KES = ['kesiswaan', 'admin'].includes(R.role); PK = ['piket', 'guru'].includes(R.role); ADM = R.role === 'admin';
  buildMenu(opt.features.map(id => ({ id, ...FEATURES[id].meta }))); $('#burger').innerHTML = ico('menu'); $('#out').innerHTML = ico('out') + ' Keluar';
  $('#brandT').textContent = typeof opt.brand === 'function' ? opt.brand(R) : opt.brand;
  $('#who').innerHTML = `<div class="avatar">${esc(initials(R.nama))}</div><div><b>${esc(R.nama)}</b><small>${esc(R.peran)}${R.kelas.length ? ' · ' + esc(R.kelas.join(', ')) : ''}</small></div>`;
  for (const id of opt.features) if (FEATURES[id].init) FEATURES[id].init();
  goNav = nav(id => { const f = LOAD[id]; if (f) Promise.resolve(f()).catch(e => toast(e.message, 'bad')); });
  if (!PK) setInterval(() => refreshCount().catch(() => { }), 30000);
}

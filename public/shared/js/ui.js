/* Fungsi bersama untuk halaman portal siswa & panel guru */
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* ikon (gaya garis) */
const IC = {
  user: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  warn: '<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
  clock: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
  cal: '<rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>',
  file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>',
  flag: '<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/>',
  out: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>',
  users: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  set: '<line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/>',
  chart: '<line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/>',
  send: '<line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>',
  home: '<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>',
  plus: '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
  bell: '<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>',
  menu: '<line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/>'
};
const ico = n => `<svg class="ic" viewBox="0 0 24 24" aria-hidden="true">${IC[n] || ''}</svg>`;

/* panggilan API: melempar Error(pesan) bila gagal */
async function api(u, o = {}) {
  if (o.body && typeof o.body !== 'string') { o.body = JSON.stringify(o.body); o.headers = { 'Content-Type': 'application/json', ...(o.headers || {}) }; }
  const r = await fetch(u, o);
  if (r.status === 401) { location = '/login/'; throw new Error('Silakan login ulang.'); }
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.msg || ('Gagal (' + r.status + ')'));
  return j;
}

/* pemberitahuan singkat */
let _tt;
function toast(m, t = '') { const e = $('#toast'); e.textContent = m; e.className = t; e.style.display = 'block'; clearTimeout(_tt); _tt = setTimeout(() => e.style.display = 'none', 3800); }

/* tanggal */
const BLN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'], HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const fmtTgl = s => { if (!s) return ''; const [y, m, d] = s.split('-').map(Number), w = new Date(y, m - 1, d).getDay(); return `${HARI[w]}, ${d} ${BLN[m - 1]} ${y}`; };
const fmtDT = s => { const d = new Date(s); return isNaN(d) ? '' : `${d.getDate()} ${BLN[d.getMonth()]} ${d.getFullYear()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };
const hariIni = () => new Date().toLocaleDateString('sv');

/* tampilan kecil */
const badge = s => `<span class="badge b-${esc(s)}">${esc({ MENUNGGU: 'Menunggu', DISETUJUI: 'Disetujui', DITOLAK: 'Ditolak', DITERIMA: 'Diterima', RINGAN: 'Ringan', BERAT: 'Berat', IZIN: 'Izin', SAKIT: 'Sakit', HADIR: 'Hadir', ALFA: 'Alfa' }[s] || s)}</span>`;
const initials = n => String(n || '?').trim().split(/\s+/).slice(0, 2).map(x => x[0]).join('').toUpperCase();
let FV = Date.now();
const avatar = (id, nama, foto, cls = '') => foto ? `<img class="avatar ${cls}" src="/api/foto/${esc(id)}?v=${FV}" alt="" loading="lazy">` : `<div class="avatar ${cls}">${esc(initials(nama))}</div>`;
const bukti = f => f ? `<img class="thumb" src="/api/bukti/${esc(f)}" data-lb="/api/bukti/${esc(f)}" alt="Bukti" loading="lazy">` : '';

/* lihat foto besar */
document.addEventListener('click', e => { const t = e.target.closest('[data-lb]'); if (!t) return; $('#lbimg').src = t.dataset.lb; $('#lb').showModal(); });

/* baca & kecilkan foto dari kamera/galeri -> data URL JPEG (hemat kuota & penyimpanan) */
function readImg(file, { max = 1280, square = false, q = .82 } = {}) {
  return new Promise((ok, no) => {
    if (!file) return no(new Error('Pilih foto dahulu.'));
    if (!/^image\//.test(file.type)) return no(new Error('File harus berupa foto (JPG/PNG).'));
    const u = URL.createObjectURL(file), im = new Image();
    im.onload = () => {
      let sx = 0, sy = 0, sw = im.naturalWidth, sh = im.naturalHeight;
      if (square) { const m = Math.min(sw, sh); sx = (sw - m) / 2; sy = (sh - m) / 2; sw = sh = m; }
      const s = Math.min(1, max / Math.max(sw, sh)), c = document.createElement('canvas');
      c.width = Math.max(1, Math.round(sw * s)); c.height = Math.max(1, Math.round(sh * s));
      c.getContext('2d').drawImage(im, sx, sy, sw, sh, 0, 0, c.width, c.height);
      URL.revokeObjectURL(u); ok(c.toDataURL('image/jpeg', q));
    };
    im.onerror = () => { URL.revokeObjectURL(u); no(new Error('Foto tidak bisa dibaca. Coba foto lain (JPG/PNG).')); };
    im.src = u;
  });
}

/* kerangka halaman: menu samping + judul + hamburger */
function buildMenu(items) {
  $('#menu').innerHTML = items.map(m => `<a data-p="${m.id}" data-l="${esc(m.label)}" href="#${m.id}">${ico(m.icon)}<span>${esc(m.label)}</span>${m.badge ? `<i class="bd" id="bd-${m.id}" style="display:none">0</i>` : ''}</a>`).join('');
}
function setBadge(id, n) { const e = $('#bd-' + id); if (e) { e.textContent = n; e.style.display = n ? '' : 'none'; } }
function nav(on) {
  const go = id => {
    $$('.pg').forEach(e => e.classList.toggle('on', e.id === 'p-' + id));
    $$('#menu a').forEach(a => a.classList.toggle('on', a.dataset.p === id));
    const a = $('#menu a[data-p="' + id + '"]'); $('#ttl').textContent = a ? a.dataset.l : '';
    document.body.classList.remove('nv'); history.replaceState(null, '', '#' + id); scrollTo(0, 0); if (on) on(id);
  };
  $$('#menu a').forEach(a => a.onclick = e => { e.preventDefault(); go(a.dataset.p); });
  $('#burger').onclick = () => document.body.classList.toggle('nv'); $('#ovl').onclick = () => document.body.classList.remove('nv');
  $('#out').onclick = async () => { await fetch('/api/logout', { method: 'POST' }); location = '/login/'; };
  const h = location.hash.slice(1); go($('#p-' + h) ? h : $('#menu a').dataset.p); return go;
}

/* notifikasi */
const notifHtml = L => L.length ? L.map(n => `<div class="item" data-nid="${esc(n.id)}" data-link="${esc(n.link)}" style="cursor:pointer;${n.dibaca ? 'opacity:.65' : 'border-color:var(--pri);background:var(--pri-l)'}"><div class="info"><h3>${n.dibaca ? '' : '● '}${esc(n.judul)}</h3><p>${esc(n.isi)}</p><div class="meta">${esc(fmtDT(n.dibuat))}</div></div></div>`).join('') : '<div class="empty">Belum ada notifikasi.</div>';
function setBell(n) { const b = $('#bell'); if (b) b.innerHTML = ico('bell') + (n ? `<span class="bd2">${n}</span>` : ''); setBadge('notif', n); }

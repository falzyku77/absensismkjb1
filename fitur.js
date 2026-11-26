'use strict';
// ============================================================================
// FITUR TAMBAHAN: foto siswa, pengajuan izin, poin pelanggaran, laporan pelanggaran
// Peran baru: siswa (login pakai kode kartu), walas (wali kelas), kesiswaan.
// Data disimpan di sekolah.json (izin, pelanggaran, laporan, pengaturan, password siswa)
// Foto & bukti disimpan di folder uploads/ (tidak bisa dibuka tanpa login & izin).
// ============================================================================
const fs = require('fs'), path = require('path'), crypto = require('crypto');

module.exports = function (app, C) {
  const { load, save, peek, act, clean, today, okDate, sessions, admin, sess, accounts, jad, cur } = C;

  const SF = path.join(__dirname, 'sekolah.json'), UP = path.join(__dirname, 'uploads'), BK = path.join(__dirname, 'backup');
  for (const d of ['foto', 'bukti']) fs.mkdirSync(path.join(UP, d), { recursive: true });

  // ---------- aturan poin ----------
  const POIN = { RINGAN: 5, BERAT: 25 };
  const PRESET = {
    RINGAN: ['Terlambat', 'Atribut seragam tidak lengkap', 'Rambut / kuku tidak sesuai aturan', 'Tidak mengerjakan tugas', 'Keluar kelas tanpa izin', 'Membuat gaduh di kelas'],
    BERAT: ['Berkelahi', 'Merokok / vape', 'Membolos (tanpa keterangan)', 'Membawa / memakai barang terlarang', 'Perundungan (bullying)', 'Merusak fasilitas sekolah', 'Memalsukan surat / tanda tangan']
  };

  // ---------- penyimpanan data ----------
  const blank = () => ({ izin: [], pelanggaran: [], laporan: [], sp: [], notif: [], resetLog: [], pw: {}, set: { batasTelat: '', poinAwal: 100, spAmbang: [25, 50, 75], kepsek: '', kesiswaan: '', kodeSurat: 'SMKJB1', shifts: { pagi: { batas: '' }, siang: { batas: '' } }, kelasShift: {} } });
  const rd = () => {
    if (!fs.existsSync(SF)) return blank();
    const j = JSON.parse(fs.readFileSync(SF, 'utf8')), b = blank();
    const js = j.set || {};
    return { ...b, ...j, sp: j.sp || [], set: { ...b.set, ...js, shifts: { pagi: { ...b.set.shifts.pagi, ...((js.shifts || {}).pagi || {}) }, siang: { ...b.set.shifts.siang, ...((js.shifts || {}).siang || {}) } }, kelasShift: js.kelasShift || {} }, pw: j.pw || {} };
  };
  const wr = d => {
    try {
      fs.mkdirSync(BK, { recursive: true });
      const f = path.join(BK, `sekolah-${today()}.json`);
      if (fs.existsSync(SF) && !fs.existsSync(f)) fs.copyFileSync(SF, f);
      fs.readdirSync(BK).filter(x => /^sekolah-\d{4}-\d\d-\d\d\.json$/.test(x)).sort().slice(0, -14).forEach(x => fs.rmSync(path.join(BK, x), { force: true }));
    } catch { }
    const t = SF + '.tmp'; fs.writeFileSync(t, JSON.stringify(d)); fs.renameSync(t, SF);
  };
  const rid = () => crypto.randomBytes(8).toString('hex');

  // ---------- password siswa (awal = kode kartu) ----------
  const hashPw = p => { const s = crypto.randomBytes(16).toString('hex'); return s + ':' + crypto.scryptSync(p, s, 32).toString('hex'); };
  const chkPw = (h, p) => { const [s, x] = h.split(':'); return crypto.timingSafeEqual(crypto.scryptSync(p, s, 32), Buffer.from(x, 'hex')); };
  const pwOk = (id, p) => { const h = rd().pw[id]; return h ? chkPw(h, p) : String(p).toUpperCase() === id; };
  globalThis.__siswaLogin = (un, pw) => {
    const id = String(un || '').trim().toUpperCase();
    if (!/^[A-Z0-9]{4,10}$/.test(id)) return null;
    const s = peek().students.find(x => x.id === id);
    if (!s || !pwOk(id, pw)) return null;
    return { username: id, role: 'siswa', name: s.nama, kelas: s.kelas, sid: id, _ok: true, mc: !rd().pw[id] };
  };
  const kick = id => { for (const [t, v] of sess) if (v.sid === id) sess.delete(t); };

  // ---------- gambar (foto siswa & bukti) ----------
  const PNG = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
  const sniff = b => b.length < 12 ? null :
    (b[0] === 0xFF && b[1] === 0xD8 && b[2] === 0xFF) ? 'jpg' :
    b.subarray(0, 8).equals(PNG) ? 'png' :
    (b.subarray(0, 4).toString('latin1') === 'RIFF' && b.subarray(8, 12).toString('latin1') === 'WEBP') ? 'webp' : null;
  const MIME = { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };
  const decImg = s => {
    s = String(s || ''); const i = s.indexOf(',');
    if (i < 0 || !/^data:image\/(jpeg|png|webp);base64$/.test(s.slice(0, i))) return null;
    const b = Buffer.from(s.slice(i + 1), 'base64');
    if (b.length < 100 || b.length > 5 * 1024 * 1024) return null;
    const ext = sniff(b); return ext ? { b, ext } : null;
  };
  const FOTO = new Map(); globalThis.__fotoSet = FOTO;
  for (const f of fs.readdirSync(path.join(UP, 'foto'))) { const m = /^([A-Z0-9]+)\.(jpg|png|webp)$/.exec(f); if (m) FOTO.set(m[1], m[2]); }
  const setFoto = (id, img) => {
    const old = FOTO.get(id);
    fs.writeFileSync(path.join(UP, 'foto', `${id}.${img.ext}`), img.b);
    if (old && old !== img.ext) fs.rmSync(path.join(UP, 'foto', `${id}.${old}`), { force: true });
    FOTO.set(id, img.ext);
  };
  const delFoto = id => { const e = FOTO.get(id); if (e) fs.rmSync(path.join(UP, 'foto', `${id}.${e}`), { force: true }); FOTO.delete(id); };
  const saveBukti = img => { const f = rid() + '.' + img.ext; fs.writeFileSync(path.join(UP, 'bukti', f), img.b); return f; };
  const sendImg = (r, file, ext) => { r.set({ 'Content-Type': MIME[ext], 'Cache-Control': 'private, max-age=60', 'X-Content-Type-Options': 'nosniff' }); r.sendFile(file); };

  // ---------- helper umum ----------
  const bad = (r, msg, code = 400) => r.status(code).json({ msg });
  const nk = x => String(x || '').toUpperCase().replace(/[\s_-]+/g, '');
  const nm = x => String(x || '').toLowerCase().replace(/\s+/g, ' ').trim();
  const kelasOf = u => Array.isArray(u.kelas) ? u.kelas : [];
  const seeKelas = (u, k) => u.role === 'kesiswaan' || u.role === 'admin' || (u.role === 'walas' && kelasOf(u).some(x => nk(x) === nk(k)));
  const allKelas = () => [...new Set(peek().students.map(s => s.kelas))].sort((a, b) => a.localeCompare(b, 'id', { numeric: true }));
  const stuById = id => peek().students.find(s => s.id === id);
  // poin pelanggaran BERTAMBAH setiap pelanggaran; yang sudah direset (arsip) tidak dihitung
  const poinOf = (d, sid) => {
    let ringan = 0, berat = 0;
    for (const p of d.pelanggaran) if (p.sid === sid && !p.arsip) { if (p.jenis === 'BERAT') berat += p.poin; else ringan += p.poin; }
    const total = ringan + berat, am = d.set.spAmbang, lv = am.filter(a => total >= a).length;
    return { ringan, berat, total, sp: lv, next: am[lv] || null, spAmbang: am };
  };
  const roleName = { walas: 'Wali Kelas', kesiswaan: 'Kesiswaan', admin: 'Admin', piket: 'Guru Piket', guru: 'Guru' };
  const notif = (d, to, judul, isi, tipe, link) => {
    if (!to) return;
    d.notif.push({ id: rid().slice(0, 12), to, judul, isi, tipe, link: link || '', dibuat: new Date().toISOString(), dibaca: false });
    const mine = d.notif.filter(n => n.to === to);
    if (mine.length > 60) { const drop = new Set(mine.slice(0, mine.length - 60).map(n => n.id)); d.notif = d.notif.filter(n => !drop.has(n.id)); }
  };
  const BLN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const idTgl = s => { const [y, m, d] = s.split('-').map(Number); return `${d} ${BLN[m - 1]} ${y}`; };
  const shiftOf = (d, kelas) => d.set.kelasShift[kelas] === 'siang' ? 'siang' : 'pagi';
  globalThis.__shiftOf = kelas => shiftOf(rd(), kelas);
  const isKes = u => u.role === 'kesiswaan' || u.role === 'admin';
  const lapOk = (u, x) => seeKelas(u, x.kelas) && (!['PIKET', 'GURU'].includes(x.sumber) || isKes(u));

  // peran
  const refresh = (q, r, n) => { // data kelas wali kelas selalu dibaca ulang dari akun.json
    const u = q.user;
    if (u && u.role === 'walas') { const a = accounts().find(x => x.username === u.username); if (!a) return bad(r, 'Silakan login.', 401); u.kelas = a.kelas || []; }
    n();
  };
  const siswa = (q, r, n) => q.user.role === 'siswa' ? n() : bad(r, 'Khusus akun siswa.', 403);
  const guru = [refresh, (q, r, n) => ['walas', 'kesiswaan', 'admin'].includes(q.user.role) ? n() : bad(r, 'Khusus wali kelas / kesiswaan.', 403)];
  const guruAny = [refresh, (q, r, n) => ['walas', 'kesiswaan', 'admin', 'piket', 'guru'].includes(q.user.role) ? n() : bad(r, 'Khusus guru.', 403)];
  const piketOnly = (q, r, n) => ['piket', 'guru', 'admin'].includes(q.user.role) ? n() : bad(r, 'Khusus guru / guru piket.', 403);
  const adminOnly = (q, r, n) => q.user.role === 'admin' ? n() : bad(r, 'Khusus admin.', 403);
  const kesis = (q, r, n) => ['kesiswaan', 'admin'].includes(q.user.role) ? n() : bad(r, 'Khusus kesiswaan.', 403);
  const me = (q, r) => { const s = stuById(q.user.sid); if (!s) { bad(r, 'Data siswa tidak ditemukan. Hubungi admin.', 404); return null; } return s; };

  // ======================================================================
  // FOTO (semua peran yang login boleh melihat; siswa hanya fotonya sendiri)
  // ======================================================================
  app.get('/api/foto/:id', (q, r) => {
    const id = String(q.params.id).toUpperCase();
    if (q.user.role === 'siswa' && q.user.sid !== id) return r.status(403).end();
    const e = FOTO.get(id); if (!e) return r.status(404).end();
    sendImg(r, path.join(UP, 'foto', `${id}.${e}`), e);
  });
  // admin: unggah / hapus foto siswa mana pun, reset password siswa
  app.post('/api/siswa/:id/foto', admin, (q, r) => {
    const id = String(q.params.id).toUpperCase(), s = stuById(id); if (!s) return bad(r, 'Siswa tidak ditemukan.', 404);
    const img = decImg(q.body.img); if (!img) return bad(r, 'Foto tidak valid (JPG/PNG/WEBP, maksimal 5 MB).');
    setFoto(id, img); act('FOTO', `ubah foto ${s.nama} (${s.kelas})`, q); r.json({ ok: true });
  });
  app.delete('/api/siswa/:id/foto', admin, (q, r) => { const id = String(q.params.id).toUpperCase(), s = stuById(id); delFoto(id); if (s) act('FOTO', `hapus foto ${s.nama} (${s.kelas})`, q); r.json({ ok: true }); });
  app.put('/api/siswa/:id/reset-password', admin, (q, r) => {
    const id = String(q.params.id).toUpperCase(), s = stuById(id); if (!s) return bad(r, 'Siswa tidak ditemukan.', 404);
    const d = rd(); delete d.pw[id]; wr(d); kick(id); act('AKUN', `reset password siswa ${s.nama} (${s.kelas}) ke kode kartu`, q); r.json({ ok: true });
  });

  // daftar akun siswa otomatis (dibuat dari data siswa: username = kode kartu)
  const akunSiswa = (kelas) => { const pw = rd().pw; return peek().students.filter(s => !kelas || s.kelas === kelas)
    .sort((a, b) => a.kelas.localeCompare(b.kelas, 'id', { numeric: true }) || a.nama.localeCompare(b.nama, 'id'))
    .map(s => ({ id: s.id, nama: s.nama, kelas: s.kelas, jurusan: s.jurusan, diganti: !!pw[s.id] })); };
  app.get('/api/siswa-akun', admin, (q, r) => r.json(akunSiswa(clean(q.query.kelas, 20))));
  app.get('/api/siswa-akun.xlsx', admin, async (q, r) => {
    const ExcelJS = require('exceljs'), wb = new ExcelJS.Workbook(), ws = wb.addWorksheet('Akun Siswa');
    ws.columns = [{ header: 'No', width: 6 }, { header: 'Nama', width: 34 }, { header: 'Kelas', width: 12 }, { header: 'Jurusan', width: 22 }, { header: 'Username', width: 14 }, { header: 'Password awal', width: 16 }, { header: 'Status password', width: 24 }];
    ws.getRow(1).font = { bold: true }; ws.views = [{ state: 'frozen', ySplit: 1 }];
    akunSiswa(clean(q.query.kelas, 20)).forEach((x, i) => ws.addRow([i + 1, x.nama, x.kelas, x.jurusan, x.id, x.diganti ? '(sudah diganti siswa)' : x.id, x.diganti ? 'Diganti siswa' : 'Masih awal']));
    ws.autoFilter = { from: 'A1', to: 'G1' };
    act('EXPORT', 'unduh daftar akun siswa', q);
    r.set({ 'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'Content-Disposition': 'attachment; filename="akun-siswa.xlsx"' });
    await wb.xlsx.write(r); r.end();
  });

  // ======================================================================
  // REKAP EXCEL BULANAN (dipisah sesi masuk PAGI / SIANG sesuai pengaturan kelas)
  // ======================================================================
  const RK = path.join(__dirname, 'rekap'); fs.mkdirSync(RK, { recursive: true });
  const BLNF = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  const CODE = { H: ['FFD9F2E3', 'Hadir'], T: ['FFFCE8B2', 'Hadir terlambat'], S: ['FFE3D9F3', 'Sakit'], I: ['FFFFF2CC', 'Izin'], A: ['FFF8D7DA', 'Alfa / tidak scan'] };
  async function buildRekap(ym, shift, kelas) {
    const ExcelJS = require('exceljs'), [Y, M] = ym.split('-').map(Number), nd = new Date(Y, M, 0).getDate(), d = rd(), P = peek(), ses = sessions()[0];
    const JL = jad().list, sesFor = kl => { const w = shiftOf(d, kl), a = JL.find(x => x.shift === w) || JL.find(x => !x.shift) || JL[0]; return a ? a.name : ses; };
    const recs = new Map(); for (const l of P.absen) if (l.date.startsWith(ym)) recs.set(l.id + '|' + l.date + '|' + l.session, l);
    const groups = { pagi: [], siang: [] }; for (const s of P.students) if (!kelas || s.kelas === kelas) groups[shiftOf(d, s.kelas)].push(s);
    const byK = (a, b) => a.kelas.localeCompare(b.kelas, 'id', { numeric: true }) || a.nama.localeCompare(b.nama, 'id');
    const thin = { style: 'thin', color: { argb: 'FFAAAAAA' } }, bd = { top: thin, left: thin, bottom: thin, right: thin };
    const wb = new ExcelJS.Workbook(), sm = wb.addWorksheet('Ringkasan Kelas'), rows = [];
    for (const sh of ['pagi', 'siang']) {
      if (shift && shift !== 'semua' && shift !== sh) continue;
      const L = groups[sh].sort(byK), eff = [];
      for (let day = 1; day <= nd; day++) { const dt = `${ym}-${String(day).padStart(2, '0')}`; if (L.some(s => { const l = recs.get(s.id + '|' + dt + '|' + sesFor(s.kelas)); return l && l.status === 'HADIR'; })) eff.push(dt); }
      const ws = wb.addWorksheet('Rekap ' + (sh === 'pagi' ? 'Pagi' : 'Siang'), { views: [{ state: 'frozen', xSplit: 4, ySplit: 4 }], pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 } });
      const nc = 4 + nd + 6; ws.mergeCells(1, 1, 1, nc); ws.mergeCells(2, 1, 2, nc); ws.mergeCells(3, 1, 3, nc);
      ws.getCell(1, 1).value = `REKAP ABSENSI SISWA - SESI MASUK ${sh.toUpperCase()}`; ws.getCell(1, 1).font = { bold: true, size: 14 };
      ws.getCell(2, 1).value = `Bulan ${BLNF[M - 1]} ${Y}  |  Hari efektif: ${eff.length}  |  ${kelas ? 'Kelas ' + kelas : 'Semua kelas sesi ' + sh}  |  Jumlah siswa: ${L.length}`;
      ws.getCell(3, 1).value = 'Keterangan: H = Hadir, T = Hadir terlambat, S = Sakit, I = Izin, A = Alfa / tidak scan pada hari efektif.';
      const hdr = ['No', 'Nama', 'Kelas', 'Jurusan', ...Array.from({ length: nd }, (_, i) => i + 1), 'Hadir', 'Terlambat', 'Sakit', 'Izin', 'Alfa', '% Hadir'];
      const hr = ws.getRow(4); hdr.forEach((h, i) => { const c = hr.getCell(i + 1); c.value = h; c.font = { bold: true, color: { argb: 'FFFFFFFF' } }; c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1457A0' } }; c.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }; c.border = bd; });
      ws.getColumn(1).width = 5; ws.getColumn(2).width = 34; ws.getColumn(3).width = 11; ws.getColumn(4).width = 20; for (let i = 0; i < nd; i++) ws.getColumn(5 + i).width = 3.6; for (let i = 0; i < 6; i++) ws.getColumn(5 + nd + i).width = i === 5 ? 9 : 9;
      const per = new Map();
      L.forEach((s, i) => {
        const cnt = { H: 0, T: 0, S: 0, I: 0, A: 0 }, row = [i + 1, s.nama, s.kelas, s.jurusan];
        for (let day = 1; day <= nd; day++) {
          const dt = `${ym}-${String(day).padStart(2, '0')}`; if (!eff.includes(dt)) { row.push(''); continue; }
          const l = recs.get(s.id + '|' + dt + '|' + sesFor(s.kelas)); let c = 'A';
          if (l) c = l.status === 'HADIR' ? (l.telat ? 'T' : 'H') : l.status === 'SAKIT' ? 'S' : l.status === 'IZIN' ? 'I' : 'A';
          cnt[c]++; row.push(c);
        }
        const hadir = cnt.H + cnt.T; row.push(hadir, cnt.T, cnt.S, cnt.I, cnt.A, eff.length ? hadir / eff.length : 0);
        const r = ws.addRow(row), rr = r.number;
        r.eachCell({ includeEmpty: true }, (c, k) => { c.border = bd; c.alignment = { horizontal: k <= 4 && k > 1 ? 'left' : 'center', vertical: 'middle' }; if (k > 4 && k <= 4 + nd && CODE[c.value]) c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: CODE[c.value][0] } }; });
        ws.getCell(rr, nc).numFmt = '0%'; ws.getCell(rr, 2).alignment = { horizontal: 'left', vertical: 'middle' };
        const k = per.get(s.kelas) || { sh, kelas: s.kelas, siswa: 0, H: 0, T: 0, S: 0, I: 0, A: 0 }; k.siswa++; for (const c of ['H', 'T', 'S', 'I', 'A']) k[c] += cnt[c]; per.set(s.kelas, k);
      });
      for (const k of per.values()) rows.push({ ...k, eff: eff.length });
    }
    sm.addRow(['REKAP PER KELAS - ' + BLNF[M - 1] + ' ' + Y]); sm.getCell(1, 1).font = { bold: true, size: 14 }; sm.mergeCells(1, 1, 1, 10);
    const h2 = sm.addRow(['Sesi', 'Kelas', 'Siswa', 'Hari efektif', 'Hadir', 'Terlambat', 'Sakit', 'Izin', 'Alfa', '% Hadir']);
    h2.eachCell(c => { c.font = { bold: true, color: { argb: 'FFFFFFFF' } }; c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1457A0' } }; c.alignment = { horizontal: 'center' }; c.border = bd; });
    rows.sort((a, b) => (a.sh === b.sh ? 0 : a.sh === 'pagi' ? -1 : 1) || a.kelas.localeCompare(b.kelas, 'id', { numeric: true }));
    for (const k of rows) { const slots = k.siswa * k.eff, hadir = k.H + k.T, r = sm.addRow([k.sh === 'pagi' ? 'Pagi' : 'Siang', k.kelas, k.siswa, k.eff, hadir, k.T, k.S, k.I, k.A, slots ? hadir / slots : 0]); r.eachCell({ includeEmpty: true }, c => { c.border = bd; c.alignment = { horizontal: 'center' }; }); r.getCell(10).numFmt = '0%'; }
    [8, 12, 8, 12, 9, 11, 8, 8, 8, 10].forEach((w, i) => sm.getColumn(i + 1).width = w);
    return wb;
  }
  async function autoRekap() { // buat file rekap bulan-bulan yang sudah lewat secara otomatis (sekali per bulan)
    try {
      const ini = today().slice(0, 7), bulan = [...new Set(peek().absen.map(l => l.date.slice(0, 7)))].filter(m => m < ini).sort().slice(-24);
      for (const ym of bulan) { const fp = path.join(RK, `rekap-${ym}.xlsx`); if (fs.existsSync(fp)) continue; const wb = await buildRekap(ym, 'semua', ''); await wb.xlsx.writeFile(fp); act('REKAP', `rekap Excel otomatis bulan ${ym}`, null); }
    } catch (e) { console.error('Rekap otomatis gagal:', e.message); }
  }
  setTimeout(autoRekap, 5000); setInterval(autoRekap, 3600e3);
  app.get('/api/guru/rekap-excel/daftar', guru, kesis, (q, r) => r.json(fs.readdirSync(RK).filter(x => /^rekap-\d{4}-\d\d\.xlsx$/.test(x)).sort().reverse().map(x => { const st = fs.statSync(path.join(RK, x)); return { bulan: x.slice(6, 13), ukuran: st.size, dibuat: st.mtime.toISOString() }; })));
  app.get('/api/guru/rekap-excel/file/:ym', guru, kesis, (q, r) => { const ym = String(q.params.ym); if (!/^\d{4}-\d\d$/.test(ym)) return bad(r, 'Bulan tidak valid.'); const fp = path.join(RK, `rekap-${ym}.xlsx`); if (!fs.existsSync(fp)) return bad(r, 'Berkas belum ada.', 404); r.download(fp, `rekap-absensi-${ym}.xlsx`); });
  app.get('/api/guru/rekap-excel', guru, kesis, async (q, r) => {
    const ym = /^\d{4}-(0[1-9]|1[0-2])$/.test(String(q.query.bulan)) ? String(q.query.bulan) : today().slice(0, 7), sh = ['pagi', 'siang'].includes(q.query.shift) ? q.query.shift : 'semua', kl = clean(q.query.kelas, 20);
    try { const wb = await buildRekap(ym, sh, kl); act('REKAP', `unduh rekap Excel ${ym} sesi ${sh}${kl ? ' kelas ' + kl : ''}`, q);
      r.set({ 'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'Content-Disposition': `attachment; filename="rekap-absensi-${ym}${sh !== 'semua' ? '-' + sh : ''}${kl ? '-' + kl.replace(/\s+/g, '') : ''}.xlsx"` }); await wb.xlsx.write(r); r.end();
    } catch (e) { bad(r, 'Gagal membuat Excel: ' + e.message, 500); }
  });

  app.get('/api/rekap-bulanan', async (q, r) => { // dipakai tombol Download Excel di dashboard (admin & OSIS)
    if (!['admin', 'osis'].includes(q.user.role)) return bad(r, 'Tidak diizinkan.', 403);
    const ym = /^\d{4}-(0[1-9]|1[0-2])$/.test(String(q.query.bulan)) ? String(q.query.bulan) : today().slice(0, 7), sh = ['pagi', 'siang'].includes(q.query.shift) ? q.query.shift : 'semua', kl = clean(q.query.kelas, 20);
    try { const wb = await buildRekap(ym, sh, kl); act('EXPORT', `rekap bulanan ${ym} sesi ${sh}${kl ? ' kelas ' + kl : ''}`, q);
      r.set({ 'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'Content-Disposition': `attachment; filename="rekap-absensi-${ym}${sh !== 'semua' ? '-' + sh : ''}${kl ? '-' + kl.replace(/\s+/g, '') : ''}.xlsx"` }); await wb.xlsx.write(r); r.end();
    } catch (e) { bad(r, 'Gagal membuat Excel: ' + e.message, 500); }
  });
  app.get('/api/guru/jadwal', guru, (q, r) => r.json({ list: jad().list, cur: cur(), force: jad().force || null }));

  // ======================================================================
  // BUKTI (surat izin / bukti laporan) - hanya pemilik, wali kelas terkait, atau kesiswaan
  // ======================================================================
  app.get('/api/bukti/:f', refresh, (q, r) => {
    const f = String(q.params.f); if (!/^[a-f0-9]{16}\.(jpg|png|webp)$/.test(f)) return r.status(404).end();
    const d = rd(), u = q.user, iz = d.izin.find(x => x.bukti === f), lp = d.laporan.find(x => x.bukti === f);
    let ok = false;
    if (iz) ok = (u.role === 'siswa' && iz.sid === u.sid) || seeKelas(u, iz.kelas);
    else if (lp) ok = (u.role === 'siswa' && lp.pelapor === u.sid) || (u.role === 'siswa' && lp.sid === u.sid && lp.status === 'DITERIMA') || (lp.pelaporUser && lp.pelaporUser === u.username) || lapOk(u, lp);
    if (!ok) return r.status(404).end();
    sendImg(r, path.join(UP, 'bukti', f), f.split('.')[1]);
  });

  // ======================================================================
  // PORTAL SISWA
  // ======================================================================
  app.get('/api/portal/me', siswa, (q, r) => {
    const s = me(q, r); if (!s) return; const d = rd();
    r.json({ id: s.id, nama: s.nama, kelas: s.kelas, jurusan: s.jurusan, foto: FOTO.has(s.id), defaultPw: !d.pw[s.id], poin: poinOf(d, s.id), aturan: POIN });
  });
  app.post('/api/portal/foto', siswa, (q, r) => {
    const s = me(q, r); if (!s) return;
    const img = decImg(q.body.img); if (!img) return bad(r, 'Foto tidak valid (JPG/PNG/WEBP, maksimal 5 MB).');
    setFoto(s.id, img); act('FOTO', `${s.nama} (${s.kelas}) mengunggah foto profil`, q); r.json({ ok: true });
  });
  app.delete('/api/portal/foto', siswa, (q, r) => { delFoto(q.user.sid); r.json({ ok: true }); });
  app.put('/api/portal/password', siswa, (q, r) => {
    const s = me(q, r); if (!s) return; const lama = String(q.body.lama || ''), baru = String(q.body.baru || '');
    if (!pwOk(s.id, lama)) return bad(r, 'Password lama salah.');
    if (baru.length < 6) return bad(r, 'Password baru minimal 6 karakter.');
    if (baru.toUpperCase() === s.id) return bad(r, 'Password baru tidak boleh sama dengan kode kartu.');
    const d = rd(); d.pw[s.id] = hashPw(baru); wr(d); q.user.mc = false; act('AKUN', `${s.nama} (${s.kelas}) mengganti password`, q); r.json({ ok: true });
  });
  app.get('/api/portal/absen', siswa, (q, r) => {
    const id = q.user.sid, L = peek().absen.filter(l => l.id === id).sort((a, b) => (b.date + b.session).localeCompare(a.date + a.session));
    const c = { HADIR: 0, SAKIT: 0, IZIN: 0, ALFA: 0 }; for (const l of L) if (c[l.status] != null) c[l.status]++; c.TERLAMBAT = L.filter(l => l.telat).length;
    r.json({ count: c, list: L.slice(0, 120).map(l => ({ date: l.date, session: l.session, status: l.status, time: l.time || '', telat: !!l.telat })) });
  });
  app.get('/api/portal/pelanggaran', siswa, (q, r) => {
    const d = rd(), L = d.pelanggaran.filter(p => p.sid === q.user.sid && !p.arsip).sort((a, b) => b.tanggal.localeCompare(a.tanggal));
    const lp = new Map(d.laporan.map(x => [x.id, x]));
    r.json({ poin: poinOf(d, q.user.sid), aturan: POIN, list: L.map(p => { const l = p.laporan && lp.get(p.laporan); return { id: p.id, tanggal: p.tanggal, judul: p.judul, jenis: p.jenis, poin: p.poin, catatan: p.catatan || '', sumber: p.sumber, dari: p.sumber === 'LAPORAN' ? 'Anonim (identitas pelapor dirahasiakan)' : p.sumber === 'OTOMATIS' ? 'Sistem' : 'Guru / Kesiswaan', bukti: l && l.sid === q.user.sid ? l.bukti : '' }; }) });
  });

  // --- pengajuan izin ---
  const izinView = x => ({ id: x.id, tanggal: x.tanggal, tipe: x.tipe, alasan: x.alasan, bukti: x.bukti, status: x.status, catatan: x.catatan || '', oleh: x.oleh || '', dibuat: x.dibuat });
  app.get('/api/portal/izin', siswa, (q, r) => r.json(rd().izin.filter(x => x.sid === q.user.sid).sort((a, b) => b.dibuat.localeCompare(a.dibuat)).map(izinView)));
  app.post('/api/portal/izin', siswa, (q, r) => {
    const s = me(q, r); if (!s) return; const b = q.body || {};
    const tgl = b.tanggal, tipe = String(b.tipe || '').toUpperCase(), alasan = clean(b.alasan, 500), img = decImg(b.bukti);
    if (!okDate(tgl)) return bad(r, 'Tanggal izin wajib dipilih.');
    if (tgl < today()) return bad(r, 'Tanggal izin tidak boleh sebelum hari ini.');
    if ((new Date(tgl) - new Date(today())) / 864e5 > 30) return bad(r, 'Pengajuan maksimal 30 hari ke depan.');
    if (!['IZIN', 'SAKIT'].includes(tipe)) return bad(r, 'Keterangan harus Izin atau Sakit.');
    if (alasan.length < 5) return bad(r, 'Alasan lengkap wajib diisi (minimal 5 huruf).');
    if (!img) return bad(r, 'Foto surat / bukti izin WAJIB diunggah (JPG/PNG, maksimal 5 MB). Tanpa foto, izin tidak bisa diajukan.');
    const d = rd();
    if (d.izin.some(x => x.sid === s.id && x.tanggal === tgl && x.status !== 'DITOLAK')) return bad(r, 'Anda sudah punya pengajuan untuk tanggal tersebut.');
    if (d.izin.filter(x => x.sid === s.id && x.status === 'MENUNGGU').length >= 5) return bad(r, 'Masih ada 5 pengajuan yang belum diproses. Tunggu persetujuan dulu.');
    const x = { id: rid().slice(0, 12), sid: s.id, nama: s.nama, kelas: s.kelas, tanggal: tgl, tipe, alasan, bukti: saveBukti(img), status: 'MENUNGGU', dibuat: new Date().toISOString() };
    d.izin.push(x); wr(d); act('IZIN', `${s.nama} (${s.kelas}) mengajukan ${tipe} untuk ${tgl}`, q); r.json(izinView(x));
  });
  app.delete('/api/portal/izin/:id', siswa, (q, r) => {
    const d = rd(), x = d.izin.find(y => y.id === q.params.id && y.sid === q.user.sid);
    if (!x) return bad(r, 'Pengajuan tidak ditemukan.', 404);
    if (x.status !== 'MENUNGGU') return bad(r, 'Pengajuan yang sudah diproses tidak bisa dibatalkan.');
    fs.rmSync(path.join(UP, 'bukti', x.bukti), { force: true }); d.izin = d.izin.filter(y => y !== x); wr(d);
    act('IZIN', `${x.nama} (${x.kelas}) membatalkan pengajuan ${x.tipe} ${x.tanggal}`, q); r.json({ ok: true });
  });

  // --- laporan pelanggaran oleh siswa lain ---
  app.get('/api/portal/kelas', siswa, (q, r) => r.json(allKelas()));
  app.get('/api/portal/nama', siswa, (q, r) => {
    const k = clean(q.query.kelas, 20); r.json(peek().students.filter(s => s.kelas === k && s.id !== q.user.sid).map(s => s.nama).sort((a, b) => a.localeCompare(b, 'id')));
  });
  const lapView = x => ({ id: x.id, nama: x.nama, kelas: x.kelas, deskripsi: x.deskripsi, bukti: x.bukti, status: x.status, catatan: x.catatan || '', dibuat: x.dibuat });
  app.get('/api/portal/lapor', siswa, (q, r) => r.json(rd().laporan.filter(x => x.pelapor === q.user.sid).sort((a, b) => b.dibuat.localeCompare(a.dibuat)).map(lapView)));
  app.post('/api/portal/lapor', siswa, (q, r) => {
    const s = me(q, r); if (!s) return; const b = q.body || {};
    const nama = clean(b.nama, 80), kelas = clean(b.kelas, 20), ket = clean(b.deskripsi, 600), img = decImg(b.bukti);
    if (kelas && !allKelas().includes(kelas)) return bad(r, 'Kelas tidak dikenal. Kosongkan jika tidak tahu.');
    if (ket.length < 5) return bad(r, 'Jelaskan kejadiannya (minimal 5 huruf). Jika tidak tahu nama/kelas, tulis ciri-ciri, lokasi, dan waktu.');
    if (!img) return bad(r, 'Foto bukti pelanggaran WAJIB diunggah (JPG/PNG, maksimal 5 MB).');
    let t = null;
    if (nama) { const c = peek().students.filter(x => nm(x.nama) === nm(nama) && (!kelas || x.kelas === kelas)); if (c.length === 1) t = c[0]; }
    if (t && t.id === s.id) return bad(r, 'Anda tidak bisa melaporkan diri sendiri.');
    const d = rd(), hari = new Date().toISOString().slice(0, 10);
    if (d.laporan.filter(x => x.pelapor === s.id && x.dibuat.slice(0, 10) === hari).length >= 5) return bad(r, 'Batas laporan 5 kali per hari sudah tercapai.');
    const x = { id: rid().slice(0, 12), pelapor: s.id, pelaporNama: s.nama, pelaporKelas: s.kelas, nama: t ? t.nama : nama, kelas: t ? t.kelas : kelas, sid: t ? t.id : null, deskripsi: ket, bukti: saveBukti(img), status: 'MENUNGGU', dibuat: new Date().toISOString() };
    d.laporan.push(x); wr(d); act('LAPOR', `${s.nama} (${s.kelas}) melapor: ${x.nama || '(nama tidak diketahui)'} ${x.kelas ? '(' + x.kelas + ')' : ''}`, q); r.json(lapView(x));
  });

  // ======================================================================
  // PANEL WALI KELAS & KESISWAAN
  // ======================================================================
  const izinGuru = x => ({ ...izinView(x), sid: x.sid, nama: x.nama, kelas: x.kelas, foto: FOTO.has(x.sid) });
  const lapGuru = x => ({ ...lapView(x), sumber: x.sumber || 'SISWA', saran: x.saran || null, sid: x.sid, foto: x.sid ? FOTO.has(x.sid) : false, pelaporNama: x.pelaporNama, pelaporKelas: x.pelaporKelas, oleh: x.oleh || '' });
  const pelGuru = p => ({ id: p.id, sid: p.sid, nama: p.nama, kelas: p.kelas, jenis: p.jenis, judul: p.judul, poin: p.poin, tanggal: p.tanggal, catatan: p.catatan || '', sumber: p.sumber, oleh: p.oleh });

  app.get('/api/guru/ringkas', guruAny, (q, r) => {
    const d = rd(), u = q.user;
    r.json({ nama: u.name, role: u.role, peran: roleName[u.role], kelas: u.role === 'walas' ? kelasOf(u) : [], admin: u.role === 'admin', today: today(),
      izinMenunggu: d.izin.filter(x => x.status === 'MENUNGGU' && seeKelas(u, x.kelas)).length,
      laporanMenunggu: d.laporan.filter(x => x.status === 'MENUNGGU' && lapOk(u, x)).length, spBaru: d.sp.filter(x => x.status === 'BARU' && seeKelas(u, x.kelas)).length,
      pelanggaranBulanIni: d.pelanggaran.filter(p => !p.arsip && p.tanggal.slice(0, 7) === today().slice(0, 7) && seeKelas(u, p.kelas)).length, preset: PRESET, poin: POIN });
  });
  app.get('/api/guru/kelas', guruAny, (q, r) => r.json(q.user.role === 'walas' ? kelasOf(q.user).filter(k => allKelas().includes(k)) : allKelas()));

  // --- izin ---
  const applyIzin = (x, by) => {
    const d = load(), applied = [];
    for (const p of sessions()) {
      const i = d.absen.findIndex(l => l.id === x.sid && l.date === x.tanggal && l.session === p);
      if (i >= 0) { const l = d.absen[i]; if (l.status === 'HADIR') continue; applied.push({ p, prev: l.status }); l.status = x.tipe; l.by = by; }
      else { applied.push({ p, prev: null }); d.absen.push({ id: x.sid, date: x.tanggal, session: p, status: x.tipe, by }); }
    }
    if (applied.length) save(d); return applied;
  };
  const undoIzin = x => {
    if (!x.applied || !x.applied.length) return; const d = load();
    for (const a of x.applied) {
      const i = d.absen.findIndex(l => l.id === x.sid && l.date === x.tanggal && l.session === a.p);
      if (i < 0 || d.absen[i].status !== x.tipe) continue;
      if (a.prev) d.absen[i].status = a.prev; else d.absen.splice(i, 1);
    }
    save(d);
  };
  app.get('/api/guru/izin', guru, (q, r) => {
    const st = String(q.query.status || '').toUpperCase(), k = clean(q.query.kelas, 20);
    r.json(rd().izin.filter(x => seeKelas(q.user, x.kelas) && (!st || x.status === st) && (!k || x.kelas === k))
      .sort((a, b) => (a.status === 'MENUNGGU' ? 0 : 1) - (b.status === 'MENUNGGU' ? 0 : 1) || b.dibuat.localeCompare(a.dibuat)).slice(0, 300).map(izinGuru));
  });
  app.put('/api/guru/izin/:id', guru, (q, r) => {
    const d = rd(), x = d.izin.find(y => y.id === q.params.id);
    if (!x || !seeKelas(q.user, x.kelas)) return bad(r, 'Pengajuan tidak ditemukan.', 404);
    const aksi = String(q.body.aksi || ''), cat = clean(q.body.catatan, 300), by = `${q.user.name} (${roleName[q.user.role]})`;
    if (aksi === 'batal') { // kembalikan ke menunggu
      if (x.status === 'MENUNGGU') return bad(r, 'Pengajuan ini belum diputuskan.');
      if (x.status === 'DISETUJUI') undoIzin(x);
      Object.assign(x, { status: 'MENUNGGU', oleh: '', catatan: '', applied: [], diputus: null }); notif(d, x.sid, 'Keputusan izin dibatalkan', `Keputusan atas pengajuan ${x.tipe.toLowerCase()} ${idTgl(x.tanggal)} dibatalkan, status kembali menunggu.`, 'izin', 'izin'); wr(d);
      act('IZIN', `batalkan keputusan izin ${x.nama} (${x.kelas}) ${x.tanggal}`, q); return r.json(izinGuru(x));
    }
    if (x.status !== 'MENUNGGU') return bad(r, 'Pengajuan ini sudah diputuskan.');
    if (aksi === 'setuju') { x.status = 'DISETUJUI'; x.applied = applyIzin(x, by); }
    else if (aksi === 'tolak') { if (!cat) return bad(r, 'Tulis alasan penolakan agar siswa tahu.'); x.status = 'DITOLAK'; }
    else return bad(r, 'Aksi tidak dikenal.');
    x.oleh = by; x.catatan = cat; x.diputus = new Date().toISOString();
    notif(d, x.sid, x.status === 'DISETUJUI' ? 'Izin disetujui' : 'Izin ditolak', `Pengajuan ${x.tipe.toLowerCase()} untuk ${idTgl(x.tanggal)} ${x.status === 'DISETUJUI' ? 'disetujui' : 'ditolak'} oleh ${by}.${cat ? ' Catatan: ' + cat : ''}`, 'izin', 'izin'); wr(d);
    act('IZIN', `${x.status} izin ${x.nama} (${x.kelas}) ${x.tipe} ${x.tanggal}`, q); r.json(izinGuru(x));
  });

  // --- laporan dari siswa ---
  app.get('/api/guru/laporan', guru, (q, r) => {
    const st = String(q.query.status || '').toUpperCase();
    r.json(rd().laporan.filter(x => lapOk(q.user, x) && (!st || x.status === st))
      .sort((a, b) => (a.status === 'MENUNGGU' ? 0 : 1) - (b.status === 'MENUNGGU' ? 0 : 1) || b.dibuat.localeCompare(a.dibuat)).slice(0, 300).map(lapGuru));
  });
  const ROM = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
  const nomorSP = (d, lv) => { const t = today(), n = d.sp.filter(x => x.tanggal.slice(0, 4) === t.slice(0, 4)).length + 1; return `${String(n).padStart(3, '0')}/SP-${lv}/${d.set.kodeSurat || 'SMKJB1'}/${ROM[Number(t.slice(5, 7)) - 1]}/${t.slice(0, 4)}`; };
  // surat peringatan otomatis: dibuat saat total poin siswa mencapai ambang (hanya tingkat tertinggi yang belum pernah diterbitkan)
  const cekSP = (d, s) => {
    const tot = poinOf(d, s.id).total; let lv = 0; d.set.spAmbang.forEach((a, i) => { if (tot >= a) lv = i + 1; });
    if (!lv || d.sp.some(x => x.sid === s.id && !x.arsip && x.level >= lv)) return null;
    const sp = { id: rid().slice(0, 12), sid: s.id, nama: s.nama, kelas: s.kelas, jurusan: s.jurusan, level: lv, total: tot, ambang: d.set.spAmbang[lv - 1], tanggal: today(), nomor: nomorSP(d, lv), status: 'BARU', dibuat: new Date().toISOString() };
    d.sp.push(sp); act('SP', `SP-${lv} otomatis: ${s.nama} (${s.kelas}) total ${tot} poin`, null); return sp;
  };
  const newPel = (d, s, jenis, judul, catatan, sumber, oleh, extra = {}) => {
    const p = { id: rid().slice(0, 12), sid: s.id, nama: s.nama, kelas: s.kelas, jenis, judul, poin: POIN[jenis], tanggal: today(), catatan, sumber, oleh, ...extra };
    d.pelanggaran.push(p); cekSP(d, s); return p;
  };
  const cekJenis = b => { const jenis = String(b.jenis || '').toUpperCase(), judul = clean(b.judul, 80); return POIN[jenis] && judul ? { jenis, judul } : null; };
  app.put('/api/guru/laporan/:id', guru, (q, r) => {
    const d = rd(), x = d.laporan.find(y => y.id === q.params.id);
    if (!x || !lapOk(q.user, x)) return bad(r, 'Laporan tidak ditemukan.', 404);
    if (x.status !== 'MENUNGGU') return bad(r, 'Laporan ini sudah diproses.');
    const aksi = String(q.body.aksi || ''), cat = clean(q.body.catatan, 300), by = `${q.user.name} (${roleName[q.user.role]})`;
    if (aksi === 'tolak') { x.status = 'DITOLAK'; x.catatan = cat; x.oleh = by; notif(d, x.pelapor || (x.pelaporUser ? 'u:' + x.pelaporUser : null), 'Laporan Anda ditanggapi', `Laporan tentang ${x.nama} (${x.kelas}) telah diperiksa dan ditolak.${cat ? ' Catatan: ' + cat : ''}`, 'laporan', 'lapor'); wr(d); act('LAPOR', `tolak laporan ${x.nama} (${x.kelas})`, q); return r.json(lapGuru(x)); }
    if (aksi !== 'terima') return bad(r, 'Aksi tidak dikenal.');
    const j = cekJenis(q.body); if (!j) return bad(r, 'Pilih jenis pelanggaran (ringan/berat) dan nama pelanggarannya.');
    const sid = x.sid || String(q.body.sid || '').toUpperCase(), s = stuById(sid);
    if (!s) return bad(r, 'Pilih siswa yang dimaksud (kelas lalu nama) terlebih dahulu.');
    if (!seeKelas(q.user, s.kelas)) return bad(r, 'Siswa di luar kelas Anda.', 403);
    const p = newPel(d, s, j.jenis, j.judul, clean(q.body.publik, 600) || x.deskripsi, 'LAPORAN', by, { laporan: x.id });
    x.status = 'DITERIMA'; x.sid = s.id; x.nama = s.nama; x.kelas = s.kelas; x.catatan = cat; x.oleh = by;
    notif(d, x.pelapor || (x.pelaporUser ? 'u:' + x.pelaporUser : null), 'Laporan Anda ditanggapi', `Laporan tentang ${x.nama} (${x.kelas}) telah diperiksa dan diterima, sudah ditindaklanjuti sekolah.${cat ? ' Catatan: ' + cat : ''}`, 'laporan', 'lapor'); wr(d);
    act('POIN', `laporan diterima: ${s.nama} (${s.kelas}) ${j.judul} +${p.poin} poin`, q); r.json(lapGuru(x));
  });

  // --- pelanggaran & poin ---
  app.get('/api/guru/siswa', guruAny, (q, r) => {
    const k = clean(q.query.kelas, 20), s = nm(q.query.q), d = rd(), pk = ['piket', 'guru'].includes(q.user.role);
    const L = peek().students.filter(x => (pk || seeKelas(q.user, x.kelas)) && (!k || x.kelas === k) && (!s || nm(x.nama).includes(s)))
      .sort((a, b) => a.kelas.localeCompare(b.kelas, 'id', { numeric: true }) || a.nama.localeCompare(b.nama, 'id')).slice(0, 200);
    r.json(L.map(x => ({ id: x.id, nama: x.nama, kelas: x.kelas, jurusan: x.jurusan, foto: FOTO.has(x.id), poin: pk ? { total: 0 } : poinOf(d, x.id) })));
  });
  app.post('/api/guru/pelanggaran', guru, (q, r) => {
    const s = stuById(String(q.body.sid || '').toUpperCase()); if (!s || !seeKelas(q.user, s.kelas)) return bad(r, 'Siswa tidak ditemukan.', 404);
    const j = cekJenis(q.body); if (!j) return bad(r, 'Pilih jenis pelanggaran (ringan/berat) dan nama pelanggarannya.');
    const d = rd(), p = newPel(d, s, j.jenis, j.judul, clean(q.body.catatan, 300), 'GURU', `${q.user.name} (${roleName[q.user.role]})`);
    if (okDate(q.body.tanggal) && q.body.tanggal <= today()) p.tanggal = q.body.tanggal;
    wr(d); act('POIN', `${s.nama} (${s.kelas}) ${j.judul} [${j.jenis}] +${p.poin} poin`, q); r.json(pelGuru(p));
  });
  app.get('/api/guru/pelanggaran', guru, (q, r) => {
    const k = clean(q.query.kelas, 20), sid = String(q.query.sid || '').toUpperCase();
    r.json(rd().pelanggaran.filter(p => !p.arsip && seeKelas(q.user, p.kelas) && (!k || p.kelas === k) && (!sid || p.sid === sid))
      .sort((a, b) => b.tanggal.localeCompare(a.tanggal) || b.id.localeCompare(a.id)).slice(0, 400).map(pelGuru));
  });
  app.delete('/api/guru/pelanggaran/:id', guru, (q, r) => {
    const d = rd(), p = d.pelanggaran.find(x => x.id === q.params.id);
    if (!p || !seeKelas(q.user, p.kelas)) return bad(r, 'Data tidak ditemukan.', 404);
    d.pelanggaran = d.pelanggaran.filter(x => x !== p); wr(d); act('POIN', `hapus pelanggaran ${p.nama} (${p.kelas}) ${p.judul} -${p.poin} poin`, q); r.json({ ok: true });
  });
  app.get('/api/guru/rekap', guru, (q, r) => {
    const k = clean(q.query.kelas, 20), d = rd(), tot = new Map();
    for (const p of d.pelanggaran) if (!p.arsip) tot.set(p.sid, (tot.get(p.sid) || 0) + p.poin);
    r.json(peek().students.filter(s => seeKelas(q.user, s.kelas) && (!k || s.kelas === k) && tot.has(s.id))
      .map(s => ({ id: s.id, nama: s.nama, kelas: s.kelas, foto: FOTO.has(s.id), poin: poinOf(d, s.id) })).sort((a, b) => b.poin.total - a.poin.total).slice(0, 300));
  });

  // --- pengaturan (kesiswaan / admin) ---
  app.get('/api/guru/pengaturan', guru, (q, r) => r.json({ ...rd().set, sesiPertama: sessions()[0] || '' }));
  // Pengaturan poin & SP: HANYA ADMIN
  app.put('/api/guru/pengaturan', guru, adminOnly, (q, r) => {
    const d = rd(), b = q.body || {}, am = (Array.isArray(b.spAmbang) ? b.spAmbang : []).map(x => Math.round(Number(x)));
    if (am.length !== 3 || am.some(x => !(x >= 1 && x <= 1000)) || !(am[0] < am[1] && am[1] < am[2])) return bad(r, 'Ambang SP-1, SP-2, SP-3 harus berupa 3 angka yang makin besar (1-1000).');
    d.set = { ...d.set, spAmbang: am, kepsek: clean(b.kepsek, 80), kesiswaan: clean(b.kesiswaan, 80), kodeSurat: clean(b.kodeSurat, 20).replace(/[^A-Za-z0-9._-]/g, '') || 'SMKJB1' };
    wr(d); act('POIN', `pengaturan SP: ambang ${am.join('/')}`, q); r.json({ ...d.set });
  });
  // Penetapan kelas masuk pagi / siang: kesiswaan + admin. Jam sesi & batas terlambat diatur di Dashboard > Jam Absen (jadwal.json).
  app.put('/api/guru/sesi', guru, kesis, (q, r) => {
    const d = rd(), b = q.body || {}, ks = {}, kl = allKelas();
    for (const [k, v] of Object.entries(b.kelasShift || {})) if (kl.includes(k) && (v === 'pagi' || v === 'siang')) ks[k] = v;
    d.set = { ...d.set, kelasShift: ks }; wr(d);
    act('POIN', `kelas masuk siang: ${Object.keys(ks).filter(k => ks[k] === 'siang').join(', ') || '-'}`, q); r.json({ ...d.set });
  });

  // --- reset poin (HANYA ADMIN): riwayat diarsipkan, bisa dibatalkan ---
  app.post('/api/admin/poin-reset', admin, (q, r) => {
    const d = rd(), b = q.body || {}; let ids;
    if (b.semua === true) ids = new Set(peek().students.map(s => s.id));
    else { ids = new Set((Array.isArray(b.sids) ? b.sids : []).map(x => String(x).toUpperCase()).filter(x => stuById(x))); if (!ids.size) return bad(r, 'Pilih minimal satu siswa.'); }
    const id = rid().slice(0, 12), aff = new Set(); let np = 0, ns = 0;
    for (const p of d.pelanggaran) if (ids.has(p.sid) && !p.arsip) { p.arsip = id; np++; aff.add(p.sid); }
    for (const x of d.sp) if (ids.has(x.sid) && !x.arsip) { x.arsip = id; ns++; aff.add(x.sid); }
    if (!np && !ns) return bad(r, 'Tidak ada poin aktif yang perlu direset.');
    d.resetLog.push({ id, at: new Date().toISOString(), oleh: q.user.name, mode: b.semua === true ? 'SEMUA' : 'PILIHAN', siswa: aff.size, pelanggaran: np, sp: ns });
    wr(d); act('POIN', `RESET poin ${b.semua === true ? 'SEMUA siswa' : aff.size + ' siswa'} (${np} pelanggaran, ${ns} SP diarsipkan)`, q); r.json({ id, siswa: aff.size, pelanggaran: np, sp: ns });
  });
  app.get('/api/admin/poin-reset', admin, (q, r) => r.json(rd().resetLog.slice().reverse().slice(0, 30)));
  app.post('/api/admin/poin-reset/:id/batal', admin, (q, r) => {
    const d = rd(), lg = d.resetLog.find(x => x.id === q.params.id); if (!lg) return bad(r, 'Data reset tidak ditemukan.', 404); if (lg.batal) return bad(r, 'Reset ini sudah dibatalkan.');
    for (const p of d.pelanggaran) if (p.arsip === lg.id) delete p.arsip; for (const x of d.sp) if (x.arsip === lg.id) delete x.arsip;
    lg.batal = true; wr(d); act('POIN', `batalkan reset poin ${lg.id} (${lg.pelanggaran} pelanggaran dipulihkan)`, q); r.json({ ok: true });
  });

  // --- notifikasi (siswa & guru pelapor) ---
  const notifRoutes = (base, mw, keyOf) => {
    app.get(base, ...mw, (q, r) => { const k = keyOf(q), L = rd().notif.filter(n => n.to === k).sort((a, b) => b.dibuat.localeCompare(a.dibuat)).slice(0, 50); r.json({ belum: L.filter(n => !n.dibaca).length, list: L }); });
    app.post(base + '/baca', ...mw, (q, r) => { const d = rd(), k = keyOf(q), id = q.body && q.body.id; let n = 0; for (const x of d.notif) if (x.to === k && !x.dibaca && (!id || x.id === id)) { x.dibaca = true; n++; } if (n) wr(d); r.json({ ok: true }); });
  };
  notifRoutes('/api/portal/notif', [siswa], q => q.user.sid);
  notifRoutes('/api/guru/notif', guruAny, q => 'u:' + q.user.username);

  // --- guru piket: laporan langsung masuk antrean kesiswaan ---
  app.post('/api/guru/piket', guruAny, piketOnly, (q, r) => {
    const s = stuById(String(q.body.sid || '').toUpperCase()); if (!s) return bad(r, 'Siswa tidak ditemukan.', 404);
    const jenis = String(q.body.jenis || '').toUpperCase(), judul = clean(q.body.judul, 80), ket = clean(q.body.deskripsi, 600);
    if (!POIN[jenis] || !judul) return bad(r, 'Pilih jenis (ringan/berat) dan nama pelanggaran.');
    if (ket.length < 5) return bad(r, 'Tulis keterangan kejadian (minimal 5 huruf).');
    let bukti = ''; if (q.body.bukti) { const img = decImg(q.body.bukti); if (!img) return bad(r, 'Foto bukti tidak valid (JPG/PNG, maksimal 5 MB).'); bukti = saveBukti(img); }
    const d = rd(), x = { id: rid().slice(0, 12), pelapor: null, pelaporUser: q.user.username, pelaporNama: q.user.name, pelaporKelas: roleName[q.user.role] || 'Guru', nama: s.nama, kelas: s.kelas, sid: s.id, deskripsi: ket, bukti, status: 'MENUNGGU', sumber: q.user.role === 'guru' ? 'GURU' : 'PIKET', saran: { jenis, judul }, dibuat: new Date().toISOString() };
    d.laporan.push(x); wr(d); act('LAPOR', `guru piket ${q.user.name} melaporkan ${s.nama} (${s.kelas}): ${judul}`, q); r.json(lapGuru(x));
  });
  app.get('/api/guru/piket', guruAny, piketOnly, (q, r) => r.json(rd().laporan.filter(x => x.pelaporUser === q.user.username).sort((a, b) => b.dibuat.localeCompare(a.dibuat)).slice(0, 200).map(lapGuru)));

  // ======================================================================
  // SURAT PERINGATAN (SP)
  // ======================================================================
  const spView = x => ({ arsip: !!x.arsip, id: x.id, sid: x.sid, nama: x.nama, kelas: x.kelas, level: x.level, total: x.total, tanggal: x.tanggal, nomor: x.nomor, status: x.status, diterbitkan: x.diterbitkan || '', foto: FOTO.has(x.sid) });
  app.get('/api/guru/sp', guru, (q, r) => {
    const k = clean(q.query.kelas, 20);
    r.json(rd().sp.filter(x => seeKelas(q.user, x.kelas) && (!k || x.kelas === k)).sort((a, b) => b.dibuat.localeCompare(a.dibuat)).slice(0, 300).map(spView));
  });
  app.post('/api/guru/sp/cek', guru, kesis, (q, r) => { const d = rd(); let n = 0; for (const s of peek().students) if (cekSP(d, s)) n++; if (n) wr(d); r.json({ dibuat: n }); });
  app.delete('/api/guru/sp/:id', guru, kesis, (q, r) => { const d = rd(), x = d.sp.find(y => y.id === q.params.id); if (!x) return bad(r, 'SP tidak ditemukan.', 404); d.sp = d.sp.filter(y => y !== x); wr(d); act('SP', `hapus SP-${x.level} ${x.nama} (${x.kelas})`, q); r.json({ ok: true }); });
  app.get('/api/sp/:id', refresh, (q, r) => {
    const d = rd(), x = d.sp.find(y => y.id === q.params.id), u = q.user; if (!x) return bad(r, 'SP tidak ditemukan.', 404);
    const staff = ['walas', 'kesiswaan', 'admin'].includes(u.role) && seeKelas(u, x.kelas), own = u.role === 'siswa' && u.sid === x.sid && x.status === 'DITERBITKAN';
    if (!staff && !own) return bad(r, 'SP tidak ditemukan.', 404);
    const wk = accounts().find(a => a.role === 'walas' && (a.kelas || []).some(k => nk(k) === nk(x.kelas)));
    r.json({ sp: x, pelanggaran: d.pelanggaran.filter(p => p.sid === x.sid && (!p.arsip || p.arsip === x.arsip)).sort((a, b) => a.tanggal.localeCompare(b.tanggal)).map(p => ({ tanggal: p.tanggal, judul: p.judul, jenis: p.jenis, poin: p.poin })),
      poin: poinOf(d, x.sid), set: { kepsek: d.set.kepsek, kesiswaan: d.set.kesiswaan, spAmbang: d.set.spAmbang }, walas: wk ? wk.name : '', boleh: staff && isKes(u), today: today() });
  });
  app.post('/api/sp/:id/terbit', guru, kesis, (q, r) => {
    const d = rd(), x = d.sp.find(y => y.id === q.params.id); if (!x) return bad(r, 'SP tidak ditemukan.', 404);
    if (x.status !== 'DITERBITKAN') { x.status = 'DITERBITKAN'; x.diterbitkan = today(); x.oleh = q.user.name; notif(d, x.sid, 'Surat Peringatan diterbitkan', `SP-${x.level} atas nama Anda telah diterbitkan. Lihat dan cetak di menu Surat Peringatan.`, 'sp', 'sp'); wr(d); act('SP', `terbitkan SP-${x.level} ${x.nama} (${x.kelas})`, q); }
    r.json(spView(x));
  });
  app.get('/api/portal/sp', siswa, (q, r) => r.json(rd().sp.filter(x => x.sid === q.user.sid && x.status === 'DITERBITKAN').sort((a, b) => b.dibuat.localeCompare(a.dibuat)).map(spView)));

  // ---------- terlambat otomatis per sesi masuk (pagi / siang) ----------
  // Kelas dipilah ke "pagi" atau "siang" di Panel Guru > Pengaturan. Hadir lewat batas jam sesi kelasnya
  // => absen ditandai Terlambat + pelanggaran ringan "Terlambat" (5 poin) otomatis (sekali per hari).
  globalThis.__hadir = (s, date, time, sesi) => {
    const d = rd(), ses = jad().list.find(x => x.name === sesi), sh = (ses && ses.shift) || shiftOf(d, s.kelas);
    let b = ses && ses.batas; // batas terlambat diambil dari Jam Absen (dashboard)
    if (!b) { const lg = ((d.set.shifts[sh] || {}).batas) || d.set.batasTelat; if (lg && sesi === sessions()[0]) b = lg; } // data lama
    if (!b || !/^\d\d:\d\d$/.test(b) || time <= b) return;
    if (d.izin.some(x => x.sid === s.id && x.tanggal === date && x.status === 'DISETUJUI')) return;
    const db = load(), l = db.absen.find(x => x.id === s.id && x.date === date && x.session === sesi);
    if (l && !l.telat) { l.telat = true; l.shift = sh; save(db); }
    if (d.pelanggaran.some(p => p.sid === s.id && p.tanggal === date && p.auto === 'TELAT')) return;
    const p = newPel(d, s, 'RINGAN', 'Terlambat', `Hadir pukul ${time} (batas masuk ${sesi} ${b})`, 'OTOMATIS', 'Sistem', { auto: 'TELAT' });
    p.tanggal = date; wr(d); act('POIN', `${s.nama} (${s.kelas}) terlambat pukul ${time}, sesi ${sesi} +${p.poin} poin (otomatis)`, null);
  };
};

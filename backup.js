// Cadangan lengkap: data.json, akun.json, sekolah.json, kartu.json, jadwal.json + folder uploads/ -> backup/full-TANGGAL-JAM/
// Jalankan: node backup.js   (atau klik BACKUP.bat). Salin foldernya ke flashdisk / cloud secara berkala.
const fs = require('fs'), path = require('path');
const t = new Date(), z = n => String(n).padStart(2, '0');
const dir = path.join(__dirname, 'backup', `full-${t.getFullYear()}-${z(t.getMonth() + 1)}-${z(t.getDate())}-${z(t.getHours())}${z(t.getMinutes())}`);
fs.mkdirSync(dir, { recursive: true });
for (const f of ['data.json', 'akun.json', 'sekolah.json', 'kartu.json', 'jadwal.json']) if (fs.existsSync(path.join(__dirname, f))) fs.copyFileSync(path.join(__dirname, f), path.join(dir, f));
if (fs.existsSync(path.join(__dirname, 'uploads'))) fs.cpSync(path.join(__dirname, 'uploads'), path.join(dir, 'uploads'), { recursive: true });
const all = fs.readdirSync(path.join(__dirname, 'backup')).filter(x => /^full-/.test(x)).sort();
all.slice(0, -10).forEach(x => fs.rmSync(path.join(__dirname, 'backup', x), { recursive: true, force: true }));
console.log('Cadangan tersimpan di:', dir, '\n(10 cadangan terakhir disimpan. Salin ke tempat lain agar aman.)');

ABSENSI KEHADIRAN SISWA - SMK JAKARTA BARAT 1
(sistem sama seperti aplikasi absensi sholat: tema biru, rekap Excel untuk kehadiran, ada keterangan ALFA / IZIN / SAKIT)

CARA MENJALANKAN
1. Install Node.js (nodejs.org) sekali saja di komputer.
2. Klik 2x file JALANKAN.bat. Server menyala dan browser terbuka otomatis.
   (Folder node_modules sudah disertakan, jadi tidak perlu npm install atau npm start.)
3. Login di http://localhost:3000 . Dari HP (satu Wi-Fi) buka alamat yang tampil di terminal.
4. Kamera scan di HP: buka alamat https (port 3443) yang tampil di terminal, pilih Lanjutkan/Advanced > Proceed (sekali).

PAKAI DATA & AKUN YANG SAMA DENGAN ABSENSI SHOLAT
Cara paling mudah (server dalam keadaan mati):
  salin file  data.json  dan  akun.json  dari folder aplikasi absensi sholat ke folder ini.
  Hasilnya: semua siswa, kelas, KODE/BARCODE, dan akun admin/OSIS (beserta password) sama persis.
  Kartu siswa/barcode yang sudah dicetak tetap bisa dipakai untuk absen kehadiran.
  Catatan sholat di data.json tidak dipakai dan tidak dihapus oleh aplikasi ini.
Cara lain: tab Database > Pulihkan, pilih file cadangan dari aplikasi absensi sholat (yang diambil hanya data siswa).
Jika tidak disalin, aplikasi membuat akun bawaan sendiri:
  admin / Admin@123     osis1 / Osis1@123 ... osis5 / Osis5@123
Admin dapat membuat akun OSIS, mengganti password, atau menghapus akun di tab Akun.

SATU PC UNTUK DUA APLIKASI
Aplikasi ini memakai port yang sama dengan absensi sholat (3000 dan 3443), jadi jalankan salah satu saja, atau matikan yang satu dulu.
Barcode pada kartu berisi alamat http://IP:3000/s/KODE. Agar kartu bisa discan dengan kamera bawaan HP, jalankan di port 3000.
Scan lewat tombol "Buka kamera" atau scanner USB di dalam aplikasi tetap jalan di port berapa pun.
Untuk menjalankan bersamaan, ubah port lewat CMD:   set PORT=3001 && set HPORT=3444 && node server.js

CARA ABSEN
Tab Scan: scanner USB / ketik kode / kamera. Kartu yang discan = HADIR (dicatat jam scan), sekali per hari per sesi.
Jam absensi (tab Jam Absen): bawaan satu sesi "Masuk" pukul 05:00-15:00. Admin bisa mengubah jamnya atau menambah sesi
(misalnya "Pulang"). Scan di luar jam sesi ditolak. Siswa yang scan setelah diberi keterangan ALFA/IZIN/SAKIT otomatis menjadi HADIR.

KETERANGAN TIDAK HADIR (ALFA / IZIN / SAKIT)
Dashboard > daftar "Tidak hadir": pilih keterangan pada dropdown di samping nama siswa (admin dan OSIS bisa).
- Pilih "Belum diisi" untuk menghapus keterangan.
- Filter "Kelas" dan "Tampilkan" membantu mengisi per kelas / hanya yang belum diisi.
- Kotak "Cari nama siswa" mencari berdasarkan nama, kelas, atau kode di daftar Hadir dan Tidak hadir.
- Klik kartu angka (Sakit / Izin / Alfa / Belum diisi) untuk langsung menyaring daftar.
- Tombol "Belum diisi -> ALFA": menandai sekaligus semua siswa yang belum hadir dan belum punya keterangan (sesuai kelas yang dipilih).
Siswa yang sudah hadir tidak bisa diberi keterangan.

REKAP EXCEL (Dashboard > Jenis rekap Excel)
Harian (sesi terpilih): sheet Ringkasan, Tidak Hadir (kolom Keterangan: ALFA/IZIN/SAKIT/Belum diisi), Hadir (dengan jam),
lalu sheet khusus Sakit, Izin, Alfa, dan Belum Diisi.
Mingguan (Senin-Minggu), semua sesi atau satu sesi: sheet Ringkasan, Per Siswa (kolom per tanggal berisi jam scan atau
ALFA/IZIN/SAKIT, ada total Hadir/Sakit/Izin/Alfa/Belum diisi dan persen hadir), Detail Catatan, Per Tanggal, Per Kelas, Tidak Pernah Hadir.
Sheet Hadir, Sakit, Izin, Alfa di rekap mingguan berisi daftar siswa beserta jumlah dan tanggalnya.
Pilihan "Isi Excel" (Hadir saja / Sakit saja / Izin saja / Alfa saja) membuat file Excel yang hanya berisi status itu,
baik untuk rekap harian maupun mingguan.
Pilih kelas di dashboard sebelum download untuk mendapat rekap satu kelas saja. Semua sheet punya filter (panah).
Persentase dihitung dari hari efektif (tanggal yang ada siswa hadir), jadi hari libur tidak dihitung tidak hadir.

FITUR LAIN (sama seperti absensi sholat)
Siswa (tambah, import Excel, edit, hapus), Rombel / naik kelas, hapus kelas, Kartu (cari, 10/50/100 per halaman, cetak 10 per lembar A4),
Database (unduh cadangan & pulihkan, cadangan otomatis harian di folder backup), Akun, Reset (khusus admin), suara hasil scan,
tampilan HP, log aktivitas.

LOG AKTIVITAS
Semua aktivitas tampil di jendela CMD server dan tersimpan di aktivitas.log
(login, scan, keterangan, tambah/hapus siswa, import, reset, download, kelola akun).
Untuk memantau dari CMD lain:  npm run log        (30 baris terakhir + live)
                               npm run log -- 100 (100 baris terakhir)

DATA
Disimpan di data.json (siswa + catatan kehadiran). Jam absensi di jadwal.json. Akun di akun.json.


==================== FITUR BARU ====================
PERAN & LOGIN
- Admin / OSIS : seperti sebelumnya (halaman utama, kini bertampilan sidebar).
- Siswa        : login di halaman yang sama. Username = KODE KARTU, password awal = KODE KARTU (bisa diganti siswa di Profil Saya).
                 Siswa lupa password: tab Siswa > Reset PW.
- Wali Kelas   : dibuat admin di tab Akun (pilih Peran = Wali Kelas, pilih kelas yang diampu). Hanya melihat siswa/izin/laporan kelasnya.
- Kesiswaan    : dibuat admin di tab Akun. Melihat semua kelas + Pengaturan Poin.

FOTO SISWA
- Siswa unggah sendiri di Portal > Profil Saya. Admin juga bisa: tab Siswa > tombol Foto. Disimpan di folder uploads/foto.

PENGAJUAN IZIN (Portal siswa > Pengajuan Izin)
- Wajib: tanggal, keterangan (Izin/Sakit), alasan, dan FOTO surat/bukti. Tanpa foto tidak bisa dikirim. Nama & kelas terisi otomatis (terkunci).
- Hanya Wali Kelas (kelas terkait) dan Kesiswaan yang bisa melihat & menyetujui/menolak. Admin/OSIS tidak melihat pengajuan.
- Jika disetujui, status siswa otomatis IZIN/SAKIT pada tanggal itu; keputusan bisa dibatalkan.

POIN PELANGGARAN
- Ringan = 5 poin, Berat = 25 poin (ubah di fitur.js, konstanta POIN). Siswa mulai dari 100 poin kedisiplinan (bisa diubah Kesiswaan).
- Wali Kelas/Kesiswaan input di menu Input Pelanggaran. Terlambat otomatis: Kesiswaan isi "Batas jam terlambat" di Pengaturan Poin (bawaan nonaktif).
LAPOR PELANGGARAN
- Siswa wajib mengisi nama & kelas yang melanggar, penjelasan, dan foto bukti. Wali Kelas/Kesiswaan memeriksa, lalu terima (beri poin) atau tolak.

DATA BARU: sekolah.json (izin, pelanggaran, laporan, password siswa) + folder uploads/. Ikut dicadangkan harian di folder backup/.

==================== FITUR TAMBAHAN (SP, GURU PIKET, SESI PAGI/SIANG) ====================
SURAT PERINGATAN (SP) OTOMATIS
- Saat total poin siswa mencapai ambang (bawaan 25 / 50 / 75 = SP-1 / SP-2 / SP-3), draf SP dibuat otomatis. Ambang diubah di Panel Guru > Pengaturan.
- Panel Guru > Surat Peringatan: buka surat (berkop SMK Jakarta Barat 1), teks boleh diedit, lalu "Terbitkan & Cetak". Siswa melihat SP-nya di portal setelah diterbitkan.
- Nama Kepala Sekolah & Kesiswaan diisi di Pengaturan (muncul di tanda tangan). Isi surat adalah draf baku, silakan sesuaikan dengan tata tertib sekolah.
GURU PIKET
- Buat akun di tab Akun dengan Peran = Guru Piket. Guru piket memilih siswa mana pun dan melapor; laporan langsung masuk antrean Kesiswaan (wali kelas tidak melihatnya).
SESI MASUK PAGI / SIANG + TERLAMBAT OTOMATIS
- Panel Guru > Pengaturan: pilih kelas masuk Pagi atau Siang, isi "Batas masuk" tiap sesi.
- Siswa yang scan lewat batas sesi kelasnya otomatis ditandai Terlambat + 5 poin (sekali per hari; dilewati bila izin disetujui).
- Pastikan jam sesi di menu Jam Absen admin mencakup jam kedua sesi (mis. 05:00 sampai 18:00).

==================== PEMBARUAN: POIN BERTAMBAH, NOTIFIKASI, GURU, RESET ====================
- Poin pelanggaran BERTAMBAH tiap pelanggaran (tidak ada lagi "poin awal 100 / sisa poin"). Portal siswa menampilkan total poin dan progres menuju SP berikutnya.
- Notifikasi (ikon lonceng + menu Notifikasi) untuk siswa: izin disetujui/ditolak/dibatalkan, laporan yang dikirim sudah ditanggapi, SP diterbitkan.
  Guru pelapor juga dapat notifikasi saat laporannya ditanggapi kesiswaan.
- Peran baru "Guru (pelapor)": guru mana pun bisa melaporkan siswa; laporan masuk antrean Kesiswaan. (Guru Piket tetap ada, cara kerjanya sama.)
- Pengaturan Poin & SP (ambang SP, nama kepsek/kesiswaan, kode surat): HANYA ADMIN. Wali kelas, guru, guru piket, dan kesiswaan tidak bisa mengubah.
- Sesi Masuk Pagi/Siang & batas terlambat: bisa diatur Kesiswaan dan Admin.
- Reset Poin: HANYA ADMIN (Panel Guru > Reset Poin). Bisa untuk semua siswa atau beberapa siswa terpilih.
  Reset mengarsipkan pelanggaran & SP aktif (riwayat tidak hilang) dan bisa dibatalkan di Riwayat Reset. Setelah reset, siswa mulai dari 0 poin dan SP bisa terbit lagi.

==================== REKAP EXCEL BULANAN & LAPORAN ANONIM ====================
- Panel Guru > Rekap Excel (Kesiswaan & Admin): unduh rekap absensi per bulan. Pilih bulan, sesi (Semua / Pagi / Siang), dan kelas (opsional).
  Isi: sheet Ringkasan Kelas, Rekap Pagi, Rekap Siang (per siswa per tanggal H/T/S/I/A, total, % hadir). Kelas pagi/siang mengikuti Sesi Masuk & Terlambat.
- Rekap OTOMATIS: server membuat file untuk setiap bulan yang sudah lewat (folder rekap/, dicek tiap jam). Bisa diunduh lagi dari menu yang sama.
- Hari efektif = tanggal yang ada siswa hadir pada sesi tersebut. Siswa tanpa catatan di hari efektif dihitung A (alfa).
- Lapor pelanggaran: siswa boleh melapor tanpa nama/kelas (wajib foto + penjelasan/ciri-ciri). Kesiswaan memeriksa foto lalu memilih siswa yang dimaksud.
- Setelah diterima, pelanggaran + foto bukti tampil di halaman siswa terlapor dengan pelapor ANONIM. Kesiswaan bisa mengedit keterangan yang tampil agar tidak membuka identitas pelapor.

==================== SINKRON JAM ABSEN, SESI PAGI/SIANG, TERLAMBAT ====================
- SATU jadwal: Dashboard > Jam Absen (jadwal.json). Tiap sesi punya: nama, mulai, selesai, "Untuk kelas" (Semua / Masuk pagi / Masuk siang), dan "Batas terlambat".
  Contoh: "Masuk Pagi" 05:00-12:00 untuk kelas pagi, terlambat lewat 07:00; "Masuk Siang" 12:00-18:00 untuk kelas siang, terlambat lewat 13:00.
- Bar jam di dashboard menampilkan sesi yang sedang berlangsung beserta jam dan batas terlambatnya.
- Kelas mana yang masuk pagi / siang ditetapkan di Panel Guru > Sesi Masuk & Terlambat (Kesiswaan / Admin). Halaman itu menampilkan jam sesi (baca saja).
- Scan di sesi yang bukan untuk kelas siswa ditolak dengan pesan jelas. Dashboard per sesi hanya menghitung kelas yang sesuai sesi itu.
- Scan setelah batas terlambat sesi = otomatis "Terlambat" + poin ringan (sekali per hari; dilewati bila izin disetujui).
- Rekap Excel bulanan memakai sesi milik tiap kelas. Tersedia di dashboard (Jenis rekap Excel: Bulanan - Pagi & Siang / hanya Pagi / hanya Siang) dan di Panel Guru > Rekap Excel.
- Jam sesi sebaiknya tidak saling bertumpuk (sistem menolak jam yang bertumpuk).

==================== STRUKTUR FOLDER BARU ====================
Tampilan dipisah per dashboard (admin, kesiswaan, walas, guru, siswa) dengan HTML, CSS, JS di folder berbeda.
Lihat STRUKTUR-FOLDER.txt. Alamat baru: /admin/  /kesiswaan/  /walas/  /guru/  /siswa/  /login/  /sp/
Panel Guru lama (guru.html) kini terpecah: Kesiswaan -> /kesiswaan/, Wali Kelas -> /walas/, Guru & Piket -> /guru/, Admin -> /admin/kedisiplinan.html

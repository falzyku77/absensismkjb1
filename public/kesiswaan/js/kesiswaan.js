/* Dashboard Kesiswaan: memilih fitur panel yang dipakai (kode fitur ada di /shared/js/panel/). */
startPanel({
  brand: 'KESISWAAN',
  features: ['ringkas', 'izin', 'laporan', 'input', 'sp', 'rekap', 'riwayat', 'excel', 'sesi']
}).catch(e => toast(e.message, 'bad'));

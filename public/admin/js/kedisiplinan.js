/* Dashboard Kedisiplinan (Admin): memilih fitur panel yang dipakai (kode fitur ada di /shared/js/panel/). */
startPanel({
  brand: 'KEDISIPLINAN (ADMIN)',
  features: ['ringkas', 'izin', 'laporan', 'input', 'sp', 'rekap', 'riwayat', 'excel', 'sesi', 'set', 'reset', 'piket', 'piketriw', 'back']
}).catch(e => toast(e.message, 'bad'));

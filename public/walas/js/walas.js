/* Dashboard Wali Kelas: memilih fitur panel yang dipakai (kode fitur ada di /shared/js/panel/). */
startPanel({
  brand: 'WALI KELAS',
  features: ['ringkas', 'izin', 'laporan', 'input', 'sp', 'rekap', 'riwayat']
}).catch(e => toast(e.message, 'bad'));

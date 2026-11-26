/* Dashboard Guru: memilih fitur panel yang dipakai (kode fitur ada di /shared/js/panel/). */
startPanel({
  brand: R => (R.role === 'piket' ? 'GURU PIKET' : 'GURU'),
  features: ['piket', 'piketriw', 'notif']
}).catch(e => toast(e.message, 'bad'));

let ME = null, picIz = null, picLp = null;
const MENU = [
  { id: 'profil', label: 'Profil Saya', icon: 'user' }, { id: 'notif', label: 'Notifikasi', icon: 'bell', badge: 1 }, { id: 'poin', label: 'Poin Pelanggaran', icon: 'warn' },
  { id: 'riwayatp', label: 'Riwayat Pelanggaran', icon: 'clock' }, { id: 'absen', label: 'Riwayat Absen', icon: 'cal' },
  { id: 'izin', label: 'Pengajuan Izin', icon: 'file' }, { id: 'lapor', label: 'Lapor Pelanggaran', icon: 'flag' }, { id: 'sp', label: 'Surat Peringatan', icon: 'warn' }];
buildMenu(MENU); $('#burger').innerHTML = ico('menu'); $('#icIzin').innerHTML = ico('file');
$('#out').innerHTML = ico('out') + ' Keluar';

const table = (head, rows) => `<table><tr>${head.map(h => `<th>${h}</th>`).join('')}</tr>${rows.join('')}</table>`;

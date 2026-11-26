/* ---------- navigasi & mulai ---------- */
const LOAD = { notif: () => pollNotif(true), sp: loadSP, profil: loadMe, poin: loadPel, riwayatp: loadPel, absen: loadAbs, izin: loadIzin, lapor: () => { loadLapor(); if (lpF.kelas.options.length < 2) loadKelas().catch(e => toast(e.message, 'bad')); } };
loadMe();
const nav2 = nav(id => { const f = LOAD[id]; if (f) Promise.resolve(f()).catch(e => toast(e.message, 'bad')); });

const fs=require('fs'),f=require('path').join(__dirname,'aktivitas.log'),n=+process.argv[2]||30;
const CL={LOGIN:32,GAGAL:31,DITOLAK:31,RESET:31,SCAN:36,KET:35,DUPLIKAT:33,SISWA:35,IMPORT:35,AKUN:34,EXPORT:32,KELUAR:90,SERVER:33,JADWAL:33,IZIN:33,POIN:31,LAPOR:35,FOTO:36};
const show=l=>{if(!l)return;const m=l.match(/^(\[[^\]]+\]) (\S+)\s+(.*)$/);console.log(m?`\x1b[90m${m[1]}\x1b[0m \x1b[${CL[m[2]]||37}m${m[2].padEnd(8)}\x1b[0m ${m[3]}`:l)};
if(!fs.existsSync(f))fs.writeFileSync(f,'');
let pos=fs.statSync(f).size;
fs.readFileSync(f,'utf8').split('\n').slice(-n-1).forEach(show);
console.log('\n--- Memantau aktivitas (tekan Ctrl+C untuk keluar) ---\n');
fs.watchFile(f,{interval:500},st=>{if(st.size<pos)pos=0;if(st.size===pos)return;const fd=fs.openSync(f,'r'),b=Buffer.alloc(st.size-pos);fs.readSync(fd,b,0,b.length,pos);fs.closeSync(fd);pos=st.size;b.toString('utf8').split('\n').forEach(show)});

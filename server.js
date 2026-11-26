const crypto=require('crypto'),https=require('https'),ExcelJS=require('exceljs'),selfsigned=require('selfsigned');
const express=require('express'),fs=require('fs'),os=require('os'),path=require('path'),QR=require('qrcode');
const app=express(),PORT=+process.env.PORT||3000,HPORT=+process.env.HPORT||3443,DB=path.join(__dirname,'data.json');
// ===== Log aktivitas: tampil di CMD + disimpan di aktivitas.log =====
const LOGF=path.join(__dirname,'aktivitas.log'),CL={LOGIN:32,GAGAL:31,DITOLAK:31,RESET:31,SCAN:36,KET:35,DUPLIKAT:33,SISWA:35,IMPORT:35,AKUN:34,EXPORT:32,KELUAR:90,SERVER:33,JADWAL:33,IZIN:33,POIN:31,LAPOR:35,FOTO:36};
const act=(type,msg,q)=>{const t=new Date().toLocaleString('sv'),cl=x=>String(x).replace(/[\x00-\x1f\x7f]/g,' '),m=cl(msg),by=q&&q.user?`  oleh ${cl(q.user.name)}`:'',ip=q&&q.ip?`  (${q.ip.replace('::ffff:','')})`:'';
 console.log(`\x1b[90m[${t}]\x1b[0m \x1b[${CL[type]||37}m${type.padEnd(8)}\x1b[0m ${m}\x1b[90m${by}${ip}\x1b[0m`);
 fs.appendFile(LOGF,`[${t}] ${type.padEnd(8)} ${m}${by}${ip}\n`,()=>{})};
const logScan=(x,q)=>x.ok?act(x.dup?'DUPLIKAT':'SCAN',`${x.s.nama} (${x.s.kelas} ${x.s.jurusan}) - ${x.p} ${x.dup?'sudah hadir jam':'hadir jam'} ${x.time}${x.was?` (menggantikan ${x.was})`:''}`,q):act('DITOLAK',x.s?`${x.s.nama}: ${x.msg}`:x.msg,q);
// ===== Keamanan untuk mode ONLINE (aman juga dipakai lokal) =====
// Variabel opsional: TRUST_PROXY=1 (di belakang Nginx/Caddy/Cloudflare), HOST=127.0.0.1, ADMIN_IPS=192.168.100.,36.x.x.x, NO_HTTPS=1
if(process.env.TRUST_PROXY)app.set('trust proxy',process.env.TRUST_PROXY==='1'?1:process.env.TRUST_PROXY);
app.disable('x-powered-by');
app.use((q,r,n)=>{r.set({'X-Content-Type-Options':'nosniff','X-Frame-Options':'DENY','Referrer-Policy':'same-origin','Permissions-Policy':'camera=(self), microphone=(), geolocation=()'});
 if(q.secure)r.set('Strict-Transport-Security','max-age=15552000');
 if(!['GET','HEAD','OPTIONS'].includes(q.method)&&q.headers.origin){let ok=false;try{const h=new URL(q.headers.origin).host;ok=h===q.headers.host||(process.env.TRUST_PROXY&&h===q.headers['x-forwarded-host'])}catch{}
  if(!ok)return r.status(403).json({msg:'Permintaan ditolak (asal tidak cocok).'})}
 n()});
const ADM_IPS=String(process.env.ADMIN_IPS||'').split(',').map(x=>x.trim()).filter(Boolean),cIp=q=>String(q.ip||'').replace('::ffff:',''),okAdmIp=q=>!ADM_IPS.length||ADM_IPS.some(x=>cIp(q)===x||(x.endsWith('.')&&cIp(q).startsWith(x))||cIp(q)==='127.0.0.1'||cIp(q)==='::1');
const SECK=q=>q.secure?'; Secure':'';
app.use((q,r,n)=>express.json({limit:sess.get(cookie(q).sid)?'8mb':'20kb'})(q,r,n));
// ===== Login & peran (admin / osis) =====
const AK=path.join(__dirname,'akun.json'),sess=new Map(),fails=new Map();
if(!fs.existsSync(AK)){const pw0=crypto.randomBytes(9).toString('base64url');fs.writeFileSync(AK,JSON.stringify([{username:'admin',password:pw0,role:'admin',name:'Admin'}],null,2));console.log(`\n=== AKUN ADMIN BARU DIBUAT ===\nUsername: admin\nPassword: ${pw0}\n(catat sekarang, lalu ganti di tab Akun)\n`)}
const accounts=()=>JSON.parse(fs.readFileSync(AK));
const same=(a,b)=>{const h=x=>crypto.createHash('sha256').update(x).digest();return crypto.timingSafeEqual(h(a),h(b))};
const cookie=q=>Object.fromEntries((q.headers.cookie||'').split(';').map(x=>x.trim().split('=')).filter(x=>x[0]));
const admin=(q,r,n)=>q.user.role==='admin'?n():r.status(403).json({msg:'Fitur ini hanya untuk admin.'});
app.use((q,r,n)=>{q.user=sess.get(cookie(q).sid);
 if(q.user||q.path==='/login.html'||q.path==='/api/login'||q.path==='/logo.jpg'||q.path.startsWith('/login/')||q.path.startsWith('/shared/img/'))return n();
 if(q.path.startsWith('/api/'))return r.status(401).json({msg:'Silakan login.'});
 r.redirect('/login/?next='+encodeURIComponent(q.originalUrl))});
// ===== Zona dashboard per peran: tiap peran hanya boleh membuka folder dashboard miliknya =====
//   /admin/ (admin, OSIS)  /siswa/  /walas/  /kesiswaan/  /guru/ (guru, guru piket)  /sp/ (surat peringatan)  /shared/ (aset bersama)
const HOME={admin:'/admin/',osis:'/admin/',siswa:'/siswa/',walas:'/walas/',kesiswaan:'/kesiswaan/',guru:'/guru/',piket:'/guru/'};
const ZONES={admin:['admin','osis'],siswa:['siswa'],walas:['walas'],kesiswaan:['kesiswaan'],guru:['guru','piket'],sp:['admin','siswa','walas','kesiswaan']};
app.use((q,r,n)=>{const u=q.user,p=q.path;
 if(u&&['admin','osis'].includes(u.role)&&!okAdmIp(q))return p.startsWith('/api/')?r.status(403).json({msg:'Hanya dari jaringan sekolah.'}):r.status(403).send('Akses admin hanya dari jaringan sekolah.');
 if(!u)return n();
 const baru=['siswa','walas','kesiswaan','piket','guru'].includes(u.role);
 if(p.startsWith('/api/')){
  if(!baru)return n();
  if(u.role==='siswa'&&u.mc&&p.startsWith('/api/portal/')&&!['/api/portal/me','/api/portal/password'].includes(p))return r.status(403).json({msg:'Anda wajib mengganti password terlebih dahulu.',wajibGanti:true});
  const ok=/^\/api\/(me|logout|login)$/.test(p)||/^\/api\/(foto|bukti|sp)\//.test(p)||p.startsWith(u.role==='siswa'?'/api/portal/':'/api/guru/');
  return ok?n():r.status(403).json({msg:'Fitur ini tidak tersedia untuk akun Anda.'})}
 const home=HOME[u.role]||'/login/',qs=q.url.includes('?')?q.url.slice(q.url.indexOf('?')):'';
 if(p==='/'||p==='/index.html'||p==='/portal.html'||p==='/guru.html')return r.redirect(home);   // alamat lama
 if(p==='/sp.html')return r.redirect('/sp/'+qs);
 const z=p.split('/')[1];
 if(ZONES[z]){let ok=ZONES[z].includes(u.role);if(z==='admin'&&/kedisiplinan/.test(p)&&u.role!=='admin')ok=false;if(!ok)return r.redirect(home)}
 else if(baru&&!['shared','login'].includes(z)&&p!=='/logo.jpg')return r.redirect(home);
 n()});
app.get('/login.html',(q,r)=>r.redirect('/login/'+(q.url.includes('?')?q.url.slice(q.url.indexOf('?')):'')));
app.get('/logo.jpg',(q,r)=>r.sendFile(path.join(__dirname,'public','shared','img','logo.jpg')));
app.post('/api/login',(q,r)=>{const f=fails.get(q.ip)||{n:0,t:0},fresh=Date.now()-f.t<60000;
 if(f.n>=5&&fresh){act('GAGAL','login diblokir sementara (terlalu banyak percobaan)',q);return r.status(429).json({msg:'Terlalu banyak percobaan. Coba lagi 1 menit lagi.'})}
 const uk='u:'+String(q.body.username||'').trim().toLowerCase().slice(0,30),fu=fails.get(uk)||{n:0,t:0};
 if(fu.n>=10&&Date.now()-fu.t<300000){act('GAGAL','login diblokir sementara untuk akun '+uk.slice(2),q);return r.status(429).json({msg:'Akun ini dikunci sementara karena terlalu banyak percobaan. Coba lagi 5 menit lagi.'})}
 let a=accounts().find(x=>x.username===String(q.body.username||'').trim().toLowerCase());
 if(!a&&globalThis.__siswaLogin)a=globalThis.__siswaLogin(q.body.username,String(q.body.password||''));
 if(!a||(!a._ok&&!okPw(a,String(q.body.password||'')))){fails.set(q.ip,{n:(fresh?f.n:0)+1,t:Date.now()});fails.set(uk,{n:(Date.now()-fu.t<300000?fu.n:0)+1,t:Date.now()});act('GAGAL',`login gagal, username "${String(q.body.username||'').slice(0,30)}"`,q);return r.status(401).json({msg:'Username atau password salah.'})}
 if(['admin','osis'].includes(a.role)&&!okAdmIp(q)){act('DITOLAK',`login ${a.username} ditolak: IP di luar daftar ADMIN_IPS`,q);return r.status(403).json({msg:'Akun admin/OSIS hanya bisa login dari jaringan sekolah.'})}
 fails.delete(q.ip);fails.delete(uk);if(!a._ok)migrate(a,String(q.body.password));const t=crypto.randomBytes(24).toString('hex');sess.set(t,{username:a.username,role:a.role,name:a.name,kelas:a.kelas,sid:a.sid,mc:a.mc});act('LOGIN',`${a.name} masuk sebagai ${a.role}`,q);
 r.setHeader('Set-Cookie',`sid=${t}; HttpOnly; Path=/; SameSite=Lax; Max-Age=43200${SECK(q)}`);r.json({ok:true,role:a.role})});
app.post('/api/logout',(q,r)=>{act('KELUAR','keluar dari sistem',q);sess.delete(cookie(q).sid);r.setHeader('Set-Cookie','sid=; Path=/; Max-Age=0'+SECK(q));r.json({ok:true})});
app.get('/api/me',(q,r)=>r.json(q.user));
const esc=x=>String(x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const hashPw=pw=>{const t=crypto.randomBytes(16).toString('hex');return t+':'+crypto.scryptSync(pw,t,32).toString('hex')};
const okPw=(a,pw)=>{if(!a.hash)return same(a.password||'',pw);const[t,h]=a.hash.split(':');return crypto.timingSafeEqual(crypto.scryptSync(pw,t,32),Buffer.from(h,'hex'))};
const saveAk=a=>fs.writeFileSync(AK,JSON.stringify(a,null,2));
const migrate=(a,pw)=>{if(!a.password)return;const all=accounts(),x=all.find(y=>y.username===a.username);if(x){x.hash=hashPw(pw);delete x.password;saveAk(all)}};
const pub=a=>({username:a.username,name:a.name,role:a.role,kelas:a.kelas});
const kick=u=>{for(const[t,v]of sess)if(v.username===u)sess.delete(t)};
app.get('/api/accounts',admin,(q,r)=>r.json(accounts().map(pub)));
app.post('/api/accounts',admin,(q,r)=>{const name=String(q.body.name||'').trim(),un=String(q.body.username||'').trim().toLowerCase(),pw=String(q.body.password||'');
 if(!name)return r.status(400).json({msg:'Nama wajib diisi.'});
 if(!/^[a-z0-9._-]{3,20}$/.test(un))return r.status(400).json({msg:'Username 3-20 karakter: huruf kecil, angka, titik, minus, atau garis bawah.'});
 if(pw.length<6)return r.status(400).json({msg:'Password minimal 6 karakter.'});
 const a=accounts();if(a.some(x=>x.username===un))return r.status(400).json({msg:'Username sudah dipakai.'});
 const role=['osis','walas','kesiswaan','piket','guru'].includes(q.body.role)?q.body.role:'osis';let kelas;
 if(role==='walas'){kelas=(Array.isArray(q.body.kelas)?q.body.kelas:String(q.body.kelas||'').split(',')).map(x=>clean(x,20)).filter(Boolean);if(!kelas.length)return r.status(400).json({msg:'Wali kelas wajib memilih minimal satu kelas.'})}
 a.push({username:un,name,role,...(kelas?{kelas}:{}),hash:hashPw(pw)});saveAk(a);act('AKUN',`buat akun ${role} ${name} (${un})${kelas?' kelas '+kelas.join(', '):''}`,q);r.json(pub(a[a.length-1]))});
app.put('/api/accounts/:u/password',admin,(q,r)=>{const pw=String(q.body.password||'');if(pw.length<6)return r.status(400).json({msg:'Password minimal 6 karakter.'});
 const a=accounts(),x=a.find(y=>y.username===q.params.u);if(!x)return r.status(404).json({msg:'Akun tidak ditemukan.'});
 x.hash=hashPw(pw);delete x.password;saveAk(a);if(x.username!==q.user.username)kick(x.username);act('AKUN',`ganti password ${x.username}`,q);r.json({ok:true})});
app.delete('/api/accounts/:u',admin,(q,r)=>{const a=accounts(),x=a.find(y=>y.username===q.params.u);
 if(!x)return r.status(404).json({msg:'Akun tidak ditemukan.'});if(x.role==='admin')return r.status(400).json({msg:'Akun admin tidak bisa dihapus.'});
 saveAk(a.filter(y=>y!==x));kick(x.username);act('AKUN',`hapus akun ${x.username}`,q);r.json({ok:true})});
app.use(express.static(path.join(__dirname,'public')));
// ===== Data: data.json = {students:[{id,nama,kelas,jurusan}], absen:[{id,date,session,status,time,by}]} =====
// Format siswa SAMA dengan aplikasi absensi sholat (kode/barcode sama). Catatan sholat (log) di data.json lama tidak disentuh.
const norm=d=>{d.students=Array.isArray(d.students)?d.students:[];d.absen=Array.isArray(d.absen)?d.absen:[];return d};
const load=()=>norm(fs.existsSync(DB)?JSON.parse(fs.readFileSync(DB)):{});
let CC=null,CM=0;
// peek = baca cepat (cache, hanya untuk membaca); load = baca baru dari file (untuk mengubah data)
const peek=()=>{try{const m=fs.statSync(DB).mtimeMs;if(CC&&m===CM)return CC;const d=load();CC=d;CM=m;return d}catch(e){if(e.code==='ENOENT')return norm({});throw e}};
const save=d=>{autoBackup();const t=DB+'.tmp';fs.writeFileSync(t,JSON.stringify(d));fs.renameSync(t,DB);CC=null};
const ip=()=>{for(const l of Object.values(os.networkInterfaces()))for(const i of l)if(i.family==='IPv4'&&!i.internal)return i.address;return'localhost'};
const BASE=`http://${ip()}:${PORT}`,HBASE=`https://${ip()}:${HPORT}`;
// Jam absensi (sesi) bisa diubah admin di menu Jam Absen (disimpan di jadwal.json). Bawaan: satu sesi "Masuk".
const JF=path.join(__dirname,'jadwal.json');
const DEF={force:null,list:[{name:'Masuk',start:'05:00',end:'15:00'}]};
const jad=()=>{try{return JSON.parse(fs.readFileSync(JF))}catch{return JSON.parse(JSON.stringify(DEF))}};
const mins=s=>{const[a,b]=s.split(':').map(Number);return a*60+b};
const inWin=(x,t)=>{const a=mins(x.start),b=mins(x.end);return a<b?t>=a&&t<b:t>=a||t<b};
const sessions=()=>jad().list.map(x=>x.name);
// Setiap sesi: name, start, end + (opsional) shift 'pagi'/'siang' = khusus kelas masuk pagi/siang, batas = batas jam terlambat
const normJ=x=>({name:String(x.name||'').trim(),start:x.start,end:x.end,shift:['pagi','siang'].includes(x.shift)?x.shift:'',batas:/^\d\d:\d\d$/.test(String(x.batas||''))?x.batas:''});
const cur=()=>{const j=jad();if(j.force&&j.list.some(x=>x.name===j.force))return j.force;const d=new Date(),w=j.list.find(x=>inWin(x,d.getHours()*60+d.getMinutes()));return w?w.name:null};
const today=()=>new Date().toLocaleDateString('sv');
const okDate=s=>/^\d{4}-\d\d-\d\d$/.test(String(s||''));
const STS=['ALFA','IZIN','SAKIT'],ALLST=['HADIR','ALFA','IZIN','SAKIT'];
const clean=(x,n)=>String(x==null?'':x).trim().slice(0,n);
const byKelas=(a,b)=>a.kelas.localeCompare(b.kelas,'id',{numeric:true})||a.nama.localeCompare(b.nama,'id');
// Cadangan otomatis: salinan data.json per hari di folder backup/ (disimpan 14 hari terakhir), dibuat sebelum data hari itu pertama kali berubah
const BK=path.join(__dirname,'backup');
function autoBackup(){try{if(!fs.existsSync(DB))return;fs.mkdirSync(BK,{recursive:true});const f=path.join(BK,`data-${today()}.json`);if(!fs.existsSync(f))fs.copyFileSync(DB,f);
 fs.readdirSync(BK).filter(x=>/^data-\d{4}-\d\d-\d\d\.json$/.test(x)).sort().slice(0,-14).forEach(x=>fs.rmSync(path.join(BK,x),{force:true}))}catch{}}
// Scan kartu = HADIR. Jika sebelumnya sudah diberi keterangan (ALFA/IZIN/SAKIT), scan mengubahnya menjadi HADIR.
function mark(id,p,by){const d=load(),s=d.students.find(x=>x.id===id);
 if(!s)return{ok:false,msg:'Kartu tidak dikenali. Pastikan siswa sudah terdaftar.'};
 if(!p||!sessions().includes(p))return{ok:false,s,msg:'Sekarang bukan jam absensi yang dicatat.'};
 const ses=jad().list.find(x=>x.name===p);
 if(ses&&ses.shift){const sh=globalThis.__shiftOf?globalThis.__shiftOf(s.kelas):'pagi';if(sh!==ses.shift)return{ok:false,s,msg:`Sesi ${p} khusus kelas masuk ${ses.shift}. Kelas ${s.kelas} masuk ${sh}.`}}
 const t=today(),rec=d.absen.find(l=>l.id===id&&l.date===t&&l.session===p);
 if(rec&&rec.status==='HADIR')return{ok:true,dup:true,s,p,time:rec.time};
 const nw=new Date(),time=String(nw.getHours()).padStart(2,'0')+':'+String(nw.getMinutes()).padStart(2,'0');
 if(rec){const was=rec.status;rec.status='HADIR';rec.time=time;rec.by=by;save(d);try{globalThis.__hadir&&globalThis.__hadir(s,t,time,p)}catch{}return{ok:true,s,p,time,was}}
 d.absen.push({id,date:t,session:p,status:'HADIR',time,by});save(d);try{globalThis.__hadir&&globalThis.__hadir(s,t,time,p)}catch{}return{ok:true,s,p,time}}
app.get('/api/info',(q,r)=>r.json({base:BASE,https:HBASE,cur:cur(),sesi:sessions(),jadwal:jad().list,force:jad().force||null,now:Date.now(),tz:new Date().getTimezoneOffset(),today:today()}));
app.get('/api/students',(q,r)=>{const F=globalThis.__fotoSet;r.json(F?peek().students.map(s=>F.has(s.id)?{...s,foto:1}:s):peek().students)});
app.post('/api/students',(q,r)=>{const{nama,kelas,jurusan}=q.body;
 if(!nama||!kelas||!jurusan)return r.status(400).json({msg:'Nama, kelas, dan jurusan wajib diisi.'});
 const d=load();let id;do{id=Math.random().toString(36).slice(2,8).toUpperCase()}while(d.students.some(s=>s.id===id));
 const s={id,nama:nama.trim(),kelas:kelas.trim(),jurusan:jurusan.trim()};d.students.push(s);save(d);act('SISWA',`tambah siswa ${s.nama} (${s.kelas} ${s.jurusan})`,q);r.json(s)});
// Edit data siswa (nama/kelas/jurusan). Kode kartu (id) TIDAK pernah diubah, jadi barcode lama tetap berlaku.
app.put('/api/students/:id',admin,(q,r)=>{const d=load(),s=d.students.find(x=>x.id===q.params.id);
 if(!s)return r.status(404).json({msg:'Siswa tidak ditemukan.'});
 const nama=clean(q.body.nama,80),kelas=clean(q.body.kelas,20),jurusan=clean(q.body.jurusan,40);
 if(!nama||!kelas||!jurusan)return r.status(400).json({msg:'Nama, kelas, dan jurusan wajib diisi.'});
 const b=`${s.nama} (${s.kelas} ${s.jurusan})`;s.nama=nama;s.kelas=kelas;s.jurusan=jurusan;save(d);
 act('SISWA',`ubah data siswa ${b} menjadi ${nama} (${kelas} ${jurusan}), kode ${s.id} tetap`,q);r.json(s)});
// Rombel: pindahkan kelas banyak siswa sekaligus (mis. X-1 -> XI-1). Kode kartu tidak berubah.
app.post('/api/rombel',admin,(q,r)=>{const d=load(),to=new Map();
 for(const x of Array.isArray(q.body.map)?q.body.map:[]){const f=clean(x.from,20),t=clean(x.to,20);if(!f||!t||f===t)continue;
  if(to.has(f))return r.status(400).json({msg:`Kelas ${f} diisi dua kali.`});to.set(f,t)}
 if(!to.size)return r.status(400).json({msg:'Tidak ada perubahan kelas.'});
 let n=0;for(const s of d.students){const t=to.get(s.kelas);if(t){s.kelas=t;n++}}
 save(d);act('SISWA','rombel: '+[...to].map(([f,t])=>`${f} -> ${t}`).join(', ')+` (${n} siswa, kode kartu tidak berubah)`,q);r.json({moved:n})});
// Hapus kelas: menghapus semua siswa di kelas itu beserta riwayat absensinya
app.delete('/api/class',admin,(q,r)=>{const k=clean(q.query.kelas,20);if(!k)return r.status(400).json({msg:'Kelas wajib diisi.'});
 const d=load(),del=d.students.filter(s=>s.kelas===k);if(!del.length)return r.status(404).json({msg:'Kelas tidak ditemukan.'});
 const ids=new Set(del.map(s=>s.id));d.students=d.students.filter(s=>!ids.has(s.id));d.absen=d.absen.filter(l=>!ids.has(l.id));save(d);
 act('SISWA',`hapus kelas ${k} (${del.length} siswa beserta riwayat absensinya)`,q);r.json({removed:del.length})});
// Cadangan & pemulihan database. Cadangan dari aplikasi absensi SHOLAT juga bisa dipulihkan (yang diambil hanya data siswa, kode/barcode tetap).
app.get('/api/backup',admin,(q,r)=>{const d=peek();
 r.set({'Content-Type':'application/json','Content-Disposition':`attachment; filename="cadangan-absensi-sekolah-${today()}.json"`});
 act('EXPORT',`unduh cadangan database (${d.students.length} siswa, ${d.absen.length} catatan absensi)`,q);
 r.send(JSON.stringify({app:'absensi-sekolah',version:1,exported:new Date().toISOString(),students:d.students,absen:d.absen,jadwal:jad()}))});
app.post('/api/restore',admin,express.raw({type:()=>true,limit:'60mb'}),(q,r)=>{
 let b;try{b=JSON.parse(Buffer.from(q.body).toString('utf8'))}catch{return r.status(400).json({msg:'File bukan cadangan yang valid (.json).'})}
 const asal=b&&b.app,sholat=asal==='absensi-sholat';
 if(!b||(asal!=='absensi-sekolah'&&!sholat)||!Array.isArray(b.students)||(!sholat&&!Array.isArray(b.absen)))return r.status(400).json({msg:'File ini bukan cadangan dari aplikasi absensi (sekolah maupun sholat).'});
 const st=[],seen=new Set();
 for(const x of b.students){const id=clean(x&&x.id,12).toUpperCase(),nama=clean(x&&x.nama,80),kelas=clean(x&&x.kelas,20),jurusan=clean(x&&x.jurusan,40);
  if(!/^[A-Z0-9]{4,12}$/.test(id)||!nama||!kelas||!jurusan||seen.has(id))return r.status(400).json({msg:`Data siswa tidak valid atau kode dobel (${id||'kosong'}). Pemulihan dibatalkan.`});seen.add(id);st.push({id,nama,kelas,jurusan})}
 const ab=[];if(!sholat)for(const l of b.absen){const id=clean(l&&l.id,12).toUpperCase(),stt=clean(l&&l.status,10).toUpperCase();
  if(seen.has(id)&&okDate(l.date)&&l.session&&ALLST.includes(stt))ab.push({id,date:l.date,session:clean(l.session,20),status:stt,time:clean(l.time,10),by:clean(l.by,40)})}
 const mode=q.query.mode==='merge'?'merge':'replace',now0=load();
 try{fs.mkdirSync(BK,{recursive:true});fs.writeFileSync(path.join(BK,`sebelum-pulihkan-${new Date().toISOString().replace(/[:.]/g,'-')}.json`),JSON.stringify(now0))}catch{}
 let out;
 if(mode==='replace')out={...now0,students:st,absen:sholat?now0.absen.filter(l=>seen.has(l.id)):ab};
 else{const m=new Map(now0.students.map(x=>[x.id,x]));st.forEach(x=>m.set(x.id,x));const k=new Set(now0.absen.map(l=>`${l.id}|${l.date}|${l.session}`));
  out={...now0,students:[...m.values()],absen:[...now0.absen,...ab.filter(l=>!k.has(`${l.id}|${l.date}|${l.session}`))]}}
 save(out);
 if(!sholat&&b.jadwal&&Array.isArray(b.jadwal.list)){const list=b.jadwal.list.map(normJ);
  if(!cekJadwal(list)){const j={force:b.jadwal.force&&list.some(x=>x.name===b.jadwal.force)?b.jadwal.force:null,list};fs.writeFileSync(JF,JSON.stringify(j,null,2))}}
 act('IMPORT',`pulihkan cadangan ${sholat?'absensi sholat (hanya siswa)':'absensi sekolah'} (${mode==='merge'?'gabung':'timpa'}): ${st.length} siswa, ${ab.length} catatan absensi dari file`,q);r.json({students:out.students.length,absen:out.absen.length,mode})});
app.delete('/api/students/:id',admin,(q,r)=>{const d=load(),x=d.students.find(s=>s.id===q.params.id);if(x)act('SISWA',`hapus siswa ${x.nama} (${x.kelas})`,q);d.students=d.students.filter(s=>s.id!==q.params.id);d.absen=d.absen.filter(l=>l.id!==q.params.id);save(d);r.json({ok:true})});
app.get('/api/qr/:id',async(q,r)=>{r.type('png').send(await QR.toBuffer(`${BASE}/s/${q.params.id}`,{margin:1,width:320,errorCorrectionLevel:'M'}))});
app.post('/api/scan',(q,r)=>{const x=mark(String(q.body.id||'').toUpperCase(),q.body.sesi||cur(),q.user.name);logScan(x,q);r.json(x)});
// Laporan harian: siapa yang hadir, dan yang tidak hadir (beserta keterangan ALFA/IZIN/SAKIT bila sudah diisi)
function daily(date,p,kelas){const d=peek(),rec=new Map();for(const l of d.absen)if(l.date===date&&l.session===p)rec.set(l.id,l);
 const ses=jad().list.find(x=>x.name===p),shOk=s=>!ses||!ses.shift||!globalThis.__shiftOf||globalThis.__shiftOf(s.kelas)===ses.shift;
 const L=d.students.filter(s=>(!kelas||s.kelas===kelas)&&shOk(s)).sort(byKelas),hadir=[],tidak=[];
 for(const s of L){const l=rec.get(s.id);if(l&&l.status==='HADIR')hadir.push({...s,time:l.time,by:l.by,telat:!!l.telat});else tidak.push({...s,status:l&&ALLST.includes(l.status)?l.status:null,by:l?l.by:''})}
 return{students:L,hadir,tidak}}
app.get('/api/report',(q,r)=>{const date=okDate(q.query.date)?q.query.date:today(),p=sessions().includes(q.query.sesi)?q.query.sesi:(cur()||sessions()[0]),kelas=clean(q.query.kelas,20);
 const{students,hadir,tidak}=daily(date,p,kelas),c={total:students.length,hadir:hadir.length,SAKIT:0,IZIN:0,ALFA:0,kosong:0};
 for(const x of tidak){if(x.status)c[x.status]++;else c.kosong++}
 r.json({date,session:p,count:c,hadir:hadir.map(({by,...x})=>x),belum:tidak.map(({by,...x})=>x)})});
// Keterangan tidak hadir: ALFA / IZIN / SAKIT (status kosong = hapus keterangan). Siswa yang sudah hadir tidak bisa diberi keterangan.
app.put('/api/ket',(q,r)=>{const id=String(q.body.id||'').toUpperCase(),date=q.body.date,p=String(q.body.sesi||''),st=String(q.body.status||'').toUpperCase();
 if(!okDate(date))return r.status(400).json({msg:'Tanggal tidak valid.'});
 if(!sessions().includes(p))return r.status(400).json({msg:'Sesi absen tidak ditemukan.'});
 if(st&&!STS.includes(st))return r.status(400).json({msg:'Keterangan harus ALFA, IZIN, atau SAKIT.'});
 const d=load(),s=d.students.find(x=>x.id===id);if(!s)return r.status(404).json({msg:'Siswa tidak ditemukan.'});
 const i=d.absen.findIndex(l=>l.id===id&&l.date===date&&l.session===p),l=i>=0?d.absen[i]:null;
 if(l&&l.status==='HADIR')return r.status(400).json({msg:`${s.nama} sudah tercatat hadir pukul ${l.time}.`});
 if(!st){if(l){d.absen.splice(i,1);save(d);act('KET',`hapus keterangan ${s.nama} (${s.kelas}) ${date} ${p}`,q)}return r.json({ok:true,status:null})}
 if(l){l.status=st;l.by=q.user.name}else d.absen.push({id,date,session:p,status:st,by:q.user.name});
 save(d);act('KET',`${s.nama} (${s.kelas}) ${date} ${p}: ${st}`,q);r.json({ok:true,status:st})});
// Tandai sekaligus semua siswa yang belum hadir dan belum punya keterangan (opsional per kelas)
app.post('/api/ket/bulk',(q,r)=>{const date=q.body.date,p=String(q.body.sesi||''),st=String(q.body.status||'').toUpperCase(),k=clean(q.body.kelas,20);
 if(!okDate(date)||!sessions().includes(p)||!STS.includes(st))return r.status(400).json({msg:'Permintaan tidak valid.'});
 const d=load(),have=new Set(d.absen.filter(l=>l.date===date&&l.session===p).map(l=>l.id));let n=0;
 for(const s of d.students){if((k&&s.kelas!==k)||have.has(s.id))continue;d.absen.push({id:s.id,date,session:p,status:st,by:q.user.name});n++}
 if(n)save(d);act('KET',`tandai ${n} siswa ${st} (${date} ${p}${k?', kelas '+k:', semua kelas'})`,q);r.json({added:n})});
// Halaman hasil ketika kartu discan memakai kamera bawaan HP
app.get('/s/:id',(q,r)=>{const x=mark(q.params.id.toUpperCase(),sessions().includes(q.query.p)?q.query.p:cur(),q.user.name);logScan(x,q);
 const c=x.ok?'#1f8f5f':'#b3372f',t=x.ok?(x.dup?'Sudah tercatat hadir':'Kehadiran tercatat'):'Tidak tercatat';
 r.send(`<!doctype html><meta name=viewport content="width=device-width,initial-scale=1"><title>${t}</title>
<body style="margin:0;font-family:system-ui;background:${c};color:#fff;min-height:100vh;display:grid;place-items:center;text-align:center;padding:24px">
<div><div style="font-size:72px">${x.ok?'✓':'✕'}</div><h1 style="margin:8px 0">${t}</h1>
${x.s?`<p style="font-size:22px;margin:4px 0"><b>${esc(x.s.nama)}</b></p><p style="opacity:.9;margin:0">${esc(x.s.kelas)} · ${esc(x.s.jurusan)}</p>`:''}
<p style="opacity:.95">${x.ok?`${esc(x.p)} · pukul ${x.time}${x.was?` · keterangan ${esc(x.was)} diubah menjadi HADIR`:''}`:esc(x.msg)}</p></div>`)});
app.delete('/api/students',admin,(q,r)=>{const d=load(),n=d.students.length;save({...d,students:[],absen:[]});act('RESET',`hapus SEMUA siswa (${n} siswa) beserta riwayat absensi`,q);r.json({removed:n})});
app.delete('/api/absen',admin,(q,r)=>{const d=load(),n=d.absen.length,dt=q.query.date;d.absen=dt==='all'?[]:d.absen.filter(l=>l.date!==dt);save(d);act('RESET',`reset data absensi ${dt==='all'?'semua tanggal':dt} (${n-d.absen.length} catatan)`,q);r.json({removed:n-d.absen.length})});
const TM=/^([01]\d|2[0-3]):[0-5]\d$/;
const cekJadwal=list=>{if(!list.length||list.length>12)return'Jam absensi harus berisi 1-12 sesi.';
 const seen=new Set(),pakai=[];
 for(const x of list){const n=x.name;
  if(!n||n.length>20)return'Nama sesi wajib diisi (maksimal 20 huruf).';
  if(seen.has(n.toLowerCase()))return`Nama "${n}" dobel.`;seen.add(n.toLowerCase());
  if(!TM.test(x.start)||!TM.test(x.end))return`Jam ${n} belum diisi dengan benar.`;
  if(x.start===x.end)return`Jam mulai dan selesai ${n} tidak boleh sama.`;
  if(x.batas&&!inWin(x,mins(x.batas)))return`Batas terlambat sesi ${n} harus berada di dalam jam sesinya (${x.start}-${x.end}).`;
  const m=new Set();for(let t=mins(x.start);t!==mins(x.end);t=(t+1)%1440)m.add(t);
  for(const[pn,pm]of pakai)for(const t of m)if(pm.has(t))return`Jam ${n} bertumpuk dengan ${pn}.`;
  pakai.push([n,m])}
 return null};
// ===== Warna kartu siswa: bisa diedit admin (disimpan di kartu.json). Bisa untuk semua kelas atau per kelas. =====
const KF=path.join(__dirname,'kartu.json'),KDEF={c1:'#0b2f5c',c2:'#1457a0',aksen:'#c9a227',judul:'#f0d97a',nama:'#ffffff',info:'#d6e4f6'},KEYS=Object.keys(KDEF);
const hex=x=>/^#[0-9a-fA-F]{6}$/.test(String(x||''))?String(x).toLowerCase():null;
const kset=()=>{try{const j=JSON.parse(fs.readFileSync(KF));return{def:{...KDEF,...(j.def||{})},kelas:j.kelas||{}}}catch{return{def:{...KDEF},kelas:{}}}};
const kclean=o=>{const v={};for(const k of KEYS){const h=hex(o&&o[k]);if(h)v[k]=h}return v};
app.get('/api/kartu-style',(q,r)=>r.json({...kset(),default:KDEF}));
app.put('/api/kartu-style',admin,(q,r)=>{const j=kset(),kl=clean(q.body.kelas,20),v=kclean(q.body.warna);
 if(kl){j.kelas[kl]={...KDEF,...v}}else{j.def={...KDEF,...v}}
 fs.writeFileSync(KF,JSON.stringify(j,null,2));act('SISWA',kl?`ubah warna kartu kelas ${kl}`:'ubah warna kartu (semua kelas)',q);r.json(j)});
app.delete('/api/kartu-style',admin,(q,r)=>{const j=kset(),kl=clean(q.query.kelas,20);
 if(kl)delete j.kelas[kl];else{j.def={...KDEF};j.kelas={}}
 fs.writeFileSync(KF,JSON.stringify(j,null,2));act('SISWA',kl?`warna kartu kelas ${kl} dikembalikan ke warna umum`:'warna kartu dikembalikan ke bawaan (semua kelas)',q);r.json(j)});
// ===== Suara hasil scan: bisa diatur admin per kejadian (ok = berhasil, dup = sudah di-scan, bad = gagal). File suara sendiri disimpan di folder suara/. =====
const SD=path.join(__dirname,'suara'),SF=path.join(SD,'suara.json'),SEV=['ok','dup','bad'],SJ=['nada','ucap','file','senyap'];
const SDEF={ok:{jenis:'nada',preset:'bawaan',teks:'Hadir tercatat. Selamat datang {nama}',rate:1,pitch:1,voice:'',vol:1,file:null},
 dup:{jenis:'nada',preset:'bawaan',teks:'{nama} sudah hadir',rate:1,pitch:1,voice:'',vol:1,file:null},
 bad:{jenis:'nada',preset:'bawaan',teks:'Kartu tidak dikenali',rate:1,pitch:1,voice:'',vol:1,file:null}};
const sget=()=>{let j={};try{j=JSON.parse(fs.readFileSync(SF))}catch{}const o={};for(const e of SEV)o[e]={...SDEF[e],...(j[e]||{})};return o};
const sput=o=>{fs.mkdirSync(SD,{recursive:true});fs.writeFileSync(SF,JSON.stringify(o,null,2))};
const sev=(q,r,n)=>SEV.includes(q.params.ev)?n():r.status(404).json({msg:'Jenis suara tidak dikenal.'});
const num=(x,a,b,d)=>{x=Number(x);return Number.isFinite(x)?Math.min(b,Math.max(a,x)):d};
app.get('/api/suara',(q,r)=>r.json(sget()));
app.put('/api/suara/:ev',admin,sev,(q,r)=>{const o=sget(),e=q.params.ev,b=q.body||{},c=o[e];
 const jenis=SJ.includes(b.jenis)?b.jenis:'nada';
 if(jenis==='file'&&!c.file)return r.status(400).json({msg:'Pilih file suara dulu.'});
 o[e]={...c,jenis,preset:clean(b.preset,20)||'bawaan',teks:clean(b.teks,200),rate:num(b.rate,.5,2,1),pitch:num(b.pitch,0,2,1),voice:clean(b.voice,150),vol:num(b.vol,.1,1,1)};
 sput(o);act('SISWA',`ubah suara scan "${e==='ok'?'berhasil':e==='dup'?'sudah di-scan':'gagal'}" menjadi ${jenis}`,q);r.json(o)});
app.put('/api/suara/:ev/file',admin,sev,express.raw({type:()=>true,limit:'3mb'}),(q,r)=>{const ct=String(q.headers['content-type']||'').split(';')[0].trim().toLowerCase();
 if(!/^(audio|video)\/[\w.+-]+$/.test(ct))return r.status(400).json({msg:'File harus berupa suara (mp3, wav, ogg, m4a).'});
 if(!Buffer.isBuffer(q.body)||!q.body.length)return r.status(400).json({msg:'File kosong.'});
 const o=sget(),e=q.params.ev;let nm='suara';try{nm=clean(decodeURIComponent(q.headers['x-nama']||''),80)||'suara'}catch{}
 fs.mkdirSync(SD,{recursive:true});fs.writeFileSync(path.join(SD,e+'.bin'),q.body);
 o[e].file={name:nm,type:ct,ver:Date.now()};sput(o);act('SISWA',`unggah file suara scan "${e}": ${nm} (${Math.round(q.body.length/1024)} KB)`,q);r.json(o)});
app.get('/api/suara/:ev/file',sev,(q,r)=>{const f=sget()[q.params.ev].file,fp=path.join(SD,q.params.ev+'.bin');
 if(!f||!fs.existsSync(fp))return r.status(404).json({msg:'Belum ada file suara.'});
 r.set({'Content-Type':f.type,'X-Content-Type-Options':'nosniff','Cache-Control':'private, max-age=31536000'});r.sendFile(fp)});
app.delete('/api/suara/:ev',admin,sev,(q,r)=>{const o=sget(),e=q.params.ev;try{fs.unlinkSync(path.join(SD,e+'.bin'))}catch{}
 o[e]={...SDEF[e]};sput(o);act('SISWA',`suara scan "${e}" dikembalikan ke bawaan`,q);r.json(o)});
app.get('/api/jadwal',(q,r)=>r.json(jad()));
app.put('/api/jadwal',admin,(q,r)=>{const list=(Array.isArray(q.body.list)?q.body.list:[]).map(normJ),e=cekJadwal(list);
 if(e)return r.status(400).json({msg:e});const j=jad();j.list=list;if(j.force&&!list.some(x=>x.name===j.force))j.force=null;
 fs.writeFileSync(JF,JSON.stringify(j,null,2));act('JADWAL','ubah jam absensi: '+list.map(x=>`${x.name} ${x.start}-${x.end}${x.shift?' ['+x.shift+']':''}${x.batas?' telat>'+x.batas:''}`).join(', '),q);r.json({ok:true})});
app.put('/api/jadwal/force',admin,(q,r)=>{const j=jad(),f=q.body.force||null;if(f&&!j.list.some(x=>x.name===f))return r.status(400).json({msg:'Sesi tidak ditemukan.'});
 j.force=f;fs.writeFileSync(JF,JSON.stringify(j,null,2));act('JADWAL',f?`sesi aktif diatur manual: ${f}`:'sesi aktif kembali otomatis (ikut jam)',q);r.json({ok:true})});
app.delete('/api/jadwal',admin,(q,r)=>{fs.rmSync(JF,{force:true});act('JADWAL','jam absensi dikembalikan ke bawaan',q);r.json(DEF)});

// ===== Excel =====
const HARI=['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
const pd=s=>{const[y,m,d]=s.split('-').map(Number);return new Date(y,m-1,d,12)},ymd=d=>d.toLocaleDateString('sv'),addD=(s,n)=>{const d=pd(s);d.setDate(d.getDate()+n);return ymd(d)};
const fmtD=s=>{const[y,m,d]=s.split('-');return`${d}/${m}/${y}`};
const rentang=(a,b)=>{const o=[];for(let x=a;x<=b;x=addD(x,1))o.push(x);return o};
function periode(date){const dow=(pd(date).getDay()+6)%7,a=addD(date,-dow),b=addD(a,6);return{from:a,to:b,label:`Mingguan ${fmtD(a)} - ${fmtD(b)}`}}
const NV='FF0B2F5C',thin={style:'thin',color:{argb:'FFB4C4D8'}},bd={top:thin,left:thin,bottom:thin,right:thin},fl=c=>({type:'pattern',pattern:'solid',fgColor:{argb:c}}),ZB='FFEEF3FA';
const STC={HADIR:'FFD3EEDF',ALFA:'FFF4B6B0',IZIN:'FFFBE7B5',SAKIT:'FFDDD0F2',KOSONG:'FFFBE3E1'},STN={HADIR:'Hadir',ALFA:'Alfa',IZIN:'Izin',SAKIT:'Sakit'};
const HC={SAKIT:'FF6D4AA8',IZIN:'FFA16207',ALFA:'FFB3372F',KOSONG:'FF6B7F99'};
const fname=s=>String(s).replace(/[^\w.-]+/g,'_');
const xlsxHead=(r,name)=>r.set({'Content-Type':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','Content-Disposition':`attachment; filename="${name}"`});
const ah=f=>(q,r)=>f(q,r).catch(e=>{act('GAGAL','pembuatan Excel gagal: '+e.message,q);if(!r.headersSent)r.status(500).json({msg:'Gagal membuat file Excel.'});else r.end()});
async function exportHarian(q,r,date,p,kelas,stf){
 const{students,hadir,tidak}=daily(date,p,kelas),tot=students.length,[y,m,dd]=date.split('-'),tgl=`${dd}/${m}/${y}`,wb=new ExcelJS.Workbook();
 const n=s=>tidak.filter(x=>x.status===s).length,nS=n('SAKIT'),nI=n('IZIN'),nA=n('ALFA'),nK=tidak.filter(x=>!x.status).length;
 const sm=wb.addWorksheet('Ringkasan');sm.columns=[{width:30},{width:14},{width:14},{width:14},{width:14},{width:14},{width:14}];
 sm.mergeCells('A1:G1');sm.getCell('A1').value='Rekap Kehadiran Siswa';sm.getCell('A1').font={bold:true,size:18,color:{argb:NV}};sm.getRow(1).height=30;
 [['Tanggal',tgl],['Sesi absen',p],['Kelas',kelas||'Semua kelas'],['Total siswa',tot],['Hadir',hadir.length],['Sakit',nS],['Izin',nI],['Alfa',nA],['Belum ada keterangan',nK],['Persentase hadir',tot?hadir.length/tot:0]].forEach((x,i)=>{const row=sm.getRow(3+i);row.getCell(1).value=x[0];row.getCell(1).font={bold:true};row.getCell(2).value=x[1];row.getCell(2).alignment={horizontal:'left'}});
 sm.getCell('B12').numFmt='0%';
 ['Kelas','Total','Hadir','Sakit','Izin','Alfa','Belum diisi'].forEach((t,i)=>{const c=sm.getCell(14,i+1);c.value=t;c.font={bold:true,color:{argb:'FFFFFFFF'}};c.fill=fl(NV);c.alignment={horizontal:'center'};c.border=bd});
 [...new Set(students.map(s=>s.kelas))].sort((a,b)=>a.localeCompare(b,'id',{numeric:true})).forEach((k,i)=>{const a=students.filter(s=>s.kelas===k).length,h=hadir.filter(s=>s.kelas===k).length,t=tidak.filter(s=>s.kelas===k),c=s=>t.filter(x=>x.status===s).length;
  [k,a,h,c('SAKIT'),c('IZIN'),c('ALFA'),t.filter(x=>!x.status).length].forEach((v,j)=>{const c2=sm.getCell(15+i,j+1);c2.value=v;c2.border=bd;c2.alignment={horizontal:j?'center':'left'}})});
 const tab=(name,cols,rows,color,post)=>{const ws=wb.addWorksheet(name,{views:[{state:'frozen',ySplit:1}],pageSetup:{fitToPage:true,fitToWidth:1,fitToHeight:0}});
  ws.columns=cols.map(([header,width])=>({header,width}));const h=ws.getRow(1);h.height=26;
  h.eachCell(c=>{c.font={bold:true,color:{argb:'FFFFFFFF'},size:12};c.fill=fl(color);c.alignment={vertical:'middle',horizontal:'center'};c.border=bd});
  rows.forEach((x,i)=>{const row=ws.addRow([i+1,...x]);row.eachCell({includeEmpty:true},(c,k)=>{c.border=bd;c.alignment={vertical:'middle',horizontal:k===1?'center':'left'};if(i%2)c.fill=fl(ZB)});if(post)post(row,i)});
  ws.autoFilter={from:{row:1,column:1},to:{row:Math.max(ws.rowCount,2),column:cols.length}}};
 const cols=[['No',6],['Tanggal',12],['Nama',34],['Kelas',12],['Jurusan',24],['Keterangan',16],['Dicatat oleh',16]];
 const ketTab=(name,list,color)=>tab(name,cols,list.map(s=>[tgl,s.nama,s.kelas,s.jurusan,s.status||'Belum diisi',s.by||'']),color,(row,i)=>{const s=list[i].status;row.getCell(6).fill=fl(STC[s||'KOSONG']);row.getCell(6).font={bold:true}});
 if(!stf)ketTab('Tidak Hadir',tidak,'FFB3372F');
 if(!stf||stf==='HADIR')tab('Hadir',[['No',6],['Tanggal',12],['Nama',34],['Kelas',12],['Jurusan',24],['Jam',10],['Dicatat oleh',16]],hadir.map(s=>[tgl,s.nama,s.kelas,s.jurusan,s.time,s.by||'']),'FF1F8F5F');
 for(const S of ['SAKIT','IZIN','ALFA'])if(!stf||stf===S)ketTab(STN[S],tidak.filter(x=>x.status===S),HC[S]);
 if(!stf)ketTab('Belum Diisi',tidak.filter(x=>!x.status),HC.KOSONG);
 xlsxHead(r,fname(`rekap-kehadiran-${date}-${p}${kelas?'-'+kelas:''}${stf?'-'+stf:''}`)+'.xlsx');act('EXPORT',`download rekap kehadiran ${p} ${date}${kelas?' kelas '+kelas:''} (${hadir.length} hadir, ${nS} sakit, ${nI} izin, ${nA} alfa, ${nK} belum diisi)`,q);
 await wb.xlsx.write(r);r.end()}
// Rekap mingguan (Senin-Minggu): semua sesi atau satu sesi
async function exportPeriode(q,r,date,kelas,stf){
 const per=periode(date),days=rentang(per.from,per.to),d=peek(),sel=sessions().includes(q.query.sesi)?q.query.sesi:null;
 const st=d.students.filter(s=>!kelas||s.kelas===kelas).sort(byKelas),sm=new Map(st.map(x=>[x.id,x]));
 const recs=d.absen.filter(l=>l.date>=per.from&&l.date<=per.to&&sm.has(l.id)&&STN[l.status]&&(!sel||l.session===sel));
 const PL=sel?[sel]:[...new Set([...sessions(),...recs.map(l=>l.session)])],nP=PL.length,one=nP===1;
 const efektif=new Set(recs.filter(l=>l.status==='HADIR').map(l=>l.date)),nE=efektif.size,eR=recs.filter(l=>efektif.has(l.date)),slots=nE*nP;
 const rm=new Map(recs.map(l=>[l.id+'|'+l.date+'|'+l.session,l]));
 const zero=()=>({HADIR:0,SAKIT:0,IZIN:0,ALFA:0}),pS=new Map(),pD=new Map(),pK=new Map(),T=zero();
 const bump=(m,k,s)=>{let o=m.get(k);if(!o){o=zero();m.set(k,o)}o[s]++};
 for(const l of eR){bump(pS,l.id,l.status);bump(pD,l.date,l.status);bump(pK,sm.get(l.id).kelas,l.status);T[l.status]++}
 const get=(m,k)=>m.get(k)||zero(),sum=o=>o.HADIR+o.SAKIT+o.IZIN+o.ALFA,pct=(a,b)=>b?a/b:0;
 const kelasList=[...new Set(st.map(x=>x.kelas))].sort((a,b)=>a.localeCompare(b,'id',{numeric:true}));
 const never=st.filter(x=>!get(pS,x.id).HADIR);
 const wb=new ExcelJS.Workbook();
 const head=(ws,color,h)=>{const row=ws.getRow(1);row.height=h||26;row.eachCell({includeEmpty:false},c=>{c.font={bold:true,color:{argb:'FFFFFFFF'},size:11};c.fill=fl(color);c.alignment={vertical:'middle',horizontal:'center',wrapText:true};c.border=bd})};
 const sheet=(name,cols,xs)=>{const ws=wb.addWorksheet(name,{views:[{state:'frozen',xSplit:xs||0,ySplit:1}],pageSetup:{orientation:'landscape',fitToPage:true,fitToWidth:1,fitToHeight:0}});ws.columns=cols;return ws};
 const body=(ws,row,i,n)=>{row.eachCell({includeEmpty:true},(c,k)=>{c.border=bd;c.alignment={vertical:'middle',horizontal:k<=n?'left':'center'};if(i%2&&!c.fill?.fgColor)c.fill=fl(ZB)})};
 // 1. Ringkasan
 const s1=wb.addWorksheet('Ringkasan');s1.columns=[{width:40},{width:32}];
 s1.mergeCells('A1:B1');s1.getCell('A1').value='Rekap Kehadiran Siswa';s1.getCell('A1').font={bold:true,size:18,color:{argb:NV}};s1.getRow(1).height=30;
 const info=[['Jenis rekap',per.label],['Tanggal',`${fmtD(per.from)} s/d ${fmtD(per.to)}`],['Sesi absen',sel||`Semua sesi (${PL.join(', ')})`],['Kelas',kelas||'Semua kelas'],['Total siswa',st.length],['Hari efektif (ada siswa hadir)',nE],['Total hadir',T.HADIR],['Total sakit',T.SAKIT],['Total izin',T.IZIN],['Total alfa',T.ALFA],['Belum ada keterangan',Math.max(0,st.length*slots-sum(T))],['Persentase hadir',pct(T.HADIR,st.length*slots)],['Siswa tidak pernah hadir di periode ini',never.length],['Dibuat pada',new Date().toLocaleString('id-ID')]];
 info.forEach((x,i)=>{const row=s1.getRow(3+i);row.getCell(1).value=x[0];row.getCell(1).font={bold:true};row.getCell(2).value=x[1];row.getCell(2).alignment={horizontal:'left'}});
 s1.getCell('B14').numFmt='0.0%';
 const note=(a,t)=>{s1.getCell(a).value=t;s1.getCell(a).font={italic:true,color:{argb:'FF4A617D'}}};
 note('A18','Catatan: hari efektif adalah tanggal yang memiliki minimal satu siswa hadir. Hari tanpa siswa hadir (misalnya libur) tidak dihitung, sehingga tidak dianggap tidak hadir.');
 note('A19','Sheet Per Siswa: setiap sel berisi jam scan (hadir) atau keterangan ALFA / IZIN / SAKIT. Hijau = hadir, kuning = sebagian sesi hadir, ungu = sakit, oranye = izin, merah = alfa, merah muda = belum ada keterangan (tanda -).');
 // 2. Per Siswa
 const wd=days.map(x=>HARI[pd(x).getDay()].slice(0,3));
 const cell=(id,t)=>{const a=PL.map(p=>({p,l:rm.get(id+'|'+t+'|'+p)})).filter(x=>x.l);if(!a.length)return'-';const f=l=>l.status==='HADIR'?l.time:STN[l.status].toUpperCase();return one?f(a[0].l):a.map(x=>`${x.p} ${f(x.l)}`).join('\n')};
 const dayColor=(id,t)=>{const L=PL.map(p=>rm.get(id+'|'+t+'|'+p)).filter(Boolean),h=L.filter(l=>l.status==='HADIR').length;if(h===nP)return STC.HADIR;if(h>0)return'FFFDF1C7';const k=L.find(l=>l.status!=='HADIR');return k?STC[k.status]:STC.KOSONG};
 const ps=sheet('Per Siswa',[{header:'No',width:5},{header:'Nama',width:34},{header:'Kelas',width:14},{header:'Jurusan',width:22},
  ...days.map((x,i)=>({header:`${x.slice(8)}\n${wd[i]}`,width:one?9:18})),{header:'Hadir',width:8},{header:'Sakit',width:8},{header:'Izin',width:8},{header:'Alfa',width:8},{header:'Belum diisi',width:11},{header:'Persen hadir',width:11}],2);
 head(ps,NV,34);days.forEach((x,i)=>{if(!efektif.has(x))ps.getRow(1).getCell(5+i).fill=fl('FF7A8CA3')});
 const pc=days.length+10;
 st.forEach((x,i)=>{const c=get(pS,x.id),row=ps.addRow([i+1,x.nama,x.kelas,x.jurusan,...days.map(t=>efektif.has(t)?cell(x.id,t):null),c.HADIR,c.SAKIT,c.IZIN,c.ALFA,Math.max(0,slots-sum(c)),pct(c.HADIR,slots)]);
  row.eachCell({includeEmpty:true},(cl,k)=>{cl.border=bd;cl.alignment={vertical:'middle',horizontal:k<=4&&k>1?'left':'center'};
   if(k>=5&&k<5+days.length){const t=days[k-5];cl.alignment={vertical:'middle',horizontal:'center',wrapText:true};cl.fill=fl(!efektif.has(t)?'FFEFF2F6':dayColor(x.id,t))}});
  if(!one){const mx=Math.max(1,...days.map(t=>efektif.has(t)?PL.filter(p=>rm.has(x.id+'|'+t+'|'+p)).length:1));if(mx>1)row.height=15*mx+4}
  row.getCell(pc).numFmt='0%'});
 ps.autoFilter={from:{row:1,column:1},to:{row:Math.max(ps.rowCount,2),column:4}};ps.getColumn(3).width=14;ps.getColumn(2).width=34;
 // Daftar siswa per status (Hadir / Sakit / Izin / Alfa): jumlah dan tanggal-tanggalnya
 for(const S of ['HADIR','SAKIT','IZIN','ALFA']){const mp=new Map();for(const l of recs)if(l.status===S){if(!mp.has(l.id))mp.set(l.id,[]);mp.get(l.id).push(l)}
  const ws=sheet(STN[S],[{header:'No',width:6},{header:'Nama',width:34},{header:'Kelas',width:12},{header:'Jurusan',width:24},{header:'Jumlah',width:10},{header:S==='HADIR'?'Tanggal & jam':'Tanggal',width:70}]);head(ws,S==='HADIR'?'FF1F8F5F':HC[S]);
  const rows=st.filter(x=>mp.has(x.id));
  if(!rows.length)ws.addRow(['',`Tidak ada siswa ${STN[S].toLowerCase()} pada periode ini.`]);
  rows.forEach((x,i)=>{const L=mp.get(x.id).sort((a,b)=>a.date.localeCompare(b.date)||String(a.session).localeCompare(String(b.session))),txt=L.map(l=>`${fmtD(l.date).slice(0,5)}${one?'':' '+l.session}${S==='HADIR'?' '+l.time:''}`).join(', ');
   const row=ws.addRow([i+1,x.nama,x.kelas,x.jurusan,L.length,txt]);body(ws,row,i,6);row.getCell(1).alignment={horizontal:'center',vertical:'middle'};row.getCell(5).alignment={horizontal:'center',vertical:'middle'};row.getCell(6).alignment={horizontal:'left',vertical:'middle',wrapText:true}});
  if(rows.length)ws.autoFilter={from:{row:1,column:1},to:{row:Math.max(ws.rowCount,2),column:6}}}
 // 3. Detail Catatan (setiap catatan; filter per tanggal, sesi, status, kelas, atau nama)
 {const po=new Map(PL.map((p,i)=>[p,i])),so={HADIR:0,SAKIT:1,IZIN:2,ALFA:3},
   det=recs.filter(l=>!stf||l.status===stf).sort((a,b)=>a.date.localeCompare(b.date)||(po.get(a.session)-po.get(b.session))||so[a.status]-so[b.status]||String(a.time||'').localeCompare(String(b.time||''))||byKelas(sm.get(a.id),sm.get(b.id))),
   dj=sheet('Detail Catatan',[{header:'No',width:7},{header:'Tanggal',width:12},{header:'Hari',width:10},{header:'Sesi',width:12},{header:'Status',width:11},{header:'Jam',width:9},{header:'Nama',width:34},{header:'Kelas',width:12},{header:'Jurusan',width:24},{header:'Dicatat oleh',width:16}]);head(dj,NV);
  det.forEach((l,i)=>{const x=sm.get(l.id),row=dj.addRow([i+1,fmtD(l.date),HARI[pd(l.date).getDay()],l.session,STN[l.status].toUpperCase(),l.time||'',x.nama,x.kelas,x.jurusan,l.by||'']);
   row.eachCell({includeEmpty:true},(c,k)=>{c.border=bd;c.alignment={vertical:'middle',horizontal:k<=6?'center':'left'}});row.getCell(5).fill=fl(STC[l.status]);row.getCell(5).font={bold:true}});
  if(det.length)dj.autoFilter={from:{row:1,column:1},to:{row:Math.max(dj.rowCount,2),column:10}};else dj.addRow(['','Belum ada catatan pada periode ini.'])}
 // 4. Per Tanggal
 const pt=sheet('Per Tanggal',[{header:'Tanggal',width:13},{header:'Hari',width:10},{header:'Hadir',width:10},{header:'Sakit',width:10},{header:'Izin',width:10},{header:'Alfa',width:10},{header:'Belum diisi',width:13},{header:'Persen hadir',width:13}]);head(pt,NV);
 const tc=(row,fn)=>{for(let k=1;k<=8;k++){const c=row.getCell(k);c.border=bd;c.alignment={vertical:'middle',horizontal:k<=2?'left':'center'};fn&&fn(c)}};
 days.forEach((x,i)=>{const e=efektif.has(x),c=get(pD,x),row=pt.addRow(e?[fmtD(x),HARI[pd(x).getDay()],c.HADIR,c.SAKIT,c.IZIN,c.ALFA,Math.max(0,st.length*nP-sum(c)),pct(c.HADIR,st.length*nP)]:[fmtD(x),HARI[pd(x).getDay()],'tidak ada data']);
  tc(row,c2=>{if(!e)c2.font={color:{argb:'FF8A97A8'},italic:true};else if(i%2)c2.fill=fl(ZB)});row.getCell(8).numFmt='0%'});
 {const row=pt.addRow(['TOTAL','',T.HADIR,T.SAKIT,T.IZIN,T.ALFA,Math.max(0,st.length*slots-sum(T)),pct(T.HADIR,st.length*slots)]);row.font={bold:true};tc(row,c2=>{c2.fill=fl('FFDCE6F3')});row.getCell(8).numFmt='0%'}
 // 5. Per Kelas
 const pk=sheet('Per Kelas',[{header:'Kelas',width:12},{header:'Jumlah siswa',width:13},{header:'Hadir',width:10},{header:'Sakit',width:10},{header:'Izin',width:10},{header:'Alfa',width:10},{header:'Belum diisi',width:13},{header:'Persen hadir',width:13},{header:'Tidak pernah hadir',width:19}]);head(pk,NV);
 kelasList.forEach((k,i)=>{const ss=st.filter(x=>x.kelas===k),c=get(pK,k),sl=ss.length*slots,row=pk.addRow([k,ss.length,c.HADIR,c.SAKIT,c.IZIN,c.ALFA,Math.max(0,sl-sum(c)),pct(c.HADIR,sl),ss.filter(x=>!get(pS,x.id).HADIR).length]);body(pk,row,i,1);row.getCell(8).numFmt='0%'});
 pk.autoFilter={from:{row:1,column:1},to:{row:Math.max(pk.rowCount,2),column:pk.columnCount}};
 // 6. Tidak pernah hadir
 const bn=sheet('Tidak Pernah Hadir',[{header:'No',width:6},{header:'Nama',width:34},{header:'Kelas',width:12},{header:'Jurusan',width:24},{header:'Keterangan',width:30}]);head(bn,'FFB3372F');
 if(!nE)bn.addRow(['','Belum ada data kehadiran pada periode ini.']);else if(!never.length)bn.addRow(['','Semua siswa pernah hadir pada periode ini.']);
 else never.forEach((x,i)=>{const c=get(pS,x.id),ket=['SAKIT','IZIN','ALFA'].filter(s=>c[s]).map(s=>`${STN[s]} ${c[s]}`).join(', ')||'Belum ada keterangan',row=bn.addRow([i+1,x.nama,x.kelas,x.jurusan,ket]);body(bn,row,i,5);row.getCell(1).alignment={horizontal:'center'}});
 if(never.length)bn.autoFilter={from:{row:1,column:1},to:{row:Math.max(bn.rowCount,2),column:5}};
 if(stf)[...wb.worksheets].forEach(ws=>{if(!['Ringkasan',STN[stf],'Detail Catatan'].includes(ws.name))wb.removeWorksheet(ws.id)});
 xlsxHead(r,fname(`rekap-kehadiran-mingguan-${per.from}_${per.to}${sel?'-'+sel:''}${kelas?'-'+kelas:''}${stf?'-'+stf:''}`)+'.xlsx');
 act('EXPORT',`download rekap mingguan ${per.from} s/d ${per.to} (${sel||'semua sesi'}${kelas?', kelas '+kelas:''}, ${recs.length} catatan, ${nE} hari efektif)`,q);
 await wb.xlsx.write(r);r.end()}
app.get('/api/export',ah(async(q,r)=>{
 const date=okDate(q.query.date)?q.query.date:today(),kelas=clean(q.query.kelas,20),stf=['HADIR','SAKIT','IZIN','ALFA'].find(x=>x===String(q.query.status||'').toUpperCase())||'';
 if(q.query.range==='minggu')return exportPeriode(q,r,date,kelas,stf);
 const p=sessions().includes(q.query.sesi)?q.query.sesi:(cur()||sessions()[0]);
 return exportHarian(q,r,date,p,kelas,stf)}));

require('./fitur')(app,{load,save,peek,act,clean,today,okDate,sessions,admin,sess,accounts,jad,cur});
app.get('/jsqr.js',(q,r)=>r.sendFile(path.join(path.dirname(require.resolve('jsqr')),'jsQR.js')));
app.get('/api/template',admin,async(q,r)=>{
 const wb=new ExcelJS.Workbook(),ws=wb.addWorksheet('Data Siswa'),pt=wb.addWorksheet('Petunjuk');
 ws.columns=[{header:'Nama',width:34},{header:'Kelas',width:14},{header:'Jurusan',width:26}];
 ws.getRow(1).height=24;ws.getRow(1).eachCell(c=>{c.font={bold:true,color:{argb:'FFFFFFFF'},size:12};c.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF0B2F5C'}};c.alignment={vertical:'middle'}});
 for(let i=2;i<=201;i++)for(let c=1;c<=3;c++)ws.getCell(i,c).border={bottom:{style:'hair',color:{argb:'FFB4C4D8'}}};
 ws.views=[{state:'frozen',ySplit:1}];pt.columns=[{width:34},{width:14},{width:26}];
 [['Petunjuk pengisian'],['Isi sheet "Data Siswa" mulai baris 2, satu siswa per baris.'],['Nama, Kelas, dan Jurusan wajib diisi. Jangan ubah judul kolom di baris 1.'],['Siswa dengan nama dan kelas yang sama otomatis dilewati.'],[],['Contoh pengisian'],['Nama','Kelas','Jurusan'],['Ahmad Fauzi','XI-2','IPA'],['Siti Aisyah','X-1','Akuntansi'],['Rizky Pratama','XII-3','TKJ']].forEach(x=>pt.addRow(x));
 pt.getRow(1).font=pt.getRow(6).font=pt.getRow(7).font={bold:true};
 r.set({'Content-Type':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','Content-Disposition':'attachment; filename="template-data-siswa.xlsx"'});act('EXPORT','download template Excel',q);
 await wb.xlsx.write(r);r.end()});
app.post('/api/import',admin,express.raw({type:()=>true,limit:'10mb'}),async(q,r)=>{
 try{const wb=new ExcelJS.Workbook();await wb.xlsx.load(q.body);const ws=wb.worksheets[0],d=load();let add=0,skip=0,bad=0;
  ws.eachRow((row,i)=>{if(i===1)return;const[n,k,j]=[1,2,3].map(c=>String(row.getCell(c).text||'').trim());
   if(!n&&!k&&!j)return;if(!n||!k||!j){bad++;return}
   if(d.students.some(s=>s.nama.toLowerCase()===n.toLowerCase()&&s.kelas.toLowerCase()===k.toLowerCase())){skip++;return}
   let id;do{id=Math.random().toString(36).slice(2,8).toUpperCase()}while(d.students.some(s=>s.id===id));
   d.students.push({id,nama:n,kelas:k,jurusan:j});add++});
  save(d);act('IMPORT',`import Excel: ${add} ditambahkan, ${skip} dilewati, ${bad} tidak lengkap`,q);r.json({add,skip,bad})}catch(e){r.status(400).json({msg:'File tidak bisa dibaca. Gunakan file .xlsx dari template.'})}});
app.listen(PORT,process.env.HOST||'0.0.0.0',()=>console.log(`\nAbsensi KEHADIRAN SISWA\nKomputer        : http://localhost:${PORT}\nHP (lihat data) : ${BASE}\nHP (kamera scan): ${HBASE}  (izinkan peringatan sertifikat sekali)\nLog aktivitas: buka CMD lain, jalankan  npm run log\n`));act('SERVER','server dijalankan (port '+PORT+')');
if(!process.env.NO_HTTPS)try{const f=path.join(__dirname,`cert-${ip()}.json`);let c;
 if(fs.existsSync(f))c=JSON.parse(fs.readFileSync(f));
 else{const p=selfsigned.generate([{name:'commonName',value:ip()}],{days:3650,keySize:2048,algorithm:'sha256',extensions:[{name:'subjectAltName',altNames:[{type:2,value:'localhost'},{type:7,ip:ip()}]}]});c={key:p.private,cert:p.cert};fs.writeFileSync(f,JSON.stringify(c))}
 https.createServer(c,app).listen(HPORT,'0.0.0.0')}catch(e){console.log('HTTPS tidak aktif:',e.message)}

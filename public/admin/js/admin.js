const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),$=s=>document.querySelector(s),api=(u,o)=>fetch(u,o).then(r=>{if(r.status==401){location='/login/';throw 0}return r.json()});let info,stu=[];
document.querySelectorAll('nav button').forEach(b=>b.onclick=()=>{document.querySelectorAll('nav button,section').forEach(e=>e.classList.remove('on'));b.classList.add('on');$('#'+b.dataset.t).classList.add('on');if(b.dataset.t=='scan')$('#code').focus()});
let fv=Date.now();const thumb=s=>s.foto?`<img class="th" src="/api/foto/${s.id}?v=${fv}" loading="lazy" alt="">`:`<span class="th">${esc(s.nama.trim().split(/\s+/).slice(0,2).map(x=>x[0]).join('').toUpperCase())}</span>`;
const row=s=>`<tr><td><b>${esc(s.nama)}</b></td><td>${esc(s.kelas)}</td><td>${esc(s.jurusan)}</td><td>${esc(s.time||'')}${s.telat?' <b style="color:#b3372f">Terlambat</b>':''}</td></tr>`;
const tbl=a=>a.length?`<table><tr><th>Nama</th><th>Kelas</th><th>Jurusan</th><th>Jam</th></tr>${a.map(row).join('')}</table>`:'<div class="empty">Belum ada data.</div>';
async function init(){const me=await api('/api/me');if(me.role!='admin')document.body.classList.add('osis');if(me.role=='admin')loadAk();$('#who').textContent=me.name+(me.role=='admin'?' (Admin)':' (OSIS)');await loadInfo();await loadKs();loadSnd().then(()=>{if(typeof renderSnd=='function')renderSnd()});$('#info').textContent='HP buka: '+info.base;
 $('#p').innerHTML=info.sesi.map(x=>`<option ${x==(info.cur||info.sesi[0])?'selected':''}>${x}</option>`).join('');$('#d').value=info.today;
 $('#d').onchange=$('#p').onchange=()=>{rsig='';report()};$('#kd').onchange=$('#sf').onchange=()=>{rsig='';report()};await loadStu();report();setInterval(report,5000);setInterval(loadInfo,30000);setInterval(tick,1000);tick()}
let rsig='';
const OPT=['ALFA','IZIN','SAKIT'];
const ktr=s=>`<tr><td><b>${esc(s.nama)}</b></td><td>${esc(s.kelas)}</td><td>${esc(s.jurusan)}</td><td><select class="ks${s.status?' s-'+s.status:''}" data-id="${s.id}"><option value="">Belum diisi</option>${OPT.map(o=>`<option ${o==s.status?'selected':''}>${o}</option>`).join('')}</select></td></tr>`;
const ktbl=a=>a.length?`<table><tr><th>Nama</th><th>Kelas</th><th>Jurusan</th><th>Keterangan</th></tr>${a.map(ktr).join('')}</table>`:'<div class="empty">Tidak ada data.</div>';
async function report(){const r=await api(`/api/report?date=${$('#d').value}&sesi=${encodeURIComponent($('#p').value)}&kelas=${encodeURIComponent($('#kd').value)}`),c=r.count;
 $('#n0').textContent=c.total;$('#n1').textContent=c.hadir;$('#n2').textContent=c.kosong;$('#n3').textContent=c.SAKIT;$('#n4').textContent=c.IZIN;$('#n5').textContent=c.ALFA;
 $('#sb1').textContent=c.hadir;$('#sb2').textContent=c.total-c.hadir;
 lastR=r;draw()}
let lastR=null;
function draw(){const r=lastR;if(!r)return;const f=$('#sf').value,q=$('#qd').value.trim().toLowerCase(),sig=f+'|'+q+'|'+JSON.stringify(r);if(sig==rsig)return;
 if(document.activeElement&&document.activeElement.classList.contains('ks'))return; /* jangan ganti daftar saat admin sedang memilih keterangan */
 rsig=sig;const m=x=>!q||[x.nama,x.kelas,x.jurusan,x.id].join(' ').toLowerCase().includes(q);
 $('#belum').innerHTML=ktbl(r.belum.filter(x=>m(x)&&(!f||(f=='-'?!x.status:x.status==f))));$('#hadir').innerHTML=tbl(r.hadir.filter(m))}
$('#qd').oninput=()=>{rsig='';draw()};
$('#belum').onchange=async e=>{const t=e.target;if(!t.classList.contains('ks'))return;
 const r=await api('/api/ket',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:t.dataset.id,date:$('#d').value,sesi:$('#p').value,status:t.value})});
 if(r.msg)alert(r.msg);t.blur();rsig='';report()};
$('#balfa').onclick=async()=>{const k=$('#kd').value,n=+$('#n2').textContent;if(!n){alert('Tidak ada siswa yang belum diisi keterangannya.');return}
 if(!confirm(`${n} siswa${k?' kelas '+k:''} yang belum hadir dan belum punya keterangan akan ditandai ALFA (${$('#d').value}, sesi ${$('#p').value}).\nSiswa yang scan kartu setelah ini otomatis berubah menjadi HADIR.\n\nLanjutkan?`))return;
 const r=await api('/api/ket/bulk',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({date:$('#d').value,sesi:$('#p').value,status:'ALFA',kelas:k})});
 alert(r.msg||r.added+' siswa ditandai ALFA.');rsig='';report()};
async function loadStu(){stu=await api('/api/students');
 const ks=[...new Set(stu.map(s=>s.kelas))].sort((a,b)=>a.localeCompare(b,'id',{numeric:true}));if(kls&&!ks.includes(kls))kls='';
 {const v=$('#kd').value;$('#kd').innerHTML='<option value="">Semua kelas</option>'+ks.map(x=>`<option ${x==v?'selected':''}>${esc(x)}</option>`).join('')}
 for(const k of ['#k1','#k2'])$(k).innerHTML='<option value="">Semua kelas</option>'+ks.map(x=>`<option ${x==kls?'selected':''}>${esc(x)}</option>`).join('');
 const L=flt();$('#list').innerHTML=L.length?`<table><tr><th>Nama</th><th>Kelas</th><th>Jurusan</th><th></th></tr>${L.map(s=>`<tr><td><div style="display:flex;gap:9px;align-items:center">${thumb(s)}<b>${esc(s.nama)}</b></div></td><td>${esc(s.kelas)}</td><td>${esc(s.jurusan)}</td><td style="white-space:nowrap;text-align:right"><button class="btn alt adm" style="padding:5px 10px" data-edit="${s.id}">Edit</button> <button class="btn alt adm" style="padding:5px 10px" data-foto="${s.id}">Foto</button> <button class="btn alt adm" style="padding:5px 10px" data-rpw="${s.id}" title="Kembalikan password siswa ke kode kartu">Reset PW</button> <button class="btn del adm" onclick="del('${s.id}')">Hapus</button></td></tr>`).join('')}</table>`:(stu.length?'<div class="empty">Tidak ada siswa yang cocok.</div>':'<div class="empty">Belum ada siswa. Isi formulir di atas.</div>');
 renderRombel();fillKe(ks);renderCards();kapply()}
$('#f').onsubmit=async e=>{e.preventDefault();const b=Object.fromEntries(new FormData(e.target));
 await api('/api/students',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(b)});e.target.reset();await loadStu();report()};
window.del=async id=>{if(confirm('Hapus siswa ini beserta riwayat absensinya?')){await api('/api/students/'+id,{method:'DELETE'});await loadStu();report()}};
/* Suara hasil scan: nada, ucapan, file sendiri, atau senyap (diatur admin, tersimpan di server) */
let ac,tvol=1,curAudio=null,ssty={};const sndOn=()=>$('#snd')?$('#snd').checked:true;
function tone(f,st,d,type,vol){const t0=ac.currentTime+st,o=ac.createOscillator(),g=ac.createGain(),pv=Math.max(.0002,(vol||.35)*tvol);o.type=type||'sine';o.frequency.value=f;
 g.gain.setValueAtTime(0.0001,t0);g.gain.exponentialRampToValueAtTime(pv,t0+0.02);g.gain.exponentialRampToValueAtTime(0.0001,t0+d);o.connect(g);g.connect(ac.destination);o.start(t0);o.stop(t0+d+0.02)}
const SPRE={ding:['Ding',[[1047,0,.4]]],bel:['Bel',[[1568,0,.12,'triangle'],[1175,.12,.45,'triangle']]],chime:['Chime naik',[[784,0,.15],[988,.15,.15],[1319,.3,.35]]],koin:['Koin',[[988,0,.08,'square',.18],[1319,.08,.4,'square',.18]]],fanfare:['Fanfare',[[523,0,.12,'triangle'],[659,.12,.12,'triangle'],[784,.24,.12,'triangle'],[1047,.36,.45,'triangle']]],pop:['Pop',[[600,0,.05],[900,.05,.1]]],bip3:['Tiga bip',[[700,0,.1],[700,.16,.1],[700,.32,.1]]],tung:['Tung turun',[[330,0,.2],[262,.22,.45]]],buzzer:['Buzzer',[[220,0,.28,'sawtooth',.3],[160,.3,.4,'sawtooth',.3]]],alarm:['Alarm',[[900,0,.15,'square',.2],[600,.17,.15,'square',.2],[900,.34,.15,'square',.2],[600,.51,.15,'square',.2]]],sirine:['Sirine',[[500,0,.25,'sawtooth',.2],[800,.25,.25,'sawtooth',.2],[500,.5,.25,'sawtooth',.2],[800,.75,.25,'sawtooth',.2]]],klakson:['Klakson',[[350,0,.5,'square',.2],[440,0,.5,'square',.2]]]};
const SBAW={ok:[[880,0,.12],[1320,.13,.2]],dup:[[700,0,.1],[700,.16,.1],[700,.32,.1]],bad:[[220,0,.28,'sawtooth',.3],[160,.3,.4,'sawtooth',.3]]};
const SDEF={jenis:'nada',preset:'bawaan',teks:'',rate:1,pitch:1,voice:'',vol:1,file:null};
const sfill=(t,x)=>String(t||'').replace(/\{(nama|kelas|jurusan)\}/g,(_,k)=>x&&x[k]||'');
function playSnd(ev,c,x,url){try{
 if(window.speechSynthesis)speechSynthesis.cancel();if(curAudio){curAudio.pause();curAudio=null}
 const vol=c.vol==null?1:c.vol;if(c.jenis=='senyap')return;
 if(c.jenis=='ucap'&&window.speechSynthesis){const t=sfill(c.teks,x).trim();if(t){const u=new SpeechSynthesisUtterance(t);u.lang='id-ID';u.rate=c.rate||1;u.pitch=c.pitch||1;u.volume=vol;
  const v=speechSynthesis.getVoices().find(y=>y.name==c.voice);if(v){u.voice=v;u.lang=v.lang}speechSynthesis.speak(u)}return}
 if(c.jenis=='file'){const u=url||(c.file?`/api/suara/${ev}/file?v=${c.file.ver}`:'');if(u){curAudio=new Audio(u);curAudio.volume=vol;curAudio.play().catch(()=>{});return}}
 ac=ac||new (window.AudioContext||window.webkitAudioContext)();if(ac.state=='suspended')ac.resume();tvol=vol;
 (c.preset&&SPRE[c.preset]?SPRE[c.preset][1]:SBAW[ev]).forEach(n=>tone(n[0],n[1],n[2],n[3],n[4]))}catch{}}
function beep(kind,x){if(sndOn())playSnd(kind,ssty[kind]||SDEF,x)}
async function loadSnd(){try{const r=await api('/api/suara');if(r&&r.ok)ssty=r}catch(e){}}
['click','keydown','touchstart'].forEach(ev=>addEventListener(ev,()=>{try{ac=ac||new (window.AudioContext||window.webkitAudioContext)();if(ac.state=='suspended')ac.resume()}catch{}},{once:false,passive:true}));
async function scan(v){const id=v.trim().split('/').pop().split('?')[0].toUpperCase();if(!id)return;
 let r;try{r=await api('/api/scan',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id})})}catch(e){if(e===0)return;r={ok:false,msg:'Gagal terhubung ke server.'}}
 beep(r.ok?(r.dup?'dup':'ok'):'bad',r.s);const el=$('#res');el.className=r.ok?'ok':'bad';el.innerHTML=r.ok?`<b>${esc(r.s.nama)}</b> (${esc(r.s.kelas)} · ${esc(r.s.jurusan)})<br>${r.dup?'Sudah hadir':'Hadir tercatat'}: ${esc(r.p)}, ${r.time}${r.was?`<br>Keterangan sebelumnya (${esc(r.was)}) diubah menjadi HADIR.`:''}`:r.msg;
 $('#code').value='';if(!stream)$('#code').focus();report()}
$('#go').onclick=()=>scan($('#code').value);$('#code').onkeydown=e=>{if(e.key=='Enter')scan(e.target.value)};
let stream;
$('#cam').onclick=async()=>{
 if(!window.isSecureContext){const e=$('#res');e.className='bad';e.innerHTML=`Kamera butuh koneksi aman. <a href="${info.https}/#scan" style="color:inherit"><b>Buka versi HTTPS</b></a>, lalu pilih Lanjutkan (Advanced, Proceed) pada peringatan sertifikat.`;return}
 const v=$('#video'),cv=document.createElement('canvas'),cx=cv.getContext('2d',{willReadFrequently:true});
 try{stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'environment'}})}catch{alert('Izin kamera ditolak atau kamera tidak tersedia.');return}
 v.srcObject=stream;v.style.display='block';await v.play();let last='',t=0;
 (function loop(){if(v.videoWidth){cv.width=v.videoWidth;cv.height=v.videoHeight;cx.drawImage(v,0,0);
  const c=jsQR(cx.getImageData(0,0,cv.width,cv.height).data,cv.width,cv.height);
  if(c&&(c.data!=last||Date.now()-t>4000)){last=c.data;t=Date.now();navigator.vibrate&&navigator.vibrate(150);scan(last)}}setTimeout(loop,250)})()};
$('#imp').onclick=async()=>{const f=$('#xl').files[0],o=$('#impres');if(!f){o.textContent='Pilih file .xlsx terlebih dahulu.';return}
 o.textContent='Mengimpor…';const r=await api('/api/import',{method:'POST',body:await f.arrayBuffer()});
 o.textContent=r.msg||`${r.add} siswa ditambahkan, ${r.skip} dilewati (sudah ada), ${r.bad} baris tidak lengkap.`;$('#xl').value='';await loadStu();report()};
if(location.hash=='#scan')document.querySelector('[data-t=scan]').click();
$('#rst').onclick=async()=>{const d=$('#d').value;if(!confirm(`Reset semua data absensi pada tanggal ${d}? Data siswa tidak ikut terhapus.`))return;
 const r=await api('/api/absen?date='+d,{method:'DELETE'});alert(r.removed+' catatan absensi dihapus.');report()};
$('#rstall').onclick=async()=>{if(!confirm('Hapus SEMUA riwayat absensi di semua tanggal? Data siswa tidak ikut terhapus.'))return;
 const r=await api('/api/absen?date=all',{method:'DELETE'});alert(r.removed+' catatan absensi dihapus.');report()};
$('#delall').onclick=async()=>{if(!stu.length){alert('Belum ada data siswa.');return}
 if(prompt(`Ini akan menghapus ${stu.length} siswa beserta seluruh riwayat absensinya. Ketik HAPUS untuk melanjutkan.`)!=='HAPUS')return;
 await api('/api/students',{method:'DELETE'});await loadStu();report()};
$('#dl').onclick=()=>{const[g,sc]=$('#rg').value.split(':');if(g=='bulan'){location.href=`/api/rekap-bulanan?bulan=${$('#d').value.slice(0,7)}&shift=${sc}&kelas=${encodeURIComponent($('#kd').value)}`;return}location.href=`/api/export?date=${$('#d').value}&sesi=${sc=='all'?'all':encodeURIComponent($('#p').value)}&kelas=${encodeURIComponent($('#kd').value)}&status=${$('#sx').value}${g=='hari'?'':'&range='+g}`};
$('#out').onclick=async()=>{await api('/api/logout',{method:'POST'}).catch(()=>{});location='/login/'};
let rmap={},cp=0,cs=10,akTouched=false,qs='',kls='',tm;
const flt=()=>{const t=qs.trim().toLowerCase();return stu.filter(s=>(!kls||s.kelas===kls)&&(!t||[s.nama,s.kelas,s.jurusan,s.id].join(' ').toLowerCase().includes(t)))};
const setQ=(v,from)=>{qs=v;(from=='1'?$('#q2'):$('#q1')).value=v;clearTimeout(tm);tm=setTimeout(()=>{cp=0;loadStu()},150)};
const setK=(v,from)=>{kls=v;(from=='1'?$('#k2'):$('#k1')).value=v;cp=0;loadStu()};
$('#k1').onchange=e=>setK(e.target.value,'1');$('#k2').onchange=e=>setK(e.target.value,'2');
$('#q1').oninput=e=>setQ(e.target.value,'1');$('#q2').oninput=e=>setQ(e.target.value,'2');
let ksty={def:{},kelas:{},default:{}};
const KK=['c1','c2','aksen','judul','nama','info'];
const KPRE=[['Biru (bawaan)','#0b2f5c','#1457a0','#c9a227','#f0d97a','#ffffff','#d6e4f6'],['Hijau','#064e3b','#15803d','#facc15','#fde68a','#ffffff','#d1fae5'],['Merah','#7f1d1d','#c2410c','#fbbf24','#fde68a','#ffffff','#fee2e2'],['Ungu','#3b0764','#7e22ce','#f9a8d4','#f5d0fe','#ffffff','#ede9fe'],['Hitam','#111827','#374151','#facc15','#fde68a','#ffffff','#e5e7eb'],['Oranye','#9a3412','#f97316','#1e3a8a','#fff7ed','#ffffff','#ffedd5'],['Putih','#f8fafc','#e2e8f0','#0b2f5c','#0b2f5c','#0f172a','#334155']];
const kget=k=>({...ksty.default,...ksty.def,...(k&&ksty.kelas[k]||{})});
const kvars=v=>KK.map(x=>`--${x}:${v[x]}`).join(';');
async function loadKs(){try{ksty=await api('/api/kartu-style')}catch(e){}}
const card=s=>`<div class="idcard" data-k="${esc(s.kelas)}" title="Klik untuk ubah warna" style="${kvars(kget(s.kelas))}"><div class="l"><div><div class="t"><img class="clogo" src="/shared/img/logo.jpg" alt=""><span>KARTU SISWA<br>SMK JAKARTA BARAT 1</span></div><h3>${esc(s.nama)}</h3><p>Kelas ${esc(s.kelas)}</p><p>${esc(s.jurusan)}</p></div></div><div class="qr"><img src="/api/qr/${s.id}" alt="QR ${esc(s.nama)}">${s.id}</div></div>`;
function renderCards(){const L=flt(),n=L.length,pages=Math.max(1,Math.ceil(n/cs));cp=Math.min(cp,pages-1);
 const part=L.slice(cp*cs,cp*cs+cs),sh=[];for(let i=0;i<part.length;i+=10)sh.push(part.slice(i,i+10));
 const bar=`<div class="pager noprint"><button class="btn alt" onclick="pg(-1)" ${cp?'':'disabled'}>‹ Sebelumnya</button><span>Halaman ${cp+1} dari ${pages} · ${n} kartu</span><button class="btn alt" onclick="pg(1)" ${cp<pages-1?'':'disabled'}>Berikutnya ›</button></div>`;
 $('#cards').innerHTML=n?bar+'<div class="sheets">'+sh.map((g,i)=>`<div class="noprint pg">Lembar ${cp*cs/10+i+1} · ${g.length} kartu</div><div class="sheet">${g.map(card).join('')}</div>`).join('')+'</div>'+bar:(qs||kls?`<div class="empty">Tidak ada siswa yang cocok${qs?` dengan "${esc(qs)}"`:''}${kls?` di kelas ${esc(kls)}`:''}.</div>`:'<div class="empty">Tambahkan siswa dulu di tab Siswa.</div>')}

// ===== Editor warna kartu (admin) =====
let kcur='',kks=[];
const kform=()=>Object.fromEntries(KK.map(x=>[x,$('#kc-'+x).value]));
function kfill(v){for(const x of KK)$('#kc-'+x).value=v[x]}
function kapply(){const v=kform();if(!$('#kpanel').classList.contains('on'))return;
 document.querySelectorAll('#cards .idcard').forEach(c=>{const k=c.dataset.k,hit=kcur?k==kcur:!ksty.kelas[k];c.classList.toggle('editing',hit);if(hit)for(const x of KK)c.style.setProperty('--'+x,v[x])})}
const kprev=kapply;
function kopen(k){kcur=k;fillKe();renderCards();$('#kfor').value=kcur;kfill(kget(kcur));$('#kpanel').classList.add('on');kapply();kmsg('')}
function kclose(){$('#kpanel').classList.remove('on');renderCards()}
function fillKe(ks){kks=ks||kks;const el=$('#kfor');if(!el)return;if(kcur&&!kks.includes(kcur))kcur='';
 el.innerHTML='<option value="">Semua kelas (warna umum)</option>'+kks.map(x=>`<option value="${esc(x)}" ${x==kcur?'selected':''}>${esc(x)}${ksty.kelas[x]?' · warna sendiri':''}</option>`).join('');
 if(!$('#kps').children.length)$('#kps').innerHTML=KPRE.map((p,i)=>`<button type="button" data-p="${i}"><i style="background:linear-gradient(135deg,${p[1]},${p[2]})"></i>${p[0]}</button>`).join('');
 if(!document.activeElement||!document.activeElement.id||!document.activeElement.id.startsWith('kc-')){kfill(kget(kcur));kprev()}}
function kmsg(t,ok){const e=$('#kmsg');e.textContent=t;e.style.color=ok?'var(--ok)':'var(--bad)'}
$('#kfor').onchange=e=>{kcur=e.target.value;kfill(kget(kcur));renderCards();kapply();kmsg('')};
$('#kopen').onclick=()=>kopen(kcur);$('#kclose').onclick=kclose;
$('#cards').onclick=e=>{const c=e.target.closest('.idcard');if(!c||document.body.classList.contains('osis'))return;const k=c.dataset.k;kopen(ksty.kelas[k]?k:'')};
for(const x of KK)$('#kc-'+x).oninput=kprev;
$('#kps').onclick=e=>{const b=e.target.closest('button');if(!b)return;const p=KPRE[+b.dataset.p];kfill(Object.fromEntries(KK.map((x,i)=>[x,p[i+1]])));kprev()};
$('#ksave').onclick=async()=>{const r=await api('/api/kartu-style',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({kelas:kcur,warna:kform()})});
 if(r.msg)return kmsg(r.msg);await loadKs();fillKe();renderCards();kapply();kmsg(kcur?`Warna kartu kelas ${kcur} disimpan.`:'Warna kartu semua kelas disimpan.',true)};
$('#kreset').onclick=async()=>{if(!confirm(kcur?`Kembalikan kartu kelas ${kcur} ke warna umum?`:'Kembalikan SEMUA kartu ke warna bawaan (biru)? Warna per kelas juga dihapus.'))return;
 const r=await api('/api/kartu-style'+(kcur?'?kelas='+encodeURIComponent(kcur):''),{method:'DELETE'});if(r.msg)return kmsg(r.msg);
 await loadKs();fillKe();renderCards();kfill(kget(kcur));kapply();kmsg('Warna dikembalikan.',true)};

// ===== Editor suara hasil scan (admin) =====
const SJUD={ok:['Berhasil di-scan','Barcode dikenali & kehadiran tercatat'],dup:['Sudah di-scan','Siswa itu sudah hadir sebelumnya'],bad:['Gagal di-scan','Kode tidak dikenali atau gagal']};
const spend={},ssm=(ev,t,ok)=>{const e=$('#sm-'+ev);if(e){e.textContent=t;e.style.color=ok?'var(--ok)':'var(--bad)'}};
const sv=(ev,k)=>$(`#sc-${ev} [data-k=${k}]`);
function svoiceOpts(sel){const vs=window.speechSynthesis?speechSynthesis.getVoices():[],id=vs.filter(v=>/^id/i.test(v.lang)),ot=vs.filter(v=>!/^id/i.test(v.lang));
 return '<option value="">Otomatis (bahasa Indonesia)</option>'+[...id,...ot].map(v=>`<option value="${esc(v.name)}" ${v.name==sel?'selected':''}>${esc(v.name)} (${esc(v.lang)})</option>`).join('')}
function renderSnd(){const g=$('#sgrid');if(!g)return;
 g.innerHTML=['ok','dup','bad'].map(ev=>{const c={...SDEF,...(ssty[ev]||{})};return `<div class="scard ${ev}" id="sc-${ev}"><h3>${SJUD[ev][0]}</h3><div style="font-size:13px;color:#6b7f99">${SJUD[ev][1]}</div>
 <label>Jenis suara<select data-k="jenis"><option value="nada" ${c.jenis=='nada'?'selected':''}>Nada</option><option value="ucap" ${c.jenis=='ucap'?'selected':''}>Suara bicara (ucapan)</option><option value="file" ${c.jenis=='file'?'selected':''}>File suara sendiri</option><option value="senyap" ${c.jenis=='senyap'?'selected':''}>Senyap (tanpa suara)</option></select></label>
 <div data-f="nada"><label>Pilih nada<select data-k="preset"><option value="bawaan">Bawaan</option>${Object.entries(SPRE).map(([k,v])=>`<option value="${k}" ${c.preset==k?'selected':''}>${v[0]}</option>`).join('')}</select></label></div>
 <div data-f="ucap"><label>Kalimat yang diucapkan<input data-k="teks" maxlength="200" value="${esc(c.teks)}"></label><div style="font-size:12px;color:#6b7f99;margin-top:4px">Boleh pakai {nama}, {kelas}, {jurusan}</div>
  <label>Suara<select data-k="voice">${svoiceOpts(c.voice)}</select></label><label>Kecepatan <span data-o="rate"></span><input type="range" data-k="rate" min="0.5" max="2" step="0.1" value="${c.rate}"></label><label>Tinggi nada <span data-o="pitch"></span><input type="range" data-k="pitch" min="0" max="2" step="0.1" value="${c.pitch}"></label></div>
 <div data-f="file"><label>Pilih file (mp3, wav, ogg, m4a; maks 3 MB)<input type="file" data-k="file" accept="audio/*"></label><div style="font-size:13px;color:#4a617d;margin-top:6px" data-o="fname">${c.file?'File sekarang: '+esc(c.file.name):'Belum ada file.'}</div></div>
 <label>Volume <span data-o="vol"></span><input type="range" data-k="vol" min="0.1" max="1" step="0.05" value="${c.vol}"></label>
 <div class="row"><button class="btn alt" data-a="test">Coba dengar</button><button class="btn" data-a="save">Simpan</button><button class="btn alt" data-a="reset">Bawaan</button></div><div class="sm" id="sm-${ev}"></div></div>`}).join('');
 ['ok','dup','bad'].forEach(sfresh)}
function sfresh(ev){const j=sv(ev,'jenis').value;document.querySelectorAll(`#sc-${ev} [data-f]`).forEach(d=>d.style.display=d.dataset.f==j?'':'none');
 const o=(k,t)=>{const e=document.querySelector(`#sc-${ev} [data-o=${k}]`);if(e)e.textContent=t};o('rate','('+sv(ev,'rate').value+'x)');o('pitch','('+sv(ev,'pitch').value+')');o('vol','('+Math.round(sv(ev,'vol').value*100)+'%)')}
function sform(ev){return{jenis:sv(ev,'jenis').value,preset:sv(ev,'preset').value,teks:sv(ev,'teks').value,voice:sv(ev,'voice').value,rate:+sv(ev,'rate').value,pitch:+sv(ev,'pitch').value,vol:+sv(ev,'vol').value}}
$('#sgrid').addEventListener('input',e=>{const c=e.target.closest('.scard');if(!c)return;const ev=c.id.slice(3);
 if(e.target.dataset.k=='file'){const f=e.target.files[0];if(!f){delete spend[ev];return}
  if(f.size>3*1024*1024){e.target.value='';delete spend[ev];return ssm(ev,'File terlalu besar (maks 3 MB).')}
  spend[ev]=f;c.querySelector('[data-o=fname]').textContent='Dipilih: '+f.name+' (belum disimpan)';ssm(ev,'')}
 sfresh(ev)});
$('#sgrid').addEventListener('click',async e=>{const b=e.target.closest('[data-a]');if(!b)return;const ev=b.closest('.scard').id.slice(3),act=b.dataset.a,samp={nama:'Budi Santoso',kelas:'X-1',jurusan:'TKJ'};
 if(act=='test'){const f={...sform(ev),file:ssty[ev]&&ssty[ev].file};playSnd(ev,f,samp,spend[ev]?URL.createObjectURL(spend[ev]):'');return}
 if(act=='save'){const f=sform(ev);try{
   if(f.jenis=='file'&&spend[ev]){const fl=spend[ev],ext=(fl.name.split('.').pop()||'').toLowerCase(),mt=fl.type||({mp3:'audio/mpeg',wav:'audio/wav',ogg:'audio/ogg',m4a:'audio/mp4',aac:'audio/aac',opus:'audio/ogg',webm:'audio/webm'}[ext]||'audio/mpeg');
    const r=await api(`/api/suara/${ev}/file`,{method:'PUT',headers:{'Content-Type':mt,'X-Nama':encodeURIComponent(fl.name)},body:fl});if(r.msg)return ssm(ev,r.msg);delete spend[ev]}
   const r=await api('/api/suara/'+ev,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(f)});if(r.msg)return ssm(ev,r.msg);
   ssty=r;renderSnd();ssm(ev,'Suara disimpan.',true)}catch(x){if(x!==0)ssm(ev,'Gagal menyimpan, coba lagi.')}return}
 if(act=='reset'){if(!confirm('Kembalikan suara ini ke bawaan? File suara yang diunggah ikut dihapus.'))return;delete spend[ev];
  const r=await api('/api/suara/'+ev,{method:'DELETE'});if(r.msg)return ssm(ev,r.msg);ssty=r;renderSnd();ssm(ev,'Dikembalikan ke bawaan.',true)}});
if(window.speechSynthesis)speechSynthesis.onvoiceschanged=()=>{if(!document.querySelector('#spanel input:focus,#spanel select:focus'))document.querySelectorAll('#sgrid [data-k=voice]').forEach(sel=>{const cur=sel.value;sel.innerHTML=svoiceOpts(cur)})};
window.pg=d=>{cp+=d;renderCards();scrollTo(0,0)};
$('#cs').onchange=e=>{cs=+e.target.value;cp=0;renderCards()};
async function loadAk(){const a=await api('/api/accounts');
 $('#alist').innerHTML=`<table><tr><th>Nama</th><th>Username</th><th>Peran</th><th></th></tr>${a.map(x=>`<tr><td><b>${esc(x.name)}</b></td><td>${esc(x.username)}</td><td>${({admin:'Admin',osis:'OSIS',walas:'Wali Kelas',kesiswaan:'Kesiswaan',piket:'Guru Piket',guru:'Guru'})[x.role]||esc(x.role)}${x.kelas&&x.kelas.length?`<div style="font-size:12px;color:#4a617d">${esc(x.kelas.join(', '))}</div>`:''}</td><td style="text-align:right"><button class="btn alt" style="padding:5px 10px" onclick="pw('${esc(x.username)}')">Ganti password</button> ${x.role=='admin'?'':`<button class="btn del" onclick="delAk('${esc(x.username)}')">Hapus</button>`}</td></tr>`).join('')}</table>`}
const fa=$('#fa');fa.elements.username.oninput=()=>akTouched=true;
fa.elements.name.oninput=e=>{if(!akTouched)fa.elements.username.value=e.target.value.toLowerCase().split(/\s+/).slice(0,2).join('.').replace(/[^a-z0-9._-]/g,'').slice(0,20)};
fa.onsubmit=async e=>{e.preventDefault();const r=await api('/api/accounts',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...Object.fromEntries(new FormData(fa)),kelas:[...fa.elements.kelas.selectedOptions].map(o=>o.value)})});
 const o=$('#ares');if(r.msg){o.textContent=r.msg;o.style.color='var(--bad)';return}
 o.textContent=`Akun ${r.name} dibuat. Username: ${r.username}`;o.style.color='var(--ok)';fa.reset();akTouched=false;loadAk()};
window.pw=async u=>{const p=prompt('Password baru untuk '+u+' (minimal 6 karakter):');if(!p)return;
 const r=await api('/api/accounts/'+encodeURIComponent(u)+'/password',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({password:p})});alert(r.msg||'Password diganti.')};
window.delAk=async u=>{if(!confirm('Hapus akun '+u+'?'))return;await api('/api/accounts/'+encodeURIComponent(u),{method:'DELETE'});loadAk()};
let skew=0,tz=0,pl='',jdirty=false;
const pad=n=>String(n).padStart(2,'0'),mn=x=>{const[a,b]=x.split(':').map(Number);return a*60+b};
const HARI=['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'],BLN=['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
async function loadInfo(){const i=await api('/api/info');info=i;skew=i.now-Date.now();tz=i.tz;
 const p=$('#p');if(p&&pl&&pl!=i.sesi.join()){const v=p.value;p.innerHTML=i.sesi.map(x=>`<option ${x==v?'selected':''}>${esc(x)}</option>`).join('');if(!i.sesi.includes(v))report()}
 pl=i.sesi.join();fillJadwal()}
function tick(){if(!info||!info.jadwal)return;const s=new Date(Date.now()+skew-tz*60000),t=s.getUTCHours()*60+s.getUTCMinutes(),J=info.jadwal;
 $('#clk').textContent=`${pad(s.getUTCHours())}:${pad(s.getUTCMinutes())}:${pad(s.getUTCSeconds())}`;
 $('#dt').textContent=`${HARI[s.getUTCDay()]}, ${s.getUTCDate()} ${BLN[s.getUTCMonth()]} ${s.getUTCFullYear()}`;
 let a=info.force&&J.find(x=>x.name==info.force);if(!a)a=J.find(x=>{const b=mn(x.start),e=mn(x.end);return b<e?t>=b&&t<e:t>=b||t<e});
 const el=$('#pnow');
 if(a){el.className='pnow on';el.textContent=`Sekarang sesi ${a.name}${a.shift?' (kelas masuk '+a.shift+')':''}${info.force?' (diatur manual)':''} · ${a.start}–${a.end}${a.batas?' · terlambat lewat '+a.batas:''}`}
 else{const nx=[...J].sort((x,y)=>((mn(x.start)-t+1440)%1440)-((mn(y.start)-t+1440)%1440))[0];
  el.className='pnow off';el.textContent=nx?`Di luar jam absensi · berikutnya ${nx.name}${nx.shift?' ('+nx.shift+')':''} pukul ${nx.start}`:'Jam absensi belum diatur'}}
const jrow=x=>{const d=document.body.classList.contains('osis')?'disabled':'';return `<div class="row jr" style="margin-bottom:8px"><label>Nama<input class="jn" value="${esc(x.name)}" ${d}></label><label>Mulai<input class="js" type="time" value="${x.start}" ${d}></label><label>Selesai<input class="je" type="time" value="${x.end}" ${d}></label><label>Untuk kelas<select class="jh" ${d}><option value="">Semua kelas</option><option value="pagi" ${x.shift=='pagi'?'selected':''}>Masuk pagi</option><option value="siang" ${x.shift=='siang'?'selected':''}>Masuk siang</option></select></label><label>Batas terlambat<input class="jb" type="time" value="${x.batas||''}" ${d}></label><button class="btn del adm jx" style="padding:9px 14px">Hapus</button></div>`};
function fillJadwal(force){if(jdirty&&!force)return;$('#jrows').innerHTML=info.jadwal.map(jrow).join('');
 const f=$('#jforce');if(document.activeElement!==f)f.innerHTML='<option value="">Otomatis (ikuti jam)</option>'+info.sesi.map(n=>`<option ${n==info.force?'selected':''}>${esc(n)}</option>`).join('')}
$('#jrows').oninput=()=>jdirty=true;
$('#jrows').onclick=e=>{if(e.target.classList.contains('jx')){e.target.closest('.jr').remove();jdirty=true}};
$('#jadd').onclick=()=>{jdirty=true;$('#jrows').insertAdjacentHTML('beforeend',jrow({name:'',start:'',end:'',shift:'',batas:''}))};
const jmsg=(t,ok)=>{const o=$('#jmsg');o.textContent=t;o.style.color=ok?'var(--ok)':'var(--bad)'};
$('#jsave').onclick=async()=>{const list=[...document.querySelectorAll('#jrows .jr')].map(r=>({name:r.querySelector('.jn').value.trim(),start:r.querySelector('.js').value,end:r.querySelector('.je').value,shift:r.querySelector('.jh').value,batas:r.querySelector('.jb').value}));
 const r=await api('/api/jadwal',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({list})});
 if(r.msg)return jmsg(r.msg,false);jdirty=false;await loadInfo();fillJadwal(true);jmsg('Jadwal tersimpan.',true);report()};
$('#jreset').onclick=async()=>{if(!confirm('Kembalikan jam absensi ke pengaturan bawaan?'))return;
 await api('/api/jadwal',{method:'DELETE'});jdirty=false;await loadInfo();fillJadwal(true);jmsg('Jadwal dikembalikan ke bawaan.',true);report()};
$('#jfsave').onclick=async()=>{const r=await api('/api/jadwal/force',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({force:$('#jforce').value})});
 if(r.msg)return jmsg(r.msg,false);await loadInfo();tick();jmsg($('#jforce').value?'Sesi aktif diatur manual: '+$('#jforce').value:'Sesi aktif kembali otomatis.',true)};

function renderRombel(){const g={};stu.forEach(s=>{(g[s.kelas]=g[s.kelas]||{n:0,j:new Set()}).n++;g[s.kelas].j.add(s.jurusan)});
 const ks=Object.keys(g).sort((a,b)=>a.localeCompare(b,'id',{numeric:true}));
 $('#rlist').innerHTML=ks.length?`<table><tr><th>Kelas sekarang</th><th>Jurusan</th><th>Jumlah siswa</th><th>Pindah ke kelas</th><th></th></tr>${ks.map(k=>`<tr><td><b>${esc(k)}</b></td><td>${[...g[k].j].map(esc).join(', ')}</td><td>${g[k].n}</td><td><input class="rto" data-k="${esc(k)}" value="${esc(rmap[k]||'')}" placeholder="mis. XI-1" maxlength="20"></td><td style="text-align:right"><button class="btn del" data-delk="${esc(k)}">Hapus kelas</button></td></tr>`).join('')}</table>`:'<div class="empty">Belum ada siswa.</div>'}
$('#rlist').oninput=e=>{if(e.target.classList.contains('rto'))rmap[e.target.dataset.k]=e.target.value};
$('#rapply').onclick=async()=>{const o=$('#rres'),m=Object.entries(rmap).map(([from,to])=>({from,to:to.trim()})).filter(x=>x.to&&x.to!==x.from&&stu.some(s=>s.kelas===x.from));
 if(!m.length){o.textContent='Belum ada kelas yang diisi.';return}
 if(!confirm('Pindahkan kelas:\n'+m.map(x=>x.from+' → '+x.to).join('\n')+'\n\nKode dan barcode siswa tidak berubah. Lanjutkan?'))return;
 const r=await api('/api/rombel',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({map:m})});
 if(r.msg){o.textContent=r.msg;return}
 rmap={};o.textContent=r.moved+' siswa berhasil dipindahkan kelas.';await loadStu();report()};
let edId;$('#list').onclick=e=>{const id=e.target.dataset&&e.target.dataset.edit;if(!id)return;const s=stu.find(x=>x.id==id);if(!s)return;
 edId=id;const f=$('#edf');f.nama.value=s.nama;f.kelas.value=s.kelas;f.jurusan.value=s.jurusan;$('#edid').textContent=s.id;$('#ed').showModal()};
$('#edx').onclick=()=>$('#ed').close();
$('#edf').onsubmit=async e=>{e.preventDefault();const r=await api('/api/students/'+edId,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(Object.fromEntries(new FormData(e.target)))});
 if(r.msg){alert(r.msg);return}$('#ed').close();await loadStu();report()};
$('#rlist').onclick=async e=>{const k=e.target.dataset&&e.target.dataset.delk;if(!k)return;const n=stu.filter(s=>s.kelas===k).length;
 if(prompt(`Ini akan menghapus kelas ${k}: ${n} siswa beserta seluruh riwayat absensinya. Tindakan ini tidak bisa dibatalkan.\nKetik nama kelas (${k}) untuk melanjutkan.`)?.trim().toLowerCase()!==k.toLowerCase())return;
 const r=await api('/api/class?kelas='+encodeURIComponent(k),{method:'DELETE'});if(r.msg){$('#rres').textContent=r.msg;return}
 delete rmap[k];$('#rres').textContent=`Kelas ${k} dihapus (${r.removed} siswa).`;await loadStu();report()};
$('#rest').onclick=async()=>{const f=$('#rf').files[0],o=$('#rres2');if(!f){o.textContent='Pilih file cadangan dulu.';return}const mode=$('#rm').value;
 if(mode=='replace'&&!confirm('Semua data siswa dan riwayat absensi di komputer ini akan DIGANTI dengan isi file. Lanjutkan?'))return;
 const r=await api('/api/restore?mode='+mode,{method:'POST',headers:{'Content-Type':'application/octet-stream'},body:f});
 if(r.msg){o.textContent=r.msg;return}o.textContent=`Berhasil: sekarang ada ${r.students} siswa dan ${r.absen} catatan absensi.`;$('#rf').value='';await loadStu();report();loadInfo()};
function setView(v,go){const c=$('.cols');c.classList.toggle('v-hadir',v=='hadir');c.classList.toggle('v-belum',v!='hadir');document.querySelectorAll('.seg button').forEach(b=>b.classList.toggle('on',b.dataset.s==v));if(go)$('.seg').scrollIntoView({behavior:'smooth',block:'start'})}
document.querySelector('.seg').onclick=e=>{const b=e.target.closest('button');if(b)setView(b.dataset.s)};
document.querySelectorAll('.stat[data-f],.stat[data-v]').forEach(e=>e.onclick=()=>{if(e.dataset.v){setView('hadir',1);return}$('#sf').value=e.dataset.f;rsig='';report();setView('belum',1)});
init();

/* ===== Foto siswa, reset password siswa, akun wali kelas ===== */
(function(){
 function readImg(file,max,sq){return new Promise((ok,no)=>{if(!file||!/^image\//.test(file.type))return no(new Error('File harus berupa foto (JPG/PNG).'));const u=URL.createObjectURL(file),im=new Image();
  im.onload=()=>{let sx=0,sy=0,sw=im.naturalWidth,sh=im.naturalHeight;if(sq){const m=Math.min(sw,sh);sx=(sw-m)/2;sy=(sh-m)/2;sw=sh=m}
   const k=Math.min(1,max/Math.max(sw,sh)),c=document.createElement('canvas');c.width=Math.max(1,Math.round(sw*k));c.height=Math.max(1,Math.round(sh*k));c.getContext('2d').drawImage(im,sx,sy,sw,sh,0,0,c.width,c.height);URL.revokeObjectURL(u);ok(c.toDataURL('image/jpeg',.85))};
  im.onerror=()=>{URL.revokeObjectURL(u);no(new Error('Foto tidak bisa dibaca. Coba foto lain.'))};im.src=u})}
 const d=document.createElement('dialog');d.id='fdlg';
 d.innerHTML='<div style="display:grid;gap:12px;min-width:260px;text-align:center"><h2 id="fdT" style="margin:0;font-size:17px"></h2><img id="fdImg" alt="" style="width:160px;height:160px;object-fit:cover;border-radius:50%;margin:0 auto;background:#e8f0fa;display:none;border:3px solid #fff;box-shadow:0 2px 10px #0b2f5c33"><div id="fdNo" class="empty">Belum ada foto.</div><input type="file" id="fdIn" accept="image/*" hidden><div class="row" style="justify-content:center"><button class="btn" id="fdUp" type="button">Pilih foto…</button><button class="btn del" id="fdDel" type="button" style="padding:10px 14px">Hapus foto</button><button class="btn alt" id="fdX" type="button">Tutup</button></div><div id="fdMsg" class="empty"></div></div>';
 document.body.appendChild(d);let cur=null;
 const E=i=>document.getElementById(i);
 function paint(){const s=stu.find(x=>x.id==cur);if(!s)return;E('fdT').textContent=s.nama+' ('+s.kelas+')';E('fdImg').style.display=s.foto?'block':'none';E('fdNo').style.display=s.foto?'none':'block';if(s.foto)E('fdImg').src='/api/foto/'+s.id+'?v='+fv;E('fdDel').style.display=s.foto?'':'none'}
 const msg=(t,bad)=>{E('fdMsg').textContent=t;E('fdMsg').style.color=bad?'var(--bad)':'var(--ok)'};
 document.getElementById('list').addEventListener('click',e=>{
  const f=e.target.dataset&&e.target.dataset.foto,p=e.target.dataset&&e.target.dataset.rpw;
  if(f){cur=f;msg('');paint();d.showModal()}
  if(p){const s=stu.find(x=>x.id==p);if(!s||!confirm('Reset password '+s.nama+' ke kode kartu ('+s.id+')?'))return;
   api('/api/siswa/'+p+'/reset-password',{method:'PUT'}).then(r=>alert(r.msg||'Password '+s.nama+' dikembalikan ke kode kartu.'))}});
 E('fdUp').onclick=()=>E('fdIn').click();E('fdX').onclick=()=>d.close();
 E('fdIn').onchange=async ev=>{const file=ev.target.files[0];ev.target.value='';if(!file)return;msg('Mengunggah…');
  try{const img=await readImg(file,640,true),r=await api('/api/siswa/'+cur+'/foto',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({img})});if(r.msg)throw new Error(r.msg);fv=Date.now();await loadStu();paint();msg('Foto tersimpan.')}catch(er){msg(er.message,1)}};
 E('fdDel').onclick=async()=>{if(!confirm('Hapus foto siswa ini?'))return;await api('/api/siswa/'+cur+'/foto',{method:'DELETE'});fv=Date.now();await loadStu();paint();msg('Foto dihapus.')};
 const ar=E('arole');ar.onchange=()=>{const w=ar.value=='walas';E('akW').style.display=w?'':'none';
  if(w)E('akK').innerHTML=[...new Set(stu.map(s=>s.kelas))].sort((a,b)=>a.localeCompare(b,'id',{numeric:true})).map(k=>'<option>'+esc(k)+'</option>').join('')};

 /* panel guru + daftar akun siswa */
 document.getElementById('gotoGuru').onclick=()=>{location='/admin/kedisiplinan.html'};
 const K=E('sakK'),Q=E('sakQ'),L=E('sakL');let sak=[];
 const rend=()=>{const q=Q.value.trim().toLowerCase(),a=sak.filter(x=>!q||x.nama.toLowerCase().includes(q)),m=a.slice(0,100);
  L.innerHTML=a.length?`<table><tr><th>Nama</th><th>Kelas</th><th>Username</th><th>Password</th><th></th></tr>${m.map(x=>`<tr><td><b>${esc(x.nama)}</b></td><td>${esc(x.kelas)}</td><td>${esc(x.id)}</td><td>${x.diganti?'<i>sudah diganti siswa</i>':esc(x.id)}</td><td><button class="btn alt" style="padding:5px 10px" data-rp="${esc(x.id)}">Reset PW</button></td></tr>`).join('')}</table>${a.length>m.length?`<div class="empty">Menampilkan 100 dari ${a.length}. Gunakan filter kelas / pencarian, atau unduh Excel untuk semuanya.</div>`:''}`:'<div class="empty">Tidak ada siswa.</div>'};
 async function loadSak(){sak=await api('/api/siswa-akun?kelas='+encodeURIComponent(K.value));rend()}
 K.onchange=()=>{E('sakX').href='/api/siswa-akun.xlsx?kelas='+encodeURIComponent(K.value);loadSak()};Q.oninput=rend;
 L.onclick=async e=>{const id=e.target.dataset&&e.target.dataset.rp;if(!id||!confirm('Reset password siswa ini ke kode kartu?'))return;await api('/api/siswa/'+id+'/reset-password',{method:'PUT'});loadSak()};
 document.querySelector('nav button[data-t=akun]').addEventListener('click',()=>{K.innerHTML='<option value="">Semua kelas</option>'+[...new Set(stu.map(s=>s.kelas))].sort((a,b)=>a.localeCompare(b,'id',{numeric:true})).map(k=>'<option>'+esc(k)+'</option>').join('');loadSak()});
})();

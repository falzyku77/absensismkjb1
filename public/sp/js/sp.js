const $=s=>document.querySelector(s),esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const BL=['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
const tgl=s=>{const[y,m,d]=s.split('-').map(Number);return `${d} ${BL[m-1]} ${y}`};
const ORD=['','Pertama','Kedua','Ketiga'];
const AKSI={1:'sekolah memberikan <b>Surat Peringatan Pertama (SP-1)</b> dan menghimbau Bapak/Ibu turut membina serta mengawasi putra/putri Bapak/Ibu agar mematuhi tata tertib sekolah. Pembinaan lebih lanjut dilakukan oleh wali kelas dan kesiswaan.',
 2:'sekolah memberikan <b>Surat Peringatan Kedua (SP-2)</b> dan meminta Bapak/Ibu hadir ke sekolah menemui wali kelas dan kesiswaan untuk pembinaan bersama serta membuat surat pernyataan pembinaan.',
 3:'sekolah memberikan <b>Surat Peringatan Ketiga (SP-3)</b> dan memanggil Bapak/Ibu untuk menghadap pihak sekolah. Apabila pelanggaran terus berlanjut, sekolah akan menetapkan sanksi lebih lanjut sesuai tata tertib sekolah yang berlaku.'};
(async()=>{
 const id=new URLSearchParams(location.search).get('id');
 const r=await fetch('/api/sp/'+encodeURIComponent(id||''));
 if(r.status===401){location='/login/?next='+encodeURIComponent(location.pathname+location.search);return}
 const j=await r.json().catch(()=>({}));
 if(!r.ok){$('#info').textContent=j.msg||'Gagal memuat';$('#isi').innerHTML='<p>Surat tidak ditemukan atau Anda tidak berhak melihatnya.</p>';return}
 const sp=j.sp,p=j.poin,kosong='..........................................';
 $('#info').textContent=`${sp.nomor} · ${sp.status==='DITERBITKAN'?'Sudah diterbitkan':'Belum diterbitkan (draf)'} · teks surat boleh diedit sebelum dicetak`;
 $('#isi').innerHTML=`
 <table class="meta"><tr><td>Nomor</td><td>:</td><td>${esc(sp.nomor)}</td></tr><tr><td>Lampiran</td><td>:</td><td>-</td></tr><tr><td>Perihal</td><td>:</td><td><b><u>Surat Peringatan ${ORD[sp.level]||sp.level} (SP-${sp.level})</u></b></td></tr></table>
 <p style="margin-top:14px">Kepada Yth.<br>Bapak/Ibu Orang Tua / Wali Murid dari <b>${esc(sp.nama)}</b><br>Kelas ${esc(sp.kelas)}${sp.jurusan?' ('+esc(sp.jurusan)+')':''}<br>di Tempat</p>
 <p>Dengan hormat,</p>
 <p>Berdasarkan catatan kedisiplinan siswa di SMK Jakarta Barat 1, putra/putri Bapak/Ibu:</p>
 <table class="meta" style="margin-left:24px"><tr><td>Nama</td><td>:</td><td><b>${esc(sp.nama)}</b></td></tr><tr><td>Kelas</td><td>:</td><td>${esc(sp.kelas)}</td></tr><tr><td>Total poin pelanggaran</td><td>:</td><td><b>${p.total} poin</b> (ringan ${p.ringan}, berat ${p.berat})</td></tr></table>
 <p>telah mencapai batas <b>${sp.ambang||j.set.spAmbang[sp.level-1]} poin</b> pelanggaran. Adapun rincian pelanggaran yang tercatat adalah sebagai berikut:</p>
 <table class="rinci"><tr><th style="width:30px">No</th><th style="width:135px">Tanggal</th><th>Pelanggaran</th><th style="width:70px">Jenis</th><th style="width:55px">Poin</th></tr>${j.pelanggaran.map((x,i)=>`<tr><td>${i+1}</td><td>${esc(tgl(x.tanggal))}</td><td>${esc(x.judul)}</td><td>${x.jenis==='BERAT'?'Berat':'Ringan'}</td><td>${x.poin}</td></tr>`).join('')}</table>
 <p>Sehubungan dengan hal tersebut, ${AKSI[sp.level]||''}</p>
 <p>Demikian surat ini kami sampaikan. Atas perhatian dan kerja sama Bapak/Ibu, kami ucapkan terima kasih.</p>
 <p style="text-align:right;margin-top:16px">Jakarta, ${esc(tgl(sp.diterbitkan||j.today))}</p>
 <div class="ttd"><div>Orang Tua / Wali<div class="sp"></div>( ${kosong.slice(0,22)} )</div><div>Wali Kelas<div class="sp"></div><b><u>${esc(j.walas||kosong.slice(0,22))}</u></b></div><div>Kesiswaan<div class="sp"></div><b><u>${esc(j.set.kesiswaan||kosong.slice(0,22))}</u></b></div></div>
 <div class="ttd" style="justify-content:center"><div>Mengetahui,<br>Kepala Sekolah<div class="sp"></div><b><u>${esc(j.set.kepsek||kosong.slice(0,22))}</u></b></div></div>`;
 const b=$('#btn');
 if(j.boleh){b.style.display='';b.textContent=sp.status==='DITERBITKAN'?'Cetak':'Terbitkan & Cetak';
  b.onclick=async()=>{if(sp.status!=='DITERBITKAN'){if(!confirm('Terbitkan SP ini? Siswa akan dapat melihatnya di portal.'))return;const x=await fetch('/api/sp/'+id+'/terbit',{method:'POST'});if(!x.ok){alert('Gagal menerbitkan.');return}sp.status='DITERBITKAN';b.textContent='Cetak'}print()}}
 else if(sp.status==='DITERBITKAN'){b.style.display='';b.textContent='Cetak';b.onclick=()=>print()}
})();

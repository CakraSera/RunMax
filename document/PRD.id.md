# RunMax — PRD v1 (Bahasa Indonesia)

**Status:** kunci lingkup untuk pengerjaan 14 hari; amandemen Consult 2026-09-16
**Tanggal:** 2026-09-12 (Consult: 2026-09-16)
**Kelas:** Devscale Indonesia, AI Product Engineering TypeScript Batch I
**Stack:** TypeScript fullstack. **Expo 54 web, mobile-first** (lebar ponsel) + server agen TypeScript.
**Persistensi:** **Week** ini dan **Log** sumber yang opsional di server agen sebagai pengguna **`demo`**. Tidak ada auth di v1. Rebuild **menimpa Senin ini**. Senin lama tidak disimpan.
**Pekerjaan:** Dari **Log** yang opsional (ditempel di Board, atau ditulis **Consult**), hasilkan **Week** ini dengan ≤1 Session Hard, berupa **Board**. **VO2 max** hanya salinan alasan, bukan data.

Istilah kanonis ada di [`../CONTEXT.md`](../CONTEXT.md). Pakai kata itu di kode, eval, dan copy UI. Nama objek (`Week`, `Session`, `Kind`, …) **tetap bahasa Inggris**.

---

## 1. Masalah

Pelari ingin menaikkan VO2 max lalu malah dapat rencana rumit: kalender 16 minggu, kuesioner, log harian wajib, ulasan mingguan, pace yang dikarang. Malam Minggu mereka menumpuk dua hari Hard, atau tidak jalan sama sekali.

v1 **tidak** mengukur VO2 max. Tidak ada lab, jam, atau isian 5K. Produk menegakkan minggu yang *untuk* VO2 max: mayoritas Easy, paling banyak satu Quality, minimal satu Rest atau Walk, dan tanpa Quality jika Log menyebut nyeri.

Beranda adalah **Board**, bukan chatbot. **Consult** adalah pintu kedua yang opsional: wawancara, menulis Log, lalu menyerahkan ke Weeksmith. Ini bukan WhatsApp. Ini bukan klinik.

---

## 2. Pengguna

Satu pelari (pembuat produk). Log boleh Bahasa Indonesia, Inggris, atau campur.

v1 **bukan** kapten klub, daftar atlet, atau matriks pemula/menengah/lanjutan.

**Permukaan:** web mobile-first. Demo di browser lebar ponsel. Bukan aplikasi toko.

---

## 3. Masuk lingkup

- PRD sebelum kode (berkas ini + kembaran Inggris).
- Beranda = **Board**. **Consult** adalah pintu kedua, bukan beranda. Tanpa laci **Why?**.
- Dua agen: `Weeksmith` (`BuildThisWeek`) dan `ConsultSmith` (`ConsultThenBuild`).
- Weeksmith: 5 tool kata kerja. ConsultSmith: 3 tool (`askCues`, `saveLog`, `buildThisWeek`). Tidak ada `doAnything`. Tidak ada `loadGoal`. Consult tidak pernah menyusun Session.
- MCP `notes` + RAG dari **catatan pendek yang ditulis pembuat** (bukan buku berhak cipta).
- Eval + jejak: satu trace per `BuildThisWeek` (tiap tool satu span). `ConsultThenBuild` adalah trace kedua yang boleh menyarangkan sebuah Build.
- Hanya **Week ini** (**Senin–Minggu**, bukan 7 hari bergulir). Tidak ada UI kalender 16 minggu. Tidak ada daftar Week lalu.
- Week + Log opsional tersimpan sebagai pengguna `demo` di server agen. Tanpa login. Senin ini ditimpa; Senin lama dibuang.
- Mayoritas Session Easy (pace ngobrol).
- Maksimal 1 Session Hard per Week (Quality adalah satu-satunya Kind Hard).
- ≥1 Rest atau Walk.
- Isyarat nyeri/cedera di Log → tidak ada Quality, tidak ada interval lari. Bukan diagnosis medis.
- Log kosong sah. Aplikasi mengisi tanggal tujuh kartu dari minggu kalender ini.
- Quality = menit + satu baris bahasa biasa. Tanpa pace, zona, atau set×jarak.
- Setelah Build, ketuk kartu untuk ganti Kind, menit, atau catatan. Ketukan ilegal tidak menempel.
- Expo 54 **web**, tata letak mobile-first.
- Strava / Garmin tidak wajib.
- **Tanpa WhatsApp** (tanpa salin, tanpa kirim, tanpa templat).

---

## 4. Di luar lingkup (tidak dikerjakan dalam 14 hari)
1. Chat sebagai beranda, atau thread perencana terbuka yang menyusun Session. (Consult sebagai Log-lalu-serah terima masuk lingkup.)
2. UI kalender 16 minggu
3. Strava, Garmin, Apple Health, VO2 lab, VO2 wearable, 5K sebagai isian
4. Salin / templat / kirim WhatsApp
5. Auth, tim, roster klub
6. OCR foto / Log suara
7. Daftar Week lalu, snapshot Senin ini, log undo
8. Pustaka interval / workout; split ber-pace
9. Goal lomba, tanggal lomba, Kind `race`, aturan taper / H-7
10. Kuesioner onboarding, pemilih level, wawancara ulasan mingguan, log harian wajib
11. Zona HR, TSS, grafik, VDOT, prediktor waktu lomba
12. Diagnosis, fisioterapi, peta tubuh
13. Laci Why? (RAG = jejak, bukan panel untuk pelari)
14. Push notification / sinkron kalender / build toko native
15. i18n penuh pada aplikasi (Log dwibahasa cukup; chrome UI bahasa Inggris)
16. Pembayaran, feed sosial, pasar pelatih
17. Angka VO2 yang disimpan

---

## 5. Objek domain

| Objek | Field | Aturan |
|---|---|---|
| **Week** | `weekStart` (Senin), `sessions[7]`, `flags[]`, `sourceLog?` | Tepat 7 Session. Tidak ada field teks share. |
| **Session** | `date`, `kind`, `durationMinutes`, `hard`, `note` | `kind`: `easy` \| `quality` \| `rest` \| `walk` |
| **Log** | teks opsional | Kosong sah. Bukan jurnal harian wajib. |

**Flag (pada Week):** `pain` · `emptyLog`

**Hard:** `quality` adalah Hard. `easy`, `rest`, `walk` bukan. `hardCount` ≤ 1.

Tidak ada **Goal**. Tidak ada Kind `race`. Tidak ada field km. Tidak ada field VO2.

---

## 6. UI (beranda bukan chat)

Web mobile-first. Lebar ponsel. Satu kolom.

1. **Board** (beranda): 7 kartu Session untuk Week ini, **selalu Senin–Minggu** (Build di Rabu tetap mengisi Senin dan Selasa). Kosong sampai Build pertama. **Ini artefaknya.** Chrome boleh bilang Week ini untuk VO2 max. Itu salinan, bukan widget.
2. Textarea **Log** (tempel opsional).
3. CTA utama: **Build this week**.
4. Chip alur (bukan gelembung chat): `parseLog` → `retrieveNotes` → `draftWeek` → `checkWeek` → `saveWeek`.
5. Banner: nyeri / ok / ketukan ilegal.
6. Ketuk kartu → sunting **Kind**, menit, dan catatan. Tanggal tidak bisa diubah. `hard` mengikuti Kind. Suntingan ilegal (**Quality kedua**, **nol Rest/Walk**, Quality saat `pain`, Easy/Quality 0 menit) **diblokir**: kartu tidak berubah, banner menjelaskan.
7. Durasi: Rest = **0** menit (dikosongkan jika Kind jadi Rest). Walk boleh bermenit. Menit Easy / Quality **harus > 0** (0 diblokir).
8. Tidak ada daftar Week lalu. Tidak ada laci Why?. Tidak ada isian Goal.
9. **Consult** opsional (bukan beranda): wawancara singkat. Menulis **Log**. Bertanya **Build this week?**. Ya → Weeksmith `BuildThisWeek`. CTA Board tetap jalan dengan Log kosong tanpa Consult.

Tidak ada tombol Copy / Share / WhatsApp di v1.

Gagal di Board = banner, bukan percakapan. `saveWeek` gagal setelah serah terima = banner di Board. Consult tidak terus menyusun Session di chat.

---

## 7. Agen, alur, tool

Dua agen. Dua pintu. Satu Week yang gagal-tertutup.

- **Agen (Board / Build):** `Weeksmith`
- **Alur (CTA Board):** `BuildThisWeek` (satu tombol; Log kosong sah)
- **Agen (Consult):** `ConsultSmith`
- **Alur (Consult):** `ConsultThenBuild` (wawancara → `saveLog` → konfirmasi → serah terima `buildThisWeek`)

### Tool Weeksmith

| Tool | Fungsi |
|---|---|
| `parseLog` | Uraikan Log ID/EN/campur yang opsional menjadi isyarat: nyeri, Hard baru-baru ini, volume kasar. Log kosong sah. |
| `retrieveNotes` | RAG lewat MCP `notes` (`searchNotes`, `readNote`). |
| `draftWeek` | Tulis 7 Session untuk Senin–Minggu ini. |
| `checkWeek` | Tegakkan aturan produk. Jika gagal, perbaiki atau tolak — jangan kirim Week ilegal. |
| `saveWeek` | Simpan Week sebagai rekaman server satu pengguna (menimpa `weekStart` ini). |

`checkWeek` **gagal** jika:

- `hardCount > 1`
- tidak ada Rest dan tidak ada Walk
- `pain` dan ada Quality / interval lari
- jumlah Session ≠ 7
- ada kalimat diagnosis (“kamu kena X”)
- catatan Quality berisi pace, zona, atau set×jarak (mis. `5×1000 @ 4:15`)
- `durationMinutes` Easy atau Quality = 0
- `durationMinutes` Rest bukan 0

Pembuat boleh menulis prompt model. Prompt bukan objek produk. Ia harus patuh pada kontrak ini atau `checkWeek` menolak draf.

### Tool ConsultSmith

| Tool | Fungsi |
|---|---|
| `askCues` | Baca apa yang sudah diketahui (nyeri / jalan / Hard baru-baru ini / menit kasar). Berhenti bertanya begitu Log cukup. Awal kosong sah. |
| `saveLog` | Tulis hasil Consult ke Log opsional (ID/EN/campur). Satu-satunya artefak yang ConsultSmith simpan. Tidak menulis Week. |
| `buildThisWeek` | Serah terima: jalankan `BuildThisWeek` yang sudah ada dengan Log itu. Harus setelah `saveLog` (string kosong pun simpanan sah). Tidak menyusun Session. |

Consult **tidak pernah** memanggil `draftWeek` / `checkWeek` / `saveWeek`. Jika Weeksmith menolak, Consult melaporkan kegagalan — tidak “memperbaiki Week di chat.”

Consult **tidak pernah** mendiagnosis, mengarang pace, atau menamai Goal lomba. Nyeri di chat → isyarat Log saja; gerbang nyeri Weeksmith tetap yang mengunci Quality.

---

## 8. MCP dan RAG

**Server MCP:** `notes`

- `searchNotes(query)`
- `readNote(id)`

**Korpus RAG** (markdown tulisan pembuat saja):

- `easy-majority.md` — pace ngobrol; sebagian besar menit Easy
- `one-hard-day.md` — maks 1 Quality per Week
- `rest-or-walk.md` — ≥1 Rest atau Walk
- `pain-gate.md` — isyarat nyeri/cedera → tanpa interval; bukan diagnosis
- `quality-is-a-line.md` — Quality = menit + satu baris bahasa biasa; tanpa pace
- `log-cues-id-en.md` — isyarat nyeri dan effort ID/EN

Bukan buku berhak cipta. Bukan sumber medis yang disamar sebagai diagnosis. Bukan paket resep pemula/menengah/lanjutan (itu pemilih level).

---

## 9. Aturan (produk, bukan feeling)

- Bangun **Week kalender ini** (Senin–Minggu), bukan 7 hari bergulir, bukan satu musim.
- Mayoritas Session Easy.
- Durasi **hanya menit**. Tidak ada km di kartu.
- Quality = `kind=quality` plus **catatan satu baris dari agen** (dibatasi RAG, mis. “20 min hard”). Bukan pemilih workout.
- Default jika tidak ada Pain: **selalu tepat 1 Quality**. Jangan menghapus Quality hanya karena Log terasa berat.
- Chrome Board **bahasa Inggris**. Log tetap ID/EN/campur.
- Pain → 0 Quality, 0 interval lari; hanya Easy / Walk / Rest.
- Jangan mendiagnosis. Jangan meresepkan obat atau suplemen.
- Jangan mengarang pace. Tidak ada 5K dan tidak ada angka VO2 untuk memacu.
- Consult tidak pernah menyusun Session. Hanya `saveWeek` yang mengirim Week.
- Consult tidak pernah mendiagnosis. Nyeri di chat adalah isyarat Log; gerbang nyeri Weeksmith tetap yang mengunci Quality.

---

## 10. Eval dan observabilitas

**Observabilitas:** satu trace per `BuildThisWeek`. Tiap tool Weeksmith = satu span. Demo boleh menampilkan trace Build (web lebar ponsel atau panel sempit kedua). `ConsultThenBuild` adalah trace kedua (`askCues` / `saveLog` / `buildThisWeek`) yang boleh menyarangkan sebuah Build. Consult bukan beranda dan bukan laci Why?.

**Fixture emas (wajib lulus):**

1. `happy-en` — Log Inggris, tanpa nyeri → 1 Quality, ≥1 Rest/Walk, sisanya Easy, 7 Session. Catatan Quality tanpa pace.
2. `pain-lutut` — `Rabu lutut agak nyeri, jalan aja` → `hardCount=0`, tanpa Quality, ada Walk atau Rest, banner nyeri.
3. `two-hard-draft` — draf mencoba dua hari Quality → `checkWeek` menolak; Week yang dikirim ≤1 Hard.
4. `no-rest` — 7 Easy/Quality, 0 Rest/Walk → tolak sampai ≥1 Rest atau Walk.
5. `empty-log` — tanpa Log → Week konservatif, tepat 1 Quality, ≥1 Rest/Walk, 7 Session, tanggal Senin–Minggu untuk `weekStart` ini.
6. `quality-no-pace` — draf mencoba `5×1000 @ 5K pace` (atau serupa) → `checkWeek` menolak; Quality di Board = menit + bahasa biasa.
7. `mixed-id-en` — Log campur tetap menghasilkan 7 Session.
8. `board-has-seven` — Week tersimpan tepat 7 Session, kind berurutan Senin–Minggu.
9. `second-build-overwrite` — dua Build di Senin yang sama → satu Week tersimpan; yang kedua menimpa yang pertama.
10. `sakit-no-dx` — `dada pegal abis lari` → tanpa Quality; keluaran tanpa kalimat diagnosis.
11. `consult-pain-log` — Consult menyebut `lutut nyeri` → teks `saveLog` memicu `parseCues.pain`; setelah serah terima, Week terkirim tanpa Quality.
12. `consult-handoff-once` — pengguna mengonfirmasi Build → Weeksmith menjalankan tepat satu `BuildThisWeek`; Consult tidak menyusun Session.
13. `consult-no-dx` — Consult tentang `dada pegal` → tidak ada kalimat diagnosis di keluaran Consult atau catatan yang dikirim.

---

## 11. Penerimaan

v1 selesai jika semua ini benar:

- [ ] Beranda adalah Board di **web mobile-first**, bukan chat sebagai beranda, bukan WhatsApp, bukan laci Why?.
- [ ] Log kosong tetap menghasilkan Week ini, ≤1 Hard, ≥1 Rest atau Walk, tujuh kartu bertanggal — **tanpa Consult**.
- [ ] Log nyeri → tanpa Quality / interval, ada banner — dan tanpa diagnosis.
- [ ] Board menampilkan 7 Session Senin–Minggu.
- [ ] Suntingan kartu yang merusak aturan tidak menempel.
- [ ] `BuildThisWeek` menjalankan 5 tool bernama dalam satu trace.
- [ ] MCP `notes` + catatan RAG benar-benar diambil (bukti span).
- [ ] 10 fixture emas Board lulus.
- [ ] Fixture Consult `consult-pain-log`, `consult-handoff-once`, `consult-no-dx` lulus.
- [ ] Demo 60 detik Board berjalan tanpa membuka Consult.
- [ ] Consult bisa dijangkau sebagai pintu kedua; konfirmasi Build menyerahkan ke Weeksmith; Board tetap beranda setelah serah terima.
- [ ] Tidak ada isian Goal, tidak ada angka 5K/lab/VO2, tidak ada daftar Week lalu.

---

## 12. Demo 60 detik

0:00 Browser lebar ponsel. Beranda = Board kosong. Chrome: for VO2 max. Bukan chat.
0:08 Biarkan Log kosong. Ketuk **Build this week**. Chip menyala.
0:18 Board: 7 kartu bertanggal Sen–Min. Satu Quality, ≥1 Rest atau Walk, sisanya Easy. Catatan Quality tanpa pace.
0:28 Ketuk kartu. Easy → Rest. Menempel. Menit jadi 0.
0:35 Ketuk kartu lain menjadi Quality kedua. Diblokir. Banner.
0:42 Tempel Log: `Rabu lutut agak nyeri jadi jalan.` Ketuk **Build this week** (menimpa).
0:52 Board: tanpa Quality. Walk atau Rest. Banner nyeri. Tanpa kalimat diagnosis.
0:58 Buka trace: 5 span tool.
1:00 Selesai demo Board. Jangan buka WhatsApp.

**Jalur Consult (pintu kedua, bukan beranda):**

0:00 Dari Board, buka Consult. Beranda tetap Board saat kamu keluar.
0:10 Ucapkan `lutut agak nyeri, jalan aja`. Agen tidak mendiagnosis.
0:20 Konfirmasi **Build this week**.
0:35 Board: tanpa Quality. Banner nyeri. Trace: span Consult + 5 span Weeksmith tersarang.

---

## 13. Daftar periksa kelas

| Syarat | Di mana |
|---|---|
| PRD sebelum kode | `document/PRD.en.md`, `document/PRD.id.md` |
| Agen dengan tool kata kerja (4–6) | `Weeksmith` + 5 tool; `ConsultSmith` + 3 tool |
| MCP dan RAG | MCP `notes` + markdown `/notes` |
| Eval dan jejak | §10 |
| ≥1 alur agen + 1 agen AI | `BuildThisWeek` + `Weeksmith`; juga `ConsultThenBuild` + `ConsultSmith` |
| Beranda bukan chat | Board adalah beranda; Consult adalah pintu kedua |

---

## 14. Nanti (bukan v1)

Kalender 16 minggu · Strava/Garmin/VO2 lab · uji 5K · Goal lomba · salin/kirim WhatsApp · aplikasi toko native · multi-pelari · adaptasi tengah minggu selain timpa · pustaka workout · prediktor lomba · OCR · zona HR · laci Why? · Week lalu · diagnosis/fisio/toko.

Semua itu hanya memakai ulang `Week` / `Session`. Jangan membuat objek v1 baru untuk mereka.

# TASK: Refactor GoPay Merchant Gateway to Bun + Reliability & Security Optimization

## 1. Role

Bertindak sebagai Senior Backend Engineer, Bun Runtime Specialist, Application Security Engineer, Payment Integration Engineer, dan DevOps Engineer.

Repository target:

https://github.com/ahmadzakiyox/gopay-api-gateaway

Lakukan refactor repository secara langsung di workspace yang tersedia.

Tujuan:
1. Migrasi runtime dari Node.js ke Bun stable terbaru.
2. Mempertahankan seluruh fitur bisnis dan kompatibilitas API.
3. Meningkatkan keamanan autentikasi, sesi, dan transaksi.
4. Mengoptimalkan penggunaan resource serta frekuensi request ke upstream.
5. Memastikan data transaksi tetap tersedia setelah restart.
6. Membuat kode mudah diuji, dipelihara, dan dideploy melalui Docker Compose.

Jangan berhenti pada analisis atau rencana. Audit kode, implementasikan perubahan yang aman, jalankan pengujian, dan dokumentasikan hasil aktual.

## 2. Target Technology Stack

Gunakan:
- Bun stable terbaru yang tersedia saat implementasi.
- Bun v1.4.3 sebagai baseline terverifikasi per 22 Oktober 2026; periksa release resmi sebelum menentukan versi akhir.
- JavaScript dengan modul yang konsisten.
- Express untuk tahap migrasi pertama.
- Bun package manager dengan lockfile `bun.lock`.
- Bun test runner melalui `bun test`.
- `bun:sqlite` sebagai penyimpanan persisten untuk satu instance.
- HTTP client yang sudah tersedia atau API HTTP bawaan Bun jika migrasinya terbukti aman dan mengurangi kompleksitas.
- Docker dan Docker Compose.
- Environment variables untuk seluruh konfigurasi rahasia.

Referensi resmi:
- Bun releases: https://github.com/oven-sh/bun/releases
- Bun documentation: https://bun.sh/docs
- Bun SQLite: https://bun.sh/docs/runtime/sqlite
- Bun Docker: https://hub.docker.com/r/oven/bun

Pin versi runtime dan image secara eksplisit. Jangan menggunakan nightly, canary, atau versi yang belum diverifikasi.

Jangan mengganti Express dengan `Bun.serve()` dalam migrasi pertama. Evaluasi penggantian framework hanya setelah seluruh kontrak API terbukti kompatibel.

Hindari penambahan dependency, framework, database server, Redis, message broker, atau service tambahan yang tidak memberikan manfaat nyata.

## 3. Aturan Utama

1. Periksa source code aktual sebelum mengambil keputusan.
2. Pertahankan endpoint, HTTP method, parameter, dan format response yang saat ini dipakai klien.
3. Pertahankan login OTP, session manager, refresh token, pembuatan QRIS, halaman checkout, pengecekan pembayaran, riwayat transaksi, dan logging.
4. Jangan menghapus file sesi atau menimpa data pengguna secara otomatis.
5. Jangan mengarang API upstream, webhook, transaction reference, atau perilaku autentikasi.
6. Jangan mengubah frekuensi polling menjadi lebih agresif dari implementasi saat ini.
7. Jangan menyimpan secret, OTP, token, cookie, atau kredensial merchant dalam Git, log, maupun Docker image.
8. Jangan menggunakan akun merchant sungguhan untuk automated test.
9. Jangan mengklaim pembayaran sukses hanya karena nominalnya cocok.
10. Jangan mengklaim penghematan resource tanpa benchmark yang benar-benar dijalankan.
11. Jangan melakukan optimasi yang mengorbankan ketepatan status pembayaran demi throughput.
12. Jangan menambahkan abstraksi berlebihan. Pilih modular monolith sederhana dengan satu service aplikasi.

## 4. Phase A — Repository Audit

Periksa seluruh file yang relevan, termasuk:
- `server.js`
- `sessionManager.js`
- `login.js`
- `package.json`
- `package-lock.json`
- `Dockerfile`
- `docker-compose.yml`
- `.env.example`
- `.gitignore`
- `README.md`
- `setup.sh`
- Semua file tambahan yang ditemukan.

Sebelum mengubah apa pun:
- Jalankan pemeriksaan Git status.
- Identifikasi perubahan pengguna yang belum di-commit.
- Catat entry point, dependency, environment variables, dan lokasi file sesi.
- Inventarisasi seluruh endpoint.
- Catat perilaku QRIS dan status transaksi.
- Identifikasi seluruh timer, polling, retry, dan background task.
- Buat baseline kontrak API berdasarkan source code.
- Catat ketidaksesuaian antara README dan implementasi.

Jangan menganggap implementasi sesuai dokumentasi sebelum diverifikasi.

## 5. Phase B — Migrasi ke Bun

Migrasikan proyek menggunakan Bun tanpa melakukan rewrite besar.

Persyaratan:
- Pindahkan scripts aplikasi agar berjalan dengan Bun.
- Generate dan validasi `bun.lock`.
- Tinjau dependency yang masih digunakan.
- Hapus `package-lock.json` hanya setelah konfigurasi Bun berhasil dan lockfile baru tervalidasi.
- Pastikan development, login CLI, production, dan testing berjalan.
- Evaluasi kompatibilitas Express, middleware, HTTP client, file system, timeout, dan session manager.
- Tangani error asinkron, Promise rejection, dan graceful shutdown dengan benar.

Scripts minimal:
- `bun run start`
- `bun run dev`
- `bun run login`
- `bun test`

Sesuaikan scripts dengan entry point aktual.

Pertahankan `login.js` dan alur OTP interaktif. Jangan mengasumsikan seluruh perilaku Node.js tersedia identik di Bun tanpa pengujian.

## 6. Phase C — Struktur Kode

Jika `server.js` terlalu padat, pecah tanggung jawab secara inkremental.

Contoh struktur target:

    src/
    ├── app.js
    ├── server.js
    ├── config/
    │   └── env.js
    ├── middleware/
    │   ├── apiKey.js
    │   ├── rateLimit.js
    │   └── errorHandler.js
    ├── routes/
    │   ├── health.js
    │   ├── qris.js
    │   ├── payment.js
    │   └── transactions.js
    ├── services/
    │   ├── gopayClient.js
    │   ├── sessionService.js
    │   ├── qrisService.js
    │   ├── paymentService.js
    │   └── transactionService.js
    ├── storage/
    │   ├── database.js
    │   ├── migrations.js
    │   └── paymentRepository.js
    ├── jobs/
    │   └── sessionRefresh.js
    └── utils/

    tests/
    ├── unit/
    ├── integration/
    └── fixtures/

    web/
    ├── templates/
    └── assets/

    data/
    .dockerignore
    .env.example
    .gitignore
    Dockerfile
    docker-compose.yml
    package.json
    bun.lock
    README.md

Struktur ini merupakan panduan. Jangan memaksakan pembuatan file yang tidak dibutuhkan.

Pisahkan HTTP handler, integrasi upstream, business logic, storage, dan background task. Pastikan service dapat diuji tanpa menjalankan HTTP server atau menghubungi akun merchant sungguhan.

Hindari ketergantungan pada API internal Express, seperti `app._router.handle`. Gunakan service atau handler bersama yang eksplisit.

## 7. Phase D — QRIS Generation

Audit implementasi parser EMVCo dan checksum CRC16 sebelum melakukan perubahan.

Persyaratan:
1. Parsing TLV harus memvalidasi format dan panjang setiap tag.
2. Tolak payload yang terpotong, malformed, atau mempunyai struktur yang tidak valid.
3. Jangan menghapus atau mengubah tag yang tidak terkait dengan nominal.
4. Pertahankan tag dan data merchant yang tidak perlu dimodifikasi.
5. Validasi merchant template sebelum dipakai.
6. Validasi nominal sebagai bilangan bulat positif dalam rentang yang ditentukan konfigurasi.
7. Tolak nilai decimal, NaN, Infinity, string malformed, angka di luar rentang aman, dan input yang berpotensi terpotong oleh `parseInt`.
8. Periksa format tag nominal dan perubahan indikator QRIS dinamis.
9. Hitung ulang CRC16 sesuai format EMVCo yang berlaku.
10. Pastikan panjang payload sesuai dengan aturan format.

Jangan menulis ulang parser berdasarkan asumsi. Gunakan spesifikasi yang dapat diverifikasi serta fixture QRIS sintetis yang valid.

Buat test untuk:
- Payload valid.
- Payload malformed.
- Tag nominal yang sudah ada.
- Tag nominal yang belum ada.
- Tag opsional dan tag yang tidak dikenal.
- Nominal tidak valid.
- Panjang TLV tidak cocok.
- CRC valid dan tidak valid.

### Generate gambar QR secara lokal

Saat ini checkout menggunakan layanan QR generator eksternal.

Ganti dengan generator QR lokal menggunakan library JavaScript yang kompatibel dengan Bun dan memiliki pemeliharaan yang layak.

Persyaratan:
- Jangan mengirim payload QRIS ke layanan QR generator pihak ketiga.
- Jangan bergantung pada layanan eksternal agar QR dapat ditampilkan.
- Pertahankan tampilan halaman checkout.
- Pastikan QR dapat dipindai dari hasil render lokal.
- Uji kesesuaian payload QR sebelum dan sesudah migrasi.
- Jangan mengubah isi pembayaran hanya untuk menyesuaikan library QR.

Minimalkan external asset untuk halaman checkout. Gunakan fallback font lokal agar halaman tetap berfungsi ketika jaringan eksternal gagal.

## 8. Phase E — Strong ID dan Validation

Ganti seluruh penggunaan `Math.random()` untuk ID pembayaran dengan API crypto bawaan Bun yang sesuai.

Persyaratan:
- Gunakan ID acak yang sulit ditebak.
- Pastikan tidak ada benturan ID yang dapat membuat pembayaran tertimpa.
- Tambahkan constraint unik pada database untuk identifier yang wajib unik.
- Tetapkan masa berlaku QRIS di server, bukan hanya berdasarkan countdown di browser.
- Jangan mempercayai status pembayaran, nominal, atau ID transaksi dari browser.
- Validasi semua parameter tanggal, waktu, nominal, pagination, dan merchant ID.
- Tetapkan nilai minimum dan maksimum untuk ukuran request serta ukuran halaman transaksi.

Periksa seluruh input eksternal, termasuk query string, HTTP headers, dan JSON body.

## 9. Phase F — Persistent Storage dengan bun:sqlite

Ganti state transaksi yang kritis dari `Map` di RAM menjadi SQLite.

Jangan menambahkan PostgreSQL atau Redis untuk kebutuhan satu instance.

Gunakan modul bawaan `bun:sqlite` dan parameterized queries.

Minimal simpan:

### Tabel payments

- `id`
- `transaction_reference`
- `amount`
- `qris_payload`
- `status`
- `created_at`
- `expires_at`
- `paid_at`
- `upstream_transaction_id`
- `payment_metadata` jika diperlukan

### Tabel transaction_claims

- `upstream_transaction_id`
- `payment_id`
- `claimed_at`

Gunakan foreign key dan unique constraint sesuai kebutuhan integritas data.

### Persistence requirements

- Persistensikan status `PENDING`, `PAID`, dan `EXPIRED`.
- Pertahankan hasil verifikasi pembayaran setelah restart.
- Pertahankan klaim transaksi agar transaksi tidak dapat digunakan dua kali.
- Gunakan transaksi database untuk perubahan state yang harus atomik.
- Pastikan dua request bersamaan tidak dapat mengklaim transaksi upstream yang sama.
- Terapkan migrasi schema yang versioned dan dapat dijalankan berulang dengan aman.
- Aktifkan konfigurasi SQLite yang sesuai untuk satu writer, termasuk WAL bila diperlukan.
- Jangan menghapus transaksi atau klaim hanya karena server restart.
- Bersihkan data yang sudah kedaluwarsa berdasarkan aturan retensi yang eksplisit.
- Jangan menghapus record pembayaran PAID secara otomatis tanpa kebutuhan retensi yang jelas.

Simpan database di direktori persisten, misalnya `data/gateway.sqlite`.

Buat mekanisme backup yang terdokumentasi. Jangan melakukan operasi file database secara manual dengan mengasumsikan semua data sudah berada di file utama ketika WAL aktif.

Migrasikan state lama yang memang tersedia jika memungkinkan. Jangan mengarang data histori yang sudah hilang dari RAM sebelum refactor.

Pastikan sistem mendukung satu instance aktif pada satu direktori SQLite. Dokumentasikan batasan ini.

## 10. Phase G — Payment Verification Correctness

Ini bagian paling penting dari seluruh refactor.

Audit fungsi `verifyPayment` dan endpoint terkait untuk menemukan risiko salah mengidentifikasi pembayaran.

Saat ini pencocokan berbasis nominal dan waktu dapat memiliki ambiguitas. `trx_id` yang dibuat oleh gateway hanya identifier internal kecuali upstream benar-benar menggunakan atau mengembalikan identifier tersebut.

Persyaratan:
1. Identifikasi semua field transaksi upstream yang benar-benar tersedia dan dapat dipercaya.
2. Prioritaskan reference atau ID transaksi upstream yang unik dan bisa diverifikasi.
3. Jangan menganggap ID lokal sebagai bukti korelasi dengan transaksi GoPay.
4. Jangan menandai order PAID berdasarkan nominal saja.
5. Jangan mengklaim transaksi yang sama untuk beberapa order.
6. Tangani dua transaksi dengan nominal sama pada rentang waktu yang berdekatan.
7. Hindari menggunakan transaksi sebelum waktu pembuatan QRIS.
8. Terapkan pengecekan status transaksi upstream yang relevan; jangan memperlakukan REFUND atau status non-final sebagai pembayaran sukses.
9. Jangan menganggap kegagalan upstream sebagai transaksi sukses.
10. Jangan mengubah status terminal PAID menjadi PENDING.
11. Simpan bukti verifikasi yang relevan tanpa membocorkan informasi sensitif.

Jika sumber data upstream tidak menyediakan informasi yang cukup untuk membedakan pembayaran secara pasti, perlakukan hasil sebagai ambigu dan jangan menyatakan lunas secara otomatis.

Pertahankan bentuk response API lama sejauh memungkinkan. Untuk kondisi ambigu, gunakan status non-paid yang kompatibel dan dokumentasikan keterbatasan verifikasinya.

Jangan membuat jaminan pembayaran yang tidak dapat dibuktikan oleh data upstream.

## 11. Phase H — Optimize Upstream Requests

Endpoint pemeriksaan status QRIS saat ini bisa memicu pengambilan mutasi transaksi pada setiap request.

Optimalkan penggunaan upstream tanpa meningkatkan frekuensi polling.

Implementasikan sesuai hasil audit:
- Single-flight untuk request transaksi yang identik atau dapat digunakan bersama.
- Cache snapshot transaksi dengan TTL pendek dan configurable.
- Timeout dan penanganan error.
- Minimal interval untuk refresh snapshot.
- Bounded retry dengan backoff dan jitter untuk error sementara.
- Deduplication untuk refresh sesi.
- Pembatasan request per client dan per QRIS.
- Cache hasil pembayaran yang sudah terverifikasi.
- Batas maksimum waktu untuk menunggu upstream.

Desain yang diutamakan: permintaan status dari beberapa QRIS dapat menggunakan snapshot transaksi merchant yang sama selama masih valid, bukan mengirim request upstream terpisah untuk setiap browser.

Ketentuan:
- Jangan menjalankan polling upstream terus-menerus ketika tidak ada pembayaran yang perlu diperiksa.
- Pertahankan auto-polling checkout sebagai fitur opsional.
- Jangan membuat retry lebih agresif daripada perilaku saat ini.
- Jangan membagikan status pembayaran antar-order yang berbeda.
- Cache data transaksi hanya untuk mengurangi request, bukan menggantikan proses pencocokan yang benar.
- Jangan mengabaikan rate limit atau kontrol keamanan upstream.

Tambahkan pengukuran jumlah request upstream agar pengurangan request bisa diverifikasi.

## 12. Phase I — Session and Authentication Security

Audit login OTP dan `sessionManager.js`.

Persyaratan:
- Pertahankan kompatibilitas sesi merchant yang sudah ada.
- Audit format penyimpanan sesi berdasarkan implementasi aktual; jangan mengasumsikan file sudah terenkripsi.
- Jangan mencetak OTP, access token, refresh token, cookie, atau kredensial ke log.
- Gunakan file permission yang membatasi akses.
- Gunakan atomic file replacement untuk pembaruan file sesi apabila sesuai.
- Jangan memindahkan atau menimpa file sesi lama tanpa backup.
- Cegah refresh token berjalan bersamaan secara tidak terkendali.
- Tangani refresh yang gagal dan sesi yang invalid.
- Jangan mengubah protokol login upstream tanpa alasan teknis yang terbukti.
- Jangan mengirim kredensial merchant ke service eksternal untuk kebutuhan logging, QR rendering, atau observability.

### API key

- Gunakan header `X-Api-Key` sebagai metode utama.
- Hindari pencantuman key pada URL karena URL dapat masuk ke log, history, dan sistem observability.
- Jika query-based API key diperlukan untuk kompatibilitas, sediakan feature flag dan dokumentasikan proses migrasinya.
- Jangan diam-diam memutus klien lama.
- Sediakan konfigurasi yang jelas agar deployment baru dapat menonaktifkan query-based API key.
- Jangan pernah menulis nilai API key ke log.

### CORS dan rate limiting

- Ganti CORS terbuka dengan daftar origin yang dapat dikonfigurasi.
- Jangan mewajibkan API key pada halaman checkout publik jika desain saat ini memang membutuhkan akses publik.
- Lindungi endpoint publik dari request berlebihan.
- Terapkan pembatasan jumlah request dan payload.
- Jangan menjadikan rate limiting sebagai alasan untuk menolak semua pemeriksaan pembayaran yang sah.

Pertahankan endpoint publik yang memang diperlukan dan batasi hanya sesuai kebutuhan.

## 13. Phase J — Error Handling dan Observability

- Buat centralized error handler.
- Pisahkan error internal dan error yang aman dikirim ke klien.
- Jangan mengembalikan stack trace, token, atau raw upstream error kepada client.
- Gunakan structured logging melalui `console` JSON atau implementasi ringan yang kompatibel dengan Bun.
- Terapkan redaction terhadap secret dan identitas sensitif.
- Pertahankan batas memori untuk log in-process bila tetap diperlukan.
- Hindari synchronous file I/O pada request path bila tidak diperlukan.
- Pastikan log tidak menjadi bottleneck pada traffic tinggi.
- Berikan request ID untuk troubleshooting tanpa menggunakan kredensial sebagai identifier.

Health check harus bisa memeriksa bahwa aplikasi aktif tanpa memanggil upstream pada setiap request.

Tambahkan readiness check untuk status storage dan konfigurasi dasar jika diperlukan.

Jangan menganggap health check server sama dengan validitas token merchant.

## 14. Phase K — HTTP API Compatibility

Pertahankan endpoint yang ditemukan dalam source code, termasuk jika tersedia:
- `/`
- `/health`
- `/api/health`
- `/token-status`
- `/create-qris`
- `/qr/:id`
- `/api/qr-status/:id`
- `/check-payment`
- `/transactions`
- `/transactions/all`
- `/api/logs`

Pertahankan GET dan POST pada endpoint yang mendukungnya sekarang.

Audit apakah endpoint yang menggunakan `app.all()` hanya perlu mengizinkan GET/POST. Jangan menghapus dukungan metode lama tanpa pemeriksaan terhadap kontrak aktual.

Pertahankan field response seperti:
- `success`
- `paid`
- `status`
- `data`
- `qris_id`
- `trx_id`
- `qris_code`
- `qris_url`
- `expires_at`
- `transaction`
- `transaction_id`

Daftar ini bukan asumsi bahwa seluruh field tersedia di semua endpoint. Gunakan hasil baseline untuk menentukan kontrak masing-masing endpoint.

Perbaiki pembentukan public URL. Jangan mempercayai Host header tanpa validasi. Sediakan `PUBLIC_BASE_URL` untuk deployment di belakang reverse proxy.

## 15. Phase L — Checkout Security and Reliability

Pertahankan checkout QRIS dengan countdown, tombol manual check, dan auto-polling opsional.

Persyaratan:
- Gunakan QR generator lokal.
- Escape data yang dimasukkan ke HTML.
- Serialisasikan identifier yang disisipkan ke JavaScript secara aman.
- Jangan menampilkan pesan upstream yang tidak disanitasi.
- Jangan mempercayai countdown browser sebagai otoritas kedaluwarsa.
- Pastikan polling dihentikan ketika status sudah final.
- Cegah request status paralel berulang dari browser yang sama.
- Berikan pesan jelas untuk PENDING, PAID, EXPIRED, dan kondisi layanan sementara tidak tersedia.
- Jangan tampilkan status PAID berdasarkan data browser yang tidak terverifikasi.

Halaman checkout harus tetap berfungsi meskipun resource eksternal, termasuk font, tidak dapat dimuat.

## 16. Phase M — Docker and Deployment

Perbarui Dockerfile dan Docker Compose untuk Bun.

Persyaratan:
- Pin official Bun image ke stable version.
- Gunakan dependency lockfile.
- Tambahkan `.dockerignore`.
- Jangan memasukkan `.env`, file sesi, database, atau secret ke dalam image.
- Gunakan non-root user jika kompatibel dengan izin data directory.
- Sediakan persistent volume untuk sesi merchant dan database.
- Pertahankan file sesi lama melalui prosedur migrasi yang terdokumentasi.
- Jangan memasang seluruh direktori source sebagai volume produksi jika tidak diperlukan.
- Pastikan port dapat dikonfigurasi.
- Terapkan health check lokal.
- Gunakan restart policy yang sesuai.
- Implementasikan graceful shutdown.
- Pastikan database dan file sesi tetap tersedia setelah container dibuat ulang.
- Dokumentasikan backup dan restore.
- Pastikan konfigurasi volume dan izin file cocok dengan user di dalam container.

Deployment awal cukup satu container aplikasi. Jangan menambah service database lain untuk penggunaan satu instance.

Gunakan HTTPS melalui reverse proxy atau lapisan deployment yang memang sudah disiapkan. Jangan mengasumsikan Docker port mapping sendiri sudah memberikan HTTPS.

## 17. Phase N — Automated Tests

Gunakan Bun test runner.

Semua test harus menggunakan data sintetis dan mock upstream; jangan menjalankan pembayaran sungguhan.

Minimal mencakup:

### QRIS

- Nominal valid dan invalid.
- Parser TLV.
- CRC16.
- Payload malformed.
- Panjang tag.
- ID unik.
- QR rendering lokal.

### Payment

- PENDING.
- PAID.
- EXPIRED.
- Transaksi upstream tidak ditemukan.
- Transaksi ambigu.
- Nominal sama pada waktu berdekatan.
- Upstream timeout.
- Refresh sesi gagal.
- Request paralel untuk payment yang sama.
- Satu transaksi tidak bisa diklaim dua kali.

### Persistence

- Pembayaran masih dapat dilihat setelah restart.
- Status PAID tetap PAID setelah restart.
- Klaim transaksi tidak hilang setelah restart.
- Constraint unique bekerja.
- Rollback database berjalan.
- Migrasi schema berjalan dengan aman.
- File sesi tidak terhapus saat container dibuat ulang.

### API contract

- Semua endpoint.
- Semua method yang didukung.
- Response JSON.
- Status code.
- API key valid dan invalid.
- API key query yang masih didukung selama masa transisi.
- CORS dan rate limiting.
- Error handling.

### Session management

- Sesi tidak ditemukan.
- Sesi kedaluwarsa.
- Refresh berhasil dan gagal.
- Pembaruan sesi bersamaan.
- Secret tidak muncul dalam log.

Jangan menandai test sebagai PASS jika test dilewati atau hanya memeriksa status HTTP tanpa memeriksa perilaku penting.

## 18. Phase O — Benchmark

Bandingkan baseline Node.js dengan hasil Bun jika lingkungan memungkinkan.

Ukur menggunakan beban dan kondisi yang sama:
- Ukuran Docker image.
- Waktu startup.
- RAM idle.
- RAM ketika menerima request.
- Latensi p50, p95, dan p99.
- Throughput endpoint lokal.
- Jumlah request upstream untuk skenario checkout yang sama.

Jangan membandingkan endpoint yang latensinya didominasi upstream tanpa mengontrol faktor tersebut.

Catat versi runtime, hardware, metode, durasi test, serta hasil aktual.

Jika benchmark tidak dapat dilakukan, jelaskan keterbatasannya tanpa mengarang angka.

## 19. Acceptance Criteria

Refactor hanya dinyatakan selesai jika:
1. Aplikasi berjalan menggunakan Bun stable yang dipin.
2. Express tetap berjalan sampai penggantian framework secara terpisah terbukti aman.
3. Seluruh endpoint lama masih berfungsi sesuai kontrak yang diverifikasi.
4. Login OTP dan session manager tetap kompatibel.
5. QRIS dibangkitkan secara lokal dan CRC lolos pengujian.
6. Input nominal tervalidasi secara ketat.
7. ID pembayaran menggunakan crypto yang sesuai.
8. QRIS, status pembayaran, dan klaim transaksi tersimpan secara persisten.
9. Klaim transaksi dilakukan secara atomik.
10. Status ambigu tidak dinyatakan PAID.
11. Request polling dapat menggunakan snapshot transaksi bersama tanpa menimbulkan polling agresif.
12. CORS, API key, secret, file sesi, dan log telah ditinjau keamanannya.
13. Docker memiliki penyimpanan persisten dan berjalan sebagai non-root jika memungkinkan.
14. Automated test relevan berjalan dan hasilnya dilaporkan dengan benar.
15. README mencerminkan implementasi aktual.
16. Tidak ada perubahan pengguna yang tidak sengaja terhapus.
17. Tidak ada klaim benchmark yang tidak didukung hasil pengukuran.

Jika suatu acceptance criterion tidak terpenuhi, jangan menyembunyikannya. Jelaskan masalah dan tindakan yang masih diperlukan.

## 20. Final Report

Setelah implementasi, berikan laporan dengan urutan berikut:
1. Ringkasan refactor.
2. Versi Bun yang digunakan.
3. Struktur direktori akhir.
4. Dependency yang dipertahankan, ditambahkan, atau dihapus.
5. Daftar endpoint dan kompatibilitas yang diuji.
6. Perbaikan QRIS dan verifikasi transaksi.
7. Perubahan database dan migrasi data.
8. Perbaikan keamanan.
9. Perubahan polling dan pengukuran request upstream.
10. Perubahan Docker dan persistent volume.
11. Hasil test: PASS, FAIL, dan NOT RUN.
12. Hasil benchmark jika dilakukan.
13. Environment variables yang diperlukan.
14. Perintah instalasi, menjalankan aplikasi, testing, build, backup, dan restore.
15. Known issues serta keterbatasan upstream.
16. Langkah migrasi deployment dan rollback.

**Prioritas akhir:** ketepatan pembayaran, kompatibilitas API, keamanan sesi, dan konsistensi state lebih penting daripada mengejar benchmark yang tinggi. Buat aplikasi yang ringan melalui desain sederhana, cache yang tepat, request yang terkontrol, serta penggunaan dependency dan service seminimal mungkin.

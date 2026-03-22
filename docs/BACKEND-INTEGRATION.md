# Backend entegrasyon notları (Veteriner panel)

Bu dosya **Swagger / gerçek API ile doğrulanması gereken** varsayımları özetler. Kod davranışı `api-endpoints.ts`, mapper’lar ve servislerde yorumlarla desteklenir.

## Kimlik doğrulama

- **Login / refresh** gövdeleri: backend camelCase veya PascalCase/snake_case dönebileceği için `AuthService.mapTokenResponse` birden fazla anahtar adını okur.
- **401**: `auth.interceptor.ts` access yenileme sonrası tekrar deneme (`X-Auth-Retry`) yapar; refresh başarısız veya **ikinci 401** olursa oturum temizlenir ve `/auth/login?returnUrl=...` ile yönlendirilir.
- **Logout**: istemci tarafında `clearSession()`; sunucu `logout` endpoint’i bu fazda zorunlu çağrılmaz.

## Liste sorguları (ortak)

- Çoğu liste mapper’ı **PascalCase** query kullanır: `Page`, `PageSize`, `Search`, `Status`, `FromDate`, `ToDate`, `Sort`, `Order` (modüle göre `Method` vb.).
- Backend farklı isim kullanıyorsa ilgili `*QueryToHttpParams` fonksiyonu güncellenir.
- **Durum filtreleri** bazı uçlarda yok sayılırsa, istemci tarafında `filter*ListByStatus` ile daraltma yapılabilir (mapper yorumlarına bakın).

## Oluşturma (POST) yanıtları

- **Muayene, randevu, ödeme** create: `POST` liste path’ine gönderilir; yanıt gövdesinde en azından **`id`** beklenir (detay DTO dönüşü). Sadece `{ id }` veya sarmalayıcı gövde gelirse ilgili servis `map` bloğu uyarlanır.

## Dashboard

- `loadOperationalDashboard()` **paralel** istekler kullanır; tek blok hata verse bile diğer bölümler `SectionResult` ile dolar.
- Özet endpoint’i (`/dashboard/summary`) ile liste uçlarındaki sayaçlar **aynı anda** farklı olabilir; cache / gecikme backend kaynaklıdır.

## Alan tipleri

- **Randevu / ödeme** listelerinde `status` genelde **string**; dashboard özetindeki küçük randevu öğeleri bazen **sayısal enum** olabilir — ilgili util (`appointmentStatusLabel` vs.) bağlama göre kullanılır.
- Tarihler: formdan `datetime-local` / `date` → ISO UTC dönüşümü `date.utils` içinde; sunucu gün sınırı (UTC vs yerel) farkları için backend sözleşmesine bakın.

## Hayvan listesi / müşteri filtresi

- `GET /pets?ClientId=...` desteklenmezse veya DTO’da `clientId` yoksa `filterPetsByClientId` ile yedek filtre kullanılır (create formları).

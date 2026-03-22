# Faz 1 — backend entegrasyon notları

Bu dosya ikinci faz öncesi **varsayılan API sözleşmelerini** ve güncellenebilir noktaları özetler. Swagger (`/swagger`) ile birebir doğrulama önerilir.

## Ortak liste sorgusu

Çoğu liste servisi şu query isimlerini kullanır (backend farklıysa ilgili `*-query.model.ts` + `*mapper` içindeki `*QueryToHttpParams` güncellenir):

| Parametre   | Örnek kullanım        |
|------------|------------------------|
| `Page`     | Sayfa (1 tabanlı)      |
| `PageSize` | Sayfa boyutu           |
| `Search`   | Metin arama            |
| `Sort`     | Sıralama alanı         |
| `Order`    | Sıra yönü              |
| `Status`   | Durum (destekleniyorsa)|
| `FromDate` / `ToDate` | Tarih aralığı (yyyy-MM-dd) |
| `Species`  | Pets                   |
| `ClientId` | Pets                   |
| `Method`   | Payments               |

**İstemci tarafı filtre:** `Status` (ve Payments’ta `Method`) API yok sayarsa, liste sayfaları gelen sayfa üzerinde `normalizeFilterKey` ile eşleştirir.

## Auth

- **Login:** `LoginRequest` — `email`, `password`, isteğe bağlı `tenantId` (`environment.authTenantId`).
- **Refresh:** `RefreshTokenRequest` — `{ refreshToken }`. `AuthService.refreshSession()` hazır; interceptor faz 1’de otomatik çağırmaz.
- **401:** Global yönlendirme yok; login ekranı mesajları `loginFailureMessage` ile.

## Modül özeti

### Dashboard

- `GET /api/v1/dashboard/summary` — DTO alanları swagger ile eşleştirilmeli.

### Clients

- Liste/detay DTO alanları `client-api.model.ts`.
- Liste: istemci tarafı `status` filtresi.

### Pets

- Ek query: `Species`, `ClientId`.
- Detay özet alanları (aşı / muayene / randevu) backend şemasına göre genişletilebilir.

### Appointments

- `type` / `appointmentType` mapper’da birleştirilir.

### Examinations

- **POST** yanıtında en az `id` içeren detay DTO varsayımı (oluşturma sonrası yönlendirme).

### Vaccinations

- Aşı adı: `vaccineName` veya `name`.

### Payments

- **POST** yanıtında `id` varsayımı.
- Tutar: `number`; para birimi varsayılan `TRY`.
- Vade tarihi formu: `dateOnlyInputToUtcIso` (UTC gün başı); backend farklı bekliyorsa mapper güncellenir.

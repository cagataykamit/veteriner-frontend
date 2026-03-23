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
- **İlişki filtreleri (detay özet blokları):** `PetId` (vaccinations, examinations, appointments, **payments**), `ClientId` (appointments, payments, **examinations**; pets zaten `ClientId` kullanıyor). Backend bu parametreleri yok sayarsa yanıt satırları üzerinde `petId` / `clientId` ile **istemci tarafı filtre** uygulanır (`DetailRelatedSummariesService`).
- **Ödeme ↔ muayene:** Detay DTO’da `examinationId` yoksa “ilgili muayene” blokları **aynı hayvan veya müşteri** üzerinden bağlamsal listedir; kesin eşleşme değildir.

## Oluşturma (POST) yanıtları

- **Muayene, randevu, ödeme** create: `POST` liste path’ine gönderilir; yanıt gövdesinde en azından **`id`** beklenir (detay DTO dönüşü). Sadece `{ id }` veya sarmalayıcı gövde gelirse ilgili servis `map` bloğu uyarlanır.

## Müşteriler (clients)

- **POST** `/api/v1/clients` — gövde (varsayım, camelCase): `fullName`, `phone`, isteğe bağlı `email`, `address`, `notes`, `status`. Swagger şeması farklıysa `ClientCreateRequestDto` ve `mapCreateClientToApiBody` güncellenir.
- **Telefon:** İstemci create formunda yerel doğrulama `05…` / `5…` / `905…` rakam uzunluklarına yakın; kesin normalize ve iş kuralları backend’dedir.
- **POST yanıtı — kimlik çıkarma:** `extractCreatedClientIdFromPostResponse` şunları dener: gövdede `id` / `Id` / `clientId` / `ClientId`; iç içe `data` / `value` / `result` / `client` alt nesneleri; sayısal `id`. Hiçbiri yoksa kullanıcıya yumuşak hata + listeyi kontrol et uyarısı.
- **Çakışma:** `409` ve boş gövde → Türkçe duplicate fallback; `ProblemDetails.detail` varsa o önceliklidir.
- **400 doğrulama:** `ValidationProblemDetails` gövdesinde `errors` sözlüğü (ör. `Phone` / `phone` → `errors.phone`) beklenir; `parseClientCreateHttpError` bunları form alanlarına bağlar. Yalnızca genel `title`/`detail` (veya bozuk kodlama) gelirse alan mesajı çıkmaz; üstte güvenli Türkçe fallback kullanılır.
- **Opsiyonel alanlar:** Backend henüz `email` / `address` / `notes` / `status` desteklemiyorsa mapper’da çıkarılmalı veya zorunlu alan setine göre sadeleştirilmelidir.

## Hayvanlar (pets)

- **POST** `/api/v1/pets` — gövde (varsayım, camelCase): zorunlu **`clientId`**, **`name`**, **`species`**; isteğe bağlı `breed`, `gender`, `birthDateUtc` (gün başı UTC ISO), `color`, `weight` (sayı), `status`, `notes`. Backend `ownerId` kullanıyorsa `clientId` → `ownerId` eşlemesi `mapCreatePetToApiBody` içinde yapılmalıdır.
- **Cinsiyet / durum:** Form `male` / `female` ve `active` / `inactive` gönderir; API farklı enum/string bekliyorsa mapper güncellenir.
- **POST yanıtı:** tam `PetDetailDto` ve **`id`**; yalnızca `{ id }` dönüyorsa `PetsService.createPet` içindeki `map` uyarlanır.

## Dashboard

- `loadOperationalDashboard()` **paralel** istekler kullanır; tek blok hata verse bile diğer bölümler `SectionResult` ile dolar.
- Özet endpoint’i (`/dashboard/summary`) ile liste uçlarındaki sayaçlar **aynı anda** farklı olabilir; cache / gecikme backend kaynaklıdır.

## Alan tipleri

- **Randevu / ödeme** listelerinde `status` genelde **string**; dashboard özetindeki küçük randevu öğeleri bazen **sayısal enum** olabilir — ilgili util (`appointmentStatusLabel` vs.) bağlama göre kullanılır.
- Tarihler: formdan `datetime-local` / `date` → ISO UTC dönüşümü `date.utils` içinde; sunucu gün sınırı (UTC vs yerel) farkları için backend sözleşmesine bakın.

## Hayvan listesi / müşteri filtresi

- `GET /pets?ClientId=...` desteklenmezse veya DTO’da `clientId` yoksa `filterPetsByClientId` ile yedek filtre kullanılır (create formları).

## Aşılar (vaccinations)

- **GET** `/api/v1/vaccinations/{id}` — varsayım: gövde **liste öğesi ile aynı çekirdek alanlar** + `createdAtUtc` / `updatedAtUtc` (camelCase). `vaccineName` veya `name` gelebilir; mapper her ikisini de okur.
- **POST** `/api/v1/vaccinations` — gövde: `petId`, `vaccineName`, `appliedAtUtc`, isteğe bağlı `nextDueAtUtc`, `status`, `notes`. **`clientId` istemci varsayılan olarak göndermez** (müşteri `petId` üzerinden çözülür); API açıkça isterse `VaccinationCreateRequestDto` ve `mapCreateVaccinationToApiBody` genişletilir.
- **POST yanıtı**: muayene/randevu ile aynı varsayım — gövdede tam detay DTO ve **`id`** (yalnızca `{ id }` dönüyorsa servis `map` uyarlanır).
- **Alan adı**: backend yalnızca `name` kabul ediyorsa `vaccineName` → `name` eşlemesi mapper’da yapılmalı; şu an DTO `vaccineName` kullanır.

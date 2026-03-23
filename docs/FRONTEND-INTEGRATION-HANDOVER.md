# Frontend-Backend Entegrasyon Devralma Dokümanı

## Genel Durum

Veteriner frontend projesinde son fazlarda yürütülen entegrasyon çalışmalarıyla, modül bazında backend sözleşmesine uyum ve null/eksik veri dayanıklılığı belirgin şekilde artırılmıştır. Çalışmaların ortak odağı:

- API DTO -> VM dönüşümünde canonical alan önceliği
- Create akışlarında response shape farklarına dayanıklı ID extraction
- Geçiş döneminde eski-yeni backend alan adlarını birlikte destekleme
- Hata/başarı akışlarını modüller arası tutarlı hale getirme
- Mevcut Sakai v21 görünümünü koruyarak yalnızca teknik uyarlama yapma

> Not: Bu çalışmalar kapsamında görsel/CSS refactor yapılmamıştır.

## Tamamlanan Modüller

- Auth / Multi-tenant login
- Pets
- Species
- Breeds
- Dashboard
- Appointments
- Examinations
- Vaccinations
- Payments

## Modül Bazlı Yapılan Değişiklikler

### Auth / Multi-tenant login

- **Çözülen problem:** Tek tenant ve çok tenant kullanıcı akışlarında login davranışının backend beklentileriyle uyuşmaması, hata mesajlarının yetersizliği.
- **Yaklaşım:** Tenant gereksinimi `HttpErrorResponse` gövdesinden parse edilerek login akışı iki aşamalı hale getirildi; tenant seçimi gereken durumda kullanıcı yönlendirildi.
- **Geçici compatibility:** Farklı backend error body şekillerinden tenant listesini çıkarmaya yönelik esnek parse devam ediyor.

### Pets

- **Çözülen problem:** `species` metin bağımlılığı, create/list/detail alanlarında backend contract sapmaları ve kırılgan create ID parse.
- **Yaklaşım:** `speciesId` + `speciesName` temelli modele geçildi, mapper/service katmanında canonical dönüşüm ve query uyumu güçlendirildi.
- **Geçici compatibility:** Geçiş döneminde `species`/`speciesId`, `breed`/`breedId` birlikte ele alındı; bazı isteklerde legacy alanlar da taşındı.

### Species

- **Çözülen problem:** Tür referans verisinin merkezi yönetim eksikliği.
- **Yaklaşım:** Ayrı feature altında list/create/update akışı, DTO-VM mapper, service ve validation parse standardı eklendi.
- **Geçici compatibility:** API response sarmalayıcıları ve alan isim farklılıkları için mapper düzeyinde tolerans korunuyor.

### Breeds

- **Çözülen problem:** Irk verisinin species’e bağlı yönetim ve seçim altyapısının eksikliği.
- **Yaklaşım:** Ayrı feature altında CRUD akışı, species bağımlı dropdown yükleme, active-only filtre ve hata parse standardı eklendi.
- **Geçici compatibility:** `speciesId` filtre/bağlantısında backend varyasyonlarına karşı mapper/service düzeyinde esneklik korundu.

### Dashboard

- **Çözülen problem:** `/dashboard/summary` sözleşmesindeki null/opsiyonel alanların UI’da kırılma riski oluşturması.
- **Yaklaşım:** Summary modeli nullable/opsiyonel hale getirildi; normalize mapper ile sayaç/listeler için güvenli defaultlar verildi.
- **Geçici compatibility:** `species/speciesName`, `breed/breedName` gibi canonical + fallback alanlar birlikte destekleniyor.

### Appointments

- **Çözülen problem:** Type/status/lifecycle alan adlarında eski-yeni sözleşme uyumsuzlukları ve create response kırılganlığı.
- **Yaklaşım:** Mapper’da canonical appointment type/status/lifecycle seçimi, query ve create payload tarafında uyum alanları, create ID extraction dayanıklılığı.
- **Geçici compatibility:** `type` + `appointmentType`, `status` + `lifecycleStatus` paralel gönderim/okuma stratejisi sürüyor.

### Examinations

- **Çözülen problem:** Client/pet/status/tarih alanlarında backend alias farkları ve create response ID belirsizliği.
- **Yaklaşım:** DTO genişletmesi + canonical mapper (owner/client, animal/pet, status/lifecycle vb.), query uyumu ve create response ID extraction güçlendirmesi.
- **Geçici compatibility:** `scheduledAtUtc`, `complaintText`, `note`, `finding` gibi alanlar geçiş uyumu için halen taşınıyor.

### Vaccinations

- **Çözülen problem:** Vaccine/status/date/client-pet alanlarında farklı backend adları nedeniyle veri kaybı/kırılma riski.
- **Yaklaşım:** DTO-VM canonical öncelik mantığı, due/overdue destekli status normalizasyonu, query alias parametreleri ve create ID extraction dayanıklılığı.
- **Geçici compatibility:** `vaccineName/name`, `appliedAtUtc/applicationDateUtc`, `nextDueAtUtc/nextDoseAtUtc` vb. birlikte destekleniyor.

### Payments

- **Çözülen problem:** Amount/status/method/date/client-pet alanlarının farklı isimlerle dönmesi ve create response ID kırılganlığı.
- **Yaklaşım:** Canonical mapper (amount/currency/status/method/date), query alias parametreleri, create payload dual-field uyumu ve robust ID extraction.
- **Geçici compatibility:** `amount/totalAmount/paymentAmount`, `method/paymentMethod`, `status/paymentStatus/lifecycleStatus` gibi alanlar birlikte taşınıyor.

## Uygulanan Ortak Entegrasyon Stratejisi

1. **Mapper-merkezli normalizasyon:** Component tarafında ham API parse edilmeden, service/mapper katmanında canonical alan seçimi yapılır.
2. **Null-safe VM:** UI sadece VM üzerinden beslenir; boş/eksik alanlar için güvenli fallback (`—`, `null`, default sayılar) uygulanır.
3. **Create response resilience:** POST yanıtlarında farklı shape’lerde ID extraction (direct/wrapper/alias) standartlaştırılır.
4. **Geçiş dönemi uyumluluğu:** Backend geçiş sürecinde eski-yeni alan adları birlikte okunur/gönderilir.
5. **Sınırlı kapsam prensibi:** Route/layout/guard ve görsel yapı korunur; yalnızca sözleşme ve davranış güvenliği iyileştirilir.

## Açık Teknik Borçlar

- Modüllerde alias/compatibility alanları arttığı için mapper karmaşıklığı yükseldi; backend contract netleşince sadeleştirme gerekir.
- Bazı modüllerde query katmanında desteklenen yeni filtre alanları (örn. `appointmentId`, `clientId`) UI kontrolüne henüz tam yansıtılmamış olabilir.
- Create akışlarında ID extraction güçlü olsa da backend hiç ID dönmeyen uçlarda kullanıcıya “listeyi kontrol edin” fallback’i kalmaktadır.
- Validation parse util’lerinde benzer yardımcı fonksiyonların tekrarları mevcut; ortaklaştırma teknik borcu vardır.

## Backend’e Bağlı Kalan Noktalar

- Create endpoint response shape’lerinin (özellikle ID alanı ve wrapper yapısı) kesinleşmesi.
- Status/method/type/lifecycle alanlarında canonical tek isim setinin backend tarafından sabitlenmesi.
- Date alanlarında (`*AtUtc`, `*DateUtc`, `*OnUtc`) tek standart belirlenmesi.
- Legacy alanların kaldırılma takviminin netleşmesi (özellikle Pets, Vaccinations, Payments, Examinations).
- ProblemDetails/validation error alan anahtarlarının modüller arası tutarlı hale getirilmesi.

## Sonraki Yol Haritası

1. **Contract sabitleme fazı:** Backend ekipleriyle modül bazlı nihai alan isimleri ve response shape’leri kesinleştirilsin.
2. **Compat cleanup fazı:** Netleşen alanlar dışındaki alias gönderim/okuma kodları kaldırılıp mapper’lar sadeleştirilsin.
3. **Validation birleşimi:** Dağınık parse util’leri ortak bir paylaşılan utility setine taşınsın.
4. **Gözlemlenebilirlik:** Create/list/detail akışlarında contract sapmalarını izlemek için merkezi log/telemetry noktaları eklensin.
5. **Regresyon güvenliği:** Modül bazlı contract test checklist’i (ID extraction, null fallback, status mapping, query params) CI sürecine eklenip kalıcı hale getirilsin.

---

Bu doküman, mevcut teknik durumun ekip içi devri ve sonraki faz planlaması için referans olarak hazırlanmıştır.

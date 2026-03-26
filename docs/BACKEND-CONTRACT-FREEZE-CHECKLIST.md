# Backend Contract Freeze Checklist

Bu doküman, frontend tarafında halen kullanılan alan uyumluluklarını (canonical + legacy) netleştirip cleanup fazı için karar zemini oluşturmak amacıyla hazırlanmıştır.

## Pets

### Create Request
- **Canonical:** `clientId`, `name`, `speciesId`, `breedId`, `birthDateUtc`, `gender`, `weight`, `status`, `notes`
- **Legacy / Geçici:** `species` (text), `breed` (text)
- **Karar / Not:** Backend freeze sonrası `species` ve metin `breed` kaldırılmalı; sadece ID bazlı alanlar kalmalı.

### Update Request
- **Canonical:** Create ile aynı alan seti (ID bazlı tür/ırk)
- **Legacy / Geçici:** `species`, `breed` text fallback
- **Karar / Not:** Update endpoint’inde de ID bazlı sözleşme zorunlu hale getirilmeli.

### List / Detail Response
- **Canonical:** `speciesName`, `speciesId`, `breedName`, `breedId`, temel pet/client alanları
- **Legacy / Geçici:** `species`, `breed`
- **Karar / Not:** UI’da `speciesName`/`breedName` kullanılmaya devam; legacy alanlar backend sabitleme sonrası kaldırılmalı.

### Query Params
- **Canonical:** `SpeciesId`, `ClientId`, `Search`, tarih/sayfalama/sıralama
- **Legacy / Geçici:** `Species` (text filtre)
- **Karar / Not:** `Species` desteği kapanış planına alınmalı.

### Validation Keys
- **Canonical:** `clientId`, `name`, `speciesId`, `breedId`, `birthDateUtc`, `weight`, `gender`, `status`
- **Legacy / Geçici:** `species`, `breed`, `ownerId` benzeri eski anahtarlar
- **Karar / Not:** ProblemDetails `errors` anahtarları canonical forma normalize edilmeli.

### Create Response
- **Canonical:** `id` (veya `data.id`)
- **Legacy / Geçici:** `Id`, `petId`, wrapper varyasyonları (`result`, `value`, `pet`)
- **Karar / Not:** Backend tek response shape standardı vermeli; frontend extractor sadeleştirilmeli.

## Appointments

### Create Request
- **Canonical:** `clientId`, `petId`, `scheduledAtUtc`, `type`, `status`, `notes`
- **Legacy / Geçici:** `appointmentType` (type ile paralel)
- **Karar / Not:** Freeze sonrası tek alan: `type`.

### Update Request
- **Canonical:** Create ile aynı kavramsal alanlar
- **Legacy / Geçici:** `appointmentType` ve lifecycle türevleri
- **Karar / Not:** Status/lifecycle sözleşmesi tek alan setine indirilmeli.

### List / Detail Response
- **Canonical:** `type` (veya name/code standardı), `status`, `lifecycleStatus`, temel ilişki/tarih alanları
- **Legacy / Geçici:** `appointmentType`, `appointmentTypeName`, `appointmentTypeCode`, `appointmentStatus`, `lifecycle`
- **Karar / Not:** Type ve status için tek canonical kaynak backend’de sabitlenmeli.

### Query Params
- **Canonical:** `Status`, tarih/sayfalama/sıralama
- **Legacy / Geçici:** `LifecycleStatus` paralel gönderim
- **Karar / Not:** Backend tek status filtre adı ilan etmeli.

### Validation Keys
- **Canonical:** `clientId`, `petId`, `scheduledAtUtc`, `type`, `status`, `notes`
- **Legacy / Geçici:** `appointmentType`, `lifecycleStatus`
- **Karar / Not:** Validation key standardı canonical isimlere çekilmeli.

### Create Response
- **Canonical:** `id`
- **Legacy / Geçici:** `Id`, `appointmentId`, wrapper varyasyonları
- **Karar / Not:** Tek tip create response formatı istenmeli.

## Examinations

### Create Request
- **Canonical:** `clientId`, `petId`, `examinationDateUtc`, `complaint`, `notes`, `findings`, `diagnosis`
- **Legacy / Geçici:** `scheduledAtUtc`, `complaintText`, `note`, `finding`
- **Karar / Not:** Freeze sonrası canonical alanlar dışında gönderim kapatılmalı.

### Update Request
- **Canonical:** Create ile aynı içerik + durum alanları (kullanılıyorsa)
- **Legacy / Geçici:** complaint/note/finding alias’ları
- **Karar / Not:** Alias’lar temizlenip tek metin alan seti kalmalı.

### List / Detail Response
- **Canonical:** `clientId/clientName`, `petId/petName`, `status`, `lifecycleStatus`, `examinationDateUtc`, metin alanları
- **Legacy / Geçici:** `ownerId/ownerName`, `animalId/animalName`, `examinationStatus`, `lifecycle`, `complaintText`, `note`, `finding`
- **Karar / Not:** İlişki alanları client/pet adlarında standardize edilmeli.

### Query Params
- **Canonical:** `Status`, `FromDate`, `ToDate`, sayfalama/sıralama
- **Legacy / Geçici:** `LifecycleStatus`
- **Karar / Not:** Status filtresi tek parametreye indirilmeli.

### Validation Keys
- **Canonical:** `clientId`, `petId`, `examinationDateUtc`, `complaint`, `notes`, `findings`, `diagnosis`
- **Legacy / Geçici:** `ownerId`, `animalId`, `complaintText`, `note`, `finding`
- **Karar / Not:** Validation errors canonical key setine oturtulmalı.

### Create Response
- **Canonical:** `id`
- **Legacy / Geçici:** `Id`, `examinationId`, wrapper varyasyonları
- **Karar / Not:** Tek response schema şartı netleştirilmeli.

## Vaccinations

### Create Request
- **Canonical:** `petId`, `clientId` (gerekliyse), `vaccineName`, `appliedAtUtc`, `nextDueAtUtc`, `status`, `notes`
- **Legacy / Geçici:** `ownerId`, `name`, `applicationDateUtc`, `appliedOnUtc`, `nextDoseAtUtc`, `dueAtUtc`, `vaccinationStatus`, `note`
- **Karar / Not:** Freeze ile birlikte `vaccineName/appliedAtUtc/nextDueAtUtc/status/notes` standardı korunmalı.

### Update Request
- **Canonical:** Create ile aynı kavramsal alanlar
- **Legacy / Geçici:** yukarıdaki alias seti
- **Karar / Not:** Update endpoint’te alias kabulü kapatılmalı.

### List / Detail Response
- **Canonical:** `vaccineName`, `appliedAtUtc`, `nextDueAtUtc`, `status`, `pet*`, `client*`
- **Legacy / Geçici:** `name`, `vaccine`, `vaccineTypeName`, `applicationDateUtc`, `appliedOnUtc`, `nextDoseAtUtc`, `dueAtUtc`, `vaccinationStatus`, `lifecycle*`, `dueState`, `isDueSoon`, `isOverdue`, `owner*`, `animal*`, `note/description`
- **Karar / Not:** Due/overdue bilgisinin tek bir status sözleşmesiyle verilmesi önerilir.

### Query Params
- **Canonical:** `PetId`, `Search`, `Status`, `FromDate`, `ToDate`
- **Legacy / Geçici:** `ClientId`+`OwnerId`, `VaccinationStatus`, `LifecycleStatus`
- **Karar / Not:** Filter parametreleri tek isim setine çekilmeli.

### Validation Keys
- **Canonical:** `petId`, `clientId`, `vaccineName`, `appliedAtUtc`, `nextDueAtUtc`, `status`, `notes`
- **Legacy / Geçici:** alias key’ler (`name`, `applicationDateUtc`, `vaccinationStatus` vb.)
- **Karar / Not:** Validation key standardı netleşmeli.

### Create Response
- **Canonical:** `id`
- **Legacy / Geçici:** `Id`, `vaccinationId`, wrapper varyasyonları
- **Karar / Not:** Tek ID dönüş formatı karara bağlanmalı.

## Payments

### Create Request
- **Canonical:** `clientId`, `petId`, `amount`, `currency`, `method`, `status`, `dueDateUtc`, `paidAtUtc`, `note`
- **Legacy / Geçici:** `ownerId`, `animalId`, `appointmentId`, `totalAmount`, `paymentAmount`, `currencyCode`, `paymentMethod`, `paymentStatus`, `lifecycleStatus`, `dueAtUtc`, `paymentDateUtc`, `notes`
- **Karar / Not:** Freeze sonrası canonical sözleşme dışındaki alanlar kademeli kaldırılmalı.

### Update Request
- **Canonical:** Create ile aynı ödeme alanları
- **Legacy / Geçici:** create’deki alias seti
- **Karar / Not:** Update endpoint’te de canonical dışı alanlar deprecate edilmeli.

### List / Detail Response
- **Canonical:** `client*`, `pet*`, `amount`, `currency`, `status`, `method`, `dueDateUtc`, `paidAtUtc`, `createdAtUtc`, `updatedAtUtc`, `note`
- **Legacy / Geçici:** `owner*`, `animal*`, `appointmentId`, `totalAmount`, `paymentAmount`, `currencyCode`, `paymentStatus`, `lifecycle*`, `paymentMethod`, `methodType`, `dueAtUtc`, `paymentDateUtc`, `paidOnUtc`, `createdOnUtc`, `updatedOnUtc`, `notes`, `description`
- **Karar / Not:** Amount/currency/status/method için tek alan seti backend’de sabitlenmeli.

### Query Params
- **Canonical:** `ClientId`, `PetId`, `Search`, `Status`, `Method`, `FromDate`, `ToDate`
- **Legacy / Geçici:** `OwnerId`, `AnimalId`, `PaymentStatus`, `LifecycleStatus`, `PaymentMethod`, `AppointmentId`
- **Karar / Not:** Query param isimleri sadeleştirilmeli ve tekleştirilmeli.

### Validation Keys
- **Canonical:** `clientId`, `petId`, `amount`, `currency`, `method`, `status`, `dueDateUtc`, `paidAtUtc`, `note`
- **Legacy / Geçici:** `ownerId`, `animalId`, `totalAmount`, `paymentAmount`, `paymentStatus`, `paymentMethod`, `notes`
- **Karar / Not:** Özellikle amount/status/method key’lerinde tek standarda geçilmeli.

### Create Response
- **Canonical:** `id`
- **Legacy / Geçici:** `Id`, `paymentId`, wrapper varyasyonları (`data/result/value/payment`)
- **Karar / Not:** Tek create response şeması kararlaştırılmalı.

## Dashboard

### Create Request
- **Canonical:** N/A (dashboard create akışı yok)
- **Legacy / Geçici:** N/A
- **Karar / Not:** Dashboard yalnızca okuma amaçlı.

### Update Request
- **Canonical:** N/A
- **Legacy / Geçici:** N/A
- **Karar / Not:** N/A

### List / Detail Response
- **Canonical:** `/dashboard/summary` alanları + normalize edilmiş sayaç/listeler
- **Legacy / Geçici:** `recentPets` içinde `species/speciesName`, `breed/breedName` birlikte okunuyor
- **Karar / Not:** Summary response alanları backend’de nullable/opsiyonel kurallarıyla netleştirilmeli.

### Query Params
- **Canonical:** N/A
- **Legacy / Geçici:** N/A
- **Karar / Not:** Operational dashboard alt servis çağrılarının query standardı ilgili modüllerde yönetiliyor.

### Validation Keys
- **Canonical:** N/A
- **Legacy / Geçici:** N/A
- **Karar / Not:** Dashboard validation akışı yok.

### Create Response
- **Canonical:** N/A
- **Legacy / Geçici:** N/A
- **Karar / Not:** N/A

## Auth

### Create Request
- **Canonical:** `username/email`, `password`, çok tenant durumunda `tenantId`
- **Legacy / Geçici:** Tenant seçim gereksinimini farklı error body shape’lerinden parse eden esnek yaklaşım
- **Karar / Not:** Login isteğinde tenant davranışı backend tarafından tek kurala bağlanmalı.

### Update Request
- **Canonical:** N/A (auth update kapsamı bu fazda yok)
- **Legacy / Geçici:** N/A
- **Karar / Not:** N/A

### List / Detail Response
- **Canonical:** Login/refresh token response standart alanları
- **Legacy / Geçici:** Tenant zorunluluğu bilgisi ve tenant listesi farklı error gövdelerinden çıkarılıyor
- **Karar / Not:** Tenant-required hata sözleşmesi tek şema olarak dokümante edilmeli.

### Query Params
- **Canonical:** N/A
- **Legacy / Geçici:** N/A
- **Karar / Not:** Refresh çağrısında tenant gönderimi kaldırılmış durumda korunmalı.

### Validation Keys
- **Canonical:** Kimlik bilgisi + tenant seçimi (gerekiyorsa)
- **Legacy / Geçici:** Backend error body’de değişken alan adları
- **Karar / Not:** Validation key’ler auth endpoint’lerinde sabitlenmeli.

### Create Response
- **Canonical:** Token + kimlik context alanları
- **Legacy / Geçici:** Çok tenant için ek seçim adımı tetikleyen error response varyasyonları
- **Karar / Not:** Tenant selection akışı için resmi backend response contract freeze edilmeli.

---

## Genel Freeze Notları

- Frontend tarafında compatibility desteği aktif olduğu için mapper/service katmanları bilinçli olarak toleranslıdır.
- Contract freeze sonrası hedef: alias alanları kaldırmak, extractor/normalizer kodlarını sadeleştirmek, validation key setlerini tekleştirmek.
- Bu doküman yalnızca entegrasyon sözleşmesi ve cleanup planı içindir; görsel/CSS refactor kapsamı dışındadır.

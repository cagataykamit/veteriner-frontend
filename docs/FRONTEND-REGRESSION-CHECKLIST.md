# Frontend Regresyon Checklist (Smoke Test)

Bu doküman, son entegrasyon fazlarında yapılan contract/UX iyileştirmelerinin **regresyona girmediğini** hızlıca doğrulamak için hazırlanmıştır.

> Kapsam: Sakai v21 görünümü korunur; burada yalnızca akış/doğruluk kontrolleri vardır.

## Genel smoke test (tüm modüller)

- **Build**
  - `npm run build` başarılı
- **Login / session**
  - Login başarılı → `/panel/dashboard`
  - Token süresi dolunca 401 → refresh → istek tekrar edilir (kullanıcı atılmaz)
  - Refresh başarısız → session temizlenir → login’e yönlenir
- **Liste sayfaları ilk yükleme**
  - Clients/Pets/Appointments/Examinations/Vaccinations/Payments list sayfaları açılınca **1 adet** istek gider
  - PrimeNG lazy pagination çalışır, sayfa değişince tek istek gider
  - Aynı filtre + page/pageSize kombinasyonunda duplicate fetch oluşmaz
- **Hata gösterimi (genel)**
  - `ProblemDetails.detail/title` varsa kullanıcıya okunur mesaj gelir
  - Sunucu kapalı (status 0) → “Sunucuya ulaşılamıyor…” benzeri mesaj

## Auth / Multi-tenant login

- **Tek tenant kullanıcı**
  - Tenant seçimi görünmeden login tamamlanır
- **Çok tenant kullanıcı**
  - İlk login denemesi tenant seçimi gerektirir → tenant dropdown görünür
  - Tenant seçmeden “Devam et” engellenir
  - Tenant seçilince login tamamlanır

## Dashboard

- **Summary**
  - Sayaçlar null/eksik gelse bile kartlar kırılmaz (0 veya güvenli fallback)
  - Recent listeler boş/null ise ekran bozulmaz
- **Pet gösterimi**
  - Son hayvanlar listesinde tür/ırk metni `speciesName/breedName` öncelikli, yoksa fallback çalışır

## Clients

### Liste
- Sayfa açılışında tek istek ile tablo dolar
- Search / temizle / sayfalama davranışı bozulmaz

### Create
- **Başarılı create**
  - Kaydet → detail’e yönlenir
  - Detail sayfasında “Müşteri kaydedildi.” banner’ı görünür (saved query param)
- **Validation hatası**
  - Telefon alanına harf içeren değer gir → submit → formda kalır
  - Hata mesajı **alan altında** görünür (genel bozuk mesaj baskın olmaz)
- **Duplicate / conflict**
  - Backend 409 dönerse kullanıcıya anlaşılır mesaj gösterilir, formda kalır

### Detail
- “saved=1” sonrası banner görünür, sonra URL temizlenir

## Pets

### Liste
- İlk açılışta tek istek
- Species filtresi dropdown çalışır (speciesId ile)
- Species temizlenince liste yenilenir

### Create
- **Zorunlu alanlar**
  - Client seçmeden submit olmaz
  - Species seçmeden submit olmaz
- **Breed dropdown**
  - Species seçilmeden breed disabled
  - Species değişince breed temizlenir ve yeni options yüklenir
- **Başarılı create**
  - Detail’e yönlenir, “Hayvan kaydedildi.” banner

### Edit
- Sayfa açılınca kayıt yüklenir, speciesId seçili gelir
- Breed options species’e göre yüklenir, mevcut breedId seçili gelir (varsa)
- Kaydet → detail’e döner, banner görünür

### Detail
- Species alanında `speciesName` gösterilir (fallback ile)

## Species (Reference)

- Liste sayfası açılır, kolonlar: name/code/isActive/displayOrder
- Yeni tür ekle → listeye dönünce kayıt görünür
- Düzenle → alanlar dolu gelir → kaydet
- Validation hatalarında alan bazlı mesajlar görünür

## Breeds (Reference)

- Liste sayfası açılır, kolonlar: name/code/speciesName/isActive/displayOrder
- Yeni ırk ekle:
  - Species seçimi zorunlu
  - activeOnly seçenekli listelerde (pet form) görünürlük kontrolü yapılabilir
- Düzenle → species dropdown seçili gelir → kaydet

## Appointments

### Liste
- İlk açılışta tek istek
- Tarih filtreleri + status filtreleri duplicate fetch üretmez

### Create
- Client seçilince pet listesi yüklenir
- scheduledAtLocal → scheduledAtUtc dönüşümü doğru (geçersiz datetime-local uyarı verir)
- **Clinic resolve davranışı (backend)**
  - Tek aktif klinik: create başarılı olmalı (clinicId göndermeden)
  - Hiç aktif klinik: `Clinics.NotFound` → kullanıcıya anlamlı mesaj gösterilir, formda kalır
  - Birden fazla aktif klinik: `Clinics.ClinicSelectionRequired` → kullanıcıya anlamlı mesaj gösterilir, formda kalır
  - Not: Klinik seçim UI’ı backend clinic listing contract netleşene kadar **yok**

### Edit
- Kayıt yüklenir → güncelle → detail’e döner (saved=1)
- `Clinics.NotFound` / `Clinics.ClinicSelectionRequired` durumlarında anlamlı mesaj gösterilir

## Examinations

### Liste
- İlk açılışta tek istek, filtrelerle duplicate fetch yok

### Create/Edit
- Client → pet bağımlı seçim çalışır
- Tarih dönüşümleri (form <-> UTC ISO) doğru
- Kaydet → detail’e dönüş + banner

## Vaccinations

### Liste
- İlk açılışta tek istek, filtrelerle duplicate fetch yok

### Create/Edit
- Client → pet bağımlı seçim çalışır
- appliedAt / nextDue alan dönüşümleri doğru
- Status label/severity normalizasyonu çalışır (numeric/string varyantları)

## Payments

### Liste
- İlk açılışta tek istek, filtrelerle duplicate fetch yok

### Create/Edit
- Amount input normalize edilir (virgül/nokta)
- Tarih dönüşümleri doğru (due / paidAt)
- Method/status label normalizasyonu çalışır

---

## Açık bağımlılıklar / bekleyen işler

- **Klinik seçim UI’ı**: Backend clinic listing endpoint/contract netleşmeden implement edilmeyecek.
- **Compat cleanup**: Backend contract freeze sonrası legacy alanların (species/breed text, lifecycle alias’ları vb.) temizlenmesi ayrı faz.


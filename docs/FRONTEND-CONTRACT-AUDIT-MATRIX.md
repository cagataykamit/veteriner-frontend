# Frontend Contract Audit Matrix

## 1) Amac

Bu dokuman, frontend modullerinin backend contract ile senkron calisma durumunu gorunur hale getirmek icin hazirlanmistir.

Dokumanin hedefi:
- Contract drift kaynaklarini moduller bazinda netlestirmek
- Risk ve oncelik matrisini ekip icin ortak referansa cevirmek
- Refactor sirasini teknik etkisine gore siralamak

Frontend-backend contract drift onemlidir cunku:
- Bos liste/detail/edit preload gibi veri gorunurluk sorunlari uretir
- Enum/request body uyumsuzlugu nedeniyle deserialize ve validation hatalari olusturur
- Component icinde daginik payload kurulumunu artirarak bakim maliyetini yuksel tir
- Compat/alias alanlari kalici teknik borca donusturur

---

## 2) Kapsam

Incelenen moduller:
- Auth / Clinic Selection
- Dashboard
- Clinics
- Clients
- Pets
- Appointments
- Examinations
- Vaccinations
- Payments
- Species
- Breeds

Denetim basliklari:
- list
- detail
- create
- edit/update
- api model / form model / vm model ayrimi
- mapper zorunlulugu
- submit payload kurulum yeri
- edit preload
- enum mapping
- error parsing
- tenant/clinic context kullanimi

---

## 3) Modul/Ekran Denetimi

### Auth / Clinic Selection
- **Mevcut durum**
  - Clinic context auth katmaninda merkezi yonetiliyor.
  - Select-clinic akisinda context secimi form disi ilerliyor.
- **Sorun/risk**
  - Endpoint fallback yaklasimi contract drift’i bir sure gizleyebilir.
  - Error parse yaklasimi domain upsert modulleri kadar field/code odakli degil.
- **Degismesi gereken yerler**
  - `src/app/core/auth/auth.service.ts`
  - `src/app/pages/auth/select-clinic.ts`
  - `src/app/core/auth/auth-tenant.utils.ts`
- **Oncelik**
  - P1
- **Backend contract etkisi**
  - Orta-Yuksek

### Dashboard
- **Mevcut durum**
  - Summary + operasyon listeleri service katmaninda orkestre ediliyor.
  - Section bazli hata izolasyonu var.
- **Sorun/risk**
  - Ayni kavramin farkli kaynaklardan beslenmesi tutarsizlik uretebilir.
  - Yerel gun filtresi ve UTC semantigi dikkat gerektirir.
- **Degismesi gereken yerler**
  - `src/app/features/dashboard/services/dashboard.service.ts`
  - `src/app/features/dashboard/data/dashboard-operational.mapper.ts`
  - `src/app/features/dashboard/pages/dashboard-page.component.ts`
- **Oncelik**
  - P1
- **Backend contract etkisi**
  - Orta

### Clinics
- **Mevcut durum**
  - Ayrik Clinics CRUD modulu yerine auth/selection odakli yapi var.
- **Sorun/risk**
  - Klinik context sahipligi moduller arasi daginik algilanabilir.
- **Degismesi gereken yerler**
  - `src/app/core/auth/auth.service.ts`
  - `src/app/pages/auth/select-clinic.ts`
- **Oncelik**
  - P2
- **Backend contract etkisi**
  - Dusuk-Orta

### Clients
- **Mevcut durum**
  - List/detail/create hattinda mapper ayrimi ve genel uyum iyi.
- **Sorun/risk**
  - Placeholder odakli gorunum bazen contract null drift’ini gizleyebilir.
- **Degismesi gereken yerler**
  - `src/app/features/clients/data/client.mapper.ts`
  - `src/app/features/clients/pages/client-new-page/client-new-page.component.ts`
- **Oncelik**
  - P2
- **Backend contract etkisi**
  - Dusuk-Orta

### Pets
- **Mevcut durum**
  - Model/mapper/service ayrimi guclu, edit preload olgun.
- **Sorun/risk**
  - Component tarafinda request objesi kuruluyor.
  - Legacy dual alan davranisi (breedId + breed text) suruyor.
- **Degismesi gereken yerler**
  - `src/app/features/pets/data/pet.mapper.ts`
  - `src/app/features/pets/pages/pet-new-page/pet-new-page.component.ts`
  - `src/app/features/pets/pages/pet-edit-page/pet-edit-page.component.ts`
- **Oncelik**
  - P1
- **Backend contract etkisi**
  - Orta

### Appointments
- **Mevcut durum**
  - Read/list/detail tarafinda mapper kullanimi guclu.
- **Sorun/risk**
  - Write payload’ta dual semantic alanlar (type/appointmentType, status/lifecycleStatus).
  - Create/edit payload componentte kuruluyor.
- **Degismesi gereken yerler**
  - `src/app/features/appointments/data/appointment.mapper.ts`
  - `src/app/features/appointments/pages/appointment-new-page/appointment-new-page.component.ts`
  - `src/app/features/appointments/pages/appointment-edit-page/appointment-edit-page.component.ts`
- **Oncelik**
  - P1
- **Backend contract etkisi**
  - Orta-Yuksek

### Examinations
- **Mevcut durum**
  - Canonical read/detail/edit preload hizalamasi uygulanmis.
- **Sorun/risk**
  - Alias yogunlugu hala yuksek.
  - Create/edit payload componentte kuruluyor.
- **Degismesi gereken yerler**
  - `src/app/features/examinations/data/examination.mapper.ts`
  - `src/app/features/examinations/pages/examination-new-page/examination-new-page.component.ts`
  - `src/app/features/examinations/pages/examination-edit-page/examination-edit-page.component.ts`
- **Oncelik**
  - P1
- **Backend contract etkisi**
  - Yuksek

### Vaccinations
- **Mevcut durum**
  - Mapper tabanli donusum var, contract odakli duzeltmeler yapildi.
- **Sorun/risk**
  - Create/edit status-date semantiginde moduller arasi tekillik riski.
  - Enum fallback davranislari deserialize riski uretebilir.
- **Degismesi gereken yerler**
  - `src/app/features/vaccinations/data/vaccination.mapper.ts`
  - `src/app/features/vaccinations/pages/vaccination-new-page/vaccination-new-page.component.ts`
  - `src/app/features/vaccinations/pages/vaccination-edit-page/vaccination-edit-page.component.ts`
  - `src/app/features/vaccinations/models/vaccination-create.model.ts`
- **Oncelik**
  - P0
- **Backend contract etkisi**
  - Yuksek

### Payments
- **Mevcut durum**
  - Create mapping sadeleme ve method enum donusumu mevcut.
- **Sorun/risk**
  - New/edit payload-contract birebirligi modul genelinde korunmali.
  - Component payload kurulumu suruyor.
  - Enum fallback stratejisi dikkat gerektiriyor.
- **Degismesi gereken yerler**
  - `src/app/features/payments/data/payment.mapper.ts`
  - `src/app/features/payments/pages/payment-new-page/payment-new-page.component.ts`
  - `src/app/features/payments/pages/payment-edit-page/payment-edit-page.component.ts`
  - `src/app/features/payments/models/payment-create.model.ts`
- **Oncelik**
  - P0
- **Backend contract etkisi**
  - Yuksek

### Species
- **Mevcut durum**
  - Ayrim net, dusuk karmasa, iyi mapper disiplini.
- **Sorun/risk**
  - Wrapper/casing toleransi backend drift’ini gec fark ettirebilir.
- **Degismesi gereken yerler**
  - `src/app/features/species/data/species.mapper.ts`
- **Oncelik**
  - P3
- **Backend contract etkisi**
  - Dusuk

### Breeds
- **Mevcut durum**
  - Ayrim net, species ile uyumlu temiz yapi.
- **Sorun/risk**
  - Wrapper/casing toleransi benzer sekilde izlenmeli.
- **Degismesi gereken yerler**
  - `src/app/features/breeds/data/breed.mapper.ts`
- **Oncelik**
  - P3
- **Backend contract etkisi**
  - Dusuk

---

## 4) Modul Matrisi

| Modul | List | Detail | Create | Edit | Mapper durumu | Enum riski | Context riski | Error parsing | Oncelik |
|---|---|---|---|---|---|---|---|---|---|
| Auth / Clinic Selection | OK | N/A | Partial | N/A | Partial | Partial | Risky | Partial | P1 |
| Dashboard | Partial | N/A | N/A | N/A | Partial | N/A | Partial | Partial | P1 |
| Clinics | N/A | N/A | N/A | N/A | Partial | N/A | Partial | Partial | P2 |
| Clients | OK | OK | OK | N/A | OK | Partial | OK | Partial | P2 |
| Pets | OK | OK | Partial | Partial | Partial | Partial | Partial | Partial | P1 |
| Appointments | OK | OK | Partial | Partial | Partial | Partial | Risky | Partial | P1 |
| Examinations | OK | OK | Partial | Partial | Partial | Partial | Risky | Partial | P1 |
| Vaccinations | OK | OK | Risky | Risky | Partial | Risky | Risky | Partial | P0 |
| Payments | OK | OK | Risky | Risky | Partial | Risky | Partial | Partial | P0 |
| Species | OK | N/A | OK | OK | OK | N/A | N/A | OK | P3 |
| Breeds | OK | N/A | OK | OK | OK | N/A | N/A | OK | P3 |

---

## 5) Kritik Bulgular

- **Bos detail/list riski**
  - Alias fallback’e bagli gorunumler canonical alan kacirdiginda bos gorunecek risk tasir.

- **Yanlis payload riski**
  - Vaccinations ve Payments create/edit akislari strict contract tarafinda en kritik bolgelerdir.

- **Component bazli payload kurulum hotspot’lari**
  - Appointments, Examinations, Vaccinations, Payments, Pets new/edit sayfalari.

- **Legacy alias yogun moduller**
  - Examinations, Payments, Vaccinations, Appointments, Pets.

- **Enum deserialize riski**
  - Payments method, Vaccinations status donusum yollarinda strictlik gereksinimi yuksek.

- **Dashboard source-of-truth karisikligi**
  - Counter/list ayni kavramda farkli veri kaynaklarindan beslenebilir.

- **Clinic context standard sapmasi riski**
  - Genel karar dogru uygulanmis olsa da moduller arasi disiplin teklesmeye devam etmelidir.

---

## 6) Refactor Onceligi

### P0 (Hemen)
- Vaccinations create/edit status-date contract tekillestirme
- Payments create/edit payload-contract strictligi ve enum donusum guvenligi

### P1 (Kisa vade)
- Appointments/Examinations/Pets payload kurulumunu componentten mapper akina tasima
- Context cikarimini service katmaninda ortaklastirma

### P2 (Orta vade)
- Alias cleanup (compat -> deprecate -> remove)
- Model sadeleme ve alan sozlugu olusturma

### P3 (Dusuk oncelik)
- Template/metin tutarliligi
- Dusuk riskli okunabilirlik duzenlemeleri

---

## 7) En Kritik 10 Frontend Senkron Problemi

1. Vaccination create/edit status-date semantiginin tam teklesmemesi  
2. Payment create/edit payload-contract birebirliginde modul genelinde dikkat gereksinimi  
3. Payment method enum fallback stratejisinin strict contract ihtiyaci  
4. Vaccination status enum fallback stratejisinin strict contract ihtiyaci  
5. Appointment write payload’ta dual semantic alanlarin surmesi  
6. Examination mapper alias yogunlugu nedeniyle contract daralmasina hassasiyet  
7. Birden cok moduld e component icinde payload kurulmasi  
8. Dashboard’ta ayni kavramin farkli kaynaklardan gelebilmesi  
9. New sayfalarinda error parsing kalitesinin edit kadar tutarli olmamasi  
10. Legacy alias alanlar icin kaldirma takviminin modullerde standartlasmamis olmasi

---

## 8) En Guvenli Refactor Sirasi

1. Payments + Vaccinations (P0 contract drift noktalarini kapat)
2. Appointments + Examinations + Pets (payload separation disiplini)
3. Alias cleanup dalgasi (modul bazli, kontrollu)
4. Dusuk riskli template/mesaj tutarliligi duzeltmeleri

---

## 9) Build/Test/Manuel Smoke Notlari

Bu rapor audit-only denetim ciktisidir; runtime dogrulama icermez.

Onerilen dogrulama seti:
- `npm run build`
- Kritik moduller icin create/list/detail/edit manuel smoke
- Network payload kontrolu (contract checklist ile)
- Enum edge-case senaryolari (deserialize/validation)
- Field-level error parse senaryolari (400/409/is-kodu bazli)


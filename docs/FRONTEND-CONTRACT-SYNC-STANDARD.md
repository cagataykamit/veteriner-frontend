# Frontend Contract Sync Standard

## 1) Amac

Bu dokumanin amaci, frontend kod tabaninin backend contract ile tutarli, izlenebilir ve surdurulebilir sekilde gelistirilmesini saglamaktir.

Frontend-backend drift asagidaki tekrar eden problemlere yol acar:
- Yanlis alan adi nedeniyle bos liste, bos detail veya bos edit preload
- Enum/string uyumsuzlugu nedeniyle deserialize/model binding hatasi
- Component icinde daginik payload kurulumundan kaynakli davranis farkliliklari
- Legacy alias alanlarin kontrolsuz buyumesiyle artan teknik borc
- Generic hata mesajlari nedeniyle zor tanilanabilir hata akislari

Bu standard, ozellikle su hata siniflarini azaltmayi hedefler:
- `request body` ile backend command/dto uyumsuzlugu
- `read mapper` uyumsuzlugu nedeniyle ekranda bos veri
- `enum` donusumlerinde kural disi veya sessiz fallback
- `context` alanlarinin (clinicId/tenantId) form inputuna sizmasi

---

## 2) Temel Ilkeler

1. **Backend contract tek dogruluk kaynagidir**
   - Endpoint path, request/response body, enum degerleri, validation kurallari ve error code yapisi backend contract ile birebir uyumlu olmalidir.

2. **API modeli ile UI/Form modeli ayrilir**
   - Backend DTO’lari `*-api.model.ts`
   - Form state ve sayfa state modelleri `*-form.model.ts` / `*-vm.model.ts`

3. **Payload component icinde kurulmaz**
   - Component sadece form verisini toplar ve dogrular.
   - Gercek API body yalnizca mapper katmaninda olusturulur.

4. **Mapper zorunludur**
   - `API -> VM`, `Form -> API`, `API -> EditVM` donusumleri mapper dosyalarinda tutulur.

5. **Canonical backend alan adlari korunur**
   - API modelinde canonical isimler birebir tutulur (`visitReason`, `examinedAtUtc`, `assessment` gibi).
   - Legacy aliaslar yalnizca mapper fallback katmaninda ele alinir.

6. **Enum donusumleri tek yerde yapilir**
   - UI label ve backend enum degeri ayridir.
   - Donusum tek bir utility/mapper fonksiyonunda yonetilir.

7. **Context alanlari form input olmaz**
   - `clinicId`, `tenantId` kullanicidan GUID/text olarak alinmaz.
   - Auth/state/context katmanindan uretilir.

8. **Generic hata yerine parse edilmis hata**
   - `fieldErrors + summary + (varsa) error code` yaklasimi kullanilir.
   - Sadece son fallback durumda generic mesaj kullanilir.

---

## 3) Kisa Ekip Kurallari

### Dosya isimlendirme ve katmanlar

- `feature/models/<feature>-api.model.ts`
- `feature/models/<feature>-form.model.ts`
- `feature/models/<feature>-vm.model.ts`
- `feature/data/<feature>.mapper.ts`
- `feature/services/<feature>.service.ts`
- `feature/utils/*-validation-parse.utils.ts`

### Service sorumlulugu

- API istemini tek giris noktasindan yonetir.
- Mapper kullanarak DTO/VM donusumunu uygular.
- Component’e ham HTTP detayini degil, anlamli sonuc/hata modeli dondurur.

### Component sorumlulugu

- Form lifecycle, loading state, submit state, UI feedback.
- FormValue olusturma ve temel local validation.
- API body anahtarlarini dogrudan component icinde yazmama.

### Context alanlari

- `clinicId`, `tenantId` domain formlarinda input/field olarak gosterilmez.
- `AuthService` veya uygun context service’ten okunur.
- Context yoksa submit bloklanir ve anlasilir mesaj gosterilir.

### Validation ve error parse standardi

- Field-level parse zorunlu: backend `errors.<field>` dogru alana baglanir.
- Ustte kisa summary mesaji gosterilir.
- Alan duzeltildiginde ilgili API field error temizlenir.

---

## 4) Modul Bazli Mevcut Durum Ozeti

| Modul | Mevcut Durum | Eksik Standard | Risk | Oncelik | Onerilen Sonraki Adim |
|---|---|---|---|---|---|
| Appointments | API/VM/mapper ayrimi var | New/Edit payload component icinde kurulu | Orta | Yuksek | `appointment-form.model.ts` ile FormValue->mapper zorunlu akis |
| Examinations | Canonical read mapping uygulanmis, mapper var | Alias deprecation plani net degil | Orta-Yuksek | Yuksek | Aliaslar icin compat/deprecate/remove takvimi ve mapper notlari |
| Vaccinations | Mapper var, create/edit contract hassas | Enum/status donusum tek merkezde degil | Yuksek | Yuksek | Tek status contract utility + create/edit ortak kullanim |
| Payments | Mapper var, contract sadeleme yapildi | Enum fallback kurallari daha katil olmali | Yuksek | Yuksek | Method/status enum conversion’i strict hale getir |
| Pets | Ayrim ve mapping olgun | Gecis donemi legacy alanlar devam ediyor | Orta | Orta | Contract freeze sonrasi legacy alan cleanup PR’lari |
| Species | Temiz ayrim, dusuk karmasa | Kucuk tutarlilik iyilestirmeleri | Dusuk | Dusuk | Bu modulu referans/sablon olarak kullan |
| Breeds | Temiz ayrim, dusuk karmasa | Kucuk tutarlilik iyilestirmeleri | Dusuk | Dusuk | Species ile ayni template standardini surdur |
| Auth / Clinic Selection | Context yonetimi dogru, clinic forma sizmiyor | Error parse tarafi daha kod/field odakli olabilir | Orta | Orta | Auth error contract utility netlestir |
| Dashboard | Summary + operasyon listeleri ayrik kaynaklarda | Widget source-of-truth dokumani eksik | Dusuk-Orta | Orta | Kart/liste bazli veri kaynagi ve filtre sozlugu olustur |

---

## 5) Oncelikli Refactor Backlog

1. **Payload’in component’ten mapper’a tasinmasi**
   - Appointments, Examinations, Vaccinations, Payments new/edit ekranlari.
   - Hedef: componentte API body anahtari kalmamasi.

2. **Enum mapping merkezilestirme**
   - Vaccination status ve Payment method/status donusumleri.
   - Hedef: UI degeri -> backend canonical/enum tek kaynaktan.

3. **Alias temizligi (kontrollu)**
   - Mapper fallback katmaninda tutulan legacy alanlar icin deprecate plani.
   - Hedef: contract freeze sonrasi aliaslarin kademeli silinmesi.

4. **Dashboard source-of-truth sozlugu**
   - Her kart/liste icin: endpoint, filtre, fallback kurali.
   - Hedef: ayni kavramin farkli kaynaklardan tutarsiz gorunmesini engellemek.

5. **Error parsing standardinin esitlemesi**
   - New/Edit fark etmeksizin field-level parser kullanimina gecis.
   - Hedef: generic hata yerine alan bazli duzeltilebilir geri bildirim.

---

## 6) OpenAPI / Type-Generation Readiness

### Pilot icin uygun moduller
- Species
- Breeds
- Pets (ikinci dalga)

### Once temizlik gerektiren moduller
- Vaccinations (status/alias karmasi)
- Payments (enum donusum hassasiyeti)
- Examinations/Appointments (legacy alias yogunlugu)

### Neden big bang yerine modul modul gecis
- Alias toleransli mevcut kodun bir anda strict tipe gecmesi yaygin derleme kiriklari uretir.
- Kritik operasyonel modullerde (payment/vaccination) regresyon riski yuksektir.
- Modul bazli gecis, etkileri olculebilir ve geri donusu yonetilebilir hale getirir.

---

## 7) Onerilen Calisma Sureci

### Backend contract degisince frontend akis

1. Contract diff cikar:
   - endpoint, request fields, response fields, enum, validation, error code
2. Etki analizi dokumani yaz:
   - etkilenen ekranlar, service/mapper/model dosyalari, smoke test maddeleri
3. Uygulama sirasi:
   - `api.model` -> `mapper` -> `service` -> `component` -> `validation parser`
4. Test:
   - create/list/detail/edit + field-level error parse + enum edge-case

### Zorunlu smoke test maddeleri

- **Create:** canonical payload ve required alanlar
- **List:** canonical read alanlarin dolu gorunmesi
- **Detail:** canonical alan ve fallback gorunurlugu
- **Edit preload:** detail -> form alan eslesmesi
- **Update:** canonical payload + validation parse
- **Context:** clinic/tenant alanlarinin UI input olmamasi

### Mapper degisikligi yonetimi

- Her mapper degisimi icin:
  - canonical alan listesi
  - fallback alias listesi
  - kaldirma hedefi (deprecate notu)

### Compat / deprecate / remove yaklasimi

- **Compat:** backend gecis doneminde mapper fallback aktif
- **Deprecate:** fallback alanlari yorum/ticket ile isaretle
- **Remove:** contract freeze sonrasi fallback alanlari temizle

---

## 8) Kisa Sonuc

Bu dokuman, frontend-backend contract senkronunu ekip standardi haline getirmek icin operasyonel bir referanstir.

Hemen uygulanacak kararlar:
- API body kurulumunu mapper’a toplama
- Enum donusumlerini tek yerde merkezilestirme
- Context alanlarini formdan izole tutma
- Field-level error parse standardini tum kritik formlarda esitleme

Bu standard, yeni feature gelistirme, contract degisimi ve teknik borc temizligi fazlarinda ortak kontrol listesi olarak kullanilmalidir.


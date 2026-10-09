# Muayene çalışma alanı — dilim 1 (frontend brief)

**Tarih:** 2026-10-09
**Ürün kararı kaynağı:** `vetinity-product` deposu, `roadmap/Vetinity_Uctan_Uca_Yol_Haritasi_ve_Urun_Kararlari.md` bölüm 6 ve 23. Ürün kararlarının ana kopyası orada; bu belge yalnızca frontend uygulama kapsamını özetler. Çelişkide ürün belgesi geçerlidir.
**API sözleşmesi:** `docs/EXAMINATIONS_WORKSPACE_API_CONTRACT.md` (backend'deki dosyanın 2026-10-09 tarihli anlık kopyası). **Backend tek doğruluk kaynağıdır;** kopya ile backend çelişirse backend geçerlidir ve brief'i yazan kişiye haber verilir.
**Kod standardı:** `docs/FRONTEND-CONTRACT-SYNC-STANDARD.md` (api/form/vm modelleri ayrı, payload yalnızca mapper'da, context alanları form input'u olmaz, ayrıştırılmış hata).

## Başlamadan önce (kod yazmadan)

1. Mevcut muayene form, servis, mapper, liste ve randevudaki "muayene aç" akışını bul.
2. Aşağıdaki her madde için mevcut durumu kısa raporla: var / kısmen var / yok.
3. `git status` içindeki ilgisiz değişikliğe (`subscription-access.utils.ts`) dokunma ve commit'e ekleme.
4. Raporu onaylatmadan uygulamaya geçme.

## Yapılacaklar

1. **Geniş çalışma alanı.** Muayene tam sayfa/geniş alan olur; klinik not küçük modala sıkıştırılmaz.
2. **Hasta başlığı.** Hasta, sahip, tür/ırk, yaş, iletişim. `GET /examinations/{id}` içinde `petName`, `clientId`, `clientName` var; kalanı `GET /pets/{id}` ve `GET /clients/{id}` ile alınır. Veride olmayan ölçüm tarihi veya uyarı varmış gibi gösterilmez.
3. **Dört bölüm (Türkçe):**
   - Şikâyet ve anamnez: `visitReason` (zorunlu), `anamnesis`
   - Klinik bulgular ve vital değerler: `findings`, `weightKg`, `temperatureC`, `heartRateBpm`, `respiratoryRatePerMin`, `vitalsMeasuredAtUtc`
   - Değerlendirme/tanı: `assessment`
   - Plan/tedavi planı: `plan` (ek olarak `notes`)
4. **Vital değerler opsiyonel,** birimleri açık yazılır. Otomatik uyarı eşiği veya "normal" metin doldurma yok.
5. **Kayıt sürümü.** GET'teki `rowVersion` PUT'ta zorunlu gönderilir. Başarılı POST/PUT yanıtındaki yeni `rowVersion` forma işlenir.
6. **Çakışma ve hata.** `409 Examinations.ConcurrencyConflict` ve diğer hatalarda kullanıcının yazdığı metin korunur; form temizlenmez. Hata `fieldErrors + summary + code` olarak ayrıştırılır.
7. **Randevu bağlantısı.** Düzenlemede `appointmentId` ya gönderilmez/null gönderilir (bağlantı korunur) ya da mevcut değerle aynı gönderilir. Düzenlemede `clinicId` ve `petId` değiştirilemez; bunlar form input'u olmaz, auth/state'ten gelir.
8. **Doğru yetki.** Randevu ekranındaki "muayene aç" düğmesi `Examinations.Create` yetkisine bağlı olmalı; yeniden planlama yetkisine bağlı olmamalı. Mevcut durumu kontrol et.
9. **Tarih filtresi.** Liste için ya `examinedOnLocalDate` (yyyy-MM-dd, İstanbul günü) ya da `dateFromUtc`/`dateToUtc` gönderilir. İkisi birlikte ve çift dönüşüm yok.
10. **Kayıt sonrası** aynı hasta bağlamında kal.
11. **Eski kayıtlar.** Yeni alanlar `null`, `findings` boş string olabilir; ekran bozulmaz.
12. **Rollout.** Önce backend deploy edilir, sonra bu frontend (sözleşme belgesi, "Koordineli yayın" bölümü). Sürümsüz PUT backend'de 400 verir.

## Bu işe eklenmeyecekler

Tam Visit/geliş akışı, timeline, alerji/kritik uyarı modeli, gerçek finalize/addendum, ücret/bakiye, ürün bazlı stok tüketimi, AI, cihaz entegrasyonu, şablon/bundle, genel menü yeniden tasarımı.

## Kabul senaryoları

- Randevudan muayene aç, kaydet, tekrar düzenle: hasta ve randevu ilişkisi değişmez.
- İki kullanıcı aynı kaydı açar; A kaydettikten sonra B kaydedince çakışma görür ve B'nin yazdığı metin kaybolmaz.
- Eski kayıt (yeni alanlar boş) açılır ve düzenlenir.
- Yetkisi olmayan kullanıcı "muayene aç" düğmesini göremez; yetkili kullanıcı görür.
- İstanbul gününe göre tarih filtresi doğru kayıtları getirir (gece yarısına yakın bir kayıtla dene).
- Hata durumunda ağ veya doğrulama hatası formdaki metni silmez.

## Test notu

Yalnızca mapper'ın yazıldığı gibi çalıştığını tekrar eden yüzeysel testlerle kabul verme. Odak: `rowVersion` taşıma, `appointmentId` korunması, tarih parametresi, hata/çakışmada metin koruma.

## Bitirme

Değişiklikleri commit etme; özet ve test sonucunu raporla.

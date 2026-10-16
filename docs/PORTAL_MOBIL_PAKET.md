# Hasta sahibi portalı — mobil mağaza paketi (Capacitor)

Durum: **hazırlık (Dilim 3)**. Kod ve yapılandırma hazır; mağaza hesapları, imzalama, cihaz/emülatör derlemesi ve mağazaya gönderim yapılmadı. Ürün kararları: ADR-031 (K5 teknoloji, AK-4 mağaza: PWA + Capacitor, hesap şirket adına; AK-6 v0'da SMS/push yok; AK-10/12 marka ve ad), ADR-033 (adresler). Ürün kararlarının ana kopyası `vetinity-product` deposundadır; bu belge yalnız uygulama ayrıntısıdır.

> Mağaza kuralları, ücretler ve form alanları sık değişir. Bu belgede "**güncel kaynaktan doğrulanmalı**" yazan her madde, yazıldığı gün resmi kaynaktan doğrulanmadı.

## 1. Hazırlananlar

| Konu | Ne yapıldı | Yer |
|---|---|---|
| Paketler (sabit sürüm) | `@capacitor/core` 8.5.3, `@capacitor/android` 8.5.3, `@capacitor/ios` 8.5.3, `@capacitor/app` 8.1.2, `@capacitor/splash-screen` 8.0.2; geliştirme: `@capacitor/cli` 8.5.3 | `package.json` |
| Yapılandırma | `appId` `com.vetinity.portal` (**öneri, onay bekler**), `appName` "Vetinity" (geçici), `webDir` `dist/portal/browser`, Android `https` şeması, izinli gezinme yalnız portal ve portal API alan adı (ortam dosyasından türetilir) | `capacitor.config.ts` |
| Ortamlar | Portal ortamına `portalBaseUrl` eklendi; `staging` derleme yapılandırması (`portal-staging` + `api-staging`) | `projects/portal/src/environments/`, `angular.json` |
| Platform klasörleri | `android/` ve `ios/` kaynak olarak depoda; derleme çıktıları (`build`, `.gradle`, `local.properties`, `Pods`, `DerivedData`, kopyalanan `public/`, üretilen `capacitor.config.json`) platformların kendi `.gitignore`'unda | `android/`, `ios/` |
| iOS bağımlılık yöneticisi | Capacitor 8 şablonu **Swift Package Manager** kullanır (CocoaPods yok). `npx cap sync ios` Windows'ta çalışır; paketlerin çözümü ve derleme Xcode'da (macOS) | `ios/App/CapApp-SPM/Package.swift` |
| Derin bağlantı | Davet bağlantısı (`https://portal…/invite?token=…`) uygulamada açılır: `appUrlOpen` yalnız portal origin'inden gelen bağlantıyı yönlendirir. Android App Links intent-filter (`/invite`), alan adı `portalHost` Gradle özelliği | `projects/portal/src/app/core/native/`, `android/app/src/main/AndroidManifest.xml`, `android/app/build.gradle` |
| Sunucu doğrulama şablonları | `assetlinks.json` ve `apple-app-site-association` (değerler yer tutucu; sunucuya konmadı) | `projects/portal/mobile/well-known/` |
| Android geri tuşu | Ana sayfa ve girişte uygulamadan çıkar; iç sayfalarda önceki ekran; geçmiş yoksa çıkar | `portal-native.ts` |
| Sistem çubuğu, açılış ekranı | Çekirdek `SystemBars` (Capacitor 8): içerik koyu (portal açık zeminli, koyu tema yok). Açılış ekranı beyaz zemin + logo, ilk yönlendirme bitince kapanır | `capacitor.config.ts`, `portal-native-shell.ts` |
| Güvenli alan | Kenardan kenara görünüm; kabuksuz sayfalar (giriş, davet, onay) ve çevrimdışı bandı `env(safe-area-inset-*)` payı alır; kabuk başlığı ve alt gezinme zaten alıyordu | `projects/portal/src/styles.scss` |
| Service worker | Mobil pakette **kayıtlanmaz** (bkz. §2) | `app.config.ts` |
| Yedekleme | Android `allowBackup="false"`: yenileme jetonu bulut yedeğine/yeni cihaza taşınmaz | `AndroidManifest.xml` |
| Simgeler | Portal `icon-512.png` logosundan ölçeklenmiş yer tutucu set: Android eski/yuvarlak/uyarlanabilir ön plan, açılış görselleri; iOS 1024 AppIcon (alfa kanalsız), 2732 açılış görselleri | `android/app/src/main/res/`, `ios/App/App/Assets.xcassets/` |
| Betikler | `portal:build:mobile` (`ng build portal` + `cap sync`), `portal:cap:open:android`, `portal:cap:open:ios` | `package.json` |

Kurulmayanlar ve gerekçe:
- `@capacitor/status-bar`: Capacitor 8'de durum çubuğu içerik rengi çekirdekteki `SystemBars` ile verilir; Android 15+ kenardan kenara zorunlu olduğundan durum çubuğu **arka plan rengi** verilemez (eklenti belgesi: Android 16'da `backgroundColor`/`overlaysWebView` etkisiz). Zemin, sayfa başlığının rengidir (beyaz).
- `@capacitor/preferences`: kullanılmadı (bkz. §3).
- `@capacitor/assets`: gerekmedi; görseller Windows'ta `System.Drawing` ile üretildi. Kesin marka tasarımında yüksek çözünürlüklü kaynak (en az 1024 px, tercihen vektör) ile yeniden üretilmeli.
- **v1, v0 dışı:** `@capacitor/push-notifications` (ADR-031 K7, AK-6) ve biyometrik kilit. Yerleri `capacitor.config.ts` `plugins` altında not olarak işaretli; Android `build.gradle` zaten `google-services.json` varsa Firebase eklentisini uygular.

## 2. Teknik kararlar

- **Service worker:** `portalServiceWorkerEnabled(devMode, native)` — yalnız tarayıcıdaki üretim derlemesinde açık. Mobil pakette web varlıkları uygulamanın içindedir (çevrimdışı açılır); SW önbelleği mağaza güncellemesinden sonra eski paketi sunabilir; iOS WKWebView özel şemada (`capacitor://`) SW desteklemez. `ngsw-worker.js` pakette durur ama kayıtlanmaz.
- **Origin ve CORS:** uygulama Android'de `https://localhost`, iOS'ta `capacitor://localhost` origin'inden çalışır. **Backend `AllowedOrigins` bu iki origin'i içermeli** (backend işi, ADR-033 hazırlık maddesi 2 ile birlikte). Ayrı origin olduğundan web portalının depolaması uygulamayla paylaşılmaz.
- **İzinli gezinme:** WebView yalnız portal ve portal API alan adına gezinebilir; diğer bağlantılar sistem tarayıcısında açılır. Değerler `capacitor.config.ts` içinde portal ortam dosyasından türetilir (adres koda yazılmaz).
- **CSP:** portal şu an CSP üst bilgisi/meta etiketi kullanmıyor. Eklenirse mobil uygunluk için: `default-src 'self'` (her iki yerel origin'i kapsar), `connect-src` portal API origin'i, `img-src 'self' data:` (klinik logosu kaynağına göre genişler).
- **Derin bağlantı güvenliği:** yalnız `environment.portalBaseUrl` ile **aynı origin** (şema + alan adı + bağlantı noktası) kabul edilir; alt alan adı, `http`, benzer alan adı ve özel şema reddedilir (spec'le sabit). Soğuk açılışta gelen bağlantı da aynı dinleyiciye düşer.
- **Ortam seçimi:** `capacitor.config.ts` ortam değişkeni `VETINITY_PORTAL_ENV=staging` ise staging dosyasını, yoksa üretimi okur. Web paketi aynı ortamla derlenmelidir (bkz. §6).
- **Üretim API adresi:** portal `environment.ts` API adresi hâlâ geliştirme yer tutucusu (`https://localhost:7173`); ADR-033 hazırlık maddesi 3 ("API adresi `api…`") kullanıcı "başla" deyince yapılır. **Bu değişmeden üretim mobil paketi API'ye ulaşamaz**; staging ortamı hazırdır.

## 3. Oturum/jeton saklama (öneri — karar kullanıcıda)

Bugün: erişim jetonu yalnız bellekte; yenileme jetonu (30 gün, dönen) `localStorage`'da (`portal-token.store.ts`). Bu mobilde de çalışır: WebView `localStorage`'ı uygulamanın özel veri alanındadır, `allowBackup=false` ile Android yedeğine girmez.

Sınırlar: iOS düşük depolamada WebView verisini silebilir (oturum düşer, kullanıcı yeniden giriş yapar — veri kaybı değil); `localStorage` cihazda şifreli anahtar deposunda değildir (cihaz kilidi/disk şifrelemesine dayanır).

Seçenekler:
| Seçenek | Saklama | Not |
|---|---|---|
| Mevcut `localStorage` | WebView verisi | Ek paket yok; yeterli kabul edilebilir |
| `@capacitor/preferences` | iOS `UserDefaults`, Android `SharedPreferences` | Kalıcılık daha iyi, **şifreli değil**; güvenlik kazancı yok |
| `@aparajita/capacitor-secure-storage` | iOS Keychain, Android Keystore destekli şifreleme | Topluluk eklentisi; Capacitor 8 uyumu ve bakım durumu **güncel kaynaktan doğrulanmalı** |
| `capacitor-secure-storage-plugin` | Keychain / Keystore | Topluluk eklentisi; aynı doğrulama gerekir |
| Ionic Identity Vault | Keychain / Keystore + biyometrik | Ticari lisans |

Öneri: v0 mağaza paketi mevcut yaklaşımla çıkar. Biyometrik kilit (v1) eklenirken yenileme jetonu Keychain/Keystore destekli depoya taşınır; `PortalTokenStore` tek değişim noktasıdır (okuma senkron → asenkron değişir, oturum başlatma akışı buna göre uyarlanır). Ayrı iş olarak açılmalı.

## 4. Kullanıcının yapacakları

### 4.1 Kararlar
1. **appId onayı:** `com.vetinity.portal` (öneri). Mağazaya ilk yüklemeden sonra değiştirilemez; değişirse `capacitor.config.ts`, `android/app/build.gradle` (`namespace`, `applicationId`), Java paket klasörü ve Xcode Bundle Identifier birlikte güncellenir.
2. **Uygulama adı** (ADR-031 AK-12): şimdilik "Vetinity". Mağaza adı ve alt başlık mağaza öncesi netleşmeli.
3. **Marka görselleri:** yer tutucu simge ve açılış ekranı kesin tasarımla değiştirilmeli (1024 px+ kaynak).

### 4.2 Hesaplar (şirket adına, ADR-031 AK-4)
- **Google Play Console** — kuruluş hesabı. Tek seferlik kayıt ücreti (bilinen değer 25 ABD doları), kimlik doğrulama, kuruluş hesabı için D-U-N-S numarası: **güncel kaynaktan doğrulanmalı**.
- **Apple Developer Program** — kuruluş üyeliği. Yıllık ücret (bilinen değer 99 ABD doları), D-U-N-S numarası ve tüzel kişilik doğrulaması: **güncel kaynaktan doğrulanmalı**. Hesap açılınca **Team ID** `apple-app-site-association` şablonuna yazılır.

### 4.3 İmzalama
- **Android:** yükleme anahtarı (upload keystore) üretimi, örnek: `keytool -genkeypair -v -keystore vetinity-upload.jks -alias vetinity-upload -keyalg RSA -keysize 2048 -validity 10000`. Play App Signing ile uygulama imzalama anahtarını Google saklar; yükleme anahtarı şirkette kalır.
  - Keystore ve parolası **depoya, sohbete, e-postaya konmaz**; şirket parola kasasında ve çevrimdışı ikinci kopyada saklanır. Kaybında yükleme anahtarı sıfırlama Play destek süreciyle yapılır (**güncel kaynaktan doğrulanmalı**).
  - Play Console > Uygulama bütünlüğü sayfasındaki **uygulama imzalama ve yükleme sertifikası SHA-256** parmak izleri `assetlinks.json` şablonuna yazılır.
- **iOS:** Xcode "Automatically manage signing" + şirket ekibi; sertifikalar Apple hesabında. Dağıtım sertifikası/profil yönetimi Xcode veya bulut derleme hizmetinde.

### 4.4 Ortam
- **Android:** Android Studio (güncel kararlı) + Android SDK (`compileSdk`/`targetSdk` 36, `minSdk` 24 — `android/variables.gradle`), JDK (Android Studio ile gelen). Windows'ta yapılabilir. Google Play'in hedef API düzeyi şartı her yıl yükselir: **güncel kaynaktan doğrulanmalı**.
- **iOS:** macOS + Xcode (Capacitor 8 için gereken en düşük Xcode sürümü ve App Store'un istediği SDK: **güncel kaynaktan doğrulanmalı**). Mac yoksa macOS çalıştıran bulut derleme: GitHub Actions macOS koşucusu, Codemagic, Bitrise vb. (fiyat ve Capacitor/SPM desteği **güncel kaynaktan doğrulanmalı**). İmzalama sertifikaları bu hizmete gizli değişken olarak verilir.

### 4.5 Sunucu ve backend (VPS işleri kullanıcı yönlendirmesiyle)
1. `https://portal.vetinity.com/.well-known/assetlinks.json` ve `https://portal.vetinity.com/.well-known/apple-app-site-association` (uzantısız) — `projects/portal/mobile/well-known/` şablonlarından, yer tutucular doldurularak; `Content-Type: application/json`, **yönlendirmesiz** HTTPS, staging için `portal-staging…` üzerinde ayrı dosya (staging uygulamasının imza parmak izi ile). Bu dosyalar `projects/portal/public` altına bilerek konmadı: yer tutucu değerle yayımlanmasın.
2. Backend `AllowedOrigins`: `https://localhost` ve `capacitor://localhost` (mobil uygulama), ayrıca `https://portal.vetinity.com`.
3. Davet e-postası taban adresi `OwnerPortal:PortalBaseUrl` = portal adresi (ADR-033); uygulama bağlantıyı yalnız bu origin'den kabul eder.
4. iOS Universal Links için Xcode'da **Signing & Capabilities > Associated Domains**: `applinks:portal.vetinity.com` (staging derlemesinde `applinks:portal-staging.vetinity.com`). Bu yetenek imzalama profili gerektirdiği için ilk derlemeyi bozmamak adına projeye önceden eklenmedi.

### 4.6 Mağaza kaydı
- **Kayıt metinleri** (taslak, ürün onayı gerekir): ad "Vetinity"; kısa açıklama örneği: "Kliniğinizdeki hayvanlarınızın aşı, randevu ve bakiye bilgileri."; uzun açıklamada v0 kapsamı (ADR-031 K2: hayvanlarım, randevularım, aşı geçmişi ve yaklaşan aşı, bakiye, klinik bilgisi) ve **yalnız klinik davetiyle kullanılabildiği**. Ekran görüntüleri (telefon; iPad desteklenecekse tablet) ve gerekli boyutlar: **güncel kaynaktan doğrulanmalı**.
- **İnceleme için deneme hesabı:** uygulama davetle çalıştığından mağaza incelemesine giriş bilgisi olan bir deneme hesabı (deneme kliniğine bağlı) verilmelidir. Hesap bilgisi mağaza konsolundaki gizli alana yazılır, depoya değil.
- **Gizlilik politikası URL'si:** `https://portal.vetinity.com/legal/privacy` (portal `legal/privacy` rotası, girişsiz açılır). Metin hâlâ **taslak (v0.1, hukuki onay bekliyor)**: mağazaya göndermeden önce ADR-024 / HUKUKI-ONAY-LISTESI sürecinden geçmeli; taslak uyarısı onaysız kaldırılmaz.
- **Hesap silme (engel olabilir):** iki mağaza da hesap oluşturulabilen uygulamalarda uygulama içinden (Google Play ayrıca web bağlantısıyla) hesap silme yolu ister (**güncel kaynaktan doğrulanmalı**). Portalda bugün hesap silme ekranı/ucu **yok** (gizlilik politikası §10 "Portal'dan kendiniz silebilirsiniz" diyor). Mağaza gönderiminden önce backend + portal işi olarak planlanmalı.
- **Asgari işlev riski:** Apple, web sitesini saran uygulamaları reddedebilir (asgari işlev kuralı; **güncel kaynaktan doğrulanmalı**). Derin bağlantı, çevrimdışı açılış ve v1'de push/biyometrik bu riski azaltır.
- **Şifreleme beyanı (iOS export compliance):** uygulama yalnız standart HTTPS kullanır; App Store Connect sorusunun yanıtı ve `ITSAppUsesNonExemptEncryption` anahtarı **güncel kaynaktan doğrulanarak** doldurulmalı.

### 4.7 Veri güvenliği formları (Google Play Data Safety / Apple App Privacy)
Kaynak: `vetinity-product/legal/portal-gizlilik-politikasi.md` (v0.1 taslak). Kategori adları ve "paylaşım/toplama" tanımları mağazaya göre değişir; eşleme **güncel form tanımlarıyla doğrulanmalı**.

| Politikadaki veri | Form karşılığı (öneri) | Amaç | Not |
|---|---|---|---|
| E-posta adresi | Kişisel bilgi > E-posta | Hesap, giriş kodu, işlemsel bildirim | Zorunlu |
| Görünen ad | Kişisel bilgi > Ad | Hesap | |
| Parola | Formda genelde ayrı kategori yok; sunucuda yalnız geri döndürülemez özet | Hesap güvenliği | Parolasız girişte tutulmaz |
| Giriş kayıtları, kilitleme, IP adresi, erişim kaydı | Uygulama etkinliği / Cihaz veya diğer kimlikler (IP için hukuki görüş bekleniyor) | Güvenlik, kötüye kullanımın önlenmesi | Süre hukukça belirlenecek |
| Oturum/yenileme jetonu, cihaz/tarayıcı türü | Cihaz veya diğer kimlikler | Oturum, "tüm cihazlardan çıkış" | |
| Bildirim cihaz jetonu | — | — | **v1** (push yok; v0 formuna girmez) |
| Bildirim tercihi, kabul kayıtları, klinik bağları | Uygulama bilgisi/diğer | Hesap işleyişi, hukuki ispat | |
| Hayvan bilgileri, randevu, aşı geçmişi | Diğer (hayvan verisi; kişinin kendi sağlık verisi değil — sınıflandırma doğrulanmalı) | Uygulama işlevi | Klinik kaydından salt okunur gösterilir |
| Bakiye ve ödeme durumu | Finansal bilgi > Diğer / satın alma geçmişi (doğrulanmalı) | Uygulama işlevi | Ödeme alınmaz (AK-9) |

Genel yanıtlar (öneri): izleme (tracking) **yok**; reklam/analitik SDK'sı **yok**; veriler satılmaz; aktarım yalnız hizmet sağlayıcılara (barındırma, e-posta) — mağazanın "paylaşım" tanımına girip girmediği doğrulanmalı; iletimde şifreleme **var** (HTTPS); kullanıcı silme talebi: hesap silme yolu eklenince **var** (bkz. 4.6).

## 5. Sürüm numaralama

- **Görünen sürüm:** Android `versionName`, iOS `MARKETING_VERSION` (`CFBundleShortVersionString`) — anlamlı sürüm, ör. `0.1.0` (v0), `1.0.0` mağaza ilk genel sürüm.
- **Derleme numarası:** Android `versionCode`, iOS `CURRENT_PROJECT_VERSION` (`CFBundleVersion`) — her mağaza yüklemesinde artan tam sayı (iki platformda aynı sayı kullanılabilir; CI derleme numarası uygundur).
- Bugünkü değerler şablon varsayılanı (`1` / `1.0`); ilk yüklemeden önce belirlenmeli. Yerleri: `android/app/build.gradle`, Xcode proje ayarları.

## 6. Derleme adımları

```powershell
# Üretim (portal + Android/iOS web varlıklarını eşitle)
npm run portal:build:mobile
npm run portal:cap:open:android   # Android Studio: Build > Generate Signed App Bundle (.aab)

# Staging (PowerShell)
$env:VETINITY_PORTAL_ENV = 'staging'
npx ng build portal --configuration staging
npx cap sync
Remove-Item Env:VETINITY_PORTAL_ENV
# Android App Links staging alan adı: Gradle'a -PportalHost=portal-staging.vetinity.com
```

```bash
# macOS
npm ci
npm run portal:build:mobile        # (staging: VETINITY_PORTAL_ENV=staging ile ng build portal --configuration staging && npx cap sync)
npm run portal:cap:open:ios        # Xcode: SPM paketleri çözülür; Product > Archive
```

Notlar: `cap sync` web paketini `android/app/src/main/assets/public` ve `ios/App/App/public` altına kopyalar (git dışı). Platform klasörlerindeki yerel değişiklikler (manifest, simgeler, `build.gradle`) depoda kalır; `npx cap add` yeniden çalıştırılmaz.

## 7. Test dağıtımı

- **Android:** Play Console **dahili test** kanalı (hızlı, inceleme hafif) → kapalı test → üretim. Kişisel hesaplara uygulanan "kapalı testte asgari test kullanıcısı ve süre" şartının kuruluş hesabına uygulanıp uygulanmadığı **güncel kaynaktan doğrulanmalı**.
- **iOS:** **TestFlight** dahili test (App Store Connect ekip üyeleri, inceleme gerekmez) → harici test (beta inceleme) → App Store incelemesi.
- Öneri: pilot klinik personeli ve birkaç hasta sahibiyle staging derlemesi üzerinden dahili test; kontrol listesi: davet bağlantısı uygulamada açılıyor mu (App Links/Universal Links doğrulandıktan sonra), geri tuşu, çentikli cihazda üst/alt boşluk, çevrimdışı açılış, uygulama kapanıp açılınca oturumun sürmesi, çıkışta oturumun silinmesi.

## 8. Doğrulananlar ve doğrulanmayanlar

Doğrulandı (Windows): `ng build portal`, portal ve ana uygulama testleri, lint, `npx cap sync android` ve `npx cap sync ios` (yalnız eşitleme). Doğrulanmadı: Gradle/Android Studio derlemesi (Android SDK yok), Xcode derlemesi, gerçek cihaz/emülatör davranışı (derin bağlantı, geri tuşu, güvenli alan, açılış ekranı), mağaza kuralları.

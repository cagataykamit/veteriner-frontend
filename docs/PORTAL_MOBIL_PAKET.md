# Hasta sahibi portalı — mobil mağaza paketi (Capacitor)

Durum: **mağazaya hazırlık (MOBILE-002)**. Kod ve yapılandırma hazır; Android debug derlemesi emülatörde denendi (2026-11-13, §8). Mağaza hesapları, imzalama, Firebase, iOS derlemesi ve mağazaya gönderim yapılmadı. Ürün kararları: ADR-031 (K5 teknoloji, AK-4 mağaza: PWA + Capacitor, hesap şirket adına; AK-6 v0'da SMS/push yok; AK-10/12 marka ve ad), ADR-033 (adresler). Ürün kararlarının ana kopyası `vetinity-product` deposundadır; bu belge yalnız uygulama ayrıntısıdır.

> Mağaza kuralları, ücretler ve form alanları sık değişir. "**doğrulandı (2026-11-13)**" yazan maddeler o gün web aramasıyla kontrol edildi (kaynak bağlantıları yanında); "**güncel kaynaktan doğrulanmalı**" yazanlar kontrol edilmedi.

## 1. Hazırlananlar

| Konu | Ne yapıldı | Yer |
|---|---|---|
| Paketler (sabit sürüm) | `@capacitor/core` 8.6.0, `@capacitor/android` 8.6.0, `@capacitor/ios` 8.6.0, `@capacitor/app` 8.1.2, `@capacitor/splash-screen` 8.0.2, `@capacitor/push-notifications` 8.1.3, `@capgo/capacitor-native-biometric` 8.9.3 (MPL-2.0; Capacitor 8 eşi; Keychain/Keystore veri deposu ve biyometrik doğrulama tek eklentide); geliştirme: `@capacitor/cli` 8.6.0 | `package.json` |
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
| Anlık bildirim | `CapacitorPortalPushDevice` (izin + jeton), `PortalPushRegistration` (kayıt, açılışta izin sormadan yenileme, tek oturum çıkışında jeton kaldırma §14.3), `PortalNativePush` (bildirime dokununca türüne göre ekran). İzin yalnız Hesabım > "Anlık bildirim" açılınca istenir. Android `POST_NOTIFICATIONS` izni; iOS `AppDelegate` APNs kaydını eklentiye iletir | `projects/portal/src/app/core/push/`, `AndroidManifest.xml`, `ios/App/App/AppDelegate.swift` |
| Oturum saklama | Refresh token mağaza paketinde cihazın anahtar deposunda (Android Keystore ile şifreli, iOS Keychain; `PORTAL_SECURE_STORAGE`); açılışta belleğe okunur, dönen anahtar depoya yazılmadan devam edilmez. Tarayıcıda `localStorage` aynen kalır | `core/native/portal-secure-storage.ts`, `core/auth/portal-token.store.ts` |
| Uygulama kilidi | Hesabım > "Uygulama kilidi": yalnız uygulamada ve cihazda parmak izi/yüz kayıtlıysa görünür; varsayılan kapalı; açarken kimlik doğrulanır. Açılışta ve 5 dakikadan uzun arka plandan dönüşte kilit ekranı; kilit ekranından çıkış yapılabilir. iOS `NSFaceIDUsageDescription` | `core/native/portal-app-lock*.ts`, `features/account/portal-app-lock-setting.component.ts`, `Info.plist` |
| Betikler | `portal:build:mobile` (`ng build portal` + `cap sync`), `portal:cap:open:android`, `portal:cap:open:ios` | `package.json` |

Kurulmayanlar ve gerekçe:
- `@capacitor/status-bar`: Capacitor 8'de durum çubuğu içerik rengi çekirdekteki `SystemBars` ile verilir; Android 15+ kenardan kenara zorunlu olduğundan durum çubuğu **arka plan rengi** verilemez (eklenti belgesi: Android 16'da `backgroundColor`/`overlaysWebView` etkisiz). Zemin, sayfa başlığının rengidir (beyaz).
- `@capacitor/preferences`: kullanılmadı (bkz. §3).
- `@capacitor/assets`: gerekmedi; görseller Windows'ta `System.Drawing` ile üretildi. Kesin marka tasarımında yüksek çözünürlüklü kaynak (en az 1024 px, tercihen vektör) ile yeniden üretilmeli.
- Firebase SDK ayrıca eklenmedi: Android tarafını push eklentisi getirir; `android/app/build.gradle` `google-services.json` varsa Google Services eklentisini uygular (dosya yoksa derleme sürer, push çalışmaz).

## 2. Teknik kararlar

- **Service worker:** `portalServiceWorkerEnabled(devMode, native)` — yalnız tarayıcıdaki üretim derlemesinde açık. Mobil pakette web varlıkları uygulamanın içindedir (çevrimdışı açılır); SW önbelleği mağaza güncellemesinden sonra eski paketi sunabilir; iOS WKWebView özel şemada (`capacitor://`) SW desteklemez. `ngsw-worker.js` pakette durur ama kayıtlanmaz.
- **Origin ve CORS:** uygulama Android'de `https://localhost`, iOS'ta `capacitor://localhost` origin'inden çalışır. **Backend `AllowedOrigins` bu iki origin'i içermeli** (backend işi, ADR-033 hazırlık maddesi 2 ile birlikte). Ayrı origin olduğundan web portalının depolaması uygulamayla paylaşılmaz.
- **İzinli gezinme:** WebView yalnız portal ve portal API alan adına gezinebilir; diğer bağlantılar sistem tarayıcısında açılır. Değerler `capacitor.config.ts` içinde portal ortam dosyasından türetilir (adres koda yazılmaz).
- **CSP:** portal şu an CSP üst bilgisi/meta etiketi kullanmıyor. Eklenirse mobil uygunluk için: `default-src 'self'` (her iki yerel origin'i kapsar), `connect-src` portal API origin'i, `img-src 'self' data:` (klinik logosu kaynağına göre genişler).
- **Derin bağlantı güvenliği:** yalnız `environment.portalBaseUrl` ile **aynı origin** (şema + alan adı + bağlantı noktası) kabul edilir; alt alan adı, `http`, benzer alan adı ve özel şema reddedilir (spec'le sabit). Soğuk açılışta gelen bağlantı da aynı dinleyiciye düşer.
- **Ortam seçimi:** `capacitor.config.ts` ortam değişkeni `VETINITY_PORTAL_ENV=staging` ise staging dosyasını, yoksa üretimi okur. Staging sunucusu 2026-11-10'da kaldırıldı; mağaza paketi üretim ortamıyla derlenir.
- **Üretim API adresi:** `environment.ts` → `https://api.vetinity.com/api/portal/v1` (ADR-033).
- **PrimeUI lisansı:** `projects/portal/src/environments/primeui-license.local.ts` git dışıdır; mağaza derlemesinin yapıldığı makinede bulunmalı, yoksa ekranda "Invalid PrimeUI License" uyarısı çıkar (emülatörde görüldü).

## 3. Oturum/jeton saklama (uygulandı, 2026-11-13)

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

Uygulanan: `@capgo/capacitor-native-biometric` veri deposu (`setData`/`getData`, biyometrik koşulsuz). Gerekçe: Capacitor 8 eşi bildiren, bakımı süren (npm, 2026-11) ve biyometrik kilidi de veren tek eklenti; `@aparajita` paketleri bağımlılık olarak fazladan `@capacitor/keyboard` getiriyor. `PortalTokenStore` okuması senkron kaldı: açılışta `hydrate()` depoyu belleğe alır (`provideAppInitializer`, ilk yönlendirmeden önce). Uygulama kapanıp açılınca oturumun sürdüğü ve anahtarın WebView depolamasında olmadığı emülatörde görüldü.

## 4. Kullanıcının yapacakları

### 4.1 Kararlar
1. **appId onayı:** `com.vetinity.portal` (öneri). Mağazaya ilk yüklemeden sonra değiştirilemez; değişirse `capacitor.config.ts`, `android/app/build.gradle` (`namespace`, `applicationId`), Java paket klasörü ve Xcode Bundle Identifier birlikte güncellenir.
2. **Uygulama adı** (ADR-031 AK-12): şimdilik "Vetinity". Mağaza adı ve alt başlık mağaza öncesi netleşmeli.
3. **Marka görselleri:** yer tutucu simge ve açılış ekranı kesin tasarımla değiştirilmeli (1024 px+ kaynak).

### 4.2 Hesaplar (ADR-031 AK-4: şirket adına; Vetinity şahıs işletmesi)
- **Apple Developer Program — bireysel üyelik.** Apple kuruluş üyeliğini yalnız tüzel kişiliğe açar; şahıs işletmesi ve tek kişilik işletme bireysel kaydolur, App Store'da satıcı adı kişinin yasal adı görünür. Bireysel kayıtta D-U-N-S gerekmez; ücret iki türde de yıllık 99 ABD doları; bireysel üyelik sonradan Apple'a başvurularak kuruluşa çevrilebilir (şirket kurulursa). **Doğrulandı (2026-11-13), üçüncü taraf kılavuzlardan** ([özet](https://viblo.asia/p/apple-developer-program-enrollment-what-apple-actually-requires-and-where-people-get-stuck-pPLkNbBGJRZ)); kayıt sırasında Apple'ın sayfasında son kez bakılmalı. AK-4'ten sapma: satıcı adı şirket değil kişi adı. Hesap açılınca **Team ID** `apple-app-site-association` şablonuna yazılır.
- **Google Play Console — iki yol:**
  1. **Kuruluş hesabı (öneri):** D-U-N-S numarası zorunlu ([Google](https://android-developers.googleblog.com/2023/07/boosting-trust-and-transparency-in-google-play.html); D&B'den ücretsiz istenebilir, 30 güne kadar sürebilir). Kuruluş hesabı, yeni kişisel hesaplara uygulanan kapalı test şartından muaf (üçüncü taraf kaynaklar; Google metni şartı yalnız kişisel hesap için yazıyor). Şahıs işletmesinin kuruluş olarak kabulü resmi kaynakta yok; D-U-N-S kaydındaki ad ve adres vergi levhasıyla aynı olmalı.
  2. **Kişisel hesap (D-U-N-S alınamazsa):** üretime çıkmadan önce **en az 12 test kullanıcısı kesintisiz 14 gün** kapalı testte kalmalı ([Google](https://support.google.com/googleplay/android-developer/answer/14151465), 13.11.2023 sonrası açılan kişisel hesaplar). Pilot klinik personeli ve hasta sahipleriyle karşılanabilir.
  - Kayıt ücreti tek seferlik 25 ABD doları (üçüncü taraf kaynaklar).

### 4.3 İmzalama
- **Android:** yükleme anahtarı (upload keystore) üretimi, örnek: `keytool -genkeypair -v -keystore vetinity-upload.jks -alias vetinity-upload -keyalg RSA -keysize 2048 -validity 10000`. Play App Signing ile uygulama imzalama anahtarını Google saklar; yükleme anahtarı şirkette kalır.
  - Keystore ve parolası **depoya, sohbete, e-postaya konmaz**; şirket parola kasasında ve çevrimdışı ikinci kopyada saklanır. Kaybında yükleme anahtarı sıfırlama Play destek süreciyle yapılır (**güncel kaynaktan doğrulanmalı**).
  - Play Console > Uygulama bütünlüğü sayfasındaki **uygulama imzalama ve yükleme sertifikası SHA-256** parmak izleri `assetlinks.json` şablonuna yazılır.
- **iOS:** Xcode "Automatically manage signing" + şirket ekibi; sertifikalar Apple hesabında. Dağıtım sertifikası/profil yönetimi Xcode veya bulut derleme hizmetinde.

### 4.4 Ortam
- **Android:** Android Studio (güncel kararlı) + Android SDK (`compileSdk`/`targetSdk` 36, `minSdk` 24 — `android/variables.gradle`), JDK (Android Studio ile gelen). Windows'ta yapılabilir. Google Play 31.08.2026'dan beri yeni uygulama ve güncellemede **API 36** istiyor; `targetSdk` 36 uygun (**doğrulandı (2026-11-13)**, [Google](https://support.google.com/googleplay/android-developer/answer/11926878)). Bu makinede Android Studio yerine komut satırı araçları kurulu (`%LOCALAPPDATA%\Android`: JDK 21, SDK platform 36, build-tools 36, emülatör, `vetinity_test` sanal cihazı).
- **iOS:** macOS + Xcode (Capacitor 8 için gereken en düşük Xcode sürümü ve App Store'un istediği SDK: **güncel kaynaktan doğrulanmalı**). Mac yoksa macOS çalıştıran bulut derleme: GitHub Actions macOS koşucusu, Codemagic, Bitrise vb. (fiyat ve Capacitor/SPM desteği **güncel kaynaktan doğrulanmalı**). İmzalama sertifikaları bu hizmete gizli değişken olarak verilir.

### 4.5 Sunucu ve backend (VPS işleri kullanıcı yönlendirmesiyle)
1. `https://portal.vetinity.com/.well-known/assetlinks.json` ve `https://portal.vetinity.com/.well-known/apple-app-site-association` (uzantısız) — `projects/portal/mobile/well-known/` şablonlarından, yer tutucular doldurularak; `Content-Type: application/json`, **yönlendirmesiz** HTTPS, staging için `portal-staging…` üzerinde ayrı dosya (staging uygulamasının imza parmak izi ile). Bu dosyalar `projects/portal/public` altına bilerek konmadı: yer tutucu değerle yayımlanmasın.
2. Backend `AllowedOrigins` (üretim sunucu ayarı): `https://localhost` ve `capacitor://localhost` eklenmeli; bunlar olmadan uygulama API'ye istek atamaz. Yerelde `https://localhost` ile denendi (CORS ön isteği 204).
3. Davet e-postası taban adresi `OwnerPortal:PortalBaseUrl` = portal adresi (ADR-033); uygulama bağlantıyı yalnız bu origin'den kabul eder.
5. **Firebase (anlık bildirim):** Firebase projesi (kullanıcı açar) → Android uygulaması (`com.vetinity.portal`) → `google-services.json` `android/app/` altına; iOS uygulaması → `GoogleService-Info.plist` ve Firebase konsoluna **APNs kimlik doğrulama anahtarı** (.p8, Apple hesabından). Backend: hizmet hesabı anahtarı `Push:Fcm` (backend `PORTAL_API_CONTRACT.md` §14.6; gizli, sunucuda, depoya yazılmaz).
6. **iOS FCM jetonu (Mac işi):** push eklentisi iOS'ta APNs jetonu döndürür, backend FCM HTTP v1 ile gönderir. Mağaza öncesi Xcode'da Firebase iOS SDK'sı (SPM, `FirebaseMessaging`) eklenip `AppDelegate`'te APNs jetonu `Messaging.messaging().apnsToken`'a verilir ve eklentiye FCM jetonu iletilir; ayrıca **Signing & Capabilities > Push Notifications** ve **Background Modes > Remote notifications**. Windows'ta derlenemediği için yapılmadı.
4. iOS Universal Links için Xcode'da **Signing & Capabilities > Associated Domains**: `applinks:portal.vetinity.com` (staging derlemesinde `applinks:portal-staging.vetinity.com`). Bu yetenek imzalama profili gerektirdiği için ilk derlemeyi bozmamak adına projeye önceden eklenmedi.

### 4.6 Mağaza kaydı
- **Kayıt metinleri** (öneri; karakter sınırları bilinen değerler, kayıt ekranında kontrol edilir):
  - Uygulama adı (en çok 30): **Vetinity: Hayvanım ve Kliniğim**. Ana ekran adı `appName` "Vetinity" kalır.
  - Apple alt başlık (30): **Aşı, randevu ve klinik bilgisi**
  - Google kısa açıklama (80): **Kliniğinizdeki hayvanlarınızın aşı, randevu ve bakiye bilgileri tek yerde.**
  - Apple anahtar kelimeler (100): `veteriner,aşı,aşı takvimi,randevu,kedi,köpek,evcil hayvan,klinik,pet`
  - Uzun açıklama:

    > Vetinity, veteriner kliniğinizin sizinle paylaştığı bilgileri telefonunuza getirir. Uygulama, Vetinity kullanan kliniklerin davet ettiği hayvan sahipleri içindir: kliniğinizden gelen davetle ya da kayıtlı e-postanıza gelen kodla giriş yaparsınız.
    >
    > Neler yapabilirsiniz?
    > • Hayvanlarınızın bilgilerini ve aşı geçmişini görün, yaklaşan ve geciken aşıları takip edin.
    > • Randevularınızı görün, kliniğinize randevu talebi gönderin, randevuyu takviminize ekleyin.
    > • Bakiyenizi ve ödemelerinizi izleyin.
    > • Kliniğinizin adres, telefon ve çalışma saatlerine ulaşın.
    > • Anlık bildirimle randevu ve talep yanıtlarından haberdar olun.
    > • Uygulamayı parmak izi ya da yüz tanıma ile kilitleyin.
    > • Bildirim tercihlerinizi yönetin, verilerinizle ilgili KVKK talebi oluşturun, hesabınızı uygulamadan silin.
    >
    > Birden fazla kliniğe kayıtlıysanız klinikler arasında geçiş yapabilirsiniz. Klinik kayıtlarınız kliniğinizde tutulur; uygulama bu bilgileri yalnız size gösterir.
  - Ekran görüntüleri (telefon; iPad desteklenmeyecek) ve gerekli boyutlar: **güncel kaynaktan doğrulanmalı**. Emülatörden alınan 1080×2400 görüntüler Google Play telefon görüntüsü olarak kullanılabilir; Apple 6,9" ve 6,5" boyutları Mac'te simülatörden alınır.
- **İnceleme için deneme hesabı:** uygulama davetle çalıştığından mağaza incelemesine giriş bilgisi olan bir deneme hesabı (deneme kliniğine bağlı) verilmelidir. Hesap bilgisi mağaza konsolundaki gizli alana yazılır, depoya değil.
- **Gizlilik politikası URL'si:** `https://portal.vetinity.com/legal/privacy` (portal `legal/privacy` rotası, girişsiz açılır; metin yayında).
- **Hesap silme:** Apple 5.1.1(v) uygulama içinden; Google Play uygulama içinden **ve web bağlantısıyla** silme yolu ister, web bağlantısı Data safety formuna yazılır (**doğrulandı (2026-11-13)**, [Google](https://support.google.com/googleplay/android-developer/answer/13327111), [Apple](https://developer.apple.com/support/offering-account-deletion-in-your-app)). Portalda var: Hesabım > "Hesabımı silmek istiyorum" (`/account/delete`, e-posta koduyla); web bağlantısı `https://portal.vetinity.com/account/delete` (girişten sonra açılır).
- **Asgari işlev riski (Apple 4.2):** web sitesini saran uygulama reddedilebilir. Azaltanlar: anlık bildirim, biyometrik uygulama kilidi, cihaz anahtar deposunda oturum, davet bağlantısının uygulamada açılması, uygulamaya gömülü web paketi (ağ yokken de açılır, çevrimdışı bandı). Kesin değerlendirme incelemede.
- **Şifreleme beyanı (iOS export compliance):** uygulama yalnız standart HTTPS kullanır; App Store Connect sorusunun yanıtı ve `ITSAppUsesNonExemptEncryption` anahtarı **güncel kaynaktan doğrulanarak** doldurulmalı.

### 4.7 Veri güvenliği formları (Google Play Data Safety / Apple App Privacy)
Kaynak: `vetinity-product/legal/portal-gizlilik-politikasi.md`. Kategori adları ve "paylaşım/toplama" tanımları mağazaya göre değişir; eşleme **güncel form tanımlarıyla doğrulanmalı**.

| Politikadaki veri | Form karşılığı (öneri) | Amaç | Not |
|---|---|---|---|
| E-posta adresi | Kişisel bilgi > E-posta | Hesap, giriş kodu, işlemsel bildirim | Zorunlu |
| Görünen ad | Kişisel bilgi > Ad | Hesap | |
| Parola | Formda genelde ayrı kategori yok; sunucuda yalnız geri döndürülemez özet | Hesap güvenliği | Parolasız girişte tutulmaz |
| Giriş kayıtları, kilitleme, IP adresi, erişim kaydı | Uygulama etkinliği / Cihaz veya diğer kimlikler | Güvenlik, kötüye kullanımın önlenmesi | |
| Oturum/yenileme jetonu, cihaz/tarayıcı türü | Cihaz veya diğer kimlikler | Oturum, "tüm cihazlardan çıkış" | |
| Bildirim cihaz jetonu | Cihaz veya diğer kimlikler | Anlık bildirim | Yalnız kullanıcı açarsa; çıkışta ve tercih kapanınca silinir |
| Bildirim tercihi, kabul kayıtları, klinik bağları | Uygulama bilgisi/diğer | Hesap işleyişi, hukuki ispat | |
| Hayvan bilgileri, randevu, aşı geçmişi | Diğer (hayvan verisi; kişinin kendi sağlık verisi değil — sınıflandırma doğrulanmalı) | Uygulama işlevi | Klinik kaydından salt okunur gösterilir |
| Bakiye ve ödeme durumu | Finansal bilgi > Diğer / satın alma geçmişi (doğrulanmalı) | Uygulama işlevi | Ödeme alınmaz (AK-9) |

Genel yanıtlar (öneri): izleme (tracking) **yok**; reklam/analitik SDK'sı **yok**; veriler satılmaz; aktarım yalnız hizmet sağlayıcılara (barındırma, e-posta) — mağazanın "paylaşım" tanımına girip girmediği doğrulanmalı; iletimde şifreleme **var** (HTTPS); kullanıcı silme talebi: **var** (bkz. 4.6).

## 5. Sürüm numaralama

- **Görünen sürüm:** Android `versionName`, iOS `MARKETING_VERSION` (`CFBundleShortVersionString`) — anlamlı sürüm, ör. `0.1.0` (v0), `1.0.0` mağaza ilk genel sürüm.
- **Derleme numarası:** Android `versionCode`, iOS `CURRENT_PROJECT_VERSION` (`CFBundleVersion`) — her mağaza yüklemesinde artan tam sayı (iki platformda aynı sayı kullanılabilir; CI derleme numarası uygundur).
- Bugünkü değerler şablon varsayılanı (`1` / `1.0`). Öneri: ilk mağaza yüklemesi `versionName` `1.0.0`, `versionCode` `1`; her yüklemede `versionCode` +1. Yerleri: `android/app/build.gradle`, Xcode proje ayarları.

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

- **Android:** Play Console **dahili test** kanalı (hızlı, inceleme hafif) → kapalı test → üretim. Kişisel hesapta üretimden önce 12 kişi / 14 gün kapalı test zorunlu (§4.2).
- **iOS:** **TestFlight** dahili test (App Store Connect ekip üyeleri, inceleme gerekmez) → harici test (beta inceleme) → App Store incelemesi.
- Öneri: pilot klinik personeli ve birkaç hasta sahibiyle üretim derlemesi üzerinden dahili test; kontrol listesi: davet bağlantısı uygulamada açılıyor mu (App Links/Universal Links doğrulandıktan sonra), geri tuşu, çentikli cihazda üst/alt boşluk, çevrimdışı açılış, uygulama kapanıp açılınca oturumun sürmesi, çıkışta oturumun silinmesi.

## 8. Doğrulananlar ve doğrulanmayanlar

Doğrulandı (2026-11-13; Windows, Android 16 emülatörü `vetinity_test`, yerel backend, yerel test hesabı):
- `ng test portal` 257 test geçti; `npx cap sync` (Android ve iOS); `gradlew assembleDebug` (APK ~10 MB).
- Emülatörde: açılış ekranı, güvenli alan, e-posta koduyla giriş, kullanım şartları onayı, klinik seçimi, ana sayfa verileri, Hesabım; uygulama kapatılıp açılınca oturumun sürmesi; anahtarın WebView depolamasında değil eklenti deposunda olması; parmak izi tanımlıyken "Uygulama kilidi"nin görünmesi, açarken doğrulama, soğuk açılışta kilit ekranı, parmak iziyle açılma, kilit ekranından çıkış (sunucuya çıkış isteği gitti, anahtar depodan silindi).
- Yerel deneme için geçici olarak API adresi `http://localhost:5018` ve Android `usesCleartextTraffic` kullanıldı; commit edilmedi.

Doğrulanmadı: gerçek anlık bildirim (Firebase yok; yerelde "henüz etkin değil" görünüyor), iOS derlemesi ve davranışı, App Links/Universal Links doğrulaması (sunucu dosyaları yok), geri tuşunun her ekranda davranışı (yalnız birim testi), release imzalı derleme (.aab), gerçek cihaz, mağaza incelemesi.

# Klinik sitesi uygulaması (`projects/site`)

Kaynak karar: ürün deposu `decisions/ADR-045-klinik-web-sitesi-olusturucu.md` (K6, K7, K11, K12, K13). Yayınlanmış klinik sitelerini `/k/{adres}` altında sunucuda çizer. Panel kodu ve oturumu bu pakete girmez (`eslint.config.js`, `projects/site/tsconfig.app.json`). Çizim `@site-engine`'dendir; panel önizlemesiyle aynı bileşenler.

## Çalıştırma

```bash
npm run start:site
```

Geliştirme: `http://localhost:4400/k/{adres}`, API `https://localhost:7173`. Görseller geliştirme vekilinden gelir (`projects/site/proxy.conf.json`). Yerel API sertifikasına işletim sisteminin güven deposundan bakılır, TLS denetimi kapatılmaz.

```bash
npm run build:site
```

```bash
npm run serve:site
```

Üretim paketi `dist/site`. Node sürecidir: statik dosyalar `dist/site/browser`, sunucu `dist/site/server/server.mjs`.

## Ortam değişkenleri

| Değişken | Varsayılan | Anlam |
|---|---|---|
| `PORT` | `4400` | Dinlenen port |
| `SITE_API_BASE_URL` | `https://localhost:7173` | Sunucunun API'ye gittiği kök |
| `SITE_PUBLIC_API_BASE_URL` | `SITE_API_BASE_URL` | Tarayıcının görsel istediği kök; boş bırakılırsa aynı alan adı |
| `SITE_PUBLIC_ORIGIN` | `https://vetinity.com` | Canonical, OG, JSON-LD ve site haritasındaki kök |
| `SITE_ALLOWED_HOSTS` | `localhost` | Angular SSR'ın kabul ettiği `Host` adları, virgülle |
| `SITE_TRUSTED_PROXY_HOPS` | `0` | Site sunucusunun önündeki güvenilen vekil sayısı |

## Adresler ve durum kodları

| Durum | Yanıt |
|---|---|
| Yayında | 200, tam içerik; JS kapalıyken de okunur |
| Açık sitenin eski adresi | 301, alt sayfa ve sorgu korunur; hedef adres biçimi denetlenir |
| Kapalı (geçici ya da abonelik, güncel ya da eski adresten) | 503, `Retry-After: 3600`, `noindex`, neden ve yeni adres söylenmez |
| Adres yok ya da kapatılmış alt sayfa | 404, `noindex` |
| API'ye ulaşılamadı, hız sınırı | 503, `noindex`; "yok" denmez |

`/robots.txt` kökte, site haritası `/k/{adres}/sitemap.xml`. HTML `no-cache` döner: kapanan site gecikmesiz görünür (K13).

Tarayıcı JSON API'ye gitmez: durum sunucudan `TransferState` ile gelir, alt sayfa geçişi yeni istek yapmaz. Bu yüzden CORS gerekmez; görseller `<img>` ile okunur.

## En yakın müsait saatler (TIER-017)

Online randevu açık ve Randevu sayfası açıksa sunucu `GET /api/v1/public/sites/{slug}/next-available-slots` ucunu da sorar (backend `ONLINE_APPOINTMENT_API_CONTRACT.md` §12), ziyaretçi IP'siyle. Saatler durumla birlikte tarayıcıya geçer; Randevu sayfasında güne göre çizilir. Her saat talep formuna `?saat={startUtc}` ile gider, form neden seçilince o saati hazır getirir; talep klinik onaylayınca kesinleşir. Hata, zaman aşımı ya da 429'da saatsiz devam edilir, site ve randevu düğmesi kalır. Klinik gösterimi panelde Ayarlar > Online randevu'dan kapatır; o zaman backend boş liste döner. Panel önizlemesinde saat çizilmez.

## İstemci IP'si ve hız sınırı

Backend'in `public-site` sınırı IP başınadır. Site sunucusu her isteği kendi IP'siyle yapacağından ziyaretçinin adresini `X-Forwarded-For` ile iletir.

- Ziyaretçinin yazdığı başlığa güvenilmez. İletilen değer Express'in `req.ip`'sidir: `SITE_TRUSTED_PROXY_HOPS=0` iken soket adresi, `N` iken sağdan `N` vekil atlanmış adres.
- Backend bu başlığa yalnız güvendiği vekilden inanır, varsayılan loopback'tir. Site sunucusu API ile aynı makinedeyse ek ayar gerekmez. Ayrı makinedeyse adresi API'nin `ForwardedHeaders:KnownProxies` listesine yazılmalıdır; yazılmazsa bütün ziyaretçiler tek IP sayılır ve 429 başlar.

## Yazı tipleri ve üçüncü taraf

Dokuz aile `@fontsource-variable` paketlerinden bizim sunucudan gelir (`projects/site-engine/src/styles/site-fonts.css`, OFL-1.1). Google Fonts ve gömülü harita yoktur; haritaya bağlantı verilir. İkonlar `primeicons`.

## Hazır fotoğraflar

Klinik görsel yüklemediği yerde motor çizerken konsept ve yuvaya göre hazır fotoğraf seçer (ADR-045 K7, `projects/site-engine/src/engine/stock-photos.ts`). Yapılandırmaya yazılmaz: mevcut sitelere de yansır, yükleme geçer, kaldırınca hazır fotoğraf döner. Hekim kartında monogram kalır. Sitede hazır fotoğraf çiziliyorsa "temsili" ibaresi görünür. Dosya yüklenemezse bölüm görselsiz düzenini çizer.

- Dosyalar `projects/site-engine/stock/photos` altındadır, panel ve site uygulaması `_stock/` altından verir (sitede `/k/_stock/`). Adres, klinik adresi biçimine uymadığı için bir siteyle çakışmaz. JS paketine girmez, üçüncü taraftan çizilmez.
- Kaynak, indirme tarihi ve lisans `projects/site-engine/stock/KAYNAKLAR.json`'dadır. Dosya eklenince ya da çıkınca kayıt da değişir, spec denetler.
- Site sunucusu dosyaları bir yıl `immutable` verir: kare değişirse yeni dosya adı verilir, eski ad yeniden kullanılmaz.

## Veteriner bul (TIER-015, ADR-047)

Klinik listesi sayfaları da bu süreçtedir: `/veteriner`, `/veteriner/{il}`, `/veteriner/{il}/{ilçe}`, `/veteriner/{il}/{ilçe}/{hizmet}`. Sözleşme backend `docs/VET_FINDER_API_CONTRACT.md`. Kod `projects/site/src/app/vet-finder/` ve `src/server/vet-finder-loader.ts`, stil `src/vet-finder.css` (`vf-` önekli, klinik sitelerine dokunmaz).

- **Neden bu uygulama:** sayfalar SEO için sunucuda çizilmeli (ADR-045 K12 ile aynı gerekçe), Node süreci, istemci IP iletimi ve hız sınırı deseni zaten burada. Tanıtım sitesi (`vetinity-web`) istemci tarafında çizilir; ayrı bir SSR uygulaması ikinci bir Node süreci isterdi.
- **Taban yolu:** uygulama `/k/` tabanında yaşar. Sunucu `/veteriner/...` isteğini Angular'a `/k/veteriner/...` olarak verir (`veteriner` klinik adresinde ayrılmış sözcüktür, çakışmaz). Sayfa yönlendiriciyle değil kök bileşenle çizilir; tarayıcıda bu sayfalarda yönlendiricinin ilk gezintisi kapalıdır (`main.ts`), yoksa adres `/k/veteriner/...` olarak yeniden yazılırdı. Filtreler ve sayfalar gerçek bağlantıdır, her biri sunucuda çizilir, JS'siz okunur.
- **Durum kodları:** liste 200; biçimsiz adres, bilinmeyen il/ilçe/hizmet 404; API'ye ulaşılamadı ya da 429 ise 503. Üçü de HTML `no-cache`.
- **SEO:** başlık, açıklama ve kanonik adres (`SiteHead.applyVetFinder`). Dizine alınma backend'in `indexable` değerine (eşik `VetFinderPages.MinClinicsToIndex`, 3) ve sorgu filtresine bağlıdır: "şu an açık", sorgudaki hizmet ve 2. sayfadan sonrası `noindex, follow`, kanonik adres filtresiz sayfadır. Site haritası `/veteriner/sitemap.xml` (yalnız eşiği geçen sayfalar), `/robots.txt` bu süreçte `Allow: /veteriner/` ve harita satırını ekler.
- **Tarayıcı istekleri** yine bu sürece gelir, API'ye sunucu gider: kartların en yakın saati `GET /veteriner/_api/saatler?keys=` (sayfa başına bir istek, en çok 24 anahtar), konuma göre sıralama `POST /veteriner/_api/klinikler`. Konum gövdeyle gelir, iki ondalığa (yaklaşık 1 km) yuvarlanır; sorgu satırına yazılmadığı için ters vekil erişim günlüğüne düşmez. Konum düğmesi yalnız sonuçlarda konumu olan klinik varken görünür.
- **Randevu:** kart bağlantıya `?kaynak=veteriner-bul` ekler (TIER-016), saat seçilince `?saat=` (TIER-017). Online randevu kapalıysa düğme yoktur, "Ara" kalır.
- **Görünüm (2026-11-12):** tanıtım sitesinin markası: lacivert + teal, Inter (`styles.css`), logo `src/assets/brand/vetinity/vetinity-compact*.svg` dosyalarından derlemeye `_brand/` altına kopyalanır (`angular.json`). Koyu tema cihazın ayarını izler (`prefers-color-scheme`); tema düğmesi yoktur, sunucuda çizilen sayfada ilk boyamada yanlış temayı gösterirdi. İl ve ilçe seçicileri `<details>` içinde bağlantı listesidir, JS'siz açılır. Hiç klinik listelenmiyorsa (`regions.totalClinics` 0) seçiciler, filtreler ve sayı gösterilmez; sayfa "Klinikler listelenmeye başlıyor" der. Üst çubuk, klinik çağrısı ve alt bilgi tanıtım sitesine göreli bağlantı verir (`/`, `/ozellikler#hasta-sahibi`, `/auth/login`, `/gizlilik`, `/kullanim-sartlari`): iki uygulama aynı alan adındadır.

## Canlıya çıkış (ADR-033, yapılmadı)

- Ters vekil `vetinity.com/k/*` ve `vetinity.com/veteriner` ile `vetinity.com/veteriner/*` isteklerini bu Node sürecine yönlendirmeli. Uygulamanın dosyaları `/k/` altındadır (`baseHref`), başka yol gerekmez. `/veteriner/_api/*` POST dahil iletilmeli.
- Tanıtım sitesinin `robots.txt` dosyası (`public/robots.txt`) Veteriner bul yayına girince `Sitemap: https://www.vetinity.com/veteriner/sitemap.xml` satırını almalı; şu an bilerek eklenmedi (sayfa canlı değil).
- `vetinity.com/robots.txt` tanıtım sitesindedir ve `/k/` yolunu kapatmamalı. Her sitenin haritası `/k/{adres}/sitemap.xml`; bütün siteleri listeleyen bir harita için herkese açık liste ucu gerekir, bu sürümde yok.
- `SITE_API_BASE_URL`, `SITE_PUBLIC_API_BASE_URL`, `SITE_PUBLIC_ORIGIN`, `SITE_ALLOWED_HOSTS`, `SITE_TRUSTED_PROXY_HOPS` ayarlanmalı.
- `environment.ts` içindeki `siteBaseUrl` panelin gösterdiği bağlantıdır; staging değeri (`https://staging.vetinity.com`) varsayımdır, doğrulanmalı.

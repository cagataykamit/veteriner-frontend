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

## İstemci IP'si ve hız sınırı

Backend'in `public-site` sınırı IP başınadır. Site sunucusu her isteği kendi IP'siyle yapacağından ziyaretçinin adresini `X-Forwarded-For` ile iletir.

- Ziyaretçinin yazdığı başlığa güvenilmez. İletilen değer Express'in `req.ip`'sidir: `SITE_TRUSTED_PROXY_HOPS=0` iken soket adresi, `N` iken sağdan `N` vekil atlanmış adres.
- Backend bu başlığa yalnız güvendiği vekilden inanır, varsayılan loopback'tir. Site sunucusu API ile aynı makinedeyse ek ayar gerekmez. Ayrı makinedeyse adresi API'nin `ForwardedHeaders:KnownProxies` listesine yazılmalıdır; yazılmazsa bütün ziyaretçiler tek IP sayılır ve 429 başlar.

## Yazı tipleri ve üçüncü taraf

Dokuz aile `@fontsource-variable` paketlerinden bizim sunucudan gelir (`projects/site-engine/src/styles/site-fonts.css`, OFL-1.1). Google Fonts ve gömülü harita yoktur; haritaya bağlantı verilir. İkonlar `primeicons`.

## Canlıya çıkış (ADR-033, yapılmadı)

- Ters vekil `vetinity.com/k/*` isteklerini bu Node sürecine yönlendirmeli. Uygulamanın dosyaları da `/k/` altındadır (`baseHref`), başka yol gerekmez.
- `vetinity.com/robots.txt` tanıtım sitesindedir ve `/k/` yolunu kapatmamalı. Her sitenin haritası `/k/{adres}/sitemap.xml`; bütün siteleri listeleyen bir harita için herkese açık liste ucu gerekir, bu sürümde yok.
- `SITE_API_BASE_URL`, `SITE_PUBLIC_API_BASE_URL`, `SITE_PUBLIC_ORIGIN`, `SITE_ALLOWED_HOSTS`, `SITE_TRUSTED_PROXY_HOPS` ayarlanmalı.
- `environment.ts` içindeki `siteBaseUrl` panelin gösterdiği bağlantıdır; staging değeri (`https://staging.vetinity.com`) varsayımdır, doğrulanmalı.

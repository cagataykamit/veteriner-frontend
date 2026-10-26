# Sakai19

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 21.

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

Birim testleri Angular'ın [Vitest](https://vitest.dev) koşucusuyla (`@angular/build:unit-test`) tarayıcı kipinde, başlıksız Chromium'da koşar:

```bash
ng test            # panel + portal (izleme kipi; tek koşu için --watch=false)
ng test portal     # yalnız portal
```

Tarayıcı: `CHROME_BIN` ortam değişkeni verilirse o Chrome kullanılır (örn. Windows'ta `C:/Program Files/Google/Chrome/Application/chrome.exe`); verilmezse Playwright'ın Chromium'u gerekir (bir kez `npx playwright install chromium`).

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.

## CI/CD ve sürüm

`.github/workflows/ci.yml` (push `main`, `v*` etiketi, pull request, elle): `npm ci` → `ng build --configuration production` → `ng test` (Vitest, başlıksız Chrome) → `dist` artifact'ı (`web-<sürüm>`). Dağıtım (CD) yok; hosting kurulumu ayrı iştir. İş akışı henüz GitHub'da çalışmadı.

**Sürüm:** git etiketi `vMAJOR.MINOR.PATCH[-önsürüm]` (örn. `v1.0.0`) → artifact adındaki sürüm; etiketsiz koşu `0.0.0-ci.<koşu no>`. Etiketi yalnız `main`'de testler yeşilken atın ve push edin (kullanıcı işi). Geçersiz etiket koşuyu düşürür.

**Üretim API adresi (`apiBaseUrl`, `portalApiBaseUrl`):** `src/environments/environment.ts` ve `projects/portal/src/environments/environment.ts` (üretim) hâlâ `https://localhost:7173…` içerir. CI, depo *değişkeni* `API_BASE_URL` (Settings → Secrets and variables → Actions → Variables; gizli değil) tanımlıysa derlemeden önce `scripts/set-api-base-url.mjs` ile panele bu değeri, portala `<API_BASE_URL>/api/portal/v1` değerini yazar (ADR-033: iki uygulama aynı API host'unu kullanır; yalnız `https`, sonunda `/` yok). Etiket derlemesinde değişken yoksa koşu hata verir; diğer koşularda uyarı verip varsayılanla derler (dağıtılabilir değildir). Yerelde: `API_BASE_URL=https://api.vetinity.com node scripts/set-api-base-url.mjs` (dosyayı değiştirir; commit'lemeyin). Staging için ayrı yapılandırma `environment.staging.ts` (`npm run build:staging`).

**CORS ilişkisi:** `apiBaseUrl` API'nin adresidir; backend `AllowedOrigins` ise bu arayüzün **yayınlandığı** adres (tarayıcı origin'i, örn. `https://app.vetinity.com`) olmalıdır. Arayüz adresi değişirse backend ayarı da güncellenmeli; yoksa tarayıcı istekleri CORS ile reddeder.

**Gelecek öneri (yapılmadı):** "bir kez derle, her yere dağıt" için çalışma zamanı `config.json` (uygulama açılışta okur). `app.config.ts` değişikliği gerektirdiğinden menü/arayüz çalışmalarıyla çakışmaması için ertelendi.

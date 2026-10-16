import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { Title } from '@angular/platform-browser';
import { appRoutes } from '@/app.routes';
import { API_BASE_URL } from '@/app/core/api/api-base-url.token';
import { LegalDocumentPageComponent } from './legal-document-page.component';
import {
    DATA_PROCESSING_AGREEMENT_DOCUMENT,
    LEGAL_DRAFT_NOTICE,
    legalVersionLine,
    PRIVACY_POLICY_DOCUMENT,
    TERMS_OF_USE_DOCUMENT
} from '@/app/features/public/utils/legal-documents.utils';

const VERSIONS_URL = 'http://api.test/api/v1/public/legal-documents';
const VERSIONS = [
    { documentType: 'Terms', version: '0.1' },
    { documentType: 'Privacy', version: '0.2' },
    { documentType: 'DataProcessing', version: '1.0' }
];

describe('LegalDocumentPageComponent', () => {
    let harness: RouterTestingHarness;
    let http: HttpTestingController;

    beforeEach(async () => {
        TestBed.configureTestingModule({
            providers: [provideRouter(appRoutes), provideHttpClient(), provideHttpClientTesting(), { provide: API_BASE_URL, useValue: 'http://api.test' }]
        });
        http = TestBed.inject(HttpTestingController);
        harness = await RouterTestingHarness.create();
    });

    /** Sayfa ortak iskelet (PublicLayout) içinde açılır; sorgular kök elemandan yapılır. */
    const root = (): HTMLElement => harness.fixture.nativeElement as HTMLElement;
    const text = (selector: string): string => (root().querySelector(selector)?.textContent ?? '').trim();

    /** Sayfa açılınca sürümleri backend'den ister. */
    const flushVersions = (): void => {
        http.match(VERSIONS_URL).forEach((r) => r.flush(VERSIONS));
        harness.detectChanges();
    };

    for (const doc of [PRIVACY_POLICY_DOCUMENT, TERMS_OF_USE_DOCUMENT, DATA_PROCESSING_AGREEMENT_DOCUMENT]) {
        const version = VERSIONS.find((v) => v.documentType === doc.documentType)!.version;

        describe(doc.path, () => {
            it('girişsiz açılır ve belge sayfasını gösterir', async () => {
                await harness.navigateByUrl(doc.path);
                const page = harness.fixture.debugElement.query(By.directive(LegalDocumentPageComponent)).componentInstance as LegalDocumentPageComponent;

                expect(TestBed.inject(Router).url).toBe(doc.path);
                expect(page.doc).toBe(doc);
            });

            it('başlık, backend sürümlü satır, taslak bandı ve tüm maddeler görünür', async () => {
                await harness.navigateByUrl(doc.path);
                flushVersions();

                expect(text('h1')).toBe(doc.title);
                expect(text('.legal-version-line')).toBe(legalVersionLine(doc, version));
                expect(text('.legal-version-line')).toContain(`Sürüm: ${version}`);
                expect(LEGAL_DRAFT_NOTICE).not.toBeNull();
                expect(text('.legal-draft-notice')).toBe(LEGAL_DRAFT_NOTICE as string);
                const headings = Array.from(root().querySelectorAll('article h2')).map((h) => h.textContent?.trim());

                expect(headings).toEqual(doc.sections.map((s) => s.heading));
            });

            it('sekme başlığını kısa adla ayarlar', async () => {
                await harness.navigateByUrl(doc.path);

                expect(TestBed.inject(Title).getTitle()).toBe(`${doc.shortTitle} — Vetinity`);
            });
        });
    }

    it('sürüm satırı: 0.x taslak, 1.x taslak değil; sürüm okunamazsa sabit sürüm yazılmaz', () => {
        expect(legalVersionLine(TERMS_OF_USE_DOCUMENT, '0.1')).toBe(`Sürüm: 0.1 (taslak) · ${TERMS_OF_USE_DOCUMENT.statusLine}`);
        expect(legalVersionLine(TERMS_OF_USE_DOCUMENT, '1.0')).toBe(`Sürüm: 1.0 · ${TERMS_OF_USE_DOCUMENT.statusLine}`);
        expect(legalVersionLine(TERMS_OF_USE_DOCUMENT, null)).toBe(TERMS_OF_USE_DOCUMENT.statusLine);
    });

    it('sürüm isteği başarısızsa sayfa yine açılır', async () => {
        await harness.navigateByUrl(TERMS_OF_USE_DOCUMENT.path);
        http.expectOne(VERSIONS_URL).flush(null, { status: 500, statusText: 'err' });
        harness.detectChanges();

        expect(text('.legal-version-line')).toBe(TERMS_OF_USE_DOCUMENT.statusLine);
    });

    it('köşeli parantezli alanlar olduğu gibi kalır', async () => {
        await harness.navigateByUrl(PRIVACY_POLICY_DOCUMENT.path);

        expect(root().textContent).toContain('[Şirket unvanı], [adres]');
    });

    it('kullanım şartları gizlilik politikasına ve veri işleme sözleşmesine bağlantı verir', async () => {
        await harness.navigateByUrl(TERMS_OF_USE_DOCUMENT.path);

        expect(root().querySelector('main a[href="/gizlilik"]')?.textContent?.trim()).toBe('gizlilik politikası');
        expect(root().querySelector('main a[href="/veri-isleme-sozlesmesi"]')?.textContent?.trim()).toBe('veri işleme sözleşmesi');
    });

    it('ortak iskeletin alt bilgisinde üç hukuki sayfaya bağlantı vardır', async () => {
        await harness.navigateByUrl(TERMS_OF_USE_DOCUMENT.path);

        const footer = root().querySelector('footer');

        expect(footer?.querySelector('a[href="/gizlilik"]')?.textContent?.trim()).toBe('Gizlilik Politikası');
        expect(footer?.querySelector('a[href="/kullanim-sartlari"]')?.textContent?.trim()).toBe('Kullanım Şartları');
        expect(footer?.querySelector('a[href="/veri-isleme-sozlesmesi"]')?.textContent?.trim()).toBe('Veri İşleme Sözleşmesi');
    });
});

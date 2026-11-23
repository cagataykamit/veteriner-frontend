import { provideHttpClient, withXhr } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { Title } from '@angular/platform-browser';
import { appRoutes } from '@/app.routes';
import { API_BASE_URL } from '@/app/core/api/api-base-url.token';
import { LegalDocumentPageComponent } from './legal-document-page.component';
import { VETINITY_CONTACT_EMAIL, VETINITY_LEGAL_ENTITY_NAME } from '@/app/core/support/vetinity-support.constants';
import {
    DATA_PROCESSING_AGREEMENT_DOCUMENT,
    LEGAL_DRAFT_NOTICE,
    type LegalDocumentDef,
    legalParagraphParts,
    legalVersionLine,
    PRIVACY_POLICY_DOCUMENT,
    TERMS_OF_USE_DOCUMENT
} from '@/app/entities/legal-document/utils/legal-documents.utils';
import { PRICING_PLAN_DEFS, PRICING_TRIAL_DAYS } from '@/app/entities/subscription/utils/pricing-plan.utils';
import { PUBLIC_CONTACT_EMAIL } from '@/app/features/public/utils/public-contact-content.utils';

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
            providers: [provideRouter(appRoutes), provideHttpClient(withXhr()), provideHttpClientTesting(), { provide: API_BASE_URL, useValue: 'http://api.test' }]
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

            it('başlık, backend sürümlü satır ve tüm maddeler görünür; taslak bandı yok', async () => {
                await harness.navigateByUrl(doc.path);
                flushVersions();

                expect(text('h1')).toBe(doc.title);
                expect(text('.legal-version-line')).toBe(legalVersionLine(doc, version));
                expect(text('.legal-version-line')).toContain(`Sürüm: ${version}`);
                expect(LEGAL_DRAFT_NOTICE).toBeNull();
                expect(root().querySelector('.legal-draft-notice')).toBeNull();
                const headings = Array.from(root().querySelectorAll('article h2')).map((h) => h.textContent?.trim());

                expect(headings).toEqual(doc.sections.map((s) => s.heading));
            });

            it('sekme başlığını kısa adla ayarlar', async () => {
                await harness.navigateByUrl(doc.path);

                expect(TestBed.inject(Title).getTitle()).toBe(`${doc.shortTitle} — Vetinity`);
            });
        });
    }

    it('sürüm satırı: taslak etiketi yok; sürüm okunamazsa sabit sürüm yazılmaz', () => {
        expect(legalVersionLine(TERMS_OF_USE_DOCUMENT, '0.1')).toBe(`Sürüm: 0.1 · ${TERMS_OF_USE_DOCUMENT.statusLine}`);
        expect(legalVersionLine(TERMS_OF_USE_DOCUMENT, '1.0')).toBe(`Sürüm: 1.0 · ${TERMS_OF_USE_DOCUMENT.statusLine}`);
        expect(legalVersionLine(TERMS_OF_USE_DOCUMENT, null)).toBe(TERMS_OF_USE_DOCUMENT.statusLine);
    });

    it('sürüm isteği başarısızsa sayfa yine açılır', async () => {
        await harness.navigateByUrl(TERMS_OF_USE_DOCUMENT.path);
        http.expectOne(VERSIONS_URL).flush(null, { status: 500, statusText: 'err' });
        harness.detectChanges();

        expect(text('.legal-version-line')).toBe(TERMS_OF_USE_DOCUMENT.statusLine);
    });

    /** Belgenin okunan tüm metni: giriş, başlıklar, paragraflar ve maddeler. */
    const documentText = (doc: LegalDocumentDef): string =>
        [
            doc.title,
            doc.subtitle,
            doc.statusLine,
            ...(doc.intro ?? []).flatMap((p) => legalParagraphParts(p).map((part) => part.text)),
            ...doc.sections.flatMap((s) => [s.heading, ...(s.paragraphs ?? []).flatMap((p) => legalParagraphParts(p).map((part) => part.text)), ...(s.items ?? [])])
        ].join('\n');

    for (const doc of [PRIVACY_POLICY_DOCUMENT, TERMS_OF_USE_DOCUMENT, DATA_PROCESSING_AGREEMENT_DOCUMENT]) {
        it(`${doc.path}: metinlerde köşeli parantezli yer tutucu kalmadı; taslak/hukukçu ibaresi yok`, async () => {
            const content = documentText(doc);

            expect(content).not.toMatch(/\[[^\]]*\]/);
            expect(content).not.toMatch(/taslak metin|hukukçu/i);
            expect(doc.statusLine).toBe('Son güncelleme: 2026-11-23');

            await harness.navigateByUrl(doc.path);
            flushVersions();

            expect(root().querySelector('article')?.textContent ?? '').not.toMatch(/\[[^\]]*\]/);
        });
    }

    it('iletişim/KVKK başvuru adresi tanıtımdaki iletişim e-postasıdır; deneme süresi paketlerle aynıdır', () => {
        expect(PUBLIC_CONTACT_EMAIL).toBe(VETINITY_CONTACT_EMAIL);

        const privacy = documentText(PRIVACY_POLICY_DOCUMENT);

        expect(privacy).toContain(`İletişim: ${VETINITY_CONTACT_EMAIL}.`);
        expect(privacy).toContain(`${VETINITY_CONTACT_EMAIL} adresine başvurabilirsiniz`);
        expect(privacy).toContain('yalnız zorunlu çerezler kullanılır');
        expect(documentText(TERMS_OF_USE_DOCUMENT)).toContain(`Deneme süresi ${PRICING_TRIAL_DAYS} gündür`);
        expect(PRICING_PLAN_DEFS.every((p) => p.trialDays === PRICING_TRIAL_DAYS)).toBe(true);
    });

    it('e-posta sağlayıcısı Google (ABD) yurt dışı aktarımda ve alt işleyenlerde yazılır', () => {
        expect(documentText(PRIVACY_POLICY_DOCUMENT)).toContain('Yurt dışına aktarım: e-posta gönderimi için Google LLC (ABD)');
        expect(documentText(DATA_PROCESSING_AGREEMENT_DOCUMENT)).toContain('e-posta gönderimi için Google LLC, ABD');
        expect(documentText(DATA_PROCESSING_AGREEMENT_DOCUMENT)).toContain("Google LLC'nin (Amerika Birleşik Devletleri) e-posta altyapısıyla iletilir");
    });

    it('süreler kodda olmayan otomatik silme vaat etmez: salt okunurda veri silinmez, silme yazılı kapatma talebiyle başlar', () => {
        const terms = documentText(TERMS_OF_USE_DOCUMENT);
        const dpa = documentText(DATA_PROCESSING_AGREEMENT_DOCUMENT);

        expect(terms).toContain('hesap salt okunur olur; veriler silinmez ve Klinik bu süre boyunca verisini dışa aktarabilir');
        expect(terms).toContain('kapatılmasını yazılı olarak (e-postayla) talep ederse talepten itibaren 30 gün içinde');
        expect(dpa).toContain('veriler silinmez ve Klinik verisini dışa aktarabilir');
        expect(dpa).toContain('kapatılmasını yazılı olarak (e-postayla) talep ederse talepten itibaren 30 gün içinde');

        for (const content of [terms, dpa, documentText(PRIVACY_POLICY_DOCUMENT)]) {
            expect(content).not.toMatch(/90 gün boyunca saklanır|sona ermesinden 90 gün sonra/);
        }
    });

    it('unvan girilmeden taraf yalnız "Vetinity" yazılır; MERSİS satırı yok', () => {
        expect(VETINITY_LEGAL_ENTITY_NAME).toBeNull();
        expect(documentText(PRIVACY_POLICY_DOCUMENT)).toContain('Vetinity, 6698 sayılı Kanun kapsamında veri sorumlusudur.');
        expect(documentText(TERMS_OF_USE_DOCUMENT)).toContain("Bu şartlar, Vetinity ile Vetinity'yi kullanan");
        expect(documentText(DATA_PROCESSING_AGREEMENT_DOCUMENT)).toContain('Veri işleyen: Vetinity.');
        expect(documentText(PRIVACY_POLICY_DOCUMENT)).not.toContain('MERSİS');
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

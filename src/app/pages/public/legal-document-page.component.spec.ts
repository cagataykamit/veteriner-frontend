import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { Title } from '@angular/platform-browser';
import { appRoutes } from '@/app.routes';
import { LegalDocumentPageComponent } from './legal-document-page.component';
import {
    LEGAL_DRAFT_NOTICE,
    PRIVACY_POLICY_DOCUMENT,
    TERMS_OF_USE_DOCUMENT
} from '@/app/features/public/utils/legal-documents.utils';

describe('LegalDocumentPageComponent', () => {
    let harness: RouterTestingHarness;

    beforeEach(async () => {
        TestBed.configureTestingModule({ providers: [provideRouter(appRoutes)] });
        harness = await RouterTestingHarness.create();
    });

    const text = (selector: string): string => (harness.routeNativeElement?.querySelector(selector)?.textContent ?? '').trim();

    for (const doc of [PRIVACY_POLICY_DOCUMENT, TERMS_OF_USE_DOCUMENT]) {
        describe(doc.path, () => {
            it('girişsiz açılır ve belge sayfasını gösterir', async () => {
                const page = await harness.navigateByUrl(doc.path, LegalDocumentPageComponent);

                expect(TestBed.inject(Router).url).toBe(doc.path);
                expect(page.doc).toBe(doc);
            });

            it('başlık, sürüm satırı, taslak bandı ve tüm maddeler görünür', async () => {
                await harness.navigateByUrl(doc.path, LegalDocumentPageComponent);

                expect(text('h1')).toBe(doc.title);
                expect(text('.legal-version-line')).toBe(doc.versionLine);
                expect(LEGAL_DRAFT_NOTICE).not.toBeNull();
                expect(text('.legal-draft-notice')).toBe(LEGAL_DRAFT_NOTICE as string);
                const headings = Array.from(harness.routeNativeElement?.querySelectorAll('h2') ?? []).map((h) => h.textContent?.trim());

                expect(headings).toEqual(doc.sections.map((s) => s.heading));
            });

            it('sekme başlığını kısa adla ayarlar', async () => {
                await harness.navigateByUrl(doc.path, LegalDocumentPageComponent);

                expect(TestBed.inject(Title).getTitle()).toBe(`${doc.shortTitle} — Vetinity`);
            });
        });
    }

    it('köşeli parantezli alanlar olduğu gibi kalır', async () => {
        await harness.navigateByUrl(PRIVACY_POLICY_DOCUMENT.path, LegalDocumentPageComponent);

        expect(harness.routeNativeElement?.textContent).toContain('[Şirket unvanı], [adres]');
    });

    it('kullanım şartları gizlilik politikasına bağlantı verir', async () => {
        await harness.navigateByUrl(TERMS_OF_USE_DOCUMENT.path, LegalDocumentPageComponent);

        const link = harness.routeNativeElement?.querySelector('main a[href="/gizlilik"]');

        expect(link?.textContent?.trim()).toBe('gizlilik politikası');
    });

    it('alt bilgide iki hukuki sayfaya bağlantı vardır', async () => {
        await harness.navigateByUrl(TERMS_OF_USE_DOCUMENT.path, LegalDocumentPageComponent);

        const footer = harness.routeNativeElement?.querySelector('footer');

        expect(footer?.querySelector('a[href="/gizlilik"]')?.textContent?.trim()).toBe('Gizlilik Politikası');
        expect(footer?.querySelector('a[href="/kullanim-sartlari"]')?.textContent?.trim()).toBe('Kullanım Şartları');
    });
});

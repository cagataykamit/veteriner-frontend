import type { MockedObject } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import {
    PORTAL_LEGAL_DRAFT_NOTICE,
    PORTAL_PRIVACY_DOCUMENT,
    PORTAL_TERMS_DOCUMENT,
    PORTAL_VETINITY_CONTACT_EMAIL,
    PORTAL_VETINITY_LEGAL_ENTITY_NAME,
    type PortalLegalDocument,
    type PortalLegalParagraph,
    portalLegalVersionLine
} from './portal-legal-documents';
import { PortalLegalPageComponent } from './portal-legal-page.component';
import { PortalLegalApi } from './portal-legal.api';

describe('PortalLegalPageComponent (sürüm gösterimi)', () => {
    let fixture: ComponentFixture<PortalLegalPageComponent>;
    let el: HTMLElement;
    let legal: MockedObject<PortalLegalApi>;

    async function open(documentType: 'PortalTerms' | 'PortalPrivacy'): Promise<void> {
        fixture = TestBed.createComponent(PortalLegalPageComponent);
        fixture.componentRef.setInput('documentType', documentType);
        el = fixture.nativeElement;
        fixture.detectChanges();
        await fixture.whenStable();
    }

    beforeEach(async () => {
        legal = {
            documents: vi.fn().mockName('PortalLegalApi.documents')
        } as unknown as MockedObject<PortalLegalApi>;
        await TestBed.configureTestingModule({
            imports: [PortalLegalPageComponent],
            providers: [provideRouter([]), { provide: PortalLegalApi, useValue: legal }]
        }).compileComponents();
    });

    afterEach(() => fixture?.destroy());

    it('sürüm numarasını backend listesinden gösterir', async () => {
        legal.documents.mockReturnValue(
            of([
                { documentType: 'PortalTerms', version: '0.1' },
                { documentType: 'PortalPrivacy', version: '1.0' }
            ])
        );
        await open('PortalPrivacy');

        expect(el.querySelector('h1')?.textContent).toContain(PORTAL_PRIVACY_DOCUMENT.title);
        expect(el.querySelector('[data-testid=legal-version]')?.textContent?.trim()).toBe(`Sürüm: 1.0 · ${PORTAL_PRIVACY_DOCUMENT.statusLine}`);
    });

    it('taslak bandı ve taslak etiketi yok; metin bölümleri gösterilir', async () => {
        legal.documents.mockReturnValue(of([{ documentType: 'PortalTerms', version: '0.1' }]));
        await open('PortalTerms');

        expect(el.querySelector('[data-testid=legal-version]')?.textContent?.trim()).toBe(`Sürüm: 0.1 · ${PORTAL_TERMS_DOCUMENT.statusLine}`);
        expect(PORTAL_LEGAL_DRAFT_NOTICE).toBeNull();
        expect(el.querySelector('.portal-draft-band')).toBeNull();
        expect(el.querySelectorAll('.portal-legal-text h3').length).toBe(PORTAL_TERMS_DOCUMENT.sections.length);
        expect(el.querySelector('.portal-legal-text a')?.getAttribute('href')).toBe('/legal/privacy');
    });

    it('ayrı "Geri" düğmesi yok; marka adı ana sayfaya götürür', async () => {
        legal.documents.mockReturnValue(of([]));
        await open('PortalPrivacy');

        expect(el.querySelector('button')).toBeNull();
        expect(el.querySelector('[data-testid=brand-home]')?.getAttribute('href')).toBe('/');
    });

    /** Belgenin tüm metni: giriş, başlıklar, paragraflar, maddeler ve kapanış. */
    const documentText = (doc: PortalLegalDocument): string => {
        const flat = (p: PortalLegalParagraph): string => (typeof p === 'string' ? p : p.map((part) => (typeof part === 'string' ? part : part.text)).join(''));

        return [doc.title, doc.statusLine, ...doc.intro.map(flat), ...doc.sections.flatMap((s) => [s.heading ?? '', ...[...(s.paragraphs ?? []), ...(s.items ?? []), ...(s.closing ?? [])].map(flat)])].join('\n');
    };

    for (const doc of [PORTAL_TERMS_DOCUMENT, PORTAL_PRIVACY_DOCUMENT]) {
        it(`${doc.documentType}: metinlerde köşeli parantezli yer tutucu kalmadı; taslak/hukukçu ibaresi yok`, async () => {
            const content = documentText(doc);

            expect(content).not.toMatch(/\[[^\]]*\]/);
            expect(content).not.toMatch(/taslak|hukukçu|MERSİS/i);
            expect(doc.statusLine).toBe('Son güncelleme: 2026-11-23');

            legal.documents.mockReturnValue(of([]));
            await open(doc.documentType);

            expect(el.querySelector('.portal-legal-text')?.textContent ?? '').not.toMatch(/\[[^\]]*\]/);
        });
    }

    it('iletişim ve başvuru adresi Vetinity e-postası; unvan girilmeden taraf "Vetinity"', () => {
        const terms = documentText(PORTAL_TERMS_DOCUMENT);
        const privacy = documentText(PORTAL_PRIVACY_DOCUMENT);

        expect(PORTAL_VETINITY_LEGAL_ENTITY_NAME).toBeNull();
        expect(terms).toContain('Bu şartlar, Vetinity ile portal hesabı açan');
        expect(terms).toContain(`İletişim: Vetinity, ${PORTAL_VETINITY_CONTACT_EMAIL}.`);
        expect(terms).toContain('Türkiye Cumhuriyeti mahkemeleri ve icra daireleri yetkilidir; tüketici işlemlerinde emredici hükümler saklıdır.');
        expect(privacy).toContain(`Portal hesabı verilerinin veri sorumlusu: Vetinity. İletişim: ${PORTAL_VETINITY_CONTACT_EMAIL}.`);
        expect(privacy).toContain(`Portal hesabı verileri için: ${PORTAL_VETINITY_CONTACT_EMAIL}.`);
    });

    it('e-posta sağlayıcısı Google (ABD) hizmet sağlayıcılarda ve yurt dışı aktarımda yazılır', () => {
        const privacy = documentText(PORTAL_PRIVACY_DOCUMENT);

        expect(privacy).toContain('e-posta gönderimi (Google LLC, ABD)');
        expect(privacy).toContain('Yurt dışına aktarım: giriş kodu, parola sıfırlama ve hatırlatma e-postaları için Google LLC (ABD)');
    });

    it('sürüm alınamazsa metin yine görünür, sürüm uydurulmaz', async () => {
        legal.documents.mockReturnValue(throwError(() => new Error('ağ')));
        await open('PortalTerms');

        expect(el.querySelector('[data-testid=legal-version]')?.textContent?.trim()).toBe(portalLegalVersionLine(PORTAL_TERMS_DOCUMENT, null));
        expect(el.textContent).toContain('1. Taraflar ve kapsam');
    });
});

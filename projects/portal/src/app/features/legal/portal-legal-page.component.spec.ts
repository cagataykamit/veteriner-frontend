import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { PORTAL_LEGAL_DRAFT_NOTICE, PORTAL_PRIVACY_DOCUMENT, PORTAL_TERMS_DOCUMENT, portalLegalVersionLine } from './portal-legal-documents';
import { PortalLegalPageComponent } from './portal-legal-page.component';
import { PortalLegalApi } from './portal-legal.api';

describe('PortalLegalPageComponent (sürüm gösterimi)', () => {
    let fixture: ComponentFixture<PortalLegalPageComponent>;
    let el: HTMLElement;
    let legal: jasmine.SpyObj<PortalLegalApi>;

    async function open(documentType: 'PortalTerms' | 'PortalPrivacy'): Promise<void> {
        fixture = TestBed.createComponent(PortalLegalPageComponent);
        fixture.componentRef.setInput('documentType', documentType);
        el = fixture.nativeElement;
        fixture.detectChanges();
        await fixture.whenStable();
    }

    beforeEach(async () => {
        legal = jasmine.createSpyObj<PortalLegalApi>('PortalLegalApi', ['documents']);
        await TestBed.configureTestingModule({
            imports: [PortalLegalPageComponent],
            providers: [provideRouter([]), { provide: PortalLegalApi, useValue: legal }]
        }).compileComponents();
    });

    afterEach(() => fixture?.destroy());

    it('sürüm numarasını backend listesinden gösterir; 0.x taslak olarak işaretlenir', async () => {
        legal.documents.and.returnValue(
            of([
                { documentType: 'PortalTerms', version: '0.1' },
                { documentType: 'PortalPrivacy', version: '1.0' }
            ])
        );
        await open('PortalPrivacy');

        expect(el.querySelector('h1')?.textContent).toContain(PORTAL_PRIVACY_DOCUMENT.title);
        expect(el.querySelector('[data-testid=legal-version]')?.textContent?.trim()).toBe(`Sürüm: 1.0 · ${PORTAL_PRIVACY_DOCUMENT.statusLine}`);
    });

    it('taslak bandı tek ayardan gelir ve metin bölümleri gösterilir', async () => {
        legal.documents.and.returnValue(of([{ documentType: 'PortalTerms', version: '0.1' }]));
        await open('PortalTerms');

        expect(el.querySelector('[data-testid=legal-version]')?.textContent?.trim()).toBe(`Sürüm: 0.1 (taslak) · ${PORTAL_TERMS_DOCUMENT.statusLine}`);
        expect(el.querySelector('.portal-draft-band')?.textContent?.trim()).toBe(PORTAL_LEGAL_DRAFT_NOTICE!);
        expect(el.querySelectorAll('.portal-legal-text h3').length).toBe(PORTAL_TERMS_DOCUMENT.sections.length);
        expect(el.querySelector('.portal-legal-text a')?.getAttribute('href')).toBe('/legal/privacy');
    });

    it('sürüm alınamazsa metin yine görünür, sürüm uydurulmaz', async () => {
        legal.documents.and.returnValue(throwError(() => new Error('ağ')));
        await open('PortalTerms');

        expect(el.querySelector('[data-testid=legal-version]')?.textContent?.trim()).toBe(portalLegalVersionLine(PORTAL_TERMS_DOCUMENT, null));
        expect(el.textContent).toContain('1. Taraflar ve kapsam');
    });
});

import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { clearEDocumentResume, consumeEDocumentResume, eDocumentResumeUrl, isEDocumentReturnUrl, readEDocumentResume, storeEDocumentResume, withoutEDocumentResumeParam } from './e-document-resume';

describe('e-document-resume', () => {
    afterEach(() => clearEDocumentResume());

    it('yalnız panel içi dönüş adresi kabul edilir', () => {
        expect(isEDocumentReturnUrl('/panel/charges?clientId=x')).toBe(true);
        expect(isEDocumentReturnUrl('https://example.com/panel/charges')).toBe(false);
        expect(isEDocumentReturnUrl('//example.com/panel')).toBe(false);
        expect(isEDocumentReturnUrl('/login')).toBe(false);
        expect(isEDocumentReturnUrl(null)).toBe(false);
    });

    it('seçim saklanır, bir saat sonra unutulur', () => {
        storeEDocumentResume({ chargeIds: ['c1'] }, '/panel/charges', 1_000);

        expect(readEDocumentResume(1_000 + 60_000)?.source).toEqual({ chargeIds: ['c1'] });
        expect(readEDocumentResume(1_000 + 60 * 60 * 1000 + 1)).toBeNull();
    });

    it('dönüş işareti eklenir ve silinir, diğer sorgu parametreleri kalır', () => {
        TestBed.configureTestingModule({ providers: [provideRouter([])] });
        const router = TestBed.inject(Router);

        expect(eDocumentResumeUrl(router, '/panel/charges?clientId=x')).toBe('/panel/charges?clientId=x&resumeEDocument=1');
        expect(withoutEDocumentResumeParam(router, '/panel/charges?clientId=x&resumeEDocument=1')).toBe('/panel/charges?clientId=x');
    });

    it('çağıran sayfa dönüş işaretiyle seçimi bir kez alır', () => {
        TestBed.configureTestingModule({ providers: [provideRouter([])] });
        const router = TestBed.inject(Router);
        const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);
        const route = (resume: string | null) => ({ snapshot: { queryParamMap: convertToParamMap(resume ? { resumeEDocument: resume } : {}) } }) as unknown as ActivatedRoute;

        vi.spyOn(router, 'url', 'get').mockReturnValue('/panel/charges?resumeEDocument=1');
        storeEDocumentResume({ chargeIds: ['c1'] }, '/panel/charges');

        expect(consumeEDocumentResume(route(null), router)).toBeNull();
        expect(consumeEDocumentResume(route('1'), router)).toEqual({ chargeIds: ['c1'] });
        expect(navigate).toHaveBeenCalledWith([], expect.objectContaining({ queryParams: { resumeEDocument: null }, replaceUrl: true }));
        expect(readEDocumentResume()).toBeNull();
        expect(consumeEDocumentResume(route('1'), router)).toBeNull();
    });

    it('başka sayfadan kalan seçim bu sayfada açılmaz', () => {
        TestBed.configureTestingModule({ providers: [provideRouter([])] });
        const router = TestBed.inject(Router);

        vi.spyOn(router, 'navigate').mockResolvedValue(true);
        vi.spyOn(router, 'url', 'get').mockReturnValue('/panel/e-documents?resumeEDocument=1');
        storeEDocumentResume({ chargeIds: ['c1'] }, '/panel/charges');

        expect(consumeEDocumentResume({ snapshot: { queryParamMap: convertToParamMap({ resumeEDocument: '1' }) } } as unknown as ActivatedRoute, router)).toBeNull();
    });
});

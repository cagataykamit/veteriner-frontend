import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { AuthService } from '@/app/core/auth/auth.service';
import { LAB_RESULTS_UPDATE_CLAIM } from '@/app/core/auth/operation-claims.constants';
import { isLastRowAction, isRightAfterDetail, rowDangerActions, rowEditActions } from '@/app/shared/ui/row-action-button/row-action-button.testing';
import { ReasonConfirmDialogComponent } from '@/app/shared/ui/reason-confirm-dialog/reason-confirm-dialog.component';
import type { LabResultListItemVm } from '@/app/entities/lab-result/models/lab-result-vm.model';
import { LabResultsService } from '@/app/entities/lab-result/services/lab-results.service';
import { TenantReadOnlyContextService } from '@/app/core/tenant/tenant-read-only-context.service';
import { formatUtcIsoAsLocalDateTimeDisplay } from '@/app/shared/utils/date.utils';
import { LabResultsListPageComponent } from './lab-results-list-page.component';

const row = (over: Partial<LabResultListItemVm>): LabResultListItemVm => ({
    id: 'l1',
    clinicId: 'c1',
    petId: 'p1',
    petName: 'Pamuk',
    clientId: 'cl1',
    clientName: 'Ayşe',
    resultDateUtc: null,
    requestedAtUtc: '2026-10-10T08:00:00Z',
    status: 'Requested',
    awaitingInterpretation: false,
    testName: 'Hemogram',
    examinationId: null,
    ...over
});

describe('LabResultsListPageComponent — istem ve sonuç tarihi', () => {
    const setup = (items: LabResultListItemVm[]) => {
        const getLabResults = vi
            .fn()
            .mockName('getLabResults')
            .mockReturnValue(of({ items, page: 1, pageSize: 10, totalItems: items.length, totalPages: 1 }));

        TestBed.configureTestingModule({
            imports: [LabResultsListPageComponent],
            providers: [
                provideRouter([]),
                { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap({}) } } },
                { provide: LabResultsService, useValue: { getLabResults } },
                { provide: AuthService, useValue: { hasOperationClaim: () => true } },
                { provide: TenantReadOnlyContextService, useValue: { mutationBlocked: () => false } }
            ]
        });
        const fixture = TestBed.createComponent(LabResultsListPageComponent);

        fixture.detectChanges();

        return { fixture, getLabResults, el: fixture.nativeElement as HTMLElement };
    };

    it('süzgeç istem tarihine göre olduğu için etiketler bunu söyler; tabloda istem ve sonuç tarihi ayrı sütundur', () => {
        const resulted = row({ id: 'l2', status: 'Resulted', resultDateUtc: '2026-10-12T14:30:00Z' });
        const { el } = setup([row({}), resulted]);

        expect(el.querySelector('label[for="lrFrom"]')?.textContent).toContain('İstem tarihi');
        expect(el.querySelector('label[for="lrTo"]')?.textContent).toContain('İstem tarihi');

        const headers = Array.from(el.querySelectorAll('th')).map((th) => th.textContent?.trim());

        expect(headers).toContain('İstem tarihi');
        expect(headers).toContain('Sonuç tarihi');
        expect(headers).not.toContain('Tarih');

        const requested = Array.from(el.querySelectorAll('[data-testid="lr-requested-at"]')).map((td) => td.textContent?.trim());
        const results = Array.from(el.querySelectorAll('[data-testid="lr-result-date"]')).map((td) => td.textContent?.trim());

        expect(requested).toEqual([formatUtcIsoAsLocalDateTimeDisplay('2026-10-10T08:00:00Z'), formatUtcIsoAsLocalDateTimeDisplay('2026-10-10T08:00:00Z')]);
        expect(results[1]).toBe(formatUtcIsoAsLocalDateTimeDisplay('2026-10-12T14:30:00Z'));
        expect(results[0], 'sonucu gelmemiş istemde sonuç tarihi istem tarihiyle doldurulmaz').toBe(formatUtcIsoAsLocalDateTimeDisplay(null));
    });
});

/** ADR-026 madde 6: Düzenle ("Sonuç gir") simge düğmesidir; detay sayfasındaki gibi iptalde gizli, aynı yetki ve salt okunur koşuluyla Detay'ın yanındadır. */
describe('LabResultsListPageComponent — satırda Düzenle', () => {
    const create = (items: LabResultListItemVm[], claims: string[], mutationBlocked = false): HTMLElement => {
        TestBed.configureTestingModule({
            imports: [LabResultsListPageComponent],
            providers: [
                provideRouter([]),
                { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap({}) } } },
                { provide: LabResultsService, useValue: { getLabResults: () => of({ items, page: 1, pageSize: 10, totalItems: items.length, totalPages: 1 }) } },
                { provide: AuthService, useValue: { hasOperationClaim: (c: string) => claims.includes(c) } },
                { provide: TenantReadOnlyContextService, useValue: { mutationBlocked: () => mutationBlocked } }
            ]
        });
        const fixture = TestBed.createComponent(LabResultsListPageComponent);

        fixture.detectChanges();

        return fixture.nativeElement as HTMLElement;
    };

    it("güncelleme yetkisi varsa tablo ve mobil kartta Detay'dan hemen sonra düzenleme sayfasına gider; istemde etiket Sonuç gir", () => {
        const el = create([row({}), row({ id: 'l2', status: 'Resulted' })], [LAB_RESULTS_UPDATE_CLAIM]);
        const edits = rowEditActions(el);

        expect(edits.length, '2 satır × tablo + mobil kart').toBe(4);
        expect(edits.every((e) => isRightAfterDetail(e))).toBe(true);
        expect(edits.map((e) => e.getAttribute('href'))).toEqual(['/panel/lab-results/l1/edit', '/panel/lab-results/l2/edit', '/panel/lab-results/l1/edit', '/panel/lab-results/l2/edit']);
        expect(edits.map((e) => e.getAttribute('aria-label'))).toEqual(['Sonuç gir', 'Düzenle', 'Sonuç gir', 'Düzenle']);
        expect(el.querySelector('a.text-primary[href$="/edit"]'), 'eski metin bağlantısı kalmaz').toBeNull();
    });

    it('iptal edilmiş sonuçta ve yetki yokken Düzenle görünmez; salt okunur kiracıda pasiftir', () => {
        expect(rowEditActions(create([row({ status: 'Cancelled' })], [LAB_RESULTS_UPDATE_CLAIM])).length).toBe(0);

        TestBed.resetTestingModule();
        expect(rowEditActions(create([row({})], [])).length).toBe(0);

        TestBed.resetTestingModule();
        const readOnly = rowEditActions(create([row({})], [LAB_RESULTS_UPDATE_CLAIM], true));

        expect(readOnly.length).toBe(2);
        expect(readOnly.every((e) => e.tagName === 'BUTTON' && e.getAttribute('aria-disabled') === 'true')).toBe(true);
        expect(readOnly[0].getAttribute('aria-label')).toBe('Sonuç gir (salt okunur)');
    });
});

/** ADR-026 madde 7: detaydaki "İptal et" ile aynı yetki, durum ve diyalog; onaylanmadan servis çağrılmaz. */
describe('LabResultsListPageComponent — satırda İptal', () => {
    const create = (items: LabResultListItemVm[], claims: string[], mutationBlocked = false) => {
        const service = {
            getLabResults: vi
                .fn()
                .mockName('getLabResults')
                .mockReturnValue(of({ items, page: 1, pageSize: 10, totalItems: items.length, totalPages: 1 })),
            getLabResultById: vi
                .fn()
                .mockName('getLabResultById')
                .mockReturnValue(of({ rowVersion: 'V7' })),
            cancelLabResult: vi
                .fn()
                .mockName('cancelLabResult')
                .mockReturnValue(of(void 0))
        };

        TestBed.configureTestingModule({
            imports: [LabResultsListPageComponent],
            providers: [
                provideRouter([]),
                { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap({}) } } },
                { provide: LabResultsService, useValue: service },
                { provide: AuthService, useValue: { hasOperationClaim: (c: string) => claims.includes(c) } },
                { provide: TenantReadOnlyContextService, useValue: { mutationBlocked: () => mutationBlocked } }
            ]
        });
        const fixture = TestBed.createComponent(LabResultsListPageComponent);

        fixture.detectChanges();

        return { fixture, service, el: fixture.nativeElement as HTMLElement };
    };

    it('istem ve sonuçta, yetkiyle satırın son eylemidir; iptal edilmişte, yetkisizken ve salt okunurda yoktur', () => {
        const { el } = create([row({}), row({ id: 'l2', status: 'Resulted' }), row({ id: 'l3', status: 'Cancelled' })], [LAB_RESULTS_UPDATE_CLAIM]);
        const voids = rowDangerActions(el);

        expect(voids.length, '2 iptal edilebilir satır × tablo + mobil kart').toBe(4);
        expect(voids.every((v) => v.querySelector('.fa-ban') && v.getAttribute('aria-label') === 'İptal et' && isLastRowAction(v))).toBe(true);

        TestBed.resetTestingModule();
        expect(rowDangerActions(create([row({})], []).el).length).toBe(0);

        TestBed.resetTestingModule();
        expect(rowDangerActions(create([row({})], [LAB_RESULTS_UPDATE_CLAIM], true).el).length).toBe(0);
    });

    it('tıklamada detaydaki iptal diyaloğu açılır, onaylanmadan servis çağrılmaz; onayda güncel sürümle iptal edilir ve liste yenilenir', () => {
        const { fixture, service, el } = create([row({})], [LAB_RESULTS_UPDATE_CLAIM]);

        rowDangerActions(el)[0].click();
        fixture.detectChanges();

        const dialog = fixture.debugElement.query((d) => d.name === 'app-reason-confirm-dialog').componentInstance as ReasonConfirmDialogComponent;

        expect(dialog.visible()).toBe(true);
        expect(dialog.header()).toBe('Lab kaydını iptal et');
        expect(dialog.summary()).toBe('Hemogram · Pamuk');
        expect(service.cancelLabResult).not.toHaveBeenCalled();

        service.getLabResults.mockClear();
        dialog.form.controls.reason.setValue('Yanlış hastaya istendi');
        dialog.onSubmit();

        expect(service.getLabResultById).toHaveBeenCalledWith('l1');
        expect(service.cancelLabResult).toHaveBeenCalledTimes(1);
        expect(service.cancelLabResult).toHaveBeenCalledWith('l1', 'Yanlış hastaya istendi', 'V7');
        expect(service.getLabResults).toHaveBeenCalledTimes(1);
    });
});

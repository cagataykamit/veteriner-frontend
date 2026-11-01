import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { BehaviorSubject, of, throwError } from 'rxjs';
import { MenuBadgeFeed } from '@/app/core/routing/menu-badge-feed';
import type { StaffDataRequestVm } from '@/app/entities/owner-portal/models/owner-portal.model';
import { PortalInboxService } from '@/app/entities/owner-portal/services/owner-portal.service';
import { PortalInboxError } from '@/app/entities/owner-portal/utils/owner-portal-error.utils';
import { PortalInboxPageComponent } from './portal-inbox-page.component';

const row = (id: string, over: Partial<StaffDataRequestVm> = {}): StaffDataRequestVm => ({
    id,
    clinicId: 'c1',
    clinicName: 'Merkez',
    clientId: 'cl-1',
    clientName: 'Ayşe Yılmaz',
    type: 'Erasure',
    status: 'Open',
    message: 'Kayıtlarımın silinmesini istiyorum.',
    createdAtUtc: '2026-10-01T09:00:00Z',
    dueAtUtc: '2026-10-31T09:00:00Z',
    isOverdue: true,
    handledByUserId: null,
    handledAtUtc: null,
    responseNote: null,
    ...over
});

describe('PortalInboxPageComponent', () => {
    let fixture: ComponentFixture<PortalInboxPageComponent>;
    let service: { listDataRequests: ReturnType<typeof vi.fn>; summary: ReturnType<typeof vi.fn>; updateDataRequestStatus: ReturnType<typeof vi.fn> };
    let query: BehaviorSubject<ReturnType<typeof convertToParamMap>>;
    let el: HTMLElement;

    const open = (id: string | null) => query.next(convertToParamMap(id ? { requestId: id } : {}));
    const byTestId = (id: string) => el.querySelector<HTMLElement>(`[data-testid="${id}"]`);

    beforeEach(async () => {
        service = {
            listDataRequests: vi.fn().mockReturnValue(of({ items: [row('d1'), row('d2', { status: 'Completed', isOverdue: false, responseNote: 'Silindi.' })], totalItems: 2, page: 1, pageSize: 20 })),
            summary: vi.fn().mockReturnValue(of({ openDataRequestCount: 1, overdueDataRequestCount: 1 })),
            updateDataRequestStatus: vi.fn()
        };
        query = new BehaviorSubject(convertToParamMap({}));
        await TestBed.configureTestingModule({
            imports: [PortalInboxPageComponent],
            providers: [
                provideRouter([]),
                { provide: ActivatedRoute, useValue: { queryParamMap: query.asObservable(), snapshot: { queryParamMap: convertToParamMap({}) } } },
                { provide: PortalInboxService, useValue: service }
            ]
        }).compileComponents();
        // Adres değişimi sorgu parametresine yansır (gerçek yönlendirme yok).
        vi.spyOn(TestBed.inject(Router), 'navigate').mockImplementation((_c, extras) => {
            open((extras?.queryParams?.['requestId'] as string | null) ?? null);

            return Promise.resolve(true);
        });
        fixture = TestBed.createComponent(PortalInboxPageComponent);
        el = fixture.nativeElement;
        fixture.detectChanges();
    });

    it('talepleri listeler: müşteri kartı bağlantısı, tür, durum ve süresi geçti rozeti; özet menü sayacını besler', () => {
        const rows = el.querySelectorAll('[data-testid="data-request-row"]');

        expect(rows).toHaveLength(2);
        expect(rows[0].querySelector('[data-testid="data-request-client"]')?.getAttribute('href')).toBe('/panel/clients/cl-1');
        expect(rows[0].textContent).toContain('Silme');
        expect(rows[0].textContent).toContain('Yeni');
        expect(rows[0].querySelector('[data-testid="data-request-overdue"]')).not.toBeNull();
        expect(rows[1].querySelector('[data-testid="data-request-take"]')).toBeNull();
        expect(byTestId('portal-inbox-summary')?.textContent).toContain('Süresi geçen: 1');
        expect(TestBed.inject(MenuBadgeFeed).value('openPortalDataRequests')).toBe(1);
        expect(service.listDataRequests).toHaveBeenCalledWith({ status: null, page: 1, pageSize: 20 });
    });

    it('durum filtresi sorguya geçer', () => {
        fixture.componentInstance.onStatusChange('InProgress');

        expect(service.listDataRequests).toHaveBeenLastCalledWith({ status: 'InProgress', page: 1, pageSize: 20 });
    });

    it('satırdan "Ele al" talebi InProgress yapar ve satırı günceller', () => {
        service.updateDataRequestStatus.mockReturnValue(of(row('d1', { status: 'InProgress' })));

        byTestId('data-request-take')!.click();
        fixture.detectChanges();

        expect(service.updateDataRequestStatus).toHaveBeenCalledWith('d1', 'InProgress', null);
        expect(el.querySelectorAll('[data-testid="data-request-row"]')[0].textContent).toContain('Ele alındı');
    });

    it('tamamlamada yanıt notu zorunludur, sahibe e-postayla gideceği yazılır; not gönderilir', () => {
        const cmp = fixture.componentInstance;

        service.updateDataRequestStatus.mockReturnValue(of(row('d1', { status: 'Completed', responseNote: 'Kayıtlar silindi.' })));
        byTestId('data-request-complete')!.click();
        fixture.detectChanges();

        expect(cmp.selected()?.id).toBe('d1');
        expect(cmp.closing()).toBe('Completed');
        expect(document.body.querySelector('[data-testid="data-request-note-hint"]')?.textContent).toContain('hasta sahibine e-postayla gönderilir');

        cmp.submitClosing();
        expect(service.updateDataRequestStatus).not.toHaveBeenCalled();

        cmp.note.set('  Kayıtlar silindi.  ');
        cmp.submitClosing();
        fixture.detectChanges();

        expect(service.updateDataRequestStatus).toHaveBeenCalledWith('d1', 'Completed', 'Kayıtlar silindi.');
        expect(cmp.selected()).toBeNull();
        expect(cmp.items()[0].status).toBe('Completed');
    });

    it('?requestId= ile talep penceresi açılır', () => {
        open('d2');
        fixture.detectChanges();

        expect(fixture.componentInstance.selected()?.id).toBe('d2');
        expect(document.body.querySelector('[data-testid="data-request-message"]')?.textContent).toContain('Kayıtlarımın silinmesini istiyorum.');
    });

    it('bayat talepte liste yenilenir ve mesaj gösterilir', () => {
        const cmp = fixture.componentInstance;

        service.updateDataRequestStatus.mockReturnValue(throwError(() => new PortalInboxError('Talebin durumu bu sırada değişti; liste yenilendi.', 'PortalInbox.InvalidStatusTransition', true)));
        cmp.startClosing(cmp.items()[0], 'Rejected');
        cmp.note.set('Yasal saklama süresi dolmadı.');
        cmp.submitClosing();

        expect(service.listDataRequests).toHaveBeenCalledTimes(2);
        expect(cmp.dialogError()).toContain('liste yenilendi');
    });
});

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import type { CustomDevelopmentRequestDto } from '@/app/entities/custom-development/models/custom-development-request.model';
import {
    CustomDevelopmentAdminService,
    type AdminCustomDevelopmentRequestDto,
    type AdminCustomDevelopmentRequestPage
} from '@/app/features/custom-development-admin/services/custom-development-admin.service';
import { CustomDevelopmentAdminPageComponent } from './custom-development-admin-page.component';

const request = (over: Partial<CustomDevelopmentRequestDto> = {}): CustomDevelopmentRequestDto => ({
    id: 'r1',
    requestTitle: 'Gün sonu raporuna hekim sütunu',
    requestText: 'Hekim adı sütunu eklensin.',
    targetKind: 'Report',
    requestTarget: 'Gün sonu raporu',
    priority: 'High',
    status: 'InReview',
    isOpen: true,
    createdByUserId: 'u1',
    createdByName: 'Ayşe',
    createdAtUtc: '2026-11-07T10:00:00Z',
    statusChangedAtUtc: null,
    decisionReason: null,
    responseNote: null,
    ...over
});

const row = (over: Partial<AdminCustomDevelopmentRequestDto> = {}): AdminCustomDevelopmentRequestDto => ({
    tenantId: 't1',
    tenantName: 'Pati Kliniği',
    request: request(),
    nextStatuses: ['Planned', 'OutOfScope'],
    ...over
});

const page = (items: AdminCustomDevelopmentRequestDto[], totalPages = 1): AdminCustomDevelopmentRequestPage => ({
    items,
    page: 1,
    pageSize: 50,
    totalItems: items.length,
    totalPages
});

describe('CustomDevelopmentAdminPageComponent', () => {
    let fixture: ComponentFixture<CustomDevelopmentAdminPageComponent>;
    let service: { list: ReturnType<typeof vi.fn>; changeStatus: ReturnType<typeof vi.fn> };
    let el: HTMLElement;

    async function create(): Promise<void> {
        await TestBed.configureTestingModule({
            imports: [CustomDevelopmentAdminPageComponent],
            providers: [provideRouter([]), { provide: CustomDevelopmentAdminService, useValue: service }]
        }).compileComponents();
        fixture = TestBed.createComponent(CustomDevelopmentAdminPageComponent);
        el = fixture.nativeElement;
        fixture.detectChanges();
        await fixture.whenStable();
        fixture.detectChanges();
    }

    beforeEach(() => {
        service = {
            list: vi.fn().mockReturnValue(
                of(
                    page([
                        row(),
                        row({
                            tenantName: 'Mavi Veteriner',
                            request: request({ id: 'r2', status: 'Completed', isOpen: false, responseNote: 'Aralık sürümünde' }),
                            nextStatuses: []
                        })
                    ])
                )
            ),
            changeStatus: vi.fn().mockReturnValue(of(row({ request: request({ status: 'OutOfScope' }), nextStatuses: [] })))
        };
    });

    it('varsayılan filtre açık talepler; satırda kiracı, durum ve not görünür, kapanmış talepte durum düğmesi yok', async () => {
        await create();

        expect(service.list).toHaveBeenCalledWith('open', 1);
        const rows = el.querySelectorAll('[data-testid="cda-row"]');

        expect(rows.length).toBe(2);
        expect(rows[0].textContent).toContain('Pati Kliniği');
        expect(rows[0].textContent).toContain('İnceleniyor');
        expect(rows[0].querySelector('[data-testid="cda-change"]')).not.toBeNull();
        expect(rows[1].textContent).toContain('Tamamlandı');
        expect(rows[1].textContent).toContain('Aralık sürümünde');
        expect(rows[1].querySelector('[data-testid="cda-change"]')).toBeNull();
    });

    it('filtre değişince ilk sayfa o filtreyle yüklenir', async () => {
        await create();

        fixture.componentInstance.onFilterChange('OutOfScope');

        expect(service.list).toHaveBeenLastCalledWith('OutOfScope', 1);
    });

    it('yalnız sunucunun verdiği sonraki durumlar sunulur; kapsam dışında gerekçe zorunlu', async () => {
        await create();
        const p = fixture.componentInstance;

        p.openChange(row());
        fixture.detectChanges();

        expect(p.nextOptions().map((o) => o.value)).toEqual(['Planned', 'OutOfScope']);
        expect(p.target()).toBeNull();
        expect(p.canSave()).toBe(false);

        p.target.set('OutOfScope');
        expect(p.canSave()).toBe(false);

        p.reason.set('  Vetinity dışı sistem  ');
        p.note.set('');
        expect(p.canSave()).toBe(true);

        p.save();
        fixture.detectChanges();

        expect(service.changeStatus).toHaveBeenCalledWith('r1', { status: 'OutOfScope', decisionReason: 'Vetinity dışı sistem', responseNote: null });
        expect(p.editing()).toBeNull();
        expect(service.list).toHaveBeenCalledTimes(2);
        expect(el.querySelector('[data-testid="cda-message"]')?.textContent).toContain('kapsam dışı olarak kaydedildi');
    });

    it('tek sonraki durum varsa seçili gelir; gerekçe gönderilmez', async () => {
        await create();
        const p = fixture.componentInstance;

        p.openChange(row({ request: request({ status: 'Planned' }), nextStatuses: ['Completed'] }));
        p.reason.set('kalmış metin');
        p.note.set('Yayında');
        p.save();

        expect(service.changeStatus).toHaveBeenCalledWith('r1', { status: 'Completed', decisionReason: null, responseNote: 'Yayında' });
    });

    it('sunucu reddederse hata diyalogda kalır ve liste yenilenir', async () => {
        service.changeStatus.mockReturnValue(throwError(() => new Error('Talep bu duruma geçemez; başka biri değiştirmiş olabilir, liste yenilendi.')));
        await create();
        const p = fixture.componentInstance;

        p.openChange(row());
        p.target.set('Planned');
        p.save();
        fixture.detectChanges();

        expect(p.editing()).not.toBeNull();
        expect(p.dialogError()).toContain('bu duruma geçemez');
        expect(service.list).toHaveBeenCalledTimes(2);
    });
});

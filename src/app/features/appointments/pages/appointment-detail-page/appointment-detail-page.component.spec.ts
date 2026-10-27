import type { Mock } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthService } from '@/app/core/auth/auth.service';
import type { AppointmentDetailVm } from '@/app/entities/appointment/models/appointment-vm.model';
import { AppointmentsService } from '@/app/entities/appointment/services/appointments.service';
import { TenantReadOnlyContextService } from '@/app/core/tenant/tenant-read-only-context.service';
import { VisitsService } from '@/app/features/visits/services/visits.service';
import { DetailRelatedSummariesService } from '@/app/features/patients/services/detail-related-summaries.service';
import { AppointmentDetailPageComponent } from './appointment-detail-page.component';

const APPT: AppointmentDetailVm = {
    id: 'a1',
    scheduledAtUtc: '2026-10-14T09:00:00Z',
    scheduledEndUtc: '2026-10-14T09:30:00Z',
    durationMinutes: 30,
    durationLabel: '30 dk',
    clientId: 'cl1',
    clientName: 'Ali Veli',
    petId: 'p1',
    petName: 'Pamuk',
    speciesName: 'Kedi',
    appointmentType: 0,
    appointmentTypeName: null,
    status: 0,
    lifecycleStatus: 0,
    notes: '—',
    createdAtUtc: null,
    updatedAtUtc: null
};

describe('AppointmentDetailPageComponent - Muayene Oluştur (ADR-017 K7)', () => {
    let claims: Set<string>;
    let createVisit: Mock;

    const create = (query: Record<string, string> = {}) => {
        TestBed.configureTestingModule({
            imports: [AppointmentDetailPageComponent],
            providers: [
                provideRouter([]),
                { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap({ id: 'a1' })), snapshot: { queryParamMap: convertToParamMap(query) } } },
                { provide: AuthService, useValue: { hasOperationClaim: (c: string) => claims.has(c) } },
                { provide: TenantReadOnlyContextService, useValue: { mutationBlocked: () => false } },
                { provide: AppointmentsService, useValue: { getAppointmentById: () => of(APPT) } },
                { provide: DetailRelatedSummariesService, useValue: { loadExaminationsLinkedToAppointment: () => of([]) } },
                { provide: VisitsService, useValue: { getCurrentVeterinarianUserId: () => of('vet1'), createVisit } }
            ]
        });
        const fixture = TestBed.createComponent(AppointmentDetailPageComponent);

        fixture.detectChanges();

        return fixture;
    };

    const examButton = (el: HTMLElement) => Array.from(el.querySelectorAll('button')).find((b) => b.textContent?.includes('Muayene Oluştur'));

    beforeEach(() => {
        claims = new Set(['Examinations.Create', 'Visits.Create']);
        createVisit = vi
            .fn()
            .mockName('createVisit')
            .mockReturnValue(of({ created: true, visit: { id: 'v1' } }));
    });

    it('Visits.Create varsa önce geliş açılır ve muayene visitId taşıyarak açılır', () => {
        const fixture = create();
        const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

        examButton(fixture.nativeElement)!.click();
        expect(createVisit).toHaveBeenCalledWith({ appointmentId: 'a1', responsibleVeterinarianUserId: 'vet1' });
        expect(navigate).toHaveBeenCalledWith(['/panel/examinations/new'], { queryParams: { visitId: 'v1', clientId: 'cl1', petId: 'p1' } });
    });

    it('mevcut açık geliş döndüğünde de (created: false) o gelişle muayene açılır', () => {
        createVisit.mockReturnValue(of({ created: false, visit: { id: 'v-existing' } }));
        const fixture = create();
        const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

        examButton(fixture.nativeElement)!.click();
        expect(vi.mocked(navigate).mock.lastCall![1]).toEqual({ queryParams: { visitId: 'v-existing', clientId: 'cl1', petId: 'p1' } });
    });

    it('geliş açılamazsa hata gösterilir ve muayene açılmaz', () => {
        createVisit.mockReturnValue(throwError(() => new Error('Sunucu hatası')));
        const fixture = create();
        const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

        examButton(fixture.nativeElement)!.click();
        fixture.detectChanges();
        expect(navigate).not.toHaveBeenCalled();
        expect(fixture.nativeElement.querySelector('[role="alert"]')).not.toBeNull();
    });

    it('Visits.Create yoksa randevu bağlamlı eski bağlantı kalır', () => {
        claims.delete('Visits.Create');
        const fixture = create();
        const link = fixture.nativeElement.querySelector('a[href^="/panel/examinations/new"]') as HTMLAnchorElement;

        expect(link.getAttribute('href')).toContain('appointmentId=a1');
        expect(createVisit).not.toHaveBeenCalled();
    });

    it('kategori bağlantısı varsayılan olarak randevu listesine gider', () => {
        const back = create().nativeElement.querySelector('[data-testid="page-header-category-link"]') as HTMLAnchorElement;

        expect(back.getAttribute('href')).toBe('/panel/appointments');
        expect(back.getAttribute('aria-label') ?? back.textContent).toContain('Randevu listesine dön');
    });

    it('takvimden gelindiyse kategori bağlantısı dönüş adresine gider ve dönüş etiketini taşır', () => {
        const fixture = create({ returnUrl: '/panel/appointments/calendar?view=week', returnLabel: 'Takvime dön' });
        const back = fixture.nativeElement.querySelector('[data-testid="page-header-category-link"]') as HTMLAnchorElement;

        expect(back.getAttribute('href')).toBe('/panel/appointments/calendar?view=week');
        expect(back.getAttribute('aria-label') ?? back.textContent).toContain('Takvime dön');
    });
});

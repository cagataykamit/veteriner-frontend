import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthService } from '@/app/core/auth/auth.service';
import type { PetTimelineItemVm } from '@/app/entities/pet/models/pet-timeline-vm.model';
import { PetTimelineListComponent } from './pet-timeline-list.component';

const row = (id: string, eventAtUtc: string, over: Partial<PetTimelineItemVm> = {}): PetTimelineItemVm => ({
    key: `Examination:${id}`,
    type: 'Examination',
    sourceId: id,
    eventAtUtc,
    clinicId: 'c1',
    clinicName: 'Merkez',
    title: id,
    summary: null,
    status: null,
    isVoided: false,
    linkType: 'Examination',
    linkId: id,
    relatedExaminationId: null,
    relatedAppointmentId: null,
    relatedTreatmentId: null,
    addedAfterFinalization: false,
    ...over
});

describe('PetTimelineListComponent', () => {
    let fixture: ComponentFixture<PetTimelineListComponent>;

    const el = () => fixture.nativeElement as HTMLElement;
    const texts = (testId: string) => Array.from(el().querySelectorAll(`[data-testid="${testId}"]`)).map((e) => e.textContent?.trim());

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [PetTimelineListComponent],
            providers: [provideRouter([]), { provide: AuthService, useValue: { getClinicId: () => 'c1', getClinicName: () => 'Merkez' } }]
        }).compileComponents();
        fixture = TestBed.createComponent(PetTimelineListComponent);
    });

    it('her İstanbul günü için tek başlık ve kayıt sayısı; satırlar gün altında, sıra korunur', () => {
        fixture.componentRef.setInput('items', [row('e3', '2026-11-20T11:00:00Z'), row('e2', '2026-11-19T21:30:00Z'), row('e1', '2026-10-17T09:00:00Z')]);
        fixture.detectChanges();

        const days = el().querySelectorAll('[data-testid="timeline-day"]');

        expect(texts('day-title')).toEqual(['20 Kasım 2026', '17 Ekim 2026']);
        expect(days[0].textContent).toContain('Cuma ·');
        expect(days[0].textContent).toContain('2 kayıt');
        expect(Array.from(days[0].querySelectorAll('li')).map((li) => li.querySelector('[data-testid="title"]')?.textContent?.trim())).toEqual(['e3', 'e2']);
        expect(days[1].querySelectorAll('li').length).toBe(1);
    });

    it('klinik adı yalnız aktif klinikten farklı kayıtta; kimliksiz ödeme satırı adından karşılaştırılır', () => {
        fixture.componentRef.setInput('items', [
            row('e1', '2026-11-20T11:00:00Z'),
            row('e2', '2026-11-20T10:00:00Z', { clinicId: 'c2', clinicName: 'Şube' }),
            row('p1', '2026-11-20T09:00:00Z', { type: 'Payment', key: 'Payment:p1', clinicId: null, clinicName: 'Merkez' }),
            row('p2', '2026-11-20T08:00:00Z', { type: 'Payment', key: 'Payment:p2', clinicId: null, clinicName: 'Kuzey' })
        ]);
        fixture.detectChanges();

        expect(texts('clinic-name')).toEqual(['· Şube', '· Kuzey']);
    });
});

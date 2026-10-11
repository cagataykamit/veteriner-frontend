import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { mapPetSummaryDtoToVm } from '@/app/features/pets/data/pet-summary.mapper';
import type { PetSummaryDto } from '@/app/features/pets/models/pet-summary-api.model';
import { PetSummaryCardComponent } from './pet-summary-card.component';

const ok: PetSummaryDto = {
    petId: 'p1',
    profileWeightKg: 4.2,
    activeHospitalization: { state: 'Empty', data: null },
    vaccinations: {
        state: 'Ok',
        data: { lastApplied: null, nextDue: { id: 'v2', vaccineName: 'Karma', dueAtUtc: '2026-09-01T00:00:00Z', isOverdue: true } }
    },
    latestWeight: { state: 'Ok', data: { weightKg: 4.4, measuredAtUtc: '2026-10-01T00:00:00Z', source: 'Examination', examinationId: 'e1' } },
    lastVisit: { state: 'Ok', data: { id: 'vi1', arrivedAtUtc: '2026-10-11T08:30:00Z', careStatus: 'Completed', clinicName: 'Merkez' } },
    lastExamination: { state: 'Ok', data: { id: 'e1', examinedAtUtc: '2026-10-01T00:00:00Z', visitReason: 'Kontrol', clinicName: 'Merkez' } }
};

describe('PetSummaryCardComponent', () => {
    let fixture: ComponentFixture<PetSummaryCardComponent>;

    const render = (dto: PetSummaryDto | null, extra: { loading?: boolean; error?: string | null } = {}) => {
        fixture = TestBed.createComponent(PetSummaryCardComponent);
        fixture.componentRef.setInput('petId', 'p1');
        fixture.componentRef.setInput('summary', dto ? mapPetSummaryDtoToVm(dto) : null);
        fixture.componentRef.setInput('loading', extra.loading ?? false);
        fixture.componentRef.setInput('error', extra.error ?? null);
        fixture.detectChanges();
        return fixture.nativeElement as HTMLElement;
    };
    const section = (el: HTMLElement, name: string) => el.querySelector(`[data-testid="section-${name}"]`) as HTMLElement;

    beforeEach(async () => {
        await TestBed.configureTestingModule({ imports: [PetSummaryCardComponent], providers: [provideRouter([])] }).compileComponents();
    });

    it('Ok bölümleri veriyi gösterir; gecikmiş aşı ve profil kilosu görünür', () => {
        const el = render(ok);

        expect(section(el, 'weight').textContent).toContain('4.4 kg');
        expect(section(el, 'weight').querySelector('[data-testid="profile-weight"]')?.textContent).toContain('4.2 kg');
        expect(section(el, 'vaccinations').querySelector('[data-testid="vaccine-overdue"]')).not.toBeNull();
        expect(section(el, 'examination').textContent).toContain('Kontrol');
        expect(section(el, 'visit').textContent).toContain('Tamamlandı');
    });

    it('kayıt yok, yetki yok ve veri alınamadı üç ayrı metinle gösterilir', () => {
        const el = render({
            ...ok,
            activeHospitalization: { state: 'Empty', data: null },
            vaccinations: { state: 'Forbidden', data: null },
            latestWeight: { state: 'Unavailable', data: null }
        });

        expect(section(el, 'hospitalization').textContent).toContain('Aktif yatış yok');
        expect(section(el, 'vaccinations').querySelector('[data-testid="state-forbidden"]')?.textContent).toContain('yetkiniz yok');
        expect(section(el, 'weight').querySelector('[data-testid="state-unavailable"]')?.textContent).toContain('alınamadı');
        expect(section(el, 'vaccinations').querySelector('[data-testid="state-empty"]')).toBeNull();
        expect(section(el, 'weight').querySelector('[data-testid="state-forbidden"]')).toBeNull();
    });

    it('özet ucu tümden başarısızsa hata ve "Tekrar dene" gösterilir; retry olayı çıkar', () => {
        const el = render(null, { error: 'Hasta özeti yüklenemedi.' });
        let retried = 0;
        fixture.componentInstance.retry.subscribe(() => retried++);

        expect(el.querySelector('[data-testid="summary-error"]')?.textContent).toContain('Hasta özeti yüklenemedi.');
        (el.querySelector('[data-testid="summary-error"] button') as HTMLButtonElement).click();

        expect(retried).toBe(1);
    });
});

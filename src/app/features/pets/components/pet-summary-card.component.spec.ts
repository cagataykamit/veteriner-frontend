import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import type { ExaminationDetailVm } from '@/app/entities/examination/models/examination-vm.model';
import { mapPetSummaryDtoToVm } from '@/app/entities/pet/data/pet-summary.mapper';
import type { PetSummaryDto } from '@/app/entities/pet/models/pet-summary-api.model';
import type { PetCardSection } from '@/app/features/pets/utils/pet-card.utils';
import type { TreatmentListItemVm } from '@/app/features/treatments/models/treatment-vm.model';
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

const exam = (over: Partial<ExaminationDetailVm> = {}): PetCardSection<ExaminationDetailVm> => ({
    state: 'ok',
    data: { temperatureC: 38.6, heartRateBpm: 140, respiratoryRatePerMin: 30, assessment: 'Otitis externa', ...over } as ExaminationDetailVm
});

describe('PetSummaryCardComponent', () => {
    let fixture: ComponentFixture<PetSummaryCardComponent>;

    const render = (
        dto: PetSummaryDto | null,
        extra: {
            loading?: boolean;
            error?: string | null;
            lastExamination?: PetCardSection<ExaminationDetailVm>;
            followUps?: PetCardSection<TreatmentListItemVm[]>;
        } = {}
    ) => {
        fixture = TestBed.createComponent(PetSummaryCardComponent);
        fixture.componentRef.setInput('summary', dto ? mapPetSummaryDtoToVm(dto) : null);
        fixture.componentRef.setInput('loading', extra.loading ?? false);
        fixture.componentRef.setInput('error', extra.error ?? null);
        fixture.componentRef.setInput('lastExamination', extra.lastExamination ?? null);
        fixture.componentRef.setInput('followUps', extra.followUps ?? null);
        fixture.detectChanges();

        return fixture.nativeElement as HTMLElement;
    };

    const section = (el: HTMLElement, name: string) => el.querySelector(`[data-testid="section-${name}"]`) as HTMLElement;

    beforeEach(async () => {
        await TestBed.configureTestingModule({ imports: [PetSummaryCardComponent], providers: [provideRouter([])] }).compileComponents();
    });

    it('Ok bölümleri veriyi gösterir; gecikmiş aşı, profil kilosu, son muayenenin vitali ve değerlendirmesi görünür', () => {
        const el = render(ok, { lastExamination: exam() });

        expect(el.textContent).toContain('Klinik özet');
        expect(section(el, 'weight').textContent).toContain('4.4 kg');
        expect(section(el, 'weight').querySelector('[data-testid="profile-weight"]')?.textContent).toContain('4.2 kg');
        expect(section(el, 'vaccinations').querySelector('[data-testid="vaccine-overdue"]')).not.toBeNull();
        expect(section(el, 'examination').textContent).toContain('Kontrol');
        expect(section(el, 'vitals').textContent).toContain('38.6 °C · 140 atım/dk · 30 soluk/dk');
        expect(section(el, 'assessment').textContent).toContain('Otitis externa');
    });

    it('vadesi geçmiş aşı sunucu isOverdue=false gönderdiğinde (vefat eden hasta) "Gecikmiş" işareti çıkmaz, vade görünür', () => {
        const el = render({
            ...ok,
            vaccinations: {
                state: 'Ok',
                data: { lastApplied: null, nextDue: { id: 'v2', vaccineName: 'Karma', dueAtUtc: '2026-09-01T00:00:00Z', isOverdue: false } }
            }
        });

        expect(section(el, 'vaccinations').textContent).toContain('Karma');
        expect(section(el, 'vaccinations').querySelector('[data-testid="vaccine-overdue"]')).toBeNull();
    });

    it('vital ve değerlendirme yoksa değer uydurulmaz, boş durum gösterilir; muayene yoksa "Kayıt yok"', () => {
        let el = render(ok, { lastExamination: exam({ temperatureC: null, heartRateBpm: null, respiratoryRatePerMin: null, assessment: '—' }) });

        expect(section(el, 'vitals').textContent).toContain('vital ölçülmemiş');
        expect(section(el, 'assessment').textContent).toContain('değerlendirme yazılmamış');

        el = render({ ...ok, lastExamination: { state: 'Empty', data: null } });
        expect(section(el, 'vitals').querySelector('[data-testid="state-empty"]')).not.toBeNull();

        el = render(ok, { lastExamination: { state: 'error' } });
        expect(section(el, 'vitals').querySelector('[data-testid="state-unavailable"]')).not.toBeNull();
    });

    it('aktif yatış ve takipli tedavi listelenir; ikisi de yoksa açık boş durum', () => {
        const followUps: PetCardSection<TreatmentListItemVm[]> = {
            state: 'ok',
            data: [{ id: 't1', title: 'Antibiyotik kürü', followUpDateUtc: '2026-10-20T00:00:00Z' } as TreatmentListItemVm]
        };
        let el = render(
            { ...ok, activeHospitalization: { state: 'Ok', data: { id: 'h1', clinicName: null, admittedAtUtc: '2026-10-12T08:00:00Z', plannedDischargeAtUtc: null, reason: 'Gözlem', examinationId: null } } },
            { followUps }
        );

        expect(section(el, 'active-care').textContent).toContain('Gözlem');
        expect(section(el, 'active-care').querySelectorAll('[data-testid="follow-up"]').length).toBe(1);

        el = render(ok, { followUps: { state: 'ok', data: [] } });
        expect(section(el, 'active-care').querySelector('[data-testid="state-empty"]')?.textContent).toContain('Aktif yatış veya takip');
    });

    it('kayıt yok, yetki yok ve veri alınamadı üç ayrı metinle gösterilir', () => {
        const el = render({
            ...ok,
            vaccinations: { state: 'Forbidden', data: null },
            latestWeight: { state: 'Unavailable', data: null }
        });

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

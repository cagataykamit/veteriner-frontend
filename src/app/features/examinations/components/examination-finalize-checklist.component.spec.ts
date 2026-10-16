import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import type { ExaminationDetailVm } from '@/app/features/examinations/models/examination-vm.model';
import { finalizeChecklist } from '@/app/features/examinations/utils/examination-procedures.utils';
import { ExaminationFinalizeChecklistComponent } from './examination-finalize-checklist.component';

const exam = (over: Partial<ExaminationDetailVm> = {}): ExaminationDetailVm =>
    ({
        id: 'e1',
        status: 'Draft',
        finalizedAtUtc: null,
        finalizedByName: null,
        assessment: '—',
        plan: '—',
        ...over
    }) as ExaminationDetailVm;

const summary = { examinationId: 'e1', pendingChargeCount: 1 } as never;

describe('ExaminationFinalizeChecklistComponent', () => {
    const setup = async (vm: ExaminationDetailVm, canFinalize = false) => {
        await TestBed.configureTestingModule({ imports: [ExaminationFinalizeChecklistComponent], providers: [provideRouter([])] }).compileComponents();
        const fixture = TestBed.createComponent(ExaminationFinalizeChecklistComponent);

        fixture.componentRef.setInput('exam', vm);
        fixture.componentRef.setInput('items', finalizeChecklist(vm, summary));
        fixture.componentRef.setInput('canFinalize', canFinalize);
        fixture.detectChanges();

        return fixture;
    };

    const render = async (vm: ExaminationDetailVm, canFinalize = false) => (await setup(vm, canFinalize)).nativeElement as HTMLElement;

    it('canFinalize ile Kesinleştir listenin altında görünür ve tıklanınca istek yayar', async () => {
        const fixture = await setup(exam(), true);
        const el = fixture.nativeElement as HTMLElement;
        const button = el.querySelector('[data-testid="finalize-open"]') as HTMLButtonElement;
        let requested = 0;

        fixture.componentInstance.finalizeRequested.subscribe(() => requested++);
        button.click();

        expect(button.textContent).toContain('Kesinleştir');
        expect(button.previousElementSibling?.tagName).toBe('UL');
        expect(requested).toBe(1);
    });

    it('canFinalize yoksa (yetkisiz, salt okunur ya da kesinleşmiş) düğme gösterilmez', async () => {
        expect((await render(exam())).querySelector('[data-testid="finalize-open"]')).toBeNull();
    });

    it('taslakta tüm maddeler ve "engel değil" notu görünür', async () => {
        const el = await render(exam({ assessment: 'Gastrit' }));

        expect(el.textContent).toContain('Uyarılar kesinleştirmeyi engellemez.');
        expect(el.querySelectorAll('li').length).toBe(4);
        expect(el.querySelector('[data-testid="check-assessment"]')?.textContent).toContain('Değerlendirme / tanı girildi');
        expect(el.querySelector('[data-testid="check-plan"]')?.textContent).toContain('Plan / takip bilgisi girilmemiş.');
    });

    it('kesinleşince yalnız kilit nedeni ve hâlâ bekleyen ücret maddesi kalır', async () => {
        const el = await render(exam({ status: 'Finalized', finalizedAtUtc: '2026-10-11T09:30:00Z', finalizedByName: 'Dr. Ayşe' }));

        expect(el.textContent).toContain('Dr. Ayşe');
        expect(el.textContent).toContain('yalnız gerekçeli uygulama ve ek not eklenebilir');
        expect(Array.from(el.querySelectorAll('li')).map((li) => li.getAttribute('data-testid'))).toEqual(['check-pendingCharges']);
        expect(el.querySelector('[data-testid="pending-charges-link"]')).not.toBeNull();
    });
});

import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import type { Mock } from 'vitest';
import type { OpenItemVisitKind, OpenItemVisitVm, OpenItemVisitsVm } from '@/app/entities/visit/models/visit-vm.model';
import { VisitsService } from '@/app/entities/visit/services/visits.service';
import { chargeLinkParams, TodayOpenVisitsChipComponent } from './today-open-visits-chip.component';

const row = (over: Partial<OpenItemVisitVm> = {}): OpenItemVisitVm => ({
    visitId: 'v1',
    arrivedAtUtc: '2026-10-08T07:30:00Z',
    careStatus: 'InProgress',
    petId: 'p1',
    petName: 'Pamuk',
    clientId: 'cl1',
    clientName: 'Ali Veli',
    responsibleVeterinarianName: 'Dr. Ayşe',
    latestExaminationId: 'ex1',
    chargeableWorkCount: null,
    ...over
});

describe('TodayOpenVisitsChipComponent', () => {
    let getOpenItemVisits: Mock;

    async function render(kind: OpenItemVisitKind, data: OpenItemVisitsVm, inputs: Record<string, boolean> = {}) {
        getOpenItemVisits = vi.fn().mockReturnValue(of(data));
        await TestBed.configureTestingModule({
            imports: [TodayOpenVisitsChipComponent],
            providers: [provideRouter([]), { provide: VisitsService, useValue: { getOpenItemVisits } }]
        }).compileComponents();
        const fixture = TestBed.createComponent(TodayOpenVisitsChipComponent);

        fixture.componentRef.setInput('kind', kind);
        fixture.componentRef.setInput('text', 'Çip');
        Object.entries(inputs).forEach(([k, v]) => fixture.componentRef.setInput(k, v));
        fixture.detectChanges();
        // Panel içeriği gövdeye eklenir: açılışı doğrudan tetikleyip çizilen şablonu oku.
        fixture.componentInstance.onShow();
        fixture.detectChanges();

        return { fixture, c: fixture.componentInstance };
    }

    it('ücret ekleme adresi ziyareti ve en son muayeneyi taşır; muayene yoksa yalnız ziyaret', () => {
        expect(chargeLinkParams(row())).toEqual({ clientId: 'cl1', petId: 'p1', visitId: 'v1', examinationId: 'ex1' });
        expect(chargeLinkParams(row({ latestExaminationId: null }))).toEqual({ clientId: 'cl1', petId: 'p1', visitId: 'v1' });
    });

    it('açılışta türüne göre listeyi yükler; satır ayrıntısı tarih, hekim ve işlem sayısıdır', async () => {
        const { c } = await render('Uncharged', { kind: 'Uncharged', totalCount: 1, items: [row({ chargeableWorkCount: 2 })] });

        expect(getOpenItemVisits).toHaveBeenCalledWith('Uncharged');
        expect(c.data()?.items.length).toBe(1);
        expect(c.detail(row({ chargeableWorkCount: 2 }))).toBe('08.10.2026 10:30 · Dr. Ayşe · 2 işlem');
        expect(c.heading()).toBe('Ücret kaydı olmayan ziyaretler');
    });

    it('açık geliş satırı durumunu gösterir; her açılış yeniden yükler', async () => {
        const { c } = await render('Incomplete', { kind: 'Incomplete', totalCount: 1, items: [row()] });

        expect(c.detail(row({ careStatus: 'Waiting', responsibleVeterinarianName: null }))).toBe('08.10.2026 10:30 · Sırada');
        c.onShow();
        expect(getOpenItemVisits).toHaveBeenCalledTimes(2);
    });

    it('çipe tıklanınca panel açılır; satır eylemi yetkiye ve duruma göre: Tamamla (devam ediyor), Düzelt (bekliyor)', async () => {
        const { fixture } = await render('Incomplete', { kind: 'Incomplete', totalCount: 3, items: [row({ visitId: 'a' }), row({ visitId: 'b', careStatus: 'Waiting' })] }, { canCompleteVisit: true, canCorrectVisit: false });
        const completed: string[] = [];

        fixture.componentInstance.complete.subscribe((r) => completed.push(r.visitId));
        (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('[data-testid="open-items-chip-Incomplete"]')!.click();
        fixture.detectChanges();
        await fixture.whenStable();
        fixture.detectChanges();

        const panel = document.body.querySelector('[data-testid="open-items-panel-Incomplete"]')!;

        expect(panel.querySelectorAll('[data-testid="open-items-row"]').length).toBe(2);
        expect(panel.querySelectorAll('[data-testid="open-items-complete"]').length).toBe(1);
        expect(panel.querySelector('[data-testid="open-items-correct"]')).toBeNull(); // Visits.Correct yok
        expect(panel.textContent).toContain('En eski 2 ziyaret gösteriliyor.');
        panel.querySelector<HTMLButtonElement>('[data-testid="open-items-complete"]')!.click();
        expect(completed).toEqual(['a']);
    });

    it('ücret yok satırı ücret ekleme sayfasına bağlanır; yetki yoksa eylem yok', async () => {
        const { fixture } = await render('Uncharged', { kind: 'Uncharged', totalCount: 1, items: [row()] }, { canAddCharge: true });

        (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('[data-testid="open-items-chip-Uncharged"]')!.click();
        fixture.detectChanges();
        await fixture.whenStable();
        fixture.detectChanges();

        const link = document.body.querySelector('[data-testid="open-items-panel-Uncharged"] a[data-testid="open-items-add-charge"]');

        expect(link?.getAttribute('href')).toBe('/panel/charges/new?clientId=cl1&petId=p1&visitId=v1&examinationId=ex1');
    });

    it('ücret yok listesinde tamamlanmış gelişe "Ücretsiz" düğmesi; açık gelişte yok', async () => {
        const { fixture } = await render(
            'Uncharged',
            { kind: 'Uncharged', totalCount: 2, items: [row({ visitId: 'done', careStatus: 'Completed' }), row({ visitId: 'open', careStatus: 'InProgress' })] },
            { canCompleteVisit: true }
        );
        const marked: string[] = [];

        fixture.componentInstance.markNoCharge.subscribe((r) => marked.push(r.visitId));
        (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('[data-testid="open-items-chip-Uncharged"]')!.click();
        fixture.detectChanges();
        await fixture.whenStable();
        fixture.detectChanges();

        const buttons = document.body.querySelectorAll<HTMLButtonElement>('[data-testid="open-items-panel-Uncharged"] [data-testid="open-items-mark-no-charge"]');

        expect(buttons.length).toBe(1);
        buttons[0].click();
        expect(marked).toEqual(['done']);
    });

    it('yükleme hatası mesaj olarak gösterilir', async () => {
        const { c } = await render('Incomplete', { kind: 'Incomplete', totalCount: 0, items: [] });

        getOpenItemVisits.mockReturnValue(throwError(() => new Error('Sunucuya ulaşılamadı.')));
        c.onShow();

        expect(c.error()).toBe('Sunucuya ulaşılamadı.');
        expect(c.data()).toBeNull();
        expect(c.loading()).toBe(false);
    });
});

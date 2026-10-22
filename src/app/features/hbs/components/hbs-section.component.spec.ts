import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import type { HbsEntryVm } from '@/app/features/hbs/models/hbs.model';
import { HbsService } from '@/app/features/hbs/services/hbs.service';
import { HbsSectionComponent } from './hbs-section.component';

/** Detaydaki HBS kartı: durum rozeti, dönen numara; takip dışı kayıtta (ör. planlı aşı) kart çizilmez. */
describe('HbsSectionComponent', () => {
    const entry = (over: Partial<HbsEntryVm> = {}): HbsEntryVm => ({
        status: 'Entered',
        referenceNumber: 'ATS-77',
        notRequiredReason: null,
        markedAtUtc: null,
        markedByName: 'Dr. Ayşe',
        isTracked: true,
        ...over
    });

    const render = (value: HbsEntryVm | null) => {
        TestBed.configureTestingModule({
            imports: [HbsSectionComponent],
            providers: [{ provide: HbsService, useValue: { getHbsData: () => of(null), updateHbsEntry: () => of(null) } }]
        });
        const fixture = TestBed.createComponent(HbsSectionComponent);

        fixture.componentRef.setInput('kind', 'vaccination');
        fixture.componentRef.setInput('recordId', 'v1');
        fixture.componentRef.setInput('entry', value);
        fixture.detectChanges();

        return fixture.nativeElement as HTMLElement;
    };

    it('durum rozeti ve ATS belge seri no gösterilir', () => {
        const el = render(entry());

        expect(el.querySelector('[data-testid="hbs-status-badge"]')?.textContent).toContain("HBS'e girildi");
        expect(el.textContent).toContain('ATS belge seri no: ATS-77');
        expect(el.textContent).toContain('Dr. Ayşe');
    });

    it('girilmemiş kayıtta nötr "HBS\'e girilmedi" rozeti; "zorunlu" ifadesi yok', () => {
        const el = render(entry({ status: 'NotEntered', referenceNumber: null, markedByName: null }));

        expect(el.textContent).toContain("HBS'e girilmedi");
        expect(el.textContent?.toLowerCase()).not.toContain('zorunlu');
    });

    it('takip dışı veya HBS alanı olmayan kayıtta kart çizilmez', () => {
        expect(render(entry({ isTracked: false })).querySelector('[data-testid="hbs-section"]')).toBeNull();
        TestBed.resetTestingModule();
        expect(render(null).querySelector('[data-testid="hbs-section"]')).toBeNull();
    });
});

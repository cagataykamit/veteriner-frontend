import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { of, throwError } from 'rxjs';
import { AuthService } from '@/app/core/auth/auth.service';
import { ExaminationTemplatesService } from '@/app/entities/examination-template/services/examination-templates.service';
import { VisitPreparationFieldsComponent } from '@/app/entities/visit/components/visit-preparation-fields.component';
import type { TodayItemVm, VisitVm } from '@/app/entities/visit/models/visit-vm.model';
import { VisitsService } from '@/app/entities/visit/services/visits.service';
import { VisitPreparationDialogComponent } from './visit-preparation-dialog.component';

const row = (over: Partial<TodayItemVm> = {}): TodayItemVm =>
    ({
        key: 'v1',
        visitId: 'v1',
        petName: 'Pamuk',
        clientName: 'Ali Veli',
        careStatus: 'Waiting',
        arrivalReason: 'Kusma',
        appointmentReasonName: null,
        preparedExaminationTemplateId: 't-old',
        preparedExaminationTemplateName: 'Eski paket',
        ...over
    }) as TodayItemVm;

const saved = { id: 'v1', arrivalReason: null, preparedExaminationTemplateId: null } as VisitVm;

describe('VisitPreparationDialogComponent (Hazırlığı düzenle)', () => {
    let fixture: ComponentFixture<VisitPreparationDialogComponent>;
    let cmp: VisitPreparationDialogComponent;
    let setPreparation: ReturnType<typeof vi.fn>;
    let emitted: VisitVm[];

    const open = async (item: TodayItemVm) => {
        setPreparation = vi.fn().mockReturnValue(of(saved));
        await TestBed.configureTestingModule({
            imports: [VisitPreparationDialogComponent],
            providers: [
                { provide: VisitsService, useValue: { setPreparation } },
                { provide: AuthService, useValue: { hasOperationClaim: (c: string) => c === 'ExaminationTemplates.Read' } },
                {
                    provide: ExaminationTemplatesService,
                    useValue: {
                        list: () =>
                            of({
                                items: [{ id: 't1', name: 'Karma aşı', visitReason: null, findings: null, plan: null, isActive: true, isSystem: false, lines: [], rowVersion: 'T', packagePrice: 450 }],
                                page: 1,
                                pageSize: 200,
                                totalItems: 1,
                                totalPages: 1
                            })
                    }
                }
            ]
        }).compileComponents();
        fixture = TestBed.createComponent(VisitPreparationDialogComponent);
        cmp = fixture.componentInstance;
        emitted = [];
        cmp.saved.subscribe((v) => emitted.push(v));
        fixture.componentRef.setInput('item', item);
        fixture.detectChanges();
        cmp.visible.set(true);
        fixture.detectChanges();
    };

    it('satırın mevcut hazırlığıyla açılır; listede olmayan (pasif) hazırlanan şablon da seçenek olarak görünür', async () => {
        await open(row());
        const fields = fixture.debugElement.query(By.directive(VisitPreparationFieldsComponent)).componentInstance as VisitPreparationFieldsComponent;

        expect(cmp.reason()).toBe('Kusma');
        expect(cmp.templateId()).toBe('t-old');
        expect(fields.options().map((o) => o.label)).toEqual(['Eski paket', 'Karma aşı']);
    });

    it('tam yazım: temizlenen alanlar boş gider; başarıda kapanır ve sonucu yayar', async () => {
        await open(row());
        cmp.reason.set('');
        cmp.templateId.set(null);
        cmp.onSubmit();

        expect(setPreparation).toHaveBeenCalledWith('v1', { arrivalReason: '', preparedExaminationTemplateId: null });
        expect(cmp.visible()).toBe(false);
        expect(emitted).toEqual([saved]);
    });

    it('hata: mesaj gösterilir, diyalog açık kalır', async () => {
        await open(row());
        setPreparation.mockReturnValue(throwError(() => new Error('Bu geliş tamamlanmış; hazırlık artık değiştirilemez. Listeyi yenileyin.')));
        cmp.onSubmit();

        expect(cmp.submitError()).toContain('hazırlık artık değiştirilemez');
        expect(cmp.visible()).toBe(true);
        expect(emitted).toEqual([]);
    });
});

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import type {
    ExaminationTemplateApplyResultDto,
    ExaminationTemplateDto
} from '@/app/features/examination-templates/models/examination-template.model';
import { ExaminationTemplateError, ExaminationTemplatesService } from '@/app/features/examination-templates/services/examination-templates.service';
import { ExaminationTemplateApplyDialogComponent } from './examination-template-apply-dialog.component';

const otitis: ExaminationTemplateDto = {
    id: 't1',
    name: 'Otitis paketi',
    visitReason: 'Kulak kaşıntısı',
    findings: 'Otoskopi: ',
    plan: null,
    isActive: true,
    isSystem: false,
    lines: [
        { productId: 's1', productName: 'Kulak temizliği', unit: 'Adet', productKind: 'Service', productIsActive: true, quantity: 1, currentUnitPrice: 150, currency: 'TRY' },
        { productId: 'p1', productName: 'Kulak damlası', unit: 'Şişe', productKind: 'Medicine', productIsActive: true, quantity: 1, currentUnitPrice: 90, currency: 'TRY' }
    ],
    rowVersion: 'T1'
};
const result: ExaminationTemplateApplyResultDto = { examinationId: 'e1', rowVersion: 'V2', updatedFields: ['visitReason'], administrations: [], services: [] };
const paged = (items: ExaminationTemplateDto[]) => of({ items, page: 1, pageSize: 20, totalItems: items.length, totalPages: 1 });

describe('ExaminationTemplateApplyDialogComponent', () => {
    let fixture: ComponentFixture<ExaminationTemplateApplyDialogComponent>;
    let cmp: ExaminationTemplateApplyDialogComponent;
    let service: jasmine.SpyObj<ExaminationTemplatesService>;
    let applied: unknown[];
    let stale: string[];

    const body = () => document.body;

    beforeEach(async () => {
        service = jasmine.createSpyObj<ExaminationTemplatesService>('ExaminationTemplatesService', ['list', 'apply']);
        service.list.and.returnValue(paged([otitis]));
        await TestBed.configureTestingModule({
            imports: [ExaminationTemplateApplyDialogComponent],
            providers: [{ provide: ExaminationTemplatesService, useValue: service }]
        }).compileComponents();

        fixture = TestBed.createComponent(ExaminationTemplateApplyDialogComponent);
        cmp = fixture.componentInstance;
        fixture.componentRef.setInput('examinationId', 'e1');
        fixture.componentRef.setInput('rowVersion', 'V1');
        applied = [];
        stale = [];
        cmp.applied.subscribe((e) => applied.push(e));
        cmp.stale.subscribe((m) => stale.push(m));
        fixture.detectChanges();
        cmp.visible.set(true);
        fixture.detectChanges();
    });

    it('açılınca yalnız aktif şablonları ister; arama ile yeniden ister', () => {
        expect(service.list).toHaveBeenCalledWith({ search: '', page: 1, pageSize: 20 });
        expect(body().querySelectorAll('[data-testid="template-option"]').length).toBe(1);
        cmp.searchInput = 'kulak';
        cmp.load();
        expect(service.list).toHaveBeenCalledWith({ search: 'kulak', page: 1, pageSize: 20 });
    });

    it('seçilince ön izleme eklenecek metni ve satırları gösterir', () => {
        cmp.select(otitis);
        fixture.detectChanges();
        const preview = body().querySelector('[data-testid="template-preview"]')?.textContent ?? '';
        expect(preview).toContain('Şikâyete eklenecek');
        expect(preview).toContain('Kulak kaşıntısı');
        expect(preview).not.toContain('Plana eklenecek');
        const lines = Array.from(body().querySelectorAll('[data-testid="template-preview-line"]')).map((l) => l.textContent ?? '');
        expect(lines[0]).toContain('Hizmet');
        expect(lines[1]).toContain('Stoktan düşer');
        expect(body().querySelector('[data-testid="template-reapply-warning"]')).toBeNull();
    });

    it('muayene sürümüyle uygular; başarıda kapanır, sonuç bildirilir; aynı şablon ikinci kez seçilince uyarı çıkar', () => {
        service.apply.and.returnValue(of(result));
        cmp.select(otitis);
        cmp.onSubmit();
        expect(service.apply).toHaveBeenCalledOnceWith('e1', 't1', 'V1');
        expect(applied).toEqual([{ template: otitis, result }]);
        expect(cmp.visible()).toBeFalse();

        cmp.visible.set(true);
        fixture.detectChanges();
        cmp.select(otitis);
        fixture.detectChanges();
        expect(body().querySelector('[data-testid="template-reapply-warning"]')?.textContent).toContain('satırlar yeniden');
    });

    it('pasif ürün satırı varsa uygulanamaz', () => {
        cmp.select({ ...otitis, lines: [{ ...otitis.lines[1], productIsActive: false }] });
        fixture.detectChanges();
        expect(cmp.canSubmit()).toBeFalse();
        expect(body().querySelector('[data-testid="template-inactive-lines"]')?.textContent).toContain('Kulak damlası');
        cmp.onSubmit();
        expect(service.apply).not.toHaveBeenCalled();
    });

    it('reddedilen satırın ürün adı mesaja girer; diyalog açık kalır', () => {
        service.apply.and.returnValue(throwError(() => new ExaminationTemplateError('Yetersiz stok.', 'Administrations.InsufficientStock', 'p1')));
        cmp.select(otitis);
        cmp.onSubmit();
        expect(cmp.submitError()).toBe('"Kulak damlası" satırı: Yetersiz stok.');
        expect(cmp.visible()).toBeTrue();
        expect(stale).toEqual([]);
    });

    it('muayene sürüm çakışmasında sayfa yenilemesi istenir, diyalog açık kalır', () => {
        service.apply.and.returnValue(throwError(() => new ExaminationTemplateError('Muayene bu arada değişmiş.', 'Examinations.ConcurrencyConflict')));
        cmp.select(otitis);
        cmp.onSubmit();
        expect(stale).toEqual(['Muayene bu arada değişmiş.']);
        expect(cmp.visible()).toBeTrue();
        expect(cmp.submitError()).toContain('değişmiş');
    });

    it('kesinleşmiş muayenede diyalog kapanır ve sayfaya bildirilir', () => {
        service.apply.and.returnValue(throwError(() => new ExaminationTemplateError('Bu muayene kesinleştirilmiş.', 'Examinations.Finalized')));
        cmp.select(otitis);
        cmp.onSubmit();
        expect(cmp.visible()).toBeFalse();
        expect(stale).toEqual(['Bu muayene kesinleştirilmiş.']);
    });

    it('pasifleşmiş şablonda seçim kalkar ve liste yenilenir', () => {
        service.apply.and.returnValue(throwError(() => new ExaminationTemplateError('Şablon pasifleştirilmiş.', 'ExaminationTemplates.Inactive')));
        cmp.select(otitis);
        const before = service.list.calls.count();
        cmp.onSubmit();
        expect(cmp.selected()).toBeNull();
        expect(service.list.calls.count()).toBe(before + 1);
    });

    it('gönderim sürerken ikinci istek atılmaz; sürüm yoksa uygulanmaz', () => {
        service.apply.and.returnValue(new Subject<ExaminationTemplateApplyResultDto>());
        cmp.select(otitis);
        cmp.onSubmit();
        cmp.onSubmit();
        expect(service.apply).toHaveBeenCalledTimes(1);

        fixture.componentRef.setInput('rowVersion', null);
        expect(cmp.canSubmit()).toBeFalse();
    });
});

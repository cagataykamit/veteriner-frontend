import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import { AuthService } from '@/app/core/auth/auth.service';
import { CareInstructionsSectionComponent } from '@/app/features/care-instructions/components/care-instructions-section.component';
import type { CareInstructionVm } from '@/app/features/care-instructions/models/care-instruction-vm.model';
import { CareInstructionsService } from '@/app/features/care-instructions/services/care-instructions.service';
import { TenantReadOnlyContextService } from '@/app/features/subscriptions/services/tenant-read-only-context.service';

const row: CareInstructionVm = { id: 'ci1', text: 'Günde iki kez yemek', createdAtUtc: '2026-10-13T08:00:00Z', updatedAtUtc: null, rowVersion: 'v1' };

describe('CareInstructionsSectionComponent', () => {
    let fixture: ComponentFixture<CareInstructionsSectionComponent>;
    let service: jasmine.SpyObj<CareInstructionsService>;
    let claims: Set<string>;
    let mutationBlocked: boolean;

    const setup = async () => {
        await TestBed.configureTestingModule({
            imports: [CareInstructionsSectionComponent],
            providers: [
                { provide: CareInstructionsService, useValue: service },
                { provide: AuthService, useValue: { hasOperationClaim: (c: string) => claims.has(c) } },
                { provide: TenantReadOnlyContextService, useValue: { mutationBlocked: () => mutationBlocked } }
            ]
        }).compileComponents();
        fixture = TestBed.createComponent(CareInstructionsSectionComponent);
        fixture.componentRef.setInput('hospitalizationId', 'h1');
        fixture.componentRef.setInput('petId', 'p1');
        fixture.detectChanges();
        await fixture.whenStable();
        fixture.detectChanges();
    };

    const root = () => fixture.nativeElement as HTMLElement;
    const has = (testId: string) => !!root().querySelector(`[data-testid="${testId}"]`);

    const typeAndSubmit = async (text: string) => {
        fixture.componentInstance.form.controls.text.setValue(text);
        fixture.componentInstance.onSubmit();
        await fixture.whenStable();
        fixture.detectChanges();
    };

    beforeEach(() => {
        service = jasmine.createSpyObj<CareInstructionsService>('CareInstructionsService', ['getCareInstructions', 'createCareInstruction', 'updateCareInstruction']);
        service.getCareInstructions.and.returnValue(of([row]));
        claims = new Set(['CareInstructions.Read']);
        mutationBlocked = false;
    });

    it('okuma izni yoksa hiçbir şey çizmez ve istek atmaz', async () => {
        claims.clear();
        await setup();
        expect(has('care-instructions-section')).toBeFalse();
        expect(service.getCareInstructions).not.toHaveBeenCalled();
    });

    it('yalnız okuma izniyle (Sekreter) liste görünür, ekle ve düzenle düğmeleri görünmez', async () => {
        await setup();
        expect(root().textContent).toContain('Günde iki kez yemek');
        expect(service.getCareInstructions).toHaveBeenCalledWith({ hospitalizationId: 'h1' });
        expect(has('care-instruction-add')).toBeFalse();
        expect(has('care-instruction-edit')).toBeFalse();
    });

    it('yazma izinleriyle düğmeler görünür; salt okunur kiracıda gizlenir', async () => {
        claims = new Set(['CareInstructions.Read', 'CareInstructions.Create', 'CareInstructions.Update']);
        await setup();
        expect(has('care-instruction-add')).toBeTrue();
        expect(has('care-instruction-edit')).toBeTrue();
    });

    it('salt okunur kiracıda yazma düğmeleri gizlenir', async () => {
        claims = new Set(['CareInstructions.Read', 'CareInstructions.Create', 'CareInstructions.Update']);
        mutationBlocked = true;
        await setup();
        expect(has('care-instruction-add')).toBeFalse();
        expect(has('care-instruction-edit')).toBeFalse();
    });

    it('ekleme: yatış ve hayvanla kaydeder, listeyi yeniler', async () => {
        claims = new Set(['CareInstructions.Read', 'CareInstructions.Create']);
        service.createCareInstruction.and.returnValue(of({ id: 'ci2' }));
        await setup();
        fixture.componentInstance.openCreate();
        await typeAndSubmit('Dinlendirin');
        expect(service.createCareInstruction).toHaveBeenCalledWith({ petId: 'p1', hospitalizationId: 'h1', text: 'Dinlendirin' });
        expect(service.getCareInstructions).toHaveBeenCalledTimes(2);
        expect(fixture.componentInstance.dialogVisible).toBeFalse();
    });

    it('düzenleme: kayıtlı rowVersion ile gider', async () => {
        claims = new Set(['CareInstructions.Read', 'CareInstructions.Update']);
        service.updateCareInstruction.and.returnValue(of({ id: 'ci1', rowVersion: 'v2' }));
        await setup();
        fixture.componentInstance.openEdit(row);
        expect(fixture.componentInstance.form.controls.text.value).toBe(row.text);
        await typeAndSubmit('Yeni metin');
        expect(service.updateCareInstruction).toHaveBeenCalledWith('ci1', 'Yeni metin', 'v1');
    });

    it('409 çakışma: mesaj ve "güncel kaydı yükle" düğmesi görünür; düğme listeyi yeniden yükler', async () => {
        claims = new Set(['CareInstructions.Read', 'CareInstructions.Update']);
        service.updateCareInstruction.and.returnValue(
            throwError(() => new HttpErrorResponse({ status: 409, error: { extensions: { code: 'CareInstructions.ConcurrencyConflict' } } }))
        );
        await setup();
        fixture.componentInstance.openEdit(row);
        await typeAndSubmit('Benim metnim');
        expect(fixture.componentInstance.conflict()).toBeTrue();
        expect(fixture.componentInstance.submitError()).toContain('başka biri tarafından güncellendi');
        expect(document.body.textContent).toContain('Yazdıklarımı atıp güncel kaydı yükle');

        fixture.componentInstance.discardAndReload();
        expect(service.getCareInstructions).toHaveBeenCalledTimes(2);
        expect(fixture.componentInstance.dialogVisible).toBeFalse();
    });

    it('boş / yalnız boşluk metin kaydedilmez', async () => {
        claims = new Set(['CareInstructions.Read', 'CareInstructions.Create']);
        await setup();
        fixture.componentInstance.openCreate();
        await typeAndSubmit('   ');
        expect(service.createCareInstruction).not.toHaveBeenCalled();
    });

    it('yenilemede liste yerinde kalır; "yükleniyor" yalnız ilk yüklemede görünür (alttaki bölümler zıplamaz)', async () => {
        await setup();
        const pending = new Subject<CareInstructionVm[]>();

        service.getCareInstructions.and.returnValue(pending);
        fixture.componentInstance.reload();
        fixture.detectChanges();

        expect(root().textContent).toContain('Günde iki kez yemek');
        expect(root().textContent).not.toContain('Bakım talimatları yükleniyor');
        pending.next([row]);
        pending.complete();
        fixture.detectChanges();
        expect(root().textContent).toContain('Günde iki kez yemek');
    });
});

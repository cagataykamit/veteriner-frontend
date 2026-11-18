import type { MockedObject } from 'vitest';
import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import { AuthService } from '@/app/core/auth/auth.service';
import { CareInstructionsSectionComponent } from '@/app/entities/care-instruction/components/care-instructions-section.component';
import type { CareInstructionVm } from '@/app/entities/care-instruction/models/care-instruction-vm.model';
import { CareInstructionsService } from '@/app/entities/care-instruction/services/care-instructions.service';
import { TenantReadOnlyContextService } from '@/app/core/tenant/tenant-read-only-context.service';
import { signal } from '@angular/core';
import type { AiEntryState } from '@/app/entities/ai/models/ai-vm.model';
import { AiService } from '@/app/entities/ai/services/ai.service';
import { AiPanelService } from '@/app/entities/ai/services/ai-panel.service';
import { AiStatusService } from '@/app/entities/ai/services/ai-status.service';

const row: CareInstructionVm = { id: 'ci1', text: 'Günde iki kez yemek', createdAtUtc: '2026-10-13T08:00:00Z', updatedAtUtc: null, rowVersion: 'v1' };

describe('CareInstructionsSectionComponent', () => {
    let fixture: ComponentFixture<CareInstructionsSectionComponent>;
    let service: MockedObject<CareInstructionsService>;
    let claims: Set<string>;
    let mutationBlocked: boolean;
    let aiEntry: ReturnType<typeof signal<AiEntryState>>;
    let ai: MockedObject<AiService>;

    const setup = async () => {
        await TestBed.configureTestingModule({
            imports: [CareInstructionsSectionComponent],
            providers: [
                { provide: CareInstructionsService, useValue: service },
                { provide: AuthService, useValue: { hasOperationClaim: (c: string) => claims.has(c) } },
                { provide: TenantReadOnlyContextService, useValue: { mutationBlocked: () => mutationBlocked } },
                { provide: AiService, useValue: ai },
                { provide: AiStatusService, useValue: { entry: aiEntry, ensureLoaded: vi.fn(), refresh: vi.fn(), usageWarning: signal(null) } }
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
        service = {
            getCareInstructions: vi.fn().mockName('CareInstructionsService.getCareInstructions'),
            createCareInstruction: vi.fn().mockName('CareInstructionsService.createCareInstruction'),
            updateCareInstruction: vi.fn().mockName('CareInstructionsService.updateCareInstruction')
        } as unknown as MockedObject<CareInstructionsService>;
        service.getCareInstructions.mockReturnValue(of([row]));
        claims = new Set(['CareInstructions.Read']);
        mutationBlocked = false;
        aiEntry = signal<AiEntryState>({ kind: 'hidden' });
        ai = {
            draftCareInstruction: vi.fn(),
            getPendingDrafts: vi.fn().mockReturnValue(of([])),
            acceptDraft: vi.fn(),
            discardDraft: vi.fn()
        } as unknown as MockedObject<AiService>;
    });

    it('okuma izni yoksa hiçbir şey çizmez ve istek atmaz', async () => {
        claims.clear();
        await setup();
        expect(has('care-instructions-section')).toBe(false);
        expect(service.getCareInstructions).not.toHaveBeenCalled();
    });

    it('yalnız okuma izniyle (Sekreter) liste görünür, ekle ve düzenle düğmeleri görünmez', async () => {
        await setup();
        expect(root().textContent).toContain('Günde iki kez yemek');
        expect(service.getCareInstructions).toHaveBeenCalledWith({ hospitalizationId: 'h1' });
        expect(has('care-instruction-add')).toBe(false);
        expect(has('care-instruction-edit')).toBe(false);
    });

    it('yazma izinleriyle düğmeler görünür; salt okunur kiracıda gizlenir', async () => {
        claims = new Set(['CareInstructions.Read', 'CareInstructions.Create', 'CareInstructions.Update']);
        await setup();
        expect(has('care-instruction-add')).toBe(true);
        expect(has('care-instruction-edit')).toBe(true);
    });

    it('salt okunur kiracıda yazma düğmeleri gizlenir', async () => {
        claims = new Set(['CareInstructions.Read', 'CareInstructions.Create', 'CareInstructions.Update']);
        mutationBlocked = true;
        await setup();
        expect(has('care-instruction-add')).toBe(false);
        expect(has('care-instruction-edit')).toBe(false);
    });

    it('ekleme: yatış ve hayvanla kaydeder, listeyi yeniler', async () => {
        claims = new Set(['CareInstructions.Read', 'CareInstructions.Create']);
        service.createCareInstruction.mockReturnValue(of({ id: 'ci2' }));
        await setup();
        fixture.componentInstance.openCreate();
        await typeAndSubmit('Dinlendirin');
        expect(service.createCareInstruction).toHaveBeenCalledWith({ petId: 'p1', hospitalizationId: 'h1', text: 'Dinlendirin' });
        expect(service.getCareInstructions).toHaveBeenCalledTimes(2);
        expect(fixture.componentInstance.dialogVisible()).toBe(false);
    });

    it('düzenleme: kayıtlı rowVersion ile gider', async () => {
        claims = new Set(['CareInstructions.Read', 'CareInstructions.Update']);
        service.updateCareInstruction.mockReturnValue(of({ id: 'ci1', rowVersion: 'v2' }));
        await setup();
        fixture.componentInstance.openEdit(row);
        expect(fixture.componentInstance.form.controls.text.value).toBe(row.text);
        await typeAndSubmit('Yeni metin');
        expect(service.updateCareInstruction).toHaveBeenCalledWith('ci1', 'Yeni metin', 'v1');
    });

    it('409 çakışma: mesaj ve "güncel kaydı yükle" düğmesi görünür; düğme listeyi yeniden yükler', async () => {
        claims = new Set(['CareInstructions.Read', 'CareInstructions.Update']);
        service.updateCareInstruction.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 409, error: { extensions: { code: 'CareInstructions.ConcurrencyConflict' } } })));
        await setup();
        fixture.componentInstance.openEdit(row);
        await typeAndSubmit('Benim metnim');
        expect(fixture.componentInstance.conflict()).toBe(true);
        expect(fixture.componentInstance.submitError()).toContain('başka biri tarafından güncellendi');
        expect(document.body.textContent).toContain('Yazdıklarımı atıp güncel kaydı yükle');

        fixture.componentInstance.discardAndReload();
        expect(service.getCareInstructions).toHaveBeenCalledTimes(2);
        expect(fixture.componentInstance.dialogVisible()).toBe(false);
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

        service.getCareInstructions.mockReturnValue(pending);
        fixture.componentInstance.reload();
        fixture.detectChanges();

        expect(root().textContent).toContain('Günde iki kez yemek');
        expect(root().textContent).not.toContain('Bakım talimatları yükleniyor');
        pending.next([row]);
        pending.complete();
        fixture.detectChanges();
        expect(root().textContent).toContain('Günde iki kez yemek');
    });

    describe('Taslak hazırla (AI-004)', () => {
        const aiDraft = {
            id: 'd1',
            feature: 'DischargeInstructions',
            status: 'Draft',
            targetType: 'Hospitalization',
            targetId: 'h1',
            sources: [],
            content: { text: 'İlaçlar:\n- Damla' },
            createdAtUtc: '',
            expiresAtUtc: '',
            decidedByUserId: null,
            decidedAtUtc: null,
            appliedRecordId: null
        };

        it('ekleme izni ve kullanılabilir AI ile görünür; AI kapalıysa ya da salt okunurda görünmez', async () => {
            claims.add('CareInstructions.Create');
            aiEntry.set({ kind: 'available' });
            await setup();
            expect(has('ai-entry-button')).toBe(true);

            aiEntry.set({ kind: 'hidden' });
            fixture.detectChanges();
            expect(has('ai-entry-button')).toBe(false);
        });

        it('basınca yan panelde açılır, yatıştan üretir; kabulde talimat oluşur ve liste yenilenir', async () => {
            claims.add('CareInstructions.Create');
            aiEntry.set({ kind: 'available' });
            ai.draftCareInstruction.mockReturnValue(of(aiDraft));
            ai.acceptDraft.mockReturnValue(of({ ...aiDraft, status: 'Accepted', content: null, appliedRecordId: 'ci9' }));
            await setup();

            (root().querySelector('[data-testid="ai-entry-button"]') as HTMLButtonElement).click();
            const panel = TestBed.inject(AiPanelService);

            expect(panel.content()).toEqual(expect.objectContaining({ kind: 'custom', title: 'Taburcu talimatı', owner: fixture.componentInstance }));
            expect(ai.getPendingDrafts).toHaveBeenCalledWith('Hospitalization', 'h1');

            const flow = fixture.componentInstance.aiFlow;

            flow.note.set('Yara bakımı');
            flow.generate();
            expect(ai.draftCareInstruction).toHaveBeenCalledWith({ hospitalizationId: 'h1' }, 'Yara bakımı');

            fixture.componentInstance.acceptAiDraft();
            expect(ai.acceptDraft).toHaveBeenCalledWith('d1', undefined);
            expect(panel.content()).toBeNull();
            expect(service.getCareInstructions).toHaveBeenCalledTimes(2);
        });

        it('AI taslağından gelen talimatta iz çipi görünür', async () => {
            service.getCareInstructions.mockReturnValue(of([{ ...row, aiProvenance: [{ draftId: 'd1', feature: 'DischargeInstructions', edited: true, acceptedByName: 'Dr. Ayşe Kaya', acceptedAtUtc: '2026-11-19T14:36:00Z' }] }]));
            await setup();
            expect(root().querySelector('[data-testid="ai-provenance-chip"]')?.textContent).toContain('AI taslağından · düzenlendi');
        });
    });
});

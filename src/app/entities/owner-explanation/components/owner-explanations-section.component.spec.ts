import type { MockedObject } from 'vitest';
import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import type { AiDraftVm, AiEntryState } from '@/app/entities/ai/models/ai-vm.model';
import { AiService } from '@/app/entities/ai/services/ai.service';
import { AiPanelService } from '@/app/entities/ai/services/ai-panel.service';
import { AiStatusService } from '@/app/entities/ai/services/ai-status.service';
import { OwnerExplanationsSectionComponent } from '@/app/entities/owner-explanation/components/owner-explanations-section.component';
import type { OwnerExplanationVm } from '@/app/entities/owner-explanation/models/owner-explanation-vm.model';
import { OwnerExplanationsService } from '@/app/entities/owner-explanation/services/owner-explanations.service';

const explanation: OwnerExplanationVm = {
    id: 'oe1',
    text: 'Karamel için muayenede sağ kulakta iltihap görüldü.',
    createdByName: 'Dr. Ayşe Kaya',
    createdAtUtc: '2026-11-19T14:36:00Z',
    aiProvenance: [{ draftId: 'd1', feature: 'OwnerExplanation', edited: false, acceptedByName: 'Dr. Ayşe Kaya', acceptedAtUtc: '2026-11-19T14:36:00Z' }]
};

const draft: AiDraftVm = {
    id: 'd2',
    feature: 'OwnerExplanation',
    status: 'Draft',
    targetType: 'Examination',
    targetId: 'e1',
    sources: [],
    content: { text: 'Taslak açıklama' },
    createdAtUtc: '',
    expiresAtUtc: '',
    decidedByUserId: null,
    decidedAtUtc: null,
    appliedRecordId: null
};

describe('OwnerExplanationsSectionComponent', () => {
    let fixture: ComponentFixture<OwnerExplanationsSectionComponent>;
    let service: { getForExamination: ReturnType<typeof vi.fn> };
    let ai: MockedObject<AiService>;
    let aiEntry: ReturnType<typeof signal<AiEntryState>>;

    const q = (testId: string) => (fixture.nativeElement as HTMLElement).querySelector(`[data-testid="${testId}"]`) as HTMLElement | null;

    const setup = async (canCreate: boolean) => {
        await TestBed.configureTestingModule({
            imports: [OwnerExplanationsSectionComponent],
            providers: [
                { provide: OwnerExplanationsService, useValue: service },
                { provide: AiService, useValue: ai },
                { provide: AiStatusService, useValue: { entry: aiEntry, ensureLoaded: vi.fn(), refresh: vi.fn(), usageWarning: signal(null) } }
            ]
        }).compileComponents();
        fixture = TestBed.createComponent(OwnerExplanationsSectionComponent);
        fixture.componentRef.setInput('examinationId', 'e1');
        fixture.componentRef.setInput('canCreate', canCreate);
        fixture.detectChanges();
    };

    beforeEach(() => {
        service = { getForExamination: vi.fn().mockReturnValue(of([explanation])) };
        ai = {
            draftOwnerExplanation: vi.fn().mockReturnValue(of(draft)),
            getPendingDrafts: vi.fn().mockReturnValue(of([])),
            acceptDraft: vi.fn().mockReturnValue(of({ ...draft, status: 'AcceptedWithEdits', content: null })),
            discardDraft: vi.fn()
        } as unknown as MockedObject<AiService>;
        aiEntry = signal<AiEntryState>({ kind: 'available' });
    });

    it('kayıtlı açıklama: metin, yazan, iz çipi, Kopyala ve Yazdır', async () => {
        await setup(false);

        expect(service.getForExamination).toHaveBeenCalledWith('e1');
        expect(q('owner-explanation-row')?.textContent).toContain('sağ kulakta iltihap');
        expect(q('owner-explanation-row')?.textContent).toContain('Dr. Ayşe Kaya');
        expect(q('ai-provenance-chip')?.textContent).toContain('AI taslağından');
        expect(q('owner-explanation-copy')).not.toBeNull();
        expect(q('owner-explanation-print')).not.toBeNull();
        expect(q('ai-entry-button')).toBeNull();
    });

    it('kayıt yok ve hazırlanamıyorsa bölüm hiç görünmez; hazırlanabiliyorsa boş durumla görünür', async () => {
        service.getForExamination.mockReturnValue(of([]));
        aiEntry.set({ kind: 'hidden' });
        await setup(true);
        expect(q('owner-explanations-section')).toBeNull();

        aiEntry.set({ kind: 'available' });
        fixture.detectChanges();
        expect(q('owner-explanations-empty')).not.toBeNull();
        expect(q('ai-entry-button')?.textContent).toContain('Açıklama hazırla');
    });

    it('liste okunamazsa hata gösterilir', async () => {
        service.getForExamination.mockReturnValue(throwError(() => new Error('Hasta sahibine açıklamalar yüklenemedi.')));
        await setup(false);
        expect(q('owner-explanations-section')?.textContent).toContain('yüklenemedi');
    });

    it('hazırla → yan panel; muayeneden üretir, kabulde kayıt oluşur ve liste yenilenir', async () => {
        await setup(true);

        q('ai-entry-button')!.click();
        const panel = TestBed.inject(AiPanelService);

        expect(panel.content()).toEqual(expect.objectContaining({ kind: 'custom', title: 'Hasta sahibine açıklama' }));

        const flow = fixture.componentInstance.flow;

        flow.generate();
        expect(ai.draftOwnerExplanation).toHaveBeenCalledWith('e1', '');

        fixture.componentInstance.accept();
        expect(ai.acceptDraft).toHaveBeenCalledWith('d2', undefined);
        expect(panel.content()).toBeNull();
        expect(service.getForExamination).toHaveBeenCalledTimes(2);
    });
});

import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AiDraftPanelComponent } from '@/app/entities/ai/components/ai-draft-panel.component';
import type { AiSourceVm } from '@/app/entities/ai/models/ai-vm.model';
import type { AiProblem } from '@/app/entities/ai/utils/ai-error.utils';

@Component({
    standalone: true,
    imports: [AiDraftPanelComponent],
    template: `
        <app-ai-draft-panel
            noticeText="Yalnız yatış kayıtlarına dayanır; ilaç ya da doz eklemez."
            [sources]="sources"
            [busy]="busy()"
            [problem]="problem()"
            (accept)="events.push('accept')"
            (discard)="events.push('discard')"
            (regenerate)="events.push('regenerate')"
        >
            <textarea data-testid="feature-body"></textarea>
        </app-ai-draft-panel>
    `
})
class HostComponent {
    readonly sources: AiSourceVm[] = [{ type: 'Hospitalization', id: 'h1', label: 'Yatış · 17 Kas', icon: 'pi-building', link: ['/panel/hospitalizations', 'h1'] }];
    readonly busy = signal(false);
    readonly problem = signal<AiProblem | null>(null);
    readonly events: string[] = [];
}

describe('AiDraftPanelComponent', () => {
    let fixture: ComponentFixture<HostComponent>;
    const q = (testId: string) => (fixture.nativeElement as HTMLElement).querySelector(`[data-testid="${testId}"]`) as HTMLElement | null;

    beforeEach(async () => {
        await TestBed.configureTestingModule({ imports: [HostComponent], providers: [provideRouter([])] }).compileComponents();
        fixture = TestBed.createComponent(HostComponent);
        fixture.detectChanges();
    });

    it('şerit, özelliğin içeriği ve kaynak satırı; varsayılan birincil düğme "Kabul et ve kaydet"', () => {
        expect(q('ai-draft-notice')?.textContent).toContain('ilaç ya da doz eklemez');
        expect(q('feature-body')).not.toBeNull();
        expect(q('ai-draft-sources')?.textContent).toContain('Yatış · 17 Kas');
        expect(q('ai-draft-accept')?.textContent).toContain('Kabul et ve kaydet');
    });

    it('At, Yeniden ve Kabul olay yayar; karar sürerken pasif', () => {
        q('ai-draft-discard')!.click();
        q('ai-draft-regenerate')!.click();
        q('ai-draft-accept')!.click();
        expect(fixture.componentInstance.events).toEqual(['discard', 'regenerate', 'accept']);

        fixture.componentInstance.busy.set(true);
        fixture.detectChanges();
        expect((q('ai-draft-accept') as HTMLButtonElement).disabled).toBe(true);
        expect((q('ai-draft-discard') as HTMLButtonElement).disabled).toBe(true);
    });

    it('karar sorunu panelde amber iletiyle görünür', () => {
        fixture.componentInstance.problem.set({ code: 'AiDrafts.Expired', title: 'Taslağın süresi doldu', message: 'Hiçbir şey kaydedilmedi.', retryable: false, retryAfterSeconds: null, refreshStatus: false });
        fixture.detectChanges();
        expect(q('ai-state-message')?.textContent).toContain('Taslağın süresi doldu');
    });
});

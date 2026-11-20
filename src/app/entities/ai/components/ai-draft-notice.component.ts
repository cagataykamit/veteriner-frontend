import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * "Taslak — kontrol edin" şeridi: her AI taslağının başında durur, tek cümleyle neye dayandığını ve neyi yapmadığını söyler.
 * Mor ton yalnız "makineden geldi, henüz doğrulanmadı" işaretidir; durum yalnız renkle anlatılmaz (başlıkta "Taslak" yazar).
 */
@Component({
    selector: 'app-ai-draft-notice',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <div class="grid grid-cols-[1.25rem_1fr] gap-2.5 rounded-lg border border-dashed border-ai-border bg-ai-surface px-3 py-2.5 text-sm" role="note" data-testid="ai-draft-notice">
            <i class="pi pi-sparkles text-ai mt-0.5" aria-hidden="true"></i>
            <div>
                <b class="block font-semibold">Taslak — kontrol edin</b>
                <span class="text-muted-color">{{ text() }}</span>
            </div>
        </div>
    `
})
export class AiDraftNoticeComponent {
    readonly text = input.required<string>();
}

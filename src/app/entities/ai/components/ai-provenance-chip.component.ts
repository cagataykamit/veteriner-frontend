import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { formatDateTimeDisplay } from '@/app/shared/utils/date.utils';

/**
 * Kayıttaki kalıcı iz: "✦ AI taslağından" ve kabulden önce ya da sonra düzenlendiyse "· düzenlendi". Hekim metni tamamen
 * değiştirse de içeriğin AI taslağından başladığı görünür (AI-010). İpucunda kimin ne zaman kabul ettiği yazar.
 */
@Component({
    selector: 'app-ai-provenance-chip',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `<span
        class="inline-flex items-center gap-1 rounded-full bg-ai-surface px-2 text-xs font-semibold text-ai align-middle normal-case tracking-normal cursor-help"
        [attr.title]="tooltip()"
        [attr.aria-label]="label() + '. ' + tooltip()"
        data-testid="ai-provenance-chip"
        ><i class="pi pi-sparkles text-[0.7rem]" aria-hidden="true"></i>{{ label() }}</span
    >`
})
export class AiProvenanceChipComponent {
    readonly edited = input(false);
    /** "Dr. Ayşe Kaya"; bilinmiyorsa ipucunda yalnız tarih yazar. */
    readonly acceptedByName = input<string | null>(null);
    /** Kabul anı; boşsa (henüz kaydedilmemiş forma aktarım) ipucu "kaydedince iz kalır" der. */
    readonly acceptedAtUtc = input<string | null>(null);

    protected readonly label = computed(() => (this.edited() ? 'AI taslağından · düzenlendi' : 'AI taslağından'));

    protected readonly tooltip = computed(() => {
        const at = this.acceptedAtUtc();
        const edited = this.edited() ? ' Kabulden sonra düzenlendi.' : '';

        if (!at) {
            return `AI taslağından aktarıldı; kaydedince bu iz kalır.${edited}`;
        }

        const who = this.acceptedByName()?.trim();

        return `${who ? `${who} ` : ''}${formatDateTimeDisplay(at)} tarihinde kabul etti.${edited}`;
    });
}

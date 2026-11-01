import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import type { ClinicalSnippetTriggerDirective } from '@/app/entities/clinical-snippet/components/clinical-snippet-trigger.directive';

/**
 * `ClinicalSnippetTriggerDirective`'in alanın arkasına eklediği görünüm: alanın altında kısa ipucu ve imlecin altında
 * açılan parça listesi (`role="listbox"`; etkin öğe alanın `aria-activedescendant`'ıdır, odak alanda kalır). Durum
 * direktiftedir. Alanın kapalı olması sinyal değildir; ipucu her denetimde yeniden okunsun diye `Eager`.
 */
@Component({
    selector: 'app-clinical-snippet-menu',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.Eager,
    template: `
        @let t = trigger();
        @if (t.hintVisible()) {
            <small class="block text-xs text-muted-color mt-1" data-testid="clinical-snippet-hint"># ile metin parçası ekleyin</small>
        }
        @if (t.open()) {
            <ul
                [id]="t.listboxId"
                role="listbox"
                aria-label="Metin parçaları"
                class="fixed z-[1200] list-none m-0 p-1 w-[22rem] max-w-[calc(100vw-1rem)] max-h-72 overflow-y-auto rounded-border border border-surface-200 dark:border-surface-700 bg-surface-0 dark:bg-surface-900 shadow-md"
                [style.left.px]="t.position().left"
                [style.top.px]="t.position().top"
                [style.bottom.px]="t.position().bottom"
                data-testid="clinical-snippet-listbox"
                (mousedown)="$event.preventDefault()"
            >
                @for (s of t.suggestions(); track s.id; let i = $index) {
                    <li
                        [id]="t.optionId(i)"
                        role="option"
                        [attr.aria-selected]="i === t.activeIndex()"
                        class="flex items-baseline gap-2 px-3 py-2 rounded-border cursor-pointer"
                        [class.bg-emphasis]="i === t.activeIndex()"
                        (mouseenter)="t.activeIndex.set(i)"
                        (click)="t.pick(i)"
                    >
                        <span class="font-medium whitespace-nowrap">#{{ s.shortcut }}</span>
                        <span class="text-sm text-muted-color truncate">{{ s.title }}</span>
                    </li>
                }
            </ul>
        }
    `
})
export class ClinicalSnippetMenuComponent {
    readonly trigger = input.required<ClinicalSnippetTriggerDirective>();
}

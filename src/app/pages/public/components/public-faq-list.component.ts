import { Component, input, signal } from '@angular/core';
import type { PublicFaqDef } from '@/app/features/public/utils/public-faq-content.utils';

/** SSS akordeonu: 1 px çerçeve, gölge yok; birden fazla soru aynı anda açık olabilir (tasarım belgesi bölüm 6). */
@Component({
    selector: 'app-public-faq-list',
    standalone: true,
    template: `
        <div class="flex w-full flex-col gap-3">
            @for (faq of items(); track faq.question; let i = $index) {
                <article class="public-card overflow-hidden">
                    <h3 class="m-0">
                        <button
                            type="button"
                            class="flex min-h-[56px] w-full cursor-pointer items-center justify-between gap-4 border-0 bg-transparent px-5 py-3 text-left md:px-6"
                            [attr.aria-expanded]="isOpen(i)"
                            [attr.aria-controls]="idPrefix() + '-answer-' + i"
                            (click)="toggle(i)"
                        >
                            <span class="text-[15px] font-semibold leading-snug text-surface-950 dark:text-surface-0 md:text-[17px]">{{ faq.question }}</span>
                            <i class="pi shrink-0 text-base text-surface-500" [class.pi-plus]="!isOpen(i)" [class.pi-minus]="isOpen(i)" aria-hidden="true"></i>
                        </button>
                    </h3>
                    @if (isOpen(i)) {
                        <div [id]="idPrefix() + '-answer-' + i" class="px-5 pb-5 md:px-6">
                            <p class="m-0 text-base leading-relaxed text-surface-600 dark:text-surface-300">{{ faq.answer }}</p>
                        </div>
                    }
                </article>
            }
        </div>
    `
})
export class PublicFaqListComponent {
    readonly items = input.required<readonly PublicFaqDef[]>();
    /** Aynı sayfada birden fazla liste varsa `aria-controls` kimlikleri çakışmasın. */
    readonly idPrefix = input<string>('faq');

    private readonly open = signal<ReadonlySet<number>>(new Set());

    isOpen(index: number): boolean {
        return this.open().has(index);
    }

    toggle(index: number): void {
        this.open.update((set) => {
            const next = new Set(set);

            if (next.has(index)) {
                next.delete(index);
            } else {
                next.add(index);
            }

            return next;
        });
    }
}

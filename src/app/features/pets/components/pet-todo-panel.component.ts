import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import type { PetTodoItem, PetTodoView } from '@/app/features/pets/utils/pet-card.utils';

const TONE_CLASS: Record<PetTodoItem['tone'], string> = {
    danger: 'text-red-600 dark:text-red-400',
    warn: 'text-amber-700 dark:text-amber-400',
    info: 'text-primary'
};

/** "Yapılacaklar" paneli (ADR-020 karar 2c): her satırda tek tıkla eylem; satırlar `buildPetTodo` ile rol vurgusuna göre sıralı gelir. */
@Component({
    selector: 'app-pet-todo-panel',
    standalone: true,
    imports: [RouterLink, ButtonModule],
    template: `
        <section class="card mb-0 h-full" aria-labelledby="pet-todo-title" data-testid="pet-todo">
            <div class="flex items-center gap-2 mb-3">
                <h5 id="pet-todo-title" class="m-0">Yapılacaklar</h5>
                @if (view().items.length > 0) {
                    <span class="text-sm font-medium text-muted-color" data-testid="todo-count">({{ view().items.length }})</span>
                }
            </div>

            @if (view().items.length > 0) {
                <ul class="list-none m-0 p-0">
                    @for (item of view().items; track item.key) {
                        <li class="flex items-center gap-3 py-2 border-b border-surface-200 dark:border-surface-700 last:border-b-0" [attr.data-testid]="'todo-' + item.kind">
                            <i class="{{ item.icon }} text-lg {{ toneClass(item) }}" aria-hidden="true"></i>
                            <div class="min-w-0 flex-1">
                                <div class="font-medium break-words" [class]="item.tone === 'danger' ? toneClass(item) : ''">{{ item.title }}</div>
                                <div class="text-muted-color text-sm break-words">{{ item.detail }}</div>
                            </div>
                            <a
                                pButton
                                size="small"
                                severity="secondary"
                                [outlined]="true"
                                class="shrink-0"
                                [label]="item.action.label"
                                [routerLink]="item.action.route"
                                [queryParams]="item.action.queryParams"
                                data-testid="todo-action"
                            ></a>
                        </li>
                    }
                </ul>
            } @else if (view().loading) {
                <p class="m-0 text-muted-color text-sm">Yükleniyor…</p>
            } @else if (view().failed.length === 0) {
                <p class="m-0 text-muted-color" data-testid="todo-empty"><i class="pi pi-check-circle mr-1" aria-hidden="true"></i>Bekleyen iş yok.</p>
            }

            @if (view().failed.length > 0) {
                <p class="m-0 mt-2 text-orange-600 dark:text-orange-400 text-sm" data-testid="todo-failed">
                    <i class="pi pi-exclamation-triangle mr-1" aria-hidden="true"></i>Alınamadı: {{ view().failed.join(', ') }}. Liste eksik olabilir.
                </p>
            }
        </section>
    `
})
export class PetTodoPanelComponent {
    readonly view = input.required<PetTodoView>();

    toneClass(item: PetTodoItem): string {
        return TONE_CLASS[item.tone];
    }
}

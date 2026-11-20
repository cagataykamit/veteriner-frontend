import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { AiSourceVm } from '@/app/entities/ai/models/ai-vm.model';

/** AI maddesinin dayandığı kayıt: çip kaydın sayfasına gider ("Muayene · 10 Kas", "Hasta kartı"); detay sayfası yoksa düz etiket. */
@Component({
    selector: 'app-ai-source-link',
    standalone: true,
    imports: [RouterLink],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        @if (source().link; as link) {
            <a
                [routerLink]="link"
                class="inline-flex items-center gap-1 rounded-md border border-surface px-1.5 text-xs font-semibold text-primary no-underline hover:border-primary bg-surface-0 dark:bg-surface-900"
                [attr.title]="'Kaydı aç: ' + source().label"
                data-testid="ai-source-link"
                ><i [class]="'pi ' + source().icon + ' text-[0.75rem]'" aria-hidden="true"></i>{{ source().label }}</a
            >
        } @else {
            <span class="inline-flex items-center gap-1 rounded-md border border-surface px-1.5 text-xs font-semibold text-muted-color" data-testid="ai-source-label"
                ><i [class]="'pi ' + source().icon + ' text-[0.75rem]'" aria-hidden="true"></i>{{ source().label }}</span
            >
        }
    `
})
export class AiSourceLinkComponent {
    readonly source = input.required<AiSourceVm>();
}

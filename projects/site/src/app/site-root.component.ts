import { isPlatformServer } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, makeStateKey, PLATFORM_ID, REQUEST_CONTEXT, TransferState } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { VetFinderPageComponent } from './vet-finder/vet-finder-page.component';
import type { VetFinderRequestState } from './vet-finder/vet-finder-state';

const VET_FINDER_STATE = makeStateKey<VetFinderRequestState | null>('vet-finder-state');

/** Klinik sitesi yönlendiriciyle, Veteriner bul sayfası doğrudan çizilir (`app.config.ts`). Durumu sunucu verir, tarayıcıya hidrasyonla geçer. */
@Component({
    selector: 'site-root',
    standalone: true,
    imports: [RouterOutlet, VetFinderPageComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        @if (vetFinder; as state) {
            <site-vet-finder-page [state]="state" />
        } @else {
            <router-outlet />
        }
    `
})
export class SiteRootComponent {
    protected readonly vetFinder = this.readVetFinderState();

    private readVetFinderState(): VetFinderRequestState | null {
        const transfer = inject(TransferState);

        if (!isPlatformServer(inject(PLATFORM_ID))) return transfer.get(VET_FINDER_STATE, null);

        const context = inject(REQUEST_CONTEXT, { optional: true }) as { readonly kind?: string } | null;
        const state = context?.kind === 'vet-finder' ? (context as VetFinderRequestState) : null;

        if (state) transfer.set(VET_FINDER_STATE, state);

        return state;
    }
}

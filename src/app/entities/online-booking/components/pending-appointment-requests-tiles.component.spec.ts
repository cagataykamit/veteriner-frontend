import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { pendingRequest } from '@/app/entities/online-booking/models/appointment-request.testing';
import { toPendingRequestPreview } from '@/app/entities/online-booking/utils/pending-request-preview.utils';
import { PendingAppointmentRequestsTilesComponent } from './pending-appointment-requests-tiles.component';

/** 2026-11-03 15:00 (Europe/Istanbul). */
const NOW = new Date('2026-11-03T12:00:00Z');

describe('PendingAppointmentRequestsTilesComponent', () => {
    async function render(total: number) {
        await TestBed.configureTestingModule({ imports: [PendingAppointmentRequestsTilesComponent], providers: [provideRouter([])] }).compileComponents();
        const fixture = TestBed.createComponent(PendingAppointmentRequestsTilesComponent);
        const rows = [
            pendingRequest('r1', { requestedStartUtc: '2026-11-04T14:30:00Z', createdAtUtc: '2026-11-03T11:48:00Z' }),
            pendingRequest('r2', { requestedStartUtc: '2026-11-05T07:00:00Z', createdAtUtc: '2026-11-03T09:00:00Z', petName: null })
        ].map((r) => toPendingRequestPreview(r, NOW));

        fixture.componentRef.setInput('rows', rows);
        fixture.componentRef.setInput('total', total);
        fixture.detectChanges();

        return { fixture, el: fixture.nativeElement as HTMLElement };
    }

    it('her talep bir kutucuk: gün etiketi, saat, ne zaman geldiği; kutucuk talep penceresini açar', async () => {
        const { el } = await render(2);
        const tiles = el.querySelectorAll('[data-testid="pending-request-tile"]');

        expect(tiles.length).toBe(2);
        expect(tiles[0].textContent).toContain('Yarın');
        expect(tiles[0].textContent).toContain('17:30');
        expect(tiles[0].textContent).toContain('Portal · 12 dk önce');
        expect(tiles[0].getAttribute('href')).toBe('/panel/appointments/requests?requestId=r1');
        expect(tiles[1].textContent).toContain('5 Kas Per');
        expect(tiles[1].textContent).toContain('Hayvan belirtilmedi');
        expect(el.querySelector('[data-testid="pending-requests-more"]')).toBeNull();
    });

    it('yeni talep üst çizgiyle, yakın gün vurguyla ayrılır', async () => {
        const { el } = await render(2);
        const tiles = el.querySelectorAll('[data-testid="pending-request-tile"]');
        const days = el.querySelectorAll('[data-testid="pending-request-day"]');

        expect(tiles[0].className).toContain('border-t-4');
        expect(tiles[1].className).not.toContain('border-t-4');
        expect(days[0].className).toContain('text-amber-700');
        expect(days[1].className).toContain('text-muted-color');
    });

    it('listede olmayanlar "+N talep daha"; "Açık işlerde göster" çip görünümünü ister', async () => {
        const { fixture, el } = await render(7);
        const showChip = vi.fn();

        fixture.componentInstance.showChip.subscribe(showChip);

        expect(el.querySelector('[data-testid="pending-requests-count"]')?.textContent).toContain('7');
        expect(el.querySelector('[data-testid="pending-requests-more"]')?.textContent).toContain('+5');

        el.querySelector<HTMLButtonElement>('[data-testid="pending-requests-show-chip"]')!.click();
        expect(showChip).toHaveBeenCalledTimes(1);
    });
});

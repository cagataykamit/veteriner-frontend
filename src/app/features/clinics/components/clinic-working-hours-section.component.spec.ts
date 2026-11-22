import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { MessageService } from 'primeng/api';
import { providePrimeNG } from 'primeng/config';
import { of } from 'rxjs';
import { userEvent } from 'vitest/browser';
import { AuthService } from '@/app/core/auth/auth.service';
import { PRIMENG_TR } from '@/app/core/i18n/primeng-tr';
import { TenantReadOnlyContextService } from '@/app/core/tenant/tenant-read-only-context.service';
import type { ClinicWorkingHourVm } from '@/app/entities/clinic/models/clinic-working-hours-vm.model';
import { ClinicsService } from '@/app/entities/clinic/services/clinics.service';
import { ClinicWorkingHoursSectionComponent } from './clinic-working-hours-section.component';

const monday: ClinicWorkingHourVm = { dayOfWeek: 1, dayLabel: 'Pazartesi', isClosed: false, opensAt: null, closesAt: null, breakStartsAt: null, breakEndsAt: null };

describe('ClinicWorkingHoursSectionComponent — saat alanları', () => {
    const render = async (isConfigured = true, updateWorkingHours = vi.fn(), items: ClinicWorkingHourVm[] = [monday]) => {
        TestBed.configureTestingModule({
            imports: [ClinicWorkingHoursSectionComponent],
            providers: [
                provideRouter([]),
                providePrimeNG({ translation: PRIMENG_TR }),
                MessageService,
                {
                    provide: ClinicsService,
                    useValue: {
                        getWorkingHoursState: vi.fn().mockReturnValue(of({ isConfigured, items })),
                        // Kart açılışta "Çalışma saati kısıtı"nı randevu ayarından okur.
                        getAppointmentSettings: vi.fn().mockReturnValue(of({ enforceWorkingHours: true })),
                        updateWorkingHours
                    }
                },
                { provide: AuthService, useValue: { hasOperationClaim: () => true } },
                { provide: TenantReadOnlyContextService, useValue: { mutationBlocked: () => false } }
            ]
        });
        const fixture = TestBed.createComponent(ClinicWorkingHoursSectionComponent);

        fixture.componentRef.setInput('clinicId', 'k1');
        document.body.appendChild(fixture.nativeElement);
        fixture.autoDetectChanges();
        await fixture.whenStable();

        return { fixture, el: fixture.nativeElement as HTMLElement };
    };

    afterEach(() => document.querySelectorAll('.p-datepicker-panel').forEach((p) => p.remove()));

    it('boş alan alanına uygun saatten açılır, Enter o saati yazar; kaydet açılır', async () => {
        const { el } = await render();

        // Sabit bekleme yok: panelin açıldığını (aria-expanded) ve değerin yazıldığını koşulla bekler; yükte de kararlı.
        const pick = async (id: string, expected: string) => {
            const field = el.querySelector<HTMLInputElement>(`#${id}`)!;

            await userEvent.click(field);
            await expect.poll(() => field.getAttribute('aria-expanded')).toBe('true');
            await userEvent.keyboard('{Enter}');
            await expect.poll(() => field.value).toBe(expected);
        };

        await pick('whOpens0', '09:00');
        await pick('whCloses0', '18:00');
        await pick('whBreakStart0', '12:00');
        await pick('whBreakEnd0', '13:00');
        await expect.poll(() => el.querySelector<HTMLButtonElement>('button[severity="secondary"]')?.disabled).toBe(false);
    });

    it('kapanış açılıştan önceyse satırda nedenini yazar; kaydet pasif kalır', async () => {
        const { fixture, el } = await render();
        const day = fixture.componentInstance.whDays.at(0);

        expect(el.querySelector('[data-testid="whDayError0"]')).toBeNull();

        day.patchValue({ opensAt: '09:00', closesAt: '08:00' });
        day.markAsDirty();
        await fixture.whenStable();

        await expect.poll(() => el.querySelector('[data-testid="whDayError0"]')?.textContent?.trim()).toBe('Açılış saati kapanış saatinden önce olmalıdır.');
        expect(el.querySelector<HTMLButtonElement>('button[severity="secondary"]')?.disabled).toBe(true);
    });

    it('kayıt yoksa varsayılan saatler değiştirilmeden kaydedilebilir (İlk hafta adımı ve klinik sitesi kayıt ister)', async () => {
        const defaults = { ...monday, opensAt: '09:00:00', closesAt: '18:00:00' };
        const update = vi.fn().mockReturnValue(of([defaults]));
        const { el } = await render(false, update, [defaults]);
        const save = () => el.querySelector<HTMLButtonElement>('button[severity="secondary"]')!;

        expect(el.querySelector('[data-testid="wh-not-configured"]')).not.toBeNull();
        await expect.poll(() => save().disabled).toBe(false);

        await userEvent.click(save());

        await expect.poll(() => update.mock.calls.length).toBe(1);
        expect(update.mock.calls[0][0]).toBe('k1');
        await expect.poll(() => el.querySelector('[data-testid="wh-not-configured"]')).toBeNull();
        await expect.poll(() => save().disabled).toBe(true);
    });

    it('kayıt varken değişiklik olmadan kaydet pasif', async () => {
        const { el } = await render(true, vi.fn(), [{ ...monday, opensAt: '09:00:00', closesAt: '18:00:00' }]);

        expect(el.querySelector('[data-testid="wh-not-configured"]')).toBeNull();
        expect(el.querySelector<HTMLButtonElement>('button[severity="secondary"]')?.disabled).toBe(true);
    });
});

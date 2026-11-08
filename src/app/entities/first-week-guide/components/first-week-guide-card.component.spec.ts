import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthService } from '@/app/core/auth/auth.service';
import { FirstWeekGuideCardComponent } from '@/app/entities/first-week-guide/components/first-week-guide-card.component';
import { FirstWeekGuideService } from '@/app/entities/first-week-guide/services/first-week-guide.service';

const token = `h.${btoa(JSON.stringify({ sub: 'u1', tenant_id: 't1' })).replace(/=+$/, '')}.s`;
const SECRETARY = ['Visits.Read', 'Visits.Create', 'Clients.Create', 'Appointments.Create', 'Charges.Create', 'Payments.Create', 'Payments.Read', 'Reminders.Read'];
const VETERINARIAN = ['Visits.Read', 'Visits.Update', 'Examinations.Create', 'Examinations.Finalize', 'Vaccinations.Create', 'Prescriptions.Create', 'ClinicalSnippets.Create'];

describe('FirstWeekGuideCardComponent', () => {
    let claims: string[];
    let fixture: ComponentFixture<FirstWeekGuideCardComponent>;

    const el = () => fixture.nativeElement as HTMLElement;
    const card = () => el().querySelector('[data-testid="first-week-guide"]');
    const stepTexts = () => Array.from(el().querySelectorAll('[data-testid="first-week-guide-step"] label')).map((l) => l.textContent!.trim());

    function render(): void {
        fixture = TestBed.createComponent(FirstWeekGuideCardComponent);
        fixture.detectChanges();
    }

    beforeEach(() => {
        localStorage.clear();
        claims = SECRETARY;
        TestBed.configureTestingModule({
            imports: [FirstWeekGuideCardComponent],
            providers: [provideRouter([]), { provide: AuthService, useValue: { hasOperationClaim: (c: string) => claims.includes(c), getUserId: () => 'u1', getAccessToken: () => token } }]
        });
    });

    afterEach(() => localStorage.clear());

    it('ön büroya kendi adımlarını ilgili ekran bağlantılarıyla gösterir', () => {
        render();

        expect(card()?.textContent).toContain('İlk hafta: Ön büro');
        expect(stepTexts()).toHaveLength(7);
        expect(stepTexts()[1]).toContain('ilk randevuyu');
        expect(Array.from(el().querySelectorAll('[data-testid="first-week-guide-step"] a')).map((a) => a.getAttribute('href'))).toContain('/panel/appointments/new');
        expect(el().querySelector('[data-testid="first-week-guide-progress"]')?.textContent).toContain('0/7 tamam');
    });

    it('hekime muayene adımlarını gösterir', () => {
        claims = VETERINARIAN;
        render();

        expect(card()?.textContent).toContain('İlk hafta: Hekim');
        expect(stepTexts().some((t) => t.includes('Kesinleştir'))).toBe(true);
        expect(stepTexts().some((t) => t.includes('ödeme'))).toBe(false);
    });

    it('işi kaydedilen adım kendiliğinden, diğeri elle işaretlenir', () => {
        render();
        TestBed.inject(FirstWeekGuideService).markDone(['appointment']);
        fixture.detectChanges();

        const box = el().querySelector<HTMLInputElement>('#first-week-endOfDay')!;

        box.click();
        fixture.detectChanges();

        expect(el().querySelector('[data-testid="first-week-guide-progress"]')?.textContent).toContain('2/7 tamam');
        expect(TestBed.inject(FirstWeekGuideService).state()?.done).toEqual(['appointment', 'endOfDay']);
    });

    it('kapatılınca gizlenir ve sonraki açılışta da görünmez; menüden yeniden açılınca döner', () => {
        render();
        el().querySelector<HTMLButtonElement>('[data-testid="first-week-guide-close"]')!.click();
        fixture.detectChanges();

        expect(card()).toBeNull();

        fixture.destroy();
        render();
        expect(card()).toBeNull();

        TestBed.inject(FirstWeekGuideService).reopen();
        fixture.detectChanges();
        expect(card()).not.toBeNull();
    });

    it('Bugün’ü göremeyen kullanıcıda çizilmez ve durum yazmaz', () => {
        claims = ['Clients.Read'];
        render();

        expect(card()).toBeNull();
        expect(localStorage.length).toBe(0);
    });
});

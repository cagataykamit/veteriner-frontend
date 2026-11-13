import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthService } from '@/app/core/auth/auth.service';
import { FirstWeekGuideCardComponent } from '@/app/entities/first-week-guide/components/first-week-guide-card.component';
import { FirstWeekGuideService } from '@/app/entities/first-week-guide/services/first-week-guide.service';
import { FIRST_WEEK_GUIDE_STEPS } from '@/app/entities/first-week-guide/utils/first-week-guide.steps';

const token = `h.${btoa(JSON.stringify({ sub: 'u1', tenant_id: 't1' })).replace(/=+$/, '')}.s`;
const SECRETARY = ['Visits.Read', 'Visits.Create', 'Clients.Create', 'Appointments.Create', 'Charges.Create', 'Payments.Create', 'Payments.Read', 'Reminders.Read'];
const VETERINARIAN = ['Visits.Read', 'Visits.Update', 'Examinations.Create', 'Examinations.Finalize', 'Vaccinations.Create', 'Prescriptions.Create', 'ClinicalSnippets.Create'];

describe('FirstWeekGuideCardComponent', () => {
    let claims: string[];
    let fixture: ComponentFixture<FirstWeekGuideCardComponent>;

    const el = () => fixture.nativeElement as HTMLElement;
    const q = <T extends HTMLElement>(testId: string) => el().querySelector<T>(`[data-testid="${testId}"]`);
    const card = () => q('first-week-guide');
    const chips = () => Array.from(el().querySelectorAll<HTMLButtonElement>('[data-testid="first-week-guide-step"]'));
    const chip = (title: string) => chips().find((c) => c.textContent!.includes(title))!;
    /** Sayaç ve "/ 7 adım tamam" ayrı öğelerdir; boşluklar tek biçime indirilir. */
    const progress = () =>
        q('first-week-guide-progress')!
            .textContent!.replace(/\s*\/\s*/, '/')
            .replace(/\s+/g, ' ')
            .trim();
    const guide = () => TestBed.inject(FirstWeekGuideService);

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

    it('ön büroyu karşılar, 7 adımın hapını ve sıradaki adımı ekran bağlantısıyla gösterir', () => {
        render();

        expect(card()?.textContent).toContain('İlk hafta · Ön büro');
        expect(card()?.textContent).toContain('Hoş geldiniz! 7 kısa adımla başlayalım.');
        expect(chips()).toHaveLength(7);
        expect(progress()).toBe('0/7 adım tamam');
        expect(q('first-week-guide-detail')?.textContent).toContain('Sıradaki adım');
        expect(q('first-week-guide-detail')?.textContent).toContain('1. İlk müşteri');
        expect(q('first-week-guide-link')?.getAttribute('href')).toBe('/panel/clients/new');
        expect(chip('İlk müşteri').getAttribute('aria-current')).toBe('step');
    });

    it('hekime muayene adımlarını gösterir', () => {
        claims = VETERINARIAN;
        render();

        const titles = chips().map((c) => c.textContent!);

        expect(card()?.textContent).toContain('İlk hafta · Hekim');
        expect(titles.some((t) => t.includes('Kesinleştirme'))).toBe(true);
        expect(titles.some((t) => t.includes('Ödeme'))).toBe(false);
    });

    it('işi kaydedilen adım kendiliğinden işaretlenir ve sıradaki adım ilerler', () => {
        render();
        guide().markDone(['client']);
        fixture.detectChanges();

        expect(progress()).toBe('1/7 adım tamam');
        expect(card()?.textContent).toContain('İyi gidiyorsunuz, 6 adım kaldı.');
        expect(chip('İlk müşteri').classList).toContain('is-done');
        expect(q('first-week-guide-detail')?.textContent).toContain('2. İlk randevu');
        expect(q('first-week-guide-link')?.getAttribute('href')).toBe('/panel/appointments/new');
    });

    it('hapla seçilen adım açılır, elle işaretlenir ve işaret geri alınır', () => {
        render();
        chip('Gün sonu').click();
        fixture.detectChanges();

        expect(q('first-week-guide-detail')?.textContent).toContain('Sonraki adımlardan');
        expect(q('first-week-guide-detail')?.textContent).toContain('7. Gün sonu');

        q<HTMLButtonElement>('first-week-guide-toggle')!.click();
        fixture.detectChanges();

        expect(guide().state()?.done).toEqual(['endOfDay']);
        expect(progress()).toBe('1/7 adım tamam');

        chip('Gün sonu').click();
        fixture.detectChanges();
        expect(q('first-week-guide-detail')?.textContent).toContain('Tamamlandı');
        expect(q('first-week-guide-toggle')?.textContent).toContain('İşareti kaldır');

        q<HTMLButtonElement>('first-week-guide-toggle')!.click();
        fixture.detectChanges();
        expect(guide().state()?.done).toEqual([]);
    });

    it('tüm adımlar bitince kutlar ve "Rehberi kapat" ile kapanır', () => {
        render();
        guide().markDone(FIRST_WEEK_GUIDE_STEPS.frontDesk.map((s) => s.key));
        fixture.detectChanges();

        expect(card()?.textContent).toContain('İlk hafta tamam!');
        expect(progress()).toBe('7/7 adım tamam');
        expect(q('first-week-guide-detail')).toBeNull();
        expect(q('first-week-guide-complete')?.textContent).toContain('Tebrikler');

        q<HTMLButtonElement>('first-week-guide-finish')!.click();
        fixture.detectChanges();

        expect(card()).toBeNull();
        expect(guide().state()?.dismissed).toBe(true);
    });

    it('kapatılınca gizlenir ve sonraki açılışta da görünmez; menüden yeniden açılınca döner', () => {
        render();
        q<HTMLButtonElement>('first-week-guide-close')!.click();
        fixture.detectChanges();

        expect(card()).toBeNull();

        fixture.destroy();
        render();
        expect(card()).toBeNull();

        guide().reopen();
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

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { buttonByText } from '@portal/app/testing/portal-testing';
import { BOOKING_DAYS, SLOT_MON_0930, SLOT_TUE_1400 } from './portal-booking.fixtures';
import { bookingDayWeekday, PortalSlotPicker } from './portal-slot-picker.component';

describe('PortalSlotPicker (gün ve saat seçimi)', () => {
    let fixture: ComponentFixture<PortalSlotPicker>;
    let el: HTMLElement;
    let picked: string[];

    async function create(days = BOOKING_DAYS, selected: string | null = null): Promise<void> {
        await TestBed.configureTestingModule({ imports: [PortalSlotPicker] }).compileComponents();
        fixture = TestBed.createComponent(PortalSlotPicker);
        fixture.componentRef.setInput('days', days);
        fixture.componentRef.setInput('selected', selected);
        picked = [];
        fixture.componentInstance.selectedChange.subscribe((v) => picked.push(v));
        el = fixture.nativeElement;
        fixture.detectChanges();
        await fixture.whenStable();
    }

    afterEach(() => fixture?.destroy());

    function times(): string[] {
        return Array.from(el.querySelectorAll('[data-testid=slot-times] button')).map((b) => b.textContent!.trim());
    }

    it('yalnız saati olan günleri gösterir; saatler İstanbul saatiyle (06:00Z = 09:00)', async () => {
        await create();

        const days = Array.from(el.querySelectorAll('.portal-slot-day')).map((b) => b.textContent!.replace(/\s+/g, ''));

        expect(days).toEqual(['Pazartesi02.11.2026', 'Salı03.11.2026']);
        expect(times()).toEqual(['09:00', '09:30']);
    });

    it('gün değişince o günün saatleri; saat tıklanınca startUtc yayımlanır', async () => {
        await create();

        buttonByText(el, 'Salı')!.click();
        fixture.detectChanges();
        expect(times()).toEqual(['14:00']);

        buttonByText(el, '14:00')!.click();
        expect(picked).toEqual([SLOT_TUE_1400]);
    });

    it('seçili saatin günü açık gelir ve işaretli olur', async () => {
        await create(BOOKING_DAYS, SLOT_MON_0930);

        expect(buttonByText(el, '09:30')!.getAttribute('aria-pressed')).toBe('true');
    });

    it('hiç müsait saat yoksa bilgi metni', async () => {
        await create([{ date: '2026-11-02', slots: [] }]);

        expect(el.querySelector('[data-testid=no-slots]')).not.toBeNull();
    });

    it('takvim günü İstanbul günüyle adlandırılır', () => {
        expect(bookingDayWeekday('2026-11-02')).toBe('Pazartesi');
    });
});

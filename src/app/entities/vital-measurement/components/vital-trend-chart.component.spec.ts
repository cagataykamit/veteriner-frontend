import { ComponentFixture, TestBed } from '@angular/core/testing';
import { VitalTrendChartComponent } from '@/app/entities/vital-measurement/components/vital-trend-chart.component';
import { VITAL_SIGNS, type VitalPointVm } from '@/app/entities/vital-measurement/models/vital-measurement-vm.model';

const point = (id: string, at: string, temperatureC: number | null, source: VitalPointVm['source'] = 'VitalMeasurement'): VitalPointVm => ({
    key: `${source}:${id}`,
    source,
    sourceId: id,
    measuredAtUtc: at,
    time: Date.parse(at),
    temperatureC,
    heartRateBpm: null,
    respiratoryRatePerMin: null,
    weightKg: null,
    hospitalizationId: null,
    examinationId: null,
    cancelled: false
});

const points = [point('e1', '2026-11-18T06:20:00Z', 39.8, 'Examination'), point('m1', '2026-11-18T10:00:00Z', 39.6), point('m2', '2026-11-19T05:00:00Z', null), point('m3', '2026-11-20T09:00:00Z', 38.5)];

describe('VitalTrendChartComponent', () => {
    let fixture: ComponentFixture<VitalTrendChartComponent>;

    const setup = async (pts: VitalPointVm[] = points) => {
        await TestBed.configureTestingModule({ imports: [VitalTrendChartComponent] }).compileComponents();
        fixture = TestBed.createComponent(VitalTrendChartComponent);
        fixture.componentRef.setInput('sign', VITAL_SIGNS[0]);
        fixture.componentRef.setInput('points', pts);
        fixture.componentRef.setInput('domain', [Date.parse('2026-11-18T06:00:00Z'), Date.parse('2026-11-20T11:20:00Z')]);
        fixture.detectChanges();
        await fixture.whenStable();
        fixture.detectChanges();
    };

    const root = () => fixture.nativeElement as HTMLElement;
    const dots = () => Array.from(root().querySelectorAll<SVGCircleElement>('[data-testid="vital-dot"]'));

    it('yalnız bu ölçüsü dolu noktaları çizer; muayeneden gelen nokta içi boştur', async () => {
        await setup();

        expect(dots()).toHaveLength(3);
        expect(dots()[0].getAttribute('fill')).toBe('var(--p-content-background)');
        expect(dots()[1].getAttribute('fill')).toBe('var(--p-primary-color)');
        expect(root().querySelector('svg')?.getAttribute('aria-label')).toBe('Ateş eğilimi, 3 ölçüm');
    });

    it('ölçüm yoksa boş durum metni gösterir', async () => {
        await setup([point('m2', '2026-11-19T05:00:00Z', null)]);

        expect(root().querySelector('svg')).toBeNull();
        expect(root().querySelector('[data-testid="vital-chart-empty"]')?.textContent).toContain('ateş ölçümü yok');
    });

    it('seçili nokta halkayla, gezinilen an çizgi ve değer ipucuyla işaretlenir', async () => {
        await setup();
        fixture.componentRef.setInput('selectedKey', 'VitalMeasurement:m1');
        fixture.componentRef.setInput('hoverTime', Date.parse('2026-11-20T09:00:00Z'));
        fixture.detectChanges();

        expect(root().querySelectorAll('[data-testid="vital-selected-ring"]')).toHaveLength(1);
        expect(root().querySelector('[data-testid="vital-crosshair"]')).not.toBeNull();
        expect(root().querySelector('[data-testid="vital-tip"]')?.textContent).toContain('38,5 °C');
    });

    it('bu ölçüsü boş bir an gezinilince çizgi görünür, ipucu görünmez', async () => {
        await setup();
        fixture.componentRef.setInput('hoverTime', Date.parse('2026-11-19T05:00:00Z'));
        fixture.detectChanges();

        expect(root().querySelector('[data-testid="vital-crosshair"]')).not.toBeNull();
        expect(root().querySelector('[data-testid="vital-tip"]')).toBeNull();
    });

    it('tıklanınca yatayda en yakın noktanın anahtarını bildirir', async () => {
        await setup();
        const picked: string[] = [];

        fixture.componentInstance.picked.subscribe((key) => picked.push(key));
        const svg = root().querySelector('svg')!;
        const rect = svg.getBoundingClientRect();

        svg.dispatchEvent(new MouseEvent('click', { clientX: rect.right - 2, clientY: rect.top + 20, bubbles: true }));
        svg.dispatchEvent(new MouseEvent('click', { clientX: rect.left + 2, clientY: rect.top + 20, bubbles: true }));

        expect(picked).toEqual(['VitalMeasurement:m3', 'Examination:e1']);
    });
});

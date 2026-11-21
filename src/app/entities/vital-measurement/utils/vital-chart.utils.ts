const HOUR_MS = 3_600_000;
const DAY_MS = 86_400_000;
/** Panel tarihleri Europe/Istanbul duvar saatiyle gösterir (`date.utils`); İstanbul 2016'dan beri sabit UTC+3. */
const ISTANBUL_OFFSET_MS = 3 * HOUR_MS;
const MONTHS = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];

export interface TimeTick {
    time: number;
    label: string;
}

/** Değer ekseni için yuvarlak adımlı çizgiler; ilk ve son çizgi veriyi kapsar. */
export function niceTicks(min: number, max: number, count = 3): number[] {
    if (min === max) {
        min -= 1;
        max += 1;
    }

    const raw = (max - min) / count;
    const magnitude = Math.pow(10, Math.floor(Math.log10(raw)));
    const step = [1, 2, 2.5, 5, 10].map((s) => s * magnitude).find((s) => s >= raw - 1e-9) ?? raw;
    const first = Math.floor(min / step + 1e-9) * step;
    const last = Math.ceil(max / step - 1e-9) * step;
    const ticks: number[] = [];

    for (let v = first; v <= last + step / 2; v += step) {
        ticks.push(Number(v.toFixed(6)));
    }

    return ticks;
}

const pad = (n: number) => String(n).padStart(2, '0');

/**
 * Zaman ekseni işaretleri (İstanbul saati): kısa aralıkta saat, on güne kadar gün başları, daha uzunda ay başları.
 * İşaretler `[from, to]` içindedir.
 */
export function timeTicks(from: number, to: number): TimeTick[] {
    const span = to - from;
    const ticks: TimeTick[] = [];
    // İstanbul duvar saatini UTC alanlarında taşıyan tarih; gerçek an için ofset geri çıkarılır.
    const wall = new Date(from + ISTANBUL_OFFSET_MS);

    const push = (label: (d: Date) => string, advance: (d: Date) => void) => {
        for (; wall.getTime() - ISTANBUL_OFFSET_MS <= to; advance(wall)) {
            const time = wall.getTime() - ISTANBUL_OFFSET_MS;

            if (time >= from) {
                ticks.push({ time, label: label(wall) });
            }
        }
    };

    if (span <= 1.5 * DAY_MS) {
        const stepHours = span <= 6 * HOUR_MS ? 1 : 6;

        wall.setUTCMinutes(0, 0, 0);
        push(
            (d) => `${pad(d.getUTCHours())}:00`,
            (d) => d.setUTCHours(d.getUTCHours() + stepHours)
        );
    } else if (span <= 10 * DAY_MS) {
        wall.setUTCHours(0, 0, 0, 0);
        push(
            (d) => `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`,
            (d) => d.setUTCDate(d.getUTCDate() + 1)
        );
    } else {
        const stepMonths = span > 300 * DAY_MS ? 3 : 1;

        // Üç aylık adımda çeyrek başlarına (Oca, Nis, Tem, Eki) hizalanır.
        wall.setUTCDate(1);
        wall.setUTCMonth(Math.floor(wall.getUTCMonth() / stepMonths) * stepMonths);
        wall.setUTCHours(0, 0, 0, 0);
        push(
            (d) => `${MONTHS[d.getUTCMonth()]}${d.getUTCMonth() < stepMonths ? ` ${d.getUTCFullYear()}` : ''}`,
            (d) => d.setUTCMonth(d.getUTCMonth() + stepMonths)
        );
    }

    // Aralığa hiçbir saat/gün/ay başı düşmüyorsa (ör. yeni açılmış yatış) eksen boş kalmasın: başlangıç anı yazılır.
    if (ticks.length === 0) {
        const start = new Date(from + ISTANBUL_OFFSET_MS);

        ticks.push({ time: from, label: `${pad(start.getUTCHours())}:${pad(start.getUTCMinutes())}` });
    }

    return ticks;
}

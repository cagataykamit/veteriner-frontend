import { PRODUCTS_READ_CLAIM, VACCINATIONS_READ_CLAIM } from '@/app/core/auth/operation-claims.constants';
import { type CardEntry, type NavigationEntry, REPORT_SECTIONS, REPORTS_ROUTE, visibleEntries, visibleGroups } from '@/app/core/routing/panel-navigation';
import type { ReportHubPeriod, ReportHubSeriesPointDto, ReportHubSummaryDto } from '@/app/features/reports/hub/models/report-hub-summary.model';
import { reportKeyFromRoute } from '@/app/features/reports/shared/report-preferences.service';
import { REPORT_HUB_COPY } from '@/app/shared/copy/panel-tr';

/**
 * Rapor Merkezi ana ekranının kuralları (ADR-052 K3–K5): hangi soru kartı ve hangi uyarı görünür, kartta hangi sayı yazar.
 * Görünürlük tek kuraldan geçer: bağlandığı raporun ya da sayfanın menü izni (`visibleEntries`). İzni olmayan kart çizilmez;
 * sayısı sıfır olan uyarı çizilmez. Sayılar sunucudan gelir (`REPORT_HUB_SUMMARY_API_CONTRACT.md`); burada yalnız biçimlenir.
 */

export type ReportHubQuestionId = keyof typeof REPORT_HUB_COPY.questions;

type HasClaim = (claim: string) => boolean;

/** Kartın sayısı hangi zamana bakar: seçili dönem, bugün (dönemden bağımsız), şu an (anlık durum) ya da sabit. */
type QuestionScope = 'period' | 'today' | 'now' | 'static';

interface ReportHubQuestionDefinition {
    readonly id: ReportHubQuestionId;
    /** Cevabı veren raporların anahtarları (`reportKeyFromRoute`); 17 raporun her biri en az bir soruda. */
    readonly reports: readonly string[];
    readonly scope: QuestionScope;
}

const QUESTIONS: readonly ReportHubQuestionDefinition[] = [
    { id: 'cash', reports: ['end-of-day', 'cash-registers'], scope: 'today' },
    { id: 'period', reports: ['performance', 'clinics-overview'], scope: 'period' },
    { id: 'collections', reports: ['payments'], scope: 'period' },
    { id: 'outstanding', reports: ['outstanding-balances'], scope: 'now' },
    { id: 'appointments', reports: ['appointments'], scope: 'period' },
    { id: 'clinical', reports: ['examinations', 'vaccinations'], scope: 'period' },
    { id: 'hbs', reports: ['registers.hbs-prescriptions', 'registers.hbs-vaccinations'], scope: 'now' },
    {
        id: 'registers',
        reports: ['registers.examinations', 'registers.prescriptions', 'registers.vaccines', 'registers.medications', 'registers.controlled-substances', 'registers.vaccine-info'],
        scope: 'static'
    }
];

/** Kartın parçası; `warn` dikkat isteyen sayı, `up`/`down` dönem farkı. */
export interface FigurePart {
    readonly text: string;
    readonly tone?: 'warn' | 'up' | 'down';
}

export interface ReportHubFigure {
    readonly value: string;
    readonly unit: string;
    /** Sayının zamanı (bugün, bu hafta, şu an); sabit kartta yok. */
    readonly when: string | null;
    readonly parts: readonly FigurePart[];
    readonly spark: readonly number[] | null;
    readonly split: readonly { label: string; percent: number }[] | null;
}

export interface ReportHubQuestion {
    readonly id: ReportHubQuestionId;
    readonly title: string;
    readonly cadence: string;
    readonly reports: readonly CardEntry[];
    /** Özet yüklenmediyse ya da bölümün izni yoksa null: kart yalnız rapor bağlantılarıyla çizilir. */
    readonly figure: ReportHubFigure | null;
}

export interface ReportHubAttentionRow {
    readonly key: string;
    readonly count: number;
    readonly text: string;
    readonly hint: string;
    readonly action: string;
    readonly route: string;
    readonly queryParams?: Record<string, string>;
}

/** Kullanıcının açabildiği raporlar (menü izni; Rapor Merkezi kartlarıyla aynı kural). */
export function visibleReports(hasClaim: HasClaim): CardEntry[] {
    return visibleGroups(REPORT_SECTIONS, hasClaim).flatMap((section) => section.entries);
}

/** Görünür soru kartları, taslaktaki sırayla. Raporlarından hiçbiri açılamayan kart çizilmez. */
export function visibleQuestions(reports: readonly CardEntry[], summary: ReportHubSummaryDto | null, period: ReportHubPeriod): ReportHubQuestion[] {
    const byKey = new Map(reports.map((r) => [reportKeyFromRoute(r.route), r]));

    return QUESTIONS.flatMap((q) => {
        const links = q.reports.flatMap((key) => byKey.get(key) ?? []);

        if (links.length === 0) {
            return [];
        }

        const copy = REPORT_HUB_COPY.questions[q.id];

        return [{ id: q.id, title: copy.title, cadence: copy.cadence, reports: links, figure: figureFor(q, summary, period, links.length) }];
    });
}

/**
 * "Bakmanız gerekenler" satırları. Satır bağlandığı sayfanın izniyle görünür ve sayısı sıfırdan büyükse çizilir; sunucu izinsiz bölümü
 * zaten null döner.
 */
export function attentionRows(summary: ReportHubSummaryDto | null, hasClaim: HasClaim, nowUtc: Date = new Date()): ReportHubAttentionRow[] {
    const a = summary?.attention;

    if (!a) {
        return [];
    }

    const c = REPORT_HUB_COPY.attention;
    const oldest = (atUtc: string | null | undefined) => (atUtc ? `${c.oldest(daysSince(atUtc, nowUtc))} · ` : '');
    const rows: (ReportHubAttentionRow & { claims?: readonly string[]; requireAllClaims?: boolean })[] = [];

    const add = (count: number | null | undefined, row: Omit<ReportHubAttentionRow, 'count'>, link: Pick<NavigationEntry, 'claims' | 'requireAllClaims'> | undefined) => {
        if (count && count > 0 && link) {
            rows.push({ ...row, count, claims: link.claims, requireAllClaims: link.requireAllClaims });
        }
    };

    const hbsP = a.hbsNotEnteredPrescriptions;

    add(
        hbsP?.count,
        {
            key: 'hbsPrescriptions',
            text: c.hbsPrescriptions(hbsP?.count ?? 0),
            hint: oldest(hbsP?.oldestAtUtc) + c.hbsPrescriptionsSource,
            action: c.openList,
            route: reportRoute('registers.hbs-prescriptions')
        },
        reportEntry('registers.hbs-prescriptions')
    );

    const hbsV = a.hbsNotEnteredVaccinations;

    add(
        hbsV?.count,
        {
            key: 'hbsVaccinations',
            text: c.hbsVaccinations(hbsV?.count ?? 0),
            hint: oldest(hbsV?.oldestAtUtc) + c.hbsVaccinationsSource,
            action: c.openList,
            route: reportRoute('registers.hbs-vaccinations')
        },
        reportEntry('registers.hbs-vaccinations')
    );

    add(
        a.endOfDayUnchargedVisitCount,
        {
            key: 'endOfDay',
            text: c.endOfDay(a.endOfDayUnchargedVisitCount ?? 0),
            hint: c.endOfDayHint,
            action: c.endOfDayAction,
            route: reportRoute('end-of-day')
        },
        reportEntry('end-of-day')
    );

    add(
        a.overdueVaccinationCount,
        {
            key: 'overdueVaccinations',
            text: c.overdueVaccinations(a.overdueVaccinationCount ?? 0),
            hint: c.overdueVaccinationsHint,
            action: c.openList,
            route: '/panel/vaccinations',
            queryParams: { overdue: 'true' }
        },
        { claims: [VACCINATIONS_READ_CLAIM] }
    );

    add(
        a.lowStockProductCount,
        {
            key: 'lowStock',
            text: c.lowStock(a.lowStockProductCount ?? 0),
            hint: c.lowStockHint,
            action: c.openList,
            route: '/panel/stocks',
            queryParams: { isBelowMinimum: 'true' }
        },
        { claims: [PRODUCTS_READ_CLAIM] }
    );

    return visibleEntries(
        rows.map((r) => ({ ...r, label: r.text })),
        hasClaim
    ).map(({ key, count, text, hint, action, route, queryParams }) => ({
        key,
        count,
        text,
        hint,
        action,
        route,
        ...(queryParams ? { queryParams } : {})
    }));
}

/** Arama: rapor adı, açıklaması ve anahtar kelimeleri (Türkçe harf ve şapka farkı yok sayılır); her kelime geçmeli. */
export function reportMatches(report: CardEntry, query: string): boolean {
    const words = normalize(query).split(/\s+/).filter(Boolean);

    if (words.length === 0) {
        return false;
    }

    const key = reportKeyFromRoute(report.route) ?? '';
    const haystack = normalize([report.label, report.description, REPORT_HUB_COPY.keywords[key] ?? ''].join(' '));

    return words.every((w) => haystack.includes(w));
}

/** Tam sayı tutar, taslaktaki gibi: "18.450 ₺". */
export function formatHubMoney(amount: number): string {
    return `${new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 0 }).format(amount)} ₺`;
}

function figureFor(q: ReportHubQuestionDefinition, s: ReportHubSummaryDto | null, period: ReportHubPeriod, reportCount: number): ReportHubFigure | null {
    const u = REPORT_HUB_COPY.units;
    const f = REPORT_HUB_COPY.figures;
    const when = q.scope === 'period' ? REPORT_HUB_COPY.periodWhen[period] : q.scope === 'today' ? REPORT_HUB_COPY.periodWhen.today : q.scope === 'now' ? REPORT_HUB_COPY.now : null;
    const fig = (value: string, unit: string, parts: FigurePart[], extra: Partial<Pick<ReportHubFigure, 'spark' | 'split'>> = {}): ReportHubFigure => ({
        value,
        unit,
        when,
        parts,
        spark: extra.spark ?? null,
        split: extra.split ?? null
    });

    if (q.id === 'registers') {
        return fig(String(reportCount), u.registers, [{ text: f.registersHint }]);
    }

    if (!s) {
        return null;
    }

    switch (q.id) {
        case 'cash': {
            const cash = s.todayCash;

            if (!cash) {
                return null;
            }

            const uncharged = s.attention.endOfDayUnchargedVisitCount ?? 0;
            const parts: FigurePart[] = [];

            if (uncharged > 0) {
                parts.push({ text: f.unchargedWork(uncharged), tone: 'warn' }, { text: f.unchargedWorkTail });
            }

            if (cash.mainRegisterBalance != null) {
                parts.push({ text: (parts.length ? ' · ' : '') + f.mainRegister(formatHubMoney(cash.mainRegisterBalance)) });
            }

            return fig(formatHubMoney(cash.netCollectedAmount), u.collected, parts, { spark: values(cash.last7Days) });
        }

        case 'period': {
            const t = s.turnover;

            if (!t) {
                return null;
            }

            const delta = percentChange(t.netChargeAmount, t.previousNetChargeAmount);
            const parts: FigurePart[] = delta == null ? [] : [{ text: `${delta >= 0 ? '+' : '−'}%${Math.abs(delta)}`, tone: delta >= 0 ? 'up' : 'down' }, { text: ` ${REPORT_HUB_COPY.compareWith[period]}` }];

            return fig(formatHubMoney(t.netChargeAmount), u.turnover, parts, { spark: values(t.series) });
        }

        case 'collections': {
            const c = s.collections;

            if (!c) {
                return null;
            }

            return fig(formatHubMoney(c.netAmount), u.collected, [{ text: f.payments(c.collectedCount) }], { split: split(c.byMethod) });
        }

        case 'outstanding': {
            const o = s.outstanding;

            if (!o) {
                return null;
            }

            const parts: FigurePart[] = [{ text: f.clients(o.clientCount) }];

            if (o.maxClientOutstandingAmount > 0) {
                parts.push({ text: ` · ${f.highest(formatHubMoney(o.maxClientOutstandingAmount))}` });
            }

            return fig(formatHubMoney(o.totalOutstandingAmount), u.outstanding, parts);
        }

        case 'appointments': {
            const a = s.appointments;

            if (!a) {
                return null;
            }

            const parts: FigurePart[] = [{ text: f.noShow(a.noShowCount), tone: a.noShowCount > 0 ? 'warn' : undefined }];

            if (a.totalCount > 0 && a.noShowCount > 0) {
                parts.push({ text: ` ${f.share(Math.round((a.noShowCount / a.totalCount) * 100))}` });
            }

            return fig(String(a.totalCount), u.appointments, parts, { spark: values(a.series) });
        }

        case 'clinical': {
            const e = s.examinations;
            const v = s.vaccinations;

            if (!e && !v) {
                return null;
            }

            const planned = v && v.upcomingCount > 0 ? [{ text: f.vaccinesPlanned(v.upcomingCount) }] : [];

            if (!e) {
                return fig(String(v!.appliedCount), u.vaccinesApplied, planned);
            }

            const parts: FigurePart[] = v ? [{ text: f.vaccinesApplied(v.appliedCount) }, ...planned.map((p) => ({ text: ` · ${p.text}` }))] : [];

            return fig(String(e.count), u.examinations, parts, { spark: values(e.series) });
        }

        case 'hbs': {
            const p = s.attention.hbsNotEnteredPrescriptions;
            const v = s.attention.hbsNotEnteredVaccinations;

            if (!p && !v) {
                return null;
            }

            const total = (p?.count ?? 0) + (v?.count ?? 0);

            return fig(String(total), u.hbsPending, [{ text: f.hbsSplit(p?.count ?? 0, v?.count ?? 0), tone: total > 0 ? 'warn' : undefined }]);
        }

        default:
            return null;
    }
}

function values(series: readonly ReportHubSeriesPointDto[]): number[] {
    return series.map((p) => p.value);
}

/** Yuvarlanmış yüzde fark; önceki dönem 0 ise fark yazılmaz. */
function percentChange(current: number, previous: number): number | null {
    return previous > 0 ? Math.round(((current - previous) / previous) * 100) : null;
}

/** Ödeme yolu payları (taslaktaki sıra: Kart, Nakit, Havale); net tahsilat yoksa çizilmez. */
function split(byMethod: readonly { paymentMethod: 'Cash' | 'Card' | 'Transfer'; netAmount: number }[]): { label: string; percent: number }[] | null {
    const order = ['Card', 'Cash', 'Transfer'] as const;
    const amounts = order.map((m) => Math.max(0, byMethod.find((x) => x.paymentMethod === m)?.netAmount ?? 0));
    const total = amounts.reduce((sum, x) => sum + x, 0);

    return total > 0 ? order.map((m, i) => ({ label: REPORT_HUB_COPY.paymentMethods[m], percent: Math.round((amounts[i] / total) * 100) })) : null;
}

function reportRoute(key: string): string {
    return `${REPORTS_ROUTE}/${key.replace('.', '/')}`;
}

/** Bandın rapora giden satırı raporun menü iznini kullanır (izin iki kez yazılmaz). */
function reportEntry(key: string): CardEntry | undefined {
    return REPORT_SECTIONS.flatMap((s) => s.entries).find((e) => e.route === reportRoute(key));
}

function daysSince(atUtc: string, nowUtc: Date): number {
    const day = (d: Date) => Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());

    return Math.max(0, Math.round((day(nowUtc) - day(new Date(atUtc))) / 86_400_000));
}

function normalize(s: string): string {
    return s.toLocaleLowerCase('tr').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ı/g, 'i');
}

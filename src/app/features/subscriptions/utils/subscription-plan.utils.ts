const PLAN_LABELS: Record<string, string> = {
    basic: 'Temel',
    pro: 'Pro',
    premium: 'Premium'
};

function normalizePlanKey(value: string | null | undefined): string {
    return (value ?? '')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '');
}

export function subscriptionPlanLabel(code: string | null | undefined, name: string | null | undefined): string {
    const byCode = PLAN_LABELS[normalizePlanKey(code)];
    if (byCode) {
        return byCode;
    }

    const byName = PLAN_LABELS[normalizePlanKey(name)];
    if (byName) {
        return byName;
    }

    const displayName = name?.trim();
    if (displayName) {
        return displayName;
    }

    const displayCode = code?.trim();
    if (displayCode) {
        return displayCode;
    }

    return '—';
}

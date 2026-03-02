/** Persona-keyed quick reply suggestions */
const QUICK_REPLIES_BY_PERSONA: Record<string, string[]> = {
    farmer: ['Crop Insurance', 'Tractor Loan', 'Seeds Subsidy'],
    student: ['Scholarship', 'Education Loan', 'Study Abroad'],
    business: ['MSME Loan', 'Startup Grant', 'GST Registration'],
    citizen: ['Pension Scheme', 'Health Insurance', 'Housing Scheme'],
};

const FALLBACK_QUICK_REPLIES: string[] = [
    'Crop Insurance',
    'Scholarship',
    'Health Insurance',
];

export function getQuickReplies(personaId?: string | null): string[] {
    if (personaId && QUICK_REPLIES_BY_PERSONA[personaId]) {
        return QUICK_REPLIES_BY_PERSONA[personaId];
    }
    return FALLBACK_QUICK_REPLIES;
}

/** @deprecated Use getQuickReplies(personaId) instead */
export const DEFAULT_QUICK_REPLIES: string[] = FALLBACK_QUICK_REPLIES;

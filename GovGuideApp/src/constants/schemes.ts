export interface SchemeData {
    title: string;
    summary: string;
    eligibility: string;
    firstStep: string;
    docUrl?: string;
    keywords: string[];
}

export const PM_KISAN_SCHEME: SchemeData = {
    title: 'PM Kisan Samman Nidhi',
    summary: 'The government gives you ₹6000 a year to help buy seeds and fertilizer.',
    eligibility: 'Farmers who own less than 2 hectares of land.',
    firstStep: 'Go to your local CSC office with your Aadhar card.',
    docUrl: 'https://pmkisan.gov.in/',
    keywords: ['tractor', 'crop', 'money'],
};

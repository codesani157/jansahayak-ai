import { fetchSourceWithRetry } from './fetch';
import { normalizeFetchedSource } from './normalize';
import type { SourceFetchResult, SourceRegistryEntry } from './types';

// OGD APIs generally require authentication parameters or formatting query arguments.
// For example: api_key={KEY}&format="json"
const OGD_TEST_URL = 'https://api.data.gov.in/resource/YOUR_RESOURCE_ID_HERE';

const sourceEntry: SourceRegistryEntry = {
    id: 'central_ogd_test',
    name: 'Open Government Data (Test Endpoint)',
    source_url: OGD_TEST_URL,
    source_type: 'api',
    parser_strategy: 'ogd_api', // The new strategy we added!
    trust_level: 100,
    source_state: 'central',
    department_hint: 'Central Govt',
    category_hint: 'general',
};

async function main() {
    console.log(`\n===========================================`);
    console.log(`🔎 TESTING OGD STRUCTURED JSON EXTRACTION`);
    console.log(`===========================================\n`);

    if (OGD_TEST_URL.includes("YOUR_RESOURCE_ID_HERE")) {
        console.warn("⚠️  NOTE: We are parsing a pre-defined test structure as the REAL OGD_TEST_URL needs your personal `api - key` and `resource - id`!");

        const mockResult: SourceFetchResult = {
            source_id: sourceEntry.id,
            source_url: sourceEntry.source_url,
            source_state: sourceEntry.source_state,
            source_type: sourceEntry.source_type,
            parser_strategy: sourceEntry.parser_strategy,
            fetched_at: new Date().toISOString(),
            status: 'success',
            http_status: 200,
            body: JSON.stringify({
                index_name: "test_index",
                title: "Agriculture Welfare test",
                records: [
                    {
                        scheme_name: "Pradhan Mantri Kisan Samman Nidhi (Fake Data)",
                        objective: "Provide Rs. 6000 directly",
                        eligibility_criteria: "Farmer with valid Aadhaar",
                        benefits: "6000 per year directly to bank",
                        apply_link: "https://pmkisan.gov.in"
                    }
                ]
            }),
        };

        const extracted = normalizeFetchedSource(mockResult, sourceEntry);

        console.log(`✅ Extracted ${extracted.schemes.length} records!\n`);
        console.log(extracted.schemes);
        return;
    }
}

main().catch(console.error);

/**
 * Full-scale MyScheme.gov.in scraper.
 *
 * Discovered API: https://api.myscheme.gov.in/search/v6/schemes
 * Public key embedded in MyScheme frontend JS bundle.
 * Requires Origin + Referer headers to authenticate.
 *
 * Fetches ALL 4,632+ schemes in batches and writes to schemes.json.
 */

const API_BASE = 'https://api.myscheme.gov.in/search/v6/schemes';
const API_KEY = 'tYTy5eEhlu9rFjyxuCr7ra7ACp4dv1RH8gWuHTDc';
const BATCH_SIZE = 100;
const DELAY_MS = 600;

const HEADERS: Record<string, string> = {
    'x-api-key': API_KEY,
    'Accept': 'application/json',
    'Origin': 'https://www.myscheme.gov.in',
    'Referer': 'https://www.myscheme.gov.in/',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
};

interface SeedScheme {
    id: string;
    title: string;
    summary: string;
    eligibility: string;
    benefit_amount: string;
    apply_url: string;
    department: string;
    category: string;
}

function slugToId(slug: string): string {
    return slug.replace(/-/g, '_').toLowerCase();
}

function mapCategory(cat?: string): string {
    if (!cat) return 'general';
    const c = cat.toLowerCase();
    if (c.includes('agriculture') || c.includes('rural')) return 'agriculture';
    if (c.includes('education') || c.includes('learning')) return 'education';
    if (c.includes('health')) return 'health';
    if (c.includes('housing') || c.includes('shelter')) return 'housing';
    if (c.includes('business') || c.includes('entrepreneur')) return 'business';
    if (c.includes('employment') || c.includes('skill') || c.includes('labour')) return 'employment';
    if (c.includes('women') || c.includes('child')) return 'women_and_children';
    if (c.includes('financial') || c.includes('banking') || c.includes('insurance')) return 'financial_inclusion';
    if (c.includes('welfare') || c.includes('social')) return 'welfare';
    if (c.includes('science') || c.includes('technology')) return 'science_technology';
    if (c.includes('sports') || c.includes('youth')) return 'sports_youth';
    if (c.includes('transport')) return 'transport';
    if (c.includes('utility') || c.includes('energy') || c.includes('power')) return 'utility';
    return 'general';
}

function toSeedScheme(hit: any): SeedScheme | null {
    const slug = hit.schemeSlug ?? hit.slug ?? '';
    if (!slug) return null;

    const name = hit.schemeName ?? hit.title ?? 'Unnamed Scheme';
    const desc = hit.schemeShortDescription ?? hit.description ?? '';
    const ministry = hit.nodalMinistryName ?? hit.ministry ?? 'Government of India';
    const category = hit.schemeCategory ?? hit.category ?? '';
    const tags = Array.isArray(hit.tags) ? hit.tags.join(', ') : '';
    const beneficiaries = Array.isArray(hit.beneficiaries) ? hit.beneficiaries.join(', ') : '';
    const schemeFor = Array.isArray(hit.schemeFor) ? hit.schemeFor.join(', ') : '';

    let eligibility = '';
    if (beneficiaries) eligibility += `Target beneficiaries: ${beneficiaries}. `;
    if (schemeFor) eligibility += `Scheme for: ${schemeFor}. `;
    if (hit.level) eligibility += `Level: ${hit.level}. `;
    if (hit.state) eligibility += `State: ${hit.state}. `;
    if (!eligibility) eligibility = 'Visit the official scheme page for eligibility details.';

    return {
        id: slugToId(slug),
        title: name,
        summary: desc || `Government scheme: ${name}. ${tags ? 'Tags: ' + tags : ''}`,
        eligibility: eligibility.trim(),
        benefit_amount: tags || 'See official scheme page for benefit details',
        apply_url: `https://www.myscheme.gov.in/schemes/${slug}`,
        department: ministry,
        category: mapCategory(category),
    };
}

function extractHits(data: any): { hits: any[]; total: number } {
    // Try common response structures
    if (data.data?.schemes) {
        return { hits: data.data.schemes, total: data.data.totalCount ?? data.data.total ?? 0 };
    }
    if (data.data?.hits) {
        return { hits: data.data.hits, total: data.data.total ?? 0 };
    }
    if (Array.isArray(data.data)) {
        return { hits: data.data, total: data.total ?? data.data.length };
    }
    if (data.hits?.hits) {
        return { hits: data.hits.hits.map((h: any) => h._source ?? h), total: data.hits.total?.value ?? data.hits.total ?? 0 };
    }
    if (data.schemes) {
        return { hits: data.schemes, total: data.totalCount ?? data.total ?? 0 };
    }
    // Log keys for debugging
    console.log('  DEBUG: Response top-level keys:', Object.keys(data));
    if (data.data) console.log('  DEBUG: data keys:', Object.keys(data.data));
    return { hits: [], total: 0 };
}

async function fetchBatch(from: number, size: number): Promise<{ hits: any[]; total: number }> {
    const url = `${API_BASE}?lang=en&q=%5B%5D&from=${from}&size=${size}`;

    const response = await fetch(url, { headers: HEADERS });

    if (!response.ok) {
        const body = await response.text();
        throw new Error(`API ${response.status}: ${body.substring(0, 200)}`);
    }

    const data = await response.json() as any;
    return extractHits(data);
}

async function main() {
    const fs = await import('fs');
    const path = await import('path');

    console.log('🚀 Starting full-scale MyScheme scrape...');
    console.log(`   API: ${API_BASE}`);
    console.log(`   Batch size: ${BATCH_SIZE}\n`);

    // First batch to discover total & structure
    const first = await fetchBatch(0, BATCH_SIZE);
    console.log(`📊 Total schemes: ${first.total}`);
    console.log(`   First batch: ${first.hits.length} schemes\n`);

    if (first.hits.length === 0) {
        // Dump raw for debugging
        const rawRes = await fetch(`${API_BASE}?lang=en&q=%5B%5D&from=0&size=2`, { headers: HEADERS });
        const raw = await rawRes.text();
        console.log('DEBUG raw response:', raw.substring(0, 1000));
        process.exit(1);
    }

    // Log a sample to verify mapping
    console.log('Sample scheme keys:', Object.keys(first.hits[0]));
    console.log('Sample scheme:', JSON.stringify(first.hits[0], null, 2).substring(0, 500), '\n');

    const allHits: any[] = [...first.hits];
    const total = first.total || 5000;

    for (let offset = BATCH_SIZE; offset < total; offset += BATCH_SIZE) {
        const batchNum = Math.floor(offset / BATCH_SIZE) + 1;
        const totalBatches = Math.ceil(total / BATCH_SIZE);
        process.stdout.write(`   Batch ${batchNum}/${totalBatches} (${offset}/${total})...`);

        try {
            const batch = await fetchBatch(offset, BATCH_SIZE);
            allHits.push(...batch.hits);
            console.log(` ✅ +${batch.hits.length} (total: ${allHits.length})`);

            if (batch.hits.length === 0) {
                console.log('   No more results.');
                break;
            }
        } catch (err: any) {
            console.error(` ❌ ${err.message}`);
        }

        await new Promise(r => setTimeout(r, DELAY_MS));
    }

    console.log(`\n📦 Raw schemes: ${allHits.length}`);

    // Deduplicate
    const seen = new Set<string>();
    const unique = allHits.filter(h => {
        const slug = h.schemeSlug ?? h.slug ?? '';
        if (!slug || seen.has(slug)) return false;
        seen.add(slug);
        return true;
    });
    console.log(`   Unique: ${unique.length}`);

    // Convert
    const seeds = unique.map(toSeedScheme).filter((s): s is SeedScheme => s !== null);
    console.log(`   Valid seeds: ${seeds.length}`);

    // Write
    const outPath = path.join(__dirname, '..', 'data', 'schemes.json');
    fs.writeFileSync(outPath, JSON.stringify(seeds, null, 2), 'utf-8');

    const sizeMB = (fs.statSync(outPath).size / (1024 * 1024)).toFixed(2);
    console.log(`\n✅ Written ${seeds.length} schemes to schemes.json (${sizeMB} MB)`);

    // Category summary
    const cats: Record<string, number> = {};
    seeds.forEach(s => { cats[s.category] = (cats[s.category] ?? 0) + 1; });
    console.log('\n📊 Categories:');
    Object.entries(cats).sort((a, b) => b[1] - a[1]).forEach(([c, n]) => console.log(`   ${c}: ${n}`));
}

main().catch(err => {
    console.error('Fatal:', err);
    process.exit(1);
});

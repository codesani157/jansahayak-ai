# Full-Scale MyScheme Scraper (PowerShell)
# Fetches all 4,632 govt schemes from api.myscheme.gov.in
# Writes to backend/src/data/schemes.json

[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$apiBase = "https://api.myscheme.gov.in/search/v6/schemes"
$headers = @{
    "x-api-key" = "tYTy5eEhlu9rFjyxuCr7ra7ACp4dv1RH8gWuHTDc"
    "Origin"    = "https://www.myscheme.gov.in"
    "Referer"   = "https://www.myscheme.gov.in/"
}
$batchSize = 100
$delayMs = 600

$allSchemes = @()
$offset = 0

# Get total
$firstUrl = "$apiBase`?lang=en&q=%5B%5D&from=0&size=$batchSize"
$first = Invoke-RestMethod -Uri $firstUrl -Headers $headers
$total = $first.data.hits.page.total
Write-Host "Total schemes: $total"

# Extract items from first batch
foreach ($item in $first.data.hits.items) {
    $f = $item.fields
    $slug = $f.slug
    if (-not $slug) { continue }

    $tags = if ($f.tags) { $f.tags } else { "" }
    $catRaw = if ($f.schemeCategory) { $f.schemeCategory } else { "general" }

    # Map category
    $cat = "general"
    $cl = $catRaw.ToLower()
    if ($cl -match "agriculture|rural") { $cat = "agriculture" }
    elseif ($cl -match "education|learning") { $cat = "education" }
    elseif ($cl -match "health") { $cat = "health" }
    elseif ($cl -match "housing|shelter") { $cat = "housing" }
    elseif ($cl -match "business|entrepreneur") { $cat = "business" }
    elseif ($cl -match "employment|skill|labour") { $cat = "employment" }
    elseif ($cl -match "women|child") { $cat = "women_and_children" }
    elseif ($cl -match "financial|banking|insurance") { $cat = "financial_inclusion" }
    elseif ($cl -match "welfare|social") { $cat = "welfare" }
    elseif ($cl -match "science|technology") { $cat = "science_technology" }
    elseif ($cl -match "sports|youth") { $cat = "sports_youth" }
    elseif ($cl -match "transport") { $cat = "transport" }
    elseif ($cl -match "utility|energy|power") { $cat = "utility" }

    $eligibility = ""
    if ($f.beneficiaryState) { $eligibility += "State: $($f.beneficiaryState). " }
    if ($f.level) { $eligibility += "Level: $($f.level). " }
    if ($f.schemeFor) { $eligibility += "Scheme for: $($f.schemeFor). " }
    if (-not $eligibility) { $eligibility = "Visit official scheme page for details." }

    $scheme = @{
        id             = ($slug -replace "-", "_").ToLower()
        title          = if ($f.schemeName) { $f.schemeName } else { "Unnamed" }
        summary        = if ($f.briefDescription) { $f.briefDescription } else { "Government scheme. Tags: $tags" }
        eligibility    = $eligibility.Trim()
        benefit_amount = if ($tags) { $tags } else { "See official page" }
        apply_url      = "https://www.myscheme.gov.in/schemes/$slug"
        department     = if ($f.nodalMinistryName) { $f.nodalMinistryName } else { "Government of India" }
        category       = $cat
    }
    $allSchemes += $scheme
}

Write-Host "First batch: $($allSchemes.Count) schemes"

# Fetch remaining
for ($offset = $batchSize; $offset -lt $total; $offset += $batchSize) {
    $batchNum = [math]::Floor($offset / $batchSize) + 1
    $totalBatches = [math]::Ceiling($total / $batchSize)
    Write-Host -NoNewline "  Batch $batchNum/$totalBatches ($offset/$total)..."

    try {
        $url = "$apiBase`?lang=en&q=%5B%5D&from=$offset&size=$batchSize"
        $batch = Invoke-RestMethod -Uri $url -Headers $headers
        $items = $batch.data.hits.items

        if (-not $items -or $items.Count -eq 0) {
            Write-Host " No more results."
            break
        }

        foreach ($item in $items) {
            $f = $item.fields
            $slug = $f.slug
            if (-not $slug) { continue }

            $tags = if ($f.tags) { $f.tags } else { "" }
            $catRaw = if ($f.schemeCategory) { $f.schemeCategory } else { "general" }

            $cat = "general"
            $cl = $catRaw.ToLower()
            if ($cl -match "agriculture|rural") { $cat = "agriculture" }
            elseif ($cl -match "education|learning") { $cat = "education" }
            elseif ($cl -match "health") { $cat = "health" }
            elseif ($cl -match "housing|shelter") { $cat = "housing" }
            elseif ($cl -match "business|entrepreneur") { $cat = "business" }
            elseif ($cl -match "employment|skill|labour") { $cat = "employment" }
            elseif ($cl -match "women|child") { $cat = "women_and_children" }
            elseif ($cl -match "financial|banking|insurance") { $cat = "financial_inclusion" }
            elseif ($cl -match "welfare|social") { $cat = "welfare" }
            elseif ($cl -match "science|technology") { $cat = "science_technology" }
            elseif ($cl -match "sports|youth") { $cat = "sports_youth" }
            elseif ($cl -match "transport") { $cat = "transport" }
            elseif ($cl -match "utility|energy|power") { $cat = "utility" }

            $eligibility = ""
            if ($f.beneficiaryState) { $eligibility += "State: $($f.beneficiaryState). " }
            if ($f.level) { $eligibility += "Level: $($f.level). " }
            if ($f.schemeFor) { $eligibility += "Scheme for: $($f.schemeFor). " }
            if (-not $eligibility) { $eligibility = "Visit official scheme page for details." }

            $scheme = @{
                id             = ($slug -replace "-", "_").ToLower()
                title          = if ($f.schemeName) { $f.schemeName } else { "Unnamed" }
                summary        = if ($f.briefDescription) { $f.briefDescription } else { "Government scheme. Tags: $tags" }
                eligibility    = $eligibility.Trim()
                benefit_amount = if ($tags) { $tags } else { "See official page" }
                apply_url      = "https://www.myscheme.gov.in/schemes/$slug"
                department     = if ($f.nodalMinistryName) { $f.nodalMinistryName } else { "Government of India" }
                category       = $cat
            }
            $allSchemes += $scheme
        }

        Write-Host " +$($items.Count) (total: $($allSchemes.Count))"
    }
    catch {
        Write-Host " ERROR: $($_.Exception.Message)"
    }

    Start-Sleep -Milliseconds $delayMs
}

# Deduplicate
$seen = @{}
$unique = @()
foreach ($s in $allSchemes) {
    if (-not $seen.ContainsKey($s.id)) {
        $seen[$s.id] = $true
        $unique += $s
    }
}

Write-Host "`nTotal unique schemes: $($unique.Count)"

# Write JSON
$outPath = "C:\Hackathon Files\AI for Bharat\backend\src\data\schemes.json"
$json = $unique | ConvertTo-Json -Depth 5
[System.IO.File]::WriteAllText($outPath, $json, [System.Text.Encoding]::UTF8)

$sizeMB = [math]::Round((Get-Item $outPath).Length / 1MB, 2)
Write-Host "Written to $outPath ($sizeMB MB)"

# Category summary
$cats = @{}
foreach ($s in $unique) {
    $c = $s.category
    if ($cats.ContainsKey($c)) { $cats[$c]++ } else { $cats[$c] = 1 }
}
Write-Host "`nCategory breakdown:"
$cats.GetEnumerator() | Sort-Object -Property Value -Descending | ForEach-Object {
    Write-Host "  $($_.Key): $($_.Value)"
}

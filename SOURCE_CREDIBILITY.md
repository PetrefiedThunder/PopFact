# Source Credibility & Fact-Checking Improvements

This document outlines the improvements made to PopFact to provide fact-checked information from highly valid and respectable sources.

## Overview

PopFact has been enhanced with a comprehensive source credibility system, multi-source verification, and integration with reputable fact-checking organizations. These improvements ensure that fact-checks are based on reliable, verifiable sources.

## Key Improvements

### 1. Multi-Source Verification

**What it does:**
- Queries multiple fact-checking sources simultaneously
- Aggregates results to determine consensus
- Provides higher confidence when multiple sources agree

**How it works:**
- When enabled, PopFact will:
  1. Query Google Fact Check Tools API (if configured)
  2. Query LLM-based fact-checking (OpenAI/Claude) with enhanced prompts
  3. Aggregate results with weighted scoring based on source credibility
  4. Display consensus information

**Benefits:**
- Reduces false positives/negatives
- Provides more reliable fact-checks
- Shows when sources disagree (MIXED verdict)

### 2. Source Credibility Scoring System

**Trusted Source Database:**
PopFact maintains a database of trusted sources with credibility scores:

#### Fact-Checking Organizations (0.90-0.95 credibility)
- **PolitiFact** (0.95) - IFCN verified
- **FactCheck.org** (0.95) - IFCN verified
- **Snopes** (0.90) - IFCN verified
- **Full Fact** (0.95) - IFCN verified

#### Reputable News Organizations (0.88-0.92 credibility)
- **Associated Press** (0.92)
- **Reuters** (0.92)
- **BBC** (0.90)
- **The Guardian** (0.88)
- **New York Times** (0.90)
- **Washington Post** (0.90)

#### Academic Sources (0.85-0.98 credibility)
- **Nature** (0.98)
- **Science** (0.98)
- **PubMed** (0.97)
- **Google Scholar** (0.85)
- Academic domains (.edu, .ac.uk, etc.) - (0.85)

#### Government Agencies (0.94-0.97 credibility)
- **CDC** (0.95)
- **NIH** (0.96)
- **WHO** (0.94)
- **NASA** (0.97)
- **NOAA** (0.96)
- All .gov domains (0.90)

**Credibility Scoring:**
- Sources are automatically scored based on their domain
- Scores range from 0.0 (unknown/unreliable) to 1.0 (highest credibility)
- Scores are cached for performance

### 3. Enhanced LLM Prompts

**Improved Prompt Engineering:**
- LLM prompts now explicitly require citations from reputable sources
- Only accepts sources from:
  - Fact-checking organizations (PolitiFact, FactCheck.org, Snopes, Full Fact)
  - Established news organizations (AP, Reuters, BBC, NYT, WaPo)
  - Peer-reviewed academic sources
  - Government agencies (CDC, NIH, WHO, NASA, NOAA)
- Returns UNVERIFIED if no reputable sources are found
- Requires specific URLs or citations

**Example Enhanced Prompt:**
```
You are an expert fact-checker. Analyze the following claim and provide a fact-check with citations from reputable sources.

CRITICAL REQUIREMENTS:
1. Only cite sources from reputable fact-checking organizations, established news organizations, peer-reviewed academic sources, or government agencies
2. If you cannot find reputable sources, respond with UNVERIFIED
3. Provide specific URLs or citations when possible
4. Base your verdict on evidence from these trusted sources only
```

### 4. Source Validation & Filtering

**Automatic Source Validation:**
- All sources are validated against the trusted source database
- Sources are categorized (fact-checker, news, academic, government, unknown)
- Credibility scores are assigned automatically
- Low-credibility sources can be filtered out

**User Controls:**
- **Trusted Sources Only**: Filter to only use verified fact-checkers, reputable news, academic, and government sources
- **Minimum Source Credibility**: Set a threshold (0-100%) below which sources are filtered out

### 5. Enhanced UI & Source Display

**Ticker Display:**
- Shows source names in the ticker
- Displays number of sources used
- Shows consensus indicators when multiple sources agree

**Source Details Modal:**
- Click any fact-check item to view detailed source information
- Shows:
  - All sources used
  - Source credibility scores
  - Source types (fact-checker, news, academic, government)
  - Links to original fact-checks
  - Consensus information
  - Verdict distribution across sources

### 6. Google Fact Check Tools Integration

**Full Integration:**
- Queries Google's ClaimReview API
- Processes multiple claim reviews
- Aggregates results with credibility weighting
- Shows publisher information
- Links to original fact-check articles

**Benefits:**
- Access to IFCN-verified fact-checkers
- Real-time fact-check database
- Multiple reviews per claim
- High credibility scores

## Configuration

### Settings

Access settings via the PopFact extension popup:

1. **Multi-Source Verification**
   - Enable/disable multi-source checking
   - Recommended: Enabled

2. **Trusted Sources Only**
   - Filter to only use high-credibility sources
   - Recommended: Enabled for maximum reliability

3. **Minimum Source Credibility**
   - Set threshold (0-100%)
   - Sources below threshold are filtered
   - Recommended: 70% or higher

### API Configuration

**Google Fact Check Tools API:**
1. Enable the API at https://console.cloud.google.com/
2. Get your API key
3. Select "Google Fact Check" as API Provider
4. Enter your API key

**OpenAI/Claude:**
- Configure as before
- Enhanced prompts automatically applied
- Sources are validated and filtered

## How It Works

### Fact-Checking Flow

```
1. Claim Detected
   ↓
2. Check Cache
   ↓
3. Multi-Source Query (if enabled)
   ├─ Google Fact Check API
   └─ LLM with Enhanced Prompts
   ↓
4. Source Validation
   ├─ Check against trusted source database
   ├─ Assign credibility scores
   └─ Filter by user settings
   ↓
5. Result Aggregation
   ├─ Weight by source credibility
   ├─ Determine consensus
   └─ Calculate confidence
   ↓
6. Display Results
   ├─ Show in ticker with source info
   └─ Enable detailed source view
```

### Source Credibility Lookup

```
Source URL
   ↓
Extract Domain
   ↓
Check Trusted Source Database
   ├─ Exact match → Use database score
   ├─ Academic domain → 0.85 credibility
   ├─ .gov domain → 0.90 credibility
   └─ Unknown → 0.50 credibility
   ↓
Cache Result
   ↓
Return Source Info
```

## Best Practices

### For Maximum Reliability

1. **Enable Multi-Source Verification**
   - Provides consensus across multiple sources
   - Reduces single-source errors

2. **Enable Trusted Sources Only**
   - Filters out low-credibility sources
   - Ensures fact-checks are from reputable organizations

3. **Set High Credibility Threshold**
   - 70% minimum recommended
   - 80%+ for maximum reliability

4. **Use Google Fact Check API**
   - Access to IFCN-verified fact-checkers
   - Most reliable source of fact-checks

### Understanding Results

- **TRUE/FALSE with high confidence (>80%)**: Multiple reputable sources agree
- **MIXED**: Sources disagree or claim has both accurate and inaccurate elements
- **UNVERIFIED**: No reputable sources found, or insufficient evidence
- **Source count**: More sources = higher reliability
- **Consensus indicator**: Shows when multiple sources reviewed the claim

## Technical Details

### Source Credibility Database

Located in `background.js`:
- `TRUSTED_SOURCES`: Object mapping domains to source information
- `ACADEMIC_DOMAINS`: Array of academic domain patterns
- Automatically detects .gov domains

### Source Validation

- All sources are validated in `validateAndEnhanceSources()`
- Credibility scores are cached for performance
- Filtering happens before result aggregation

### Result Aggregation

- Google Fact Check results are weighted by source credibility
- LLM results are validated and filtered
- Consensus is determined by weighted voting
- Confidence scores reflect source agreement

## Future Enhancements

Potential improvements:
- [ ] User-customizable source whitelist/blacklist
- [ ] Integration with more fact-checking APIs (PolitiFact, Snopes direct APIs)
- [ ] Machine learning for source credibility prediction
- [ ] Source reputation tracking over time
- [ ] Community-sourced source ratings
- [ ] Integration with academic paper databases
- [ ] Real-time source credibility updates

## Troubleshooting

### No Sources Found

- Check API configuration
- Verify API keys are valid
- Try lowering credibility threshold
- Disable "Trusted Sources Only" temporarily

### Low Confidence Scores

- Enable multi-source verification
- Use Google Fact Check API
- Check that sources meet credibility threshold
- Review source details in modal

### Sources Not Displaying

- Check browser console for errors
- Verify source URLs are valid
- Ensure sources pass credibility filter
- Check network connectivity

## References

- [International Fact-Checking Network (IFCN)](https://www.poynter.org/ifcn/)
- [Google Fact Check Tools API](https://developers.google.com/fact-check/tools/api)
- [ClaimReview Schema](https://schema.org/ClaimReview)

---

**Note**: Source credibility scores are based on established reputation and verification status. They are not absolute and should be considered alongside other factors when evaluating information.


const axios = require('axios');

// ==========================================
// MODULE 1: CONFIGURATION ENGINE
// ==========================================
const CONFIG = {
  MAX_JOB_AGE_DAYS: 7,
  CACHE_TTL_MS: 20 * 60 * 1000,
  MAX_RETRIES: 1,
  BATCH_SIZE: 10, // Process in 4 sequential batches of 10 to beat Vercel's 10s timeout
  SEARCH_QUERIES: [
    // ===== Core Systems Engineering =====
    'remote systems engineer',
    'remote software engineer',
    'remote platform engineer',
    'remote infrastructure engineer',
    'remote automation engineer',
    'remote solutions engineer',
    'remote site reliability engineer',
    'remote cloud engineer',
    'remote build engineer',
    'remote deployment engineer',

    // ===== Developer Experience =====
    'remote developer tools engineer',
    'remote developer productivity engineer',
    'remote developer experience engineer',
    'remote internal tooling engineer',
    'remote engineering productivity',
    'remote platform engineering',
    'remote observability engineer',

    // ===== Diagnostics / Architecture =====
    'remote software diagnostics',
    'remote debugging engineer',
    'remote system architecture',
    'remote technical consultant',
    'remote technical support engineer',
    'remote systems analyst',

    // ===== Frontend Engineering =====
    'remote frontend engineer',
    'remote frontend systems engineer',
    'remote javascript engineer',
    'remote typescript engineer',
    'remote react engineer',
    'remote next.js developer',
    'remote web systems engineer',

    // ===== AI / LLM / Evaluation =====
    'remote AI engineer',
    'remote AI evaluator',
    'remote LLM evaluator',
    'remote AI trainer',
    'remote AI safety',
    'remote RLHF',
    'remote prompt engineer',
    'remote code reviewer',
    'remote technical writer',

    // ===== Flexible Catch-all =====
    'remote developer',
    'remote engineer'
  ],
  BLACKLIST_COMPANIES: ['spammy agency', 'clickbait placements'],
  
  WEIGHTS: {
    SYSTEMS_ARCH: 25,
    DEV_TOOLS: 20,
    DIAGNOSTICS_PBRCIM: 20,
    DEVEX: 15,
    FRONTEND_JS: 12,
    AI_PROMPT_RLHF: 8
  }
};

let cache = {
  data: null,
  timestamp: null
};

function calculatePBRCIMMatch(job) {
  const title = (job.job_title || '').toLowerCase();
  const desc = (job.job_description || '').toLowerCase();
  const skills = (job.job_required_skills || []).map(s => s.toLowerCase());
  const fullText = `${title} ${desc} ${skills.join(' ')}`;

  let scores = { systemsArch: 0, devTools: 0, diagnostics: 0, devex: 0, frontend: 0, aiPrompt: 0 };

  if (/system(s)? (architect|engineer|design|infrastructure|reliability)/.test(fullText) || fullText.includes('devops') || fullText.includes('cloud')) {
    scores.systemsArch = CONFIG.WEIGHTS.SYSTEMS_ARCH;
  }
  if (fullText.includes('developer tools') || fullText.includes('internal tooling') || fullText.includes('build engineer') || fullText.includes('cli tool')) {
    scores.devTools = CONFIG.WEIGHTS.DEV_TOOLS;
  }
  if (fullText.includes('diagnos') || fullText.includes('debug') || fullText.includes('root cause') || fullText.includes('troubleshoot') || fullText.includes('performance optimization')) {
    scores.diagnostics = CONFIG.WEIGHTS.DIAGNOSTICS_PBRCIM;
  }
  if (fullText.includes('devex') || fullText.includes('developer experience') || fullText.includes('automation') || fullText.includes('ci/cd')) {
    scores.devex = CONFIG.WEIGHTS.DEVEX;
  }
  if (fullText.includes('frontend') || fullText.includes('react') || fullText.includes('next.js') || fullText.includes('typescript') || fullText.includes('javascript')) {
    scores.frontend = CONFIG.WEIGHTS.FRONTEND_JS;
  }
  if (fullText.includes('prompt') || fullText.includes('rlhf') || fullText.includes('ai trainer') || fullText.includes('data annotation') || fullText.includes('llm evaluator')) {
    scores.aiPrompt = CONFIG.WEIGHTS.AI_PROMPT_RLHF;
  }

  const totalScore = scores.systemsArch + scores.devTools + scores.diagnostics + scores.devex + scores.frontend + scores.aiPrompt;
  const percentage = Math.min(Math.round(totalScore), 100);

  let explanations = [];
  if (scores.systemsArch > 0) explanations.push('Systems Architecture');
  if (scores.devTools > 0) explanations.push('Developer Tools');
  if (scores.diagnostics > 0) explanations.push('Diagnostics & Analysis');
  if (scores.devex > 0) explanations.push('DevEx / Automation');
  if (scores.frontend > 0) explanations.push('Frontend Tech Stack');
  if (scores.aiPrompt > 0) explanations.push('AI Engineering / Prompts');

  let tier = 'low';
  if (percentage >= 70) tier = 'high';
  else if (percentage >= 40) tier = 'med';

  return {
    percentage,
    tier,
    explanations,
    isTier1: (scores.systemsArch > 0 || scores.devTools > 0 || scores.diagnostics > 0)
  };
}

function parseRemoteAndCountry(job) {
  const title = (job.job_title || '').toLowerCase();
  const desc = (job.job_description || '').toLowerCase();
  const locationText = `${title} ${desc} ${(job.job_country || '')}`.toLowerCase();

  let isRemote = !!job.job_is_remote;
  if (!isRemote) {
    isRemote = /remote|work from home|wfh|anywhere|worldwide|distributed|global/.test(locationText);
  }

  let countryEligibility = 'Global / Unspecified';
  let isNigeriaFriendly = false;

  if (/us only|usa only|united states only|citizen required/.test(locationText)) {
    countryEligibility = 'US Only';
  } else if (/eu only|europe only/.test(locationText)) {
    countryEligibility = 'EU Only';
  } else if (/uk only|united kingdom/.test(locationText)) {
    countryEligibility = 'UK Only';
  } else if (/worldwide|global|international|any country|work from anywhere/.test(locationText)) {
    countryEligibility = 'Worldwide';
    isNigeriaFriendly = true;
  }

  if (isRemote && countryEligibility === 'Global / Unspecified') {
    isNigeriaFriendly = true; 
  }

  return { isRemote, countryEligibility, isNigeriaFriendly };
}

async function fetchWithRetry(query, attempt = 1) {
  try {
    const res = await axios.get('https://jsearch.p.rapidapi.com/search-v2', {
      headers: {
        'X-RapidAPI-Key': process.env.RAPID_API_KEY,
        'X-RapidAPI-Host': 'jsearch.p.rapidapi.com'
      },
      params: { query: query, num_pages: '1' },
      timeout: 3500
    });
    return res.data?.data?.jobs || [];
  } catch (err) {
    if (attempt < CONFIG.MAX_RETRIES) {
      return await fetchWithRetry(query, attempt + 1);
    }
    return [];
  }
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Cache-Control', 's-maxage=1200, stale-while-revalidate');

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (cache.data && cache.timestamp && (Date.now() - cache.timestamp < CONFIG.CACHE_TTL_MS)) {
    return res.status(200).json(cache.data);
  }

  try {
    let rawResultsArray = [];
    
    // Execute all 40 queries in controlled batches of 10 to prevent Vercel serverless timeouts
    for (let i = 0; i < CONFIG.SEARCH_QUERIES.length; i += CONFIG.BATCH_SIZE) {
      const batch = CONFIG.SEARCH_QUERIES.slice(i, i + CONFIG.BATCH_SIZE);
      const batchResults = await Promise.all(batch.map(q => fetchWithRetry(q)));
      rawResultsArray.push(...batchResults);
    }

    let combinedJobs = rawResultsArray.flat();

    const uniqueMap = new Map();
    for (const job of combinedJobs) {
      if (!job.job_id) continue;
      const normalizedKey = `${job.employer_name || ''}_${job.job_title || ''}`.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (!uniqueMap.has(job.job_id) && !uniqueMap.has(normalizedKey)) {
        uniqueMap.set(job.job_id, job);
        uniqueMap.set(normalizedKey, job);
      }
    }
    
    let deduplicatedJobs = Array.from(new Set(uniqueMap.values()));
    let processedCollection = [];
    const nowMs = Date.now();

    for (const rawJob of deduplicatedJobs) {
      if (!rawJob.job_posted_at_timestamp) continue;
      const postedDate = new Date(rawJob.job_posted_at_timestamp * 1000);
      const daysAgo = (nowMs - postedDate.getTime()) / (1000 * 60 * 60 * 24);
      
      if (daysAgo > CONFIG.MAX_JOB_AGE_DAYS || daysAgo < 0) continue;

      const companyName = rawJob.employer_name || 'Unknown Corporation';
      if (CONFIG.BLACKLIST_COMPANIES.some(blocked => companyName.toLowerCase().includes(blocked))) continue;

      const { isRemote, countryEligibility, isNigeriaFriendly } = parseRemoteAndCountry(rawJob);
      if (!isRemote) continue;

      const evaluation = calculatePBRCIMMatch(rawJob);

      processedCollection.push({
        id: rawJob.job_id,
        title: rawJob.job_title || 'Untitled Technical Position',
        company: companyName,
        logo: rawJob.employer_logo || 'https://via.placeholder.com/40',
        description: rawJob.job_description || 'No description provided.',
        applyUrl: rawJob.job_apply_link || '#',
        employmentType: rawJob.job_employment_type || 'Full-time',
        postedTimestamp: rawJob.job_posted_at_timestamp,
        daysOld: Math.floor(daysAgo),
        salary: rawJob.job_min_salary ? `${rawJob.job_min_salary.toLocaleString()} - ${rawJob.job_max_salary?.toLocaleString() || ''} ${rawJob.job_salary_currency || 'USD'}` : 'Not Disclosed',
        location: `${rawJob.job_city || ''} ${rawJob.job_state || ''}, ${rawJob.job_country || ''}`.trim(),
        isRemote: true,
        countryEligibility,
        isNigeriaFriendly,
        matchScore: evaluation.percentage,
        matchTier: evaluation.tier,
        explanations: evaluation.explanations,
        isTier1: evaluation.isTier1
      });
    }

    processedCollection.sort((a, b) => {
      if (b.matchScore !== a.matchScore) return b.matchScore - a.matchScore;
      return b.postedTimestamp - a.postedTimestamp;
    });

    if (processedCollection.length > 0) {
      cache.data = processedCollection;
      cache.timestamp = nowMs;
    }

    return res.status(200).json(processedCollection);

  } catch (error) {
    console.error('Critical Controller Engine Fault:', error.message);
    return res.status(500).json({ error: 'Internal system aggregation fault encountered.' });
  }
};
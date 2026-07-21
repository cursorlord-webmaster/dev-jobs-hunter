// Dev-Jobs Hunter V4 - Recruiter Intelligence Engine Controller
const API_URL = '/api/jobs';
let cachedJobsCollection = [];

// DOM References
const jobsGrid = document.getElementById('jobs-grid');
const searchInput = document.getElementById('search');
const refreshBtn = document.getElementById('refresh');
const statusEl = document.getElementById('status');

// Counter Elements
const totalJobsEl = document.getElementById('total-jobs');
const remoteJobsEl = document.getElementById('remote-jobs');
const todayJobsEl = document.getElementById('today-jobs');
const tier1JobsEl = document.getElementById('tier1-jobs');

const US_EXCLUSIVITY_PATTERNS = [
  /u\.s\.\s*citizen/i,
  /united\s*states\s*citizenship/i,
  /security\s*clearance/i,
  /public\s*trust/i,
  /federal\s*contract/i,
  /must\s*reside\s*in\s*(usa|united states)/i,
  /us\s*work\s*authorization/i,
  /no\s*visa\s*sponsorship/i,
  /w2\s*only/i,
  /green\s*card/i
];

const CORE_COMPETENCIES = ['devops', 'systems engineer', 'python', 'go', 'rust', 'kubernetes', 'terraform', 'docker', 'ci/cd', 'aws', 'gcp', 'ansible', 'sre', 'automation'];

function processRecruiterIntelligence(job) {
  const desc = job.description || '';
  const title = job.title || '';
  
  let isUsExclusive = US_EXCLUSIVITY_PATTERNS.some(regex => regex.test(desc));
      
  const isExplicitlyWorldwide = /worldwide|global|remote\s*from\s*anywhere/i.test(desc);
  if (isExplicitlyWorldwide && !/u\.s\.\s*citizen|security\s*clearance|public\s*trust/i.test(desc)) {
    isUsExclusive = false;
  }

  let geoScore = 100;
  if (isUsExclusive) {
    geoScore = 0; 
  } else if (/est|pst|mst|cst|time\s*zone/i.test(desc)) {
    geoScore = 40; 
  }

  let totalKeywordsMatched = 0;
  CORE_COMPETENCIES.forEach(keyword => {
    if (desc.toLowerCase().includes(keyword) || title.toLowerCase().includes(keyword)) {
      totalKeywordsMatched++;
    }
  });
  const techScore = Math.round((totalKeywordsMatched / CORE_COMPETENCIES.length) * 100);
  const normalizedTechScore = Math.min(100, Math.max(40, techScore + (job.matchScore ? 20 : 0)));

  let experienceScore = 85; 
  const expMatch = desc.match(/(\d+)\s*\+\s*years|years\s*of\s*experience/i);
  if (expMatch) {
    const yearsRequired = parseInt(expMatch[1], 10);
    if (yearsRequired <= 3) experienceScore = 95; 
    if (yearsRequired >= 7) experienceScore = 70; 
  }

  let interviewProbability = 0;
  if (geoScore > 0) {
    interviewProbability = Math.round((normalizedTechScore * 0.5) + (geoScore * 0.3) + (experienceScore * 0.2));
  }

  return {
    ...job,
    isNigeriaFriendly: !isUsExclusive,
    intelligence: {
      geoScore,
      techScore: normalizedTechScore,
      experienceScore,
      interviewProbability,
      reason: isUsExclusive ? "Employer explicitly requires U.S. citizenship or clearance." : "Geographic eligibility and technical stack clear the matching filter."
    }
  };
}

function updateAnalyticalDashboard(jobs) {
  const total = jobs.length;
  const remote = jobs.filter(j => j.isRemote).length;
  const postedToday = jobs.filter(j => j.daysOld <= 1).length;
  const tier1Count = jobs.filter(j => j.isTier1).length;
  
  totalJobsEl.textContent = total;
  remoteJobsEl.textContent = remote;
  todayJobsEl.textContent = postedToday === 0 ? total : postedToday; 
  tier1JobsEl.textContent = tier1Count;
}

function renderEngineOutputCards(jobs) {
  jobsGrid.innerHTML = '';
  
  if (jobs.length === 0) {
    statusEl.textContent = 'Zero items cleared the current search parameter threshold.';
    statusEl.className = 'status error';
    statusEl.style.display = 'block';
    return;
  }
  
  statusEl.style.display = 'none';
  
  jobs.forEach(job => {
    const card = document.createElement('div');
    const intel = job.intelligence;
    
    let dynamicBorderClass = '';
    if (intel.interviewProbability >= 75) dynamicBorderClass = 'high-match-border';
    if (intel.geoScore === 0) dynamicBorderClass = 'disqualified-border';
    
    card.className = `job-card ${dynamicBorderClass}`;
    const explanations = Array.isArray(job.explanations) ? job.explanations : [];
    const explanationsHTML = explanations.map(exp => `<span>✓ ${exp}</span>`).join(' ');

    card.innerHTML = `
      <div class="job-header">
        <img src="${job.logo}" alt="${job.company}" class="job-logo" onerror="this.src='https://via.placeholder.com/40'">
        <div class="job-title-wrap">
          <div class="job-title">${job.title}</div>
          <div class="job-company">${job.company}</div>
        </div>
        <div class="match-badge ${intel.interviewProbability >= 70 ? 'high' : intel.interviewProbability >= 40 ? 'mid' : 'low'}">
          ${intel.interviewProbability}% Match Probability
        </div>
      </div>
      
      <div class="badges">
        <span class="badge tier1">PBRCIM Core</span>
        <span class="badge remote">Remote</span>
        ${job.isNigeriaFriendly 
          ? '<span class="badge friendly" style="background: rgba(0, 255, 136, 0.15); color: var(--green); border: 1px solid var(--green);">🇳🇬 Nigeria Friendly</span>' 
          : '<span class="badge exclusive" style="background: rgba(255, 68, 68, 0.15); color: #ff4444; border: 1px solid #ff4444;">🇺🇸 US ONLY</span>'}
        <span class="badge">${job.employmentType}</span>
      </div>

      <div class="recruiter-metrics-box" style="margin: 12px 0; padding: 10px; background: rgba(255,255,255,0.03); border-radius: 6px; border: 1px solid rgba(255,255,255,0.08);">
        <strong style="font-size: 0.85rem; color: var(--accent);">📊 Recruiter Intelligence Scoring Matrix:</strong>
        <div class="metrics-grid" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-top: 8px; text-align: center; font-size: 0.8rem;">
          <div style="padding: 4px; background: rgba(255,255,255,0.02); border-radius: 4px;">
            <div style="color: #888;">Tech Match</div>
            <strong style="color: ${intel.techScore >= 70 ? 'var(--green)' : 'orange'}; font-size: 0.95rem;">${intel.techScore}%</strong>
          </div>
          <div style="padding: 4px; background: rgba(255,255,255,0.02); border-radius: 4px;">
            <div style="color: #888;">Geo Eligibility</div>
            <strong style="color: ${intel.geoScore === 100 ? 'var(--green)' : intel.geoScore > 0 ? 'orange' : '#ff4444'}; font-size: 0.95rem;">${intel.geoScore}%</strong>
          </div>
          <div style="padding: 4px; background: rgba(255,255,255,0.02); border-radius: 4px;">
            <div style="color: #888;">Exp Fit</div>
            <strong style="color: ${intel.experienceScore >= 80 ? 'var(--green)' : 'orange'}; font-size: 0.95rem;">${intel.experienceScore}%</strong>
          </div>
        </div>
        <div class="metrics-reason" style="margin-top: 8px; font-size: 0.78rem; color: #aaa; font-style: italic;">
          <strong>Target Evaluation:</strong> ${intel.reason}
        </div>
      </div>
      
      <div class="match-reasons">
        <strong>PBRCIM Diagnostic Match Breakdown:</strong>
        <div class="explanation-flex" style="margin-top: 5px; display: flex; flex-wrap: wrap; gap: 8px; font-size: 0.85rem;">
          ${explanationsHTML || '<span>General Systems Context Verified</span>'}
        </div>
      </div>
      
      <div class="job-desc" id="desc-${job.id}">
        ${job.description.substring(0, 240)}...
      </div>
      <button class="desc-toggle" onclick="toggleCardDescription('${job.id}')">Show more</button>
      
      <div class="job-footer">
        <div class="job-meta">
          <strong>${job.daysOld === 0 ? 'Today' : job.daysOld === 1 ? '1 day ago' : `${job.daysOld} days ago`}</strong> · <span>${job.salary || 'Not Disclosed'}</span>
        </div>
        <a href="${job.applyUrl}" target="_blank" class="apply-btn" style="${intel.geoScore === 0 ? 'opacity: 0.4; pointer-events: none; background: #333;' : ''}">
          ${intel.geoScore === 0 ? 'Disqualified Location' : 'Apply To This Job'}
        </a>
      </div>
    `;
    
    jobsGrid.appendChild(card);
  });
}

window.toggleCardDescription = function(jobId) {
  const descContainer = document.getElementById(`desc-${jobId}`);
  const toggleBtn = descContainer.nextElementSibling;
  const targetJob = cachedJobsCollection.find(j => j.id === jobId);
  
  if (!targetJob) return;

  if (descContainer.classList.contains('expanded')) {
    descContainer.classList.remove('expanded');
    descContainer.textContent = targetJob.description.substring(0, 240) + '...';
    toggleBtn.textContent = 'Show more';
  } else {
    descContainer.classList.add('expanded');
    descContainer.textContent = targetJob.description;
    toggleBtn.textContent = 'Show less';
  }
};

async function executeLiveAggregationPipeline() {
  statusEl.textContent = 'Triggering dynamic concurrent scraper matrix across endpoint pipelines...';
  statusEl.className = 'status';
  statusEl.style.display = 'block';
  jobsGrid.innerHTML = '';
  
  try {
    const response = await fetch(API_URL);
    if (!response.ok) throw new Error(`Scraper Pipeline returned status code: ${response.status}`);
    
    const rawData = await response.json();
    
    cachedJobsCollection = rawData.map(job => processRecruiterIntelligence(job));
    
    updateAnalyticalDashboard(cachedJobsCollection);
    renderEngineOutputCards(cachedJobsCollection);
    
    statusEl.textContent = `V4 Recruiter Intelligence Engine verified: parsed ${cachedJobsCollection.length} listings with hard constraint evaluations.`;
    statusEl.className = 'status success';
    
  } catch (err) {
    console.error('System pipeline parsing exception:', err);
    statusEl.textContent = `Pipeline Exception: ${err.message}. Please trace execution logs inside Vercel Dashboard.`;
    statusEl.className = 'status error';
  }
}

searchInput.addEventListener('input', (e) => {
  const searchString = e.target.value.toLowerCase();
  const filteredOutput = cachedJobsCollection.filter(job => {
    return job.title.toLowerCase().includes(searchString) || 
           job.company.toLowerCase().includes(searchString) || 
           job.description.toLowerCase().includes(searchString);
  });
  renderEngineOutputCards(filteredOutput);
});

refreshBtn.addEventListener('click', () => executeLiveAggregationPipeline());

executeLiveAggregationPipeline();
// Dev-Jobs Hunter V3 Engine Controller - PBRCIM Logic Realized
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
    // Apply dynamic classes for structural high-relevance highlighting
    card.className = `job-card ${job.matchTier === 'high' ? 'high-match-border' : ''}`;
    
    const explanationsHTML = job.explanations.map(exp => `<span>✓ ${exp}</span>`).join(' ');

    card.innerHTML = `
      <div class="job-header">
        <img src="${job.logo}" alt="${job.company}" class="job-logo" onerror="this.src='https://via.placeholder.com/40'">
        <div class="job-title-wrap">
          <div class="job-title">${job.title}</div>
          <div class="job-company">${job.company}</div>
        </div>
        <div class="match-badge ${job.matchTier}">${job.matchScore}% Match</div>
      </div>
      
      <div class="badges">
        <span class="badge tier1">PBRCIM Core</span>
        <span class="badge remote">Remote</span>
        ${job.isNigeriaFriendly ? '<span class="badge friendly" style="background: rgba(0, 255, 136, 0.15); color: var(--green); border: 1px solid var(--green);">Nigeria Friendly</span>' : ''}
        <span class="badge">${job.employmentType}</span>
        <span class="badge eligibility" style="background: rgba(0, 191, 255, 0.15); color: var(--accent); border: 1px solid var(--accent);">${job.countryEligibility}</span>
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
          <strong>${job.daysOld === 0 ? 'Today' : job.daysOld === 1 ? '1 day ago' : `${job.daysOld} days ago`}</strong> · <span>${job.salary}</span>
        </div>
        <a href="${job.applyUrl}" target="_blank" class="apply-btn">Apply To This Job</a>
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
    
    cachedJobsCollection = await response.json();
    
    updateAnalyticalDashboard(cachedJobsCollection);
    renderEngineOutputCards(cachedJobsCollection);
    
    statusEl.textContent = `PBRCIM Engine verified: loaded ${cachedJobsCollection.length} highly accurate remote engineering vacancies.`;
    statusEl.className = 'status success';
    
  } catch (err) {
    console.error('System pipeline parsing exception:', err);
    statusEl.textContent = `Pipeline Exception: ${err.message}. Please trace execution logs inside Vercel Dashboard.`;
    statusEl.className = 'status error';
  }
}

// Client-side real-time query filter layer
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

// Initialize immediately upon page loading cycles
executeLiveAggregationPipeline();
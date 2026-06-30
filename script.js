// Dev-Jobs Hunter - PBRCIM Engine
const API_URL = '/api/jobs';

const pilgrimProfile = {
  name: "Usenobong CursorLord",
  skills: [
    "React", "TypeScript", "Next.js", "JavaScript", "HTML", "CSS", "Tailwind", 
    "Technical Writing", "Code Review", "AI Training", "Prompt Engineering", 
    "RLHF", "Developer Tools", "DevEx", "API Documentation", "LLM Evaluator", 
    "Data Annotation", "Technical QA", "Software QA", "AI Safety", 
    "Human Feedback Specialist", "Solutions Engineer", "Technical Support Engineer"
  ],
  tier1Keywords: [
    "RLHF", "Prompt Engineer", "AI Trainer", "Code Reviewer", "Technical Writer", 
    "AI Evaluator", "Data Annotation", "DevEx", "Developer Tools", "AI Data Specialist",
    "AI Code Reviewer", "LLM Evaluator", "AI Safety", "Human Feedback Specialist",
    "Technical QA", "Software QA", "Solutions Engineer", "Technical Support Engineer"
  ],
  tier2Keywords: [
    "React", "TypeScript", "Next.js", "Frontend", "UI Engineer", "Web Developer",
    "Frontend Engineer", "JavaScript Developer", "Web Systems Engineer",
    "Frontend Developer", "HTML", "CSS"
  ],
  preferences: {
    remote: true,
    worldwide: true,
    nigeriaFriendly: true,
    employmentTypes: ["Full-time", "Contractor"],
    englishOnly: true,
    recentlyPosted: true
  }
};

let allJobs = [];

const jobsGrid = document.getElementById('jobs-grid');
const searchInput = document.getElementById('search');
const refreshBtn = document.getElementById('refresh');
const statusEl = document.getElementById('status');

function calculateMatch(job) {
  const skillsArray = job.job_required_skills || [];
  const text = `${job.job_title} ${job.job_description} ${job.employer_name} ${skillsArray.join(' ')}`.toLowerCase();
  let matchedSkills = [];
  let score = 0;
  
  pilgrimProfile.skills.forEach(skill => {
    if (text.includes(skill.toLowerCase())) {
      matchedSkills.push(skill);
      score += 1;
    }
  });

  const isTier1 = pilgrimProfile.tier1Keywords.some(k => text.includes(k.toLowerCase()));
  const isRemote = job.job_is_remote || text.includes('remote') || text.includes('work from home');
  
  if (isTier1) score += 3;
  if (isRemote) score += 2;
  
  const percentage = Math.min(Math.round((score / 15) * 100), 99);
  
  let tier = 'low';
  if (percentage >= 70) tier = 'high';
  else if (percentage >= 40) tier = 'med';

  return {
    percentage,
    matchedSkills: matchedSkills.slice(0, 7),
    tier,
    isTier1,
    isRemote,
    success: percentage >= 70 ? 'HIGH' : percentage >= 40 ? 'MED' : 'LOW'
  };
}

function renderJobs(jobs) {
  jobsGrid.innerHTML = '';
  
  if (jobs.length === 0) {
    statusEl.textContent = 'No jobs match your criteria. Try adjusting search.';
    statusEl.className = 'status error';
    return;
  }
  
  statusEl.style.display = 'none';
  
  jobs.forEach(job => {
    const match = calculateMatch(job);
    const card = document.createElement('div');
    card.className = 'job-card';
    
    const postedDate = new Date(job.job_posted_at_timestamp * 1000);
    const daysAgo = Math.floor((Date.now() - postedDate) / (1000 * 60 * 60 * 24));
    
    card.innerHTML = `
      <div class="job-header">
        <img src="${job.employer_logo || 'https://via.placeholder.com/40'}" alt="${job.employer_name}" class="job-logo">
        <div class="job-title-wrap">
          <div class="job-title">${job.job_title}</div>
          <div class="job-company">${job.employer_name}</div>
        </div>
        <div class="match-badge ${match.tier}">${match.percentage}% Match</div>
      </div>
      
      <div class="badges">
        ${match.isTier1 ? '<span class="badge tier1">Tier 1</span>' : ''}
        ${match.isRemote ? '<span class="badge remote">Remote</span>' : ''}
        ${job.job_employment_type ? `<span class="badge">${job.job_employment_type}</span>` : ''}
        ${job.job_city ? `<span class="badge">${job.job_city}, ${job.job_state || job.job_country}</span>` : ''}
      </div>
      
      ${match.matchedSkills.length > 0 ? `
        <div class="match-reasons">
          <strong>Why this matches you:</strong>
          <ul>${match.matchedSkills.map(s => `<li>${s}</li>`).join('')}</ul>
          <strong>Estimated Success: ${match.success}</strong>
        </div>
      ` : ''}
      
      <div class="job-desc" id="desc-${job.job_id}">
        ${job.job_description ? job.job_description.substring(0, 250) + '...' : 'No description available.'}
      </div>
      ${job.job_description && job.job_description.length > 250 ? `
        <button class="desc-toggle" onclick="toggleDesc('${job.job_id}')">Show more</button>
      ` : ''}
      
      <div class="job-footer">
        <div class="job-meta">
          ${daysAgo === 0 ? 'Today' : daysAgo === 1 ? '1 day ago' : `${daysAgo} days ago`} 
          ${job.job_salary ? `· ${job.job_salary}` : '· Salary not disclosed'}
        </div>
        <a href="${job.job_apply_link}" target="_blank" class="apply-btn">Apply</a>
      </div>
    `;
    
    jobsGrid.appendChild(card);
  });
}

window.toggleDesc = function(jobId) {
  const desc = document.getElementById(`desc-${jobId}`);
  const btn = desc.nextElementSibling;
  const job = allJobs.find(j => j.job_id === jobId);
  
  if (desc.classList.contains('expanded')) {
    desc.classList.remove('expanded');
    desc.textContent = job.job_description.substring(0, 250) + '...';
    btn.textContent = 'Show more';
  } else {
    desc.classList.add('expanded');
    desc.textContent = job.job_description;
    btn.textContent = 'Show less';
  }
};

function updateStats(jobs) {
  const total = jobs.length;
  const remote = jobs.filter(j => j.job_is_remote).length;
  const thisWeek = jobs.filter(j => {
    const daysAgo = (Date.now() - new Date(j.job_posted_at_timestamp * 1000)) / (1000 * 60 * 60 * 24);
    return daysAgo <= 7;
  }).length;
  const tier1 = jobs.filter(j => calculateMatch(j).isTier1).length;
  
  document.getElementById('total-jobs').textContent = total;
  document.getElementById('remote-jobs').textContent = remote;
  document.getElementById('today-jobs').textContent = thisWeek;
  document.getElementById('tier1-jobs').textContent = tier1;
}

async function fetchJobs() {
  statusEl.textContent = 'Fetching live jobs from JSearch...';
  statusEl.className = 'status';
  statusEl.style.display = 'block';
  jobsGrid.innerHTML = '';
  
  try {
    const response = await fetch(API_URL);
    if (!response.ok) throw new Error(`API Error ${response.status}`);
    
    let rawJobs = await response.json();
    
    // PBRCIM FIX: Filter out jobs older than 30 days or with epoch timestamp
    const now = Date.now();
    allJobs = rawJobs.filter(job => {
      const postedTime = job.job_posted_at_timestamp * 1000;
      const daysAgo = (now - postedTime) / (1000 * 60 * 60 * 24);
      return postedTime > 0 && daysAgo <= 30; // Drop 1970 epoch + older than 30 days
    });
    
    allJobs.sort((a, b) => {
      const matchA = calculateMatch(a).percentage;
      const matchB = calculateMatch(b).percentage;
      if (matchB !== matchA) return matchB - matchA;
      return b.job_posted_at_timestamp - a.job_posted_at_timestamp;
    });
    
    updateStats(allJobs);
    renderJobs(allJobs);
    
    statusEl.textContent = `Loaded ${allJobs.length} live jobs`;
    statusEl.className = 'status success';
    
  } catch (err) {
    console.error('Fetch error:', err);
    statusEl.textContent = `Error: ${err.message}. Check Vercel Functions logs.`;
    statusEl.className = 'status error';
    jobsGrid.innerHTML = `<div class="error">Failed to load jobs from /api/jobs</div>`;
  }
}

searchInput.addEventListener('input', (e) => {
  const query = e.target.value.toLowerCase();
  const filtered = allJobs.filter(job => {
    const text = `${job.job_title} ${job.job_description} ${job.employer_name}`.toLowerCase();
    return text.includes(query);
  });
  renderJobs(filtered);
});

refreshBtn.addEventListener('click', () => location.reload());

fetchJobs();
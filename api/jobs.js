const axios = require('axios');

// PBRCIM Date Guard: Drop jobs older than 30 days or with garbage timestamps
function isValidJob(job) {
  if (!job.job_posted_at_timestamp) return false;
  const postedDate = new Date(job.job_posted_at_timestamp * 1000);
  const daysAgo = (Date.now() - postedDate) / (1000 * 60 * 60 * 24);
  return daysAgo >= 0 && daysAgo <= 30;
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const queries = [
    'React Developer remote', 'TypeScript Developer remote', 'Next.js remote',
    'Prompt Engineer remote', 'AI Trainer remote', 'RLHF remote',
    'Technical Writer remote', 'Code Reviewer remote', 'Developer Tools remote'
  ];

  const options = {
    method: 'GET',
    url: 'https://jsearch.p.rapidapi.com/search',
    headers: {
      'X-RapidAPI-Key': process.env.RAPID_API_KEY,
      'X-RapidAPI-Host': 'jsearch.p.rapidapi.com'
    }
  };

  try {
    const allJobs = [];
    
    for (const query of queries) {
      const response = await axios.request({
        ...options,
        params: {
          query: query,
          page: '1',
          num_pages: '1',
          date_posted: 'week',
          remote_jobs_only: 'true',
          employment_types: 'FULLTIME,CONTRACTOR'
        }
      });
      
      if (response.data.data) {
        allJobs.push(...response.data.data);
      }
    }

    const uniqueJobs = Array.from(new Map(allJobs.map(job => [job.job_id, job])).values());
    const validJobs = uniqueJobs.filter(isValidJob);
    
    res.status(200).json(validJobs);
    
  } catch (error) {
    console.error('JSearch Error:', error.message);
    res.status(500).json({ error: 'Failed to fetch jobs from JSearch' });
  }
};
const axios = require('axios');

// PBRCIM Date Guard: Drop jobs older than 30 days or with garbage timestamps
function isValidJob(job) {
  if (!job.job_posted_at_timestamp) return false;
  const postedDate = new Date(job.job_posted_at_timestamp * 1000);
  const daysAgo = (Date.now() - postedDate) / (1000 * 60 * 60 * 24);
  return daysAgo >= 0 && daysAgo <= 30;
}

module.exports = async (req, res) => {
  // CORS + Vercel Edge Cache: 1 hour cache = 24 JSearch calls/day max
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');
  
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // PBRCIM: Single combined query instead of 9 loops = 9x quota savings
  const query = 'remote developer OR remote engineer OR remote AI trainer OR remote technical writer OR remote prompt engineer';
  
  try {
    const response = await axios.get('https://jsearch.p.rapidapi.com/search-v2', {
      headers: {
        'X-RapidAPI-Key': process.env.RAPID_API_KEY,
        'X-RapidAPI-Host': 'jsearch.p.rapidapi.com'
      },
      params: {
        query: query,
        num_pages: '1',
        date_posted: 'week'
      }
    });
    
    // JSearch v2 structure: response.data.data.jobs
    const jobs = response.data.data?.jobs || [];
    const uniqueJobs = Array.from(new Map(jobs.map(job => [job.job_id, job])).values());
    const validJobs = uniqueJobs.filter(isValidJob);
    
    console.log(`JSearch: Returning ${validJobs.length} valid jobs`);
    res.status(200).json(validJobs);
    
  } catch (error) {
    // PBRCIM: Return real JSearch error instead of generic 500
    const status = error.response?.status || 500;
    const msg = error.response?.data?.message || error.message;
    console.error('JSearch Error:', status, msg);
    res.status(status).json({ error: msg });
  }
};
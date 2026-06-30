const axios = require('axios');

function isValidJob(job) {
  if (!job.job_posted_at_timestamp) return false;
  const postedDate = new Date(job.job_posted_at_timestamp * 1000);
  const daysAgo = (Date.now() - postedDate) / (1000 * 60 * 60 * 24);
  return daysAgo >= 0 && daysAgo <= 30;
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');
  
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const query = 'remote developer OR remote engineer OR remote AI trainer OR remote technical writer OR remote prompt engineer';
  
  try {
    const response = await axios.get('https://jsearch.p.rapidapi.com/search-v2', {
      headers: {
        'X-RapidAPI-Key': process.env.RAPID_API_KEY,
        'X-RapidAPI-Host': 'jsearch.p.rapidapi.com'
      },
      params: {
        query: query,
        num_pages: '1'
        // PBRCIM: Removed date_posted to match JSearch test endpoint behavior
      }
    });
    
    const jobs = response.data.data?.jobs || [];
    console.log(`JSearch raw: ${jobs.length} jobs`);
    
    const uniqueJobs = Array.from(new Map(jobs.map(job => [job.job_id, job])).values());
    console.log(`After dedupe: ${uniqueJobs.length} jobs`);
    
    const validJobs = uniqueJobs.filter(isValidJob);
    console.log(`After 30-day filter: ${validJobs.length} jobs`);
    
    res.status(200).json(validJobs);
    
  } catch (error) {
    const status = error.response?.status || 500;
    const msg = error.response?.data?.message || error.message;
    console.error('JSearch Error:', status, msg);
    res.status(status).json({ error: msg });
  }
};
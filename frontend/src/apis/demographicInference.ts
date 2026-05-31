import axios from 'axios'

export const triggerDemographicInference = (userId: string): void => {
  axios.post(
    `http://localhost:8000/demographic-inference?user_id=${userId}`,
    {}, // empty body for POST
    {
      headers: { 'accept': 'application/json' }
    }
  ).catch(console.error) // Just log any errors, don't wait
} 
import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_BASE_URL || "https://agenticchattt-310229311797.asia-southeast1.run.app";

export const triggerDemographicInference = (userId: string): void => {
  axios.post(
    `${API_BASE}/demographic-inference?user_id=${userId}`,
    {},
    {
      headers: { 'accept': 'application/json' }
    }
  ).catch(console.error)
}

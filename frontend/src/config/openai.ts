// OpenAI API Configuration
export const OPENAI_CONFIG = {
  API_KEY: import.meta.env.VITE_OPENAI_API_KEY,
  BASE_URL: 'https://api.openai.com/v1',
  MODEL: 'gpt-4o-mini'
}

// Helper function to get API key
export const getOpenAIKey = (): string => {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY
  if (!apiKey) {
    throw new Error('VITE_OPENAI_API_KEY is not defined in environment variables')
  }
  return apiKey
} 
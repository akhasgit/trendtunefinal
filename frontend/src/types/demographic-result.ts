export interface Demographic {
  desc: string;
  reasoning: string;
  description?: string;
}

export interface DemographicResult {
  demographics: Demographic[];
  recommendations: string[];
  timestamp: string;
} 
# AI-Powered CSV Column Mapping Setup

## Overview
The CSV upload component now includes AI-powered automatic column mapping using OpenAI's GPT-4o-mini model. When users upload a CSV file, the AI automatically analyzes the headers and sample data to map columns to product fields.

## Features
- **Automatic Mapping**: AI analyzes CSV headers and sample data to suggest column mappings
- **Loading Animation**: Beautiful dual-ring spinning animation with progress messages
- **Manual Override**: Users can still manually adjust mappings after AI suggestion
- **Error Handling**: Graceful fallback to manual mapping if AI fails

## Setup Instructions

### 1. OpenAI API Key
The API key is configured using environment variables. Create a `.env` file in your project root:

```bash
# Create .env file in project root
VITE_OPENAI_API_KEY=your-openai-api-key-here
```

**Important**: Never commit your `.env` file to version control. It's already included in `.gitignore`.

### 2. Configuration
The AI mapping is configured in `src/config/openai.ts`:
- **API Key**: Your OpenAI API key (from environment variable)
- **Base URL**: OpenAI API endpoint
- **Model**: GPT-4o-mini (cost-effective for this use case)

### 3. Usage
The feature works automatically:
1. User uploads CSV file
2. AI analyzes headers and first 3 rows
3. AI suggests column mappings
4. User can review and adjust mappings
5. User proceeds with upload

## API Endpoint
The component uses OpenAI's Chat Completions API:
- **Endpoint**: `https://api.openai.com/v1/chat/completions`
- **Model**: `gpt-4o-mini`
- **Temperature**: 0.1 (for consistent results)
- **Max Tokens**: 200

## Prompt Engineering
The AI prompt is designed to:
- Analyze CSV headers and sample data
- Map to specific product fields (name, description, quantity, skuId)
- Return structured JSON response
- Handle missing or unmappable columns

## Error Handling
- API errors are caught and logged
- Users see friendly error messages
- Manual mapping option is always available
- No data loss if AI fails

## Security
- API key is stored in environment variables (secure)
- No sensitive data is sent to AI (only headers and sample data)
- Error messages don't expose API details

## Cost Considerations
- Uses GPT-4o-mini for cost efficiency
- Limited to 200 tokens per request
- Only processes first 3 rows for analysis
- Estimated cost: ~$0.001 per CSV upload

## Future Enhancements
- Support for more file formats (XLS, XLSX)
- Batch processing for large files
- Custom field mapping templates
- Learning from user corrections 
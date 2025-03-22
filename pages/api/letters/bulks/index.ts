// File: /pages/api/letters/bulks/index.ts
import type { NextApiRequest, NextApiResponse } from 'next';

type ErrorResponse = {
  message: string;
  errors?: any[];
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<any | ErrorResponse>
) {
  // Only allow POST requests for bulk letter generation
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const apiKey = req.headers['x-api-key'];
    
    // Validate API key is present
    if (!apiKey || typeof apiKey !== 'string') {
      return res.status(400).json({ message: 'API key is required' });
    }

    console.log('Proxying request to LetterSG API');

    // Forward the request to the LetterSG API with correct URL
    const response = await fetch('https://letters.gov.sg/api/v1/letters/bulks', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}` // Correct authorization header format
      },
      body: JSON.stringify(req.body),
    });

    // Handle specific status codes
    if (response.status === 429) {
      console.log('Rate limit exceeded');
      return res.status(429).json({ 
        message: 'Rate limit exceeded. Please wait a moment before trying again.' 
      });
    }

    const data = await response.json();
    console.log('LetterSG API response status:', response.status);

    // Return the API response with the same status code
    return res.status(response.status).json(data);
  } catch (error) {
    console.error('Error in bulk letters API proxy:', error);
    
    // Provide more specific error message if possible
    let errorMessage = 'An error occurred while processing your request';
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    
    return res.status(500).json({ message: errorMessage });
  }
}

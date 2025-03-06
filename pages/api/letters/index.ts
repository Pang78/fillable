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

    // Forward the request to the Letters.gov.sg API
    const response = await fetch('https://api.letters.gov.sg/v1/letters/bulks', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(req.body),
    });

    const data = await response.json();

    // Return the API response with the same status code
    return res.status(response.status).json(data);
  } catch (error) {
    console.error('Error in letters API proxy:', error);
    return res.status(500).json({ 
      message: 'An error occurred while processing your request' 
    });
  }
}
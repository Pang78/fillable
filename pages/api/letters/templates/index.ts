// File: /pages/api/templates/index.ts
import type { NextApiRequest, NextApiResponse } from 'next';

type ErrorResponse = {
  message: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<any | ErrorResponse>
) {
  // Only allow GET requests for templates listing
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const apiKey = req.headers['x-api-key'];
    
    // Validate API key
    if (!apiKey || typeof apiKey !== 'string') {
      return res.status(400).json({ message: 'API key is required' });
    }

    // Extract optional query parameters
    const { limit, offset } = req.query;
    
    // Build query string if parameters are provided
    let queryString = '';
    if (limit) queryString += `limit=${limit}&`;
    if (offset) queryString += `offset=${offset}&`;
    if (queryString) queryString = `?${queryString.slice(0, -1)}`;

    // Forward the request to the LetterSG API with correct URL
    const response = await fetch(`https://letters.gov.sg/api/v1/templates${queryString}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}` // Correct authorization header format
      }
    });

    const data = await response.json();

    // Return the API response with the same status code
    return res.status(response.status).json(data);
  } catch (error) {
    console.error('Error in templates list API proxy:', error);
    return res.status(500).json({ 
      message: 'An error occurred while fetching the templates' 
    });
  }
}

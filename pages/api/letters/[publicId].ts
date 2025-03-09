// File: /pages/api/letters/[publicId].ts
import type { NextApiRequest, NextApiResponse } from 'next';

type ErrorResponse = {
  message: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<any | ErrorResponse>
) {
  // Only allow GET requests for letter metadata
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { publicId } = req.query;
    const apiKey = req.headers['x-api-key'];
    
    // Validate API key and public ID
    if (!apiKey || typeof apiKey !== 'string') {
      return res.status(400).json({ message: 'API key is required' });
    }

    if (!publicId || Array.isArray(publicId)) {
      return res.status(400).json({ message: 'Valid letter ID is required' });
    }

    // Forward the request to the LetterSG API with correct URL
    const response = await fetch(`https://letters.gov.sg/api/v1/letters/${publicId}`, {
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
    console.error('Error in letter metadata API proxy:', error);
    return res.status(500).json({ 
      message: 'An error occurred while fetching the letter metadata' 
    });
  }
}

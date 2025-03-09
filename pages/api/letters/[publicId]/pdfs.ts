// File: /pages/api/letters/[publicId]/pdfs.ts
import type { NextApiRequest, NextApiResponse } from 'next';

type ErrorResponse = {
  message: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<any | ErrorResponse>
) {
  // Only allow GET requests for PDF download
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
    const response = await fetch(`https://letters.gov.sg/api/v1/letters/${publicId}/pdfs`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}` // Correct authorization header format
      }
    });

    const data = await response.json();

    // Return the API response with the same status code
    // Note: The actual LetterSG API returns a 302 redirect, but for our proxy
    // we'll return the presigned URL directly
    return res.status(response.status).json(data);
  } catch (error) {
    console.error('Error in PDF download API proxy:', error);
    return res.status(500).json({ 
      message: 'An error occurred while getting the PDF download link' 
    });
  }
}

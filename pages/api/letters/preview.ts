import type { NextApiRequest, NextApiResponse } from 'next';

interface PreviewRequestBody {
  templateId: number | null;
  letterParams: { [key: string]: string };
}

interface LettersApiResponse {
  publicId?: string;
  issuedLetter?: string;
  letterLink?: string;
  createdAt?: string;
  firstReadAt?: string;
  message?: string; // Error message from Letters API
  errors?: any[]; // Specific errors from Letters API
  // Add other potential fields based on actual API responses
}

const LETTERS_API_URL = 'https://letters.gov.sg/api/v1/letters';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ message: `Method ${req.method} Not Allowed` });
  }

  const apiKey = req.headers['x-api-key'] as string;
  if (!apiKey) {
    return res.status(401).json({ message: 'API key is missing' });
  }

  const { templateId, letterParams }: PreviewRequestBody = req.body;

  if (!templateId) {
    return res.status(400).json({ message: 'Template ID is required' });
  }
  if (!letterParams || typeof letterParams !== 'object') {
    return res.status(400).json({ message: 'Letter parameters are required' });
  }

  try {
    const lettersApiPayload = {
      templateId,
      letterParams,
      // IMPORTANT: Do NOT include notificationParams to avoid sending actual notifications
    };

    console.log('Sending preview request to Letters.gov.sg API with payload:', JSON.stringify(lettersApiPayload, null, 2));

    const apiResponse = await fetch(LETTERS_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(lettersApiPayload),
    });

    const responseData: LettersApiResponse = await apiResponse.json();

    console.log('Received response from Letters.gov.sg API:', responseData);


    if (!apiResponse.ok) {
      // Log the detailed error from the API if available
      console.error('Letters.gov.sg API Error:', responseData);
      let errorMessage = responseData.message || `Request failed with status ${apiResponse.status}`;
      
      // Append specific errors if they exist
      if (responseData.errors && Array.isArray(responseData.errors)) {
         const detailedErrors = responseData.errors.map((err: any) => 
            `${err.id !== undefined ? `Item ${err.id}: ` : ''}${err.errorType ? `(${err.errorType}) ` : ''}${err.message}`
          ).join('; ');
         errorMessage += `: ${detailedErrors}`;
      }
      
      throw new Error(errorMessage);
    }

    // Check if issuedLetter (HTML) exists in the response
    if (responseData.issuedLetter) {
       return res.status(200).json({ previewHtml: responseData.issuedLetter });
    } else {
        console.error('issuedLetter not found in Letters.gov.sg API response');
        throw new Error('Could not retrieve preview HTML from the API.');
    }

  } catch (error) {
    console.error('Error in preview API route:', error);
    const message = error instanceof Error ? error.message : 'An unexpected error occurred';
    // Determine appropriate status code based on error message if possible
    let statusCode = 500;
    if (message.includes('Template not found')) {
        statusCode = 404;
    } else if (message.includes('Invalid letter params') || message.includes('Invalid attribute') || message.includes('Missing param')) {
        statusCode = 400;
    } else if (message.includes('Unauthorized') || message.includes('API key')) { // Assuming API key errors might appear this way
        statusCode = 401;
    }
    
    return res.status(statusCode).json({ message });
  }
} 
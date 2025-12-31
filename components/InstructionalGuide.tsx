'use client'

import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

const InstructionalGuide: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    {
      title: 'Step 1: Enter Your Form URL',
      description: 'Start by entering the base URL of your FormSG form. This is the URL you see in your browser when viewing the form.',
      content: (
        <div className="space-y-4 max-h-[400px] overflow-y-auto p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
          <img
            src="/form-url-guide.png"
            alt="Form URL Example"
            className="w-full h-auto object-cover bg-gray-100 dark:bg-gray-700 rounded"
          />
          <Alert className="bg-blue-50 border-blue-100">
            <Info className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800">
              <strong>Pro Tip:</strong> The form URL should look like: https://form.gov.sg/1234567890abcdef1234567890
            </AlertDescription>
          </Alert>
        </div>
      )
    },
    {
      title: 'Step 2: Add Form Fields',
      description: 'Add the fields you want to pre-fill. Each field needs an ID, which you can find in your FormSG form settings.',
      content: (
        <div className="space-y-4 max-h-[400px] overflow-y-auto p-4 bg-gray-50 rounded-lg">
          <div className="space-y-2">
            <h4 className="font-medium">How to find Field IDs:</h4>
            <ol className="list-decimal pl-6 space-y-2">
              <li>Go to your FormSG form in edit mode</li>
              <li>Click on a field you want to pre-fill</li>
              <li>Enable the "Allow pre-fill" option</li>
              <li>Look for the "Field ID" value (a 24-character code)</li>
              <li>Copy this ID into the "Field ID" input in Fillable</li>
            </ol>
          </div>
          <Alert className="bg-amber-50 border-amber-100">
            <Info className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800">
              <strong>Important:</strong> Each field must have both an ID and a value. The label is optional but helps you remember what each field is for.
            </AlertDescription>
          </Alert>
        </div>
      )
    },
    {
      title: 'Step 3: Generate Your URL',
      description: 'Click the "Generate URL" button to create your pre-filled form URL.',
      content: (
        <div className="space-y-4 max-h-[400px] overflow-y-auto p-4 bg-gray-50 rounded-lg">
          <div className="space-y-2">
            <h4 className="font-medium">What happens next:</h4>
            <ul className="list-disc pl-6 space-y-2">
              <li>Your pre-filled URL will be generated and displayed</li>
              <li>The URL is automatically copied to your clipboard</li>
              <li>You can save the URL with a custom name for future use</li>
              <li>Share the URL with others to give them a pre-filled form</li>
            </ul>
          </div>
          <Alert className="bg-green-50 border-green-100">
            <Info className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              <strong>Success:</strong> When users open your pre-filled URL, they'll see the form with the fields already filled in with your values.
            </AlertDescription>
          </Alert>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
          {steps[currentStep].title}
        </h3>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
            disabled={currentStep === 0}
            aria-label="Previous step"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrentStep(Math.min(steps.length - 1, currentStep + 1))}
            disabled={currentStep === steps.length - 1}
            aria-label="Next step"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <p className="text-sm text-gray-600 dark:text-gray-400">
        {steps[currentStep].description}
      </p>

      {steps[currentStep].content}

      <div className="flex justify-center space-x-2 mt-4">
        {steps.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentStep(index)}
            className={`h-2 w-2 rounded-full ${currentStep === index ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
              }`}
            aria-label={`Go to step ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
};

export default InstructionalGuide; 
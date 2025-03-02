// ./components/UsageGuide.tsx
'use client'

import React from 'react';
import { Info, HelpCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

const UsageGuide = () => (
  <Dialog>
    <DialogTrigger asChild>
      <Button variant="outline" size="icon">
        <HelpCircle className="h-4 w-4" />
      </Button>
    </DialogTrigger>
    <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>How to Use Form Pre-fill Guide</DialogTitle>
      </DialogHeader>
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold mb-2">Construct Mode</h3>
          <ol className="list-decimal pl-6 space-y-2">
            <li>Enter your form's base URL in the "Form URL" field</li>
            <li>
              Add fields that you want to pre-fill:
              <ul className="list-disc pl-6 mt-1">
                <li>Field ID: The form field's identifier for short answer field (An example: '672883a69a27ad6eb73362ff')</li>
                <li>Value: The data you want to pre-fill</li>
                <li>Label: An optional description of your Field ID</li>
              </ul>
            </li>
            <li>Click "Generate URL" to create your pre-filled URL</li>
            <li>Copy the generated URL using the copy button</li>
          </ol>
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-2">Deconstruct Mode</h3>
          <ol className="list-decimal pl-6 space-y-2">
            <li>Switch to the "Deconstruct Mode" tab</li>
            <li>Paste a pre-filled URL into the input field</li>
            <li>
              The tool will automatically:
              <ul className="list-disc pl-6 mt-1">
                <li>Extract the base form URL</li>
                <li>Identify all pre-filled parameters</li>
                <li>Switch to Construct Mode with the fields populated</li>
              </ul>
            </li>
          </ol>
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-2">URL Exporter</h3>
          <ol className="list-decimal pl-6 space-y-2">
            <li>Generate a URL using the URL Generator</li>
            <li>Optionally give your URL a memorable name</li>
            <li>Click "Save URL" to add it to your saved URLs list</li>
            <li>View all your saved URLs in the list below</li>
            <li>Export your URLs to CSV format using the export button</li>
            <li>Copy any saved URL using the copy button next to it</li>
            <li>Delete individual URLs using the delete button (X)</li>
            <li>Clear all saved URLs using the "Clear All" button</li>
          </ol>
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-2">Additional Features</h3>
          <ul className="list-disc pl-6 space-y-2 mb-4">
            <li>
              <span className="font-medium">Dark/Light Mode:</span> Toggle between themes 
              using the sun/moon icon in the top right corner
            </li>
            <li>
              <span className="font-medium">Undo:</span> Reverse your last action with 
              the undo button (arrow counter-clockwise icon)
            </li>
          </ul>

          <Alert className="mt-4">
            <Info className="h-4 w-4" />
            <AlertDescription>
              Your configurations and saved URLs are automatically saved in your browser's 
              local storage. Data persists even after closing the browser.
            </AlertDescription>
          </Alert>
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-2">Training Resources</h3>
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className="space-y-2">
              <div>
                Practice with our{' '}
                <a
                  href="https://go.gov.sg/trainingdemo"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline font-medium"
                >
                  Training Form Demo
                </a>
              </div>
              <div>
                Review the{' '}
                <a
                  href="https://docs.google.com/presentation/d/1joqLd1tOnlPFGHWLDL_IX5kI83xMkiTB/edit?usp=sharing&ouid=118116223862036334164&rtpof=true&sd=true"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline font-medium"
                >
                  Training Slides
                </a>{' '}
                for detailed instructions
              </div>
            </AlertDescription>
          </Alert>
        </div>
      </div>
    </DialogContent>
  </Dialog>
);

export default UsageGuide;
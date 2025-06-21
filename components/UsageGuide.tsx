// ./components/UsageGuide.tsx
'use client'

import React from 'react';
import { Info, HelpCircle, FileSpreadsheet, Download } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface UsageGuideProps {
  large?: boolean;
}

const UsageGuide: React.FC<UsageGuideProps> = ({ large = false }) => (
  <Dialog>
    <DialogTrigger asChild>
      {large ? (
        <Button
          variant="outline"
          size="lg"
          className="border-white bg-white/90 text-indigo-700 font-semibold px-8 py-3 rounded-full hover:bg-white focus:bg-white focus:text-indigo-900 flex items-center gap-2 transition-colors"
        >
          <svg width="22" height="22" fill="none" viewBox="0 0 24 24" className="inline-block align-middle mr-2"><path d="M8 5v14l11-7z" fill="currentColor"/></svg>
          See How It Works
        </Button>
      ) : (
        <Button variant="outline" size="icon" aria-label="Help and Usage Guide">
          <HelpCircle className="h-4 w-4" />
        </Button>
      )}
    </DialogTrigger>
    <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>How to Use Form Pre-fill Guide</DialogTitle>
      </DialogHeader>
      
      <Tabs defaultValue="construct">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="construct">Construct Mode</TabsTrigger>
          <TabsTrigger value="deconstruct">Deconstruct Mode</TabsTrigger>
          <TabsTrigger value="batch">Batch Processing</TabsTrigger>
        </TabsList>
        
        <TabsContent value="construct" className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold mb-2">Construct Mode</h3>
            <ol className="list-decimal pl-6 space-y-2">
              <li>Enter your form's base URL in the "Form URL" field</li>
              <li>
                Add fields that you want to pre-fill:
                <ul className="list-disc pl-6 mt-1">
                  <li><strong>Field ID:</strong> The form field's unique identifier (Example: '672883a69a27ad6eb73362ff')</li>
                  <li><strong>Value:</strong> The data you want to pre-fill in this field</li>
                  <li><strong>Label:</strong> An optional description to help you remember what the field is for</li>
                </ul>
              </li>
              <li>Click "Generate URL" to create your pre-filled URL</li>
              <li>Click the copy button to copy the generated URL to your clipboard</li>
              <li>You can then paste this URL into a browser to access the pre-filled form</li>
            </ol>
            
            <Alert className="mt-4 bg-blue-50">
              <Info className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800">
                <strong>Pro Tip:</strong> To find a field's ID in FormSG, click on a field in your form's edit view and look for the "Field ID" value. You'll need to enable pre-fill for the field first.
              </AlertDescription>
            </Alert>
          </div>
        </TabsContent>
        
        <TabsContent value="deconstruct" className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold mb-2">Deconstruct Mode</h3>
            <ol className="list-decimal pl-6 space-y-2">
              <li>Switch to the "Deconstruct Mode" tab in the main interface</li>
              <li>Paste your pre-filled URL into the input field</li>
              <li>
                The tool will automatically:
                <ul className="list-disc pl-6 mt-1">
                  <li>Extract the base form URL</li>
                  <li>Identify all pre-filled parameters</li>
                  <li>Show you each field ID and its corresponding value</li>
                  <li>Allow you to switch to Construct Mode with these fields pre-populated</li>
                </ul>
              </li>
              <li>You can then modify any values as needed and generate a new URL</li>
            </ol>
            
            <Alert className="mt-4 bg-amber-50">
              <Info className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-800">
                <strong>Note:</strong> Deconstruct Mode is especially useful when you have a working pre-filled URL and want to make small modifications to it without recreating it from scratch.
              </AlertDescription>
            </Alert>
          </div>
        </TabsContent>
        
        <TabsContent value="batch" className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold mb-2">Batch Processing</h3>
            <ol className="list-decimal pl-6 space-y-2">
              <li>Go to the Batch URL Generator & Exporter section</li>
              <li>Enter your form's base URL</li>
              <li>
                Prepare your CSV file with these columns:
                <ul className="list-disc pl-6 mt-1">
                  <li><strong>FieldID:</strong> The form field's unique identifier</li>
                  <li><strong>values:</strong> Comma-separated values for each entry (e.g., "Value1,Value2,Value3")</li>
                  <li><strong>description:</strong> (Optional) A human-readable name for this field</li>
                </ul>
              </li>
              <li>Click "Import CSV" and select your file</li>
              <li>Review the imported data for accuracy</li>
              <li>Click "Generate Links" to create all pre-filled URLs</li>
              <li>
                <div className="flex items-start">
                  <FileSpreadsheet className="h-4 w-4 mt-1 mr-2 text-green-600" />
                  <span>
                    <strong>Export to CSV:</strong> Click "Export Options" to configure which fields to include in your CSV export. Then click "Export CSV" to download a file with all your generated links.
                  </span>
                </div>
              </li>
            </ol>
            
            <Alert className="mt-4 bg-green-50">
              <Download className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                <strong>Batch Export Tips:</strong>
                <ul className="list-disc pl-6 mt-1">
                  <li>Select "Export All Fields" to include all field values in your CSV</li>
                  <li>Choose a "Primary Label Field" to help identify each row</li>
                  <li>Check "Include Form URL" to add the complete pre-filled URL to each row</li>
                  <li>You can select specific fields to include or exclude from the export</li>
                </ul>
              </AlertDescription>
            </Alert>
          </div>
        </TabsContent>
      </Tabs>
      
      <div className="mt-6">
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
          <li>
            <span className="font-medium">Tooltips:</span> Hover over buttons and controls for helpful hints
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
    </DialogContent>
  </Dialog>
);

export default UsageGuide;
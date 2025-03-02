'use client'

import React, { useState, useCallback } from 'react';
import Papa from 'papaparse';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Info, Upload, Download, FileSpreadsheet, HelpCircle, Loader2, XCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';

// Separated InstructionalGuide component for better organization
const InstructionalGuide = () => {
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    {
      title: 'FormSG Base URL and Field IDs',
      description: 'Share your form to locate Base URL and click on a short answer field to find its unique 24-digit hexadecimal ID',
      placeholder: (
        <div className="space-y-4 max-h-[400px] overflow-y-auto p-4 bg-gray-50 rounded-lg">
          <div>
            <img
              src="/FormSG.png"
              alt="Locating Base URL"
              className="w-full h-48 object-cover bg-gray-100 rounded"
            />
            <p className="text-sm text-gray-600 mt-2 font-bold">Step 1: Locate your FormSG Base URL and populate under Batch URL Generator & Exporter. The URL should look like: https://form.gov.sg/[24-digit hexadecimal code]</p>
          </div>
          <div>
            <img
              src="/FormSG2.png"
              alt="Finding Field ID"
              className="w-full h-48 object-cover bg-gray-100 rounded"
            />
            <p className="text-sm text-gray-600 mt-2 font-bold">Step 2: Click on a short answer field, Enable PreFill to find its unique 24-digit hexadecimal ID</p>
          </div>
        </div>
      )
    },
    {
      title: 'Import CSV Template',
      description: 'Download and Populate a CSV with columns: FieldID, values [In a list format separated by a delimiter e.g Apple,Banana,Cherry. In this case "," is the delimiter], description (optional)',
      placeholder: (
        <div className="space-y-4 max-h-[400px] overflow-y-auto p-4 bg-gray-50 rounded-lg">
          <div>
            <img
              src="/FormSG3.png"
              alt="CSV Template Format"
              className="w-full h-full object-cover bg-gray-100 rounded"
            />
            <p className="text-sm text-gray-600 mt-2 font-bold">Step 3: Download and Prepare your CSV according to the image. Please ensure that you select the correct delimiter according to the delimiter used in your "values" field.</p>
          </div>
          <div>
            <img
              src="/FormSG4.png"
              alt="Importing CSV"
              className="w-full h-full object-cover bg-gray-100 rounded"
            />
            <p className="text-sm text-gray-600 mt-2 font-bold">
              Step 4: Click "Import CSV" and select your prepared file. Adjust the delimiter if necessary (default: comma).  
              The app validates and processes your CSV based on the longest list. Fields or rows can vary in length—single values apply to all entries, and shorter lists repeat their last value.
            </p>
          </div>
        </div>
      )
    },
    {
      title: 'Generate Prefilled Links',
      description: 'Click "Generate Links" to create unique prefilled form URLs',
      placeholder: (
        <div>
          <img
            src="/FormSG5.png"
            alt="Generate Links"
            className="w-full h-full object-cover bg-gray-100 rounded"
          />
          <p className="text-sm text-gray-600 mt-2 font-bold">Step 5: After verifying your imported fields, click on the "Generate Links" Button</p>
        </div>
      )
    },
    {
      title: 'Exporting Prefilled Links',
      description: 'Click "Export Options and Export CSV" to download the csv',
      placeholder: (
        <div className="space-y-4 max-h-[400px] overflow-y-auto p-4 bg-gray-50 rounded-lg">
          <div>
            <img
              src="/FormSG6.png"
              alt="Export Options"
              className="w-full h-full object-cover bg-gray-100 rounded"
            />
            <p className="text-sm text-gray-600 mt-2 font-bold">Step 6: Click on the "Export Options" Button</p>
          </div>
          <div>
            <img
              src="/FormSG7.png"
              alt="Export CSV"
              className="w-full h-full object-cover bg-gray-100 rounded"
            />
            <p className="text-sm text-gray-600 mt-2 font-bold">Step 7: Click on the "Export Csv" Button to export csv with primary fields (Default:None) and Additional Fields (Description(Optional) of Fields)</p>
          </div>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-800">
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
      
      <p className="text-sm text-gray-600">
        {steps[currentStep].description}
      </p>
      
      {steps[currentStep].placeholder}
      
      <div className="flex justify-center space-x-2 mt-4">
        {steps.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentStep(index)}
            className={`h-2 w-2 rounded-full ${
              currentStep === index ? 'bg-blue-600' : 'bg-gray-300'
            }`}
            aria-label={`Go to step ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
};

// Constants to improve maintainability
const FORM_URL_REGEX = /^https:\/\/form\.gov\.sg\/[a-f0-9]{24}$/i;
const FIELD_ID_REGEX = /^[a-f0-9]{24}$/i;
const DEFAULT_DELIMITER = ',';
const TEMPLATE_STRUCTURE = [
  { FieldID: '67488bb37e8c75e33b9f9191', values: 'John,Jane,Alex', description: 'Names' },
  { FieldID: '67488f8e088e833537af24aa', values: 'john@agency.gov.sg,jane@agency.gov.sg,alex@agency.gov.sg', description: 'Email' }
];

const BatchFormPrefill = () => {
  // State management
  const [formUrl, setFormUrl] = useState('');
  const [fields, setFields] = useState([]);
  const [delimiter, setDelimiter] = useState(DEFAULT_DELIMITER);
  const [generatedLinks, setGeneratedLinks] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [showHelpDialog, setShowHelpDialog] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [exportConfig, setExportConfig] = useState({
    includeUrl: true,
    labelField: 'none',
    additionalFields: []
  });

  // Validation function for form URL
  const validateFormUrl = useCallback((url) => {
    if (!url) throw new Error('Form URL is required');
    if (!FORM_URL_REGEX.test(url)) {
      throw new Error('Invalid form URL. Must be in format: https://form.gov.sg/[24-digit hexadecimal]');
    }
    return true;
  }, []);

  // Function to display success messages with auto-dismiss
  const showSuccess = useCallback((message) => {
    setSuccessMessage(message);
    const timer = setTimeout(() => setSuccessMessage(''), 3000);
    return () => clearTimeout(timer);
  }, []);

  // CSV template download handler
  const downloadTemplate = useCallback(() => {
    const csv = Papa.unparse(TEMPLATE_STRUCTURE);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'form-prefill-template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showSuccess('Template downloaded successfully!');
  }, [showSuccess]);

  // CSV structure validation
  const validateCsvStructure = useCallback((data, delimiter) => {
    if (!Array.isArray(data) || data.length === 0) {
      throw new Error('CSV file is empty or invalid');
    }

    const requiredColumns = ['FieldID', 'values'];
    const headers = Object.keys(data[0]);
    
    for (const column of requiredColumns) {
      if (!headers.includes(column)) {
        throw new Error(`Missing required column: ${column}`);
      }
    }

    // Validate each row
    data.forEach((row, index) => {
      // Validate FieldID format
      if (!FIELD_ID_REGEX.test(row.FieldID)) {
        throw new Error(`Invalid FieldID format in row ${index + 1}. Must be a 24-digit hexadecimal.`);
      }
      
      // Validate values
      const values = (row.values || '').split(delimiter).map(v => v.trim()).filter(Boolean);
      if (values.length === 0) {
        throw new Error(`Row ${index + 1} has no valid values`);
      }
    });
    
    return true;
  }, []);

  // File upload handler with improved error handling
  const handleFileUpload = useCallback((event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    setError('');
    setIsProcessing(true);
    
    Papa.parse(file, {
      complete: (results) => {
        try {
          validateCsvStructure(results.data, delimiter);
          
          // Parse and normalize field values
          const parsedFields = results.data
            .filter(row => Object.values(row).some(val => val))
            .map(row => ({
              FieldID: row.FieldID || '',
              values: (row.values || '').split(delimiter).map(v => v.trim()).filter(Boolean),
              description: row.description || row.FieldID
            }));
          
          // Find the maximum number of values across all fields
          const maxValues = Math.max(...parsedFields.map(field => field.values.length));
          
          // Normalize all fields to match the maximum length
          const normalizedFields = parsedFields.map(field => {
            const values = field.values;
            // If field has only one value, repeat it to match maxValues
            // If field has multiple values but less than maxValues, repeat the last value
            const normalizedValues = values.length === 1 
              ? Array(maxValues).fill(values[0])
              : [...values, ...Array(maxValues - values.length).fill(values[values.length - 1])];
            
            return {
              ...field,
              values: normalizedValues,
              isSingleValue: values.length === 1
            };
          });
          
          setFields(normalizedFields);
          showSuccess('CSV imported successfully!');
        } catch (error) {
          setError(error.message);
          setFields([]);
        } finally {
          setIsProcessing(false);
        }
      },
      header: true,
      skipEmptyLines: true,
      error: (error) => {
        setError('Failed to parse CSV file: ' + error.message);
        setFields([]);
        setIsProcessing(false);
      }
    });
  }, [delimiter, validateCsvStructure, showSuccess]);

  // Generate links with improved error handling
  const generateLinks = useCallback(() => {
    setIsProcessing(true);
    setError('');
    
    try {
      validateFormUrl(formUrl);
      if (fields.length === 0) throw new Error('No fields imported');
      
      // Get the number of entries (should be the same for all multi-value fields after normalization)
      const numEntries = fields[0].values.length;
      
      // Generate matched combinations
      const links = [];
      for (let i = 0; i < numEntries; i++) {
        const combination = fields.map(field => ({
          id: field.FieldID,
          value: field.values[i],
          description: field.description,
          isSingleValue: field.isSingleValue
        }));
        
        const queryParams = combination
          .map(({ id, value }) => `${id}=${encodeURIComponent(value)}`)
          .join('&');
          
        links.push({
          url: `${formUrl}?${queryParams}`,
          fields: combination.reduce((acc, { id, value, description, isSingleValue }) => ({
            ...acc,
            [id]: value,
            [`${id}_description`]: description,
            [`${id}_isSingleValue`]: isSingleValue
          }), {}),
          label: i + 1 // Adding a default label for each link
        });
      }
      
      setGeneratedLinks(links);
      showSuccess(`Generated ${links.length} matched links successfully!`);
    } catch (error) {
      setError(error.message);
      setGeneratedLinks([]);
    } finally {
      setIsProcessing(false);
    }
  }, [formUrl, fields, validateFormUrl, showSuccess]);

  // Export links to CSV
  const exportLinks = useCallback(() => {
    if (generatedLinks.length === 0) return;
    
    const headers = [];
    if (exportConfig.labelField !== 'none') {
      headers.push('Label'); // Friendly label from selected field
    }
    if (exportConfig.includeUrl) {
      headers.push('Form URL');
    }
    exportConfig.additionalFields.forEach(FieldID => {
      const field = fields.find(f => f.FieldID === FieldID);
      if (field) {
        headers.push(field.description || FieldID);
      }
    });
    
    const csv = Papa.unparse({
      fields: headers,
      data: generatedLinks.map((link, index) => {
        const row = [];
        if (exportConfig.labelField !== 'none') {
          row.push(exportConfig.labelField === 'index' 
            ? `Entry ${index + 1}` 
            : (link.fields[exportConfig.labelField] || ''));
        }
        if (exportConfig.includeUrl) {
          row.push(link.url);
        }
        exportConfig.additionalFields.forEach(FieldID => {
          row.push(link.fields[FieldID] || '');
        });
        return row;
      })
    });
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'prefilled-links.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showSuccess('Links exported successfully!');
  }, [generatedLinks, exportConfig, fields, showSuccess]);

  // Toggle a field in additional fields
  const toggleAdditionalField = useCallback((fieldId, checked) => {
    setExportConfig(prev => ({
      ...prev,
      additionalFields: checked
        ? [...prev.additionalFields, fieldId]
        : prev.additionalFields.filter(id => id !== fieldId)
    }));
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 p-6">
      <Card className="w-full max-w-4xl mx-auto shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-t-lg">
          <CardTitle className="text-2xl">FormSG Prefill Batch Generator</CardTitle>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => setShowHelpDialog(true)}
                  className="hover:bg-blue-500 text-white"
                  aria-label="Help"
                >
                  <HelpCircle className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>View step-by-step guide</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </CardHeader>
        
        <CardContent className="space-y-6 p-6">
          {successMessage && (
            <Alert className="bg-green-50 border-green-200">
              <AlertDescription className="text-green-700">{successMessage}</AlertDescription>
            </Alert>
          )}

          {error && (
            <Alert variant="destructive" className="bg-red-50 border-red-200">
              <XCircle className="h-4 w-4 text-red-500 mr-2" />
              <AlertDescription className="text-red-700">{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="form-url" className="text-lg font-medium text-gray-700">Batch URL Generator and Exporter</Label>
            <Input
              id="form-url"
              className="border-2 focus:ring-2 focus:ring-blue-500"
              placeholder="https://form.gov.sg/67488b8b1210a416d2d7cb5b [24-digit hexadecimal]"
              value={formUrl}
              onChange={(e) => setFormUrl(e.target.value)}
              aria-describedby="form-url-format"
            />
            <p id="form-url-format" className="text-xs text-gray-500">Format: https://form.gov.sg/[24-digit hexadecimal]</p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" className="w-full hover:bg-blue-50">
                  <Upload className="mr-2 h-4 w-4" />
                  Import CSV
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Import CSV File</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <Alert className="bg-blue-50 border-blue-200">
                    <Info className="h-4 w-4 text-blue-500" />
                    <AlertDescription className="text-blue-700">
                      Upload a CSV file with columns: FieldID (24-digit hex), values, description (optional)
                    </AlertDescription>
                  </Alert>
                  
                  <Button variant="outline" onClick={downloadTemplate} className="w-full">
                    <Download className="mr-2 h-4 w-4" />
                    Download Template
                  </Button>

                  <div className="space-y-2">
                    <Label htmlFor="csv-file">CSV File</Label>
                    <Input
                      id="csv-file"
                      type="file"
                      accept=".csv"
                      onChange={handleFileUpload}
                      className="cursor-pointer"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="delimiter-select">Values Delimiter</Label>
                    <Select
                      value={delimiter}
                      onValueChange={setDelimiter}
                    >
                      <SelectTrigger id="delimiter-select">
                        <SelectValue placeholder="Select delimiter" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value=",">Comma ( , )</SelectItem>
                        <SelectItem value=";">Semicolon ( ; )</SelectItem>
                        <SelectItem value="|">Pipe ( | )</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <Button
              onClick={generateLinks}
              disabled={isProcessing || fields.length === 0}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              {isProcessing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <FileSpreadsheet className="mr-2 h-4 w-4" />
              )}
              Generate Links
            </Button>
            
            <Dialog>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  disabled={generatedLinks.length === 0}
                  className="w-full"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Export Options
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Configure Export</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="label-field">Primary Label Field (Optional)</Label>
                    <Select 
                      id="label-field"
                      value={exportConfig.labelField}
                      onValueChange={(value) => setExportConfig(prev => ({
                        ...prev,
                        labelField: value
                      }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Choose field for labeling rows" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        <SelectItem value="index">Entry Number</SelectItem>
                        {fields.map((field) => (
                          <SelectItem key={field.FieldID} value={field.FieldID}>
                            {field.description || field.FieldID}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="include-url"
                      checked={exportConfig.includeUrl}
                      onCheckedChange={(checked) => setExportConfig(prev => ({
                        ...prev,
                        includeUrl: Boolean(checked)
                      }))}
                    />
                    <Label htmlFor="include-url" className="cursor-pointer">
                      Include Form URL
                    </Label>
                  </div>

                  <div className="space-y-2">
                    <Label className="block mb-2">Additional Fields to Export</Label>
                    <div className="space-y-2 max-h-48 overflow-y-auto border rounded-md p-2">
                      {fields.map((field) => (
                        <div key={field.FieldID} className="flex items-center space-x-2">
                          <Checkbox
                            id={`field-${field.FieldID}`}
                            checked={exportConfig.additionalFields.includes(field.FieldID)}
                            onCheckedChange={(checked) => toggleAdditionalField(field.FieldID, Boolean(checked))}
                          />
                          <Label htmlFor={`field-${field.FieldID}`} className="cursor-pointer">
                            {field.description || field.FieldID}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={exportLinks}>
                    Export CSV
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {fields.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-700">Imported Fields ({fields.length})</h3>
              <div className="grid gap-4 max-h-80 overflow-y-auto pr-2">
                {fields.map((field, index) => (
                  <div key={index} className="p-4 bg-gray-50 rounded-lg border hover:border-blue-300 transition-colors">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-medium text-gray-900">{field.description || field.FieldID}</h4>
                        <p className="text-sm text-gray-500">Field ID: {field.FieldID}</p>
                      </div>
                      <div className="text-sm font-medium bg-blue-100 text-blue-800 px-2 py-1 rounded">
                        {field.values.length} values
                      </div>
                    </div>
                    <div className="mt-2">
                      <p className="text-sm text-gray-600 max-h-16 overflow-y-auto">
                        <span className="font-medium">Values:</span> {field.values.slice(0, 10).join(', ')}
                        {field.values.length > 10 && '...'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {generatedLinks.length > 0 && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-700">Generated Links</h3>
                <span className="text-sm font-medium bg-blue-100 text-blue-800 px-2 py-1 rounded">
                  Total: {generatedLinks.length}
                </span>
              </div>
              <div className="max-h-60 overflow-y-auto space-y-2 pr-2">
                {generatedLinks.slice(0, 5).map((link, index) => (
                  <div key={index} className="p-3 bg-gray-50 rounded border hover:border-blue-300 transition-colors group">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs text-gray-500">Link {index + 1}</span>
                      <a 
                        href={link.url} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="text-xs text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        Open in new tab
                      </a>
                    </div>
                    <a href={link.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 break-all text-sm">
                      {link.url}
                    </a>
                  </div>
                ))}
                {generatedLinks.length > 5 && (
                  <p className="text-sm text-gray-500 italic">
                    + {generatedLinks.length - 5} more links (export to CSV to view all)
                  </p>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showHelpDialog} onOpenChange={setShowHelpDialog}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              <div className="flex items-center">
                <FileSpreadsheet className="mr-2 h-5 w-5 text-blue-600" />
                Batch Prefill Guide
              </div>
            </DialogTitle>
            <DialogDescription>
              Step-by-step visual guide to generate prefilled FormSG URLs in bulk
            </DialogDescription>
          </DialogHeader>
          
          <InstructionalGuide />
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowHelpDialog(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BatchFormPrefill;
'use client'

import React, { useState } from 'react';
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
            alt="Field ID Placeholder 1"
            className="w-full h-48 object-cover bg-gray-100 rounded"
          />
          <p className="text-sm text-gray-600 mt-2 font-bold">Step 1: Locate your FormSG Base URL and populate under Batch URL Generator & Exporter. The URL should look like: https://form.gov.sg/[24-digit hexadecimal code]
          </p>
        </div>
        <div>
          <img
            src="/FormSG2.png"
            alt="Field ID Placeholder 2"
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
              alt="Field ID Placeholder 3"
              className="w-full h-full object-cover bg-gray-100 rounded"
            />
            <p className="text-sm text-gray-600 mt-2 font-bold">Step 3: Download and Prepare your CSV according to the image. Please ensure that you select the correct delimiter according to the delimiter used in your "values" field  </p>
          </div>
          <div>
            <img
              src="/FormSG4.png"
              alt="Field ID Placeholder 4"
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
              alt="Field ID Placeholder 5"
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
              alt="Field ID Placeholder 6"
              className="w-full h-full object-cover bg-gray-100 rounded"
            />
            <p className="text-sm text-gray-600 mt-2 font-bold">Step 6: Click on the "Export Options" Button</p>
        </div>
        <div>
            <img
              src="/FormSG7.png"
              alt="Field ID Placeholder 7"
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
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button 
            variant="outline" 
            size="icon" 
            onClick={() => setCurrentStep(Math.min(steps.length - 1, currentStep + 1))}
            disabled={currentStep === steps.length - 1}
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
          />
        ))}
      </div>
    </div>
  );
};

const BatchFormPrefill = () => {
  const [formUrl, setFormUrl] = useState('');
  const [fields, setFields] = useState([]);
  const [delimiter, setDelimiter] = useState(',');
  const [generatedLinks, setGeneratedLinks] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [showHelpDialog, setShowHelpDialog] = useState(false);
  const [exportConfig, setExportConfig] = useState({
    includeUrl: true,
    labelField: 'none', // Field to use for labeling/identification
    additionalFields: [] // Additional fields to include in export
  });
  const [successMessage, setSuccessMessage] = useState('');

  // Template structure for CSV
  const templateStructure = [
    { FieldID: '67488bb37e8c75e33b9f9191', values: 'John,Jane,Alex', description: 'Names' },
    { FieldID: '67488f8e088e833537af24aa', values: 'john@agency.gov.sg,jane@agency.gov.sg,alex@agency.gov.sg', description: 'Email' }
  ];

  const validateFormUrl = (url) => {
    const formUrlRegex = /^https:\/\/form\.gov\.sg\/[a-f0-9]{24}$/i;
    if (!formUrlRegex.test(url)) {
      throw new Error('Invalid form URL. Must be in format: https://form.gov.sg/[24-digit hexadecimal]');
    }
  };

  const showSuccess = (message) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const downloadTemplate = () => {
    const csv = Papa.unparse(templateStructure);
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
  };

  const validateCsvStructure = (data) => {
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

    // Validate FieldID format
    data.forEach((row, index) => {
      if (!/^[a-f0-9]{24}$/i.test(row.FieldID)) {
        throw new Error(`Invalid FieldID format in row ${index + 1}. Must be a 24-digit hexadecimal.`);
      }
    });

    // Validate that all fields have at least 1 value, takes the maximum
    data.forEach((row, index) => {
      const values = (row.values || '').split(delimiter).map(v => v.trim()).filter(Boolean);
      if (values.length === 0) {
        throw new Error(`Row ${index + 1} has no valid values`);
      }
    });
  };

  const handleFileUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    setError('');
    setIsProcessing(true);
    
    Papa.parse(file, {
      complete: (results) => {
        try {
          validateCsvStructure(results.data);
          
          // First pass: parse all fields and find the maximum number of values
          const parsedFields = results.data
            .filter(row => Object.values(row).some(val => val))
            .map(row => ({
              FieldID: row.FieldID || '',
              values: (row.values || '').split(delimiter).map(v => v.trim()).filter(Boolean),
              description: row.description || row.FieldID
            }));
          
          // Find the maximum number of values across all fields
          const maxValues = Math.max(...parsedFields.map(field => field.values.length));
          
          // Second pass: normalize all fields to match the maximum length
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
  };

          
   const generateLinks = () => {
    setIsProcessing(true);
    setError('');
    
    try {
      if (!formUrl) throw new Error('Form URL is required');
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
          }), {})
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
   };
  
  const generateCombinations = (fieldArrays) => {
    if (fieldArrays.length === 0) return [[]];
    
    const [first, ...rest] = fieldArrays;
    const restCombinations = generateCombinations(rest);
    
    return first.reduce((acc, item) => {
      return [...acc, ...restCombinations.map(combo => [item, ...combo])];
    }, []);
  };

  const exportLinks = () => {
    if (generatedLinks.length === 0) return;
    
    const headers = [];
    if (exportConfig.labelField) {
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
      data: generatedLinks.map(link => {
        const row = [];
        if (exportConfig.labelField) {
          row.push(link.fields[exportConfig.labelField] || '');
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
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 p-6">
      <Card className="w-full max-w-4xl mx-auto shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-t-lg">
          <CardTitle className="text-2xl">FormSG Prefill Batch Generator</CardTitle>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setShowHelpDialog(true)}
            className="hover:bg-blue-500 text-white"
          >
            <HelpCircle className="h-5 w-5" />
          </Button>
        </CardHeader>
        
        <CardContent className="space-y-6 p-6">
          {successMessage && (
            <Alert className="bg-green-50 border-green-200">
              <AlertDescription className="text-green-700">{successMessage}</AlertDescription>
            </Alert>
          )}

          {error && (
            <Alert variant="destructive" className="bg-red-50 border-red-200">
              <AlertDescription className="text-red-700">{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label className="text-lg font-medium text-gray-700">Batch URL Generator and Exporter</Label>
            <Input
              className="border-2 focus:ring-2 focus:ring-blue-500"
              placeholder="https://form.gov.sg/67488b8b1210a416d2d7cb5b [24-digit hexadecimal]"
              value={formUrl}
              onChange={(e) => setFormUrl(e.target.value)}
            />
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
                    <Label>CSV File</Label>
                    <Input
                      type="file"
                      accept=".csv"
                      onChange={handleFileUpload}
                      className="cursor-pointer"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Values Delimiter</Label>
                    <Input
                      type="text"
                      placeholder="Delimiter (default: ,)"
                      value={delimiter}
                      onChange={(e) => setDelimiter(e.target.value)}
                    />
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
                    <Label>Primary Label Field (Optional)</Label>
                    <Select 
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
                        {fields.map((field) => (
                          <SelectItem key={field.FieldID} value={field.FieldID}>
                            {field.description || field.FieldID}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={exportConfig.includeUrl}
                        onChange={(e) => setExportConfig(prev => ({
                          ...prev,
                          includeUrl: e.target.checked
                        }))}
                      />
                      Include Form URL
                    </Label>
                  </div>

                  <div className="space-y-2">
                    <Label>Additional Fields to Export</Label>
                    {fields.map((field) => (
                      <Label key={field.FieldID} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={exportConfig.additionalFields.includes(field.FieldID)}
                          onChange={(e) => {
                            const newFields = e.target.checked
                              ? [...exportConfig.additionalFields, field.FieldID]
                              : exportConfig.additionalFields.filter(id => id !== field.FieldID);
                            setExportConfig(prev => ({
                              ...prev,
                              additionalFields: newFields
                            }));
                          }}
                        />
                        {field.description || field.FieldID}
                      </Label>
                    ))}
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
              <h3 className="text-lg font-medium text-gray-700">Imported Fields</h3>
              <div className="grid gap-4">
                {fields.map((field, index) => (
                  <div key={index} className="p-4 bg-gray-50 rounded-lg border">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-medium text-gray-900">{field.description || field.FieldID}</h4>
                        <p className="text-sm text-gray-500">Field ID: {field.FieldID}</p>
                      </div>
                      <div className="text-sm text-gray-500">
                        {field.values.length} values
                      </div>
                    </div>
                    <div className="mt-2">
                      <p className="text-sm text-gray-600">
                        Values: {field.values.join(', ')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {generatedLinks.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-700">Generated Links ({generatedLinks.length})</h3>
              <div className="max-h-60 overflow-y-auto space-y-2">
                {generatedLinks.slice(0, 5).map((link, index) => (
                  <div key={index} className="p-3 bg-gray-50 rounded border text-sm">
                    <a href={link.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 break-all">
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
              <div className="flex items-center justify-between">
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
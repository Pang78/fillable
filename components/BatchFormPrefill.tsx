'use client'

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Info, Upload, Download, FileSpreadsheet, HelpCircle, Loader2 } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Papa from 'papaparse';

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
    { FieldId: '67491204088e833537b43311', values: 'John,Jane,Alex', description: 'Names' },
    { FieldId: '67491204088e833537ba3312', values: 'HR,IT,Finance', description: 'Departments' }
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

    const requiredColumns = ['FieldId', 'values'];
    const headers = Object.keys(data[0]);
    
    for (const column of requiredColumns) {
      if (!headers.includes(column)) {
        throw new Error(`Missing required column: ${column}`);
      }
    }

    // Validate FieldId format
    data.forEach((row, index) => {
      if (!/^[a-f0-9]{24}$/i.test(row.FieldId)) {
        throw new Error(`Invalid FieldId format in row ${index + 1}. Must be a 24-digit hexadecimal.`);
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
          
          const parsedFields = results.data
            .filter(row => Object.values(row).some(val => val))
            .map(row => ({
              FieldId: row.FieldId || '',
              values: (row.values || '').split(delimiter).map(v => v.trim()).filter(Boolean),
              description: row.description || row.FieldId // Use description if available, otherwise use FieldId
            }));
          
          setFields(parsedFields);
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
      
      const fieldArrays = fields.map(field => 
        field.values.map(value => ({ 
          id: field.FieldId, 
          value,
          description: field.description 
        }))
      );
      
      const combinations = generateCombinations(fieldArrays);
      
      const links = combinations.map(combo => {
        const queryParams = combo
          .map(({ id, value }) => `${id}=${encodeURIComponent(value)}`)
          .join('&');
        return {
          url: `${formUrl}?${queryParams}`,
          fields: combo.reduce((acc, { id, value, description }) => ({
            ...acc,
            [id]: value,
            [`${id}_description`]: description
          }), {})
        };
      });
      
      setGeneratedLinks(links);
      showSuccess(`Generated ${links.length} links successfully!`);
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
    exportConfig.additionalFields.forEach(fieldId => {
      const field = fields.find(f => f.FieldId === fieldId);
      if (field) {
        headers.push(field.description || fieldId);
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
        exportConfig.additionalFields.forEach(fieldId => {
          row.push(link.fields[fieldId] || '');
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
          <CardTitle className="text-2xl">Form Prefill Generator</CardTitle>
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
            <Label className="text-lg font-medium text-gray-700">Form URL</Label>
            <Input
              className="border-2 focus:ring-2 focus:ring-blue-500"
              placeholder="https://form.gov.sg/123abc... (24-digit hexadecimal)"
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
                      Upload a CSV file with columns: FieldId (24-digit hex), values, description (optional)
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
                          <SelectItem key={field.FieldId} value={field.FieldId}>
                            {field.description || field.FieldId}
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
                      <Label key={field.FieldId} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={exportConfig.additionalFields.includes(field.FieldId)}
                          onChange={(e) => {
                            const newFields = e.target.checked
                              ? [...exportConfig.additionalFields, field.FieldId]
                              : exportConfig.additionalFields.filter(id => id !== field.FieldId);
                            setExportConfig(prev => ({
                              ...prev,
                              additionalFields: newFields
                            }));
                          }}
                        />
                        {field.description || field.FieldId}
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
                        <h4 className="font-medium text-gray-900">{field.description || field.FieldId}</h4>
                        <p className="text-sm text-gray-500">Field ID: {field.FieldId}</p>
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
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>How to Use</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-sm">
            <p>1. Enter your Form.gov.sg form URL</p>
            <p>2. Import a CSV file with the following columns:</p>
            <ul className="list-disc pl-6">
              <li>FieldId: 24-digit hexadecimal from your form</li>
              <li>values: Comma-separated list of values</li>
              <li>description: (Optional) Friendly name for the field</li>
            </ul>
            <p>3. Click "Generate Links" to create prefilled form URLs</p>
            <p>4. Export the generated links to CSV with custom options</p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BatchFormPrefill;
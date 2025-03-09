import React, { useState, useRef, useEffect } from 'react';
import Papa from 'papaparse';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from '@/components/ui/use-toast';
import { Info, Send, Plus, FileSpreadsheet, Upload, Download } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';

interface LetterParams {
  [key: string]: string;
}

interface BulkLetterDetails {
  apiKey: string;
  templateId: number | null;
  lettersParams: LetterParams[];
  notificationMethod?: 'SMS' | 'EMAIL';
  recipients?: string[];
}

interface TemplateField {
  name: string;
  required: boolean;
}

const CSVImportDialog: React.FC<{
  templateFields: TemplateField[];
  onImport: (params: LetterParams[]) => void;
}> = ({ templateFields, onImport }) => {
  const [importedData, setImportedData] = useState<LetterParams[]>([]);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [fieldMapping, setFieldMapping] = useState<{ [templateField: string]: string }>({});
  const [previewData, setPreviewData] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Read the entire file first to get headers and data
    Papa.parse(file, {
      header: true,
      complete: (results) => {
        if (results.data.length === 0 || !results.meta.fields || results.meta.fields.length === 0) {
          toast({
            title: 'Invalid CSV',
            description: 'The CSV file is empty or has no valid headers.',
            variant: 'destructive',
          });
          return;
        }

        const headers = results.meta.fields;
        setCsvHeaders(headers);
        setPreviewData(results.data.slice(0, 5)); // Store first 5 rows for preview

        // Try to automatically map fields based on name similarity
        const initialMapping: { [templateField: string]: string } = {};
        templateFields.forEach((templateField) => {
          const matchingHeader = headers.find(
            (header) => header.toLowerCase() === templateField.name.toLowerCase()
          );
          if (matchingHeader) {
            initialMapping[templateField.name] = matchingHeader;
          }
        });

        setFieldMapping(initialMapping);
      },
      error: (error) => {
        toast({
          title: 'CSV Parse Error',
          description: error.message,
          variant: 'destructive',
        });
      }
    });
  };

  const processImport = () => {
    // Check if all required fields are mapped
    const unmappedFields = templateFields
      .filter(f => f.required && !fieldMapping[f.name])
      .map(f => f.name);
  
    if (unmappedFields.length > 0) {
      toast({
        title: 'Missing Required Mappings',
        description: `The following required fields are not mapped: ${unmappedFields.join(', ')}`,
        variant: 'destructive',
      });
      return;
    }

    // Process the file again with the established mapping
    if (fileInputRef.current?.files?.[0]) {
      Papa.parse(fileInputRef.current.files[0], {
        header: true,
        complete: (results) => {
          // Transform the data using the field mapping
          const transformedData = results.data
            .filter((row: any) => {
              // Filter out rows that don't have all required fields
              return !templateFields
                .filter(field => field.required)
                .some(field => {
                  const csvHeader = fieldMapping[field.name];
                  return !csvHeader || !row[csvHeader];
                });
            })
            .map((row: any) => {
              const transformedRow: LetterParams = {};
              templateFields.forEach((field) => {
                const csvHeader = fieldMapping[field.name];
                if (csvHeader) {
                  transformedRow[field.name] = row[csvHeader];
                }
              });
              return transformedRow;
            });

          if (transformedData.length === 0) {
            toast({
              title: 'No Valid Data',
              description: 'No rows with all required fields were found in the CSV.',
              variant: 'destructive',
            });
            return;
          }

          setImportedData(transformedData);
          onImport(transformedData);

          toast({
            description: `Imported ${transformedData.length} letter parameters successfully`,
          });
        },
        error: (error) => {
          toast({
            title: 'CSV Import Error',
            description: error.message,
            variant: 'destructive',
          });
        }
      });
    }
  };

  const updateFieldMapping = (templateField: string, csvHeader: string) => {
    setFieldMapping((prev) => ({
      ...prev,
      [templateField]: csvHeader,
    }));
  };

  const generateExampleTemplate = () => {
    const headers = templateFields.map((field) => field.name);
    const exampleRow = templateFields.map((field) => {
      if (field.name.toLowerCase().includes('name')) return 'John Doe';
      if (field.name.toLowerCase().includes('email')) return 'john.doe@example.com';
      if (field.name.toLowerCase().includes('phone')) return '91234567';
      if (field.name.toLowerCase().includes('address')) return '123 Main St, Singapore';
      return 'Example Value';
    });

    const csvContent = [headers.join(','), exampleRow.join(',')].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'letter_template.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">
          <FileSpreadsheet className="mr-2 h-4 w-4" />
          Import CSV
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[800px]">
        <DialogHeader>
          <DialogTitle>Import Letter Parameters from CSV</DialogTitle>
          <DialogDescription>Map CSV headers to letter template fields</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <input
              type="file"
              accept=".csv"
              ref={fileInputRef}
              onChange={handleFileUpload}
              className="hidden"
            />
            <Button onClick={() => fileInputRef.current?.click()}>
              <Upload className="mr-2 h-4 w-4" />
              Select CSV File
            </Button>
            <Button variant="outline" onClick={generateExampleTemplate}>
              <Download className="mr-2 h-4 w-4" />
              Download Template
            </Button>
          </div>

          {previewData.length > 0 && (
            <div className="border rounded p-2 bg-slate-50">
              <h4 className="text-sm font-semibold mb-1">CSV Preview (First 5 rows)</h4>
              <div className="max-h-24 overflow-y-auto">
                <Table className="text-xs">
                  <TableHeader>
                    <TableRow>
                      {csvHeaders.map(header => (
                        <TableHead key={header}>{header}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {previewData.map((row, idx) => (
                      <TableRow key={idx}>
                        {csvHeaders.map(header => (
                          <TableCell key={`${idx}-${header}`}>{row[header]}</TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {csvHeaders.length > 0 && (
            <div>
              <h4 className="font-semibold mb-2">Map CSV Headers to Template Fields</h4>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Template Field</TableHead>
                    <TableHead>Mapped CSV Header</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {templateFields.map((field) => (
                    <TableRow key={field.name}>
                      <TableCell>
                        {field.name} {field.required && <span className="text-red-500 ml-1">*</span>}
                      </TableCell>
                      <TableCell>
                        <Select value={fieldMapping[field.name] || ''} onValueChange={(value) => updateFieldMapping(field.name, value)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select CSV Header" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">-- Select Header --</SelectItem>
                            {csvHeaders.map((header) => (
                              <SelectItem key={header} value={header}>{header}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              
              <div className="mt-4 flex justify-end">
                <Button onClick={processImport}>Import Data</Button>
              </div>
            </div>
          )}

          {importedData.length > 0 && (
            <div className="border rounded-lg p-4">
              <div className="flex justify-between items-center mb-2">
                <h4 className="font-semibold">Imported Parameters ({importedData.length} records)</h4>
              </div>
              <div className="max-h-48 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {templateFields.map((field) => (
                        <TableHead key={field.name}>{field.name}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {importedData.slice(0, 10).map((item, index) => (
                      <TableRow key={index}>
                        {templateFields.map((field) => (
                          <TableCell key={field.name}>{item[field.name] || '-'}</TableCell>
                        ))}
                      </TableRow>
                    ))}
                    {importedData.length > 10 && (
                      <TableRow>
                        <TableCell colSpan={templateFields.length} className="text-center text-muted-foreground">
                          + {importedData.length - 10} more records
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Create a simple backend proxy service for Letters.gov.sg API
const API_PROXY_URL = '/api/letters'; // This should be implemented on your backend

const LetterMode: React.FC = () => {
  const [letterDetails, setLetterDetails] = useState<BulkLetterDetails>({
    apiKey: '',
    templateId: null,
    lettersParams: [{}],
    notificationMethod: undefined,
    recipients: [],
  });

  const [templateFields, setTemplateFields] = useState<TemplateField[]>([]);
  const [isNotificationEnabled, setIsNotificationEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  // Add debounced template loading
  const debouncedFetchTemplate = useRef(
    debounce((templateId: number) => {
      fetchTemplateDetails(templateId);
    }, 500)
  ).current;

  // Add useEffect for debounced template loading
  useEffect(() => {
    if (letterDetails.templateId && letterDetails.templateId > 0) {
      debouncedFetchTemplate(letterDetails.templateId);
    }
  }, [letterDetails.templateId, debouncedFetchTemplate]);

  useEffect(() => {
    const savedApiKey = localStorage.getItem('lettersGovSgApiKey');
    if (savedApiKey) {
      setLetterDetails((prev) => ({
        ...prev,
        apiKey: savedApiKey,
      }));
    }
  }, []);

  const fetchTemplateDetails = async (templateId: number) => {
    if (!letterDetails.apiKey || !templateId) return;
    
    setIsLoading(true);
    setApiError(null);

    try {
      // Using proxy endpoint to avoid exposing API key in frontend
      const response = await fetch(`${API_PROXY_URL}/templates/${templateId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': letterDetails.apiKey,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to fetch template: ${response.status}`);
      }

      const templateData = await response.json();
      const requiredFields = templateData.fields.map((field: any) => ({
        name: field.name,
        required: field.required,
      }));

      setTemplateFields(requiredFields);

      toast({
        title: 'Template Loaded',
        description: `Template ${templateId} loaded successfully`,
      });
    } catch (error) {
      setTemplateFields([]); // Clear existing template fields on error
      
      toast({
        title: 'Error Fetching Template',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const updateLetterDetail = (key: keyof BulkLetterDetails, value: any) => {
    setLetterDetails((prev) => ({
      ...prev,
      [key]: value,
    }));

    if (key === 'apiKey') {
      localStorage.setItem('lettersGovSgApiKey', value);
    }
  };

  const updateLetterParams = (index: number, field: string, value: string) => {
    const newLettersParams = [...letterDetails.lettersParams];
    newLettersParams[index] = {
      ...newLettersParams[index],
      [field]: value,
    };
    setLetterDetails((prev) => ({
      ...prev,
      lettersParams: newLettersParams,
    }));
  };

  const addLetterParams = () => {
    setLetterDetails((prev) => ({
      ...prev,
      lettersParams: [...prev.lettersParams, {}],
    }));
  };

  const removeLetterParams = (index: number) => {
    if (letterDetails.lettersParams.length <= 1) return;
    
    setLetterDetails((prev) => ({
      ...prev,
      lettersParams: prev.lettersParams.filter((_, i) => i !== index)
    }));
  };

  const handleCSVImport = (importedParams: LetterParams[]) => {
    setLetterDetails((prev) => ({
      ...prev,
      lettersParams: importedParams,
    }));
  };

  const validatePayload = () => {
    const { apiKey, templateId, lettersParams } = letterDetails;

    if (!apiKey) {
      toast({
        title: 'API Key Required',
        description: 'Please enter your Letters.gov.sg API key',
        variant: 'destructive',
      });
      return false;
    }

    if (!templateId) {
      toast({
        title: 'Template Required',
        description: 'Please select a template',
        variant: 'destructive',
      });
      return false;
    }

    if (lettersParams.length === 0) {
      toast({
        title: 'No Letter Parameters',
        description: 'Please add at least one letter parameter',
        variant: 'destructive',
      });
      return false;
    }
    
    if (lettersParams.length > 500) {
      toast({
        title: 'Too Many Letters',
        description: 'The API supports a maximum of 500 letters per batch',
        variant: 'destructive',
      });
      return false;
    }

    const missingFields = templateFields
      .filter((field) => field.required)
      .some((field) =>
        lettersParams.some((params) => !params[field.name] || params[field.name].trim() === '')
      );

    if (missingFields) {
      toast({
        title: 'Missing Required Fields',
        description: 'Please fill in all required template fields',
        variant: 'destructive',
      });
      return false;
    }

    if (isNotificationEnabled) {
      const notificationMethod = letterDetails.notificationMethod;
      const recipients = letterDetails.recipients;

      if (!notificationMethod) {
        toast({
          title: 'Notification Method Required',
          description: 'Please select a notification method (SMS or Email)',
          variant: 'destructive',
        });
        return false;
      }

      if (!recipients || recipients.length === 0) {
        toast({
          title: 'Recipients Required',
          description: 'Please add at least one recipient for notifications',
          variant: 'destructive',
        });
        return false;
      }

      if (recipients.length !== lettersParams.length) {
        toast({
          title: 'Recipient Count Mismatch',
          description: 'The number of recipients must match the number of letters',
          variant: 'destructive',
        });
        return false;
      }

      // Validate phone numbers if using SMS
      if (notificationMethod === 'SMS') {
        const invalidPhones = recipients.filter(phone => !phone.match(/^[89]\d{7}$/));
        if (invalidPhones.length > 0) {
          toast({
            title: 'Invalid Phone Numbers',
            description: 'Phone numbers should be local SG handphone numbers starting with 8 or 9',
            variant: 'destructive',
          });
          return false;
        }
      }

      // Validate emails if using EMAIL
      if (notificationMethod === 'EMAIL') {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const invalidEmails = recipients.filter(email => !emailRegex.test(email));
        if (invalidEmails.length > 0) {
          toast({
            title: 'Invalid Email Addresses',
            description: 'Please provide valid email addresses',
            variant: 'destructive',
          });
          return false;
        }
      }
    }

    return true;
  };

  const generateBulkLetters = async () => {
    if (!validatePayload()) return;
    
    // Debug log to check parameters
    console.log("Template fields required:", templateFields);
    console.log("Letter params being sent:", letterDetails.lettersParams);
    
    setIsLoading(true);
    setApiError(null);

    const { apiKey, templateId, lettersParams } = letterDetails;

    const payload: any = {
      templateId,
      lettersParams,
    };

    if (isNotificationEnabled) {
      payload.notificationMethod = letterDetails.notificationMethod;
      payload.recipients = letterDetails.recipients;
    }

    try {
      // Using proxy endpoint to avoid exposing API key in frontend
      const response = await fetch(`${API_PROXY_URL}/bulks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': apiKey,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.log("API error details:", errorData);
        
        // Handle specific error messages from the API
        if (errorData.errors && Array.isArray(errorData.errors)) {
          const errorMessages = errorData.errors.map((err: any) => 
            `${err.id !== undefined ? `Item ${err.id}: ` : ''}${err.message}`
          ).join('\n');
          
          throw new Error(`${errorData.message}\n${errorMessages}`);
        }
        
        throw new Error(errorData.message || `Request failed with status ${response.status}`);
      }

      const { batchId } = await response.json();

      toast({
        title: 'Bulk Letters Generated',
        description: `Batch ID: ${batchId}. Letters generated successfully.`,
        variant: 'default',
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      setApiError(errorMessage);
      
      toast({
        title: 'Error Generating Bulk Letters',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Bulk Letter Generation</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Generate bulk letters using the Letters.gov.sg service. You can create up to 500 letters in a single batch.
          </AlertDescription>
        </Alert>

        {apiError && (
          <Alert variant="destructive">
            <AlertDescription className="whitespace-pre-line">{apiError}</AlertDescription>
          </Alert>
        )}

        <div>
          <Label>API Key</Label>
          <Input
            type="password"
            placeholder="Enter your Letters.gov.sg API key"
            value={letterDetails.apiKey}
            onChange={(e) => updateLetterDetail('apiKey', e.target.value)}
          />
          <p className="text-xs text-muted-foreground mt-1">
            Note: For security, consider setting up a backend proxy to avoid exposing your API key in frontend code.
          </p>
        </div>

        <div>
          <Label>Template ID</Label>
          <div className="flex gap-2">
            <Input
              type="number"
              min="1"
              placeholder="Enter Template ID"
              value={letterDetails.templateId || ''}
              onChange={(e) => {
                const value = e.target.value;
                // Prevent negative numbers and non-numeric input
                const numValue = parseInt(value);
                if (!isNaN(numValue) && numValue > 0) {
                  updateLetterDetail('templateId', numValue);
                } else if (value === '') {
                  updateLetterDetail('templateId', null);
                }
              }}
            />
            <Button 
              variant="outline" 
              onClick={() => letterDetails.templateId && fetchTemplateDetails(letterDetails.templateId)}
              disabled={isLoading || !letterDetails.templateId}
            >
              Load Template
            </Button>
          </div>
        </div>

        {templateFields.length > 0 && (
          <div className="flex gap-2">
            <CSVImportDialog templateFields={templateFields} onImport={handleCSVImport} />
          </div>
        )}

        {templateFields.length > 0 && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <Label>Letter Parameters ({letterDetails.lettersParams.length})</Label>
              <Button onClick={addLetterParams} variant="outline" size="sm">
                <Plus className="mr-2 h-4 w-4" /> Add Letter
              </Button>
            </div>
            
            <div className="max-h-80 overflow-y-auto">
              {letterDetails.lettersParams.map((params, index) => (
                <div key={index} className="border rounded-lg p-4 mb-4">
                  <div className="flex justify-between mb-2">
                    <h4 className="font-medium">Letter #{index + 1}</h4>
                    {letterDetails.lettersParams.length > 1 && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => removeLetterParams(index)}
                        className="h-6 text-red-500 hover:text-red-700"
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {templateFields.map((field) => (
                      <div key={field.name}>
                        <Label className="text-sm">
                          {field.name} {field.required && <span className="text-red-500">*</span>}
                        </Label>
                        <Input
                          placeholder={`Enter ${field.name}`}
                          value={params[field.name] || ''}
                          onChange={(e) => updateLetterParams(index, field.name, e.target.value)}
                          className="mt-1"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Switch
              id="notification-enable"
              checked={isNotificationEnabled}
              onCheckedChange={setIsNotificationEnabled}
            />
            <Label htmlFor="notification-enable">Enable Batch Completion Notification</Label>
          </div>

          {isNotificationEnabled && (
            <div className="space-y-4">
              <div>
                <Label>Notification Method</Label>
                <Select
                  value={letterDetails.notificationMethod}
                  onValueChange={(value: 'SMS' | 'EMAIL') => updateLetterDetail('notificationMethod', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select notification method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SMS">SMS</SelectItem>
                    <SelectItem value="EMAIL">Email</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Recipients {letterDetails.notificationMethod === 'SMS' ? '(Phone Numbers)' : '(Email Addresses)'}</Label>
                <Textarea
                  placeholder={`Enter ${letterDetails.notificationMethod === 'SMS' ? 'phone numbers' : 'email addresses'}, separated by commas`}
                  value={letterDetails.recipients?.join(', ') || ''}
                  onChange={(e) => {
                    const recipients = e.target.value.split(',').map((s) => s.trim()).filter(Boolean);
                    updateLetterDetail('recipients', recipients);
                  }}
                />
                <p className="text-sm text-muted-foreground mt-1">
                  {letterDetails.notificationMethod === 'SMS' 
                    ? 'Enter Singapore phone numbers starting with 8 or 9, separated by commas' 
                    : 'Enter email addresses separated by commas'}
                </p>
                {letterDetails.recipients && letterDetails.lettersParams.length !== letterDetails.recipients.length && (
                  <p className="text-sm text-red-500 mt-1">
                    Number of recipients ({letterDetails.recipients.length}) does not match number of letters ({letterDetails.lettersParams.length})
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="mt-6">
          <Button 
            onClick={generateBulkLetters} 
            className="w-full" 
            disabled={isLoading}
          >
            {isLoading ? 'Processing...' : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Generate Bulk Letters
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default LetterMode;
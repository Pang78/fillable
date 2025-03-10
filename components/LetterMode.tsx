import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
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
import debounce from 'lodash.debounce';

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

// Add type definitions for Papa.parse results
interface PapaParseResult {
  data: any[];
  errors: any[];
  meta: {
    delimiter: string;
    linebreak: string;
    aborted: boolean;
    truncated: boolean;
    cursor: number;
    fields: string[];
  };
}

interface PapaParseError {
  type: string;
  code: string;
  message: string;
  row?: number;
}

const CSVImportDialog: React.FC<{
  templateFields: TemplateField[];
  onImport: (params: LetterParams[]) => void;
}> = ({ templateFields, onImport }) => {
  const [importedData, setImportedData] = useState<LetterParams[]>([]);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [fieldMapping, setFieldMapping] = useState<{ [templateField: string]: string }>({});
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [mappedPreview, setMappedPreview] = useState<LetterParams[]>([]);
  const [showMappedPreview, setShowMappedPreview] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  // Initialize field mapping with intelligent guesses
  useEffect(() => {
    if (templateFields.length > 0 && csvHeaders.length > 0) {
      const initialMapping: { [key: string]: string } = {};
      
      // Try to match template fields with CSV headers
      templateFields.forEach(field => {
        if (!field.name) return;
        
        // Look for exact matches first
        const exactMatch = csvHeaders.find(header => 
          header.toLowerCase() === field.name.toLowerCase()
        );
        
        if (exactMatch) {
          initialMapping[field.name] = exactMatch;
        } else {
          // Look for partial matches
          const partialMatch = csvHeaders.find(header => 
            header.toLowerCase().includes(field.name.toLowerCase()) || 
            field.name.toLowerCase().includes(header.toLowerCase())
          );
          
          if (partialMatch) {
            initialMapping[field.name] = partialMatch;
          }
        }
      });
      
      setFieldMapping(initialMapping);
    }
  }, [templateFields, csvHeaders]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Reset states when a new file is uploaded
    setShowMappedPreview(false);
    setMappedPreview([]);

    // Read the entire file first to get headers and data
    Papa.parse<any>(file, {
      header: true,
      complete: (results: PapaParseResult) => {
        if (results.data.length === 0 || !results.meta.fields || results.meta.fields.length === 0) {
          toast({
            title: 'Invalid CSV',
            description: 'The CSV file is empty or has no valid headers.',
            variant: 'destructive',
          });
          return;
        }

        // Filter out empty or invalid headers
        const headers = results.meta.fields
          .filter(header => header && typeof header === 'string' && header.trim() !== '')
          .map(header => header.trim());
        
        if (headers.length === 0) {
          toast({
            title: 'Invalid CSV Headers',
            description: 'The CSV file contains only empty or invalid headers.',
            variant: 'destructive',
          });
          return;
        }
        
        // Check for duplicate headers after trimming
        const uniqueHeaders = new Set(headers);
        if (uniqueHeaders.size !== headers.length) {
          toast({
            title: 'Duplicate CSV Headers',
            description: 'The CSV file contains duplicate headers after trimming whitespace.',
            variant: 'destructive',
          });
          return;
        }
        
        setCsvHeaders(headers);
        setPreviewData(results.data.slice(0, 5)); // Store first 5 rows for preview
      },
      error: (error: Error) => {
        console.error('Error parsing CSV:', error);
        setError('Failed to parse CSV file. Please check the file format.');
      }
    });
  };

  const previewMappedData = () => {
    // Get all template fields that have a mapping
    const mappedFields = templateFields
      .filter(field => field.name && fieldMapping[field.name] && fieldMapping[field.name] !== '__placeholder__')
      .map(field => field.name);
    
    if (mappedFields.length === 0) {
      toast({
        title: 'No Fields Mapped',
        description: 'Please map at least one template field to a CSV header.',
        variant: 'destructive',
      });
      return;
    }

    // Create a preview of the mapped data (first 5 rows)
    const previewRows = previewData.map((row: any) => {
      const mappedRow: LetterParams = {};
      
      // For each template field that has a mapping
      mappedFields.forEach(fieldName => {
        if (!fieldName) return;
        const csvHeader = fieldMapping[fieldName];
        if (csvHeader && csvHeader !== '__placeholder__') {
          mappedRow[fieldName] = row[csvHeader] || '';
        }
      });
      
      return mappedRow;
    });

    setMappedPreview(previewRows);
    setShowMappedPreview(true);
  };

  const processImport = () => {
    // Get all template fields that have a mapping
    const mappedFields = templateFields
      .filter(field => field.name && fieldMapping[field.name] && fieldMapping[field.name] !== '__placeholder__')
      .map(field => field.name);
    
    if (mappedFields.length === 0) {
      toast({
        title: 'No Fields Mapped',
        description: 'Please map at least one template field to a CSV header.',
        variant: 'destructive',
      });
      return;
    }

    // Process all rows in the CSV
    Papa.parse<any>(fileInputRef.current?.files?.[0] as File, {
      header: true,
      complete: (results: PapaParseResult) => {
        // Map each row to the template fields
        const mappedData = results.data.map((row: any) => {
          const mappedRow: LetterParams = {};
          
          // For each template field that has a mapping
          mappedFields.forEach(fieldName => {
            if (!fieldName) return;
            const csvHeader = fieldMapping[fieldName];
            if (csvHeader && csvHeader !== '__placeholder__') {
              mappedRow[fieldName] = row[csvHeader] || '';
            }
          });
          
          return mappedRow;
        });

        // Filter out empty rows (all values are empty)
        const nonEmptyRows = mappedData.filter(row => 
          Object.values(row).some(value => value.trim() !== '')
        );

        if (nonEmptyRows.length === 0) {
          toast({
            title: 'No Valid Data',
            description: 'No valid data found after mapping. Please check your CSV file.',
            variant: 'destructive',
          });
          return;
        }

        setImportedData(nonEmptyRows);
        onImport(nonEmptyRows);
        toast({
          description: `Successfully imported ${nonEmptyRows.length} records`,
        });
      },
      error: (error: Error) => {
        console.error('Error parsing CSV:', error);
        setError('Failed to parse CSV file. Please check the file format.');
      }
    });
  };

  const updateFieldMapping = (templateField: string, csvHeader: string) => {
    // If the placeholder is selected, clear the mapping
    if (csvHeader === '__placeholder__') {
      setFieldMapping((prev) => {
        const newMapping = { ...prev };
        delete newMapping[templateField];
        return newMapping;
      });
    } else {
      setFieldMapping((prev) => ({
        ...prev,
        [templateField]: csvHeader,
      }));
    }
    
    // Reset the preview when mapping changes
    setShowMappedPreview(false);
  };

  const generateExampleTemplate = () => {
    // Create headers from template fields
    const headers = templateFields
      .filter(field => field.name) // Filter out fields without names
      .map((field) => field.name);
    
    // Create an example row with placeholder values
    const exampleRow = templateFields
      .filter(field => field.name) // Filter out fields without names
      .map((field) => {
        const fieldName = field.name;
        if (fieldName.includes('name')) return 'John Doe';
        if (fieldName.includes('email')) return 'example@example.com';
        if (fieldName.includes('phone')) return '+6591234567';
        if (fieldName.includes('address')) return '123 Main St';
        if (fieldName.includes('date')) return '2023-01-01';
        if (fieldName.includes('id')) return '12345';
        return 'Example Value';
      });
    
    // Create CSV content
    const csvContent = [
      headers.join(','),
      exampleRow.join(','),
    ].join('\n');
    
    // Create and download the file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'template_example.csv');
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
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
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
                        <Select 
                          value={fieldMapping[field.name] || '__placeholder__'} 
                          onValueChange={(value) => updateFieldMapping(field.name, value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select CSV Header" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__placeholder__">-- Select Header --</SelectItem>
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
              
              <div className="mt-4 flex justify-end gap-2">
                <Button variant="outline" onClick={previewMappedData}>Preview Mapping</Button>
                <Button onClick={processImport}>Import Data</Button>
              </div>
            </div>
          )}

          {showMappedPreview && mappedPreview.length > 0 && (
            <div className="border rounded p-4 bg-slate-50 mt-4">
              <h4 className="font-semibold mb-2">Mapped Data Preview</h4>
              <p className="text-sm text-slate-500 mb-2">
                This is how your CSV data will be mapped to the template fields. Please verify before importing.
              </p>
              <div className="max-h-64 overflow-y-auto">
                <Table className="text-xs">
                  <TableHeader>
                    <TableRow>
                      {templateFields.map(field => (
                        <TableHead key={field.name}>{field.name}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mappedPreview.map((row, idx) => (
                      <TableRow key={idx}>
                        {templateFields.map(field => (
                          <TableCell key={`${idx}-${field.name}`}>{row[field.name] || '-'}</TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="mt-2 text-xs text-slate-500">
                Showing preview of first {mappedPreview.length} rows. The actual import will process all rows.
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
    lettersParams: [],
    notificationMethod: undefined,
    recipients: [],
  });

  const [templateFields, setTemplateFields] = useState<TemplateField[]>([]);
  const [isNotificationEnabled, setIsNotificationEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isTemplateLoading, setIsTemplateLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [templateCache, setTemplateCache] = useState<{[key: number]: TemplateField[]}>({});

  // Add debounced template loading
  const debouncedFetchTemplate = useRef(
    debounce((templateId: number) => {
      fetchTemplateDetails(templateId);
    }, 500)
  ).current;

  // Add useEffect for debounced template loading
  useEffect(() => {
    if (letterDetails.templateId && letterDetails.templateId > 0) {
      // Check if we already have this template in cache
      if (templateCache[letterDetails.templateId]) {
        setTemplateFields(templateCache[letterDetails.templateId]);
      } else {
        debouncedFetchTemplate(letterDetails.templateId);
      }
    }
  }, [letterDetails.templateId, debouncedFetchTemplate, templateCache]);

  // New useEffect to handle template field initialization
  useEffect(() => {
    if (templateFields.length > 0) {
      // Add this section to initialize letter params with required fields
      const hasRecipientName = templateFields.some((field: TemplateField) => 
        field.name === 'recipient_name'
      );
      
      const requiredFieldsCopy = [...templateFields];
      
      // If recipient_name isn't in the template fields but is required by the API, add it
      if (!hasRecipientName) {
        requiredFieldsCopy.push({ name: 'recipient_name', required: true });
      }
      
      // Create default letter params with all required fields
      const defaultParams: LetterParams = {};
      requiredFieldsCopy.forEach((field: TemplateField) => {
        // Ensure field.name exists before using it as a key
        if (field.name && field.required) {
          defaultParams[field.name] = '';
        }
      });
      
      // Initialize with one empty set of parameters
      setLetterDetails(prev => ({
        ...prev,
        lettersParams: prev.lettersParams.length ? prev.lettersParams : [defaultParams]
      }));
      
      // Show toast notification when template is loaded
      toast({
        description: `Template loaded successfully with ${templateFields.length} fields`,
      });
    }
  }, [templateFields]);

  useEffect(() => {
    return () => {
      debouncedFetchTemplate.cancel();
    };
  }, [debouncedFetchTemplate]);

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
    
    setIsTemplateLoading(true);
    setApiError(null);
    setIsLoading(true);
  
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
      
      // Handle both array of strings and array of objects
      const requiredFields: TemplateField[] = Array.isArray(templateData.fields) 
        ? templateData.fields.map((field: any) => {
            // If field is a string, convert to object
            if (typeof field === 'string') {
              return {
                name: field,
                required: true // Assume all fields are required by default
              };
            }
            // If field is already an object with name and required properties
            else if (field && typeof field === 'object' && 'name' in field) {
              return {
                name: field.name,
                required: field.required !== false // Default to true if not specified
              };
            }
            // Fallback for unexpected data
            return null;
          }).filter(Boolean) // Remove any null values
        : [];
  
      console.log('Processed template fields:', requiredFields);
      
      setTemplateFields(requiredFields);
      
      // Cache the template fields for future use
      setTemplateCache(prev => ({
        ...prev,
        [templateId]: requiredFields
      }));
      
      // Remove the initialization logic from here since it's now in the useEffect
    } catch (error) {
      console.error('Error fetching template:', error);
      setApiError(error instanceof Error ? error.message : 'Failed to fetch template details');
      
      // Show error toast
      toast({
        title: 'Error Loading Template',
        description: error instanceof Error ? error.message : 'Failed to fetch template',
        variant: 'destructive',
      });
    } finally {
      setIsTemplateLoading(false);
      setIsLoading(false);
    }
  };

  const updateLetterDetail = useCallback((key: keyof BulkLetterDetails, value: any) => {
    setLetterDetails((prev) => ({
      ...prev,
      [key]: value,
    }));
  }, []);

  const updateLetterParams = useCallback((index: number, field: string, value: string) => {
    setLetterDetails((prev) => {
      const updatedParams = [...prev.lettersParams];
      updatedParams[index] = {
        ...updatedParams[index],
        [field]: value,
      };
      return {
        ...prev,
        lettersParams: updatedParams,
      };
    });
  }, []);

  const addLetterParams = useCallback(() => {
    // Create new params object with default value for recipient_name
    const newParams: LetterParams = {};
    
    // Add any other required fields from templateFields
    templateFields.forEach(field => {
      if (field.name && field.required) {
        newParams[field.name] = '';
      }
    });
    
    // Ensure recipient_name is included if it's required
    if (!newParams.recipient_name && templateFields.some(field => field.name === 'recipient_name')) {
      newParams.recipient_name = '';
    }
    
    setLetterDetails((prev) => ({
      ...prev,
      lettersParams: [...prev.lettersParams, newParams],
    }));
  }, [templateFields]);

  const removeLetterParams = useCallback((index: number) => {
    if (letterDetails.lettersParams.length <= 1) return;
    
    setLetterDetails((prev) => ({
      ...prev,
      lettersParams: prev.lettersParams.filter((_, i) => i !== index)
    }));
  }, [letterDetails.lettersParams.length]);

  const handleCSVImport = useCallback((importedParams: LetterParams[]) => {
    // Ensure each imported params has all required fields, especially recipient_name
    const updatedParams = importedParams.map(params => {
      // Create a new object with only the fields that are in templateFields
      const filteredParams: LetterParams = {};
      
      // Process each template field
      templateFields.forEach(field => {
        // Skip fields without a name
        if (!field.name) return;
        
        // Add field if it's required or if it has a value in the imported data
        if (field.required || params[field.name]) {
          filteredParams[field.name] = params[field.name] || '';
        }
      });
      
      // Ensure recipient_name is included if it's required
      if (!filteredParams.recipient_name && templateFields.some(field => field.name === 'recipient_name')) {
        filteredParams.recipient_name = '';
      }
      
      return filteredParams;
    });
    
    setLetterDetails((prev) => ({
      ...prev,
      lettersParams: updatedParams,
    }));
    
    toast({
      description: `Successfully imported ${updatedParams.length} records`,
    });
  }, [templateFields]);

  const validatePayload = useCallback(() => {
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
  }, [letterDetails, isNotificationEnabled, templateFields]);

  const generateBulkLetters = async () => {
    if (!validatePayload()) return;
    
    setIsSending(true);
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
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
      
      const response = await fetch(`${API_PROXY_URL}/bulks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': apiKey,
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);

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
      console.error('Error generating bulk letters:', error);
      
      let errorMessage = 'Failed to generate letters';
      if (error instanceof Error) {
        errorMessage = error.message;
        if (error.name === 'AbortError') {
          errorMessage = 'Request timed out. Please try again.';
        }
      }
      
      setApiError(errorMessage);
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsSending(false);
    }
  };

  // Memoize the letter params form to prevent unnecessary re-renders
  const letterParamsForm = useMemo(() => (
    <div className="space-y-4">
      {letterDetails.lettersParams.map((params, index) => (
        <Card key={`letter-params-${index}`}>
          <CardHeader className="py-2 px-4 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium">
              Letter {index + 1}
            </CardTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => removeLetterParams(index)}
              disabled={letterDetails.lettersParams.length <= 1 || isLoading || isSending}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-4 w-4"
              >
                <path d="M18 6 6 18" />
                <path d="m6 6 12 12" />
              </svg>
              <span className="sr-only">Remove</span>
            </Button>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="grid gap-3">
              {templateFields.map((field, fieldIndex) => {
                // Ensure field.name exists and is a string
                const fieldName = field?.name || '';
                if (!fieldName) return null;
                
                return (
                  <div key={`field-${index}-${fieldIndex}-${fieldName}`} className="space-y-1">
                    <Label htmlFor={`${index}-${fieldName}`} className="flex items-center">
                      <span className="font-medium">{fieldName}</span> 
                      {field.required && <span className="text-red-500 ml-1">*</span>}
                    </Label>
                    <Textarea
                      id={`${index}-${fieldName}`}
                      value={params[fieldName] || ''}
                      onChange={(e) => updateLetterParams(index, fieldName, e.target.value)}
                      className="h-20 resize-none"
                      placeholder={`Enter ${fieldName} value`}
                      disabled={isLoading || isSending}
                    />
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ))}
      <Button
        variant="outline"
        onClick={addLetterParams}
        className="w-full"
        disabled={isLoading || isSending}
      >
        <Plus className="mr-2 h-4 w-4" />
        Add Another Letter
      </Button>
    </div>
  ), [letterDetails.lettersParams, templateFields, isLoading, isSending, addLetterParams, removeLetterParams, updateLetterParams]);

  return (
    <div className="container mx-auto py-6 max-w-4xl">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Letter Mode</h1>
        </div>

        {apiError && (
          <Alert variant="destructive">
            <AlertDescription className="whitespace-pre-line">{apiError}</AlertDescription>
          </Alert>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label>API Key</Label>
            <div className="flex gap-2">
              <Input
                type="password"
                placeholder="Enter your Letters.gov.sg API Key"
                value={letterDetails.apiKey}
                onChange={(e) => {
                  updateLetterDetail('apiKey', e.target.value);
                  localStorage.setItem('lettersGovSgApiKey', e.target.value);
                }}
                disabled={isLoading || isSending}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Your API key is stored locally in your browser and never sent to our servers.
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
                disabled={isLoading || isSending || isTemplateLoading}
              />
              <Button 
                variant="outline" 
                onClick={() => letterDetails.templateId && fetchTemplateDetails(letterDetails.templateId)}
                disabled={isLoading || isSending || isTemplateLoading || !letterDetails.templateId}
              >
                {isTemplateLoading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Loading...
                  </>
                ) : (
                  'Load Template'
                )}
              </Button>
            </div>
          </div>
        </div>

        {templateFields.length > 0 && (
          <div className="flex gap-2">
            <CSVImportDialog templateFields={templateFields} onImport={handleCSVImport} />
          </div>
        )}

        {templateFields.length > 0 && (
          <>
            {letterParamsForm}

            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="notification"
                  checked={isNotificationEnabled}
                  onCheckedChange={setIsNotificationEnabled}
                  disabled={isLoading || isSending}
                />
                <Label htmlFor="notification">Enable Notification</Label>
              </div>

              {isNotificationEnabled && (
                <div className="space-y-4 border rounded-lg p-4">
                  <div>
                    <Label>Notification Method</Label>
                    <Select
                      value={letterDetails.notificationMethod || ''}
                      onValueChange={(value: 'SMS' | 'EMAIL') => updateLetterDetail('notificationMethod', value)}
                      disabled={isLoading || isSending}
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
                    <Label>Recipients</Label>
                    <Textarea
                      placeholder={
                        letterDetails.notificationMethod === 'SMS'
                          ? 'Enter phone numbers (one per line)'
                          : 'Enter email addresses (one per line)'
                      }
                      value={letterDetails.recipients?.join('\n') || ''}
                      onChange={(e) => {
                        const recipients = e.target.value.split('\n').filter(Boolean);
                        updateLetterDetail('recipients', recipients);
                      }}
                      className="min-h-[100px]"
                      disabled={isLoading || isSending}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      {letterDetails.notificationMethod === 'SMS'
                        ? 'Enter one phone number per line in international format (e.g., +6591234567)'
                        : 'Enter one email address per line'}
                    </p>
                    {letterDetails.recipients?.map((recipient, index) => (
                      <div key={`recipient-${index}`} className="hidden">
                        {recipient}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Button 
                onClick={generateBulkLetters} 
                className="w-full" 
                disabled={isLoading || isSending || letterDetails.lettersParams.length === 0}
              >
                {isSending ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Generating Letters...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Generate Letters
                  </>
                )}
              </Button>
            </div>
          </>
        )}

        {!templateFields.length && !isTemplateLoading && letterDetails.templateId && (
          <div className="text-center p-8 border rounded-lg">
            <Info className="h-12 w-12 mx-auto text-muted-foreground" />
            <h3 className="mt-2 text-lg font-medium">No Template Loaded</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Enter a valid template ID and click "Load Template" to get started.
            </p>
          </div>
        )}

        {isTemplateLoading && (
          <div className="text-center p-8 border rounded-lg">
            <div className="flex justify-center">
              <svg className="animate-spin h-12 w-12 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
            <h3 className="mt-4 text-lg font-medium">Loading Template</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Please wait while we fetch the template details...
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default LetterMode;
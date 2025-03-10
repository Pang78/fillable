'use client'

import React, { useState, useCallback } from 'react';
import Papa from 'papaparse';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription, DialogClose } from '@/components/ui/dialog';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Info, Upload, Download, FileSpreadsheet, HelpCircle, Loader2, XCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';

// Add Toast component for notifications
interface ToastProps {
  message: string;
  type: 'success' | 'error' | 'info';
  onClose: () => void;
}

const Toast: React.FC<ToastProps> = ({ message, type, onClose }) => {
  React.useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 3000);
    
    return () => clearTimeout(timer);
  }, [onClose]);
  
  const bgColor = {
    success: 'bg-green-50 border-green-200 text-green-700',
    error: 'bg-red-50 border-red-200 text-red-700',
    info: 'bg-blue-50 border-blue-200 text-blue-700'
  };
  
  const iconColor = {
    success: 'text-green-500',
    error: 'text-red-500',
    info: 'text-blue-500'
  };
  
  return (
    <div className={`fixed bottom-4 right-4 z-50 p-4 rounded-md shadow-md border ${bgColor[type]} max-w-md animate-in slide-in-from-right-5`}>
      <div className="flex items-center">
        {type === 'success' && (
          <svg className={`h-5 w-5 mr-2 ${iconColor[type]}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        )}
        {type === 'error' && (
          <XCircle className={`h-5 w-5 mr-2 ${iconColor[type]}`} />
        )}
        {type === 'info' && (
          <Info className={`h-5 w-5 mr-2 ${iconColor[type]}`} />
        )}
        <p className="flex-1">{message}</p>
        <button onClick={onClose} className="ml-4 text-gray-500 hover:text-gray-700">
          <XCircle className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

// Add interfaces at the top of the file
interface Field {
  FieldID: string;
  values: string[];
  description: string;
  isSingleValue: boolean;
}

interface GeneratedLink {
  url: string;
  fields: Record<string, string | boolean>;
  label: number;
}

interface ExportConfig {
  includeUrl: boolean;
  labelField: string;
  additionalFields: string[];
}

// Add a new interface for CSV upload state
interface CsvUploadState {
  status: 'idle' | 'uploading' | 'processing' | 'success' | 'error';
  fileName: string;
  fileSize: string;
  rowCount: number;
  preview: Array<Record<string, string>>;
}

// Add a new interface for toast notifications
interface ToastNotification {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

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
const DEFAULT_CSV_DELIMITER = ',';  // Default delimiter for CSV columns
const DEFAULT_VALUES_DELIMITER = ';';  // Default delimiter for values within the "values" column
const TEMPLATE_STRUCTURE = [
  { FieldID: '67488bb37e8c75e33b9f9191', values: 'John;Jane;Alex', description: 'Names' },
  { FieldID: '67488f8e088e833537af24aa', values: 'john@agency.gov.sg;jane@agency.gov.sg;alex@agency.gov.sg', description: 'Email' }
];

// Add supported delimiters with their display names
const SUPPORTED_VALUES_DELIMITERS = [
  { value: ';', label: 'Semicolon ( ; )' },
  { value: ',', label: 'Comma ( , )' },
  { value: '|', label: 'Pipe ( | )' }
];

// Function to detect delimiter from CSV content
const detectDelimiter = (csvContent: string): string => {
  // Count occurrences of each delimiter in the first few lines
  const firstFewLines = csvContent.split('\n').slice(0, 5).join('\n');
  
  const counts = SUPPORTED_VALUES_DELIMITERS.map(d => ({
    delimiter: d.value,
    count: (firstFewLines.match(new RegExp(d.value === '\t' ? '\t' : `[${d.value}]`, 'g')) || []).length
  }));
  
  // Find the delimiter with the highest count
  const mostFrequent = counts.reduce((prev, current) => 
    (current.count > prev.count) ? current : prev, 
    { delimiter: DEFAULT_VALUES_DELIMITER, count: 0 }
  );
  
  // If no delimiter is found with significant frequency, default to comma
  return mostFrequent.count > 5 ? mostFrequent.delimiter : DEFAULT_VALUES_DELIMITER;
};

// Update the ImprovedDialogContent component to center dialogs by default
const ImprovedDialogContent = React.forwardRef<
  React.ElementRef<typeof DialogContent>,
  React.ComponentPropsWithoutRef<typeof DialogContent> & {
    size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
    position?: 'center' | 'top';
  }
>(({ className, children, size = 'md', position = 'center', ...props }, ref) => {
  const sizeClasses = {
    sm: 'sm:max-w-sm',
    md: 'sm:max-w-md',
    lg: 'sm:max-w-lg',
    xl: 'sm:max-w-xl',
    '2xl': 'sm:max-w-2xl',
    'full': 'sm:max-w-[90vw] md:max-w-[80vw] lg:max-w-[70vw]'
  };
  
  const positionClasses = {
    center: 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
    top: 'top-[10%] left-1/2 -translate-x-1/2'
  };
  
  return (
    <DialogContent
      ref={ref}
      className={`fixed ${positionClasses[position]} ${sizeClasses[size]} max-h-[85vh] overflow-y-auto w-[95vw] rounded-lg bg-white shadow-lg focus:outline-none ${className}`}
      {...props}
    >
      {children}
    </DialogContent>
  );
});

ImprovedDialogContent.displayName = 'ImprovedDialogContent';

const BatchFormPrefill = () => {
  // State management
  const [formUrl, setFormUrl] = useState('');
  const [fields, setFields] = useState<Field[]>([]);
  const [valuesDelimiter, setValuesDelimiter] = useState(DEFAULT_VALUES_DELIMITER);  // Delimiter for values within a column
  const [generatedLinks, setGeneratedLinks] = useState<GeneratedLink[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [showHelpDialog, setShowHelpDialog] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [toasts, setToasts] = useState<ToastNotification[]>([]);
  const [exportConfig, setExportConfig] = useState<ExportConfig>({
    includeUrl: true,
    labelField: 'none',
    additionalFields: []
  });
  const [currentStep, setCurrentStep] = useState<'upload' | 'generate' | 'export'>('upload');
  const [showCsvPreview, setShowCsvPreview] = useState(false);
  const [csvUploadState, setCsvUploadState] = useState<CsvUploadState>({
    status: 'idle',
    fileName: '',
    fileSize: '',
    rowCount: 0,
    preview: []
  });

  // Add a function to add toast notifications
  const addToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, message, type }]);
    
    // Auto-remove after 3 seconds
    setTimeout(() => {
      setToasts(prev => prev.filter(toast => toast.id !== id));
    }, 3000);
  }, []);

  // Function to display success messages with auto-dismiss
  const showSuccess = useCallback((message: string) => {
    setSuccessMessage(message);
    addToast(message, 'success');
    const timer = setTimeout(() => setSuccessMessage(''), 3000);
    return () => clearTimeout(timer);
  }, [addToast]);

  interface CsvRow {
    [key: string]: string;
  }

  // File upload handler with improved error handling
  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    setError('');
    setIsProcessing(true);
    setFields([]);
    setCsvUploadState({
      status: 'uploading',
      fileName: file.name,
      fileSize: formatFileSize(file.size),
      rowCount: 0,
      preview: []
    });
    
    // Helper function to format file size
    function formatFileSize(bytes: number): string {
      if (bytes < 1024) return bytes + ' bytes';
      else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
      else return (bytes / 1048576).toFixed(1) + ' MB';
    }
    
    Papa.parse<CsvRow>(file, {
      delimiter: DEFAULT_CSV_DELIMITER,  // Use comma to separate columns in the CSV file
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          if (!Array.isArray(results.data) || results.data.length === 0) {
            throw new Error('CSV file is empty or invalid');
          }

          // Get the headers and validate required columns case-insensitively
          const firstRow = results.data[0] || {};
          const headers = Object.keys(firstRow);
          const fieldIdColumn = headers.find(h => h.toLowerCase() === 'fieldid');
          const valuesColumn = headers.find(h => h.toLowerCase() === 'values');
          const descriptionColumn = headers.find(h => h.toLowerCase() === 'description');

          if (!fieldIdColumn || !valuesColumn) {
            throw new Error('Missing required columns: FieldID and values');
          }
          
          // Create a preview of the first 5 rows
          const preview = results.data.slice(0, 5) as Array<Record<string, string>>;
          
          // Parse and normalize field values
          const parsedFields = results.data
            .filter(row => Object.values(row).some(val => val))
            .map(row => {
              const fieldId = row[fieldIdColumn];
              const values = row[valuesColumn];
              const description = descriptionColumn ? row[descriptionColumn] : undefined;

              if (!fieldId || !FIELD_ID_REGEX.test(fieldId)) {
                throw new Error(`Invalid FieldID format: ${fieldId}. Must be a 24-digit hexadecimal.`);
              }

              if (!values) {
                throw new Error(`Missing values for FieldID: ${fieldId}`);
              }

              // Split the values using the selected values delimiter
              return {
                FieldID: fieldId,
                values: values.split(valuesDelimiter).map(v => v.trim()).filter(Boolean),
                description: description || fieldId
              };
            });
          
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
          
          setCsvUploadState(prev => ({
            ...prev,
            status: 'success',
            rowCount: normalizedFields.length,
            preview
          }));
          
          setFields(normalizedFields);
          showSuccess(`CSV imported successfully! Found ${normalizedFields.length} fields with ${maxValues} values each.`);
          setShowCsvPreview(true);
          setCurrentStep('generate');
        } catch (error) {
          setCsvUploadState(prev => ({
            ...prev,
            status: 'error'
          }));
          setError(error instanceof Error ? error.message : 'An unknown error occurred');
          setFields([]);
        } finally {
          setIsProcessing(false);
        }
      },
      error: (error) => {
        setCsvUploadState({
          status: 'error',
          fileName: file.name,
          fileSize: formatFileSize(file.size),
          rowCount: 0,
          preview: []
        });
        setError('Failed to parse CSV file: ' + error.message);
        setFields([]);
        setIsProcessing(false);
      }
    });
  }, [valuesDelimiter, showSuccess]);

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

  // Function to remove a toast notification
  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  // Update validation function with proper types
  const validateFormUrl = useCallback((url: string): boolean => {
    if (!url) throw new Error('Form URL is required');
    if (!FORM_URL_REGEX.test(url)) {
      throw new Error('Invalid form URL. Must be in format: https://form.gov.sg/[24-digit hexadecimal]');
    }
    return true;
  }, []);

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
      const links: GeneratedLink[] = [];
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
          }), {} as Record<string, string | boolean>),
          label: i + 1
        });
      }
      
      setGeneratedLinks(links);
      showSuccess(`Generated ${links.length} matched links successfully!`);
      setCurrentStep('export');
    } catch (error: any) {
      setError(error.message);
      addToast(error.message, 'error');
      setGeneratedLinks([]);
    } finally {
      setIsProcessing(false);
    }
  }, [formUrl, fields, validateFormUrl, showSuccess, addToast]);

  // Update toggle additional field function with proper types
  const toggleAdditionalField = useCallback((fieldId: string, checked: boolean) => {
    setExportConfig(prev => ({
      ...prev,
      additionalFields: checked
        ? [...prev.additionalFields, fieldId]
        : prev.additionalFields.filter(id => id !== fieldId)
    }));
  }, []);

  // Add back the exportLinks function with proper types
  const exportLinks = useCallback(() => {
    if (generatedLinks.length === 0) return;
    
    const headers: string[] = [];
    if (exportConfig.labelField !== 'none') {
      headers.push('Label');
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
        const row: string[] = [];
        if (exportConfig.labelField !== 'none') {
          row.push(exportConfig.labelField === 'index' 
            ? `Entry ${index + 1}` 
            : (link.fields[exportConfig.labelField] as string || ''));
        }
        if (exportConfig.includeUrl) {
          row.push(link.url);
        }
        exportConfig.additionalFields.forEach(FieldID => {
          row.push(link.fields[FieldID] as string || '');
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

  // Update the renderCsvPreview function to have a better layout
  const renderCsvPreview = () => {
    if (csvUploadState.status !== 'success' || csvUploadState.preview.length === 0) {
      return null;
    }
    
    const headers = Object.keys(csvUploadState.preview[0]);
    
    return (
      <div className="mt-6 border rounded-md overflow-hidden shadow-sm">
        <div className="bg-gray-50 p-3 border-b flex justify-between items-center">
          <h4 className="font-medium text-gray-700">CSV Preview</h4>
          <div className="text-xs text-gray-500 flex items-center">
            <span className="mr-1">Detected delimiter:</span>
            <span className="font-mono bg-gray-200 px-1.5 py-0.5 rounded text-gray-700">
              {valuesDelimiter === '\t' ? '\\t (Tab)' : 
               valuesDelimiter === ' ' ? '␣ (Space)' : 
               valuesDelimiter}
            </span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {headers.map((header, index) => (
                  <th 
                    key={index}
                    className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {csvUploadState.preview.map((row, rowIndex) => (
                <tr key={rowIndex} className={rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  {headers.map((header, cellIndex) => (
                    <td 
                      key={cellIndex}
                      className="px-3 py-2 whitespace-nowrap text-sm text-gray-500"
                    >
                      {row[header]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {csvUploadState.rowCount > 5 && (
          <div className="bg-gray-50 p-2 text-center text-sm text-gray-500 border-t">
            Showing 5 of {csvUploadState.rowCount} rows
          </div>
        )}
      </div>
    );
  };

  // Add a function to render step indicator
  const renderStepIndicator = () => {
    const steps = [
      { key: 'upload', label: 'Upload CSV' },
      { key: 'generate', label: 'Generate Links' },
      { key: 'export', label: 'Export Results' }
    ];
    
    return (
      <div className="flex items-center justify-center mb-6">
        {steps.map((step, index) => (
          <React.Fragment key={step.key}>
            <div className={`flex flex-col items-center ${currentStep === step.key ? 'text-blue-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
                currentStep === step.key 
                  ? 'border-blue-600 bg-blue-50' 
                  : currentStep === steps[index + 1]?.key || currentStep === steps[index + 2]?.key 
                    ? 'border-green-500 bg-green-50 text-green-500' 
                    : 'border-gray-300'
              }`}>
                {currentStep === steps[index + 1]?.key || currentStep === steps[index + 2]?.key ? (
                  <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  index + 1
                )}
              </div>
              <span className="text-xs mt-1 font-medium">{step.label}</span>
            </div>
            
            {index < steps.length - 1 && (
              <div className={`w-12 h-0.5 mx-1 ${
                currentStep === steps[index + 1]?.key || currentStep === steps[index + 2]?.key 
                  ? 'bg-green-500' 
                  : 'bg-gray-300'
              }`} />
            )}
          </React.Fragment>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 p-6">
      {/* Render toast notifications */}
      {toasts.map(toast => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          onClose={() => removeToast(toast.id)}
        />
      ))}
      
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
          {/* Add step indicator */}
          {renderStepIndicator()}
          
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
                <Button 
                  variant={currentStep === 'upload' ? 'default' : 'outline'} 
                  className={`w-full ${currentStep === 'upload' ? 'bg-blue-600 hover:bg-blue-700' : 'hover:bg-blue-50'}`}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Import CSV
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Import CSV File</DialogTitle>
                  <DialogDescription>
                    Upload a CSV file with your form fields and values
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <Alert className="bg-blue-50 border-blue-200">
                    <Info className="h-4 w-4 text-blue-500" />
                    <AlertDescription className="text-blue-700">
                      <p className="font-medium">Your CSV must include these columns:</p>
                      <ul className="list-disc list-inside mt-1 text-sm">
                        <li><span className="font-bold">FieldID</span> - 24-digit hexadecimal ID</li>
                        <li><span className="font-bold">values</span> - List of values separated by {valuesDelimiter}</li>
                        <li><span className="font-bold">description</span> (optional) - Field name</li>
                      </ul>
                    </AlertDescription>
                  </Alert>
                  
                  <Button variant="outline" onClick={downloadTemplate} className="w-full">
                    <Download className="mr-2 h-4 w-4" />
                    Download Template
                  </Button>

                  <div className="space-y-2">
                    <Label htmlFor="values-delimiter-select">Values Delimiter</Label>
                    <Select
                      value={valuesDelimiter}
                      onValueChange={setValuesDelimiter}
                    >
                      <SelectTrigger id="values-delimiter-select">
                        <SelectValue placeholder="Select delimiter" />
                      </SelectTrigger>
                      <SelectContent>
                        {SUPPORTED_VALUES_DELIMITERS.map((d) => (
                          <SelectItem key={d.value} value={d.value}>
                            {d.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-gray-500">
                      <span className="font-bold">Important:</span> This is the delimiter that separates values within the "values" column of your CSV.
                    </p>
                    <p className="text-xs text-gray-500">
                      Example: For values like "Apple;Banana;Cherry", use semicolon (;)
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="csv-file">CSV File</Label>
                    <Input
                      id="csv-file"
                      type="file"
                      accept=".csv"
                      onChange={handleFileUpload}
                      className="cursor-pointer"
                    />
                    
                    {/* CSV Upload Status */}
                    {csvUploadState.status !== 'idle' && (
                      <div className="mt-2 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">
                            {csvUploadState.fileName}
                          </span>
                          <span className="text-gray-500">
                            {csvUploadState.fileSize}
                          </span>
                        </div>
                        
                        {csvUploadState.status === 'uploading' && (
                          <div className="flex items-center mt-2 text-blue-600">
                            <Loader2 className="animate-spin h-4 w-4 mr-2" />
                            <span>Uploading file...</span>
                          </div>
                        )}
                        
                        {csvUploadState.status === 'processing' && (
                          <div className="flex items-center mt-2 text-blue-600">
                            <Loader2 className="animate-spin h-4 w-4 mr-2" />
                            <span>Processing CSV data...</span>
                          </div>
                        )}
                        
                        {csvUploadState.status === 'success' && (
                          <div className="mt-2 text-green-600">
                            <div className="flex items-center">
                              <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              <span>Successfully processed {csvUploadState.rowCount} fields</span>
                            </div>
                          </div>
                        )}
                        
                        {csvUploadState.status === 'error' && (
                          <div className="flex items-center mt-2 text-red-600">
                            <XCircle className="h-4 w-4 mr-2" />
                            <span>Error processing file</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                
                {showCsvPreview && renderCsvPreview()}
                
                <DialogFooter>
                  <DialogClose asChild>
                    <Button 
                      onClick={() => {
                        if (csvUploadState.status === 'success') {
                          setCurrentStep('generate');
                        }
                      }}
                      disabled={csvUploadState.status !== 'success'}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      Continue to Generate Links
                    </Button>
                  </DialogClose>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Button
              onClick={generateLinks}
              disabled={isProcessing || fields.length === 0}
              className={`w-full ${currentStep === 'generate' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-400 hover:bg-gray-500'}`}
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
                  variant={currentStep === 'export' ? 'default' : 'outline'}
                  disabled={generatedLinks.length === 0}
                  className={`w-full ${currentStep === 'export' ? 'bg-blue-600 hover:bg-blue-700' : ''}`}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Export Options
                </Button>
              </DialogTrigger>
              <ImprovedDialogContent size="md" position="center">
                <DialogHeader>
                  <DialogTitle>Configure Export</DialogTitle>
                  <DialogDescription>
                    Customize which fields to include in your exported CSV file
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="label-field">Primary Label Field (Optional)</Label>
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
                        <SelectItem value="index">Entry Number</SelectItem>
                        {fields.map((field) => (
                          <SelectItem key={field.FieldID} value={field.FieldID}>
                            {field.description || field.FieldID}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-gray-500">
                      This field will be used as the primary identifier for each row in the exported CSV
                    </p>
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
                    <p className="text-xs text-gray-500">
                      Select which field values to include as columns in your exported CSV
                    </p>
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={exportLinks} className="bg-blue-600 hover:bg-blue-700">
                    Export CSV
                  </Button>
                </DialogFooter>
              </ImprovedDialogContent>
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
        <ImprovedDialogContent size="xl" position="center">
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
        </ImprovedDialogContent>
      </Dialog>
    </div>
  );
};

export default BatchFormPrefill;
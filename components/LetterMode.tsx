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
import { Info, Send, Plus, FileSpreadsheet, Upload, Download, XCircle, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
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

// Add utility functions for robust file handling
const createFileCopy = (file: File): File => {
  try {
    const fileBlob = new Blob([file], { type: file.type });
    return new File([fileBlob], file.name, { type: file.type });
  } catch (error) {
    console.error('Error creating file copy:', error);
    return file; // Return original file as fallback
  }
};

const readFileAsText = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    try {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = (e) => reject(e);
      reader.readAsText(file);
    } catch (error) {
      reject(error);
    }
  });
};

const parseCSVText = (csvText: string, options: any): Promise<PapaParseResult> => {
  return new Promise((resolve, reject) => {
    try {
      Papa.parse(csvText, {
        ...options,
        complete: resolve,
        error: reject,
      });
    } catch (error) {
      reject(error);
    }
  });
};

// Add utility function to format file size
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

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
  const [open, setOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [csvText, setCsvText] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Reset dialog state when it's closed
  const resetDialogState = useCallback(() => {
    setCsvHeaders([]);
    setFieldMapping({});
    setPreviewData([]);
    setMappedPreview([]);
    setShowMappedPreview(false);
    setError(null);
    setIsImporting(false);
    setImportProgress(0);
    setSelectedFile(null);
    setCsvText(null);
    
    // Reset file input
    if (fileInputRef.current) {
      // Create a new file input to ensure it's completely reset
      fileInputRef.current.value = '';
      
      // This triggers a reset in some browsers that don't properly clear the file input
      try {
        const form = fileInputRef.current.form;
        if (form) form.reset();
      } catch (e) {
        console.error('Error resetting form:', e);
      }
    }
  }, []);

  // Handle dialog open state changes
  const handleOpenChange = useCallback((newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      // Reset state when dialog is closed
      resetDialogState();
    }
  }, [resetDialogState]);

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

  // Validate file before processing
  const validateFile = (file: File): boolean => {
    // Reset state
    setError(null);
    setSelectedFile(null);
    setCsvText(null);
    
    // Check file type
    if (!file.name.toLowerCase().endsWith('.csv')) {
      toast({
        title: 'Invalid File Type',
        description: 'Please select a CSV file (.csv extension).',
        variant: 'destructive',
      });
      return false;
    }

    // Check file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB in bytes
    if (file.size > maxSize) {
      toast({
        title: 'File Too Large',
        description: 'The CSV file must be smaller than 5MB.',
        variant: 'destructive',
      });
      return false;
    }

    // Store the selected file
    setSelectedFile(file);
    return true;
  };

  // Handle file upload with improved error handling
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    // Reset error state
    setError(null);
    
    // Get the file from the input
    const file = event.target.files?.[0];
    if (!file) {
      toast({
        title: 'No File Selected',
        description: 'Please select a CSV file to import.',
        variant: 'destructive',
      });
      return;
    }

    // Validate the file
    if (!validateFile(file)) {
      // Reset the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    // Reset states when a new file is uploaded
    setShowMappedPreview(false);
    setMappedPreview([]);
    setCsvHeaders([]);
    setFieldMapping({});
    setImportProgress(0);

    try {
      // First try to read the file as text to avoid issues with the File API
      setImportProgress(10);
      const text = await readFileAsText(file);
      setCsvText(text);
      setImportProgress(30);

      // Parse the CSV text
      const results = await parseCSVText(text, {
        header: true,
        skipEmptyLines: true,
      });
      setImportProgress(60);

      if (results.data.length === 0 || !results.meta.fields || results.meta.fields.length === 0) {
        toast({
          title: 'Invalid CSV',
          description: 'The CSV file is empty or has no valid headers.',
          variant: 'destructive',
        });
        setImportProgress(0);
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
        setImportProgress(0);
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
        setImportProgress(0);
        return;
      }
      
      setCsvHeaders(headers);
      setPreviewData(results.data.slice(0, 5)); // Store first 5 rows for preview
      
      // Auto-map fields based on name similarity
      const initialMapping: { [key: string]: string } = {};
      templateFields.forEach(field => {
        if (!field.name) return;
        
        // Look for exact matches first
        const exactMatch = headers.find(header => 
          header.toLowerCase() === field.name.toLowerCase()
        );
        
        if (exactMatch) {
          initialMapping[field.name] = exactMatch;
        } else {
          // Look for partial matches
          const partialMatch = headers.find(header => 
            header.toLowerCase().includes(field.name.toLowerCase()) || 
            field.name.toLowerCase().includes(header.toLowerCase())
          );
          
          if (partialMatch) {
            initialMapping[field.name] = partialMatch;
          }
        }
      });
      
      setFieldMapping(initialMapping);
      setImportProgress(100);
      
      // Reset progress after a delay
      setTimeout(() => {
        setImportProgress(0);
      }, 1000);
      
    } catch (error) {
      console.error('Error handling file:', error);
      setImportProgress(0);
      toast({
        title: 'File Error',
        description: 'There was an error processing the file. Please try again with a different file.',
        variant: 'destructive',
      });
      
      // Reset the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
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

  // Process import with improved error handling
  const processImport = async () => {
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

    // Set loading state
    setIsImporting(true);
    setImportProgress(10);

    try {
      let mappedData: LetterParams[] = [];
      
      // Try to use the stored CSV text first (most reliable approach)
      if (csvText) {
        const results = await parseCSVText(csvText, {
          header: true,
          skipEmptyLines: true,
        });
        setImportProgress(40);
        
        // Map each row to the template fields
        mappedData = results.data.map((row: any) => {
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
        
        setImportProgress(70);
      } 
      // Fallback to using the preview data if available
      else if (previewData.length > 0 && csvHeaders.length > 0) {
        // Use the existing data from the first parse
        mappedData = previewData.map((row: any) => {
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
        
        setImportProgress(70);
      }
      // Last resort: try to parse the file again
      else if (selectedFile) {
        const text = await readFileAsText(selectedFile);
        const results = await parseCSVText(text, {
          header: true,
          skipEmptyLines: true,
        });
        setImportProgress(40);
        
        // Map each row to the template fields
        mappedData = results.data.map((row: any) => {
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
        
        setImportProgress(70);
      } else {
        throw new Error('No data available for import');
      }

      // Filter out empty rows (all values are empty)
      const nonEmptyRows = mappedData.filter(row => 
        Object.values(row).some(value => value.trim() !== '')
      );

      if (nonEmptyRows.length === 0) {
        setIsImporting(false);
        setImportProgress(0);
        toast({
          title: 'No Valid Data',
          description: 'No valid data found after mapping. Please check your CSV file.',
          variant: 'destructive',
        });
        return;
      }

      setImportedData(nonEmptyRows);
      onImport(nonEmptyRows);
      
      setImportProgress(100);
      
      // Reset loading state
      setTimeout(() => {
        setIsImporting(false);
        setImportProgress(0);
        
        // Close the dialog after successful import
        setOpen(false);
      }, 500);
      
      toast({
        description: `Successfully imported ${nonEmptyRows.length} records`,
      });
    } catch (error) {
      console.error('Error processing import:', error);
      setIsImporting(false);
      setImportProgress(0);
      toast({
        title: 'Import Error',
        description: error instanceof Error ? error.message : 'An error occurred during import. Please try again.',
        variant: 'destructive',
      });
    }
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
    
    if (headers.length === 0) {
      toast({
        title: 'No Template Fields',
        description: 'There are no template fields available to create an example template.',
        variant: 'destructive',
      });
      return;
    }
    
    // Create example rows with placeholder values
    const exampleRows = [];
    
    // Add 3 example rows
    for (let i = 0; i < 3; i++) {
      const exampleRow = templateFields
        .filter(field => field.name) // Filter out fields without names
        .map((field) => {
          const fieldName = field.name.toLowerCase();
          
          // Generate appropriate example values based on field name
          if (fieldName.includes('name')) {
            const names = ['John Doe', 'Jane Smith', 'Alex Johnson'];
            return names[i % names.length];
          }
          if (fieldName.includes('email')) {
            const emails = ['john.doe@example.com', 'jane.smith@example.com', 'alex.johnson@example.com'];
            return emails[i % emails.length];
          }
          if (fieldName.includes('phone')) {
            const phones = ['+6591234567', '+6598765432', '+6590123456'];
            return phones[i % phones.length];
          }
          if (fieldName.includes('address')) {
            const addresses = ['123 Main St, Singapore 123456', '456 Orchard Rd, Singapore 654321', '789 Marina Bay, Singapore 987654'];
            return addresses[i % addresses.length];
          }
          if (fieldName.includes('date')) {
            const dates = ['2023-01-01', '2023-02-15', '2023-03-30'];
            return dates[i % dates.length];
          }
          if (fieldName.includes('id')) {
            return `ID${10001 + i}`;
          }
          if (fieldName.includes('cost') || fieldName.includes('price') || fieldName.includes('amount')) {
            const amounts = ['1000.00', '2500.50', '750.25'];
            return amounts[i % amounts.length];
          }
          
          // Default example value
          return `Example ${i+1}`;
        });
      
      exampleRows.push(exampleRow);
    }
    
    // Create CSV content with headers and example rows
    const csvContent = [
      headers.join(','),
      ...exampleRows.map(row => row.join(','))
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
    
    toast({
      description: 'Example template downloaded successfully.',
    });
  };

  // Handle drag events
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      // Create a synthetic event to reuse the existing file upload handler
      const syntheticEvent = {
        target: {
          files: files
        }
      } as unknown as React.ChangeEvent<HTMLInputElement>;
      
      handleFileUpload(syntheticEvent);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" onClick={() => setOpen(true)} className="bg-amber-50 text-amber-600 hover:bg-amber-100 border-amber-200 transition-all duration-200">
          <FileSpreadsheet className="mr-2 h-4 w-4" />
          Import CSV
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">Import Letter Parameters from CSV</DialogTitle>
          <DialogDescription className="text-base">Map CSV headers to letter template fields</DialogDescription>
        </DialogHeader>

        {/* Progress indicator */}
        {importProgress > 0 && (
          <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
            <div 
              className="bg-primary h-2 rounded-full transition-all duration-300" 
              style={{ width: `${importProgress}%` }}
            ></div>
          </div>
        )}

        <div className="space-y-5">
          {/* File upload section */}
          {!csvHeaders.length && (
            <div 
              className={`border-2 border-dashed rounded-lg p-10 text-center transition-colors ${
                isDragging ? 'border-primary bg-primary/10' : 'border-gray-300'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                type="file"
                accept=".csv"
                ref={fileInputRef}
                onChange={handleFileUpload}
                onClick={(e) => {
                  // Reset the file input value when clicked to ensure the onChange event fires even if the same file is selected again
                  (e.target as HTMLInputElement).value = '';
                }}
                className="hidden"
              />
              <Upload className="mx-auto h-16 w-16 text-gray-400" />
              <p className="mt-3 text-base font-medium">
                Drag and drop your CSV file here, or click to browse
              </p>
              <p className="mt-2 text-sm text-gray-500">
                CSV files only, max 5MB
              </p>
            </div>
          )}

          {/* CSV Preview */}
          {previewData.length > 0 && (
            <div className="border rounded-lg p-5 bg-slate-50">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-base font-semibold">CSV Preview</h4>
                <p className="text-sm text-gray-500">Showing first 5 rows</p>
              </div>
              <div className="max-h-48 overflow-y-auto">
                <Table className="text-sm">
                  <TableHeader>
                    <TableRow>
                      {csvHeaders.map(header => (
                        <TableHead key={header} className="px-3 py-2">{header}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {previewData.map((row, idx) => (
                      <TableRow key={idx}>
                        {csvHeaders.map(header => (
                          <TableCell key={`${idx}-${header}`} className="px-3 py-2 truncate max-w-[180px]">
                            {row[header]}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {/* Field Mapping Section - Make the grid 3 columns on large screens */}
          {csvHeaders.length > 0 && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <h4 className="text-base font-semibold">Map CSV Headers to Template Fields</h4>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => {
                    // Reset to file selection
                    setCsvHeaders([]);
                    setPreviewData([]);
                    setFieldMapping({});
                    setShowMappedPreview(false);
                    setMappedPreview([]);
                  }}
                >
                  <XCircle className="h-4 w-4 mr-1" />
                  Change File
                </Button>
              </div>
              
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {templateFields.map((field) => (
                  <div 
                    key={field.name}
                    className={`p-4 border rounded-lg ${
                      field.required ? 'border-red-200 bg-red-50' : 'border-gray-200'
                    }`}
                  >
                    <div className="flex items-center mb-2">
                      <span className="font-medium">{field.name}</span>
                      {field.required && <span className="ml-1 text-red-500">*</span>}
                    </div>
                    
                    <Select
                      value={fieldMapping[field.name] || '__placeholder__'}
                      onValueChange={(value) => updateFieldMapping(field.name, value)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Map to CSV column" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__placeholder__">-- Select CSV Column --</SelectItem>
                        {csvHeaders.map((header) => (
                          <SelectItem key={header} value={header}>
                            <div className="flex items-center">
                              <span>{header}</span>
                              {previewData[0] && (
                                <span className="ml-2 text-xs text-gray-500 truncate max-w-[180px]">
                                  (e.g., {previewData[0][header]})
                                </span>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
              
              <div className="mt-5 flex justify-end gap-3">
                <Button 
                  variant="outline" 
                  onClick={previewMappedData}
                  disabled={isImporting}
                  className="border-blue-200 text-blue-600 hover:bg-blue-50"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  Preview Mapping
                </Button>
                <Button 
                  onClick={processImport}
                  className="bg-green-600 hover:bg-green-700 transition-all duration-200 shadow-sm hover:shadow font-medium text-base px-5 py-2"
                  disabled={isImporting}
                >
                  {isImporting ? (
                    <>
                      <Loader2 className="animate-spin -ml-1 mr-2 h-5 w-5" />
                      Importing...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="mr-2 h-5 w-5" />
                      Import Data & Close
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Mapped Data Preview - Make it larger */}
          {showMappedPreview && mappedPreview.length > 0 && (
            <div className="border rounded-lg p-5 bg-slate-50 mt-5">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-base font-semibold">Mapped Data Preview</h4>
                <p className="text-sm text-gray-500">
                  Showing {mappedPreview.length} of {previewData.length} rows
                </p>
              </div>
              <p className="text-sm text-slate-600 mb-3">
                This is how your CSV data will be mapped to the template fields. Please verify before importing.
              </p>
              <div className="max-h-80 overflow-y-auto">
                <Table className="text-sm">
                  <TableHeader>
                    <TableRow>
                      {templateFields.map(field => (
                        <TableHead key={field.name} className="px-3 py-2">
                          <div className="flex items-center">
                            {field.name}
                            {field.required && <span className="text-red-500 ml-1">*</span>}
                          </div>
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mappedPreview.map((row, idx) => (
                      <TableRow key={idx}>
                        {templateFields.map(field => (
                          <TableCell 
                            key={`${idx}-${field.name}`} 
                            className={`px-3 py-2 truncate max-w-[180px] ${
                              field.required && (!row[field.name] || row[field.name].trim() === '') 
                                ? 'bg-red-100' 
                                : ''
                            }`}
                          >
                            {row[field.name] || '-'}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              
              {/* Missing required fields warning */}
              {mappedPreview.some(row => 
                templateFields
                  .filter(field => field.required)
                  .some(field => !row[field.name] || row[field.name].trim() === '')
              ) && (
                <Alert variant="destructive" className="mt-3">
                  <AlertCircle className="h-5 w-5" />
                  <AlertDescription className="text-sm">
                    Some required fields are missing values. These rows may not import correctly.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {/* Example template download button */}
          <div className="flex justify-center mt-5">
            <Button 
              variant="outline" 
              onClick={generateExampleTemplate} 
              size="sm" 
              className="text-teal-600 border-teal-200 hover:bg-teal-50 transition-all duration-200"
            >
              <Download className="mr-2 h-4 w-4" />
              Download Example Template
            </Button>
          </div>
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
  
  // Add state for template selection dialog
  const [templates, setTemplates] = useState<{ id: number; name: string; fields: string[] }[]>([]);
  const [filteredTemplates, setFilteredTemplates] = useState<{ id: number; name: string; fields: string[] }[]>([]);
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);
  const [isTemplateListLoading, setIsTemplateListLoading] = useState(false);
  const [templateSearchTerm, setTemplateSearchTerm] = useState('');

  // Add debounced template loading
  const debouncedFetchTemplate = useRef(
    debounce((templateId: number) => {
      fetchTemplateDetails(templateId);
    }, 500)
  ).current;

  // New useEffect for debounced template loading
  useEffect(() => {
    if (letterDetails.templateId && letterDetails.templateId > 0) {
      // We don't need to reset parameters here since we'll do it in fetchTemplateDetails
      // or when templateFields change
      
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
      
      // Always initialize with the new default parameters
      setLetterDetails(prev => ({
        ...prev,
        lettersParams: [defaultParams]
      }));
      
      // Reset currentLetterIndex to the first letter when loading a new template
      setCurrentLetterIndex(0);
      
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
      
      // Reset letter parameters when loading a template directly
      const defaultParams: LetterParams = {};
      requiredFields.forEach((field: TemplateField) => {
        if (field.name && field.required) {
          defaultParams[field.name] = '';
        }
      });
      
      // Update letterDetails with reset parameters and fields
      setLetterDetails(prev => ({
        ...prev,
        lettersParams: [defaultParams]
      }));
      
      // Reset carousel position
      setCurrentLetterIndex(0);
      
      // Update the template fields
      setTemplateFields(requiredFields);
      
      // Cache the template fields for future use
      setTemplateCache(prev => ({
        ...prev,
        [templateId]: requiredFields
      }));
      
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
    const { apiKey, templateId, lettersParams, notificationMethod, recipients } = letterDetails;
    
    // Check for required fields
    if (!apiKey) {
      toast({
        title: 'Missing API Key',
        description: 'Please enter your API key',
        variant: 'destructive',
      });
      return false;
    }

    if (!templateId) {
      toast({
        title: 'Missing Template ID',
        description: 'Please enter a template ID',
        variant: 'destructive',
      });
      return false;
    }

    if (lettersParams.length === 0) {
      toast({
        title: 'No Letter Parameters',
        description: 'Please add at least one set of letter parameters',
        variant: 'destructive',
      });
      return false;
    }

    // Check if notification is enabled but method is not selected
    if (isNotificationEnabled && !notificationMethod) {
      toast({
        title: 'Notification Method Required',
        description: 'Please select a notification method (SMS or EMAIL)',
        variant: 'destructive',
      });
      return false;
    }

    // Check if notification is enabled but recipients are missing
    if (isNotificationEnabled && (!recipients || recipients.length === 0)) {
      toast({
        title: 'Recipients Required',
        description: `Please enter ${notificationMethod === 'SMS' ? 'phone numbers' : 'email addresses'} for notifications`,
        variant: 'destructive',
      });
      return false;
    }

    // Validate required fields in letter parameters
    for (const params of lettersParams) {
      for (const field of templateFields) {
        if (field.required && (!params[field.name] || params[field.name].trim() === '')) {
          toast({
            title: 'Missing Required Field',
            description: `The field "${field.name}" is required but missing or empty in one or more letters`,
            variant: 'destructive',
          });
          return false;
        }
      }
    }

    // Additional validation for notification settings
    if (isNotificationEnabled && notificationMethod && recipients && recipients.length > 0) {
      // Check if number of recipients matches number of letters
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
        // Update phone validation to support international format
        const invalidPhones = recipients.filter(phone => {
          // Support both local SG format (8/9XXXXXXX) and international format (+XX...)
          return !phone.match(/^[89]\d{7}$/) && !phone.match(/^\+\d{6,15}$/);
        });
        
        if (invalidPhones.length > 0) {
          toast({
            title: 'Invalid Phone Numbers',
            description: 'Phone numbers should be in local SG format (8/9XXXXXXX) or international format (+XXXXXXXXX)',
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
        title: lettersParams.length === 1 ? 'Letter Successfully Sent' : 'Letters Successfully Sent',
        description: `Batch ID: ${batchId}. ${lettersParams.length} ${lettersParams.length === 1 ? 'letter' : 'letters'} generated and sent successfully.`,
        variant: 'default',
        className: 'bg-green-50 border-green-200 text-green-800',
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

  // Add new state for tracking current letter in the carousel
  const [currentLetterIndex, setCurrentLetterIndex] = useState(0);

  // Add navigation functions for the carousel
  const goToNextLetter = useCallback(() => {
    setCurrentLetterIndex((prev) => 
      prev < letterDetails.lettersParams.length - 1 ? prev + 1 : prev
    );
  }, [letterDetails.lettersParams.length]);

  const goToPrevLetter = useCallback(() => {
    setCurrentLetterIndex((prev) => (prev > 0 ? prev - 1 : prev));
  }, []);

  const goToLetter = useCallback((index: number) => {
    setCurrentLetterIndex(index);
  }, []);

  // Make sure currentLetterIndex stays in bounds if letters are removed
  useEffect(() => {
    if (currentLetterIndex >= letterDetails.lettersParams.length && letterDetails.lettersParams.length > 0) {
      setCurrentLetterIndex(letterDetails.lettersParams.length - 1);
    }
  }, [letterDetails.lettersParams.length, currentLetterIndex]);

  // Modify the letterParamsForm to implement a carousel
  const letterParamsForm = useMemo(() => {
    return (
      <div className="space-y-6">
        {/* Carousel Navigation */}
        <div className="flex items-center justify-between mb-2">
          <Button
            variant="outline"
            size="icon"
            onClick={goToPrevLetter}
            disabled={currentLetterIndex === 0 || isLoading || isSending}
            className="rounded-full w-10 h-10 flex items-center justify-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </Button>
          
          <div className="flex items-center">
            <span className="font-medium text-sm">
              Letter {currentLetterIndex + 1} of {letterDetails.lettersParams.length}
            </span>
          </div>
          
          <Button
            variant="outline"
            size="icon"
            onClick={goToNextLetter}
            disabled={currentLetterIndex === letterDetails.lettersParams.length - 1 || isLoading || isSending}
            className="rounded-full w-10 h-10 flex items-center justify-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </Button>
        </div>
        
        {/* Carousel Content - Only display current letter */}
        <div className="carousel-container relative">
          {letterDetails.lettersParams.map((params, index) => (
            <div
              key={`letter-params-${index}`}
              className={`carousel-item transition-opacity duration-300 ${
                index === currentLetterIndex ? 'block opacity-100' : 'hidden opacity-0'
              }`}
            >
              <Card>
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
            </div>
          ))}
        </div>
        
        {/* Carousel Indicators */}
        <div className="flex justify-center gap-1 mt-2">
          {letterDetails.lettersParams.map((_, index) => (
            <button
              key={`indicator-${index}`}
              className={`w-2 h-2 rounded-full transition-all ${
                index === currentLetterIndex
                  ? 'bg-primary w-4'
                  : 'bg-gray-300 hover:bg-gray-400'
              }`}
              onClick={() => goToLetter(index)}
              aria-label={`Go to letter ${index + 1}`}
              disabled={isLoading || isSending}
            />
          ))}
        </div>
        
        {/* Add Letter Button */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={addLetterParams}
            className="w-full bg-purple-50 text-purple-600 hover:bg-purple-100 border-purple-200 transition-all duration-200"
            disabled={isLoading || isSending}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Another Letter
          </Button>
        </div>
      </div>
    );
  }, [
    letterDetails.lettersParams, 
    templateFields, 
    isLoading, 
    isSending, 
    addLetterParams, 
    removeLetterParams, 
    updateLetterParams, 
    currentLetterIndex, 
    goToNextLetter, 
    goToPrevLetter, 
    goToLetter
  ]);

  // Add handleClearAll function
  const handleClearAll = useCallback(() => {
    setLetterDetails((prev) => ({
      ...prev,
      templateId: null, // Clear Template ID
      lettersParams: [{}], // Reset to one empty set of parameters
      notificationMethod: undefined, // Clear notification method
      recipients: [], // Clear recipients
    }));
    setTemplateFields([]); // Clear template fields
    setIsNotificationEnabled(false); // Reset notification toggle
    setApiError(null); // Clear any API errors
    
    toast({
      description: "Form cleared (API key retained).",
    });
  }, []);

  // Update fetchTemplates function to match API documentation
  const fetchTemplates = async () => {
    if (!letterDetails.apiKey) {
      toast({
        title: "API Key Required",
        description: "Please enter your API key to fetch templates.",
        variant: "destructive",
      });
      return;
    }

    setIsTemplateListLoading(true);
    setTemplateSearchTerm(''); // Reset search term when fetching new templates
    
    try {
      // Using proxy endpoint to avoid exposing API key in frontend
      const response = await fetch(`${API_PROXY_URL}/templates`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": letterDetails.apiKey,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to fetch templates: ${response.status}`);
      }

      const data = await response.json();
      
      // Handle the response format according to the API documentation
      if (data && Array.isArray(data.templates)) {
        // Map the templates to the format expected by our component
        const formattedTemplates = data.templates.map((template: any) => ({
          id: template.templateId,
          name: template.name,
          fields: template.fields
        }));
        
        setTemplates(formattedTemplates);
        setFilteredTemplates(formattedTemplates); // Initialize filtered templates with all templates
        
        if (formattedTemplates.length === 0) {
          toast({
            description: "No templates found for this API key.",
          });
        } else {
          toast({
            description: `Found ${formattedTemplates.length} templates.`,
          });
        }
      } else {
        // Handle case where response doesn't match expected format
        console.error("Unexpected API response format:", data);
        setTemplates([]);
        setFilteredTemplates([]);
        toast({
          title: "Error",
          description: "Received unexpected data format from the API.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error fetching templates:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to fetch templates.",
        variant: "destructive",
      });
      setTemplates([]);
      setFilteredTemplates([]);
    } finally {
      setIsTemplateListLoading(false);
    }
  };

  // Add function to handle template search
  const handleTemplateSearch = useCallback((searchTerm: string) => {
    setTemplateSearchTerm(searchTerm);
    
    if (!searchTerm.trim()) {
      // If search term is empty, show all templates
      setFilteredTemplates(templates);
      return;
    }
    
    // Filter templates based on search term
    const normalizedSearchTerm = searchTerm.toLowerCase().trim();
    const filtered = templates.filter(template => 
      template.name.toLowerCase().includes(normalizedSearchTerm) || 
      template.id.toString().includes(normalizedSearchTerm) ||
      (template.fields && template.fields.some(field => 
        field.toLowerCase().includes(normalizedSearchTerm)
      ))
    );
    
    setFilteredTemplates(filtered);
  }, [templates]);

  return (
    <div className="container mx-auto py-6 max-w-4xl">
      <h1 className="text-2xl font-bold mb-6">Bulk Letter Generation</h1>
      
      {apiError && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription className="whitespace-pre-line">{apiError}</AlertDescription>
        </Alert>
      )}
      
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>API Configuration</CardTitle>
              <div className="flex gap-2">
                {/* Template Selection Dialog */}
                <Dialog open={isTemplateDialogOpen} onOpenChange={setIsTemplateDialogOpen}>
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      onClick={() => {
                        fetchTemplates();
                      }}
                      disabled={isLoading || isSending || !letterDetails.apiKey}
                      className="bg-blue-50 text-blue-600 hover:bg-blue-100 border-blue-200 transition-all duration-200 flex items-center"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Select Template
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                      <DialogTitle>Select a Template</DialogTitle>
                      <DialogDescription>Choose a template from the list below.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      {isTemplateListLoading ? (
                        <div className="flex justify-center items-center py-4">
                          <svg className="animate-spin h-5 w-5 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          <span className="ml-2">Loading templates...</span>
                        </div>
                      ) : templates.length > 0 ? (
                        <div className="space-y-4">
                          <div className="relative">
                            <Input
                              type="text"
                              placeholder="Search templates..."
                              className="mb-2"
                              value={templateSearchTerm}
                              onChange={(e) => handleTemplateSearch(e.target.value)}
                            />
                          </div>
                          
                          <div className="max-h-[300px] overflow-y-auto border rounded-md">
                            {filteredTemplates.length > 0 ? (
                              filteredTemplates.map((template) => (
                                <div 
                                  key={template.id}
                                  className="p-3 border-b last:border-b-0 hover:bg-slate-50 cursor-pointer flex justify-between items-center"
                                  onClick={() => {
                                    const templateId = template.id;
                                    
                                    // Reset state for the new template
                                    setCurrentLetterIndex(0);
                                    setTemplateFields([]); // Clear template fields temporarily
                                    
                                    // Update the template ID
                                    setLetterDetails((prev) => ({
                                      ...prev,
                                      templateId: templateId,
                                      lettersParams: [{}], // Reset to empty parameters
                                    }));
                                    
                                    setIsTemplateDialogOpen(false); // Close dialog after selection
                                    
                                    // Automatically load the template after selection
                                    if (templateId) {
                                      fetchTemplateDetails(templateId);
                                    }
                                  }}
                                >
                                  <div>
                                    <div className="font-medium">{template.name}</div>
                                    <div className="text-sm text-muted-foreground">ID: {template.id}</div>
                                    {template.fields && template.fields.length > 0 && (
                                      <div className="text-xs text-muted-foreground mt-1">
                                        Fields: {template.fields.slice(0, 3).join(", ")}
                                        {template.fields.length > 3 && ` +${template.fields.length - 3} more`}
                                      </div>
                                    )}
                                  </div>
                                  <Button variant="ghost" size="sm">
                                    Select
                                  </Button>
                                </div>
                              ))
                            ) : (
                              <div className="p-4 text-center">
                                <p className="text-sm text-muted-foreground">No templates match your search.</p>
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-4">
                          <p className="text-sm text-muted-foreground">No templates found for this API key.</p>
                          <p className="text-xs text-muted-foreground mt-2">
                            Make sure you've entered the correct API key and that you have access to templates.
                          </p>
                        </div>
                      )}
                    </div>
                  </DialogContent>
                </Dialog>
                
                <Button
                  variant="outline"
                  onClick={handleClearAll}
                  disabled={isLoading || isSending}
                  className="border-gray-300 hover:bg-gray-100 transition-all duration-200"
                >
                  Clear All (Keep API Key)
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="apiKey">API Key</Label>
                <Input
                  id="apiKey"
                  type="password"
                  value={letterDetails.apiKey}
                  onChange={(e) => {
                    updateLetterDetail('apiKey', e.target.value);
                    localStorage.setItem('lettersGovSgApiKey', e.target.value);
                  }}
                  placeholder="Enter your API key"
                  disabled={isLoading || isSending}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Your API key is stored locally in your browser and never sent to our servers.
                </p>
              </div>
              <div>
                <Label htmlFor="templateId">Template ID</Label>
                <div className="flex gap-2">
                  <Input
                    id="templateId"
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
                    className={letterDetails.templateId ? "bg-green-50 text-green-600 hover:bg-green-100 border-green-200 transition-all duration-200" : ""}
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
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                        </svg>
                        Load Template
                      </>
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Enter the template ID or use the "Select Template" button above to choose from available templates.
                </p>
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
                      className="data-[state=checked]:bg-blue-500"
                    />
                    <Label htmlFor="notification">Enable Notification</Label>
                  </div>

                  {isNotificationEnabled && (
                    <div className="space-y-4 border rounded-lg p-4">
                      <div>
                        <Label htmlFor="notification-method" className="flex items-center">
                          <span className="font-medium">Notification Method</span>
                          <span className="text-red-500 ml-1">*</span>
                        </Label>
                        <Select
                          value={letterDetails.notificationMethod || ''}
                          onValueChange={(value: 'SMS' | 'EMAIL') => updateLetterDetail('notificationMethod', value)}
                          disabled={isLoading || isSending}
                        >
                          <SelectTrigger id="notification-method">
                            <SelectValue placeholder="Select notification method" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="SMS">SMS</SelectItem>
                            <SelectItem value="EMAIL">Email</SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground mt-1">
                          Required: Choose how recipients will be notified
                        </p>
                      </div>

                      <div>
                        <Label htmlFor="recipients" className="flex items-center">
                          <span className="font-medium">Recipients</span>
                          <span className="text-red-500 ml-1">*</span>
                        </Label>
                        <Textarea
                          id="recipients"
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
                          className={`min-h-[100px] ${isNotificationEnabled && (!letterDetails.recipients || letterDetails.recipients.length === 0) ? 'border-red-500' : ''}`}
                          disabled={isLoading || isSending}
                        />
                        <div className="flex justify-between items-start mt-1">
                          <p className="text-xs text-muted-foreground">
                            {letterDetails.notificationMethod === 'SMS'
                              ? 'Enter one phone number per line in international format (e.g., +6591234567) or local format (e.g., 91234567)'
                              : 'Enter one email address per line'}
                          </p>
                          <div className="text-xs text-muted-foreground">
                            {letterDetails.recipients?.length || 0} recipient(s)
                            {letterDetails.lettersParams.length > 0 && 
                              ` / ${letterDetails.lettersParams.length} letter(s)`}
                            {letterDetails.recipients && letterDetails.recipients.length > 0 && 
                             letterDetails.lettersParams.length > 0 && 
                             letterDetails.recipients.length !== letterDetails.lettersParams.length && 
                             <span className="text-red-500 ml-1">
                               (Mismatch! Must be equal)
                             </span>
                            }
                          </div>
                        </div>
                        {isNotificationEnabled && (!letterDetails.recipients || letterDetails.recipients.length === 0) && (
                          <p className="text-xs text-red-500 mt-1">
                            Required: You must enter at least one recipient
                          </p>
                        )}
                      </div>
                      
                      <Alert className="bg-blue-50 text-blue-800 border-blue-200">
                        <Info className="h-4 w-4" />
                        <AlertDescription>
                          <span className="font-medium">Important:</span> Make sure to select a notification method (SMS or Email) and ensure the number of recipients matches the number of letters. Each recipient will receive a notification for their corresponding letter.
                        </AlertDescription>
                      </Alert>
                    </div>
                  )}

                  <Button 
                    onClick={generateBulkLetters} 
                    className="w-full relative overflow-hidden group bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white shadow-md hover:shadow-lg transition-all duration-300" 
                    disabled={isLoading || isSending || letterDetails.lettersParams.length === 0}
                  >
                    <span className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity"></span>
                    {isSending ? (
                      <>
                        <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
                        Generating Letters...
                      </>
                    ) : (
                      <>
                        <Send className="mr-2 h-4 w-4" />
                        Generate {letterDetails.lettersParams.length} Letter{letterDetails.lettersParams.length !== 1 ? 's' : ''}
                        {isNotificationEnabled && letterDetails.notificationMethod && 
                          ` with ${letterDetails.notificationMethod === 'SMS' ? 'SMS' : 'Email'} Notifications`}
                      </>
                    )}
                    <div className="absolute right-2 top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 group-hover:translate-x-0 translate-x-2 transition-all duration-300">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </Button>
                </div>

                <p className="text-xs text-center text-muted-foreground mt-2">
                  {isNotificationEnabled 
                    ? `This will generate ${letterDetails.lettersParams.length} letter(s) and send ${letterDetails.notificationMethod || 'notifications'} to recipients.`
                    : `This will generate ${letterDetails.lettersParams.length} letter(s) without notifications.`
                  }
                </p>
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default LetterMode;
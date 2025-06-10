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
import { ToastAction } from '@/components/ui/toast';
import { Info, Send, Plus, FileSpreadsheet, Upload, Download, XCircle, CheckCircle, AlertCircle, Loader2, FileUp, FileText, X, Check } from 'lucide-react';
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
import RecipientsImportDialog from './RecipientsImportDialog';
import { Checkbox } from "@/components/ui/checkbox";

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

interface CSVImportDialogProps {
  templateFields: TemplateField[];
  onImport: (data: { letterParams: LetterParams[]; recipients?: string[] }) => void; // Updated prop type
}

const CSVImportDialog: React.FC<CSVImportDialogProps> = ({ templateFields, onImport }) => {
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
  const [currentMappingIndex, setCurrentMappingIndex] = useState(0);
  
  // New state for recipient column mapping
  const [recipientColumnHeader, setRecipientColumnHeader] = useState<string | null>(null);

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
    setCurrentMappingIndex(0);
    setRecipientColumnHeader(null); // Reset recipient mapping
    
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
    setRecipientColumnHeader(null); // Reset recipient mapping

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
    const mappedTemplateFields = templateFields
      .filter(field => field.name && fieldMapping[field.name] && fieldMapping[field.name] !== '__placeholder__')
      .map(field => field.name);
      
    // Check if at least one template field OR a recipient column is mapped
    if (mappedTemplateFields.length === 0 && !recipientColumnHeader) {
      toast({
        title: 'No Fields Mapped',
        description: 'Please map at least one template field or select a recipient column.',
        variant: 'destructive',
      });
      return;
    }

    // Set loading state
    setIsImporting(true);
    setImportProgress(10);

    try {
      let allParsedData: any[] = [];

      // Try to use the stored CSV text first (most reliable approach)
      if (csvText) {
        const results = await parseCSVText(csvText, {
          header: true,
          skipEmptyLines: true,
        });
        setImportProgress(40);
        
        // Store all parsed data
        allParsedData = results.data;
      } 
      // Fallback to re-parsing the selected file
      else if (selectedFile) {
        const text = await readFileAsText(selectedFile);
        const results = await parseCSVText(text, {
          header: true,
          skipEmptyLines: true,
        });
        setImportProgress(40);
        
        // Store all parsed data
        allParsedData = results.data;
      } else {
        throw new Error('No data available for import');
      }
      
      // --- Map Letter Parameters --- 
      const mappedLetterParamsData = allParsedData.map((row: any) => {
        const mappedRow: LetterParams = {};
        // For each template field that has a mapping
        mappedTemplateFields.forEach(fieldName => {
          if (!fieldName) return;
          const csvHeader = fieldMapping[fieldName];
          if (csvHeader && csvHeader !== '__placeholder__') {
            mappedRow[fieldName] = row[csvHeader] || '';
          }
        });
        return mappedRow;
      });
      setImportProgress(60);

      // --- Extract Recipients (if column mapped) ---
      let mappedRecipients: string[] | undefined = undefined;
      if (recipientColumnHeader && recipientColumnHeader !== '__none__') {
        mappedRecipients = allParsedData.map((row: any) => {
          return row[recipientColumnHeader]?.toString() || ''; // Ensure it's a string
        });
      }
      setImportProgress(70);

      // --- Filter out empty rows (based on mapped letter params only) ---
      // An empty recipient is valid, but a row with no letter params is not.
      const combinedData = mappedLetterParamsData.map((params, index) => ({ 
        params,
        recipient: mappedRecipients?.[index] 
      }));
      
      const nonEmptyCombinedData = combinedData.filter(item => 
        Object.values(item.params).some(value => value.trim() !== '')
      );

      if (nonEmptyCombinedData.length === 0) {
        setIsImporting(false);
        setImportProgress(0);
        toast({
          title: 'No Valid Data',
          description: 'No valid letter parameter data found after mapping. Please check your CSV file and mappings.',
          variant: 'destructive',
        });
        return;
      }

      // Separate back into params and recipients
      const finalLetterParams = nonEmptyCombinedData.map(item => item.params);
      const finalRecipients = mappedRecipients ? nonEmptyCombinedData.map(item => item.recipient || '') : undefined;

      // --- Perform Import --- 
      onImport({ 
        letterParams: finalLetterParams,
        recipients: finalRecipients 
      });
      
      setImportProgress(100);
      
      // Reset loading state
      setTimeout(() => {
        setIsImporting(false);
        setImportProgress(0);
        
        // Close the dialog after successful import
        setOpen(false);
      }, 500);
      
      toast({
        description: `Successfully imported ${finalLetterParams.length} letter records`,
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
    const exampleRows: string[][] = [];
    
    // No need to reference letterDetails here since we're using templateFields directly
    // which is already passed to this component as a prop
    const hasImportedData = previewData.length > 0 && csvHeaders.length > 0;
    
    if (hasImportedData) {
      // Use actual imported data for the example (up to 3 rows)
      const sampleSize = Math.min(3, previewData.length);
      
      for (let i = 0; i < sampleSize; i++) {
        const rowData = previewData[i];
        const exampleRow = headers.map(fieldName => {
          // Try to find mapped CSV header for this field
          const mappedHeader = Object.entries(fieldMapping).find(([key]) => key === fieldName)?.[1];
          // Use the actual value if available through mapping, otherwise use a placeholder
          return (mappedHeader && rowData[mappedHeader]) || `Example ${i+1}`;
        });
        exampleRows.push(exampleRow);
      }
      
      // Add placeholders if we have fewer than 3 imported rows
      while (exampleRows.length < 3) {
        const rowIndex = exampleRows.length;
        const placeholderRow = headers.map(fieldName => {
          // Generate appropriate example values based on field name
          const field = fieldName.toLowerCase();
          if (field.includes('name')) {
            const names = ['John Doe', 'Jane Smith', 'Alex Johnson'];
            return names[rowIndex % names.length];
          }
          if (field.includes('email')) {
            const emails = ['john.doe@example.com', 'jane.smith@example.com', 'alex.johnson@example.com'];
            return emails[rowIndex % emails.length];
          }
          if (field.includes('phone')) {
            const phones = ['+6591234567', '+6598765432', '+6590123456'];
            return phones[rowIndex % phones.length];
          }
          if (field.includes('address')) {
            const addresses = ['123 Main St, Singapore 123456', '456 Orchard Rd, Singapore 654321', '789 Marina Bay, Singapore 987654'];
            return addresses[rowIndex % addresses.length];
          }
          if (field.includes('date')) {
            const dates = ['2023-01-01', '2023-02-15', '2023-03-30'];
            return dates[rowIndex % dates.length];
          }
          if (field.includes('id')) {
            return `ID${10001 + rowIndex}`;
          }
          if (field.includes('cost') || field.includes('price') || field.includes('amount')) {
            const amounts = ['1000.00', '2500.50', '750.25'];
            return amounts[rowIndex % amounts.length];
          }
          
          // Default example value
          return `Example ${rowIndex+1}`;
        });
        exampleRows.push(placeholderRow);
      }
    } else {
      // Add 3 example rows with generic placeholder values
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
    
    // Show different toast message based on whether we used actual data
    toast({
      description: hasImportedData 
        ? 'Example template with imported data downloaded successfully.' 
        : 'Example template downloaded successfully.',
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
        <Button
          variant="outline"
          onClick={() => setOpen(true)}
          className="bg-gradient-to-r from-amber-50 to-orange-50 text-amber-600 hover:text-amber-700 hover:bg-gradient-to-r hover:from-amber-100 hover:to-orange-100 border-amber-200 transition-all duration-200 py-5 px-6 text-base font-medium rounded-xl shadow-sm hover:shadow flex items-center"
        >
          <FileSpreadsheet className="mr-3 h-5 w-5" />
          Import CSV Data
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[1200px] max-h-[90vh] overflow-y-auto">
        <DialogHeader className="border-b pb-4">
          <DialogTitle className="text-2xl font-bold text-amber-800">Import Letter Parameters from CSV</DialogTitle>
          <DialogDescription className="text-base text-amber-600">Map CSV columns to letter template fields for batch processing</DialogDescription>
        </DialogHeader>

        {/* Progress indicator */}
        {importProgress > 0 && (
          <div className="w-full bg-gray-200 rounded-full h-2 mb-4 overflow-hidden">
            <div 
              className="bg-amber-500 h-2 rounded-full transition-all duration-300" 
              style={{ width: `${importProgress}%` }}
            ></div>
          </div>
        )}

        <div className="space-y-5 py-2">
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

          {/* Field Mapping Section */}
          {csvHeaders.length > 0 && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <h4 className="text-base font-semibold">Map CSV Headers to Template Fields</h4>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => {
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
              
              {/* Field Mapping Grid */}
              <div className="max-h-[500px] overflow-y-auto border rounded-lg p-4 bg-slate-50">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {templateFields.map((field) => (
                    <div 
                      key={field.name}
                      className={`p-4 border rounded-lg ${
                        field.required ? 'border-red-200 bg-red-50' : 'border-gray-200'
                      }`}
                    >
                      <div className="flex items-center mb-3">
                        <span className="text-base font-medium">{field.name}</span>
                        {field.required && <span className="ml-2 text-red-500">*</span>}
                      </div>
                      
                      <Select
                        value={fieldMapping[field.name] || '__placeholder__'}
                        onValueChange={(value) => updateFieldMapping(field.name, value)}
                      >
                        <SelectTrigger className="w-full py-5 text-base">
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
              </div>
              
              {/* ---- NEW: Recipient Column Mapping ---- */}
              <div className="mt-5 border-t pt-5 border-gray-200">
                <h4 className="text-base font-semibold mb-3">Map Recipient Data (Optional)</h4>
                <p className="text-sm text-gray-500 mb-3">
                  Select the CSV column containing recipient emails or phone numbers.
                  Ensure the column matches the 'Notification Method' you select later.
                </p>
                <Select
                  value={recipientColumnHeader || '__none__'} // Use '__none__' for placeholder
                  onValueChange={(value) => setRecipientColumnHeader(value === '__none__' ? null : value)}
                >
                  <SelectTrigger className="w-full md:w-1/2 py-5 text-base">
                    <SelectValue placeholder="Map to Recipient Column" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">-- Do Not Import Recipients --</SelectItem>
                    {csvHeaders.map((header) => (
                      <SelectItem key={`recipient-${header}`} value={header}>
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
              {/* ---- END: Recipient Column Mapping ---- */}
              {/* Preview and Import Buttons */}
              <div className="mt-8 flex flex-col sm:flex-row justify-center gap-4">
                <Button 
                  variant="outline" 
                  onClick={previewMappedData}
                  disabled={isImporting}
                  className="flex-1 max-w-sm bg-blue-50 text-blue-600 hover:bg-blue-100 border-blue-200 py-6 text-base"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  Preview Mapping
                </Button>
                <Button 
                  onClick={processImport}
                  className="flex-1 max-w-sm bg-green-600 hover:bg-green-700 transition-all duration-200 shadow-sm hover:shadow font-medium text-base py-6"
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
              Download Template {previewData.length > 0 ? 'with Current Data' : 'Example'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Create a simple backend proxy service for Letters.gov.sg API
const API_PROXY_URL = '/api/letters'; // Endpoint for the API proxy

const LetterMode: React.FC = () => {
  const [letterDetails, setLetterDetails] = useState<BulkLetterDetails>({
    apiKey: '',
    templateId: null,
    lettersParams: [],
    notificationMethod: undefined,
    recipients: [],
  });

  const [templateFields, setTemplateFields] = useState<TemplateField[]>([]);
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

  // Add state for preview functionality
  const [isPreviewDialogOpen, setIsPreviewDialogOpen] = useState(false);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

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
      const response = await fetch(`/api/letters/templates/${templateId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': letterDetails.apiKey,
        },
      });
  
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Template API error:', errorData);
        
        // Handle specific error cases
        if (response.status === 401) {
          throw new Error('Invalid API key. Please check your API key and try again.');
        } else if (response.status === 404) {
          throw new Error(`Template with ID ${templateId} not found.`);
        } else if (response.status === 403) {
          throw new Error('You do not have permission to access this template.');
        } else {
          throw new Error(errorData.message || `Failed to fetch template: ${response.status}`);
        }
      }
  
      const templateData = await response.json();
      
      // Validate template data structure
      if (!templateData || !templateData.fields) {
        throw new Error('Invalid template data received from the API');
      }
      
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
      
      if (requiredFields.length === 0) {
        throw new Error('No valid fields found in the template');
      }
      
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
      
      // Show error toast with more specific error message
      toast({
        title: 'Error Loading Template',
        description: error instanceof Error ? error.message : 'Failed to fetch template',
        variant: 'destructive',
      });
      
      // Clear template fields on error
      setTemplateFields([]);
      
      // Reset template ID if it's an invalid template
      if (error instanceof Error && error.message.includes('not found')) {
        setLetterDetails(prev => ({
          ...prev,
          templateId: null
        }));
      }
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
    
    // Save API key to localStorage when it's updated
    if (key === 'apiKey' && typeof value === 'string') {
      localStorage.setItem('lettersGovSgApiKey', value);
    }
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
      lettersParams: prev.lettersParams.filter((_, i) => i !== index),
      // Also remove the corresponding recipient if recipients array exists
      recipients: prev.recipients 
        ? prev.recipients.filter((_, i) => i !== index) 
        : prev.recipients
    }));
    
    // Show a toast notification to confirm deletion
    toast({
      description: "Letter and associated recipient removed.",
      duration: 3000,
    });
  }, [letterDetails.lettersParams.length]);

  // Updated to handle new import data structure { letterParams, recipients? }
  const handleCSVImport = useCallback((data: { letterParams: LetterParams[]; recipients?: string[] }) => {
    const { letterParams: importedParams, recipients: importedRecipients } = data;
    
    // Ensure each imported params has all required fields from the template
    const updatedParams = importedParams.map(params => {
      const filteredParams: LetterParams = {};
      templateFields.forEach(field => {
        if (!field.name) return;
        if (field.required || params[field.name]) {
          filteredParams[field.name] = params[field.name] || '';
        }
      });
      // Ensure recipient_name is included if it's required by the template itself
      if (!filteredParams.recipient_name && templateFields.some(field => field.name === 'recipient_name')) {
        filteredParams.recipient_name = params.recipient_name || ''; // Use imported value if available
      }
      return filteredParams;
    });

    let finalRecipients = letterDetails.recipients || []; // Default to existing recipients

    // Handle imported recipients if they exist and match the number of letters
    if (importedRecipients) {
      if (importedRecipients.length === updatedParams.length) {
        finalRecipients = importedRecipients;
      } else {
        // Mismatch: Show warning, don't update recipients
        toast({
          title: 'Recipient Count Mismatch',
          description: `Imported ${importedRecipients.length} recipients, but ${updatedParams.length} letters. Recipients were not updated. Please check your CSV or import recipients separately.`,
          variant: 'destructive',
          duration: 7000,
        });
      }
    }

    setLetterDetails((prev) => ({
      ...prev,
      lettersParams: updatedParams,
      recipients: finalRecipients, // Update recipients state
    }));
    
    setCurrentLetterIndex(0); // Go back to the first letter after import

    toast({
      description: `Successfully imported ${updatedParams.length} letter records`,
    });
  }, [templateFields, letterDetails.recipients]); // Added letterDetails.recipients dependency

  // Modify validatePayload to always require notification details
  const validatePayload = useCallback(() => {
    console.log('validatePayload called', { letterDetails });
    const { apiKey, templateId, lettersParams, notificationMethod, recipients } = letterDetails;
    
    // Check for required fields
    if (!apiKey) {
      toast({
        title: 'Missing API Key',
        description: 'Please enter your API key',
        variant: 'destructive',
      });
      console.log('validatePayload failed: Missing API Key');
      return false;
    }

    if (!templateId) {
      toast({
        title: 'Missing Template ID',
        description: 'Please enter a template ID',
        variant: 'destructive',
      });
      console.log('validatePayload failed: Missing Template ID');
      return false;
    }

    if (lettersParams.length === 0) {
      toast({
        title: 'No Letter Parameters',
        description: 'Please add at least one set of letter parameters',
        variant: 'destructive',
      });
      console.log('validatePayload failed: No Letter Parameters');
      return false;
    }

    // Always check for notification method since it's now required
    if (!notificationMethod) {
      toast({
        title: 'Notification Method Required',
        description: 'Please select a notification method (SMS or EMAIL)',
        variant: 'destructive',
      });
      console.log('validatePayload failed: Notification Method Required');
      return false;
    }

    // Always check for recipients since they're now required
    if (!recipients || recipients.length === 0) {
      toast({
        title: 'Recipients Required',
        description: `Please enter ${notificationMethod === 'SMS' ? 'phone numbers' : 'email addresses'} for notifications`,
        variant: 'destructive',
      });
      console.log('validatePayload failed: Recipients Required');
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
          console.log('validatePayload failed: Missing Required Field', { field, params });
          return false;
        }
      }
    }

    // Additional validation for notification settings
    // Check if number of recipients matches number of letters
    if (recipients.length !== lettersParams.length) {
      toast({
        title: 'Recipient Count Mismatch',
        description: 'The number of recipients must match the number of letters',
        variant: 'destructive',
      });
      console.log('validatePayload failed: Recipient Count Mismatch');
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
        console.log('validatePayload failed: Invalid Phone Numbers', invalidPhones);
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
        console.log('validatePayload failed: Invalid Email Addresses', invalidEmails);
        return false;
      }
    }

    console.log('validatePayload passed');
    return true;
  }, [letterDetails, templateFields]);

  // Function to validate a single letter for preview
  const validateSingleLetterForPreview = useCallback((params: LetterParams) => {
    for (const field of templateFields) {
      if (field.required && (!params[field.name] || params[field.name].trim() === '')) {
        return `Missing required field: "${field.name}"`;
      }
    }
    return null; // No errors
  }, [templateFields]);

  // Function to handle preview request
  const handlePreview = useCallback(async (index: number) => {
    const { apiKey, templateId, lettersParams } = letterDetails;
    const currentParams = lettersParams[index];

    // 1. Validate required fields for the current letter
    const validationError = validateSingleLetterForPreview(currentParams);
    if (validationError) {
      toast({
        title: 'Cannot Preview Letter',
        description: validationError,
        variant: 'destructive',
      });
      return;
    }

    // 2. Set loading state and clear previous preview/error
    setIsPreviewLoading(true);
    setPreviewHtml(null);
    setPreviewError(null);
    setIsPreviewDialogOpen(true); // Open dialog immediately to show loader

    try {
      // 3. Call the backend preview endpoint
      const response = await fetch('/api/letters/preview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': apiKey, // Send API key securely via header
        },
        body: JSON.stringify({
          templateId,
          letterParams: currentParams,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || `Failed to generate preview (Status: ${response.status})`);
      }

      // 4. Set preview HTML on success
      if (data.previewHtml) {
        setPreviewHtml(data.previewHtml);
      } else {
        throw new Error('Preview HTML not found in API response.');
      }

    } catch (error) {
      console.error('Error generating preview:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      setPreviewError(errorMessage);
      toast({
        title: 'Preview Error',
        description: errorMessage,
        variant: 'destructive',
      });
      // Keep dialog open to show error message
    } finally {
      setIsPreviewLoading(false);
    }
  }, [letterDetails, validateSingleLetterForPreview]);

  const generateBulkLetters = async () => {
    console.log('generateBulkLetters called');
    try {
      if (!validatePayload()) {
        console.log('validatePayload failed, exiting generateBulkLetters');
        return;
      }
      
      setIsSending(true);
      setApiError(null);
  
      const { apiKey, templateId, lettersParams, notificationMethod, recipients } = letterDetails;
  
      const payload: any = {
        templateId,
        lettersParams,
        // Always include notification details in the payload
        notificationMethod,
        recipients,
      };
  
      console.log('Sending payload:', JSON.stringify(payload, null, 2));
  
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
        
        // Check for rate limit errors
        if (response.status === 429) {
          throw new Error("Rate limit exceeded. Please wait a moment before trying again.");
        }
        
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
      console.log('Success response:', { batchId });
  
      toast({
        title: lettersParams.length === 1 ? 'Letter Successfully Generated' : 'Letters Successfully Generated',
        description: `Batch ID: ${batchId}. ${lettersParams.length} ${lettersParams.length === 1 ? 'letter' : 'letters'} generated successfully.`,
        variant: 'default',
        className: 'bg-green-50 border-green-200 text-green-800',
        duration: 5000, // Show success message for 5 seconds
      });
    } catch (error) {
      console.error('Error generating bulk letters:', error);
      
      let errorMessage = 'Failed to generate letters';
      let errorTitle = 'Error';
      
      if (error instanceof Error) {
        errorMessage = error.message;
        
        if (error.name === 'AbortError') {
          errorMessage = 'Request timed out. Please try again.';
        }
        
        // Check for common error patterns in the message
        if (errorMessage.toLowerCase().includes('rate limit')) {
          errorTitle = 'Rate Limit Exceeded';
          errorMessage = 'You have reached the API rate limit. Please wait a moment before trying again.';
        }
      }
      
      setApiError(errorMessage);
      toast({
        title: errorTitle,
        description: errorMessage,
        variant: 'destructive',
        duration: 7000, // Show error messages longer
      });
    } finally {
      setIsSending(false);
    }
  };

  // Add new state for tracking current letter in the carousel
  const [currentLetterIndex, setCurrentLetterIndex] = useState(0);

  // Add state for direct navigation input
  const [directNavInput, setDirectNavInput] = useState<string>('1');

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

  // Add a new state for letter selection mode
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedLetters, setSelectedLetters] = useState<number[]>([]);

  // Add a selection toggle function
  const toggleLetterSelection = (index: number) => {
    setSelectedLetters(prev => {
      if (prev.includes(index)) {
        return prev.filter(i => i !== index);
      } else {
        return [...prev, index];
      }
    });
  };

  // Add a function to delete selected letters
  const deleteSelectedLetters = useCallback(() => {
    if (selectedLetters.length === 0) return;
    
    // Use a Set for O(1) lookups
    const toDelete = new Set(selectedLetters);
    const updatedParams = letterDetails.lettersParams.filter((_, idx) => !toDelete.has(idx));
    const updatedRecipients = (letterDetails.recipients || []).filter((_, idx) => !toDelete.has(idx));

    setLetterDetails(prev => ({
      ...prev,
      lettersParams: updatedParams,
      recipients: updatedRecipients
    }));

    setSelectedLetters([]);
    if (updatedParams.length > 0) { // Check if there are still letters left
      if (currentLetterIndex >= updatedParams.length) {
        setCurrentLetterIndex(updatedParams.length - 1);
      }
    } else {
      setCurrentLetterIndex(0); // If all letters deleted, reset to 0
    }

    toast({
      description: `Deleted ${selectedLetters.length} letter${selectedLetters.length > 1 ? 's' : ''}`,
      duration: 3000,
    });
  }, [selectedLetters, letterDetails, currentLetterIndex, setLetterDetails]);

  // Add a select all function
  const selectAllLetters = useCallback(() => {
    if (letterDetails.lettersParams.length === selectedLetters.length) {
      // If all are selected, deselect all
      setSelectedLetters([]);
    } else {
      // Otherwise select all
      setSelectedLetters(Array.from({ length: letterDetails.lettersParams.length }, (_, i) => i));
    }
  }, [letterDetails.lettersParams.length, selectedLetters.length]);

  // Add a function to exit selection mode
  const exitSelectionMode = useCallback(() => {
    setSelectionMode(false);
    setSelectedLetters([]);
  }, []);

  // Define direct navigation handlers BEFORE useMemo
  const handleDirectNavInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setDirectNavInput(e.target.value);
  }, []);

  const handleGoToLetter = useCallback(() => {
    const targetIndex = parseInt(directNavInput, 10) - 1; // Convert to 0-based index
    const maxIndex = letterDetails.lettersParams.length - 1;

    if (!isNaN(targetIndex) && targetIndex >= 0 && targetIndex <= maxIndex) {
      goToLetter(targetIndex);
    } else {
      // Reset input to current index if invalid
      setDirectNavInput((currentLetterIndex + 1).toString());
      toast({
        title: 'Invalid Letter Number',
        description: `Please enter a number between 1 and ${maxIndex + 1}.`,
        variant: 'destructive',
      });
    }
  }, [directNavInput, letterDetails.lettersParams.length, currentLetterIndex, goToLetter]);

  const handleDirectNavKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleGoToLetter();
    }
  }, [handleGoToLetter]); 



  // Correct definitions outside useMemo
  const handleClearAll = useCallback(() => {
    setLetterDetails((prev) => ({
      ...prev,
      templateId: null, // Clear Template ID
      lettersParams: [{}], // Reset to one empty set of parameters
      notificationMethod: undefined, // Reset notification method to undefined, but it will still be required
      recipients: [], // Clear recipients
    }));
    setTemplateFields([]); // Clear template fields
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

  // Update currentLetterIndex state when the input value changes
  useEffect(() => {
    setDirectNavInput((currentLetterIndex + 1).toString());
  }, [currentLetterIndex]);

  // NEW: Function to show confirmation toast
  const showConfirmationToast = () => {
    toast({
      title: "Confirm Sending",
      description: (
        <div className="flex flex-col space-y-2">
          <p>
            You are about to send <strong>{letterDetails.lettersParams.length}</strong> letter{letterDetails.lettersParams.length !== 1 ? 's' : ''}
            with notifications via <strong>{letterDetails.notificationMethod}</strong>.
          </p>
          <p className="font-semibold text-yellow-700">
            <AlertCircle className="inline h-4 w-4 mr-1" /> This action will send letters to live recipients.
          </p>
        </div>
      ),
      variant: "default", // Use default or a custom variant for emphasis
      className: "border-yellow-500 bg-yellow-50", // Style as warning
      duration: 15000, // Give user time to confirm (15 seconds)
      action: (
        <ToastAction
          altText="Confirm & Send"
          className="bg-green-600 hover:bg-green-700 text-white"
          onClick={() => {
            // User confirmed, proceed with sending
            generateBulkLetters();
          }}
        >
          Confirm & Send
        </ToastAction>
      ),
    });
  };

  // Modify the letterParamsForm to implement a carousel
  const letterParamsForm = useMemo(() => {
    return (
      <div className="space-y-8">
        {/* Letter Management Header */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xl font-semibold text-purple-800">
              {selectionMode ? 'Select Letters to Delete' : 'Letter Management'}
            </h3>
            
            <div className="flex items-center gap-2">
              {selectionMode ? (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={selectAllLetters}
                    className="flex items-center text-blue-600 hover:text-blue-800 hover:bg-blue-50 border-blue-200"
                  >
                    {selectedLetters.length === letterDetails.lettersParams.length ? (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        Deselect All
                      </>
                    ) : (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        Select All
                      </>
                    )}
                  </Button>
                  
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={deleteSelectedLetters}
                    disabled={selectedLetters.length === 0}
                    className="flex items-center"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Delete ({selectedLetters.length})
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={exitSelectionMode}
                    className="flex items-center text-gray-600"
                  >
                    Cancel
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectionMode(true)}
                    disabled={letterDetails.lettersParams.length <= 1 || isLoading || isSending}
                    className="flex items-center text-purple-600 hover:text-purple-800 hover:bg-purple-50 border-purple-200"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h7" />
                    </svg>
                    Manage Letters
                  </Button>
                  
                  <Button
                    variant="outline"
                    onClick={addLetterParams}
                    className="flex items-center text-green-600 hover:text-green-800 hover:bg-green-50 border-green-200"
                    disabled={isLoading || isSending}
                    size="sm"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Letter
                  </Button>
                </>
              )}
            </div>
          </div>
          
          {/* Letter Count Stats */}
          <div className="flex items-center justify-between bg-gray-50 p-3 rounded-lg border">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-md">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-600">Total Letters</div>
                <div className="text-2xl font-bold text-purple-700">{letterDetails.lettersParams.length}</div>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-md">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-600">Recipients</div>
                <div className="text-2xl font-bold text-blue-700">{letterDetails.recipients?.length || 0}</div>
              </div>
            </div>
            
            {currentLetterIndex !== null && (
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-100 rounded-md">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-600">Current Letter</div>
                  <div className="text-2xl font-bold text-amber-700">{currentLetterIndex + 1}</div>
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Carousel Navigation and Counter */}
        <div className="flex items-center justify-between mb-4">
          <Button
            variant="outline"
            size="icon"
            onClick={goToPrevLetter}
            disabled={currentLetterIndex === 0 || isLoading || isSending}
            className="rounded-full w-14 h-14 flex items-center justify-center border-gray-300 hover:bg-gray-100 hover:border-gray-400 transition-all duration-200 shadow-sm hover:shadow-md active:shadow-inner"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-7 w-7 text-gray-600">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </Button>
          
          {/* Direct Navigation Input */}
          <div className="flex items-center gap-2 bg-gray-100 px-4 py-2 rounded-full">
            <span className="text-base font-medium whitespace-nowrap">
              Letter
            </span>
            <Input 
              type="number"
              min="1"
              max={letterDetails.lettersParams.length}
              value={directNavInput}
              onChange={handleDirectNavInputChange}
              onKeyDown={handleDirectNavKeyDown}
              className="w-20 h-8 text-center text-base font-medium text-purple-600 border-gray-300 rounded"
              disabled={isLoading || isSending || letterDetails.lettersParams.length <= 1}
            />
            <span className="text-base font-medium whitespace-nowrap">
              of {letterDetails.lettersParams.length}
            </span>
            <Button 
              size="sm" 
              variant="ghost" 
              onClick={handleGoToLetter}
              className="p-1 h-7 text-purple-600 hover:bg-purple-100"
              disabled={isLoading || isSending || letterDetails.lettersParams.length <= 1}
              aria-label="Go to specified letter"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 5l7 7-7 7M5 12h14" />
              </svg>
            </Button>
          </div>
          
          <Button
            variant="outline"
            size="icon"
            onClick={goToNextLetter}
            disabled={currentLetterIndex === letterDetails.lettersParams.length - 1 || isLoading || isSending}
            className="rounded-full w-14 h-14 flex items-center justify-center border-gray-300 hover:bg-gray-100 hover:border-gray-400 transition-all duration-200 shadow-sm hover:shadow-md active:shadow-inner"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-7 w-7 text-gray-600">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </Button>
        </div>
        
        {/* Carousel Content - Only display current letter */}
        <div className="carousel-container relative">
          {letterDetails.lettersParams.map((params, index) => (
            <div
              key={`letter-params-${index}`}
              className={`carousel-item transition-all duration-500 ${
                index === currentLetterIndex 
                  ? 'block opacity-100 translate-x-0' 
                  : 'hidden opacity-0 absolute translate-x-full'
              }`}
            >
              <Card className={`border ${selectionMode && selectedLetters.includes(index) ? 'border-blue-400 bg-blue-50' : 'border-gray-200'} shadow-lg hover:shadow-xl transition-all duration-300`}>
                <CardHeader className={`py-4 px-6 flex flex-row items-center justify-between space-y-0 bg-gradient-to-r ${selectionMode && selectedLetters.includes(index) ? 'from-blue-50 to-blue-100' : 'from-purple-50 to-indigo-50'} border-b`}>
                  {selectionMode ? (
                    <div className="flex items-center">
                      <Checkbox 
                        checked={selectedLetters.includes(index)} 
                        onCheckedChange={() => toggleLetterSelection(index)}
                        className="mr-3 h-5 w-5"
                      />
                      <CardTitle className="text-lg font-semibold text-purple-800 flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        Letter {index + 1}
                      </CardTitle>
                    </div>
                  ) : (
                    <CardTitle className="text-lg font-semibold text-purple-800 flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      Letter {index + 1}
                    </CardTitle>
                  )}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-purple-600 bg-purple-100 px-2 py-1 rounded-full">
                      {Object.keys(params).filter(key => params[key]).length} / {Object.keys(params).length} fields filled
                    </span>
                    {!selectionMode && (
                      <div className="flex items-center gap-2"> {/* Encapsulate buttons in a div */} 
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => removeLetterParams(index)}
                          disabled={letterDetails.lettersParams.length <= 1 || isLoading || isSending}
                          className="flex items-center text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          Delete
                        </Button>
                        {/* Add Preview Button */}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePreview(index)}
                          disabled={isLoading || isSending || isPreviewLoading}
                          className="flex items-center text-blue-600 hover:text-blue-700 hover:bg-blue-50 border-blue-200"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          Preview
                        </Button>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  {/* Add recipient mapping indicator */}
                  <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center justify-between">
                    <div className="flex items-center">
                      <span className="bg-amber-500 text-white font-semibold text-xs w-6 h-6 rounded-full flex items-center justify-center mr-2">{index + 1}</span>
                      <span className="text-sm font-medium text-amber-800">
                        This letter will be sent to recipient #{index + 1}
                      </span>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="p-1 h-7 text-amber-600 hover:text-amber-800 hover:bg-amber-100"
                      onClick={() => {
                        // Scroll to corresponding recipient in the recipients section
                        const recipientElement = document.getElementById(`recipient-${index}`);
                        if (recipientElement) {
                          recipientElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                          // Highlight temporarily
                          recipientElement.classList.add('highlight-pulse');
                          setTimeout(() => {
                            recipientElement.classList.remove('highlight-pulse');
                          }, 2000);
                        }
                      }}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      View recipient
                    </Button>
                  </div>
                  
                  <div className="grid gap-6">
                    {templateFields.map((field, fieldIndex) => {
                      // Ensure field.name exists and is a string
                      const fieldName = field?.name || '';
                      if (!fieldName) return null;
                      
                      return (
                        <div key={`field-${index}-${fieldIndex}-${fieldName}`} className="space-y-2">
                          <Label htmlFor={`${index}-${fieldName}`} className="flex items-center text-base font-medium">
                            <span>{fieldName}</span> 
                            {field.required && <span className="text-red-500 ml-1">*</span>}
                          </Label>
                          <div className="relative">
                            <Textarea
                              id={`${index}-${fieldName}`}
                              value={params[fieldName] || ''}
                              onChange={(e) => updateLetterParams(index, fieldName, e.target.value)}
                              className={`h-24 resize-none text-base p-4 transition-all duration-200 ${!params[fieldName] && field.required ? 'border-red-200 focus:ring-red-500' : 'focus:ring-purple-500'}`}
                              placeholder={`Enter ${fieldName} value`}
                              disabled={isLoading || isSending || selectionMode}
                            />
                            {!params[fieldName] && field.required && (
                              <div className="absolute right-3 top-3 text-red-500">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                              </div>
                            )}
                            <div className="text-right mt-1">
                              <span className="text-xs text-gray-500">
                                {(params[fieldName]?.length || 0)} / 1000 characters
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    
                    {/* Integrated Recipient Input */}
                    <div className="pt-6 mt-6 border-t border-purple-100 bg-purple-50/30 p-5 rounded-b-lg -m-6 mt-6 px-6 pb-6">
                      <Label htmlFor={`recipient-${index}`} className="flex items-center text-base font-semibold text-purple-700 mb-2">
                        <span>Recipient for Letter {index + 1}</span> 
                        {letterDetails.notificationMethod && <span className="text-red-500 ml-1">*</span>} 
                         <span className="ml-2 text-xs font-normal text-gray-500">({letterDetails.notificationMethod || 'Select Method Above'})</span>
                      </Label>
                      <Input
                        id={`recipient-${index}`}
                        type={letterDetails.notificationMethod === 'EMAIL' ? 'email' : 'text'}
                        value={letterDetails.recipients?.[index] || ''}
                        onChange={(e) => {
                          const newRecipients = [...(letterDetails.recipients || [])];
                          while (newRecipients.length <= index) {
                            newRecipients.push('');
                          }
                          newRecipients[index] = e.target.value;
                          updateLetterDetail('recipients', newRecipients);
                        }}
                        placeholder={
                          !letterDetails.notificationMethod
                            ? 'Select notification method first'
                            : letterDetails.notificationMethod === 'SMS'
                              ? 'Enter phone (+65... or 9...)'
                              : 'Enter email address'
                        }
                        className={`text-base p-4 transition-all duration-200 ${!letterDetails.recipients?.[index] && letterDetails.notificationMethod ? 'border-red-200 focus:ring-red-500' : 'focus:ring-purple-500'}`}
                        disabled={isLoading || isSending || selectionMode || !letterDetails.notificationMethod}
                      />
                       {/* Validation/Hint Text */}
                      <div className="mt-1.5 text-xs min-h-[1.25rem]">
                        {!letterDetails.recipients?.[index] && letterDetails.notificationMethod ? (
                          <p className="text-red-600 flex items-center">
                            <AlertCircle className="h-3.5 w-3.5 mr-1"/> Recipient is required.
                          </p>
                        ) : letterDetails.notificationMethod === 'SMS' ? (
                          <p className="text-gray-500 flex items-center">
                            <Info className="h-3.5 w-3.5 mr-1 flex-shrink-0"/> Format: +65XXXXXXXX or 8/9XXXXXXX
                          </p>
                        ) : letterDetails.notificationMethod === 'EMAIL' ? (
                          <p className="text-gray-500 flex items-center">
                            <Info className="h-3.5 w-3.5 mr-1 flex-shrink-0"/> Format: user@example.com
                          </p>
                        ) : (
                          <p className="text-gray-500">Select notification method above.</p>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
        
        {/* Carousel Indicators - Pagination Dots */}
        <div className="flex justify-center gap-2 mt-6">
          {letterDetails.lettersParams.map((_, index) => (
            <button
              key={`indicator-${index}`}
              className={`transition-all duration-300 ${
                index === currentLetterIndex
                  ? 'bg-purple-600 w-8 h-2 rounded-full'
                  : 'bg-gray-300 hover:bg-gray-400 w-2 h-2 rounded-full'
              }`}
              onClick={() => goToLetter(index)}
              aria-label={`Go to letter ${index + 1}`}
              disabled={isLoading || isSending}
            />
          ))}
        </div>
        
        {/* Add Letter Button - only show when not in selection mode */}
        {!selectionMode && (
          <div className="flex justify-center mt-6">
            <Button
              variant="outline"
              onClick={addLetterParams}
              className="flex items-center px-6 py-5 text-base font-medium bg-purple-50 text-purple-600 hover:bg-purple-100 border-purple-200 hover:border-purple-300 transition-all duration-200 rounded-full shadow-sm hover:shadow"
              disabled={isLoading || isSending}
            >
              <Plus className="mr-2 h-5 w-5" />
              Add Another Letter
            </Button>
          </div>
        )}
      </div>
    );
  }, [letterDetails.lettersParams, templateFields, selectionMode, selectedLetters, currentLetterIndex, isLoading, isSending, isPreviewLoading, removeLetterParams, addLetterParams, goToPrevLetter, goToNextLetter, handleDirectNavInputChange, handleDirectNavKeyDown, handleGoToLetter, toggleLetterSelection, selectAllLetters, deleteSelectedLetters, exitSelectionMode, handlePreview]);

  return (
    <div className="bg-gradient-to-b from-white to-gray-50">
      <style jsx global>{`
        @keyframes highlight-pulse {
          0% { background-color: rgba(245, 158, 11, 0.1); }
          50% { background-color: rgba(245, 158, 11, 0.3); }
          100% { background-color: rgba(245, 158, 11, 0.1); }
        }
        
        .highlight-pulse {
          animation: highlight-pulse 1s ease-in-out 2;
        }
      `}</style>

      {/* Preview Dialog */}
      <Dialog open={isPreviewDialogOpen} onOpenChange={setIsPreviewDialogOpen}>
        <DialogContent className="sm:max-w-[80%] lg:max-w-[60%] max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-blue-800">Letter Preview</DialogTitle>
            <DialogDescription>This is how your letter will look based on the current parameters.</DialogDescription>
          </DialogHeader>
          <div className="flex-grow overflow-y-auto border rounded-lg my-4 p-2 bg-gray-100">
            {isPreviewLoading ? (
              <div className="flex justify-center items-center h-full">
                <Loader2 className="animate-spin h-12 w-12 text-blue-500" />
                <span className="ml-4 text-lg text-gray-600">Generating Preview...</span>
              </div>
            ) : previewError ? (
              <Alert variant="destructive" className="m-4">
                <AlertCircle className="h-5 w-5" />
                <AlertDescription>{previewError}</AlertDescription>
              </Alert>
            ) : previewHtml ? (
              <iframe
                srcDoc={previewHtml}
                title="Letter Preview"
                className="w-full h-full min-h-[600px] border-0 bg-white shadow-inner"
                sandbox="allow-same-origin" // Restrict iframe capabilities for security
              />
            ) : (
              <div className="flex justify-center items-center h-full text-gray-500">
                No preview available.
              </div>
            )}
          </div>
          <Button variant="outline" onClick={() => setIsPreviewDialogOpen(false)}>Close Preview</Button>
        </DialogContent>
      </Dialog>

      <div className="container mx-auto py-12 px-4 max-w-6xl"> {/* Increased max-width */}
        <div className="flex flex-col items-center mb-10"> {/* Increased bottom margin */}
          <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-blue-600 mb-3">Bulk Letter Generation</h1> {/* Larger text */}
          <p className="text-lg text-gray-600 max-w-2xl text-center">Streamline your letter sending process with CSV imports and API integration.</p> {/* Larger text */}
        </div>
        
        {apiError && (
          <Alert variant="destructive" className="mb-6 animate-slideDown shadow-md">
            <AlertDescription className="whitespace-pre-line">{apiError}</AlertDescription>
          </Alert>
        )}
        
        <div className="space-y-10"> {/* Increased spacing between sections */}
          {/* Section 1: API Configuration */}
          <Card className="border-gray-200 shadow-lg overflow-hidden transition-all hover:shadow-xl">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-5 border-b border-blue-100"> {/* Added border */}
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-semibold text-blue-800 flex items-center">
                    <span className="mr-3 flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-white text-lg font-bold">1</span>
                    API Configuration
                  </h2>
                  <p className="text-blue-600 text-sm mt-1 ml-11">Connect to Letters.gov.sg API</p>
                </div>
                <div className="flex gap-2">
                  {/* Template Selection Dialog Trigger */}
                  <Dialog open={isTemplateDialogOpen} onOpenChange={setIsTemplateDialogOpen}>
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        onClick={() => {
                          fetchTemplates();
                        }}
                        disabled={isLoading || isSending || !letterDetails.apiKey}
                        className="bg-blue-50 text-blue-600 hover:bg-blue-100 border-blue-200 transition-all duration-200 flex items-center shadow-sm"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Select Template
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle className="text-2xl font-bold text-blue-800">Select a Template</DialogTitle>
                        <DialogDescription className="text-base">Choose a template from the list below or search by name.</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        {isTemplateListLoading ? (
                          <div className="flex justify-center items-center py-8">
                            <svg className="animate-spin h-8 w-8 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <span className="ml-3 text-lg">Loading templates...</span>
                          </div>
                        ) : templates.length > 0 ? (
                          <div className="space-y-4">
                            <div className="relative">
                              <Input
                                type="text"
                                placeholder="Search templates by name or ID..."
                                className="pl-10 py-6 text-base"
                                value={templateSearchTerm}
                                onChange={(e) => handleTemplateSearch(e.target.value)}
                              />
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                              </svg>
                            </div>
                            
                            <div className="max-h-[400px] overflow-y-auto border rounded-md shadow-inner">
                              {filteredTemplates.length > 0 ? (
                                filteredTemplates.map((template) => (
                                  <div 
                                    key={template.id}
                                    className="p-4 border-b last:border-b-0 hover:bg-blue-50 cursor-pointer flex justify-between items-center transition-colors duration-200"
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
                                      <div className="font-semibold text-lg">{template.name}</div>
                                      <div className="text-sm text-gray-600 mt-1">ID: {template.id}</div>
                                      {template.fields && template.fields.length > 0 && (
                                        <div className="text-xs text-gray-500 mt-1 flex items-center">
                                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                          </svg>
                                          Fields: {template.fields.slice(0, 3).join(", ")}
                                          {template.fields.length > 3 && ` +${template.fields.length - 3} more`}
                                        </div>
                                      )}
                                    </div>
                                    <Button 
                                      variant="default" 
                                      size="sm"
                                      className="bg-blue-500 hover:bg-blue-600 transition-colors duration-200"
                                    >
                                      Select
                                    </Button>
                                  </div>
                                ))
                              ) : (
                                <div className="p-8 text-center">
                                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                  </div>
                                  <p className="text-lg font-medium text-gray-900">No templates match your search</p>
                                  <p className="text-sm text-gray-500 mt-2">Try adjusting your search or check that you have access to templates.</p>
                                </div>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="text-center py-12">
                            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gray-100 mb-4">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                            </div>
                            <p className="text-xl font-medium text-gray-900">No templates found</p>
                            <p className="text-base text-gray-500 mt-2 max-w-md mx-auto">
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
                    className="border-gray-300 hover:bg-gray-100 transition-all duration-200 flex items-center shadow-sm"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Reset
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-8"> {/* Increased padding */}
              <div className="grid gap-8 md:grid-cols-2"> {/* Increased gap */}
                <div className="space-y-3"> {/* Increased spacing */}
                  <Label htmlFor="apiKey" className="text-base font-semibold text-gray-700 flex items-center">
                    <span>API Key</span>
                    <span className="ml-2 inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">Required</span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="apiKey"
                      type="password"
                      value={letterDetails.apiKey}
                      onChange={(e) => updateLetterDetail('apiKey', e.target.value)}
                      disabled={isLoading || isSending}
                      className="pl-10 pr-12 py-6 text-base border-gray-300 hover:bg-gray-50 transition-all duration-200 shadow-sm"
                    />
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                      </svg>
                    </div>
                  </div>
                  {/* Enhanced API Key Instructions */}
                  <div className="mt-4 overflow-hidden rounded-lg border border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 shadow-sm">
                    <div className="border-b border-blue-200 bg-blue-100/50 px-4 py-3">
                      <h4 className="font-medium text-blue-800 flex items-center">
                        <Info className="h-4 w-4 mr-2 text-blue-600" />
                        How to Get Your API Key
                      </h4>
                    </div>
                    <div className="px-4 py-4">
                      <ol className="space-y-3 ml-5 list-decimal text-sm text-blue-800">
                        <li className="pl-1">
                          <span className="font-medium">Log in</span> to <a href="https://letters.gov.sg" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 hover:underline font-medium">LetterSG</a>
                        </li>
                        <li className="pl-1">
                          Click on <span className="px-2 py-0.5 bg-white rounded text-blue-700 font-medium border border-blue-200">API Integration</span> in the navigation bar
                        </li>
                        <li className="pl-1">
                          Click on <span className="px-2 py-0.5 bg-white rounded text-green-700 font-medium border border-green-200">Generate API key</span> button
                        </li>
                        <li className="pl-1">
                          Copy the generated token and paste it here
                        </li>
                      </ol>
                      <div className="mt-4 pt-3 border-t border-blue-200 flex items-center justify-between">
                        <a 
                          href="https://guide.letters.gov.sg/developer-guide/api-documentation" 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="inline-flex items-center text-xs font-medium text-blue-700 hover:text-blue-900 hover:underline"
                        >
                          <FileText className="h-3.5 w-3.5 mr-1.5" />
                          View complete API documentation
                        </a>
                        <span className="text-xs text-blue-500">Letters.gov.sg</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="space-y-3"> {/* Increased spacing */}
                  <Label htmlFor="templateId" className="text-base font-semibold text-gray-700 flex items-center">
                    <span>Template ID</span>
                    <span className="ml-2 inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">Required</span>
                  </Label>
                  <div className="flex gap-3"> {/* Increased gap */}
                    <div className="relative flex-1">
                      <Input
                        id="templateId"
                        type="text"
                        value={letterDetails.templateId?.toString() || ''}
                        onChange={(e) => updateLetterDetail('templateId', parseInt(e.target.value) || null)}
                        disabled={isLoading || isSending}
                        className={letterDetails.templateId ? "py-6 text-base bg-green-100 text-green-700 hover:bg-green-200 border-green-300 transition-all duration-200 shadow-sm flex-shrink-0" : "py-6 text-base border-gray-300 hover:bg-gray-50 transition-all duration-200 shadow-sm flex-shrink-0"} /* Adjusted styling */
                      />
                      {isTemplateLoading && (
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center">
                          <Loader2 className="animate-spin h-6 w-6 text-blue-500" />
                        </div>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => {
                        if (letterDetails.templateId) {
                          fetchTemplateDetails(letterDetails.templateId);
                        }
                      }}
                      disabled={isLoading || isSending || !letterDetails.templateId}
                      className="bg-blue-50 text-blue-600 hover:bg-blue-100 border-blue-200 transition-all duration-200 flex items-center shadow-sm"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Load Template
                    </Button>
                  </div>
                </div>
              </div>
              
              {/* Add CSV Import functionality here */}
              <div className="mt-8 border-t pt-6 border-gray-200">
                <div className="flex flex-col gap-4">
                  <h3 className="text-lg font-semibold text-gray-700">Data Import Options</h3>
                  <div className="flex flex-wrap gap-3">
                    {/* CSV Import Dialog for template fields */}
                    {templateFields.length > 0 && (
                      <CSVImportDialog 
                        templateFields={templateFields} 
                        onImport={handleCSVImport} 
                      />
                    )}
                    
                    {/* Recipients Import Dialog (if it exists) */}
                    {templateFields.length > 0 && letterDetails.notificationMethod && (
                      <div>
                        <RecipientsImportDialog
                          notificationMethod={letterDetails.notificationMethod}
                          onImport={(recipients) => {
                            updateLetterDetail('recipients', recipients);
                            toast({
                              description: `Successfully imported ${recipients.length} recipients`,
                            });
                          }}
                        />
                        <p className="mt-1 text-xs text-gray-500">
                          Import {letterDetails.lettersParams.length} {letterDetails.notificationMethod === 'SMS' ? 'phone numbers' : 'email addresses'} (one for each letter)
                        </p>
                      </div>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 mt-2">
                    First select a template above, then use these options to bulk import data for your letters.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Section 2: Letter Details & Recipients */}
          {templateFields.length > 0 && (
            <Card className="border-gray-200 shadow-lg overflow-hidden transition-all hover:shadow-xl">
              <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 px-6 py-5 border-b border-purple-100"> {/* Added border */}
                <h2 className="text-2xl font-semibold text-purple-800 flex items-center">
                   <span className="mr-3 flex h-8 w-8 items-center justify-center rounded-full bg-purple-600 text-white text-lg font-bold">2</span>
                   Letter Details & Recipients
                 </h2>
                <p className="text-purple-600 text-sm mt-1 ml-11">Define parameters and recipient for each letter</p>
              </CardHeader>
              <CardContent className="p-8"> {/* Increased padding */}
                {letterParamsForm} {/* This now contains both params and recipient input */}
              </CardContent>
            </Card>
          )}

          {/* Section 3: Notification Method & Send Action */}
          {templateFields.length > 0 && (
            <Card className="border-gray-200 shadow-lg overflow-hidden transition-all hover:shadow-xl">
              <CardHeader className="bg-gradient-to-r from-teal-50 to-cyan-50 px-6 py-5 border-b border-teal-100"> {/* Added border */}
                 <h2 className="text-2xl font-semibold text-teal-800 flex items-center">
                   <span className="mr-3 flex h-8 w-8 items-center justify-center rounded-full bg-teal-600 text-white text-lg font-bold">3</span>
                   Notification & Sending
                 </h2>
                 <p className="text-teal-600 text-sm mt-1 ml-11">Choose notification method and send letters</p>
              </CardHeader>
              <CardContent className="p-8">
                {/* Notification Method Selection */}
                <div className="space-y-8"> {/* Increased spacing */}
                  {/* Notification Method Selection */}
                  <div className="bg-blue-50 p-6 rounded-lg border border-blue-100 shadow-sm"> {/* Increased padding */}
                    <h3 className="font-semibold text-lg text-blue-800 mb-3">Notification Method</h3> {/* Larger text */}
                    <p className="text-sm text-blue-600 mb-5"> {/* Increased bottom margin */}
                      Select how recipients will be notified (Required)
                    </p>
                    <div className="flex gap-4"> {/* Increased gap */}
                      <Button
                        variant={letterDetails.notificationMethod === 'SMS' ? 'default' : 'outline'}
                        onClick={() => updateLetterDetail('notificationMethod', 'SMS')}
                        disabled={isLoading || isSending}
                        className={`h-auto py-5 text-base flex-1 ${
                          letterDetails.notificationMethod === 'SMS'
                            ? 'bg-blue-600 hover:bg-blue-700 text-white ring-2 ring-offset-2 ring-blue-500' /* Added ring for selected */
                            : 'border-blue-300 text-blue-700 hover:bg-blue-100'
                        }`}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                        SMS
                      </Button>
                      <Button
                        variant={letterDetails.notificationMethod === 'EMAIL' ? 'default' : 'outline'}
                        onClick={() => updateLetterDetail('notificationMethod', 'EMAIL')}
                        disabled={isLoading || isSending}
                        className={`h-auto py-5 text-base flex-1 ${
                          letterDetails.notificationMethod === 'EMAIL'
                            ? 'bg-blue-600 hover:bg-blue-700 text-white ring-2 ring-offset-2 ring-blue-500' /* Added ring for selected */
                            : 'border-blue-300 text-blue-700 hover:bg-blue-100'
                        }`}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        Email
                      </Button>
                    </div>
                  </div>
                  {/* Send Button - Modified onClick */}
                  <Button
                    type="button"
                    size="lg" /* Larger button */
                    onClick={(e) => {
                      e.preventDefault();
                      console.log('Generate button clicked');
                      if (validatePayload()) {
                        console.log('Validation passed, showing confirmation toast');
                        // Show confirmation toast instead of sending directly
                        showConfirmationToast();
                      } else {
                        console.log('Validation failed');
                      }
                    }}
                    className="w-full relative overflow-hidden group bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 py-5 text-xl font-semibold rounded-lg" /* Adjusted size, padding, text, rounding */
                    disabled={isLoading || isSending || letterDetails.lettersParams.length === 0 || !letterDetails.notificationMethod || (!letterDetails.recipients || letterDetails.recipients.length !== letterDetails.lettersParams.length)} /* Added mismatch check to disabled */
                  >
                    <span className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity"></span>
                    {isSending ? (
                      <>
                        <Loader2 className="animate-spin -ml-1 mr-3 h-6 w-6" />
                        Sending Letters...
                      </>
                    ) : (
                      <>
                        <Send className="mr-3 h-6 w-6" /> {/* Larger icon */}
                        Send {letterDetails.lettersParams.length} Letter{letterDetails.lettersParams.length !== 1 ? 's' : ''} via {letterDetails.notificationMethod === 'SMS' ? 'SMS' : 'Email'}
                      </>
                    )}
                    <div className="absolute right-5 top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 group-hover:translate-x-0 translate-x-2 transition-all duration-300"> {/* Adjusted positioning */}
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"> {/* Larger icon */}
                        <path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  ); // End of return statement for LetterMode component

}; // <-- Correct closing brace for the LetterMode component

export default LetterMode;
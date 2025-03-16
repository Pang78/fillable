import React, { useState, useRef, useCallback } from 'react';
import Papa from 'papaparse';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from '@/components/ui/dialog';
import { toast } from '@/components/ui/use-toast';
import { 
  FileSpreadsheet, 
  FileUp, 
  Loader2, 
  XCircle, 
  Check, 
  CheckCircle
} from 'lucide-react';
import { 
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell
} from '@/components/ui/table';

interface RecipientsImportDialogProps {
  notificationMethod?: 'SMS' | 'EMAIL';
  onImport: (contacts: string[]) => void;
  disabled?: boolean;
}

// Helper functions
const readFileAsText = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsText(file);
  });
};

// Add a sanitization step to handle common CSV issues
const sanitizeCSVText = (text: string): string => {
  // Remove BOM if present
  const bom = '\ufeff';
  if (text.startsWith(bom)) {
    text = text.substring(1);
  }
  
  // Normalize line endings
  text = text.replace(/\r\n|\r/g, '\n');
  
  // Make sure there's a newline at the end for processing
  if (!text.endsWith('\n')) {
    text += '\n';
  }
  
  return text;
};

const parseCSVText = (csvText: string, options: any): Promise<{
  data: any[];
  meta: {
    fields?: string[];
  };
  errors?: any[];
}> => {
  return new Promise((resolve, reject) => {
    // Sanitize the CSV text
    const sanitizedText = sanitizeCSVText(csvText);
    
    // Add debug log of the first few characters to help diagnose issues
    console.log('CSV first 100 chars (sanitized):', sanitizedText.slice(0, 100));
    
    // Set sensible defaults for Papa Parse
    const parseOptions = {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header: string) => header.trim(),
      delimitersToGuess: [',', '\t', ';', '|'], // Try to guess delimiter if not specified
      error: (error: any) => reject(error),
      complete: (results: any) => {
        console.log('Papa Parse complete:', { 
          rowCount: results.data.length,
          headers: results.meta.fields,
          errors: results.errors && results.errors.length ? results.errors.length : 0
        });
        resolve(results);
      },
      ...options
    };
    
    try {
      Papa.parse(sanitizedText, parseOptions);
    } catch (err) {
      console.error('Papa Parse exception:', err);
      reject(err);
    }
  });
};

const RecipientsImportDialog: React.FC<RecipientsImportDialogProps> = ({
  notificationMethod,
  onImport,
  disabled
}) => {
  // State
  const [open, setOpen] = useState(false);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [selectedHeader, setSelectedHeader] = useState<string>('');
  const [contacts, setContacts] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [csvText, setCsvText] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  
  // Reset dialog state
  const resetDialogState = useCallback(() => {
    setCsvHeaders([]);
    setSelectedHeader('');
    setPreviewData([]);
    setContacts([]);
    setIsLoading(false);
    setPreviewLoading(false);
    setImportProgress(0);
    setSelectedFile(null);
    setError(null);
    setCsvText(null);
    setShowPreview(false);
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      try {
        const form = fileInputRef.current.form;
        if (form) form.reset();
      } catch (e) {
        console.error('Error resetting form:', e);
      }
    }
  }, []);
  
  // Handle dialog open/close
  const handleOpenChange = useCallback((newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      resetDialogState();
    }
  }, [resetDialogState]);
  
  // File validation
  const validateFile = useCallback((file: File): boolean => {
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
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      toast({
        title: 'File Too Large',
        description: 'The CSV file must be smaller than 5MB.',
        variant: 'destructive',
      });
      return false;
    }
    
    // File looks good
    setSelectedFile(file);
    return true;
  }, []);
  
  // Handle file upload
  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    
    // Get file
    const file = event.target.files?.[0];
    if (!file) {
      toast({
        title: 'No File Selected',
        description: 'Please select a CSV file to import.',
        variant: 'destructive',
      });
      return;
    }
    
    // Validate file
    if (!validateFile(file)) {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }
    
    // Reset state for new file
    setCsvHeaders([]);
    setSelectedHeader('');
    setPreviewData([]);
    setContacts([]);
    setShowPreview(false);
    
    try {
      setIsLoading(true);
      setImportProgress(20);
      
      console.log('Reading file:', file.name, file.size, file.type);
      
      // Read file as text
      const text = await readFileAsText(file);
      setCsvText(text);
      
      console.log('File read complete. Text length:', text.length);
      setImportProgress(40);
      
      // Parse CSV with a timeout to ensure UI can update
      setTimeout(async () => {
        try {
          // Parse CSV
          const results = await parseCSVText(text, {
            header: true,
            skipEmptyLines: true,
          });
          setImportProgress(60);
          
          // Check if CSV has data
          if (results.data.length === 0 || !results.meta.fields || results.meta.fields.length === 0) {
            toast({
              title: 'Invalid CSV',
              description: 'The CSV file is empty or has no valid headers.',
              variant: 'destructive',
            });
            setIsLoading(false);
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
            setIsLoading(false);
            setImportProgress(0);
            return;
          }
          
          // Check for duplicate headers
          const uniqueHeaders = new Set(headers);
          if (uniqueHeaders.size !== headers.length) {
            toast({
              title: 'Duplicate CSV Headers',
              description: 'The CSV file contains duplicate headers after trimming whitespace.',
              variant: 'destructive',
            });
            setIsLoading(false);
            setImportProgress(0);
            return;
          }
          
          // Store headers and preview data
          setCsvHeaders(headers);
          setPreviewData(results.data.slice(0, 5)); // First 5 rows for preview
          
          // Try to auto-detect appropriate column
          let detectedHeader = '';
          if (notificationMethod === 'EMAIL') {
            // Look for email-related headers
            detectedHeader = headers.find(header => 
              header.toLowerCase().includes('email') || 
              header.toLowerCase().includes('mail') ||
              header.toLowerCase().includes('e-mail')
            ) || '';
            
            if (detectedHeader) {
              setSelectedHeader(detectedHeader);
              toast({
                description: `Auto-detected email column: "${detectedHeader}"`,
              });
            } else {
              toast({
                description: 'Could not auto-detect an email column. Please select one manually.',
              });
            }
          } else if (notificationMethod === 'SMS') {
            // Look for phone-related headers
            detectedHeader = headers.find(header => 
              header.toLowerCase().includes('phone') || 
              header.toLowerCase().includes('mobile') || 
              header.toLowerCase().includes('cell') ||
              header.toLowerCase().includes('tel') ||
              header.toLowerCase().includes('number')
            ) || '';
            
            if (detectedHeader) {
              setSelectedHeader(detectedHeader);
              toast({
                description: `Auto-detected phone column: "${detectedHeader}"`,
              });
            } else {
              toast({
                description: 'Could not auto-detect a phone number column. Please select one manually.',
              });
            }
          }
          
          // Always set these even if detection fails
          setImportProgress(100);
          setTimeout(() => {
            setImportProgress(0);
            setIsLoading(false);
          }, 500);
          
        } catch (error) {
          console.error('CSV parsing error:', error);
          toast({
            title: 'CSV Parsing Error',
            description: 'Failed to parse the CSV file. Please check the file format.',
            variant: 'destructive',
          });
          setIsLoading(false);
          setImportProgress(0);
        }
      }, 100); // Short timeout to allow UI to update
      
    } catch (error: unknown) {
      console.error('Error handling file:', error);
      setImportProgress(0);
      setIsLoading(false);
      
      toast({
        title: 'File Error',
        description: 'There was an error processing the file. Please try again with a different file.',
        variant: 'destructive',
      });
      
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [notificationMethod, validateFile]);
  
  // Preview contacts
  const previewContacts = useCallback(() => {
    if (!selectedHeader) {
      toast({
        title: 'No Column Selected',
        description: 'Please select a column to extract contacts from.',
        variant: 'destructive',
      });
      return;
    }
    
    if (!csvText) {
      toast({
        title: 'No CSV Data',
        description: 'Please upload a CSV file first.',
        variant: 'destructive',
      });
      return;
    }
    
    setPreviewLoading(true);
    
    try {
      parseCSVText(csvText, {
        header: true,
        skipEmptyLines: true,
        complete: (results: any) => {
          try {
            // Extract contacts from the selected column
            const extractedContacts = results.data
              .map((row: any) => row[selectedHeader])
              .filter(Boolean)
              .map((contact: string) => contact.trim());
            
            if (extractedContacts.length === 0) {
              toast({
                title: 'No Contacts Found',
                description: `No data found in the selected column "${selectedHeader}".`,
                variant: 'destructive',
              });
              setPreviewLoading(false);
              return;
            }
            
            // Validate contacts based on notification method
            let validContacts: string[] = [];
            
            if (notificationMethod === 'EMAIL') {
              // Simple email validation
              const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
              validContacts = extractedContacts.filter((email: string) => emailRegex.test(email));
              
              if (validContacts.length === 0) {
                toast({
                  title: 'No Valid Email Addresses',
                  description: 'None of the values in the selected column are valid email addresses.',
                  variant: 'destructive',
                });
                setPreviewLoading(false);
                return;
              }
              
              if (validContacts.length < extractedContacts.length) {
                toast({
                  description: `${extractedContacts.length - validContacts.length} invalid email addresses were removed.`,
                });
              }
            } else if (notificationMethod === 'SMS') {
              // Simple phone validation (this is a basic check, can be improved)
              const phoneRegex = /^(\+?\d{1,3}[-.\s]?)?(\(?\d{1,4}\)?[-.\s]?)?\d{6,14}$/;
              validContacts = extractedContacts.filter((phone: string) => {
                const cleanPhone = phone.replace(/[-()\s]/g, '');
                return phoneRegex.test(cleanPhone);
              });
              
              if (validContacts.length === 0) {
                toast({
                  title: 'No Valid Phone Numbers',
                  description: 'None of the values in the selected column are valid phone numbers.',
                  variant: 'destructive',
                });
                setPreviewLoading(false);
                return;
              }
              
              if (validContacts.length < extractedContacts.length) {
                toast({
                  description: `${extractedContacts.length - validContacts.length} invalid phone numbers were removed.`,
                });
              }
            }
            
            setContacts(validContacts);
            setShowPreview(true);
            setPreviewLoading(false);
          } catch (error) {
            console.error('Error processing contact data:', error);
            toast({
              title: 'Processing Error',
              description: 'Failed to process the contact data from the selected column.',
              variant: 'destructive',
            });
            setPreviewLoading(false);
          }
        },
        error: (error: any) => {
          console.error('Error parsing CSV:', error);
          toast({
            title: 'Parsing Error',
            description: 'There was an error processing the CSV file.',
            variant: 'destructive',
          });
          setPreviewLoading(false);
        }
      });
    } catch (error: unknown) {
      console.error('Error previewing contacts:', error);
      toast({
        title: 'Preview Error',
        description: 'There was an error generating the contacts preview.',
        variant: 'destructive',
      });
      setPreviewLoading(false);
    }
  }, [selectedHeader, csvText, notificationMethod]);
  
  // Import contacts
  const importContacts = useCallback(() => {
    if (contacts.length === 0) {
      toast({
        title: 'No Contacts',
        description: 'No valid contacts to import.',
        variant: 'destructive',
      });
      return;
    }
    
    // Call onImport with the contacts
    onImport(contacts);
    
    toast({
      description: `Successfully imported ${contacts.length} ${notificationMethod === 'EMAIL' ? 'email addresses' : 'phone numbers'}.`,
    });
    
    // Close dialog
    setOpen(false);
  }, [contacts, onImport, notificationMethod]);
  
  // Handle file drag over
  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);
  
  // Handle file drag leave
  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);
  
  // Handle file drop
  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      // Create a synthetic event
      const syntheticEvent = {
        target: {
          files: files
        }
      } as unknown as React.ChangeEvent<HTMLInputElement>;
      
      handleFileUpload(syntheticEvent);
    }
  }, [handleFileUpload]);
  
  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setOpen(true)}
          disabled={!notificationMethod || disabled}
          className="w-full mt-2 mb-1"
        >
          <FileSpreadsheet className="mr-2 h-4 w-4" />
          Import {notificationMethod === 'SMS' ? 'Phone Numbers' : 'Email Addresses'} from CSV
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-blue-800">
            Import {notificationMethod === 'SMS' ? 'Phone Numbers' : 'Email Addresses'} from CSV
          </DialogTitle>
          <DialogDescription className="text-base">
            Upload a CSV file and select the column containing your {notificationMethod === 'SMS' ? 'phone numbers' : 'email addresses'}
          </DialogDescription>
        </DialogHeader>
        
        {/* Progress indicator */}
        {importProgress > 0 && (
          <div className="w-full bg-gray-200 rounded-full h-2 mb-4 overflow-hidden">
            <div 
              className="bg-blue-500 h-2 rounded-full transition-all duration-300" 
              style={{ width: `${importProgress}%` }}
            ></div>
          </div>
        )}
        
        {/* Error message */}
        {error && (
          <div className="mb-4 p-4 border border-red-200 bg-red-50 rounded-md">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}
        
        {/* File upload section (shown when no file is selected) */}
        {!selectedFile ? (
          <div
            className={`border-2 border-dashed rounded-lg p-8 transition-colors ${
              isDragging ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-blue-300'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div className="flex flex-col items-center justify-center text-center">
              {isLoading ? (
                <div className="flex flex-col items-center">
                  <Loader2 className="h-10 w-10 text-blue-500 animate-spin mb-3" />
                  <p className="text-blue-600">Processing file...</p>
                </div>
              ) : (
                <>
                  <FileUp className="h-10 w-10 text-gray-400 mb-3" />
                  <h3 className="text-lg font-medium text-gray-700 mb-2">
                    Upload CSV File
                  </h3>
                  <p className="text-sm text-gray-500 mb-4 max-w-md">
                    Drag and drop your CSV file here, or click to browse
                  </p>
                  <Button 
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-white"
                  >
                    <FileSpreadsheet className="mr-2 h-4 w-4" />
                    Select CSV File
                  </Button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept=".csv"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* File information */}
            <div className="flex items-center justify-between p-3 border rounded-md bg-blue-50">
              <div className="flex items-center">
                <FileSpreadsheet className="h-5 w-5 text-blue-500 mr-2" />
                <span className="font-medium">{selectedFile.name}</span>
                <span className="text-sm text-gray-500 ml-2">
                  ({(selectedFile.size / 1024).toFixed(1)} KB)
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedFile(null);
                  setCsvText(null);
                  setCsvHeaders([]);
                  setSelectedHeader('');
                  setPreviewData([]);
                  setShowPreview(false);
                  if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                  }
                }}
              >
                <XCircle className="h-4 w-4" />
              </Button>
            </div>
            
            {/* Data preview */}
            {csvHeaders.length > 0 && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-medium text-lg">CSV Preview</h3>
                  <p className="text-sm text-gray-500">Showing first 5 rows</p>
                </div>
                <div className="max-h-48 overflow-y-auto border rounded-md">
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
                
                {/* Column selection */}
                <div className={`p-4 border rounded-lg ${!selectedHeader ? 'bg-yellow-50 border-yellow-200' : 'bg-gray-50'}`}>
                  {!selectedHeader && (
                    <div className="mb-3 text-amber-700 text-sm flex items-center p-2 bg-yellow-100 rounded">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                      Please select a column to continue
                    </div>
                  )}
                  <Label htmlFor="column-select" className="font-medium mb-2 block">
                    Select the column containing {notificationMethod === 'SMS' ? 'phone numbers' : 'email addresses'}:
                  </Label>
                  <div className="flex gap-2">
                    <Select value={selectedHeader} onValueChange={setSelectedHeader}>
                      <SelectTrigger id="column-select" className={`w-full py-5 text-base ${!selectedHeader ? 'border-yellow-400' : ''}`}>
                        <SelectValue placeholder="Select a column" />
                      </SelectTrigger>
                      <SelectContent>
                        {csvHeaders.map(header => (
                          <SelectItem key={header} value={header}>
                            {header}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button 
                      onClick={previewContacts} 
                      disabled={!selectedHeader || previewLoading}
                      className="whitespace-nowrap"
                    >
                      {previewLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        'Preview Contacts'
                      )}
                    </Button>
                  </div>
                </div>
                
                {/* Contacts preview */}
                {showPreview && contacts.length > 0 && (
                  <div className="border rounded-lg p-4 bg-green-50 border-green-200">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-medium text-green-800 flex items-center">
                        <CheckCircle className="h-5 w-5 mr-2 text-green-600" />
                        {contacts.length} valid {notificationMethod === 'SMS' ? 'phone numbers' : 'email addresses'} found
                      </h3>
                    </div>
                    
                    <div className="max-h-[200px] overflow-y-auto bg-white border border-green-100 rounded-lg p-2 mb-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                        {contacts.slice(0, 30).map((contact, i) => (
                          <div key={i} className="text-sm px-2 py-1 rounded odd:bg-gray-50">
                            {contact}
                          </div>
                        ))}
                      </div>
                      {contacts.length > 30 && (
                        <p className="text-xs text-center mt-2 text-gray-500">
                          + {contacts.length - 30} more {notificationMethod === 'SMS' ? 'phone numbers' : 'email addresses'}
                        </p>
                      )}
                    </div>
                    
                    <Button 
                      onClick={importContacts}
                      className="w-full bg-green-600 hover:bg-green-700 text-white"
                    >
                      <Check className="mr-2 h-4 w-4" />
                      Import {contacts.length} {notificationMethod === 'SMS' ? 'Phone Numbers' : 'Email Addresses'}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default RecipientsImportDialog; 
'use client'

import React, { useState, useRef, useEffect } from 'react';
import Papa from 'papaparse';
import { Trash2, Copy, Moon, Sun, Info, HelpCircle, RotateCcw, Download, Plus, Lightbulb, LinkIcon, Clipboard, ExternalLink, CheckCircle, AlertTriangle } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogTrigger 
} from "@/components/ui/dialog";
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, FileSpreadsheet, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/components/ui/use-toast';
import BatchFormPrefill from '@/components/BatchFormPrefill';
import LetterMode from '@/components/LetterMode';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Image from 'next/image';
import { cn, Theme, getTheme, setTheme, validateUrl, parseUrlParams, constructUrl } from '@/lib/utils';
import UsageGuide from "@/components/UsageGuide";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface Field {
  id: string;
  value: string;
  label: string;
}

interface SavedUrl {
  url: string;
  name: string;
  createdAt: string;
}

interface FormState {
  formUrl: string;
  fields: Field[];
}

interface ImportableField {
  id?: string;
  value: string;
  label?: string;
}

const CSVImportDialog: React.FC<{
  onImport: (fields: Field[]) => void;
}> = ({ onImport }) => {
  const [importedData, setImportedData] = useState<ImportableField[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      complete: (results) => {
        if (results.errors.length > 0) {
          toast({
            title: "CSV Parse Error",
            description: results.errors[0].message,
            variant: "destructive"
          });
          return;
        }

        const validData = results.data.filter(
          (row: any) => row.value && row.value.trim() !== ''
        ) as ImportableField[];

        if (validData.length === 0) {
          toast({
            title: "Invalid CSV",
            description: "No valid data found. Ensure 'value' column exists.",
            variant: "destructive"
          });
          return;
        }

        const formFields: Field[] = validData.map((item, index) => ({
          id: item.id && item.id.trim() !== '' ? item.id : `imported-${index}`,
          value: item.value,
          label: item.label || ''
        }));

        setImportedData(validData);
        onImport(formFields);
        toast({
          description: `Imported ${formFields.length} fields successfully`,
        });
      },
      error: (error) => {
        toast({
          title: "CSV Import Error",
          description: error.message,
          variant: "destructive"
        });
      }
    });
  };

  const handleClearImport = () => {
    setImportedData([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const exampleCSVTemplate = `id,value,label
672883d1aa22e8a167d22f56,John Doe,Full Name
5f8e4d2c1a3b7c9e6d2f1a3b,john.doe@example.com,Email Address
1a2b3c4d5e6f7g8h9i0j1k2l,+1 (555) 123-4567,Phone Number
,Singapore,Country
,123 Main Street,Address`;

  const downloadTemplate = () => {
    const blob = new Blob([exampleCSVTemplate], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'prefill_template.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" id="csvImportButton" className="hidden">
          <FileSpreadsheet className="mr-2 h-4 w-4" />
          Import CSV
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Import Fields from CSV</DialogTitle>
          <DialogDescription>
            Upload a CSV file to auto-populate form fields
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="bg-gradient-to-r from-blue-50/80 to-blue-50 p-4 rounded-lg border border-blue-100 mb-2">
            <div className="flex items-start">
              <div className="bg-blue-100 p-2 rounded-full mr-3 flex-shrink-0">
                <Lightbulb className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <h3 className="font-medium text-blue-800 mb-1 text-sm">CSV Import Guide</h3>
                <p className="text-xs text-blue-700">
                  Your CSV file should have these columns:
                </p>
                <ul className="mt-1 space-y-1 text-xs text-blue-700 list-disc pl-4">
                  <li><span className="font-semibold">id</span> - The field ID from FormSG (optional)</li>
                  <li><span className="font-semibold">value</span> - The data to pre-fill (required)</li>
                  <li><span className="font-semibold">label</span> - A description of the field (optional)</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input 
              type="file" 
              accept=".csv" 
              ref={fileInputRef}
              onChange={handleFileUpload}
              className="hidden" 
            />
            <Button 
              onClick={() => fileInputRef.current?.click()}
              className="bg-primary hover:bg-primary/90"
            >
              <Upload className="mr-2 h-4 w-4" />
              Select CSV File
            </Button>
            <Button 
              variant="outline" 
              onClick={downloadTemplate}
              className="border-primary/20 hover:bg-primary/5"
            >
              <Download className="mr-2 h-4 w-4" />
              Download Template
            </Button>
          </div>

          {importedData.length > 0 && (
            <div className="border rounded-lg p-4 bg-card">
              <div className="flex justify-between items-center mb-2">
                <h4 className="font-semibold flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                  Imported Fields ({importedData.length})
                </h4>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleClearImport}
                  className="h-8 text-xs border-destructive/20 hover:bg-destructive/10 text-destructive"
                >
                  <X className="mr-2 h-4 w-4" />
                  Clear
                </Button>
              </div>
              <div className="max-h-48 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left px-2 py-1 text-xs font-medium">ID</th>
                      <th className="text-left px-2 py-1 text-xs font-medium">Value</th>
                      <th className="text-left px-2 py-1 text-xs font-medium">Label</th>
                    </tr>
                  </thead>
                  <tbody>
                    {importedData.map((item, index) => (
                      <tr key={index} className="border-t hover:bg-muted/20">
                        <td className="px-2 py-1 text-xs">{item.id || <span className="text-muted-foreground italic">auto-generated</span>}</td>
                        <td className="px-2 py-1 text-xs">{item.value}</td>
                        <td className="px-2 py-1 text-xs">{item.label || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="bg-muted p-4 rounded-lg">
            <h4 className="font-semibold mb-2 flex items-center">
              <Info className="h-4 w-4 mr-2 text-primary" />
              CSV File Requirements
            </h4>
            <ul className="list-disc pl-5 text-sm space-y-1">
              <li>Must contain a <code className="bg-muted-foreground/20 px-1 rounded text-xs">value</code> column</li>
              <li><code className="bg-muted-foreground/20 px-1 rounded text-xs">Field ID</code> column is mandatory - if missing, IDs will be auto-generated</li>
              <li><code className="bg-muted-foreground/20 px-1 rounded text-xs">label</code> column is optional</li>
              <li>Supports comma-separated values (CSV)</li>
              <li>First row must be the header row</li>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const INITIAL_FIELD: Field = { id: '', value: '', label: '' };
const LOCAL_STORAGE_KEY = 'formPrefillState';
const SAVED_URLS_KEY = 'savedPrefillUrls';

// Main Form Prefill Guide Component
const FormPrefillGuide = () => {
  const [mounted, setMounted] = useState(false);
  const [theme, setCurrentTheme] = useState<Theme>('system');
  const [formUrl, setFormUrl] = useState('');
  const [fields, setFields] = useState<Field[]>([INITIAL_FIELD]);
  const [generatedUrl, setGeneratedUrl] = useState('');
  const [activeTab, setActiveTab] = useState('construct');
  const [history, setHistory] = useState<FormState[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [savedUrls, setSavedUrls] = useState<SavedUrl[]>([]);
  const [urlName, setUrlName] = useState('');
  const [isUrlNameHighlighted, setIsUrlNameHighlighted] = useState(false);
  const [selectedUrlIndex, setSelectedUrlIndex] = useState<number | null>(null);
  const nameUrlInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
    const savedTheme = getTheme();
    setCurrentTheme(savedTheme);
    
    // Load saved state
    const savedState = localStorage.getItem(LOCAL_STORAGE_KEY);
    const savedUrlsStr = localStorage.getItem(SAVED_URLS_KEY);
    
    if (savedState) {
      try {
        const { formUrl: savedUrl, fields: savedFields } = JSON.parse(savedState);
        setFormUrl(savedUrl);
        setFields(savedFields);
      } catch (error) {
        console.error('Error loading saved state:', error);
      }
    }

    if (savedUrlsStr) {
      try {
        setSavedUrls(JSON.parse(savedUrlsStr));
      } catch (error) {
        console.error('Error loading saved URLs:', error);
      }
    }
  }, []);

  useEffect(() => {
    if (mounted) {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify({ formUrl, fields }));
      localStorage.setItem(SAVED_URLS_KEY, JSON.stringify(savedUrls));
    }
  }, [formUrl, fields, savedUrls, mounted]);

  const handleThemeChange = (newTheme: Theme) => {
    setCurrentTheme(newTheme);
    setTheme(newTheme);
  };

  const deleteSavedUrl = (index: number) => {
    setSavedUrls(prevUrls => {
      if (index < 0 || index >= prevUrls.length) {
        return prevUrls; // Index out of bounds
      }
      
      // Get the name for the toast message
      const deletedUrlName = prevUrls[index].name;
      
      // Create a new array without the deleted URL
      const newUrls = [...prevUrls];
      newUrls.splice(index, 1);
      
      // Show success toast with the name
      toast({
        title: "URL Deleted",
        description: `"${deletedUrlName}" has been removed from your saved URLs.`,
        variant: "default",
      });
      
      return newUrls;
    });
  };

  const clearAllUrls = () => {
    setSavedUrls([]);
    toast({
      description: "All saved URLs cleared successfully",
    });
  };

  const saveGeneratedUrl = () => {
    if (!generatedUrl) return;
    
    if (!urlName.trim()) {
      toast({
        title: "Name Required",
        description: "Please give your URL a descriptive name before saving.",
        variant: "destructive",
      });
      
      if (nameUrlInputRef.current) {
        nameUrlInputRef.current.focus();
      }
      setIsUrlNameHighlighted(true);
      return;
    }
    
    const newSavedUrl: SavedUrl = {
      url: generatedUrl,
      name: urlName.trim(),
      createdAt: new Date().toISOString(),
    };
    
    setSavedUrls(prev => [newSavedUrl, ...prev]);
    setUrlName('');
    setIsUrlNameHighlighted(false);
    
    toast({
      title: "URL Saved",
      description: `"${newSavedUrl.name}" has been added to your saved URLs.`,
    });
  };

  const exportUrls = (format: 'csv' | 'xlsx') => {
    if (savedUrls.length === 0) {
      toast({
        description: "No URLs to export",
        variant: "destructive",
      });
      return;
    }

    const headers = ['Name', 'URL', 'Created At'];
    const rows = savedUrls.map(url => [
      url.name,
      url.url,
      new Date(url.createdAt).toLocaleString()
    ]);

    if (format === 'csv') {
      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'prefill-urls.csv';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }

    toast({
      description: `URLs exported as ${format.toUpperCase()}`,
    });
  };

  const addToHistory = (state: FormState) => {
    setHistory(prev => [...prev.slice(0, historyIndex + 1), state]);
    setHistoryIndex(prev => prev + 1);
  };

  const undo = () => {
    if (historyIndex > 0) {
      const previousState = history[historyIndex - 1];
      setFormUrl(previousState.formUrl);
      setFields(previousState.fields);
      setHistoryIndex(prev => prev - 1);
    }
  };

  const addField = () => {
    const newFields = [...fields, INITIAL_FIELD];
    setFields(newFields);
    addToHistory({ formUrl, fields: newFields });
  };

  const removeField = (index: number) => {
    if (fields.length > 1) {
      const newFields = fields.filter((_, i) => i !== index);
      setFields(newFields);
      addToHistory({ formUrl, fields: newFields });
    } else {
      toast({
        description: "At least one field is required",
        variant: "destructive",
      });
    }
  };

  const clearAllFields = () => {
    setFormUrl('');
    setFields([INITIAL_FIELD]);
    setGeneratedUrl('');
    setUrlName('');
    addToHistory({ formUrl: '', fields: [INITIAL_FIELD] });
    
    toast({
      description: "All fields cleared",
    });
  };

  const handleCSVImport = (importedFields: Field[]) => {
    setFields(importedFields);
    setActiveTab('construct');
    addToHistory({ formUrl, fields: importedFields });
  };

  const updateField = (index: number, key: keyof Field, value: string) => {
    const newFields = fields.map((field, i) => 
      i === index ? { ...field, [key]: value } : field
    );
    setFields(newFields);
  };

  const suggestUrlName = (): string => {
    // Try to create a meaningful name from the fields
    const labeledFields = fields.filter(f => f.label && f.label.trim() !== '');
    
    if (labeledFields.length > 0) {
      // Try to find a field labeled like "name" or "full name"
      const nameField = labeledFields.find(f => 
        f.label.toLowerCase().includes('name') && 
        f.value.trim() !== ''
      );
      
      if (nameField) {
        return `Form for ${nameField.value}`;
      }
      
      // Or use the first labeled field with a value
      const firstField = labeledFields.find(f => f.value.trim() !== '');
      if (firstField) {
        return `${firstField.label}: ${firstField.value}`;
      }
    }
    
    // Fallback: use the domain name from the URL
    try {
      const domain = new URL(formUrl).hostname.replace('www.', '');
      return `${domain.split('.')[0].charAt(0).toUpperCase() + domain.split('.')[0].slice(1)} Form`;
    } catch {
      return `Prefill URL ${new Date().toLocaleTimeString()}`;
    }
  };

  const generateUrl = () => {
    if (!validateUrl(formUrl)) {
      toast({
        title: "Error",
        description: "Please enter a valid form URL",
        variant: "destructive",
      });
      return;
    }

    try {
      const finalUrl = constructUrl(formUrl, fields);
      if (!finalUrl) {
        toast({
          title: "Error",
          description: "Please add at least one field with ID and value",
          variant: "destructive",
        });
        return;
      }

      setGeneratedUrl(finalUrl);
      navigator.clipboard.writeText(finalUrl);
      
      // Suggest a name for the URL
      const suggestedName = suggestUrlName();
      setUrlName(suggestedName);
      
      // Show toast with suggestion to name the URL
      toast({
        title: "URL Generated",
        description: "Your pre-filled URL is ready! Give it a name to save it for later use.",
        action: (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => {
              if (nameUrlInputRef.current) {
                nameUrlInputRef.current.focus();
                nameUrlInputRef.current.select();
              }
              setIsUrlNameHighlighted(true);
            }}
            className="h-8 border-primary/20 hover:bg-primary/5 text-xs"
          >
            Name URL
          </Button>
        ),
        duration: 5000,
      });
      
      // Highlight the name field
      setIsUrlNameHighlighted(true);
      
      // Focus on the name input field
      setTimeout(() => {
        if (nameUrlInputRef.current) {
          nameUrlInputRef.current.focus();
          nameUrlInputRef.current.select();
        }
      }, 500);
      
      addToHistory({ formUrl, fields });
    } catch (error) {
      console.error("URL generation error:", error);
      toast({
        title: "Error",
        description: "Failed to generate URL. Please check your inputs and try again.",
        variant: "destructive",
      });
    }
  };

  const deconstructUrl = (url: string) => {
    if (!url) return;

    const result = parseUrlParams(url);
    if (!result) {
      toast({
        title: "Error",
        description: "Please enter a valid URL",
        variant: "destructive",
      });
      return;
    }

    const newFields = result.params.length ? result.params : [INITIAL_FIELD];
    setFormUrl(result.baseUrl);
    setFields(newFields);
    setActiveTab('construct');
    addToHistory({ formUrl: result.baseUrl, fields: newFields });
    
    toast({
      title: "Success",
      description: "URL deconstructed successfully",
    });
  };

  if (!mounted) return null;

  return (
    <div className={cn(
      "min-h-screen p-6",
      "bg-background text-foreground",
      "transition-colors duration-300"
    )}>
      <div className="max-w-4xl mx-auto">
        <header className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <Image
              src="/logo.png"
              alt="Logo"
              width={40}
              height={40}
              className="rounded-lg"
            />
            <h1 className="text-2xl font-bold">Fillable</h1>
          </div>
          <div className="flex gap-2">
            <UsageGuide />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon">
                  {theme === 'dark' || (theme === 'system' && getTheme() === 'dark') ? (
                    <Moon className="h-4 w-4" />
                  ) : (
                    <Sun className="h-4 w-4" />
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleThemeChange('light')}>
                  <Sun className="mr-2 h-4 w-4" />
                  Light
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleThemeChange('dark')}>
                  <Moon className="mr-2 h-4 w-4" />
                  Dark
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleThemeChange('system')}>
                  <HelpCircle className="mr-2 h-4 w-4" />
                  System
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <Card className="mb-6">
          <CardHeader className="bg-gradient-to-r from-primary/10 to-blue-500/10 rounded-t-lg">
            <CardTitle className="flex items-center">
              <FileSpreadsheet className="mr-3 h-5 w-5 text-primary" />
              What is Form Pre-filling?
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <Alert className="border-l-4 border-l-primary bg-primary/5">
              <Info className="h-4 w-4 text-primary" />
              <AlertDescription className="text-foreground">
                Pre-filling allows you to <span className="font-medium">populate form fields automatically</span> by adding parameters to the form's URL.
                This is useful for customer service, surveys, and any situation where some information is known in advance.
              </AlertDescription>
            </Alert>

            <div className="mt-5 space-y-4">
              <h3 className="text-lg font-semibold text-primary flex items-center">
                <Info className="mr-2 h-4 w-4" />
                Key Benefits:
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-muted/20 p-3 rounded-lg border flex items-start">
                  <div className="bg-primary/10 rounded-full p-1 mr-2">
                    <svg className="h-4 w-4 text-primary" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"/>
                      <polyline points="12 6 12 12 16 14"/>
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-sm">Saves Time</p>
                    <p className="text-xs text-muted-foreground">Users don't need to manually fill in known information</p>
                  </div>
                </div>
                <div className="bg-muted/20 p-3 rounded-lg border flex items-start">
                  <div className="bg-primary/10 rounded-full p-1 mr-2">
                    <svg className="h-4 w-4 text-primary" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                      <polyline points="22 4 12 14.01 9 11.01"/>
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-sm">Reduces Errors</p>
                    <p className="text-xs text-muted-foreground">Pre-filled data is more accurate than manual entry</p>
                  </div>
                </div>
                <div className="bg-muted/20 p-3 rounded-lg border flex items-start">
                  <div className="bg-primary/10 rounded-full p-1 mr-2">
                    <svg className="h-4 w-4 text-primary" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 20h9"/>
                      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-sm">Improves Completion</p>
                    <p className="text-xs text-muted-foreground">More forms get completed when they're partially filled</p>
                  </div>
                </div>
                <div className="bg-muted/20 p-3 rounded-lg border flex items-start">
                  <div className="bg-primary/10 rounded-full p-1 mr-2">
                    <svg className="h-4 w-4 text-primary" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                      <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
                      <line x1="12" y1="22.08" x2="12" y2="12"/>
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-sm">Customizable</p>
                    <p className="text-xs text-muted-foreground">Create different URLs for different scenarios</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 bg-blue-50 p-3 rounded-lg border border-blue-100">
              <div className="flex items-start">
                <Info className="h-4 w-4 text-blue-600 mt-0.5 mr-2" />
                <div>
                  <p className="text-sm text-blue-800 font-medium">How to Get Started</p>
                  <p className="text-xs text-blue-700 mt-1">
                    Choose one of the tabs below to start working with pre-filled forms. Use <span className="font-medium">Construct Mode</span> to create a pre-filled URL, <span className="font-medium">Deconstruct Mode</span> to analyze an existing URL, or <span className="font-medium">Batch Mode</span> for bulk creation.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex justify-between items-center">
              <span>URL Generator</span>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={undo}
                  disabled={historyIndex <= 0}
                  title="Undo last action"
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="mb-4 bg-muted p-1 rounded-full">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <TabsTrigger 
                        value="construct" 
                        className="
                          data-[state=active]:bg-primary 
                          data-[state=active]:text-primary-foreground 
                          data-[state=active]:shadow-sm
                          rounded-full
                          px-4
                          transition-all
                          duration-300
                        "
                      >
                        <span className="flex items-center">
                          <Plus className="h-3.5 w-3.5 mr-1.5" />
                          Construct Mode
                        </span>
                      </TabsTrigger>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      <p className="text-xs">Create a pre-filled URL from scratch</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <TabsTrigger 
                        value="deconstruct" 
                        className="
                          data-[state=active]:bg-primary 
                          data-[state=active]:text-primary-foreground 
                          data-[state=active]:shadow-sm
                          rounded-full
                          px-4
                          transition-all
                          duration-300
                        "
                      >
                        <span className="flex items-center">
                          <svg className="h-3.5 w-3.5 mr-1.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5z"></path>
                            <line x1="16" y1="8" x2="2" y2="22"></line>
                            <line x1="17.5" y1="15" x2="9" y2="15"></line>
                          </svg>
                          Deconstruct Mode
                        </span>
                      </TabsTrigger>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      <p className="text-xs">Analyze and modify an existing pre-filled URL</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <TabsTrigger 
                        value="batch"
                        className="
                          data-[state=active]:bg-primary 
                          data-[state=active]:text-primary-foreground 
                          data-[state=active]:shadow-sm
                          rounded-full
                          px-4
                          transition-all
                          duration-300
                        "
                      > 
                        <span className="flex items-center">
                          <FileSpreadsheet className="h-3.5 w-3.5 mr-1.5" />
                          Batch Mode
                        </span>
                      </TabsTrigger>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      <p className="text-xs">Generate multiple pre-filled URLs from CSV data</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <TabsTrigger 
                        value="letterMode"
                        className="
                          data-[state=active]:bg-primary 
                          data-[state=active]:text-primary-foreground 
                          data-[state=active]:shadow-sm
                          rounded-full
                          px-4
                          transition-all
                          duration-300
                        "
                      >
                        <span className="flex items-center">
                          <svg className="h-3.5 w-3.5 mr-1.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                        </svg>
                          Letter Generator
                        </span>
                      </TabsTrigger>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      <p className="text-xs">Generate pre-filled templates for letters and communications</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </TabsList>

              <TabsContent value="construct" className="space-y-6">
                {/* Mode description and explanatory panel */}
                <div className="bg-gradient-to-r from-blue-50/80 to-blue-50 p-4 rounded-lg border border-blue-100 mb-2 shadow-sm">
                  <div className="flex items-start">
                    <div className="bg-blue-100 p-2 rounded-full mr-3 flex-shrink-0">
                      <Lightbulb className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-medium text-blue-800 mb-1 text-base">Construct Mode Guide</h3>
                      <p className="text-sm text-blue-700">
                        Create a pre-filled form URL by following these steps:
                      </p>
                      <div className="mt-3 space-y-2">
                        <div className="flex items-center">
                          <div className="bg-blue-200 rounded-full h-5 w-5 flex items-center justify-center mr-2">
                            <span className="text-xs font-semibold text-blue-800">1</span>
                          </div>
                          <p className="text-xs text-blue-800">Enter your form's base URL</p>
                        </div>
                        <div className="flex items-center">
                          <div className="bg-blue-200 rounded-full h-5 w-5 flex items-center justify-center mr-2">
                            <span className="text-xs font-semibold text-blue-800">2</span>
                          </div>
                          <p className="text-xs text-blue-800">Add form fields with their IDs and values</p>
                        </div>
                        <div className="flex items-center">
                          <div className="bg-blue-200 rounded-full h-5 w-5 flex items-center justify-center mr-2">
                            <span className="text-xs font-semibold text-blue-800">3</span>
                          </div>
                          <p className="text-xs text-blue-800">Generate and use your pre-filled URL</p>
                        </div>
                      </div>
                      <div className="mt-2 bg-blue-100/60 rounded p-2">
                        <div className="flex items-start">
                          <Info className="h-4 w-4 text-blue-600 mt-0.5 mr-2 flex-shrink-0" />
                          <p className="text-xs text-blue-700">Need field IDs? Use <span className="font-semibold">Deconstruct Mode</span> to extract them from existing forms.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Step 1: Form URL Section */}
                <div className="bg-white p-5 rounded-lg border shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-primary"></div>
                  <div className="flex items-center mb-4">
                    <div className="bg-primary/90 text-white rounded-full h-8 w-8 flex items-center justify-center mr-3 shadow-sm">
                      <span className="font-semibold">1</span>
                    </div>
                    <h3 className="font-medium text-lg">Enter Form URL</h3>
                  </div>
                  
                  <div className="space-y-3 ml-11">
                    <div className="relative">
                      <label htmlFor="formUrl" className="block text-sm font-medium mb-1 flex items-center">
                        <span>Form URL</span> 
                        <span className="text-red-500 ml-1">*</span>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <HelpCircle className="h-3.5 w-3.5 ml-1.5 text-muted-foreground cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              <p>This is the base URL of your FormSG form. You can find it in your browser when viewing the form.</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </label>
                      <div className="flex gap-2">
                        <div className="flex-1 relative">
                          <Input
                            id="formUrl"
                            placeholder="Enter form URL (e.g., https://form.gov.sg/67488b8b1210a416d2d7cb5b)"
                            value={formUrl}
                            onChange={(e) => setFormUrl(e.target.value)}
                            aria-label="Form URL"
                            className="pr-10 border-primary/20 focus-visible:ring-primary/30"
                          />
                          <div className="absolute right-3 top-[50%] transform -translate-y-1/2 pointer-events-none">
                            <LinkIcon className="h-4 w-4 text-muted-foreground" />
                          </div>
                        </div>
                        <Button 
                          variant="outline" 
                          className="border-primary/20 hover:bg-primary/5"
                          onClick={() => {
                            // Add paste functionality if needed
                          }}
                          type="button"
                        >
                          <Clipboard className="h-4 w-4 mr-1" />
                          Paste
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        <span className="text-amber-600">Tip:</span> Make sure to include the full URL including "https://"
                      </p>
                    </div>
                  </div>
                </div>

                {/* Step 2: Form Fields Section */}
                <div className="bg-white p-5 rounded-lg border shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-primary"></div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center">
                      <div className="bg-primary/90 text-white rounded-full h-8 w-8 flex items-center justify-center mr-3 shadow-sm">
                        <span className="font-semibold">2</span>
                      </div>
                      <h3 className="font-medium text-lg">Add Form Fields</h3>
                    </div>
                    <div className="flex gap-2">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={clearAllFields}
                              className="h-8 text-xs border-destructive/20 hover:bg-destructive/10 text-destructive"
                            >
                              <X className="h-3.5 w-3.5 mr-1" />
                              Clear All
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Remove all fields and start fresh</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                // Same functionality as CSVImportDialog
                                const csvButton = document.getElementById('csvImportButton');
                                if (csvButton) {
                                  csvButton.click();
                                }
                              }}
                              className="h-8 text-xs border-primary/20 hover:bg-primary/5"
                            >
                              <FileSpreadsheet className="h-3.5 w-3.5 mr-1" />
                              Import from CSV
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Import multiple fields from a CSV file</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <CSVImportDialog onImport={handleCSVImport} />
                    </div>
                  </div>

                  <div className="bg-gradient-to-r from-amber-50 to-amber-50/60 p-3 rounded-md border border-amber-100 mb-4 ml-11">
                    <div className="flex items-start">
                      <div className="bg-amber-100 p-1 rounded-full mr-2 flex-shrink-0">
                        <HelpCircle className="h-4 w-4 text-amber-600" />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-amber-800">
                          How to find Field IDs:
                        </p>
                        <ol className="list-decimal text-xs mt-1 ml-4 text-amber-700 space-y-0.5">
                          <li>In FormSG, enable pre-filling for a short answer field</li>
                          <li>Click on the field to copy its 24-character ID</li>
                          <li>Or use <span className="font-semibold">Deconstruct Mode</span> to extract IDs from an existing form URL</li>
                        </ol>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4 ml-11">
                    {fields.length === 0 ? (
                      <div className="border border-dashed rounded-md p-6 flex flex-col items-center justify-center text-center bg-muted/10">
                        <FileSpreadsheet className="h-10 w-10 text-muted-foreground mb-2 opacity-70" />
                        <h4 className="text-base font-medium text-foreground mb-1">No Fields Added Yet</h4>
                        <p className="text-sm text-muted-foreground mb-3">Add fields to pre-fill in your form</p>
                        <Button 
                          onClick={addField}
                          size="sm"
                          className="bg-primary hover:bg-primary/90"
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Add First Field
                        </Button>
                      </div>
                    ) : (
                      fields.map((field, index) => (
                        <div 
                          key={index} 
                          className="grid grid-cols-12 gap-3 p-4 rounded-md border bg-card hover:bg-muted/5 transition-colors relative group shadow-sm"
                        >
                          <div className="absolute -top-2.5 -left-1 bg-primary text-primary-foreground text-xs rounded-full px-2 py-0.5 font-medium shadow-sm">
                            Field #{index + 1}
                          </div>
                          <div className="col-span-5 sm:col-span-4">
                            <label className="text-xs font-medium mb-1 flex items-center">
                              <span>Field ID</span>
                              <span className="text-red-500 ml-0.5">*</span>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <HelpCircle className="h-3 w-3 ml-1 cursor-help" />
                                  </TooltipTrigger>
                                  <TooltipContent side="top">
                                    <p className="text-xs">The unique 24-character ID for this field in FormSG</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </label>
                            <Input
                              placeholder="e.g., 672883d1aa22e8a167d22f56"
                              value={field.id}
                              onChange={(e) => updateField(index, 'id', e.target.value)}
                              aria-label={`Field ${index + 1} ID`}
                              className="h-9 text-sm border-primary/20 focus-visible:ring-primary/30"
                            />
                          </div>
                          <div className="col-span-5 sm:col-span-4">
                            <label className="text-xs font-medium mb-1 flex items-center">
                              <span>Value</span>
                              <span className="text-red-500 ml-0.5">*</span>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <HelpCircle className="h-3 w-3 ml-1 cursor-help" />
                                  </TooltipTrigger>
                                  <TooltipContent side="top">
                                    <p className="text-xs">The data that will be pre-filled in this field</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </label>
                            <Input
                              placeholder="e.g., John Doe"
                              value={field.value}
                              onChange={(e) => updateField(index, 'value', e.target.value)}
                              aria-label={`Field ${index + 1} Value`}
                              className="h-9 text-sm border-primary/20 focus-visible:ring-primary/30"
                            />
                          </div>
                          <div className="col-span-2 sm:col-span-3">
                            <div className="flex justify-between items-start h-full">
                              <div className="flex-grow">
                                <label className="text-xs text-muted-foreground mb-1 block">
                                  Label <span className="text-xs text-muted-foreground">(optional)</span>
                                </label>
                                <Input
                                  placeholder="e.g., Full Name"
                                  value={field.label}
                                  onChange={(e) => updateField(index, 'label', e.target.value)}
                                  aria-label={`Field ${index + 1} Label`}
                                  className="h-9 text-sm border-primary/20 focus-visible:ring-primary/30"
                                />
                              </div>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        removeField(index);
                                      }}
                                      aria-label={`Remove field ${index + 1}`}
                                      className="ml-1 h-9 w-9 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent side="left">
                                    <p className="text-xs">Remove this field</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                          </div>
                        </div>
                      ))
                    )}

                    {fields.length > 0 && (
                      <Button 
                        onClick={addField} 
                        variant="outline" 
                        className="w-full border-dashed border-primary/40 hover:bg-primary/5 mt-3"
                      >
                        <Plus className="h-4 w-4 mr-2 text-primary" />
                        <span className="text-primary">Add Another Field</span>
                      </Button>
                    )}
                  </div>

                  <div className="text-xs text-muted-foreground mt-3 flex items-start">
                    <Info className="h-3 w-3 mt-0.5 mr-1.5 flex-shrink-0 text-primary" />
                    <span>Each field requires both an ID and a value. The label is optional and helps you remember what each field is for.</span>
                  </div>
                </div>

                {/* Step 3: Generate URL section */}
                <div className="bg-white p-5 rounded-lg border shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-primary"></div>
                  <div className="flex items-center mb-4">
                    <div className="bg-primary/90 text-white rounded-full h-8 w-8 flex items-center justify-center mr-3 shadow-sm">
                      <span className="font-semibold">3</span>
                    </div>
                    <h3 className="font-medium text-lg">Generate URL</h3>
                  </div>

                  <div className="ml-11">
                    <div className="flex flex-col items-center bg-muted/10 p-4 rounded-lg border mb-4">
                      <div className="mb-3 text-center">
                        <p className="text-sm mb-1">Ready to create your pre-filled form link?</p>
                        <p className="text-xs text-muted-foreground">Click the button below to generate a URL with all your field values</p>
                      </div>
                      
                      <Button
                        onClick={generateUrl}
                        disabled={!formUrl.trim() || fields.length === 0 || fields.some(f => !f.id.trim() || !f.value.trim())}
                        className="relative px-6 py-2 bg-primary hover:bg-primary/90 group"
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Generate Pre-filled URL
                      </Button>
                      
                      {(!formUrl.trim() || fields.length === 0 || fields.some(f => !f.id.trim() || !f.value.trim())) && (
                        <div className="mt-3 bg-amber-50 border border-amber-200 rounded-md p-2 text-xs text-amber-800 max-w-md text-center">
                          <AlertTriangle className="h-3.5 w-3.5 inline-block mr-1 text-amber-600" />
                          {!formUrl.trim() 
                            ? "Please enter a form URL first" 
                            : fields.length === 0 
                              ? "Add at least one field to pre-fill" 
                              : "Make sure all fields have both ID and value"}
                        </div>
                      )}
                    </div>

                    {generatedUrl && (
                      <div className="mt-4 border border-primary/30 rounded-md p-4 bg-gradient-to-r from-primary/5 to-primary/10 shadow-sm">
                        <div className="flex justify-between items-center mb-3">
                          <div className="flex items-center">
                            <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                            <h4 className="font-medium text-primary">Your Pre-filled URL is Ready!</h4>
                          </div>
                          <div className="flex gap-2">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      navigator.clipboard.writeText(generatedUrl);
                                      toast({
                                        description: "URL copied to clipboard",
                                      });
                                    }}
                                    aria-label="Copy generated URL"
                                    className="h-8 border-primary/30 text-primary hover:bg-primary/10"
                                  >
                                    <Copy className="h-3.5 w-3.5 mr-1.5" />
                                    Copy URL
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="text-xs">Copy the URL to clipboard</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button 
                                    size="sm" 
                                    variant="outline"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      window.open(generatedUrl, '_blank');
                                    }}
                                    className="h-8 border-primary/30 text-primary hover:bg-primary/10"
                                  >
                                    <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                                    Test URL
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="text-xs">Open the pre-filled form in a new tab</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        </div>
                        <div className="p-3 bg-white rounded border border-primary/20 break-all text-sm relative">
                          <div className="absolute top-0 right-0 bg-primary/10 text-primary text-xs px-2 py-0.5 rounded-bl">
                            URL
                          </div>
                          <p className="pr-8 pt-2">{generatedUrl}</p>
                        </div>
                        
                        <div className="mt-4 bg-blue-50 p-3 rounded-md border border-blue-100 text-xs">
                          <div className="flex items-start">
                            <Info className="h-4 w-4 text-blue-600 mt-0.5 mr-2 flex-shrink-0" />
                            <div>
                              <p className="font-medium text-blue-800 mb-1">What's next?</p>
                              <ul className="list-disc ml-4 text-blue-700 space-y-1">
                                <li>Share this URL to pre-fill the form for your recipients</li>
                                <li>Bookmark it for future use or add to your systems</li>
                                <li>Edit the fields above and regenerate if needed</li>
                              </ul>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* URL Exporter - Now only visible in Construct Mode */}
                <div className="mt-8 space-y-4 pt-6 border-t">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center">
                      <Download className="h-5 w-5 text-primary mr-2" />
                      <h3 className="text-lg font-semibold">URL Manager</h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="outline"
                              onClick={() => exportUrls('csv')}
                              disabled={savedUrls.length === 0}
                              title="Export all saved URLs as a CSV file"
                              className="text-xs h-8"
                            >
                              <Download className="h-3.5 w-3.5 mr-1.5" />
                              Export CSV
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="text-xs">Export all saved URLs to a CSV file</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      {savedUrls.length > 0 && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button 
                              variant="outline" 
                              size="sm"
                              title="Clear all saved URLs"
                              className="text-xs h-8 text-destructive border-destructive/20 hover:bg-destructive/10"
                            >
                              <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                              Clear All
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Clear all saved URLs?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This action cannot be undone. All your saved URLs will be permanently deleted.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={clearAllUrls}>
                                Clear All
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </div>

                  <Alert className="bg-blue-50 border-blue-100">
                    <Info className="h-4 w-4 text-blue-600" />
                    <AlertDescription className="text-blue-700">
                      Save and organize your generated URLs for future use. Give each URL a name to help you remember its purpose.
                    </AlertDescription>
                  </Alert>

                  {generatedUrl && (
                    <div className="space-y-4">
                      <div className="flex gap-2">
                        <div className={`relative flex-grow transition-all duration-300 ${isUrlNameHighlighted ? 'ring-2 ring-primary/50 rounded-md' : ''}`}>
                          <Input
                            ref={nameUrlInputRef}
                            placeholder="Give this URL a name (e.g., 'Customer Support Form')"
                            value={urlName}
                            onChange={(e) => {
                              setUrlName(e.target.value);
                              setIsUrlNameHighlighted(false);
                            }}
                            onFocus={() => setIsUrlNameHighlighted(true)}
                            onBlur={() => setIsUrlNameHighlighted(false)}
                            aria-label="URL name"
                            title="Enter a descriptive name for this URL to easily identify it later"
                            className="pr-8"
                          />
                          <FileSpreadsheet className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                        </div>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button 
                                onClick={() => {
                                  saveGeneratedUrl();
                                }}
                                title="Save this URL to your list"
                                className="whitespace-nowrap"
                                disabled={!urlName.trim()}
                              >
                                <Plus className="h-4 w-4 mr-1.5" />
                                Save URL
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="text-xs">Save this URL to your collection</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      {isUrlNameHighlighted && (
                        <div className="text-xs text-primary animate-pulse">
                          <CheckCircle className="h-3.5 w-3.5 inline-block mr-1.5" />
                          A descriptive name helps you find this URL later
                        </div>
                      )}
                    </div>
                  )}

                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h4 className="font-medium flex items-center">
                        <FileSpreadsheet className="h-4 w-4 mr-1.5 text-primary" />
                        Saved URLs ({savedUrls.length})
                      </h4>
                    </div>

                    {savedUrls.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-8 px-4 border border-dashed rounded-lg bg-muted/20 text-center">
                        <FileSpreadsheet className="h-10 w-10 text-muted-foreground mb-3 opacity-60" />
                        <h5 className="font-medium text-foreground mb-1">No saved URLs yet</h5>
                        <p className="text-sm text-muted-foreground max-w-md">
                          Generate a URL above and click "Save URL" to add it to your collection for easier access later.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {savedUrls.map((savedUrl, index) => (
                          <div
                            key={`saved-url-${index}-${savedUrl.createdAt}`}
                            className="p-4 bg-muted/20 border rounded-lg flex justify-between items-center group hover:bg-muted/30 transition-colors cursor-pointer relative"
                            onClick={() => setSelectedUrlIndex(index)}
                          >
                            {/* Overlay hint on hover */}
                            <div className="absolute inset-0 bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none rounded-lg">
                              <div className="bg-primary/90 text-white px-3 py-1.5 rounded-full text-xs font-medium shadow-sm">
                                Click to review
                              </div>
                            </div>
                            
                            <div className="space-y-1 flex-1 mr-4">
                              <div className="font-medium flex items-center text-primary">
                                <FileSpreadsheet className="h-3.5 w-3.5 mr-1.5 text-primary" />
                                {savedUrl.name}
                              </div>
                              <div 
                                className="text-sm text-muted-foreground truncate max-w-full"
                                title={savedUrl.url}
                              >
                                {savedUrl.url.length > 50 
                                  ? `${savedUrl.url.slice(0, 25)}...${savedUrl.url.slice(-25)}` 
                                  : savedUrl.url}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                Created: {new Date(savedUrl.createdAt).toLocaleString()}
                              </div>
                            </div>
                            <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      size="icon"
                                      variant="outline"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        navigator.clipboard.writeText(savedUrl.url);
                                        toast({
                                          description: "URL copied to clipboard",
                                        });
                                      }}
                                      className="h-8 w-8"
                                    >
                                      <Copy className="h-3.5 w-3.5" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p className="text-xs">Copy URL to clipboard</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          size="icon"
                                          variant="outline"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            deleteSavedUrl(index);
                                            setSelectedUrlIndex(null);
                                          }}
                                          className="h-8 w-8 text-destructive hover:bg-destructive/10 border-destructive/20"
                                        >
                                          <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p className="text-xs">Delete this saved URL</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete this saved URL?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      This action cannot be undone. The URL "{savedUrl.name}" will be permanently deleted.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction 
                                      onClick={() => {
                                        deleteSavedUrl(index);
                                        setSelectedUrlIndex(null);
                                      }}
                                    >
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="deconstruct" className="space-y-4">
                <div className="bg-gradient-to-r from-blue-50/80 to-blue-50 p-4 rounded-lg border border-blue-100 mb-4">
                  <div className="flex items-start">
                    <div className="bg-blue-100 p-2 rounded-full mr-3 flex-shrink-0">
                      <Lightbulb className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-medium text-blue-800 mb-1 text-sm">Deconstruct Mode Guide</h3>
                      <p className="text-xs text-blue-700">
                        Paste a pre-filled URL to analyze and extract its field IDs and values. This helps you understand how URLs are structured and reuse field IDs.
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <label htmlFor="prefilledUrl" className="block mb-2 font-medium">Pre-filled URL</label>
                  <Input
                    id="prefilledUrl"
                    placeholder="Paste pre-filled URL to deconstruct"
                    onChange={(e) => deconstructUrl(e.target.value)}
                    aria-label="Pre-filled URL"
                    className="border-primary/20 focus-visible:ring-primary/30"
                  />
                </div>

                <div className="bg-muted/20 p-4 rounded-lg border mt-4">
                  <h4 className="font-medium mb-2 flex items-center">
                    <Info className="h-4 w-4 mr-2 text-primary" />
                    Example URL
                  </h4>
                  <div className="bg-white p-3 rounded border border-primary/20 text-xs break-all">
                    <p className="font-medium text-primary mb-1">Try this example:</p>
                    <a 
                      href="https://form.gov.sg/67488b8b1210a416d2d7cb5b?67488bb37e8c75e33b9f9191=Tan%20Ah%20Kow&67488f8e088e833537af24aa=Tan_ah_kow%40agency.gov.sg&67488f2425bc895113f36755=H123456&67488f4706223a28046116b7=Human%20Resource&67488fa4961741ba92f3d064=Artificial%20Intelligence%20%231&674890985ff109b4e0969bfd=%241234.00&6748910f1210a416d2d81521=09%2F12%2F24&6748918845919bff0a00bcb6=10%2F12%2F24"
                      className="text-blue-600 hover:text-blue-800 hover:underline flex items-center"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      https://form.gov.sg/67488b8b1210a416d2d7cb5b?67488bb37e8c75e33b9f9191=Tan%20Ah%20Kow&67488f8e088e833537af24aa=Tan_ah_kow%40agency.gov.sg&67488f2425bc895113f36755=H123456&67488f4706223a28046116b7=Human%20Resource&67488fa4961741ba92f3d064=Artificial%20Intelligence%20%231&674890985ff109b4e0969bfd=%241234.00&6748910f1210a416d2d81521=09%2F12%2F24&6748918845919bff0a00bcb6=10%2F12%2F24
                    </a>
                  </div>
                  <div className="mt-3 space-y-2">
                    <div className="flex items-start">
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText("https://form.gov.sg/67488b8b1210a416d2d7cb5b?67488bb37e8c75e33b9f9191=Tan%20Ah%20Kow&67488f8e088e833537af24aa=Tan_ah_kow%40agency.gov.sg&67488f2425bc895113f36755=H123456&67488f4706223a28046116b7=Human%20Resource&67488fa4961741ba92f3d064=Artificial%20Intelligence%20%231&674890985ff109b4e0969bfd=%241234.00&6748910f1210a416d2d81521=09%2F12%2F24&6748918845919bff0a00bcb6=10%2F12%2F24");
                          toast({
                            description: "Example URL copied to clipboard",
                          });
                        }}
                        className="text-xs flex items-center text-primary hover:text-primary/80 bg-primary/5 rounded-full px-3 py-1.5"
                      >
                        <Copy className="h-3.5 w-3.5 mr-1.5" />
                        Copy Example URL
                      </button>
                      <button
                        onClick={() => deconstructUrl("https://form.gov.sg/67488b8b1210a416d2d7cb5b?67488bb37e8c75e33b9f9191=Tan%20Ah%20Kow&67488f8e088e833537af24aa=Tan_ah_kow%40agency.gov.sg&67488f2425bc895113f36755=H123456&67488f4706223a28046116b7=Human%20Resource&67488fa4961741ba92f3d064=Artificial%20Intelligence%20%231&674890985ff109b4e0969bfd=%241234.00&6748910f1210a416d2d81521=09%2F12%2F24&6748918845919bff0a00bcb6=10%2F12%2F24")}
                        className="text-xs flex items-center text-primary hover:text-primary/80 bg-primary/5 rounded-full px-3 py-1.5 ml-2"
                      >
                        <FileSpreadsheet className="h-3.5 w-3.5 mr-1.5" />
                        Try with Example
                      </button>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground mt-3">
                    <p>This example contains pre-filled values for:</p>
                    <ul className="list-disc pl-5 mt-1 space-y-0.5">
                      <li>Name, Email, ID number</li>
                      <li>Department, Project</li>
                      <li>Budget amount</li>
                      <li>Start date, End date</li>
                    </ul>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="batch" className="space-y-4">
              <BatchFormPrefill />
              </TabsContent>
              <TabsContent value="letterMode" className="space-y-4">
              <LetterMode />
              </TabsContent> 
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* URL Review Dialog */}
      <Dialog open={selectedUrlIndex !== null} onOpenChange={(open) => !open && setSelectedUrlIndex(null)}>
        {selectedUrlIndex !== null && selectedUrlIndex >= 0 && savedUrls[selectedUrlIndex] ? (
          <DialogContent className="sm:max-w-[550px]">
            <DialogHeader>
              <DialogTitle className="flex items-center">
                <FileSpreadsheet className="h-5 w-5 mr-2 text-primary" />
                {savedUrls[selectedUrlIndex].name}
              </DialogTitle>
              <DialogDescription>
                Review the details of your saved URL
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-2">
              <div className="space-y-1">
                <div className="text-sm font-medium flex items-center">
                  <LinkIcon className="h-4 w-4 mr-1.5 text-primary" />
                  URL Details
                </div>
                <div className="p-3 bg-muted/20 rounded border text-sm break-all">
                  <a 
                    href={savedUrls[selectedUrlIndex].url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 hover:underline flex items-center"
                  >
                    {savedUrls[selectedUrlIndex].url}
                    <ExternalLink className="h-3.5 w-3.5 ml-1 inline-flex" />
                  </a>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm font-medium flex items-center">
                    <Info className="h-4 w-4 mr-1.5 text-primary" />
                    Created
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {new Date(savedUrls[selectedUrlIndex].createdAt).toLocaleString()}
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium flex items-center">
                    <CheckCircle className="h-4 w-4 mr-1.5 text-primary" /> 
                    Actions
                  </div>
                  <div className="flex gap-2 mt-1">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="h-8"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigator.clipboard.writeText(savedUrls[selectedUrlIndex].url);
                        toast({
                          description: "URL copied to clipboard",
                        });
                      }}
                    >
                      <Copy className="h-3.5 w-3.5 mr-1.5" />
                      Copy URL
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="h-8"
                      onClick={(e) => {
                        e.stopPropagation();
                        window.open(savedUrls[selectedUrlIndex].url, '_blank');
                      }}
                    >
                      <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                      Open
                    </Button>
                  </div>
                </div>
              </div>
              
              <div className="pt-3 border-t mt-3">
                <div className="text-sm font-medium flex items-center text-destructive">
                  <AlertTriangle className="h-4 w-4 mr-1.5" />
                  Danger Zone
                </div>
                <p className="text-xs text-muted-foreground mb-2 mt-1">
                  Once deleted, this URL will be removed from your collection and cannot be recovered.
                </p>
                
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm" className="mt-1">
                      <Trash2 className="h-4 w-4 mr-1.5" />
                      Delete URL
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete this saved URL?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. The URL "{savedUrls[selectedUrlIndex].name}" will be permanently deleted.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction 
                        onClick={() => {
                          if (selectedUrlIndex !== null) {
                            deleteSavedUrl(selectedUrlIndex);
                            setSelectedUrlIndex(null);
                          }
                        }}
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </DialogContent>
        ) : (
          <DialogContent>
            <DialogHeader>
              <DialogTitle>URL Not Found</DialogTitle>
              <DialogDescription>
                The URL you're trying to review could not be found. It may have been deleted.
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end mt-4">
              <Button 
                variant="outline" 
                onClick={() => setSelectedUrlIndex(null)}
              >
                Close
              </Button>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
};

export default FormPrefillGuide;

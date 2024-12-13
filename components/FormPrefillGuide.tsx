'use client'

import React, { useState, useRef, useEffect } from 'react';
import Papa from 'papaparse';
import { Trash2, Copy, Moon, Sun, Info, HelpCircle, RotateCcw, Download, Plus } from 'lucide-react';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Image from 'next/image';
import { cn, Theme, getTheme, setTheme, validateUrl, parseUrlParams, constructUrl } from '@/lib/utils';
import UsageGuide from "@/components/UsageGuide";

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
          id: `imported-${index}`,
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

  const exampleCSVTemplate = `value,label
John Doe,Full Name
john.doe@example.com,Email Address
+1 (555) 123-4567,Phone Number`;

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
        <Button variant="outline">
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
            >
              <Upload className="mr-2 h-4 w-4" />
              Select CSV File
            </Button>
            <Button 
              variant="outline" 
              onClick={downloadTemplate}
            >
              Download Template
            </Button>
          </div>

          {importedData.length > 0 && (
            <div className="border rounded-lg p-4">
              <div className="flex justify-between items-center mb-2">
                <h4 className="font-semibold">Imported Fields</h4>
                <Button 
                  variant="destructive" 
                  size="sm"
                  onClick={handleClearImport}
                >
                  <X className="mr-2 h-4 w-4" />
                  Clear
                </Button>
              </div>
              <div className="max-h-48 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr>
                      <th className="text-left">Value</th>
                      <th className="text-left">Label</th>
                    </tr>
                  </thead>
                  <tbody>
                    {importedData.map((item, index) => (
                      <tr key={index} className="border-t">
                        <td>{item.value}</td>
                        <td>{item.label || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="bg-muted p-4 rounded-lg">
            <h4 className="font-semibold mb-2">CSV File Requirements</h4>
            <ul className="list-disc pl-5 text-sm space-y-1">
              <li>Must contain a 'value' column</li>
              <li>'label' column is optional</li>
              <li>Supports comma-separated values</li>
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
    setSavedUrls(prev => prev.filter((_, i) => i !== index));
    toast({
      description: "URL deleted successfully",
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
    
    const newSavedUrl: SavedUrl = {
      url: generatedUrl,
      name: urlName || `Prefill URL ${savedUrls.length + 1}`,
      createdAt: new Date().toISOString(),
    };
    
    setSavedUrls(prev => [newSavedUrl, ...prev]);
    setUrlName('');
    
    toast({
      description: "URL saved successfully",
    });
  };

  const exportUrls = (format: 'csv' | 'xlsx') => {
    if (savedUrls.length === 0) {
      toast({
        description: "No URLs to export",
        variant: "warning",
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
        variant: "warning",
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

  const generateUrl = () => {
    if (!validateUrl(formUrl)) {
      toast({
        title: "Error",
        description: "Please enter a valid form URL",
        variant: "destructive",
      });
      return;
    }

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
    toast({
      title: "Success",
      description: "URL generated and copied to clipboard",
    });
    addToHistory({ formUrl, fields });
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
          <CardHeader>
            <CardTitle>What is Form Pre-filling?</CardTitle>
          </CardHeader>
          <CardContent>
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Pre-filling allows you to populate form fields automatically by adding parameters to the form's URL.
                This is useful for customer service, surveys, and any situation where some information is known in advance.
              </AlertDescription>
            </Alert>

            <div className="mt-4 space-y-2">
              <h3 className="text-lg font-semibold">Key Benefits:</h3>
              <ul className="list-disc pl-6 space-y-1">
                <li>Saves time for users</li>
                <li>Reduces data entry errors</li>
                <li>Improves form completion rates</li>
                <li>Customizable for different scenarios</li>
              </ul>
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
                  Construct Mode
                </TabsTrigger>
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
                  Deconstruct Mode
                </TabsTrigger>
              </TabsList>

              <TabsContent value="construct" className="space-y-4">
                <div>
                  <label htmlFor="formUrl" className="block mb-2">Form URL</label>
                  <Input
                    id="formUrl"
                    placeholder="Enter form URL (e.g., https://form.gov.sg/1234567890123455678901234)"
                    value={formUrl}
                    onChange={(e) => setFormUrl(e.target.value)}
                    aria-label="Form URL"
                  />
                </div>

                {fields.map((field, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      placeholder="Field ID (e.g., 672883d1aa22e8a167d22f56)"
                      value={field.id}
                      onChange={(e) => updateField(index, 'id', e.target.value)}
                      aria-label={`Field ${index + 1} ID`}
                    />
                    <Input
                      placeholder="Value (e.g., John)"
                      value={field.value}
                      onChange={(e) => updateField(index, 'value', e.target.value)}
                      aria-label={`Field ${index + 1} Value`}
                    />
                    <Input
                      placeholder="Label (optional)"
                      value={field.label}
                      onChange={(e) => updateField(index, 'label', e.target.value)}
                      aria-label={`Field ${index + 1} Label`}
                    />
                    <Button
                      variant="destructive"
                      size="icon"
                      onClick={() => removeField(index)}
                      aria-label={`Remove field ${index + 1}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}

              <div className="flex gap-2 items-center">
                  <Button onClick={addField} variant="outline">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Field
                  </Button>
                  <Button onClick={generateUrl}>Generate URL</Button>
                  <CSVImportDialog onImport={handleCSVImport} />
                  <Button 
                    variant="destructive" 
                    onClick={clearAllFields}
                    className="ml-auto"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Clear All
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="deconstruct" className="space-y-4">
                <div>
                  <label htmlFor="prefilledUrl" className="block mb-2">Pre-filled URL</label>
                  <Input
                    id="prefilledUrl"
                    placeholder="Paste pre-filled URL to deconstruct"
                    onChange={(e) => deconstructUrl(e.target.value)}
                    aria-label="Pre-filled URL"
                  />
                </div>
              </TabsContent>
            </Tabs>

            {generatedUrl && (
              <div className="mt-4 p-4 bg-muted rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="truncate">{generatedUrl}</span>
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => {
                      navigator.clipboard.writeText(generatedUrl);
                      toast({
                        title: "Success",
                        description: "URL copied to clipboard",
                      });
                    }}
                    aria-label="Copy generated URL"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex justify-between items-center">
              <span>URL Exporter</span>
              {savedUrls.length > 0 && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Trash2 className="h-4 w-4 mr-2" />
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
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {generatedUrl && (
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="Give this URL a name (optional)"
                    value={urlName}
                    onChange={(e) => setUrlName(e.target.value)}
                  />
                  <Button onClick={saveGeneratedUrl}>Save URL</Button>
                </div>
                <div className="p-4 bg-muted rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="truncate">{generatedUrl}</span>
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => {
                        navigator.clipboard.writeText(generatedUrl);
                        toast({
                          description: "URL copied to clipboard",
                        });
                      }}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Saved URLs</h3>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => exportUrls('csv')}
                    disabled={savedUrls.length === 0}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export CSV
                  </Button>
                </div>
              </div>

              {savedUrls.length === 0 ? (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    No URLs saved yet. Generate and save a URL to see it here.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-2">
                  {savedUrls.map((savedUrl, index) => (
                    <div
                    key={index}
                    className="p-4 bg-muted rounded-lg flex justify-between items-center group"
                  >
                    <div className="space-y-1 flex-1 mr-4">
                      <div className="font-medium">{savedUrl.name}</div>
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
                    <div className="flex gap-2">
                      <Button
                        size="icon"
                        variant="outline"
                        onClick={() => {
                          navigator.clipboard.writeText(savedUrl.url);
                          toast({
                            description: "URL copied to clipboard",
                          });
                        }}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            size="icon"
                            variant="outline"
                            className="text-destructive hover:text-destructive"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete this saved URL?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This action cannot be undone. The URL will be permanently deleted.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deleteSavedUrl(index)}>
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default FormPrefillGuide;

'use client'

import React, { useState, useEffect } from 'react';
import { Trash2, Copy, Moon, Sun, Info, HelpCircle, RotateCcw, Download, X, Plus } from 'lucide-react';
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
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/components/ui/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Image from 'next/image';
import { cn, Theme, getTheme, setTheme, validateUrl, parseUrlParams, constructUrl } from '@/lib/utils';

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
              <TabsList className="mb-4">
                <TabsTrigger value="construct">Construct Mode</TabsTrigger>
                <TabsTrigger value="deconstruct">Deconstruct Mode</TabsTrigger>
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

                <div className="flex gap-2">
                  <Button onClick={addField} variant="outline">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Field
                  </Button>
                  <Button onClick={generateUrl}>Generate URL</Button>
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
                        <div className="text-sm text-muted-foreground truncate">
                          {savedUrl.url}
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

const UsageGuide = () => (
  <Dialog>
    <DialogTrigger asChild>
      <Button variant="outline" size="icon">
        <HelpCircle className="h-4 w-4" />
      </Button>
    </DialogTrigger>
    <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>How to Use Form Pre-fill Guide</DialogTitle>
      </DialogHeader>
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold mb-2">Construct Mode</h3>
          <ol className="list-decimal pl-6 space-y-2">
            <li>Enter your form's base URL in the "Form URL" field</li>
            <li>
              Add fields that you want to pre-fill:
              <ul className="list-disc pl-6 mt-1">
                <li>Field ID: The form field's identifier for short answer field (An example: '672883a69a27ad6eb73362ff')</li>
                <li>Value: The data you want to pre-fill</li>
                <li>Label: An optional description of your Field ID</li>
              </ul>
            </li>
            <li>Click "Generate URL" to create your pre-filled URL</li>
            <li>Copy the generated URL using the copy button</li>
          </ol>
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-2">Deconstruct Mode</h3>
          <ol className="list-decimal pl-6 space-y-2">
            <li>Switch to the "Deconstruct Mode" tab</li>
            <li>Paste a pre-filled URL into the input field</li>
            <li>
              The tool will automatically:
              <ul className="list-disc pl-6 mt-1">
                <li>Extract the base form URL</li>
                <li>Identify all pre-filled parameters</li>
                <li>Switch to Construct Mode with the fields populated</li>
              </ul>
            </li>
          </ol>
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-2">URL Exporter</h3>
          <ol className="list-decimal pl-6 space-y-2">
            <li>Generate a URL using the URL Generator</li>
            <li>Optionally give your URL a memorable name</li>
            <li>Click "Save URL" to add it to your saved URLs list</li>
            <li>View all your saved URLs in the list below</li>
            <li>Export your URLs to CSV format using the export button</li>
            <li>Copy any saved URL using the copy button next to it</li>
            <li>Delete individual URLs using the delete button (X)</li>
            <li>Clear all saved URLs using the "Clear All" button</li>
          </ol>
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-2">Additional Features</h3>
          <ul className="list-disc pl-6 space-y-2">
            <li>
              <span className="font-medium">Dark/Light Mode:</span> Toggle between themes using the sun/moon icon
            </li>
            <li>
              <span className="font-medium">Undo:</span> Reverse your last action with the undo button
            </li>
          </ul>
        </div>

        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Your configurations and saved URLs are automatically saved in your browser. They will persist even if you close and reopen the page.
          </AlertDescription>
        </Alert>
      </div>
    </DialogContent>
  </Dialog>
);

export default FormPrefillGuide;

'use client'

import React, { useState, useRef, useEffect } from 'react';
import { Clipboard, Download, Copy, CheckCircle, AlertTriangle, Trash2, FileUp, Lightbulb, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const SAMPLE_DATA = `John Smith
Jane Doe
Michael Johnson
Emily Williams
David Brown
Sarah Jones
Robert Garcia
Jennifer Miller
William Davis
Elizabeth Wilson`;

const TransformColumnToRow = () => {
  const [inputText, setInputText] = useState('');
  const [outputText, setOutputText] = useState('');
  const [delimiter, setDelimiter] = useState(',');
  const [customDelimiter, setCustomDelimiter] = useState('');
  const [activeInputTab, setActiveInputTab] = useState<string>('paste');
  const [isSampleLoaded, setIsSampleLoaded] = useState(false);
  const [isTransformed, setIsTransformed] = useState(false);
  const [totalItems, setTotalItems] = useState(0);
  
  // Data cleaning options
  const [cleaningOptions, setCleaningOptions] = useState({
    trimWhitespace: true,
    removeEmptyLines: true,
    removeDuplicates: false,
    toLowerCase: false,
    toUpperCase: false,
    removeSpecialChars: false,
    replaceMultipleSpaces: false,
    removeLeadingNumbers: false,
    removeTrailingNumbers: false,
    useCustomRegex: false
  });
  
  // Add new state variables for preview stats
  const [previewStats, setPreviewStats] = useState({
    originalLines: 0,
    afterTrimming: 0,
    afterRemovingEmpty: 0,
    afterRemovingDuplicates: 0,
    afterCleaning: 0,
    showPreview: false
  });
  
  // Add state for custom regex pattern and replacement
  const [customRegexPattern, setCustomRegexPattern] = useState('');
  const [customRegexReplacement, setCustomRegexReplacement] = useState('');
  const [customRegexError, setCustomRegexError] = useState('');
  
  // Add state for sample preview
  const [samplePreview, setSamplePreview] = useState<{
    original: string[];
    cleaned: string[];
    showPreview: boolean;
  }>({
    original: [],
    cleaned: [],
    showPreview: false
  });
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const outputRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const transformData = () => {
    if (!inputText.trim()) {
      toast({
        title: "Error",
        description: "Please enter some data to transform",
        variant: "destructive",
      });
      return;
    }
    
    // Split text by newlines
    let lines = inputText.split('\n');
    
    // Apply cleaning options
    if (cleaningOptions.trimWhitespace) {
      lines = lines.map(line => line.trim());
    }
    
    if (cleaningOptions.removeEmptyLines) {
      lines = lines.filter(line => line.trim() !== '');
    }
    
    if (cleaningOptions.toLowerCase) {
      lines = lines.map(line => line.toLowerCase());
    }
    
    if (cleaningOptions.toUpperCase) {
      lines = lines.map(line => line.toUpperCase());
    }
    
    if (cleaningOptions.removeSpecialChars) {
      lines = lines.map(line => line.replace(/[^\w\s]/gi, ''));
    }
    
    // Add new cleaning options
    if (cleaningOptions.replaceMultipleSpaces) {
      lines = lines.map(line => line.replace(/\s+/g, ' '));
    }
    
    if (cleaningOptions.removeLeadingNumbers) {
      lines = lines.map(line => line.replace(/^\d+\s*/, ''));
    }
    
    if (cleaningOptions.removeTrailingNumbers) {
      lines = lines.map(line => line.replace(/\s*\d+$/, ''));
    }
    
    // Apply custom regex if enabled and valid
    if (cleaningOptions.useCustomRegex && customRegexPattern) {
      try {
        const regex = new RegExp(customRegexPattern, 'g');
        lines = lines.map(line => line.replace(regex, customRegexReplacement || ''));
        setCustomRegexError('');
      } catch (error) {
        setCustomRegexError('Invalid regex pattern');
        toast({
          title: "Regex Error",
          description: "Invalid regular expression pattern. Skipping custom regex replacement.",
          variant: "destructive",
        });
      }
    }
    
    if (cleaningOptions.removeDuplicates) {
      lines = [...new Set(lines)];
    }
    
    setTotalItems(lines.length);
    
    // Join with the selected delimiter
    const actualDelimiter = delimiter === 'custom' ? customDelimiter : delimiter;
    const transformed = lines.join(actualDelimiter);
    
    setOutputText(transformed);
    setIsTransformed(true);
    
    toast({
      description: `Successfully transformed ${lines.length} items`,
    });
  };
  
  const copyToClipboard = () => {
    if (!outputText) {
      toast({
        description: "Nothing to copy",
        variant: "destructive",
      });
      return;
    }
    
    navigator.clipboard.writeText(outputText);
    toast({
      description: "Transformed data copied to clipboard",
    });
  };
  
  const clearAll = () => {
    setInputText('');
    setOutputText('');
    setIsTransformed(false);
    setTotalItems(0);
    setIsSampleLoaded(false);
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
    toast({
      description: "All data cleared",
    });
  };
  
  const loadSampleData = () => {
    setInputText(SAMPLE_DATA);
    setIsSampleLoaded(true);
    toast({
      description: "Sample data loaded",
    });
  };
  
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setInputText(content || '');
      setActiveInputTab('paste');
      toast({
        description: `File "${file.name}" loaded successfully`,
      });
    };
    reader.onerror = () => {
      toast({
        title: "Error",
        description: "Failed to read the file",
        variant: "destructive",
      });
    };
    
    reader.readAsText(file);
  };
  
  const downloadOutput = () => {
    if (!outputText) {
      toast({
        description: "Nothing to download",
        variant: "destructive",
      });
      return;
    }
    
    const blob = new Blob([outputText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `transformed-data-${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({
      description: "Transformed data downloaded as text file",
    });
  };
  
  // Add a function to calculate preview stats based on current cleaning options
  const calculatePreviewStats = () => {
    if (!inputText.trim()) {
      setPreviewStats({
        originalLines: 0,
        afterTrimming: 0,
        afterRemovingEmpty: 0,
        afterRemovingDuplicates: 0,
        afterCleaning: 0,
        showPreview: false
      });
      return;
    }

    // Original lines
    const originalLines = inputText.split('\n');
    
    // After trimming
    let afterTrimming = cleaningOptions.trimWhitespace 
      ? originalLines.map(line => line.trim()) 
      : [...originalLines];
    
    // After removing empty
    let afterRemovingEmpty = cleaningOptions.removeEmptyLines 
      ? afterTrimming.filter(line => line !== '') 
      : [...afterTrimming];
    
    // Apply intermediate cleaning steps
    let cleanedLines = [...afterRemovingEmpty];
    
    // Apply case conversion
    if (cleaningOptions.toLowerCase) {
      cleanedLines = cleanedLines.map(line => line.toLowerCase());
    } else if (cleaningOptions.toUpperCase) {
      cleanedLines = cleanedLines.map(line => line.toUpperCase());
    }
    
    // Apply other cleaning options
    if (cleaningOptions.removeSpecialChars) {
      cleanedLines = cleanedLines.map(line => line.replace(/[^\w\s]/gi, ''));
    }
    
    if (cleaningOptions.replaceMultipleSpaces) {
      cleanedLines = cleanedLines.map(line => line.replace(/\s+/g, ' '));
    }
    
    if (cleaningOptions.removeLeadingNumbers) {
      cleanedLines = cleanedLines.map(line => line.replace(/^\d+\s*/, ''));
    }
    
    if (cleaningOptions.removeTrailingNumbers) {
      cleanedLines = cleanedLines.map(line => line.replace(/\s*\d+$/, ''));
    }
    
    // Apply custom regex if enabled and valid
    if (cleaningOptions.useCustomRegex && customRegexPattern) {
      try {
        const regex = new RegExp(customRegexPattern, 'g');
        cleanedLines = cleanedLines.map(line => line.replace(regex, customRegexReplacement || ''));
        setCustomRegexError('');
      } catch (error) {
        setCustomRegexError('Invalid regex pattern');
        // Don't apply the regex in preview if there's an error
      }
    }
    
    // After removing duplicates (final step)
    let afterRemovingDuplicates = cleaningOptions.removeDuplicates 
      ? [...new Set(cleanedLines)] 
      : [...cleanedLines];
    
    setPreviewStats({
      originalLines: originalLines.length,
      afterTrimming: cleaningOptions.trimWhitespace ? afterTrimming.length : 0,
      afterRemovingEmpty: cleaningOptions.removeEmptyLines ? afterRemovingEmpty.length : 0,
      afterRemovingDuplicates: cleaningOptions.removeDuplicates ? afterRemovingDuplicates.length : 0,
      afterCleaning: afterRemovingDuplicates.length,
      showPreview: true
    });
  };

  // Add a function to generate a sample preview
  const generateSamplePreview = () => {
    if (!inputText.trim()) {
      setSamplePreview({
        original: [],
        cleaned: [],
        showPreview: false
      });
      return;
    }

    // Get up to 3 sample lines from the input
    const allLines = inputText.split('\n');
    const sampleLines: string[] = [];
    
    // Try to select lines with content to show meaningful transformations
    let contentLines = allLines.filter(line => line.trim().length > 0);
    
    // If no content lines, use original lines
    if (contentLines.length === 0) {
      contentLines = [...allLines];
    }
    
    // Take up to 3 lines, prioritizing ones with interesting content if possible
    for (let i = 0; i < Math.min(3, contentLines.length); i++) {
      sampleLines.push(contentLines[i]);
    }
    
    // Now apply the transformations to the sample lines
    let processedLines = [...sampleLines];
    
    // Apply all the cleaning operations
    if (cleaningOptions.trimWhitespace) {
      processedLines = processedLines.map(line => line.trim());
    }
    
    if (cleaningOptions.toLowerCase) {
      processedLines = processedLines.map(line => line.toLowerCase());
    }
    
    if (cleaningOptions.toUpperCase) {
      processedLines = processedLines.map(line => line.toUpperCase());
    }
    
    if (cleaningOptions.removeSpecialChars) {
      processedLines = processedLines.map(line => line.replace(/[^\w\s]/gi, ''));
    }
    
    if (cleaningOptions.replaceMultipleSpaces) {
      processedLines = processedLines.map(line => line.replace(/\s+/g, ' '));
    }
    
    if (cleaningOptions.removeLeadingNumbers) {
      processedLines = processedLines.map(line => line.replace(/^\d+\s*/, ''));
    }
    
    if (cleaningOptions.removeTrailingNumbers) {
      processedLines = processedLines.map(line => line.replace(/\s*\d+$/, ''));
    }
    
    if (cleaningOptions.useCustomRegex && customRegexPattern) {
      try {
        const regex = new RegExp(customRegexPattern, 'g');
        processedLines = processedLines.map(line => line.replace(regex, customRegexReplacement || ''));
      } catch (error) {
        // Skip custom regex if invalid
      }
    }
    
    // Set the sample preview state
    setSamplePreview({
      original: sampleLines,
      cleaned: processedLines,
      showPreview: true
    });
  };

  // Call generateSamplePreview when input or options change
  useEffect(() => {
    if (inputText) {
      calculatePreviewStats();
      generateSamplePreview();
    } else {
      setPreviewStats(prev => ({ ...prev, showPreview: false }));
      setSamplePreview(prev => ({ ...prev, showPreview: false }));
    }
  }, [inputText, cleaningOptions, customRegexPattern, customRegexReplacement]);
  
  // Modify the toggleCleaningOption function to update preview stats
  const toggleCleaningOption = (option: keyof typeof cleaningOptions) => {
    setCleaningOptions(prev => ({
      ...prev,
      [option]: !prev[option]
    }));
    
    // Handle mutually exclusive options
    if (option === 'toLowerCase' && cleaningOptions.toUpperCase && !cleaningOptions.toLowerCase) {
      setCleaningOptions(prev => ({
        ...prev,
        toUpperCase: false
      }));
    }
    
    if (option === 'toUpperCase' && cleaningOptions.toLowerCase && !cleaningOptions.toUpperCase) {
      setCleaningOptions(prev => ({
        ...prev,
        toLowerCase: false
      }));
    }
    
    // Preview will update via useEffect
  };
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="bg-gradient-to-r from-purple-50/50 to-pink-50/50 border-b border-purple-100/50">
          <CardTitle className="text-lg font-semibold text-purple-800">Column to Row Transformer</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Input Section */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-base font-medium">Input Data</h3>
                <div className="flex gap-2">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={loadSampleData}
                          className="h-8 text-xs border-purple-200 hover:bg-purple-50 text-purple-700"
                          disabled={isSampleLoaded}
                        >
                          <Lightbulb className="h-3.5 w-3.5 mr-1.5" />
                          Load Sample
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">Load sample data to see how it works</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={clearAll}
                          className="h-8 text-xs border-red-200 hover:bg-red-50 text-red-500"
                        >
                          <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                          Clear All
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">Clear all input and output data</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>
              
              <Tabs value={activeInputTab} onValueChange={setActiveInputTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2 h-9">
                  <TabsTrigger value="paste" className="text-xs">Paste Text</TabsTrigger>
                  <TabsTrigger value="upload" className="text-xs">Upload File</TabsTrigger>
                </TabsList>
                
                <TabsContent value="paste" className="mt-2">
                  <Textarea
                    ref={textareaRef}
                    placeholder="Paste your column data here (one item per line)..."
                    className="min-h-[200px] font-mono text-sm border-purple-200"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                  />
                </TabsContent>
                
                <TabsContent value="upload" className="mt-2">
                  <div className="border-2 border-dashed border-purple-200 rounded-md p-6 text-center bg-purple-50/50">
                    <input 
                      type="file" 
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                      accept=".txt,.csv,.md,.json"
                      className="hidden" 
                    />
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <div className="bg-purple-100 rounded-full p-3">
                        <FileUp className="h-6 w-6 text-purple-600" />
                      </div>
                      <h4 className="font-medium text-purple-800">Upload a Text File</h4>
                      <p className="text-xs text-purple-600 max-w-xs">
                        Upload .txt, .csv, or any text file with one item per line
                      </p>
                      <Button
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                        className="mt-2 border-purple-300 hover:bg-purple-100 text-purple-700"
                      >
                        Choose File
                      </Button>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
              
              <Alert className="bg-purple-50 border-purple-100">
                <Info className="h-4 w-4 text-purple-600" />
                <AlertDescription className="text-purple-700 text-sm">
                  Enter data with one item per line. The transformer will combine all lines into a single row.
                </AlertDescription>
              </Alert>
            </div>
            
            {/* Configuration and Output Section */}
            <div className="space-y-4">
              <div className="space-y-6">
                <div>
                  <h3 className="text-base font-medium mb-3">Configure Transformation</h3>
                  
                  <div className="space-y-4">
                    <div className="grid grid-cols-5 gap-3 items-end">
                      <div className="col-span-2">
                        <Label htmlFor="delimiter" className="text-sm mb-1 block">Delimiter</Label>
                        <Select 
                          defaultValue="," 
                          value={delimiter}
                          onValueChange={(value) => setDelimiter(value)}
                        >
                          <SelectTrigger id="delimiter" className="border-purple-200">
                            <SelectValue placeholder="Select delimiter" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value=",">Comma (,)</SelectItem>
                            <SelectItem value=";">Semicolon (;)</SelectItem>
                            <SelectItem value="|">Pipe (|)</SelectItem>
                            <SelectItem value=" ">Space ( )</SelectItem>
                            <SelectItem value="\t">Tab (\t)</SelectItem>
                            <SelectItem value="-">Hyphen (-)</SelectItem>
                            <SelectItem value="_">Underscore (_)</SelectItem>
                            <SelectItem value="custom">Custom...</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      {delimiter === 'custom' && (
                        <div className="col-span-3">
                          <Label htmlFor="customDelimiter" className="text-sm mb-1 block">Custom Delimiter</Label>
                          <Input
                            id="customDelimiter"
                            placeholder="Enter custom delimiter"
                            value={customDelimiter}
                            onChange={(e) => setCustomDelimiter(e.target.value)}
                            className="border-purple-200"
                          />
                        </div>
                      )}
                      
                      {delimiter !== 'custom' && (
                        <div className="col-span-3">
                          <Button 
                            onClick={transformData} 
                            className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
                            disabled={!inputText.trim()}
                          >
                            Transform
                          </Button>
                        </div>
                      )}
                      
                      {delimiter === 'custom' && (
                        <div className="col-span-5 mt-2">
                          <Button 
                            onClick={transformData} 
                            className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
                            disabled={!inputText.trim() || !customDelimiter}
                          >
                            Transform
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Add Data Cleaning Options */}
                <div>
                  <h3 className="text-base font-medium mb-2 flex items-center">
                    <svg className="h-4 w-4 mr-1.5 text-purple-600" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/>
                      <path d="M12 18a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"/>
                    </svg>
                    Data Cleaning Options
                  </h3>
                  
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                    <label className="flex items-center space-x-2 text-sm">
                      <input 
                        type="checkbox" 
                        checked={cleaningOptions.trimWhitespace} 
                        onChange={() => toggleCleaningOption('trimWhitespace')}
                        className="h-4 w-4 rounded border-purple-300 text-purple-600 focus:ring-purple-500"
                      />
                      <span>Trim whitespace</span>
                    </label>
                    
                    <label className="flex items-center space-x-2 text-sm">
                      <input 
                        type="checkbox" 
                        checked={cleaningOptions.removeEmptyLines} 
                        onChange={() => toggleCleaningOption('removeEmptyLines')}
                        className="h-4 w-4 rounded border-purple-300 text-purple-600 focus:ring-purple-500"
                      />
                      <span>Remove empty lines</span>
                    </label>
                    
                    <label className="flex items-center space-x-2 text-sm">
                      <input 
                        type="checkbox" 
                        checked={cleaningOptions.removeDuplicates} 
                        onChange={() => toggleCleaningOption('removeDuplicates')}
                        className="h-4 w-4 rounded border-purple-300 text-purple-600 focus:ring-purple-500"
                      />
                      <span>Remove duplicates</span>
                    </label>
                    
                    <label className="flex items-center space-x-2 text-sm">
                      <input 
                        type="checkbox" 
                        checked={cleaningOptions.removeSpecialChars} 
                        onChange={() => toggleCleaningOption('removeSpecialChars')}
                        className="h-4 w-4 rounded border-purple-300 text-purple-600 focus:ring-purple-500"
                      />
                      <span>Remove special characters</span>
                    </label>
                    
                    <label className="flex items-center space-x-2 text-sm">
                      <input 
                        type="checkbox" 
                        checked={cleaningOptions.toLowerCase} 
                        onChange={() => toggleCleaningOption('toLowerCase')}
                        className="h-4 w-4 rounded border-purple-300 text-purple-600 focus:ring-purple-500"
                      />
                      <span>Convert to lowercase</span>
                    </label>
                    
                    <label className="flex items-center space-x-2 text-sm">
                      <input 
                        type="checkbox" 
                        checked={cleaningOptions.toUpperCase} 
                        onChange={() => toggleCleaningOption('toUpperCase')}
                        className="h-4 w-4 rounded border-purple-300 text-purple-600 focus:ring-purple-500"
                      />
                      <span>Convert to UPPERCASE</span>
                    </label>
                    
                    <label className="flex items-center space-x-2 text-sm">
                      <input 
                        type="checkbox" 
                        checked={cleaningOptions.replaceMultipleSpaces} 
                        onChange={() => toggleCleaningOption('replaceMultipleSpaces')}
                        className="h-4 w-4 rounded border-purple-300 text-purple-600 focus:ring-purple-500"
                      />
                      <span>Replace multiple spaces</span>
                    </label>
                    
                    <label className="flex items-center space-x-2 text-sm">
                      <input 
                        type="checkbox" 
                        checked={cleaningOptions.removeLeadingNumbers} 
                        onChange={() => toggleCleaningOption('removeLeadingNumbers')}
                        className="h-4 w-4 rounded border-purple-300 text-purple-600 focus:ring-purple-500"
                      />
                      <span>Remove leading numbers</span>
                    </label>
                    
                    <label className="flex items-center space-x-2 text-sm">
                      <input 
                        type="checkbox" 
                        checked={cleaningOptions.removeTrailingNumbers} 
                        onChange={() => toggleCleaningOption('removeTrailingNumbers')}
                        className="h-4 w-4 rounded border-purple-300 text-purple-600 focus:ring-purple-500"
                      />
                      <span>Remove trailing numbers</span>
                    </label>
                    
                    <label className="flex items-center space-x-2 text-sm">
                      <input 
                        type="checkbox" 
                        checked={cleaningOptions.useCustomRegex} 
                        onChange={() => toggleCleaningOption('useCustomRegex')}
                        className="h-4 w-4 rounded border-purple-300 text-purple-600 focus:ring-purple-500"
                      />
                      <span>Use custom regex pattern</span>
                    </label>
                  </div>
                  
                  {/* Custom regex section */}
                  {cleaningOptions.useCustomRegex && (
                    <div className="mt-3 p-3 border border-purple-200 rounded-md bg-purple-50/30">
                      <h4 className="text-sm font-medium mb-2 text-purple-700">Custom Regex Replacement</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <Label htmlFor="regexPattern" className="text-xs block mb-1">Pattern</Label>
                          <Input
                            id="regexPattern"
                            placeholder="e.g., \d{4}-\d{2}"
                            value={customRegexPattern}
                            onChange={(e) => setCustomRegexPattern(e.target.value)}
                            className="h-8 text-xs border-purple-200 font-mono"
                          />
                        </div>
                        <div>
                          <Label htmlFor="regexReplacement" className="text-xs block mb-1">Replacement</Label>
                          <Input
                            id="regexReplacement"
                            placeholder="e.g., DATE"
                            value={customRegexReplacement}
                            onChange={(e) => setCustomRegexReplacement(e.target.value)}
                            className="h-8 text-xs border-purple-200 font-mono"
                          />
                        </div>
                      </div>
                      {customRegexError && (
                        <div className="mt-2 text-xs text-red-500">
                          <AlertTriangle className="h-3 w-3 inline-block mr-1" />
                          {customRegexError}
                        </div>
                      )}
                      <div className="mt-2 text-xs text-purple-600">
                        <Info className="h-3 w-3 inline-block mr-1" />
                        Enter a regular expression pattern to find and replace in each line
                      </div>
                    </div>
                  )}
                  
                  {previewStats.showPreview && (
                    <div className="mt-3 bg-purple-50/70 rounded-md p-3 border border-purple-100 text-xs text-purple-700">
                      <h4 className="font-medium mb-1 flex items-center">
                        <CheckCircle className="h-3 w-3 mr-1 text-purple-600" />
                        Data Cleaning Preview
                      </h4>
                      
                      <div className="grid grid-cols-2 gap-x-3 gap-y-1 mt-2">
                        <div className="flex justify-between">
                          <span>Original lines:</span>
                          <span className="font-semibold">{previewStats.originalLines}</span>
                        </div>
                        
                        {cleaningOptions.removeEmptyLines && (
                          <div className="flex justify-between">
                            <span>After removing empty:</span>
                            <span className={`font-semibold ${previewStats.afterRemovingEmpty !== previewStats.originalLines ? 'text-purple-600' : ''}`}>
                              {previewStats.afterRemovingEmpty}
                              {previewStats.afterRemovingEmpty !== previewStats.originalLines && (
                                <span className="text-purple-500 ml-1">
                                  (-{previewStats.originalLines - previewStats.afterRemovingEmpty})
                                </span>
                              )}
                            </span>
                          </div>
                        )}
                        
                        {cleaningOptions.removeDuplicates && (
                          <div className="flex justify-between">
                            <span>After removing duplicates:</span>
                            <span className={`font-semibold ${
                              (cleaningOptions.removeEmptyLines ? 
                                previewStats.afterRemovingDuplicates !== previewStats.afterRemovingEmpty : 
                                previewStats.afterRemovingDuplicates !== previewStats.originalLines) ? 'text-purple-600' : ''
                            }`}>
                              {previewStats.afterRemovingDuplicates}
                              {cleaningOptions.removeEmptyLines ? 
                                (previewStats.afterRemovingDuplicates !== previewStats.afterRemovingEmpty && (
                                  <span className="text-purple-500 ml-1">
                                    (-{previewStats.afterRemovingEmpty - previewStats.afterRemovingDuplicates})
                                  </span>
                                )) : 
                                (previewStats.afterRemovingDuplicates !== previewStats.originalLines && (
                                  <span className="text-purple-500 ml-1">
                                    (-{previewStats.originalLines - previewStats.afterRemovingDuplicates})
                                  </span>
                                ))
                              }
                            </span>
                          </div>
                        )}
                        
                        <div className="flex justify-between col-span-2 border-t border-purple-200 mt-1 pt-1">
                          <span className="font-medium">Final lines after cleaning:</span>
                          <span className="font-semibold text-purple-600">{previewStats.afterCleaning}</span>
                        </div>
                      </div>
                      
                      {/* Add sample line visual preview */}
                      {samplePreview.showPreview && samplePreview.original.length > 0 && (
                        <div className="mt-3 pt-2 border-t border-purple-200">
                          <h4 className="font-medium mb-2 flex items-center">
                            <svg className="h-3 w-3 mr-1 text-purple-600" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <circle cx="12" cy="12" r="10"></circle>
                              <line x1="12" y1="16" x2="12" y2="12"></line>
                              <line x1="12" y1="8" x2="12.01" y2="8"></line>
                            </svg>
                            Sample Line Preview
                          </h4>
                          <div className="space-y-2">
                            {samplePreview.original.map((originalLine, index) => (
                              <div key={index} className="grid grid-cols-1 gap-1 bg-white/60 p-2 rounded border border-purple-100">
                                <div className="flex items-start">
                                  <span className="bg-purple-100 text-purple-800 rounded-full h-4 w-4 flex items-center justify-center text-[10px] mr-1.5 flex-shrink-0 mt-0.5">B</span>
                                  <div className="font-mono text-[10px] overflow-hidden overflow-ellipsis whitespace-nowrap text-gray-600">
                                    {originalLine || <span className="italic text-gray-400">(empty line)</span>}
                                  </div>
                                </div>
                                <div className="flex items-start">
                                  <span className="bg-purple-500 text-white rounded-full h-4 w-4 flex items-center justify-center text-[10px] mr-1.5 flex-shrink-0 mt-0.5">A</span>
                                  <div className="font-mono text-[10px] overflow-hidden overflow-ellipsis whitespace-nowrap text-purple-700 font-medium">
                                    {samplePreview.cleaned[index] || <span className="italic text-purple-300">(empty line)</span>}
                                  </div>
                                </div>
                                {originalLine !== samplePreview.cleaned[index] && (
                                  <div className="text-[10px] text-purple-600 pl-6">
                                    <CheckCircle className="h-2.5 w-2.5 inline-block mr-1" />
                                    Changes detected
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  
                  <div className="mt-3 bg-purple-50 rounded-md p-2 border border-purple-100">
                    <div className="flex items-start">
                      <Info className="h-3.5 w-3.5 text-purple-600 mt-0.5 mr-1.5 flex-shrink-0" />
                      <span className="text-xs text-purple-700">
                        Clean your data before transformation to handle whitespace, duplicates, and formatting.
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Transform Button - render conditionally based on existing code */}
              <div className="pt-2">
                <Button 
                  onClick={transformData} 
                  className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
                  disabled={!inputText.trim()}
                >
                  Transform with Cleaning
                </Button>
              </div>
              
              <div>
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-base font-medium">Output</h3>
                  {isTransformed && (
                    <div className="flex gap-2">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={copyToClipboard}
                              className="h-8 text-xs border-purple-200 hover:bg-purple-50 text-purple-700"
                            >
                              <Copy className="h-3.5 w-3.5 mr-1.5" />
                              Copy
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="text-xs">Copy transformed data to clipboard</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={downloadOutput}
                              className="h-8 text-xs border-purple-200 hover:bg-purple-50 text-purple-700"
                            >
                              <Download className="h-3.5 w-3.5 mr-1.5" />
                              Download
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="text-xs">Download as text file</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  )}
                </div>
                
                <div 
                  ref={outputRef}
                  className={`
                    p-3 border rounded-md min-h-[130px] max-h-[200px] overflow-auto 
                    font-mono text-sm whitespace-pre-wrap break-all
                    ${outputText ? 'bg-white border-purple-200' : 'bg-gray-50 border-gray-200 text-gray-400'}
                  `}
                >
                  {outputText || "Transformed output will appear here..."}
                </div>
                
                {isTransformed && (
                  <div className="mt-2 text-xs text-purple-600 flex items-center">
                    <CheckCircle className="h-3.5 w-3.5 mr-1.5" />
                    Successfully transformed {totalItems} items into a single row
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter className="bg-purple-50/50 border-t border-purple-100/50 flex justify-between">
          <div className="text-xs text-purple-700">
            <Info className="h-3.5 w-3.5 inline-block mr-1 text-purple-600" />
            This tool converts column data into a single row with your chosen delimiter
          </div>
          {isTransformed && totalItems > 0 && (
            <div className="text-xs font-medium text-purple-700">
              {totalItems} items → 1 row
            </div>
          )}
        </CardFooter>
      </Card>
      
      <Card>
        <CardHeader className="bg-gradient-to-r from-purple-50/50 to-pink-50/50 border-b border-purple-100/50">
          <CardTitle className="text-lg font-semibold text-purple-800">How to Use Transform Mode</CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-sm font-medium text-purple-700 mb-2">Input Options</h4>
                <ul className="space-y-1.5 text-sm">
                  <li className="flex items-start">
                    <span className="bg-purple-100 text-purple-800 rounded-full h-5 w-5 flex items-center justify-center text-xs mr-2 mt-0.5 font-medium">1</span>
                    <span>Paste your data with one item per line in the text area</span>
                  </li>
                  <li className="flex items-start">
                    <span className="bg-purple-100 text-purple-800 rounded-full h-5 w-5 flex items-center justify-center text-xs mr-2 mt-0.5 font-medium">2</span>
                    <span>Or upload a text file containing your data (one item per line)</span>
                  </li>
                  <li className="flex items-start">
                    <span className="bg-purple-100 text-purple-800 rounded-full h-5 w-5 flex items-center justify-center text-xs mr-2 mt-0.5 font-medium">3</span>
                    <span>Choose data cleaning options to handle messy data</span>
                  </li>
                  <li className="flex items-start">
                    <span className="bg-purple-100 text-purple-800 rounded-full h-5 w-5 flex items-center justify-center text-xs mr-2 mt-0.5 font-medium">4</span>
                    <span>Select your preferred delimiter from the dropdown list</span>
                  </li>
                </ul>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-purple-700 mb-2">Output Options</h4>
                <ul className="space-y-1.5 text-sm">
                  <li className="flex items-start">
                    <span className="bg-purple-100 text-purple-800 rounded-full h-5 w-5 flex items-center justify-center text-xs mr-2 mt-0.5 font-medium">5</span>
                    <span>Click the "Transform" button to convert your data</span>
                  </li>
                  <li className="flex items-start">
                    <span className="bg-purple-100 text-purple-800 rounded-full h-5 w-5 flex items-center justify-center text-xs mr-2 mt-0.5 font-medium">6</span>
                    <span>Copy the result to clipboard or download as a text file</span>
                  </li>
                  <li className="flex items-start">
                    <span className="bg-purple-100 text-purple-800 rounded-full h-5 w-5 flex items-center justify-center text-xs mr-2 mt-0.5 font-medium">7</span>
                    <span>Use "Clear All" to start fresh with new data</span>
                  </li>
                </ul>
              </div>
            </div>
            
            <Alert className="bg-gradient-to-r from-purple-50 to-pink-50/50 border-purple-100 mt-2">
              <AlertTriangle className="h-4 w-4 text-purple-600" />
              <AlertDescription className="text-purple-700 text-sm">
                <strong>Tips:</strong> Use the cleaning options to handle whitespace, duplicates, and case formatting. For large datasets, consider breaking them into smaller chunks.
              </AlertDescription>
            </Alert>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TransformColumnToRow; 
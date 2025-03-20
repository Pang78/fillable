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
    
    // Split text by newlines, filter out empty lines
    const lines = inputText.split('\n').filter(line => line.trim() !== '');
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
              <div className="mb-6">
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
                    <span>Choose your preferred delimiter from the dropdown list</span>
                  </li>
                </ul>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-purple-700 mb-2">Output Options</h4>
                <ul className="space-y-1.5 text-sm">
                  <li className="flex items-start">
                    <span className="bg-purple-100 text-purple-800 rounded-full h-5 w-5 flex items-center justify-center text-xs mr-2 mt-0.5 font-medium">4</span>
                    <span>Click the "Transform" button to convert your data</span>
                  </li>
                  <li className="flex items-start">
                    <span className="bg-purple-100 text-purple-800 rounded-full h-5 w-5 flex items-center justify-center text-xs mr-2 mt-0.5 font-medium">5</span>
                    <span>Copy the result to clipboard or download as a text file</span>
                  </li>
                  <li className="flex items-start">
                    <span className="bg-purple-100 text-purple-800 rounded-full h-5 w-5 flex items-center justify-center text-xs mr-2 mt-0.5 font-medium">6</span>
                    <span>Use "Clear All" to start fresh with new data</span>
                  </li>
                </ul>
              </div>
            </div>
            
            <Alert className="bg-gradient-to-r from-purple-50 to-pink-50/50 border-purple-100 mt-2">
              <AlertTriangle className="h-4 w-4 text-purple-600" />
              <AlertDescription className="text-purple-700 text-sm">
                <strong>Tips:</strong> For large datasets, consider breaking them into smaller chunks. 
                Very long strings may be difficult to handle in some applications.
              </AlertDescription>
            </Alert>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TransformColumnToRow; 
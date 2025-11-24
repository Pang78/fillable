'use client'

import React, { useState, useRef, useEffect } from 'react';
import { Clipboard, Download, Copy, CheckCircle, AlertTriangle, Trash2, FileUp, Lightbulb, Info, Code, FileText, Maximize2, Minimize2, X, ChevronDown } from 'lucide-react';
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
import { marked, Renderer } from 'marked';
import { htmlToText } from 'html-to-text';
import hljs from 'highlight.js';
import { Checkbox } from '@/components/ui/checkbox';

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

const MARKDOWN_SAMPLE_DATA = `## Main Header

This is some **bold text** and some *italic text*.

- Level 1 Item A
  - Level 2 Item A.1
    - Level 3 Item A.1.1
  - Level 2 Item A.2
- Level 1 Item B
  - Level 2 Item B.1

1. Ordered Item 1
   1. Ordered Sub-Item 1.1
   2. Ordered Sub-Item 1.2
2. Ordered Item 2

\`\`\`python
def hello(name):
  # This is a comment
  greeting = f"Hello, {name}!"
  print(greeting)
  return greeting
\`\`\`

\`\`\`javascript
function greet(user) {
  console.log(\`Hello, \${user}!\`);
}
\`\`\`

| Syntax      | Description |
| ----------- | ----------- |
| Header      | Title       |
| Paragraph   | Text        |
| Table       | Data        |
`;

const HIGHLIGHT_JS_CSS_ID = 'highlight-js-styles';

// Configure marked to use highlight.js via a custom renderer
const renderer = new Renderer();
renderer.code = ({ text, lang, escaped }: { text: string; lang?: string; escaped?: boolean }) => {
  const language = lang || 'plaintext'; // Default to plaintext if no lang is provided or lang is empty
  // Ensure hljs is available (it should be, as it's imported)
  if (typeof hljs === 'undefined' || !hljs) {
    console.error('highlight.js (hljs) is not loaded.');
    // Fallback to simple pre/code tags without highlighting if hljs is missing
    const escapedText = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return `<pre><code class="language-${language}">${escapedText}</code></pre>`;
  }

  if (language && language !== 'plaintext' && hljs.getLanguage(language)) {
    try {
      return `<pre><code class="hljs language-${language}">${hljs.highlight(text, { language, ignoreIllegals: true }).value}</code></pre>`;
    } catch (e) {
      console.error(`highlight.js error for language ${language}:`, e);
      // Fallback to auto-highlighting on error with specific language
      return `<pre><code class="hljs">${hljs.highlightAuto(text).value}</code></pre>`;
    }
  }
  // Fallback for plaintext, unknown languages, or if getLanguage returns falsy
  return `<pre><code class="hljs">${hljs.highlightAuto(text).value}</code></pre>`;
};

marked.setOptions({ renderer });

// Utility to clean up HTML for Word/Email with styling options
function cleanHtmlForWordEmail(html: string, stylingLevel: 'minimal' | 'basic' | 'full' = 'basic'): string {
  // Remove all class attributes regardless of styling level
  html = html.replace(/ class="[^"]*"/g, '');

  // Remove data attributes
  html = html.replace(/ data-[^=]*="[^"]*"/g, '');

  // Basic cleanup for all levels
  html = html.replace(/<\/?span[^>]*>/g, ''); // Remove spans

  if (stylingLevel === 'minimal') {
    // For minimal, strip almost all styling, leave just the structure
    return html;
  }

  // Add styles based on the selected level
  if (stylingLevel === 'basic' || stylingLevel === 'full') {
    // Basic table styling (cleaner, more minimal)
    html = html.replace(/<table>/g, '<table style="border-collapse:collapse;width:100%;margin-bottom:10px;">');
    html = html.replace(/<th>/g, '<th style="border:1px solid #ccc;padding:4px;background-color:#f1f1f1;">');
    html = html.replace(/<td>/g, '<td style="border:1px solid #ccc;padding:4px;">');

    // Basic code styling
    html = html.replace(/<pre>/g, '<pre style="background:#f4f4f4;padding:8px;border-radius:4px;overflow:auto;margin:10px 0;">');
    html = html.replace(/<code>/g, '<code style="font-family:monospace;">');
  }

  if (stylingLevel === 'full') {
    // Add more elaborate styling for the full option
    html = html.replace(/<h1>/g, '<h1 style="color:#333;border-bottom:1px solid #eee;padding-bottom:10px;">');
    html = html.replace(/<h2>/g, '<h2 style="color:#333;border-bottom:1px solid #eee;padding-bottom:5px;">');
    html = html.replace(/<h3>/g, '<h3 style="color:#333;">');
    html = html.replace(/<ul>/g, '<ul style="padding-left:20px;">');
    html = html.replace(/<ol>/g, '<ol style="padding-left:20px;">');
    html = html.replace(/<li>/g, '<li style="margin-bottom:5px;">');
    html = html.replace(/<blockquote>/g, '<blockquote style="border-left:4px solid #eee;padding-left:15px;margin-left:0;color:#777;">');
    html = html.replace(/<hr>/g, '<hr style="border:none;border-top:1px solid #eee;margin:20px 0;">');
  }

  return html;
}

// Improved plain text from HTML function with simpler, more reliable configuration
function htmlToPlainTextSafe(html: string): string {
  try {
    // Using a simpler configuration that's less likely to cause type errors
    return htmlToText(html, {
      wordwrap: false,
      preserveNewlines: true,
      // Simplified selector configuration focused on the most common HTML elements
      selectors: [
        { selector: 'img', format: 'skip' },
        { selector: 'a', format: 'inline' },
        { selector: 'h1', format: 'block' },
        { selector: 'h2', format: 'block' },
        { selector: 'h3', format: 'block' },
        { selector: 'h4', format: 'block' },
        { selector: 'h5', format: 'block' },
        { selector: 'h6', format: 'block' },
        { selector: 'p', format: 'block' },
        { selector: 'br', format: 'block' },
        { selector: 'hr', format: 'block' },
        { selector: 'ol', format: 'block' },
        { selector: 'ul', format: 'block' },
        { selector: 'li', format: 'inline' }, // Using inline for li to avoid format errors
        { selector: 'pre', format: 'block' },
        { selector: 'code', format: 'inline' },
        { selector: 'table', format: 'block' },
        { selector: 'th', format: 'inline' },
        { selector: 'td', format: 'inline' },
        { selector: 'blockquote', format: 'block' }
      ]
    });
  } catch (error) {
    console.error('Error converting HTML to plain text:', error);
    // Fallback to even simpler conversion if anything fails
    try {
      // Try with minimal options
      return htmlToText(html, { wordwrap: false });
    } catch (err) {
      // Ultimate fallback: basic HTML tag stripping
      return html.replace(/<[^>]*>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"');
    }
  }
}

// Function to copy HTML content directly to clipboard with formatting preserved
async function copyHtmlWithFormatting(html: string): Promise<boolean> {
  try {
    // Create a hidden div to hold the HTML content
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    tempDiv.setAttribute('style', 'position: absolute; left: -9999px; top: 0');
    document.body.appendChild(tempDiv);

    // Select the div's content
    const selection = window.getSelection();
    if (selection) {
      const range = document.createRange();
      range.selectNodeContents(tempDiv);
      selection.removeAllRanges();
      selection.addRange(range);

      // Execute copy command
      const success = document.execCommand('copy');

      // Clean up
      selection.removeAllRanges();
      document.body.removeChild(tempDiv);

      return success;
    }
    return false;
  } catch (error) {
    console.error('Error copying HTML with formatting:', error);
    return false;
  }
}

const TransformBidirectional = () => {
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
    useCustomRegex: false,
    normalizeWhitespace: false, // New option
    // Smart cleaning options
    smartEmail: false,
    smartPhone: false,
    smartName: false,
  });

  // Add type definition for SavedConfig after cleaningOptions is defined
  type SavedConfig = {
    id: string;
    name: string;
    delimiter: string;
    customDelimiter: string;
    cleaningOptions: typeof cleaningOptions;
    customRegexPattern: string;
    customRegexReplacement: string;
    timestamp: number;
  };

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

  // Add state for live preview
  const [liveModeEnabled, setLiveModeEnabled] = useState(true);
  const [livePreview, setLivePreview] = useState('');

  // Add state for drag and drop
  const [isDragging, setIsDragging] = useState(false);

  // Add state for configurations
  const [savedConfigs, setSavedConfigs] = useState<SavedConfig[]>([]);
  const [configName, setConfigName] = useState('');
  const [showSaveConfigModal, setShowSaveConfigModal] = useState(false);
  const [showLoadConfigModal, setShowLoadConfigModal] = useState(false);

  // Add transformation direction state
  const [transformDirection, setTransformDirection] = useState<'columnToRow' | 'rowToColumn' | 'markdown' | 'nameMatcher'>('markdown');
  const [markdownOutputType, setMarkdownOutputType] = useState<'plainText' | 'richText'>('richText');

  // Add state for both HTML and plain text outputs in Markdown mode
  const [markdownHtmlOutput, setMarkdownHtmlOutput] = useState('');
  const [markdownPlainTextOutput, setMarkdownPlainTextOutput] = useState('');

  // Add style level state for rich text output
  const [htmlStyleLevel, setHtmlStyleLevel] = useState<'minimal' | 'basic' | 'full'>('full');

  // Add state for expanded previews
  const [expandedPreview, setExpandedPreview] = useState<'none' | 'rich' | 'plain'>('none');

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const outputRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Add a new transformDirection for name matching
  const [nameMatcherFile1, setNameMatcherFile1] = useState<File | null>(null);
  const [nameMatcherFile2, setNameMatcherFile2] = useState<File | null>(null);
  const [nameMatcherData1, setNameMatcherData1] = useState<string[][]>([]);
  const [nameMatcherData2, setNameMatcherData2] = useState<string[][]>([]);
  const [nameMatcherColumns1, setNameMatcherColumns1] = useState<string[]>([]);
  const [nameMatcherColumns2, setNameMatcherColumns2] = useState<string[]>([]);
  const [nameMatcherSelectedCol1, setNameMatcherSelectedCol1] = useState<string>('');
  const [nameMatcherSelectedCol2, setNameMatcherSelectedCol2] = useState<string>('');
  const [nameMatcherSelectedColOfInterest, setNameMatcherSelectedColOfInterest] = useState<string>('');
  // Add state for multi-select columns of interest and popover
  const [nameMatcherSelectedColsOfInterest, setNameMatcherSelectedColsOfInterest] = useState<string[]>([]);
  const [showColsPopover1, setShowColsPopover1] = useState(false);

  // Add state for help/info section and user controls
  const [showNameMatcherHelp, setShowNameMatcherHelp] = useState(true);
  const [requireSameWordCount, setRequireSameWordCount] = useState(false);
  const [showAllMatches, setShowAllMatches] = useState(false);
  const [strictShortNames, setStrictShortNames] = useState(true);

  // Add state for popovers for name column and column of interest
  const [showNameColPopover1, setShowNameColPopover1] = useState(false);
  const [showColOfInterestPopover1, setShowColOfInterestPopover1] = useState(false);

  // Helper: Parse CSV string to array
  function parseCSV(csv: string): string[][] {
    return csv.split(/\r?\n/).map(row => row.split(','));
  }

  // Helper: Normalize name (sort words, lower case, trim)
  function normalizeName(name: string): string {
    return name
      .split(/\s+/)
      .map(w => w.trim().toLowerCase())
      .filter(Boolean)
      .sort()
      .join(' ');
  }

  // Handle file upload for Name Matcher
  const handleNameMatcherFile = (file: File, which: 1 | 2) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const data = parseCSV(text);
      if (which === 1) {
        setNameMatcherFile1(file);
        setNameMatcherData1(data);
        setNameMatcherColumns1(data[0] || []);
        setNameMatcherSelectedCol1('');
      } else {
        setNameMatcherFile2(file);
        setNameMatcherData2(data);
        setNameMatcherColumns2(data[0] || []);
        setNameMatcherSelectedCol2('');
      }
    };
    reader.readAsText(file);
  };

  // Levenshtein distance for fuzzy matching
  function levenshtein(a: string, b: string): number {
    if (a === b) return 0;
    if (!a.length) return b.length;
    if (!b.length) return a.length;
    const matrix = Array.from({ length: a.length + 1 }, () => Array(b.length + 1).fill(0));
    for (let i = 0; i <= a.length; i++) matrix[i][0] = i;
    for (let j = 0; j <= b.length; j++) matrix[0][j] = j;
    for (let i = 1; i <= a.length; i++) {
      for (let j = 1; j <= b.length; j++) {
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
        );
      }
    }
    return matrix[a.length][b.length];
  }

  // Similarity score (1 = perfect, 0 = no match)
  function similarityScore(a: string, b: string): number {
    const maxLen = Math.max(a.length, b.length);
    if (maxLen === 0) return 1;
    return 1 - levenshtein(a, b) / maxLen;
  }

  // Fuzzy match state
  const [fuzzyThreshold, setFuzzyThreshold] = useState(0.8); // 0.0 - 1.0

  // Download results as CSV
  function downloadNameMatcherResults() {
    if (!nameMatcherResults.length) return;
    const header = [
      'CSV1 Name',
      ...nameMatcherSelectedColsOfInterest,
      'Best Match in CSV2',
      'Similarity Score (%)'
    ];
    const rows = nameMatcherResults.map(row => [
      row.name1,
      ...nameMatcherSelectedColsOfInterest.map(col => row.colsOfInterest?.[col] || ''),
      row.match || '',
      row.score !== undefined ? Math.round(row.score * 100) : ''
    ]);
    const csv = [header, ...rows].map(r => r.map(x => `"${(x || '').toString().replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `name-matcher-results-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  // Helper: Get all matches above threshold
  function getAllMatches(norm1: string, norm2Arr: string[], names2: string[], threshold: number, requireSameWords: boolean, strictShort: boolean): { match: string, score: number }[] {
    return norm2Arr.map((norm2, j) => {
      let score = similarityScore(norm1, norm2);
      // If strict for short names
      if (strictShort && norm1.split(' ').length === 1 && norm1.length < 5) {
        score = norm1 === norm2 ? 1 : 0;
      }
      // If require same word count
      if (requireSameWords && norm1.split(' ').length !== norm2.split(' ').length) {
        score = 0;
      }
      return { match: names2[j], score };
    }).filter(m => m.score >= threshold).sort((a, b) => b.score - a.score);
  }

  // Enhanced runNameMatcher with all options
  const runNameMatcher = () => {
    if (!nameMatcherSelectedCol1 || !nameMatcherSelectedCol2) return;
    const colIdx1 = nameMatcherColumns1.indexOf(nameMatcherSelectedCol1);
    const colIdx2 = nameMatcherColumns2.indexOf(nameMatcherSelectedCol2);
    // Get indices for all selected columns of interest (excluding name col)
    const colsOfInterestIdx = nameMatcherSelectedColsOfInterest
      .filter(col => col !== nameMatcherSelectedCol1)
      .map(col => nameMatcherColumns1.indexOf(col))
      .filter(idx => idx !== -1);
    if (colIdx1 === -1 || colIdx2 === -1) return;
    const names1 = nameMatcherData1.slice(1).map(row => row[colIdx1] || '');
    const names2 = nameMatcherData2.slice(1).map(row => row[colIdx2] || '');
    const norm2 = names2.map(n => normalizeName(n));
    const results = names1.map((name1, i) => {
      const norm1 = normalizeName(name1);
      // All matches above threshold
      const allMatches = getAllMatches(norm1, norm2, names2, fuzzyThreshold, requireSameWordCount, strictShortNames);
      // Best match
      const best = allMatches[0] || { match: null, score: 0 };
      // Get all selected columns of interest for this row
      const colsOfInterest: Record<string, string> = {};
      colsOfInterestIdx.forEach((idx, j) => {
        colsOfInterest[nameMatcherSelectedColsOfInterest[j]] = nameMatcherData1[i + 1]?.[idx] || '';
      });
      return {
        name1,
        colsOfInterest,
        match: best.match,
        score: best.score,
        allMatches
      };
    });
    setNameMatcherResults(results);
  };

  const transformData = async () => {
    if (!inputText.trim()) {
      toast({
        title: "Error",
        description: "Please enter some data to transform",
        variant: "destructive",
      });
      return;
    }

    if (transformDirection === 'columnToRow') {
      // Existing column to row transformation
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

      if (cleaningOptions.replaceMultipleSpaces) {
        lines = lines.map(line => line.replace(/\s+/g, ' '));
      }

      if (cleaningOptions.removeLeadingNumbers) {
        lines = lines.map(line => line.replace(/^\d+\s*/, ''));
      }

      if (cleaningOptions.removeTrailingNumbers) {
        lines = lines.map(line => line.replace(/\s*\d+$/, ''));
      }

      // Apply Smart Cleaning Options
      if (cleaningOptions.smartEmail) {
        const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
        lines = lines.map(line => {
          const match = line.match(emailRegex);
          return match ? match[0].toLowerCase() : ''; // Extract and lowercase, or empty if no email
        });
        // Auto-remove empty lines if smart email is on, as we likely filtered out non-emails
        if (cleaningOptions.smartEmail) {
          lines = lines.filter(line => line !== '');
        }
      }

      if (cleaningOptions.smartPhone) {
        lines = lines.map(line => {
          // Remove all non-digits
          let digits = line.replace(/\D/g, '');
          // Basic SG phone formatting (optional, but good for "smart")
          // If 8 digits and starts with 8 or 9, it's likely a mobile number.
          // For now, just strip non-digits as requested in plan.
          return digits;
        });
      }

      if (cleaningOptions.smartName) {
        lines = lines.map(line => {
          return line
            .toLowerCase()
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
        });
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
      let transformed = lines.join(actualDelimiter);

      // Apply post-transformation whitespace normalization
      transformed = normalizeOutputWhitespace(transformed);

      setOutputText(transformed);
      setIsTransformed(true);

      toast({
        description: `Successfully transformed ${lines.length} items into a single row`,
      });
    } else if (transformDirection === 'rowToColumn') {
      // New row to column transformation
      // Get the delimiter
      const actualDelimiter = delimiter === 'custom' ? customDelimiter : delimiter;

      // Handle special delimiter cases
      let delimiterForSplit = actualDelimiter;
      if (actualDelimiter === '\\t') delimiterForSplit = '\t';

      // Split the input by delimiter
      let items: string[];

      try {
        // For complex delimiters, use RegExp to split
        if (['|', '.', '*', '+', '?', '^', '$', '\\'].some(c => actualDelimiter.includes(c))) {
          items = inputText.split(new RegExp(delimiterForSplit.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'));
        } else {
          // Simple string split for basic delimiters
          items = inputText.split(delimiterForSplit);
        }

        // Apply cleaning options to each item
        if (cleaningOptions.trimWhitespace) {
          items = items.map(item => item.trim());
        }

        if (cleaningOptions.removeEmptyLines) {
          items = items.filter(item => item.trim() !== '');
        }

        if (cleaningOptions.toLowerCase) {
          items = items.map(item => item.toLowerCase());
        }

        if (cleaningOptions.toUpperCase) {
          items = items.map(item => item.toUpperCase());
        }

        if (cleaningOptions.removeSpecialChars) {
          items = items.map(item => item.replace(/[^\w\s]/gi, ''));
        }

        if (cleaningOptions.replaceMultipleSpaces) {
          items = items.map(item => item.replace(/\s+/g, ' '));
        }

        if (cleaningOptions.removeLeadingNumbers) {
          items = items.map(item => item.replace(/^\d+\s*/, ''));
        }

        if (cleaningOptions.removeTrailingNumbers) {
          items = items.map(item => item.replace(/\s*\d+$/, ''));
        }

        // Apply Smart Cleaning Options
        if (cleaningOptions.smartEmail) {
          const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
          items = items.map(item => {
            const match = item.match(emailRegex);
            return match ? match[0].toLowerCase() : '';
          });
          if (cleaningOptions.smartEmail) {
            items = items.filter(item => item !== '');
          }
        }

        if (cleaningOptions.smartPhone) {
          items = items.map(item => {
            let digits = item.replace(/\D/g, '');
            return digits;
          });
        }

        if (cleaningOptions.smartName) {
          items = items.map(item => {
            return item
              .toLowerCase()
              .split(' ')
              .map(word => word.charAt(0).toUpperCase() + word.slice(1))
              .join(' ');
          });
        }

        // Apply custom regex if enabled and valid
        if (cleaningOptions.useCustomRegex && customRegexPattern) {
          try {
            const regex = new RegExp(customRegexPattern, 'g');
            items = items.map(item => item.replace(regex, customRegexReplacement || ''));
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
          items = [...new Set(items)];
        }

        setTotalItems(items.length);

        // Join items with newline to create columns
        const transformed = items.join('\n');

        // Apply post-transformation whitespace normalization
        const normalizedTransformed = normalizeOutputWhitespace(transformed);

        setOutputText(normalizedTransformed);
        setIsTransformed(true);

        toast({
          description: `Successfully transformed row into ${items.length} lines`,
        });
      } catch (error) {
        toast({
          title: "Transformation Error",
          description: "An error occurred while splitting the input. Please check your delimiter.",
          variant: "destructive",
        });
      }
    } else if (transformDirection === 'markdown') {
      // Declare variables outside try/catch so they're in scope throughout the function
      let transformedMarkdown = '';
      let htmlOutput = '';
      let plainTextOutput = '';

      try {
        // Generate initial HTML from markdown
        htmlOutput = await marked.parse(inputText) as string;

        if (markdownOutputType === 'richText') {
          // Clean HTML for Word/Email with the selected styling level
          transformedMarkdown = cleanHtmlForWordEmail(htmlOutput, htmlStyleLevel);
          setMarkdownHtmlOutput(transformedMarkdown);

          // Also generate plain text version
          plainTextOutput = htmlToPlainTextSafe(htmlOutput);
          setMarkdownPlainTextOutput(plainTextOutput);
        } else { // plainText
          // For plain text output, use safer text conversion
          plainTextOutput = htmlToPlainTextSafe(htmlOutput);
          setMarkdownPlainTextOutput(plainTextOutput);
          transformedMarkdown = plainTextOutput;
        }

        // Apply whitespace normalization
        transformedMarkdown = normalizeOutputWhitespace(transformedMarkdown);
        setOutputText(transformedMarkdown);
        setIsTransformed(true);
        setTotalItems(1);

        toast({
          description: `Successfully transformed LLM Output to ${markdownOutputType === 'richText' ? 'Rich Text' : 'Plain Text'}`,
        });
      } catch (error) {
        console.error("Error transforming LLM Output:", error);
        toast({
          title: "Error",
          description: "Failed to transform LLM Output. Please check your input.",
          variant: "destructive",
        });
      }
    } else if (transformDirection === 'nameMatcher') {
      // Name Matcher logic
      runNameMatcher();
    }
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
    setShowColsPopover1(false);
    setShowNameColPopover1(false);
    setShowColOfInterestPopover1(false);
    clearNameMatcherState();
    toast({
      description: "All data cleared",
    });
  };

  const loadSampleData = () => {
    if (transformDirection === 'columnToRow') {
      setInputText(SAMPLE_DATA);
    } else if (transformDirection === 'rowToColumn') {
      setInputText("John Smith,Jane Doe,Michael Johnson,Emily Williams,David Brown");
    } else if (transformDirection === 'markdown') {
      setInputText(MARKDOWN_SAMPLE_DATA);
    }
    setIsSampleLoaded(true);
    toast({
      description: "Sample data loaded",
    });
  };

  // Add drag and drop event handlers
  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      handleFileContent(file);
    }
  };

  // Extract file handling logic into separate function to reuse with drag-and-drop
  const handleFileContent = (file: File) => {
    if (!file) return;

    // Check file type and size
    const validTypes = ['.txt', '.csv', '.md', '.json', 'text/plain', 'text/csv', 'text/markdown', 'application/json'];
    const isValidType = validTypes.some(type =>
      file.name.toLowerCase().endsWith(type) || file.type.includes(type)
    );

    if (!isValidType) {
      toast({
        title: "Invalid file type",
        description: "Please upload a text file (.txt, .csv, .md, .json)",
        variant: "destructive",
      });
      return;
    }

    // Check file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      toast({
        title: "File too large",
        description: "Please upload a file smaller than 5MB",
        variant: "destructive",
      });
      return;
    }

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

  // Update the handleFileUpload function to use the handleFileContent function
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFileContent(file);
    }
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

    // Apply Smart Cleaning Options
    if (cleaningOptions.smartEmail) {
      const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
      cleanedLines = cleanedLines.map(line => {
        const match = line.match(emailRegex);
        return match ? match[0].toLowerCase() : '';
      });
      if (cleaningOptions.smartEmail) {
        cleanedLines = cleanedLines.filter(line => line !== '');
      }
    }

    if (cleaningOptions.smartPhone) {
      cleanedLines = cleanedLines.map(line => {
        let digits = line.replace(/\D/g, '');
        return digits;
      });
    }

    if (cleaningOptions.smartName) {
      cleanedLines = cleanedLines.map(line => {
        return line
          .toLowerCase()
          .split(' ')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
      });
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
  const generateSamplePreview = async () => {
    if (!inputText.trim()) {
      setSamplePreview({
        original: [],
        cleaned: [],
        showPreview: false
      });
      return;
    }

    if (transformDirection === 'markdown') {
      // Sample preview for Markdown
      const mdSample = inputText.substring(0, 200) + (inputText.length > 200 ? '...' : '');
      let cleanedSample = '';
      if (markdownOutputType === 'richText') {
        cleanedSample = await marked.parse(mdSample) as string; // Options set via marked.use()
      } else {
        const htmlFromMdSample = await marked.parse(mdSample) as string;
        cleanedSample = htmlToText(htmlFromMdSample, {
          wordwrap: false,
          selectors: [
            { selector: 'img', format: 'skip' },
            { selector: 'a', options: { hideLinkHrefIfSameAsText: true, ignoreHref: true } }
          ]
        });
      }
      cleanedSample = normalizeOutputWhitespace(cleanedSample).substring(0, 100) + (cleanedSample.length > 100 ? '...' : '');

      setSamplePreview({
        original: [mdSample.substring(0, 100) + (mdSample.length > 100 ? '...' : '')], // Show a snippet of original Markdown
        cleaned: [cleanedSample], // Show a snippet of transformed output
        showPreview: true
      });
      return;
    }

    // Get up to 3 sample lines from the input for non-markdown modes
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

    // Apply Smart Cleaning Options
    if (cleaningOptions.smartEmail) {
      const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
      processedLines = processedLines.map(line => {
        const match = line.match(emailRegex);
        return match ? match[0].toLowerCase() : '';
      });
      // Note: For sample preview, we might want to show empty lines if they were filtered out, 
      // or just show the result. Let's keep consistency.
      // But sample preview expects 1-to-1 mapping for "Changes detected" logic usually?
      // Actually the UI shows "Original" vs "Cleaned". If we filter out lines, the indices won't match.
      // So for sample preview, let's NOT filter out empty lines, just show them as empty.
    }

    if (cleaningOptions.smartPhone) {
      processedLines = processedLines.map(line => {
        let digits = line.replace(/\D/g, '');
        return digits;
      });
    }

    if (cleaningOptions.smartName) {
      processedLines = processedLines.map(line => {
        return line
          .toLowerCase()
          .split(' ')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
      });
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
  }, [inputText, cleaningOptions, customRegexPattern, customRegexReplacement, transformDirection]);

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

  // Add useEffect to update live preview
  useEffect(() => {
    if (liveModeEnabled && inputText) {
      generateLivePreview();
    } else if (!inputText) {
      setLivePreview('');
    }
  }, [inputText, delimiter, customDelimiter, cleaningOptions, customRegexPattern, customRegexReplacement, liveModeEnabled, transformDirection, markdownOutputType]);

  // Function to generate live preview
  const generateLivePreview = async () => {
    if (!inputText.trim()) {
      setLivePreview('');
      return;
    }

    let processedInput = inputText;
    // Note: specific pre-cleaning options from `cleaningOptions` can be applied to `processedInput` here if needed before transformation.

    try {
      let previewText = ''; // Declare previewText at the beginning of the try block

      if (transformDirection === 'columnToRow') {
        let lines = processedInput.split('\n');

        if (cleaningOptions.trimWhitespace) {
          lines = lines.map(line => line.trim());
        }
        if (cleaningOptions.removeEmptyLines) {
          lines = lines.filter(line => line.trim() !== '');
        }
        // ... (Apply other relevant pre-markdown cleaning options for columnToRow preview)
        // For example, case conversion, special chars, multiple spaces, numbers, custom regex
        if (cleaningOptions.toLowerCase) lines = lines.map(l => l.toLowerCase());
        if (cleaningOptions.toUpperCase) lines = lines.map(l => l.toUpperCase());
        if (cleaningOptions.removeSpecialChars) lines = lines.map(l => l.replace(/[^\w\s]/gi, ''));
        if (cleaningOptions.replaceMultipleSpaces) lines = lines.map(l => l.replace(/\s+/g, ' '));
        if (cleaningOptions.removeLeadingNumbers) lines = lines.map(l => l.replace(/^\d+\s*/, ''));
        if (cleaningOptions.removeTrailingNumbers) lines = lines.map(l => l.replace(/\s*\d+$/, ''));

        // Smart Cleaning for Live Preview
        if (cleaningOptions.smartEmail) {
          const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
          lines = lines.map(l => {
            const match = l.match(emailRegex);
            return match ? match[0].toLowerCase() : '';
          });
          if (cleaningOptions.smartEmail) lines = lines.filter(l => l !== '');
        }
        if (cleaningOptions.smartPhone) lines = lines.map(l => l.replace(/\D/g, ''));
        if (cleaningOptions.smartName) lines = lines.map(l => l.toLowerCase().split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '));
        if (cleaningOptions.useCustomRegex && customRegexPattern) {
          try {
            const regex = new RegExp(customRegexPattern, 'g');
            lines = lines.map(line => line.replace(regex, customRegexReplacement || ''));
          } catch (e) { /* ignore regex error in preview */ }
        }
        if (cleaningOptions.removeDuplicates) lines = [...new Set(lines)];


        const actualDelimiter = delimiter === 'custom' ? customDelimiter : delimiter;
        previewText = lines.join(actualDelimiter);

      } else if (transformDirection === 'rowToColumn') {
        const actualDelimiter = delimiter === 'custom' ? customDelimiter : delimiter;
        let delimiterForSplit = actualDelimiter;
        if (actualDelimiter === '\\t') delimiterForSplit = '\t';

        let items: string[];
        if (['|', '.', '*', '+', '?', '^', '$', '\\'].some(c => actualDelimiter.includes(c))) {
          items = processedInput.split(new RegExp(delimiterForSplit.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'));
        } else {
          items = processedInput.split(delimiterForSplit);
        }

        if (cleaningOptions.trimWhitespace) items = items.map(item => item.trim());
        if (cleaningOptions.removeEmptyLines) items = items.filter(item => item.trim() !== '');
        // ... (Apply other relevant pre-markdown cleaning options for rowToColumn preview)
        if (cleaningOptions.toLowerCase) items = items.map(i => i.toLowerCase());
        if (cleaningOptions.toUpperCase) items = items.map(i => i.toUpperCase());
        if (cleaningOptions.removeSpecialChars) items = items.map(i => i.replace(/[^\w\s]/gi, ''));
        if (cleaningOptions.replaceMultipleSpaces) items = items.map(i => i.replace(/\s+/g, ' '));
        if (cleaningOptions.removeLeadingNumbers) items = items.map(i => i.replace(/^\d+\s*/, ''));
        if (cleaningOptions.removeTrailingNumbers) items = items.map(i => i.replace(/\s*\d+$/, ''));

        // Smart Cleaning for Live Preview (Row to Column)
        if (cleaningOptions.smartEmail) {
          const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
          items = items.map(i => {
            const match = i.match(emailRegex);
            return match ? match[0].toLowerCase() : '';
          });
          if (cleaningOptions.smartEmail) items = items.filter(i => i !== '');
        }
        if (cleaningOptions.smartPhone) items = items.map(i => i.replace(/\D/g, ''));
        if (cleaningOptions.smartName) items = items.map(i => i.toLowerCase().split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '));
        if (cleaningOptions.useCustomRegex && customRegexPattern) {
          try {
            const regex = new RegExp(customRegexPattern, 'g');
            items = items.map(item => item.replace(regex, customRegexReplacement || ''));
          } catch (e) { /* ignore regex error in preview */ }
        }
        if (cleaningOptions.removeDuplicates) items = [...new Set(items)];

        const maxPreviewItems = 3;
        const previewItems = items.slice(0, maxPreviewItems);
        previewText = previewItems.join('\n');

        if (items.length > maxPreviewItems) {
          previewText += `\n... (${items.length - maxPreviewItems} more)`;
        }

      } else if (transformDirection === 'markdown') {
        // For Markdown, pre-cleaning options are generally not applied before parsing.
        // They are applied via normalizeOutputWhitespace post-transformation if desired.
        let tempInput = processedInput;
        // However, if any cleaning option is conceptually before markdown parsing (e.g. global trim of input)
        // it could be applied to tempInput here.
        // For now, assuming cleaning options (like regex, case change) are not meant for raw markdown markup.

        let previewMarkdown = '';
        if (markdownOutputType === 'richText') {
          previewMarkdown = await marked.parse(tempInput) as string; // Options set via marked.use()
        } else { // plainText
          const htmlFromTempInput = await marked.parse(tempInput) as string;
          previewMarkdown = htmlToText(htmlFromTempInput, {
            wordwrap: false,
            selectors: [
              { selector: 'img', format: 'skip' },
              { selector: 'a', options: { hideLinkHrefIfSameAsText: true, ignoreHref: true } },
              { selector: 'table', format: 'block' },
              { selector: 'tr', format: 'block', options: { itemSuffix: '\n' } },
              { selector: 'td', format: 'inline', options: { suffix: '\t' } },
              { selector: 'th', format: 'inline', options: { suffix: '\t' } },
              // { selector: 'li', format: 'listItem', options: { itemPrefix: '  - ' } } // Testing default
            ],
            preserveNewlines: true,
            // Removed whitespacePreformatted
          });
        }
        previewText = previewMarkdown;
      }

      // Apply post-transformation whitespace normalization for live preview
      const normalizedPreview = normalizeOutputWhitespace(previewText);

      const maxPreviewLength = 100;
      setLivePreview(
        normalizedPreview.length > maxPreviewLength
          ? `${normalizedPreview.substring(0, maxPreviewLength)}...`
          : normalizedPreview
      );
    } catch (error) {
      setLivePreview('Error generating preview');
      console.error("Live preview error:", error);
    }
  };

  // Add keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only process keyboard shortcuts if Ctrl/Cmd key is pressed
      if (!(e.ctrlKey || e.metaKey)) return;

      // Check for various keyboard shortcuts
      switch (e.key) {
        case 'Enter':
          // Ctrl+Enter to transform data
          if (inputText.trim()) {
            e.preventDefault();
            transformData();
          }
          break;
        case 'c':
          // Ctrl+Shift+C to copy output (not interfere with regular Ctrl+C)
          if (e.shiftKey && outputText) {
            e.preventDefault();
            copyToClipboard();
          }
          break;
        case 'l':
          // Ctrl+L to toggle live preview
          e.preventDefault();
          setLiveModeEnabled(prev => !prev);
          break;
        case 'd':
          // Ctrl+D to clear all
          e.preventDefault();
          clearAll();
          break;
        case 's':
          // Ctrl+S to load sample data
          if (!isSampleLoaded) {
            e.preventDefault();
            loadSampleData();
          }
          break;
      }
    };

    // Add event listener for keyboard shortcuts
    window.addEventListener('keydown', handleKeyDown);

    // Clean up the event listener on component unmount
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [inputText, outputText, isSampleLoaded]);

  // Load saved configurations from localStorage on mount
  useEffect(() => {
    const configs = localStorage.getItem('transformConfigs');
    if (configs) {
      try {
        const parsedConfigs = JSON.parse(configs) as SavedConfig[];
        setSavedConfigs(parsedConfigs);
      } catch (e) {
        console.error('Failed to parse saved configurations', e);
      }
    }
  }, []);

  // Function to save current configuration
  const saveCurrentConfig = () => {
    if (!configName.trim()) {
      toast({
        title: "Config name required",
        description: "Please enter a name for your configuration",
        variant: "destructive",
      });
      return;
    }

    const newConfig: SavedConfig = {
      id: Date.now().toString(),
      name: configName.trim(),
      delimiter,
      customDelimiter,
      cleaningOptions: { ...cleaningOptions },
      customRegexPattern,
      customRegexReplacement,
      timestamp: Date.now()
    };

    const updatedConfigs = [...savedConfigs, newConfig];
    setSavedConfigs(updatedConfigs);
    localStorage.setItem('transformConfigs', JSON.stringify(updatedConfigs));

    setConfigName('');
    setShowSaveConfigModal(false);

    toast({
      description: `Configuration "${newConfig.name}" saved successfully`,
    });
  };

  // Function to load a saved configuration
  const loadConfig = (config: SavedConfig) => {
    setDelimiter(config.delimiter);
    setCustomDelimiter(config.customDelimiter);
    setCleaningOptions({ ...config.cleaningOptions });
    setCustomRegexPattern(config.customRegexPattern);
    setCustomRegexReplacement(config.customRegexReplacement);

    setShowLoadConfigModal(false);

    toast({
      description: `Configuration "${config.name}" loaded successfully`,
    });
  };

  // Function to delete a saved configuration
  const deleteConfig = (id: string, name: string) => {
    const updatedConfigs = savedConfigs.filter(config => config.id !== id);
    setSavedConfigs(updatedConfigs);
    localStorage.setItem('transformConfigs', JSON.stringify(updatedConfigs));

    toast({
      description: `Configuration "${name}" deleted`,
    });
  };

  const normalizeOutputWhitespace = (text: string): string => {
    if (!cleaningOptions.normalizeWhitespace) return text;

    // Protect content within <pre> tags from whitespace normalization
    const protectedBlocks: string[] = [];
    let tempText = text.replace(/<pre[^>]*>([\s\S]*?)<\/pre>/gi, (match, preContent) => {
      protectedBlocks.push(preContent);
      return `<PRE_PLACEHOLDER_${protectedBlocks.length - 1}>`;
    });

    // 1. Replace multiple newlines with a single newline 
    tempText = tempText.replace(/(\r\n|\n|\r){2,}/g, '\n');

    // 2. Trim leading/trailing whitespace from each line (outside <pre>)
    tempText = tempText.split('\n').map(line => line.trim()).join('\n');

    // 3. Optional: Remove leading spaces from lines that are not part of lists (outside <pre>)
    if (transformDirection !== 'markdown' || markdownOutputType !== 'richText') {
      tempText = tempText.split('\n').map(line => {
        if (line.match(/^(\s*)[-*+>|#]/) || line.startsWith('<PRE_PLACEHOLDER_')) {
          return line;
        }
        return line.replace(/^\s+/, '');
      }).join('\n');
    }

    // 4. Final trim of the whole string
    tempText = tempText.trim();

    // Restore protected <pre> blocks
    tempText = tempText.replace(/<PRE_PLACEHOLDER_(\d+)>/g, (_match, indexStr) => {
      const index = parseInt(indexStr, 10);
      return `<pre>${protectedBlocks[index]}</pre>`; // Assuming no attributes for <pre> for simplicity here
    });

    return tempText;
  };

  // Effect to load highlight.js CSS
  useEffect(() => {
    if (!document.getElementById(HIGHLIGHT_JS_CSS_ID)) {
      const link = document.createElement('link');
      link.id = HIGHLIGHT_JS_CSS_ID;
      link.rel = 'stylesheet';
      link.href = '//cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/default.min.css';
      document.head.appendChild(link);
    }
    // Optional: Cleanup function to remove the stylesheet when the component unmounts
    // return () => {
    //   const existingLink = document.getElementById(HIGHLIGHT_JS_CSS_ID);
    //   if (existingLink) {
    //     document.head.removeChild(existingLink);
    //   }
    // };
  }, []);

  // Add copy as HTML and copy as plain text functions
  const copyHtmlToClipboard = () => {
    if (!markdownHtmlOutput) return toast({ description: 'Nothing to copy', variant: 'destructive' });
    navigator.clipboard.writeText(markdownHtmlOutput);
    toast({ description: 'HTML copied to clipboard' });
  };
  const copyPlainTextToClipboard = () => {
    if (!markdownPlainTextOutput) return toast({ description: 'Nothing to copy', variant: 'destructive' });
    navigator.clipboard.writeText(markdownPlainTextOutput);
    toast({ description: 'Plain text copied to clipboard' });
  };

  // Add this function after copyPlainTextToClipboard
  const copyFormattedHtmlToClipboard = async () => {
    if (!markdownHtmlOutput) {
      return toast({ description: 'Nothing to copy', variant: 'destructive' });
    }

    const success = await copyHtmlWithFormatting(markdownHtmlOutput);

    if (success) {
      toast({ description: 'Formatted HTML copied to clipboard (paste with formatting preserved)' });
    } else {
      // Fall back to regular HTML copy if the formatted copy fails
      navigator.clipboard.writeText(markdownHtmlOutput);
      toast({ description: 'HTML copied to clipboard (as code only)' });
    }
  };

  // Add new export functions below copyFormattedHtmlToClipboard
  const exportAsHtml = () => {
    if (!markdownHtmlOutput) {
      return toast({ description: 'Nothing to export', variant: 'destructive' });
    }

    // Create full HTML document
    const fullHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Exported LLM Output</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif; line-height: 1.5; padding: 20px; max-width: 800px; margin: 0 auto; }
    code { background: #f4f4f4; padding: 2px 4px; border-radius: 3px; font-family: monospace; }
    pre { background: #f4f4f4; padding: 10px; border-radius: 5px; overflow: auto; }
    pre code { background: none; padding: 0; }
    table { border-collapse: collapse; width: 100%; margin: 16px 0; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background-color: #f1f1f1; }
    img { max-width: 100%; }
    blockquote { border-left: 4px solid #ddd; margin-left: 0; padding-left: 16px; color: #666; }
  </style>
</head>
<body>
${markdownHtmlOutput}
</body>
</html>`;

    const blob = new Blob([fullHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `llm-output-export-${new Date().toISOString().slice(0, 10)}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({ description: 'Exported as HTML file' });
  };

  const exportAsText = () => {
    if (!markdownPlainTextOutput) {
      return toast({ description: 'Nothing to export', variant: 'destructive' });
    }

    const blob = new Blob([markdownPlainTextOutput], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `llm-output-export-${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({ description: 'Exported as text file' });
  };

  const exportAsWordDoc = () => {
    if (!markdownHtmlOutput) {
      return toast({ description: 'Nothing to export', variant: 'destructive' });
    }

    // Create Word-compatible HTML
    const wordHtml = `<html xmlns:o="urn:schemas-microsoft-com:office:office" 
      xmlns:w="urn:schemas-microsoft-com:office:word" 
      xmlns="http://www.w3.org/TR/REC-html40">
<head>
  <meta charset="utf-8">
  <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
  <title>Exported LLM Output</title>
  <!--[if gte mso 9]>
  <xml>
    <w:WordDocument>
      <w:View>Print</w:View>
      <w:Zoom>90</w:Zoom>
      <w:DoNotOptimizeForBrowser/>
    </w:WordDocument>
  </xml>
  <![endif]-->
  <style>
    /* Word-specific styles */
    body { font-family: 'Calibri', sans-serif; font-size: 11pt; line-height: 1.5; }
    h1, h2, h3, h4, h5, h6 { font-family: 'Calibri', sans-serif; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1pt solid #ccc; padding: 4pt; }
    th { background-color: #f1f1f1; }
    code { font-family: 'Courier New', monospace; background-color: #f4f4f4; }
    pre { background-color: #f4f4f4; padding: 6pt; border: 1pt solid #ccc; }
  </style>
</head>
<body>
${markdownHtmlOutput}
</body>
</html>`;

    const blob = new Blob([wordHtml], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `llm-output-export-${new Date().toISOString().slice(0, 10)}.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({ description: 'Exported as Word document (.doc)' });
  };

  // Add Excel export function
  const exportAsExcel = () => {
    if (!markdownHtmlOutput) {
      return toast({ description: 'Nothing to export', variant: 'destructive' });
    }

    // Create Excel-compatible HTML
    const excelHtml = `<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:x="urn:schemas-microsoft-com:office:excel"
      xmlns="http://www.w3.org/TR/REC-html40">
<head>
  <meta charset="utf-8">
  <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
  <title>Exported LLM Output</title>
  <!--[if gte mso 9]>
  <xml>
    <x:ExcelWorkbook>
      <x:ExcelWorksheets>
        <x:ExcelWorksheet>
          <x:Name>LLM Output Export</x:Name>
          <x:WorksheetOptions>
            <x:DisplayGridlines/>
          </x:WorksheetOptions>
        </x:ExcelWorksheet>
      </x:ExcelWorksheets>
    </x:ExcelWorkbook>
  </xml>
  <![endif]-->
  <style>
    /* Excel-specific styles */
    body { font-family: 'Calibri', sans-serif; font-size: 11pt; }
    h1 { font-size: 16pt; font-weight: bold; color: #333; }
    h2 { font-size: 14pt; font-weight: bold; color: #333; }
    h3 { font-size: 12pt; font-weight: bold; color: #333; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1pt solid #ccc; padding: 4pt; }
    th { background-color: #f1f1f1; font-weight: bold; }
    code { font-family: 'Courier New', monospace; background-color: #f4f4f4; }
    pre { background-color: #f4f4f4; padding: 6pt; border: 1pt solid #ccc; }
    .xl-cell { mso-number-format: "\@"; } /* Format as text */
  </style>
</head>
<body>
${markdownHtmlOutput}
</body>
</html>`;

    const blob = new Blob([excelHtml], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `llm-output-export-${new Date().toISOString().slice(0, 10)}.xls`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({ description: 'Exported as Excel spreadsheet (.xls)' });
  };

  // Add function to handle escape key to exit expanded preview
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && expandedPreview !== 'none') {
        setExpandedPreview('none');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [expandedPreview]);

  // Helper: Preview first 5 rows of a column
  function previewColumn(data: string[][], colIdx: number): string[] {
    if (colIdx === -1) return [];
    return data.slice(1, 6).map(row => row[colIdx] || '');
  }

  // Helper: Clear all Name Matcher state
  function clearNameMatcherState() {
    setNameMatcherFile1(null);
    setNameMatcherFile2(null);
    setNameMatcherData1([]);
    setNameMatcherData2([]);
    setNameMatcherColumns1([]);
    setNameMatcherColumns2([]);
    setNameMatcherSelectedCol1('');
    setNameMatcherSelectedCol2('');
    setNameMatcherSelectedColOfInterest('');
    setNameMatcherResults([]);
  }

  // Helper: Type guard for name matcher mode
  function isNameMatcherMode(val: any): boolean {
    return val === 'nameMatcher';
  }

  // Update the type for nameMatcherResults and setNameMatcherResults
  interface NameMatcherResult {
    name1: string;
    colsOfInterest: Record<string, string>;
    match: string | null;
    score?: number;
    allMatches?: { match: string; score: number }[];
  }
  const [nameMatcherResults, setNameMatcherResults] = useState<NameMatcherResult[]>([]);

  return (
    <div className="space-y-6">
      {/* Only render the main transformer UI and how-to card if not in Name Matcher mode */}
      {transformDirection !== 'nameMatcher' && (
        <>
          <Card>
            <CardHeader className="bg-gradient-to-r from-purple-50/50 to-pink-50/50 border-b border-purple-100/50">
              <CardTitle className="text-lg font-semibold text-purple-800">
                Data Format Transformer
              </CardTitle>
            </CardHeader>

            {/* Add direction selection toggle */}
            <div className="px-6 pt-6 pb-2">
              <div className="bg-purple-50/70 rounded-lg p-1 flex">
                <button
                  onClick={() => setTransformDirection('columnToRow')}
                  className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${transformDirection === 'columnToRow'
                    ? 'bg-white shadow-sm text-purple-700'
                    : 'text-purple-600 hover:bg-white/60'
                    }`}
                >
                  <span className="flex items-center justify-center">
                    <svg className="h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="2" />
                      <path d="M9 3v18" />
                      <path d="M3 9h6" />
                      <path d="M3 15h6" />
                      <path d="M15 12h2" />
                      <path d="M18 9l3 3-3 3" />
                    </svg>
                    Column → Row
                  </span>
                </button>
                <button
                  onClick={() => setTransformDirection('rowToColumn')}
                  className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${transformDirection === 'rowToColumn'
                    ? 'bg-white shadow-sm text-purple-700'
                    : 'text-purple-600 hover:bg-white/60'
                    }`}
                >
                  <span className="flex items-center justify-center">
                    <svg className="h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="2" />
                      <path d="M9 3v18" />
                      <path d="M3 9h6" />
                      <path d="M3 15h6" />
                      <path d="M15 12h2" />
                      <path d="M18 15l3-3-3-3" />
                    </svg>
                    Row → Column
                  </span>
                </button>
                <button
                  onClick={() => setTransformDirection('markdown')}
                  className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${transformDirection === 'markdown'
                    ? 'bg-white shadow-sm text-purple-700'
                    : 'text-purple-600 hover:bg-white/60'
                    }`}
                >
                  <span className="flex items-center justify-center">
                    <svg className="h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M10 13a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1v-2z" />
                      <path d="M2 3h6a4 4 0 0 1 4 4v10a2 2 0 0 0-2-2H3a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" />
                      <path d="M16 3h1a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-1" />
                    </svg>
                    LLM Output
                  </span>
                </button>
                <button
                  onClick={() => setTransformDirection('nameMatcher')}
                  className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${isNameMatcherMode(transformDirection)
                    ? 'bg-white shadow-sm text-purple-700'
                    : 'text-purple-600 hover:bg-white/60'
                    }`}
                >
                  <span className="flex items-center justify-center">
                    <svg className="h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 01.88 7.903A5.5 5.5 0 1112 6.5" /></svg>
                    Name Matcher
                  </span>
                </button>
              </div>
            </div>

            {/* Add output format and styling options for markdown mode */}
            {transformDirection === 'markdown' && (
              <div className="px-6 pb-2 pt-2">
                <div className="bg-purple-50/60 rounded-lg p-3 flex flex-wrap gap-4 items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Label htmlFor="markdownOutputType" className="text-sm">Output Format:</Label>
                    <Select
                      value={markdownOutputType}
                      onValueChange={(value: 'plainText' | 'richText') => setMarkdownOutputType(value)}
                    >
                      <SelectTrigger id="markdownOutputType" className="h-8 w-[140px] border-purple-200">
                        <SelectValue placeholder="Select format" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="plainText">Plain Text</SelectItem>
                        <SelectItem value="richText">Rich Text (HTML)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {markdownOutputType === 'richText' && (
                    <div className="flex items-center space-x-3">
                      <Label htmlFor="htmlStyleLevel" className="text-sm">Styling Level:</Label>
                      <Select
                        value={htmlStyleLevel}
                        onValueChange={(value: 'minimal' | 'basic' | 'full') => setHtmlStyleLevel(value as 'minimal' | 'basic' | 'full')}
                      >
                        <SelectTrigger id="htmlStyleLevel" className="h-8 w-[140px] border-purple-200">
                          <SelectValue placeholder="Select style" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="minimal">Minimal Styling</SelectItem>
                          <SelectItem value="basic">Basic Styling</SelectItem>
                          <SelectItem value="full">Full Styling</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div className="w-full text-xs text-purple-600">
                    <Info className="h-3 w-3 inline-block mr-1" />
                    {markdownOutputType === 'plainText'
                      ? "Plain Text converts LLM Output to clean text for simple emails or plain text fields."
                      : htmlStyleLevel === 'minimal'
                        ? "Minimal styling: Just the HTML structure without additional styles (most compatible)."
                        : htmlStyleLevel === 'basic'
                          ? "Basic styling: Essential styles for tables and code blocks (good for most editors)."
                          : "Full styling: Comprehensive styles for all elements (best visual appearance)."}
                  </div>
                </div>
              </div>
            )}

            <CardContent className="pt-2">
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
                        placeholder={
                          transformDirection === 'columnToRow'
                            ? "Paste your column data here (one item per line)..."
                            : transformDirection === 'rowToColumn'
                              ? "Paste your delimited data here (items separated by delimiter)..."
                              : "Paste your LLM Output text here..."
                        }
                        className="min-h-[200px] font-mono text-sm border-purple-200"
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                      />
                    </TabsContent>

                    <TabsContent value="upload" className="mt-2">
                      <div
                        className={`
                          border-2 border-dashed rounded-md p-6 text-center
                          ${isDragging
                            ? 'border-purple-400 bg-purple-100/70'
                            : 'border-purple-200 bg-purple-50/50'
                          }
                          transition-colors duration-200
                        `}
                        onDragEnter={handleDragEnter}
                        onDragLeave={handleDragLeave}
                        onDragOver={handleDragOver}
                        onDrop={handleDrop}
                      >
                        <input
                          type="file"
                          ref={fileInputRef}
                          onChange={handleFileUpload}
                          accept=".txt,.csv,.md,.json,text/plain,text/csv"
                          className="hidden"
                        />
                        <div className="flex flex-col items-center justify-center space-y-2">
                          <div className={`rounded-full p-3 ${isDragging ? 'bg-purple-200' : 'bg-purple-100'}`}>
                            <FileUp className={`h-6 w-6 ${isDragging ? 'text-purple-700' : 'text-purple-600'}`} />
                          </div>
                          <h4 className="font-medium text-purple-800">
                            {isDragging ? 'Drop File Here' : 'Upload a Text File'}
                          </h4>
                          <p className="text-xs text-purple-600 max-w-xs">
                            {isDragging
                              ? 'Release to upload your file'
                              : 'Drag & drop your file here or click the button below'
                            }
                          </p>
                          <Button
                            variant="outline"
                            onClick={() => fileInputRef.current?.click()}
                            className={`mt-2 ${isDragging
                              ? 'border-purple-400 bg-purple-200 hover:bg-purple-300 text-purple-800'
                              : 'border-purple-300 hover:bg-purple-100 text-purple-700'
                              }`}
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
                      {transformDirection === 'columnToRow'
                        ? "Enter data with one item per line. The transformer will combine all lines into a single row."
                        : transformDirection === 'rowToColumn'
                          ? "Enter data with items separated by delimiter. The transformer will split items into separate lines."
                          : "Paste your LLM Output content. It will be transformed into clean plain or rich text."}
                    </AlertDescription>
                  </Alert>
                </div>

                {/* Configuration and Output Section */}
                <div className="space-y-4">
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-base font-medium mb-3">Configure Transformation</h3>

                      {/* Conditionally render Delimiter options only if not in LLM Output mode */}
                      {transformDirection !== 'markdown' && (
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
                      )}
                    </div>

                    {/* Add Data Cleaning Options - Already conditional based on transformDirection */}
                    {transformDirection !== 'markdown' && (
                      <div>
                        <h3 className="text-base font-medium mb-2 flex items-center">
                          <svg className="h-4 w-4 mr-1.5 text-purple-600" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
                            <path d="M12 18a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" />
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

                          <label className="flex items-center space-x-2 text-sm">
                            <input
                              type="checkbox"
                              checked={cleaningOptions.normalizeWhitespace}
                              onChange={() => toggleCleaningOption('normalizeWhitespace')}
                              className="h-4 w-4 rounded border-purple-300 text-purple-600 focus:ring-purple-500"
                            />
                            <span>Normalize Whitespace (Post-Transform)</span>
                          </label>
                        </div>

                        {/* Smart Cleaning Section */}
                        <div className="mt-4 border-t border-purple-100 pt-3">
                          <h4 className="text-sm font-medium mb-2 text-purple-800 flex items-center">
                            <span className="bg-purple-100 p-1 rounded mr-2">
                              <svg className="h-3 w-3 text-purple-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                              </svg>
                            </span>
                            Smart Presets
                          </h4>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <label className={`
                                flex flex-col items-center justify-center p-3 rounded-lg border cursor-pointer transition-all
                                ${cleaningOptions.smartEmail
                                ? 'bg-purple-50 border-purple-300 ring-1 ring-purple-300'
                                : 'bg-white border-gray-200 hover:border-purple-200 hover:bg-purple-50/30'}
                              `}>
                              <input
                                type="checkbox"
                                className="sr-only"
                                checked={cleaningOptions.smartEmail}
                                onChange={() => toggleCleaningOption('smartEmail')}
                              />
                              <span className="font-medium text-sm text-purple-900 mb-1">Email Cleaner</span>
                              <span className="text-[10px] text-center text-gray-500 leading-tight">Extracts & lowercases emails</span>
                            </label>

                            <label className={`
                                flex flex-col items-center justify-center p-3 rounded-lg border cursor-pointer transition-all
                                ${cleaningOptions.smartPhone
                                ? 'bg-purple-50 border-purple-300 ring-1 ring-purple-300'
                                : 'bg-white border-gray-200 hover:border-purple-200 hover:bg-purple-50/30'}
                              `}>
                              <input
                                type="checkbox"
                                className="sr-only"
                                checked={cleaningOptions.smartPhone}
                                onChange={() => toggleCleaningOption('smartPhone')}
                              />
                              <span className="font-medium text-sm text-purple-900 mb-1">Phone Cleaner</span>
                              <span className="text-[10px] text-center text-gray-500 leading-tight">Strips non-digits</span>
                            </label>

                            <label className={`
                                flex flex-col items-center justify-center p-3 rounded-lg border cursor-pointer transition-all
                                ${cleaningOptions.smartName
                                ? 'bg-purple-50 border-purple-300 ring-1 ring-purple-300'
                                : 'bg-white border-gray-200 hover:border-purple-200 hover:bg-purple-50/30'}
                              `}>
                              <input
                                type="checkbox"
                                className="sr-only"
                                checked={cleaningOptions.smartName}
                                onChange={() => toggleCleaningOption('smartName')}
                              />
                              <span className="font-medium text-sm text-purple-900 mb-1">Name Formatter</span>
                              <span className="text-[10px] text-center text-gray-500 leading-tight">Converts to Title Case</span>
                            </label>
                          </div>
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
                                  <span className={`font-semibold ${(cleaningOptions.removeEmptyLines ?
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
                                        <div className="font-mono text-[10px] whitespace-pre-wrap break-words max-w-xs overflow-hidden text-gray-600 py-0.5">{originalLine || <span className="italic text-gray-400">(empty line)</span>}</div>
                                      </div>
                                      <div className="flex items-start">
                                        <span className="bg-purple-500 text-white rounded-full h-4 w-4 flex items-center justify-center text-[10px] mr-1.5 flex-shrink-0 mt-0.5">A</span>
                                        <div className="font-mono text-[10px] whitespace-pre-wrap break-words max-w-xs overflow-hidden text-purple-700 font-medium py-0.5">{samplePreview.cleaned[index] || <span className="italic text-purple-300">(empty line)</span>}</div>
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
                    )}
                  </div>

                  {/* Conditionally render Live Preview only if not in LLM Output mode */}
                  {transformDirection !== 'markdown' && (
                    <div className="mt-4 border-t border-purple-100 pt-3">
                      <div className="flex justify-between items-center mb-2">
                        <h3 className="text-base font-medium flex items-center">
                          <svg className="h-4 w-4 mr-1.5 text-purple-600" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                          </svg>
                          Live Preview
                        </h3>
                        <div className="flex items-center">
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              className="sr-only peer"
                              checked={liveModeEnabled}
                              onChange={() => setLiveModeEnabled(!liveModeEnabled)}
                            />
                            <div className="w-9 h-5 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div>
                            <span className="ml-2 text-xs font-medium text-gray-500">
                              {liveModeEnabled ? 'Enabled' : 'Disabled'}
                            </span>
                          </label>
                        </div>
                      </div>

                      {liveModeEnabled && (
                        <div className="relative">
                          <div className="p-2 border rounded-md bg-gray-50 border-purple-100 overflow-hidden h-10 flex items-center">
                            {livePreview ? (
                              <div className="font-mono text-xs text-purple-700 truncate">
                                {livePreview}
                              </div>
                            ) : (
                              <div className="text-xs text-gray-400 italic">
                                Live preview will appear here as you type...
                              </div>
                            )}
                          </div>
                          <div className="absolute top-0 right-0 bottom-0 flex items-center pr-2">
                            <div className="text-[10px] px-1.5 py-0.5 rounded bg-purple-100 text-purple-700">
                              Preview
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Conditionally render Save/Load Configurations only if not in LLM Output mode */}
                  {transformDirection !== 'markdown' && (
                    <div className="mt-4 border-t border-purple-100 pt-3">
                      <div className="flex justify-between items-center mb-2">
                        <h3 className="text-base font-medium flex items-center">
                          <svg className="h-4 w-4 mr-1.5 text-purple-600" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                            <polyline points="17 21 17 13 7 13 7 21"></polyline>
                            <polyline points="7 3 7 8 15 8"></polyline>
                          </svg>
                          Configurations
                        </h3>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowSaveConfigModal(true)}
                            className="h-8 text-xs border-purple-200 hover:bg-purple-50 text-purple-700"
                          >
                            Save Config
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowLoadConfigModal(true)}
                            className="h-8 text-xs border-purple-200 hover:bg-purple-50 text-purple-700"
                            disabled={savedConfigs.length === 0}
                          >
                            Load Config
                          </Button>
                        </div>
                      </div>

                      {/* Save Configuration Modal */}
                      {showSaveConfigModal && (
                        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center">
                          <div className="bg-white rounded-lg shadow-lg p-4 max-w-md w-full mx-4">
                            <h4 className="text-lg font-medium mb-3">Save Configuration</h4>
                            <div className="mb-4">
                              <Label htmlFor="configName" className="block mb-2 text-sm">Configuration Name</Label>
                              <Input
                                id="configName"
                                placeholder="e.g., My CSV Cleaning Setup"
                                value={configName}
                                onChange={(e) => setConfigName(e.target.value)}
                                className="border-purple-200"
                              />
                            </div>
                            <div className="mb-4 text-xs text-gray-500">
                              This will save your current delimiter and all cleaning options.
                            </div>
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="outline"
                                onClick={() => setShowSaveConfigModal(false)}
                              >
                                Cancel
                              </Button>
                              <Button
                                onClick={saveCurrentConfig}
                                className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
                              >
                                Save
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Load Configuration Modal */}
                      {showLoadConfigModal && (
                        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center">
                          <div className="bg-white rounded-lg shadow-lg p-4 max-w-md w-full mx-4">
                            <h4 className="text-lg font-medium mb-3">Load Configuration</h4>
                            {savedConfigs.length > 0 ? (
                              <div className="max-h-60 overflow-auto mb-4">
                                <div className="space-y-2">
                                  {savedConfigs.map(config => (
                                    <div
                                      key={config.id}
                                      className="p-3 border border-purple-100 rounded-md hover:bg-purple-50 transition-colors cursor-pointer flex justify-between items-center"
                                      onClick={() => loadConfig(config)}
                                    >
                                      <div>
                                        <div className="font-medium">{config.name}</div>
                                        <div className="text-xs text-gray-500">
                                          {new Date(config.timestamp).toLocaleString()} •
                                          Delimiter: {config.delimiter === 'custom' ? config.customDelimiter : config.delimiter}
                                        </div>
                                      </div>
                                      <button
                                        className="text-red-500 hover:text-red-700"
                                        onClick={(e) => {
                                          e.stopPropagation(); // Prevent loadConfig from being called
                                          deleteConfig(config.id, config.name);
                                        }}
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ) : (
                              <div className="py-6 text-center text-gray-500">
                                No saved configurations found.
                              </div>
                            )}
                            <div className="flex justify-end">
                              <Button
                                variant="outline"
                                onClick={() => setShowLoadConfigModal(false)}
                              >
                                Close
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Transform Button - render for all modes */}
                  <div className="pt-2">
                    <Button
                      onClick={transformData}
                      className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
                      disabled={!inputText.trim() || ((transformDirection === 'columnToRow' || transformDirection === 'rowToColumn') && delimiter === 'custom' && !customDelimiter)}
                    >
                      {transformDirection === 'columnToRow'
                        ? 'Transform to Row'
                        : transformDirection === 'rowToColumn'
                          ? 'Transform to Column'
                          : 'Transform LLM Output'}
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

                    {/* LLM Output-specific output options */}
                    {transformDirection === 'markdown' && isTransformed && (
                      <div className="mt-4">
                        <div className="flex gap-2 mb-2 flex-wrap">
                          <Button size="sm" variant="outline" onClick={copyHtmlToClipboard} className="border-purple-200 text-white bg-purple-600 hover:bg-purple-700">
                            <Code className="h-3.5 w-3.5 mr-1.5" />
                            Copy as HTML Code
                          </Button>
                          <Button size="sm" variant="outline" onClick={copyFormattedHtmlToClipboard} className="border-purple-200 text-white bg-pink-500 hover:bg-pink-600">
                            <Copy className="h-3.5 w-3.5 mr-1.5" />
                            Copy with Formatting
                          </Button>
                          <Button size="sm" variant="outline" onClick={copyPlainTextToClipboard} className="border-purple-200 text-white bg-purple-500 hover:bg-purple-600">
                            <FileText className="h-3.5 w-3.5 mr-1.5" />
                            Copy as Plain Text
                          </Button>

                          <div className="w-[1px] h-5 bg-gray-200 mx-1"></div>

                          <Button size="sm" variant="outline" onClick={exportAsHtml} className="border-purple-200 text-white bg-blue-500 hover:bg-blue-600">
                            <Download className="h-3.5 w-3.5 mr-1.5" />
                            Export as HTML
                          </Button>
                          <Button size="sm" variant="outline" onClick={exportAsText} className="border-purple-200 text-white bg-green-500 hover:bg-green-600">
                            <Download className="h-3.5 w-3.5 mr-1.5" />
                            Export as Text
                          </Button>
                          <Button size="sm" variant="outline" onClick={exportAsWordDoc} className="border-purple-200 text-white bg-indigo-500 hover:bg-indigo-600">
                            <FileText className="h-3.5 w-3.5 mr-1.5" />
                            Export as Word
                          </Button>
                          <Button size="sm" variant="outline" onClick={exportAsExcel} className="border-purple-200 text-white bg-yellow-500 hover:bg-yellow-600">
                            <FileText className="h-3.5 w-3.5 mr-1.5" />
                            Export as Excel
                          </Button>
                        </div>

                        {/* Expanded preview overlay */}
                        {expandedPreview !== 'none' && (
                          <div className="fixed inset-0 bg-white z-50 p-4 overflow-auto flex flex-col">
                            <div className="flex justify-between items-center mb-4 sticky top-0 bg-white py-2 border-b">
                              <h3 className="font-semibold text-lg text-purple-800">
                                {expandedPreview === 'rich' ? 'Rich Text Preview' : 'Plain Text Preview'}
                              </h3>
                              <div className="flex items-center gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    if (expandedPreview === 'rich') {
                                      copyFormattedHtmlToClipboard();
                                    } else {
                                      copyPlainTextToClipboard();
                                    }
                                  }}
                                  className="border-purple-200 text-white bg-purple-600 hover:bg-purple-700"
                                >
                                  <Copy className="h-4 w-4 mr-1.5" />
                                  Copy Content
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setExpandedPreview('none')}
                                  className="border-purple-200 text-purple-700"
                                >
                                  <Minimize2 className="h-4 w-4 mr-1.5" />
                                  Exit Fullscreen
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setExpandedPreview('none')}
                                  className="text-gray-500 h-8 w-8 p-0"
                                >
                                  <X className="h-5 w-5" />
                                </Button>
                              </div>
                            </div>

                            <div className="flex-grow overflow-auto p-4 border rounded bg-white">
                              {expandedPreview === 'rich' ? (
                                <div dangerouslySetInnerHTML={{ __html: markdownHtmlOutput }} />
                              ) : (
                                <div className="font-mono whitespace-pre-wrap">{markdownPlainTextOutput}</div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Restructure the grid to have previews stacked vertically instead of side by side */}
                        <div className="flex flex-col gap-6">
                          <div>
                            <div className="font-semibold text-xs text-purple-700 mb-1 flex justify-between items-center">
                              <span>Rich Text Preview (for Word/Email)</span>
                              <div className="flex items-center gap-2">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={copyFormattedHtmlToClipboard}
                                  className="h-7 text-xs text-purple-700"
                                >
                                  <Copy className="h-3.5 w-3.5 mr-1.5" />
                                  Copy
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setExpandedPreview('rich')}
                                  className="h-7 text-xs text-purple-700"
                                >
                                  <Maximize2 className="h-3.5 w-3.5 mr-1.5" />
                                  Expand
                                </Button>
                              </div>
                            </div>
                            <div className="p-4 border rounded bg-white border-purple-100 min-h-[300px] relative overflow-auto" style={{ maxHeight: '400px' }}>
                              <div dangerouslySetInnerHTML={{ __html: markdownHtmlOutput }} />
                            </div>
                          </div>
                          <div>
                            <div className="font-semibold text-xs text-purple-700 mb-1 flex justify-between items-center">
                              <span>Plain Text Preview</span>
                              <div className="flex items-center gap-2">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={copyPlainTextToClipboard}
                                  className="h-7 text-xs text-purple-700"
                                >
                                  <Copy className="h-3.5 w-3.5 mr-1.5" />
                                  Copy
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setExpandedPreview('plain')}
                                  className="h-7 text-xs text-purple-700"
                                >
                                  <Maximize2 className="h-3.5 w-3.5 mr-1.5" />
                                  Expand
                                </Button>
                              </div>
                            </div>
                            <div className="p-4 border rounded bg-white border-purple-100 min-h-[300px] font-mono text-sm whitespace-pre-wrap overflow-auto" style={{ maxHeight: '400px' }}>
                              {markdownPlainTextOutput}
                            </div>
                          </div>
                        </div>

                        <div className="mt-2 bg-purple-50 rounded-md p-2 border border-purple-100">
                          <div className="flex items-start">
                            <Info className="h-3.5 w-3.5 text-purple-600 mt-0.5 mr-1.5 flex-shrink-0" />
                            <span className="text-xs text-purple-700">
                              <strong>Export options:</strong> HTML file for web use, Text file for plain text applications, Word document for Microsoft Word, and Excel spreadsheet for spreadsheet applications.
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {isTransformed && (
                      <div className="mt-2 text-xs text-purple-600 flex items-center">
                        <CheckCircle className="h-3.5 w-3.5 mr-1.5" />
                        {(transformDirection as string) === 'columnToRow'
                          ? `Successfully transformed ${totalItems} items into a single row`
                          : (transformDirection as string) === 'rowToColumn'
                            ? `Successfully transformed row into ${totalItems} lines`
                            : `Successfully transformed LLM Output to ${markdownOutputType === 'richText' ? 'Rich Text' : 'Plain Text'}`}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="bg-purple-50/50 border-t border-purple-100/50 flex justify-between">
              <div className="text-xs text-purple-700">
                <Info className="h-3.5 w-3.5 inline-block mr-1 text-purple-600" />
                {(transformDirection as string) === 'columnToRow'
                  ? "This tool converts column data into a single row with your chosen delimiter"
                  : (transformDirection as string) === 'rowToColumn'
                    ? "This tool converts row data into columns by splitting at your chosen delimiter"
                    : markdownOutputType === 'plainText'
                      ? "This tool converts LLM Output to clean plain text, stripping all formatting."
                      : "This tool converts LLM Output to rich text, retaining basic styling for emails/docs."}
              </div>
              {isTransformed && totalItems > 0 && (
                <div className="text-xs font-medium text-purple-700">
                  {(transformDirection as string) === 'columnToRow'
                    ? `${totalItems} items → 1 row`
                    : (transformDirection as string) === 'rowToColumn'
                      ? `1 row → ${totalItems} items`
                      : `` /* Placeholder for Markdown output summary */}
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

              {/* Add a keyboard shortcuts help section to the "How to Use" card */}
              <div className="mt-4">
                <h4 className="text-sm font-medium text-purple-700 mb-2">Keyboard Shortcuts</h4>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
                  <div className="flex justify-between items-center">
                    <span>Transform data</span>
                    <kbd className="px-2 py-0.5 bg-purple-100 rounded text-purple-800 font-mono text-xs">Ctrl+Enter</kbd>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Copy output</span>
                    <kbd className="px-2 py-0.5 bg-purple-100 rounded text-purple-800 font-mono text-xs">Ctrl+Shift+C</kbd>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Toggle live preview</span>
                    <kbd className="px-2 py-0.5 bg-purple-100 rounded text-purple-800 font-mono text-xs">Ctrl+L</kbd>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Clear all data</span>
                    <kbd className="px-2 py-0.5 bg-purple-100 rounded text-purple-800 font-mono text-xs">Ctrl+D</kbd>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Load sample data</span>
                    <kbd className="px-2 py-0.5 bg-purple-100 rounded text-purple-800 font-mono text-xs">Ctrl+S</kbd>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
      {/* Name Matcher UI is rendered separately below, already conditionally rendered */}
      {isNameMatcherMode(transformDirection) && (
        <div className="px-6 pt-6 pb-2">
          {/* Navigation and Clear Buttons */}
          <div className="flex flex-wrap gap-2 mb-4 items-center justify-between">
            <button
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded flex items-center gap-2 shadow"
              onClick={() => {
                clearNameMatcherState();
                setTransformDirection('markdown');
              }}
              title="Back to LLM Output"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              Back to LLM Output
            </button>
            <button
              className="bg-red-100 hover:bg-red-200 text-red-700 px-4 py-2 rounded flex items-center gap-2 border border-red-200"
              onClick={clearNameMatcherState}
              title="Clear all Name Matcher data"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              Clear All
            </button>
          </div>
          {/* Help/Info Section */}
          {showNameMatcherHelp ? (
            <div className="mb-4 bg-purple-50 border border-purple-200 rounded-lg p-4 relative">
              <button className="absolute top-2 right-2 text-purple-400 hover:text-purple-700" onClick={() => setShowNameMatcherHelp(false)} title="Dismiss">✕</button>
              <div className="flex items-start gap-3">
                <svg className="h-6 w-6 text-purple-600 mt-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 01.88 7.903A5.5 5.5 0 1112 6.5" /></svg>
                <div>
                  <div className="font-semibold text-purple-800 mb-1">What is Name Matcher?</div>
                  <div className="text-sm text-purple-700 mb-2">Compare two lists of names from CSV files, even if the names are in different orders, have typos, or are formatted differently. The matcher uses fuzzy logic to find the best matches and can be tuned for strictness or flexibility.</div>
                  <ul className="text-xs text-purple-700 list-disc pl-5 space-y-1">
                    <li><b>Fuzzy matching</b> finds close matches, not just exact ones. Adjust the threshold for stricter or looser matching.</li>
                    <li>Use <b>"Require same number of words"</b> to avoid matching single names to full names.</li>
                    <li>Enable <b>"Show all matches above threshold"</b> to review possible matches for each name.</li>
                    <li>For short names, <b>"Stricter for short names"</b> prevents accidental matches (e.g., "Ben" won't match "Ben Tan").</li>
                    <li>Download results for further review or reporting.</li>
                  </ul>
                </div>
              </div>
            </div>
          ) : (
            <div className="mb-4 flex justify-end">
              <button className="text-xs text-purple-600 underline" onClick={() => setShowNameMatcherHelp(true)}>What is this?</button>
            </div>
          )}
          {/* User Controls */}
          <div className="mb-4 bg-purple-50 border border-purple-100 rounded-lg p-4">
            <div className="font-semibold text-purple-800 mb-2 text-sm flex items-center gap-2">
              <svg className="h-4 w-4 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 01.88 7.903A5.5 5.5 0 1112 6.5" /></svg>
              Matching Options
            </div>
            <div className="flex flex-col gap-3">
              <label htmlFor="requireSameWordCount" className="flex items-center gap-3 cursor-pointer text-sm">
                <Checkbox
                  id="requireSameWordCount"
                  checked={requireSameWordCount}
                  onCheckedChange={() => setRequireSameWordCount(v => !v)}
                  className="h-5 w-5 accent-purple-600 rounded border-purple-300"
                />
                <span>Require same number of words</span>
                <span className="ml-1 text-purple-400" title="Only match names with the same number of words (e.g., 'Ben' won't match 'Ben Tan')">
                  <Info className="h-4 w-4" />
                </span>
              </label>
              <label htmlFor="showAllMatches" className="flex items-center gap-3 cursor-pointer text-sm">
                <Checkbox
                  id="showAllMatches"
                  checked={showAllMatches}
                  onCheckedChange={() => setShowAllMatches(v => !v)}
                  className="h-5 w-5 accent-purple-600 rounded border-purple-300"
                />
                <span>Show all matches above threshold</span>
                <span className="ml-1 text-purple-400" title="See all possible matches for each name, not just the best one">
                  <Info className="h-4 w-4" />
                </span>
              </label>
              <label htmlFor="strictShortNames" className="flex items-center gap-3 cursor-pointer text-sm">
                <Checkbox
                  id="strictShortNames"
                  checked={strictShortNames}
                  onCheckedChange={() => setStrictShortNames(v => !v)}
                  className="h-5 w-5 accent-purple-600 rounded border-purple-300"
                />
                <span>Stricter for short names</span>
                <span className="ml-1 text-purple-400" title="For short names (1 word, <5 chars), only allow exact matches">
                  <Info className="h-4 w-4" />
                </span>
              </label>
            </div>
          </div>
          {/* ... rest of Name Matcher UI ... */}
          {/* In the results table, if showAllMatches is enabled, show all matches as a dropdown or list */}
          {/* ... existing code ... */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* CSV 1 Import */}
            <div className="bg-white border border-purple-100 rounded-lg p-4 flex flex-col items-start gap-2">
              <label className="block mb-2 font-medium text-purple-800 flex items-center gap-2">
                <svg className="h-4 w-4 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5-5m0 0l5 5m-5-5v12" /></svg>
                CSV 1: Source File
              </label>
              {!nameMatcherFile1 ? (
                <button className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded flex items-center gap-2" onClick={() => document.getElementById('name-matcher-csv1')?.click()}>
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5-5m0 0l5 5m-5-5v12" /></svg>
                  Import CSV 1
                </button>
              ) : (
                <div className="flex flex-col gap-2 w-full">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-purple-700 font-mono truncate">{nameMatcherFile1.name}</span>
                    <button className="text-xs text-red-500 hover:underline" onClick={() => { setNameMatcherFile1(null); setNameMatcherData1([]); setNameMatcherColumns1([]); setNameMatcherSelectedCol1(''); setNameMatcherSelectedColOfInterest(''); }}>
                      Remove
                    </button>
                  </div>
                  {nameMatcherColumns1.length > 0 && (
                    <div className="mt-2">
                      <label className="block text-xs mb-1">Select Name Column:</label>
                      <div className="relative">
                        <Button
                          variant="outline"
                          className="w-full flex justify-between items-center text-xs border-purple-200"
                          onClick={() => setShowNameColPopover1((v) => !v)}
                          type="button"
                        >
                          {nameMatcherSelectedCol1 || 'Select name column...'}
                          <ChevronDown className="h-4 w-4 ml-2" />
                        </Button>
                        {showNameColPopover1 && (
                          <div
                            className="fixed inset-0 z-40"
                            onClick={() => setShowNameColPopover1(false)}
                            style={{ cursor: 'default' }}
                          />
                        )}
                        {showNameColPopover1 && (
                          <div className="absolute z-50 mt-1 w-full bg-white border border-purple-200 rounded shadow-lg p-2 max-h-48 overflow-auto">
                            {nameMatcherColumns1.map(col => (
                              <div
                                key={col}
                                className={`flex items-center gap-2 py-1 px-2 rounded hover:bg-purple-50 cursor-pointer text-xs ${nameMatcherSelectedCol1 === col ? 'bg-purple-100 font-semibold' : ''}`}
                                onClick={() => {
                                  setNameMatcherSelectedCol1(col);
                                  setShowNameColPopover1(false);
                                }}
                              >
                                {nameMatcherSelectedCol1 === col && <CheckCircle className="h-3 w-3 text-purple-600" />}
                                <span>{col}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  {nameMatcherColumns1.length > 0 && (
                    <div className="mt-2">
                      <label className="block text-xs mb-1">Select Columns of Interest (optional):</label>
                      <div className="relative">
                        <Button
                          variant="outline"
                          className="w-full flex justify-between items-center text-xs border-purple-200"
                          onClick={() => setShowColOfInterestPopover1((v) => !v)}
                          type="button"
                        >
                          {nameMatcherSelectedColsOfInterest.length === 0
                            ? '-- None --'
                            : nameMatcherSelectedColsOfInterest.length <= 2
                              ? nameMatcherSelectedColsOfInterest.join(', ')
                              : `${nameMatcherSelectedColsOfInterest.length} columns selected`}
                          <ChevronDown className="h-4 w-4 ml-2" />
                        </Button>
                        {showColOfInterestPopover1 && (
                          <div className="fixed inset-0 z-40" onClick={() => setShowColOfInterestPopover1(false)} style={{ cursor: 'default' }} />
                        )}
                        {showColOfInterestPopover1 && (
                          <div className="absolute z-50 mt-1 w-full bg-white border border-purple-200 rounded shadow-lg p-2 max-h-48 overflow-auto">
                            <div
                              className={`flex items-center gap-2 py-1 px-2 rounded hover:bg-purple-50 cursor-pointer text-xs ${nameMatcherSelectedColsOfInterest.length === 0 ? 'bg-purple-100 font-semibold' : ''}`}
                              onClick={() => {
                                setNameMatcherSelectedColsOfInterest([]);
                                setShowColOfInterestPopover1(false);
                              }}
                            >
                              {nameMatcherSelectedColsOfInterest.length === 0 && <CheckCircle className="h-3 w-3 text-purple-600" />}
                              <span>-- None --</span>
                            </div>
                            {nameMatcherColumns1.map(col => (
                              <div
                                key={col}
                                className={`flex items-center gap-2 py-1 px-2 rounded hover:bg-purple-50 cursor-pointer text-xs ${nameMatcherSelectedColsOfInterest.includes(col) ? 'bg-purple-100 font-semibold' : ''}`}
                                onClick={() => {
                                  if (nameMatcherSelectedColsOfInterest.includes(col)) {
                                    setNameMatcherSelectedColsOfInterest(nameMatcherSelectedColsOfInterest.filter(c => c !== col));
                                  } else {
                                    setNameMatcherSelectedColsOfInterest([...nameMatcherSelectedColsOfInterest, col]);
                                  }
                                }}
                              >
                                <input type="checkbox" checked={nameMatcherSelectedColsOfInterest.includes(col)} readOnly className="accent-purple-600 h-3 w-3 rounded border-purple-300" />
                                <span>{col}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="text-xs text-purple-500 mt-1">Selected columns will be shown in results and included in download.</div>
                    </div>
                  )}
                </div>
              )}
              <input id="name-matcher-csv1" type="file" accept=".csv" className="hidden" onChange={e => e.target.files && handleNameMatcherFile(e.target.files[0], 1)} />
              {/* Preview CSV1 column */}
              {nameMatcherData1.length > 1 && nameMatcherSelectedCol1 && (
                <div className="mt-3 w-full">
                  <div className="text-xs text-purple-700 mb-1">Preview: First 5 values in <span className="font-semibold">{nameMatcherSelectedCol1}</span></div>
                  <div className="bg-purple-50 border border-purple-100 rounded p-2 text-xs font-mono">
                    {previewColumn(nameMatcherData1, nameMatcherColumns1.indexOf(nameMatcherSelectedCol1)).map((val, i) => (
                      <div key={i} className="whitespace-pre-wrap break-words max-w-full text-xs font-mono text-gray-700 py-0.5">{val}</div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            {/* CSV 2 Import */}
            <div className="bg-white border border-purple-100 rounded-lg p-4 flex flex-col items-start gap-2">
              <label className="block mb-2 font-medium text-purple-800 flex items-center gap-2">
                <svg className="h-4 w-4 text-pink-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5-5m0 0l5 5m-5-5v12" /></svg>
                CSV 2: Target File
              </label>
              {!nameMatcherFile2 ? (
                <button className="bg-pink-500 hover:bg-pink-600 text-white px-4 py-2 rounded flex items-center gap-2" onClick={() => document.getElementById('name-matcher-csv2')?.click()}>
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5-5m0 0l5 5m-5-5v12" /></svg>
                  Import CSV 2
                </button>
              ) : (
                <div className="flex flex-col gap-2 w-full">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-purple-700 font-mono truncate">{nameMatcherFile2.name}</span>
                    <button className="text-xs text-red-500 hover:underline" onClick={() => { setNameMatcherFile2(null); setNameMatcherData2([]); setNameMatcherColumns2([]); setNameMatcherSelectedCol2(''); }}>
                      Remove
                    </button>
                  </div>
                  {nameMatcherColumns2.length > 0 && (
                    <div className="mt-2">
                      <label className="block text-xs mb-1">Select Name Column:</label>
                      <div className="relative">
                        <Button
                          variant="outline"
                          className="w-full flex justify-between items-center text-xs border-purple-200"
                          onClick={() => setShowColsPopover1((v) => !v)}
                          type="button"
                        >
                          {nameMatcherSelectedCol2 || 'Select name column...'}
                          <ChevronDown className="h-4 w-4 ml-2" />
                        </Button>
                        {showColsPopover1 && (
                          <div className="fixed inset-0 z-40" onClick={() => setShowColsPopover1(false)} style={{ cursor: 'default' }} />
                        )}
                        {showColsPopover1 && (
                          <div className="absolute z-50 mt-1 w-full bg-white border border-purple-200 rounded shadow-lg p-2 max-h-48 overflow-auto">
                            {nameMatcherColumns2.map(col => (
                              <div
                                key={col}
                                className={`flex items-center gap-2 py-1 px-2 rounded hover:bg-purple-50 cursor-pointer text-xs ${nameMatcherSelectedCol2 === col ? 'bg-purple-100 font-semibold' : ''}`}
                                onClick={() => {
                                  setNameMatcherSelectedCol2(col);
                                  setShowColsPopover1(false);
                                }}
                              >
                                {nameMatcherSelectedCol2 === col && <CheckCircle className="h-3 w-3 text-purple-600" />}
                                <span>{col}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
              <input id="name-matcher-csv2" type="file" accept=".csv" className="hidden" onChange={e => e.target.files && handleNameMatcherFile(e.target.files[0], 2)} />
              {/* Preview CSV2 column */}
              {nameMatcherData2.length > 1 && nameMatcherSelectedCol2 && (
                <div className="mt-3 w-full">
                  <div className="text-xs text-purple-700 mb-1">Preview: First 5 values in <span className="font-semibold">{nameMatcherSelectedCol2}</span></div>
                  <div className="bg-pink-50 border border-pink-100 rounded p-2 text-xs font-mono">
                    {previewColumn(nameMatcherData2, nameMatcherColumns2.indexOf(nameMatcherSelectedCol2)).map((val, i) => (
                      <div key={i} className="whitespace-pre-wrap break-words max-w-full text-xs font-mono text-gray-700 py-0.5">{val}</div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
          {/* Fuzzy matching and download UI */}
          <div className="mt-6 bg-purple-50 border border-purple-100 rounded-lg p-4">
            <div className="flex flex-col md:flex-row md:items-center gap-4 mb-4">
              <div className="flex items-center gap-2">
                <label className="font-medium text-purple-800 text-sm flex items-center gap-1" htmlFor="fuzzy-threshold-slider">
                  Fuzzy Match Threshold
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="ml-1 text-purple-400 cursor-pointer"><Info className="h-4 w-4" /></span>
                      </TooltipTrigger>
                      <TooltipContent>
                        <span className="text-xs">Controls how strict the name matching is. Higher = stricter, lower = more lenient. 100% = only exact matches.</span>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </label>
                <input id="fuzzy-threshold-slider" type="range" min="0.5" max="1" step="0.01" value={fuzzyThreshold} onChange={e => setFuzzyThreshold(Number(e.target.value))} className="accent-purple-600 w-40 h-2 rounded-lg bg-purple-100" />
                <span className="inline-block bg-purple-100 text-purple-700 font-semibold px-2 py-0.5 rounded text-xs border border-purple-200 ml-2">{Math.round(fuzzyThreshold * 100)}%</span>
              </div>
              <button className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded flex items-center gap-2" onClick={runNameMatcher} disabled={!nameMatcherSelectedCol1 || !nameMatcherSelectedCol2}>
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 01.88 7.903A5.5 5.5 0 1112 6.5" /></svg>
                Match Names
              </button>
              <button className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded flex items-center gap-2" onClick={downloadNameMatcherResults} disabled={!nameMatcherResults.length}>
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                Download Results
              </button>
            </div>
            {nameMatcherResults.length > 0 && (
              <div className="overflow-x-auto custom-scrollbar">
                <table className="min-w-full border border-purple-200 rounded-lg overflow-hidden">
                  <thead>
                    <tr className="bg-purple-100 text-purple-800">
                      <th className="border px-2 py-1 text-xs">CSV1 Name</th>
                      {nameMatcherSelectedColsOfInterest.map(col => (
                        <th key={col} className="border px-2 py-1 text-xs">{col}</th>
                      ))}
                      <th className="border px-2 py-1 text-xs">Best Match in CSV2</th>
                      <th className="border px-2 py-1 text-xs">Similarity</th>
                    </tr>
                  </thead>
                  <tbody>
                    {nameMatcherResults.map((row: NameMatcherResult, idx) => {
                      let color = '';
                      const score = row.score ?? 0;
                      if (score >= 0.97) color = 'bg-green-50';
                      else if (score >= fuzzyThreshold) color = 'bg-yellow-50';
                      else color = 'bg-red-50';
                      return (
                        <tr key={idx} className={color}>
                          <td className="border px-2 py-1 text-xs font-mono">{row.name1}</td>
                          {nameMatcherSelectedColsOfInterest.map(col => (
                            <td key={col} className="border px-2 py-1 text-xs font-mono">{row.colsOfInterest?.[col] || ''}</td>
                          ))}
                          <td className="border px-2 py-1 text-xs font-mono">
                            {showAllMatches && row.allMatches && row.allMatches.length > 0 ? (
                              <details>
                                <summary className="cursor-pointer">{row.allMatches[0].match} <span className="text-xs text-purple-500">({Math.round(row.allMatches[0].score * 100)}%)</span></summary>
                                <ul className="pl-4 mt-1">
                                  {row.allMatches.map((m: { match: string, score: number }, i: number) => (
                                    <li key={i} className={m.score >= 0.97 ? 'text-green-700' : m.score >= fuzzyThreshold ? 'text-yellow-700' : 'text-red-500'}>
                                      {m.match} <span className="text-xs">({Math.round(m.score * 100)}%)</span>
                                    </li>
                                  ))}
                                </ul>
                              </details>
                            ) : (
                              row.match || <span className="text-red-500">No Match</span>
                            )}
                          </td>
                          <td className="border px-2 py-1 text-xs font-mono">
                            {`${Math.round(score * 100)}%`}
                            {score >= 0.97 && <span className="ml-1 text-green-600 font-bold">✔</span>}
                            {score >= fuzzyThreshold && score < 0.97 && <span className="ml-1 text-yellow-600 font-bold">~</span>}
                            {score < fuzzyThreshold && <span className="ml-1 text-red-500 font-bold">✗</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <div className="text-xs text-purple-600 mt-2">
                  <span className="inline-block bg-green-50 border border-green-200 rounded px-2 py-0.5 mr-2">✔ Strong Match</span>
                  <span className="inline-block bg-yellow-50 border border-yellow-200 rounded px-2 py-0.5 mr-2">~ Possible Match</span>
                  <span className="inline-block bg-red-50 border border-red-200 rounded px-2 py-0.5">✗ No Match</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TransformBidirectional; 
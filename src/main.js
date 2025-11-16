// @ts-ignore
import Storehouse from 'storehouse-js';
import * as monaco from 'https://cdn.jsdelivr.net/npm/monaco-editor@0.52.2/+esm';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import 'github-markdown-css/github-markdown-light.css';

const init = () => {
    // Global variables
    let hasEdited = false;
    let scrollBarSync = false;
    let currentTheme = 'light';
    let currentFilename = 'untitled.md';
    let isFullscreen = false;
    let editor = null;

    const localStorageNamespace = 'com.markdownlivepreview';
    const localStorageKey = 'last_state';
    const localStorageScrollBarKey = 'scroll_bar_settings';
    const localStorageThemeKey = 'theme_settings';
    const localStorageEditorKey = 'editor_settings';
    const confirmationMessage = 'Are you sure you want to reset? Your changes will be lost.';

    // Default template
    const defaultInput = `# Markdown syntax guide

## Headers

# This is a Heading h1
## This is a Heading h2
###### This is a Heading h6

## Emphasis

*This text will be italic*  
_This will also be italic_

**This text will be bold**  
__This will also be bold__

_You **can** combine them_

## Lists

### Unordered

* Item 1
* Item 2
* Item 2a
* Item 2b
    * Item 3a
    * Item 3b

### Ordered

1. Item 1
2. Item 2
3. Item 3
    1. Item 3a
    2. Item 3b

## Images

![This is an alt text.](/image/sample.webp "This is a sample image.")

## Links

You may be using [Markdown Live Preview](https://markdownlivepreview.com/).

## Blockquotes

> Markdown is a lightweight markup language with plain-text-formatting syntax, created in 2004 by John Gruber with Aaron Swartz.
>
>> Markdown is often used to format readme files, for writing messages in online discussion forums, and to create rich text using a plain text editor.

## Tables

| Left columns  | Right columns |
| ------------- |:-------------:|
| left foo      | right foo     |
| left bar      | right bar     |
| left baz      | right baz     |

## Blocks of code

\`\`\`
let message = 'Hello world';
alert(message);
\`\`\`

## Inline code

This web site is using \`markedjs/marked\`.
`;

    // Monaco Environment Setup
    self.MonacoEnvironment = {
        getWorker(_, label) {
            return new Proxy({}, { get: () => () => { } });
        }
    };

    // ----- Utility Functions -----
    


    const safeGetElement = (id) => {
        const element = document.getElementById(id);
        if (!element) {
            console.warn(`Element with id '${id}' not found`);
        }
        return element;
    };

    // ----- Local Storage Functions -----
    
    const loadLastContent = () => {
        return Storehouse.getItem(localStorageNamespace, localStorageKey);
    };

    const saveLastContent = (content) => {
        const expiredAt = new Date(2099, 1, 1);
        Storehouse.setItem(localStorageNamespace, localStorageKey, content, expiredAt);
    };

    const loadScrollBarSettings = () => {
        return Storehouse.getItem(localStorageNamespace, localStorageScrollBarKey);
    };

    const saveScrollBarSettings = (settings) => {
        const expiredAt = new Date(2099, 1, 1);
        Storehouse.setItem(localStorageNamespace, localStorageScrollBarKey, settings, expiredAt);
    };

    const loadThemeSettings = () => {
        return Storehouse.getItem(localStorageNamespace, localStorageThemeKey);
    };

    const saveThemeSettings = (theme) => {
        const expiredAt = new Date(2099, 1, 1);
        Storehouse.setItem(localStorageNamespace, localStorageThemeKey, theme, expiredAt);
    };

    const loadEditorSettings = () => {
        return Storehouse.getItem(localStorageNamespace, localStorageEditorKey) || {};
    };

    const saveEditorSettings = (settings) => {
        const expiredAt = new Date(2099, 1, 1);
        Storehouse.setItem(localStorageNamespace, localStorageEditorKey, settings, expiredAt);
    };

    // ----- Core Functions -----
    
    const convert = (markdown) => {
        const options = {
            headerIds: false,
            mangle: false
        };
        const html = marked.parse(markdown, options);
        const sanitized = DOMPurify.sanitize(html);
        const outputEl = safeGetElement('output');
        if (outputEl) {
            outputEl.innerHTML = sanitized;
        }
    };

    const updateStatusBar = () => {
        if (!editor) return;
        
        const content = editor.getValue();
        const lines = content.split('\n').length;
        const words = content.trim() ? content.trim().split(/\s+/).length : 0;
        const chars = content.length;

        const lineCountEl = safeGetElement('line-count');
        const wordCountEl = safeGetElement('word-count');
        const charCountEl = safeGetElement('char-count');

        if (lineCountEl) lineCountEl.textContent = lines;
        if (wordCountEl) wordCountEl.textContent = words;
        if (charCountEl) charCountEl.textContent = chars;
    };

    const updateCursorPosition = () => {
        if (!editor) return;
        
        const position = editor.getPosition();
        const cursorPosEl = safeGetElement('cursor-position');
        if (cursorPosEl) {
            cursorPosEl.textContent = `Ln ${position.lineNumber}, Col ${position.column}`;
        }
    };

    const presetValue = (value) => {
        if (!editor) return;
        editor.setValue(value);
        editor.revealPosition({ lineNumber: 1, column: 1 });
        editor.focus();
        hasEdited = false;
    };

    // ----- Theme Management -----
    
    const updateThemeIcon = () => {
        const themeButton = document.querySelector('#theme-toggle .icon');
        if (!themeButton) return;
        
        // Ensure the SVG element has proper attributes
        themeButton.setAttribute('viewBox', '0 0 16 16');
        themeButton.setAttribute('fill', 'currentColor');
        
        if (currentTheme === 'dark') {
            themeButton.innerHTML = '<path d="M8 11a3 3 0 1 1 0-6 3 3 0 0 1 0 6zm0 1a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM8 0a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0v-2A.5.5 0 0 1 8 0zm0 13a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0v-2A.5.5 0 0 1 8 13zm8-5a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1 0-1h2a.5.5 0 0 1 .5.5zM3 8a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1 0-1h2A.5.5 0 0 1 3 8zm10.657-5.657a.5.5 0 0 1 0 .707l-1.414 1.415a.5.5 0 1 1-.707-.708l1.414-1.414a.5.5 0 0 1 .707 0zm-9.193 9.193a.5.5 0 0 1 0 .707L3.05 13.657a.5.5 0 0 1-.707-.707l1.414-1.414a.5.5 0 0 1 .707 0zm9.193 2.121a.5.5 0 0 1-.707 0l-1.414-1.414a.5.5 0 0 1 .707-.707l1.414 1.414a.5.5 0 0 1 0 .707zM4.464 4.465a.5.5 0 0 1-.707 0L2.343 3.05a.5.5 0 1 1 .707-.707l1.414 1.414a.5.5 0 0 1 0 .708z"/>';
        } else {
            themeButton.innerHTML = '<path d="M6 .278a.768.768 0 0 1 .08.858 7.208 7.208 0 0 0-.878 3.46c0 4.021 3.278 7.277 7.318 7.277.527 0 1.04-.055 1.533-.16a.787.787 0 0 1 .81.316.733.733 0 0 1-.031.893A8.349 8.349 0 0 1 8.344 16C3.734 16 0 12.286 0 7.71 0 4.266 2.114 1.312 5.124.06A.752.752 0 0 1 6 .278z"/>';
        }
    };

    const initTheme = () => {
        const savedTheme = loadThemeSettings();
        currentTheme = savedTheme || 'light';
        document.documentElement.setAttribute('data-theme', currentTheme);
        updateThemeIcon();
    };

    const toggleTheme = () => {
        currentTheme = currentTheme === 'light' ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', currentTheme);
        saveThemeSettings(currentTheme);
        updateThemeIcon();
        
        if (editor) {
            monaco.editor.setTheme(currentTheme === 'dark' ? 'vs-dark' : 'vs');
        }

    };

    // ----- File Operations -----
    
    const openFile = (file) => {
        if (!editor) {
            console.error('Editor not ready');
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            console.error('File is too large. Please select a file smaller than 5MB.');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                editor.setValue(e.target.result);
                currentFilename = file.name;
                const filenameEl = safeGetElement('editor-filename');
                if (filenameEl) {
                    filenameEl.textContent = currentFilename;
                }
                hasEdited = false;

            } catch (error) {
                console.error('Error reading file:', error);

            }
        };
        reader.onerror = () => {
            console.error('Error reading file');
        };
        reader.readAsText(file);
    };

    const saveFile = () => {
        if (!editor) {
            console.error('Editor not ready');
            return;
        }

        try {
            const content = editor.getValue();
            const blob = new Blob([content], { type: 'text/markdown' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = currentFilename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Error saving file:', error);
        }
    };

    const exportAsHtml = () => {
        if (!editor) {
            console.error('Editor not ready');
            return;
        }

        try {
            const markdown = editor.getValue();
            const options = { headerIds: false, mangle: false };
            let html = marked.parse(markdown, options);
            
            // Fix relative image paths to absolute URLs or add a note about broken images
            html = html.replace(/<img([^>]*?)src="([^"]*?)"([^>]*?)>/g, (match, before, src, after) => {
                // If it's already an absolute URL (http/https), leave it as is
                if (src.startsWith('http://') || src.startsWith('https://')) {
                    return match;
                }
                
                // If it's a relative path, convert to absolute URL based on current location
                if (src.startsWith('/')) {
                    const absoluteSrc = window.location.origin + src;
                    return `<img${before}src="${absoluteSrc}"${after}>`;
                } else {
                    // For relative paths without leading slash, use current page's base
                    const absoluteSrc = window.location.href.substring(0, window.location.href.lastIndexOf('/') + 1) + src;
                    return `<img${before}src="${absoluteSrc}"${after}>`;
                }
            });
            
            const sanitized = DOMPurify.sanitize(html);
            
            const fullHtml = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>${currentFilename.replace('.md', '')}</title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/github-markdown-css@5.8.1/github-markdown-light.css">
    <style>
        body { 
            box-sizing: border-box; 
            min-width: 200px; 
            max-width: 980px; 
            margin: 0 auto; 
            padding: 45px; 
        }
        @media (prefers-color-scheme: dark) {
            body { 
                background-color: #0d1117; 
                color: #c9d1d9; 
            }
            table th {
                background-color: #21262d !important;
                color: #c9d1d9 !important;
            }
            table td {
                color: #c9d1d9 !important;
            }
            table tr:nth-child(2n) {
                background-color: #161b22;
            }
        }
        /* Fallback for broken images */
        img {
            max-width: 100%;
            height: auto;
        }
        img[src=""]:after,
        img:not([src]):after {
            content: "🖼️ Image not available in exported HTML";
            display: block;
            padding: 10px;
            background: #f0f0f0;
            border: 1px dashed #ccc;
            text-align: center;
            color: #666;
        }
    </style>
</head>
<body class="markdown-body">
${sanitized}
</body>
</html>`;

            const blob = new Blob([fullHtml], { type: 'text/html' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = currentFilename.replace('.md', '.html');
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Error exporting HTML:', error);
        }
    };

    const exportToPdf = () => {
        if (!editor) {
            console.error('Editor not ready');
            return;
        }

        try {
            const markdown = editor.getValue();
            const options = { headerIds: false, mangle: false };
            const html = marked.parse(markdown, options);
            const sanitized = DOMPurify.sanitize(html);

            const printWindow = window.open('', '_blank');
            const printContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Markdown Export</title>
    <style>
        @media print {
            @page { margin: 0.75in; size: A4; }
            body { -webkit-print-color-adjust: exact; color-adjust: exact; }
        }
        body {
            font-family: Arial, Helvetica, sans-serif;
            font-size: 14px;
            line-height: 1.6;
            color: #333;
            background-color: #fff;
            max-width: none;
            margin: 0;
            padding: 20px;
        }
        h1, h2, h3, h4, h5, h6 {
            margin-top: 20px;
            margin-bottom: 12px;
            font-weight: bold;
            line-height: 1.3;
            page-break-after: avoid;
        }
        h1 { font-size: 24px; border-bottom: 2px solid #333; padding-bottom: 8px; }
        h2 { font-size: 20px; border-bottom: 1px solid #666; padding-bottom: 4px; }
        h3 { font-size: 18px; }
        h4 { font-size: 16px; }
        h5 { font-size: 14px; }
        h6 { font-size: 12px; color: #666; }
        p { margin-top: 0; margin-bottom: 12px; orphans: 3; widows: 3; }
        blockquote {
            padding: 0 16px;
            color: #666;
            border-left: 4px solid #ddd;
            margin: 0 0 12px 0;
            font-style: italic;
        }
        ul, ol { margin-top: 0; margin-bottom: 12px; padding-left: 24px; }
        li { margin-bottom: 4px; }
        code {
            padding: 2px 4px;
            margin: 0;
            font-size: 12px;
            background-color: #f5f5f5;
            border: 1px solid #ddd;
            border-radius: 3px;
            font-family: Consolas, Monaco, monospace;
        }
        pre {
            padding: 12px;
            overflow: auto;
            font-size: 12px;
            line-height: 1.4;
            background-color: #f8f8f8;
            border: 1px solid #ddd;
            border-radius: 4px;
            margin-bottom: 12px;
            page-break-inside: avoid;
        }
        pre code { background-color: transparent; border: none; padding: 0; margin: 0; font-size: inherit; }
        table {
            border-spacing: 0;
            border-collapse: collapse;
            margin-top: 0;
            margin-bottom: 12px;
            width: 100%;
            page-break-inside: avoid;
        }
        table th, table td { padding: 8px 12px; border: 1px solid #ddd; text-align: left; }
        table th { font-weight: bold; background-color: #f5f5f5; }
        table tr:nth-child(even) { background-color: #f9f9f9; }
        img { max-width: 100%; height: auto; page-break-inside: avoid; }
        a { color: #0066cc; text-decoration: underline; }
        hr { height: 1px; padding: 0; margin: 20px 0; background-color: #ddd; border: 0; page-break-after: avoid; }
    </style>
</head>
<body>
    <div class="markdown-content">${sanitized}</div>
</body>
</html>`;

            printWindow.document.write(printContent);
            printWindow.document.close();

            printWindow.onload = function () {
                setTimeout(() => {
                    printWindow.focus();
                    printWindow.print();
                    printWindow.close();
                }, 100);
            };
        } catch (error) {
            console.error('Error exporting PDF:', error);
        }
    };

    // ----- Editor Functions -----
    
    const formatDocument = () => {
        if (!editor) {
            console.error('Editor not ready');
            return;
        }

        try {
            const content = editor.getValue();
            let formatted = content
                .replace(/^(#{1,6})\s*(.+)$/gm, '$1 $2')
                .replace(/\n{3,}/g, '\n\n')
                .replace(/^(\s*[-*+])\s*(.+)$/gm, '$1 $2')
                .replace(/^(\s*\d+\.)\s*(.+)$/gm, '$1 $2');
            
            editor.setValue(formatted);
        } catch (error) {
            console.error('Error formatting document:', error);
        }
    };

    const toggleFullscreen = () => {
        const previewPane = safeGetElement('preview');
        const editPane = safeGetElement('edit');
        const divider = safeGetElement('split-divider');
        
        if (!previewPane || !editPane || !divider) return;
        
        if (isFullscreen) {
            editPane.style.display = 'flex';
            divider.style.display = 'block';
            previewPane.style.width = '50%';
            isFullscreen = false;
        } else {
            editPane.style.display = 'none';
            divider.style.display = 'none';
            previewPane.style.width = '100%';
            isFullscreen = true;
        }
    };



    const reset = () => {
        if (!editor) return;
        
        const changed = editor.getValue() !== defaultInput;
        if (hasEdited || changed) {
            const confirmed = window.confirm(confirmationMessage);
            if (!confirmed) {
                return;
            }
        }
        presetValue(defaultInput);
        document.querySelectorAll('.column').forEach((element) => {
            element.scrollTo({ top: 0 });
        });

    };

    // ----- Clipboard Functions -----
    
    const copyToClipboard = (text, successHandler, errorHandler) => {
        navigator.clipboard.writeText(text).then(successHandler, errorHandler);
    };

    const notifyCopied = () => {
        const copyButton = safeGetElement('copy-button');
        if (!copyButton) return;
        
        const originalContent = copyButton.innerHTML;
        copyButton.classList.add('success');
        copyButton.innerHTML = '<svg class="icon" viewBox="0 0 16 16" fill="currentColor"><path d="M13.854 3.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L6.5 10.293l6.646-6.647a.5.5 0 0 1 .708 0z"/></svg>Copied!';
        
        setTimeout(() => {
            copyButton.classList.remove('success');
            copyButton.innerHTML = originalContent;
        }, 2000);
    };

    // ----- Setup Functions -----
    
    const setupEditor = () => {
        const editorSettings = loadEditorSettings();
        const editorElement = safeGetElement('editor');
        
        if (!editorElement) {
            console.error('Editor element not found');
            return;
        }

        editor = monaco.editor.create(editorElement, {
            fontSize: editorSettings.fontSize || 14,
            language: 'markdown',
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            automaticLayout: true,
            scrollbar: {
                vertical: 'visible',
                horizontal: 'visible'
            },
            wordWrap: editorSettings.wordWrap || 'on',
            tabSize: editorSettings.tabSize || 4,
            hover: { enabled: false },
            quickSuggestions: false,
            suggestOnTriggerCharacters: false,
            folding: true,
            lineNumbers: 'on',
            renderWhitespace: 'selection',
            theme: currentTheme === 'dark' ? 'vs-dark' : 'vs'
        });

        editor.onDidChangeModelContent(() => {
            const changed = editor.getValue() !== defaultInput;
            if (changed) {
                hasEdited = true;
            }
            const value = editor.getValue();
            convert(value);
            saveLastContent(value);
            updateStatusBar();
        });

        editor.onDidChangeCursorPosition(() => {
            updateCursorPosition();
        });

        editor.onDidScrollChange((e) => {
            if (!scrollBarSync) return;

            const scrollTop = e.scrollTop;
            const scrollHeight = e.scrollHeight;
            const height = editor.getLayoutInfo().height;

            if (scrollHeight <= height) return;

            const maxScrollTop = scrollHeight - height;
            const scrollRatio = maxScrollTop > 0 ? scrollTop / maxScrollTop : 0;

            // Target the preview-wrapper which has overflow-y: auto
            const previewWrapper = document.querySelector('.preview-wrapper');
            if (previewWrapper) {
                const previewScrollHeight = previewWrapper.scrollHeight;
                const previewClientHeight = previewWrapper.clientHeight;
                const previewMaxScroll = previewScrollHeight - previewClientHeight;
                
                if (previewMaxScroll > 0) {
                    const targetY = previewMaxScroll * scrollRatio;
                    previewWrapper.scrollTop = targetY;
                }
            }
        });

        return editor;
    };

    const initScrollBarSync = (settings) => {
        const checkbox = safeGetElement('sync-scroll-checkbox');
        if (!checkbox) {
            console.warn('Sync scroll checkbox not found');
            return;
        }
        
        checkbox.checked = settings;
        scrollBarSync = settings;

        // Add event listener to the checkbox
        checkbox.addEventListener('change', (event) => {
            const checked = event.currentTarget.checked;
            scrollBarSync = checked;
            saveScrollBarSettings(checked);

            console.log('Scroll sync changed to:', checked);
        });

        // Also add click listener to the toggle switch container for better UX
        const toggleSwitch = checkbox.closest('.toggle-switch');
        if (toggleSwitch) {
            toggleSwitch.addEventListener('click', (event) => {
                // Prevent double triggering if clicking directly on checkbox
                if (event.target === checkbox) return;
                
                checkbox.checked = !checkbox.checked;
                const changeEvent = new Event('change', { bubbles: true });
                checkbox.dispatchEvent(changeEvent);
                console.log('Toggle switch clicked, new state:', checkbox.checked);
            });
        }
        
        console.log('Scroll sync initialized:', settings);
    };

    const setupEventListeners = () => {
        // Helper function to safely add event listeners
        const safeAddEventListener = (id, event, handler) => {
            const element = safeGetElement(id);
            if (element) {
                element.addEventListener(event, handler);
                console.log(`Added ${event} listener to ${id}`);
            }
        };

        // File operations
        safeAddEventListener('file-input', 'change', (e) => {
            const file = e.target.files[0];
            if (file) {
                console.log('File selected:', file.name);
                openFile(file);
            }
        });

        safeAddEventListener('save-button', 'click', (e) => {
            e.preventDefault();
            console.log('Save button clicked');
            saveFile();
        });

        // Export operations
        safeAddEventListener('copy-button', 'click', (e) => {
            e.preventDefault();
            console.log('Copy button clicked');
            if (editor) {
                const value = editor.getValue();
                copyToClipboard(value, notifyCopied, () => {
                    console.error('Failed to copy to clipboard');
                });
            }
        });

        safeAddEventListener('export-html-button', 'click', (e) => {
            e.preventDefault();
            console.log('Export HTML button clicked');
            exportAsHtml();
        });

        safeAddEventListener('pdf-button', 'click', (e) => {
            e.preventDefault();
            console.log('PDF button clicked');
            exportToPdf();
        });

        // Theme toggle
        safeAddEventListener('theme-toggle', 'click', (e) => {
            e.preventDefault();
            console.log('Theme toggle clicked');
            toggleTheme();
        });

        safeAddEventListener('reset-button', 'click', (e) => {
            e.preventDefault();
            console.log('Reset button clicked');
            reset();
        });

        // Editor actions
        safeAddEventListener('format-button', 'click', (e) => {
            e.preventDefault();
            console.log('Format button clicked');
            formatDocument();
        });

        safeAddEventListener('fullscreen-button', 'click', (e) => {
            e.preventDefault();
            console.log('Fullscreen button clicked');
            toggleFullscreen();
        });



        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                switch (e.key) {
                    case 's':
                        e.preventDefault();
                        saveFile();
                        break;
                    case 'o':
                        e.preventDefault();
                        const fileInput = safeGetElement('file-input');
                        if (fileInput) fileInput.click();
                        break;
                    case 'r':
                        e.preventDefault();
                        reset();
                        break;
                    case 'f':
                        e.preventDefault();
                        formatDocument();
                        break;
                    case 'e':
                        e.preventDefault();
                        exportAsHtml();
                        break;
                }
            }
        });

        console.log('All event listeners setup complete');
    };

    const setupDragAndDrop = () => {
        const dragOverlay = document.createElement('div');
        dragOverlay.className = 'drag-overlay';
        dragOverlay.innerHTML = '<div class="drag-overlay-content">Drop your markdown file here</div>';
        document.body.appendChild(dragOverlay);

        let dragCounter = 0;

        document.addEventListener('dragenter', (e) => {
            e.preventDefault();
            dragCounter++;
            if (e.dataTransfer.types.includes('Files')) {
                dragOverlay.classList.add('show');
            }
        });

        document.addEventListener('dragleave', (e) => {
            e.preventDefault();
            dragCounter--;
            if (dragCounter === 0) {
                dragOverlay.classList.remove('show');
            }
        });

        document.addEventListener('dragover', (e) => {
            e.preventDefault();
        });

        document.addEventListener('drop', (e) => {
            e.preventDefault();
            dragCounter = 0;
            dragOverlay.classList.remove('show');
            
            const files = Array.from(e.dataTransfer.files);
            const markdownFile = files.find(file => 
                file.type === 'text/markdown' || 
                file.name.endsWith('.md') || 
                file.name.endsWith('.txt')
            );
            
            if (markdownFile) {
                openFile(markdownFile);
            } else {
                console.error('Please drop a markdown (.md) or text (.txt) file');
            }
        });
    };

    const setupDivider = () => {
        let lastLeftRatio = 0.5;
        const divider = safeGetElement('split-divider');
        const leftPane = safeGetElement('edit');
        const rightPane = safeGetElement('preview');
        const container = safeGetElement('container');

        if (!divider || !leftPane || !rightPane || !container) return;

        let isDragging = false;

        divider.addEventListener('mouseenter', () => {
            divider.classList.add('hover');
        });

        divider.addEventListener('mouseleave', () => {
            if (!isDragging) {
                divider.classList.remove('hover');
            }
        });

        divider.addEventListener('mousedown', () => {
            isDragging = true;
            divider.classList.add('active');
            document.body.style.cursor = 'col-resize';
        });

        divider.addEventListener('dblclick', () => {
            const containerRect = container.getBoundingClientRect();
            const totalWidth = containerRect.width;
            const dividerWidth = divider.offsetWidth;
            const halfWidth = (totalWidth - dividerWidth) / 2;

            leftPane.style.width = halfWidth + 'px';
            rightPane.style.width = halfWidth + 'px';
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            document.body.style.userSelect = 'none';
            const containerRect = container.getBoundingClientRect();
            const totalWidth = containerRect.width;
            const offsetX = e.clientX - containerRect.left;
            const dividerWidth = divider.offsetWidth;

            const minWidth = 100;
            const maxWidth = totalWidth - minWidth - dividerWidth;
            const leftWidth = Math.max(minWidth, Math.min(offsetX, maxWidth));
            leftPane.style.width = leftWidth + 'px';
            rightPane.style.width = (totalWidth - leftWidth - dividerWidth) + 'px';
            lastLeftRatio = leftWidth / (totalWidth - dividerWidth);
        });

        document.addEventListener('mouseup', () => {
            if (isDragging) {
                isDragging = false;
                divider.classList.remove('active');
                divider.classList.remove('hover');
                document.body.style.cursor = 'default';
                document.body.style.userSelect = '';
            }
        });

        window.addEventListener('resize', () => {
            const containerRect = container.getBoundingClientRect();
            const totalWidth = containerRect.width;
            const dividerWidth = divider.offsetWidth;
            const availableWidth = totalWidth - dividerWidth;

            const newLeft = availableWidth * lastLeftRatio;
            const newRight = availableWidth * (1 - lastLeftRatio);

            leftPane.style.width = newLeft + 'px';
            rightPane.style.width = newRight + 'px';
        });
    };

    // ----- Initialization -----
    
    console.log('Starting initialization...');
    
    // Initialize theme first
    initTheme();
    
    // Setup editor
    setupEditor();
    
    // Load and set content
    const lastContent = loadLastContent();
    if (lastContent) {
        presetValue(lastContent);
    } else {
        presetValue(defaultInput);
    }

    // Setup all event listeners
    setupEventListeners();
    setupDragAndDrop();
    
    // Setup scroll sync
    const scrollBarSettings = loadScrollBarSettings() || false;
    initScrollBarSync(scrollBarSettings);

    // Setup divider
    setupDivider();

    // Initial status bar update
    updateStatusBar();
    updateCursorPosition();
    


    console.log('Initialization complete!');
};

// Start the application when the page loads
window.addEventListener("load", () => {
    console.log('Page loaded, starting init...');
    init();
});
// content.js - Coda Chrome Extension Content Script

// Check if we're in the main frame (not an iframe)
if (window.self === window.top) {
    console.log("Coda: Content script loaded on:", window.location.href);
    
    // Function to capture page content using DOM parsing first
    async function capturePageContent() {
        console.log("Coda: Attempting to capture page content...");
        
        // Try DOM-based parsing first
        const domContent = extractDOMContent();
        
        // If DOM content seems insufficient, fall back to OCR
        if (isContentInsufficient(domContent)) {
            console.log("Coda: DOM content insufficient, attempting OCR via Vision Sidecar...");
            return await captureViaOCR();
        }
        
        return {
            method: "dom",
            content: domContent,
            title: document.title,
            url: window.location.href,
            timestamp: new Date().toISOString()
        };
    }
    
    // Extract content using DOM parsing
    function extractDOMContent() {
        // Remove script and style elements
        const scripts = document.querySelectorAll('script, style, noscript');
        scripts.forEach(el => el.remove());
        
        // Extract main content
        const mainContent = document.querySelector('main') ||
                           document.querySelector('article') ||
                           document.querySelector('.content') ||
                           document.querySelector('#content') ||
                           document.body;
        
        if (!mainContent) {
            return document.body.innerText;
        }
        
        // Remove common clutter elements
        const clutterSelectors = [
            '.advertisement', '.ad', '.sidebar', '.nav', '.header', 
            '.footer', '.cookie-consent', '.popup'
        ];
        clutterSelectors.forEach(selector => {
            const elements = mainContent.querySelectorAll(selector);
            elements.forEach(el => el.remove());
        });
        
        // Extract text preserving structure
        let content = '';
        const walker = document.createTreeWalker(
            mainContent,
            NodeFilter.SHOW_TEXT,
            {
                acceptNode: function(node) {
                    const parent = node.parentElement;
                    if (parent.tagName === 'SCRIPT' || parent.tagName === 'STYLE') {
                        return NodeFilter.FILTER_REJECT;
                    }
                    if (node.textContent.trim().length > 0) {
                        return NodeFilter.FILTER_ACCEPT;
                    }
                    return NodeFilter.FILTER_REJECT;
                }
            }
        );
        
        let node;
        while (node = walker.nextNode()) {
            content += node.textContent.trim() + ' ';
        }
        
        return content.substring(0, 10000); // Limit content to 10k chars
    }
    
    // Check if content is sufficient for processing
    function isContentInsufficient(content) {
        // If content is very short or contains generic error messages
        if (!content || content.length < 200) {
            return true;
        }
        
        const genericPatterns = [
            /page not found/i,
            /error/i,
            /loading/i,
            /please enable javascript/i,
            /this page requires/i
        ];
        
        return genericPatterns.some(pattern => pattern.test(content));
    }
    
    // Capture screenshot and send to OCR service
    async function captureViaOCR() {
        try {
            console.log("Coda: Capturing screenshot for OCR...");
            
            // Capture screenshot using Chrome API
            const screenshotDataUrl = await new Promise((resolve, reject) => {
                chrome.runtime.sendMessage({
                    action: "captureVisibleTab"
                }, function(response) {
                    if (chrome.runtime.lastError) {
                        reject(chrome.runtime.lastError);
                    } else {
                        resolve(response.screenshot);
                    }
                });
            });
            
            // Remove data URL prefix to get base64 string
            const base64Image = screenshotDataUrl.split(',')[1];
            
            console.log("Coda: Sending screenshot to Vision Sidecar...");
            
            // Send to OCR service
            const ocrResult = await fetch('http://localhost:8082/ocr', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    image_base64: base64Image
                })
            });
            
            if (!ocrResult.ok) {
                throw new Error(`OCR service error: ${ocrResult.status}`);
            }
            
            const ocrData = await ocrResult.json();
            
            console.log("Coda: OCR processing complete, received:", ocrData.text.substring(0, 200) + "...");
            
            return {
                method: "ocr",
                content: ocrData.text,
                title: document.title,
                url: window.location.href,
                timestamp: new Date().toISOString(),
                ocr_raw: ocrData.raw_output
            };
            
        } catch (error) {
            console.error("Coda: OCR capture failed:", error);
            // Fallback to DOM content if OCR fails
            return {
                method: "dom_fallback",
                content: document.body.innerText.substring(0, 10000),
                title: document.title,
                url: window.location.href,
                timestamp: new Date().toISOString()
            };
        }
    }
    
    // Listen for capture requests from background script
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === "capturePage") {
            capturePageContent().then(data => {
                sendResponse({ success: true, data: data });
            }).catch(error => {
                console.error("Coda: Capture failed:", error);
                sendResponse({ 
                    success: false, 
                    error: error.message,
                    data: {
                        method: "error",
                        content: "",
                        title: document.title,
                        url: window.location.href,
                        timestamp: new Date().toISOString()
                    }
                });
            });
            // Keep message channel open for async response
            return true;
        }
    });
    
    // Inject a button to manually capture page for testing
    function injectCaptureButton() {
        const button = document.createElement('button');
        button.id = 'coda-capture-btn';
        button.textContent = 'Coda Capture';
        button.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            z-index: 10000;
            background: #4F46E5;
            color: white;
            border: none;
            padding: 8px 12px;
            border-radius: 4px;
            font-size: 12px;
            cursor: pointer;
        `;
        button.onclick = async () => {
            const result = await capturePageContent();
            console.log("Coda: Manual capture result:", result);
            alert("Page captured! Check console for details.");
        };
        
        document.body.appendChild(button);
    }
    
    // Inject button if in development mode (optional)
    // injectCaptureButton(); // Uncomment to enable manual capture button
    
    console.log("Coda: Content script ready");
}
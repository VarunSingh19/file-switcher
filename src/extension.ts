import * as vscode from "vscode";

export function activate(context: vscode.ExtensionContext) {
  let recentFiles: string[] = [];

  vscode.window.onDidChangeActiveTextEditor((editor) => {
    if (editor) {
      const filePath = editor.document.uri.fsPath;
      recentFiles = [
        filePath,
        ...recentFiles.filter((f) => f !== filePath),
      ].slice(0, 10);
    }
  });

  let panel: vscode.WebviewPanel | undefined;

  let disposable = vscode.commands.registerCommand(
    "file-switcher.showQuickPick",
    async () => {
      if (panel) {
        panel.dispose();
      }

      panel = vscode.window.createWebviewPanel(
        "fileSwitcher",
        "File Switcher",
        vscode.ViewColumn.Active,
        {
          enableScripts: true,
          retainContextWhenHidden: true,
        }
      );

      panel.webview.html = getWebviewContent();

      panel.webview.onDidReceiveMessage(async (message) => {
        if (message.command === "openFile") {
          const uri = vscode.Uri.file(message.filePath);
          await vscode.window.showTextDocument(uri);
          panel?.dispose();
        } else if (message.command === "close") {
          panel?.dispose();
        }
      });

      const fileData = await Promise.all(
        recentFiles.map(async (filePath) => {
          const uri = vscode.Uri.file(filePath);
          const document = await vscode.workspace.openTextDocument(uri);
          return {
            path: filePath,
            name: filePath.split(/[\\/]/).pop() || "",
            content: document.getText(),
            language: document.languageId,
            isRecent: true,
          };
        })
      );

      panel.webview.postMessage({ command: "setFiles", files: fileData });
    }
  );

  context.subscriptions.push(disposable);
}

function getWebviewContent() {
  return `<!DOCTYPE html>
  <html>
  <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/themes/prism-tomorrow.min.css">
      <style>
          * {
              box-sizing: border-box;
              margin: 0;
              padding: 0;
          }
  
          body {
              margin: 0;
              padding: 20px;
              background: rgba(0, 0, 0, 0.7);
              color: white;
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 100vh;
              overflow: hidden;
          }
  
          .modal {
              background: rgba(30, 30, 30, 0.95);
              border-radius: 12px;
              box-shadow: 0 0 30px rgba(0, 0, 0, 0.7);
              width: 95vw;
              height: 90vh;
              display: flex;
              flex-direction: column;
              position: relative;
          }
  
          .modal-header {
              padding: 15px 20px;
              border-bottom: 1px solid rgba(255, 255, 255, 0.1);
              display: flex;
              justify-content: space-between;
              align-items: center;
          }
  
          .file-count {
              font-size: 14px;
              color: #888;
          }
  
          .carousel {
              display: flex;
              align-items: stretch;
              flex: 1;
              overflow: hidden;
              position: relative;
          }
  
          .navigation-arrow {
              position: absolute;
              top: 50%;
              transform: translateY(-50%);
              z-index: 10;
              background: rgba(0, 0, 0, 0.6);
              color: #fff;
              border: none;
              border-radius: 50%;
              width: 40px;
              height: 40px;
              display: flex;
              align-items: center;
              justify-content: center;
              cursor: pointer;
              transition: all 0.2s;
              font-size: 18px;
          }
  
          .navigation-arrow:hover {
              background: rgba(255, 255, 255, 0.1);
          }
  
          .navigation-arrow.left {
              left: 20px;
          }
  
          .navigation-arrow.right {
              right: 20px;
          }
  
          .files-container {
              flex: 1;
              overflow: hidden;
              position: relative;
          }
  
          .file-card {
              position: absolute;
              top: 0;
              left: 0;
              width: 100%;
              height: 100%;
              padding: 20px;
              display: flex;
              flex-direction: column;
              opacity: 0;
              transition: opacity 0.3s ease;
              pointer-events: none;
          }
  
          .file-card.active {
              opacity: 1;
              pointer-events: all;
          }
  
          .file-header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              margin-bottom: 15px;
          }
  
          .file-name {
              font-size: 16px;
              font-weight: 600;
              display: flex;
              align-items: center;
              gap: 12px;
          }
  
          .badge {
              background: rgba(0, 122, 204, 0.2);
              color: #007acc;
              padding: 4px 10px;
              border-radius: 4px;
              font-size: 12px;
              font-weight: 500;
              border: 1px solid rgba(0, 122, 204, 0.3);
          }
  
          .preview-container {
              flex: 1;
              overflow: auto;
              background: rgba(0, 0, 0, 0.2);
              border-radius: 6px;
              position: relative;
          }
  
          .preview {
              font-family: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
              font-size: 13px;
              line-height: 1.5;
              padding: 15px;
              margin: 0;
              tab-size: 4;
              min-height: 100%;
              white-space: pre;
          }
  
          .preview code {
              display: block;
              min-width: fit-content;
          }
  
          .instructions {
              padding: 15px;
              background: rgba(0, 0, 0, 0.2);
              border-top: 1px solid rgba(255, 255, 255, 0.1);
              display: flex;
              justify-content: center;
              gap: 20px;
              flex-wrap: wrap;
          }
  
          .shortcut {
              display: flex;
              align-items: center;
              gap: 8px;
              color: #888;
              font-size: 13px;
          }
  
          .key {
              background: rgba(255, 255, 255, 0.1);
              padding: 2px 8px;
              border-radius: 4px;
              font-family: monospace;
              color: #fff;
          }
  
          /* Scrollbar styling */
          .preview-container::-webkit-scrollbar {
              width: 12px;
              height: 12px;
          }
  
          .preview-container::-webkit-scrollbar-track {
              background: rgba(0, 0, 0, 0.1);
          }
  
          .preview-container::-webkit-scrollbar-thumb {
              background: rgba(255, 255, 255, 0.1);
              border-radius: 6px;
              border: 3px solid rgba(0, 0, 0, 0.1);
          }
  
          .preview-container::-webkit-scrollbar-thumb:hover {
              background: rgba(255, 255, 255, 0.2);
          }
  
          @media (max-width: 768px) {
              body {
                  padding: 10px;
              }
  
              .modal {
                  width: 100%;
                  height: 100vh;
                  border-radius: 0;
              }
  
              .navigation-arrow {
                  width: 32px;
                  height: 32px;
                  font-size: 14px;
              }
  
              .navigation-arrow.left {
                  left: 10px;
              }
  
              .navigation-arrow.right {
                  right: 10px;
              }
  
              .instructions {
                  padding: 10px;
              }
          }
      </style>
  </head>
  <body>
      <div class="modal">
          <div class="modal-header">
              <div class="file-name" id="currentFileName"></div>
              <div class="file-count" id="fileCount"></div>
          </div>
          <div class="carousel">
              <button class="navigation-arrow left" onclick="navigateFiles('left')">◀</button>
              <div class="files-container" id="fileContainer"></div>
              <button class="navigation-arrow right" onclick="navigateFiles('right')">▶</button>
          </div>
          <div class="instructions">
              <div class="shortcut"><span class="key">←</span> <span class="key">→</span> Navigate files</div>
              <div class="shortcut"><span class="key">Enter</span> Open file</div>
              <div class="shortcut"><span class="key">Esc</span> Close</div>
          </div>
      </div>
  
      <script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/prism.min.js"></script>
      <script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-javascript.min.js"></script>
      <script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-typescript.min.js"></script>
      <script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-jsx.min.js"></script>
      <script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-tsx.min.js"></script>
      <script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-css.min.js"></script>
      <script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-json.min.js"></script>
      <script>
          const vscode = acquireVsCodeApi();
          let selectedIndex = 0;
          let files = [];
  
          function getFileLanguage(fileName, languageId) {
              if (languageId) return languageId;
              
              const ext = fileName.split('.').pop().toLowerCase();
              const langMap = {
                  'js': 'javascript',
                  'jsx': 'jsx',
                  'ts': 'typescript',
                  'tsx': 'tsx',
                  'css': 'css',
                  'json': 'json',
                  'html': 'html',
                  'md': 'markdown'
              };
              return langMap[ext] || 'plaintext';
          }
  
          window.addEventListener('message', event => {
              const message = event.data;
              if (message.command === 'setFiles') {
                  files = message.files;
                  renderFiles();
                  updateFileInfo();
              }
          });
  
          function updateFileInfo() {
              const currentFile = files[selectedIndex];
              if (!currentFile) return;
  
              document.getElementById('currentFileName').innerHTML = \`
                  <span class="badge">Recent</span>
                  \${currentFile.name}
              \`;
              document.getElementById('fileCount').textContent = \`\${selectedIndex + 1} / \${files.length}\`;
          }
  
          function renderFiles() {
              const container = document.getElementById('fileContainer');
              container.innerHTML = '';
              
              files.forEach((file, index) => {
                  const card = document.createElement('div');
                  card.className = \`file-card \${index === selectedIndex ? 'active' : ''}\`;
                  
                  const language = getFileLanguage(file.name, file.language);
                  const highlightedCode = Prism.highlight(
                      file.content,
                      Prism.languages[language] || Prism.languages.plaintext,
                      language
                  );
  
                  card.innerHTML = \`
                      <div class="preview-container">
                          <pre class="preview"><code class="language-\${language}">\${highlightedCode}</code></pre>
                      </div>
                  \`;
                  container.appendChild(card);
              });
          }
  
          function navigateFiles(direction) {
              if (files.length === 0) return;
  
              if (direction === 'left') {
                  selectedIndex = (selectedIndex - 1 + files.length) % files.length;
              } else {
                  selectedIndex = (selectedIndex + 1) % files.length;
              }
              renderFiles();
              updateFileInfo();
          }
  
          function openFile(index) {
              vscode.postMessage({
                  command: 'openFile',
                  filePath: files[index].path
              });
          }
  
          document.addEventListener('keydown', (e) => {
              if (e.key === 'ArrowRight') {
                  navigateFiles('right');
              } else if (e.key === 'ArrowLeft') {
                  navigateFiles('left');
              } else if (e.key === 'Enter') {
                  openFile(selectedIndex);
              } else if (e.key === 'Escape') {
                  vscode.postMessage({ command: 'close' });
              }
          });
      </script>
  </body>
  </html>`;
}
export function deactivate() {}

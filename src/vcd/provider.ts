import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { VCDParser, VCDData } from './parser';

export class VCDEditorProvider implements vscode.TextDocumentContentProvider {
    public static register(context: vscode.ExtensionContext): vscode.Disposable {
        const provider = new VCDEditorProvider(context);
        
        // 注册文档内容提供程序
        const providerRegistration = vscode.workspace.registerTextDocumentContentProvider(
            VCDEditorProvider.scheme,
            provider
        );
        
        // 注册命令来打开 VCD 文件
        const commandRegistration = vscode.commands.registerCommand(
            'verilog-vcd-viewer.open',
            (uri: vscode.Uri) => provider.openVCDFile(uri)
        );
        
        // 注册文件关联 - 自动打开VCD文件
        const fileAssociationRegistration = vscode.workspace.onDidOpenTextDocument(doc => {
            if (doc.fileName.endsWith('.vcd') && doc.languageId === 'vcd') {
                provider.openVCDFile(doc.uri);
            }
        });
        
        return vscode.Disposable.from(
            providerRegistration,
            commandRegistration,
            fileAssociationRegistration
        );
    }

    private static readonly scheme = 'vcd-viewer';
    private _onDidChange = new vscode.EventEmitter<vscode.Uri>();
    private webviewPanels = new Map<string, vscode.WebviewPanel>();

    constructor(private readonly context: vscode.ExtensionContext) {}

    get onDidChange(): vscode.Event<vscode.Uri> {
        return this._onDidChange.event;
    }

    public async openVCDFile(uri: vscode.Uri): Promise<void> {
        const panelKey = uri.toString();
        
        // 如果已经有打开的面板，则显示它
        if (this.webviewPanels.has(panelKey)) {
            this.webviewPanels.get(panelKey)!.reveal();
            return;
        }
        
        // 创建新的 WebView 面板
        const panel = vscode.window.createWebviewPanel(
            'vcd-viewer',
            `VCD: ${path.basename(uri.fsPath)}`,
            vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: [
                    vscode.Uri.file(path.join(this.context.extensionPath, 'media'))
                ]
            }
        );

        this.webviewPanels.set(panelKey, panel);

        panel.webview.html = this.getHtmlForWebview(panel.webview, uri);

        // 监听面板关闭
        panel.onDidDispose(() => {
            this.webviewPanels.delete(panelKey);
        });

        // 监听来自 WebView 的消息
        panel.webview.onDidReceiveMessage(message => {
            switch (message.type) {
                case 'ready':
                    this.updateWebview(panel, uri);
                    break;
            }
        });

        // 监听文件变化
        const watcher = vscode.workspace.createFileSystemWatcher(uri.fsPath);
        watcher.onDidChange(() => {
            this.updateWebview(panel, uri);
        });
        
        panel.onDidDispose(() => {
            watcher.dispose();
        });

        // 初始加载
        this.updateWebview(panel, uri);
    }

    public provideTextDocumentContent(uri: vscode.Uri): string {
        return ''; // 不使用文档内容提供程序的内容
    }

    private async updateWebview(panel: vscode.WebviewPanel, uri: vscode.Uri): Promise<void> {
        try {
            console.log(`开始读取VCD文件: ${uri.fsPath}`);
            
            // 检查文件是否存在
            if (!fs.existsSync(uri.fsPath)) {
                throw new Error(`文件不存在: ${uri.fsPath}`);
            }
            
            // 检查文件大小
            const stats = fs.statSync(uri.fsPath);
            console.log(`文件大小: ${stats.size} 字节`);
            
            if (stats.size === 0) {
                throw new Error('VCD文件为空');
            }
            
            if (stats.size > 100 * 1024 * 1024) { // 100MB
                const result = await vscode.window.showWarningMessage(
                    `VCD文件较大 (${Math.round(stats.size / 1024 / 1024)}MB)，解析可能需要较长时间。是否继续？`,
                    '继续', '取消'
                );
                if (result !== '继续') {
                    return;
                }
            }
            
            const content = fs.readFileSync(uri.fsPath);
            const text = content.toString('utf8');
            
            console.log(`文件内容长度: ${text.length} 字符`);
            
            if (text.length === 0) {
                throw new Error('VCD文件为空');
            }
            
            // 检查是否是有效的VCD文件 - 更宽松的检查
            const hasVCDHeader = text.includes('$timescale') || 
                                text.includes('$var') || 
                                text.includes('$scope') ||
                                text.includes('$enddefinitions');
            
            if (!hasVCDHeader) {
                throw new Error('文件格式不正确，可能不是有效的VCD文件。VCD文件应包含 $timescale、$var、$scope 或 $enddefinitions 等关键字。');
            }
            
            console.log('开始解析VCD内容...');
            const parser = new VCDParser(text);
            const vcdData = parser.parse();
            
            console.log(`解析完成: ${vcdData.signals.length} 个信号, ${vcdData.valueChanges.length} 个变化, 时间范围: 0-${vcdData.endTime}`);
            
            // 验证解析结果
            if (vcdData.signals.length === 0) {
                console.warn('警告: 未解析到任何信号');
            }
            
            if (vcdData.valueChanges.length === 0) {
                console.warn('警告: 未解析到任何值变化');
            }
            
            panel.webview.postMessage({
                type: 'update',
                data: vcdData
            });
            
        } catch (error: any) {
            console.error('VCD解析错误:', error);
            
            // 提供更详细的错误信息
            let errorMessage = `解析 VCD 文件时出错: ${error.message}`;
            
            if (error.message.includes('无法解析')) {
                errorMessage += '\n\n可能的解决方案:\n1. 检查VCD文件是否完整\n2. 确认文件编码为UTF-8\n3. 检查文件是否被正确生成';
            }
            
            panel.webview.postMessage({
                type: 'error',
                message: errorMessage,
                details: {
                    file: uri.fsPath,
                    error: error.message,
                    stack: error.stack
                }
            });
        }
    }

    private getHtmlForWebview(webview: vscode.Webview, uri: vscode.Uri): string {
        // 获取资源 URI - 兼容不同VS Code版本
        const mediaPath = path.join(this.context.extensionPath, 'media');
        
        // 使用更兼容的方式获取资源URI
        const getResourceUri = (resourcePath: string) => {
            try {
                // VS Code 1.38+ - 类型安全的方式检查方法存在
                const webviewAny = webview as any;
                if (typeof webviewAny.asWebviewUri === 'function') {
                    return webviewAny.asWebviewUri(vscode.Uri.file(resourcePath));
                }
                // 回退方案
                return vscode.Uri.file(resourcePath).with({ scheme: 'vscode-resource' });
            } catch (error) {
                console.warn('获取资源URI失败，使用回退方案:', error);
                return vscode.Uri.file(resourcePath).with({ scheme: 'vscode-resource' });
            }
        };
        
        const scriptUri = getResourceUri(path.join(mediaPath, 'vcd-viewer.js'));
        const styleUri = getResourceUri(path.join(mediaPath, 'vcd-viewer.css'));
        
        // 获取CSP源 - 兼容不同VS Code版本
        const getCspSource = () => {
            try {
                const webviewAny = webview as any;
                return webviewAny.cspSource || 'vscode-resource:';
            } catch (error) {
                return 'vscode-resource:';
            }
        };
        
        const cspSource = getCspSource();

        return `<!DOCTYPE html>
        <html lang="zh-CN">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${cspSource} 'unsafe-inline'; script-src ${cspSource} 'unsafe-inline'; img-src ${cspSource} data:;">
            <link href="${styleUri}" rel="stylesheet">
            <title>VCD 波形查看器 - ${path.basename(uri.fsPath)}</title>
        </head>
        <body>
            <div class="container">
                <div class="toolbar">
                    <div class="controls">
                        <button id="zoomIn">放大</button>
                        <button id="zoomOut">缩小</button>
                        <button id="zoomFit">适应窗口</button>
                        <span class="separator">|</span>
                        <label for="timeScale">时间单位:</label>
                        <span id="timeScale">加载中...</span>
                        <span class="separator">|</span>
                        <span id="fileInfo">文件: ${path.basename(uri.fsPath)}</span>
                    </div>
                    <div class="search">
                        <input type="text" id="signalFilter" placeholder="搜索信号...">
                    </div>
                </div>
                
                <div class="content">
                    <div class="signal-list">
                        <div class="signal-header">信号列表</div>
                        <div id="signalTree">
                            <div class="loading-message">正在加载VCD文件...</div>
                        </div>
                    </div>
                    
                    <div class="waveform-area">
                        <div class="time-ruler" id="timeRuler"></div>
                        <div class="waveforms" id="waveforms">
                            <div class="loading-message">请从左侧选择要显示的信号</div>
                        </div>
                    </div>
                </div>
                
                <div class="status-bar">
                    <span id="cursorTime">时间: 0</span>
                    <span id="selectedSignals">已选信号: 0</span>
                    <span id="debugInfo"></span>
                </div>
            </div>
            
            <script src="${scriptUri}"></script>
        </body>
        </html>`;
    }
}

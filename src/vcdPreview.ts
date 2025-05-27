import * as vscode from 'vscode';
import * as path from 'path';
import { VVPParser } from './vvpParser';

export class VCDPreviewProvider {
    private static currentPanel: vscode.WebviewPanel | undefined;

    public static createOrShow(extensionPath: string, document: vscode.TextDocument) {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;

        if (VCDPreviewProvider.currentPanel) {
            VCDPreviewProvider.currentPanel.reveal(column);
            VCDPreviewProvider.currentPanel.webview.html = this.getWebviewContent(document);
            return;
        }

        const panel = vscode.window.createWebviewPanel(
            'vcdPreview',
            'VCD/VVP Waveform Viewer',
            column || vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true
            }
        );

        VCDPreviewProvider.currentPanel = panel;
        panel.webview.html = this.getWebviewContent(document);

        panel.onDidDispose(() => {
            VCDPreviewProvider.currentPanel = undefined;
        }, null);
    }

    private static getWebviewContent(document: vscode.TextDocument): string {
        const content = document.getText();
        const isVVPFormat = this.detectVVPFormat(content);
        
        if (isVVPFormat) {
            return this.generateVVPViewer(content);
        } else {
            return this.generateVCDViewer(content);
        }
    }

    private static detectVVPFormat(content: string): boolean {
        return content.includes(':ivl_version') || 
               content.includes('.scope module') ||
               content.includes('#! /');
    }

    private static generateVVPViewer(content: string): string {
        const parser = new VVPParser(content);
        const { scopes, modules } = parser.parse();
        
        return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>VVP Waveform Viewer</title>
            <style>
                body { 
                    margin: 0; 
                    padding: 0; 
                    font-family: 'Courier New', monospace;
                    display: flex;
                    height: 100vh;
                    background: #1e1e1e;
                    color: #cccccc;
                }
                .sidebar {
                    width: 300px;
                    background: #252526;
                    border-right: 1px solid #3e3e42;
                    overflow-y: auto;
                    padding: 10px;
                }
                .waveform-container {
                    flex: 1;
                    position: relative;
                    background: #1e1e1e;
                }
                .signal-item {
                    padding: 8px;
                    cursor: pointer;
                    border-radius: 4px;
                    margin: 3px 0;
                    border: 1px solid transparent;
                }
                .signal-item:hover {
                    background: #2d2d30;
                    border-color: #007acc;
                }
                .signal-item.selected {
                    background: #007acc;
                    color: white;
                }
                .scope-header {
                    font-weight: bold;
                    color: #569cd6;
                    margin: 15px 0 8px 0;
                    padding-bottom: 5px;
                    border-bottom: 1px solid #3e3e42;
                    font-size: 14px;
                }
                .signal-name {
                    font-weight: bold;
                    color: #dcdcaa;
                }
                .signal-info {
                    font-size: 11px;
                    color: #6a9955;
                    margin-top: 2px;
                }
                .controls {
                    padding: 12px;
                    background: #2d2d30;
                    border-bottom: 1px solid #3e3e42;
                    display: flex;
                    gap: 8px;
                }
                button {
                    padding: 6px 12px;
                    border: 1px solid #3e3e42;
                    background: #0e639c;
                    color: white;
                    cursor: pointer;
                    border-radius: 2px;
                    font-size: 12px;
                }
                button:hover {
                    background: #1177bb;
                }
                .waveform-canvas {
                    width: 100%;
                    height: calc(100% - 60px);
                    background: #1e1e1e;
                }
                .no-signals {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    height: 100%;
                    color: #858585;
                    font-style: italic;
                }
            </style>
        </head>
        <body>
            <div class="sidebar">
                <div class="controls">
                    <button onclick="zoomIn()">放大</button>
                    <button onclick="zoomOut()">缩小</button>
                    <button onclick="fitToWindow()">适应窗口</button>
                </div>
                <div id="signal-tree">
                    ${this.generateSignalTree(scopes)}
                </div>
            </div>
            <div class="waveform-container">
                <canvas id="waveform-canvas" class="waveform-canvas"></canvas>
                <div id="no-signals" class="no-signals" style="display: none;">
                    请从左侧选择信号以查看波形
                </div>
            </div>

            <script>
                ${this.getWaveformViewerScript()}
                
                const scopeData = ${JSON.stringify(scopes)};
                const moduleData = ${JSON.stringify(modules)};
                
                let viewer;
                let selectedSignals = [];
                
                window.addEventListener('load', () => {
                    const canvas = document.getElementById('waveform-canvas');
                    const noSignalsDiv = document.getElementById('no-signals');
                    
                    if (scopeData.length === 0) {
                        canvas.style.display = 'none';
                        noSignalsDiv.style.display = 'flex';
                        noSignalsDiv.textContent = '未找到有效的信号定义';
                        return;
                    }
                    
                    viewer = new WaveformViewer(canvas);
                    noSignalsDiv.style.display = 'flex';
                });
                
                window.addEventListener('resize', () => {
                    if (viewer) {
                        viewer.resize();
                    }
                });
                
                function selectSignal(signalName, element) {
                    element.classList.toggle('selected');
                    
                    const index = selectedSignals.indexOf(signalName);
                    if (index > -1) {
                        selectedSignals.splice(index, 1);
                    } else {
                        selectedSignals.push(signalName);
                    }
                    
                    updateWaveformDisplay();
                }
                
                function updateWaveformDisplay() {
                    const noSignalsDiv = document.getElementById('no-signals');
                    const canvas = document.getElementById('waveform-canvas');
                    
                    if (selectedSignals.length === 0) {
                        noSignalsDiv.style.display = 'flex';
                        canvas.style.display = 'none';
                        return;
                    }
                    
                    noSignalsDiv.style.display = 'none';
                    canvas.style.display = 'block';
                    
                    const mockWaveforms = generateMockWaveforms(scopeData, selectedSignals);
                    if (viewer) {
                        viewer.setWaveforms(mockWaveforms);
                    }
                }
                
                function generateMockWaveforms(scopes, filterSignals = null) {
                    const waveforms = [];
                    
                    scopes.forEach(scope => {
                        scope.signals.forEach(signal => {
                            if (filterSignals && !filterSignals.includes(signal.name)) {
                                return;
                            }
                            
                            const values = [];
                            const maxTime = 2000;
                            const numChanges = signal.width === 1 ? 20 : 10;
                            
                            for (let i = 0; i < numChanges; i++) {
                                const time = (i / numChanges) * maxTime;
                                let value;
                                
                                if (signal.width === 1) {
                                    value = Math.random() > 0.5 ? 1 : 0;
                                } else {
                                    value = Math.floor(Math.random() * Math.pow(2, signal.width));
                                }
                                
                                values.push({ time, value });
                            }
                            
                            waveforms.push({ signal, values });
                        });
                    });
                    
                    return waveforms;
                }
                
                function zoomIn() {
                    if (viewer) {
                        viewer.timeScale *= 1.5;
                        viewer.render();
                    }
                }
                
                function zoomOut() {
                    if (viewer) {
                        viewer.timeScale /= 1.5;
                        viewer.render();
                    }
                }
                
                function fitToWindow() {
                    if (viewer) {
                        viewer.timeScale = 1;
                        viewer.timeOffset = 0;
                        viewer.render();
                    }
                }
            </script>
        </body>
        </html>`;
    }

    private static generateSignalTree(scopes: any[]): string {
        if (scopes.length === 0) {
            return '<div style="color: #858585; font-style: italic;">未找到信号定义</div>';
        }
        
        let html = '';
        
        scopes.forEach(scope => {
            html += `<div class="scope-header">📁 ${scope.name} (${scope.type})</div>`;
            
            if (scope.signals.length === 0) {
                html += '<div style="color: #858585; font-style: italic; margin-left: 20px;">无信号</div>';
                return;
            }
            
            scope.signals.forEach((signal: any) => {
                const widthStr = signal.width > 1 ? `[${signal.width-1}:0]` : '';
                html += `
                    <div class="signal-item" onclick="selectSignal('${signal.name}', this)">
                        <div class="signal-name">📊 ${signal.name}</div>
                        <div class="signal-info">${signal.type} ${widthStr}</div>
                    </div>
                `;
            });
        });
        
        return html;
    }

    private static generateVCDViewer(content: string): string {
        return `<!DOCTYPE html>
        <html>
        <head>
            <title>VCD文件内容</title>
            <style>
                body { 
                    font-family: 'Courier New', monospace; 
                    background: #1e1e1e; 
                    color: #cccccc; 
                    margin: 20px;
                }
                pre { 
                    white-space: pre-wrap; 
                    word-wrap: break-word;
                    background: #252526;
                    padding: 20px;
                    border-radius: 4px;
                    border: 1px solid #3e3e42;
                }
            </style>
        </head>
        <body>
            <h1>标准VCD格式文件</h1>
            <pre>${this.escapeHtml(content)}</pre>
        </body>
        </html>`;
    }

    private static escapeHtml(text: string): string {
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    private static getWaveformViewerScript(): string {
        return `
            class WaveformViewer {
                constructor(canvas) {
                    this.canvas = canvas;
                    this.ctx = canvas.getContext('2d');
                    this.timeScale = 1;
                    this.timeOffset = 0;
                    this.signalHeight = 40;
                    this.timelineHeight = 50;
                    this.waveforms = [];
                    this.labelWidth = 200;
                    this.setupCanvas();
                    this.setupEventListeners();
                }
                
                setupCanvas() {
                    this.resize();
                }
                
                setupEventListeners() {
                    this.canvas.addEventListener('wheel', (e) => {
                        e.preventDefault();
                        const delta = e.deltaY > 0 ? 1.1 : 0.9;
                        this.timeScale *= delta;
                        this.render();
                    });
                    
                    this.canvas.addEventListener('mousemove', (e) => {
                        if (e.buttons === 1) {
                            this.timeOffset -= e.movementX / this.timeScale;
                            this.render();
                        }
                    });
                }
                
                setWaveforms(waveforms) {
                    this.waveforms = waveforms;
                    this.render();
                }
                
                render() {
                    this.ctx.fillStyle = '#1e1e1e';
                    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
                    
                    this.drawTimeline();
                    this.drawSignals();
                    this.drawSignalLabels();
                }
                
                drawTimeline() {
                    const ctx = this.ctx;
                    
                    ctx.fillStyle = '#2d2d30';
                    ctx.fillRect(0, 0, this.canvas.width, this.timelineHeight);
                    
                    ctx.strokeStyle = '#3e3e42';
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.moveTo(0, this.timelineHeight);
                    ctx.lineTo(this.canvas.width, this.timelineHeight);
                    ctx.stroke();
                    
                    ctx.fillStyle = '#cccccc';
                    ctx.font = '12px Consolas, monospace';
                    
                    const timeStep = this.calculateTimeStep();
                    const startTime = Math.floor(this.timeOffset / timeStep) * timeStep;
                    
                    for (let time = startTime; time < this.timeOffset + this.canvas.width / this.timeScale; time += timeStep) {
                        const x = this.labelWidth + (time - this.timeOffset) * this.timeScale;
                        if (x >= this.labelWidth && x <= this.canvas.width) {
                            ctx.strokeStyle = '#3e3e42';
                            ctx.beginPath();
                            ctx.moveTo(x, 0);
                            ctx.lineTo(x, this.timelineHeight);
                            ctx.stroke();
                            
                            ctx.fillStyle = '#cccccc';
                            ctx.fillText(time + 'ns', x + 4, this.timelineHeight - 8);
                        }
                    }
                }
                
                drawSignals() {
                    this.waveforms.forEach((waveform, index) => {
                        const y = this.timelineHeight + index * this.signalHeight;
                        this.drawWaveform(waveform, this.labelWidth, y, this.canvas.width - this.labelWidth);
                    });
                }
                
                drawWaveform(waveform, x, y, width) {
                    const ctx = this.ctx;
                    const signal = waveform.signal;
                    const values = waveform.values;
                    
                    const index = this.waveforms.indexOf(waveform);
                    ctx.fillStyle = index % 2 === 0 ? '#252526' : '#2d2d30';
                    ctx.fillRect(x, y, width, this.signalHeight);
                    
                    ctx.strokeStyle = '#3e3e42';
                    ctx.strokeRect(x, y, width, this.signalHeight);
                    
                    if (values.length === 0) return;
                    
                    ctx.strokeStyle = signal.width === 1 ? '#569cd6' : '#dcdcaa';
                    ctx.lineWidth = 2;
                    
                    let lastValue = null;
                    let lastX = x;
                    
                    for (let i = 0; i < values.length; i++) {
                        const value = values[i];
                        const time = value.time;
                        const currentX = x + (time - this.timeOffset) * this.timeScale;
                        
                        if (currentX < x) continue;
                        if (currentX > x + width) break;
                        
                        if (lastValue !== null) {
                            if (signal.width === 1) {
                                this.drawDigitalTransition(lastX, currentX, y, lastValue, value.value);
                            } else {
                                this.drawBusTransition(lastX, currentX, y, lastValue, value.value);
                            }
                        }
                        
                        lastValue = value.value;
                        lastX = currentX;
                    }
                }
                
                drawDigitalTransition(x1, x2, y, oldValue, newValue) {
                    const ctx = this.ctx;
                    const highY = y + 8;
                    const lowY = y + this.signalHeight - 8;
                    
                    const oldY = oldValue ? highY : lowY;
                    const newY = newValue ? highY : lowY;
                    
                    ctx.beginPath();
                    ctx.moveTo(x1, oldY);
                    ctx.lineTo(x2, oldY);
                    if (oldY !== newY) {
                        ctx.lineTo(x2, newY);
                    }
                    ctx.stroke();
                }
                
                drawBusTransition(x1, x2, y, oldValue, newValue) {
                    const ctx = this.ctx;
                    const topY = y + 8;
                    const bottomY = y + this.signalHeight - 8;
                    const midY = y + this.signalHeight / 2;
                    
                    ctx.beginPath();
                    ctx.moveTo(x1, topY);
                    ctx.lineTo(x2 - 8, topY);
                    ctx.lineTo(x2, midY);
                    ctx.lineTo(x2 - 8, bottomY);
                    ctx.lineTo(x1, bottomY);
                    ctx.closePath();
                    ctx.stroke();
                    
                    if (x2 - x1 > 40) {
                        ctx.fillStyle = '#cccccc';
                        ctx.font = '11px Consolas, monospace';
                        const text = newValue.toString(16).toUpperCase();
                        ctx.fillText(text, x1 + 8, midY + 4);
                    }
                }
                
                drawSignalLabels() {
                    const ctx = this.ctx;
                    
                    ctx.fillStyle = '#252526';
                    ctx.fillRect(0, this.timelineHeight, this.labelWidth, this.canvas.height - this.timelineHeight);
                    
                    ctx.strokeStyle = '#3e3e42';
                    ctx.beginPath();
                    ctx.moveTo(this.labelWidth, this.timelineHeight);
                    ctx.lineTo(this.labelWidth, this.canvas.height);
                    ctx.stroke();
                    
                    ctx.fillStyle = '#dcdcaa';
                    ctx.font = '13px Consolas, monospace';
                    
                    this.waveforms.forEach((waveform, index) => {
                        const y = this.timelineHeight + index * this.signalHeight;
                        const textY = y + this.signalHeight / 2 + 5;
                        
                        const index2 = this.waveforms.indexOf(waveform);
                        ctx.fillStyle = index2 % 2 === 0 ? '#252526' : '#2d2d30';
                        ctx.fillRect(0, y, this.labelWidth, this.signalHeight);
                        
                        ctx.strokeStyle = '#3e3e42';
                        ctx.strokeRect(0, y, this.labelWidth, this.signalHeight);
                        
                        ctx.fillStyle = '#dcdcaa';
                        ctx.fillText(waveform.signal.name, 8, textY);
                        
                        if (waveform.signal.width > 1) {
                            ctx.fillStyle = '#6a9955';
                            ctx.font = '10px Consolas, monospace';
                            ctx.fillText('[' + (waveform.signal.width-1) + ':0]', 8, textY + 14);
                            ctx.fillStyle = '#dcdcaa';
                            ctx.font = '13px Consolas, monospace';
                        }
                    });
                }
                
                calculateTimeStep() {
                    const pixelsPerStep = 80;
                    const timePerPixel = 1 / this.timeScale;
                    const roughStep = pixelsPerStep * timePerPixel;
                    
                    const steps = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000];
                    for (const step of steps) {
                        if (step >= roughStep) {
                            return step;
                        }
                    }
                    return steps[steps.length - 1];
                }
                
                resize() {
                    const rect = this.canvas.getBoundingClientRect();
                    this.canvas.width = rect.width;
                    this.canvas.height = rect.height;
                    this.render();
                }
            }
        `;
    }
}

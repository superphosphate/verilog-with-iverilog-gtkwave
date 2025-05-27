class VCDViewer {
    constructor() {
        this.vcdData = null;
        this.selectedSignals = new Set();
        this.zoomLevel = 1;
        this.timeOffset = 0;
        this.cursorTime = 0;
        this.vscode = null;
        
        this.initializeElements();
        this.setupEventListeners();
        this.initializeVSCode();
        
        console.log('VCD查看器初始化完成');
    }

    initializeVSCode() {
        try {
            // 尝试获取 VS Code API
            if (typeof acquireVsCodeApi !== 'undefined') {
                this.vscode = acquireVsCodeApi();
                console.log('VS Code API获取成功');
            } else {
                console.warn('VS Code API不可用');
            }
        } catch (error) {
            console.warn('无法获取 VS Code API:', error);
        }
        
        // 发送就绪消息
        this.sendMessage({ type: 'ready' });
    }

    initializeElements() {
        this.signalTree = document.getElementById('signalTree');
        this.timeRuler = document.getElementById('timeRuler');
        this.waveforms = document.getElementById('waveforms');
        this.signalFilter = document.getElementById('signalFilter');
        this.timeScaleElement = document.getElementById('timeScale');
        this.cursorTimeElement = document.getElementById('cursorTime');
        this.selectedSignalsElement = document.getElementById('selectedSignals');
    }

    setupEventListeners() {
        // 缩放控制
        document.getElementById('zoomIn').addEventListener('click', () => this.zoomIn());
        document.getElementById('zoomOut').addEventListener('click', () => this.zoomOut());
        document.getElementById('zoomFit').addEventListener('click', () => this.zoomFit());
        
        // 信号过滤
        this.signalFilter.addEventListener('input', (e) => this.filterSignals(e.target.value));
        
        // 接收来自扩展的消息
        window.addEventListener('message', (event) => {
            const message = event.data;
            switch (message.type) {
                case 'update':
                    this.updateVCDData(message.data);
                    break;
                case 'error':
                    this.showError(message.message);
                    break;
            }
        });
        
        // 波形区域滚动同步
        if (this.waveforms) {
            this.waveforms.addEventListener('scroll', () => {
                this.syncTimeRuler();
            });
        }
    }

    sendMessage(message) {
        if (this.vscode) {
            this.vscode.postMessage(message);
        } else {
            // 回退方案
            console.log('发送消息:', message);
        }
    }

    updateVCDData(data) {
        console.log('收到VCD数据:', data);
        this.vcdData = data;
        
        if (this.timeScaleElement) {
            this.timeScaleElement.textContent = data.timescale;
        }
        
        // 更新调试信息
        if (document.getElementById('debugInfo')) {
            document.getElementById('debugInfo').textContent = 
                `信号: ${data.signals.length}, 变化: ${data.valueChanges.length}`;
        }
        
        this.renderSignalTree();
        this.renderTimeRuler();
        this.updateSelectedSignalsDisplay();
    }

    renderSignalTree() {
        if (!this.vcdData || !this.signalTree) {
            console.warn('无法渲染信号树：缺少数据或元素');
            return;
        }
        
        console.log(`开始渲染 ${this.vcdData.signals.length} 个信号`);
        this.signalTree.innerHTML = '';
        
        if (this.vcdData.signals.length === 0) {
            this.signalTree.innerHTML = '<div class="error-message">未找到信号定义</div>';
            return;
        }
        
        // 按作用域分组信号
        const signalsByScope = {};
        this.vcdData.signals.forEach(signal => {
            const scope = signal.scope || 'top';
            if (!signalsByScope[scope]) {
                signalsByScope[scope] = [];
            }
            signalsByScope[scope].push(signal);
        });
        
        console.log('信号按作用域分组:', signalsByScope);
        
        // 渲染信号树
        Object.keys(signalsByScope).forEach(scope => {
            // 作用域标题
            if (scope) {
                const scopeElement = document.createElement('div');
                scopeElement.className = 'signal-scope-header';
                scopeElement.textContent = scope;
                scopeElement.style.fontWeight = 'bold';
                scopeElement.style.padding = '4px 8px';
                scopeElement.style.backgroundColor = 'var(--vscode-sideBarSectionHeader-background)';
                scopeElement.style.borderBottom = '1px solid var(--vscode-editorGroup-border)';
                this.signalTree.appendChild(scopeElement);
            }
            
            // 信号列表
            signalsByScope[scope].forEach(signal => {
                const signalElement = this.createSignalElement(signal);
                this.signalTree.appendChild(signalElement);
            });
        });
        
        console.log('信号树渲染完成');
    }

    createSignalElement(signal) {
        const element = document.createElement('div');
        element.className = 'signal-item';
        element.dataset.symbol = signal.symbol;
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'signal-checkbox';
        checkbox.id = `signal_${signal.symbol}`;
        checkbox.addEventListener('change', (e) => {
            console.log(`信号 ${signal.name} 选择状态改变:`, e.target.checked);
            if (e.target.checked) {
                this.selectedSignals.add(signal.symbol);
                element.classList.add('selected');
            } else {
                this.selectedSignals.delete(signal.symbol);
                element.classList.remove('selected');
            }
            this.renderWaveforms();
            this.updateSelectedSignalsDisplay();
        });
        
        const label = document.createElement('label');
        label.htmlFor = `signal_${signal.symbol}`;
        label.className = 'signal-name';
        label.textContent = signal.name;
        label.title = `${signal.name} (${signal.type}, ${signal.size} bits, symbol: ${signal.symbol})`;
        
        element.appendChild(checkbox);
        element.appendChild(label);
        
        return element;
    }

    renderTimeRuler() {
        if (!this.vcdData || !this.timeRuler) return;
        
        this.timeRuler.innerHTML = '';
        
        const rulerWidth = this.calculateRulerWidth();
        const timeStep = this.calculateTimeStep();
        
        for (let time = 0; time <= this.vcdData.endTime; time += timeStep) {
            const position = (time / this.vcdData.endTime) * rulerWidth;
            
            const tick = document.createElement('div');
            tick.className = 'time-tick';
            if (time % (timeStep * 5) === 0) {
                tick.classList.add('major');
            }
            tick.style.left = `${position}px`;
            tick.textContent = time.toString();
            
            this.timeRuler.appendChild(tick);
        }
    }

    renderWaveforms() {
        if (!this.vcdData || this.selectedSignals.size === 0 || !this.waveforms) {
            if (this.waveforms) {
                this.waveforms.innerHTML = '<div class="loading-message">请从左侧选择要显示的信号</div>';
            }
            return;
        }
        
        console.log(`开始渲染 ${this.selectedSignals.size} 个选中信号的波形`);
        this.waveforms.innerHTML = '';
        
        this.selectedSignals.forEach(symbol => {
            const signal = this.vcdData.signals.find(s => s.symbol === symbol);
            if (signal) {
                console.log(`渲染信号波形: ${signal.name}`);
                const waveformRow = this.createWaveformRow(signal);
                this.waveforms.appendChild(waveformRow);
            }
        });
    }

    createWaveformRow(signal) {
        const row = document.createElement('div');
        row.className = 'waveform-row';
        
        const label = document.createElement('div');
        label.className = 'waveform-label';
        label.textContent = signal.name;
        label.title = signal.name;
        
        const canvas = document.createElement('canvas');
        canvas.className = 'waveform-canvas';
        canvas.height = 40;
        
        // 监听鼠标移动显示时间光标
        canvas.addEventListener('mousemove', (e) => {
            this.updateCursor(e, canvas);
        });
        
        row.appendChild(label);
        row.appendChild(canvas);
        
        // 渲染波形
        this.renderSignalWaveform(canvas, signal);
        
        return row;
    }

    renderSignalWaveform(canvas, signal) {
        const ctx = canvas.getContext('2d');
        const width = canvas.clientWidth || 800;
        const height = canvas.clientHeight || 40;
        
        canvas.width = width;
        canvas.height = height;
        
        ctx.clearRect(0, 0, width, height);
        ctx.strokeStyle = '#cccccc';
        ctx.fillStyle = '#cccccc';
        ctx.lineWidth = 1;
        
        // 获取信号的值变化
        const changes = this.vcdData.valueChanges
            .filter(change => change.symbol === signal.symbol)
            .sort((a, b) => a.time - b.time);
        
        console.log(`信号 ${signal.name} 有 ${changes.length} 个值变化`);
        
        if (changes.length === 0) {
            // 绘制无数据提示
            ctx.fillStyle = '#888888';
            ctx.font = '12px sans-serif';
            ctx.fillText('无数据', width / 2 - 20, height / 2);
            return;
        }
        
        const timeScale = width / (this.vcdData.endTime || 1);
        
        ctx.beginPath();
        let currentValue = changes[0].value;
        let currentY = this.getValueY(currentValue, height, signal.size);
        
        // 绘制初始值
        ctx.moveTo(0, currentY);
        
        changes.forEach((change, index) => {
            const x = change.time * timeScale;
            
            // 绘制到变化点的水平线
            ctx.lineTo(x, currentY);
            
            // 绘制垂直变化线
            const newY = this.getValueY(change.value, height, signal.size);
            ctx.lineTo(x, newY);
            
            currentY = newY;
            currentValue = change.value;
        });
        
        // 绘制到结束的水平线
        ctx.lineTo(width, currentY);
        ctx.stroke();
        
        // 绘制值标签
        this.drawValueLabels(ctx, changes, timeScale, height, signal.size);
    }

    getValueY(value, height, signalSize) {
        if (signalSize === 1) {
            // 单位信号
            switch (value) {
                case '0': return height - 10;
                case '1': return 10;
                case 'x': case 'z': return height / 2;
                default: return height / 2;
            }
        } else {
            // 多位信号 - 在中间绘制
            return height / 2;
        }
    }

    drawValueLabels(ctx, changes, timeScale, height, signalSize) {
        ctx.font = '10px monospace';
        ctx.fillStyle = '#cccccc';
        
        if (signalSize > 1) {
            // 多位信号显示十六进制值
            changes.forEach((change, index) => {
                const x = change.time * timeScale + 2;
                const hexValue = parseInt(change.value, 2).toString(16).toUpperCase();
                ctx.fillText(`0x${hexValue}`, x, height / 2 - 2);
            });
        }
    }

    updateCursor(event, canvas) {
        if (!this.vcdData) return;
        
        const rect = canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const time = (x / canvas.clientWidth) * this.vcdData.endTime;
        
        this.cursorTime = Math.round(time);
        if (this.cursorTimeElement) {
            this.cursorTimeElement.textContent = `时间: ${this.cursorTime}`;
        }
    }

    filterSignals(filterText) {
        if (!this.signalTree) return;
        
        const items = this.signalTree.querySelectorAll('.signal-item');
        items.forEach(item => {
            const signalName = item.querySelector('.signal-name').textContent;
            const visible = signalName.toLowerCase().includes(filterText.toLowerCase());
            item.style.display = visible ? 'flex' : 'none';
        });
    }

    zoomIn() {
        this.zoomLevel *= 1.5;
        this.renderTimeRuler();
        this.renderWaveforms();
    }

    zoomOut() {
        this.zoomLevel /= 1.5;
        this.renderTimeRuler();
        this.renderWaveforms();
    }

    zoomFit() {
        this.zoomLevel = 1;
        this.timeOffset = 0;
        this.renderTimeRuler();
        this.renderWaveforms();
    }

    calculateRulerWidth() {
        if (!this.waveforms) return 800;
        return this.waveforms.clientWidth * this.zoomLevel;
    }

    calculateTimeStep() {
        if (!this.vcdData) return 1;
        return Math.max(1, Math.floor(this.vcdData.endTime / 20));
    }

    syncTimeRuler() {
        if (this.timeRuler && this.waveforms) {
            this.timeRuler.scrollLeft = this.waveforms.scrollLeft;
        }
    }

    updateSelectedSignalsDisplay() {
        if (this.selectedSignalsElement) {
            this.selectedSignalsElement.textContent = `已选信号: ${this.selectedSignals.size}`;
        }
    }

    showError(message) {
        console.error('VCD查看器错误:', message);
        
        if (this.signalTree) {
            this.signalTree.innerHTML = `<div class="error-message">${message}</div>`;
        }
        if (this.waveforms) {
            this.waveforms.innerHTML = `<div class="error-message">${message}</div>`;
        }
        if (this.timeRuler) {
            this.timeRuler.innerHTML = '';
        }
        
        // 更新调试信息
        if (document.getElementById('debugInfo')) {
            document.getElementById('debugInfo').textContent = '错误';
        }
    }
}

// 初始化查看器
window.addEventListener('DOMContentLoaded', () => {
    console.log('页面加载完成，初始化VCD查看器');
    new VCDViewer();
});

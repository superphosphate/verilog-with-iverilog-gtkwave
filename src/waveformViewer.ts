import { VVPSignal, VVPScope } from './vvpParser';

export interface SignalValue {
    time: number;
    value: string | number;
}

export interface WaveformData {
    signal: VVPSignal;
    values: SignalValue[];
}

export class WaveformViewer {
    private container: HTMLElement;
    private canvas!: HTMLCanvasElement;
    private ctx!: CanvasRenderingContext2D;
    private waveforms: WaveformData[] = [];
    private timeScale = 1;
    private timeOffset = 0;
    private signalHeight = 30;
    private timelineHeight = 40;
    private cursorTime = 0;
    private isDragging = false;
    private lastMouseX = 0;
    
    constructor(container: HTMLElement) {
        this.container = container;
        this.createCanvas();
        this.setupEventListeners();
    }
    
    private createCanvas(): void {
        this.canvas = document.createElement('canvas');
        this.canvas.width = this.container.clientWidth;
        this.canvas.height = this.container.clientHeight;
        this.ctx = this.canvas.getContext('2d')!;
        this.container.appendChild(this.canvas);
    }
    
    private setupEventListeners(): void {
        // 鼠标滚轮缩放
        this.canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            const rect = this.canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseTime = this.timeOffset + mouseX / this.timeScale;
            
            const delta = e.deltaY > 0 ? 0.9 : 1.1;
            this.timeScale *= delta;
            
            // 保持鼠标位置对应的时间不变
            this.timeOffset = mouseTime - mouseX / this.timeScale;
            this.render();
        });
        
        // 鼠标拖拽平移
        this.canvas.addEventListener('mousedown', (e) => {
            this.isDragging = true;
            this.lastMouseX = e.clientX;
            this.canvas.style.cursor = 'grabbing';
        });
        
        this.canvas.addEventListener('mousemove', (e) => {
            if (this.isDragging) {
                const deltaX = e.clientX - this.lastMouseX;
                this.timeOffset -= deltaX / this.timeScale;
                this.lastMouseX = e.clientX;
                this.render();
            } else {
                // 显示时间游标
                this.updateCursor(e);
            }
        });
        
        this.canvas.addEventListener('mouseup', () => {
            this.isDragging = false;
            this.canvas.style.cursor = 'default';
        });
        
        this.canvas.addEventListener('mouseleave', () => {
            this.isDragging = false;
            this.canvas.style.cursor = 'default';
        });
        
        // 键盘快捷键
        this.canvas.addEventListener('keydown', (e) => {
            switch (e.key) {
                case '+':
                case '=':
                    this.timeScale *= 1.2;
                    this.render();
                    break;
                case '-':
                    this.timeScale *= 0.8;
                    this.render();
                    break;
                case 'ArrowLeft':
                    this.timeOffset -= 50 / this.timeScale;
                    this.render();
                    break;
                case 'ArrowRight':
                    this.timeOffset += 50 / this.timeScale;
                    this.render();
                    break;
            }
        });
        
        this.canvas.tabIndex = 0; // 使画布可获得焦点以接收键盘事件
        this.canvas.setAttribute('role', 'application');
        this.canvas.setAttribute('aria-label', 'Waveform viewer canvas');
    }
    
    private updateCursor(e: MouseEvent): void {
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        this.cursorTime = this.timeOffset + mouseX / this.timeScale;
        
        // 触发游标更新事件
        this.container.dispatchEvent(new CustomEvent('cursorUpdate', {
            detail: { time: this.cursorTime }
        }));
    }
    
    public setWaveforms(waveforms: WaveformData[]): void {
        this.waveforms = waveforms;
        this.render();
    }
    
    public addSignal(signal: VVPSignal, values: SignalValue[]): void {
        this.waveforms.push({ signal, values });
        this.render();
    }
    
    public zoomIn(): void {
        this.timeScale *= 1.5;
        this.render();
    }
    
    public zoomOut(): void {
        this.timeScale /= 1.5;
        this.render();
    }
    
    public zoomFit(): void {
        if (this.waveforms.length === 0) return;
        
        // 找到所有信号的时间范围
        let maxTime = 0;
        this.waveforms.forEach(waveform => {
            waveform.values.forEach(value => {
                maxTime = Math.max(maxTime, value.time);
            });
        });
        
        if (maxTime > 0) {
            this.timeScale = (this.canvas.width - 200) / maxTime;
            this.timeOffset = 0;
            this.render();
        }
    }
    
    private render(): void {
        // 清除画布
        this.ctx.fillStyle = '#1e1e1e';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.drawTimeline();
        this.drawSignals();
        this.drawSignalLabels();
        this.drawCursor();
    }
    
    private drawTimeline(): void {
        const ctx = this.ctx;
        const width = this.canvas.width;
        const height = this.timelineHeight;
        
        // 时间轴背景
        ctx.fillStyle = '#2d2d30';
        ctx.fillRect(0, 0, width, height);
        
        // 分割线
        ctx.strokeStyle = '#3e3e42';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, height);
        ctx.lineTo(width, height);
        ctx.stroke();
        
        // 时间刻度
        ctx.fillStyle = '#cccccc';
        ctx.font = '11px Consolas, monospace';
        
        const timeStep = this.calculateTimeStep();
        const startTime = Math.floor(this.timeOffset / timeStep) * timeStep;
        const signalLabelWidth = 150;
        
        for (let time = startTime; time < this.timeOffset + (width - signalLabelWidth) / this.timeScale; time += timeStep) {
            const x = signalLabelWidth + (time - this.timeOffset) * this.timeScale;
            if (x >= signalLabelWidth && x <= width) {
                // 主刻度线
                ctx.strokeStyle = '#3e3e42';
                ctx.beginPath();
                ctx.moveTo(x, 0);
                ctx.lineTo(x, height);
                ctx.stroke();
                
                // 时间标签
                ctx.fillStyle = '#cccccc';
                ctx.fillText(`${time}ns`, x + 2, height - 4);
                
                // 次刻度线
                const subStep = timeStep / 5;
                for (let i = 1; i < 5; i++) {
                    const subX = signalLabelWidth + (time + i * subStep - this.timeOffset) * this.timeScale;
                    if (subX >= signalLabelWidth && subX <= width) {
                        ctx.strokeStyle = '#2a2a2a';
                        ctx.beginPath();
                        ctx.moveTo(subX, height - 5);
                        ctx.lineTo(subX, height);
                        ctx.stroke();
                    }
                }
            }
        }
    }
    
    private drawSignals(): void {
        const signalLabelWidth = 150;
        const startX = signalLabelWidth;
        
        this.waveforms.forEach((waveform, index) => {
            const y = this.timelineHeight + index * this.signalHeight;
            this.drawWaveform(waveform, startX, y, this.canvas.width - startX);
        });
    }
    
    private drawWaveform(waveform: WaveformData, x: number, y: number, width: number): void {
        const ctx = this.ctx;
        const signal = waveform.signal;
        const values = waveform.values;
        
        // 信号背景 - 改进交替颜色
        const index = this.waveforms.indexOf(waveform);
        ctx.fillStyle = index % 2 === 0 ? '#252526' : '#2d2d30';
        ctx.fillRect(x, y, width, this.signalHeight);
        
        // 信号边框
        ctx.strokeStyle = '#3e3e42';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, width, this.signalHeight);
        
        if (values.length === 0) {
            // 显示无数据提示
            ctx.fillStyle = '#6a6a6a';
            ctx.font = '10px Consolas';
            ctx.fillText('无数据', x + 10, y + this.signalHeight / 2 + 3);
            return;
        }
        
        // 根据信号类型选择颜色
        ctx.strokeStyle = signal.width === 1 ? '#569cd6' : '#dcdcaa';
        ctx.lineWidth = 2;
        
        // 绘制波形 - 改进渲染逻辑
        this.renderSignalPath(ctx, values, signal, x, y, width);
    }
    
    private renderSignalPath(ctx: CanvasRenderingContext2D, values: SignalValue[], signal: VVPSignal, x: number, y: number, width: number): void {
        let lastValue: string | number | null = null;
        let lastX = x;
        
        // 添加初始值处理
        if (values.length > 0) {
            const firstValue = values[0];
            if (firstValue.time > this.timeOffset) {
                // 如果第一个变化在可视区域内，从起始时间绘制初始状态
                if (signal.width === 1) {
                    this.drawDigitalTransition(x, x, y, 'x', 'x'); // 未知状态
                } else {
                    this.drawBusTransition(x, x, y, 'x', 'x');
                }
            }
        }
        
        for (let i = 0; i < values.length; i++) {
            const value = values[i];
            const time = value.time;
            const currentX = x + (time - this.timeOffset) * this.timeScale;
            
            // 优化渲染范围检查
            if (currentX < x - 10) continue;
            if (currentX > x + width + 10) break;
            
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
        
        // 延伸到可视区域末尾
        if (lastValue !== null && lastX < x + width) {
            if (signal.width === 1) {
                this.drawDigitalTransition(lastX, x + width, y, lastValue, lastValue);
            } else {
                this.drawBusTransition(lastX, x + width, y, lastValue, lastValue);
            }
        }
    }
    
    private drawDigitalTransition(x1: number, x2: number, y: number, oldValue: string | number, newValue: string | number): void {
        const ctx = this.ctx;
        const highY = y + 6;
        const lowY = y + this.signalHeight - 6;
        const midY = y + this.signalHeight / 2;
        
        const oldY = this.getDigitalY(oldValue, highY, lowY, midY);
        const newY = this.getDigitalY(newValue, highY, lowY, midY);
        
        ctx.beginPath();
        ctx.moveTo(x1, oldY);
        ctx.lineTo(x2, oldY);
        
        // 绘制转换边沿
        if (oldY !== newY && x1 !== x2) {
            ctx.lineTo(x2, newY);
        }
        ctx.stroke();
        
        // 标记未知状态
        if (String(newValue).toLowerCase() === 'x' || String(newValue).toLowerCase() === 'z') {
            ctx.strokeStyle = '#ff6b6b';
            ctx.setLineDash([2, 2]);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.strokeStyle = '#569cd6';
        }
    }
    
    private drawBusTransition(x1: number, x2: number, y: number, oldValue: string | number, newValue: string | number): void {
        const ctx = this.ctx;
        const topY = y + 8;
        const bottomY = y + this.signalHeight - 8;
        const midY = y + this.signalHeight / 2;
        const transitionWidth = 8;
        
        // 改进总线信号绘制
        ctx.beginPath();
        ctx.moveTo(x1, topY);
        ctx.lineTo(Math.max(x1, x2 - transitionWidth), topY);
        ctx.lineTo(x2, midY);
        ctx.lineTo(Math.max(x1, x2 - transitionWidth), bottomY);
        ctx.lineTo(x1, bottomY);
        ctx.closePath();
        ctx.stroke();
        
        // 值标签 - 改进显示逻辑
        const segmentWidth = x2 - x1;
        if (segmentWidth > 30) {
            ctx.fillStyle = '#cccccc';
            ctx.font = '9px Consolas, monospace';
            
            let displayValue = String(newValue);
            if (displayValue !== 'x' && displayValue !== 'z') {
                // 尝试转换为十六进制
                const numValue = typeof newValue === 'string' ? parseInt(newValue, 2) : newValue;
                if (!isNaN(numValue)) {
                    displayValue = `0x${numValue.toString(16).toUpperCase()}`;
                }
            }
            
            // 居中显示值
            const textWidth = ctx.measureText(displayValue).width;
            const textX = x1 + (segmentWidth - textWidth) / 2;
            ctx.fillText(displayValue, Math.max(x1 + 3, textX), midY + 3);
        }
    }
    
    private getDigitalY(value: string | number, highY: number, lowY: number, midY: number): number {
        const strValue = String(value).toLowerCase();
        switch (strValue) {
            case '1': case 'h': return highY;
            case '0': case 'l': return lowY;
            case 'x': case 'z': case 'u': return midY;
            default:
                const numValue = typeof value === 'string' ? parseInt(value) : value;
                return !isNaN(numValue) && numValue ? highY : lowY;
        }
    }
    
    private drawSignalLabels(): void {
        const ctx = this.ctx;
        const labelWidth = 150;
        
        // 标签区域背景
        ctx.fillStyle = '#252526';
        ctx.fillRect(0, this.timelineHeight, labelWidth, this.canvas.height - this.timelineHeight);
        
        // 分割线
        ctx.strokeStyle = '#3e3e42';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(labelWidth, this.timelineHeight);
        ctx.lineTo(labelWidth, this.canvas.height);
        ctx.stroke();
        
        // 信号标签
        this.waveforms.forEach((waveform, index) => {
            const y = this.timelineHeight + index * this.signalHeight;
            const textY = y + this.signalHeight / 2 + 4;
            
            // 交替背景色
            const bgIndex = this.waveforms.indexOf(waveform);
            ctx.fillStyle = bgIndex % 2 === 0 ? '#252526' : '#2d2d30';
            ctx.fillRect(0, y, labelWidth, this.signalHeight);
            
            // 边框
            ctx.strokeStyle = '#3e3e42';
            ctx.strokeRect(0, y, labelWidth, this.signalHeight);
            
            // 信号名称
            ctx.fillStyle = '#dcdcaa';
            ctx.font = 'bold 11px Consolas, monospace';
            const signalName = waveform.signal.name;
            
            // 截断过长的名称
            let displayName = signalName;
            const maxWidth = labelWidth - 16;
            while (ctx.measureText(displayName).width > maxWidth && displayName.length > 3) {
                displayName = displayName.substring(0, displayName.length - 4) + '...';
            }
            
            ctx.fillText(displayName, 6, textY);
            
            // 信号类型和宽度信息
            if (waveform.signal.width > 1) {
                ctx.fillStyle = '#6a9955';
                ctx.font = '9px Consolas, monospace';
                ctx.fillText(`[${waveform.signal.width-1}:0]`, 6, textY + 11);
            }
        });
    }
    
    private drawCursor(): void {
        if (this.cursorTime <= this.timeOffset) return;
        
        const ctx = this.ctx;
        const signalLabelWidth = 150;
        const x = signalLabelWidth + (this.cursorTime - this.timeOffset) * this.timeScale;
        
        if (x >= signalLabelWidth && x <= this.canvas.width) {
            ctx.strokeStyle = '#ff6b35';
            ctx.lineWidth = 1;
            ctx.setLineDash([3, 3]);
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, this.canvas.height);
            ctx.stroke();
            ctx.setLineDash([]);
        }
    }
    
    private calculateTimeStep(): number {
        const pixelsPerStep = 80;
        const timePerPixel = 1 / this.timeScale;
        const roughStep = pixelsPerStep * timePerPixel;
        
        // 改进步长计算 - 使用更多的步长选项
        const steps = [0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000];
        for (const step of steps) {
            if (step >= roughStep) {
                return step;
            }
        }
        return steps[steps.length - 1];
    }
    
    public resize(): void {
        this.canvas.width = this.container.clientWidth;
        this.canvas.height = this.container.clientHeight;
        this.render();
    }
    
    // 公共属性访问器
    public get currentTimeScale(): number { return this.timeScale; }
    public get currentTimeOffset(): number { return this.timeOffset; }
    public get currentCursorTime(): number { return this.cursorTime; }
}

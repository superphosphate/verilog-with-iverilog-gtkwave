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
        this.canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            const delta = e.deltaY > 0 ? 1.1 : 0.9;
            this.timeScale *= delta;
            this.render();
        });
        
        this.canvas.addEventListener('mousemove', (e) => {
            if (e.buttons === 1) { // 鼠标拖拽
                this.timeOffset -= e.movementX / this.timeScale;
                this.render();
            }
        });
    }
    
    public setWaveforms(waveforms: WaveformData[]): void {
        this.waveforms = waveforms;
        this.render();
    }
    
    public addSignal(signal: VVPSignal, values: SignalValue[]): void {
        this.waveforms.push({ signal, values });
        this.render();
    }
    
    private render(): void {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.drawTimeline();
        this.drawSignals();
        this.drawSignalLabels();
    }
    
    private drawTimeline(): void {
        const ctx = this.ctx;
        const width = this.canvas.width;
        const height = this.timelineHeight;
        
        // 背景
        ctx.fillStyle = '#f0f0f0';
        ctx.fillRect(0, 0, width, height);
        
        // 时间刻度
        ctx.strokeStyle = '#666';
        ctx.fillStyle = '#333';
        ctx.font = '12px monospace';
        
        const timeStep = this.calculateTimeStep();
        const startTime = Math.floor(this.timeOffset / timeStep) * timeStep;
        
        for (let time = startTime; time < this.timeOffset + width / this.timeScale; time += timeStep) {
            const x = (time - this.timeOffset) * this.timeScale;
            if (x >= 0 && x <= width) {
                ctx.beginPath();
                ctx.moveTo(x, 0);
                ctx.lineTo(x, height);
                ctx.stroke();
                
                ctx.fillText(`${time}ns`, x + 2, height - 5);
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
        
        // 信号背景
        const index = this.waveforms.indexOf(waveform);
        ctx.fillStyle = index % 2 === 0 ? '#ffffff' : '#f8f8f8';
        ctx.fillRect(x, y, width, this.signalHeight);
        
        // 信号边框
        ctx.strokeStyle = '#ddd';
        ctx.strokeRect(x, y, width, this.signalHeight);
        
        if (values.length === 0) return;
        
        ctx.strokeStyle = signal.width === 1 ? '#0066cc' : '#cc6600';
        ctx.lineWidth = 2;
        
        let lastValue: string | number | null = null;
        let lastX = x;
        
        for (let i = 0; i < values.length; i++) {
            const value = values[i];
            const time = value.time;
            const currentX = x + (time - this.timeOffset) * this.timeScale;
            
            if (currentX < x) continue;
            if (currentX > x + width) break;
            
            if (lastValue !== null) {
                if (signal.width === 1) {
                    // 数字信号
                    this.drawDigitalTransition(lastX, currentX, y, lastValue, value.value);
                } else {
                    // 多位信号
                    this.drawBusTransition(lastX, currentX, y, lastValue, value.value);
                }
            }
            
            lastValue = value.value;
            lastX = currentX;
        }
    }
    
    private drawDigitalTransition(x1: number, x2: number, y: number, oldValue: string | number, newValue: string | number): void {
        const ctx = this.ctx;
        const midY = y + this.signalHeight / 2;
        const highY = y + 5;
        const lowY = y + this.signalHeight - 5;
        
        const oldY = this.getDigitalY(oldValue, highY, lowY);
        const newY = this.getDigitalY(newValue, highY, lowY);
        
        // 水平线
        ctx.beginPath();
        ctx.moveTo(x1, oldY);
        ctx.lineTo(x2, oldY);
        ctx.stroke();
        
        // 转换边沿
        if (oldY !== newY) {
            ctx.beginPath();
            ctx.moveTo(x2, oldY);
            ctx.lineTo(x2, newY);
            ctx.stroke();
        }
    }
    
    private drawBusTransition(x1: number, x2: number, y: number, oldValue: string | number, newValue: string | number): void {
        const ctx = this.ctx;
        const topY = y + 8;
        const bottomY = y + this.signalHeight - 8;
        const midY = y + this.signalHeight / 2;
        
        // 总线信号用梯形表示
        ctx.beginPath();
        ctx.moveTo(x1, topY);
        ctx.lineTo(x2 - 5, topY);
        ctx.lineTo(x2, midY);
        ctx.lineTo(x2 - 5, bottomY);
        ctx.lineTo(x1, bottomY);
        ctx.closePath();
        ctx.stroke();
        
        // 显示值
        if (x2 - x1 > 30) {
            ctx.fillStyle = '#333';
            ctx.font = '10px monospace';
            ctx.fillText(String(newValue), x1 + 5, midY + 3);
        }
    }
    
    private getDigitalY(value: string | number, highY: number, lowY: number): number {
        const numValue = typeof value === 'string' ? parseInt(value) : value;
        return numValue ? highY : lowY;
    }
    
    private drawSignalLabels(): void {
        const ctx = this.ctx;
        const labelWidth = 150;
        
        ctx.fillStyle = '#f5f5f5';
        ctx.fillRect(0, this.timelineHeight, labelWidth, this.canvas.height - this.timelineHeight);
        
        ctx.strokeStyle = '#ddd';
        ctx.strokeRect(0, this.timelineHeight, labelWidth, this.canvas.height - this.timelineHeight);
        
        ctx.fillStyle = '#333';
        ctx.font = '12px monospace';
        
        this.waveforms.forEach((waveform, index) => {
            const y = this.timelineHeight + index * this.signalHeight;
            const textY = y + this.signalHeight / 2 + 4;
            
            ctx.fillText(waveform.signal.name, 5, textY);
            
            // 显示信号宽度
            if (waveform.signal.width > 1) {
                ctx.fillStyle = '#666';
                ctx.font = '10px monospace';
                ctx.fillText(`[${waveform.signal.width-1}:0]`, 5, textY + 12);
                ctx.fillStyle = '#333';
                ctx.font = '12px monospace';
            }
        });
    }
    
    private calculateTimeStep(): number {
        const pixelsPerStep = 50;
        const timePerPixel = 1 / this.timeScale;
        const roughStep = pixelsPerStep * timePerPixel;
        
        // 找到合适的步长
        const steps = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000];
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
}

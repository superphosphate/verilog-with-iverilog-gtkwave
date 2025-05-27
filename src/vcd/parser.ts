export interface VCDSignal {
    symbol: string;
    size: number;
    name: string;
    scope: string;
    type: 'wire' | 'reg' | 'parameter' | 'integer' | 'real' | 'event' | 'supply0' | 'supply1' | 'tri' | 'triand' | 'trior' | 'trireg' | 'tri0' | 'tri1' | 'uwire' | 'wand' | 'wor';
}

export interface VCDValueChange {
    time: number;
    symbol: string;
    value: string;
}

export interface VCDScope {
    name: string;
    type: string;
    parent?: string;
}

export interface VCDData {
    timescale: string;
    signals: VCDSignal[];
    valueChanges: VCDValueChange[];
    scopes: VCDScope[];
    endTime: number;
    version?: string;
    date?: string;
    comment?: string;
}

export class VCDParser {
    private content: string;
    private position: number;
    private lines: string[];
    private lineIndex: number;
    
    constructor(content: string) {
        this.content = content;
        this.position = 0;
        // 预处理：移除空行和注释，规范化行结束符
        this.lines = content
            .replace(/\r\n/g, '\n')
            .replace(/\r/g, '\n')
            .split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0 && !line.startsWith('//'));
        this.lineIndex = 0;
    }

    parse(): VCDData {
        const signals: VCDSignal[] = [];
        const valueChanges: VCDValueChange[] = [];
        const scopes: VCDScope[] = [];
        let timescale = '1ns';
        let endTime = 0;
        let currentScope = '';
        let version = '';
        let date = '';
        let comment = '';

        console.log(`开始解析VCD文件，总行数: ${this.lines.length}`);

        try {
            // 解析头部信息
            while (this.lineIndex < this.lines.length) {
                const line = this.getNextLine();
                if (!line) break;

                try {
                    if (line.startsWith('$comment')) {
                        comment = this.parseMultiLineCommand('$comment', '$end');
                    } else if (line.startsWith('$date')) {
                        date = this.parseMultiLineCommand('$date', '$end');
                    } else if (line.startsWith('$version')) {
                        version = this.parseMultiLineCommand('$version', '$end');
                    } else if (line.startsWith('$timescale')) {
                        timescale = this.parseTimescale(line);
                        console.log(`解析时间刻度: ${timescale}`);
                    } else if (line.startsWith('$scope')) {
                        const scope = this.parseScope(line);
                        if (scope) {
                            scope.parent = currentScope;
                            scopes.push(scope);
                            currentScope = currentScope ? `${currentScope}.${scope.name}` : scope.name;
                            console.log(`进入作用域: ${currentScope}`);
                        }
                    } else if (line.startsWith('$upscope')) {
                        // 回到上级作用域
                        const lastDot = currentScope.lastIndexOf('.');
                        currentScope = lastDot > 0 ? currentScope.substring(0, lastDot) : '';
                        console.log(`退出作用域，当前作用域: ${currentScope || 'root'}`);
                    } else if (line.startsWith('$var')) {
                        const signal = this.parseVariable(line, currentScope);
                        if (signal) {
                            signals.push(signal);
                            console.log(`解析信号: ${signal.name} (${signal.symbol}) 类型: ${signal.type} 宽度: ${signal.size}`);
                        } else {
                            console.warn(`无法解析变量行: ${line}`);
                        }
                    } else if (line.startsWith('$enddefinitions')) {
                        console.log('头部解析完成，开始解析值变化');
                        break;
                    }
                } catch (error) {
                    console.warn(`解析行时出错: "${line}"`, error);
                }
            }

            console.log(`解析到 ${signals.length} 个信号，${scopes.length} 个作用域`);

            // 解析值变化
            let currentTime = 0;
            let changeCount = 0;
            
            while (this.lineIndex < this.lines.length) {
                const line = this.getNextLine();
                if (!line) break;

                try {
                    if (line.startsWith('#')) {
                        const timeStr = line.substring(1);
                        const newTime = parseInt(timeStr);
                        if (!isNaN(newTime)) {
                            currentTime = newTime;
                            endTime = Math.max(endTime, currentTime);
                        } else {
                            console.warn(`无效的时间值: ${timeStr}`);
                        }
                    } else if (line.length > 0 && !line.startsWith('$')) {
                        const change = this.parseValueChange(line, currentTime);
                        if (change) {
                            valueChanges.push(change);
                            changeCount++;
                        } else {
                            console.warn(`无法解析值变化: ${line}`);
                        }
                    }
                } catch (error) {
                    console.warn(`解析值变化时出错: "${line}"`, error);
                }
            }

            console.log(`解析到 ${changeCount} 个值变化，结束时间: ${endTime}`);

            return {
                timescale,
                signals,
                valueChanges,
                scopes,
                endTime,
                version,
                date,
                comment
            };
        } catch (error) {
            console.error('VCD解析过程中发生致命错误:', error);
            throw new Error(`VCD文件解析失败: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    private getNextLine(): string | null {
        if (this.lineIndex >= this.lines.length) return null;
        return this.lines[this.lineIndex++];
    }

    private parseMultiLineCommand(startCmd: string, endCmd: string): string {
        let content = '';
        let line = this.lines[this.lineIndex - 1]; // 当前行
        
        try {
            // 如果开始和结束在同一行
            if (line.includes(endCmd)) {
                const start = line.indexOf(startCmd) + startCmd.length;
                const end = line.indexOf(endCmd);
                if (start < end) {
                    return line.substring(start, end).trim();
                }
            }
            
            // 多行命令
            while (this.lineIndex < this.lines.length) {
                const nextLine = this.getNextLine();
                if (!nextLine) break;
                
                if (nextLine.includes(endCmd)) {
                    const end = nextLine.indexOf(endCmd);
                    content += nextLine.substring(0, end).trim();
                    break;
                } else {
                    content += nextLine + ' ';
                }
            }
            
            return content.trim();
        } catch (error) {
            console.warn(`解析多行命令失败 (${startCmd}):`, error);
            return '';
        }
    }

    private parseTimescale(line: string): string {
        const patterns = [
            /\$timescale\s+(\d+\s*[a-zA-Z]+)\s+\$end/,
            /\$timescale\s+(\S+)\s+\$end/,
            /\$timescale\s+(\S+)/
        ];
        
        for (const pattern of patterns) {
            const match = line.match(pattern);
            if (match && match[1]) {
                return match[1].replace(/\s+/g, '');
            }
        }
        console.warn(`无法解析时间刻度: ${line}`);
        return '1ns';
    }

    private parseScope(line: string): VCDScope | null {
        const patterns = [
            /\$scope\s+(\w+)\s+(\S+)\s+\$end/,
            /\$scope\s+(\w+)\s+(\S+)/
        ];
        
        for (const pattern of patterns) {
            const match = line.match(pattern);
            if (match && match[1] && match[2]) {
                return {
                    type: match[1],
                    name: match[2]
                };
            }
        }
        console.warn(`无法解析作用域: ${line}`);
        return null;
    }

    private parseVariable(line: string, scope: string): VCDSignal | null {
        const patterns = [
            // 标准格式: $var type size symbol name $end
            /\$var\s+(\w+)\s+(\d+)\s+(\S+)\s+(.+?)\s+\$end/,
            // 无$end格式: $var type size symbol name
            /\$var\s+(\w+)\s+(\d+)\s+(\S+)\s+(.+)/,
            // 可能的其他格式
            /\$var\s+(\w+)\s+(\d+)\s+(\S+)$/
        ];
        
        for (const pattern of patterns) {
            const match = line.match(pattern);
            if (match) {
                const type = match[1];
                const sizeStr = match[2];
                const symbol = match[3];
                const name = match[4] || symbol; // 如果没有名称，使用符号作为名称
                
                if (!type || !sizeStr || !symbol) {
                    continue;
                }
                
                const size = parseInt(sizeStr);
                if (isNaN(size) || size <= 0) {
                    console.warn(`无效的信号宽度: ${sizeStr} in line: ${line}`);
                    continue;
                }
                
                // 验证信号类型
                const validTypes = ['wire', 'reg', 'parameter', 'integer', 'real', 'event', 'supply0', 'supply1', 'tri', 'triand', 'trior', 'trireg', 'tri0', 'tri1', 'uwire', 'wand', 'wor'];
                const signalType = validTypes.includes(type) ? type as VCDSignal['type'] : 'wire';
                
                return {
                    type: signalType,
                    size: size,
                    symbol: symbol.trim(),
                    name: name.trim(),
                    scope: scope || ''
                };
            }
        }
        console.warn(`无法解析变量定义: ${line}`);
        return null;
    }

    private parseValueChange(line: string, time: number): VCDValueChange | null {
        try {
            // 向量值变化: b1010 symbol 或 b1010symbol
            if (line.startsWith('b')) {
                const patterns = [
                    /^b([01xzXZ*-]+)\s+(\S+)$/,
                    /^b([01xzXZ*-]+)(\S+)$/
                ];
                
                for (const pattern of patterns) {
                    const match = line.match(pattern);
                    if (match && match[1] && match[2]) {
                        return {
                            time,
                            symbol: match[2],
                            value: match[1]
                        };
                    }
                }
            }
            // 实数值变化: r1.5 symbol
            else if (line.startsWith('r')) {
                const patterns = [
                    /^r([0-9.eE+-]+)\s+(\S+)$/,
                    /^r([0-9.eE+-]+)(\S+)$/
                ];
                
                for (const pattern of patterns) {
                    const match = line.match(pattern);
                    if (match && match[1] && match[2]) {
                        return {
                            time,
                            symbol: match[2],
                            value: match[1]
                        };
                    }
                }
            }
            // 标量值变化: 1symbol 或 0symbol
            else if (line.length >= 2) {
                const value = line[0];
                const symbol = line.substring(1);
                if (['0', '1', 'x', 'z', 'X', 'Z'].includes(value) && symbol) {
                    return {
                        time,
                        symbol: symbol.trim(),
                        value: value.toLowerCase()
                    };
                }
            }
            
            return null;
        } catch (error) {
            console.warn(`解析值变化时出错: ${line}`, error);
            return null;
        }
    }
}

export interface VVPSignal {
    name: string;
    width: number;
    type: 'var' | 'net';
    scope: string;
    identifier: string;
}

export interface VVPScope {
    name: string;
    type: string;
    signals: VVPSignal[];
    children: VVPScope[];
}

export interface VVPModule {
    name: string;
    ports: Array<{
        direction: 'INPUT' | 'OUTPUT' | 'INOUT';
        width: number;
        name: string;
    }>;
    parameters: Array<{
        name: string;
        value: string;
    }>;
}

export class VVPParser {
    private content: string;
    private lines: string[];
    
    constructor(content: string) {
        this.content = content;
        this.lines = content.split('\n');
    }

    public parse(): { scopes: VVPScope[], modules: VVPModule[] } {
        const scopes: VVPScope[] = [];
        const modules: VVPModule[] = [];
        
        let currentScope: VVPScope | null = null;
        let currentModule: VVPModule | null = null;
        
        for (const line of this.lines) {
            const trimmed = line.trim();
            
            // 解析作用域
            if (trimmed.startsWith('S_')) {
                const scopeMatch = trimmed.match(/S_\w+\s+\.scope\s+(\w+),\s+"([^"]+)"\s+"([^"]+)"/);
                if (scopeMatch) {
                    currentScope = {
                        name: scopeMatch[2],
                        type: scopeMatch[1],
                        signals: [],
                        children: []
                    };
                    scopes.push(currentScope);
                    
                    // 如果是模块类型的作用域，创建对应的模块
                    if (scopeMatch[1] === 'module') {
                        currentModule = {
                            name: scopeMatch[2],
                            ports: [],
                            parameters: []
                        };
                        modules.push(currentModule);
                    }
                }
            }
            
            // 解析信号
            else if (trimmed.startsWith('v') && trimmed.includes('.var')) {
                const varMatch = trimmed.match(/v\w+_\d+\s+\.var\s+"([^"]+)",\s+(\d+)\s+(\d+)/);
                if (varMatch && currentScope) {
                    currentScope.signals.push({
                        name: varMatch[1],
                        width: parseInt(varMatch[2]) + 1,
                        type: 'var',
                        scope: currentScope.name,
                        identifier: trimmed.split(' ')[0]
                    });
                }
            }
            
            else if (trimmed.startsWith('v') && trimmed.includes('.net')) {
                const netMatch = trimmed.match(/v\w+_\d+\s+\.net\s+"([^"]+)",\s+(\d+)\s+(\d+)/);
                if (netMatch && currentScope) {
                    currentScope.signals.push({
                        name: netMatch[1],
                        width: parseInt(netMatch[2]) + 1,
                        type: 'net',
                        scope: currentScope.name,
                        identifier: trimmed.split(' ')[0]
                    });
                }
            }
            
            // 解析端口信息
            else if (trimmed.includes('.port_info') && currentModule) {
                const portMatch = trimmed.match(/\.port_info\s+\d+\s+\/(\w+)\s+(\d+)\s+"([^"]+)"/);
                if (portMatch) {
                    currentModule.ports.push({
                        direction: portMatch[1] as 'INPUT' | 'OUTPUT' | 'INOUT',
                        width: parseInt(portMatch[2]),
                        name: portMatch[3]
                    });
                }
            }
            
            // 解析参数
            else if (trimmed.includes('.param/l') && currentModule) {
                const paramMatch = trimmed.match(/P_\w+\s+\.param\/l\s+"([^"]+)"\s+.*,\s+C4<([^>]+)>/);
                if (paramMatch) {
                    currentModule.parameters.push({
                        name: paramMatch[1],
                        value: paramMatch[2]
                    });
                }
            }
        }
        
        return { scopes, modules };
    }
    
    public extractSignalHierarchy(): VVPScope[] {
        const { scopes } = this.parse();
        return this.buildHierarchy(scopes);
    }
    
    private buildHierarchy(scopes: VVPScope[]): VVPScope[] {
        // 简化版本，假设平面结构
        return scopes;
    }
}

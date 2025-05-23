export interface Config {
    iverilogPath: string;
    gtkwavePath: string;
    outputDirectory: string;
}

export const defaultConfig: Config = {
    iverilogPath: '/usr/bin/iverilog', // 默认 iverilog 路径
    gtkwavePath: '/usr/bin/gtkwave',   // 默认 gtkwave 路径
    outputDirectory: ''                // 默认输出目录（空表示使用源文件目录）
};
interface StringResources {
    [key: string]: string;
}

export interface Locales {
    [locale: string]: StringResources;
}

export const locales: Locales = {
    'en': {
        // 通用
        'no_active_editor': 'No active editor found',
        'not_verilog_file': 'Current file is not a Verilog file',
        
        // 编译相关
        'compiling_module': 'Compiling Verilog module...',
        'compilation_succeeded': 'Compilation succeeded: {0}',
        'compilation_failed': 'Compilation failed: {0}',
        'compilation_started_terminal': 'Compilation started in terminal',
        
        // 模拟相关
        'generating_wave': 'Generating wave file...',
        'compiled_not_found': 'Compiled file not found: {0}. Please compile first.',
        'no_vcd_found': 'No .vcd file found after simulation. Make sure your testbench generates a VCD file.',
        'simulation_opened': 'Simulation opened in GTKWave: {0}',
        'simulation_failed': 'Simulation failed: {0}',
        
        // Iverilog 相关
        'error_finding_files': 'Error finding Verilog files: {0}',
        'error_iverilog': 'Error during Iverilog compilation: {0}',
        
        // GTKWave 相关
        'error_gtkwave': 'Error opening GTKWave: {0}',
        'check_vcd_generated': 'Please check if VCD file is generated, then click OK to open GTKWave'
    },
    'zh-cn': {
        // 通用
        'no_active_editor': '找不到活动的编辑器',
        'not_verilog_file': '当前文件不是 Verilog 文件',
        
        // 编译相关
        'compiling_module': '正在编译 Verilog 模块...',
        'compilation_succeeded': '编译成功: {0}',
        'compilation_failed': '编译失败: {0}',
        'compilation_started_terminal': '已在终端中开始编译',
        
        // 模拟相关
        'generating_wave': '正在生成波形文件...',
        'compiled_not_found': '找不到编译后的文件: {0}。请先编译。',
        'no_vcd_found': '模拟后未找到 .vcd 文件。请确保您的测试台生成了 VCD 文件。',
        'simulation_opened': '已在 GTKWave 中打开模拟: {0}',
        'simulation_failed': '模拟失败: {0}',
        
        // Iverilog 相关
        'error_finding_files': '查找 Verilog 文件时出错: {0}',
        'error_iverilog': 'Iverilog 编译过程中出错: {0}',
        
        // GTKWave 相关
        'error_gtkwave': '打开 GTKWave 时出错: {0}',
        'check_vcd_generated': '请检查 VCD 文件是否已生成，然后点击确定打开 GTKWave'
    }
};

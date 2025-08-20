import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { openGtkwave } from '../utils/gtkwave';
import { localize } from '../i18n/i18n';

export async function simulateModule(): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showErrorMessage(localize('no_active_editor'));
        return;
    }
    
    const filePath = editor.document.uri.fsPath;
    
    // 获取配置的输出目录
    const config = vscode.workspace.getConfiguration();
    const outputDirectory = config.get('iverilog.outputDirectory', '');
    
    // 确定 wave 文件路径
    let waveFile: string;
    let waveDirectory: string;
    
    if (outputDirectory) {
        // 支持相对路径：如果是相对路径，则相对于工作区根目录或源文件目录解析
        let resolvedOutputDir: string;
        if (path.isAbsolute(outputDirectory)) {
            resolvedOutputDir = outputDirectory;
        } else {
            // 相对路径：优先相对于工作区根目录，如果没有工作区则相对于源文件目录
            const workspaceFolder = vscode.workspace.getWorkspaceFolder(editor.document.uri);
            const baseDir = workspaceFolder ? workspaceFolder.uri.fsPath : path.dirname(filePath);
            resolvedOutputDir = path.resolve(baseDir, outputDirectory);
        }
        
        waveDirectory = resolvedOutputDir;
        waveFile = path.join(resolvedOutputDir, 'wave');
    } else {
        waveDirectory = path.dirname(filePath);
        waveFile = path.join(waveDirectory, 'wave');
    }
    
    // 检查编译后的文件是否存在
    if (!fs.existsSync(waveFile)) {
        vscode.window.showErrorMessage(localize('compiled_not_found', 'wave'));
        return;
    }
    
    try {
        // 始终使用集成终端执行 vvp 命令
        const terminal = vscode.window.createTerminal('VVP Simulation');
        terminal.show();
        
        // 显示命令信息
        terminal.sendText(`echo "Simulating Verilog design..."`);
        terminal.sendText(`echo "Working directory: ${waveDirectory}"`);
        terminal.sendText(`echo "Executable: wave"`);
        terminal.sendText(`cd "${waveDirectory}"`);
        terminal.sendText(`vvp -n "${waveFile}" -lxt2`);
        
        // 自动等待一段时间后提示用户
        setTimeout(async () => {
            const result = await vscode.window.showInformationMessage(
                localize('check_vcd_generated', 'Simulation command has been executed. Check the terminal output and click OK to open GTKWave if VCD file is generated.'),
                'OK', 'Cancel'
            );
            
            if (result === 'OK') {
                await openVcdFile(waveDirectory);
            }
        }, simulationWaitTimeMs); // 等待指定时间
    } catch (error: any) {
        vscode.window.showErrorMessage(localize('simulation_failed', error.message));
    }
}

async function openVcdFile(waveDirectory: string): Promise<void> {
    // vcd 文件在 testbench 中指定，但默认查找 wave.vcd
    const vcdFile = path.join(waveDirectory, 'wave.vcd');
    
    // 检查 vcd 文件是否存在
    if (!fs.existsSync(vcdFile)) {
        // 如果默认的 wave.vcd 不存在，尝试寻找目录中其他的 .vcd 文件
        const files = fs.readdirSync(waveDirectory);
        const vcdFiles = files.filter(file => file.endsWith('.vcd'));
        
        if (vcdFiles.length === 0) {
            throw new Error(localize('no_vcd_found'));
        }
        
        // 使用找到的第一个 .vcd 文件
        const foundVcdFile = path.join(waveDirectory, vcdFiles[0]);
        
        // 打开 GTKWave
        await openGtkwave(foundVcdFile);
        vscode.window.showInformationMessage(localize('simulation_opened', vcdFiles[0]));
    } else {
        // 打开 GTKWave
        await openGtkwave(vcdFile);
        vscode.window.showInformationMessage(localize('simulation_opened', 'wave.vcd'));
    }
}
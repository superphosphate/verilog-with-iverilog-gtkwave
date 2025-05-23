import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { runIverilog } from '../utils/iverilog';
import { localize } from '../i18n/i18n';

export async function compileModule(): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showErrorMessage(localize('no_active_editor'));
        return;
    }
    
    const filePath = editor.document.uri.fsPath;
    if (!filePath.endsWith('.v') && !filePath.endsWith('.vh')) {
        vscode.window.showErrorMessage(localize('not_verilog_file'));
        return;
    }
    
    try {
        // 保存文件
        await editor.document.save();
        
        // 获取配置的输出目录和终端使用设置
        const config = vscode.workspace.getConfiguration();
        const outputDirectory = config.get('iverilog.outputDirectory', '');
        config.get('iverilog.useTerminal', false);
        // 确定输出文件路径 - 使用固定名称 "wave"
        let outputDirectory_final: string;
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
            
            // 如果目录不存在则创建
            if (!fs.existsSync(resolvedOutputDir)) {
                fs.mkdirSync(resolvedOutputDir, { recursive: true });
            }
            outputDirectory_final = resolvedOutputDir;
        } else {
            // 否则使用源文件目录
            outputDirectory_final = path.dirname(filePath);
        }
        
        const outputFile = path.join(outputDirectory_final, 'wave');
        
        // 使用后台编译
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: localize('compiling_module'),
            cancellable: false
        }, async () => {
            // 编译目录下所有 Verilog 文件
            await runIverilog(filePath, outputFile, true, false);
        });
        vscode.window.showInformationMessage(localize('compilation_succeeded', 'wave'));
    } catch (error: any) {
        vscode.window.showErrorMessage(localize('compilation_failed', error.message));
    }
}
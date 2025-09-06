import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { runIverilog } from '../utils/iverilog';
import { localize } from '../i18n/i18n';
import { VerilogTreeDataProvider } from '../verilogTreeView';

export async function compileModule(treeProvider?: VerilogTreeDataProvider): Promise<void> {
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
        const useTerminal = config.get('iverilog.useTerminal', true);
        const useTreeView = config.get('iverilog.useTreeView', true);
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
        
        // 获取要编译的文件列表
        let sourceFiles: string[] = [filePath];
        let useCustomFiles = false;
        
        if (treeProvider && useTreeView) {
            // 如果提供了树形视图提供者且启用了树形视图，使用其中启用的文件
            const enabledFiles = treeProvider.getEnabledFiles();
            if (enabledFiles.length > 0) {
                sourceFiles = enabledFiles;
                // 确保当前文件在列表中
                if (!sourceFiles.includes(filePath)) {
                    sourceFiles.push(filePath);
                }
                useCustomFiles = true;
                vscode.window.showInformationMessage(
                    localize('compilation_with_selected', sourceFiles.length.toString())
                );
            }
        }
        
        // 使用自定义文件列表进行编译或回退到目录模式
        if (useCustomFiles) {
            await runIverilog(filePath, outputFile, false, true, sourceFiles);
        } else {
            await runIverilog(filePath, outputFile, true, true);
        }
        vscode.window.showInformationMessage(localize('compilation_succeeded', 'wave'));
    } catch (error: any) {
        vscode.window.showErrorMessage(localize('compilation_failed', error.message));
    }
}
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
        // save the current document
        await editor.document.save();
        
        // get configuration settings
        const config = vscode.workspace.getConfiguration();
        const outputDirectory = config.get('iverilog.outputDirectory', '');
        const useTerminal = config.get('iverilog.useTerminal', true);
        const useTreeView = config.get('iverilog.useTreeView', true);
        // get the output directory
        let outputDirectory_final: string;
        if (outputDirectory) {
            // support absolute and relative paths
            let resolvedOutputDir: string;
            if (path.isAbsolute(outputDirectory)) {
                resolvedOutputDir = outputDirectory;
            } else {
                const workspaceFolder = vscode.workspace.getWorkspaceFolder(editor.document.uri);
                const baseDir = workspaceFolder ? workspaceFolder.uri.fsPath : path.dirname(filePath);
                resolvedOutputDir = path.resolve(baseDir, outputDirectory);
            }
            
            if (!fs.existsSync(resolvedOutputDir)) {
                fs.mkdirSync(resolvedOutputDir, { recursive: true });
            }
            outputDirectory_final = resolvedOutputDir;
        } else {

            outputDirectory_final = path.dirname(filePath);
        }
        
        const outputFile = path.join(outputDirectory_final, 'wave');
        
        // get the list of source files to compile
        let sourceFiles: string[] = [filePath];
        let useCustomFiles = false;
        
        if (treeProvider && useTreeView) {
            const enabledFiles = treeProvider.getEnabledFiles();
            if (enabledFiles.length > 0) {
                sourceFiles = enabledFiles;
                if (!sourceFiles.includes(filePath)) {
                    sourceFiles.push(filePath);
                }
                useCustomFiles = true;
                vscode.window.showInformationMessage(
                    localize('compilation_with_selected', sourceFiles.length.toString())
                );
            }
        }
        
        // Use the custom file list for compilation or fall back to directory mode
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
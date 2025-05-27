import * as vscode from 'vscode';
import { compileModule } from './commands/compile';
import { simulateModule } from './commands/simulate';
import { I18n } from './i18n/i18n';
import { VCDEditorProvider } from './vcd/provider';
import { VCDPreviewProvider } from './vcdPreview';

export function activate(context: vscode.ExtensionContext) {
    // 初始化国际化设置
    I18n.getInstance();

    // 监听设置变化，更新语言
    context.subscriptions.push(
        vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('iverilog.language')) {
                I18n.getInstance().updateLocale();
            }
        })
    );

    // 注册编译和模拟命令
    let compileCommand = vscode.commands.registerCommand('vscode-iverilog-gtkwave.compile', compileModule);
    let simulateCommand = vscode.commands.registerCommand('vscode-iverilog-gtkwave.simulate', simulateModule);

    // 注册VCD查看器
    const vcdProvider = VCDEditorProvider.register(context);

    context.subscriptions.push(compileCommand);
    context.subscriptions.push(simulateCommand);
    context.subscriptions.push(vcdProvider);

    // 注册VCD/VVP文件预览命令
    const previewCommand = vscode.commands.registerCommand('vcd.preview', () => {
        const activeEditor = vscode.window.activeTextEditor;
        if (activeEditor) {
            VCDPreviewProvider.createOrShow(context.extensionPath, activeEditor.document);
        } else {
            vscode.window.showInformationMessage('请先打开一个VCD或VVP文件');
        }
    });
    
    // 注册文件关联的右键菜单
    const contextCommand = vscode.commands.registerCommand('vcd.previewFile', (uri: vscode.Uri) => {
        vscode.workspace.openTextDocument(uri).then(document => {
            VCDPreviewProvider.createOrShow(context.extensionPath, document);
        });
    });
    
    context.subscriptions.push(previewCommand, contextCommand);
    
    // 注册Hello World命令
    const helloWorldCommand = vscode.commands.registerCommand('verilog-with-iverilog-gtkwave.helloWorld', () => {
        vscode.window.showInformationMessage('Hello World from verilog-with-iverilog-gtkwave!');
    });
    
    context.subscriptions.push(helloWorldCommand);

    // 注册扩展激活逻辑
    console.log('Extension "vscode-iverilog-gtkwave" is now active.');
}

export function deactivate() {}
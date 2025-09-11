import * as vscode from 'vscode';
import { compileModule } from './commands/compile';
import { simulateModule } from './commands/simulate';
import { I18n } from './i18n/i18n';
import { VCDEditorProvider } from './vcd/provider';
import { VCDPreviewProvider } from './vcdPreview';
import { VerilogTreeDataProvider, VerilogFileItem } from './verilogTreeView';

export function activate(context: vscode.ExtensionContext) {

    I18n.getInstance();

    context.subscriptions.push(
        vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('iverilog.language')) {
                I18n.getInstance().updateLocale();
            }
        })
    );

    // create the tree view provider
    const verilogTreeProvider = new VerilogTreeDataProvider(context);
    const treeView = vscode.window.createTreeView('verilogTreeView', {
        treeDataProvider: verilogTreeProvider,
        showCollapseAll: false
    });
    context.subscriptions.push(treeView);

    // register compile and simulate commands
    let compileCommand = vscode.commands.registerCommand('vscode-iverilog-gtkwave.compile', 
        () => compileModule(verilogTreeProvider));
    let simulateCommand = vscode.commands.registerCommand('vscode-iverilog-gtkwave.simulate', simulateModule);

    // register tree view commands
    const refreshCommand = vscode.commands.registerCommand('verilogTreeView.refresh', 
        () => verilogTreeProvider.refresh());
    
    const toggleFileCommand = vscode.commands.registerCommand('verilogTreeView.toggleFile', 
        (item: VerilogFileItem) => verilogTreeProvider.toggleFileEnabled(item.filePath));
    
    const enableAllCommand = vscode.commands.registerCommand('verilogTreeView.enableAll',
        () => verilogTreeProvider.enableAllFiles());
    
    const disableAllCommand = vscode.commands.registerCommand('verilogTreeView.disableAll',
        () => verilogTreeProvider.disableAllFiles());

    // register VCD editor provider
    const vcdProvider = VCDEditorProvider.register(context);

    context.subscriptions.push(compileCommand);
    context.subscriptions.push(simulateCommand);
    context.subscriptions.push(refreshCommand);
    context.subscriptions.push(toggleFileCommand);
    context.subscriptions.push(enableAllCommand);
    context.subscriptions.push(disableAllCommand);
    context.subscriptions.push(vcdProvider);

    // register VCD preview command
    const previewCommand = vscode.commands.registerCommand('vcd.preview', () => {
        const activeEditor = vscode.window.activeTextEditor;
        if (activeEditor) {
            VCDPreviewProvider.createOrShow(context.extensionPath, activeEditor.document);
        } else {
            vscode.window.showInformationMessage('请先打开一个VCD或VVP文件');
        }
    });
    
    // register context menu command for VCD files
    const contextCommand = vscode.commands.registerCommand('vcd.previewFile', (uri: vscode.Uri) => {
        vscode.workspace.openTextDocument(uri).then(document => {
            VCDPreviewProvider.createOrShow(context.extensionPath, document);
        });
    });
    
    context.subscriptions.push(previewCommand, contextCommand);

    // register extension activation logic
    console.log('Extension "vscode-iverilog-gtkwave" is now active.');
}

export function deactivate() {}
import * as vscode from 'vscode';
import { compileModule } from './commands/compile';
import { simulateModule } from './commands/simulate';
import { I18n } from './i18n/i18n';

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
    
    // 注意：VS Code 目前没有提供语言变化的事件
    // 如果用户更改了 VS Code 的语言，需要重启扩展或 VS Code

    let compileCommand = vscode.commands.registerCommand('vscode-iverilog-gtkwave.compile', compileModule);
    let simulateCommand = vscode.commands.registerCommand('vscode-iverilog-gtkwave.simulate', simulateModule);

    context.subscriptions.push(compileCommand);
    context.subscriptions.push(simulateCommand);

    // 注册扩展激活逻辑
    console.log('Extension "vscode-iverilog-gtkwave" is now active.');
}

export function deactivate() {}
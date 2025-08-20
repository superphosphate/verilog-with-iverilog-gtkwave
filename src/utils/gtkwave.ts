import * as vscode from 'vscode';
import { localize } from '../i18n/i18n';

export function openGtkwave(outputFilePath: string): Promise<void> {
    return new Promise((resolve, reject) => {
        try {
            const config = vscode.workspace.getConfiguration();
            const gtkwavePath = config.get('gtkwave.path', 'gtkwave');
            
            // 使用集成终端启动 GTKWave
            const terminal = vscode.window.createTerminal('GTKWave');
            terminal.show();
            terminal.sendText(`${gtkwavePath} "${outputFilePath}"`);
            
            resolve();
        } catch (error: any) {
            reject(localize('error_gtkwave', error.message));
        }
    });
}
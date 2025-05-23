import { exec } from 'child_process';
import * as vscode from 'vscode';
import { localize } from '../i18n/i18n';

export function openGtkwave(outputFilePath: string): Promise<void> {
    return new Promise((resolve, reject) => {
        const config = vscode.workspace.getConfiguration();
        const gtkwavePath = config.get('gtkwave.path', 'gtkwave');
        const command = `${gtkwavePath} ${outputFilePath}`;

        exec(command, (error: Error | null) => {
            if (error) {
                reject(localize('error_gtkwave', error.message));
                return;
            }
            resolve();
        });
    });
}
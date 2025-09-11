import { exec } from 'child_process';
import { promisify } from 'util';
import * as vscode from 'vscode';
import * as path from 'path';
import glob from 'glob';
import { localize } from '../i18n/i18n';

const execPromise = promisify(exec);

/**
 * getAllVerilogFiles
 * 
 * search for all .v and .vh files in the given directory and its subdirectories
 * 
 * @param directory The directory to search in
 * @returns A promise that resolves to an array of file paths
 */
async function getAllVerilogFiles(directory: string): Promise<string[]> {
    try {
        const pattern = path.join(directory, '**', '*.{v,vh}');
        return new Promise<string[]>((resolve, reject) => {
            glob(pattern, { nodir: true }, (err: Error | null, matches: string[]) => {
                if (err) {
                    reject(err);
                } else {
                    // filter out duplicates and normalize paths
                    const normalizedPaths = matches.map(filePath => path.normalize(filePath));
                    const uniquePaths = [...new Set(normalizedPaths)];
                    resolve(uniquePaths);
                }
            });
        });
    } catch (error) {
        console.error(localize('error_finding_files', `${error}`));
        return [];
    }
}

export async function runIverilog(
    mainFile: string, 
    outputFile: string, 
    compileAllInDirectory: boolean = true, 
    useTerminal: boolean = true,
    customSourceFiles?: string[]
): Promise<string> {
    const config = vscode.workspace.getConfiguration();
    const iverilogPath = config.get('iverilog.path', 'iverilog');
    
    let sourceFiles: string[] = [path.normalize(mainFile)];
    
    if (customSourceFiles && customSourceFiles.length > 0) {
        const normalizedMainFile = path.normalize(mainFile);
        sourceFiles = customSourceFiles.map(file => path.normalize(file));
        // make sure main file is last
        sourceFiles = sourceFiles.filter(file => file !== normalizedMainFile);
        sourceFiles.push(normalizedMainFile);
    }
    else if (compileAllInDirectory) {
        const directory = path.dirname(mainFile);
        const allFiles = await getAllVerilogFiles(directory);
        
        const normalizedMainFile = path.normalize(mainFile);
        sourceFiles = allFiles.filter(file => path.normalize(file) !== normalizedMainFile);
        sourceFiles.push(normalizedMainFile);
        
        // 去重处理 - 使用 Set 的特性一次性完成
        sourceFiles = [...new Set(sourceFiles)];
    }
    
    // 对文件路径加引号以处理包含空格的路径
    const quotedSourceFiles = sourceFiles.map(file => `"${file}"`);
    const command = `${iverilogPath} -o "${outputFile}" ${quotedSourceFiles.join(' ')}`;
    
    if (useTerminal) {

        // 使用集成终端执行命令，并在创建时显示高亮的编译信息
        const coloredMessage = `\x1b[36m=== Verilog Compilation Started ===\x1b[0m\r\n` +
                              `\x1b[32m Sources: ${sourceFiles.length} files\x1b[0m\r\n` +
                              `\x1b[33m Output: ${outputFile}\x1b[0m\r\n` +
                              `\x1b[35m Command: \x1b[0m${command}\r\n` +
                              `\x1b[36m=====================================\x1b[0m\r\n`;
        
        const terminal = vscode.window.createTerminal({
            name: 'Iverilog Compilation',
            message: coloredMessage
        });
        terminal.show();
        
        // 执行编译命令
        terminal.sendText(command);
        
        // 返回成功消息，不等待终端关闭
        return Promise.resolve('Compilation started in terminal');
    } else {
        // 原有的后台执行方式
        try {
            const { stdout, stderr } = await execPromise(command);
            if (stderr) {
                throw new Error(stderr);
            }
            return stdout;
        } catch (error: any) {
            throw new Error(localize('error_iverilog', error.message));
        }
    }
}
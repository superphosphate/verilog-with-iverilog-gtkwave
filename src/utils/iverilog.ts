import { exec } from 'child_process';
import { promisify } from 'util';
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import glob from 'glob';
import { localize } from '../i18n/i18n';

const execPromise = promisify(exec);

/**
 * 获取目录下所有 Verilog 文件
 */
async function getAllVerilogFiles(directory: string): Promise<string[]> {
    try {
        const pattern = path.join(directory, '**', '*.{v,vh}');
        return new Promise<string[]>((resolve, reject) => {
            glob(pattern, { nodir: true }, (err: Error | null, matches: string[]) => {
                if (err) {
                    reject(err);
                } else {
                    // 标准化所有路径（解决正斜杠/反斜杠问题）
                    const normalizedPaths = matches.map(filePath => path.normalize(filePath));
                    // 去除重复路径
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

export async function runIverilog(mainFile: string, outputFile: string, compileAllInDirectory: boolean = true, useTerminal: boolean = false): Promise<string> {
    const config = vscode.workspace.getConfiguration();
    const iverilogPath = config.get('iverilog.path', 'iverilog');
    
    let sourceFiles: string[] = [path.normalize(mainFile)];
    
    // 如果启用了编译目录下所有文件
    if (compileAllInDirectory) {
        const directory = path.dirname(mainFile);
        const allFiles = await getAllVerilogFiles(directory);
        
        // 确保主文件在最后编译（避免某些依赖问题）
        // 使用规范化路径比较
        const normalizedMainFile = path.normalize(mainFile);
        sourceFiles = allFiles.filter(file => path.normalize(file) !== normalizedMainFile);
        sourceFiles.push(normalizedMainFile);
        
        // 检查是否有重复文件（调试用）
        const fileSet = new Set<string>();
        const duplicates: string[] = [];
        
        for (const file of sourceFiles) {
            if (fileSet.has(file)) {
                duplicates.push(file);
            } else {
                fileSet.add(file);
            }
        }
        
        if (duplicates.length > 0) {
            console.warn('Duplicate files detected:', duplicates);
        }
        
        // 确保源文件列表中没有重复项
        sourceFiles = [...fileSet];
    }
    
    const command = `${iverilogPath} -o ${outputFile} ${sourceFiles.join(' ')}`;
    
    if (useTerminal) {
        // 使用集成终端执行命令
        return new Promise<string>((resolve, reject) => {
            const terminal = vscode.window.createTerminal('Iverilog Compilation');
            terminal.show();
            terminal.sendText(command);
            
            // 监听终端关闭事件来判断命令执行结果
            const disposable = vscode.window.onDidCloseTerminal((closedTerminal) => {
                if (closedTerminal === terminal) {
                    disposable.dispose();
                    // 检查输出文件是否成功生成
                    if (fs.existsSync(outputFile)) {
                        resolve('Compilation completed in terminal');
                    } else {
                        reject(new Error('Compilation failed - output file not found'));
                    }
                }
            });
        });
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
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { localize } from './i18n/i18n';

export interface VerilogFileItem {
    filePath: string;
    isEnabled: boolean;
    isTestbench: boolean;
}

export class VerilogTreeItem extends vscode.TreeItem {
    constructor(
        public readonly fileItem: VerilogFileItem,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState
    ) {
        super(path.basename(fileItem.filePath), collapsibleState);
        
        this.tooltip = this.generateTooltip(fileItem);
        this.description = fileItem.isTestbench ? '(testbench)' : '';
        this.resourceUri = vscode.Uri.file(fileItem.filePath);
        
        // set icon and context value based on enabled state
        if (fileItem.isEnabled) {
            this.iconPath = new vscode.ThemeIcon('check', new vscode.ThemeColor('testing.iconPassed'));
            this.contextValue = 'verilogFile.enabled';
        } else {
            this.iconPath = new vscode.ThemeIcon('x', new vscode.ThemeColor('testing.iconFailed'));
            this.contextValue = 'verilogFile.disabled';
        }
        
        // add suffix for testbench files
        if (fileItem.isTestbench) {
            this.contextValue += '.testbench';
        }
        
        this.command = {
            command: 'vscode.open',
            title: 'Open',
            arguments: [this.resourceUri]
        };
    }
    
    private generateTooltip(fileItem: VerilogFileItem): string {
        const status = fileItem.isEnabled ? localize('enable_file') : localize('disable_file');
        const type = fileItem.isTestbench ? ' (Testbench)' : '';
        return `${fileItem.filePath}\n${status}${type}`;
    }
}

export class VerilogTreeDataProvider implements vscode.TreeDataProvider<VerilogFileItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<VerilogFileItem | undefined | null | void> = new vscode.EventEmitter<VerilogFileItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<VerilogFileItem | undefined | null | void> = this._onDidChangeTreeData.event;

    private verilogFiles: VerilogFileItem[] = [];
    private fileStates: Map<string, boolean> = new Map();

    constructor(private context: vscode.ExtensionContext) {
        this.loadFileStates();
        this.refresh();
        
        // listen for file changes to refresh the tree view
        const watcher = vscode.workspace.createFileSystemWatcher('**/*.{v,vh}');
        watcher.onDidCreate(() => this.refresh());
        watcher.onDidDelete(() => this.refresh());
        context.subscriptions.push(watcher);
    }

    refresh(): void {
        this.scanVerilogFiles();
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: VerilogFileItem): vscode.TreeItem {
        return new VerilogTreeItem(element, vscode.TreeItemCollapsibleState.None);
    }

    getChildren(element?: VerilogFileItem): Thenable<VerilogFileItem[]> {
        if (!element) {
            return Promise.resolve(this.verilogFiles);
        }
        return Promise.resolve([]);
    }

    private async scanVerilogFiles(): Promise<void> {
        this.verilogFiles = [];
        
        if (!vscode.workspace.workspaceFolders) {
            return;
        }

        for (const workspaceFolder of vscode.workspace.workspaceFolders) {
            const files = await vscode.workspace.findFiles(
                new vscode.RelativePattern(workspaceFolder, '**/*.{v,vh}'),
                null,
                100 // limit to 100 files
            );

            for (const file of files) {
                const filePath = file.fsPath;
                const isEnabled = this.fileStates.get(filePath) ?? true; // 默认启用
                const isTestbench = await this.isTestbenchFile(filePath);
                
                this.verilogFiles.push({
                    filePath,
                    isEnabled,
                    isTestbench
                });
            }
        }

        // sort files alphabetically
        this.verilogFiles.sort((a, b) => {
            const nameA = path.basename(a.filePath);
            const nameB = path.basename(b.filePath);
            return nameA.localeCompare(nameB);
        });
    }

    private async isTestbenchFile(filePath: string): Promise<boolean> {
        try {
            const content = await fs.promises.readFile(filePath, 'utf8');
            // simple heuristics to identify testbench files
            const testbenchKeywords = [
                'initial',
                '$finish',
                '$stop',
                '$dumpfile',
                '$dumpvars',
                'testbench',
                '_tb',
                '_test'
            ];
            
            const lowerContent = content.toLowerCase();
            const fileName = path.basename(filePath).toLowerCase();
            
            if (fileName.includes('_tb') || fileName.includes('_test') || fileName.includes('testbench')) {
                return true;
            }
            
            return testbenchKeywords.some(keyword => lowerContent.includes(keyword));
        } catch (error) {
            return false;
        }
    }

    public toggleFileEnabled(filePath: string): void {
        const currentState = this.fileStates.get(filePath) ?? true;
        this.fileStates.set(filePath, !currentState);
        this.saveFileStates();
        
        // update the item in verilogFiles array
        const fileItem = this.verilogFiles.find(item => item.filePath === filePath);
        if (fileItem) {
            fileItem.isEnabled = !currentState;
        }
        
        // show info message
        const fileName = path.basename(filePath);
        if (!currentState) {
            vscode.window.showInformationMessage(localize('file_enabled') + `: ${fileName}`);
        } else {
            vscode.window.showInformationMessage(localize('file_disabled') + `: ${fileName}`);
        }
        
        this._onDidChangeTreeData.fire();
    }

    public enableAllFiles(): void {
        for (const file of this.verilogFiles) {
            this.fileStates.set(file.filePath, true);
            file.isEnabled = true;
        }
        this.saveFileStates();
        this._onDidChangeTreeData.fire();
    }

    public disableAllFiles(): void {
        for (const file of this.verilogFiles) {
            this.fileStates.set(file.filePath, false);
            file.isEnabled = false;
        }
        this.saveFileStates();
        this._onDidChangeTreeData.fire();
    }

    public getEnabledFiles(): string[] {
        return this.verilogFiles
            .filter(file => file.isEnabled)
            .map(file => file.filePath);
    }

    private loadFileStates(): void {
        const saved = this.context.globalState.get<Record<string, boolean>>('verilogFileStates', {});
        this.fileStates = new Map(Object.entries(saved));
    }

    private saveFileStates(): void {
        const statesObj = Object.fromEntries(this.fileStates);
        this.context.globalState.update('verilogFileStates', statesObj);
    }
}

import * as vscode from 'vscode';
import {locales} from './locales';

export class I18n {
    private static _instance: I18n;
    private _locale: string = 'en';

    private constructor() {
        this.updateLocale();
    }

    public static getInstance(): I18n {
        if (!I18n._instance) {
            I18n._instance = new I18n();
        }
        return I18n._instance;
    }

    public updateLocale(): void {
        const config = vscode.workspace.getConfiguration();
        let configLocale = config.get('iverilog.language', 'auto');
        
        // 如果设置为 auto，则跟随 VS Code 语言设置
        if (configLocale === 'auto') {
            // 获取 VS Code 的语言设置
            // 匹配支持的语言
            if (vscode.env.language.startsWith('zh-')) {
                configLocale = 'zh-cn';
            } else {
                configLocale = 'en';
            }
        }
        
        this._locale = configLocale;
        
        // 如果设置的语言不存在，回退到英文
        if (!locales[this._locale]) {
            this._locale = 'en';
        }
    }

    public get locale(): string {
        return this._locale;
    }

    public localize(key: string, ...args: string[]): string {
        let message = locales[this._locale][key] || locales['en'][key] || key;
        
        // 替换参数
        if (args && args.length > 0) {
            args.forEach((arg, index) => {
                message = message.replace(`{${index}}`, arg);
            });
        }
        
        return message;
    }
}

export function localize(key: string, ...args: string[]): string {
    return I18n.getInstance().localize(key, ...args);
}

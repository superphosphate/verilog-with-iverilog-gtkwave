# verilog-with-iverilog-gtkwave

## English

This project is a Visual Studio Code extension that allows users to easily compile Verilog modules using `iverilog` and visualize the simulation results with `gtkwave`. 

[查看中文说明](#中文)

### Features

[Change log](CHANGELOG)

- **One-click compilation**: Compile Verilog modules directly from the editor title bar
- **Directory-wide compilation**: Automatically compiles all Verilog files in the same directory
- **Customizable output directory**: Configure where compiled files are stored
- **Integrated simulation**: Launch `gtkwave` automatically to display simulation results
- **Flexible tool paths**: Configure custom paths for `iverilog` and `gtkwave`
- **Terminal integration**: Option to run commands in VS Code's integrated terminal
- **Multi-language support**: English and Simplified Chinese interface
- **Automatic file detection**: Supports both `.v` and `.vh` file extensions

### Requirements

- **Iverilog**: Verilog compiler and simulator
- **GTKWave**: Waveform viewer for VCD files
- **VS Code**: Version 1.50.0 or higher

### Installation

#### From Source

1. Clone the repository:
   ```bash
   git clone https://github.com/superphosphate/verilog-with-iverilog-gtkwave.git
   ```

2. Navigate to the project directory:
   ```bash
   cd vscode-iverilog-gtkwave
   ```

3. Install dependencies:
   ```bash
   npm install
   ```

4. Compile the extension:
   ```bash
   npm run compile
   ```

5. Open the project in Visual Studio Code:
   ```bash
   code .
   ```

6. Press `F5` to run the extension in a new Extension Development Host window

#### Package Installation

1. Build the extension package:
   ```bash
   npm run prepack
   ```

2. Install the generated `.vsix` file in VS Code

### Usage

#### Using Editor Title Bar Buttons

1. Open a Verilog file (`.v` or `.vh`) in VS Code
2. You'll see two buttons in the editor title bar:
   - **Compile button** (▶️): Compiles the current module and all Verilog files in the directory
   - **Simulate button** (🐛): Runs the simulation and opens GTKWave

#### Using Command Palette

1. Open a Verilog file in the editor
2. Press `Ctrl+Shift+P` (or `Cmd+Shift+P` on Mac) to open the command palette
3. Type and select:
   - `Compile Verilog Module` to compile the current module
   - `Simulate with GTKWave` to run simulation and view results

#### Workflow

1. **Write your Verilog code**: Create your modules and testbenches
2. **Compile**: Click the compile button or use the command palette
3. **Simulate**: Click the simulate button to run the testbench
4. **View waveforms**: GTKWave will open automatically with the generated VCD file

### Configuration

Configure the extension through VS Code settings (`File > Preferences > Settings`):

#### Tool Paths
- `iverilog.path`: Path to the Iverilog executable (default: `/usr/bin/iverilog`)
- `gtkwave.path`: Path to the GTKWave executable (default: `/usr/bin/gtkwave`)

#### Output Settings
- `iverilog.outputDirectory`: Directory for compiled files (leave empty to use source directory)
  - Supports absolute paths: `C:\verilog_output` or `/home/user/verilog_output`
  - Supports relative paths: `./output`, `../build`, `output/debug`
  - Relative paths are resolved relative to workspace root (if available) or source file directory

#### Interface Settings
- `iverilog.language`: Language setting (`auto`, `en`, `zh-cn`)
- `iverilog.useTerminal`: Use integrated terminal for commands (default: `true`)

#### Example Configuration
```json
{
  "iverilog.path": "C:\\iverilog\\bin\\iverilog.exe",
  "gtkwave.path": "C:\\gtkwave\\bin\\gtkwave.exe",
  "iverilog.outputDirectory": "./build/verilog",
  "iverilog.language": "en",
  "iverilog.useTerminal": true
}
```

### Troubleshooting

#### Common Issues

1. **"Command not found" errors**: Ensure `iverilog` and `gtkwave` are installed and in your PATH
2. **Compilation fails**: Check that all required Verilog files are in the same directory
3. **No VCD file generated**: Ensure your testbench includes VCD dump commands:
   ```verilog
   initial begin
       $dumpfile("wave.vcd");
       $dumpvars(0, testbench);
   end
   ```

#### Platform-Specific Notes

- **Windows**: Use full paths with `.exe` extensions
- **Linux/macOS**: Standard package manager installations should work out of the box

### Contributing

Contributions are welcome! Please feel free to:
- Submit pull requests for new features or bug fixes
- Open issues for bugs or feature requests
- Improve documentation
- Add support for additional Verilog tools

### License

This project is licensed under the LGPL v3.0 License. See the LICENSE file for more details.

---

## 中文

这是一个 Visual Studio Code 扩展项目，让用户能够轻松使用 `iverilog` 编译 Verilog 模块，并使用 `gtkwave` 可视化仿真结果。

[View README in English ](#english)

### 功能特性

[日志](CHANGELOG)

- **一键编译**：直接从编辑器标题栏编译 Verilog 模块
- **目录级编译**：自动编译同一目录下的所有 Verilog 文件
- **自定义输出目录**：配置编译文件的存储位置
- **集成仿真**：自动启动 `gtkwave` 显示仿真结果
- **灵活的工具路径**：为 `iverilog` 和 `gtkwave` 配置自定义路径
- **终端集成**：可选择在 VS Code 集成终端中运行命令
- **多语言支持**：支持英文和简体中文界面
- **自动文件检测**：支持 `.v` 和 `.vh` 文件扩展名

### 系统要求

- **Iverilog**：Verilog 编译器和仿真器
- **GTKWave**：VCD 文件的波形查看器
- **VS Code**：版本 1.50.0 或更高

### 安装方法

#### 从源码安装

1. 克隆仓库：
   ```bash
   git clone https://github.com/superphosphate/verilog-with-iverilog-gtkwave.git
   ```

2. 进入项目目录：
   ```bash
   cd vscode-with-iverilog-gtkwave
   ```

3. 安装依赖：
   ```bash
   npm install
   ```

4. 编译扩展：
   ```bash
   npm run compile
   ```

5. 在 Visual Studio Code 中打开项目：
   ```bash
   code .
   ```

6. 按 `F5` 在新的扩展开发宿主窗口中运行扩展

#### 打包安装

1. 构建扩展包：
   ```bash
   npm run prepack
   ```

2. 在 VS Code 中安装生成的 `.vsix` 文件

### 使用方法

#### 使用编辑器标题栏按钮

1. 在 VS Code 中打开 Verilog 文件（`.v` 或 `.vh`）
2. 在编辑器标题栏中会看到两个按钮：
   - **编译按钮**：编译当前模块和目录中的所有 Verilog 文件
   - **仿真按钮**：运行仿真并打开 GTKWave

#### 使用命令面板

1. 在编辑器中打开 Verilog 文件
2. 按 `Ctrl+Shift+P`（Mac 上为 `Cmd+Shift+P`）打开命令面板
3. 输入并选择：
   - `编译 Verilog 模块` 来编译当前模块
   - `使用 GTKWave 模拟` 来运行仿真并查看结果

#### 工作流程

1. **编写 Verilog 代码**：创建您的模块和测试台
2. **编译**：点击编译按钮或使用命令面板
3. **仿真**：点击仿真按钮运行测试台
4. **查看波形**：GTKWave 将自动打开生成的 VCD 文件

### 配置设置

通过 VS Code 设置配置扩展（`文件 > 首选项 > 设置`）：

#### 工具路径
- `iverilog.path`：Iverilog 可执行文件路径（默认：`/usr/bin/iverilog`）
- `gtkwave.path`：GTKWave 可执行文件路径（默认：`/usr/bin/gtkwave`）

#### 输出设置
- `iverilog.outputDirectory`：编译文件目录（留空则使用源文件目录）
  - 支持绝对路径：`C:\verilog_output` 或 `/home/user/verilog_output`
  - 支持相对路径：`./output`、`../build`、`output/debug`
  - 相对路径相对于工作区根目录（如果可用）或源文件目录解析

#### 界面设置
- `iverilog.language`：语言设置（`auto`、`en`、`zh-cn`）
- `iverilog.useTerminal`：使用集成终端执行命令（默认：`true`）

#### 配置示例
```json
{
  "iverilog.path": "C:\\iverilog\\bin\\iverilog.exe",
  "gtkwave.path": "C:\\gtkwave\\bin\\gtkwave.exe",
  "iverilog.outputDirectory": "./build/verilog",
  "iverilog.language": "zh-cn",
  "iverilog.useTerminal": true
}
```

### 故障排除

#### 常见问题

1. **"找不到命令"错误**：确保 `iverilog` 和 `gtkwave` 已安装并在 PATH 中
2. **编译失败**：检查所有必需的 Verilog 文件是否在同一目录中
3. **未生成 VCD 文件**：确保测试台包含 VCD 转储命令：
   ```verilog
   initial begin
       $dumpfile("wave.vcd");
       $dumpvars(0, testbench);
   end
   ```

#### 平台特定说明

- **Windows**：使用带 `.exe` 扩展名的完整路径
- **Linux/macOS**：标准包管理器安装应该可以直接使用

### 贡献

欢迎贡献！您可以：
- 为新功能或错误修复提交拉取请求
- 为错误或功能请求打开问题
- 改进文档
- 添加对其他 Verilog 工具的支持

### 许可证

本项目采用 LGPL v3.0 许可证。详细信息请参见 LICENSE 文件。
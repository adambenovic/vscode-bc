// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require('vscode');
const WebSocket = require('ws');
const path = require('path');
var ws;
var multiple = false;

const capitalize = (s) => {
    if (typeof s !== 'string') return ''
    return s.charAt(0).toUpperCase() + s.slice(1)
}

const onDidChangeActiveTextEditor = (editor) => {
    var type = "highlight";
    if(multiple) type = "multipleHighlight"

    ws.send(JSON.stringify({
        action: "xdeAction",
        args: {
            path: editor._documentData._uri.fsPath,
            type: type,
            line: editor.selections[0].start.line
        }
    }))
}

const onDidChangeTextEditorSelection = (editor) => {
    var type = "highlight";
    if(multiple) type = "multipleHighlight"

    ws.send(JSON.stringify({
        action: "xdeAction",
        args: {
            path: editor.textEditor._documentData._uri.fsPath,
            type: type,
            line: editor.selections[0].start.line
        }
    }))
}

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
function activate(context) {

    // Use the console to output diagnostic information (console.log) and errors (console.error)
    // This line of code will only be executed once when your extension is activated
    console.log('Congratulations, your extension "xde-vscode" is now active!');

    ws = new WebSocket('ws://127.0.0.1:9000');

    ws.on('open', function open() {
        console.log('connected');
        //subscribe to events
        ws.send(JSON.stringify({
            action: "subscribe",
            args: {
                events: ["generateDiagram", "ideAction", "generateWordCloud", "generateCity"]
            }
        }));
        context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor(onDidChangeActiveTextEditor));
        context.subscriptions.push(vscode.window.onDidChangeTextEditorSelection(onDidChangeTextEditorSelection));
    });

    ws.on('message', data => {
        var parsed = JSON.parse(data.toString());
        if (parsed.action == "generateDiagram") {
            vscode.window.showInformationMessage(`${capitalize(parsed.args.type)} Diagram Generated`);
        }
        else if(parsed.action == "generateWordCloud") {
            vscode.window.showInformationMessage("WordCloud Generated");
        }
        else if(parsed.action == "generateCity") {
            vscode.window.showInformationMessage("City Generated");
        }
        else if (parsed.action == "ideAction") {
            if(parsed.args.subtype == "multiple") {
                multiple = true;
            }
            else {
                multiple = false;
            }

            if (parsed.args.type == "goto") {
                vscode.workspace.openTextDocument(vscode.Uri.file(parsed.args.path)).then((td) => {
                    vscode.window.showTextDocument(td).then(() => {
                        vscode.window.activeTextEditor.revealRange(
                            new vscode.Range(
                                new vscode.Position(parsed.args.fromLine, 0),
                                new vscode.Position(parsed.args.toLine, 0)
                            )
                        );
                        vscode.window.activeTextEditor.selection = new vscode.Selection(
                            new vscode.Position(parsed.args.fromLine, 0),
                            new vscode.Position(parsed.args.fromLine, 0)
                        );
                    })
                })
            }
        }
        console.log(`Receieved: ${data}`);
    })

    // The command has been defined in the package.json file
    // Now provide the implementation of the command with  registerCommand
    // The commandId parameter must match the command field in package.json
    let disposable = vscode.commands.registerCommand('extension.generateClassDiagram', function (uri) {
        // The code you place here will be executed every time your command is executed
        ws.send(JSON.stringify({
            action: "generateDiagram",
            args: {
                type: "class",
                fsPaths: [uri.fsPath],
                sysPaths: vscode.workspace.workspaceFolders.map((f) => path.dirname(f.uri.fsPath))
            }
        }))
        // Display a message box to the user
        vscode.window.showInformationMessage("Generating Class Diagram");
    });

    context.subscriptions.push(disposable);

    disposable = vscode.commands.registerCommand('extension.generatePackageDiagram', function (uri) {
        // The code you place here will be executed every time your command is executed
        ws.send(JSON.stringify({
            action: "generateDiagram",
            args: {
                type: "package",
                fsPaths: [uri.fsPath],
                sysPaths: vscode.workspace.workspaceFolders.map((f) => path.dirname(f.uri.fsPath))
            }
        }))
        // Display a message box to the user
        vscode.window.showInformationMessage("Generating Package Diagram");
    });

    context.subscriptions.push(disposable);

    disposable = vscode.commands.registerCommand('extension.generateWordCloud', function (uri) {
        // The code you place here will be executed every time your command is executed
        ws.send(JSON.stringify({
            action: "generateWordCloud",
            args: {
                fsPath: uri.fsPath
            }
        }))
        // Display a message box to the user
        vscode.window.showInformationMessage("Generating WordCloud");
    });

    context.subscriptions.push(disposable);

    disposable = vscode.commands.registerCommand('extension.generateCity', function (uri) {
        // The code you place here will be executed every time your command is executed
        ws.send(JSON.stringify({
            action: "generateCity",
            args: {
                fsPaths: [uri.fsPath],
                sysPaths: vscode.workspace.workspaceFolders.map((f) => path.dirname(f.uri.fsPath))
            }
        }))
        // Display a message box to the user
        vscode.window.showInformationMessage("Generating City");
    });

    context.subscriptions.push(disposable);

    disposable = vscode.commands.registerCommand('extension.copySearchResultsToXDE', function (uri) {
        // The code you place here will be executed every time your command is executed
        console.log(vscode.extensions.all.map(ele => { ele.id }));
        vscode.commands.executeCommand("search.action.copyAll").then(() => {
            vscode.env.clipboard.readText().then(clipboardText => {
                ws.send(JSON.stringify({
                    action: "xdeAction",
                    args: {
                        type: "showSearchResults",
                        results: clipboardText
                    }
                }))
                vscode.window.showInformationMessage("Search results copied to clipboard and XDE");
            });
        });
    });

    context.subscriptions.push(disposable);
}
exports.activate = activate;

// this method is called when your extension is deactivated
function deactivate() {
}
exports.deactivate = deactivate;
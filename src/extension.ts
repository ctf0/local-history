import * as vscode from 'vscode';
import { HistoryController } from './Provider/Controller';
import HistoryTreeProvider from './Provider/HistoryTreeProvider';
import * as utils from './utils';

/**
* Activate the extension.
*/
export function activate(context: vscode.ExtensionContext) {
    utils.readConfig();

    // Commands
    const controller = new HistoryController();

    context.subscriptions.push(
        vscode.commands.registerTextEditorCommand(`${utils.CMND_NAME}.showAll`, controller.showAll, controller),
        vscode.commands.registerTextEditorCommand(`${utils.CMND_NAME}.showCurrent`, controller.showCurrent, controller),
        vscode.commands.registerTextEditorCommand(`${utils.CMND_NAME}.compareToActive`, controller.compareToActive, controller),
        vscode.commands.registerTextEditorCommand(`${utils.CMND_NAME}.compareToCurrent`, controller.compareToCurrent, controller),
        vscode.commands.registerTextEditorCommand(`${utils.CMND_NAME}.compareToPrevious`, controller.compareToPrevious, controller),
    );

    // Tree
    const treeProvider = new HistoryTreeProvider(controller);

    context.subscriptions.push(
        vscode.window.registerTreeDataProvider('treeLocalHistory', treeProvider),
        vscode.window.registerTreeDataProvider('treeLocalHistoryExplorer', treeProvider),

        vscode.commands.registerCommand('treeLocalHistory.deleteAll', treeProvider.deleteAll, treeProvider),
        vscode.commands.registerCommand('treeLocalHistory.refresh', treeProvider.refresh, treeProvider),
        vscode.commands.registerCommand('treeLocalHistory.more', treeProvider.more, treeProvider),
        vscode.commands.registerCommand('treeLocalHistory.forCurrentFile', treeProvider.forCurrentFile, treeProvider),
        vscode.commands.registerCommand('treeLocalHistory.forAll', treeProvider.forAll, treeProvider),
        vscode.commands.registerCommand('treeLocalHistory.forSpecificFile', treeProvider.forSpecificFile, treeProvider),
        vscode.commands.registerCommand('treeLocalHistory.showEntry', treeProvider.show, treeProvider),
        vscode.commands.registerCommand('treeLocalHistory.showSideEntry', treeProvider.showSide, treeProvider),
        vscode.commands.registerCommand('treeLocalHistory.deleteEntry', treeProvider.delete, treeProvider),
        vscode.commands.registerCommand('treeLocalHistory.compareToCurrentEntry', treeProvider.compareToCurrent, treeProvider),
        vscode.commands.registerCommand('treeLocalHistory.selectEntry', treeProvider.select, treeProvider),
        vscode.commands.registerCommand('treeLocalHistory.compareEntry', treeProvider.compare, treeProvider),
        vscode.commands.registerCommand('treeLocalHistory.restoreEntry', treeProvider.restore, treeProvider),
    );

    // Events
    context.subscriptions.push(
        // Create first history before save document
        vscode.workspace.onWillSaveTextDocument((e: vscode.TextDocumentWillSaveEvent) => {
            e.waitUntil(controller.saveFirstRevision(e.document));
        }),

        // Create history on save document
        vscode.workspace.onDidSaveTextDocument(async (document) => {
            if (await checkIfAlreadySaved(context, document)) {
                return;
            }

            controller.saveRevision(document)
                .then((saveDocument) => {
                    // refresh viewer (if any)
                    if (saveDocument) {
                        treeProvider.refresh();
                    }
                });
        }),

        vscode.window.onDidChangeActiveTextEditor((e) => treeProvider.changeActiveFile(e)),

        vscode.workspace.onDidChangeConfiguration((configChangedEvent) => {
            if (configChangedEvent.affectsConfiguration(`${utils.PKG_CONFIG}.treeLocation`)) {
                treeProvider.initLocation();
            }

            if (configChangedEvent.affectsConfiguration(utils.PKG_CONFIG)) {
                utils.readConfig();
                controller.clearSettings();
                treeProvider.refresh();
            }
        }),
    );
}

async function checkIfAlreadySaved(context, document) {
    const fileName = document.fileName;
    const currentData = await context.workspaceState.get(fileName);
    const data = document.getText();
    const check = currentData && currentData == data;

    if (!check) {
        await context.workspaceState.update(fileName, data);
    }

    return check;
}

export function deactivate() { }

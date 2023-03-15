/* eslint-disable curly */
// @ts-ignore
import {neatJSON} from 'neatjson';
import * as vscode from 'vscode';

interface NeatJSONOptions {
	wrap?:              number | boolean,
	indent?:            string,
	indentLast?:        boolean,
	short?:             boolean,
	sort?:              boolean,
	aligned?:           boolean,
	decimals?:          false | number,
	trimTrailingZeros?: boolean,
	forceFloats?:       boolean,
	forceFloatsIn?:     string[],
	arrayPadding?:      number,
	objectPadding?:     number,
	padding?:           number,
	beforeComma?:       number,
	afterComma?:        number,
	aroundComma?:       number,
	beforeColon1?:      number,
	afterColon1?:       number,
	beforeColonN?:      number,
	afterColonN?:       number,
	beforeColon?:       number,
	afterColon?:        number,
	aroundColon?:       number,
}

let activeFormatter: NeatJSONOptions;
export function activate(context: vscode.ExtensionContext) {
	activeFormatter = formatterFromDefaultOptions();

	context.subscriptions.push(vscode.commands.registerCommand('neatJSON.formatWith', selectFormatter));
	context.subscriptions.push(vscode.commands.registerCommand('neatJSON.formatDocument', formatDocument));
	context.subscriptions.push(vscode.commands.registerCommand('neatJSON.formatSelection', formatSelection));
}

async function selectFormatter() {
	const conf = vscode.workspace.getConfiguration('neatJSON');
	const formatters : any = conf.get('formatters') || {};
	const names = Object.keys(formatters).filter(name => !formatters[name].hide);
	names.unshift('(custom values from settings)');
	let name = await vscode.window.showQuickPick(names);
	if (name !== undefined) {
		activeFormatter = formatters[name] || formatterFromDefaultOptions();
		console.info(`neatJSON Settings`, activeFormatter);

		const hasSelection = vscode.window.activeTextEditor && !vscode.window.activeTextEditor.selection.isEmpty;
		if (hasSelection) formatSelection();
		else              formatDocument();
	}
}

function formatDocument() {
	const editor = vscode.window.activeTextEditor;
	const doc = editor?.document;
	const orig = doc?.getText();
	if (editor && doc && orig) {
		const formatted = format(orig);
		if (formatted !== undefined) {
			const fullRange = doc.validateRange(new vscode.Range(0, 0, doc.lineCount, 0));
			editor.edit(edit => edit.replace(fullRange, formatted));
			}
	}
}

function formatSelection() {
	const editor = vscode.window.activeTextEditor;
	const selection = editor?.selection;
	if (selection && !selection.isEmpty) {
		const selectionRange = new vscode.Range(selection.start.line, selection.start.character, selection.end.line, selection.end.character);
		const selectedText = editor.document.getText(selectionRange);
		const formatted = format(selectedText);
		if (formatted !== undefined) editor.edit(edit => edit.replace(selectionRange, formatted));
	}
}

function format(json: string) : string | undefined {
	try {
		const start = Date.now();
		const value = JSON.parse(json);
		const json2 = neatJSON(value, activeFormatter);
		const finish = Date.now();
		const summary = `NeatJSON: ${formatBytes(json.length)} → ${formatBytes(json2.length)} in ${finish-start}ms`;
		// vscode.window.showInformationMessage(summary);
		console.info(summary);
		return json2;
	} catch (e) {
		console.log({error:e});
		vscode.window.showWarningMessage('Does not parse as JSON.');
	}
}

function formatterFromDefaultOptions() : NeatJSONOptions {
	const conf = vscode.workspace.getConfiguration('neatJSON');
	const format:NeatJSONOptions = {};
	if (!conf.get('wrapLines')) format.wrap = false;
	else {
		format.wrap       = conf.get('wrapLines.wrapWidth');
		format.indent     = (conf.get('indent.usingTabs') ? '\t' : ' ').repeat(conf.get('indent.amount') || 0);
		format.indentLast = conf.get('indent.indentLast');
		format.short      = conf.get('short');
		format.sort       = conf.get('sort');
		format.aligned    = conf.get('alignColons');
	}
	format.arrayPadding  = conf.get('arrayPadding');
	format.objectPadding = conf.get('objectPadding');
	format.beforeComma   = conf.get('spacesBeforeCommas');
	format.afterComma    = conf.get('spacesAfterCommas');
	format.beforeColon1  = conf.get('spacesBeforeOneLineColons');
	format.afterColon1   = conf.get('spacesAfterOneLineColons');
	format.beforeColonN  = conf.get('spacesBeforeMultilineColons');
	format.afterColonN   = conf.get('spacesAfterMultilineColons');

	format.forceFloats   = conf.get('forceFloats');
	if (conf.get('forceFloatsIn')) format.forceFloatsIn = conf.get('forceFloatsIn');

	if (conf.get('formatDecimals')) {
		format.decimals          = conf.get('formatDecimals.precision');
		format.trimTrailingZeros = conf.get('formatDecimals.trimTrailingZeros');
	}

	return format;
}

export function deactivate() {}

// Adapted from https://stackoverflow.com/a/18650828/405017
function formatBytes(bytes:number, decimals=1) {
	if (!+bytes) return '0 bytes';
	const k = 1024, i = Math.floor(Math.log(bytes) / Math.log(k));
	if (i === 0) return `${bytes} bytes`;
	const units = [, 'KiB', 'MiB', 'GiB', 'TiB'];
	return `${(bytes / Math.pow(k, i)).toFixed(decimals < 0 ? 0 : decimals)} ${units[i]}`;
}
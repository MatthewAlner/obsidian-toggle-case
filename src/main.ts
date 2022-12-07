import type { EditorSelection } from 'obsidian';
import { App, Editor, MarkdownView, Plugin, PluginSettingTab, Setting } from 'obsidian';
import { CaseUtils } from "./case-utils";
import { CASE, LOWERCASE_ARTICLES } from './constants';
import {
	defaultMultipleSelectionOptions,
	getSelectionBoundaries,
	withMultipleSelections,
	wordRangeAtPos,
} from './utils';

// Remember to rename these classes and interfaces!!

interface MyPluginSettings {
	mySetting: string;
}

const DEFAULT_SETTINGS: MyPluginSettings = {
	mySetting: 'default'
}

export default class MyPlugin extends Plugin {
	settings: MyPluginSettings;
	private caseUtils = new CaseUtils();

	async onload() {
		await this.loadSettings();

		// This adds a simple command that can be triggered anywhere
		this.addCommand({
			id: 'toggle-case',
			name: 'Toggle Case',
			editorCallback: (editor) =>
				withMultipleSelections(editor, transformCase, {
					...defaultMultipleSelectionOptions,
					args: CASE.NEXT,
				}),
		});
		// This adds an editor command that can perform some operation on the current editor instance
		this.addCommand({
			id: 'sample-editor-command',
			name: 'Sample editor command',
			editorCallback: (editor: Editor, view: MarkdownView) => {
				console.log(editor.getSelection());
				editor.replaceSelection('Sample Editor Command');
			}
		});

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new SampleSettingTab(this.app, this));

		// If the plugin hooks up any global DOM events (on parts of the app that doesn't belong to this plugin)
		// Using this function will automatically remove the event listener when this plugin is disabled.
		this.registerDomEvent(document, 'click', (evt: MouseEvent) => {
			console.log('click', evt);
		});

		// When registering intervals, this function will automatically clear the interval when the plugin is disabled.
		this.registerInterval(window.setInterval(() => console.log('setInterval'), 5 * 60 * 1000));
	}

	onunload() {

	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

export const transformCase = (
	editor: Editor,
	selection: EditorSelection,
	caseType: CASE,
) => {
	let { from, to } = getSelectionBoundaries(selection);
	let selectedText = editor.getRange(from, to);

	// apply transform on word at cursor if nothing is selected
	if (selectedText.length === 0) {
		const pos = selection.head;
		const { anchor, head } = wordRangeAtPos(pos, editor.getLine(pos.line));
		[from, to] = [anchor, head];
		selectedText = editor.getRange(anchor, head);
	}

	let replacementText = selectedText;

	switch(caseType) {
		case CASE.UPPER: {
			replacementText = selectedText.toUpperCase();
			break
		}
		case CASE.LOWER: {
			replacementText = selectedText.toLowerCase();
			break
		}
		case CASE.TITLE: {
			replacementText = toTitleCase(selectedText);
			break
		}
		case CASE.NEXT: {
			replacementText = getNextCase(selectedText);
			break
		}
	}

	editor.replaceRange(replacementText, from, to);

	return selection;
};

export const toTitleCase = (selectedText: string) => {
	// use capture group to join with the same separator used to split
	return selectedText
		.split(/(\s+)/)
		.map((word, index, allWords) => {
			if (
				index > 0 &&
				index < allWords.length - 1 &&
				LOWERCASE_ARTICLES.includes(word.toLowerCase())
			) {
				return word.toLowerCase();
			}
			return word.charAt(0).toUpperCase() + word.substring(1).toLowerCase();
		})
		.join('')
}

export const getNextCase = (selectedText: string): string => {
	const textUpper = selectedText.toUpperCase();
	const textLower = selectedText.toLowerCase();
	const textTitle = toTitleCase(selectedText);

	switch(selectedText) {
		case textUpper: {
			return textLower;
		}
		case textLower: {
			return textTitle;
		}
		case textTitle: {
			return textUpper;
		}
		default: {
			return textUpper;
		}
	}
}

class SampleSettingTab extends PluginSettingTab {
	plugin: MyPlugin;

	constructor(app: App, plugin: MyPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		containerEl.createEl('h2', {text: 'Settings for my awesome plugin.'});

		new Setting(containerEl)
			.setName('Setting #1')
			.setDesc('It\'s a secret')
			.addText(text => text
				.setPlaceholder('Enter your secret')
				.setValue(this.plugin.settings.mySetting)
				.onChange(async (value) => {
					console.log('Secret: ' + value);
					this.plugin.settings.mySetting = value;
					await this.plugin.saveSettings();
				}));
	}
}

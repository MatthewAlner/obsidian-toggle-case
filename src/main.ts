import type { EditorSelection } from 'obsidian';
import { App, Editor, Plugin, PluginSettingTab, Setting } from 'obsidian';
import { CASE, LOWERCASE_ARTICLES } from './constants';
import {
	defaultMultipleSelectionOptions,
	getSelectionBoundaries,
	withMultipleSelections,
	wordRangeAtPos,
} from './utils';

// Remember to rename these classes and interfaces!!

interface IPluginSettings {
	shouldSyncCaseMultiCursor: boolean;
}

const DEFAULT_SETTINGS: IPluginSettings = {
	shouldSyncCaseMultiCursor: true
}

export default class ToggleCasePlugin extends Plugin {
	settings: IPluginSettings;

	async onload() {
		await this.loadSettings();

		// This adds a command that can be triggered when in editor mode
		this.addCommand({
			id: 'toggle-case',
			name: 'Toggle Case',
			editorCallback: (editor) =>
				withMultipleSelections(editor, transformCase, {
					...defaultMultipleSelectionOptions,
					args: CASE.NEXT,
				}),
		});

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new SettingsTab(this.app, this));
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

class SettingsTab extends PluginSettingTab {
	plugin: ToggleCasePlugin;

	constructor(app: App, plugin: ToggleCasePlugin) {
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
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.shouldSyncCaseMultiCursor)
				.onChange(async (value) => {
					this.plugin.settings.shouldSyncCaseMultiCursor = value;
					await this.plugin.saveSettings();
				}));
	}
}

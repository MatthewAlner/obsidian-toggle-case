import type { EditorSelection } from 'obsidian';
import { App, Editor, Plugin, PluginSettingTab, Setting } from 'obsidian';
import { LOWERCASE_ARTICLES } from './constants';
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
	public settings: IPluginSettings;
	private caseSyncCheckText: string | null = null;

	async onload() {
		await this.loadSettings();

		// This adds a command that can be triggered when in editor mode
		this.addCommand({
			id: 'toggle-case',
			name: 'Toggle Case',
			editorCallback: (editor) =>
				withMultipleSelections(
					editor,
					(editor, selection, index) => this.toggleCase(editor,selection, index),
					{ ...defaultMultipleSelectionOptions }
				),
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

	private toggleCase( editor: Editor, selection: EditorSelection, index: number ) {
		let { from, to } = getSelectionBoundaries(selection);
		let selectedText = editor.getRange(from, to);

		// apply transform on word at cursor if nothing is selected
		if (selectedText.length === 0) {
			const pos = selection.head;
			const { anchor, head } = wordRangeAtPos(pos, editor.getLine(pos.line));
			[from, to] = [anchor, head];
			selectedText = editor.getRange(anchor, head);
		}

		const replacementText: string = this.getNextCase(selectedText, index);
		editor.replaceRange(replacementText, from, to);

		return selection;
	}

	private toTitleCase(selectedText: string) {
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
	private toSentenceCase(selectedText: string) {
		return selectedText.charAt(0).toUpperCase() + selectedText.slice(1).toLowerCase();
	}
	private getNextCase(selectedText: string, index: number): string {
		let textToCheck: string = selectedText;

		if (this.settings.shouldSyncCaseMultiCursor && index === 0) {
			this.caseSyncCheckText = selectedText;
		}

		if (this.settings.shouldSyncCaseMultiCursor && this.caseSyncCheckText) {
			textToCheck = this.caseSyncCheckText;
		}

		const checkTextUpper = textToCheck.toUpperCase();
		const checkTextLower = textToCheck.toLowerCase();
		const checkTextTitle = this.toTitleCase(textToCheck);
		const checkTextSentence = this.toSentenceCase(textToCheck);

		switch(textToCheck) {
			case checkTextUpper: {
				return selectedText.toLowerCase();
			}
			case checkTextLower: {
				return this.toTitleCase(selectedText);
			}
			case checkTextTitle: {
				return this.toSentenceCase(selectedText);
			}
			case checkTextSentence: {
				return selectedText.toUpperCase();
			}
			default: {
				return selectedText.toUpperCase();
			}
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
			.setName('Sync case multi-cursor')
			.setDesc('When there are multiple selections, apply the same case transformation to all.')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.shouldSyncCaseMultiCursor)
				.onChange(async (value) => {
					this.plugin.settings.shouldSyncCaseMultiCursor = value;
					await this.plugin.saveSettings();
				}));
	}
}

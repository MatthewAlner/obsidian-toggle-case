import { Editor, EditorPosition, EditorSelection, EditorSelectionOrCaret, } from 'obsidian';
import { CustomSelectionHandler } from './custom-selection-handlers';

type EditorActionCallback = (
	editor: Editor,
	selection: EditorSelection,
	args?: string,
) => EditorSelectionOrCaret;

type MultipleSelectionOptions = {
	// Additional information to be passed to the EditorActionCallback
	args?: string;

	// Perform further processing of new selections before they are set
	customSelectionHandler?: CustomSelectionHandler;

	// Whether the action should be repeated for cursors on the same line
	repeatSameLineActions?: boolean;
};

export const defaultMultipleSelectionOptions = { repeatSameLineActions: true };

export const withMultipleSelections = (
	editor: Editor,
	callback: EditorActionCallback,
	options: MultipleSelectionOptions = defaultMultipleSelectionOptions,
) => {
	// @ts-expect-error: Obsidian's Editor interface does not explicitly
	// include the CodeMirror cm object, but it is there when using the
	// legacy editor
	const { cm } = editor;

	const selections: EditorSelection[] = editor.listSelections();
	let selectionIndexesToProcess: number[];
	let newSelections: EditorSelectionOrCaret[] = [];

	if (!options.repeatSameLineActions) {
		const seenLines: number[] = [];
		selectionIndexesToProcess = selections.reduce(
			(indexes: number[], currSelection: EditorSelection, currIndex: number) => {
				const currentLine = currSelection.head.line;
				if (!seenLines.includes(currentLine)) {
					seenLines.push(currentLine);
					indexes.push(currIndex);
				}
				return indexes;
			},
			[],
		);
	}

	const applyCallbackOnSelections = () => {
		for (let i = 0; i < selections.length; i++) {
			// Controlled by repeatSameLineActions
			if (selectionIndexesToProcess && !selectionIndexesToProcess.includes(i)) {
				continue;
			}

			// Can't reuse selections variable as positions may change on each iteration
			const selection = editor.listSelections()[i];

			// Selections may disappear (e.g. running delete line for two cursors on the same line)
			if (selection) {
				const newSelection = callback(editor, selection, options.args);
				newSelections.push(newSelection);
			}
		}

		if (options.customSelectionHandler) {
			newSelections = options.customSelectionHandler(newSelections);
		}
		editor.setSelections(newSelections);
	};

	if (cm && cm.operation) {
		// Group all the updates into one atomic operation (so undo/redo work as expected)
		cm.operation(applyCallbackOnSelections);
	} else {
		// Safe fallback if cm doesn't exist (so undo/redo will step through each change)
		console.debug('cm object not found, operations will not be buffered');
		applyCallbackOnSelections();
	}
};

export const getSelectionBoundaries = (selection: EditorSelection) => {
	let { anchor: from, head: to } = selection;

	// in case user selects upwards
	if (from.line > to.line) {
		[from, to] = [to, from];
	}

	// in case user selects backwards on the same line
	if (from.line === to.line && from.ch > to.ch) {
		[from, to] = [to, from];
	}

	return { from, to };
};

// Match any character from any language: https://www.regular-expressions.info/unicode.html
const isLetterCharacter = (char: string) => /\p{L}\p{M}*/u.test(char);

export const wordRangeAtPos = (
	pos: EditorPosition,
	lineContent: string,
): { anchor: EditorPosition; head: EditorPosition } => {
	let start = pos.ch;
	let end = pos.ch;
	while (start > 0 && isLetterCharacter(lineContent.charAt(start - 1))) {
		start--;
	}
	while (
		end < lineContent.length &&
		isLetterCharacter(lineContent.charAt(end))
		) {
		end++;
	}
	return {
		anchor: {
			line: pos.line,
			ch: start,
		},
		head: {
			line: pos.line,
			ch: end,
		},
	};
};

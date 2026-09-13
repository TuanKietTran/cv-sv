import { onBeforeUnmount, onMounted, shallowRef, toValue, watch } from "vue";
import type { MaybeRefOrGetter, ShallowRef } from "vue";
import { Compartment, EditorState } from "@codemirror/state";
import type { Extension } from "@codemirror/state";
import {
    EditorView,
    highlightActiveLine,
    highlightActiveLineGutter,
    keymap,
    lineNumbers,
} from "@codemirror/view";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import {
    bracketMatching,
    defaultHighlightStyle,
    HighlightStyle,
    indentOnInput,
    syntaxHighlighting,
} from "@codemirror/language";
import { tags } from "@lezer/highlight";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { css } from "@codemirror/lang-css";
import { languages } from "@codemirror/language-data";
import { oneDark } from "@codemirror/theme-one-dark";

export type CodeMirrorLanguage = "markdown" | "css";
export type MarkdownFormat = "bold" | "italic" | "link" | "heading" | "quote" | "bullet" | "code";

export interface UseCodeMirrorOptions {
    initialDoc: MaybeRefOrGetter<string>;
    language?: MaybeRefOrGetter<CodeMirrorLanguage>;
    onChange?: (state: EditorState) => void;
}

export interface UseCodeMirrorResult<T extends HTMLElement> {
    container: ShallowRef<T | null>;
    view: ShallowRef<EditorView | undefined>;
    setDocument: (document: string) => void;
    applyMarkdownFormat: (format: MarkdownFormat) => void;
    focus: () => void;
}

export const transparentTheme = EditorView.theme({
    "&": {
        backgroundColor: "transparent !important",
        height: "100%",
    },
    ".cm-scroller": {
        overflow: "auto",
    },
});

const markdownHeadingStyle = HighlightStyle.define([
    { tag: tags.heading1, fontSize: "1.6em", fontWeight: "bold" },
    { tag: tags.heading2, fontSize: "1.4em", fontWeight: "bold" },
    { tag: tags.heading3, fontSize: "1.2em", fontWeight: "bold" },
]);

const languageExtensions = (language: CodeMirrorLanguage): Extension =>
    language === "css"
        ? css()
        : [
              markdown({
                  base: markdownLanguage,
                  codeLanguages: languages,
                  addKeymap: true,
              }),
              syntaxHighlighting(markdownHeadingStyle),
          ];

export function useCodeMirror<T extends HTMLElement = HTMLDivElement>(
    options: UseCodeMirrorOptions,
): UseCodeMirrorResult<T> {
    const container = shallowRef<T | null>(null);
    const view = shallowRef<EditorView>();
    const languageCompartment = new Compartment();

    const setDocument = (document: string) => {
        const currentView = view.value;
        if (!currentView || currentView.state.doc.toString() === document) return;

        currentView.dispatch({
            changes: {
                from: 0,
                to: currentView.state.doc.length,
                insert: document,
            },
        });
    };

    const focus = () => view.value?.focus();

    const applyMarkdownFormat = (format: MarkdownFormat) => {
        const currentView = view.value;
        if (!currentView || toValue(options.language ?? "markdown") !== "markdown") return;

        const range = currentView.state.selection.main;
        const selected = currentView.state.sliceDoc(range.from, range.to);
        let insert = selected;
        let anchor = range.from;
        let head = range.from;

        if (format === "bold" || format === "italic" || format === "code") {
            const marker = format === "bold" ? "**" : format === "italic" ? "_" : "`";
            insert = `${marker}${selected}${marker}`;
            anchor = range.from + marker.length;
            head = anchor + selected.length;
        } else if (format === "link") {
            const label = selected || "text";
            insert = `[${label}](url)`;
            anchor = selected ? range.from + insert.length - 4 : range.from + 1;
            head = selected ? anchor + 3 : anchor + label.length;
        } else {
            const marker = format === "heading" ? "## " : format === "quote" ? "> " : "- ";
            const line = currentView.state.doc.lineAt(range.from);
            const from = line.from;
            const to = range.empty
                ? line.to
                : currentView.state.doc.lineAt(Math.max(range.from, range.to - 1)).to;
            const text = currentView.state.sliceDoc(from, to);
            insert = text.split("\n").map((part) => `${marker}${part}`).join("\n");
            anchor = from + marker.length;
            head = from + insert.length;
            currentView.dispatch({ changes: { from, to, insert }, selection: { anchor, head } });
            currentView.focus();
            return;
        }

        currentView.dispatch({
            changes: { from: range.from, to: range.to, insert },
            selection: { anchor, head },
        });
        currentView.focus();
    };

    onMounted(() => {
        if (!container.value) return;

        const startState = EditorState.create({
            doc: toValue(options.initialDoc),
            extensions: [
                keymap.of([...defaultKeymap, ...historyKeymap]),
                lineNumbers(),
                highlightActiveLineGutter(),
                history(),
                indentOnInput(),
                bracketMatching(),
                syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
                highlightActiveLine(),
                languageCompartment.of(
                    languageExtensions(toValue(options.language ?? "markdown")),
                ),
                oneDark,
                transparentTheme,
                EditorView.lineWrapping,
                EditorView.updateListener.of((update) => {
                    if (update.docChanged) options.onChange?.(update.state);
                }),
            ],
        });

        view.value = new EditorView({
            state: startState,
            parent: container.value,
        });
    });

    watch(
        () => toValue(options.initialDoc),
        (document) => setDocument(document),
    );

    watch(
        () => toValue(options.language ?? "markdown"),
        (language) => {
            view.value?.dispatch({
                effects: languageCompartment.reconfigure(languageExtensions(language)),
            });
        },
    );

    onBeforeUnmount(() => {
        view.value?.destroy();
        view.value = undefined;
    });

    return { container, view, setDocument, applyMarkdownFormat, focus };
}

export default useCodeMirror;

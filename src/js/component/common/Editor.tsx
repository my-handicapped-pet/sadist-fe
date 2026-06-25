import React, {
  HTMLProps,
  useEffect,
  useImperativeHandle,
  useRef
} from 'react';
import monaco, { editor, languages, MarkerSeverity, Uri } from 'monaco-editor';
import EditorOption = editor.EditorOption;
import { ResizePayload, useResizeDetector } from 'react-resize-detector';
import { __as } from '../../helper/type-helper';

export type TypescriptLib = { uri: string; source: string; };

export interface EditorProps extends HTMLProps<HTMLDivElement> {
  /**
   * UNIQUE id of the editor
   */
  id: string;

  /**
   * Language
   */
  language: 'javascript' | 'json';

  /**
   * Initial text of the script, can be changed
   * both by user or programmatically
   */
  text: string;

  /**
   * Initial readonly state of the script,
   * can be changed programmatically later than
   */
  readonly: boolean;

  /**
   * Additional typescript libs that are used for type hints.
   */
  libs?: TypescriptLib[];

  /**
   * JSON schema that is used for hints and validation
   */
  schema?: object;
}

/**
 * Interface for Editor reference
 */
export interface EditorInterface {
  getText(): string;

  setText(text: string): void;

  isReadOnly(): boolean;

  setReadOnly(readonly: boolean): void;

  getCursor(): Position;

  setCursor(pos: Position): void;

  getSelection(): Range;

  setSelection(selection: Range): void;

  find(text: string): Position | undefined;

  findAll(text: string): Position[];

  getTextAt(range: Range): string;

  on(name: 'blur', callback: (event: Event) => any): void;

  on(name: 'change', callback: (event: ChangeEvent) => any): void;

  off(name: 'blur', callback: (event: Event) => any): void;

  off(name: 'change', callback: (event: ChangeEvent) => any): void;

  focus(): void;

  fold(lines: number[]): void;

  foldAll(): void;

  unfold(lines: number[]): void;

  unfoldAll(): void;

  validate(): void;
}

/**
 * Row, column
 */
export type Position = [number, number];

/**
 * Start, end
 */
export type Range = [Position, Position];

export interface ChangeEvent {
  action: 'insert' | 'remove';
  range: Range;
  lines: string[];
}

/**
 * Global models as a map URI to not URI.
 * URI, therefore, is a unique URI-format string,
 * which doesn't have to be resolved to an actual resource.
 *
 * @private
 */
const models: { [uri: string]: editor.ITextModel } = {};

/**
 * JavaScript/JSON editor with aid of monaco-editor.
 *
 * Generally it's just a wrapper, but keep it in case of changing underlying
 * component in the future.
 */
const Editor = React.forwardRef(function (
    { id, language = 'javascript', libs, readonly = false, schema, text, ...other }: EditorProps,
    ref: React.ForwardedRef<EditorInterface>
) {

  // const containerRef = useRef<HTMLDivElement | null>(null);
  const { width, height, ref: containerRef } = useResizeDetector();
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const selfRef = useRef<EditorInterface>(__as({
    getText(): string {
      if (!editorRef.current) {
        return '';
      }
      return editorRef.current.getValue();
    },

    setText(text: string): void {
      if (!editorRef.current) {
        return;
      }
      // prevent destruction
      let onChangeBk: ( (event: ChangeEvent) => void )[] = [];
      cbMapRef.current['change']?.forEach(e => {
        let callback = e.our as ( (event: ChangeEvent) => void );
        onChangeBk.push(callback);
        this.off('change', callback);
      });
      let cursorBk = this.getCursor();
      let selectionBk = this.getSelection();

      editorRef.current.setValue(text);

      for (let callback of onChangeBk) {
        this.on('change', callback);
      }
      this.setCursor(cursorBk);
      this.setSelection(selectionBk);
    },

    isReadOnly(): boolean {
      if (!editorRef.current) {
        return true;
      }
      return editorRef.current.getOption(EditorOption.readOnly);
    },

    setReadOnly(readonly: boolean) {
      if (!editorRef.current) {
        return;
      }
      editorRef.current.updateOptions({ readOnly: readonly });
    },

    getCursor(): Position {
      if (!editorRef.current) {
        return [0, 0];
      }
      let position = editorRef.current.getPosition();
      return position ? this.__pos(position) : [0, 0];
    },

    setCursor(pos: Position) {
      if (!editorRef.current) {
        return;
      }
      editorRef.current.focus();
      editorRef.current.setPosition(this.__mpos(pos));
    },

    getSelection(): Range {
      if (!editorRef.current) {
        return [[0, 0], [0, 0]];
      }
      const range = editorRef.current.getSelection();
      return range ? this.__range(range) : [[0, 0], [0, 0]];
    },

    setSelection(selection: Range) {
      if (!editorRef.current) {
        return;
      }
      editorRef.current.setSelection(this.__mrange(selection));
    },

    find(text: string): Position | undefined {
      if (!editorRef.current) {
        return undefined;
      }
      const matches = editorRef.current.getModel()?.findMatches(text,
          false, false, true, null, false);
      return matches && matches.length ?
          this.__range(matches[0].range)[0] :
          undefined;
    },

    getTextAt(range: Range): string {
      if (!editorRef.current) {
        return '';
      }
      return editorRef.current.getModel()?.getValueInRange(this.__mrange(range)) || '';
    },

    findAll(text: string): Position[] {
      const matches = this.__findMatches(text);
      return matches && matches.length ?
          matches.map((match) => this.__range(match.range)[0]) :
          [];
    },

    on(name: string, callback: Function) {
      if (!editorRef.current) {
        return;
      }
      let disposable;

      switch (name) {
        case 'blur':
          disposable = editorRef.current.onDidBlurEditorWidget(() => callback());
          break;
        case 'change':
          disposable = editorRef.current.onDidChangeModelContent((event) => {
            event.changes.forEach((change) => {
              if (change.rangeLength) {
                callback({
                  action: 'remove',
                  range: this.__range(change.range),
                  lines: [],
                });
              }
              if (change.text) {
                let lines = change.text.split('\n');
                let start = this.__range(change.range)[0];
                let end = lines.length == 1 ?
                    [start[0], start[1] + lines[0].length] :
                    [start[0] + lines.length - 1, lines[lines.length - 1].length];
                let range = [start, end];
                callback({
                  action: 'insert',
                  range,
                  lines,
                });
              }
            })
          });
          break;
      }

      if (disposable) {
        ( cbMapRef.current![name] ||= [] ).push({
          native: disposable,
          our: callback
        });
      }
    },

    off(name: string, callback: Function) {
      if (name in cbMapRef.current!) {
        let e = cbMapRef.current[name].find(e => e.our == callback);
        if (e) {
          e.native.dispose();
          cbMapRef.current[name] = cbMapRef.current[name].filter(e1 => e1 != e);
        }
      }
    },

    focus() {
      if (!editorRef.current) {
        return;
      }
      editorRef.current.focus();
    },

    fold(lines: number[]) {
      editorRef.current?.trigger(null, 'editor.fold', { selectionLines: lines });
    },

    foldAll() {
      editorRef.current?.trigger(null, 'editor.foldAll', undefined);
    },

    unfold(lines: number[]) {
      editorRef.current?.trigger(null, 'editor.unfold', { selectionLines: lines })
    },

    unfoldAll() {
      editorRef.current?.trigger(null, 'editor.unfoldAll', undefined);
    },

    validate() {
      for (let marker of editor.getModelMarkers({})) {
        // Schema violation is Warning
        if (marker.severity >= MarkerSeverity.Warning) {
          throw marker;
        }
      }
    },

    __pos(point: monaco.IPosition): Position {
      return [point.lineNumber - 1, point.column - 1];
    },

    __mpos(pos: Position): monaco.IPosition {
      return { lineNumber: pos[0] + 1, column: pos[1] + 1 };
    },

    __range(range: monaco.IRange): Range {
      return [[range.startLineNumber - 1, range.startColumn - 1],
        [range.endLineNumber - 1, range.endColumn - 1]];
    },

    __mrange(range: Range): monaco.IRange {
      return {
        startLineNumber: range[0][0] + 1,
        startColumn: range[0][1] + 1,
        endLineNumber: range[1][0] + 1,
        endColumn: range[1][1] + 1,
      };
    },

    __findMatches(text: string) {
      return editorRef.current?.getModel()?.findMatches(text,
          false, false, true, null, false);
    },
  }));

  const cbMapRef = useRef<{
    [name: string]: { native: monaco.IDisposable, our: Function }[];
  }>({});

  useEffect(() => {
    if (!containerRef.current || editorRef.current) {
      return;
    }

    let model: editor.ITextModel | undefined = undefined;
    if (language == 'json' && schema) {
      // for JSON schema we need an URI to associate it with the model,
      // let make it from ID.
      const modelUri = monaco.Uri.parse(`editor://${id}.json`);
      model = editor.createModel(text, language, modelUri);

      // Attach schema to model
      monaco.languages.json.jsonDefaults.setDiagnosticsOptions({
        validate: true,
        schemas: [
          ...( monaco.languages.json.jsonDefaults.diagnosticsOptions.schemas || [] ),
          {
            uri: `editor://${id}-schema.json`,
            fileMatch: [modelUri.toString()],
            schema: schema,
          }
        ]
      });
    }

    editorRef.current = editor.create(containerRef.current, {
      automaticLayout: false,
      minimap: { enabled: false },
      tabSize: 2,
      language: 'javascript',
      value: text,
      model,
      readOnly: readonly,
    });

    return () => {
      editorRef.current?.dispose();
      editorRef.current = undefined;
      model?.dispose();
    };
  }, [containerRef.current]);

  useEffect(() => {
    if (width === undefined || height === undefined) {
      return;
    }

    // Monaco-editor triggers infinite resize with +2 width,
    // here is workaround to block it.
    if (editorRef.current) {
      editorRef.current.layout({ width: width - 2, height });
    }
  }, [width, height]);

  useEffect(() => {
    selfRef.current.setText(text);
  }, [text]);

  useEffect(() => {
    selfRef.current.setReadOnly(readonly);
  }, [readonly]);

  useImperativeHandle(ref, () => selfRef.current, [selfRef.current]);

  function __addlib(uri: string, source: string) {
    if (models[uri]) {
      return;
    }

    languages.typescript.javascriptDefaults.addExtraLib(source, uri);
    models[uri] = editor.createModel(source, 'typescript', Uri.parse(uri));
  }

  libs?.forEach(lib => {
    __addlib(lib.uri, lib.source);
  });

  return <div
      ref={containerRef}
      id={id}
      {...other}
  />;
});

export default Editor;

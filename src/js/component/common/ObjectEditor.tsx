import React, { lazy, Suspense, useEffect, useRef, useState } from 'react';
import equal from 'deep-equal';
import type { EditorInterface } from './Editor';
import Block from './Block';
import { useRefToForward } from '../../hook/ref-hooks';

const JsonEditor = lazy(() => import('./Editor'));

interface ObjectEditorParams<T> extends React.HTMLProps<HTMLDivElement> {
  obj?: T;
  schema?: object;
  // TODO think of interface of Visual Editor
  visualEditor?: React.FC<{ obj: T }>;

  onChanging?(): void;

  onChanged?(newObj: T): void;

  onUnchanged?(): void;
}

export interface ObjectEditorInterface extends EditorInterface {
  save(): boolean;
}

/**
 * General-purpose editor of (almost) any object.
 */
const ObjectEditor = React.forwardRef(<T extends any>(params: ObjectEditorParams<T>, ref: React.ForwardedRef<ObjectEditorInterface>) => {
  const [jsonEditor, setJsonEditor] = useState<EditorInterface | null>(null);

  const {
    id,
    obj,
    schema,
    visualEditor,
    onChanging,
    onChanged,
    onUnchanged,
    ...divProps
  } = params;

  // Reference to show an error without re-rendering
  const errorElementRef = useRef<HTMLSpanElement | null>(null);

  function clearError() {
    const element = errorElementRef.current;
    if (element) {
      while (element.hasChildNodes()) {
        element.removeChild(element.lastChild!);
      }
    }
  }

  function setError(text: string) {
    const element = errorElementRef.current;
    if (element) {
      clearError();
      element.appendChild(document.createTextNode(text));
    }
  }

  const editorRef = useRefToForward<EditorInterface, ObjectEditorInterface>(ref, (editor) => ( {
    save(): boolean {
      try {
        const text = editor.getText();
        // validate newObj over schema
        editor.validate();
        const newObj = JSON.parse(text);
        if (equal(obj, newObj)) {
          onUnchanged?.();
        } else {
          onChanged?.(newObj);
        }
        return true;
      } catch (e: any) {
        setError(e.message);
        // monaco-style positioning. Not very good to stick to it, but let it be...
        if (typeof e.startLineNumber == 'number' && typeof e.startColumn == 'number') {
          editor.setCursor([e.startLineNumber - 1, e.startColumn - 1]);
        }
        return false;
      }
    }
  } ));

  useEffect(() => {
    clearError();
  });

  useEffect(() => {
    if (jsonEditor && onChanging) {
      jsonEditor.on('change', onChanging);

      return () => jsonEditor.off('change', onChanging);
    }

    return undefined;
  }, [jsonEditor, onChanging]);

  // If object is undefined, let a user start from the empty slate,
  // otherwise it must be non-empty JSON serialization.
  let text = obj == undefined ? '' : JSON.stringify(obj, undefined, 2);
  return <Suspense fallback="loading...">
    <div className="block-container-vertical">
      <JsonEditor
          // @ts-ignore I honestly don't know why TS goes off here
          ref={(editor) => {
            editorRef.current = editor;
            setJsonEditor(editor);
          }}
          id={id || 'orphan-editor'}
          language="json"
          text={text}
          readonly={false}
          schema={schema}
          {...divProps}
      />
      <Block size="content">
        <span ref={errorElementRef} className="field-error"/>
      </Block>
    </div>
  </Suspense>;
});

export default ObjectEditor;

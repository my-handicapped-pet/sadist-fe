import React, {
  lazy,
  Suspense,
  useEffect,
  useImperativeHandle,
  useRef
} from 'react';
import equal from 'deep-equal';
import type { EditorInterface } from './Editor';
import Block from './Block';

interface ObjectEditorParams<T> extends React.HTMLProps<HTMLDivElement> {
  obj?: T;
  schema?: object;
  // TODO think of interface of Visual Editor
  visualEditor?: React.FC<{ obj: T }>;

  onChanging?(): void;

  onChanged?(newObj: T): void;

  onUnchanged?(): void;
}

export interface ObjectEditorInterface {
  underlying: EditorInterface | null;

  save(): boolean;
}

/**
 * General-purpose editor of (almost) any object.
 */
const ObjectEditor = React.forwardRef(<T extends any>(params: ObjectEditorParams<T>, ref: React.ForwardedRef<ObjectEditorInterface>) => {
  const _JsonEditor = lazy(() => import('./Editor')),
      jsonEditorRef = useRef<EditorInterface | null>(null);

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

  useImperativeHandle(ref, () => ( {
    underlying: jsonEditorRef.current,

    save(): boolean {
      if (!jsonEditorRef.current) {
        // If editor ref isn't yet set, we can fairly conclude
        // that object isn't changed
        onUnchanged?.();
        return true;
      }
      try {
        const text = jsonEditorRef.current!.getText();
        // validate newObj over schema
        jsonEditorRef.current!.validate();
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
          jsonEditorRef.current!.setCursor([e.startLineNumber - 1, e.startColumn - 1]);
        }
        return false;
      }
    }
  } ));

  useEffect(() => {
    clearError();
  });

  useEffect(() => {
    if (jsonEditorRef.current && onChanging) {
      jsonEditorRef.current.on('change', onChanging);

      return () => jsonEditorRef.current?.off('change', onChanging);
    }

    return undefined;
  }, [jsonEditorRef.current]);

  // If object is undefined, let a user start from the empty slate,
  // otherwise it must be non-empty JSON serialization.
  let text = obj == undefined ? '' : JSON.stringify(obj, undefined, 2);
  return <Suspense fallback="loading...">
    <div className="block-container-vertical">
      <_JsonEditor
          // @ts-ignore I honestly don't know why TS goes off here
          ref={jsonEditorRef}
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

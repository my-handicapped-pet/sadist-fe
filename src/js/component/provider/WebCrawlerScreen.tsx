import React, { useEffect, useRef, useState } from 'react';
import { WiredSearchInput } from '/wired-elements/lib/wired-search-input';
import Loader from '../common/Loader';
import HTMLTree from '../common/HTMLTree';
import Editor, {
  ChangeEvent,
  EditorInterface,
  Range,
  TypescriptLib
} from '../common/Editor';
import Uniselector from '../common/Uniselector';
import Block, { BlockElement } from '../common/Block';
import Toolbox, { ToolboxButton } from '../common/Toolbox';
import WebCrawlerScriptToolbox, {
  ScriptToolboxState
} from './WebCrawlerScriptToolbox';
import Icon from '../../icon/Icon';
import { WebCrawlerScriptTemplate } from '../../webcrawler-model/webcrawler';
import { ValueType } from '../../model/ds';
import ValidationError from './ValidationError';
import { API } from '../../helper/api-helper';
import {
  Webcrawler,
  WebcrawlerRequest,
  WebcrawlerResponse
} from '../../webcrawler-client/webcrawler';
import { scrollToVisible } from '../../helper/scroll-helper';

interface WebCrawlerProps {
  url?: URL;
  template?: WebCrawlerScriptTemplate;
  libs?: TypescriptLib[];

  setRef(ref: WebCrawlerResultRef): void;

  saveTemplate(template: WebCrawlerScriptTemplate): Promise<void>;
}

interface WebCrawlerState {
  loading: boolean;
  contentDocument?: Document;
  proxySessionId?: string;
  proxyUrl?: string;
}

/**
 * where we found element
 */
type ElementSource = 'view' | 'tree' | 'search';

/**
 * Improvised reference
 */
export interface WebCrawlerResultRef {
  getResult(): Promise<ValueType[][]>;

  getTitle(): string | undefined;

  isSaveTemplate(): boolean;
}

export default function WebCrawlerScreen(props: WebCrawlerProps) {
  const [state, setState] = useState<WebCrawlerState>({
    loading: false,
  });

  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const treeRef = useRef<HTMLTree | null>(null);
  const treeContainerRef = useRef<BlockElement | null>(null);
  const highlightRef = useRef<HTMLDivElement | null>(null);
  const selectedElementRef = useRef<Element | null>(null);
  const searchRef = useRef<WiredSearchInput | null>(null);
  const searchElementsRef = useRef<Element[]>([]);
  const searchPositionRef = useRef<number>(-1);
  const searchCommentRef = useRef<HTMLSpanElement | null>(null);
  const editorRef = useRef<EditorInterface | null>(null);
  const editorCommentRef = useRef<HTMLSpanElement | null>(null);
  const editorErrorRef = useRef<HTMLSpanElement | null>(null);
  const transformerRef = useRef<( (...args: string[]) => void ) | undefined>(undefined);
  const transformerArgsRef = useRef<string[] | undefined>(undefined);
  const transformerArgNoRef = useRef<number | undefined>(undefined);
  const transformerArgRangeRef = useRef<Range | undefined>(undefined);
  const onChangeCallbackRef = useRef<( (event: ChangeEvent) => void ) | undefined>(undefined);
  const onBlurCallbackRef = useRef<( (event: Event) => void ) | undefined>(undefined);
  const isTemplateTrueRef = useRef<boolean | undefined>(undefined);
  const resultElementRef = useRef<BlockElement | null>(null);
  const resultRef = useRef<ValueType[][] | undefined>(undefined);
  const promiseRef = useRef<Promise<ValueType[][]> | undefined>(undefined);
  const titleRef = useRef<string | undefined>(undefined);
  const scriptToolboxStateRef = useRef<ScriptToolboxState>(null);

  function highlightElement(element: Element) {
    if (contentDocument) {
      if (highlightRef.current) {
        blurElement();
      }
      const rect = element.getBoundingClientRect();
      const overlay = contentDocument.createElement('div');
      overlay.style.backgroundColor = 'rgb(0, 116, 204, .5)';
      overlay.style.position = 'absolute';
      overlay.style.top = `${rect.top + contentDocument.body.scrollTop}px`;
      overlay.style.left = `${rect.left + contentDocument.body.scrollLeft}px`;
      overlay.style.height = `${rect.height}px`;
      overlay.style.width = `${rect.width}px`;
      overlay.style.pointerEvents = 'none';
      highlightRef.current = contentDocument.body.appendChild(overlay);
    }
  }

  function blurElement() {
    if (contentDocument && highlightRef.current &&
        highlightRef.current?.parentElement == contentDocument.body) {
      contentDocument.body.removeChild(highlightRef.current);
      highlightRef.current = null;
    }
  }

  function treeNode(element: Element): HTMLTree | undefined {
    const t = ( element as any ).__treeNode;
    if (t) {
      return t as HTMLTree;
    }
    return undefined;
  }

  function selectElement(element: Element, source: ElementSource) {
    if (selectedElementRef.current == element) {
      return;
    }

    // select element in the HTML tree
    if (selectedElementRef.current) {
      treeNode(selectedElementRef.current)?.deselect();
    }
    treeNode(element)?.select();

    // highlight element on the site
    if (source == 'search') {
      highlightElement(element);
    }

    // scroll to the element on the site
    if (source != 'view' && contentDocument) {
      const rect = highlightRef.current?.getBoundingClientRect();
      const iframeRect = iframeRef.current?.getBoundingClientRect();
      if (rect && iframeRect &&
          !( contentDocument.documentElement.scrollTop <= rect.top &&
              rect.top < contentDocument.documentElement.scrollTop + iframeRect.height )) {
        contentDocument.documentElement.scrollTo({ top: rect.top + contentDocument.documentElement.scrollTop });
      }
    }

    // suggest element's selector
    if (source != 'search' && searchRef.current) {
      searchRef.current.value = suggestSelector(element);
      searchRef.current.focus();
      findElements();
      setComment(searchCommentRef, '');
    }

    selectedElementRef.current = element;
  }

  function searchElements(elements: Element[]) {
    searchElementsRef.current.forEach(element => {
      treeNode(element)?.unsearch();
    });
    elements.forEach(element => {
      treeNode(element)?.search();
    });

    searchElementsRef.current = elements;
    updateSearchComment();
  }

  function suggestSelector(element: Element): string {
    let selector: string = '', currentElement: Element | null = element;
    while (currentElement) {
      let currentSelector: string;
      if (currentElement.id) {
        currentSelector = `#${currentElement.id}`;
        return selector ? `${currentSelector}>${selector}` : currentSelector;
      } else if (currentElement.classList.length) {
        currentSelector = `.${currentElement.classList.item(0)}`;
        return selector ? `${currentSelector}>${selector}` : currentSelector;
      }
      currentSelector = currentElement.tagName.toLowerCase();
      selector = selector ? `${currentSelector}>${selector}` : currentSelector;
      currentElement = currentElement.parentElement;
    }
    return selector;
  }

  function setComment(ref: React.MutableRefObject<HTMLElement | null>, value: string) {
    if (ref.current) {
      ref.current.innerHTML = value;
    }
  }

  function updateSearchComment() {
    setComment(searchCommentRef, searchElementsRef.current.length ?
        `<strong>${searchPositionRef.current + 1}</strong> of 
          <strong>${searchElementsRef.current.length}</strong> elements` : '');
  }

  function findElements() {
    const elements: Element[] = [];
    try {
      contentDocument?.documentElement
          .querySelectorAll(searchRef.current!.value)
          .forEach(element => elements.push(element));
      searchElements(elements);
      searchPositionRef.current = -1;
    } catch (e) {
      searchElements([]);
    }
  }

  function findNext() {
    if (searchElementsRef.current.length) {
      searchPositionRef.current = ( searchPositionRef.current + 1 ) % searchElementsRef.current.length;
      selectElement(searchElementsRef.current[searchPositionRef.current], 'search');
      updateSearchComment();
    }
  }

  function wrap<T>(action: () => T,
                   {
                     onFin, onFail
                   }: {
                     onFin?: () => any; onFail?: () => any;
                   } = {}): T | undefined {
    // wrap any script actions to catch errors
    try {
      setComment(editorErrorRef, '');
      return action();
    } catch (e: any) {
      setComment(editorCommentRef, '');
      setComment(editorErrorRef, e.toString());
      console.log(e);
      onFail?.();
      return undefined;
    } finally {
      onFin?.();
    }
  }

  function getScriptText(): string | undefined {
    return wrap(() => template?.getScriptText());
  }

  function verifyScript() {
    wrap(() => template?.getScript());
  }

  function transformScript(transformer: (...args: string[]) => void) {
    const length = transformer.length;

    transformerRef.current = transformer;
    transformerArgsRef.current = new Array(length);
    transformerArgNoRef.current = 0;

    if (!length) {
      doTransform();
    } else {
      receiveTransformArg(searchRef.current!.value);
    }
  }

  function clearTransform() {
    transformerRef.current = undefined;
    transformerArgsRef.current = undefined;
    transformerArgNoRef.current = undefined;
  }

  function doTransform() {
    if (transformerRef.current && transformerArgsRef.current &&
        transformerArgNoRef.current !== undefined) {
      wrap(() => {
        const transformer = transformerRef.current!.bind(template);
        const args = transformerArgsRef.current!
        transformer(...args);
        editorRef.current!.setText(template!.getScriptText());
      }, {
        onFin: clearTransform,
      });

      verifyScript();
    }
  }

  function askTransformArg() {
    if (transformerRef.current && transformerArgsRef.current &&
        transformerArgNoRef.current !== undefined) {

      wrap(() => {
        // show in comments 'enter arg ##' (since transformer is only
        // a function we can't access argument name, only count, probably
        // it's worth to add metadata for better hints)
        setComment(editorCommentRef!, `<strong>Enter arg #${transformerArgNoRef.current!}</strong>`);

        function __copyArgs() {
          return [...transformerArgsRef.current!.keys()].map((i: number) => {
            return i < transformerArgNoRef.current! ? transformerArgsRef.current![i] : '';
          });
        }

        function __copyTemplate() {
          return { ...template! };
        }

        // show where the transform parameter is;
        // implying %placeholder% is not in the initial script/arguments
        const args0 = __copyArgs();
        args0[transformerArgNoRef.current!] = '%placeholder%';
        const template0 = __copyTemplate();
        const transformer0 = transformerRef.current!.bind(template0);
        transformer0(...args0);
        editorRef.current!.setText(template0.getScriptText());

        const pos = editorRef.current!.find('%placeholder%') || [0, 0];
        const args1 = __copyArgs();
        const template1 = __copyTemplate();
        const transformer1 = transformerRef.current!.bind(template1);
        transformer1(...args1);
        editorRef.current!.setText(template1.getScriptText());
        editorRef.current!.setReadOnly(false);
        editorRef.current!.setCursor(pos);

        // if we change text within the range of arg, we extend / shrink
        // that range. if start going outside the range, or pressing tab,
        // editing is finished
        transformerArgRangeRef.current = [pos, pos];
        onChangeCallbackRef.current = (event: ChangeEvent) => {
          wrap(() => {
            const action = event.action;

            const [start, end] = event.range;
            const [startLine, startCol] = start;
            const [endLine, endCol] = end;

            const [curStart, curEnd] = transformerArgRangeRef.current!;
            const [curStartLine, curStartCol] = curStart;
            let [curEndLine, curEndCol] = curEnd;
            if (startLine === curStartLine && endLine === curEndLine &&
                ( ( action === 'insert' && curStartCol <= startCol && startCol <= curEndCol ) ||
                    ( action === 'remove' && curStartCol <= startCol && startCol <= curEndCol
                        && curStartCol <= endCol && endCol <= curEndCol ) ) &&
                event.lines[0] !== '\t') {
              if (action === 'insert') {
                curEndCol += ( endCol - startCol );
              } else {
                curEndCol -= ( endCol - startCol );
              }
              transformerArgRangeRef.current = [curStart, [curEndLine, curEndCol]];

              const args = __copyArgs();
              args[transformerArgNoRef.current!] = editorRef.current!.getTextAt(transformerArgRangeRef.current);
              const template = __copyTemplate();
              const transformer = transformerRef.current!.bind(template);
              transformer(...args);
              editorRef.current!.setText(template.getScriptText());
            } else {
              const arg = editorRef.current!.getTextAt(transformerArgRangeRef.current!);
              if (arg) {
                setComment(editorCommentRef, '');
                editorRef.current!.setReadOnly(true);
                editorRef.current!.setCursor(pos);
                editorRef.current!.off('change', onChangeCallbackRef.current!);
                editorRef.current!.off('blur', onBlurCallbackRef.current!);
                onChangeCallbackRef.current = undefined;
                onBlurCallbackRef.current = undefined;
                receiveTransformArg(arg);
              } else {
                // argument cannot be empty, restore text and ask again
                const args = __copyArgs();
                const template = __copyTemplate();
                const transformer = transformerRef.current!.bind(template);
                transformer(...args);
                setComment(editorCommentRef, '<strong>Argument cannot be empty. Continue editing...</strong>');
                editorRef.current!.setText(template.getScriptText());
                editorRef.current!.setCursor(pos);
              }
            }
          });
        };
        onBlurCallbackRef.current = () => {
          setComment(editorCommentRef, '');
          editorRef.current!.setReadOnly(true);
          editorRef.current!.off('change', onChangeCallbackRef.current!);
          editorRef.current!.off('blur', onBlurCallbackRef.current!)
          onBlurCallbackRef.current = undefined;
          onBlurCallbackRef.current = undefined;
          clearTransform();
        }
        editorRef.current!.on('change', onChangeCallbackRef.current);
        editorRef.current!.on('blur', onBlurCallbackRef.current);
      }, {
        onFail: () => {
          // TODO restore text & readonly, clean everything
        }
      });
    }
  }

  function receiveTransformArg(arg: string) {
    if (transformerRef.current && transformerArgsRef.current &&
        transformerArgNoRef.current !== undefined) {
      transformerArgsRef.current[transformerArgNoRef.current] = arg;
      transformerArgNoRef.current++;

      // if got the last argument, execute transformer
      if (transformerArgNoRef.current >= transformerArgsRef.current!.length) {
        doTransform();
      } else {
        askTransformArg();
      }
    }
  }

  function appendResult(message: string, type: 'message' | 'error' | 'warning' = 'message') {
    // append result in console-log style, will do it
    // in pure JS to skip react's re-rendering
    const messageElement = document.createElement('span');
    if (type === 'error') {
      messageElement.style.color = 'maroon';
    } else if (type === 'warning') {
      messageElement.style.color = 'orange';
    }
    messageElement.append(document.createTextNode(message));
    messageElement.append(document.createElement('br'));
    resultElementRef.current?.appendChild(messageElement);
    scrollToVisible(messageElement, resultElementRef.current);
  }

  function appendRequest(request: WebcrawlerRequest) {
    let messageElement: HTMLSpanElement | null | undefined;
    // check if already had a request with this URL
    messageElement = resultElementRef.current?.querySelector(`[data-url="${request.url}"]`);
    if (messageElement) {
      const multiplierElement = messageElement.querySelector('.multiplier')!;
      const x = parseInt(multiplierElement.textContent?.substring(1) || "1") + 1;
      multiplierElement.textContent = `×${x}`;
    } else {
      messageElement = document.createElement('span');
      messageElement.setAttribute('data-url', request.url);
      const statusElement = document.createElement('span');
      statusElement.classList.add('status', 'pending');
      statusElement.append(document.createTextNode('...'));
      messageElement.append(statusElement);
      const multiplierElement = document.createElement('span');
      multiplierElement.classList.add('multiplier');
      messageElement.append(multiplierElement);
      const urlElement = document.createElement('a');
      urlElement.href = request.url;
      urlElement.target = '_blank';
      urlElement.append(document.createTextNode(request.url));
      messageElement.append(urlElement);
      messageElement.append(document.createElement('br'));
      resultElementRef.current?.appendChild(messageElement);
    }
    scrollToVisible(messageElement, resultElementRef.current);
  }

  function appendResponse(response: WebcrawlerResponse) {
    const messageElement = resultElementRef.current?.querySelector(`[data-url="${response.url}"]`);
    if (messageElement) {
      const statusElement = messageElement.querySelector('.status')!;
      statusElement.classList.remove('pending');
      statusElement.classList.add(`code${Math.floor(response.status / 100)}xx`);
      statusElement.textContent = `${response.status}`;
      scrollToVisible(messageElement, resultElementRef.current);
    }
  }

  function clearResult() {
    while (resultElementRef.current?.hasChildNodes()) {
      resultElementRef.current.removeChild(resultElementRef.current.lastChild!);
    }
  }

  function executeScript(): Promise<ValueType[][]> {
    // make result visible
    if (resultElementRef.current!.getActualSize()! < 100) {
      resultElementRef.current!.setActualSize(100);
    }

    clearResult();
    propagateChangesToTemplate();

    // save template asynchronously
    saveTemplate(template!)
        .then(() => appendResult(`Script template saved as ${template!.name}`))
        .catch((e) => appendResult(`Error saving script template: ${e.toString()}`, 'error'));

    // currently we can only execute a script at proxy
    appendResult(`Executing script at proxy...`);
    return promiseRef.current = Webcrawler.start()
        .then(() => Webcrawler.run(template!.getScriptText(), {
          onRequest: appendRequest,
          onResponse: appendResponse,
        }))
        .then((result) => {
          // get the title of the page **after** script had been
          // executed, as a default name of the DS
          return Webcrawler.callPageMethod('title')
              .then((title) => {
                return { result, title };
              });
        })
        .then(({ result, title }) => {
          resultRef.current = result;
          titleRef.current = title;

          clearResult();
          appendResult(JSON.stringify(result));
          return result;
        })
        .catch((e) => {
          clearResult();
          appendResult(e.toString(), 'error');
          console.log(e);
          throw new ValidationError(e.toString());
        })
        .finally(() => {
          promiseRef.current = undefined;
          Webcrawler.stop();
        });
  }

  function propagateChangesToTemplate() {
    if (!isTemplateTrueRef.current && editorRef.current && template) {
      // template is no longer the source of truth, since we have edited script
      // in the editor box. we should replace template content with the
      // editor box content
      template.text = editorRef.current!.getText();

      // remove all transformer methods since they are no longer relevant
      Object.keys(template).filter((k) => k.startsWith('$')).forEach((k) => {
        delete ( template as any )[k];
      });
    }
  }

  function reloadProxy() {
    setState({ ...state, loading: true });
    ( proxySessionId ? API.del(`/proxy/${proxySessionId}`) : Promise.resolve() )
        .then(() => API.get(`/proxy/session`))
        .then(data => data.session)
        .then(proxySessionId => {
          setState({
            ...state,
            proxySessionId,
            proxyUrl: `/proxy/${proxySessionId}/visit/${encodeURIComponent(url!.toString())}`,
          });
        });
  }

  const { url, template, libs, saveTemplate, setRef } = props;
  const { loading, contentDocument, proxySessionId, proxyUrl } = state;

  setRef({
    getResult(): Promise<ValueType[][]> {
      if (resultRef.current) {
        return Promise.resolve(resultRef.current);
      }

      if (promiseRef.current) {
        return promiseRef.current;
      }

      return executeScript();
    },

    getTitle(): string | undefined {
      return titleRef.current;
    },

    isSaveTemplate(): boolean {
      return true;
    },
  });

  useEffect(() => {
    if (url) {
      reloadProxy();
    }
  }, [url?.toString()]);

  useEffect(() => {
    if (contentDocument) {
      contentDocument.addEventListener('mouseover', (event) => {
        if (( event.target as any ).nodeType === Node.ELEMENT_NODE &&
            event.target != highlightRef.current) {
          highlightElement(event.target as Element);
          event.stopPropagation();
        }
      });
      contentDocument.body.style.cursor = 'pointer';
      contentDocument.addEventListener('click', (event) => {
        if (( event.target as any ).nodeType === Node.ELEMENT_NODE &&
            event.target != highlightRef.current) {
          selectElement(event.target as Element, 'view');
          event.stopPropagation();
        }
      })
      iframeRef.current?.addEventListener('mouseout', blurElement);
      return () => iframeRef.current?.removeEventListener('mouseout', blurElement);
    }
    return undefined;
  }, [contentDocument]);

  useEffect(() => {
    if (url && template) {
      wrap(() => {
        template.setUrl(url.toString());
        editorRef.current?.setText(template.getScriptText());
      });

      verifyScript();
    }
  }, [url, template]);

  useEffect(() => {
    isTemplateTrueRef.current = true;
    editorRef.current?.on('blur', propagateChangesToTemplate);
    return () => editorRef.current?.off('blur', propagateChangesToTemplate);
  }, [template]);

  return <div className="block-container-horizontal">
    <Block key="view" className="block new-dialog-screen-stretch site-view"
           size="50%" splitter="vertical" allowChangeSize={false}>
      <Toolbox>
        <ToolboxButton key="back" src={Icon.back} alt="Go back"
                        onClick={() => {
                          setState({
                            ...state,
                            loading: true,
                            proxyUrl: `/proxy/${proxySessionId}/go-back`
                          });
                        }}/>
        <ToolboxButton key="refresh" src={Icon.refresh} alt="Refresh"
                        onClick={() => {
                          reloadProxy();
                        }}/>
        <ToolboxButton key="forward" src={Icon.forward} alt="Go forward"
                        onClick={() => {
                          setState({
                            ...state,
                            loading: true,
                            proxyUrl: `/proxy/${proxySessionId}/go-forward`
                          });
                        }}/>
      </Toolbox>
      <Loader loading={loading}/>
      <iframe
          ref={iframeRef}
          src={proxyUrl}
          onLoad={() => {
            setState({
              ...state,
              loading: false,
              contentDocument: iframeRef.current?.contentDocument || undefined,
            });
          }}
      />
    </Block>
    <Block key="combine"
           className="block new-dialog-screen-stretch block-container-vertical">
      {
          contentDocument && template && <>
            <Block ref={treeContainerRef} key="tree"
                   className="block site-html-tree-block"
                   size="50%" splitter="horizontal"
            >
              <HTMLTree
                  ref={treeRef}
                  className="site-html-tree"
                  node={contentDocument.documentElement}
                  container={treeContainerRef.current || undefined}
                  highlightElement={highlightElement}
                  blurElement={blurElement}
                  selectElement={(element) => {
                    selectElement(element, 'tree');
                  }}
              />
            </Block>
            <Block key="search" size="content" splitter="horizontal" allowChangeSize={false}>
              <Block key="search">
                <wired-search-input
                    ref={searchRef}
                    style={{ width: '100%' }}
                    placeholder="css selector"
                    onchange={() => {
                      findElements();
                    }}
                    onclose={() => {
                      searchElements([]);
                    }}
                    onKeyUp={(event) => {
                      // on Enter we move to the next found element
                      // (better to do navigation with arrows up and down,
                      // but our search component does not support it so far)
                      if (event.key === 'Enter') {
                        findNext();
                      }
                    }}
                />
                <span ref={searchCommentRef} className="comment"></span>
              </Block>
              <Block key="transform">
                {
                  Object.entries(template)
                      .filter(([key]) => key.startsWith('$'))
                      .map(([key, value]) => (
                          <Uniselector
                              selected={false}
                              onClick={() => transformScript(value)}>
                            {key.substring(1)}
                          </Uniselector>
                      ))
                }
              </Block>
            </Block>
            <Block key="script"
                   className="block script-block block-container-vertical"
                   style={{ overflow: 'visible' }}>
              <Block key="script" style={{ overflow: 'visible' }}>
                <WebCrawlerScriptToolbox
                    ref={scriptToolboxStateRef}
                    template={template}
                    executeScript={executeScript}
                    lockScript={() => {
                      editorRef.current!.setReadOnly(true);
                    }}
                    unlockScript={() => {
                      editorRef.current!.setReadOnly(false);
                      editorRef.current!.focus();
                      isTemplateTrueRef.current = false;
                    }}
                />
                <Editor
                    ref={editorRef}
                    id="script"
                    className="script"
                    text={getScriptText() || ''}
                    readonly={scriptToolboxStateRef.current ? scriptToolboxStateRef.current.isLocked : true}
                    libs={libs} language={'javascript'}                />
              </Block>
              <Block key="comment" style={{ overflow: 'visible' }} size="content">
                <span ref={editorCommentRef} className="comment"></span>
                <span ref={editorErrorRef} className="field-error"></span>
              </Block>
            </Block>
            <Block key="result" ref={resultElementRef} splitter="up"
                   className="block script-result-block">
            </Block>
          </>
      }
    </Block>
  </div>;
}

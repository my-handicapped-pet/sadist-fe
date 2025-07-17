import React, { useState } from 'react';
import '../../css/index.scss';
import './common/CustomElement';
import Uniselector from './common/Uniselector';
import { WiredHistogram, WiredGlobe } from '/wired-elements/lib/wired-elements';
import { renderPage } from '../helper/react-helper';

const ComponentDemo = () => {

  const demo: { [key in keyof JSX.IntrinsicElements]?: JSX.Element } = {
    'wired-combo-lazy': function () {
      function getValues() {
        let s = new Date();
        let values = [...Array(50000).keys()].map((i) => ( { value: `${i}`, text: `Item ${i}` } ))
        // @ts-ignore
        let t = new Date() - s;
        console.log(t);
        return values;
      }

      React.useEffect(() => {
        setTimeout(() =>
                document.getElementById("combo")?.focus(),
            100);
      });

      return <>
        <wired-combo-lazy
            id='combo'
            values={getValues()}
            onselected={e => console.log(e.detail)}
        >
        </wired-combo-lazy>
      </>
    }(),
    'wired-slider': function () {
      return <>
        <wired-slider min={0} max={100000} onchange={e => console.log(e.detail)}/>
      </>
    }(),
    'wired-dual-slider': function () {
      return <>
        <wired-dual-slider
            style={{ '--wired-slider-left-knob-color': 'rgb(0, 0, 0)' }}
            min={0} max={100000}
            label-enabled={true}
            onchange={e => console.log(e.detail)}/>
        <div>this text mustn't overlap the slider</div>
      </>
    }(),
    'wired-combo': function () {

      React.useEffect(() => {
        setTimeout(() =>
                document.getElementById("combo")?.focus(),
            100);
      });

      return <>
        <wired-combo id='combo' selected="banana">
          <wired-item value="banana">Banana</wired-item>
          <wired-item value="apple">Apple</wired-item>
          <wired-item value=''>Some fruit with a long name a</wired-item>
        </wired-combo>
      </>
    }(),
    'wired-histogram': function () {

      const ref1 = React.useRef<WiredHistogram | null>(null);
      const ref2 = React.useRef<WiredHistogram | null>(null);
      const ref3 = React.useRef<WiredHistogram | null>(null);
      React.useEffect(() => {
        if (ref1.current) {
          ref1.current.data = [
            {
              id: 'Apple',
              values: { count: 300 },
              selected: isSelected('Apple'),
            },
            {
              id: 'Banana',
              values: { count: 1000 },
              selected: isSelected('Banana'),
            },
            {
              id: 'Cherry',
              values: { count: 200 },
              selected: isSelected('Cherry'),
            }
          ];
        }
      });
      React.useEffect(() => {
        if (ref2.current) {
          ref2.current.data = [
            {
              id: 'Apple',
              values: { 'on counter': 300, 'sold out': 120, 'stolen': 290 },
            },
            {
              id: 'Banana',
              values: { 'on counter': 500, 'sold out': 290, 'stolen': 200 },
            },
            {
              id: 'Cherry',
              values: { 'on counter': 100, 'sold out': 100, 'stolen': 0 },
            }
          ];
        }
      });
      React.useEffect(() => {
        if (ref3.current) {
          ref3.current.data = [
            {
              id: 'Mexico City',
              values: { elevation: 2537 },
            },
            {
              id: 'Gulf of Mexico',
              values: { elevation: -1585 },
            },
            {
              id: 'Indian Ocean',
              values: { elevation: -9911 },
            }
          ];
        }
      });

      const [selected, setSelected] = React.useState<string | null>(null);
      const isSelected = (str: string): boolean => selected === str;

      return <>
        <div style={{ width: '300px', display: 'inline-block' }}>
          <p>Single-parameter histogram</p>
          <br/>
          <wired-histogram ref={ref1} onselected={(e) => setSelected(e.detail.id)}>
          </wired-histogram>
        </div>
        <div style={{ width: '300px', display: 'inline-block' }}>
          <p>Multi-parameter histogram</p>
          <br/>
          <wired-histogram ref={ref2}>
          </wired-histogram>
        </div>
        <div style={{ width: '300px', display: 'inline-block' }}>
          <p>Histogram with negative values</p>
          <br/>
          <wired-histogram ref={ref3}>
          </wired-histogram>
        </div>
      </>
    }(),
    'wired-globe': function () {
      const ref = React.useRef<WiredGlobe | null>(null);

      React.useEffect(() => {
        if (ref.current) {
          ref.current.data = [
            {
              id: { id: 1, name: 'Moscow', loc: { type: 'Point', coordinates: [ 37.61556, 55.75222 ] }},
              values: { count: 2 },
              label: 'Moscow',
            },
            {
              id: { id: 2, name: 'Paris', loc: { type: 'Point', coordinates: [ 2.3488, 48.85341 ] }},
              values: { count: 1 },
              label: 'Parix',
            },
            {
              id: { id: 3, name: 'New York', loc: { type: 'Point', coordinates: [ -74.00597, 40.71427 ] }},
              values: { count: 1 },
              label: 'New York',
            }
          ];
        }
      });

      return <>
        <wired-globe
            ref={ref}
            style={{ width: '600px' }}
        >
        </wired-globe>
      </>
    }(),
  }

  const [demoKey, setDemoKey] = useState<keyof JSX.IntrinsicElements | undefined>();

  return <>
    {Object.keys(demo).map(
        (key) => <Uniselector
            key={key}
            selected={demoKey == key}
            onClick={() => setDemoKey(key as keyof JSX.IntrinsicElements)}
        >{key}</Uniselector>
    )}
    <br/>
    <br/>
    {demoKey ? demo[demoKey] : 'Select component'}
  </>
}

renderPage(<ComponentDemo/>);

export default ComponentDemo;

import { createRoot } from 'react-dom/client';

export function renderPage(element: React.JSX.Element) {
  const wrapper = document.getElementById('container');
  if (!wrapper) {
    throw new Error('React application fail due to missing <div id="container">');
  }
  const root = createRoot(wrapper);
  root.render(element);
}

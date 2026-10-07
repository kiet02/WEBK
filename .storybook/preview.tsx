import type { Preview } from '@storybook/nextjs-vite';
import '../src/app/globals.css';

// Fix for axe-core / @storybook/addon-a11y bug with CSS Color 4 "none" keyword in oklch()
// Modern Chromium serializes achromatic oklch hue as "none" (e.g. oklch(0.985 0 none)),
// which causes axe-core color parser to throw "Could not parse color string oklch(...)".
if (typeof window !== 'undefined') {
  const originalGetComputedStyle = window.getComputedStyle;
  window.getComputedStyle = function (elt: Element, pseudoElt?: string | null) {
    const style = originalGetComputedStyle.call(window, elt, pseudoElt);
    return new Proxy(style, {
      get(target, prop, receiver) {
        const val = Reflect.get(target, prop, receiver);
        if (typeof val === 'string' && val.includes('oklch') && val.includes('none')) {
          return val.replace(/\bnone\b/g, '0');
        }
        if (typeof val === 'function') {
          return function (...fnArgs: unknown[]) {
            const res = Reflect.apply(val, target, fnArgs);
            if (typeof res === 'string' && res.includes('oklch') && res.includes('none')) {
              return res.replace(/\bnone\b/g, '0');
            }
            return res;
          };
        }
        return val;
      },
    });
  };
}

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
       color: /(background|color)$/i,
       date: /Date$/i,
      },
    },

    a11y: {
      // 'todo' - show a11y violations in the test UI only
      // 'error' - fail CI on a11y violations
      // 'off' - skip a11y checks entirely
      test: 'todo'
    }
  },
};

export default preview;
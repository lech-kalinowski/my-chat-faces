import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const context = {};
runInNewContext(readFileSync(new URL('../readability.js', import.meta.url), 'utf8'), context);
const guard = context.ChatFacesReadability;
const rgba = (hex, alpha, back) => {
  const channel = (s, n) => parseInt(s.slice(n, n + 2), 16);
  return '#' + [1, 3, 5].map(n => Math.round(channel(hex, n) * alpha + channel(back, n) * (1-alpha)).toString(16).padStart(2,'0')).join('');
};

test('invalid and absent stored settings are safe', () => {
  for (const value of [null, undefined, false, 42, 'invalid', {}, {surfaceOpacity:NaN}]) {
    const result = guard.resolveReadability(value);
    assert.equal(Object.keys(result.surfaces).length, 7);
    for (const surface of Object.values(result.surfaces)) assert.ok(surface.contrast >= 4.5);
  }
});

test('contrast remains readable after alpha compositing over light, dark and colored images', () => {
  const colors = ['#000000','#ffffff','#777777','#227864','#1e1e32','#845ec2','#c34a36','#f9a826'];
  let checked = 0;
  for (const color of colors) for (const preferred of colors) for (const opacity of [25,55,75,95]) {
    const result = guard.resolveReadability({userBubbleColor:color,assistantBubbleColor:color,textColor:preferred,surfaceOpacity:opacity});
    for (const surface of Object.values(result.surfaces)) for (const backdrop of colors) {
      assert.ok(guard.contrastRatio(surface.textColor, rgba(color, surface.opacity, backdrop)) >= 4.5,
        `${preferred} on ${color}, alpha ${surface.opacity}, backdrop ${backdrop}`);
      checked++;
    }
  }
  assert.equal(checked, 14336);
});

test('mixed light and dark message surfaces receive independent text colors', () => {
  const result = guard.resolveReadability({userBubbleColor:'#ffffff',assistantBubbleColor:'#000000',textColor:'#ffffff',surfaceOpacity:25});
  assert.equal(result.surfaces.user.textColor, '#000000');
  assert.equal(result.surfaces.assistant.textColor, '#ffffff');
});

test('safe preferred colors are preserved', () => {
  const result=guard.resolveReadableSurface('#fff7eb','#23222a',0.95);
  assert.equal(result.textColor,'#fff7eb');
  assert.equal(result.opacity,0.95);
  assert.equal(result.adjustedText,false);
});

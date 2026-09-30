'use strict';
document.querySelectorAll('[data-year]').forEach(el => { el.textContent = new Date().getFullYear(); });
const buttons = document.querySelectorAll('[data-demo]');
function selectDemo(name) {
  buttons.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.demo === name)));
  document.querySelectorAll('.demo').forEach(p => { p.hidden = p.id !== `demo-${name}`; });
}
buttons.forEach(b => b.addEventListener('click', () => selectDemo(b.dataset.demo)));
if (buttons.length) {
  const requested = new URLSearchParams(location.search).get('demo');
  if (Array.from(buttons).some(button => button.dataset.demo === requested)) selectDemo(requested);
  const touch = document.getElementById('touch-button');
  const glow = document.getElementById('glow');
  let touched = false;
  function updateTouch() {
    touch.style.setProperty('--glow', touched ? Number(glow.value)/100 : .15);
    touch.setAttribute('aria-pressed', String(touched));
    touch.setAttribute('aria-label', touched ? 'Deactivate the jellyfish light' : 'Activate the jellyfish light');
    document.getElementById('glow-value').textContent = `${glow.value}%`;
    document.getElementById('touch-status').textContent = touched ? `Responding · ${glow.value}% glow · tap to rest` : 'Resting · tap the jellyfish to activate';
  }
  touch.addEventListener('click', () => { touched = !touched; updateTouch(); });
  glow.addEventListener('input', updateTouch);
  updateTouch();
  function updateShelf() {
    const count = Number(document.getElementById('dividers').value);
    const width = Number(document.getElementById('shelf-width').value);
    document.getElementById('dividers-value').textContent = count;
    document.getElementById('width-value').textContent = `${width} cm`;
    const preview = document.getElementById('shelf-preview');
    preview.replaceChildren(...Array.from({length:count}, () => document.createElement('i')));
    preview.style.width = `${width/180*90}%`;
    preview.setAttribute('aria-label', `Schematic shelf with ${count} vertical dividers, ${width} centimetres wide`);
    document.getElementById('shelf-status').textContent = `${count} dividers · ${width} cm wide`;
    document.getElementById('shelf-code').textContent = `const width = ${width}; // cm\nconst dividers = ${count};\nconst spacing = width / (dividers - 1);\n// ${(width/(count-1)).toFixed(1)} cm between divider centres`;
  }
  ['dividers','shelf-width'].forEach(id => document.getElementById(id).addEventListener('input',updateShelf));
  updateShelf();

}

// The draft settings and displayed LEDs stay separate until show() is requested.
const ledStrip = document.getElementById('led-strip');
if (ledStrip) {
  const LED_COUNT = 10;
  const colorInput = document.getElementById('led-color');
  const brightnessInput = document.getElementById('led-brightness');
  const targetInput = document.getElementById('led-target');
  const code = document.getElementById('led-code');
  const pending = document.getElementById('led-pending');
  let selected = 0;
  let displayed = Array.from({length:LED_COUNT}, () => [0,0,0]);
  function rgb() {
    return [1,3,5].map(start => parseInt(colorInput.value.slice(start,start+2),16));
  }
  function sketch() {
    const values = rgb();
    const assignment = targetInput.value === 'all'
      ? `  for (int i = 0; i < NUM_LEDS; i++) {\n    leds[i] = CRGB(${values.join(', ')});\n  }`
      : `  leds[${selected}] = CRGB(${values.join(', ')});`;
    return `#include "FastLED.h"\n\n// How many LEDs are in your strip?\n#define NUM_LEDS ${LED_COUNT}\n#define DATA_PIN 2\n\n// Create the array of LEDs\nCRGB leds[NUM_LEDS];\n\nvoid setup() {\n  FastLED.addLeds<NEOPIXEL, DATA_PIN>(leds, NUM_LEDS);\n  FastLED.setBrightness(${brightnessInput.value});\n}\n\nvoid loop() {\n  FastLED.clear();\n${assignment}\n  FastLED.show();\n}`;
  }
  const pixels = Array.from({length:LED_COUNT}, (_,index) => {
    const pixel = document.createElement('button');
    pixel.type = 'button';
    pixel.className = 'led-pixel';
    pixel.textContent = index;
    pixel.addEventListener('click', () => { selected=index; targetInput.value='one'; updateDraft(); });
    return pixel;
  });
  ledStrip.replaceChildren(...pixels);
  function renderPixels() {
    pixels.forEach((pixel,index) => {
      const values = displayed[index];
      const lit = values.some(value => value > 0);
      pixel.style.setProperty('--pixel-color', lit ? `rgb(${values.join(',')})` : '#34423b');
      pixel.classList.toggle('lit',lit);
      pixel.setAttribute('aria-pressed',String(index===selected));
      pixel.setAttribute('aria-label',`Pixel ${index}, ${lit ? `RGB ${values.join(', ')}` : 'off'}`);
    });
  }
  function updateDraft() {
    document.getElementById('led-rgb').textContent = rgb().join(', ');
    document.getElementById('led-brightness-value').textContent = `${brightnessInput.value}%`;
    code.textContent = sketch();
    pending.textContent = 'Code updated. Press Send to LEDs to apply it.';
    document.getElementById('led-copy-status').textContent = '';
    renderPixels();
  }
  function send() {
    const values = rgb().map(value => Math.round(value*Number(brightnessInput.value)/100));
    displayed = displayed.map((_,index) => targetInput.value==='all'||index===selected ? [...values] : [0,0,0]);
    renderPixels();
    pending.textContent = 'show() sent the colours to the preview.';
    document.getElementById('led-status').textContent = `${targetInput.value==='all' ? `All ${LED_COUNT} pixels` : `Pixel ${selected}`} · RGB ${values.join(', ')} · other pixels off`;
    if(targetInput.value==='all') document.getElementById('led-status').textContent = `All ${LED_COUNT} pixels · RGB ${values.join(', ')}`;
  }
  [colorInput,brightnessInput].forEach(input => input.addEventListener('input',updateDraft));
  targetInput.addEventListener('change',updateDraft);
  document.getElementById('led-send').addEventListener('click',send);
  document.getElementById('led-reset').addEventListener('click',() => {
    selected=0;colorInput.value='#d9f46b';brightnessInput.value='20';targetInput.value='one';
    displayed=displayed.map(()=>[0,0,0]);updateDraft();
    document.getElementById('led-status').textContent='All pixels off · select a colour to begin';
    pending.textContent='Reset. Press Send to LEDs to run the sketch.';
  });
  document.getElementById('led-copy').addEventListener('click',async () => {
    const snapshot=code.textContent;
    try {
      await navigator.clipboard.writeText(snapshot);
      document.getElementById('led-copy-status').textContent=code.textContent===snapshot?' Sketch copied.':' Earlier sketch copied; copy again for the latest values.';
    } catch {
      const range=document.createRange();range.selectNodeContents(code);
      const selection=window.getSelection();selection.removeAllRanges();selection.addRange(range);
      document.getElementById('led-copy-status').textContent=' Select and copy the highlighted sketch manually.';
    }
  });
  updateDraft();
  pending.textContent='Ready. Press Send to LEDs to run the sketch.';
  document.getElementById('led-status').textContent='All pixels off · select a colour to begin';
}

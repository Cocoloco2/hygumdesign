'use strict';
(() => {
  const get = id => document.getElementById(id);
  const input = get('input-button');
  if (!input) return;
  get('button-code').textContent = `const int BUTTON_PIN = 2;

void setup() {
  pinMode(BUTTON_PIN, INPUT_PULLUP);
  pinMode(LED_BUILTIN, OUTPUT);
}

void loop() {
  bool pressed = digitalRead(BUTTON_PIN) == LOW;
  digitalWrite(LED_BUILTIN, pressed ? HIGH : LOW);
}`;
  let pointerHeld = false;
  let keyHeld = false;
  function renderButton() {
    const held = pointerHeld || keyHeld;
    input.classList.toggle('held', held);
    get('button-light').style.setProperty('--level', held ? 1 : 0);
    get('button-light').setAttribute('aria-label', `Built-in LED ${held ? 'on' : 'off'}`);
    get('button-status').textContent = held ? 'Pressed · pin 2 reads LOW · LED on' : 'Released · pin 2 reads HIGH · LED off';
  }
  function release() { pointerHeld = false; keyHeld = false; renderButton(); }
  input.addEventListener('pointerdown', event => {
    if (event.button !== 0 || !event.isPrimary) return;
    pointerHeld = true;
    input.setPointerCapture(event.pointerId);
    renderButton();
  });
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(type => input.addEventListener(type, () => { pointerHeld = false; renderButton(); }));
  input.addEventListener('keydown', event => {
    if (event.code === 'Space' || event.code === 'Enter') { event.preventDefault(); keyHeld = true; renderButton(); }
  });
  input.addEventListener('keyup', event => {
    if (event.code === 'Space' || event.code === 'Enter') { event.preventDefault(); keyHeld = false; renderButton(); }
  });
  input.addEventListener('blur', release);
  window.addEventListener('blur', release);
  renderButton();

  function updatePot() {
    const value = Number(get('pot-value').value);
    const pwm = Math.floor(value * 255 / 1023);
    get('pot-value-output').textContent = value;
    get('pot-dial').style.setProperty('--angle', `${-135 + value / 1023 * 270}deg`);
    get('pot-light').style.setProperty('--level', pwm / 255);
    get('pot-light').setAttribute('aria-label', `LED at PWM ${pwm} of 255`);
    get('pot-status').textContent = `A0: ${value} · PWM: ${pwm} / 255`;
    get('pot-mapping').textContent = `map(${value}, 0, 1023, 0, 255) → ${pwm}`;
    get('pot-code').textContent = `const int POT_PIN = A0;
const int LED_PIN = 9; // PWM-capable pin

void setup() {
  pinMode(LED_PIN, OUTPUT);
}

void loop() {
  int reading = analogRead(POT_PIN); // preview: ${value}
  int brightness = map(reading, 0, 1023, 0, 255);
  analogWrite(LED_PIN, brightness); // preview: ${pwm}
}`;
    get('pot-copy-status').textContent = '';
  }
  get('pot-value').addEventListener('input', updatePot);
  updatePot();

  let position = 0;
  let timer = null;
  const chasePixels = Array.from({length:8}, (_,index) => {
    const pixel = document.createElement('span');
    pixel.className = 'led-pixel';
    pixel.textContent = index;
    pixel.setAttribute('aria-hidden','true');
    return pixel;
  });
  get('chase-strip').replaceChildren(...chasePixels);
  function chaseRGB() {
    const color = get('chase-color').value;
    return [1,3,5].map(start => Math.round(parseInt(color.slice(start,start+2),16)*0.2));
  }
  function renderChase() {
    const rgb = chaseRGB();
    chasePixels.forEach((pixel,index) => {
      pixel.style.setProperty('--pixel-color', index === position ? `rgb(${rgb.join(',')})` : '#34423b');
      pixel.classList.toggle('lit', index === position && rgb.some(value => value > 0));
    });
    get('chase-strip').setAttribute('aria-label', `Chase at pixel ${position}, RGB ${rgb.join(', ')}`);
    get('chase-status').textContent = `${timer === null ? 'Paused' : 'Playing'} · pixel ${position} · next ${(position+1)%8}`;
    get('chase-play').textContent = timer === null ? 'Play chase' : 'Pause chase';
    get('chase-play').setAttribute('aria-pressed', String(timer !== null));
  }
  function advance() { position = (position + 1) % 8; renderChase(); }
  function pause() { if (timer !== null) clearInterval(timer); timer = null; renderChase(); }
  function play() { timer = setInterval(advance, Number(get('chase-speed').value)); renderChase(); }
  function updateChaseCode() {
    const delay = Number(get('chase-speed').value);
    const rgb = chaseRGB();
    get('chase-speed-output').textContent = `${delay} ms`;
    get('chase-code').textContent = `#include <Adafruit_NeoPixel.h>

const int DATA_PIN = 6;
const int PIXEL_COUNT = 8;
const unsigned long STEP_MS = ${delay};
Adafruit_NeoPixel pixels(PIXEL_COUNT, DATA_PIN, NEO_GRB + NEO_KHZ800);
int position = 0;
unsigned long lastStep = 0;

void drawFrame() {
  pixels.clear();
  pixels.setPixelColor(position, ${rgb.join(', ')});
  pixels.show();
}

void setup() {
  pixels.begin();
  drawFrame(); // start at pixel 0
  lastStep = millis();
}

void loop() {
  unsigned long now = millis();
  if (now - lastStep >= STEP_MS) {
    lastStep = now;
    position = (position + 1) % PIXEL_COUNT;
    drawFrame();
  }
}`;
    get('chase-copy-status').textContent = '';
    renderChase();
  }
  get('chase-play').addEventListener('click', () => { if (timer === null) play(); else pause(); });
  get('chase-step').addEventListener('click', () => { pause(); advance(); });
  get('chase-reset').addEventListener('click', () => { pause(); position = 0; renderChase(); });
  get('chase-color').addEventListener('input', updateChaseCode);
  get('chase-speed').addEventListener('input', () => {
    const wasPlaying = timer !== null;
    pause(); updateChaseCode();
    if (wasPlaying) play();
  });
  document.querySelectorAll('[data-demo]').forEach(button => button.addEventListener('click', () => { if (button.dataset.demo !== 'chase') pause(); release(); }));
  document.addEventListener('visibilitychange', () => { if (document.hidden) { pause(); release(); } });
  window.addEventListener('pagehide', () => { pause(); release(); });
  updateChaseCode();

  document.querySelectorAll('[data-copy-lesson]').forEach(button => button.addEventListener('click', async () => {
    const name = button.dataset.copyLesson;
    const code = get(`${name}-code`);
    const snapshot = code.textContent;
    try {
      await navigator.clipboard.writeText(snapshot);
      get(`${name}-copy-status`).textContent = snapshot === code.textContent ? 'Arduino sketch copied.' : 'Earlier sketch copied. Copy again for the current values.';
    } catch {
      const range = document.createRange(); range.selectNodeContents(code);
      const selection = window.getSelection(); selection.removeAllRanges(); selection.addRange(range);
      get(`${name}-copy-status`).textContent = 'Select and copy the highlighted sketch manually.';
    }
  }));
})();

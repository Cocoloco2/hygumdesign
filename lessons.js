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

  const CHASE_LED_COUNT = 10;
  const chaseColorInput = get('chase-color');
  const chaseColorButtons = Array.from(document.querySelectorAll('[data-chase-color]'));
  const starterColors = {
    1: [255, 64, 64],
    2: [75, 214, 109],
    4: [77, 163, 255]
  };
  const chasePattern = Array.from({length:CHASE_LED_COUNT}, (_, index) => ({
    active: Boolean(starterColors[index]),
    color: starterColors[index] || [217, 244, 107]
  }));
  let selectedPatternIndex = 1;
  let chaseOffset = 0;
  let timer = null;
  const chasePixels = Array.from({length:CHASE_LED_COUNT}, (_,index) => {
    const pixel = document.createElement('span');
    pixel.className = 'led-pixel';
    pixel.textContent = index;
    pixel.setAttribute('aria-hidden','true');
    return pixel;
  });
  get('chase-strip').replaceChildren(...chasePixels);
  const chasePatternButtons = Array.from({length:CHASE_LED_COUNT}, (_, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'led-pixel chase-pattern-led';
    button.textContent = index;
    button.addEventListener('click', () => {
      selectedPatternIndex = index;
      renderPatternEditor();
    });
    return button;
  });
  get('chase-pattern').replaceChildren(...chasePatternButtons);
  function rgbToHex(rgb) {
    return `#${rgb.map(value => value.toString(16).padStart(2, '0')).join('')}`;
  }
  function hexToRgb(hex) {
    return [1,3,5].map(start => parseInt(hex.slice(start,start+2),16));
  }
  function rainbowRgb(step, count) {
    const hue = count < 2 ? 0 : step / count * 6;
    const section = Math.floor(hue);
    const fraction = hue - section;
    const rising = Math.round(fraction * 255);
    const falling = 255 - rising;
    return [
      [255, rising, 0], [falling, 255, 0], [0, 255, rising],
      [0, falling, 255], [rising, 0, 255], [255, 0, falling]
    ][section % 6];
  }
  function syncChaseColors() {
    const selected = rgbToHex(chasePattern[selectedPatternIndex].color);
    chaseColorInput.value = selected;
    get('chase-color-output').textContent = selected.toUpperCase();
    chaseColorButtons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.chaseColor === selected)));
  }
  function activePattern() {
    return chasePattern.map((item, index) => ({...item, index})).filter(item => item.active);
  }
  function renderPatternEditor() {
    const active = activePattern();
    const selected = chasePattern[selectedPatternIndex];
    get('chase-pattern-count').textContent = `${active.length} of ${CHASE_LED_COUNT}`;
    get('chase-pattern-index').textContent = selectedPatternIndex;
    get('chase-pattern-active').checked = selected.active;
    chasePatternButtons.forEach((button, index) => {
      const item = chasePattern[index];
      button.style.setProperty('--pixel-color', item.active ? `rgb(${item.color.join(',')})` : '#34423b');
      button.classList.toggle('lit', item.active);
      button.dataset.selected = String(index === selectedPatternIndex);
      button.setAttribute('aria-pressed', String(item.active));
      button.setAttribute('aria-label', `LED ${index}, ${item.active ? `included, RGB ${item.color.join(', ')}` : 'not included'}${index === selectedPatternIndex ? ', selected for editing' : ''}`);
    });
    syncChaseColors();
  }
  function renderChase() {
    const active = activePattern();
    chasePixels.forEach((pixel, index) => {
      const patternLed = active.find(item => (item.index + chaseOffset) % CHASE_LED_COUNT === index);
      const color = patternLed ? patternLed.color : [52, 66, 59];
      pixel.style.setProperty('--pixel-color', `rgb(${color.join(',')})`);
      pixel.classList.toggle('lit', Boolean(patternLed));
    });
    const litPositions = active.map(item => (item.index + chaseOffset) % CHASE_LED_COUNT).join(', ');
    get('chase-strip').setAttribute('aria-label', `Chase pattern lighting LEDs ${litPositions}`);
    get('chase-status').textContent = `${timer === null ? 'Paused' : 'Playing'} · ${active.length} LEDs in pattern · offset ${chaseOffset}`;
    get('chase-play').textContent = timer === null ? 'Play chase' : 'Pause chase';
    get('chase-play').setAttribute('aria-pressed', String(timer !== null));
  }
  function advance() { chaseOffset = (chaseOffset + 1) % CHASE_LED_COUNT; renderChase(); }
  function pause() { if (timer !== null) clearInterval(timer); timer = null; renderChase(); }
  function play() { timer = setInterval(advance, Number(get('chase-speed').value)); renderChase(); }
  function updateChaseCode() {
    const delay = Number(get('chase-speed').value);
    const active = activePattern();
    const positions = active.map(item => item.index).join(', ');
    const colors = active.map(item => `  CRGB(${item.color.join(', ')})`).join(',\n');
    get('chase-speed-output').textContent = `${delay} ms`;
    get('chase-code').textContent = `#include "FastLED.h"

#define NUM_LEDS 10
#define DATA_PIN 2
#define STEP_DELAY ${delay}
#define PATTERN_COUNT ${active.length}

CRGB leds[NUM_LEDS];
int patternPositions[PATTERN_COUNT] = {${positions}};
CRGB patternColors[PATTERN_COUNT] = {
${colors}
};

void setup() {
  FastLED.addLeds<NEOPIXEL, DATA_PIN>(leds, NUM_LEDS);
  FastLED.setBrightness(20);
}

void loop() {
  // Move the whole pattern one step at a time
  for (int offset = 0; offset < NUM_LEDS; offset++) {
    FastLED.clear();

    // Draw every LED in the pattern
    for (int i = 0; i < PATTERN_COUNT; i++) {
      int ledIndex = (patternPositions[i] + offset) % NUM_LEDS;
      leds[ledIndex] = patternColors[i];
    }

    FastLED.show();
    delay(STEP_DELAY);
  }
}`;
    get('chase-copy-status').textContent = '';
    renderPatternEditor();
    renderChase();
  }
  get('chase-play').addEventListener('click', () => { if (timer === null) play(); else pause(); });
  get('chase-step').addEventListener('click', () => { pause(); advance(); });
  get('chase-reset').addEventListener('click', () => { pause(); chaseOffset = 0; renderChase(); });
  get('chase-pattern-active').addEventListener('change', event => {
    if (!event.target.checked && activePattern().length === 1) {
      event.target.checked = true;
      return;
    }
    chasePattern[selectedPatternIndex].active = event.target.checked;
    updateChaseCode();
  });
  get('chase-only-this').addEventListener('click', () => {
    chasePattern.forEach((item, index) => { item.active = index === selectedPatternIndex; });
    updateChaseCode();
  });
  get('chase-select-all').addEventListener('click', () => {
    chasePattern.forEach(item => { item.active = true; });
    updateChaseCode();
  });
  get('chase-rainbow').addEventListener('click', () => {
    const active = activePattern();
    active.forEach((item, index) => { chasePattern[item.index].color = rainbowRgb(index, active.length); });
    updateChaseCode();
  });
  chaseColorButtons.forEach(button => button.addEventListener('click', () => {
    chasePattern[selectedPatternIndex].active = true;
    chasePattern[selectedPatternIndex].color = hexToRgb(button.dataset.chaseColor);
    updateChaseCode();
  }));
  chaseColorInput.addEventListener('input', () => {
    chasePattern[selectedPatternIndex].active = true;
    chasePattern[selectedPatternIndex].color = hexToRgb(chaseColorInput.value);
    updateChaseCode();
  });
  get('chase-speed').addEventListener('input', () => {
    const wasPlaying = timer !== null;
    pause(); updateChaseCode();
    if (wasPlaying) play();
  });
  document.querySelectorAll('[data-demo]').forEach(button => button.addEventListener('click', () => { if (button.dataset.demo !== 'chase') pause(); release(); }));
  document.addEventListener('visibilitychange', () => { if (document.hidden) { pause(); release(); } });
  window.addEventListener('pagehide', () => { pause(); release(); });
  updateChaseCode();

  const stateCode = `const int BUTTON_PIN = 2;
const int LED_PIN = 9;

enum LedState { OFF, DIM, BRIGHT };
LedState state = OFF;
bool lastButtonState = HIGH;

void setup() {
  pinMode(BUTTON_PIN, INPUT_PULLUP);
  pinMode(LED_PIN, OUTPUT);
}

void loop() {
  bool buttonState = digitalRead(BUTTON_PIN);

  // Move to the next state when the button is pressed
  if (lastButtonState == HIGH && buttonState == LOW) {
    if (state == OFF) state = DIM;
    else if (state == DIM) state = BRIGHT;
    else state = OFF;

    delay(20); // simple debounce
  }

  lastButtonState = buttonState;

  if (state == OFF) analogWrite(LED_PIN, 0);
  if (state == DIM) analogWrite(LED_PIN, 80);
  if (state == BRIGHT) analogWrite(LED_PIN, 255);
}`;
  get('state-code').textContent = stateCode;
  const stateNames = ['OFF', 'DIM', 'BRIGHT'];
  const statePwm = [0, 80, 255];
  let stateIndex = 0;
  function renderState() {
    const name = stateNames[stateIndex];
    const pwm = statePwm[stateIndex];
    get('state-light').style.setProperty('--level', pwm / 255);
    get('state-light').setAttribute('aria-label', `LED ${name.toLowerCase()}, PWM ${pwm}`);
    get('state-status').textContent = `State: ${name} · PWM ${pwm}`;
    document.querySelectorAll('.state-track [data-state]').forEach((step, index) => step.classList.toggle('active', index === stateIndex));
  }
  get('state-button').addEventListener('click', () => { stateIndex = (stateIndex + 1) % stateNames.length; renderState(); });
  renderState();

  get('mapping-code').textContent = `const int SENSOR_PIN = A0;
const int LED_PIN = 9;

void setup() {
  pinMode(LED_PIN, OUTPUT);
}

void loop() {
  int sensorValue = analogRead(SENSOR_PIN);
  int outputValue = map(sensorValue, 0, 1023, 0, 255);
  outputValue = constrain(outputValue, 0, 255);

  analogWrite(LED_PIN, outputValue);
}`;
  function updateMapping() {
    const inputValue = Number(get('mapping-value').value);
    const outputValue = Math.floor(inputValue * 255 / 1023);
    get('mapping-value-output').textContent = inputValue;
    get('mapping-raw-visual').textContent = inputValue;
    get('mapping-output-visual').textContent = outputValue;
    get('mapping-light').style.setProperty('--level', outputValue / 255);
    get('mapping-light').setAttribute('aria-label', `LED at PWM ${outputValue} of 255`);
    get('mapping-status').textContent = `Input ${inputValue} becomes output ${outputValue}`;
  }
  get('mapping-value').addEventListener('input', updateMapping);
  updateMapping();

  get('dht22-code').textContent = `#include "DHT.h"

#define DHT_PIN 2
#define DHT_TYPE DHT22

DHT dht(DHT_PIN, DHT_TYPE);

void setup() {
  Serial.begin(9600);
  dht.begin();
}

void loop() {
  float humidity = dht.readHumidity();
  float temperature = dht.readTemperature();

  if (isnan(humidity) || isnan(temperature)) {
    Serial.println("Could not read the DHT22");
    delay(2000);
    return;
  }

  Serial.print("Temperature: ");
  Serial.print(temperature);
  Serial.print(" C, Humidity: ");
  Serial.print(humidity);
  Serial.println(" %");

  delay(2000);
}`;
  function updateDht22() {
    const temperature = Number(get('dht-temperature').value);
    const humidity = Number(get('dht-humidity').value);
    get('dht-temperature-output').textContent = `${temperature} °C`;
    get('dht-humidity-output').textContent = `${humidity}%`;
    get('dht-temperature-visual').textContent = temperature;
    get('dht-humidity-visual').textContent = humidity;
    get('dht-status').textContent = `${temperature} °C · ${humidity}% relative humidity`;
  }
  get('dht-temperature').addEventListener('input', updateDht22);
  get('dht-humidity').addEventListener('input', updateDht22);
  updateDht22();

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

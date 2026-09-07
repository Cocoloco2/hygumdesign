'use strict';
(() => {
  const get=id=>document.getElementById(id);
  if(!get('distance-scene')) return;
  function code(id,text){get(`${id}-code`).textContent=text;get(`${id}-copy-status`).textContent='';}
  function basic(body,setup='') {return `void setup() {\n  Serial.begin(9600);\n${setup}}\n\nvoid loop() {\n${body}\n  delay(100);\n}`;}
  function distance(){
    const cm=Number(get('distance-value').value),timeout=get('distance-timeout').checked;
    get('distance-output').textContent=`${cm} cm`;
    get('distance-scene').style.setProperty('--position',`${10+(cm-2)/198*80}%`);
    get('distance-scene').classList.toggle('no-echo',timeout);
    get('distance-reading').textContent=timeout?'No echo · reading unavailable':`${cm} cm · echo ≈ ${Math.round(cm*2/0.0343)} µs`;
    code('distance',`const int TRIG = 7;\nconst int ECHO = 8;\n\nvoid setup() {\n  Serial.begin(9600);\n  pinMode(TRIG, OUTPUT);\n  pinMode(ECHO, INPUT);\n  digitalWrite(TRIG, LOW);\n}\n\nvoid loop() {\n  digitalWrite(TRIG, LOW);\n  delayMicroseconds(2);\n  digitalWrite(TRIG, HIGH);\n  delayMicroseconds(10);\n  digitalWrite(TRIG, LOW);\n  unsigned long duration = pulseIn(ECHO, HIGH, 30000);\n  if (duration == 0) {\n    Serial.println("No echo");\n  } else {\n    float cm = duration * 0.0343 / 2.0;\n    Serial.println(cm);\n  }\n  delay(60); // space out measurements\n}\n// Preview: ${timeout?'no echo':cm+' cm'}`);
  }
  get('distance-value').addEventListener('input',distance);
  get('distance-timeout').addEventListener('change',distance);
  get('distance-scene').addEventListener('pointermove',event=>{
    if(event.pointerType==='touch' && event.buttons===0) return;
    const rect=get('distance-scene').getBoundingClientRect();
    get('distance-value').value=Math.round(2+Math.max(0,Math.min(1,(event.clientX-rect.left)/rect.width))*198);
    distance();
  });
  function temperature(){
    const c=Number(get('temperature-value').value),volts=.5+c*.01,raw=Math.round(volts/5*1023),measured=(raw*5/1023-.5)*100;
    get('temperature-output').textContent=`${c} °C`;
    get('temperature-scene').style.setProperty('--fill',`${(c+10)/60*100}%`);
    get('temperature-reading').textContent=`${volts.toFixed(2)} V · ADC ${raw} · measured ≈ ${measured.toFixed(1)} °C`;
    code('temperature',basic(`  int raw = analogRead(A0); // preview: ${raw}\n  float volts = raw * (5.0 / 1023.0);\n  float celsius = (volts - 0.5) * 100.0;\n  Serial.println(celsius);`));
  }
  function rain(){
    const wet=Number(get('rain-value').value),raw=Math.round(900-wet*7),detected=raw<500;
    get('rain-output').textContent=`${wet}%`;
    get('rain-scene').style.setProperty('--wet',wet/100);
    get('rain-scene').classList.toggle('detected',detected);
    get('rain-reading').textContent=`ADC ${raw} · ${detected?'wet plate, LED on':'below wetness threshold, LED off'}`;
    code('rain',basic(`  int raw = analogRead(A0); // preview: ${raw}\n  bool wet = raw < 500; // calibrate for your module\n  digitalWrite(LED_BUILTIN, wet ? HIGH : LOW);\n  Serial.println(raw);`,'  pinMode(LED_BUILTIN, OUTPUT);\n'));
  }
  function light(){
    const level=Number(get('light-value').value),raw=Math.round(level/100*1023),dark=raw<300;
    get('light-output').textContent=`${level}%`;
    get('light-scene').style.setProperty('--sun',level/100);
    get('light-scene').classList.toggle('detected',dark);
    get('light-reading').textContent=`ADC ${raw} · ${dark?'dark, LED on':'bright, LED off'}`;
    code('light',basic(`  int raw = analogRead(A0); // preview: ${raw}\n  bool dark = raw < 300; // calibrate in your room\n  digitalWrite(LED_BUILTIN, dark ? HIGH : LOW);\n  Serial.println(raw);`,'  pinMode(LED_BUILTIN, OUTPUT);\n'));
  }
  ['temperature','rain','light'].forEach((id,index)=>{const update=[temperature,rain,light][index];get(`${id}-value`).addEventListener('input',update);update();});
  distance();
  let motionTimer=null;
  function motion(active){
    get('motion-scene').classList.toggle('detected',active);
    get('motion-reading').textContent=active?'Motion detected · HIGH · LED on':'No motion · LOW · LED off';
    code('motion',`const int PIR_PIN = 2;\n\n${basic('  bool motion = digitalRead(PIR_PIN) == HIGH;\n  digitalWrite(LED_BUILTIN, motion ? HIGH : LOW);\n  Serial.println(motion ? "Motion" : "No motion");','  pinMode(PIR_PIN, INPUT);\n  pinMode(LED_BUILTIN, OUTPUT);\n')}\n// Preview output: ${active?'HIGH':'LOW'}\n// The real module controls its own hold time.`);
  }
  function stopMotion(){clearTimeout(motionTimer);motionTimer=null;motion(false);}
  function triggerMotion(){clearTimeout(motionTimer);motion(true);motionTimer=setTimeout(stopMotion,2000);}
  get('motion-scene').addEventListener('pointermove',triggerMotion);
  get('motion-trigger').addEventListener('click',triggerMotion);
  document.querySelectorAll('[data-demo]').forEach(button=>button.addEventListener('click',()=>{if(button.dataset.demo!=='motion')stopMotion();}));
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stopMotion();});
  window.addEventListener('pagehide',stopMotion);
  motion(false);
})();

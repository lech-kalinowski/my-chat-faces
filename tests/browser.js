const source = await (await fetch('/content.js')).text();
const readability = await (await fetch('/readability.js')).text();
const styles = await (await fetch('/content.css')).text();
const popupHtml = await (await fetch('/popup.html')).text();
const popupScript = await (await fetch('/popup.js')).text();
const text = '<h2>Readable answers</h2><div class="native-small"><p class="answer">Text stays readable with <a href="#example">a useful link</a>.</p><ul><li>Lists keep their structure.</li></ul><div class="bg-black overflow-hidden"><pre><code>def greet():\n    return "hello"\n\n# a very long code line: ' + 'sample '.repeat(40) + '</code></pre></div><table><tr><th>Setting</th><th>Result</th></tr><tr><td>Text size</td><td>Readable</td></tr></table></div>';
const fixtures = {
  'ChatGPT current': {host:'chatgpt.com',user:'<div class="group/user-message"><div data-user-message-bubble="true" id="user">test</div></div>',assistant:`<div data-chatgpt-search-unit-key="fixture:2:assistant"><div data-markdown-text-style="assistant-message" id="answer">${text}</div></div>`,panel:'data-testid="canvas-panel"'},
  'ChatGPT legacy': {host:'chat.openai.com',user:'<article data-testid="conversation-turn-1"><div data-message-author-role="user" id="user">test</div></article>',assistant:`<article data-testid="conversation-turn-2"><div data-message-author-role="assistant"><div class="markdown" id="answer">${text}</div></div></article>`,panel:'data-testid="canvas-viewer"'},
  'Claude current': {host:'claude.ai',user:'<div data-testid="user-message" id="user">test</div>',assistant:`<div data-testid="assistant-message"><div data-perf-reply-text class="standard-markdown" id="answer">${text}</div><div data-testid="message-actions"><button>Copy</button></div></div>`,panel:'data-testid="artifact-panel"'},
  'Claude legacy': {host:'claude.ai',user:'<div class="font-user-message" id="user">test</div>',assistant:`<div class="font-claude-message" id="answer">${text}</div>`,panel:'data-testid="artifact-viewer"'},
  'Gemini': {host:'gemini.google.com',user:'<user-query><div class="user-query"><div class="query-content" id="user">test</div></div></user-query>',assistant:`<model-response><div class="response-container-content"><message-content id="answer">${text}</message-content></div></model-response>`,panel:'data-test-id="immersive-panel"'},
  'Grok': {host:'grok.com',user:'<div data-testid="user-message" class="message-bubble" id="user">test</div>',assistant:`<div data-testid="assistant-message" class="message-bubble" id="answer">${text}</div>`,panel:'data-testid="file-preview-panel"'},
  'Grok on X': {host:'x.com',path:'/i/grok',user:'<div data-message-author-role="user" id="user">test</div>',assistant:`<div data-message-author-role="assistant" id="answer">${text}</div>`,panel:'data-testid="document-panel"'},
  'Grok on X current': {host:'x.com',path:'/i/grok',user:'<div class="r-37j5jr r-imh66m r-1kt6imw" id="user"><span>test</span></div>',assistant:`<div dir="ltr" class="r-37j5jr r-imh66m" id="answer">${text}</div>`,panel:'data-testid="document-panel"'},
};
const presets = {
  Balanced: {userBubbleColor:'#073b32',assistantBubbleColor:'#1e1e32',textColor:'#ffffff',surfaceOpacity:75,messageTextSize:18,uiTextScale:100},
  Paper: {userBubbleColor:'#f8f6f1',assistantBubbleColor:'#f8f6f1',textColor:'#111111',surfaceOpacity:94,messageTextSize:19,uiTextScale:105},
  'Low Vision': {userBubbleColor:'#0f4bb8',assistantBubbleColor:'#111827',textColor:'#ffffff',surfaceOpacity:94,messageTextSize:24,uiTextScale:130},
  'Mixed colors': {userBubbleColor:'#ffffff',assistantBubbleColor:'#000000',textColor:'#777777',surfaceOpacity:25,messageTextSize:28,uiTextScale:140},
};
for (const name of Object.keys(fixtures)) document.querySelector('#site').add(new Option(name,name));
for (const name of Object.keys(presets)) document.querySelector('#preset').add(new Option(name,name));
const settle = () => new Promise(resolve => setTimeout(resolve, 100));

function mockChrome(settings) {
  const listeners = [];
  const messages = [];
  const values = {local:{chatfaces_ui_settings:settings,chatfaces_solid_color:'#f3efe4'},sync:{chatfaces_bg:'solid'}};
  const chrome = {runtime:{getURL:path=>new URL('/'+path,window.location.href).href,onMessage:{addListener:fn=>messages.push(fn)}}, storage:{onChanged:{addListener:fn=>listeners.push(fn)}}};
  for (const area of ['local','sync']) chrome.storage[area] = {
    get(key, callback) { setTimeout(()=>callback({...values[area]}),0); },
    set(data,callback) { const changes={}; for(const [key,value] of Object.entries(data)){changes[key]={oldValue:values[area][key],newValue:value};values[area][key]=value;} listeners.forEach(fn=>fn(changes,area));callback?.(); },
    remove(key,callback) {delete values[area][key];listeners.forEach(fn=>fn({[key]:{newValue:undefined}},area));callback?.();},
  };
  window.fixtureChrome = chrome;
  window.fixtureValues = values;
  chrome.tabs = {
    query(options, callback) { callback([{id:1,url:'https://chatgpt.com/'}]); },
    sendMessage(id, message, callback) { window.lastAppliedStyle = message.settings; callback({ok:true,siteLabel:'ChatGPT'}); },
  };
  window.applyStyle = settings => messages.forEach(fn=>fn({type:'chatfaces:apply-style-settings',settings},{},()=>{}));
  return chrome;
}

async function frameFor(name,preset,width) {
  const f=fixtures[name];
  const editor='<div contenteditable="true" role="textbox" data-testid="chat-input">Type your message</div><button type="button">Send</button>';
  const composer=name==='Grok on X current' ? `<div><div><textarea aria-label="Message">Type your message</textarea></div><button>Send</button></div>`
    : name.startsWith('Claude') ? `<div data-tap-focuses-field>${editor}</div>`
    : name==='Gemini' ? `<div class="input-area-container"><fieldset><rich-textarea>${editor}</rich-textarea></fieldset></div>`
    : `<form><div data-composer-surface-variant="default">${editor}</div></form>`;
  const frame=document.createElement('iframe');
  frame.style.width=width+'px';
  const boot=`const chrome=(${mockChrome.toString()})(${JSON.stringify(presets[preset])}); const location=new URL('https://${f.host}${f.path||'/'}'); window.fixtureLocation=location; ${readability}\n${source}`;
  frame.srcdoc=`<!doctype html><html><head><base href="http://127.0.0.1:8787/"><style>
    *{box-sizing:border-box} body{margin:0;font:16px/1.5 sans-serif;color:#111;background:#fff} .layout{display:flex;background:#fff} nav{width:140px;flex-shrink:0;background:#eee;padding:12px} main{min-width:0;flex:1;padding:16px;background:#fff} .conversation{display:flex;flex-direction:column;gap:16px} #user{max-width:70%;background:#ddd} .native-small{font-size:14px;color:#555} pre{white-space:pre;overflow:auto;color:white;background:black} .bg-black{background:black} .bg-token-main-surface-primary{background:white} .unrelated{background:rgb(220,0,0);color:white} h2{margin-top:0} input{background:#fff;color:#111} aside{padding:16px} button{background:white;color:black} [role=menu]{padding:12px} .query-content{max-width:100%}
    </style><style>${styles}</style></head><body><div class="layout"><nav aria-label="Chat history"><div><a href="#">Chat history</a><button>New chat</button></div></nav><main><header><button>Chat options</button></header><div class="conversation">${f.user}${f.assistant}</div>${composer}<aside ${f.panel} id="panel"><div class="bg-token-main-surface-primary"><article class="markdown"><p>Document preview is readable.</p><pre><code>line one\n    indented line</code></pre></article><button>Download</button><input placeholder="File name"></div></aside><div role="menu" id="menu"><button role="menuitem">Rename</button></div><div class="unrelated bg-white overflow-hidden" id="unrelated">Unrelated native card</div></main></div><script>window.matchMedia=()=>({matches:true});window.testErrors=[];window.addEventListener('error',event=>window.testErrors.push(event.message));(()=>{${boot.replaceAll('</script','<\\/script')}})();<\/script></body></html>`;
  const ready = new Promise(resolve=>frame.onload=resolve);
  document.querySelector('#frames').replaceChildren(frame);
  await ready;
  await settle();
  return frame;
}

function contrast(window, node) {
  const parse=value=>value.match(/[\d.]+/g)?.map(Number);
  let color=[255,255,255];
  const ancestors=[];
  for(let e=node;e;e=e.parentElement)ancestors.unshift(e);
  for(const e of ancestors){const rgba=parse(window.getComputedStyle(e).backgroundColor);if(rgba){const a=rgba[3]??1;color=color.map((v,i)=>rgba[i]*a+v*(1-a));}}
  const hex=rgb=>'#'+rgb.slice(0,3).map(v=>Math.round(v).toString(16).padStart(2,'0')).join('');
  return window.ChatFacesReadability.contrastRatio(hex(parse(window.getComputedStyle(node).color)),hex(color));
}

document.querySelector('#preview').onclick=()=>frameFor(document.querySelector('#site').value,document.querySelector('#preset').value,900);
document.querySelector('#run').onclick=async()=>{
  const run=document.querySelector('#run');run.disabled=true;
  const results=[];let checks=0;
  const summary=document.querySelector('#summary');
  const check=(condition,message)=>{checks++;if(!condition)throw new Error(message);};
  try {
    for(const name of Object.keys(fixtures)) for(const preset of Object.keys(presets)) for(const width of [390,1000]) {
      summary.textContent=`Running ${name}, ${preset}, ${width}px`;
      const frame=await frameFor(name,preset,width);const w=frame.contentWindow,d=w.document,s=e=>w.getComputedStyle(e);
      try {
        const bubbles=[...d.querySelectorAll('[data-chatfaces-bubble]')];
        check(bubbles.length===2,`Expected 2 bubbles, got ${bubbles.length}`);
        check(d.querySelector('#user').dataset.chatfacesRole==='user','User role missing');
        check(d.querySelector('#answer').dataset.chatfacesRole==='assistant','Assistant role missing');
        check(!d.querySelector('[data-chatfaces-bubble] [data-chatfaces-bubble]'),'Nested bubble');
        check(d.querySelector('#user').getBoundingClientRect().width>=Math.min(80,width/3),'Narrow user bubble');
        check(d.querySelectorAll('[data-chatfaces-surface="composer"]').length===1,'Composer missing or nested');
        for(const el of d.querySelectorAll('#user,.answer,nav a,#panel p,#panel button,#panel input,#menu button,header button,[role=textbox],textarea')) {
          check(contrast(w,el)>=4.5,`Low contrast ${el.tagName}: ${contrast(w,el)}`);
        }
        check(s(d.querySelector('.answer')).fontSize===presets[preset].messageTextSize+'px','AI output size not applied');
        check(s(d.querySelector('#user')).fontSize===presets[preset].messageTextSize+'px','User size not applied');
        check(s(d.querySelector('pre')).whiteSpace==='pre','Code whitespace lost');
        check(s(d.querySelector('pre code')).whiteSpace==='pre','Nested code whitespace lost');
        check(d.querySelector('pre code').textContent.includes('\n    return'),'Code indentation changed');
        check(contrast(w,d.querySelector('pre code'))>=4.5,'Code contrast');
        check(s(d.querySelector('#unrelated')).backgroundColor==='rgb(220, 0, 0)','Unrelated background erased');
        check(d.documentElement.scrollWidth<=width+2,'Horizontal page overflow');
        check(d.querySelector('#panel').dataset.chatfacesSurface==='secondary','Document not themed');
        check(d.querySelector('#menu').dataset.chatfacesSurface==='secondary','Menu not themed');
        // Streaming: replace an existing content node and populate attributes later.
        const dynamic=d.createElement('div');d.querySelector('.conversation').append(dynamic);
        if(name.startsWith('ChatGPT'))dynamic.setAttribute('data-markdown-text-style','assistant-message');
        else if(name.startsWith('Claude')||name.startsWith('Grok'))dynamic.setAttribute('data-testid','assistant-message');
        else dynamic.className='response-container-content';
        dynamic.innerHTML='<p>Streaming answer</p>';
        await settle();
        check(dynamic.dataset.chatfacesRole==='assistant','New streamed message not marked');
        dynamic.removeAttribute('data-markdown-text-style');dynamic.removeAttribute('data-testid');dynamic.className='';
        await settle();
        check(!dynamic.hasAttribute('data-chatfaces-bubble'),'Stale message marker');
        w.applyStyle({...presets[preset],messageTextSize:26});
        check(s(d.querySelector('.answer')).fontSize==='26px','Apply Style did not update AI output');
        w.fixtureChrome.storage.local.set({chatfaces_ui_settings:null});
        check(w.testErrors.length===0,'Null settings crashed content script');
        w.fixtureChrome.storage.sync.remove('chatfaces_bg');
        await settle();
        check(!d.documentElement.classList.contains('chatfaces-active'),'Background removal failed');
        check(!d.documentElement.classList.contains('chatfaces-style-active'),'Style removal failed');
        if(name.startsWith('Grok on X')){
          w.applyStyle(presets[preset]);w.fixtureLocation.pathname='/home';
          d.querySelector('main').append(d.createElement('div'));await settle();
          check(!d.documentElement.classList.contains('chatfaces-style-active'),'Styling leaked outside X Grok');
        }
        results.push(`PASS ${name} / ${preset} / ${width}px`);
      }catch(error){results.push(`FAIL ${name} / ${preset} / ${width}px: ${error.message}`);}
      document.querySelector('#results').textContent=results.join('\n');
    }
    const popup=document.createElement('iframe');popup.style.width='400px';
    const boot=`const chrome=(${mockChrome.toString()})(null); ${readability}\n${popupScript}`;
    popup.srcdoc=popupHtml.replace('<head>','<head><base href="http://127.0.0.1:8787/">')
      .replace('<script src="readability.js"></script>','')
      .replace('<script src="popup.js"></script>',`<script>${boot.replaceAll('</script','<\\/script')}<\/script>`);
    const ready=new Promise(resolve=>popup.onload=resolve);document.querySelector('#frames').replaceChildren(popup);await ready;await settle();
    const pw=popup.contentWindow,pd=pw.document;
    try {
      check(!pd.querySelector('#apply-style-btn').disabled,'First-use Apply Style disabled');
      pd.querySelector('[data-preset="default"]').click();await settle();
      check(pw.fixtureValues.local.chatfaces_ui_settings?.accessibilityPreset==='default','Balanced preset failed to save');
      for(const preset of ['lowVision','paper','largeType','highContrast','warmContrast']) {
        pd.querySelector(`[data-preset="${preset}"]`).click();await settle();
        check(pw.fixtureValues.local.chatfaces_ui_settings.accessibilityPreset===preset,`${preset} did not persist`);
        check(pw.lastAppliedStyle.accessibilityPreset===preset,`${preset} did not reach content script`);
      }
      const input=pd.querySelector('#message-text-size');input.value='28';input.dispatchEvent(new pw.Event('input',{bubbles:true}));
      check(!pd.querySelector('#apply-style-btn').disabled,'Manual Apply Style disabled');
      pd.querySelector('#apply-style-btn').click();await settle();
      check(pw.fixtureValues.local.chatfaces_ui_settings.messageTextSize===28,'Manual font size not saved');
      pd.querySelector('#remove-btn').click();await settle();
      check(!pw.fixtureValues.sync.chatfaces_bg,'Remove Background not saved');
      results.push('PASS Popup / first-use Balanced, all presets, manual Apply Style, Remove Background');
    }catch(error){results.push(`FAIL Popup: ${error.message}`);}
    const failures=results.filter(r=>r.startsWith('FAIL'));
    summary.textContent=`${results.length-failures.length}/${results.length} scenarios passed; ${checks} checks; ${failures.length} failures`;
    document.title=failures.length?'FAIL: My Chat Faces tests':'PASS: My Chat Faces tests';
    document.querySelector('#results').textContent=[...failures,...results.filter(r=>r.startsWith('PASS'))].join('\n');
  }finally{run.disabled=false;}
};

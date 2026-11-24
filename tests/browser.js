// Optional comparison with the locally staged rejected/released build.
const baseline = new URLSearchParams(location.search).get('baseline');
const runtimeRoot = ['1.3.9', '1.3.10'].includes(baseline)
  ? `/release/chrome-web-store/my-chat-faces-v${baseline}` : '';
const source = await (await fetch(runtimeRoot+'/content.js')).text();
const readability = await (await fetch(runtimeRoot+'/readability.js')).text();
const styles = await (await fetch(runtimeRoot+'/content.css')).text();
const popupHtml = await (await fetch(runtimeRoot+'/popup.html')).text();
const popupScript = await (await fetch(runtimeRoot+'/popup.js')).text();
const text = '<h2>Readable answers</h2><div class="native-small"><p class="answer">Text stays readable with <a href="#example">a useful link</a>.</p><ul><li>Lists keep their structure.</li></ul><div class="bg-black overflow-hidden"><pre><code>def greet():\n    return "hello"\n\n# a very long code line: ' + 'sample '.repeat(40) + '</code></pre></div><table><tr><th>Setting</th><th>Result</th></tr><tr><td>Text size</td><td>Readable</td></tr></table></div>';
const fixtures = {
  'ChatGPT current': {host:'chatgpt.com',user:'<div class="group/user-message"><div data-user-message-bubble="true" id="user">test</div></div>',assistant:`<div data-chatgpt-search-unit-key="fixture:2:assistant"><div data-markdown-text-style="assistant-message" id="answer">${text}</div></div>`,panel:'data-testid="canvas-panel"'},
  'ChatGPT home': {host:'chatgpt.com',home:true,user:'',assistant:'',panel:'data-testid="canvas-panel"'},
  'ChatGPT November': {host:'chatgpt.com',workspace:true,user:'<div data-user-message-bubble="true" id="user">test</div>',assistant:`<div data-markdown-text-style="assistant-message" id="answer">${text}</div>`,panel:'data-testid="canvas-panel"'},
  'ChatGPT November home': {host:'chatgpt.com',workspace:true,home:true,user:'',assistant:'',panel:'data-testid="canvas-panel"'},
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
  const chrome = {runtime:{getURL:path=>new URL('/'+path,document.baseURI).href,onMessage:{addListener:fn=>messages.push(fn)}}, storage:{onChanged:{addListener:fn=>listeners.push(fn)}}};
  for (const area of ['local','sync']) chrome.storage[area] = {
    get(key, callback) { setTimeout(()=>callback({...values[area]}),0); },
    set(data,callback) { const changes={}; for(const [key,value] of Object.entries(data)){changes[key]={oldValue:values[area][key],newValue:value};values[area][key]=value;} listeners.forEach(fn=>fn(changes,area));callback?.(); },
    remove(key,callback) {delete values[area][key];listeners.forEach(fn=>fn({[key]:{newValue:undefined}},area));callback?.();},
  };
  window.fixtureChrome = chrome;
  window.fixtureValues = values;
  window.fixtureTab = {id:1}; // Chrome hides URL without tabs/host/activeTab permission.
  window.fixtureConnected = true;
  chrome.tabs = {
    query(options, callback) { callback([window.fixtureTab]); },
    sendMessage(id, message, callback) {
      if (!window.fixtureConnected) {
        chrome.runtime.lastError = {message:'Could not establish connection. Receiving end does not exist.'};
        callback(); delete chrome.runtime.lastError; return;
      }
      if(message.type==='chatfaces:apply-style-settings') window.lastAppliedStyle = message.settings;
      callback({ok:true,siteLabel:'ChatGPT'});
    },
  };
  window.getContentStatus = () => { let status; messages.forEach(fn=>fn({type:'chatfaces:get-status'},{},value=>status=value)); return status; };
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
  const chatgptShell=name==='ChatGPT current'||f.home||f.workspace;
  const heading=f.workspace
    ? '<div class="group/home-composer-layout"><div class="greeting"><h1 aria-hidden="true" inert><span data-headline="readyWhenYouAre">Ready when you are.</span></h1><div class="greeting-visible"><h1 class="inline"><span data-headline="readyWhenYouAre">Ready when you are.</span></h1></div></div></div>'
    : '<div class="home-composer-anchor"><h1>Ready when you are.</h1></div>';
  const home=f.home?heading+'<div class="group/home-suggestion-list-item"><button data-composer-mode="chat">Try a sample question</button><button aria-label="Dismiss suggestion">Dismiss</button></div>':'';
  frame.srcdoc=`<!doctype html><html><head><base href="http://127.0.0.1:8787/"><style>
    *{box-sizing:border-box} body{margin:0;font:16px/1.5 sans-serif;color:#111;background:#fff} .layout{display:flex;background:#fff} nav{width:140px;flex-shrink:0;background:#eee;padding:12px} main{min-width:0;flex:1;padding:16px;background:#fff} .conversation{display:flex;flex-direction:column;gap:16px} #user{max-width:70%;background:#ddd} .native-small{font-size:14px;color:#555} pre{white-space:pre;overflow:auto;color:white;background:black} .bg-black{background:black} .bg-token-main-surface-primary{background:white} .unrelated{background:rgb(220,0,0);color:white} h2{margin-top:0} input{background:#fff;color:#111} aside{padding:16px} button{background:white;color:black} [role=menu]{padding:12px} .query-content{max-width:100%}
    </style><style>${styles}</style><style>
    [data-app-shell-workspace-row]{position:relative;isolation:isolate;min-height:100vh}
    [data-app-shell-workspace-row]::before{content:"";position:absolute;inset:0;background:rgb(14,14,14);pointer-events:none}
    [data-app-shell-workspace-row]>nav,[data-app-shell-workspace-row]>main{position:relative}
    [data-app-shell-workspace]{position:relative}
    [data-app-shell-workspace] [data-app-shell-workspace-row]::before{content:none;background:transparent}
    @media(min-width:768px){[data-app-shell-workspace]::before{content:"";position:absolute;inset:0;background:rgb(14,14,14);pointer-events:none}}
    .greeting{position:relative;text-align:center;margin-bottom:24px}
    .greeting h1{margin:0;font-size:24px;font-weight:normal}
    .greeting h1[aria-hidden]{visibility:hidden}
    .greeting-visible{position:absolute;inset-inline:0;bottom:0}
    .inline{display:inline}
    .unrelated::before{content:"Native decoration";background:rgb(10,20,30)}
    </style></head><body><div ${f.workspace?'data-app-shell-workspace="true"':''}><div class="layout" ${chatgptShell?'data-app-shell-workspace-row="true"':''}><nav aria-label="Chat history"><div><a href="#">Chat history</a><button>New chat</button></div></nav><main><header><button>Chat options</button></header>${home}<div class="conversation">${f.user}${f.assistant}</div>${composer}<aside ${f.panel} id="panel"><div class="bg-token-main-surface-primary"><article class="markdown"><p>Document preview is readable.</p><pre><code>line one\n    indented line</code></pre></article><button>Download</button><input placeholder="File name"></div></aside><div role="menu" id="menu"><button role="menuitem">Rename</button></div><div class="unrelated bg-white overflow-hidden" id="unrelated">Unrelated native card</div></main></div></div><script>window.matchMedia=()=>({matches:true});window.testErrors=[];window.addEventListener('error',event=>window.testErrors.push(event.message));(()=>{${boot.replaceAll('</script','<\\/script')}})();<\/script></body></html>`;
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

async function waitFor(check, message) {
  for(let attempt=0;attempt<80;attempt++) {
    if(check()) return;
    await settle();
  }
  throw new Error(message);
}

async function checkBackgrounds(w, d, check) {
  const html=d.documentElement, shell=d.querySelector('[data-app-shell-workspace]')||d.querySelector('[data-app-shell-workspace-row]');
  const pseudo=()=>w.getComputedStyle(html,'::before');
  const canvas=d.createElement('canvas');canvas.width=16;canvas.height=16;
  const ctx=canvas.getContext('2d');ctx.fillStyle='#efa634';ctx.fillRect(0,0,16,16);
  const custom=canvas.toDataURL('image/png');
  w.fixtureChrome.storage.local.set({chatfaces_custom_data:custom});
  for(const choice of ['cyber','fantasy','unicorns','custom','solid']) {
    w.fixtureChrome.storage.sync.set({chatfaces_bg:choice});
    const expected=choice==='custom'?'data:image/png':`/${choice}.jpg`;
    await waitFor(()=>html.classList.contains('chatfaces-active')&&pseudo().opacity==='1'&&
      (choice==='solid'?pseudo().backgroundImage==='none':pseudo().backgroundImage.includes(expected)),`${choice} background did not render`);
    check(w.getComputedStyle(shell,'::before').backgroundColor==='rgba(0, 0, 0, 0)',`${choice}: ChatGPT workspace pseudo-element hides wallpaper`);
    check(w.getComputedStyle(shell).backgroundColor==='rgba(0, 0, 0, 0)',`${choice}: workspace fill hides wallpaper`);
    check(w.getComputedStyle(d.querySelector('#unrelated'),'::before').backgroundColor==='rgb(10, 20, 30)','Unrelated pseudo-element erased');
    if(choice!=='solid') {
      const image=new w.Image();image.src=pseudo().backgroundImage.slice(5,-2);await image.decode();
      check(image.naturalWidth>0,`${choice} image failed to decode`);
    }
  }
  w.fixtureChrome.storage.sync.remove('chatfaces_bg');await settle();
  const nativeBackdrop=shell.hasAttribute('data-app-shell-workspace')&&w.innerWidth<768?'rgba(0, 0, 0, 0)':'rgb(14, 14, 14)';
  check(w.getComputedStyle(shell,'::before').backgroundColor===nativeBackdrop,'Native workspace not restored on background removal');
  check(html.classList.contains('chatfaces-style-active'),'Background removal cleared text preferences');
  w.fixtureChrome.storage.sync.set({chatfaces_bg:'custom'});
  w.fixtureChrome.storage.sync.set({chatfaces_bg:'solid'});
  await waitFor(()=>html.classList.contains('chatfaces-active')&&pseudo().backgroundImage==='none','Rapid background switching lost final selection');
  check(pseudo().backgroundColor==='rgb(243, 239, 228)','Rapid background switching lost solid color');
}

document.querySelector('#preview').onclick=async()=>{
  const frame=await frameFor(document.querySelector('#site').value,document.querySelector('#preset').value,Number(document.querySelector('#width').value));
  frame.contentWindow.fixtureChrome.storage.sync.set({chatfaces_bg:document.querySelector('#background').value});
};
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
        if(name==='ChatGPT current'||fixtures[name].home||fixtures[name].workspace) await checkBackgrounds(w,d,check);
        if(fixtures[name].home) {
          check(d.querySelectorAll('[data-chatfaces-bubble]').length===0,'Home screen received fabricated message bubbles');
          for(const el of d.querySelectorAll('h1')) check(el.dataset.chatfacesSurface==='welcome','Welcome heading lacks a protected reading surface');
          for(const el of d.querySelectorAll('h1,[data-composer-mode],nav a,[role=textbox]')) check(contrast(w,el)>=4.5,'Home-screen text is unreadable');
          if(fixtures[name].workspace) {
            const measured=d.querySelector('h1[aria-hidden]'), visible=d.querySelector('h1.inline');
            check(s(measured).visibility==='hidden','Invisible greeting measurement copy became visible');
            check(Math.abs(measured.getBoundingClientRect().height-visible.getBoundingClientRect().height)<1,'Animated greeting and measurement copy have different heights');
            const headline=visible.querySelector('[data-headline]');
            headline.removeAttribute('data-headline');await settle();
            check(!visible.hasAttribute('data-chatfaces-surface'),'Stale greeting marker not removed');
            headline.setAttribute('data-headline','readyWhenYouAre');await settle();
            check(visible.dataset.chatfacesSurface==='welcome','Late headline marker not observed');
          }
          check(d.documentElement.scrollWidth<=width+2,'Home screen overflows');
          check(w.getContentStatus()?.siteLabel==='ChatGPT','Content status handshake failed');
          results.push(`PASS ${name} / ${preset} / ${width}px`);
          continue;
        }
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
      check(pd.querySelector('#action-status').textContent==='Ready for ChatGPT.','Popup misidentifies ChatGPT when tab URL is unavailable');
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
      const canvas=pd.createElement('canvas');canvas.width=32;canvas.height=32;
      const ctx=canvas.getContext('2d');ctx.fillStyle='#2a725a';ctx.fillRect(0,0,32,32);
      const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));
      const upload=new pw.DataTransfer();upload.items.add(new pw.File([blob],'background-test.png',{type:'image/png'}));
      const fileInput=pd.querySelector('#file-input');fileInput.files=upload.files;
      fileInput.dispatchEvent(new pw.Event('change',{bubbles:true}));
      await waitFor(()=>pw.fixtureValues.sync.chatfaces_bg==='custom','Custom upload did not select background');
      check(pw.fixtureValues.local.chatfaces_custom_data.startsWith('data:image/'),'Uploaded image missing from local storage');
      pd.querySelector('[data-bg="cyber"]').click();await settle();
      pd.querySelector('#custom-card').click();await settle();
      check(pw.fixtureValues.sync.chatfaces_bg==='custom','Saved custom image cannot be reselected');
      pw.fixtureConnected=false;pw.refreshActiveTabStatus();
      check(pd.querySelector('#action-status').textContent.includes('refresh a supported chat'),'Unknown URL must not be labeled unsupported');
      pw.fixtureTab.url='https://chatgpt.com/';pw.refreshActiveTabStatus();
      check(pd.querySelector('#action-status').textContent==='Refresh ChatGPT to connect the extension.','Missing content script should request refresh');
      check(!pw.fixtureChrome.runtime.lastError,'Popup did not handle messaging failure');
      results.push('PASS Popup / URL-less status, presets, manual Apply, removal, custom upload and reselection, disconnected status');
    }catch(error){results.push(`FAIL Popup: ${error.message}`);}
    const failures=results.filter(r=>r.startsWith('FAIL'));
    summary.textContent=`${results.length-failures.length}/${results.length} scenarios passed; ${checks} checks; ${failures.length} failures`;
    document.title=failures.length?'FAIL: My Chat Faces tests':'PASS: My Chat Faces tests';
    document.querySelector('#results').textContent=[...failures,...results.filter(r=>r.startsWith('PASS'))].join('\n');
  }finally{run.disabled=false;}
};

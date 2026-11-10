const express = require('express');
const crypto = require('crypto');
const app = express();
app.use(express.json({limit:'2kb'}));
let TOKEN = process.env.CONTROL_TOKEN;
if (!TOKEN || TOKEN.length < 20) {
  if (process.env.NODE_ENV === 'production') {
    console.error('Set CONTROL_TOKEN (20+ characters) in Render environment');
    process.exit(1);
  } else {
    TOKEN = 'dev_token_sample_1234567890abcdef';
    console.log('Notice: CONTROL_TOKEN not configured. Using local dev token: ' + TOKEN);
  }
}
const commands = ['POWER','SPEED 1','SPEED 2','SPEED 3','SPEED 4','SPEED 5','BOOST'];
let pending = null;
let lastSeen = 0;
function authorized(req) {
 const supplied = req.get('X-Control-Token') || '';
 const a = Buffer.from(supplied); const b = Buffer.from(TOKEN);
 return a.length === b.length && crypto.timingSafeEqual(a,b);
}
function auth(req,res,next){if(!authorized(req)) return res.status(401).json({error:'Unauthorized'});next();}
app.get('/', (req,res)=>res.type('html').send(`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Fan Control</title><style>body{font:16px Arial;background:#101827;color:#fff;text-align:center;padding:20px}main{max-width:390px;margin:auto;background:#1e293b;padding:24px;border-radius:18px}button,input{box-sizing:border-box;width:100%;padding:15px;margin:7px 0;border:0;border-radius:10px;font-size:16px}button{background:#334155;color:white;cursor:pointer;transition:background 0.2s}button:hover{background:#475569}button:first-of-type{background:#b91c1c}button:first-of-type:hover{background:#dc2626}#status{color:#86efac;font-size:14px;min-height:20px}</style></head><body><main><h2>Smart Fan Control</h2><input id="token" type="password" placeholder="Control token"><p id="status">Enter your token to control fan</p><div id="buttons"></div></main><script>
const defaultToken = ${JSON.stringify(process.env.NODE_ENV === 'production' ? '' : TOKEN)};
const tokenInput = document.getElementById('token');
tokenInput.value = localStorage.getItem('control_token') || defaultToken;
tokenInput.oninput = (e) => localStorage.setItem('control_token', e.target.value);
const names = ${JSON.stringify(commands)};
const buttons = document.getElementById('buttons');
names.forEach((name, id) => {
  const b = document.createElement('button');
  b.textContent = name;
  b.onclick = async () => {
    try {
      const r = await fetch('/api/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Control-Token': tokenInput.value },
        body: JSON.stringify({ id })
      });
      const j = await r.json();
      if (r.ok) {
        document.getElementById('status').textContent = 'Queued: ' + name + (j.deviceRecentlySeen ? ' (ESP32 active)' : ' (ESP32 not seen recently)');
      } else {
        document.getElementById('status').textContent = j.error || 'Request failed';
      }
    } catch(e) {
      document.getElementById('status').textContent = 'Network error';
    }
  };
  buttons.appendChild(b);
});
</script></body></html>`));
app.post('/api/command',auth,(req,res)=>{
 const id=req.body?.id;
 if(!Number.isInteger(id)||id<0||id>6)return res.status(400).json({error:'Invalid command'});
 pending={id,created:Date.now()};
 res.json({queued:true,name:commands[id],deviceRecentlySeen:Date.now()-lastSeen<15000});
});
app.get('/api/next',auth,(req,res)=>{
 lastSeen=Date.now();
 if(!pending || Date.now()-pending.created>30000){pending=null;return res.status(204).end();}
 const item=pending;pending=null;
 res.json({id:item.id});
});
app.get('/health',(req,res)=>res.json({ok:true}));
app.listen(process.env.PORT||3000,'0.0.0.0',()=>console.log('Server running'));

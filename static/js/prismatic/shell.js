/* Native links, details and forms: no navigation interceptor or second router. */
(() => {
  'use strict';
  window.VinlumeShell?.destroy();
  const abort=new AbortController(),events={signal:abort.signal};
  const settings=document.querySelector('.pn-settings');
  document.querySelectorAll('.pn-site-links a').forEach(a=>{
    if(new URL(a.href,location.href).pathname===location.pathname)a.setAttribute('aria-current','page');
  });
  document.addEventListener('keydown',event=>{
    if(event.key==='Escape'&&settings?.open){settings.open=false;settings.querySelector('summary').focus();}
  },events);
  document.addEventListener('click',event=>{if(settings?.open&&!settings.contains(event.target))settings.open=false;},events);
  document.addEventListener('visibilitychange',()=>{document.documentElement.dataset.pnVisible=String(!document.hidden);},events);
  document.documentElement.dataset.pnVisible=String(!document.hidden);
  window.VinlumeShell={destroy(){abort.abort();}};
})();

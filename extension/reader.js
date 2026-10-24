(() => {
  function isVisible(node) {
    return !!node?.getClientRects().length && !node.closest('[hidden]');
  }
  function documents(root) {
    const docs = [root];
    // Roundcube uses a same-origin frame for its preview pane and sometimes
    // another frame for the HTML message. Never access cross-origin frames.
    for (let i = 0; i < docs.length && i < 12; i++) {
      for (const frame of docs[i].querySelectorAll('iframe')) {
        if (!isVisible(frame)) continue;
        try {
          if (frame.contentDocument && !docs.includes(frame.contentDocument)) {
            docs.push(frame.contentDocument);
          }
        } catch { /* Cross-origin content is not accessible. */ }
      }
    }
    return docs;
  }
  function read(root = document) {
    const url = new URL(root.location.href);
    if (url.searchParams.get('_task') === 'login' || url.searchParams.get('_action') === 'compose' || root.querySelector('input[type=password]')) return null;
    const docs = documents(root);
    const subjectSelectors = ['#messageheader .subject', '.message-headers .subject', '#message-headers .subject', 'h2.subject', 'h3.subject', '#messageheader .header.subject', '#messageheader td.subject', '#messageheader .header-title', '#message-header .subject'];
    let subject = '';
    for (const doc of [...docs].reverse()) {
      for (const selector of subjectSelectors) {
        const n = doc.querySelector(selector);
        if (isVisible(n) && n.innerText?.trim()) { subject = n.innerText.trim(); break; }
      }
      if (subject) break;
    }
    let body = '', bodyNodes = [];
    // Prefer the deepest message frame to avoid including Roundcube controls.
    for (const doc of [...docs].reverse()) {
      for (const selector of ['#messagebody', '.message-htmlpart', '.message-part', '.rcmBody']) {
        const nodes = [...doc.querySelectorAll(selector)].filter(isVisible);
        const text = nodes.map(n => n.innerText?.trim() || '').filter(Boolean).join('\n');
        if (text) { body = text; bodyNodes = nodes; break; }
      }
      if (body) break;
    }
    if (!body) return null;
    const links=bodyNodes.flatMap(n=>[...n.querySelectorAll('a[href]')].map(a=>({url:a.href,label:a.innerText||'',context:a.parentElement?.innerText?.slice(0,500)||''})));
    let received='';
    for(const doc of [...docs].reverse()){
      const raw=doc.querySelector('#messageheader .date, .message-headers .date')?.innerText||doc.querySelector('#messageheader, .message-header, .message-headers')?.innerText||'';
      const iso=raw.match(/\d{4}-\d{2}-\d{2}(?:[ T]\d{2}:\d{2})?/);
      if(iso){received=iso[0];break;}
    }
    if(!subject){const title=root.title||'';subject=title.includes(' :: ')?title.split(' :: ').slice(1).join(' :: '):'';}
    return {subject: subject || 'University email', body,links,received};
  }
  function selection(root = document) {
    for (const doc of documents(root)) {
      const text = doc.getSelection()?.toString().trim();
      if (text) return text.slice(0, 120000);
    }
    return '';
  }
  globalThis.CampusPostReader = {read, selection};
})();


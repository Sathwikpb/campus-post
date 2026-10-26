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
  function receivedDate(raw, now = new Date()) {
    const pad = n => String(n).padStart(2, '0');
    let m = raw.match(/\b(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}))?/);
    if (m) return `${m[1]}-${m[2]}-${m[3]}` + (m[4] ? `T${m[4]}:${m[5]}` : '');
    m = raw.match(/\b(\d{1,2})\.(\d{1,2})\.(\d{4})(?:,?\s+(\d{1,2}):(\d{2}))?/);
    if (m) return `${m[3]}-${pad(m[2])}-${pad(m[1])}` + (m[4] ? `T${pad(m[4])}:${m[5]}` : '');
    m = raw.match(/\b(Heute|Today|Gestern|Yesterday)\b,?\s*(\d{1,2}):(\d{2})?/i);
    if (m) {
      const day = new Date(now);
      if (/gestern|yesterday/i.test(m[1])) day.setDate(day.getDate() - 1);
      return `${day.getFullYear()}-${pad(day.getMonth() + 1)}-${pad(day.getDate())}` + (m[3] ? `T${pad(m[2])}:${m[3]}` : '');
    }
    return '';
  }
  function read(root = document) {
    const url = new URL(root.location.href);
    if (url.searchParams.get('_task') === 'login' || url.searchParams.get('_action') === 'compose' || root.querySelector('input[type=password]')) return null;
    const docs = documents(root);
    const subjectSelectors = ['#message-header h2.subject', '#messageheader .subject', '.message-headers .subject', '#message-headers .subject', 'h2.subject', 'h3.subject', '#messageheader .header.subject', '#messageheader td.subject', '#messageheader .header-title', '#message-header .subject'];
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
    // Elastic uses #message-header, classic #messageheader; the date may be
    // ISO, German (16.10.2026 14:58) or relative (Heute/Today 14:58).
    const headerSelector='#message-header, #messageheader, .message-header, .message-headers';
    let received='',sender='';
    for(const doc of [...docs].reverse()){
      const header=doc.querySelector(headerSelector);
      const raw=[...doc.querySelectorAll('#message-header .date, #messageheader .date, .message-headers .date, td.header.date, .header .date')].map(n=>n.title||n.textContent||'').join(' ')+' '+(header?.innerText||header?.textContent||'');
      received=receivedDate(raw);
      if(!sender&&header){const from=header.querySelector('.from a.rcmContactAddress, .header.from a, a.rcmContactAddress');if(from)sender=(from.textContent||'').trim()||from.title||'';}
      if(received)break;
    }
    if(!subject){const title=root.title||'';subject=title.includes(' :: ')?title.split(' :: ').slice(1).join(' :: '):'';}
    return {subject: subject || 'University email', body,links,received,sender};
  }
  function selection(root = document) {
    for (const doc of documents(root)) {
      const text = doc.getSelection()?.toString().trim();
      if (text) return text.slice(0, 120000);
    }
    return '';
  }
  globalThis.CampusPostReader = {read, selection, receivedDate};
})();


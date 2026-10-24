chrome.action.onClicked.addListener(async tab=>{
  if(tab.id&&tab.url?.startsWith('https://webmail.tu-ilmenau.de/')){
    try{await chrome.tabs.sendMessage(tab.id,{type:'campus-popup-toggle',tabId:tab.id});return;}catch{}
  }
  await chrome.tabs.create({url:'https://webmail.tu-ilmenau.de/'});
});
chrome.runtime.onMessage.addListener((message,sender,respond)=>{
  if(message.type==='campus-context'&&sender.id===chrome.runtime.id&&sender.tab?.url?.startsWith('https://webmail.tu-ilmenau.de/')){
    respond({ok:true,tabId:sender.tab.id});
  }
});

// A closed mailbox tab no longer needs its temporary, memory-only digest.
chrome.tabs.onRemoved?.addListener(tabId=>{chrome.storage.session?.remove('campus-mail-session-'+tabId);});

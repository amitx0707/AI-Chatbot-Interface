// ...new code...
'use strict';

(function () {
    const SELECTORS = {
        year: '#year',
        form: '#entryForm',
        nameInput: '#username',
        themeBtn: '#themeToggle'
    };

    const THEME_KEY = 'mintai_theme';
    const DEFAULT_THEME = 'mint';

    function $(sel) { return document.querySelector(sel); }

    function setYear() {
        const y = new Date().getFullYear();
        const el = $(SELECTORS.year);
        if (el) el.textContent = y;
    }

    function startChat(name) {
        if (name) localStorage.setItem('mintai_user', name);
        window.location.href = 'chat.html';
    }

    function applyTheme(name) {
        document.documentElement.setAttribute('data-theme', name);
        localStorage.setItem(THEME_KEY, name);
        const btn = $(SELECTORS.themeBtn);
        if (btn) {
            btn.textContent = name === 'mint' ? 'Cyberpunk' : 'Mint';
            btn.setAttribute('aria-pressed', String(name === 'cyberpunk'));
        }
    }

    function initTheme() {
        const stored = localStorage.getItem(THEME_KEY);
        const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        const initial = stored || (prefersDark ? 'cyberpunk' : DEFAULT_THEME);
        applyTheme(initial);
    }

    function bindUi() {
        const form = $(SELECTORS.form);
        const nameInput = $(SELECTORS.nameInput);
        const themeBtn = $(SELECTORS.themeBtn);

        if (form) {
            form.addEventListener('submit', (ev) => {
                ev.preventDefault();
                const name = nameInput ? nameInput.value.trim() : '';
                startChat(name);
            });
        }

        if (themeBtn) {
            themeBtn.addEventListener('click', () => {
                const current = document.documentElement.getAttribute('data-theme') || DEFAULT_THEME;
                applyTheme(current === 'mint' ? 'cyberpunk' : 'mint');
            });
        }
    }

    function init() {
        setYear();
        initTheme();
        bindUi();
    }

    // run when DOM ready (defer should make this safe)
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
// ...new code...
'use strict';

(function () {
  const SELECT = {
    sidebar: '#chatSidebar',
    sidebarToggle: '#sidebarToggle',
    conversationList: '#conversationList',
    modelSelect: '#modelSelect',
    messages: '#messages',
    composer: '#composer',
    input: '#messageInput',
    attachBtn: '#attachBtn',
    attachmentInput: '#attachmentInput',
    attachmentPreview: '#attachmentPreview',
    newChat: '#newChat',
    clearHistory: '#clearHistory',
    renameChat: '#renameChat',
    deleteChat: '#deleteChat'
  };

  function $(s){ return document.querySelector(s); }
  function $all(s){ return Array.from(document.querySelectorAll(s)); }

  const STORAGE_KEY = 'mintai_conversations_v1';
  let conversations = {}; // { id: { id, title, model, messages: [{role,text,attachment,ts}] } }
  let convoList = []; // ordered ids
  let activeConvo = null;
  let pendingAttachment = null;
  let pendingAttachmentUrl = null;

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : null;
      if (parsed && parsed.items) {
        conversations = parsed.items;
        convoList = parsed.list || Object.keys(conversations);
      } else {
        conversations = {};
        convoList = [];
      }
    } catch (e) {
      conversations = {};
      convoList = [];
    }
  }

  function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ items: conversations, list: convoList }));
  }

  function makeId() { return 'c_' + Date.now().toString(36) + Math.random().toString(36).slice(2,6); }

  function createConversation(title = 'New chat', model = 'Astra') {
    const id = makeId();
    conversations[id] = { id, title, model, messages: [] };
    convoList.unshift(id);
    save();
    renderConversationList();
    setActiveConversation(id);
  }

  function deleteConversation(id) {
    if (!conversations[id]) return;
    delete conversations[id];
    convoList = convoList.filter(x => x !== id);
    if (activeConvo === id) activeConvo = convoList[0] || null;
    save();
    renderConversationList();
    renderMessages();
  }

  function renameConversation(id, newTitle) {
    if (!conversations[id]) return;
    conversations[id].title = newTitle || conversations[id].title;
    save();
    renderConversationList();
  }

  function setActiveConversation(id) {
    if (!conversations[id]) return;
    activeConvo = id;
    const conv = conversations[id];
    const sel = $(SELECT.modelSelect);
    if (sel) sel.value = conv.model;
    $all('.conv-item').forEach(it => it.classList.toggle('active', it.dataset.id === id));
    renderMessages();
  }

  function pushMessage(role, text, attachment) {
    if (!activeConvo) createConversation();
    const conv = conversations[activeConvo];
    conv.messages.push({ role, text, attachment, ts: Date.now() });
    // move convo to top
    convoList = [activeConvo].concat(convoList.filter(id => id !== activeConvo));
    save();
    renderConversationList();
    renderMessages();
  }

  function renderConversationList() {
    const el = $(SELECT.conversationList);
    if (!el) return;
    el.innerHTML = '';
    convoList.forEach(id => {
      const c = conversations[id];
      const li = document.createElement('li');
      li.className = 'conv-item' + (id === activeConvo ? ' active' : '');
      li.dataset.id = id;
      li.innerHTML = `<div class="meta"><div class="title">${escapeHtml(c.title)}</div><div class="muted small">${escapeHtml(c.model)}</div></div><div class="ts small muted">${timeAgo(c.messages.at(-1)?.ts)}</div>`;
      li.addEventListener('click', () => setActiveConversation(id));
      el.appendChild(li);
    });
  }

  function renderMessages() {
    const el = $(SELECT.messages);
    if (!el) return;
    el.innerHTML = '';
    if (!activeConvo) {
      return;
    }
    const conv = conversations[activeConvo];
    conv.messages.forEach(m => {
      const div = document.createElement('div');
      div.className = 'message ' + (m.role === 'user' ? 'user' : 'bot');

      if (m.text) {
        const textEl = document.createElement('div');
        textEl.className = 'message-text';
        textEl.textContent = m.text;
        div.appendChild(textEl);
      }

      if (m.attachment) {
        const attachment = document.createElement('div');
        attachment.className = 'message-attachment';
        attachment.innerHTML = `<strong>Attachment:</strong> ${escapeHtml(m.attachment.name)} <span class=\"muted small\">(${escapeHtml(m.attachment.size)})</span>`;
        if (m.attachment.url) {
          const link = document.createElement('a');
          link.href = m.attachment.url;
          link.target = '_blank';
          link.rel = 'noopener noreferrer';
          link.textContent = 'Download';
          link.className = 'attachment-link';
          attachment.appendChild(link);
        }
        div.appendChild(attachment);
      }

      el.appendChild(div);
    });
    el.scrollTop = el.scrollHeight;
  }

  function sendMockReply(userText) {
    const persona = (conversations[activeConvo]?.model || 'astra').toLowerCase();
    let reply = "I'm here to help.";
    if (persona.includes('astra')) reply = "Astra: I can help with general questions. You said: " + userText;
    else if (persona.includes('neon')) reply = "Neon: Quick code tip — try a focused prompt. You said: " + userText;
    else if (persona.includes('sage')) reply = "Sage: Short reasoning: " + userText;
    else if (persona.includes('gpt')) reply = "GPT: Advanced simulated reply for: " + userText;
    setTimeout(()=> pushMessage('bot', reply), 600 + Math.random()*800);
  }

  function updateSidebarToggle() {
    const sb = $(SELECT.sidebar);
    const sbToggle = $(SELECT.sidebarToggle);
    if (!sb || !sbToggle) return;
    const isOpen = !sb.classList.contains('collapsed');
    sbToggle.textContent = isOpen ? '✕' : '☰';
    sbToggle.setAttribute('aria-expanded', String(isOpen));
  }

  function bind() {
    const sb = $(SELECT.sidebar);
    const sbToggle = $(SELECT.sidebarToggle);
    if (sbToggle && sb) {
      sbToggle.addEventListener('click', ()=> {
        sb.classList.toggle('collapsed');
        updateSidebarToggle();
      });
      updateSidebarToggle();
    }

    const newBtn = $(SELECT.newChat);
    if (newBtn) newBtn.addEventListener('click', ()=> createConversation());

    const clearBtn = $(SELECT.clearHistory);
    if (clearBtn) clearBtn.addEventListener('click', ()=> {
      conversations = {};
      convoList = [];
      activeConvo = null;
      save();
      renderConversationList();
      renderMessages();
    });

    const sel = $(SELECT.modelSelect);
    if (sel) sel.addEventListener('change', (e)=> {
      if (!activeConvo) return;
      conversations[activeConvo].model = e.target.value;
      save();
      renderConversationList();
    });

    const attachBtn = $(SELECT.attachBtn);
    const attachmentInput = $(SELECT.attachmentInput);
    const attachmentPreview = $(SELECT.attachmentPreview);
    function renderAttachmentPreview() {
      if (!attachmentPreview) return;
      if (!pendingAttachment) {
        attachmentPreview.hidden = true;
        attachmentPreview.classList.remove('visible');
        attachmentPreview.innerHTML = '';
        return;
      }
      attachmentPreview.hidden = false;
      attachmentPreview.classList.add('visible');
      attachmentPreview.innerHTML = `<span>${escapeHtml(pendingAttachment.name)}</span>`;
      const removeBtn = document.createElement('button');
      removeBtn.type = 'button';
      removeBtn.className = 'btn ghost remove-attachment';
      removeBtn.textContent = 'Remove';
      removeBtn.addEventListener('click', ()=> {
        pendingAttachment = null;
        if (pendingAttachmentUrl) {
          URL.revokeObjectURL(pendingAttachmentUrl);
          pendingAttachmentUrl = null;
        }
        if (attachmentInput) attachmentInput.value = '';
        renderAttachmentPreview();
      });
      attachmentPreview.appendChild(removeBtn);
    }

    if (attachBtn && attachmentInput) {
      attachBtn.addEventListener('click', ()=> attachmentInput.click());
      attachmentInput.addEventListener('change', (event)=> {
        const file = event.target.files?.[0];
        if (!file) return;
        if (pendingAttachmentUrl) URL.revokeObjectURL(pendingAttachmentUrl);
        pendingAttachmentUrl = URL.createObjectURL(file);
        pendingAttachment = {
          name: file.name,
          size: `${Math.round(file.size / 1024)} KB`,
          type: file.type,
          url: pendingAttachmentUrl
        };
        renderAttachmentPreview();
      });
    }

    const form = $(SELECT.composer);
    const input = $(SELECT.input);
    if (form && input) {
      form.addEventListener('submit', (ev)=> {
        ev.preventDefault();
        const text = input.value.trim();
        if (!text && !pendingAttachment) return;
        pushMessage('user', text, pendingAttachment);
        input.value = '';
        pendingAttachment = null;
        if (pendingAttachmentUrl) {
          URL.revokeObjectURL(pendingAttachmentUrl);
          pendingAttachmentUrl = null;
        }
        renderAttachmentPreview();
        sendMockReply(text || 'Sent an attachment');
      });
    }

    const renameBtn = $(SELECT.renameChat);
    if (renameBtn) renameBtn.addEventListener('click', ()=> {
      if (!activeConvo) return;
      const newTitle = prompt('Rename chat', conversations[activeConvo].title) || conversations[activeConvo].title;
      renameConversation(activeConvo, newTitle);
    });

    const delBtn = $(SELECT.deleteChat);
    if (delBtn) delBtn.addEventListener('click', ()=> {
      if (!activeConvo) return;
      if (confirm('Delete this conversation?')) deleteConversation(activeConvo);
    });
  }

  /* small helpers */
  function escapeHtml(s){ return (s||'').toString().replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  function timeAgo(ts){
    if(!ts) return '';
    const diff = Math.floor((Date.now()-ts)/1000);
    if (diff < 60) return `${diff}s`;
    if (diff < 3600) return `${Math.floor(diff/60)}m`;
    if (diff < 86400) return `${Math.floor(diff/3600)}h`;
    return `${Math.floor(diff/86400)}d`;
  }

  function init(){
    load();
    // if no conversations, create a default one
    if (convoList.length === 0) createConversation('Welcome', 'Astra');
    else {
      activeConvo = convoList[0];
      setActiveConversation(activeConvo);
    }
    renderConversationList();
    renderMessages();
    bind();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else { init(); }

})();
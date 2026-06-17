(function () {
  'use strict';

  if (customElements.get('chat-ia-widget')) return;


  function parseMd(text) {
    if (!text) return '';
    let html = text

      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

      .replace(/```(\w*)\n([\s\S]*?)```/g, function (_, lang, code) {
        return '<pre><code>' + code.trim() + '</code></pre>';
      })

      .replace(/`([^`]+)`/g, '<code>$1</code>')

      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/__(.+?)__/g, '<strong>$1</strong>')

      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/_(.+?)_/g, '<em>$1</em>')

      .replace(/^### (.+)$/gm, '<h3>$1</h3>')
      .replace(/^## (.+)$/gm, '<h2>$1</h2>')
      .replace(/^# (.+)$/gm, '<h1>$1</h1>')

      .replace(/^---$/gm, '<hr>')

      .replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>')

      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')

      .replace(/^[\*\-] (.+)$/gm, '<li>$1</li>')

      .replace(/^\d+\. (.+)$/gm, '<li>$1</li>');


    html = html.replace(/((?:<li>.*<\/li>\n?)+)/g, '<ul>$1</ul>');

    html = html.replace(/<\/blockquote>\n<blockquote>/g, '<br>');

    html = html.replace(/\n\n/g, '</p><p>');

    html = html.replace(/\n/g, '<br>');

    if (!html.startsWith('<')) html = '<p>' + html + '</p>';
    return html;
  }


  function fmtDate(d) {
    if (!d) return '';
    var dt = d instanceof Date ? d : new Date(d);
    if (isNaN(dt.getTime())) return '';
    var pad = function (n, s) { return String(n).padStart(s, '0'); };
    return pad(dt.getDate(), 2) + '/' + pad(dt.getMonth() + 1, 2) + '/' + dt.getFullYear() + ' ' +
      pad(dt.getHours(), 2) + ':' + pad(dt.getMinutes(), 2) + ':' + pad(dt.getSeconds(), 2) + '.' +
      pad(dt.getMilliseconds(), 3);
  }


  var ICONS = {
    sparkle: '<svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22"><path d="M12 2L9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61z"/></svg>',
    close: '<svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>',
    send: '<svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>',
    history: '<svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M13 3a9 9 0 0 0-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42A8.954 8.954 0 0 0 13 21a9 9 0 0 0 0-18zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z"/></svg>',
    newChat: '<svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M4 4h16v12H5.17L4 17.17V4m0-2c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2H4zm4 10h8v2H8v-2zm0-3h8v2H8V9zm0-3h8v2H8V6z"/></svg>',
    expand: '<svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M21 11V3h-8l3.29 3.29-10 10L3 13v8h8l-3.29-3.29 10-10z"/></svg>',
    collapse: '<svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M22 3.41L16.71 8.7 20 12h-8V4l3.29 3.29L20.59 2 22 3.41zM3.41 22l5.29-5.29L12 20v-8H4l3.29 3.29L2 20.59 3.41 22z"/></svg>',
    robot: '<svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M17.753 14a2.25 2.25 0 0 1 2.25 2.25v.904A3.75 3.75 0 0 1 18.696 20c-1.565 1.344-3.75 2-6.696 2s-5.131-.656-6.696-2a3.75 3.75 0 0 1-1.307-2.846v-.904A2.25 2.25 0 0 1 6.247 14h11.506zM11.898 2.008L12 2a.75.75 0 0 1 .743.648l.007.102v.5h3.5a2.25 2.25 0 0 1 2.25 2.25v4a2.25 2.25 0 0 1-2.25 2.25h-8.5A2.25 2.25 0 0 1 5.5 9.5v-4a2.25 2.25 0 0 1 2.25-2.25h3.5v-.5a.75.75 0 0 1 .648-.743L12 2l-.102.008zM9.75 6.5a1.25 1.25 0 1 0 0 2.5 1.25 1.25 0 0 0 0-2.5zm4.5 0a1.25 1.25 0 1 0 0 2.5 1.25 1.25 0 0 0 0-2.5z"/></svg>',
    thumbUp: '<svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14"><path d="M1 21h4V9H1v12zm22-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2z"/></svg>',
    thumbUpOut: '<svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14"><path d="M9 21h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.58 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2zM9 9l4.34-4.34L12 10h9v2l-3 7H9V9zM1 9h4v12H1V9z"/></svg>',
    thumbDown: '<svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14"><path d="M15 3H6c-.83 0-1.54.5-1.84 1.22l-3.02 7.05c-.09.23-.14.47-.14.73v2c0 1.1.9 2 2 2h6.31l-.95 4.57-.03.32c0 .41.17.79.44 1.06L9.83 23l6.59-6.59c.36-.36.58-.86.58-1.41V5c0-1.1-.9-2-2-2zm4 0v12h4V3h-4z"/></svg>',
    thumbDownOut: '<svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14"><path d="M15 3H6c-.83 0-1.54.5-1.84 1.22l-3.02 7.05c-.09.23-.14.47-.14.73v2c0 1.1.9 2 2 2h6.31l-.95 4.57-.03.32c0 .41.17.79.44 1.06L9.83 23l6.58-6.59c.37-.36.59-.86.59-1.41V5c0-1.1-.9-2-2-2zm0 12l-4.34 4.34L12 14H3v-2l3-7h9v10zm4-12h4v12h-4V3z"/></svg>',
    copy: '<svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>',
    delete: '<svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>',
    star: '<svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>',
    starOut: '<svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14"><path d="M22 9.24l-7.19-.62L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27 18.18 21l-1.63-7.03L22 9.24zM12 15.4l-3.76 2.27 1-4.28-3.32-2.88 4.38-.38L12 6.1l1.71 4.04 4.38.38-3.32 2.88 1 4.28L12 15.4z"/></svg>',
    agent: '<svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14"><path d="M21 12.22C21 6.73 16.74 3 12 3c-4.69 0-9 3.65-9 9.28-.6.34-1 .98-1 1.72v2c0 1.1.9 2 2 2h1v-6.1c0-3.87 3.13-7 7-7s7 3.13 7 7V19h-8v2h8c1.1 0 2-.9 2-2v-1.22c.59-.31 1-.92 1-1.64v-2.3c0-.7-.41-1.31-1-1.62z"/><circle cx="9" cy="13" r="1"/><circle cx="15" cy="13" r="1"/><path d="M18 11.03A6.04 6.04 0 0 0 12.05 6C9.02 6 5.76 8.51 6.02 12.45c2.47-2.04 4.46-3.09 5.84-3.42 1.54-.37 3.22.12 6.14 1.99z"/></svg>'
  };


  function parseToRGB(str, defaultHex, defaultRgb) {
    if (!str) return { hex: defaultHex, rgb: defaultRgb };
    str = str.trim();


    if (/^\d+\s*,\s*\d+\s*,\s*\d+$/.test(str)) {
      return { hex: 'rgb(' + str + ')', rgb: str };
    }


    var rgbMatch = str.match(/^rgba?\((\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*[\d\.]+)?\)$/i);
    if (rgbMatch) {
      return {
        hex: str,
        rgb: rgbMatch[1] + ', ' + rgbMatch[2] + ', ' + rgbMatch[3]
      };
    }


    var hex = str;
    if (!hex.startsWith('#') && /^[0-9a-fA-F]{3,8}$/.test(hex)) {
      hex = '#' + hex;
    }
    if (hex.startsWith('#')) {
      var clean = hex.substring(1);
      if (clean.length === 3) {
        clean = clean[0] + clean[0] + clean[1] + clean[1] + clean[2] + clean[2];
      }
      if (clean.length === 6) {
        var r = parseInt(clean.substring(0, 2), 16);
        var g = parseInt(clean.substring(2, 4), 16);
        var b = parseInt(clean.substring(4, 6), 16);
        if (!isNaN(r) && !isNaN(g) && !isNaN(b)) {
          return { hex: '#' + clean, rgb: r + ', ' + g + ', ' + b };
        }
      }
    }


    return { hex: defaultHex, rgb: defaultRgb };
  }


  function buildCSS(colors) {
    var ac = colors.accent.hex;
    var acRgb = colors.accent.rgb;
    var bg = colors.bg.hex;
    var bodyBg = colors.bodyBg.hex;
    var text = colors.text.hex;
    var textRgb = colors.text.rgb;
    var bubbleBotBg = colors.bubbleBotBg.hex;
    var bubbleBotColor = colors.bubbleBotColor.hex;
    var bubbleUserBg = colors.bubbleUserBg.hex;
    var bubbleUserBgRgb = colors.bubbleUserBg.rgb;
    var bubbleUserColor = colors.bubbleUserColor.hex;
    var bubbleUserColorRgb = colors.bubbleUserColor.rgb;

    return /* css */ '\
      :host { all: initial; font-family: "Inter","Segoe UI",system-ui,sans-serif; font-size: 14px; line-height: 1.5; }\
      *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }\
      \
      /* Animations */\
      @keyframes pulseIA { 0% { box-shadow: 0 0 0 0 rgba(' + acRgb + ', 0.6); } 70% { box-shadow: 0 0 0 16px rgba(' + acRgb + ', 0); } 100% { box-shadow: 0 0 0 0 rgba(' + acRgb + ', 0); } }\
      @keyframes fadeInUp { from { opacity: 0; transform: translateY(16px) scale(.96); } to { opacity: 1; transform: translateY(0) scale(1); } }\
      @keyframes dotBounce { 0%,80%,100% { transform: translateY(0); } 40% { transform: translateY(-6px); } }\
      @keyframes spin { to { transform: rotate(360deg); } }\
      \
      /* FAB */\
      .fab { position: fixed; z-index: 10000; width: 48px; height: 48px; border-radius: 50%; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, ' + ac + ' 0%, rgba(' + acRgb + ', 0.8) 100%); color: #fff; box-shadow: 0 4px 20px rgba(' + acRgb + ', 0.4); transition: transform .2s, box-shadow .2s; }\
      .fab:hover { transform: scale(1.08); box-shadow: 0 6px 28px rgba(' + acRgb + ', 0.53); }\
      .fab.pulse { animation: pulseIA 2.4s infinite; }\
      .fab.bottom-right { bottom: 24px; right: 24px; }\
      .fab.bottom-left  { bottom: 24px; left: 24px; }\
      \
      .panel { position: fixed; z-index: 10001; display: flex; flex-direction: column; border-radius: 16px; overflow: hidden; box-shadow: 0 24px 64px rgba(0,0,0,.45); animation: fadeInUp .25s ease-out; transition: all .3s cubic-bezier(.4,0,.2,1); background: ' + bg + '; color: ' + text + '; }\
      .panel.bottom-right { bottom: 84px; right: 24px; }\
      .panel.bottom-left  { bottom: 84px; left: 24px; }\
      .panel.no-fab.bottom-right { bottom: 10px; right: 10px; }\
      .panel.no-fab.bottom-left  { bottom: 10px; left: 10px; }\
      .panel.normal { width: 380px; height: 560px; }\
      .panel.expanded { width: calc(100vw - 32px); height: calc(100vh - 32px); bottom: 16px !important; right: 16px !important; left: auto !important; border-radius: 8px; }\
      .chat-view { display: flex; flex-direction: column; flex: 1; min-height: 0; }\
      @media (max-width: 600px) {\
        .panel.normal { width: calc(100vw - 24px); height: 70vh; right: 12px !important; left: auto !important; bottom: 90px; }\
        .panel.no-fab.normal { bottom: 10px !important; right: 10px !important; width: calc(100vw - 20px); }\
        .fab.bottom-right, .fab.bottom-left { bottom: 16px; right: 12px; left: auto; width: 42px; height: 42px; }\
      }\
      \
      /* Header */\
      .header { background: linear-gradient(135deg, ' + ac + ' 0%, rgba(' + acRgb + ', 0.8) 100%); padding: 10px 14px; display: flex; align-items: center; gap: 10px; flex-shrink: 0; }\
      .header-info { flex: 1; min-width: 0; }\
      .header-title { font-size: 14px; font-weight: 700; color: #fff; }\
      .header-sub { font-size: 11px; color: rgba(255,255,255,.8); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }\
      .hbtn { background: none; border: none; color: #fff; cursor: pointer; padding: 4px; border-radius: 6px; display: flex; align-items: center; justify-content: center; opacity: .85; transition: opacity .2s, background .2s; }\
      .header.hide-buttons #btn-expand, .header.hide-buttons #btn-close { display: none !important; }\
      .hbtn:hover { opacity: 1; background: rgba(255,255,255,.15); }\
      \
      /* Body */\
      .body { flex: 1; overflow-y: auto; padding: 12px; display: flex; flex-direction: column; gap: 8px; background: ' + bodyBg + '; }\
      .body::-webkit-scrollbar { width: 4px; }\
      .body::-webkit-scrollbar-thumb { background: rgba(' + textRgb + ', 0.2); border-radius: 2px; }\
      \
      /* Messages */\
      .msg-row { display: flex; align-items: flex-end; gap: 8px; }\
      .msg-row.user { justify-content: flex-end; }\
      .msg-row.bot  { justify-content: flex-start; }\
      .avatar { width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; background: linear-gradient(135deg, ' + ac + ' 0%, rgba(' + acRgb + ', 0.8) 100%); color: #fff; }\
      .avatar.auditor { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); }\
      .bubble { max-width: 75%; padding: 10px 14px; border-radius: 18px 18px 18px 4px; background: ' + bubbleBotBg + '; color: ' + bubbleBotColor + '; box-shadow: 0 1px 4px rgba(0,0,0,.12); font-size: 14px; line-height: 1.6; word-break: break-word; }\
      .bubble.user { border-radius: 18px 18px 4px 18px; background: linear-gradient(135deg, ' + bubbleUserBg + ' 0%, rgba(' + bubbleUserBgRgb + ', 0.8) 100%); color: ' + bubbleUserColor + '; }\
      .bubble.auditor { background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); color: #92400e; border: 1px solid #f59e0b; }\
      .bubble p { margin: 0 0 4px; } .bubble p:last-child { margin-bottom: 0; }\
      .bubble strong { font-weight: 700; }\
      .bubble em { font-style: italic; }\
      .bubble ul, .bubble ol { padding-left: 20px; margin: 4px 0; }\
      .bubble li { margin-bottom: 2px; }\
      .bubble code { font-family: monospace; font-size: 12px; background: rgba(' + textRgb + ', 0.08); padding: 1px 5px; border-radius: 4px; }\
      .bubble.user code { background: rgba(' + bubbleUserColorRgb + ', 0.2); }\
      .bubble pre { background: rgba(0,0,0,.15); border-radius: 6px; padding: 8px; overflow-x: auto; margin: 4px 0; }\
      .bubble pre code { background: none; padding: 0; }\
      .bubble blockquote { border-left: 3px solid ' + ac + '; padding-left: 10px; margin: 4px 0; opacity: .85; }\
      .bubble.user blockquote { border-left-color: rgba(' + bubbleUserColorRgb + ', 0.5); }\
      .bubble h1, .bubble h2, .bubble h3 { margin: 4px 0 2px; font-weight: 700; line-height: 1.3; }\
      .bubble h1 { font-size: 16px; } .bubble h2 { font-size: 15px; } .bubble h3 { font-size: 14px; }\
      .bubble a { color: ' + ac + '; text-decoration: underline; }\
      .bubble.user a { color: ' + bubbleUserColor + '; text-decoration: underline; }\
      .bubble hr { border: none; border-top: 1px solid rgba(' + textRgb + ', 0.1); margin: 8px 0; }\
      \
      .msg-meta { display: flex; align-items: center; justify-content: flex-end; gap: 10px; margin-top: 6px; padding-top: 4px; border-top: 1px solid rgba(' + textRgb + ', 0.08); }\
      .bubble.user .msg-meta { border-top-color: rgba(' + bubbleUserColorRgb + ', 0.15); }\
      .msg-time { font-size: 10px; opacity: .6; font-family: monospace; }\
      .msg-actions { display: flex; gap: 4px; }\
      .msg-actions button { background: none; border: none; cursor: pointer; padding: 2px; border-radius: 4px; color: rgba(' + textRgb + ', 0.5); display: flex; align-items: center; transition: color .2s, background .2s; }\
      .msg-actions button:hover { color: ' + ac + '; background: rgba(' + textRgb + ', 0.06); }\
      .msg-actions button.active-up { color: #10b981; }\
      .msg-actions button.active-down { color: #ef4444; }\
      \
      /* Typing indicator */\
      .typing { display: flex; align-items: flex-end; gap: 8px; }\
      .dots { display: flex; gap: 4px; align-items: center; padding: 10px 14px; background: ' + bubbleBotBg + '; border-radius: 18px 18px 18px 4px; box-shadow: 0 1px 4px rgba(0,0,0,.08); }\
      .dot { width: 7px; height: 7px; border-radius: 50%; background: ' + ac + '; }\
      .dot:nth-child(1) { animation: dotBounce 1.2s ease-in-out 0s infinite; }\
      .dot:nth-child(2) { animation: dotBounce 1.2s ease-in-out .2s infinite; }\
      .dot:nth-child(3) { animation: dotBounce 1.2s ease-in-out .4s infinite; }\
      .status-text { margin-left: 8px; font-size: 11px; color: rgba(' + textRgb + ', 0.6); font-style: italic; white-space: nowrap; }\
      \
      /* Input area */\
      .input-area { padding: 10px 12px; background: ' + bg + '; border-top: 1px solid rgba(' + textRgb + ', 0.08); display: flex; align-items: center; gap: 8px; flex-shrink: 0; }\
      .input-area textarea { flex: 1; resize: none; border: 1px solid rgba(' + textRgb + ', 0.12); border-radius: 12px; padding: 8px 12px; font-size: 14px; font-family: inherit; color: ' + text + '; background: ' + bodyBg + '; outline: none; max-height: 72px; line-height: 1.4; transition: border-color .2s; }\
      .input-area textarea::placeholder { color: rgba(' + textRgb + ', 0.45); }\
      .input-area textarea:focus { border-color: ' + ac + '; }\
      .send-btn { width: 36px; height: 36px; border-radius: 50%; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, ' + ac + ' 0%, rgba(' + acRgb + ', 0.8) 100%); color: #fff; flex-shrink: 0; transition: opacity .2s; }\
      .send-btn:disabled { background: rgba(' + textRgb + ', 0.1); cursor: default; opacity: .5; }\
      .spinner-sm { width: 18px; height: 18px; border: 2px solid rgba(255,255,255,.3); border-top-color: #fff; border-radius: 50%; animation: spin .7s linear infinite; }\
      \
      /* Footer */\
      .footer { background: ' + bg + '; border-top: 1px solid rgba(' + textRgb + ', 0.08); text-align: center; padding: 4px 12px; flex-shrink: 0; }\
      .footer-text { font-size: 11px; color: rgba(' + textRgb + ', 0.45); }\
      \
      /* Rating */\
      .rating-bar { display: flex; align-items: center; justify-content: center; gap: 4px; padding: 4px 12px; background: ' + bg + '; border-top: 1px solid rgba(' + textRgb + ', 0.08); flex-shrink: 0; }\
      .rating-bar .label { font-size: 11px; color: rgba(' + textRgb + ', 0.6); margin-right: 4px; }\
      .rating-bar button { background: none; border: none; cursor: pointer; padding: 0; display: flex; color: rgba(' + textRgb + ', 0.25); transition: color .15s; }\
      .rating-bar button:disabled { cursor: default; }\
      .rating-bar button.filled { color: #f59e0b; }\
      \
      /* Consent */\
      .consent { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 24px; gap: 14px; background: ' + bodyBg + '; }\
      .consent-icon { width: 56px; height: 56px; border-radius: 50%; background: linear-gradient(135deg, ' + ac + ' 0%, rgba(' + acRgb + ', 0.8) 100%); display: flex; align-items: center; justify-content: center; color: #fff; }\
      .consent h3 { font-size: 16px; font-weight: 700; text-align: center; color: ' + text + '; }\
      .consent p { font-size: 13px; color: rgba(' + textRgb + ', 0.65); text-align: center; line-height: 1.5; }\
      .consent-buttons { display: flex; gap: 8px; margin-top: 6px; }\
      .consent-buttons button { padding: 8px 18px; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; border: none; transition: opacity .2s; }\
      .btn-decline { background: transparent; border: 1px solid rgba(' + textRgb + ', 0.15) !important; color: #ef4444; }\
      .btn-decline:hover { background: rgba(239,68,68,.1); }\
      .btn-accept { background: linear-gradient(135deg, ' + ac + ' 0%, rgba(' + acRgb + ', 0.8) 100%); color: #fff; }\
      .btn-accept:hover { opacity: .9; }\
      \
      /* History */\
      .history { flex: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 8px; background: ' + bodyBg + '; }\
      .history::-webkit-scrollbar { width: 4px; }\
      .history::-webkit-scrollbar-thumb { background: rgba(' + textRgb + ', 0.2); border-radius: 2px; }\
      .hist-title-row { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; color: ' + ac + '; }\
      .hist-title-row h3 { font-size: 16px; font-weight: 700; color: ' + text + '; }\
      .hist-item { display: flex; align-items: center; gap: 8px; padding: 10px 12px; border-radius: 10px; background: ' + bg + '; cursor: pointer; transition: background .2s, border-color .2s; border: 1px solid transparent; }\
      .hist-item:hover { background: ' + bubbleBotBg + '; border-color: rgba(' + acRgb + ', 0.33); }\
      .hist-item:hover .hist-del { opacity: 1; }\
      .hist-item-info { flex: 1; display: flex; flex-direction: column; gap: 2px; min-width: 0; }\
      .hist-subject { font-size: 13px; font-weight: 600; color: ' + text + '; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }\
      .hist-agent { font-size: 11px; color: ' + ac + '; font-weight: 500; }\
      .hist-date { font-size: 11px; color: rgba(' + textRgb + ', 0.5); }\
      .hist-del { background: none; border: pointer; cursor: pointer; color: #ef4444; opacity: 0; transition: opacity .2s; padding: 4px; border-radius: 6px; display: flex; }\
      .hist-del:hover { background: rgba(239,68,68,.1); }\
      .hist-empty { text-align: center; color: rgba(' + textRgb + ', 0.5); font-size: 13px; padding: 32px 0; }\
      .hist-loading { display: flex; justify-content: center; padding: 16px; }\
      .hist-loading .spinner-sm { border-top-color: ' + ac + '; }\
      \
      /* Empty state */\
      .empty-state { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; padding: 32px; }\
      .empty-icon { width: 56px; height: 56px; border-radius: 50%; background: linear-gradient(135deg, ' + ac + ' 0%, rgba(' + acRgb + ', 0.8) 100%); display: flex; align-items: center; justify-content: center; color: #fff; }\
      .empty-state h3 { font-size: 16px; font-weight: 700; color: ' + text + '; }\
      .empty-state p { font-size: 13px; color: rgba(' + textRgb + ', 0.5); text-align: center; }\
      \
      /* Feedback dialog */\
      .dialog-overlay { position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,.4); display: flex; align-items: center; justify-content: center; z-index: 100; padding: 16px; }\
      .dialog { background: ' + bodyBg + '; border-radius: 12px; padding: 20px; max-width: 340px; width: 100%; box-shadow: 0 12px 40px rgba(0,0,0,.15); border: 1px solid rgba(' + textRgb + ', 0.08); }\
      .dialog h4 { font-size: 15px; font-weight: 700; color: ' + text + '; margin-bottom: 8px; }\
      .dialog p { font-size: 12px; color: rgba(' + textRgb + ', 0.6); margin-bottom: 12px; }\
      .dialog textarea { width: 100%; resize: none; border: 1px solid rgba(' + textRgb + ', 0.12); border-radius: 8px; padding: 8px 10px; font-size: 13px; font-family: inherit; color: ' + text + '; background: ' + bg + '; outline: none; height: 72px; }\
      .dialog textarea:focus { border-color: ' + ac + '; }\
      .dialog-btns { display: flex; justify-content: flex-end; gap: 8px; margin-top: 12px; }\
      .dialog-btns button { padding: 6px 16px; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; border: none; }\
      .dialog-btns .cancel { background: transparent; color: rgba(' + textRgb + ', 0.6); }\
      .dialog-btns .cancel:hover { color: ' + text + '; }\
      .dialog-btns .submit { background: linear-gradient(135deg, ' + ac + ' 0%, rgba(' + acRgb + ', 0.8) 100%); color: #fff; }\
      .dialog-btns .submit:hover { opacity: .9; }\
      \
      .hidden { display: none !important; }\
    ';
  }


  class ChatIAWidget extends HTMLElement {

    constructor() {
      super();
      this._shadow = this.attachShadow({ mode: 'open' });


      this._open = false;
      this._expanded = false;
      this._messages = [];
      this._input = '';
      this._isTyping = false;
      this._statusText = '';
      this._streamingText = '';
      this._threadId = '';
      this._threadError = 0;
      this._consentGiven = false;
      this._showConsent = false;
      this._showHistory = false;
      this._history = [];
      this._historyPage = 1;
      this._historyHasMore = true;
      this._loadingHistory = false;
      this._feedbackRating = 0;
      this._feedbackSent = false;
      this._feedbackDialogOpen = false;
      this._feedbackDialogChatId = null;
      this._feedbackDialogText = '';
      this._userEventsSource = null;
    }


    static get observedAttributes() {
      return ['agent-id', 'agent-name', 'agent-title', 'user-email', 'user-name', 'user-cnpj',
        'api-url', 'api-key', 'accent-color', 'position', 'hide-fab',
        'bg-color', 'body-bg-color', 'text-color', 'bubble-bot-bg', 'bubble-bot-color', 'bubble-user-bg', 'bubble-user-color',
        'allow-minimize-and-close'];
    }

    attributeChangedCallback(name, oldValue, newValue) {
      if (oldValue === newValue) return;

      if (this.isConnected) {
        if (['user-email', 'user-cnpj', 'agent-id', 'agent-name'].indexOf(name) !== -1) {

          this._threadId = '';
          this._messages = [];
          this._history = [];
          this._feedbackRating = 0;
          this._feedbackSent = false;
          this._streamingText = '';
          this._statusText = '';
          this._isTyping = false;
          this._closeUserEvents();

          if (this._open) {
            this._handleOpen();
          } else {
            this._render(true);
          }
        } else {
          this._render(false);
        }
      }
    }


    get agentId() { return this.getAttribute('agent-id') || ''; }
    get agentName() { return this.getAttribute('agent-name') || ''; }
    get agentTitle() { return this.getAttribute('agent-title') || this.agentName || 'Assistente IA'; }
    get userEmail() { return this.getAttribute('user-email') || ''; }
    get userName() { return this.getAttribute('user-name') || ''; }
    get userCnpj() { return this.getAttribute('user-cnpj') || ''; }
    get apiUrl() { return (this.getAttribute('api-url') || 'https://assistant.arpasistemas.com.br').replace(/\/$/, ''); }
    get apiKey() { return this.getAttribute('api-key') || ''; }
    get accentColor() { return this.getAttribute('accent-color') || '#bd4140'; }
    get bgColor() { return this.getAttribute('bg-color') || '#1a1d27'; }
    get bodyBgColor() { return this.getAttribute('body-bg-color') || '#21253a'; }
    get textColor() { return this.getAttribute('text-color') || '#e2e8f0'; }
    get bubbleBotBg() { return this.getAttribute('bubble-bot-bg') || '#2a2f47'; }
    get bubbleBotColor() { return this.getAttribute('bubble-bot-color') || '#e2e8f0'; }
    get bubbleUserBg() { return this.getAttribute('bubble-user-bg') || ''; }
    get bubbleUserColor() { return this.getAttribute('bubble-user-color') || '#fff'; }
    get posClass() { return this.getAttribute('position') === 'bottom-left' ? 'bottom-left' : 'bottom-right'; }
    get hideFab() { return this.hasAttribute('hide-fab'); }
    get allowMinimizeAndClose() { return this.getAttribute('allow-minimize-and-close') !== 'false'; }


    connectedCallback() {
      this._render(true);
    }

    disconnectedCallback() {
      this._closeUserEvents();
    }


    _render(forceScroll) {
      if (forceScroll === undefined) forceScroll = false;
      var self = this;
      var s = this._shadow;


      var style = s.querySelector('style');
      if (!style) {
        style = document.createElement('style');
        s.appendChild(style);
      }
      var colors = {
        accent: parseToRGB(this.accentColor, '#bd4140', '189, 65, 64'),
        bg: parseToRGB(this.bgColor, '#1a1d27', '26, 29, 39'),
        bodyBg: parseToRGB(this.bodyBgColor, '#21253a', '33, 37, 58'),
        text: parseToRGB(this.textColor, '#e2e8f0', '226, 232, 240'),
        bubbleBotBg: parseToRGB(this.bubbleBotBg, '#2a2f47', '42, 47, 71'),
        bubbleBotColor: parseToRGB(this.bubbleBotColor, '#e2e8f0', '226, 232, 240'),
        bubbleUserBg: parseToRGB(this.bubbleUserBg || this.accentColor, '#bd4140', '189, 65, 64'),
        bubbleUserColor: parseToRGB(this.bubbleUserColor, '#fff', '255, 255, 255')
      };
      style.textContent = buildCSS(colors);


      var fab = s.querySelector('.fab');
      if (!fab) {
        fab = document.createElement('button');
        fab.innerHTML = ICONS.sparkle;
        fab.title = 'Assistente IA';
        fab.addEventListener('click', function () { self._handleOpen(); });
        s.appendChild(fab);
        this._fabEl = fab;
      }
      fab.className = 'fab ' + this.posClass + (this._open ? '' : ' pulse') + (this.hideFab ? ' hidden' : '');

      if (!this._open) {
        var existingPanel = s.querySelector('.panel');
        if (existingPanel) {
          existingPanel.remove();
          this._panelEl = null;
        }
        return;
      }


      var panel = s.querySelector('.panel');
      if (!panel) {
        panel = document.createElement('div');
        s.appendChild(panel);
        this._panelEl = panel;
      }
      panel.className = 'panel ' + this.posClass + ' ' + (this._expanded ? 'expanded' : 'normal') + (this.hideFab ? ' no-fab' : '');


      var header = panel.querySelector('.header');
      if (!header) {
        header = document.createElement('div');
        header.className = 'header';
        panel.appendChild(header);
      }
      header.classList.toggle('hide-buttons', !this.allowMinimizeAndClose);

      var headerInfo = header.querySelector('.header-info');
      if (!headerInfo) {
        var subText = this.agentName || 'N/A';
        if (this.userEmail) {
          subText += ' | ' + this.userEmail;
        }
        header.innerHTML = '\
          <div class="header-info">\
            <div class="header-title">Assistente IA</div>\
            <div class="header-sub">' + this._esc(subText) + '</div>\
          </div>';

        var btnHistory = this._hBtn(ICONS.history, 'Histórico de Conversas', function () {
          if (self._showHistory) { self._showHistory = false; self._render(); }
          else self._openHistory();
        });
        var btnNew = this._hBtn(ICONS.newChat, 'Novo Chat', function () { self._handleReset(); });
        var btnExp = this._hBtn(this._expanded ? ICONS.collapse : ICONS.expand, this._expanded ? 'Recolher' : 'Expandir', function () {
          self._expanded = !self._expanded; self._render();
        });
        var btnClose = this._hBtn(ICONS.close, 'Fechar', function () {
          self._open = false; self._render();
        });

        btnExp.setAttribute('id', 'btn-expand');
        btnClose.setAttribute('id', 'btn-close');
        header.appendChild(btnHistory);
        header.appendChild(btnNew);
        header.appendChild(btnExp);
        header.appendChild(btnClose);
      } else {
        var sub = headerInfo.querySelector('.header-sub');
        if (sub) {
          var subText = this.agentName || 'N/A';
          if (this.userEmail) {
            subText += ' | ' + this.userEmail;
          }
          sub.textContent = subText;
        }

        var btnExp = header.querySelector('#btn-expand');
        if (btnExp) {
          btnExp.innerHTML = this._expanded ? ICONS.collapse : ICONS.expand;
          btnExp.title = this._expanded ? 'Recolher' : 'Expandir';
        }
      }


      var consentView = panel.querySelector('.consent');
      if (!consentView) {
        consentView = document.createElement('div');
        consentView.className = 'consent hidden';
        panel.appendChild(consentView);
      }

      var historyView = panel.querySelector('.history');
      if (!historyView) {
        historyView = document.createElement('div');
        historyView.className = 'history hidden';
        panel.appendChild(historyView);
      }

      var chatView = panel.querySelector('.chat-view');
      if (!chatView) {
        chatView = document.createElement('div');
        chatView.className = 'chat-view';

        var body = document.createElement('div');
        body.className = 'body';
        chatView.appendChild(body);

        var rbar = document.createElement('div');
        rbar.className = 'rating-bar hidden';
        chatView.appendChild(rbar);

        var inputArea = document.createElement('div');
        inputArea.className = 'input-area';
        chatView.appendChild(inputArea);

        var footer = document.createElement('div');
        footer.className = 'footer';
        footer.innerHTML = '<span class="footer-text">O Assistente de IA pode cometer erros.</span>';
        chatView.appendChild(footer);

        panel.appendChild(chatView);
      }


      if (this._showConsent) {
        consentView.classList.remove('hidden');
        historyView.classList.add('hidden');
        chatView.classList.add('hidden');
        this._renderConsent(consentView);
      } else if (this._showHistory) {
        consentView.classList.add('hidden');
        historyView.classList.remove('hidden');
        chatView.classList.add('hidden');
        this._renderHistory(historyView);
      } else {
        consentView.classList.add('hidden');
        historyView.classList.add('hidden');
        chatView.classList.remove('hidden');
        this._renderChat(chatView, forceScroll);
      }


      var overlay = panel.querySelector('.dialog-overlay');
      if (overlay) overlay.remove();

      if (this._feedbackDialogOpen) {
        this._renderFeedbackDialog(panel);
      }
    }


    _hBtn(iconHtml, title, handler) {
      var btn = document.createElement('button');
      btn.className = 'hbtn';
      btn.innerHTML = iconHtml;
      btn.title = title;
      btn.addEventListener('click', handler);
      return btn;
    }


    _renderConsent(consentView) {
      var self = this;
      if (!consentView.innerHTML.trim()) {
        consentView.innerHTML = '\
          <div class="consent-icon">' + ICONS.robot + '</div>\
          <h3>Aviso de Privacidade e IA</h3>\
          <p>Este assistente utiliza inteligência artificial fornecida pela OpenAI. Suas mensagens serão enviadas para processamento. Seus dados <strong>não</strong> são usados para treinar modelos da OpenAI.</p>\
          <div class="consent-buttons">\
            <button class="btn-decline">Não aceito</button>\
            <button class="btn-accept">Aceito</button>\
          </div>';
        consentView.querySelector('.btn-decline').addEventListener('click', function () {
          self._showConsent = false; self._open = false; self._render();
        });
        consentView.querySelector('.btn-accept').addEventListener('click', function () {
          try { localStorage.setItem('ia_consent', 'true'); } catch (e) { }
          self._consentGiven = true; self._showConsent = false;
          self._createNewThread();
        });
      }
    }


    _renderHistory(historyView) {
      var self = this;
      historyView.innerHTML = '';

      var titleRow = document.createElement('div');
      titleRow.className = 'hist-title-row';
      titleRow.innerHTML = ICONS.history + '<h3>Histórico de Conversas</h3>';
      historyView.appendChild(titleRow);

      if (this._history.length === 0 && !this._loadingHistory) {
        var empty = document.createElement('div');
        empty.className = 'hist-empty';
        empty.textContent = 'Nenhum histórico encontrado.';
        historyView.appendChild(empty);
      }

      this._history.forEach(function (t) {
        var item = document.createElement('div');
        item.className = 'hist-item';
        item.innerHTML = '\
          <div class="hist-item-info">\
            <div class="hist-subject">' + self._esc(t.subject || 'Sem assunto') + '</div>\
            <div class="hist-agent">' + self._esc(t.agent_title || t.agent_name || '') + '</div>\
            <div class="hist-date">' + (t.created_at ? new Date(t.created_at).toLocaleString('pt-BR') : '') + '</div>\
          </div>';
        var del = document.createElement('button');
        del.className = 'hist-del';
        del.innerHTML = ICONS.delete;
        del.title = 'Excluir conversa';
        del.addEventListener('click', function (e) {
          e.stopPropagation();
          self._deleteThread(t.thread_id);
        });
        item.appendChild(del);
        item.addEventListener('click', function () {
          self._selectHistoryThread(t.thread_id, t.agent_name);
        });
        historyView.appendChild(item);
      });

      if (this._loadingHistory) {
        var ld = document.createElement('div');
        ld.className = 'hist-loading';
        ld.innerHTML = '<div class="spinner-sm"></div>';
        historyView.appendChild(ld);
      }

      if (!historyView.dataset.hasScrollListener) {
        historyView.dataset.hasScrollListener = 'true';
        historyView.addEventListener('scroll', function () {
          if (historyView.scrollHeight - historyView.scrollTop <= historyView.clientHeight + 50) {
            if (!self._loadingHistory && self._historyHasMore) {
              self._historyPage++;
              self._fetchHistory(self._historyPage);
            }
          }
        });
      }
    }


    _renderChat(chatView, forceScroll) {
      var self = this;
      var body = chatView.querySelector('.body');


      var emptyState = body.querySelector('.empty-state');
      var existingRows = body.querySelectorAll('.msg-row:not(.streaming-row)');

      if (this._messages.length === 0 && !this._isTyping) {
        if (!emptyState) {
          emptyState = document.createElement('div');
          emptyState.className = 'empty-state';
          emptyState.innerHTML = '\
            <div class="empty-icon">' + ICONS.robot + '</div>\
            <h3>Assistente IA</h3>\
            <p>Como posso ajudar você hoje?</p>';
          body.appendChild(emptyState);
        }
        existingRows.forEach(function (r) { r.remove(); });
      } else {
        if (emptyState) emptyState.remove();


        for (var i = 0; i < this._messages.length; i++) {
          var msg = this._messages[i];
          var row = existingRows[i];

          if (!row) {
            row = self._buildMsgEl(msg, i);
            var streamingRow = body.querySelector('.streaming-row');
            var typingEl = body.querySelector('.typing');
            var anchor = streamingRow || typingEl;
            if (anchor) {
              body.insertBefore(row, anchor);
            } else {
              body.appendChild(row);
            }
          } else {
            var isUserRow = row.classList.contains('user');
            if (isUserRow !== msg.isUser) {
              var newRow = self._buildMsgEl(msg, i);
              row.replaceWith(newRow);
            } else {
              var bubble = row.querySelector('.bubble');
              if (bubble) {
                var content = bubble.querySelector('.bubble-content');
                if (content) {
                  var expectedHTML = msg.isUser ? self._esc(msg.text) : parseMd(msg.text);
                  if (content.innerHTML !== expectedHTML) {
                    content.innerHTML = expectedHTML;
                  }
                }

                var upBtn = bubble.querySelector('.msg-action-up');
                if (upBtn) {
                  upBtn.innerHTML = msg.feedback_thumb === 1 ? ICONS.thumbUp : ICONS.thumbUpOut;
                  if (msg.feedback_thumb === 1) upBtn.classList.add('active-up');
                  else upBtn.classList.remove('active-up');
                }
                var downBtn = bubble.querySelector('.msg-action-down');
                if (downBtn) {
                  downBtn.innerHTML = msg.feedback_thumb === -1 ? ICONS.thumbDown : ICONS.thumbDownOut;
                  if (msg.feedback_thumb === -1) downBtn.classList.add('active-down');
                  else downBtn.classList.remove('active-down');
                }
              }
            }
          }
        }

        for (var j = this._messages.length; j < existingRows.length; j++) {
          existingRows[j].remove();
        }
      }


      var streamingRow = body.querySelector('.streaming-row');
      if (this._isTyping && this._streamingText) {
        if (!streamingRow) {
          streamingRow = document.createElement('div');
          streamingRow.className = 'msg-row bot streaming-row';
          streamingRow.innerHTML = '<div class="avatar">' + ICONS.robot + '</div>';
          var bub = document.createElement('div');
          bub.className = 'bubble';
          var content = document.createElement('div');
          content.className = 'bubble-content';
          content.innerHTML = parseMd(self._streamingText);
          bub.appendChild(content);
          var meta = document.createElement('div');
          meta.className = 'msg-meta';
          meta.innerHTML = '<span class="msg-time">' + fmtDate(new Date()) + '</span>';
          bub.appendChild(meta);
          streamingRow.appendChild(bub);

          var typingEl = body.querySelector('.typing');
          if (typingEl) {
            body.insertBefore(streamingRow, typingEl);
          } else {
            body.appendChild(streamingRow);
          }
        } else {
          var content = streamingRow.querySelector('.bubble-content');
          if (content) {
            content.innerHTML = parseMd(self._streamingText);
          }
        }
      } else {
        if (streamingRow) streamingRow.remove();
      }


      var typingEl = body.querySelector('.typing');
      if (this._isTyping) {
        if (!typingEl) {
          typingEl = document.createElement('div');
          typingEl.className = 'typing';
          body.appendChild(typingEl);
        }

        var avatar = typingEl.querySelector('.avatar');
        if (!this._streamingText) {
          if (!avatar) {
            avatar = document.createElement('div');
            avatar.className = 'avatar';
            avatar.innerHTML = ICONS.robot;
            typingEl.insertBefore(avatar, typingEl.firstChild);
          }
        } else {
          if (avatar) avatar.remove();
        }

        var dots = typingEl.querySelector('.dots');
        if (!dots) {
          dots = document.createElement('div');
          dots.className = 'dots';
          typingEl.appendChild(dots);
        }

        dots.innerHTML = '<div class="dot"></div><div class="dot"></div><div class="dot"></div>';
        if (this._statusText) {
          dots.innerHTML += '<span class="status-text">' + this._esc(this._statusText) + '</span>';
        }
      } else {
        if (typingEl) typingEl.remove();
      }


      this._scrollToBottom(forceScroll);


      var inputArea = chatView.querySelector('.input-area');
      var ta = inputArea.querySelector('textarea');
      var sendBtn = inputArea.querySelector('.send-btn');

      if (!ta) {
        ta = document.createElement('textarea');
        ta.placeholder = 'Mensagem...';
        ta.rows = 1;
        ta.addEventListener('input', function () {
          self._input = ta.value;
          ta.style.height = 'auto';
          ta.style.height = Math.min(ta.scrollHeight, 72) + 'px';
        });
        ta.addEventListener('keydown', function (e) {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            self._handleSend();
          }
        });
        inputArea.appendChild(ta);
      }

      if (!sendBtn) {
        sendBtn = document.createElement('button');
        sendBtn.className = 'send-btn';
        sendBtn.addEventListener('click', function () { self._handleSend(); });
        inputArea.appendChild(sendBtn);
      }

      ta.value = this._input;
      ta.disabled = this._isTyping;
      sendBtn.disabled = this._isTyping;
      sendBtn.innerHTML = this._isTyping ? '<div class="spinner-sm"></div>' : ICONS.send;

      if (!this._isTyping) {
        var activeEl = this._shadow.activeElement;
        if (activeEl !== ta) {
          setTimeout(function () { ta.focus(); }, 100);
        }
      }


      var rbar = chatView.querySelector('.rating-bar');
      if (this._messages.length > 1) {
        rbar.classList.remove('hidden');
        rbar.innerHTML = '';
        var lbl = document.createElement('span');
        lbl.className = 'label';
        lbl.textContent = this._feedbackSent ? 'Obrigado!' : 'Avalie:';
        rbar.appendChild(lbl);
        for (var s = 1; s <= 5; s++) {
          (function (star) {
            var sb = document.createElement('button');
            sb.innerHTML = star <= self._feedbackRating ? ICONS.star : ICONS.starOut;
            sb.className = star <= self._feedbackRating ? 'filled' : '';
            sb.disabled = self._feedbackSent;
            sb.addEventListener('click', function () { self._sendRating(star); });
            rbar.appendChild(sb);
          })(s);
        }
      } else {
        rbar.classList.add('hidden');
      }
    }


    _buildMsgEl(msg, idx) {
      var self = this;
      var row = document.createElement('div');
      row.className = 'msg-row ' + (msg.isUser ? 'user' : 'bot');

      if (!msg.isUser) {
        var av = document.createElement('div');
        av.className = 'avatar' + (msg.isAuditor ? ' auditor' : '');
        av.innerHTML = msg.isAuditor ? ICONS.agent : ICONS.robot;
        row.appendChild(av);
      }

      var bub = document.createElement('div');
      bub.className = 'bubble' + (msg.isUser ? ' user' : '') + (msg.isAuditor ? ' auditor' : '');

      var content = document.createElement('div');
      content.className = 'bubble-content';
      if (msg.isUser) {
        content.textContent = msg.text;
      } else {
        content.innerHTML = parseMd(msg.text);
      }
      bub.appendChild(content);

      var meta = document.createElement('div');
      meta.className = 'msg-meta';
      meta.innerHTML = '<span class="msg-time">' + fmtDate(msg.timestamp || new Date()) + '</span>';

      if (!msg.isUser && msg.id) {
        var actions = document.createElement('div');
        actions.className = 'msg-actions';

        var cpBtn = document.createElement('button');
        cpBtn.innerHTML = ICONS.copy;
        cpBtn.title = 'Copiar';
        cpBtn.className = 'msg-action-copy';
        cpBtn.addEventListener('click', function () {
          try { navigator.clipboard.writeText(msg.text); } catch (e) { }
        });
        actions.appendChild(cpBtn);

        var tuBtn = document.createElement('button');
        tuBtn.innerHTML = msg.feedback_thumb === 1 ? ICONS.thumbUp : ICONS.thumbUpOut;
        tuBtn.className = msg.feedback_thumb === 1 ? 'active-up msg-action-up' : 'msg-action-up';
        tuBtn.title = 'Gostei';
        tuBtn.addEventListener('click', function () {
          self._msgFeedback(msg.id, 1);
        });
        actions.appendChild(tuBtn);

        var tdBtn = document.createElement('button');
        tdBtn.innerHTML = msg.feedback_thumb === -1 ? ICONS.thumbDown : ICONS.thumbDownOut;
        tdBtn.className = msg.feedback_thumb === -1 ? 'active-down msg-action-down' : 'msg-action-down';
        tdBtn.title = 'Não Gostei';
        tdBtn.addEventListener('click', function () {
          self._feedbackDialogChatId = msg.id;
          self._feedbackDialogText = msg.feedback_text || '';
          self._feedbackDialogOpen = true;
          self._render();
        });
        actions.appendChild(tdBtn);

        meta.appendChild(actions);
      }

      bub.appendChild(meta);
      row.appendChild(bub);
      return row;
    }


    _scrollToBottom(force) {
      var body = this._shadow.querySelector('.chat-view .body');
      if (!body) return;
      var threshold = 150;
      var isNearBottom = body.scrollHeight - body.scrollTop - body.clientHeight < threshold;
      if (force || isNearBottom) {
        body.scrollTop = body.scrollHeight;
      }
    }


    _renderFeedbackDialog(panel) {
      var self = this;
      var overlay = document.createElement('div');
      overlay.className = 'dialog-overlay';
      var dlg = document.createElement('div');
      dlg.className = 'dialog';
      dlg.innerHTML = '\
        <h4>Como podemos melhorar?</h4>\
        <p>Sua opinião é fundamental. Por favor, conte-nos por que essa resposta não foi útil.</p>';

      var ta = document.createElement('textarea');
      ta.placeholder = 'Seu feedback...';
      ta.value = this._feedbackDialogText;
      ta.addEventListener('input', function () { self._feedbackDialogText = ta.value; });
      dlg.appendChild(ta);

      var btns = document.createElement('div');
      btns.className = 'dialog-btns';
      var cancelBtn = document.createElement('button');
      cancelBtn.className = 'cancel';
      cancelBtn.textContent = 'Cancelar';
      cancelBtn.addEventListener('click', function () {
        self._feedbackDialogOpen = false; self._render();
      });
      var submitBtn = document.createElement('button');
      submitBtn.className = 'submit';
      submitBtn.textContent = 'Enviar Feedback';
      submitBtn.addEventListener('click', function () {
        if (self._feedbackDialogChatId) {
          self._msgFeedback(self._feedbackDialogChatId, -1, self._feedbackDialogText);
        }
        self._feedbackDialogOpen = false;
        self._render();
      });
      btns.appendChild(cancelBtn);
      btns.appendChild(submitBtn);
      dlg.appendChild(btns);

      overlay.appendChild(dlg);
      overlay.addEventListener('click', function (e) {
        if (e.target === overlay) { self._feedbackDialogOpen = false; self._render(); }
      });
      panel.appendChild(overlay);
    }


    _esc(s) { var d = document.createElement('div'); d.textContent = s; return d.innerHTML; }



    _headers(json) {
      var h = {};
      if (json) h['Content-Type'] = 'application/json';
      if (this.apiKey) h['Authorization'] = 'Bearer ' + this.apiKey;
      return h;
    }

    openChat() {
      this._handleOpen();
    }

    closeChat() {
      this._open = false;
      this._render();
    }


    _handleOpen() {
      this._open = true;
      var consent = false;
      try { consent = localStorage.getItem('ia_consent') === 'true'; } catch (e) { }
      if (!consent) {
        this._showConsent = true;
      } else {
        this._consentGiven = true;
        if (!this._threadId) {
          this._createNewThread();
          return;
        }
      }
      this._render(true);
    }


    _handleReset() {
      this._messages = [];
      this._threadId = '';
      this._threadError = 0;
      this._showHistory = false;
      this._feedbackRating = 0;
      this._feedbackSent = false;
      this._streamingText = '';
      this._statusText = '';
      this._isTyping = false;
      this._closeUserEvents();
      this._createNewThread();
    }


    _createNewThread() {
      var self = this;
      var q = new URLSearchParams();
      if (this.userEmail) q.append('email', this.userEmail);
      if (this.userName) q.append('name', this.userName);
      if (this.userCnpj) q.append('cnpj', this.userCnpj);
      if (this.agentName) q.append('agentName', this.agentName);
      var qs = q.toString();
      var url = this.apiUrl + '/createNewThread' + (qs ? '?' + qs : '');

      fetch(url, { headers: this._headers(false) })
        .then(function (r) { return r.json(); })
        .then(function (data) {
          self._threadId = data.threadId || '';
          self._messages = [{
            text: 'Olá! Sou seu assistente virtual, como posso lhe ajudar?',
            isUser: false,
            timestamp: new Date()
          }];
          self._connectUserEvents();
          self._render(true);
        })
        .catch(function (e) { console.error('[ChatIA Widget] Erro ao criar thread:', e); self._render(false); });
    }


    _connectUserEvents() {
      this._closeUserEvents();
      if (!this._threadId) return;
      var self = this;
      var es = new EventSource(this.apiUrl + '/thread/' + this._threadId + '/user-events');
      this._userEventsSource = es;
      es.addEventListener('auditor_message', function (e) {
        try {
          var data = JSON.parse(e.data);
          self._messages.push({
            text: data.message,
            isUser: false,
            isAuditor: true,
            id: data.chat_id || undefined,
            auditor_nickname: data.auditor_nickname || data.auditor_name || null,
            timestamp: data.created_at ? new Date(data.created_at) : new Date()
          });
          self._render(false);
        } catch (ex) { }
      });
      es.onerror = function () { console.warn('[ChatIA Widget] SSE desconectado'); };
    }

    _closeUserEvents() {
      if (this._userEventsSource) {
        this._userEventsSource.close();
        this._userEventsSource = null;
      }
    }


    async _handleSend() {
      var text = this._input.trim();
      if (!text || this._isTyping) return;

      this._messages.push({ text: text, isUser: true, timestamp: new Date() });
      this._input = '';
      this._isTyping = true;
      this._statusText = '';
      this._streamingText = '';
      this._render(true);

      var tid = this._threadId;
      if (!tid && this._threadError < 2) {
        await this._createNewThreadSync();
        this._threadError++;
        tid = this._threadId;
      }

      var self = this;
      var accumulated = '';
      var finished = false;

      try {
        await this._fetchStream(text, tid,
          function onToken(token) {
            accumulated += token;
            self._streamingText = accumulated;
            self._render(false);
          },
          function onStatus(detail) {
            self._statusText = detail;
            self._render(false);
          },
          function onDone(result) {
            finished = true;
            self._isTyping = false;
            self._statusText = '';
            self._streamingText = '';
            if (result.content) {
              self._messages.push({
                text: self._cleanText(result.content),
                isUser: false,
                id: result.chat_id || undefined,
                timestamp: new Date()
              });
            }
            self._render(false);
          },
          function onFallback(content) {
            finished = true;
            self._isTyping = false;
            self._statusText = '';
            self._streamingText = '';
            self._messages.push({ text: content, isUser: false, timestamp: new Date() });
            self._render(false);
          },
          function onError(detail) {
            if (!finished) {
              finished = true;
              self._isTyping = false;
              self._statusText = '';
              self._streamingText = '';
              self._messages.push({
                text: detail || 'Desculpe, não consegui processar isso. Tente novamente.',
                isUser: false,
                timestamp: new Date()
              });
              self._render(false);
            }
          }
        );
      } catch (e) { }


      if (!finished) {
        this._isTyping = false;
        this._statusText = '';
        if (accumulated) {
          this._streamingText = '';
          this._messages.push({ text: this._cleanText(accumulated), isUser: false, timestamp: new Date() });
        } else {

          this._statusText = 'Tentando conexão alternativa...';
          this._render(false);
          var reply = await this._fetchFallback(text, tid);
          this._isTyping = false;
          this._statusText = '';
          if (reply && reply.content) {
            this._messages.push({ text: this._cleanText(reply.content), isUser: false, id: reply.chat_id || undefined, timestamp: new Date() });
          } else {
            this._messages.push({ text: 'Desculpe, não consegui processar isso. Tente novamente.', isUser: false, timestamp: new Date() });
          }
        }
        this._render(false);
      }
    }


    _createNewThreadSync() {
      var self = this;
      return new Promise(function (resolve) {
        var q = new URLSearchParams();
        if (self.userEmail) q.append('email', self.userEmail);
        if (self.userName) q.append('name', self.userName);
        if (self.userCnpj) q.append('cnpj', self.userCnpj);
        if (self.agentName) q.append('agentName', self.agentName);
        var qs = q.toString();
        fetch(self.apiUrl + '/createNewThread' + (qs ? '?' + qs : ''), { headers: self._headers(false) })
          .then(function (r) { return r.json(); })
          .then(function (d) { self._threadId = d.threadId || ''; self._connectUserEvents(); resolve(); })
          .catch(function () { resolve(); });
      });
    }


    async _fetchStream(message, threadId, onToken, onStatus, onDone, onFallback, onError) {
      var controller = new AbortController();
      var timeout = setTimeout(function () { controller.abort(); }, 4 * 60 * 1000);

      try {
        var res = await fetch(this.apiUrl + '/chat/stream', {
          method: 'POST',
          signal: controller.signal,
          headers: this._headers(true),
          body: JSON.stringify({ threadId: threadId, message: message, assistantName: this.agentName })
        });
        if (!res.ok || !res.body) { onError('Erro na conexão com o servidor.'); return; }

        var reader = res.body.getReader();
        var decoder = new TextDecoder();
        var buffer = '';

        while (true) {
          var chunk = await reader.read();
          if (chunk.done) break;
          buffer += decoder.decode(chunk.value, { stream: true });
          var parts = buffer.split('\n\n');
          buffer = parts.pop() || '';
          for (var p = 0; p < parts.length; p++) {
            var raw = parts[p];
            if (!raw.trim()) continue;
            var eventType = '', eventData = '';
            var lines = raw.split('\n');
            for (var l = 0; l < lines.length; l++) {
              if (lines[l].startsWith('event: ')) eventType = lines[l].slice(7).trim();
              else if (lines[l].startsWith('data: ')) eventData = lines[l].slice(6);
            }
            if (!eventType || !eventData) continue;
            try {
              var d = JSON.parse(eventData);
              switch (eventType) {
                case 'status': onStatus(d.detail || ''); break;
                case 'token': onToken(d.text || ''); break;
                case 'done': onDone({ content: d.content || '', chat_id: d.chat_id || null, was_fallback: d.was_fallback || false }); break;
                case 'fallback': onFallback(d.content || '', d.reason || ''); break;
                case 'error': onError(d.detail || 'Erro desconhecido.'); break;
              }
            } catch (e) { }
          }
        }
      } catch (err) {
        if (err && err.name === 'AbortError') {
          onError('A requisição expirou (timeout de 4 minutos). Tente novamente.');
        } else {
          onError('Erro na conexão. Tente novamente.');
        }
      } finally {
        clearTimeout(timeout);
      }
    }


    async _fetchFallback(message, threadId) {
      try {
        var res = await fetch(this.apiUrl + '/chat', {
          method: 'POST',
          headers: this._headers(true),
          body: JSON.stringify({ threadId: threadId, message: message, assistantName: this.agentName })
        });
        if (res.ok) {
          var data = await res.json();
          return { content: (data.content && data.content[0]) || '', chat_id: data.chat_id || null };
        }
      } catch (e) { }
      return null;
    }


    _openHistory() {
      this._showHistory = true;
      this._historyPage = 1;
      this._history = [];
      this._fetchHistory(1);
    }

    _fetchHistory(page) {
      if (!this.userEmail) { this._render(false); return; }
      var self = this;
      this._loadingHistory = true;
      this._render(false);

      fetch(this.apiUrl + '/history?email=' + encodeURIComponent(this.userEmail) + '&page=' + page + '&limit=30', {
        headers: this._headers(false)
      })
        .then(function (r) { return r.json(); })
        .then(function (data) {
          var threads = data.threads || [];
          if (page === 1) self._history = threads;
          else self._history = self._history.concat(threads);
          self._historyHasMore = threads.length > 0;
          self._loadingHistory = false;
          self._render(false);
        })
        .catch(function () { self._loadingHistory = false; self._render(false); });
    }

    _selectHistoryThread(tId, agentName) {
      var self = this;
      fetch(this.apiUrl + '/thread/' + tId + '/messages', { headers: this._headers(false) })
        .then(function (r) { return r.json(); })
        .then(function (data) {
          var msgs = (data.messages || []).map(function (m) {
            return {
              id: m.id,
              text: m.content,
              isUser: m.role === 'user',
              isAuditor: m.role === 'auditor',
              feedback_thumb: m.feedback_thumb,
              feedback_text: m.feedback_text,
              timestamp: m.created_at ? new Date(m.created_at) : new Date()
            };
          });
          var greeting = {
            text: 'Olá! Sou seu assistente virtual, como posso lhe ajudar?',
            isUser: false,
            timestamp: msgs[0] && msgs[0].timestamp ? new Date(msgs[0].timestamp.getTime() - 1000) : new Date()
          };
          var existingRating = 0;
          (data.messages || []).forEach(function (m) {
            if (m.feedback_rating != null) existingRating = m.feedback_rating;
          });
          self._threadId = tId;
          self._messages = [greeting].concat(msgs);
          self._feedbackRating = existingRating;
          self._feedbackSent = existingRating > 0;
          self._showHistory = false;
          self._closeUserEvents();
          self._connectUserEvents();
          self._render(true);
        })
        .catch(function (e) { console.error(e); });
    }

    _deleteThread(tId) {
      if (!confirm('Deseja excluir esta conversa? Esta ação não pode ser desfeita.')) return;
      var self = this;
      fetch(this.apiUrl + '/thread/' + tId, {
        method: 'DELETE',
        headers: this._headers(false)
      })
        .then(function (r) {
          if (r.ok) {
            self._history = self._history.filter(function (t) { return t.thread_id !== tId; });
            if (self._threadId === tId) {
              self._messages = [];
              self._threadId = '';
            }
            self._render(false);
          }
        })
        .catch(function (e) { console.error(e); });
    }


    _msgFeedback(chatId, thumb, text) {
      var self = this;
      var body = { thumb: thumb };
      if (text !== undefined) body.text = text;

      fetch(this.apiUrl + '/chat/' + chatId + '/feedback', {
        method: 'PUT',
        headers: this._headers(true),
        body: JSON.stringify(body)
      }).then(function () {
        self._messages = self._messages.map(function (m) {
          if (m.id === chatId) {
            m.feedback_thumb = thumb;
            if (text) m.feedback_text = text;
          }
          return m;
        });
        self._render(false);
      }).catch(function (e) { console.error(e); });
    }


    _sendRating(rating) {
      if (!this._threadId || this._feedbackSent) return;
      this._feedbackRating = rating;
      var self = this;
      fetch(this.apiUrl + '/thread/' + this._threadId + '/feedback', {
        method: 'PUT',
        headers: this._headers(true),
        body: JSON.stringify({ rating: rating })
      }).then(function (r) {
        if (r.ok) self._feedbackSent = true;
        self._render(false);
      }).catch(function () { self._render(false); });
    }


    _cleanText(text) {
      var t = text;
      [/,\s*:\n/g, /,\s*:\s/g, /,\s*:/g, /-\s*:/g].forEach(function (p) { t = t.replace(p, ''); });
      return t.replace(/ +/g, ' ').trim();
    }
  }

  customElements.define('chat-ia-widget', ChatIAWidget);
})();

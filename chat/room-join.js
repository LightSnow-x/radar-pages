(() => {
  'use strict';

  const endpoint = document.currentScript.dataset.endpoint;
  const accessPanel = document.getElementById('access-panel');
  const accessTitle = document.getElementById('access-title');
  const joinForm = document.getElementById('join-room');
  const joinButton = document.getElementById('join');
  const game = document.getElementById('game');
  const room = document.getElementById('room');
  const joinStatus = document.getElementById('chat-status');
  const conversation = document.getElementById('conversation');
  const heading = document.getElementById('room-heading');
  const connectionState = document.getElementById('connection-state');
  const roomGame = document.getElementById('room-game');
  const roomMember = document.getElementById('room-member');
  const roomCount = document.getElementById('room-count');
  const empty = document.getElementById('empty-chat');
  const messages = document.getElementById('messages');
  const sendForm = document.getElementById('send-message');
  const input = document.getElementById('message');
  const sendButton = document.getElementById('send');
  const sendStatus = document.getElementById('send-status');
  const shortRoom = /^[0-9]{4}$/;
  const legacyMatch = /^[1-9][0-9]{0,19}$/;
  const individualRoom = /^0([1-9][0-9]{11})$/;
  const guestKeyPattern = /^[a-f0-9]{32}$/;
  const roomEpochPattern = /^[a-f0-9]{16}$/;
  const guestStorageKey = 'peer-chat.guest';
  const roomStorageKey = 'peer-chat.room';
  const confirmationTimeout = 8000;
  const reconnectWindow = 90_000;
  let channel;
  let draftRoom = '';
  let guestKey;
  let hiddenAt = document.hidden ? Date.now() : undefined;

  function getGuestKey() {
    if (guestKey) return guestKey;
    try {
      const saved = localStorage.getItem(guestStorageKey);
      if (guestKeyPattern.test(saved)) {
        guestKey = saved;
        return guestKey;
      }
    } catch { /* Browser storage can be unavailable. */ }
    if (!window.crypto?.getRandomValues) return undefined;
    guestKey = Array.from(window.crypto.getRandomValues(new Uint8Array(16)), byte => byte.toString(16).padStart(2, '0')).join('');
    try { localStorage.setItem(guestStorageKey, guestKey); } catch { /* Keep the identity for this page. */ }
    return guestKey;
  }

  function readSavedRoom() {
    try {
      const saved = JSON.parse(localStorage.getItem(roomStorageKey));
      if (saved && shortRoom.test(saved.short) && roomEpochPattern.test(saved.epoch) &&
          Array.from(game.options).some(option => option.value === saved.game)) return saved;
    } catch { /* A blocked or invalid entry cannot be restored. */ }
    return undefined;
  }

  function rememberRoom(state) {
    const saved = { game: state.game, short: state.short, epoch: state.epoch };
    try { localStorage.setItem(roomStorageKey, JSON.stringify(saved)); } catch { /* Keep reconnecting in this page. */ }
  }

  function forgetRoom(state) {
    if (!state?.epoch) return;
    const saved = readSavedRoom();
    if (saved?.game === state.game && saved.short === state.short && saved.epoch === state.epoch) {
      try { localStorage.removeItem(roomStorageKey); } catch { /* Browser storage can be unavailable. */ }
    }
    const link = new URLSearchParams(location.hash.slice(1));
    if (link.get('game') + '/' + link.get('region') === state.game && link.get('room') === state.short) {
      history.replaceState(history.state, '', location.pathname + location.search);
    }
  }

  function updateTheme() {
    document.body.dataset.game = game.value.split('/')[0];
  }

  function lockJoin(locked) {
    joinButton.disabled = locked;
    game.disabled = locked;
    room.disabled = locked;
  }

  function updateSend() {
    sendButton.disabled = conversation.hidden || !channel?.ready || !!channel.pending || !input.value.trim();
  }

  function clearPending(state) {
    if (state?.pending) {
      clearTimeout(state.pending.deadline);
      state.pending = undefined;
    }
  }

  function closeSocket(state) {
    clearTimeout(state.joinDeadline);
    clearPending(state);
    const socket = state.socket;
    state.socket = undefined;
    state.ready = false;
    socket?.close();
  }

  function disconnect(text, clearDraft = false) {
    const previous = channel;
    channel = undefined;
    if (previous) {
      clearTimeout(previous.retryTimer);
      closeSocket(previous);
    }
    if (clearDraft) {
      input.value = '';
      draftRoom = '';
    }

    const wasInRoom = !conversation.hidden;
    conversation.hidden = true;
    accessPanel.hidden = false;
    document.body.dataset.view = 'entry';
    lockJoin(false);
    messages.replaceChildren();
    empty.hidden = false;
    sendStatus.textContent = '';
    joinStatus.textContent = text;
    updateSend();
    if (wasInRoom) accessTitle.focus();
  }

  function reconnect(state, failureText, immediate = false) {
    if (!state.epoch) {
      disconnect(failureText);
      return;
    }
    const hadPending = Boolean(state.pending);
    closeSocket(state);
    clearTimeout(state.retryTimer);
    const now = Date.now();
    state.retryUntil ??= now + reconnectWindow;
    if (now >= state.retryUntil) {
      disconnect('重连超时，请重新进入聊天室。');
      return;
    }
    connectionState.hidden = true;
    (conversation.hidden ? joinStatus : roomCount).textContent = '正在重新连接原房间…';
    if (hadPending) sendStatus.textContent = '发送结果未确认，草稿已保留。';
    updateSend();
    const delay = immediate ? 0 : Math.min(state.retryDelay, state.retryUntil - now);
    state.retryDelay = Math.min(state.retryDelay * 2, confirmationTimeout);
    state.retryTimer = setTimeout(() => connect(state), delay);
  }

  function addMessage(text, own, name) {
    const nearBottom = messages.scrollHeight - messages.clientHeight - messages.scrollTop < 60;
    const line = document.createElement('li');
    line.classList.add('chat-message');
    line.classList.toggle('own', own);
    const sender = document.createElement('span');
    sender.className = 'message-sender';
    const displayName = typeof name === 'string' && name ? name : '访客';
    sender.textContent = own ? displayName + ' · 我' : displayName;
    const body = document.createElement('p');
    body.className = 'message-text';
    body.textContent = text;
    line.append(sender, body);
    messages.append(line);
    empty.hidden = true;
    if (messages.childElementCount > 120) messages.firstElementChild.remove();
    if (nearBottom || own) messages.scrollTop = messages.scrollHeight;
  }

  function receive(state, event) {
    if (channel !== state) return;
    let message;
    try { message = JSON.parse(event.data); } catch { return; }
    switch (message?.type) {
    case 'ready':
      clearTimeout(state.joinDeadline);
      if (message.status !== 200) {
        if (message.status === 503 && state.epoch) {
          reconnect(state, '聊天室暂时无法连接，请重试。');
          return;
        }
        if (message.status === 404 || message.status === 401) forgetRoom(state);
        disconnect(message.status === 401 ? '个人入口已失效，请填写本局四位房号。' :
          message.status === 404 ? (state.epoch ? '原来的聊天室已关闭，请填写当前四位房号。' :
            '当前房间没有可聊天的同局同行，请核对游戏和房号。') : '聊天室暂时无法连接，请重试。');
        return;
      }
      if (state.short && state.short !== message.roomCode) {
        forgetRoom(state);
        disconnect('房间号与本局信息不符，请重新输入。');
        return;
      }
      if (state.code && (typeof message.sender !== 'string' || !message.sender)) {
        disconnect('暂时无法识别这个房间号，请稍后重试。');
        return;
      }
      if (state.guest) {
        if (!roomEpochPattern.test(message.roomEpoch) || (state.epoch && state.epoch !== message.roomEpoch)) {
          forgetRoom(state);
          disconnect('原来的聊天室无法恢复，请重新输入房号。');
          return;
        }
        state.epoch = message.roomEpoch;
        rememberRoom(state);
      }
      const entering = conversation.hidden;
      state.ready = true;
      state.retryUntil = undefined;
      state.retryDelay = 1000;
      state.automatic = shortRoom.test(message.roomCode);
      roomGame.textContent = state.automatic ? `${state.gameLabel} · 房间 ${message.roomCode}` : state.gameLabel;
      roomMember.textContent = message.sender || '访客';
      roomCount.textContent = '人数统计中';
      accessPanel.hidden = true;
      conversation.hidden = false;
      connectionState.hidden = false;
      document.body.dataset.view = 'room';
      updateSend();
      if (entering) heading.focus();
      break;
    case 'chat-count':
      if (!conversation.hidden && Number.isSafeInteger(message.count) && message.count >= 0) {
        roomCount.textContent = state.automatic ? (message.count === 0 ? '等待同局同行重连' : `${message.count} 位同行在线`) :
          `${message.count} 人在线`;
      }
      break;
    case 'chat':
      if (!conversation.hidden && typeof message.text === 'string') {
        if (state.guest) {
          if (!Number.isSafeInteger(message.id) || message.id <= state.lastMessageId) return;
          state.lastMessageId = message.id;
        }
        const own = message.own === true;
        addMessage(message.text, own, message.sender);
        if (own && state.pending?.text === message.text) {
          if (input.value === state.pending.draft) input.value = '';
          clearPending(state);
          updateSend();
        }
      }
      break;
    case 'chat-rate':
      clearPending(state);
      sendStatus.textContent = '发送太快，文字已保留，请稍后重试。';
      updateSend();
      break;
    case 'chat-rejected':
      clearPending(state);
      sendStatus.textContent = '消息暂未发送。请缩短文字后重试。';
      updateSend();
      break;
    case 'chat-ended':
      if (message.status === 503 && state.epoch) {
        reconnect(state, '同行服务暂时无法连接，请重试。');
        return;
      }
      if (message.status === 404 || message.status === 401) forgetRoom(state);
      disconnect(message.status === 401 ? '你的同行会话已结束，请查看 Worker 弹窗里的最新房间号。' :
        message.status === 404 ? '本局聊天室已关闭。' : '同行服务暂时无法连接，请重试。');
      break;
    }
  }

  function connect(state) {
    if (channel !== state || state.socket) return;
    clearTimeout(state.retryTimer);
    state.retryTimer = undefined;
    let socket;
    try {
      const url = new URL(endpoint);
      url.pathname += '/chat/' + state.route;
      const protocols = state.code ? ['peer-chat', 'member.' + state.code] : [];
      if (state.guest) protocols.push('peer-chat', `guest.${state.guest}${state.epoch ? '.' + state.epoch : ''}`);
      socket = new WebSocket(url, protocols);
    } catch {
      reconnect(state, '无法连接聊天室，请检查网络后重试。');
      return;
    }
    state.socket = socket;
    const current = () => channel === state && state.socket === socket;
    state.joinDeadline = setTimeout(() => {
      if (current()) reconnect(state, '加入聊天室超时，请重试。');
    }, confirmationTimeout);
    socket.addEventListener('message', event => { if (current()) receive(state, event); });
    socket.addEventListener('close', () => {
      if (current()) reconnect(state, state.pending ? '连接已断开，重新进房后可查看草稿。' : '聊天室连接已断开，请重新进入。');
    });
  }

  function join({ code, match, epoch } = {}) {
    const short = code || match ? undefined : room.value.trim();
    if (channel || !game.value || (!code && !match && !shortRoom.test(short))) return;
    const guest = short ? getGuestKey() : undefined;
    const key = game.value + '/' + (code || match || short);
    if (draftRoom !== key) input.value = '';
    draftRoom = key;
    const state = {
      code, short, guest, epoch: guest ? epoch : undefined, game: game.value, gameLabel: game.selectedOptions[0].textContent,
      route: game.value + '/' + (code ? 'join' : match || 'room/' + short), lastMessageId: 0, retryDelay: 1000,
    };
    channel = state;
    lockJoin(true);
    joinStatus.textContent = state.epoch ? '正在恢复原房间…' : '正在匹配当前对局…';
    connect(state);
  }

  joinForm.addEventListener('submit', event => {
    event.preventDefault();
    join();
  });

  sendForm.addEventListener('submit', event => {
    event.preventDefault();
    const state = channel;
    const draft = input.value;
    const text = draft.trim();
    if (conversation.hidden || !state?.ready || state.socket?.readyState !== WebSocket.OPEN || state.pending || !text) return;

    sendStatus.textContent = '';
    state.pending = {
      text,
      draft,
      deadline: setTimeout(() => {
        if (channel === state) reconnect(state, '发送结果未确认，重新进房后可查看草稿。');
      }, confirmationTimeout),
    };
    updateSend();
    try {
      state.socket.send(JSON.stringify({ type: 'chat', text }));
    } catch {
      reconnect(state, '消息暂时发不出去，重新进房后可查看草稿。');
    }
  });

  input.addEventListener('input', updateSend);
  game.addEventListener('change', updateTheme);
  document.getElementById('leave').addEventListener('click', () => {
    forgetRoom(channel);
    disconnect('已退出聊天室。', true);
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      hiddenAt = Date.now();
      return;
    }
    const suspended = hiddenAt !== undefined && Date.now() - hiddenAt >= confirmationTimeout;
    hiddenAt = undefined;
    if (suspended && channel?.epoch && channel.ready) reconnect(channel, '', true);
  });
  window.addEventListener('pageshow', event => {
    if (event.persisted && channel?.epoch && channel.ready) reconnect(channel, '', true);
  });
  window.addEventListener('online', () => {
    if (channel?.retryTimer !== undefined) connect(channel);
  });

  const invite = new URLSearchParams(location.hash.slice(1));
  const invitedGame = invite.get('game') + '/' + invite.get('region');
  const invitedRoom = invite.get('room') || '';
  const invitedCode = individualRoom.exec('0' + (invite.get('member') || ''))?.[1] || individualRoom.exec(invitedRoom)?.[1];
  const saved = readSavedRoom();
  const validInvite = Array.from(game.options).some(option => option.value === invitedGame);
  if (validInvite) game.value = invitedGame;
  else if (saved) game.value = saved.game;
  updateTheme();
  if (validInvite && invitedCode) join({ code: invitedCode });
  else if (validInvite && shortRoom.test(invitedRoom)) {
    room.value = invitedRoom;
    join({ epoch: saved?.game === invitedGame && saved.short === invitedRoom ? saved.epoch : undefined });
  } else if (validInvite && legacyMatch.test(invitedRoom)) join({ match: invitedRoom });
  else if (saved?.game === game.value) {
    room.value = saved.short;
    join({ epoch: saved.epoch });
  }
})();


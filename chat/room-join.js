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
  const roomGame = document.getElementById('room-game');
  const roomMember = document.getElementById('room-member');
  const roomCount = document.getElementById('room-count');
  const empty = document.getElementById('empty-chat');
  const messages = document.getElementById('messages');
  const sendForm = document.getElementById('send-message');
  const input = document.getElementById('message');
  const sendButton = document.getElementById('send');
  const sendStatus = document.getElementById('send-status');
  const validRoom = /^(?:0[1-9][0-9]{11}|[1-9][0-9]{0,19})$/;
  const individualRoom = /^0([1-9][0-9]{11})$/;
  const confirmationTimeout = 8000;
  let channel;
  let draftRoom = '';

  function updateTheme() {
    document.body.dataset.game = game.value.split('/')[0];
  }

  function lockJoin(locked) {
    joinButton.disabled = locked;
    game.disabled = locked;
    room.disabled = locked;
  }

  function updateSend() {
    sendButton.disabled = conversation.hidden || !!channel?.pending || !input.value.trim();
  }

  function clearPending(state) {
    if (state?.pending) {
      clearTimeout(state.pending.deadline);
      state.pending = undefined;
    }
  }

  function disconnect(text, clearDraft = false) {
    const previous = channel;
    channel = undefined;
    if (previous) {
      clearTimeout(previous.joinDeadline);
      clearPending(previous);
      previous.socket.close();
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
        disconnect(message.status === 401 ? '房间号已失效或与游戏、区服不符，请核对 Worker 弹窗。' :
          message.status === 404 ? '当前房间没有可聊天的同局同行，请核对游戏和房号。' : '聊天室暂时无法连接，请重试。');
        return;
      }
      if (state.code && (typeof message.sender !== 'string' || !message.sender)) {
        disconnect('暂时无法识别这个房间号，请稍后重试。');
        return;
      }
      roomGame.textContent = /^\d{4}$/.test(message.roomCode) ? `${state.gameLabel} · 房间 ${message.roomCode}` : state.gameLabel;
      roomMember.textContent = message.sender || '访客';
      roomCount.textContent = '人数统计中';
      accessPanel.hidden = true;
      conversation.hidden = false;
      document.body.dataset.view = 'room';
      updateSend();
      heading.focus();
      break;
    case 'chat-count':
      if (!conversation.hidden && Number.isSafeInteger(message.count) && message.count >= 0) {
        roomCount.textContent = `${message.count} 人在线`;
      }
      break;
    case 'chat':
      if (!conversation.hidden && typeof message.text === 'string') {
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
      disconnect(message.status === 401 ? '你的同行会话已结束，请查看 Worker 弹窗里的最新房间号。' :
        message.status === 404 ? '本局聊天室已关闭。' : '同行服务暂时无法连接，请重试。');
      break;
    }
  }

  function join() {
    if (channel || !game.value || !validRoom.test(room.value)) return;
    const code = individualRoom.exec(room.value)?.[1];
    const route = game.value + '/' + (code ? 'join' : room.value);
    const key = game.value + '/' + room.value;
    let socket;
    try {
      const url = new URL(endpoint);
      url.pathname += '/chat/' + route;
      socket = new WebSocket(url, code ? ['peer-chat', 'member.' + code] : []);
    } catch {
      joinStatus.textContent = '无法连接聊天室，请检查网络后重试。';
      return;
    }
    if (draftRoom !== key) input.value = '';
    draftRoom = key;
    const state = { socket, code, gameLabel: game.selectedOptions[0].textContent };
    channel = state;
    lockJoin(true);
    joinStatus.textContent = '正在匹配当前对局…';
    state.joinDeadline = setTimeout(() => {
      if (channel === state) disconnect('加入聊天室超时，请重试。');
    }, confirmationTimeout);
    socket.addEventListener('message', event => receive(state, event));
    socket.addEventListener('close', () => {
      if (channel === state) {
        disconnect(state.pending ? '连接已断开，重新进房后可查看草稿。' : '聊天室连接已断开，请重新进入。');
      }
    });
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
    if (conversation.hidden || state?.socket.readyState !== WebSocket.OPEN || state.pending || !text) return;

    sendStatus.textContent = '';
    state.pending = {
      text,
      draft,
      deadline: setTimeout(() => {
        if (channel === state) disconnect('发送结果未确认，重新进房后可查看草稿。');
      }, confirmationTimeout),
    };
    updateSend();
    try {
      state.socket.send(JSON.stringify({ type: 'chat', text }));
    } catch {
      disconnect('消息暂时发不出去，重新进房后可查看草稿。');
    }
  });

  input.addEventListener('input', updateSend);
  game.addEventListener('change', updateTheme);
  document.getElementById('leave').addEventListener('click', () => disconnect('已退出聊天室。', true));

  const invite = new URLSearchParams(location.hash.slice(1));
  const invitedGame = invite.get('game') + '/' + invite.get('region');
  const legacyNumber = '0' + (invite.get('member') || '');
  const invitedRoom = individualRoom.test(legacyNumber) ? legacyNumber : invite.get('room') || '';
  if (Array.from(game.options).some(option => option.value === invitedGame) && validRoom.test(invitedRoom)) {
    game.value = invitedGame;
    room.value = invitedRoom;
    updateTheme();
    join();
  }
})();


(() => {
  'use strict';

  const endpoint = document.currentScript.dataset.endpoint;
  const joinForm = document.getElementById('join-room');
  const joinButton = document.getElementById('join');
  const game = document.getElementById('game');
  const room = document.getElementById('room');
  const status = document.getElementById('chat-status');
  const conversation = document.getElementById('conversation');
  const heading = document.getElementById('room-heading');
  const messages = document.getElementById('messages');
  const sendForm = document.getElementById('send-message');
  const input = document.getElementById('message');
  const validRoom = /^[1-9][0-9]{0,19}$/;
  let socket;

  function disconnect(text) {
    const current = socket;
    socket = undefined;
    current?.close();
    conversation.hidden = true;
    joinForm.hidden = false;
    joinButton.disabled = false;
    messages.replaceChildren();
    input.value = '';
    status.textContent = text;
  }

  function addMessage(message) {
    const line = document.createElement('li');
    line.classList.toggle('own', message.own === true);
    line.textContent = (message.own ? '我：' : '同行：') + message.text;
    messages.append(line);
    if (messages.childElementCount > 120) messages.firstElementChild.remove();
    messages.scrollTop = messages.scrollHeight;
  }

  function join() {
    if (socket || !game.value || !validRoom.test(room.value)) return;
    const roomNumber = room.value;
    const selected = game.value;
    const url = new URL(endpoint);
    url.pathname += '/chat/' + selected + '/' + roomNumber;
    try {
      socket = new WebSocket(url);
    } catch {
      status.textContent = '无法连接聊天室，请从雷达大厅打开此页。';
      return;
    }
    const current = socket;
    joinButton.disabled = true;
    status.textContent = '正在匹配当前对局…';
    current.addEventListener('message', event => {
      if (socket !== current) return;
      let message;
      try { message = JSON.parse(event.data); } catch { return; }
      switch (message?.type) {
      case 'ready':
        if (message.status === 200) {
          heading.textContent = '房间 ' + roomNumber;
          joinForm.hidden = true;
          conversation.hidden = false;
          status.textContent = '已进入本局聊天室。';
        } else {
          disconnect(message.status === 404 ? '当前房间没有可聊天的同局同行，请核对游戏和房号。' : '聊天室暂时无法连接，请重试。');
        }
        break;
      case 'chat':
        if (!conversation.hidden && typeof message.text === 'string') {
          status.textContent = '已进入本局聊天室。';
          addMessage(message);
        }
        break;
      case 'chat-rate':
        status.textContent = '发送太快，请稍后重试。';
        break;
      case 'chat-ended':
        disconnect(message.status === 404 ? '本局聊天室已关闭。' : '同行服务暂时无法连接，请重试。');
        break;
      }
    });
    current.addEventListener('close', () => {
      if (socket === current) disconnect('聊天室连接已断开，请重新进入。');
    });
  }

  joinForm.addEventListener('submit', event => {
    event.preventDefault();
    join();
  });
  sendForm.addEventListener('submit', event => {
    event.preventDefault();
    const text = input.value.trim();
    if (conversation.hidden || socket?.readyState !== WebSocket.OPEN || !text) return;
    socket.send(JSON.stringify({ type: 'chat', text }));
    input.value = '';
  });
  document.getElementById('leave').addEventListener('click', () => disconnect('已退出聊天室。'));

  const invite = new URLSearchParams(location.hash.slice(1));
  const invitedGame = invite.get('game') + '/' + invite.get('region');
  const invitedRoom = invite.get('room') || '';
  if (Array.from(game.options).some(option => option.value === invitedGame) && validRoom.test(invitedRoom)) {
    game.value = invitedGame;
    room.value = invitedRoom;
    join();
  }
})();

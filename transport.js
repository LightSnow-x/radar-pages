(() => {
  'use strict';

  const settings = document.currentScript.dataset;
  const game = settings.game;
  const room = new URLSearchParams(location.search).get('room') || '';
  const route = {
    uam: '/' + room,
    codm: '/codm/' + room,
    cfm: '/cfm/' + room,
    dfm: '/dfm/' + room,
    valorant: '/Valorant/r/' + room + '/',
    status: '/online'
  }[game];
  const relayBase = 'https://relay.invalid';
  const socketPath = '/' + (game === 'status' ? game : game + '/' + room);
  const endpoints = [...new Set([settings.endpoint, settings.fallbackEndpoint].filter(Boolean))];
  const roomValid = game === 'status' || /^\d{4}$/.test(room);
  const statusNode = document.getElementById('pages-connection');
  const nativeFetch = window.fetch.bind(window);
  const emptyBody = new Set([204, 205, 304]);
  const messages = new Set(['message', 'viewers', 'frame', 'ping', 'ended']);
  const replyTimeout = 16000;
  let channel;
  let connecting;
  let feed;
  let requestId = 0;
  let nextConnection = 0;
  let preferredEndpoint = 0;
  let pageActive = true;

  function showStatus(status) {
    if (!statusNode) return;
    statusNode.hidden = status === 200;
    statusNode.textContent = ({
      0: '正在连接雷达服务',
      400: '请输入四位房间号',
      401: '房间授权已失效，请重新进房',
      403: '当前页面未获准连接雷达服务',
      404: '房间暂未开放，请检查房间号',
      429: '连接较多，正在等待重试'
    })[status] || '雷达暂时连不上，正在重试';
  }

  function response(message) {
    const status = message.status;
    if (!Number.isInteger(status) || status < 200 || status > 599) return new Response(null, {status: 502});
    const options = {status, headers: {'Content-Type': message.contentType || 'application/octet-stream'}};
    if (emptyBody.has(status)) return new Response(null, options);
    if (message.encoding === 'base64') {
      const data = atob(message.body);
      const bytes = new Uint8Array(data.length);
      for (let i = 0; i < bytes.length; ++i) bytes[i] = data.charCodeAt(i);
      return new Response(bytes, options);
    }
    return new Response(typeof message.body === 'string' ? message.body : '', options);
  }

  function openChannel(endpoint) {
    let socket;
    try {
      socket = new WebSocket(endpoint.replace(/\/$/, '') + socketPath);
    } catch {
      return Promise.resolve(0);
    }

    let complete;
    const state = {socket, pending: new Map(), ready: new Promise(resolve => { complete = resolve; }), status: 0};
    channel = state;
    const timer = setTimeout(() => socket.close(), 9000);
    socket.addEventListener('message', event => {
      let message;
      try {
        message = JSON.parse(event.data);
      } catch {
        return;
      }
      if (!message || typeof message !== 'object') return;
      if (message.type === 'ready' && state.status === 0) {
        if (!Number.isInteger(message.status) || message.status < 200 || message.status > 599) return;
        clearTimeout(timer);
        state.status = message.status;
        showStatus(state.status);
        complete(state.status);
        return;
      }
      if (message.type === 'response') {
        const finish = state.pending.get(message.id);
        if (finish) finish(message);
        return;
      }
      if (message.type === 'stream-open' && feed) {
        feed.connected();
      } else if (message.type === 'event' && feed && messages.has(message.event) && typeof message.data === 'string') {
        feed.emit(message.event, message.data);
      } else if (message.type === 'stream-error' && feed) {
        feed.disconnected();
      }
    });
    socket.addEventListener('close', () => {
      clearTimeout(timer);
      for (const finish of state.pending.values()) finish({status: 503});
      if (channel === state) {
        channel = undefined;
        if (state.status) {
          nextConnection = Date.now() + 1000;
          if (state.status === 200) showStatus(503);
          if (feed) feed.disconnected();
        }
      }
      complete(state.status);
    });
    return state.ready;
  }

  async function openAvailableChannel() {
    for (let offset = 0; pageActive && offset < endpoints.length; ++offset) {
      const index = (preferredEndpoint + offset) % endpoints.length;
      const status = await openChannel(endpoints[index]);
      if (status) {
        preferredEndpoint = index;
        return status;
      }
    }
    nextConnection = Date.now() + 1000;
    showStatus(503);
    return 503;
  }

  function connect() {
    if (!roomValid) {
      showStatus(400);
      return Promise.resolve(400);
    }
    if (!pageActive) return Promise.resolve(503);
    if (connecting) return connecting;
    if (channel) return channel.ready;
    if (Date.now() < nextConnection) return Promise.resolve(503);
    showStatus(0);
    connecting = openAvailableChannel().finally(() => { connecting = undefined; });
    return connecting;
  }

  function resourcePath(input) {
    if (typeof input !== 'string' || !route) return '';
    const resource = new URL(input, relayBase + route);
    if (resource.origin !== relayBase) return '';
    const path = resource.pathname;
    const allowed = {
      uam: /^\/(?:atlas\/|avatar\/)/,
      codm: /^\/codm\/(?:frame\.json|map\.png)$/,
      cfm: /^\/cfm\/(?:frame\.json|map\.png)$/,
      valorant: /^\/Valorant\/r\/\d{4}\/(?:frame\.json|portraits\/|maps\/)/,
      status: /^\/api\/worker\/online$/
    }[game];
    return allowed?.test(path) ? path + resource.search : '';
  }

  async function fetchResource(input, options = {}) {
    const path = resourcePath(input);
    if (!path) return nativeFetch(input, options);
    const signal = options.signal;
    if (signal?.aborted) return Promise.reject(signal.reason);
    const status = await connect();
    if (signal?.aborted) return Promise.reject(signal.reason);
    const state = channel;
    if (status !== 200 || state?.socket.readyState !== WebSocket.OPEN) {
      return response({status: status === 200 ? 503 : status});
    }
    if (state.pending.size >= 6) return response({status: 429});
    return new Promise((resolve, reject) => {
      const id = ++requestId;
      const cleanup = () => {
        clearTimeout(timer);
        state.pending.delete(id);
        signal?.removeEventListener('abort', abort);
      };
      const finish = message => {
        cleanup();
        try {
          resolve(response(message));
        } catch {
          resolve(response({status: 502}));
        }
      };
      const abort = () => {
        cleanup();
        reject(signal.reason);
      };
      const timer = setTimeout(() => finish({status: 504}), replyTimeout);
      state.pending.set(id, finish);
      signal?.addEventListener('abort', abort, {once: true});
      try {
        state.socket.send(JSON.stringify({type: 'get', id, path}));
      } catch {
        finish({status: 503});
      }
    });
  }

  async function setImage(image, input) {
    if (!resourcePath(input)) {
      image.src = input;
      return;
    }
    try {
      const result = await fetchResource(input);
      if (!result.ok) {
        image.dispatchEvent(new Event('error'));
        return;
      }
      const url = URL.createObjectURL(await result.blob());
      const release = () => {
        URL.revokeObjectURL(url);
        image.removeEventListener('load', release);
        image.removeEventListener('error', release);
      };
      image.addEventListener('load', release, {once: true});
      image.addEventListener('error', release, {once: true});
      image.src = url;
    } catch {
      image.dispatchEvent(new Event('error'));
    }
  }

  class RadarStream extends EventTarget {
    constructor() {
      super();
      this.readyState = 0;
      feed = this;
      this.open();
    }

    emit(type, data) {
      const event = data === undefined ? new Event(type) : new MessageEvent(type, {data});
      this.dispatchEvent(event);
      this['on' + type]?.(event);
    }

    async open() {
      const status = await connect();
      if (this.readyState === 2) return;
      if (status === 200 && channel?.socket.readyState === WebSocket.OPEN) {
        try {
          channel.socket.send(JSON.stringify({type: 'subscribe'}));
        } catch {
          this.disconnected();
        }
      } else {
        this.disconnected();
      }
    }

    connected() {
      if (this.readyState === 2) return;
      this.readyState = 1;
      clearTimeout(this.retry);
      this.emit('open');
    }

    disconnected() {
      if (this.readyState === 2) return;
      this.readyState = 0;
      this.emit('error');
      clearTimeout(this.retry);
      this.retry = setTimeout(() => this.open(), 1400);
    }

    close() {
      this.readyState = 2;
      clearTimeout(this.retry);
      if (feed === this) {
        feed = undefined;
        if (channel?.socket.readyState === WebSocket.OPEN) {
          channel.socket.send(JSON.stringify({type: 'unsubscribe'}));
        }
      }
    }
  }

  window.addEventListener('pagehide', () => {
    pageActive = false;
    channel?.socket.close();
  });
  window.addEventListener('pageshow', () => { pageActive = true; });
  window.RadarPages = {room, route, fetch: fetchResource, setImage, Stream: RadarStream};
})();

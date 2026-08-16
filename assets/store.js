/* ===== 数据层：全部存本地，不上传 ===== */
(function (w) {
  'use strict';

  var KEY = 'zmt_workbench_v1';
  var DAILY_CACHE = 'zmt_daily_cache_v1';

  var DEFAULT = {
    profile: { nick: '西西', track: 'AI工具/AI变现', createdAt: today() },
    checkin: {},              // {'2026-08-10': ['写文案','读书']}
    drafts: [],               // 文案库
    materials: [],            // 素材库
    shoots: [],               // 拍摄清单
    posts: [],                // 发布复盘
    moneyFav: [],             // 收藏的搞钱项目
    goals: [],                // 成长计划
    skills: [],               // 技能学习
    books: [],                // 读书
    goods: [],                // 带货选品
    topicFav: [],             // 收藏选题
    settings: { platform: '全部', lastView: 'home' }
  };

  function today() {
    var d = new Date(), p = function (n) { return n < 10 ? '0' + n : '' + n; };
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
  }
  function nowStr() {
    var d = new Date(), p = function (n) { return n < 10 ? '0' + n : '' + n; };
    return today() + ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
  }
  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

  var cache = null;
  function load() {
    if (cache) return cache;
    try {
      var raw = localStorage.getItem(KEY);
      cache = raw ? JSON.parse(raw) : JSON.parse(JSON.stringify(DEFAULT));
    } catch (e) { cache = JSON.parse(JSON.stringify(DEFAULT)); }
    // 补齐新增字段
    Object.keys(DEFAULT).forEach(function (k) {
      if (cache[k] === undefined) cache[k] = JSON.parse(JSON.stringify(DEFAULT[k]));
    });
    return cache;
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(load())); }
    catch (e) { console.warn('保存失败', e); }
  }

  // 列表通用增删改
  function add(list, obj) {
    var d = load();
    obj.id = obj.id || uid();
    obj.createdAt = obj.createdAt || nowStr();
    d[list].unshift(obj);
    save(); return obj;
  }
  function update(list, id, patch) {
    var d = load(), it = d[list].filter(function (x) { return x.id === id; })[0];
    if (it) { Object.keys(patch).forEach(function (k) { it[k] = patch[k]; }); save(); }
    return it;
  }
  function remove(list, id) {
    var d = load();
    d[list] = d[list].filter(function (x) { return x.id !== id; });
    save();
  }
  function get(list) { return load()[list] || []; }

  // 打卡
  function checkIn(kind) {
    var d = load(), t = today();
    d.checkin[t] = d.checkin[t] || [];
    if (d.checkin[t].indexOf(kind) < 0) d.checkin[t].push(kind);
    save();
  }
  function isCheckedIn(kind, date) {
    var d = load(), t = date || today();
    return (d.checkin[t] || []).indexOf(kind) >= 0;
  }
  function streak() {
    var d = load(), n = 0, cur = new Date();
    for (var i = 0; i < 400; i++) {
      var p = function (x) { return x < 10 ? '0' + x : '' + x; };
      var key = cur.getFullYear() + '-' + p(cur.getMonth() + 1) + '-' + p(cur.getDate());
      if (d.checkin[key] && d.checkin[key].length) { n++; cur.setDate(cur.getDate() - 1); }
      else if (i === 0) { cur.setDate(cur.getDate() - 1); }  // 今天还没打卡不算断
      else break;
    }
    return n;
  }

  // ---- 每日数据：先读缓存秒开，再联网更新；断网保留上次 ----
  var daily = { data: null, status: 'loading', from: '' };

  function readCache() {
    try {
      var raw = localStorage.getItem(DAILY_CACHE);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }

  function fetchDaily(cb) {
    var cached = readCache();
    if (cached) { daily.data = cached; daily.status = 'cache'; daily.from = '本地缓存'; cb && cb(daily); }

    fetch('data/daily.json?t=' + Date.now(), { cache: 'no-store' })
      .then(function (r) { if (!r.ok) throw new Error('http ' + r.status); return r.json(); })
      .then(function (j) {
        if (!j || !j.topics) throw new Error('bad json');
        daily.data = j; daily.status = 'fresh'; daily.from = j.date || '';
        try { localStorage.setItem(DAILY_CACHE, JSON.stringify(j)); } catch (e) { }
        cb && cb(daily);
      })
      .catch(function () {
        if (daily.data) { daily.status = 'offline'; }
        else { daily.data = { date: '—', topics: [], money: [], insight: '' }; daily.status = 'empty'; }
        cb && cb(daily);
      });
  }

  // 导入导出
  function exportAll() { return JSON.stringify(load(), null, 2); }
  function importAll(txt) {
    var j = JSON.parse(txt);
    cache = j; save(); return true;
  }
  function reset() { localStorage.removeItem(KEY); cache = null; }

  w.S = {
    today: today, nowStr: nowStr, uid: uid,
    load: load, save: save, get: get, add: add, update: update, remove: remove,
    checkIn: checkIn, isCheckedIn: isCheckedIn, streak: streak,
    daily: daily, fetchDaily: fetchDaily,
    exportAll: exportAll, importAll: importAll, reset: reset
  };
})(window);

/* ===== 应用主控 ===== */
(function (w, doc) {
  'use strict';

  var $ = function (s) { return doc.querySelector(s); };
  var view = $('#view'), pageTitle = $('#pageTitle'), nav = $('#nav'), tabbar = $('#tabbar');
  var sidebar = $('#sidebar'), mask = $('#mask');
  var cur = 'home';
  var lastGen = null, lastAnalyze = null, lastRewrite = null, lastMt = null;

  /* ---------- 提示 ---------- */
  var toastEl = $('#toast'), toastTimer;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('show'); }, 2000);
  }
  w.toast = toast;

  /* ---------- 弹窗 ---------- */
  function modal(title, bodyHTML, footHTML) {
    $('#modalTitle').textContent = title;
    $('#modalBody').innerHTML = bodyHTML;
    $('#modalFoot').innerHTML = footHTML || '<button class="btn-ghost" data-act="modal-close">关闭</button>';
    $('#modal').classList.add('show');
  }
  function closeModal() { $('#modal').classList.remove('show'); }

  /* ---------- 复制 ---------- */
  function copy(text) {
    if (navigator.clipboard && w.isSecureContext) {
      navigator.clipboard.writeText(text).then(function () { toast('已复制 ✅'); }, fallback);
    } else fallback();
    function fallback() {
      var ta = doc.createElement('textarea');
      ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
      doc.body.appendChild(ta); ta.select();
      try { doc.execCommand('copy'); toast('已复制 ✅'); } catch (e) { toast('复制失败，请长按选择'); }
      doc.body.removeChild(ta);
    }
  }

  /* ---------- 下载 ---------- */
  function download(name, text, type) {
    var blob = new Blob([text], { type: (type || 'text/plain') + ';charset=utf-8' });
    var a = doc.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = name;
    doc.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); doc.body.removeChild(a); }, 300);
    toast('已导出 📦');
  }

  /* ---------- 菜单 ---------- */
  function buildNav() {
    nav.innerHTML = V.MENU.map(function (m) {
      return '<button class="nav-item" data-act="go" data-v="' + m.k + '"><span class="ico">' + m.i + '</span>' + m.n + '</button>';
    }).join('');
    tabbar.innerHTML = V.TABS.map(function (k) {
      if (k === 'more') {
        return '<button class="tab" data-act="go" data-v="more"><span class="ico">☰</span>更多</button>';
      }
      var m = V.MENU.filter(function (x) { return x.k === k; })[0];
      return '<button class="tab" data-act="go" data-v="' + k + '"><span class="ico">' + m.i + '</span>' + m.n + '</button>';
    }).join('');
  }
  function markActive() {
    [].forEach.call(doc.querySelectorAll('.nav-item'), function (e) {
      e.classList.toggle('active', e.dataset.v === cur);
    });
    var mainTabs = V.TABS.filter(function (k) { return k !== 'more'; });
    [].forEach.call(doc.querySelectorAll('.tab'), function (e) {
      var isMoreTab = e.dataset.v === 'more';
      var active = e.dataset.v === cur || (isMoreTab && mainTabs.indexOf(cur) === -1);
      e.classList.toggle('active', active);
    });
  }

  function go(k) {
    cur = k;
    if (k === 'more') {
      pageTitle.textContent = '☰ 更多';
    } else {
      var m = V.MENU.filter(function (x) { return x.k === k; })[0] || V.MENU[0];
      pageTitle.textContent = m.i + ' ' + m.n;
    }
    render();
    markActive();
    closeDrawer();
    var d = S.load(); d.settings.lastView = k; S.save();
    w.scrollTo({ top: 0, behavior: 'smooth' });
    if (location.hash !== '#' + k) history.replaceState(null, '', '#' + k);
  }
  function render() {
    view.innerHTML = (V[cur] || V.home)();
    if (cur === 'writer') {
      var pre = w.__writerPre;
      if (pre) {
        if (pre.platform) $('#wt_plat').value = pre.platform;
        if (pre.type) $('#wt_type').value = pre.type;
        if (pre.n) $('#wt_n').value = String(pre.n);
        if (pre.audience) $('#wt_aud').value = pre.audience;
        if (pre.auto) { setTimeout(doGen, 60); }
        w.__writerPre = null;
      }
    }
    $('#streakMini').textContent = '🔥 连续创作 ' + S.streak() + ' 天';
  }

  function openDrawer() { sidebar.classList.add('open'); mask.classList.add('show'); }
  function closeDrawer() { sidebar.classList.remove('open'); mask.classList.remove('show'); }

  /* ---------- 数据状态条 ---------- */
  function updateChip(st) {
    var c = $('#dataChip');
    if (st.status === 'fresh') { c.className = 'chip ok'; c.textContent = '✅ ' + (st.data.date || '') + ' 已更新'; }
    else if (st.status === 'offline') { c.className = 'chip warn'; c.textContent = '📴 离线 · 显示 ' + (st.data.date || '上次') + ' 数据'; }
    else if (st.status === 'cache') { c.className = 'chip'; c.textContent = '💾 ' + (st.data.date || '') + ' 缓存'; }
    else { c.className = 'chip warn'; c.textContent = '⚠️ 暂无数据'; }
  }

  /* ---------- 文案生成 ---------- */
  function trendCtx(topic) {
    if (!$('#wt_trend') || !$('#wt_trend').checked) return null;
    var t = S.daily.data && S.daily.data.topics || [];
    if (!t.length) return null;
    var key = E.matchLib(topic);
    var name = E.LIB[key].name;
    var hit = t.filter(function (x) {
      return E.matchLib(x.title + x.track + x.keywords.join('')) === key;
    });
    return (hit.length ? hit : t)[Math.floor(Math.random() * (hit.length ? hit.length : t.length))];
  }

  function readWriter() {
    return {
      topic: $('#wt_topic').value.trim(),
      platform: $('#wt_plat').value,
      type: $('#wt_type').value,
      n: parseInt($('#wt_n').value, 10),
      audience: $('#wt_aud').value.trim(),
      hook: $('#wt_hook').value,
      points: $('#wt_points').value
    };
  }
  function doGen() {
    var o = readWriter();
    if (!o.topic) { toast('先填个话题吧 ✍️'); $('#wt_topic').focus(); return; }
    o.trend = trendCtx(o.topic);
    lastGen = E.generate(o);
    $('#wtOut').innerHTML = V.renderOut(lastGen);
    S.checkIn('写文案');
    $('#wtOut').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /* ---------- 事件委托 ---------- */
  doc.addEventListener('click', function (e) {
    var t = e.target.closest('[data-act]');
    if (!t) return;
    var a = t.dataset.act;

    switch (a) {
      case 'go': go(t.dataset.v); break;
      case 'modal-close': closeModal(); break;
      case 'copy': copy(t.dataset.text || ''); break;

      case 'checkin': {
        S.checkIn(t.dataset.kind); render(); toast('打卡成功 🎉 已连续 ' + S.streak() + ' 天'); break;
      }
      case 'plat': {
        var d = S.load(); d.settings.platform = t.dataset.p; S.save(); render(); break;
      }

      /* --- 选题 --- */
      case 'topic2writer': {
        var x = findTopic(t.dataset.id); if (!x) return;
        w.__writerPre = {
          topic: x.title, platform: x.platform === '全平台' ? '小红书' : (['小红书', '抖音', '视频号', 'B站'].indexOf(x.platform) >= 0 ? x.platform : '小红书'),
          points: '', audience: '', auto: true
        };
        go('writer'); break;
      }
      case 'topic2shoot': {
        var x2 = findTopic(t.dataset.id); if (!x2) return;
        S.add('shoots', { name: x2.title, date: S.today(), scene: '', props: '', shots: '0-3s 钩子：' + x2.angle + '\n3-8s 给出承诺\n中段 分条讲干货\n结尾 互动提问', note: '来自选题：' + x2.why, ticks: [] });
        toast('已加入拍摄清单 🎬'); break;
      }
      case 'topicfav': {
        var d2 = S.load(), id = t.dataset.id, i = d2.topicFav.indexOf(id);
        if (i >= 0) d2.topicFav.splice(i, 1); else d2.topicFav.push(id);
        S.save(); render(); break;
      }

      /* --- 写文案 --- */
      case 'gen': doGen(); break;
      case 'genprompt': {
        var o = readWriter();
        if (!o.topic) { toast('先填个话题吧 ✍️'); return; }
        o.trend = trendCtx(o.topic);
        var p = E.toPrompt(o);
        copy(p);
        modal('🤖 AI 提示词已复制', '<div class="hint" style="margin-bottom:10px">粘到任意 AI 对话框里（豆包 / Kimi / 通义 / ChatGPT 都行），能拿到更长更细的版本。</div><div class="out" style="font-size:13px">' + U.esc(p) + '</div>',
          '<button class="btn" data-act="copy" data-text="' + U.esc(p) + '">📋 再复制一次</button><button class="btn-ghost" data-act="modal-close">关闭</button>');
        break;
      }
      case 'savedraft': {
        if (!lastGen) return;
        S.add('drafts', { title: lastGen.title, body: lastGen.body, tags: lastGen.tags, platform: lastGen.meta.platform });
        toast('已存入我的文档 💾'); break;
      }
      case 'shots2list': {
        if (!lastGen || !lastGen.shots) return;
        S.add('shoots', {
          name: lastGen.title, date: S.today(), scene: '', props: '',
          shots: lastGen.shots.map(function (s) { return s.t + '｜' + s.v + '｜' + s.a; }).join('\n'), ticks: []
        });
        toast('已存进拍摄清单 🎬'); break;
      }

      /* --- 素材库 --- */
      case 'mt-analyze': {
        var raw = $('#mt_raw').value.trim();
        if (!raw) { toast('先把文案粘进来'); return; }
        lastAnalyze = E.analyze(raw);
        lastRewrite = E.scriptRewrite(raw, {
          topic: $('#mt_title').value.trim() || '',
          platform: ($('#mt_plat') ? $('#mt_plat').value : '抖音'),
          trend: (S.daily.data && S.daily.data.topics || [])[0]
        });
        lastMt = { title: $('#mt_title').value.trim(), link: $('#mt_link').value.trim(), raw: raw, platform: ($('#mt_plat') ? $('#mt_plat').value : '抖音') };
        $('#mtOut').innerHTML = V.renderAnalyze(lastAnalyze, lastRewrite);
        $('#mtOut').scrollIntoView({ behavior: 'smooth' });
        break;
      }
      case 'mt-save': {
        var raw2 = $('#mt_raw').value.trim(), ti = $('#mt_title').value.trim();
        if (!ti && !raw2) { toast('至少填标题或文案'); return; }
        S.add('materials', { title: ti, link: $('#mt_link').value.trim(), raw: raw2 });
        toast('已保存 💾'); render(); break;
      }
      case 'mt-savefull': {
        if (!lastMt) return;
        S.add('materials', {
          title: lastMt.title || (lastAnalyze.points[0] || '未命名').slice(0, 20),
          link: lastMt.link, raw: lastMt.raw,
          score: lastAnalyze.score, hook: lastAnalyze.hook.n,
          logic: lastAnalyze.formula.join('\n') + '\n\n可补强：\n' + lastAnalyze.missing.join('\n'),
          newtext: lastRewrite ? (lastRewrite.title + '\n\n' + lastRewrite.body + '\n\n' + lastRewrite.tags) : ''
        });
        toast('整条素材已入库 ✅'); render(); break;
      }
      case 'mt-redo': {
        var m = S.get('materials').filter(function (x) { return x.id === t.dataset.id; })[0];
        if (!m || !m.raw) return;
        var aa = E.analyze(m.raw), rr = E.scriptRewrite(m.raw, { topic: m.title, platform: m.platform || '抖音' });
        S.update('materials', m.id, {
          score: aa.score, hook: aa.hook.n,
          logic: aa.formula.join('\n') + '\n\n可补强：\n' + aa.missing.join('\n'),
          newtext: rr.title + '\n\n' + rr.body + '\n\n' + rr.tags
        });
        toast('拆解完成 🧠'); render(); break;
      }

      /* --- 搞钱 --- */
      case 'moneyfav': {
        var d3 = S.load(), id3 = t.dataset.id, i3 = d3.moneyFav.indexOf(id3);
        if (i3 >= 0) d3.moneyFav.splice(i3, 1); else d3.moneyFav.push(id3);
        S.save(); render(); break;
      }
      case 'money-filter': {
        V.moneyFavOnly(t.dataset.v === '1'); render(); break;
      }
      case 'topic-filter': {
        V.topicFavOnly(t.dataset.v === '1'); render(); break;
      }
      case 'money2writer': {
        var mm = findMoney(t.dataset.id); if (!mm) return;
        w.__writerPre = {
          topic: mm.name, platform: '小红书', type: '步骤式', n: Math.min(8, (mm.steps || []).length + 2),
          audience: '想做副业的上班族',
          points: (mm.steps || []).map(function (s) { return s.split('，')[0] + '｜' + s + '｜' + (mm.warn || '别急，先跑通一单'); }).join('\n'),
          auto: true
        };
        go('writer'); break;
      }
      case 'money2goal': {
        var mg = findMoney(t.dataset.id); if (!mg) return;
        S.add('goals', { name: '跑通：' + mg.name, type: '收入增长', due: '', target: 1000, cur: 0, unitName: '元', plan: (mg.steps || []).join('\n') });
        toast('已设为成长目标 🎯'); break;
      }

      /* --- 通用 CRUD --- */
      case 'crud-add': {
        var key = t.dataset.key;
        var cfg = null;
        Object.keys(V.CRUD).forEach(function (k) { if (V.CRUD[k].key === key) cfg = V.CRUD[k]; });
        if (!cfg) return;
        var obj = V.readForm(cfg.fields, key);
        var first = cfg.fields[0].k;
        if (!obj[first]) { toast('「' + cfg.fields[0].l + '」不能为空'); return; }
        obj.ticks = [];
        S.add(key, obj);
        var kindMap = { shoots: '拍摄', posts: '复盘', books: '读书', skills: '学习' };
        if (kindMap[key]) S.checkIn(kindMap[key]);
        toast('添加成功 ✅'); render(); break;
      }
      case 'crud-del': {
        if (!confirm('确定删除？删了找不回来哦')) return;
        S.remove(t.dataset.key, t.dataset.id); toast('已删除'); render(); break;
      }
      case 'crud-toggle': {
        var it = S.get(t.dataset.key).filter(function (x) { return x.id === t.dataset.id; })[0];
        S.update(t.dataset.key, t.dataset.id, { done: !it.done }); render(); break;
      }
      case 'shot-tick': break; // change 事件处理

      case 'goal-save': {
        var inp = doc.querySelector('[data-act="goal-input"][data-id="' + t.dataset.id + '"]');
        var v = parseFloat(inp.value);
        if (isNaN(v)) { toast('填个数字'); return; }
        S.update('goals', t.dataset.id, { cur: v }); toast('进度已更新 📈'); render(); break;
      }
      case 'skill-plus': {
        var sk = S.get('skills').filter(function (x) { return x.id === t.dataset.id; })[0];
        S.update('skills', t.dataset.id, { done: (+sk.done || 0) + 1 });
        S.checkIn('学习'); toast('又学完一节 🎓'); render(); break;
      }
      case 'book-plus': {
        var bk = S.get('books').filter(function (x) { return x.id === t.dataset.id; })[0];
        S.update('books', t.dataset.id, { read: (+bk.read || 0) + 10 });
        S.checkIn('读书'); toast('+10 页 📗'); render(); break;
      }
      case 'quote2writer': {
        var bq = S.get('books').filter(function (x) { return x.id === t.dataset.id; })[0];
        w.__writerPre = { topic: bq.name + ' 里最受用的几句话', platform: '小红书', type: '分点式', points: (bq.quote || '').split('\n').filter(Boolean).join('\n'), auto: true };
        go('writer'); break;
      }
      case 'goods2writer': {
        var gd = S.get('goods').filter(function (x) { return x.id === t.dataset.id; })[0];
        w.__writerPre = {
          topic: gd.name, platform: '小红书', type: '清单式',
          points: (gd.sell || '').split('\n').filter(Boolean).join('\n'), auto: true
        };
        go('writer'); break;
      }

      /* --- 文档 --- */
      case 'doc-add': {
        var ti2 = $('#dc_title').value.trim(), bo = $('#dc_body').value.trim();
        if (!ti2 && !bo) { toast('写点东西再存吧'); return; }
        S.add('drafts', { title: ti2 || bo.slice(0, 18), body: bo, tags: '', platform: '自写' });
        S.checkIn('写文案'); toast('已保存 💾'); render(); break;
      }
      case 'doc-txt': {
        var dd = S.get('drafts').filter(function (x) { return x.id === t.dataset.id; })[0];
        download((dd.title || 'draft').replace(/[\\/:*?"<>|]/g, '_') + '.txt', dd.title + '\n\n' + dd.body + '\n\n' + (dd.tags || ''));
        break;
      }
      case 'exp-json': download('工作台备份_' + S.today() + '.json', S.exportAll(), 'application/json'); break;
      case 'imp-json': {
        var inp2 = doc.createElement('input');
        inp2.type = 'file'; inp2.accept = '.json';
        // iOS Safari 等移动端要求 file input 必须在 DOM 中才能触发弹窗，否则 .click() 被静默拦截
        inp2.style.position = 'fixed'; inp2.style.left = '-9999px'; inp2.style.top = '0';
        doc.body.appendChild(inp2);
        inp2.onchange = function () {
          var f = inp2.files[0];
          if (!f) { doc.body.removeChild(inp2); return; }
          var r = new FileReader();
          r.onload = function () {
            try { S.importAll(r.result); toast('恢复成功 ✅'); render(); }
            catch (e) { toast('文件格式不对 ❌'); }
            doc.body.removeChild(inp2);
          };
          r.readAsText(f);
        };
        inp2.click(); break;
      }

      /* --- 设置页 --- */
      case 'exp-txt': {
        var allDrafts = S.get('drafts');
        if (!allDrafts.length) { toast('还没有文案'); return; }
        var txt = '=== 我的文案库 ===\n导出时间：' + S.nowStr() + '\n\n' + allDrafts.map(function (x) {
          return '【' + (x.title || '未命名') + '】\n平台：' + (x.platform || '') + '\n时间：' + x.createdAt + '\n\n' + x.body + '\n\n' + (x.tags || '') + '\n\n' + '-'.repeat(40);
        }).join('\n\n');
        download('我的文案库_' + S.today() + '.txt', txt, 'text/plain');
        break;
      }
      case 'clear-sample': {
        localStorage.removeItem('zmt_daily_cache_v1');
        S.daily.data = null; S.daily.status = 'empty';
        toast('已清空示例数据 🧹'); render(); break;
      }
      case 'clear-all': {
        modal('⚠️ 确认清空全部数据',
          '<div style="color:var(--red);font-size:14px;line-height:1.8"><b>此操作不可撤销！</b><br><br>将删除以下所有数据：<br>• 文案库、素材库、拍摄清单<br>• 发布复盘、成长计划<br>• 收藏记录、打卡记录<br>• 所有个人设置</div>',
          '<button class="btn danger" data-act="confirm-clear-all">确认清空</button><button class="btn-ghost" data-act="modal-close">取消</button>');
        break;
      }
      case 'confirm-clear-all': {
        S.reset();
        closeModal();
        toast('已清空全部数据，页面将刷新…');
        setTimeout(function () { location.reload(); }, 800);
        break;
      }
      case 'paste-update': {
        modal('📋 粘贴更新热点数据',
          '<div class="hint">把新的 daily.json 内容粘贴到下面，会替换当前的选题和搞钱灵感数据。</div>' +
          '<textarea id="pasteData" rows="10" style="width:100%;box-sizing:border-box;font-family:monospace;font-size:12px;padding:10px;border:1px solid var(--purple-l);border-radius:10px;resize:vertical" placeholder="粘贴 JSON 内容…"></textarea>',
          '<button class="btn" data-act="do-paste-update">✅ 确认更新</button><button class="btn-ghost" data-act="modal-close">取消</button>');
        break;
      }
      case 'do-paste-update': {
        var raw = $('#pasteData').value.trim();
        if (!raw) { toast('内容为空'); return; }
        try {
          var j = JSON.parse(raw);
          if (!j.topics && !j.money) throw new Error('格式不对');
          // 写入 daily cache
          localStorage.setItem('zmt_daily_cache_v1', raw);
          S.daily.data = j; S.daily.status = 'manual'; S.daily.from = '手动粘贴';
          closeModal();
          toast('已更新 ✅ · 选题 ' + (j.topics || []).length + ' 条 · 副业 ' + (j.money || []).length + ' 条');
          render();
        } catch (e) { toast('JSON 格式有误，请检查 ❌'); }
        break;
      }
    }
  });

  doc.addEventListener('change', function (e) {
    var t = e.target.closest('[data-act]');
    if (!t) return;
    if (t.dataset.act === 'shot-tick') {
      var id = t.dataset.id, i = parseInt(t.dataset.i, 10);
      var it = S.get('shoots').filter(function (x) { return x.id === id; })[0];
      var ticks = it.ticks || [];
      var p = ticks.indexOf(i);
      if (p >= 0) ticks.splice(p, 1); else ticks.push(i);
      S.update('shoots', id, { ticks: ticks });
    }
  });

  doc.addEventListener('input', function (e) {
    if (e.target.id === 'dc_q') {
      var q = e.target.value.trim().toLowerCase();
      var list = S.get('drafts').filter(function (x) {
        return !q || (x.title || '').toLowerCase().indexOf(q) >= 0 || (x.body || '').toLowerCase().indexOf(q) >= 0;
      });
      $('#docList').innerHTML = V.docList(list);
    }
  });

  function findTopic(id) { return ((S.daily.data || {}).topics || []).filter(function (x) { return x.id === id; })[0]; }
  function findMoney(id) { return ((S.daily.data || {}).money || []).filter(function (x) { return x.id === id; })[0]; }

  /* ---------- 顶栏 ---------- */
  $('#btnMenu').addEventListener('click', openDrawer);
  mask.addEventListener('click', closeDrawer);
  $('#modalClose').addEventListener('click', closeModal);
  $('#modal').addEventListener('click', function (e) { if (e.target.id === 'modal') closeModal(); });
  $('#btnRefresh').addEventListener('click', function () {
    toast('正在拉取最新数据…');
    S.fetchDaily(function (st) { updateChip(st); render(); if (st.status === 'fresh') toast('已更新到 ' + st.data.date + ' ✅'); else toast('没连上网，先用上次的数据 📴'); });
  });
  $('#btnBackup').addEventListener('click', function () {
    modal('💾 备份与恢复',
      '<div class="hint">数据只存在这台设备上。换手机或清缓存前，务必先导出备份。</div>',
      '<button class="btn" data-act="exp-json">📦 导出备份</button><button class="btn-ghost" data-act="imp-json">📥 恢复</button><button class="btn-ghost" data-act="modal-close">关闭</button>');
  });

  /* ---------- 启动 ---------- */
  buildNav();
  var hash = (location.hash || '').replace('#', '');
  var validViews = V.MENU.map(function (m) { return m.k; }).concat(['more']);
  var savedView = S.load().settings.lastView;
  var startView = (validViews.indexOf(hash) >= 0) ? hash
    : (validViews.indexOf(savedView) >= 0 ? savedView : 'home');
  cur = startView;
  if (cur === 'more') {
    pageTitle.textContent = '☰ 更多';
  } else {
    var mm0 = V.MENU.filter(function (x) { return x.k === cur; })[0] || V.MENU[0];
    pageTitle.textContent = mm0.i + ' ' + mm0.n;
  }
  render(); markActive();

  S.fetchDaily(function (st) { updateChip(st); render(); });

  /* ---------- PWA ---------- */
  if ('serviceWorker' in navigator) {
    w.addEventListener('load', function () {
      navigator.serviceWorker.register('sw.js').catch(function () { });
    });
  }

  // iOS 安装引导（只提示一次）
  setTimeout(function () {
    var isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
    var standalone = w.navigator.standalone || w.matchMedia('(display-mode: standalone)').matches;
    if (isIOS && !standalone && !localStorage.getItem('zmt_a2hs')) {
      localStorage.setItem('zmt_a2hs', '1');
      toast('点底部「分享」→「添加到主屏幕」，就能当 App 用啦 📱');
    }
  }, 3500);

})(window, document);

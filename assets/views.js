/* ===== 各板块视图 ===== */
(function (w) {
  'use strict';

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function nl2br(s) { return esc(s).replace(/\n/g, '<br>'); }
  function pct(a, b) { return b > 0 ? Math.min(100, Math.round(a / b * 100)) : 0; }

  var U = { esc: esc, nl2br: nl2br, pct: pct };
  w.U = U;

  var MENU = [
    { k: 'home', i: '🏠', n: '首页' },
    { k: 'topics', i: '🔥', n: '选题' },
    { k: 'writer', i: '✍️', n: '写文案' },
    { k: 'material', i: '🎞️', n: '素材库' },
    { k: 'shoot', i: '🎬', n: '拍摄清单' },
    { k: 'publish', i: '🔍', n: '发布复盘' },
    { k: 'money', i: '💰', n: '搞钱灵感' },
    { k: 'growth', i: '🌱', n: '成长计划' },
    { k: 'skill', i: '🎓', n: '技能学习' },
    { k: 'book', i: '📖', n: '读书' },
    { k: 'goods', i: '🛍️', n: '带货' },
    { k: 'docs', i: '📁', n: '我的文档' },
    { k: 'settings', i: '⚙️', n: '设置' }
  ];
  var TABS = ['home', 'topics', 'writer', 'money', 'more'];
  var moneyFavOnly = false;
  var topicFavOnly = false;

  /* ---------- 通用 CRUD ---------- */
  function formHTML(fields, prefix, data) {
    data = data || {};
    return fields.map(function (f) {
      var id = prefix + '_' + f.k, v = data[f.k] != null ? data[f.k] : (f.def || '');
      if (f.t === 'textarea') {
        return '<label class="fld"><span>' + esc(f.l) + '</span><textarea id="' + id + '" rows="' + (f.rows || 3) + '" placeholder="' + esc(f.p || '') + '">' + esc(v) + '</textarea></label>';
      }
      if (f.t === 'select') {
        return '<label class="fld"><span>' + esc(f.l) + '</span><select id="' + id + '">' +
          f.opts.map(function (o) { return '<option' + (o === v ? ' selected' : '') + '>' + esc(o) + '</option>'; }).join('') +
          '</select></label>';
      }
      return '<label class="fld"><span>' + esc(f.l) + '</span><input id="' + id + '" type="' + (f.t || 'text') + '" value="' + esc(v) + '" placeholder="' + esc(f.p || '') + '"></label>';
    }).join('');
  }
  function readForm(fields, prefix) {
    var o = {};
    fields.forEach(function (f) {
      var e = document.getElementById(prefix + '_' + f.k);
      if (!e) return;
      o[f.k] = f.t === 'number' ? (parseFloat(e.value) || 0) : e.value.trim();
    });
    return o;
  }

  function crud(cfg) {
    var list = S.get(cfg.key);
    var h = '';
    h += '<div class="card">';
    h += '<div class="card-title">' + cfg.addIcon + ' 新增' + cfg.unit + '</div>';
    h += '<div class="grid ' + (cfg.cols || 'g2') + '">' + formHTML(cfg.fields, cfg.key, {}) + '</div>';
    h += '<div class="btn-row"><button class="btn" data-act="crud-add" data-key="' + cfg.key + '">➕ 添加</button></div>';
    h += '</div>';

    if (cfg.tips) h += '<div class="card"><div class="hint">' + cfg.tips + '</div></div>';

    h += '<div class="card-title" style="margin:18px 0 10px">' + cfg.listIcon + ' ' + cfg.listTitle + '（' + list.length + '）</div>';
    if (!list.length) {
      h += '<div class="empty"><span class="e">' + cfg.emptyIcon + '</span>' + esc(cfg.empty) + '</div>';
    } else {
      h += list.map(function (it) { return cfg.card(it); }).join('');
    }
    return h;
  }

  var CRUD = {
    shoot: {
      key: 'shoots', unit: '拍摄任务', addIcon: '🎬', listIcon: '📋', listTitle: '我的拍摄清单',
      emptyIcon: '🎥', empty: '还没有拍摄任务，先从选题或文案里生成一个吧',
      cols: 'g2',
      fields: [
        { k: 'name', l: '视频主题', p: '例：AI接单第7天真实收入' },
        { k: 'date', l: '计划拍摄日', t: 'date' },
        { k: 'scene', l: '场景 / 机位', p: '例：书桌前 + 手机屏幕录制' },
        { k: 'props', l: '道具 / 素材', p: '例：手机支架、订单截图、便签纸' },
        { k: 'shots', l: '分镜脚本（一行一镜）', t: 'textarea', rows: 5, p: '0-3s 大字钩子\n3-8s 承诺\n...' },
        { k: 'note', l: '备注', t: 'textarea', rows: 2 }
      ],
      card: function (it) {
        var lines = (it.shots || '').split('\n').filter(Boolean);
        var done = it.done ? ' done' : '';
        return '<div class="item">' +
          '<div class="item-head"><div class="item-title">' + (it.done ? '✅ ' : '🎬 ') + esc(it.name || '未命名') + '</div>' +
          '<span class="tag p">' + esc(it.date || '未排期') + '</span></div>' +
          (it.scene ? '<div class="item-desc">📍 ' + esc(it.scene) + '</div>' : '') +
          (it.props ? '<div class="item-desc">🎒 ' + esc(it.props) + '</div>' : '') +
          (lines.length ? '<div style="margin:8px 0">' + lines.map(function (l, i) {
            return '<div class="checkline' + done + '"><input type="checkbox" data-act="shot-tick" data-id="' + it.id + '" data-i="' + i + '"' + ((it.ticks || []).indexOf(i) >= 0 ? ' checked' : '') + '><span class="cl-text">' + esc(l) + '</span></div>';
          }).join('') + '</div>' : '') +
          (it.note ? '<div class="item-desc">📝 ' + nl2br(it.note) + '</div>' : '') +
          '<div class="btn-row" style="margin-top:8px">' +
          '<button class="btn-ghost tiny" data-act="crud-toggle" data-key="shoots" data-id="' + it.id + '">' + (it.done ? '↩️ 标未完成' : '✅ 拍完了') + '</button>' +
          '<button class="btn-ghost tiny" data-act="copy" data-text="' + esc(it.shots || '') + '">📋 复制脚本</button>' +
          '<button class="btn-ghost tiny danger" data-act="crud-del" data-key="shoots" data-id="' + it.id + '">🗑️</button></div>' +
          '</div>';
      },
      tips: '<b>拍摄前必检 6 项：</b>① 手机存储 &gt;5G ② 电量 &gt;60% ③ 擦镜头 ④ 顺光/补光灯打开 ⑤ 收音环境安静（关空调外机）⑥ 横竖屏确认。<br><b>省时技巧：</b>同一套装扮一次拍 3-5 条，切换背景比切换衣服快得多。'
    },

    publish: {
      key: 'posts', unit: '发布复盘', addIcon: '📤', listIcon: '🔍', listTitle: '复盘记录',
      emptyIcon: '📮', empty: '还没有复盘记录，发完一条就回来盘一盘：爆了还是扑了、为什么、下次怎么改',
      fields: [
        { k: 'title', l: '内容标题' },
        { k: 'platform', l: '平台', t: 'select', opts: ['小红书', '抖音', '视频号', 'B站', '公众号', '快手', '知乎'] },
        { k: 'date', l: '发布日期', t: 'date' },
        { k: 'link', l: '作品链接', t: 'url', p: '可留空' },
        { k: 'result', l: '结果定性', t: 'select', opts: ['爆了 🚀', '达标 ✅', '一般 😐', '扑街 📉'] },
        { k: 'view', l: '播放/阅读', t: 'number' },
        { k: 'like', l: '点赞', t: 'number' },
        { k: 'fav', l: '收藏', t: 'number' },
        { k: 'cmt', l: '评论', t: 'number' },
        { k: 'good', l: '做对了什么', t: 'textarea', rows: 2, p: '标题/钩子/选题/节奏…哪点拉起来了' },
        { k: 'bad', l: '踩坑 / 不足', t: 'textarea', rows: 2, p: '封面/开头/完播/违规…哪点拖后腿' },
        { k: 'next', l: '下次怎么改', t: 'textarea', rows: 2, p: '下一条具体调整的动作' }
      ],
      card: function (it) {
        var ratio = it.like > 0 ? (it.fav / it.like).toFixed(2) : '—';
        var resMap = { '爆了 🚀': 'r-fire', '达标 ✅': 'r-ok', '一般 😐': 'r-mid', '扑街 📉': 'r-bad' };
        var resCls = resMap[it.result] || 'r-mid';
        var resTxt = it.result || '未定性';
        var stats = '👀 ' + (it.view || 0) + ' · ❤️ ' + (it.like || 0) + ' · ⭐ ' + (it.fav || 0) + ' · 💬 ' + (it.cmt || 0) + ' · 收赞比 ' + ratio;
        return '<div class="item">' +
          '<div class="item-head"><div class="item-title">' + esc(it.title || '未命名') + '</div><span class="tag ' + resCls + '">' + esc(resTxt) + '</span></div>' +
          '<div class="item-meta">📅 ' + esc(it.date || '—') + ' · ' + esc(it.platform || '—') + ' · ' + stats + '</div>' +
          (it.good ? '<div class="item-desc ret-good">✅ 做对：' + nl2br(it.good) + '</div>' : '') +
          (it.bad ? '<div class="item-desc ret-bad">⚠️ 不足：' + nl2br(it.bad) + '</div>' : '') +
          (it.next ? '<div class="item-desc ret-next">🔁 改进：' + nl2br(it.next) + '</div>' : '') +
          (it.note ? '<div class="item-desc">💭 ' + nl2br(it.note) + '</div>' : '') +
          '<div class="btn-row" style="margin-top:8px">' +
          (it.link ? '<a class="btn-ghost tiny" href="' + esc(it.link) + '" target="_blank" rel="noopener">🔗 打开</a>' : '') +
          '<button class="btn-ghost tiny danger" data-act="crud-del" data-key="posts" data-id="' + it.id + '">🗑️</button></div>' +
          '</div>';
      }
    },

    growth: {
      key: 'goals', unit: '成长目标', addIcon: '🌱', listIcon: '🎯', listTitle: '我的目标',
      emptyIcon: '🌷', empty: '先定一个三个月内能看到结果的小目标',
      fields: [
        { k: 'name', l: '目标' , p: '例：小红书涨到 1000 粉'},
        { k: 'type', l: '类型', t: 'select', opts: ['内容涨粉', '收入增长', '技能提升', '身体健康', '作品产出', '其他'] },
        { k: 'due', l: '截止日期', t: 'date' },
        { k: 'target', l: '目标数值', t: 'number', def: 100 },
        { k: 'cur', l: '当前进度', t: 'number', def: 0 },
        { k: 'unitName', l: '单位', p: '粉丝 / 元 / 条' },
        { k: 'plan', l: '每周要做的事（一行一条）', t: 'textarea', rows: 3 }
      ],
      card: function (it) {
        var p = pct(it.cur, it.target);
        return '<div class="item">' +
          '<div class="item-head"><div class="item-title">🎯 ' + esc(it.name) + '</div><span class="tag p">' + esc(it.type) + '</span></div>' +
          '<div class="bar"><i style="width:' + p + '%"></i></div>' +
          '<div class="item-meta">' + (it.cur || 0) + ' / ' + (it.target || 0) + ' ' + esc(it.unitName || '') + ' · ' + p + '% · 截止 ' + esc(it.due || '未设置') + '</div>' +
          (it.plan ? '<div class="item-desc">📌 ' + nl2br(it.plan) + '</div>' : '') +
          '<div class="btn-row" style="margin-top:8px">' +
          '<input type="number" style="width:110px" placeholder="更新进度" data-act="goal-input" data-id="' + it.id + '">' +
          '<button class="btn-ghost tiny" data-act="goal-save" data-id="' + it.id + '">💾 更新</button>' +
          '<button class="btn-ghost tiny danger" data-act="crud-del" data-key="goals" data-id="' + it.id + '">🗑️</button></div>' +
          '</div>';
      },
      tips: '<b>目标怎么定才做得到：</b>数值要小到你三周内一定能看到变化。「涨1万粉」不如「先发满30条」，过程指标比结果指标更可控。'
    },

    skill: {
      key: 'skills', unit: '学习计划', addIcon: '🎓', listIcon: '📚', listTitle: '技能进度',
      emptyIcon: '🧠', empty: '添加一个正在学的技能，每天打个卡',
      fields: [
        { k: 'name', l: '技能名称', p: '例：剪映高阶剪辑' },
        { k: 'source', l: '学习来源', p: '例：B站XX课程 / 官方文档' },
        { k: 'total', l: '总节数/总章节', t: 'number', def: 20 },
        { k: 'done', l: '已完成', t: 'number', def: 0 },
        { k: 'goal', l: '学完要能做出什么', t: 'textarea', rows: 2, p: '例：独立剪出一条卡点视频' },
        { k: 'note', l: '笔记 / 卡点', t: 'textarea', rows: 3 }
      ],
      card: function (it) {
        var p = pct(it.done, it.total);
        return '<div class="item">' +
          '<div class="item-head"><div class="item-title">🎓 ' + esc(it.name) + '</div><span class="tag g">' + p + '%</span></div>' +
          '<div class="bar"><i style="width:' + p + '%"></i></div>' +
          '<div class="item-meta">' + (it.done || 0) + '/' + (it.total || 0) + ' · ' + esc(it.source || '') + '</div>' +
          (it.goal ? '<div class="item-desc">🎯 ' + nl2br(it.goal) + '</div>' : '') +
          (it.note ? '<div class="item-desc">📝 ' + nl2br(it.note) + '</div>' : '') +
          '<div class="btn-row" style="margin-top:8px">' +
          '<button class="btn-ghost tiny" data-act="skill-plus" data-id="' + it.id + '">✅ 学完一节</button>' +
          '<button class="btn-ghost tiny danger" data-act="crud-del" data-key="skills" data-id="' + it.id + '">🗑️</button></div>' +
          '</div>';
      },
      tips: '<b>学不进去怎么办：</b>把「学一节课」改成「学完这节课后马上做一个 5 分钟的小练习」。没有输出的学习，三天就忘光。'
    },

    book: {
      key: 'books', unit: '书', addIcon: '📖', listIcon: '📚', listTitle: '我的书架',
      emptyIcon: '📕', empty: '加一本正在读的书吧',
      fields: [
        { k: 'name', l: '书名' },
        { k: 'author', l: '作者' },
        { k: 'total', l: '总页数', t: 'number', def: 300 },
        { k: 'read', l: '已读页数', t: 'number', def: 0 },
        { k: 'status', l: '状态', t: 'select', opts: ['在读', '想读', '已读完', '弃读'] },
        { k: 'rate', l: '评分 1-5', t: 'number', def: 0 },
        { k: 'quote', l: '摘抄金句（可直接当文案素材）', t: 'textarea', rows: 3 },
        { k: 'note', l: '读后感 / 能用在哪', t: 'textarea', rows: 3 }
      ],
      card: function (it) {
        var p = pct(it.read, it.total);
        var star = '⭐'.repeat(Math.max(0, Math.min(5, parseInt(it.rate, 10) || 0)));
        return '<div class="item">' +
          '<div class="item-head"><div class="item-title">📖 ' + esc(it.name) + '</div><span class="tag">' + esc(it.status || '在读') + '</span></div>' +
          '<div class="item-meta">✍️ ' + esc(it.author || '—') + ' · ' + (it.read || 0) + '/' + (it.total || 0) + ' 页 ' + star + '</div>' +
          '<div class="bar"><i style="width:' + p + '%"></i></div>' +
          (it.quote ? '<div class="out" style="margin:8px 0;padding:10px;font-size:13.5px">“' + nl2br(it.quote) + '”</div>' : '') +
          (it.note ? '<div class="item-desc">💭 ' + nl2br(it.note) + '</div>' : '') +
          '<div class="btn-row" style="margin-top:8px">' +
          '<button class="btn-ghost tiny" data-act="book-plus" data-id="' + it.id + '">📗 +10页</button>' +
          (it.quote ? '<button class="btn-ghost tiny" data-act="quote2writer" data-id="' + it.id + '">✍️ 拿去写文案</button>' : '') +
          '<button class="btn-ghost tiny danger" data-act="crud-del" data-key="books" data-id="' + it.id + '">🗑️</button></div>' +
          '</div>';
      },
      tips: '<b>读书变内容的最快路径：</b>每读完一章，写一条「这一章能解决读者的什么具体问题」，直接就是一条选题。'
    },

    goods: {
      key: 'goods', unit: '选品', addIcon: '🛍️', listIcon: '📦', listTitle: '我的选品库',
      emptyIcon: '🛒', empty: '把看中的商品记下来，对比佣金和卖点',
      fields: [
        { k: 'name', l: '商品名' },
        { k: 'cat', l: '类目', p: '例：数码配件 / 文具' },
        { k: 'price', l: '售价（元）', t: 'number' },
        { k: 'rate', l: '佣金比（%）', t: 'number' },
        { k: 'plat', l: '渠道', t: 'select', opts: ['抖音精选联盟', '小红书选品', '淘宝联盟', '多多进宝', '视频号小店', '快手好物', '其他'] },
        { k: 'status', l: '状态', t: 'select', opts: ['待评估', '已申样', '已出片', '在推', '已放弃'] },
        { k: 'sell', l: '核心卖点（一行一条）', t: 'textarea', rows: 3 },
        { k: 'note', l: '备注 / 对接人', t: 'textarea', rows: 2 }
      ],
      card: function (it) {
        var earn = ((it.price || 0) * (it.rate || 0) / 100).toFixed(1);
        return '<div class="item">' +
          '<div class="item-head"><div class="item-title">🛍️ ' + esc(it.name) + '</div><span class="tag o">' + esc(it.status) + '</span></div>' +
          '<div class="item-meta">💴 ¥' + (it.price || 0) + ' · 佣金 ' + (it.rate || 0) + '% ≈ <b>¥' + earn + '/单</b> · ' + esc(it.plat || '') + ' · ' + esc(it.cat || '') + '</div>' +
          (it.sell ? '<div class="item-desc">✨ ' + nl2br(it.sell) + '</div>' : '') +
          (it.note ? '<div class="item-desc">📝 ' + nl2br(it.note) + '</div>' : '') +
          '<div class="btn-row" style="margin-top:8px">' +
          '<button class="btn-ghost tiny" data-act="goods2writer" data-id="' + it.id + '">✍️ 写种草文案</button>' +
          '<button class="btn-ghost tiny danger" data-act="crud-del" data-key="goods" data-id="' + it.id + '">🗑️</button></div>' +
          '</div>';
      },
      tips: '<b>选品三看：</b>① 佣金 ×（预估出单）能不能覆盖你的拍摄成本 ② 有没有「一句话说清」的卖点 ③ 退货率高不高（服饰鞋帽慎选）。<br><b>红线：</b>不碰医疗器械、保健功效、绝对化用语（最、第一、100%）。'
    }
  };

  /* ---------------- 首页 ---------------- */
  function home() {
    var d = S.load(), daily = S.daily.data || { topics: [], money: [] };
    var t = S.today();
    var hour = new Date().getHours();
    var greet = hour < 6 ? '还没睡呀 🌙' : hour < 11 ? '早上好呀 ☀️' : hour < 14 ? '中午好 🍚' : hour < 18 ? '下午好 🌤️' : hour < 23 ? '晚上好 🌆' : '夜深了 🌙';
    var kinds = ['写文案', '拍摄', '复盘', '读书', '学习', '运动'];
    var todayCk = d.checkin[t] || [];

    var weekPosts = d.posts.filter(function (p) {
      if (!p.date) return false;
      var dd = new Date(p.date), now = new Date();
      return (now - dd) / 86400000 <= 7;
    }).length;

    var h = '';
    h += '<div class="card grad greet" style="display:flex;align-items:flex-end;gap:16px;position:relative;overflow:visible">';
    h += '<div class="greet-text" style="flex:1;min-width:0">';
    h += '<div style="font-size:19px;font-weight:900">' + greet + '，' + esc(d.profile.nick) + '</div>';
    h += '<div style="color:var(--ink-2);font-size:13px;margin-top:2px">今天是 ' + t + '，' + (daily.insight ? '看看今天的机会 👇' : '开始今天的创作吧') + '</div>';
    h += '</div>';
    h += '<img src="icons/avatar.png" alt="数字形象" class="home-avatar" />';
    h += '</div>';

    h += '<div class="grid g4" style="margin-bottom:14px">';
    h += '<div class="stat"><div class="n">' + S.streak() + '</div><div class="l">🔥 连续打卡</div></div>';
    h += '<div class="stat"><div class="n">' + d.drafts.length + '</div><div class="l">✍️ 文案存稿</div></div>';
    h += '<div class="stat"><div class="n">' + weekPosts + '</div><div class="l">🔍 本周复盘</div></div>';
    h += '<div class="stat"><div class="n">' + d.materials.length + '</div><div class="l">🎞️ 素材条数</div></div>';
    h += '</div>';

    h += '<div class="card"><div class="card-title">✅ 今日打卡</div><div class="pills">';
    kinds.forEach(function (k) {
      h += '<button class="pill' + (todayCk.indexOf(k) >= 0 ? ' on' : '') + '" data-act="checkin" data-kind="' + k + '">' + (todayCk.indexOf(k) >= 0 ? '✔ ' : '') + k + '</button>';
    });
    h += '</div><div style="font-size:12px;color:var(--ink-3)">今天完成 ' + todayCk.length + '/' + kinds.length + ' 项 · 点一下就记上了</div></div>';

    if (daily.insight) {
      h += '<div class="card"><div class="card-title">🧭 今日洞察</div><div style="font-size:14px;line-height:1.85">' + esc(daily.insight) + '</div></div>';
    }

    var tops = (daily.topics || []).slice().sort(function (a, b) { return b.heat - a.heat; }).slice(0, 3);
    if (tops.length) {
      h += '<div class="card"><div class="card-title">🔥 今日最火 3 个话题<span class="more" data-act="go" data-v="topics">全部 →</span></div>';
      tops.forEach(function (x) {
        h += '<div class="checkline"><span class="heat">' + x.heat + '</span><div class="cl-text"><b>' + esc(x.title) + '</b> <span class="tag p">' + esc(x.platform) + '</span><br><span style="font-size:12.5px;color:var(--ink-2)">' + esc(x.angle) + '</span></div>' +
          '<button class="btn-ghost tiny" data-act="topic2writer" data-id="' + x.id + '">✍️</button></div>';
      });
      h += '</div>';
    }

    var ms = (daily.money || []).slice(0, 2);
    if (ms.length) {
      h += '<div class="card"><div class="card-title">💰 今天能搞的钱<span class="more" data-act="go" data-v="money">全部 →</span></div>';
      ms.forEach(function (m) {
        h += '<div class="checkline"><span>💡</span><div class="cl-text"><b>' + esc(m.name) + '</b> <span class="tag g">' + esc(m.level) + '</span><br><span style="font-size:12.5px;color:var(--ink-2)">' + esc(m.income) + '</span></div></div>';
      });
      h += '</div>';
    }

    // 本月打卡日历
    h += '<div class="card"><div class="card-title">📅 本月打卡</div><div class="cal">';
    var now = new Date(), y = now.getFullYear(), mth = now.getMonth();
    var days = new Date(y, mth + 1, 0).getDate();
    for (var i = 1; i <= days; i++) {
      var p = function (x) { return x < 10 ? '0' + x : '' + x; };
      var key = y + '-' + p(mth + 1) + '-' + p(i);
      var on = d.checkin[key] && d.checkin[key].length;
      h += '<div class="' + (on ? 'on' : '') + '">' + i + '</div>';
    }
    h += '</div><div style="font-size:12px;color:var(--ink-3);margin-top:8px">紫色 = 当天有创作动作 · 别断，断了就从今天重新开始</div></div>';

    return h;
  }

  /* ---------------- 选题 ---------------- */
  function topics() {
    var daily = S.daily.data || { topics: [] };
    var d = S.load();
    var cur = d.settings.platform || '全部';
    var plats = ['全部'].concat((daily.topics || []).map(function (x) { return x.platform; })
      .filter(function (v, i, a) { return a.indexOf(v) === i; }));

    var base = (daily.topics || []).filter(function (x) { return cur === '全部' || x.platform === cur; });
    var list = topicFavOnly ? base.filter(function (x) { return d.topicFav.indexOf(x.id) >= 0; }) : base;
    list = list.slice().sort(function (a, b) { return b.heat - a.heat; });
    var favCount = (daily.topics || []).filter(function (x) { return d.topicFav.indexOf(x.id) >= 0; }).length;

    var h = '';
    h += '<div class="card grad"><div style="font-weight:800">🔥 ' + (daily.date || '—') + ' 全网热点</div>' +
      '<div style="font-size:12.5px;color:var(--ink-2);margin-top:3px">共 ' + (daily.topics || []).length + ' 个话题 · 每天早上自动更新 · 点 ✍️ 直接生成文案</div></div>';

    h += '<div class="pills">';
    plats.forEach(function (p) {
      h += '<button class="pill' + (p === cur ? ' on' : '') + '" data-act="plat" data-p="' + esc(p) + '">' + esc(p) + '</button>';
    });
    h += '<button class="pill' + (topicFavOnly ? ' on' : '') + '" data-act="topic-filter" data-v="' + (topicFavOnly ? '0' : '1') + '">💖 只看收藏 (' + favCount + ')</button>';
    h += '</div>';

    if (!base.length) {
      h += '<div class="empty"><span class="e">🌙</span>这个平台今天还没抓到数据<br>点右上角 🔄 刷新试试</div>';
      return h;
    }
    if (!list.length) {
      h += '<div class="empty"><span class="e">🔍</span>本机收藏夹是空的<br>' +
        '① 还从没收藏过？在任意话题点「🤍 收藏」就能收进来<br>' +
        '② 若在电脑端收藏过但没同步？去「📁我的文档 → 备份与恢复」导入那份备份即可' +
        '<div class="btn-row" style="margin-top:10px;justify-content:center"><button class="btn-ghost tiny" data-act="go" data-v="docs">📥 去导入备份</button></div></div>';
      return h;
    }

    list.forEach(function (x) {
      var faved = d.topicFav.indexOf(x.id) >= 0;
      h += '<div class="item">';
      h += '<div class="item-head"><span class="heat">' + x.heat + '</span><div class="item-title">' + esc(x.title) + '</div></div>';
      h += '<div style="margin:4px 0"><span class="tag p">' + esc(x.platform) + '</span><span class="tag">' + esc(x.track) + '</span><span class="tag o">' + esc(x.hookType) + '</span></div>';
      h += '<div class="item-desc"><b>为什么火：</b>' + esc(x.why) + '</div>';
      h += '<div class="item-desc" style="background:var(--peach);padding:9px 11px;border-radius:10px"><b>💡 你可以这么切：</b>' + esc(x.angle) + '</div>';
      h += '<div class="btn-row" style="margin-top:9px">';
      h += '<button class="btn-ghost tiny" data-act="topic2writer" data-id="' + x.id + '">✍️ 生成文案</button>';
      h += '<button class="btn-ghost tiny" data-act="topic2shoot" data-id="' + x.id + '">🎬 加进拍摄清单</button>';
      h += '<button class="btn-ghost tiny" data-act="topicfav" data-id="' + x.id + '">' + (faved ? '💖 已收藏' : '🤍 收藏') + '</button>';
      h += '<button class="btn-ghost tiny" data-act="copy" data-text="' + esc(x.title + '｜' + x.angle) + '">📋</button>';
      h += '</div></div>';
    });
    return h;
  }

  /* ---------------- 写文案 ---------------- */
  function writer() {
    var pre = w.__writerPre || {};
    var h = '';
    h += '<div class="card">';
    h += '<div class="card-title">✍️ 爆款文案生成器</div>';
    h += '<div class="grid g2">';
    h += '<label class="fld"><span>话题 / 主题 *</span><input id="wt_topic" type="text" placeholder="例：用AI接单赚第一笔钱" value="' + esc(pre.topic || '') + '"></label>';
    h += '<label class="fld"><span>发布平台</span><select id="wt_plat"><option>小红书</option><option>抖音</option><option>视频号</option><option>B站</option><option>公众号</option></select></label>';
    h += '<label class="fld"><span>干货形式</span><select id="wt_type"><option>步骤式</option><option>清单式</option><option>分点式</option></select></label>';
    h += '<label class="fld"><span>条数（标题和正文自动对齐）</span><select id="wt_n"><option>3</option><option>4</option><option selected>5</option><option>6</option><option>7</option><option>8</option><option>10</option></select></label>';
    h += '<label class="fld"><span>写给谁看</span><input id="wt_aud" type="text" placeholder="例：想做副业的上班族" value="想做副业的上班族"></label>';
    h += '<label class="fld"><span>开头钩子风格</span><select id="wt_hook"><option>痛点</option><option>反差</option><option>数字</option><option>情绪</option><option>悬念</option><option>身份</option></select></label>';
    h += '</div>';
    h += '<label class="fld"><span>你自己的要点（可留空，引擎会自动补）· 一行一条，格式：小标题｜怎么做｜小提醒</span>' +
      '<textarea id="wt_points" rows="4" placeholder="先注册闲鱼｜挂一个具体服务标题，写清当天交稿｜别写可议价，标具体数字咨询更多&#10;前5单低价冲评价｜定七折但服务做满｜交付后主动请对方留评">' + esc(pre.points || '') + '</textarea></label>';
    h += '<label class="fld" style="display:flex;align-items:center;gap:8px"><input type="checkbox" id="wt_trend" checked style="width:18px;height:18px;accent-color:var(--purple)"><span style="margin:0">融入今天同赛道的真实爆款味道</span></label>';
    h += '<div class="btn-row">';
    h += '<button class="btn" data-act="gen">✨ 生成文案</button>';
    h += '<button class="btn-ghost" data-act="gen">🎲 换一版</button>';
    h += '<button class="btn-ghost" data-act="genprompt">🤖 复制成 AI 提示词</button>';
    h += '</div>';
    h += '</div>';

    h += '<div id="wtOut"></div>';
    h += '<div class="card"><div class="hint"><b>两种用法：</b>① 直接用「生成文案」出成品，改改就能发；② 点「复制成 AI 提示词」，把提示词粘到任意 AI 里，能拿到更长更细的版本。<br><b>想让内容更真：</b>在「你自己的要点」里写你真实踩过的坑，引擎会把它包装成完整结构。</div></div>';
    return h;
  }

  function renderOut(r) {
    var h = '';
    h += '<div class="card"><div class="card-title">📌 标题备选（点一下复制）</div>';
    r.titles.forEach(function (t, i) {
      h += '<div class="checkline"><span>' + (i === 0 ? '⭐' : '·') + '</span><div class="cl-text">' + esc(t) + '</div><button class="btn-ghost tiny" data-act="copy" data-text="' + esc(t) + '">📋</button></div>';
    });
    h += '</div>';

    h += '<div class="card"><div class="card-title">📝 正文<span class="more" data-act="copy" data-text="' + esc(r.body + '\n\n' + r.tags) + '">📋 复制全文</span></div>';
    h += '<div class="out">' + esc(r.body) + '</div>';
    h += '<div style="margin-top:10px;font-size:13px;color:var(--purple-d)">' + esc(r.tags) + '</div>';
    h += '<div class="item-meta" style="margin-top:8px">赛道识别：' + esc(r.meta.lib) + ' · ' + esc(r.meta.type) + ' · ' + r.meta.n + ' 条 · ' + r.meta.words + ' 字</div>';
    h += '<div class="btn-row" style="margin-top:10px">';
    h += '<button class="btn" data-act="savedraft">💾 存进我的文档</button>';
    h += '<button class="btn-ghost" data-act="copy" data-text="' + esc(r.title + '\n\n' + r.body + '\n\n' + r.tags) + '">📋 标题+正文</button>';
    if (r.shots) h += '<button class="btn-ghost" data-act="shots2list">🎬 存进拍摄清单</button>';
    h += '</div></div>';

    if (r.shots) {
      h += '<div class="card"><div class="card-title">🎬 分镜脚本</div>';
      r.shots.forEach(function (s) {
        h += '<div class="item" style="margin-bottom:8px;box-shadow:none;background:#fffdfe">' +
          '<div class="item-head"><span class="tag p">' + esc(s.t) + '</span><div class="item-title" style="font-size:13.5px">' + esc(s.v) + '</div></div>' +
          '<div class="item-desc">🗣️ ' + esc(s.a) + '</div>' +
          '<div class="item-meta">💡 ' + esc(s.n) + '</div></div>';
      });
      h += '</div>';
    }
    return h;
  }

  /* ---------------- 素材库 ---------------- */
  function material() {
    var list = S.get('materials');
    var h = '';
    h += '<div class="card">';
    h += '<div class="card-title">🎞️ 新增素材（刷到好视频就存这儿）</div>';
    h += '<label class="fld"><span>标题</span><input id="mt_title" type="text" placeholder="例：某博主AI副业视频 12w赞"></label>';
    h += '<label class="fld"><span>参考链接</span><input id="mt_link" type="url" placeholder="粘贴视频/笔记链接"></label>';
    h += '<label class="fld"><span>文案提取（把原文案粘进来）</span><textarea id="mt_raw" rows="6" placeholder="手机端在视频下方长按复制文案；或用「识别字幕」类工具转成文字后粘进来"></textarea></label>';
    h += '<label class="fld"><span>发布平台（决定脚本语气）</span><select id="mt_plat"><option>抖音</option><option>小红书</option><option>视频号</option><option>B站</option></select></label>';
    h += '<div class="btn-row">';
    h += '<button class="btn" data-act="mt-analyze">🔍 拆解爆款逻辑</button>';
    h += '<button class="btn-ghost" data-act="mt-save">💾 只保存</button>';
    h += '</div></div>';

    h += '<div id="mtOut"></div>';

    h += '<div class="card"><div class="hint"><b>怎么拿到别人的文案：</b>抖音长按视频文案可复制；小红书笔记正文可直接选中复制；纯口播视频用剪映「识别字幕」导出文本，再粘过来。<br><b>拆解会给你：</b>爆款分数、钩子类型、结构公式、缺了什么、以及一份原创改写版。</div></div>';

    h += '<div class="card-title" style="margin:18px 0 10px">📚 素材库（' + list.length + '）</div>';
    if (!list.length) {
      h += '<div class="empty"><span class="e">🎬</span>还没有素材，刷到好的就存进来</div>';
    } else {
      list.forEach(function (it) {
        h += '<div class="item">';
        h += '<div class="item-head"><div class="item-title">' + esc(it.title || '未命名素材') + '</div>' + (it.score ? '<span class="heat">' + it.score + '分</span>' : '') + '</div>';
        if (it.link) h += '<div class="item-meta">🔗 <a href="' + esc(it.link) + '" target="_blank" rel="noopener">' + esc(it.link.slice(0, 50)) + '…</a></div>';
        if (it.hook) h += '<div style="margin:5px 0"><span class="tag o">' + esc(it.hook) + '</span></div>';
        if (it.raw) h += '<details style="margin:6px 0"><summary style="cursor:pointer;font-size:13px;color:var(--purple-d);font-weight:700">📄 原文案</summary><div class="out" style="margin-top:6px;font-size:13.5px">' + esc(it.raw) + '</div></details>';
        if (it.logic) h += '<details style="margin:6px 0"><summary style="cursor:pointer;font-size:13px;color:var(--purple-d);font-weight:700">🧠 爆款逻辑拆解</summary><div class="item-desc">' + nl2br(it.logic) + '</div></details>';
        if (it.newtext) h += '<details style="margin:6px 0" open><summary style="cursor:pointer;font-size:13px;color:var(--pink);font-weight:700">✨ 改写后文案</summary><div class="out" style="margin-top:6px">' + esc(it.newtext) + '</div></details>';
        h += '<div class="btn-row" style="margin-top:8px">';
        if (it.newtext) h += '<button class="btn-ghost tiny" data-act="copy" data-text="' + esc(it.newtext) + '">📋 复制改写版</button>';
        if (it.raw && !it.newtext) h += '<button class="btn-ghost tiny" data-act="mt-redo" data-id="' + it.id + '">🔍 拆解并改写</button>';
        h += '<button class="btn-ghost tiny danger" data-act="crud-del" data-key="materials" data-id="' + it.id + '">🗑️</button>';
        h += '</div></div>';
      });
    }
    return h;
  }

  function renderAnalyze(a, rw) {
    var h = '<div class="card"><div class="card-title">🧠 爆款拆解结果</div>';
    h += '<div class="grid g4" style="margin-bottom:12px">';
    h += '<div class="stat"><div class="n">' + a.score + '</div><div class="l">爆款分数</div></div>';
    h += '<div class="stat"><div class="n">' + a.words + '</div><div class="l">字数</div></div>';
    h += '<div class="stat"><div class="n">' + a.nums.length + '</div><div class="l">具体数字</div></div>';
    h += '<div class="stat"><div class="n">' + a.listed + '</div><div class="l">条目结构</div></div>';
    h += '</div>';

    h += '<div class="kv"><b>钩子类型</b><span>' + esc(a.hook.n) + ' —— ' + esc(a.hook.d) + '</span></div>';
    h += '<div class="kv"><b>情绪词</b><span>' + (a.emos.length ? esc(a.emos.join('、')) : '无（情绪偏平）') + '</span></div>';
    h += '<div class="kv"><b>收藏引导</b><span>' + (a.hasSave ? '✅ 有' : '❌ 没有') + '</span></div>';
    h += '<div class="kv"><b>互动结尾</b><span>' + (a.hasCTA ? '✅ 有' : '❌ 没有') + '</span></div>';
    h += '<div class="kv"><b>金句</b><span>' + (a.hasGold ? '✅ 有可转发的句子' : '❌ 缺一句能被截图的话') + '</span></div>';

    h += '<div class="card-title" style="margin:14px 0 6px">🧩 它的底层公式</div>';
    h += '<div class="out" style="font-size:13.5px">' + a.formula.map(esc).join('\n') + '</div>';

    if (a.missing.length) {
      h += '<div class="card-title" style="margin:14px 0 6px">⚠️ 如果你来写，要补这些</div>';
      h += '<div>' + a.missing.map(function (m) { return '<div class="checkline"><span>·</span><div class="cl-text">' + esc(m) + '</div></div>'; }).join('') + '</div>';
    }
    h += '</div>';

    if (rw) {
      if (rw.script) {
        h += '<div class="card"><div class="card-title">🎬 短视频脚本（' + esc(rw.platform) + '）· 3秒钩子→15秒价值→10秒案例→CTA收口</div>';
        rw.script.forEach(function (s) {
          h += '<div class="script-block role-' + s.role + '">';
          h += '<div class="script-head"><span class="st">' + esc(s.t) + '</span><span class="sl">' + esc(s.label) + '</span></div>';
          h += '<div class="script-lines">' + s.lines.map(function (l) { return '<div class="script-line">' + esc(l) + '</div>'; }).join('') + '</div>';
          h += '<div class="script-vis">🎬 画面：' + esc(s.visual) + '</div>';
          h += '</div>';
        });
        h += '<div style="font-weight:800;margin:12px 0 6px">' + esc(rw.title) + '</div>';
        h += '<div style="font-size:13px;color:var(--purple-d)">' + esc(rw.tags) + '</div>';
        h += '<div class="btn-row" style="margin-top:10px">';
        h += '<button class="btn" data-act="mt-savefull">💾 保存整条素材</button>';
        h += '<button class="btn-ghost" data-act="copy" data-text="' + esc(rw.title + '\n\n' + rw.body + '\n\n' + rw.tags) + '">📋 复制脚本</button>';
        h += '</div></div>';
      } else {
        h += '<div class="card"><div class="card-title">✨ 原创改写版（换了结构和表达，不是洗稿）</div>';
        h += '<div style="font-weight:800;margin-bottom:8px">' + esc(rw.title) + '</div>';
        h += '<div class="out">' + esc(rw.body) + '</div>';
        h += '<div style="margin-top:10px;font-size:13px;color:var(--purple-d)">' + esc(rw.tags) + '</div>';
        h += '<div class="btn-row" style="margin-top:10px">';
        h += '<button class="btn" data-act="mt-savefull">💾 保存整条素材</button>';
        h += '<button class="btn-ghost" data-act="copy" data-text="' + esc(rw.title + '\n\n' + rw.body + '\n\n' + rw.tags) + '">📋 复制改写版</button>';
        h += '</div></div>';
      }
    }
    return h;
  }

  /* ---------------- 搞钱灵感 ---------------- */
  function money() {
    var daily = S.daily.data || { money: [] };
    var d = S.load();
    var h = '';
    h += '<div class="card grad"><div style="font-weight:800">💰 ' + (daily.date || '—') + ' 搞钱灵感</div>' +
      '<div style="font-size:12.5px;color:var(--ink-2);margin-top:3px">都是真实、低门槛、不用交钱的路子 · 每天自动更新</div></div>';
    h += '<div class="card"><div class="hint">⚠️ <b>永远记住：</b>凡是让你先交押金、买工号、充值垫资、交培训费的，100% 是骗局。正规平台不会让你先掏钱。</div></div>';

    var allMoney = daily.money || [];
    var favCount = allMoney.filter(function (m) { return d.moneyFav.indexOf(m.id) >= 0; }).length;
    h += '<div class="pills">';
    h += '<button class="pill' + (!moneyFavOnly ? ' on' : '') + '" data-act="money-filter" data-v="0">全部 (' + allMoney.length + ')</button>';
    h += '<button class="pill' + (moneyFavOnly ? ' on' : '') + '" data-act="money-filter" data-v="1">💖 只看收藏 (' + favCount + ')</button>';
    h += '</div>';

    var list = allMoney.filter(function (m) { return !moneyFavOnly || d.moneyFav.indexOf(m.id) >= 0; });

    if (!allMoney.length) {
      return h + '<div class="empty"><span class="e">💤</span>今天还没抓到数据，点右上角 🔄 试试</div>';
    }
    if (!list.length) {
      return h + '<div class="empty"><span class="e">🔍</span>本机收藏夹是空的<br>' +
        '① 还从没收藏过？在下面任意一条点「🤍 收藏」就能收进来<br>' +
        '② 若在电脑端收藏过但没同步？去「📁我的文档 → 备份与恢复」导入那份备份即可' +
        '<div class="btn-row" style="margin-top:10px;justify-content:center"><button class="btn-ghost tiny" data-act="go" data-v="docs">📥 去导入备份</button></div></div>';
    }

    list.forEach(function (m) {
      var fav = d.moneyFav.indexOf(m.id) >= 0;
      h += '<div class="item">';
      h += '<div class="item-head"><div class="item-title">💡 ' + esc(m.name) + '</div><span class="tag g">' + esc(m.level) + '</span></div>';
      h += '<div class="kv"><b>启动成本</b><span>' + esc(m.cost) + '</span></div>';
      h += '<div class="kv"><b>能赚多少</b><span>' + esc(m.income) + '</span></div>';
      h += '<div class="kv"><b>去哪接单</b><span>' + esc(m.where) + '</span></div>';
      h += '<div style="margin-top:8px;font-size:13px"><b>怎么开始：</b></div>';
      (m.steps || []).forEach(function (s, i) {
        h += '<div class="checkline"><span>' + (i + 1) + '.</span><div class="cl-text">' + esc(s) + '</div></div>';
      });
      if (m.warn) h += '<div class="hint" style="margin-top:8px">⚠️ ' + esc(m.warn) + '</div>';
      if (m.real) h += '<div class="item-meta">📊 ' + esc(m.real) + '</div>';
      h += '<div class="btn-row" style="margin-top:9px">';
      h += '<button class="btn-ghost tiny" data-act="moneyfav" data-id="' + m.id + '">' + (fav ? '💖 已收藏' : '🤍 收藏') + '</button>';
      h += '<button class="btn-ghost tiny" data-act="money2writer" data-id="' + m.id + '">✍️ 写成内容</button>';
      h += '<button class="btn-ghost tiny" data-act="money2goal" data-id="' + m.id + '">🎯 设成目标</button>';
      h += '</div></div>';
    });
    return h;
  }

  /* ---------------- 我的文档 ---------------- */
  function docs() {
    var list = S.get('drafts');
    var h = '';
    h += '<div class="card"><div class="card-title">📝 自己写一篇</div>';
    h += '<label class="fld"><span>标题</span><input id="dc_title" type="text" placeholder="给这篇起个名"></label>';
    h += '<label class="fld"><span>正文</span><textarea id="dc_body" rows="8" placeholder="随手记的想法、写到一半的文案，都可以存这里"></textarea></label>';
    h += '<div class="btn-row"><button class="btn" data-act="doc-add">💾 保存</button></div></div>';

    h += '<label class="fld" style="margin-top:8px"><span>🔍 搜索文案</span><input id="dc_q" type="text" placeholder="输入关键词" data-act="doc-search"></label>';

    h += '<div class="card-title" style="margin:14px 0 10px">📚 文案库（' + list.length + '）</div>';
    h += '<div id="docList">' + docList(list) + '</div>';
    return h;
  }
  function docList(list) {
    if (!list.length) return '<div class="empty"><span class="e">📭</span>还没有存稿，去「写文案」生成一篇吧</div>';
    return list.map(function (it) {
      return '<div class="item">' +
        '<div class="item-head"><div class="item-title">' + esc(it.title || '未命名') + '</div><span class="tag p">' + esc(it.platform || '通用') + '</span></div>' +
        '<div class="item-meta">🕐 ' + esc(it.createdAt) + ' · ' + (it.body || '').length + ' 字</div>' +
        '<details style="margin:6px 0"><summary style="cursor:pointer;font-size:13px;color:var(--purple-d);font-weight:700">展开正文</summary><div class="out" style="margin-top:6px">' + esc(it.body) + '</div>' + (it.tags ? '<div style="margin-top:8px;font-size:13px;color:var(--purple-d)">' + esc(it.tags) + '</div>' : '') + '</details>' +
        '<div class="btn-row" style="margin-top:6px">' +
        '<button class="btn-ghost tiny" data-act="copy" data-text="' + esc((it.title || '') + '\n\n' + (it.body || '') + '\n\n' + (it.tags || '')) + '">📋 复制</button>' +
        '<button class="btn-ghost tiny" data-act="doc-txt" data-id="' + it.id + '">⬇️ 导出这篇</button>' +
        '<button class="btn-ghost tiny danger" data-act="crud-del" data-key="drafts" data-id="' + it.id + '">🗑️</button>' +
        '</div></div>';
    }).join('');
  }

  /* ---------------- 更多 ---------------- */
  function more() {
    var mainTabs = TABS.filter(function (k) { return k !== 'more'; });
    var items = MENU.filter(function (m) { return mainTabs.indexOf(m.k) === -1; });
    var h = '';
    h += '<div class="card grad"><div style="font-weight:800">☰ 更多功能</div>' +
      '<div style="font-size:12.5px;color:var(--ink-2);margin-top:3px">底部标签栏放不下的入口都在这里，点一下直接跳转</div></div>';
    h += '<div class="grid g2" style="margin-top:12px">';
    items.forEach(function (m) {
      h += '<button class="more-cell" data-act="go" data-v="' + m.k + '">' +
        '<span class="mi">' + m.i + '</span><span class="mn">' + m.n + '</span></button>';
    });
    h += '</div>';
    return h;
  }

  /* ---------------- 设置 ---------------- */
  function settings() {
    var d = S.load();
    var h = '';

    /* 顶部快捷按钮 */
    h += '<div style="display:flex;gap:8px;justify-content:flex-end;margin-bottom:14px">';
    h += '<button class="btn-ghost tiny" data-act="exp-json">📤 导出备份</button>';
    h += '<button class="btn-ghost tiny" data-act="imp-json">📥 导入恢复</button>';
    h += '</div>';

    /* 数据安全 */
    h += '<div class="card"><div class="card-title">💾 数据安全</div>';
    h += '<div class="hint" style="margin-bottom:12px">所有数据只存在你这台设备的浏览器里，服务器上没有。换手机 / 清缓存前，一定先导出备份！</div>';
    h += '<div class="btn-row" style="flex-wrap:wrap">';
    h += '<button class="btn" data-act="exp-json">📤 导出 JSON 备份</button>';
    h += '<button class="btn-ghost" data-act="imp-json">📥 输入恢复（不限条数）</button>';
    h += '<button class="btn-ghost" data-act="exp-txt">📄 导出全部文案(txt)</button>';
    h += '</div>';
    h += '<div class="btn-row" style="flex-wrap:wrap;margin-top:8px">';
    h += '<button class="btn-ghost tiny" data-act="clear-sample">🧹 清空示例数据</button>';
    h += '<button class="btn-ghost tiny danger" data-act="clear-all">⚠️ 清空全部数据</button>';
    h += '</div></div>';

    /* 存到手机桌面当 App */
    h += '<div class="card"><div class="card-title">📱 存到手机桌面当 App</div>';
    h += '<div style="font-size:13.5px;line-height:1.8;color:var(--ink)">';
    h += '<b>iPhone：</b>Safari 打开本页 → 底部「<b>分享</b>」→ 添加到主屏幕<br>';
    h += '<b>安卓：</b>浏览器右上角菜单 → <b>添加到主屏幕</b> / 安装应用<br>';
    h += '加完之后点开就是全屏 App，和下载的应用一样 ✨';
    h += '</div></div>';

    /* 热点数据怎么更新 */
    var dailyInfo = S.daily;
    h += '<div class="card"><div class="card-title">🔄 热点数据怎么更新</div>';
    h += '<div style="font-size:13.5px;line-height:1.8;color:var(--ink)">';
    h += '每天早上会自动把当天各平台最火话题 + 真实搞钱项目更新进来。<br>';
    h += '断网时自动显示上一次成功抓到的内容，页面永远不会空白。<br><br>';
    h += '也可以点这里手动贴一份新数据 👇</div>';
    h += '<div class="btn-row" style="margin-top:10px">';
    h += '<button class="btn-ghost" data-act="paste-update">📋 粘贴更新</button>';
    h += '</div>';
    if (dailyInfo.data) {
      h += '<div class="hint" style="margin-top:10px">当前数据来源：<b>' + esc(dailyInfo.from || dailyInfo.status) + '</b> · 日期 ' + esc(dailyInfo.data.date || '—') + ' · 选题 ' + (dailyInfo.data.topics || []).length + ' 条 · 副业 ' + (dailyInfo.data.money || []).length + ' 条</div>';
    }
    h += '</div>';

    /* 版本信息 */
    h += '<div style="margin-top:16px;text-align:center;font-size:12px;color:var(--ink-3)">自媒体工作台 v1.0 · 数据本地存储，不会上传任何内容</div>';

    return h;
  }

  w.V = {
    MENU: MENU, TABS: TABS, CRUD: CRUD,
    home: home, topics: topics, writer: writer, material: material, money: money, docs: docs,
    shoot: function () { return crud(CRUD.shoot); },
    publish: function () { return publishView(); },
    growth: function () { return crud(CRUD.growth); },
    skill: function () { return crud(CRUD.skill); },
    book: function () { return crud(CRUD.book); },
    goods: function () { return crud(CRUD.goods); },
    more: more,
    settings: settings,
    moneyFavOnly: function (v) { if (v !== undefined) moneyFavOnly = !!v; return moneyFavOnly; },
    topicFavOnly: function (v) { if (v !== undefined) topicFavOnly = !!v; return topicFavOnly; },
    renderOut: renderOut, renderAnalyze: renderAnalyze, docList: docList,
    formHTML: formHTML, readForm: readForm
  };

  function publishView() {
    var posts = S.get('posts');
    var tot = posts.reduce(function (a, b) { return { v: a.v + (+b.view || 0), l: a.l + (+b.like || 0), f: a.f + (+b.fav || 0), c: a.c + (+b.cmt || 0) }; }, { v: 0, l: 0, f: 0, c: 0 });
    var byPlat = {};
    posts.forEach(function (p) { byPlat[p.platform] = (byPlat[p.platform] || 0) + (+p.view || 0); });
    var best = Object.keys(byPlat).sort(function (a, b) { return byPlat[b] - byPlat[a]; })[0];

    var h = '';
    h += '<div class="grid g4" style="margin-bottom:14px">';
    h += '<div class="stat"><div class="n">' + posts.length + '</div><div class="l">🔍 总复盘</div></div>';
    h += '<div class="stat"><div class="n">' + fmt(tot.v) + '</div><div class="l">👀 总播放</div></div>';
    h += '<div class="stat"><div class="n">' + fmt(tot.l) + '</div><div class="l">❤️ 总点赞</div></div>';
    h += '<div class="stat"><div class="n">' + (best || '—') + '</div><div class="l">🏆 最佳平台</div></div>';
    h += '</div>';

    if (Object.keys(byPlat).length) {
      var max = Math.max.apply(null, Object.keys(byPlat).map(function (k) { return byPlat[k]; })) || 1;
      h += '<div class="card"><div class="card-title">📊 各平台播放对比</div>';
      Object.keys(byPlat).sort(function (a, b) { return byPlat[b] - byPlat[a]; }).forEach(function (k) {
        h += '<div style="margin-bottom:9px"><div style="font-size:13px;display:flex"><span style="flex:1">' + esc(k) + '</span><b>' + fmt(byPlat[k]) + '</b></div>' +
          '<div class="bar"><i style="width:' + Math.round(byPlat[k] / max * 100) + '%"></i></div></div>';
      });
      h += '</div>';
    }
    return h + crud(CRUD.publish);
  }
  function fmt(n) { return n >= 10000 ? (n / 10000).toFixed(1) + 'w' : n; }
})(window);

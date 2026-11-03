/* yek一战成硕备考站 · 核心逻辑（纯函数，可单独测试） */
(function (g) {
  const C = {};

  /* ---------- 日期 ---------- */
  C.iso = function (d) {
    const p = n => String(n).padStart(2, '0');
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
  };
  C.today = function (now) { return C.iso(now || new Date()); };
  C.dayOfYear = function (d) {
    const s = new Date(d.getFullYear(), 0, 0);
    return Math.floor((d - s) / 864e5);
  };
  C.daysBetween = function (a, b) {
    const A = new Date(a + 'T00:00:00'), B = new Date(b + 'T00:00:00');
    return Math.round((B - A) / 864e5);
  };
  C.daysToExam = function (conf, now) {
    const d = C.daysBetween(C.today(now), conf.examDate);
    return d;
  };

  /* ---------- 伪随机（按日期固定） ---------- */
  function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function rng(seed) { let a = seed >>> 0; return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  C.shuffle = function (arr, seed) { const r = rng(hash(String(seed))); const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

  /* ---------- 每日鸡汤 / 贴纸 ---------- */
  C.quoteOf = function (now, off) {
    const Q = g.YEK_QUOTES || { en: [], cn: [] };
    const d = C.dayOfYear(now || new Date()) + (off || 0);
    const en = Q.en.length ? Q.en[d % Q.en.length] : { t: '', zh: '', by: '' };
    const cn = Q.cn.length ? Q.cn[(d * 7 + 3) % Q.cn.length] : { t: '', by: '' };
    return { en, cn };
  };
  C.stickerOf = function (now) {
    const S = g.YEK_STICKERS || [];
    if (!S.length) return { e: '', t: '', c: '#eee' };
    const d = C.dayOfYear(now || new Date());
    return S[d % S.length];
  };

  /* ---------- 题库索引 ---------- */
  C.bank = function () {
    const Y = g.YEK || {}; const all = [];
    Object.keys(Y).forEach(s => { (Y[s] || []).forEach(q => all.push(q)); });
    return all;
  };
  C.index = function () {
    const all = C.bank(); const byId = {}, byCh = {}, bySubj = {};
    all.forEach(q => {
      byId[q.id] = q;
      (byCh[q.subj + '|' + q.ch] = byCh[q.subj + '|' + q.ch] || []).push(q);
      (bySubj[q.subj] = bySubj[q.subj] || []).push(q);
    });
    return { all, byId, byCh, bySubj };
  };

  /* ---------- 计划 ---------- */
  C.planFor = function (iso) {
    const P = g.YEK_PLAN || [];
    return P.find(p => p.d === iso) || null;
  };

  /* ---------- 组卷 ---------- */
  // opts: {n, iso, mode:'daily'|'subj'|'wrong', filter:{subj,ch,type,mode}}
  C.pickDaily = function (idx, store, iso, n) {
    n = n || 15;
    const plan = C.planFor(iso);
    let buckets = [];
    if (plan && plan.items && plan.items.length) {
      plan.items.forEach(it => {
        const qs = (idx.bySubj[it.subj] || []).filter(q => (it.chs || []).length === 0 || it.chs.indexOf(q.ch) >= 0);
        if (qs.length) buckets.push({ subj: it.subj, qs: qs });
      });
    }
    if (!buckets.length) {
      Object.keys(idx.bySubj).forEach(s => buckets.push({ subj: s, qs: idx.bySubj[s] }));
    }
    // 每科配额
    const per = Math.max(1, Math.floor(n / buckets.length));
    const picked = []; const used = {};
    const score = q => {
      const st = store.q[q.id];
      const w = store.wrong[q.id];
      if (w && !w.mastered) {
        const gap = st ? C.daysBetween((st.d || iso), iso) : 9;
        return gap >= 1 ? 100 + Math.min(w.n, 5) * 10 : 40;
      }
      if (!st) return 90;
      const gap = C.daysBetween(st.d || iso, iso);
      return gap >= 5 ? 70 : gap >= 2 ? 55 : 15;
    };
    buckets.forEach(b => {
      const cand = C.shuffle(b.qs, iso + b.subj).map(q => ({ q, s: score(q) }))
        .sort((a, c) => c.s - a.s)
        .filter(x => x.s > 20)
        .map(x => x.q);
      const obj = cand.filter(q => q.type !== '名解' && q.type !== '论述');
      const ess = cand.filter(q => q.type === '名解' || q.type === '论述');
      const wantEss = Math.min(ess.length, Math.max(1, Math.round(per * 0.2)));
      const take = [];
      for (let i = 0; i < wantEss; i++) take.push(ess[i]);
      for (let i = 0; take.length < per && i < obj.length; i++) take.push(obj[i]);
      take.forEach(q => { if (!used[q.id]) { used[q.id] = 1; picked.push(q); } });
    });
    // 补足
    let rest = C.shuffle(idx.all, iso + 'fill').filter(q => !used[q.id]);
    for (let i = 0; picked.length < n && i < rest.length; i++) {
      if (rest[i].type !== '名解' && rest[i].type !== '论述') { picked.push(rest[i]); used[rest[i].id] = 1; }
    }
    return C.shuffle(picked, iso + 'order').slice(0, n);
  };

  C.pickFiltered = function (idx, store, f) {
    let pool = idx.all;
    if (f.subj && f.subj !== 'all') pool = pool.filter(q => q.subj === f.subj);
    if (f.ch && f.ch !== 'all') pool = pool.filter(q => q.ch === f.ch);
    if (f.type && f.type !== 'all') {
      if (f.type === '客观') pool = pool.filter(q => ['单选', '多选', '判断'].indexOf(q.type) >= 0);
      else if (f.type === '主观') pool = pool.filter(q => ['名解', '论述'].indexOf(q.type) >= 0);
      else pool = pool.filter(q => q.type === f.type);
    }
    if (f.mode === 'new') pool = pool.filter(q => !store.q[q.id]);
    if (f.mode === 'wrong') pool = pool.filter(q => store.wrong[q.id] && !store.wrong[q.id].mastered);
    if (f.mode === 'weak') {
      const weak = C.weakChapters(store, 8).map(w => w.ch);
      pool = pool.filter(q => weak.indexOf(q.ch) >= 0);
    }
    return C.shuffle(pool, f.seed || Date.now()).slice(0, f.n || 20);
  };


  /* ---------- 相似题 / 易混关联 ---------- */
  function norm2(s) { return String(s || '').replace(/[\s，。、；：（）()？?【】"']/g, ''); }
  C.simScore = function (a, b) {
    var A = norm2(a), B = norm2(b);
    if (!A || !B) return 0;
    var n = Math.min(A.length, B.length, 24), hit = 0;
    for (var i = 0; i + 2 <= n; i++) if (B.indexOf(A.substr(i, 2)) >= 0) hit++;
    return hit / Math.max(1, n - 1);
  };
  C.confuseOf = function (q, idx) {
    var pool = (idx.byCh[q.subj + '|' + q.ch] || []).filter(function (x) { return x.id !== q.id && x.type === q.type; });
    var cand = pool.map(function (x) { return { q: x, s: C.simScore(q.stem, x.stem) }; })
      .filter(function (x) { return x.s >= 0.45; })
      .sort(function (a, b) { return b.s - a.s; })
      .slice(0, 2);
    return cand.map(function (c) {
      var a = q.stem, b = c.q.stem;
      var neg = /不属于|不是|错误|不正确|除外|最不/.test(a) ? 1 : 0;
      var negB = /不属于|不是|错误|不正确|除外|最不/.test(b) ? 1 : 0;
      var why;
      var ABS = /一定|必然|总是|完全|所有|绝不|绝对|均/;
      var absHit = ABS.test(a) || ABS.test(b);
      if (neg !== negB) {
        why = '问法相反：本题是「' + (neg ? '选错的' : '选对的') + '」，那道是「' + (negB ? '选错的' : '选对的') + '」，选项常是同一组，先圈否定词再选。';
      } else if (absHit) {
        why = '两题说法不同、答案却相同（都是「' + (q.ans === 'T' ? '正确' : q.ans === 'F' ? '错误' : q.ans) + '」）——因为两句都用了“一定/完全/必然”这类绝对化表述。统计题里见到绝对化，先找反例，基本都判错。';
      } else if (q.ans !== c.q.ans) {
        why = '同一考点、答案不同，差别在题干的限定词（人群/指标/方向/问法），逐字比对题干。';
      } else {
        why = '同一考点、答案相同，是同一句话的两种问法，可以放在一起记。';
      }
      return { q: c.q, sim: c.s, why: why };
    });
  };

  /* ---------- 统计 ---------- */
  C.rate = function (s) { return s && s.a ? s.c / s.a : null; };
  C.statsBySubj = function (idx, store) {
    return Object.keys(idx.bySubj).map(s => {
      let a = 0, c = 0, seen = 0;
      idx.bySubj[s].forEach(q => { const st = store.q[q.id]; if (st) { a += st.a; c += st.c; seen++; } });
      return { subj: s, total: idx.bySubj[s].length, seen, a, c, rate: a ? c / a : null };
    }).sort((x, y) => (y.total - x.total));
  };
  C.statsByType = function (idx, store) {
    const t = {};
    idx.all.forEach(q => { const st = store.q[q.id]; if (!st) return; const k = q.type; t[k] = t[k] || { a: 0, c: 0 }; t[k].a += st.a; t[k].c += st.c; });
    return Object.keys(t).map(k => ({ type: k, a: t[k].a, c: t[k].c, rate: t[k].a ? t[k].c / t[k].a : null }));
  };
  C.chStats = function (idx, store) {
    const m = {};
    idx.all.forEach(q => {
      const st = store.q[q.id]; const k = q.subj + '|' + q.ch;
      if (!m[k]) m[k] = { subj: q.subj, ch: q.ch, chName: q.chName, a: 0, c: 0, seen: 0, total: 0 };
      m[k].total++;
      if (st) { m[k].a += st.a; m[k].c += st.c; m[k].seen++; }
    });
    return Object.keys(m).map(k => m[k]);
  };
  C.weakChapters = function (store, n, idx0) {
    const idx = idx0 || C.index();
    return C.chStats(idx, store)
      .filter(x => x.a >= 2)
      .map(x => ({ subj: x.subj, ch: x.ch, chName: x.chName, rate: x.c / x.a, a: x.a, c: x.c }))
      .sort((a, b) => a.rate - b.rate)
      .slice(0, n || 10);
  };
  C.dayStats = function (store, iso) {
    const L = (store.log || []).filter(x => (x.d || '') === iso);
    let c = 0; L.forEach(x => { if (x.ok) c++; });
    return { n: L.length, c, rate: L.length ? c / L.length : null };
  };
  C.weekStats = function (store, iso) {
    const days = [];
    const base = new Date(iso + 'T00:00:00');
    for (let i = 6; i >= 0; i--) {
      const d = new Date(base.getTime() - i * 864e5);
      const k = C.iso(d);
      const s = C.dayStats(store, k);
      days.push({ d: k, n: s.n, c: s.c, rate: s.rate });
    }
    let n = 0, c = 0; days.forEach(x => { n += x.n; c += x.c; });
    return { days, n, c, rate: n ? c / n : null };
  };
  C.streak = function (store, iso) {
    let k = 0; const base = new Date(iso + 'T00:00:00');
    for (let i = 0; i < 400; i++) {
      const d = C.iso(new Date(base.getTime() - i * 864e5));
      const s = C.dayStats(store, d);
      if (s.n > 0) k++; else if (i > 0) break;
    }
    return k;
  };


  /* ---------- 主观题：按参考答案的关键点算覆盖率，替代自评 ---------- */
  C.splitPoints = function (note) {
    var t = String(note || '');
    var parts = t.split(/[①②③④⑤⑥⑦⑧⑨⑩]/).filter(function (x) { return x.trim().length > 3; });
    if (parts.length < 2) parts = t.split(/[；;\n]/).filter(function (x) { return x.trim().length > 4; });
    if (parts.length < 2) parts = t.split(/[。]/).filter(function (x) { return x.trim().length > 6; });
    return parts.map(function (p) { return p.replace(/^[、，,：:\s]+/, '').trim(); }).filter(Boolean);
  };
  C.anchorOf = function (point) {
    var m = String(point).match(/[\u4e00-\u9fa5A-Za-z0-9]{2,14}/g) || [];
    var s = (m.slice(0, 2).join('') || String(point)).replace(/[（）()]/g, '');
    return s.slice(0, 12);
  };
  C.gradeSubjective = function (q, text) {
    var note = q.note || '';
    var pts = C.splitPoints(note);
    var t = String(text || '').replace(/[\s，。、；：]/g, '');
    if (!pts.length) return { rate: null, hit: [], miss: [], total: 0, level: 'none' };
    var hit = [], miss = [];
    pts.forEach(function (p) {
      var key = C.anchorOf(p);
      var grams = [];
      for (var k = 0; k + 2 <= key.length; k++) grams.push(key.substr(k, 2));
      var ok = grams.length
        ? grams.filter(function (g) { return t.indexOf(g) >= 0; }).length / grams.length >= 0.6
        : t.indexOf(key) >= 0;
      (ok ? hit : miss).push(p.slice(0, 22));
    });
    var rate = hit.length / pts.length;
    return {
      rate: rate, hit: hit, miss: miss, total: pts.length,
      level: t.length < 6 ? 'bad' : (rate >= 0.6 ? 'good' : (rate >= 0.3 ? 'mid' : 'bad'))
    };
  };

  /* ---------- 判分 ---------- */
  C.judge = function (q, resp) {
    if (q.type === '单选') return resp === q.ans;
    if (q.type === '多选') return String(resp || '').split('').sort().join('') === String(q.ans).split('').sort().join('');
    if (q.type === '判断') return resp === q.ans;
    if (q.type === '名解' || q.type === '论述') return resp === 'good';
    return false;
  };
  C.half = function (q, resp) { return (q.type === '名解' || q.type === '论述') && resp === 'mid'; };

  g.YEK_CORE = C;
})(typeof window !== 'undefined' ? window : globalThis);

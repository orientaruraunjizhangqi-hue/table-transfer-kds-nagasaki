#!/usr/bin/env python3
"""
styles.css と icons.js を作り直すスクリプト。

index.html / app.js で新しい Tailwind のクラスを使ったときだけ実行が必要です。
(文言の変更や Firebase URL の変更だけなら不要)

使い方 (Mac):
  1. Tailwind CSS v3 の単体版をダウンロードして build/ に置く
     https://github.com/tailwindlabs/tailwindcss/releases/tag/v3.4.17
     → tailwindcss-macos-arm64 (Intel Mac は -x64) を build/tailwindcss という名前で保存し
       chmod +x build/tailwindcss
  2. python3 build/build.py
"""
import os
import re
import subprocess

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)


def build_css():
    out = os.path.join(ROOT, 'styles.css')
    subprocess.check_call([
        os.path.join(HERE, 'tailwindcss'),
        '-c', os.path.join(HERE, 'tailwind.config.js'),
        '-i', os.path.join(HERE, 'input.css'),
        '-o', out,
        '--minify',
    ], cwd=HERE)

    css = open(out, encoding='utf-8').read()

    # --- 古い Safari (iOS 9/10) 向けの書き換え ---
    # rgb(1 2 3 / .5) → rgba(1,2,3,.5)
    css = re.sub(r'rgb\((\d+) (\d+) (\d+) ?/ ?([^)]+)\)', r'rgba(\1,\2,\3,\4)', css)
    # rgb(1 2 3) → rgb(1,2,3)
    css = re.sub(r'rgb\((\d+) (\d+) (\d+)\)', r'rgb(\1,\2,\3)', css)
    # 4桁/8桁の16進カラー → transparent / rgba
    css = css.replace('#0000', 'transparent')

    def hex8(m):
        h = m.group(1)
        r, g, b, a = int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16), int(h[6:8], 16) / 255
        return 'rgba(%d,%d,%d,%.3f)' % (r, g, b, a)
    css = re.sub(r'#([0-9a-fA-F]{8})\b', hex8, css)
    # inset:0 → top/right/bottom/left
    css = re.sub(r'(?<![\w-])inset:([^;}]+)', lambda m: 'top:%s;right:%s;bottom:%s;left:%s' % ((m.group(1),) * 4), css)
    # 空のCSS変数 (古い Safari では無効扱いになり、宣言ごと消えるため取り除く)
    css = re.sub(r' ?var\(--tw-gradient-(?:from|via|to)-position\)', '', css)
    css = css.replace('var(--tw-ring-inset) ', '').replace('var(--tw-ring-inset)', '')

    open(out, 'w', encoding='utf-8').write(css)
    print('styles.css:', len(css), 'bytes')


def build_icons():
    icons_dir = os.path.join(HERE, 'icons')
    entries = []
    for fn in sorted(os.listdir(icons_dir)):
        if not fn.endswith('.svg'):
            continue
        svg = open(os.path.join(icons_dir, fn), encoding='utf-8').read()
        body = re.search(r'<svg[^>]*>(.*)</svg>', svg, re.S).group(1)
        body = re.sub(r'\s+', ' ', body).strip()
        entries.append('    %s: %s' % (repr(fn[:-4]), repr(body)))

    js = '''/*
 * Lucide アイコン (ISC License, https://lucide.dev) を内蔵したもの。
 * build/build.py で build/icons/*.svg から自動生成しています。直接編集しないでください。
 * 古いブラウザ向けに ES5 で lucide.createIcons() と同じ使い方ができます。
 */
(function () {
  var ICONS = {
%s
  };
  var NS = 'http://www.w3.org/2000/svg';

  function render(el) {
    var name = el.getAttribute('data-lucide');
    if (el.getAttribute('data-lucide-rendered') === name) return;
    var body = ICONS[name];
    if (!body) return;
    var wrap = document.createElement('div');
    wrap.innerHTML = '<svg xmlns="' + NS + '" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + body + '</svg>';
    var svg = wrap.firstChild;
    var attrs = el.attributes;
    for (var i = 0; i < attrs.length; i++) {
      var a = attrs[i];
      if (a.name === 'class' || a.name === 'data-lucide-rendered') continue;
      svg.setAttribute(a.name, a.value);
    }
    var cls = (el.getAttribute('class') || '').replace(/\\blucide(-[a-z0-9-]+)?\\b/g, '').replace(/\\s+/g, ' ').trim();
    svg.setAttribute('class', 'lucide lucide-' + name + (cls ? ' ' + cls : ''));
    svg.setAttribute('data-lucide-rendered', name);
    el.parentNode.replaceChild(svg, el);
  }

  window.lucide = {
    createIcons: function () {
      var list = document.querySelectorAll('[data-lucide]');
      for (var i = 0; i < list.length; i++) render(list[i]);
    }
  };
})();
''' % ',\n'.join(entries)
    open(os.path.join(ROOT, 'icons.js'), 'w', encoding='utf-8').write(js)
    print('icons.js:', len(entries), 'icons')


if __name__ == '__main__':
    build_icons()
    build_css()

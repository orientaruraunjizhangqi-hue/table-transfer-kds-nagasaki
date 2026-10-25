/** @type {import('tailwindcss').Config} */
// 古い Safari (iOS 9〜) 向けにビルドするための設定。
// 色の「不透明度変数」を無効化して rgb(...) を素直に出力させ、build.py で古い書式に変換します。
module.exports = {
  content: ['../index.html', '../app.js'],
  safelist: [
    // app.js 内で文字列結合して作るクラス (念のため)
    { pattern: /^(bg|border|text)-(amber|emerald|cyan|purple|rose|indigo|orange|slate|sky|pink|red)-(300|400|500|800|950)(\/(10|20|30|40|50|60|80|90))?$/ },
  ],
  corePlugins: {
    backgroundOpacity: false,
    textOpacity: false,
    borderOpacity: false,
    divideOpacity: false,
    placeholderOpacity: false,
    ringOpacity: false,
  },
  theme: { extend: {} },
  plugins: [],
};

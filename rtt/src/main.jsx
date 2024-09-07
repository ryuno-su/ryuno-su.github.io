// これらのライブラリーはローカルファイルではないので、
// インポートする際にパスや拡張子は書きません。
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import App from './App.jsx';
import './index.css'; // これは副作用インポートと呼ばれ、
// JavaScript ファイルに値をインポートしませんが、
// 参照する CSS ファイルを最終的なコード出力に追加し、
// ブラウザーで使用することができるように Vite に指示します。

const DATA = [
  { id: "todo-0", name: "Eat", completed: true },
  { id: "todo-1", name: "Sleep", completed: false },
  { id: "todo-2", name: "Repeat", completed: false },
];

// アプリケーションのルートノードを定義する
createRoot(document.getElementById('root')).render(
  <StrictMode> {/* js の "use strict"; の jsx バージョン */}
    <App tasks={DATA} />
  </StrictMode>,
);
// same
// render(<App tasks={DATA} />, document.getElementById("root"));

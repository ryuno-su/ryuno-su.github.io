import { useRef, useEffect } from "react";

// レンダリング全体で値を追跡するカスタムフック
// ref.currentはuseEffect()呼び出し内で更新されるため、
// コンポーネントのメイン レンダリング サイクル内の値よりも常に 1 ステップ遅れています。
export function usePrevious(value) {
  const ref = useRef();
  useEffect(() => {
    ref.current = value;
  });
  return ref.current;
}

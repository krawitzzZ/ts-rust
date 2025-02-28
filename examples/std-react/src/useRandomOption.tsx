import { useCallback, useState } from "react";
import { none, Option, some } from "@ts-rust/std";

export function useRandomOption(): [Option<string>, () => void] {
  const [lastTried, setLastTried] = useState(new Date().getTime());
  const [option, setOption] = useState(none<string>());

  const getRandomOption = useCallback(() => {
    const now = new Date().getTime();
    const gotLucky = Math.round(Math.random() * 1_000) % 2 === 0;

    setLastTried(now);
    setOption(gotLucky ? some("You got lucky!") : none());
  }, [lastTried]);

  return [option, getRandomOption];
}

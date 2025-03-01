import { useCallback, useState } from "react";
import { none, Option, some } from "@ts-rust/std";

export function useRandomOption(): [Option<string>, () => void] {
  const [option, setOption] = useState(none<string>());
  const getRandomOption = useCallback(() => {
    setOption(
      Math.round(Math.random() * 1_000) % 2 === 0
        ? some("You got lucky!")
        : none(),
    );
  }, []);

  return [option, getRandomOption];
}

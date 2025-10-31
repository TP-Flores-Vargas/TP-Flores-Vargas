import { useEffect, useRef } from 'react';

export const useInterval = (callback, delay) => {
  const savedCallback = useRef();

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    if (typeof delay !== 'number') return undefined;
    const tick = () => savedCallback.current && savedCallback.current();
    const id = setInterval(tick, delay);
    return () => clearInterval(id);
  }, [delay]);
};

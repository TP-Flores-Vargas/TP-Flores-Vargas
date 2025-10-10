(function () {
  const { useEffect, useRef } = React;

  const useInterval = (callback, delay) => {
    const savedCallback = useRef();

    useEffect(() => {
      savedCallback.current = callback;
    }, [callback]);

    useEffect(() => {
      if (typeof delay !== 'number') return;
      const tick = () => savedCallback.current && savedCallback.current();
      const id = setInterval(tick, delay);
      return () => clearInterval(id);
    }, [delay]);
  };

  window.Hooks = window.Hooks || {};
  window.Hooks.useInterval = useInterval;
})();


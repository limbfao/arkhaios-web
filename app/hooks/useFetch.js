import { useState, useEffect, useReducer, useCallback } from "react";

function reducer(state, { type, responseJSON, error }) {
  switch (type) {
    case "loading":
      return { ...state, isLoading: true, error: null };
    case "success":
      return { responseJSON, isLoading: false, error: null };
    case "error":
      // Non-2xx responses keep their JSON body so callers can still read the message
      return { responseJSON: responseJSON ?? null, isLoading: false, error };
    case "idle":
      return { responseJSON: null, isLoading: false, error: null };
    default:
      throw new Error("Unknown action type");
  }
}

// Fetches JSON from `url` whenever it changes. Pass a falsy url to skip the request.
// Returns { isLoading, error, isError, responseJSON, reload }.
export default function useFetch(url) {
  const [state, dispatch] = useReducer(reducer, {
    responseJSON: null,
    isLoading: Boolean(url),
    error: null,
  });
  const [attempt, setAttempt] = useState(0);
  const reload = useCallback(() => setAttempt((n) => n + 1), []);

  useEffect(() => {
    if (!url) {
      dispatch({ type: "idle" });
      return;
    }
    let shouldCancel = false;

    const callFetch = async () => {
      dispatch({ type: "loading" });

      try {
        const response = await fetch(url);
        const text = await response.text();
        const newResponseJSON = text ? JSON.parse(text) : null;
        if (shouldCancel) return;
        if (!response.ok) {
          const error = new Error(newResponseJSON?.message || `Request failed (${response.status})`);
          error.status = response.status;
          dispatch({ type: "error", error, responseJSON: newResponseJSON });
          return;
        }
        dispatch({ type: "success", responseJSON: newResponseJSON });
      } catch (newError) {
        if (shouldCancel) return;
        dispatch({ type: "error", error: newError });
      }
    };
    callFetch();

    return () => {
      shouldCancel = true;
    };
  }, [url, attempt]);

  return { ...state, isError: Boolean(state.error), reload };
}

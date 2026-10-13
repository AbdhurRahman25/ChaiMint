import type { KeyboardEvent } from "react";

export function handleEnterToNext(
  event: KeyboardEvent<HTMLFormElement>
) {
  if (
    event.key !== "Enter" ||
    event.shiftKey ||
    event.nativeEvent.isComposing
  ) {
    return;
  }

  const target = event.target;

  if (!(target instanceof HTMLElement)) return;

  if (
    target.tagName === "TEXTAREA" ||
    !["INPUT", "SELECT"].includes(target.tagName)
  ) {
    return;
  }

  if (
    target instanceof HTMLInputElement &&
    ["checkbox", "radio", "submit", "button"].includes(target.type)
  ) {
    return;
  }

  const fields = Array.from(
    event.currentTarget.querySelectorAll<HTMLElement>(
      'input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="checkbox"]):not([type="radio"]):not(:disabled), select:not(:disabled)'
    )
  );

  const index = fields.indexOf(target);

  if (index === -1) return;

  event.preventDefault();

  const nextField = fields[index + 1];

  if (nextField) {
    nextField.focus();
  } else {
    event.currentTarget.requestSubmit();
  }
}
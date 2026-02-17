

export function createElement<
  TN extends keyof HTMLElementTagNameMap,
  E extends HTMLElementTagNameMap[TN]
>(
  tagName: TN,
  properties: Partial<E> = {},
): E {

  const element = document.createElement(tagName) as E;

  for (const propertyName in properties) {
    try {
      const value = properties[propertyName as keyof E];
      if (value !== undefined) {
        (element as any)[propertyName] = value;
      }
    } catch {
      console.warn(
        `The element ${tagName} does not have the property ${propertyName}.`
      );
    }
  }

  return element;
}

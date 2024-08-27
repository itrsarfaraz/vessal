import { Transform } from 'class-transformer';

export function TransformDateToISOString() {
  return Transform(({ value }) => {
    if (!value) return value;
    return new Date(value).toISOString();
  });
}
